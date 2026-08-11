import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { requireAdmin } from "./auth";

/** Escape special HTML characters so untrusted values are safe in HTML sinks. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("A valid email address is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
});

/**
 * Rate limiter: max 5 submissions per IP per 15 minutes.
 * Express is configured with `trust proxy 1` so req.ip reflects the real
 * client address (not the Replit proxy). The library default keyGenerator
 * uses req.ip, which is safe because the proxy layer is trusted at the
 * framework level — forged X-Forwarded-For headers from untrusted callers
 * are stripped by the trusted-proxy logic before req.ip is derived.
 */
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent. Please wait a few minutes and try again." },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // POST /api/contact — send contact form email via Resend (Replit Connector)
  app.post("/api/contact", contactRateLimiter, async (req: Request, res: Response) => {
    // Honeypot: check before schema validation so bots get a success-looking
    // response rather than a 400 that reveals they were detected.
    if (typeof req.body?.website === "string" && req.body.website.length > 0) {
      return res.status(200).json({ success: true });
    }

    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid submission";
      return res.status(400).json({ error: firstError });
    }

    const { name, email, message } = parsed.data;

    try {
      const connectors = new ReplitConnectors();

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeMessage = escapeHtml(message);

      const emailResponse = await connectors.proxy("resend", "/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Portfolio Contact <onboarding@resend.dev>",
          to: ["kris10bend@gmail.com"],
          reply_to: email,
          subject: `New message from ${safeName} via portfolio`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
              <h2 style="margin: 0 0 24px; font-size: 20px; font-weight: 500; color: #002fa7;">
                New message from your portfolio contact form
              </h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; width: 100px; color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Email</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;"><a href="mailto:${safeEmail}" style="color: #002fa7;">${safeEmail}</a></td>
                </tr>
              </table>
              <div style="background: #f9f9f9; border-radius: 4px; padding: 16px; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</div>
              <p style="margin: 24px 0 0; font-size: 13px; color: #999;">Reply directly to this email to respond to ${safeName}.</p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errBody = await emailResponse.text();
        console.error("Resend API error:", emailResponse.status, errBody);
        return res.status(502).json({ error: "Failed to send your message. Please try again." });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Unexpected error sending email:", err);
      return res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  });

  // ─── Admin auth routes ─────────────────────────────────────────────────────

  // POST /api/admin/login — authenticate and create session
  app.post("/api/admin/login", (req: Request, res: Response, next) => {
    passport.authenticate(
      "local",
      (err: unknown, user: Express.User | false) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          return res.json({ ok: true });
        });
      }
    )(req, res, next);
  });

  // POST /api/admin/logout — destroy session
  app.post("/api/admin/logout", requireAdmin, (req: Request, res: Response, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.json({ ok: true });
      });
    });
  });

  // GET /api/admin/me — check authentication status
  app.get("/api/admin/me", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      const user = req.user as { username?: string } | undefined;
      return res.json({ authenticated: true, username: user?.username });
    }
    return res.json({ authenticated: false });
  });

  // ─── Admin project CRUD ────────────────────────────────────────────────────

  // GET /api/admin/projects — list all projects ordered by homepageOrder
  app.get("/api/admin/projects", requireAdmin, async (req: Request, res: Response) => {
    try {
      const projects = await storage.getCmsProjects();
      return res.json(projects);
    } catch (err) {
      console.error("GET /api/admin/projects error:", err);
      return res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // POST /api/admin/projects — create a blank draft project (no body accepted)
  app.post("/api/admin/projects", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const project = await storage.createCmsProject({});
      return res.status(201).json(project);
    } catch (err) {
      console.error("POST /api/admin/projects error:", err);
      return res.status(500).json({ error: "Failed to create project" });
    }
  });

  // PUT /api/admin/projects/order — bulk-update homepageOrder
  // Must be defined BEFORE /api/admin/projects/:id to avoid route shadowing
  app.put("/api/admin/projects/order", requireAdmin, async (req: Request, res: Response) => {
    const orderSchema = z.array(z.object({ id: z.string(), homepageOrder: z.number().int() }));
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid order payload" });
    }
    try {
      await storage.updateCmsProjectsOrder(parsed.data);
      return res.json({ ok: true });
    } catch (err) {
      console.error("PUT /api/admin/projects/order error:", err);
      return res.status(500).json({ error: "Failed to save order" });
    }
  });

  // PUT /api/admin/projects/:id — update project fields
  const updateProjectSchema = z.object({
    title: z.string().max(500).optional(),
    slug: z.string().max(500).optional(),
    caseStudyLabel: z.string().max(500).nullable().optional(),
    quote: z.string().max(5000).nullable().optional(),
    status: z.enum(["draft", "published"]).optional(),
    homepageOrder: z.number().int().nullable().optional(),
    showOnHomepage: z.boolean().optional(),
    metaDescription: z.string().max(500).nullable().optional(),
    nextProjectSlug: z.string().max(500).nullable().optional(),
  });

  app.put("/api/admin/projects/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid payload" });
    }
    try {
      const updated = await storage.updateCmsProject(id, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json(updated);
    } catch (err) {
      console.error("PUT /api/admin/projects/:id error:", err);
      return res.status(500).json({ error: "Failed to update project" });
    }
  });

  // POST /api/admin/projects/:id/duplicate — copy project as draft
  app.post("/api/admin/projects/:id/duplicate", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const original = await storage.getCmsProjectById(id);
      if (!original) {
        return res.status(404).json({ error: "Project not found" });
      }
      const copy = await storage.createCmsProject({
        title: `${original.title} (copy)`,
        caseStudyLabel: original.caseStudyLabel,
        quote: original.quote,
        metaDescription: original.metaDescription,
        nextProjectSlug: original.nextProjectSlug,
        status: "draft",
        showOnHomepage: false,
      });
      return res.status(201).json(copy);
    } catch (err) {
      console.error("POST /api/admin/projects/:id/duplicate error:", err);
      return res.status(500).json({ error: "Failed to duplicate project" });
    }
  });

  // DELETE /api/admin/projects/:id — soft-archive (sets archivedAt; project can be restored)
  app.delete("/api/admin/projects/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const existing = await storage.getCmsProjectById(id);
      if (!existing) {
        return res.status(404).json({ error: "Project not found" });
      }
      await storage.archiveCmsProject(id);
      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/admin/projects/:id error:", err);
      return res.status(500).json({ error: "Failed to archive project" });
    }
  });

  // POST /api/admin/projects/:id/restore — unarchive a project
  app.post("/api/admin/projects/:id/restore", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      await storage.restoreCmsProject(id);
      return res.json({ ok: true });
    } catch (err) {
      console.error("POST /api/admin/projects/:id/restore error:", err);
      return res.status(500).json({ error: "Failed to restore project" });
    }
  });

  return httpServer;
}
