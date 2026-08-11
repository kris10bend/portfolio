export type ProjectImageAsset = {
  src: string;
  alt: string;
  /**
   * When true the image file does not yet exist.
   * Rendering components show a styled placeholder div instead of
   * requesting the (absent) URL — the intended path is stored in
   * data-src so the owner knows where to drop the real photograph.
   */
  isPlaceholder?: boolean;
};

/**
 * A single gallery row.
 *
 * "full"  → one edge-to-edge image
 * "split" → two images side by side.
 *           wide: "left"  → left column is ~59%, right ~38%  (760 / 480 of 1280px)
 *           wide: "right" → left column is ~38%, right ~59%
 * "text"  → one or more narrative paragraphs inserted inline between image rows.
 *           Authored through the CMS text block; rendered as body copy in the
 *           gallery section so it stays in position relative to surrounding images.
 */
export type GalleryBlock =
  | { type: "full"; image: ProjectImageAsset }
  | {
      type: "split";
      left: ProjectImageAsset;
      right: ProjectImageAsset;
      /** Which column carries the wider image */
      wide: "left" | "right";
    }
  | { type: "text"; paragraphs: string[] };

export type ProjectData = {
  slug: string;
  /** e.g. "CASE STUDY" */
  caseStudyLabel: string;
  title: string;
  heroImage: ProjectImageAsset;
  metadata: {
    scope?: string;
    role?: string;
    client: string;
    year: string;
  };
  /** Pull-quote shown in the narrative section */
  quote: string;
  /** Body paragraphs beneath the quote */
  description: string[];
  gallery: GalleryBlock[];
  /**
   * Brief summary used as the HTML meta description for the page.
   * Use only copy derived from the project's approved content.
   */
  metaDescription?: string;
  /** Optional — renders the Next Project strip above the footer */
  nextProject?: {
    slug: string;
    title: string;
    image: ProjectImageAsset;
  };
};
