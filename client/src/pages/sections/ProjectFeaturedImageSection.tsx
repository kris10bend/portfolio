import { useState } from "react";
import { ProjectImageAsset } from "@/types/project";

interface ProjectFeaturedImageSectionProps {
  image: ProjectImageAsset;
}

/**
 * Full-width featured image displayed between the hero banner and the project
 * overview panel on the case study page.
 *
 * Applies the saved focal-point crop (objectPosition + zoom) so the most
 * important part of the photo is always visible regardless of container size.
 * Only rendered when the project has a featuredImage set in the CMS.
 */
export const ProjectFeaturedImageSection = ({
  image,
}: ProjectFeaturedImageSectionProps): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const zoom = image.zoom ?? 1;
  const origin = image.objectPosition ?? "50% 50%";

  return (
    <section
      aria-label="Project featured image"
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(280px, 45vw, 640px)" }}
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
        /* Zoom wrapper — scales toward the focal point; overflow-hidden on the
           section clips the scaled content cleanly. */
        <div
          className="h-full w-full"
          style={
            zoom !== 1
              ? { transform: `scale(${zoom})`, transformOrigin: origin }
              : undefined
          }
        >
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover"
            style={{ objectPosition: origin }}
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </section>
  );
};
