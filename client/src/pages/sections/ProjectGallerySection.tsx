import { GalleryBlock, ProjectImageAsset } from "@/types/project";
import { ContainerLayout } from "@/components/ContainerLayout";

interface ProjectGallerySectionProps {
  blocks: GalleryBlock[];
}

/** Single image that fills its container, rounded corners, object-cover. */
const GalleryImage = ({
  image,
  className = "",
}: {
  image: ProjectImageAsset;
  className?: string;
}): JSX.Element => (
  <div className={`overflow-hidden rounded-[4px] ${className}`}>
    <img
      src={image.src}
      alt={image.alt}
      className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
    />
  </div>
);

/** Full-width gallery row — single image, 560px tall on desktop. */
const FullRow = ({ image }: { image: ProjectImageAsset }): JSX.Element => (
  <GalleryImage image={image} className="h-[280px] w-full sm:h-[400px] lg:h-[560px]" />
);

/**
 * Two-column gallery row.
 * wide="left"  → 760 : 480 split  (~61 / 39%)
 * wide="right" → 480 : 760 split  (~39 / 61%)
 * On mobile both columns stack vertically (450px each).
 */
const SplitRow = ({
  left,
  right,
  wide,
}: {
  left: ProjectImageAsset;
  right: ProjectImageAsset;
  wide: "left" | "right";
}): JSX.Element => {
  // Flex-basis values mirror the Figma pixel widths (760 + 40px gap + 480 = 1280)
  const leftBasis = wide === "left" ? "flex-[760]" : "flex-[480]";
  const rightBasis = wide === "left" ? "flex-[480]" : "flex-[760]";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-10">
      <GalleryImage
        image={left}
        className={`h-[300px] w-full sm:h-[400px] lg:h-[500px] ${leftBasis}`}
      />
      <GalleryImage
        image={right}
        className={`h-[300px] w-full sm:h-[400px] lg:h-[500px] ${rightBasis}`}
      />
    </div>
  );
};

/**
 * Renders the full gallery section from a typed array of `GalleryBlock`.
 * Matches the Figma `project-gallery` frame: px-80, pt-48, pb-120, gap-40 between rows.
 */
export const ProjectGallerySection = ({
  blocks,
}: ProjectGallerySectionProps): JSX.Element => {
  return (
    <section className="w-full px-6 pb-16 pt-10 sm:px-10 sm:pb-24 sm:pt-12 lg:px-20 lg:pb-32 lg:pt-12">
      <ContainerLayout className="flex flex-col gap-4 sm:gap-6 lg:gap-10">
      {blocks.map((block, i) => {
        if (block.type === "full") {
          return <FullRow key={i} image={block.image} />;
        }
        return (
          <SplitRow
            key={i}
            left={block.left}
            right={block.right}
            wide={block.wide}
          />
        );
      })}
      </ContainerLayout>
    </section>
  );
};
