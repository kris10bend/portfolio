---
name: CMS editor schema decisions
description: Column choices and payload conventions for the case study editor (Task 57).
---

# CMS editor schema decisions

## Rule
The `cms_projects` table stores image URLs directly (not only media IDs) for the hero image and next-project teaser image. Content blocks store image URLs in JSON payload.

## Columns added to cms_projects
- `hero_image_url` text — public URL like `/uploads/uuid.jpg` (set by ImagePicker)
- `hero_image_alt` text — alt text for the hero image
- `description` json — `string[]` array of body paragraphs
- `next_project_image_url` text — teaser image URL for the next-project strip

The legacy `hero_image_id` column is still present for backward compatibility and `isMediaReferenced` checks.

**Why:** ImagePicker returns a URL, not a DB row ID. Storing URLs directly avoids a join on every read and keeps block payloads and project fields consistent. The `isMediaReferenced` helper already checks payload JSON by URL string, so orphan prevention still works.

## Block payload shapes
- `text`: `{ paragraphs: string[] }`
- `full-image`: `{ src, alt, caption, captionVisible }`
- `split-image`: `{ left: { src, alt, caption, captionVisible }, right: { same }, wide: "left"|"right" }`

## API surface
- `GET /api/admin/projects/:id/full` → `{ project, blocks }`
- `PUT /api/admin/projects/:id/full` → saves project fields + replaces all blocks in a transaction
- `POST /api/admin/projects/:id/publish` → same as PUT but forces `status: "published"`
