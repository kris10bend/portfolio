---
name: Featured image fields
description: DB columns and editor state for the featured image dual-crop system in cms_projects.
---

# Featured image dual-crop fields

## DB columns (cms_projects)
- `featured_image_object_position` (text, nullable) — wide-crop anchor as CSS "X% Y%" string
- `featured_image_zoom` (real, nullable) — wide-crop zoom multiplier
- `featured_square_crop_x` (real, nullable) — square-crop center X, 0–100
- `featured_square_crop_y` (real, nullable) — square-crop center Y, 0–100
- `featured_square_crop_zoom` (real, nullable) — square-crop zoom multiplier

## EditorState fields
`featuredImageObjectPosition` / `featuredImageZoom` are wide-crop; `featuredSquareCropX/Y/Zoom` are square-crop.

## Rendering convention
- Large homepage card slots (imageHeight === "large") → wide-crop objectPosition + zoom
- Small homepage card slots (imageHeight === "small") → square-crop X/Y + zoom; falls back to "50% 50%" / 1 if null

## DualCropEditor
- Lives at `client/src/pages/admin/DualCropEditor.tsx`
- At zoom=1: wide box fills full container width (3:1), square box fills min(containerW, containerH) as a square
- x/y stored as 0–100 percentage of image container (center of crop box)
- Image must load before boxes render (uses onLoad to get display height)

**Why:** Previous system only had one focal point and no square crop; existing `objectPosition`/`zoom` columns were repurposed as the wide anchor to preserve existing saved data.
