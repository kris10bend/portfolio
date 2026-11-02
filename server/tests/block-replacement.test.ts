/**
 * Integration tests for PUT /api/admin/projects/:id/full block-replacement semantics.
 *
 * These tests run against the real DB to verify:
 * 1. A PUT without "blocks" in the payload is rejected (400) — partial saves cannot silently erase blocks.
 * 2. A PUT with blocks:[] explicitly clears all blocks.
 * 3. A PUT with blocks:[...] replaces the full block list atomically.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import { cmsProjects, cmsContentBlocks } from "../../shared/schema";
import { eq } from "drizzle-orm";

// ─── Minimal in-process HTTP server for testing ───────────────────────────────

import express from "express";
import { createServer } from "node:http";
import { setupAuth } from "../auth";
import { registerRoutes } from "../routes";
import { storage } from "../storage";

let baseUrl: string;
let server: ReturnType<typeof createServer>;
let sessionCookie: string;
let testProjectId: string;

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

  // Create a test admin user if none exists
  const { randomUUID } = await import("node:crypto");
  const bcrypt = await import("bcrypt");
  const testUser = `test-admin-${randomUUID()}`;
  const hashed = await bcrypt.default.hash("testpass123", 10);
  await db.insert((await import("../../shared/schema")).users).values({
    username: testUser,
    password: hashed,
  });

  // Log in and capture the session cookie
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: testUser, password: "testpass123" }),
  });
  const setCookie = loginRes.headers.get("set-cookie");
  assert.ok(setCookie, "Expected a session cookie after login");
  sessionCookie = setCookie.split(";")[0];

  // Create a test project
  const project = await storage.createCmsProject({ title: "Test project for blocks" });
  testProjectId = project.id;

  // Seed two blocks
  await storage.replaceContentBlocks(testProjectId, [
    { type: "text", position: 0, payload: { paragraphs: ["First block"] } },
    { type: "text", position: 1, payload: { paragraphs: ["Second block"] } },
  ]);
});

after(async () => {
  // Clean up test data
  if (testProjectId) {
    await db.delete(cmsContentBlocks).where(eq(cmsContentBlocks.projectId, testProjectId));
    await db.delete(cmsProjects).where(eq(cmsProjects.id, testProjectId));
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("PUT /api/admin/projects/:id/full — block replacement", () => {
  test("invalid contact submissions return a validation message, not a server error", async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Visitor", email: "invalid", message: "Hello" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error?: string };
    assert.equal(body.error, "A valid email address is required");
  });

  test("invalid partial project updates return a validation message", async () => {
    const res = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ title: 123 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error?: string };
    assert.ok(body.error, "Expected a schema validation message");
  });

  test("invalid project publishing returns a validation message", async () => {
    const res = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ title: "Invalid project" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error?: string };
    assert.ok(body.error, "Expected a schema validation message");
  });

  test("rejects a payload missing the blocks field (400)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}/full`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ title: "Updated title" }), // no blocks field
    });
    assert.equal(res.status, 400, "Expected 400 when blocks is omitted");
    const body = await res.json() as { error?: string };
    assert.ok(body.error, "Expected an error message");
  });

  test("empty blocks array clears all blocks", async () => {
    const res = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}/full`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ title: "Updated title", blocks: [] }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { blocks: unknown[] };
    assert.equal(body.blocks.length, 0, "Explicit empty array should clear blocks");

    const dbBlocks = await storage.getContentBlocksByProjectId(testProjectId);
    assert.equal(dbBlocks.length, 0, "DB should reflect zero blocks");
  });

  test("block list replaces previous blocks atomically", async () => {
    const newBlocks = [
      { type: "text", payload: { paragraphs: ["New block A"] } },
      { type: "full-image", payload: { src: "/uploads/test.jpg", alt: "alt", caption: "", captionVisible: false } },
    ];
    const res = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}/full`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ title: "Updated", blocks: newBlocks }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { blocks: { type: string; position: number }[] };
    assert.equal(body.blocks.length, 2);
    assert.equal(body.blocks[0].type, "text");
    assert.equal(body.blocks[0].position, 0);
    assert.equal(body.blocks[1].type, "full-image");
    assert.equal(body.blocks[1].position, 1);
  });
});
