---
name: Deployment proxy 32 MiB response limit
description: Published-site edge proxy 500s any response body over 32 MiB — all served bodies must stay under it
---

# Deployment proxy 32 MiB response limit

Replit's published-app edge proxy rejects any HTTP response body larger than 32 MiB with an instant edge-level 500 (`server: Google Frontend`, no app headers). Confirmed empirically against production.

**Why:** Browsers open videos with `Range: bytes=0-`; a full-file 206 body for a 45 MB video is killed at the edge, so the video freezes at 0:00 even though the app responded correctly.

**How to apply:** No serving path may ever emit a body over 32 MiB in production. Cap range spans well under the limit (16 MiB chosen — clients issue follow-up range requests, which is valid HTTP), treat un-ranged or malformed-Range requests for large files as capped 206s, and bound unknown-size streams. When debugging a production-only 500 with `server: Google Frontend` and zero app headers, suspect this limit before suspecting app code.
