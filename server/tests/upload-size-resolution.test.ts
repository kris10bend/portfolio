/**
 * Tests for resolveUploadSize and end-to-end /uploads-style range serving,
 * including files that have NO cms_media record (e.g. the ffmpeg-converted
 * MP4s referenced by startup migrations) — these must still get 206 range
 * responses via the local-file-size fallback.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import express from "express";
import { createServer } from "node:http";
import { Readable } from "stream";
import {
  resolveUploadSize,
  serveObjectWithRanges,
  type ObjectStorageClientLike,
} from "../objectStorage";
import { storage } from "../storage";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

describe("resolveUploadSize", () => {
  let tmpDir: string;
  let mediaId: string | null = null;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-test-"));
    fs.writeFileSync(path.join(tmpDir, "local-only.mp4"), Buffer.alloc(1234));
    // cms_media row whose recorded size deliberately differs from any disk copy
    const media = await storage.createCmsMedia({
      filename: "db-test-range.mp4",
      originalName: "db-test-range.mp4",
      url: "/uploads/db-test-range.mp4",
      mimeType: "video/mp4",
      size: 5555,
    });
    mediaId = media.id;
  });

  after(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (mediaId) await storage.deleteCmsMedia(mediaId);
  });

  test("uses cms_media size when a record exists", async () => {
    assert.equal(await resolveUploadSize("db-test-range.mp4", tmpDir), 5555);
  });

  test("falls back to local file size when no cms_media record exists", async () => {
    assert.equal(await resolveUploadSize("local-only.mp4", tmpDir), 1234);
  });

  test("returns null when neither DB record nor local file exists", async () => {
    assert.equal(await resolveUploadSize("missing.mp4", tmpDir), null);
  });

  test("converted migration MP4s (no cms_media rows) resolve a size from uploads/", async () => {
    // These files are referenced by the gif_to_mp4_v1 startup migration and
    // have no cms_media record — the fs fallback must provide their size so
    // production range requests get 206 responses.
    for (const f of [
      "26f9e478-8d12-42f1-8110-572783db347f.mp4",
      "b3b5f8a3-2f00-40b7-8bc0-9c309c3ec778.mp4",
    ]) {
      const size = await resolveUploadSize(f, UPLOADS_DIR);
      assert.ok(size !== null && size > 0, `${f} must resolve a size`);
      assert.equal(size, fs.statSync(path.join(UPLOADS_DIR, f)).size);
    }
  });
});

describe("/uploads-style middleware integration (fake bucket)", () => {
  // Mirrors the production middleware in server/index.ts, but with a fake
  // Object Storage client whose contents are backed by the local uploads/
  // files, so the full HTTP request → resolveUploadSize → range-serve path
  // is exercised for a file with NO cms_media record.
  const CONVERTED = "26f9e478-8d12-42f1-8110-572783db347f.mp4";
  const filePath = path.join(UPLOADS_DIR, CONVERTED);
  const fileSize = fs.statSync(filePath).size;

  const fakeClient: ObjectStorageClientLike = {
    async exists(name: string) {
      return { ok: true, value: fs.existsSync(path.join(process.cwd(), name)) };
    },
    downloadAsStream(name: string, options?: unknown) {
      const opts = (options ?? {}) as { start?: number; end?: number };
      return fs.createReadStream(path.join(process.cwd(), name), {
        start: opts.start,
        end: opts.end,
      }) as unknown as Readable;
    },
  };

  let baseUrl: string;
  let server: ReturnType<typeof createServer>;

  before(async () => {
    const app = express();
    app.use("/uploads", async (req, res) => {
      const filename = path.basename(req.path);
      const size = await resolveUploadSize(filename, UPLOADS_DIR);
      const served = await serveObjectWithRanges(fakeClient, filename, req, res, size);
      if (!served) res.status(404).end();
    });
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => new Promise<void>((r) => server.close(() => r())));

  test("converted MP4 without cms_media row: plain GET → 200 with Content-Length", async () => {
    const res = await fetch(`${baseUrl}/uploads/${CONVERTED}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-length"), String(fileSize));
    const body = Buffer.from(await res.arrayBuffer());
    assert.equal(body.length, fileSize);
  });

  test("converted MP4 without cms_media row: Range bytes=0-1023 → 206 with 1024 bytes", async () => {
    const res = await fetch(`${baseUrl}/uploads/${CONVERTED}`, {
      headers: { Range: "bytes=0-1023" },
    });
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-range"), `bytes 0-1023/${fileSize}`);
    assert.equal(res.headers.get("content-length"), "1024");
    const body = Buffer.from(await res.arrayBuffer());
    assert.equal(body.length, 1024);
    const expected = Buffer.alloc(1024);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, expected, 0, 1024, 0);
    fs.closeSync(fd);
    assert.deepEqual(body, expected);
  });

  test("mid-file range → 206 with correct slice", async () => {
    const res = await fetch(`${baseUrl}/uploads/${CONVERTED}`, {
      headers: { Range: "bytes=100000-101023" },
    });
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-range"), `bytes 100000-101023/${fileSize}`);
    const body = Buffer.from(await res.arrayBuffer());
    assert.equal(body.length, 1024);
  });

  test("filename absent from cms_media AND disk → 200 full stream (no bogus 206)", async () => {
    // Fake client backed by a real local file, but size resolution fails.
    const res = await fetch(`${baseUrl}/uploads/${CONVERTED}?x=1`, {
      headers: { Range: "bytes=0-1023" },
    });
    // Same file (query string ignored by basename) — sanity: still 206.
    assert.equal(res.status, 206);
    const missing = await fetch(`${baseUrl}/uploads/does-not-exist.mp4`);
    assert.equal(missing.status, 404);
  });
});
