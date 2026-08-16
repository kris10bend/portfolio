import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ProjectData, ProjectImageAsset } from "@/types/project";

interface NextProjectSectionProps {
  nextProject: NonNullable<ProjectData["nextProject"]>;
}

/**
 * Background image for the next-project strip.
 * Always attempts to load the real file; falls back to a grey slot if the
 * file is missing — the owner just drops a photo into
 * client/public/figmaAssets/ and it appears automatically.
 */
const NextProjectImage = ({
  image,
}: {
  image: ProjectImageAsset;
}): JSX.Element => {
  const [failed, setFailed] = useState(false);

  return failed ? (
    <div
      className="absolute inset-0 h-full w-full bg-gray-200"
      role="img"
      aria-label={image.alt}
      data-src={image.src}
    />
  ) : (
    <img
      src={image.src}
      alt={image.alt}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      onError={() => setFailed(true)}
    />
  );
};

/**
 * "Next Project" navigation strip.
 * Shows a teaser image, the next project title, and an arrow link.
 * Sits just above the footer.
 */
export const NextProjectSection = ({
  nextProject,
}: NextProjectSectionProps): JSX.Element => {
  return (
    <section className="w-full border-t border-gray-100">
      {/* wouter's Link renders the <a> — no inner anchor needed */}
      <Link href={`/work/${nextProject.slug}`}>
        <div className="group relative flex h-[220px] w-full cursor-pointer items-end overflow-hidden sm:h-[280px] lg:h-[320px]">
          {/* Background image — falls back to a grey slot if the file is missing */}
          <NextProjectImage image={nextProject.image} />
          {/* Flat overlay — dims the whole image so it reads as distinct from in-page content */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Gradient overlay — reinforces legibility of text at the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Text */}
          <div className="relative w-full px-6 pb-8 sm:px-10 lg:px-20 lg:pb-12">
          <div className="mx-auto flex w-full max-w-[1400px] items-end justify-between">
            <div className="flex flex-col gap-1">
              <p
                className="text-[11px] font-normal uppercase tracking-widest text-white/60"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                Next Project
              </p>
              <p
                className="font-normal leading-tight text-white"
                style={{
                  fontFamily: "'Inter', Helvetica, sans-serif",
                  fontSize: "clamp(20px, 3vw, 36px)",
                  letterSpacing: "-0.01em",
                }}
              >
                {nextProject.title}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-all duration-200 group-hover:border-white group-hover:bg-white/10 lg:h-12 lg:w-12">
              <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
          </div>
          </div>
        </div>
      </Link>
    </section>
  );
};
