import { ProjectData } from "@/types/project";

export const projects: ProjectData[] = [
  {
    slug: "building-bridges",
    caseStudyLabel: "CASE STUDY 01 / SERIES",
    title: "Building Bridges for the Future",
    heroImage: {
      src: "/figmaAssets/project-uae-china/hero.png",
      alt: "UAE China YBC immersive exhibition",
    },
    metadata: {
      scope: "Cultural Experience & Exhibition",
      role: "Creative Direction & Experience Design",
      focus: "UAE–China Cultural Partnership",
      year: "2024",
    },
    quote:
      "\u201cHow can we honor four decades of partnership and make diplomacy something people can feel, not just read about?\u201d",
    description: [
      "Building Bridges for the Future was an immersive cultural experience celebrating the 40-year partnership between the UAE and China. We brought decades of diplomatic history to life through spatial storytelling, blending archival materials, sensory environments, and interactive installations that invited visitors to explore the depth and nuance of cross-cultural exchange.",
      "The experience was designed to move beyond traditional exhibition formats, creating moments of personal connection and discovery. Visitors moved through curated environments that revealed shared values, collaborative milestones, and future possibilities \u2014 transforming abstract geopolitics into something tangible and deeply human.",
    ],
    gallery: [
      {
        type: "split",
        left: {
          src: "/figmaAssets/project-uae-china/gallery-1a.png",
          alt: "Immersive installation overview",
        },
        right: {
          src: "/figmaAssets/project-uae-china/gallery-1b.png",
          alt: "Cultural display panels",
        },
        wide: "left",
      },
      {
        type: "full",
        image: {
          src: "/figmaAssets/project-uae-china/gallery-full-1.png",
          alt: "Exhibition hall walkthrough",
        },
      },
      {
        type: "split",
        left: {
          src: "/figmaAssets/project-uae-china/gallery-2a.png",
          alt: "Exhibition detail — visitors exploring",
        },
        right: {
          src: "/figmaAssets/project-uae-china/gallery-2b.png",
          alt: "Archival materials installation",
        },
        wide: "right",
      },
      {
        type: "split",
        left: {
          src: "/figmaAssets/project-uae-china/gallery-3a.png",
          alt: "Exhibition environment setup",
        },
        right: {
          src: "/figmaAssets/project-uae-china/gallery-3b.png",
          alt: "Cultural exchange moment",
        },
        wide: "left",
      },
      {
        type: "full",
        image: {
          src: "/figmaAssets/project-uae-china/gallery-full-2.png",
          alt: "Atmospheric exhibition space",
        },
      },
    ],
    // nextProject will be populated once more projects are added
  },
];

/** Look up a project by its URL slug. Returns undefined if not found. */
export function getProjectBySlug(slug: string): ProjectData | undefined {
  return projects.find((p) => p.slug === slug);
}
