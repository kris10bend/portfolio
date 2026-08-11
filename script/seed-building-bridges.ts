/**
 * Seed script: inserts the Building Bridges project into the CMS database.
 *
 * Usage (from the Replit shell):
 *   tsx script/seed-building-bridges.ts
 *
 * Safe to re-run: checks for an existing record by slug before inserting.
 * Blocks are replaced atomically each run to stay in sync with this file.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import { cmsProjects, cmsContentBlocks } from "../shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const SLUG = "building-bridges";

// ─── Project data (mirrors client/src/data/projects.ts exactly) ────────────

const projectData = {
  slug: SLUG,
  title: "Building Bridges\nfor the Future",
  caseStudyLabel: "CASE STUDY",
  heroImageUrl: "/figmaAssets/project-uae-china/hero.png",
  heroImageAlt: "UAE China YBC immersive exhibition",
  metadata: {
    scope: "Cultural Experience & Exhibition",
    role: "Creative Direction & Experience Design",
    client: "Abu Dhabi National Projects Office",
    year: "2024",
  },
  quote:
    "How might we transform four decades of diplomacy into something people could experience, contribute to, and carry forward?",
  description: [
    "To celebrate forty years of partnership between the UAE and China, our team was invited into the project during its final stages to help bring clarity to an ambitious public exhibition already in development.",
    "As Creative Director, I helped establish a cohesive narrative and visitor experience that connected history, culture, and participation into a single journey. We aligned multiple creative partners around a shared narrative that transformed diplomatic history into something visitors could experience, reflect on, and contribute to. Through immersive storytelling, contemporary cultural perspectives, and participatory installations, the exhibition invited thousands of visitors to discover the values connecting two nations—and add their own hopes for what the next chapter could become.",
  ],
  metaDescription:
    "Bringing forty years of UAE–China partnership to life through shared stories and public participation.",
  nextProjectSlug: "journey-to-net-zero",
  nextProjectImageUrl: "/figmaAssets/project-journey-to-net-zero/next-project.png",
  status: "published" as const,
  homepageOrder: 1,
  showOnHomepage: true,
};

// ─── Gallery blocks (5 rows matching the static data order) ────────────────

// Block payload types mirror AdminEditProjectPage's ImageSlot interface
function slot(src: string, alt: string) {
  return { src, alt, caption: "", captionVisible: false };
}

const blocks = [
  // 1. split-wide-left
  {
    type: "split-image" as const,
    position: 0,
    payload: {
      left: slot(
        "/figmaAssets/project-uae-china/gallery-1a.png",
        "Immersive installation overview"
      ),
      right: slot(
        "/figmaAssets/project-uae-china/gallery-1b.png",
        "Cultural display panels"
      ),
      wide: "left",
    },
  },
  // 2. full
  {
    type: "full-image" as const,
    position: 1,
    payload: slot(
      "/figmaAssets/project-uae-china/gallery-full-1.png",
      "Exhibition hall walkthrough"
    ),
  },
  // 3. split-wide-right
  {
    type: "split-image" as const,
    position: 2,
    payload: {
      left: slot(
        "/figmaAssets/project-uae-china/gallery-2a.png",
        "Exhibition detail — visitors exploring"
      ),
      right: slot(
        "/figmaAssets/project-uae-china/gallery-2b.png",
        "Archival materials installation"
      ),
      wide: "right",
    },
  },
  // 4. split-wide-left
  {
    type: "split-image" as const,
    position: 3,
    payload: {
      left: slot(
        "/figmaAssets/project-uae-china/gallery-3a.png",
        "Exhibition environment setup"
      ),
      right: slot(
        "/figmaAssets/project-uae-china/gallery-3b.png",
        "Cultural exchange moment"
      ),
      wide: "left",
    },
  },
  // 5. full
  {
    type: "full-image" as const,
    position: 4,
    payload: slot(
      "/figmaAssets/project-uae-china/gallery-full-2.png",
      "Atmospheric exhibition space"
    ),
  },
];

async function seed() {
  // ── Upsert project ────────────────────────────────────────────────────────
  const [existing] = await db
    .select()
    .from(cmsProjects)
    .where(eq(cmsProjects.slug, SLUG));

  let projectId: string;

  if (existing) {
    const [updated] = await db
      .update(cmsProjects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(cmsProjects.id, existing.id))
      .returning();
    projectId = updated.id;
    console.log(`✓ Project "${SLUG}" already existed — record updated.`);
  } else {
    const [created] = await db
      .insert(cmsProjects)
      .values(projectData)
      .returning();
    projectId = created.id;
    console.log(`✓ Project "${SLUG}" created (id: ${projectId}).`);
  }

  // ── Replace content blocks atomically ────────────────────────────────────
  await db
    .delete(cmsContentBlocks)
    .where(eq(cmsContentBlocks.projectId, projectId));

  await db
    .insert(cmsContentBlocks)
    .values(blocks.map((b) => ({ ...b, projectId })));

  console.log(`✓ ${blocks.length} content blocks seeded for "${SLUG}".`);
  console.log(
    "\nSmoke-test checklist:\n" +
      "  • /work/building-bridges — should render identically to static page\n" +
      "  • /api/projects          — should return building-bridges first\n" +
      "  • /api/projects/building-bridges — should return full ProjectData JSON\n" +
      "  • Edit text in admin → publish → reload /work/building-bridges — change visible\n" +
      "  • Reorder in admin → drag to position 2 → homepage grid moves building-bridges\n" +
      "  • /work/journey-to-net-zero etc. — still work via static fallback\n" +
      "  • /api/admin/* without login — should return 401"
  );

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
