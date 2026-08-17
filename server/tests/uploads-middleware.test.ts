/**
 * Integration tests for the /uploads serving stack as production actually
 * runs it: uploadsRangeGuard in front of express.static, exercised over real
 * HTTP against a >32 MiB file.
 *
 * The deployment proxy hard-fails any response body over 32 MiB, so every
 * request shape (no Range, open-ended, oversized, malformed, multi-range)
 * must yield a body within the limit.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import {
  uploadsRangeGuard,
  MAX_RANGE_SPAN_BYTES,
  PROXY_RESPONSE_LIMIT_BYTES,
} from "../objectStorage";

const BIG_SIZE = PROXY_RESPONSE_LIMIT_BYTES + 2 * 1024 * 1024; // 34 MiB
const SMALL_SIZE = 1024;

let dir: string;
let server: http.Server;
let base: string;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-test-"));
  fs.writeFileSync(path.join(dir, "big.mp4"), Buffer.alloc(BIG_SIZE));
  fs.writeFileSync(path.join(dir, "small.mp4"), Buffer.alloc(SMALL_SIZE));
  const app = express();
  app.use("/uploads", uploadsRangeGuard(dir), express.static(dir));
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const addr = server.address() as { port: number };
  base = `http://127.0.0.1:${addr.port}`;
});

after(() => {
  server?.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function get(pathname: string, range?: string) {
  const res = await fetch(`${base}${pathname}`, {
    headers: range ? { Range: range } : {},
  });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, body };
}

test("big file, no Range → capped 206, body within proxy limit", async () => {
  const r = await get("/uploads/big.mp4");
  assert.equal(r.status, 206);
  assert.equal(r.body.length, MAX_RANGE_SPAN_BYTES);
  assert.equal(
    r.headers.get("content-range"),
    `bytes 0-${MAX_RANGE_SPAN_BYTES - 1}/${BIG_SIZE}`,
  );
});

test("big file, Range: bytes=0- → capped 206", async () => {
  const r = await get("/uploads/big.mp4", "bytes=0-");
  assert.equal(r.status, 206);
  assert.equal(r.body.length, MAX_RANGE_SPAN_BYTES);
  assert.ok(r.body.length <= PROXY_RESPONSE_LIMIT_BYTES);
});

test("big file, oversized explicit range → capped 206", async () => {
  const r = await get("/uploads/big.mp4", `bytes=0-${BIG_SIZE - 1}`);
  assert.equal(r.status, 206);
  assert.equal(r.body.length, MAX_RANGE_SPAN_BYTES);
});

test("big file, multi-range header → capped 206, never a full 200", async () => {
  const r = await get("/uploads/big.mp4", "bytes=0-1,2-3");
  assert.equal(r.status, 206);
  assert.equal(r.body.length, MAX_RANGE_SPAN_BYTES);
});

test("big file, malformed Range header → capped 206, never a full 200", async () => {
  for (const bad of ["garbage", "bytes=-", "bytes=abc-def"]) {
    const r = await get("/uploads/big.mp4", bad);
    assert.equal(r.status, 206, `header "${bad}"`);
    assert.ok(r.body.length <= PROXY_RESPONSE_LIMIT_BYTES, `header "${bad}"`);
  }
});

test("big file, small mid-file range passes through unchanged", async () => {
  const r = await get("/uploads/big.mp4", "bytes=100000-101023");
  assert.equal(r.status, 206);
  assert.equal(r.body.length, 1024);
  assert.equal(
    r.headers.get("content-range"),
    `bytes 100000-101023/${BIG_SIZE}`,
  );
});

test("small file, no Range → plain 200 full body", async () => {
  const r = await get("/uploads/small.mp4");
  assert.equal(r.status, 200);
  assert.equal(r.body.length, SMALL_SIZE);
});

test("small file, multi/malformed Range stays untouched and within limit", async () => {
  // Small files are left to express.static's native handling (it may combine
  // multi-ranges); all that matters is the body can never exceed the file.
  const r = await get("/uploads/small.mp4", "bytes=0-1,2-3");
  assert.ok([200, 206].includes(r.status));
  assert.ok(r.body.length <= SMALL_SIZE);
});
