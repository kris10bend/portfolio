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
import type { Response } from "express";

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
 * Stream an object from Object Storage directly into an Express response.
 * Sets Content-Type and cache headers automatically.
 * @returns true if the file was found and streamed, false if not found or OS not configured.
 */
export async function serveFromObjectStorage(
  filename: string,
  res: Response,
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const existsResult = await client.exists(`uploads/${filename}`);
  if (!existsResult.ok || !existsResult.value) return false;

  res.setHeader("Content-Type", mimeFromFilename(filename));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  return new Promise((resolve) => {
    const stream = client.downloadAsStream(`uploads/${filename}`);
    stream.on("error", (err) => {
      console.error(`[objectStorage] Stream error for ${filename}:`, err);
      resolve(false);
    });
    stream.on("end", () => resolve(true));
    stream.pipe(res, { end: true });
  });
}
