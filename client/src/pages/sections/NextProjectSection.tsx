import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ProjectData } from "@/types/project";

interface NextProjectSectionProps {
  nextProject: NonNullable<ProjectData["nextProject"]>;
}

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
          {/* Background image — or placeholder slot if image is not yet available */}
          {nextProject.image.isPlaceholder ? (
            <div
              className="absolute inset-0 h-full w-full bg-gray-200"
              role="img"
              aria-label={nextProject.image.alt}
              data-src={nextProject.image.src}
            />
          ) : (
            <img
              src={nextProject.image.src}
              alt={nextProject.image.alt}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

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
