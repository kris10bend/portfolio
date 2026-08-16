/**
 * One-time migration: copy all files from the local uploads/ directory into
 * Replit Object Storage so they are accessible from production deployments.
 *
 * Usage (after provisioning a bucket in the Replit UI):
 *   npm run migrate:uploads
 *
 * Safe to re-run — already-uploaded objects are simply overwritten.
 * The local files are NOT deleted; they remain as a local dev fallback.
 */

import { Client } from "@replit/object-storage";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

async function migrate() {
  if (!process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID) {
    console.error(
      "❌  REPLIT_OBJECT_STORAGE_BUCKET_ID is not set.\n" +
      "    Provision a bucket in the Replit UI (Tools → App Storage) first.",
    );
    process.exit(1);
  }

  const client = new Client();
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => {
    const stat = fs.statSync(path.join(UPLOADS_DIR, f));
    return stat.isFile();
  });

  if (files.length === 0) {
    console.log("No files found in uploads/ — nothing to migrate.");
    return;
  }

  console.log(`Migrating ${files.length} file(s) to Object Storage...\n`);
  let ok = 0;
  let fail = 0;

  for (const filename of files) {
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
      const buffer = fs.readFileSync(filePath);
      const ft = await fileTypeFromBuffer(buffer);
      const mimeType = ft?.mime ?? "application/octet-stream";

      const result = await client.uploadFromBytes(`uploads/${filename}`, buffer);
      if (result.ok) {
        console.log(`  ✓  ${filename}  (${mimeType})`);
        ok++;
      } else {
        console.error(`  ✗  ${filename}  — upload error`);
        fail++;
      }
    } catch (err: any) {
      console.error(`  ✗  ${filename}  — ${err?.message ?? err}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} uploaded, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
