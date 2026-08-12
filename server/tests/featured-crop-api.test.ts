/**
 * Integration tests for the featured image dual-crop fields.
 *
 * Verifies that:
 * 1. Wide-crop (featuredImageObjectPosition + featuredImageZoom) and
 *    square-crop (featuredSquareCropX/Y/Zoom) are accepted by the save endpoint.
 * 2. GET /api/projects returns both crop sets for homepage cards.
 * 3. A reload of the saved project returns the persisted crop values.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import { cmsProjects, cmsContentBlocks, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import express from "express";
import { createServer } from "node:http";
import { setupAuth } from "../auth";
import { registerRoutes } from "../routes";

let baseUrl: string;
let server: ReturnType<typeof createServer>;
let sessionCookie: string;
let testAdminUsername: string;
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

  // Create a test admin user
  const { randomUUID } = await import("node:crypto");
  const bcrypt = await import("bcrypt");
  testAdminUsername = `test-crop-admin-${randomUUID()}`;
  const hashed = await bcrypt.default.hash("testpass123", 10);
  await db.insert(users).values({ username: testAdminUsername, password: hashed });

  // Log in and capture the session cookie
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: testAdminUsername, password: "testpass123" }),
  });
  const setCookie = loginRes.headers.get("set-cookie");
  assert.ok(setCookie, "Expected a session cookie after login");
  sessionCookie = setCookie.split(";")[0];
});

after(async () => {
  for (const id of createdProjectIds) {
    await db.delete(cmsContentBlocks).where(eq(cmsContentBlocks.projectId, id));
    await db.delete(cmsProjects).where(eq(cmsProjects.id, id));
  }
  // Clean up test admin user
  if (testAdminUsername) {
    await db.delete(users).where(eq(users.username, testAdminUsername));
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createProject(slug: string) {
  const p = await storage.createCmsProject({ slug, title: `Crop Test — ${slug}` });
  createdProjectIds.push(p.id);
  return p;
}

function authHeaders() {
  return { "Content-Type": "application/json", Cookie: sessionCookie };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Featured image dual-crop — save and retrieve", () => {
  test("PUT /api/admin/projects/:id/full persists wide and square crop fields", async () => {
    const project = await createProject(`crop-save-test-${Date.now()}`);

    const payload = {
      title: "Crop Save Test",
      slug: project.slug,
      featuredImageUrl: "/uploads/test-image.jpg",
      featuredImageAlt: "Test image",
      featuredImageObjectPosition: "35.0% 60.0%",
      featuredImageZoom: 1.5,
      featuredSquareCropX: 40,
      featuredSquareCropY: 55,
      featuredSquareCropZoom: 1.2,
      blocks: [],
    };

    const saveRes = await fetch(`${baseUrl}/api/admin/projects/${project.id}/full`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    assert.equal(saveRes.status, 200, "Save should return 200");

    // Reload via admin full endpoint
    const fullRes = await fetch(`${baseUrl}/api/admin/projects/${project.id}/full`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(fullRes.status, 200);
    const { project: reloaded } = await fullRes.json() as { project: Record<string, unknown> };

    assert.equal(reloaded.featuredImageObjectPosition, "35.0% 60.0%", "Wide object-position persisted");
    assert.ok(Math.abs((reloaded.featuredImageZoom as number) - 1.5) < 0.001, "Wide zoom persisted");
    assert.ok(Math.abs((reloaded.featuredSquareCropX as number) - 40) < 0.001, "Square crop X persisted");
    assert.ok(Math.abs((reloaded.featuredSquareCropY as number) - 55) < 0.001, "Square crop Y persisted");
    assert.ok(Math.abs((reloaded.featuredSquareCropZoom as number) - 1.2) < 0.001, "Square crop zoom persisted");
  });

  test("GET /api/projects returns square crop fields for published homepage project", async () => {
    const slug = `crop-homepage-test-${Date.now()}`;
    const project = await createProject(slug);

    const payload = {
      title: "Crop Homepage Test",
      slug,
      showOnHomepage: true,
      homepageOrder: 999,
      featuredImageUrl: "/uploads/test-featured.jpg",
      featuredImageAlt: "Featured",
      featuredImageObjectPosition: "25.0% 75.0%",
      featuredImageZoom: 1.0,
      featuredSquareCropX: 60,
      featuredSquareCropY: 30,
      featuredSquareCropZoom: 1.8,
      blocks: [],
    };

    const publishRes = await fetch(`${baseUrl}/api/admin/projects/${project.id}/publish`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    assert.equal(publishRes.status, 200, "Publish should return 200");

    // Fetch public homepage list
    const listRes = await fetch(`${baseUrl}/api/projects`);
    assert.equal(listRes.status, 200);
    const cards = await listRes.json() as Array<Record<string, unknown>>;

    const card = cards.find((c) => c.slug === slug);
    assert.ok(card, "Published project should appear in /api/projects");

    assert.equal(card.featuredImageObjectPosition, "25.0% 75.0%", "Wide objectPosition in card");
    assert.equal(card.featuredImageZoom, 1.0, "Wide zoom in card");
    assert.ok(Math.abs((card.featuredSquareCropX as number) - 60) < 0.001, "Square X in card");
    assert.ok(Math.abs((card.featuredSquareCropY as number) - 30) < 0.001, "Square Y in card");
    assert.ok(Math.abs((card.featuredSquareCropZoom as number) - 1.8) < 0.001, "Square zoom in card");
  });

  test("Square crop fields are null for projects that have not set them", async () => {
    const slug = `crop-default-test-${Date.now()}`;
    const project = await createProject(slug);

    const payload = {
      title: "Crop Default Test",
      slug,
      showOnHomepage: true,
      homepageOrder: 998,
      featuredImageUrl: "/uploads/test-default.jpg",
      featuredImageObjectPosition: "50.0% 50.0%",
      featuredImageZoom: 1.0,
      // No square crop fields → should be saved as null
      featuredSquareCropX: null,
      featuredSquareCropY: null,
      featuredSquareCropZoom: null,
      blocks: [],
    };

    await fetch(`${baseUrl}/api/admin/projects/${project.id}/publish`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const listRes = await fetch(`${baseUrl}/api/projects`);
    const cards = await listRes.json() as Array<Record<string, unknown>>;
    const card = cards.find((c) => c.slug === slug);
    assert.ok(card, "Project should appear on homepage");

    // Square crop fields should be null when not set
    assert.equal(
      card.featuredSquareCropX ?? null,
      null,
      `featuredSquareCropX should be null, got ${card.featuredSquareCropX}`
    );
  });
});
