/**
 * Tests for range-aware Object Storage serving.
 *
 * Uses a fake client implementing ObjectStorageClientLike so the full
 * request/response behavior (status codes, headers, exact byte counts)
 * can be verified without a provisioned bucket.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "stream";
import { EventEmitter } from "events";
import {
  parseRange,
  clampRangeHeader,
  MAX_RANGE_SPAN_BYTES,
  serveObjectWithRanges,
  type ObjectStorageClientLike,
} from "../objectStorage";

// ─── clampRangeHeader unit tests ─────────────────────────────────────────────

test("clampRangeHeader caps spans at MAX_RANGE_SPAN_BYTES (32 MiB proxy limit)", () => {
  const CAP = MAX_RANGE_SPAN_BYTES;
  // Absent / malformed / small headers pass through untouched.
  assert.equal(clampRangeHeader(undefined), undefined);
  assert.equal(clampRangeHeader("garbage"), "garbage");
  assert.equal(clampRangeHeader("bytes=0-1023"), "bytes=0-1023");
  assert.equal(clampRangeHeader("bytes=-500"), "bytes=-500");
  assert.equal(clampRangeHeader(`bytes=0-${CAP - 1}`), `bytes=0-${CAP - 1}`);
  // Open-ended ranges are capped — this is the browser's first video probe.
  assert.equal(clampRangeHeader("bytes=0-"), `bytes=0-${CAP - 1}`);
  assert.equal(clampRangeHeader("bytes=100000-"), `bytes=100000-${100000 + CAP - 1}`);
  // Explicit oversized ranges are capped.
  assert.equal(clampRangeHeader(`bytes=0-${CAP}`), `bytes=0-${CAP - 1}`);
  assert.equal(clampRangeHeader("bytes=0-99999999999"), `bytes=0-${CAP - 1}`);
  // Oversized suffix ranges are capped.
  assert.equal(clampRangeHeader(`bytes=-${CAP + 1}`), `bytes=-${CAP}`);
});

// ─── parseRange unit tests ───────────────────────────────────────────────────

test("parseRange handles all range forms", () => {
  const size = 10000;
  assert.equal(parseRange(undefined, size), null);
  assert.deepEqual(parseRange("bytes=0-1023", size), { start: 0, end: 1023 });
  assert.deepEqual(parseRange("bytes=0-", size), { start: 0, end: 9999 });
  assert.deepEqual(parseRange("bytes=-500", size), { start: 9500, end: 9999 });
  assert.deepEqual(parseRange("bytes=5000-999999", size), { start: 5000, end: 9999 });
  assert.deepEqual(parseRange("bytes=9999-9999", size), { start: 9999, end: 9999 });
  assert.equal(parseRange("bytes=10000-", size), "unsatisfiable");
  assert.equal(parseRange("bytes=100000-101023", size), "unsatisfiable");
  assert.equal(parseRange("bytes=-0", size), "unsatisfiable");
  assert.equal(parseRange("bytes=-", size), null);
  assert.equal(parseRange("garbage", size), null);
  assert.equal(parseRange("bytes=5-2", size), "unsatisfiable");
});

// ─── Fakes ───────────────────────────────────────────────────────────────────

const FILE_SIZE = 4096;
const FILE_DATA = Buffer.alloc(FILE_SIZE).map((_, i) => i % 256);

function makeFakeClient(): ObjectStorageClientLike & {
  lastOptions: unknown;
  lastName: string | null;
} {
  const fake = {
    lastOptions: undefined as unknown,
    lastName: null as string | null,
    async exists(_name: string) {
      return { ok: true, value: true };
    },
    downloadAsStream(name: string, options?: unknown) {
      fake.lastName = name;
      fake.lastOptions = options;
      const opts = (options ?? {}) as { start?: number; end?: number };
      const start = opts.start ?? 0;
      const end = opts.end ?? FILE_SIZE - 1;
      // Mimics GCS createReadStream: inclusive byte range.
      return Readable.from([FILE_DATA.subarray(start, end + 1)]);
    },
  };
  return fake;
}

/** Minimal Express-like Response capturing status, headers, and body bytes. */
function makeFakeRes() {
  const chunks: Buffer[] = [];
  const res: any = new EventEmitter();
  res.statusCode = 200;
  res.headers = {} as Record<string, string>;
  res.headersSent = false;
  res.status = (code: number) => ((res.statusCode = code), res);
  res.setHeader = (k: string, v: string) => (res.headers[k.toLowerCase()] = String(v));
  res.getHeader = (k: string) => res.headers[k.toLowerCase()];
  res.write = (chunk: Buffer) => {
    res.headersSent = true;
    chunks.push(Buffer.from(chunk));
    return true;
  };
  res.end = (chunk?: Buffer) => {
    if (chunk) chunks.push(Buffer.from(chunk));
    res.emit("finish");
    return res;
  };
  res.once = res.once.bind(res);
  res.emit = res.emit.bind(res);
  res.body = () => Buffer.concat(chunks);
  return res;
}

