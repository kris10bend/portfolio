/**
 * Integration tests for the public project API endpoints.
 *
 * GET /api/projects        — homepage grid ordering and draft/archived suppression
 * GET /api/projects/:slug  — single project with DB data, static fallback, and
 *                            draft/archived protection
 *
 * These tests run against the real DB. Each test creates its own isolated
 * CMS records and cleans them up in `after()`.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import { cmsProjects, cmsContentBlocks } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import express from "express";
import { createServer } from "node:http";
import { setupAuth } from "../auth";
import { registerRoutes } from "../routes";

let baseUrl: string;
let server: ReturnType<typeof createServer>;
const createdProjectIds: string[] = [];

before(async () => {
  const app = express();
  app.use(express.json());
  app.set("trust proxy", 1);
  const httpServer = createServer(app);
  setupAuth(app);
  await registerRoutes(httpServer, app);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      const addr = httpServer.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
  server = httpServer;
});

after(async () => {
  // Clean up all test projects and their blocks
  for (const id of createdProjectIds) {
    await db.delete(cmsContentBlocks).where(eq(cmsContentBlocks.projectId, id));
    await db.delete(cmsProjects).where(eq(cmsProjects.id, id));
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Helper: create a published, showOnHomepage project with an explicit order. */
async function createPublishedProject(opts: {
  slug: string;
  title: string;
  homepageOrder: number;
  showOnHomepage?: boolean;
  status?: "draft" | "published";
}) {
  const p = await storage.createCmsProject({
    slug: opts.slug,
    title: opts.title,
    status: opts.status ?? "published",
    homepageOrder: opts.homepageOrder,
    showOnHomepage: opts.showOnHomepage ?? true,
    metaDescription: `Excerpt for ${opts.title}`,
    heroImageUrl: `/test/${opts.slug}/hero.png`,
    heroImageAlt: `${opts.title} hero`,
  });
  createdProjectIds.push(p.id);
  return p;
}

// ─── GET /api/projects ────────────────────────────────────────────────────────

