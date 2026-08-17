/**
 * Replit Object Storage helper.
 *
 * When REPLIT_OBJECT_STORAGE_BUCKET_ID is set (production / any env with a
 * provisioned bucket), uploads are stored in the bucket so they survive
 * deployment container restarts and are accessible from every production
 * replica. Without the env var the helpers are no-ops and the local-disk
 * fallback in index.ts / routes.ts continues to work for development.
 *
 * All objects are stored under the "uploads/" prefix inside the bucket so
 * the public URL path (/uploads/<filename>) matches the object name exactly.
 */

import { Client } from "@replit/object-storage";
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";

// ─── Lazy client ─────────────────────────────────────────────────────────────

let _client: Client | null = null;

function getClient(): Client | null {
  if (!process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID) return null;
  if (!_client) _client = new Client();
  return _client;
}

/** True when a bucket is configured and Object Storage is active. */
export function isObjectStorageEnabled(): boolean {
  return !!process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID;
}

// ─── MIME helper ─────────────────────────────────────────────────────────────

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function mimeFromFilename(filename: string): string {
  return EXT_TO_MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a buffer to Object Storage.
 * @returns true on success, false if Object Storage is not configured or upload failed.
 */
export async function uploadToObjectStorage(
  filename: string,
  buffer: Buffer,
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const result = await client.uploadFromBytes(`uploads/${filename}`, buffer);
  if (!result.ok) {
    console.error(`[objectStorage] Upload failed for ${filename}:`, result.error);
    return false;
  }
  return true;
}

/**
 * Delete an object from Object Storage (best-effort; errors are logged but not thrown).
 */
export async function deleteFromObjectStorage(filename: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  const result = await client.delete(`uploads/${filename}`);
  if (!result.ok) {
    console.warn(`[objectStorage] Delete failed for ${filename}:`, result.error);
  }
}

/**
 * Parse an HTTP Range header of the form `bytes=start-[end]` or `bytes=-suffix`.
 * Returns the clamped inclusive byte range, or null when the header is absent
 * or malformed, or "unsatisfiable" when the range lies beyond the file.
 */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | "unsatisfiable" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, rawStart, rawEnd] = m;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    // Suffix range: last N bytes
    const suffix = parseInt(rawEnd, 10);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(rawStart, 10);
    end = rawEnd === "" ? size - 1 : Math.min(parseInt(rawEnd, 10), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}

/**
 * Replit deployments sit behind a proxy that rejects any HTTP response body
 * larger than 32 MiB with an edge-level 500 (confirmed empirically against
 * production: a 33,000,001-byte 206 succeeds, a 34,000,001-byte 206 fails,
 * cutoff at exactly 32 MiB). Browsers open videos with `Range: bytes=0-`,
 * which would otherwise produce a full-file 206 body — for a 45 MB video that
 * response is killed by the proxy and playback freezes at 0:00.
 *
 * To stay safely under the limit, every range response is capped at this many
 * bytes. Returning fewer bytes than requested is valid HTTP: the 206
 * Content-Range header tells the browser exactly what it got, and it issues
 * follow-up range requests for the rest.
 */
export const MAX_RANGE_SPAN_BYTES = 16 * 1024 * 1024;

/** The deployment proxy's hard response-body limit (empirically confirmed). */
export const PROXY_RESPONSE_LIMIT_BYTES = 32 * 1024 * 1024;

/**
 * Abort threshold for unknown-size full streams: destroy the stream a couple
 * of MiB before the proxy limit so in-flight chunks can't push the total
 * body past 32 MiB.
 */
const UNKNOWN_SIZE_ABORT_BYTES = PROXY_RESPONSE_LIMIT_BYTES - 2 * 1024 * 1024;

/** True when the header is a single simple `bytes=start-[end]` / `bytes=-N` range. */
function isSimpleRangeHeader(header: unknown): boolean {
  if (typeof header !== "string") return false;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  return !!m && !(m[1] === "" && m[2] === "");
}

/**
 * Express middleware guarding the /uploads route (both the Object Storage
 * path and the express.static local-disk fallback) against responses larger
 * than the deployment proxy's 32 MiB limit:
 *
 * 1. Simple range headers are clamped to MAX_RANGE_SPAN_BYTES.
 * 2. Absent, malformed, or multi-part range headers on a local file bigger
 *    than the proxy limit are replaced with a capped `bytes=0-…` range
 *    (RFC 9110 permits a server to ignore the Range header), so
 *    express.static serves a 206 with the first 16 MiB instead of an
 *    unbounded full-file 200 that the proxy would reject with a 500.
 */
