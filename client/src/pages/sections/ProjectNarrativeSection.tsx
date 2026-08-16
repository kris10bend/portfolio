import { ContainerLayout } from "@/components/ContainerLayout";

interface ProjectNarrativeSectionProps {
  quote: string;
  description: string[];
}

/**
 * Split-column narrative section.
 * Left column: pull-quote in large Inter.
 * Right column: 1–N body paragraphs in Geist.
 *
 * Matches the Figma `narrative-split` frame.
 */
export const ProjectNarrativeSection = ({
  quote,
  description,
}: ProjectNarrativeSectionProps): JSX.Element => {
  return (
    <section className="w-full px-6 pb-16 pt-10 sm:px-10 sm:pb-20 sm:pt-12 lg:px-20 lg:pb-24 lg:pt-12">
      <ContainerLayout className="lg:flex lg:gap-20">
      {/* Pull-quote */}
      <blockquote
        className="mb-8 shrink-0 font-normal leading-[1.1] text-[#0d0d1a] lg:mb-0 lg:w-[480px]"
        style={{
          fontFamily: "'Inter', Helvetica, sans-serif",
          fontSize: "clamp(20px, 2.6vw, 32px)",
        }}
      >
        {quote}
      </blockquote>

      {/* Body text */}
      <div className="flex flex-col gap-6 lg:w-[640px] lg:flex-1">
        {description.map((paragraph, i) => (
          <p
            key={i}
            className="font-normal leading-[1.65] text-[#0d0d1a]"
            style={{
              fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
              fontSize: "16px",
            }}
          >
            {paragraph}
          </p>
        ))}
      </div>
      </ContainerLayout>
    </section>
  );
};
