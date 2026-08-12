/**
 * Seed script: inserts all 7 case studies into the CMS database.
 *
 * Usage (from the Replit shell):
 *   tsx script/seed-all-projects.ts
 *
 * Safe to re-run: upserts by slug, replaces blocks atomically each run.
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function slot(src: string, alt: string) {
  return { src, alt, caption: "", captionVisible: false };
}

function splitBlock(
  position: number,
  leftSrc: string,
  leftAlt: string,
  rightSrc: string,
  rightAlt: string,
  wide: "left" | "right"
) {
  return {
    type: "split-image" as const,
    position,
    payload: {
      left: slot(leftSrc, leftAlt),
      right: slot(rightSrc, rightAlt),
      wide,
    },
  };
}

function fullBlock(position: number, src: string, alt: string) {
  return {
    type: "full-image" as const,
    position,
    payload: slot(src, alt),
  };
}

// ─── All 7 projects ─────────────────────────────────────────────────────────

const allProjects: Array<{
  project: Parameters<typeof db.insert>[0] extends never ? never : any;
  blocks: any[];
}> = [
  // ── 1. Building Bridges ──────────────────────────────────────────────────
  {
    project: {
      slug: "building-bridges",
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
      nextProjectImageUrl:
        "/figmaAssets/project-journey-to-net-zero/next-project.png",
      status: "published" as const,
      homepageOrder: 1,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-uae-china/gallery-1a.png",
        "Immersive installation overview",
        "/figmaAssets/project-uae-china/gallery-1b.png",
        "Cultural display panels",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-uae-china/gallery-full-1.png",
        "Exhibition hall walkthrough"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-uae-china/gallery-2a.png",
        "Exhibition detail — visitors exploring",
        "/figmaAssets/project-uae-china/gallery-2b.png",
        "Archival materials installation",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-uae-china/gallery-3a.png",
        "Exhibition environment setup",
        "/figmaAssets/project-uae-china/gallery-3b.png",
        "Cultural exchange moment",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-uae-china/gallery-full-2.png",
        "Atmospheric exhibition space"
      ),
    ],
  },

  // ── 2. Journey to Net Zero ───────────────────────────────────────────────
  {
    project: {
      slug: "journey-to-net-zero",
      title: "Journey to net zero",
      caseStudyLabel: "CASE STUDY",
      heroImageUrl: "/figmaAssets/project-journey-to-net-zero/hero.png",
      heroImageAlt: "Journey to Net Zero hero image placeholder",
      metadata: {
        scope:
          "Creative Direction · Experience Design · Exhibition Design · Content Strategy",
        role: "Creative Director",
        client: "UAE Pavilion, COP28",
        year: "2023",
      },
      quote:
        "How might we connect the UAE\u2019s deep-rooted culture of resourcefulness with its vision for a net zero future?",
      description: [
        "When our team joined the UAE\u2019s Journey to Net Zero exhibition, the space was already in development\u2014but its story wasn\u2019t yet resonating with the leadership team. We quickly onboarded to the challenge of telling a national sustainability story that connected the UAE\u2019s past, present, and future: from the resourcefulness and resilience of its ancestors to the innovators shaping its path toward net zero.",
        "As Creative Director, I partnered with strategy to shape the narrative and carried it through to the final experience, translating the story into every layer of the exhibition. Working alongside interior architects and additional creative partners, I designed and creative directed the displays, films, archival storytelling, physical artifacts, innovator portraits, and data visualizations that brought the narrative to life across the gallery, connecting ancestral practices with the innovations shaping the UAE\u2019s net zero future. We extended the experience across both the public-facing Green Zone and the delegate-only Blue Zone, adapting the story, content, and visual language for two very different audiences while maintaining a cohesive journey from heritage to a net zero future.",
      ],
      metaDescription:
        "Bringing the UAE\u2019s vision for a net zero future to life at COP28.",
      nextProjectSlug: "designing-better-futures",
      nextProjectImageUrl:
        "/figmaAssets/project-designing-better-futures/next-project.png",
      status: "published" as const,
      homepageOrder: 2,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-journey-to-net-zero/gallery-1a.png",
        "Journey to Net Zero gallery image 1a",
        "/figmaAssets/project-journey-to-net-zero/gallery-1b.png",
        "Journey to Net Zero gallery image 1b",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-journey-to-net-zero/gallery-full-1.png",
        "Journey to Net Zero gallery full image 1"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-journey-to-net-zero/gallery-2a.png",
        "Journey to Net Zero gallery image 2a",
        "/figmaAssets/project-journey-to-net-zero/gallery-2b.png",
        "Journey to Net Zero gallery image 2b",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-journey-to-net-zero/gallery-3a.png",
        "Journey to Net Zero gallery image 3a",
        "/figmaAssets/project-journey-to-net-zero/gallery-3b.png",
        "Journey to Net Zero gallery image 3b",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-journey-to-net-zero/gallery-full-2.png",
        "Journey to Net Zero gallery full image 2"
      ),
    ],
  },

  // ── 3. Designing Better Futures ──────────────────────────────────────────
  {
    project: {
      slug: "designing-better-futures",
      title: "Designing Better Futures",
      caseStudyLabel: "CASE STUDY",
      heroImageUrl:
        "/figmaAssets/project-designing-better-futures/hero.png",
      heroImageAlt: "Designing Better Futures hero image placeholder",
      metadata: {
        client: "Confidential",
        year: "2025",
      },
      quote: "Case study confidential, please reach out for information",
      description: ["This is a confidential case study."],
      metaDescription:
        "Case study confidential, please reach out for information.",
      nextProjectSlug: "expo-2020",
      nextProjectImageUrl:
        "/figmaAssets/project-expo-2020/next-project.png",
      status: "published" as const,
      homepageOrder: 3,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-designing-better-futures/gallery-1a.png",
        "Designing Better Futures gallery image 1a",
        "/figmaAssets/project-designing-better-futures/gallery-1b.png",
        "Designing Better Futures gallery image 1b",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-designing-better-futures/gallery-full-1.png",
        "Designing Better Futures gallery full image 1"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-designing-better-futures/gallery-2a.png",
        "Designing Better Futures gallery image 2a",
        "/figmaAssets/project-designing-better-futures/gallery-2b.png",
        "Designing Better Futures gallery image 2b",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-designing-better-futures/gallery-3a.png",
        "Designing Better Futures gallery image 3a",
        "/figmaAssets/project-designing-better-futures/gallery-3b.png",
        "Designing Better Futures gallery image 3b",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-designing-better-futures/gallery-full-2.png",
        "Designing Better Futures gallery full image 2"
      ),
    ],
  },

  // ── 4. Expo 2020 ─────────────────────────────────────────────────────────
  {
    project: {
      slug: "expo-2020",
      title: "Expo 2020",
      caseStudyLabel: "CASE STUDY",
      heroImageUrl: "/figmaAssets/project-expo-2020/hero.png",
      heroImageAlt: "Expo 2020 hero image placeholder",
      metadata: {
        scope:
          "Creative Direction · Exhibition Design · Experience Design · Content Strategy",
        role: "Creative Lead",
        client: "UAE Pavilion, Expo 2020 Dubai",
        year: "2021",
      },
      quote:
        "How might we bring the UAE\u2019s most ambitious innovations to life in ways people could understand, explore, and connect to?",
      description: [
        "As Expo 2020 approached, our team joined the UAE Pavilion late in its development to help bring greater clarity and cohesion to the visitor experience. After the pavilion opened, an opportunity to create a new exhibition emerged: an Innovation Showcase highlighting the scientists, researchers, entrepreneurs, and makers shaping the UAE\u2019s future. I stepped into the role of Creative Lead to develop the exhibition and translate their work into stories that could connect with a broad public audience.",
        "Working directly with innovators across disciplines, I interviewed each participant to understand not only what they had created, but why it mattered. I then led the creative development of bilingual exhibition stories, custom illustrations, physical displays, and visual representations that made complex research and technologies approachable without losing their substance. Rather than presenting innovation as a collection of technical achievements, the showcase centered the people and ideas behind them, inviting visitors to discover work they might never otherwise encounter.",
      ],
      metaDescription:
        "Translating breakthrough ideas into an exhibition celebrating the UAE\u2019s innovators at Expo 2020 Dubai.",
      nextProjectSlug: "collective-intelligence",
      nextProjectImageUrl:
        "/figmaAssets/project-collective-intelligence/next-project.png",
      status: "published" as const,
      homepageOrder: 4,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-expo-2020/gallery-1a.png",
        "Expo 2020 gallery image 1a",
        "/figmaAssets/project-expo-2020/gallery-1b.png",
        "Expo 2020 gallery image 1b",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-expo-2020/gallery-full-1.png",
        "Expo 2020 gallery full image 1"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-expo-2020/gallery-2a.png",
        "Expo 2020 gallery image 2a",
        "/figmaAssets/project-expo-2020/gallery-2b.png",
        "Expo 2020 gallery image 2b",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-expo-2020/gallery-3a.png",
        "Expo 2020 gallery image 3a",
        "/figmaAssets/project-expo-2020/gallery-3b.png",
        "Expo 2020 gallery image 3b",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-expo-2020/gallery-full-2.png",
        "Expo 2020 gallery full image 2"
      ),
    ],
  },

  // ── 5. Collective Intelligence ───────────────────────────────────────────
  {
    project: {
      slug: "collective-intelligence",
      title: "Collective Intelligence",
      caseStudyLabel: "CASE STUDY",
      heroImageUrl:
        "/figmaAssets/project-collective-intelligence/hero.png",
      heroImageAlt: "Collective Intelligence hero image placeholder",
      metadata: {
        scope:
          "Experience Strategy · Creative Direction · Experience Design · Visual Design · AI Experience Design",
        role: "Creative Director",
        client: "Confidential",
        year: "2026",
      },
      quote:
        "How might we use AI to create more space for people to think, make, and solve problems together?",
      description: [
        "When an organizational survey surfaced recurring challenges around collaboration, communication, meeting culture, and strategic alignment, we saw an opportunity to turn those insights into a shared experience. Rather than presenting the findings as another report, we designed a process that brought people together to reflect, collaborate, and build solutions around the challenges they were experiencing.",
        "As Creative Director, I led the creative development of the experience, designing its visual language, physical materials, and collaborative moments from gallery through pitch. Employees first encountered their own stories and perspectives through an immersive gallery, then worked together in facilitated sessions to identify challenges, explore possibilities, and develop ideas through an analog, highly collaborative process. A custom AI tool helped teams synthesize their thinking into a clear presentation, creating a bridge from brainstorming to consensus and pitch preparation. Each team then presented a 60-second pitch to the group, with participants voting on the ideas they believed could have the greatest impact.",
      ],
      metaDescription:
        "Transforming employee insights into collective action through human-AI collaboration.",
      nextProjectSlug: "radical-imagination",
      nextProjectImageUrl:
        "/figmaAssets/project-radical-imagination/next-project.png",
      status: "published" as const,
      homepageOrder: 5,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-collective-intelligence/gallery-1a.png",
        "Collective Intelligence gallery image 1a",
        "/figmaAssets/project-collective-intelligence/gallery-1b.png",
        "Collective Intelligence gallery image 1b",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-collective-intelligence/gallery-full-1.png",
        "Collective Intelligence gallery full image 1"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-collective-intelligence/gallery-2a.png",
        "Collective Intelligence gallery image 2a",
        "/figmaAssets/project-collective-intelligence/gallery-2b.png",
        "Collective Intelligence gallery image 2b",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-collective-intelligence/gallery-3a.png",
        "Collective Intelligence gallery image 3a",
        "/figmaAssets/project-collective-intelligence/gallery-3b.png",
        "Collective Intelligence gallery image 3b",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-collective-intelligence/gallery-full-2.png",
        "Collective Intelligence gallery full image 2"
      ),
    ],
  },

  // ── 6. Radical Imagination ───────────────────────────────────────────────
  {
    project: {
      slug: "radical-imagination",
      title: "Radical Imagination",
      caseStudyLabel: "CASE STUDY",
      heroImageUrl: "/figmaAssets/project-radical-imagination/hero.png",
      heroImageAlt: "Radical Imagination hero image placeholder",
      metadata: {
        scope:
          "Experience Strategy · Creative Direction · Experience Design · Visual Design",
        role: "Creative Director",
        client: "SYPartners",
        year: "2026",
      },
      quote:
        "How might we help leaders challenge the assumptions that shape how work gets done\u2014and imagine what could come next?",
      description: [
        "As AI rapidly reshapes how organizations work, we designed Radical Imagination Studio to help leaders practice a fundamentally different way of thinking\u2014challenging inherited assumptions and imagining entirely new possibilities. The experience became part of the broader conversation around AI and leadership, hosted for our partners internally, as an intimate gathering for select clients, and as a public-facing event during New York\u2019s AI Week.",
        "Participants moved through a carefully sequenced studio experience\u2014exploring an exhibition of emerging AI possibilities, completing an AI-powered leadership diagnostic, contributing to live visualizations of collective perspectives, and working in teams to reimagine how AI could reshape a fictional client challenge. Each activity shifted participants from observing change to actively experimenting with it, creating a space where leaders could experience Radical Imagination rather than simply learn about it.",
      ],
      metaDescription:
        "Designing an interactive studio to build radical imagination in the age of AI.",
      nextProjectSlug: "vibe-camp",
      nextProjectImageUrl:
        "/figmaAssets/project-vibe-camp/next-project.png",
      status: "published" as const,
      homepageOrder: 6,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-radical-imagination/gallery-1a.png",
        "Radical Imagination gallery image 1a",
        "/figmaAssets/project-radical-imagination/gallery-1b.png",
        "Radical Imagination gallery image 1b",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-radical-imagination/gallery-full-1.png",
        "Radical Imagination gallery full image 1"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-radical-imagination/gallery-2a.png",
        "Radical Imagination gallery image 2a",
        "/figmaAssets/project-radical-imagination/gallery-2b.png",
        "Radical Imagination gallery image 2b",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-radical-imagination/gallery-3a.png",
        "Radical Imagination gallery image 3a",
        "/figmaAssets/project-radical-imagination/gallery-3b.png",
        "Radical Imagination gallery image 3b",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-radical-imagination/gallery-full-2.png",
        "Radical Imagination gallery full image 2"
      ),
    ],
  },

  // ── 7. Vibe Camp ─────────────────────────────────────────────────────────
  {
    project: {
      slug: "vibe-camp",
      title: "Vibe Camp",
      caseStudyLabel: "CASE STUDY",
      heroImageUrl: "/figmaAssets/project-vibe-camp/hero.png",
      heroImageAlt: "Vibe Camp hero image placeholder",
      metadata: {
        scope:
          "Experience Strategy · Creative Direction · Experience Design · Visual Design · AI Design",
        role: "Creative Director",
        client: "SYPartners",
        year: "2026",
      },
      quote:
        "How might we give teams the confidence and space to discover a new way of creating together with AI?",
      description: [
        "As AI tools rapidly become part of creative work, we designed Vibe Camp to help teams move beyond individual experimentation and discover how they could create together in entirely new ways. Inspired by the spirit of summer camp, we transformed a day of technical training into an immersive environment designed to make experimentation feel playful, approachable, and collaborative. The environment itself was designed to lower the stakes, creating permission to experiment before participants ever touched the technology.",
        "The day moved from guided learning to independent exploration and then collaborative creation. Participants learned the fundamentals of vibe coding in Replit by building their own birdwatching applications before working in teams on a design challenge focused on creating deeper human connection at a large client event. Using shared FigJam workspaces and Replit\u2019s collaborative workflows, teams designed, built, and presented working prototypes together\u2014experiencing firsthand how AI could become part of a new creative process rather than simply another tool to learn.",
      ],
      metaDescription:
        "Helping teams build together in the era of AI collaboration.",
      nextProjectSlug: "building-bridges",
      nextProjectImageUrl: "/figmaAssets/project-uae-china/hero.png",
      status: "published" as const,
      homepageOrder: 7,
      showOnHomepage: true,
    },
    blocks: [
      splitBlock(
        0,
        "/figmaAssets/project-vibe-camp/gallery-1a.png",
        "Vibe Camp gallery image 1a",
        "/figmaAssets/project-vibe-camp/gallery-1b.png",
        "Vibe Camp gallery image 1b",
        "left"
      ),
      fullBlock(
        1,
        "/figmaAssets/project-vibe-camp/gallery-full-1.png",
        "Vibe Camp gallery full image 1"
      ),
      splitBlock(
        2,
        "/figmaAssets/project-vibe-camp/gallery-2a.png",
        "Vibe Camp gallery image 2a",
        "/figmaAssets/project-vibe-camp/gallery-2b.png",
        "Vibe Camp gallery image 2b",
        "right"
      ),
      splitBlock(
        3,
        "/figmaAssets/project-vibe-camp/gallery-3a.png",
        "Vibe Camp gallery image 3a",
        "/figmaAssets/project-vibe-camp/gallery-3b.png",
        "Vibe Camp gallery image 3b",
        "left"
      ),
      fullBlock(
        4,
        "/figmaAssets/project-vibe-camp/gallery-full-2.png",
        "Vibe Camp gallery full image 2"
      ),
    ],
  },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${allProjects.length} projects…\n`);

  for (const { project, blocks } of allProjects) {
    const slug = project.slug as string;

    // Upsert project
    const [existing] = await db
      .select()
      .from(cmsProjects)
      .where(eq(cmsProjects.slug, slug));

    let projectId: string;

    if (existing) {
      const [updated] = await db
        .update(cmsProjects)
        .set({ ...project, updatedAt: new Date() })
        .where(eq(cmsProjects.id, existing.id))
        .returning();
      projectId = updated.id;
      console.log(`  ✓ "${slug}" — updated (id: ${projectId})`);
    } else {
      const [created] = await db
        .insert(cmsProjects)
        .values(project)
        .returning();
      projectId = created.id;
      console.log(`  ✓ "${slug}" — created (id: ${projectId})`);
    }

    // Replace content blocks atomically
    await db
      .delete(cmsContentBlocks)
      .where(eq(cmsContentBlocks.projectId, projectId));

    await db
      .insert(cmsContentBlocks)
      .values(blocks.map((b) => ({ ...b, projectId })));

    console.log(`    └─ ${blocks.length} content blocks seeded`);
  }

  console.log("\n✅ All projects seeded successfully.");
  console.log("\nSmoke-test checklist:");
  console.log("  • /admin/projects  — should list all 7 projects");
  console.log("  • /work/building-bridges  — renders from DB");
  console.log("  • /work/vibe-camp  — renders from DB");
  console.log("  • /api/projects  — returns 7 cards in order");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