export function uploadsRangeGuard(uploadsDir: string) {
  return (req: Request, _res: Response, next: () => void) => {
    const raw = req.headers.range;
    const clamped = clampRangeHeader(typeof raw === "string" ? raw : undefined);
    if (typeof raw === "string" && clamped !== raw) {
      req.headers.range = clamped;
      next();
      return;
    }
    if (!isSimpleRangeHeader(raw)) {
      // No usable Range header — cap large local files.
      try {
        const st = fs.statSync(path.join(uploadsDir, path.basename(req.path)));
        if (st.isFile() && st.size > PROXY_RESPONSE_LIMIT_BYTES) {
          req.headers.range = `bytes=0-${MAX_RANGE_SPAN_BYTES - 1}`;
        }
      } catch {
        // Not on local disk; the Object Storage path applies its own cap.
      }
    }
    next();
  };
}

/**
 * Rewrite a Range header so its span never exceeds MAX_RANGE_SPAN_BYTES.
 * Returns the original header untouched when it is absent, malformed, or
 * already small enough. Used both by the Object Storage path and by the
 * express.static local-disk fallback (which would otherwise serve a
 * full-file body for `bytes=0-`).
 */
export function clampRangeHeader(header: string | undefined): string | undefined {
  if (!header) return header;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return header;
  const [, rawStart, rawEnd] = m;
  if (rawStart === "") {
    // Suffix range: last N bytes.
    const suffix = parseInt(rawEnd, 10);
    if (Number.isFinite(suffix) && suffix > MAX_RANGE_SPAN_BYTES) {
      return `bytes=-${MAX_RANGE_SPAN_BYTES}`;
    }
    return header;
  }
  const start = parseInt(rawStart, 10);
  if (!Number.isFinite(start)) return header;
  const cappedEnd = start + MAX_RANGE_SPAN_BYTES - 1;
  if (rawEnd === "") return `bytes=${start}-${cappedEnd}`;
  const end = parseInt(rawEnd, 10);
  if (Number.isFinite(end) && end - start + 1 > MAX_RANGE_SPAN_BYTES) {
    return `bytes=${start}-${cappedEnd}`;
  }
  return header;
}

/**
 * Resolve the byte size of an uploaded file so range requests can be served
 * with correct Content-Range headers.
 *
 * Resolution order:
 * 1. cms_media record (authoritative for CMS uploads — matches the object
 *    stored in the bucket even when a later re-mux changed the on-disk copy).
 * 2. Local uploads/ directory stat (covers legacy/migrated files that have no
 *    cms_media row, e.g. ffmpeg-converted MP4s referenced by startup
 *    migrations — the migration script copied these local files verbatim into
 *    the bucket, so local size == bucket size).
 *
 * Returns null when the size cannot be determined; the serving path then
 * falls back to a full 200 stream without Content-Length.
 */
export async function resolveUploadSize(
  filename: string,
  uploadsDir: string,
): Promise<number | null> {
  try {
    const { storage } = await import("./storage");
    const media = await storage.getCmsMediaByFilename(filename);
    if (media && typeof media.size === "number" && media.size > 0) {
      return media.size;
    }
  } catch (err) {
    console.warn(`[objectStorage] cms_media size lookup failed for ${filename}:`, err);
  }
  try {
    const stat = fs.statSync(path.join(uploadsDir, filename));
    if (stat.isFile() && stat.size > 0) return stat.size;
  } catch {
    // File not on local disk — size unknown.
  }
  return null;
}

/**
 * Minimal client surface used by serveObjectWithRanges — matches the
 * @replit/object-storage Client methods we rely on, and allows tests to
 * inject a fake client without a provisioned bucket.
 */
export interface ObjectStorageClientLike {
  exists(name: string): Promise<{ ok: boolean; value?: boolean }>;
  downloadAsStream(name: string, options?: unknown): NodeJS.ReadableStream;
  /**
   * Present on the real @replit/object-storage Client (private method that
   * resolves the underlying GCS Bucket). Used to read authoritative object
   * metadata (size) — see statObject.
   */
  getBucket?(): Promise<{
    file(name: string): {
      getMetadata(): Promise<[{ size?: string | number }]>;
    };
  }>;
}

// Object sizes never change (uploads are immutable, UUID-named), so cache
// bucket metadata lookups for the lifetime of the process.
const objectSizeCache = new Map<string, number>();

/**
 * Fetch the authoritative object size from bucket metadata (cached).
 * @returns the size in bytes, "notFound" when the object does not exist,
 *          or null when metadata is unavailable (e.g. fake/old client).
 */
export async function statObject(
  client: ObjectStorageClientLike,
  objectName: string,
): Promise<number | "notFound" | null> {
  const cached = objectSizeCache.get(objectName);
  if (cached !== undefined) return cached;
  if (typeof (client as any).getBucket !== "function") return null;
  try {
    const bucket = await (client as any).getBucket();
    const [meta] = await bucket.file(objectName).getMetadata();
    const size = parseInt(String(meta?.size), 10);
    if (Number.isFinite(size) && size > 0) {
      objectSizeCache.set(objectName, size);
      return size;
    }
    return null;
  } catch (err: any) {
    if (err?.code === 404 || err?.response?.statusCode === 404) return "notFound";
    console.warn(`[objectStorage] metadata lookup failed for ${objectName}:`, err?.message ?? err);
    return null;
  }
}

