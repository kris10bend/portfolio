import { ProjectImageAsset } from "@/types/project";

interface ProjectHeroSectionProps {
  image: ProjectImageAsset;
}

/**
 * Full-bleed hero image at the top of a project page.
 * Matches the Figma `case-study-hero` frame: 600px tall, object-cover.
 */
export const ProjectHeroSection = ({
  image,
}: ProjectHeroSectionProps): JSX.Element => {
  return (
    <section
      aria-label="Project hero image"
      className="relative h-[400px] w-full overflow-hidden md:h-[500px] lg:h-[600px]"
    >
      <img
        src={image.src}
        alt={image.alt}
        className="h-full w-full object-cover object-center"
      />
    </section>
  );
};
