export type ProjectImageAsset = {
  src: string;
  alt: string;
};

/**
 * A single gallery row.
 *
 * "full"  → one edge-to-edge image
 * "split" → two images side by side.
 *           wide: "left"  → left column is ~59%, right ~38%  (760 / 480 of 1280px)
 *           wide: "right" → left column is ~38%, right ~59%
 */
export type GalleryBlock =
  | { type: "full"; image: ProjectImageAsset }
  | {
      type: "split";
      left: ProjectImageAsset;
      right: ProjectImageAsset;
      /** Which column carries the wider image */
      wide: "left" | "right";
    };

export type ProjectData = {
  slug: string;
  /** e.g. "CASE STUDY 01 / SERIES" */
  caseStudyLabel: string;
  title: string;
  heroImage: ProjectImageAsset;
  metadata: {
    scope: string;
    role: string;
    focus: string;
    year: string;
  };
  /** Pull-quote shown in the narrative section */
  quote: string;
  /** Body paragraphs beneath the quote */
  description: string[];
  gallery: GalleryBlock[];
  /** Optional — renders the Next Project strip above the footer */
  nextProject?: {
    slug: string;
    title: string;
    image: ProjectImageAsset;
  };
};