function makeReq(range?: string) {
  return { headers: range ? { range } : {} } as any;
}

// ─── serveObjectWithRanges behavior tests ────────────────────────────────────

test("no Range header → 200 with Accept-Ranges and Content-Length, full body", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  const served = await serveObjectWithRanges(client, "vid.mp4", makeReq(), res, FILE_SIZE);
  assert.equal(served, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.getHeader("accept-ranges"), "bytes");
  assert.equal(res.getHeader("content-length"), String(FILE_SIZE));
  assert.equal(res.getHeader("content-type"), "video/mp4");
  assert.equal(res.body().length, FILE_SIZE);
  assert.equal(client.lastOptions, undefined); // full stream, no range options
});

test("Range: bytes=0-1023 → 206 with exactly 1024 bytes and range passed to storage", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "vid.mp4", makeReq("bytes=0-1023"), res, FILE_SIZE);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes 0-1023/${FILE_SIZE}`);
  assert.equal(res.getHeader("content-length"), "1024");
  assert.equal(res.body().length, 1024);
  assert.deepEqual(res.body(), FILE_DATA.subarray(0, 1024));
  // Only the requested bytes were asked of Object Storage:
  assert.deepEqual(client.lastOptions, { start: 0, end: 1023 });
  assert.equal(client.lastName, "uploads/vid.mp4");
});

test("mid-file Range → 206 with correct slice", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "vid.mp4", makeReq("bytes=1000-2023"), res, FILE_SIZE);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes 1000-2023/${FILE_SIZE}`);
  assert.equal(res.body().length, 1024);
  assert.deepEqual(res.body(), FILE_DATA.subarray(1000, 2024));
});

test("open-ended Range: bytes=0- → 206 with full content", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "vid.mp4", makeReq("bytes=0-"), res, FILE_SIZE);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes 0-${FILE_SIZE - 1}/${FILE_SIZE}`);
  assert.equal(res.getHeader("content-length"), String(FILE_SIZE));
  assert.equal(res.body().length, FILE_SIZE);
  // Full-file range must NOT pass byte-range options to downloadAsStream to
  // avoid GCS intermittent errors on large files.
  assert.equal(client.lastOptions, undefined);
});

test("end-of-file suffix Range: bytes=-100 → 206 with last 100 bytes", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "vid.mp4", makeReq("bytes=-100"), res, FILE_SIZE);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes ${FILE_SIZE - 100}-${FILE_SIZE - 1}/${FILE_SIZE}`);
  assert.equal(res.body().length, 100);
  assert.deepEqual(res.body(), FILE_DATA.subarray(FILE_SIZE - 100));
});

test("unsatisfiable Range → 416 with Content-Range: bytes */size", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "vid.mp4", makeReq("bytes=999999-"), res, FILE_SIZE);
  assert.equal(res.statusCode, 416);
  assert.equal(res.getHeader("content-range"), `bytes */${FILE_SIZE}`);
  assert.equal(res.body().length, 0);
});

test("unknown size + Range header → full 200 stream fallback (no bogus 206)", async () => {
  const client = makeFakeClient();
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "vid.mp4", makeReq("bytes=0-1023"), res, null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.getHeader("content-range"), undefined);
  assert.equal(res.body().length, FILE_SIZE);
});

test("missing object → returns false without touching the response", async () => {
  const client = makeFakeClient();
  client.exists = async () => ({ ok: true, value: false });
  const res = makeFakeRes();
  const served = await serveObjectWithRanges(client, "nope.mp4", makeReq(), res, FILE_SIZE);
  assert.equal(served, false);
  assert.equal(res.body().length, 0);
});

