import { ProjectImageAsset } from "@/types/project";

interface ProjectHeroSectionProps {
  image: ProjectImageAsset;
}

/**
 * Full-bleed hero image at the top of a project page.
 * Matches the Figma `case-study-hero` frame: 600px tall, object-cover.
 * When `image.isPlaceholder` is true a styled slot is rendered instead
 * of requesting a nonexistent file — the intended path lives in data-src.
 */
export const ProjectHeroSection = ({
  image,
}: ProjectHeroSectionProps): JSX.Element => {
  return (
    <section
      aria-label="Project hero image"
      className="relative h-[400px] w-full overflow-hidden md:h-[500px] lg:h-[600px]"
    >
      {image.isPlaceholder ? (
        <div
          className="flex h-full w-full items-center justify-center bg-gray-100"
          role="img"
          aria-label={image.alt}
          data-src={image.src}
        >
          <p
            className="max-w-xs break-all px-6 text-center font-mono text-xs text-gray-400"
            aria-hidden="true"
          >
            {image.src}
          </p>
        </div>
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          className="h-full w-full object-cover object-center"
        />
      )}
    </section>
  );
};
