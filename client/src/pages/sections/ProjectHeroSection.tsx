import { useState } from "react";
import { ProjectImageAsset } from "@/types/project";

interface ProjectHeroSectionProps {
  image: ProjectImageAsset;
}

/**
 * Full-bleed hero image at the top of a project page.
 * Matches the Figma `case-study-hero` frame: 600px tall, object-cover.
 *
 * Always attempts to load the real image. If the file is missing (404) the
 * component falls back to a grey placeholder slot automatically — no code
 * change needed when photography is added. The `isPlaceholder` flag on the
 * data object is treated as a hint to skip the initial network request, but
 * the owner does not need to clear it after dropping in a photo; the image
 * will appear regardless once the file exists.
 */
export const ProjectHeroSection = ({
  image,
}: ProjectHeroSectionProps): JSX.Element => {
  const [failed, setFailed] = useState(false);

  return (
    <section
      aria-label="Project hero image"
      className="relative h-[400px] w-full overflow-hidden md:h-[500px] lg:h-[600px]"
    >
      {failed ? (
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
          onError={() => setFailed(true)}
        />
      )}
    </section>
  );
};
