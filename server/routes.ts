import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { requireAdmin } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";
import { randomUUID } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { projects as staticProjects } from "../client/src/data/projects";
import type { GalleryBlock, ProjectImageAsset } from "../client/src/types/project";

// ─── Multer upload config ──────────────────────────────────────────────────

// Store uploads in a top-level `uploads/` directory that is outside the build
// output (`dist/`) and the source tree (`client/`). This directory is mutable
// runtime data, not a build artifact, so it persists across restarts and
// deployments on Replit's durable filesystem.
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
// Ensure the uploads directory exists at startup
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Maps verified MIME types to canonical file extensions.
 * These are the only types accepted at the server side.
 */
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/**
 * Use memory storage so we can inspect the raw bytes before writing to disk.
 * The actual file write happens in the route handler after content verification.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB (covers large video files)
  // Coarse pre-check on declared MIME — not trusted for security, but filters
  // obvious non-image/video requests early before we buffer the full file.
  fileFilter: (_req, file, cb) => {
    if (Object.keys(ALLOWED_MIME_TO_EXT).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, GIF images and MP4/WebM videos are allowed"));
    }
  },
});

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

  // ─── Public project API ───────────────────────────────────────────────────

  /**
   * Converts a CMS content block's payload into a GalleryBlock suitable for
   * the existing ProjectGallerySection component.
   */
  function blockToGalleryBlock(
    type: string,
    payload: unknown
  ): GalleryBlock | null {
    const p = payload as Record<string, unknown>;
    if (type === "full-image") {
      return {
        type: "full",
        image: {
          src: String(p.src ?? ""),
          alt: String(p.alt ?? ""),
          ...(p.objectPosition ? { objectPosition: String(p.objectPosition) } : {}),
        },
      };
    }
    if (type === "split-image") {
      const l = (p.left ?? {}) as Record<string, unknown>;
      const r = (p.right ?? {}) as Record<string, unknown>;
      return {
        type: "split",
        left: {
          src: String(l.src ?? ""),
          alt: String(l.alt ?? ""),
          ...(l.objectPosition ? { objectPosition: String(l.objectPosition) } : {}),
        },
        right: {
          src: String(r.src ?? ""),
          alt: String(r.alt ?? ""),
          ...(r.objectPosition ? { objectPosition: String(r.objectPosition) } : {}),
        },
        wide: p.wide === "right" ? "right" : "left",
      };
    }
    if (type === "text") {
      const paragraphs = (p.paragraphs as string[] | undefined) ?? [];
      // Only include the block when there is at least one non-empty paragraph
      return paragraphs.some((para) => para.trim().length > 0)
        ? { type: "text", paragraphs }
        : null;
    }
    if (type === "video") {
      const src = String(p.src ?? "");
      // Only include the block when a video source URL is present
      return src ? {
        type: "video",
        src,
        ...(p.alt ? { alt: String(p.alt) } : {}),
        ...(p.caption ? { caption: String(p.caption) } : {}),
        ...(p.captionVisible !== undefined ? { captionVisible: Boolean(p.captionVisible) } : {}),
      } : null;
    }
    return null; // unknown block type — skip silently
  }

  /**
   * GET /api/projects
   * Returns projects for the homepage grid, interleaved by position.
   *
   * Ordering model (gradual migration):
   * - CMS projects are placed at the 1-based slot indicated by `homepageOrder`.
   * - Static fallback projects (whose slugs have no DB record at all) fill the
   *   remaining empty slots in their natural order.
   *
   * Example with Building Bridges at homepageOrder=2:
   *   Slot 1 → Journey to Net Zero (static)
   *   Slot 2 → Building Bridges   (DB, homepageOrder:2)
   *   Slot 3 → Designing Better Futures (static)  … etc.
   *
   * Static projects whose slug exists in the DB in any state (draft/archived)
   * are excluded — the CMS is the authoritative source once a slug is registered.
   */
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const [dbProjects, allDbSlugs] = await Promise.all([
        storage.getPublishedHomepageProjects(),
        storage.getAllCmsProjectSlugs(),
      ]);

      type ProjectCard = {
        slug: string;
        title: string;
        excerpt: string;
        heroImageSrc: string;
        heroImageAlt: string;
      };

      // Build homepage card entries from DB records, recording their target slot
      const dbCards: Array<{ order: number; card: ProjectCard }> = dbProjects
        .filter((p) => p.homepageOrder !== null && p.homepageOrder !== undefined)
        .map((p) => ({
          order: p.homepageOrder as number,
          card: {
            slug: p.slug,
            title: p.title.replace(/\n/g, " "),
            excerpt: p.metaDescription ?? ((p.description as string[] | null)?.[0] ?? ""),
            heroImageSrc: p.heroImageUrl ?? "",
            heroImageAlt: p.heroImageAlt ?? "",
          },
        }));
      // DB projects without a homepageOrder are appended at the end
      const dbCardsNoOrder: ProjectCard[] = dbProjects
        .filter((p) => p.homepageOrder === null || p.homepageOrder === undefined)
        .map((p) => ({
          slug: p.slug,
          title: p.title.replace(/\n/g, " "),
          excerpt: p.metaDescription ?? ((p.description as string[] | null)?.[0] ?? ""),
          heroImageSrc: p.heroImageUrl ?? "",
          heroImageAlt: p.heroImageAlt ?? "",
        }));

      // Static cards whose slugs have NO DB record at all
      const staticCards: ProjectCard[] = staticProjects
        .filter((sp) => !allDbSlugs.has(sp.slug))
        .map((sp) => ({
          slug: sp.slug,
          title: sp.title.replace(/\n/g, " "),
          excerpt: sp.metaDescription ?? sp.description[0] ?? "",
          heroImageSrc: sp.heroImage.src,
          heroImageAlt: sp.heroImage.alt,
        }));

      // ── Positional interleave ─────────────────────────────────────────────
      // Reserve slots for DB-ordered projects; fill gaps with static projects.
      const maxSlot = Math.max(
        0,
        ...dbCards.map((d) => d.order),
        dbCards.length + staticCards.length + dbCardsNoOrder.length
      );
      // Build a sparse slot map (1-indexed → card)
      const slots: (ProjectCard | null)[] = new Array(maxSlot + 1).fill(null);
      for (const { order, card } of dbCards) {
        // If two DB projects claim the same slot, append the duplicate at the end
        if (order >= 1 && order < slots.length && slots[order] === null) {
          slots[order] = card;
        } else {
          dbCardsNoOrder.push(card);
        }
      }

      // Walk slots 1..maxSlot; fill nulls with static cards in order
      const result: ProjectCard[] = [];
      let staticIdx = 0;
      for (let i = 1; i < slots.length; i++) {
        if (slots[i] !== null) {
          result.push(slots[i] as ProjectCard);
        } else if (staticIdx < staticCards.length) {
          result.push(staticCards[staticIdx++]);
        }
      }
      // Append any remaining static cards and unordered DB cards
      while (staticIdx < staticCards.length) result.push(staticCards[staticIdx++]);
      result.push(...dbCardsNoOrder);

      return res.json(result);
    } catch (err) {
      console.error("GET /api/projects error:", err);
      return res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  /**
   * GET /api/projects/:slug
   * Returns full ProjectData for a single published project.
   *
   * Fallback logic:
   * - If any DB record exists for this slug (draft, archived, or published),
   *   the CMS is the authoritative source. Only published+non-archived records
   *   are served; otherwise 404.
   * - If NO DB record exists for this slug, fall back to the static projects.ts
   *   data so unmigrated case studies remain accessible.
   */
  app.get("/api/projects/:slug", async (req: Request, res: Response) => {
    // String() cast: Express types req.params values as string | string[],
    // but in practice route params are always strings.
    const slug = String(req.params.slug);

    try {
      // Check whether this slug is managed in the CMS at all (any status).
      const anyCmsRecord = await storage.getCmsProjectBySlugAny(slug);

      if (!anyCmsRecord) {
        // ── Static fallback: slug not yet in the CMS ──────────────────────
        const staticProject = staticProjects.find((p) => p.slug === slug);
        if (!staticProject) {
          return res.status(404).json({ error: "Project not found" });
        }
        // Static data already matches ProjectData shape — serve directly.
        return res.json(staticProject);
      }

      // Slug is CMS-managed; only serve if published and not archived.
      const dbProject = await storage.getPublishedCmsProjectBySlug(slug);
      if (!dbProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      // ── DB record → ProjectData ───────────────────────────────────────────
      const blocks = await storage.getContentBlocksByProjectId(dbProject.id);

      const gallery: GalleryBlock[] = blocks
        .map((b) => blockToGalleryBlock(b.type, b.payload))
        .filter((g): g is GalleryBlock => g !== null);

      // Resolve nextProject title from DB (published only) or static fallback
      let nextProject: { slug: string; title: string; image: ProjectImageAsset } | undefined;
      if (dbProject.nextProjectSlug) {
        const nextSlug = dbProject.nextProjectSlug;
        const nextDbProject = await storage.getPublishedCmsProjectBySlug(nextSlug);
        const nextTitle =
          nextDbProject?.title ??
          staticProjects.find((p) => p.slug === nextSlug)?.title ??
          nextSlug;
        nextProject = {
          slug: nextSlug,
          title: nextTitle,
          image: {
            src: dbProject.nextProjectImageUrl ?? "",
            alt: nextTitle,
            isPlaceholder: !dbProject.nextProjectImageUrl,
          },
        };
      }

      const metadata = (dbProject.metadata ?? {}) as {
        client?: string;
        year?: string;
        scope?: string;
        role?: string;
      };

      return res.json({
        slug: dbProject.slug,
        caseStudyLabel: dbProject.caseStudyLabel ?? "CASE STUDY",
        title: dbProject.title,
        heroImage: {
          src: dbProject.heroImageUrl ?? "",
          alt: dbProject.heroImageAlt ?? "",
        },
        metadata: {
          client: metadata.client ?? "",
          year: metadata.year ?? "",
          ...(metadata.scope ? { scope: metadata.scope } : {}),
          ...(metadata.role ? { role: metadata.role } : {}),
        },
        quote: dbProject.quote ?? "",
        description: (dbProject.description as string[] | null) ?? [],
        gallery,
        ...(dbProject.metaDescription
          ? { metaDescription: dbProject.metaDescription }
          : {}),
        ...(nextProject ? { nextProject } : {}),
      });
    } catch (err) {
      console.error(`GET /api/projects/${slug} error:`, err);
      return res.status(500).json({ error: "Failed to fetch project" });
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

  // ─── Admin project full editor endpoints ───────────────────────────────────

  // GET /api/admin/projects/:id/full — return project + ordered content blocks
  app.get("/api/admin/projects/:id/full", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const project = await storage.getCmsProjectById(id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const blocks = await storage.getContentBlocksByProjectId(id);
      return res.json({ project, blocks });
    } catch (err) {
      console.error("GET /api/admin/projects/:id/full error:", err);
      return res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Zod schema for a single content block as sent from the editor
  const contentBlockSchema = z.object({
    type: z.enum(["text", "full-image", "split-image", "video"]),
    payload: z.record(z.unknown()),
  });

  const fullProjectSaveSchema = z.object({
    title: z.string().max(500).optional(),
    slug: z.string().max(500).optional(),
    caseStudyLabel: z.string().max(500).nullable().optional(),
    heroImageId: z.string().nullable().optional(),
    heroImageUrl: z.string().max(2000).nullable().optional(),
    heroImageAlt: z.string().max(500).nullable().optional(),
    metadata: z.object({
      client: z.string().max(500),
      year: z.string().max(100),
      scope: z.string().max(500).optional(),
      role: z.string().max(500).optional(),
    }).optional(),
    description: z.array(z.string().max(5000)).optional(),
    quote: z.string().max(5000).nullable().optional(),
    metaDescription: z.string().max(500).nullable().optional(),
    showOnHomepage: z.boolean().optional(),
    nextProjectSlug: z.string().max(500).nullable().optional(),
    nextProjectImageUrl: z.string().max(2000).nullable().optional(),
    /**
     * Always required for full-replacement endpoints. The editor sends the complete
     * block list every save. Pass [] to intentionally clear all blocks.
     * Omitting this field returns 400 so a partial PUT can never silently erase blocks.
     */
    blocks: z.array(contentBlockSchema),
  });

  /**
   * Helper: coerce the validated payload into project-field updates + a block list,
   * then atomically save both in one transaction.
   */
  async function saveProjectFull(
    id: string,
    data: z.infer<typeof fullProjectSaveSchema>,
    overrides?: Record<string, unknown>
  ) {
    const { blocks, ...rest } = data;
    const projectFields = { ...rest, ...overrides } as any;
    // blocks is always present (required by fullProjectSaveSchema) — pass as-is.
    const blockList = blocks.map((b, i) => ({
      type: b.type,
      position: i,
      payload: b.payload,
    }));
    return storage.updateProjectWithBlocks(id, projectFields, blockList);
  }

  // PUT /api/admin/projects/:id/full — save all project fields + replace block list atomically
  app.put("/api/admin/projects/:id/full", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const parsed = fullProjectSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid payload" });
    }
    try {
      const existing = await storage.getCmsProjectById(id);
      if (!existing) return res.status(404).json({ error: "Project not found" });
      const result = await saveProjectFull(id, parsed.data);
      return res.json(result);
    } catch (err) {
      console.error("PUT /api/admin/projects/:id/full error:", err);
      return res.status(500).json({ error: "Failed to save project" });
    }
  });

  // POST /api/admin/projects/:id/publish — save + set status to published atomically
  app.post("/api/admin/projects/:id/publish", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const parsed = fullProjectSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid payload" });
    }
    try {
      const existing = await storage.getCmsProjectById(id);
      if (!existing) return res.status(404).json({ error: "Project not found" });
      const result = await saveProjectFull(id, parsed.data, { status: "published" });
      return res.json(result);
    } catch (err) {
      console.error("POST /api/admin/projects/:id/publish error:", err);
      return res.status(500).json({ error: "Failed to publish project" });
    }
  });

  // ─── Admin media endpoints ────────────────────────────────────────────────

  // POST /api/admin/media/upload — accept a multipart image upload
  app.post(
    "/api/admin/media/upload",
    requireAdmin,
    (req: Request, res: Response, next) => {
      upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File exceeds the 20 MB size limit" });
          }
          return res.status(400).json({ error: err.message });
        }
        if (err) {
          return res.status(400).json({ error: err.message ?? "Upload error" });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file || !file.buffer) {
        return res.status(400).json({ error: "No file provided" });
      }

      // ── Content verification ──────────────────────────────────────────────
      // Detect the real format from the file bytes (magic numbers).
      // This is the security-critical check — the client-declared MIME type
      // is untrusted and cannot prevent spoofed uploads.
      let detectedType: { mime: string; ext: string } | undefined;
      try {
        const ft = await fileTypeFromBuffer(file.buffer);
        if (ft && ALLOWED_MIME_TO_EXT[ft.mime]) {
          detectedType = { mime: ft.mime, ext: ALLOWED_MIME_TO_EXT[ft.mime] };
        }
      } catch {
        // If detection throws, treat as invalid
      }

      if (!detectedType) {
        return res.status(400).json({
          error: "File content is not a valid JPEG, PNG, WebP, GIF image or MP4/WebM video",
        });
      }

      // Derive the filename from the verified type, never from originalname
      const filename = `${randomUUID()}${detectedType.ext}`;
      const destPath = path.join(UPLOADS_DIR, filename);

      try {
        await fsp.writeFile(destPath, file.buffer);
      } catch (err) {
        console.error("Failed to write upload to disk:", err);
        return res.status(500).json({ error: "Failed to save uploaded file" });
      }

      try {
        const url = `/uploads/${filename}`;
        const media = await storage.createCmsMedia({
          filename,
          originalName: file.originalname,
          url,
          mimeType: detectedType.mime,
          size: file.buffer.length,
        });
        return res.status(201).json(media);
      } catch (err) {
        console.error("POST /api/admin/media/upload error:", err);
        // Best-effort cleanup if DB write fails
        fsp.unlink(destPath).catch(() => {});
        return res.status(500).json({ error: "Failed to save media record" });
      }
    }
  );

  // GET /api/admin/media — list all media, newest first
  app.get("/api/admin/media", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const media = await storage.getCmsMedia();
      return res.json(media);
    } catch (err) {
      console.error("GET /api/admin/media error:", err);
      return res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  // DELETE /api/admin/media/:id — remove DB record (and file) if not referenced
  app.delete("/api/admin/media/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const media = await storage.getCmsMediaById(id);
      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }
      const referenced = await storage.isMediaReferenced(id, media.url);
      if (referenced) {
        return res.status(409).json({
          error: "This image is in use by a project or content block and cannot be deleted",
        });
      }
      await storage.deleteCmsMedia(id);
      // Best-effort file removal; ignore errors if file is already gone
      const filePath = path.join(UPLOADS_DIR, media.filename);
      fs.unlink(filePath, () => {});
      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/admin/media/:id error:", err);
      return res.status(500).json({ error: "Failed to delete media" });
    }
  });

  return httpServer;
}
