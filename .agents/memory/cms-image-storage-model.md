---
name: CMS image storage model
description: How images are stored in cms_projects vs cms_content_blocks, and the rules for safe deletion.
---

# CMS image storage model

## Rule
`cms_projects` stores image URLs (not media IDs) in `heroImageUrl` and `nextProjectImageUrl`. The `heroImageId` column is a legacy FK that may or may not be set. Content blocks store image URLs inside their JSON `payload`.

**Why:** `ImagePicker` returns a public URL (e.g. `/uploads/uuid.jpg`). Storing URLs directly avoids a join on every read and is consistent with how block payloads work.

## isMediaReferenced must check all of these
1. `cms_projects.heroImageId = mediaId` (legacy ID reference)
2. `cms_projects.heroImageUrl = mediaUrl` (URL reference)
3. `cms_projects.nextProjectImageUrl = mediaUrl` (URL reference)
4. `cms_content_blocks.payload::text LIKE '%mediaId%'` or `'%mediaUrl%'`

Omitting any column means an image in use can be deleted, breaking published pages.

## Atomic saves
Project-field updates and block-list replacement must happen in a single DB transaction (`updateProjectWithBlocks`). Separate calls risk a partial save where metadata is updated but blocks are stale (or vice versa).
