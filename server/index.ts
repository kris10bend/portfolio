import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
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


  // Serve user-uploaded images from the top-level uploads/ directory.
  // This is outside both the source tree and build output so it persists across
  // builds and deployments on Replit's durable filesystem.
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use(
    "/uploads",
    (_req, res, next) => {
      // Defense-in-depth: prevent browsers from MIME-sniffing the response
      // type. Combined with magic-byte verification on upload, this closes the
      // stored-XSS path even if a file slips through with a wrong extension.
      res.setHeader("X-Content-Type-Options", "nosniff");
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
