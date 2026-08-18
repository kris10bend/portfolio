import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { uploadsRangeGuard } from "./objectStorage";
import path from "path";
import fs from "fs";

const app = express();
const httpServer = createServer(app)

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Trust the first hop in X-Forwarded-For (Replit's proxy layer).
// This makes req.ip reflect the real client IP rather than the proxy.
app.set("trust proxy", 1);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure the DB schema is current before accepting requests.
  // This runs `drizzle-kit push` which is idempotent — safe on every startup.
  // If the push fails the process exits so we never serve stale-schema traffic.
  try {
    const { execSync } = await import("child_process");
    execSync("npm run db:push", { stdio: "inherit" });
  } catch (err) {
    console.error("DB schema push failed — refusing to start:", err);
    process.exit(1);
  }

  // ── Auto-seed if the database is empty ─────────────────────────────────────
  // On a fresh production deployment the CMS tables exist (drizzle-kit push
  // just created them) but hold no rows. Load the bundled seed.sql snapshot
  // so the live site shows real content without any manual step.
  // Idempotent: skipped immediately once cms_projects has at least one row.
  try {
    const { pool } = await import("./db");
    const { rows: existingRows } = await pool.query(
      "SELECT 1 FROM cms_projects LIMIT 1"
    );
    if (existingRows.length === 0) {
      const seedPath = path.resolve(process.cwd(), "server/seed.sql");
      if (fs.existsSync(seedPath)) {
        console.log("Database empty — seeding from server/seed.sql…");
        const seedSql = fs.readFileSync(seedPath, "utf8");
        // Each INSERT is on its own line (pg_dump --inserts format).
        const stmts = seedSql
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("\\"));
        for (const stmt of stmts) {
          await pool.query(stmt);
        }
        console.log(`Seeded ${stmts.length} rows from seed.sql.`);
      } else {
        console.warn("server/seed.sql not found — skipping auto-seed.");
      }
    }
  } catch (err) {
    // Non-fatal: the app still works with static fallback data.
    console.warn("Auto-seed failed (non-fatal):", err);
  }

  // One-time idempotent migration: fix homepage_order values so that:
  //   (a) any row with homepage_order = 0 or negative is set to NULL
  //   (b) remaining ordered rows are renumbered contiguously 1, 2, 3…
  //       with building-bridges forced to slot 1
  // Completion is recorded in a migrations_log table so this never re-runs.
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");

    // Ensure the migrations log table exists.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migrations_log (
        name TEXT PRIMARY KEY,
        ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const already = await db.execute(
      sql`SELECT 1 FROM migrations_log WHERE name = 'homepage_order_v1' LIMIT 1`
    );

    if (already.rows.length === 0) {
      // Step 1: null-out sub-1 values for all projects EXCEPT building-bridges,
      // so building-bridges is always included in the upcoming ranking even if
      // its current value is 0 or negative.
      await db.execute(sql`
        UPDATE cms_projects
        SET homepage_order = NULL
        WHERE homepage_order IS NOT NULL
          AND homepage_order < 1
          AND slug != 'building-bridges'
      `);

      // Step 2: Renumber contiguously 1, 2, 3…
      // Include building-bridges unconditionally (even if its order is NULL or
      // sub-1 after historical corruption) and sort it first.
      // Other projects are included only when homepage_order IS NOT NULL (≥1
      // after step 1). Tie-break by created_at for stability.
      await db.execute(sql`
        UPDATE cms_projects
        SET homepage_order = new_order
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   ORDER BY
                     CASE WHEN slug = 'building-bridges' THEN 0 ELSE 1 END,
                     COALESCE(homepage_order, 0),
                     created_at
                 ) AS new_order
          FROM cms_projects
          WHERE homepage_order IS NOT NULL
             OR slug = 'building-bridges'
        ) ranked
        WHERE cms_projects.id = ranked.id
      `);

      // Record completion.
      await db.execute(
        sql`INSERT INTO migrations_log (name) VALUES ('homepage_order_v1') ON CONFLICT DO NOTHING`
      );

      console.log("homepage_order migration homepage_order_v1 completed.");
    }
  } catch (err) {
    // Non-fatal: the app still works; editors can re-save order from the CMS.
    console.warn("homepage_order_v1 migration failed (non-fatal):", err);
  }


  // ── Migration: replace oversized GIFs with converted MP4 files ─────────────
  // Two GIFs were 36 MB and 75 MB — too large for browsers to render.
  // They were converted to MP4 (1.6 MB and 3.5 MB). This migration updates DB
  // references in both cms_projects and cms_content_blocks so all environments
  // (dev and production) converge without manual SQL.
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");

    const already = await db.execute(
      sql`SELECT 1 FROM migrations_log WHERE name = 'gif_to_mp4_v1' LIMIT 1`
    );

    if (already.rows.length === 0) {
      // Vibe Camp featured image: 36 MB GIF → 1.6 MB MP4
      await db.execute(sql`
        UPDATE cms_projects
        SET featured_image_url = '/uploads/b3b5f8a3-2f00-40b7-8bc0-9c309c3ec778.mp4'
        WHERE slug = 'vibe-camp'
          AND featured_image_url = '/uploads/8ce62caf-9323-4459-b6a1-9c055e7106db.gif'
      `);

      // Collective Intelligence 2 gallery split-block: 75 MB GIF → 3.5 MB MP4
      await db.execute(sql`
        UPDATE cms_content_blocks
        SET payload = replace(
          replace(
            payload::text,
            'c2519b33-af26-4dc9-a0a2-071045df8c26.gif',
            '26f9e478-8d12-42f1-8110-572783db347f.mp4'
          ),
          '"mediaType":"image"}',
          '"mediaType":"video"}'
        )::json
        WHERE payload::text LIKE '%c2519b33-af26-4dc9-a0a2-071045df8c26.gif%'
      `);

      await db.execute(
        sql`INSERT INTO migrations_log (name) VALUES ('gif_to_mp4_v1') ON CONFLICT DO NOTHING`
      );

      console.log("gif_to_mp4_v1 migration completed.");
    }
  } catch (err) {
    console.warn("gif_to_mp4_v1 migration failed (non-fatal):", err);
  }

  // ── Object Storage health check ─────────────────────────────────────────────
  // Emit a prominent startup warning when running in production without an
  // Object Storage bucket. In this state new uploads go to the container disk
  // only and will be lost the next time the container restarts or is redeployed.
  // (Existing files committed to git are safe because they're in the build
  // image, but any post-deploy upload is ephemeral.)
  if (process.env.NODE_ENV === "production" && !process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID) {
    console.error(
      "[objectStorage] CRITICAL: REPLIT_OBJECT_STORAGE_BUCKET_ID is not set. " +
      "Uploads are served from the container disk via express.static (etag/last-modified " +
      "headers visible in curl), not from the bucket. Any file uploaded after the last build " +
      "will be lost on the next container restart or redeploy. " +
      "Provision an Object Storage bucket in the Replit workspace to fix this."
    );
  }

  // ── Migration: correct stale cms_media sizes from on-disk truth ─────────────
  // After a faststart re-mux (or any post-upload processing) the on-disk file
  // size can differ slightly from the size recorded in cms_media at upload time.
  // Stale sizes cause incorrect Content-Range headers — browsers see the wrong
  // total length and may fail to seek or play past the stale boundary.
  // This migration corrects every cms_media row where the local file exists but
  // its size disagrees with the recorded value.
  //
  // Example: 961bd263-7fc8-4df6-800c-68c2281488ee.mp4
  //   cms_media.size = 45,661,744 (recorded at upload)
  //   on-disk size   = 45,659,277 (after a subsequent re-mux)
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");

    const already = await db.execute(
      sql`SELECT 1 FROM migrations_log WHERE name = 'cms_media_size_correction_v1' LIMIT 1`
    );

    if (already.rows.length === 0) {
      const localUploadsDir = path.resolve(process.cwd(), "uploads");
      const { rows: mediaRows } = await (await import("./db")).pool.query<{
        id: string;
        filename: string;
        size: number;
      }>("SELECT id, filename, size FROM cms_media");

      let corrected = 0;
      for (const m of mediaRows) {
        try {
          const stat = fs.statSync(path.join(localUploadsDir, m.filename));
          if (stat.isFile() && stat.size > 0 && stat.size !== m.size) {
            await (await import("./db")).pool.query(
              "UPDATE cms_media SET size = $1 WHERE id = $2",
              [stat.size, m.id]
            );
            console.log(
              `cms_media_size_correction_v1: ${m.filename} ${m.size} → ${stat.size} bytes`
            );
            corrected++;
          }
        } catch {
          // File not on local disk — skip; bucket metadata handles it at serve time.
        }
      }

      await db.execute(
        sql`INSERT INTO migrations_log (name) VALUES ('cms_media_size_correction_v1') ON CONFLICT DO NOTHING`
      );

      console.log(`cms_media_size_correction_v1 completed (${corrected} correction(s)).`);
    }
  } catch (err) {
    console.warn("cms_media_size_correction_v1 migration failed (non-fatal):", err);
  }

  // ── Migration: sync local uploads/ to Object Storage (one-time catch-up) ────
  // When REPLIT_OBJECT_STORAGE_BUCKET_ID becomes available for the first time,
  // upload every file in uploads/ to the bucket so that pre-provisioning uploads
  // survive future container restarts. Idempotent via migrations_log.
  //
  // After this runs, new uploads go straight to the bucket (routes.ts), so the
  // local disk copy is only a dev fallback.
  try {
    if (process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID) {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const already = await db.execute(
        sql`SELECT 1 FROM migrations_log WHERE name = 'local_to_bucket_sync_v1' LIMIT 1`
      );

      if (already.rows.length === 0) {
        const { uploadToObjectStorage } = await import("./objectStorage");
        const localUploadsDir = path.resolve(process.cwd(), "uploads");
        let uploaded = 0;
        let failed = 0;

        const files = fs.readdirSync(localUploadsDir).filter(
          (f) => !f.startsWith("_tmp_")
        );

        for (const file of files) {
          try {
            const filePath = path.join(localUploadsDir, file);
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;
            const buf = fs.readFileSync(filePath);
            const ok = await uploadToObjectStorage(file, buf);
            if (ok) {
              uploaded++;
            } else {
              failed++;
              console.error(`local_to_bucket_sync_v1: uploadToObjectStorage returned false for ${file}`);
            }
          } catch (fileErr) {
            failed++;
            console.error(`local_to_bucket_sync_v1: failed to upload ${file}:`, fileErr);
          }
        }

        if (failed === 0) {
          // Only mark complete when every file reached the bucket — if any
          // upload failed (transient network error, quota, etc.) we leave the
          // migration unrecorded so the next startup retries the whole set.
          // Once the disk is gone after a container rotation, unsynced files
          // are permanently lost, so partial success is not acceptable here.
          await db.execute(
            sql`INSERT INTO migrations_log (name) VALUES ('local_to_bucket_sync_v1') ON CONFLICT DO NOTHING`
          );
          console.log(
            `local_to_bucket_sync_v1 completed: ${uploaded} file(s) uploaded to bucket.`
          );
        } else {
          console.error(
            `[objectStorage] CRITICAL: local_to_bucket_sync_v1 left ${failed} file(s) un-synced to the bucket. ` +
            `The migration will retry on the next startup. Do NOT redeploy until it completes cleanly — ` +
            `any file that has not reached the bucket will be permanently unavailable after a container restart.`
          );
        }
      }
    }
  } catch (err) {
    console.warn("local_to_bucket_sync_v1 migration failed (non-fatal):", err);
  }

  // Serve user-uploaded images.
  // When REPLIT_OBJECT_STORAGE_BUCKET_ID is set (production), files are streamed
  // from the Object Storage bucket so they survive container restarts and are
  // visible on all production replicas. Without the bucket env var the local
  // uploads/ directory is used as a fallback (development).
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use(
    "/uploads",
    // The deployment proxy rejects response bodies larger than 32 MiB with
    // an edge-level 500 — this froze videos at 0:00 on the published site.
    // The guard clamps/normalizes Range headers so neither serving path can
    // produce an oversized response. See uploadsRangeGuard in objectStorage.ts.
    uploadsRangeGuard(uploadsDir),
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-Content-Type-Options", "nosniff");

      // Try Object Storage first when a bucket is configured.
      if (process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID) {
        const filename = path.basename(req.path);
        if (filename && filename !== ".") {
          const { serveFromObjectStorage, resolveUploadSize } = await import("./objectStorage");
          // Look up the file's byte size (cms_media record, falling back to
          // the local uploads/ copy for legacy/migrated files) so range
          // requests can be served with correct Content-Range headers —
          // required for <video> buffering/seeking in browsers.
          const fileSize = await resolveUploadSize(filename, uploadsDir);
          const served = await serveFromObjectStorage(filename, req, res, fileSize);
          if (served) return;
        }
      }

      // Fall back to local disk (dev, or production before bucket was provisioned).
      next();
    },
    express.static(uploadsDir),
  );

  setupAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