test("no Range header on a file larger than the proxy limit → capped 206, not full 200", async () => {
  const BIG = 40 * 1024 * 1024; // > 32 MiB proxy limit
  const client: any = {
    async exists() { return { ok: true, value: true }; },
    lastOptions: undefined as unknown,
    downloadAsStream(_name: string, options?: unknown) {
      client.lastOptions = options;
      const opts = (options ?? {}) as { start?: number; end?: number };
      const start = opts.start ?? 0;
      const end = opts.end ?? BIG - 1;
      return Readable.from([Buffer.alloc(end - start + 1)]);
    },
    getBucket: async () => ({
      file: (_n: string) => ({ getMetadata: async () => [{ size: String(BIG) }] }),
    }),
  };
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "big-noheader-test.mp4", makeReq(), res, BIG);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes 0-${MAX_RANGE_SPAN_BYTES - 1}/${BIG}`);
  assert.equal(res.getHeader("content-length"), String(MAX_RANGE_SPAN_BYTES));
  assert.equal(res.body().length, MAX_RANGE_SPAN_BYTES);
  assert.deepEqual(client.lastOptions, { start: 0, end: MAX_RANGE_SPAN_BYTES - 1 });
});

test("unknown size + huge object → stream aborted before the 32 MiB proxy limit", async () => {
  // No metadata, no fallback size: server streams a full 200 of unknown
  // length. The guard must destroy the stream before the body crosses the
  // proxy's 32 MiB response limit.
  const CHUNK = 1024 * 1024;
  const TOTAL_CHUNKS = 40; // 40 MiB source
  const client: any = {
    async exists() { return { ok: true, value: true }; },
    downloadAsStream(_name: string, _options?: unknown) {
      let i = 0;
      return new Readable({
        read() {
          if (i++ < TOTAL_CHUNKS) this.push(Buffer.alloc(CHUNK));
          else this.push(null);
        },
      });
    },
  };
  const res = makeFakeRes();
  const served = await serveObjectWithRanges(client, "huge-unknown.mp4", makeReq(), res, null);
  assert.equal(served, true);
  assert.ok(
    res.body().length <= 32 * 1024 * 1024,
    `body ${res.body().length} exceeds proxy limit`,
  );
});

// ─── Authoritative bucket metadata size tests ────────────────────────────────

test("bucket metadata size overrides a stale fallback (cms_media) size", async () => {
  const client = makeFakeClient() as any;
  client.getBucket = async () => ({
    file: (_n: string) => ({
      getMetadata: async () => [{ size: String(FILE_SIZE) }],
    }),
  });
  const res = makeFakeRes();
  // Deliberately wrong fallback size (e.g. pre-remux cms_media value).
  const staleSize = FILE_SIZE + 999;
  await serveObjectWithRanges(client, "stale-size-test.mp4", makeReq("bytes=0-"), res, staleSize);
  assert.equal(res.statusCode, 206);
  // Content-Range must use the bucket's authoritative size, not the stale one.
  assert.equal(res.getHeader("content-range"), `bytes 0-${FILE_SIZE - 1}/${FILE_SIZE}`);
  assert.equal(res.body().length, FILE_SIZE);
});

test("end-of-file suffix range against authoritative size returns real final bytes", async () => {
  const client = makeFakeClient() as any;
  client.getBucket = async () => ({
    file: (_n: string) => ({
      getMetadata: async () => [{ size: String(FILE_SIZE) }],
    }),
  });
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "suffix-auth-test.mp4", makeReq("bytes=-64"), res, FILE_SIZE + 999);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes ${FILE_SIZE - 64}-${FILE_SIZE - 1}/${FILE_SIZE}`);
  assert.deepEqual(res.body(), FILE_DATA.subarray(FILE_SIZE - 64));
});

test("metadata 404 → object treated as not found", async () => {
  const client = makeFakeClient() as any;
  client.getBucket = async () => ({
    file: (_n: string) => ({
      getMetadata: async () => { const e: any = new Error("Not Found"); e.code = 404; throw e; },
    }),
  });
  const res = makeFakeRes();
  const served = await serveObjectWithRanges(client, "gone-test.mp4", makeReq(), res, null);
  assert.equal(served, false);
  assert.equal(res.body().length, 0);
});

test("metadata failure (non-404) falls back to exists + fallback size", async () => {
  const client = makeFakeClient() as any;
  client.getBucket = async () => { throw new Error("sidecar unavailable"); };
  const res = makeFakeRes();
  await serveObjectWithRanges(client, "meta-fail-test.mp4", makeReq("bytes=0-1023"), res, FILE_SIZE);
  assert.equal(res.statusCode, 206);
  assert.equal(res.getHeader("content-range"), `bytes 0-1023/${FILE_SIZE}`);
  assert.equal(res.body().length, 1024);
});
