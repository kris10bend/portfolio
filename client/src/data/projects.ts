import { ProjectData } from "@/types/project";

export const projects: ProjectData[] = [
  {
    slug: "building-bridges",
    caseStudyLabel: "CASE STUDY",
    title: "Building Bridges\nfor the Future",
    heroImage: {
      src: "/figmaAssets/project-uae-china/hero.png",
      alt: "UAE China YBC immersive exhibition",
    },
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