/**
 * Stream an object from Object Storage directly into an Express response,
 * honoring HTTP Range requests (required for <video> playback and seeking).
 *
 * When `size` is known and a valid Range header is present, only the requested
 * byte slice is fetched from Object Storage: downloadAsStream forwards its
 * options object to the underlying GCS createReadStream, which supports
 * { start, end } byte-range reads.
 *
 * @param size Total object size in bytes (from cms_media), or null if unknown.
 *             Without a size, range requests fall back to a full 200 stream.
 * @returns true if the file was found and a response was sent, false if not
 *          found or Object Storage is not configured.
 */
export async function serveFromObjectStorage(
  filename: string,
  req: Request,
  res: Response,
  size: number | null,
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  // Client#getBucket is private in the SDK types but exists at runtime;
  // ObjectStorageClientLike models the subset we use.
  return serveObjectWithRanges(
    client as unknown as ObjectStorageClientLike,
    filename,
    req,
    res,
    size,
  );
}

/**
 * Core range-aware serve logic, separated from client construction so it can
 * be unit-tested with a fake client. See serveFromObjectStorage for behavior.
 */
export async function serveObjectWithRanges(
  client: ObjectStorageClientLike,
  filename: string,
  req: Request,
  res: Response,
  fallbackSize: number | null,
): Promise<boolean> {
  const objectName = `uploads/${filename}`;

  // Authoritative size comes from bucket metadata (cached per process).
  // This guards against stale cms_media sizes — e.g. rows recorded before a
  // faststart re-mux whose file was later migrated to the bucket from disk.
  // The metadata call doubles as the existence check.
  const stat = await statObject(client, objectName);
  if (stat === "notFound") return false;

  let size: number | null = typeof stat === "number" ? stat : null;
  if (size === null) {
    // Metadata unavailable — verify existence the old way, use fallback size.
    const existsResult = await client.exists(objectName);
    if (!existsResult.ok || !existsResult.value) return false;
    size = fallbackSize;
  }

  res.setHeader("Content-Type", mimeFromFilename(filename));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");

  let streamOptions: { start: number; end: number } | undefined;

  if (size !== null && size > 0) {
    // Clamp oversized/open-ended ranges so the response body never exceeds
    // the deployment proxy's 32 MiB limit (see MAX_RANGE_SPAN_BYTES).
    let range = parseRange(
      clampRangeHeader(req.headers.range as string | undefined),
      size,
    );
    // No Range header on a file bigger than the proxy's response limit: a
    // full 200 body would be rejected with an edge-level 500. Serve the first
    // MAX_RANGE_SPAN_BYTES as a 206 instead — Accept-Ranges tells clients how
    // to fetch the rest.
    if (range === null && size > PROXY_RESPONSE_LIMIT_BYTES) {
      range = { start: 0, end: MAX_RANGE_SPAN_BYTES - 1 };
    }
    if (range === "unsatisfiable") {
      res.status(416);
      res.setHeader("Content-Range", `bytes */${size}`);
      res.end();
      return true;
    }
    if (range) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      res.setHeader("Content-Length", String(range.end - range.start + 1));
      streamOptions = range;
      // When the parsed range covers the entire file (bytes=0- on a file where
      // end === size - 1), skip byte-range options so downloadAsStream performs
      // a normal full-file read instead of a GCS byte-range read.  Large
      // byte-range reads that span the whole file intermittently stall or error
      // in GCS, causing HTTP 500.  The 206 status, Content-Range, and
      // Content-Length headers are still sent so browsers know seeking works.
      if (range.start === 0 && range.end === size - 1) {
        streamOptions = undefined;
      }
    } else {
      res.setHeader("Content-Length", String(size));
    }
  }

  return new Promise((resolve) => {
    // DownloadOptions doesn't type { start, end }, but downloadAsStream passes
    // its options object straight through to GCS createReadStream, which does
    // support byte-range reads — so only the requested bytes are transferred.
    const stream = client.downloadAsStream(
      `uploads/${filename}`,
      streamOptions as any,
    );
    // Unknown size means we could be streaming an unbounded full-file body.
    // The proxy hard-fails any response over 32 MiB, so abort the stream
    // before crossing the limit — a truncated/aborted response is strictly
    // better than the guaranteed edge-level 500.
    if (streamOptions === undefined && (size === null || size <= 0)) {
      let sent = 0;
      stream.on("data", (chunk: Buffer) => {
        sent += chunk.length;
        if (sent > UNKNOWN_SIZE_ABORT_BYTES) {
          (stream as any).destroy?.(
            new Error(
              `unknown-size stream for ${filename} exceeded safe proxy response limit; aborting`,
            ),
          );
        }
      });
    }
    stream.on("error", (err) => {
      console.error(`[objectStorage] Stream error for ${filename}:`, err);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
      resolve(true); // response already committed; don't fall through to next handler
    });
    stream.on("end", () => resolve(true));
    stream.pipe(res, { end: true });
  });
}