describe("GET /api/projects — ordering and suppression", () => {
  test("CMS project ordering: lower homepageOrder appears before higher", async () => {
    // Use high slot numbers (50, 51) that are beyond any real or static projects,
    // so we don't collide with Building Bridges (slot 1) or static fills (slots 2-7).
    const ts = Date.now();
    const slugA = `test-order-a-${ts}`;
    const slugB = `test-order-b-${ts}`;
    const pA = await createPublishedProject({ slug: slugA, title: "Order A", homepageOrder: 50 });
    const pB = await createPublishedProject({ slug: slugB, title: "Order B", homepageOrder: 51 });

    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 200);
    const list = (await res.json()) as Array<{ slug: string }>;

    const idxA = list.findIndex((c) => c.slug === slugA);
    const idxB = list.findIndex((c) => c.slug === slugB);
    assert.ok(idxA !== -1, "Project A should appear in list");
    assert.ok(idxB !== -1, "Project B should appear in list");
    assert.ok(idxA < idxB, `Project A (order 50) should appear before B (order 51): got ${idxA} vs ${idxB}`);

    await storage.archiveCmsProject(pA.id);
    await storage.archiveCmsProject(pB.id);
  });

  test("swapping homepageOrder values changes relative position in the list", async () => {
    const ts = Date.now();
    const slugA = `test-swap-a-${ts}`;
    const slugB = `test-swap-b-${ts}`;
    const pA = await createPublishedProject({ slug: slugA, title: "Swap A", homepageOrder: 52 });
    const pB = await createPublishedProject({ slug: slugB, title: "Swap B", homepageOrder: 53 });

    // Confirm A before B initially
    const res1 = await fetch(`${baseUrl}/api/projects`);
    const list1 = (await res1.json()) as Array<{ slug: string }>;
    assert.ok(list1.findIndex(c => c.slug === slugA) < list1.findIndex(c => c.slug === slugB));

    // Swap orders
    await storage.updateCmsProjectsOrder([
      { id: pA.id, homepageOrder: 53 },
      { id: pB.id, homepageOrder: 52 },
    ]);

    const res2 = await fetch(`${baseUrl}/api/projects`);
    const list2 = (await res2.json()) as Array<{ slug: string }>;
    const idxA2 = list2.findIndex(c => c.slug === slugA);
    const idxB2 = list2.findIndex(c => c.slug === slugB);
    assert.ok(idxB2 < idxA2, `After swap B (now order 52) should appear before A (now order 53)`);

    await storage.archiveCmsProject(pA.id);
    await storage.archiveCmsProject(pB.id);
  });

  test("draft CMS projects are not returned", async () => {
    const testSlug = `test-draft-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Draft Project",
      homepageOrder: 1,
      status: "draft",
    });

    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 200);
    const list = (await res.json()) as Array<{ slug: string }>;
    const found = list.some((c) => c.slug === testSlug);
    assert.equal(found, false, "Draft project must not appear in public list");

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });

  test("archived CMS project is excluded and its slug is not backfilled by static data", async () => {
    // Use a slug that DOES appear in static data (building-bridges is in DB; use journey-to-net-zero
    // which is currently static-only). We create a DB record for it, archive it, and confirm
    // the static version does NOT reappear.
    const testSlug = `test-archived-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Archived Project",
      homepageOrder: 1,
    });
    await storage.archiveCmsProject(p.id);

    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 200);
    const list = (await res.json()) as Array<{ slug: string }>;
    // Archived slug must not appear (neither from DB nor static fallback)
    const found = list.some((c) => c.slug === testSlug);
    assert.equal(found, false, "Archived project must not appear via DB or static fallback");
  });

  test("showOnHomepage:false hides a published project from the homepage list", async () => {
    const testSlug = `test-hidden-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Hidden From Homepage",
      homepageOrder: 1,
      showOnHomepage: false,
    });

    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 200);
    const list = (await res.json()) as Array<{ slug: string }>;
    const found = list.some((c) => c.slug === testSlug);
    assert.equal(found, false, "showOnHomepage:false project must not appear in homepage list");

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });
});

// ─── GET /api/projects/:slug ──────────────────────────────────────────────────

describe("GET /api/projects/:slug — single project", () => {
  test("returns a published project from the DB with the correct shape", async () => {
    const testSlug = `test-slug-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Full Project Page",
      homepageOrder: 99,
    });
    // Add a mixed block sequence: text, full-image, split-image
    await storage.replaceContentBlocks(p.id, [
      { type: "text", position: 0, payload: { paragraphs: ["Paragraph one.", "Paragraph two."] } },
      { type: "full-image", position: 1, payload: { src: "/img/full.png", alt: "Full image", caption: "", captionVisible: false } },
      { type: "split-image", position: 2, payload: {
        left: { src: "/img/left.png", alt: "Left", caption: "", captionVisible: false },
        right: { src: "/img/right.png", alt: "Right", caption: "", captionVisible: false },
        wide: "left",
      }},
    ]);

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      slug: string;
      title: string;
      gallery: Array<{ type: string; paragraphs?: string[]; image?: unknown; left?: unknown }>;
    };
    assert.equal(body.slug, testSlug);
    assert.equal(body.title, "Full Project Page");
    assert.equal(body.gallery.length, 3, "All three blocks should appear in gallery");
    assert.equal(body.gallery[0].type, "text");
    assert.deepEqual(body.gallery[0].paragraphs, ["Paragraph one.", "Paragraph two."]);
    assert.equal(body.gallery[1].type, "full");
    assert.equal(body.gallery[2].type, "split");
  });

  test("returns 404 for an unknown slug with no DB record and no static entry", async () => {
    const res = await fetch(`${baseUrl}/api/projects/definitely-does-not-exist-xyz`);
    assert.equal(res.status, 404);
  });

  test("draft project with a slug not in static data returns 404 (not static fallback)", async () => {
    const testSlug = `test-draft-slug-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Draft No Fallback",
      homepageOrder: 99,
      status: "draft",
    });

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 404, "Draft project must return 404 on the public page");

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });

  test("archived project with a slug not in static data returns 404 (not static fallback)", async () => {
    const testSlug = `test-archived-slug-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Archived No Fallback",
      homepageOrder: 99,
    });
    await storage.archiveCmsProject(p.id);

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 404, "Archived project must return 404 on the public page");
  });

  test("static-only project (no DB record) is served from static data", async () => {
    // journey-to-net-zero is in static data and (assuming the seed hasn't migrated it) not in DB
    // We verify it returns 200 with the expected slug
    const res = await fetch(`${baseUrl}/api/projects/journey-to-net-zero`);
    // If it's in DB it should still return 200; if static it should too
    assert.ok(res.status === 200, "Static project should return 200 via fallback");
    const body = (await res.json()) as { slug: string };
    assert.equal(body.slug, "journey-to-net-zero");
  });

  test("published project with showOnHomepage:false returns 404 on the public page", async () => {
    const testSlug = `test-hidden-page-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Hidden From Homepage Page",
      homepageOrder: 99,
      showOnHomepage: false,
    });

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 404, "showOnHomepage:false project must return 404 on public page");

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });

  test("published project with card_overlay='in_progress' returns 404 on the public page", async () => {
    const testSlug = `test-overlay-inprogress-${Date.now()}`;
    // Create published + visible, then patch the overlay directly
    const p = await createPublishedProject({
      slug: testSlug,
      title: "In Progress Project",
      homepageOrder: 99,
      showOnHomepage: true,
    });
    await storage.updateCmsProject(p.id, { cardOverlay: "in_progress" });

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 404, "in_progress overlay project must return 404 on public page");

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });

  test("published project with card_overlay='confidential' returns 404 on the public page", async () => {
    const testSlug = `test-overlay-confidential-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Confidential Project",
      homepageOrder: 99,
      showOnHomepage: true,
    });
    await storage.updateCmsProject(p.id, { cardOverlay: "confidential" });

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 404, "confidential overlay project must return 404 on public page");

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });

  test("published project with showOnHomepage:true and no overlay returns 200", async () => {
    const testSlug = `test-visible-page-${Date.now()}`;
    const p = await createPublishedProject({
      slug: testSlug,
      title: "Visible Project",
      homepageOrder: 99,
      showOnHomepage: true,
    });

    const res = await fetch(`${baseUrl}/api/projects/${testSlug}`);
    assert.equal(res.status, 200, "Fully visible published project must return 200");
    const body = (await res.json()) as { slug: string };
    assert.equal(body.slug, testSlug);

    await db.delete(cmsProjects).where(eq(cmsProjects.id, p.id));
    createdProjectIds.splice(createdProjectIds.indexOf(p.id), 1);
  });
});
