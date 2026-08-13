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

  // One-time data correction: the order-save mutation previously wrote 0-based
  // indices (0, 1, 2…) but the homepage slot algorithm is 1-based and ignores
  // any row with homepage_order < 1. If any project still has homepage_order = 0
  // (the tell-tale sign of old 0-based data), increment ALL ordered rows by 1 so
  // the full set stays contiguous and aligns with the slot algorithm.
  // This check makes the block idempotent: once all rows are ≥ 1 it never fires.
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const zeroRows = await db.execute(
      sql`SELECT 1 FROM cms_projects WHERE homepage_order = 0 LIMIT 1`
    );
    if (zeroRows.rows.length > 0) {
      await db.execute(
        sql`UPDATE cms_projects SET homepage_order = homepage_order + 1 WHERE homepage_order IS NOT NULL`
      );
      console.log("homepage_order corrected from 0-based to 1-based.");
    }
  } catch (err) {
    // Non-fatal: the app still works; editors can re-save order from the CMS.
    console.warn("homepage_order correction migration failed (non-fatal):", err);
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
