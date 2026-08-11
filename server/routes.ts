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
      return res.json({ authenticated: true });
    }
    return res.json({ authenticated: false });
  });

  return httpServer;
}
