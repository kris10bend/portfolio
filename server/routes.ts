import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { z } from "zod";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // POST /api/contact — send contact form email via Resend (Replit Connector)
  app.post("/api/contact", async (req: Request, res: Response) => {
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

  return httpServer;
}
