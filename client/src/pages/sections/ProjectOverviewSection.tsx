import { ProjectData } from "@/types/project";

interface ProjectOverviewSectionProps {
  caseStudyLabel: string;
  title: string;
  metadata: ProjectData["metadata"];
}

const BLUE = "#002fa7";
const YELLOW = "#ffb41f";

/**
 * Blue panel containing the project title, case-study label, and metadata row.
 * Matches the Figma `project-info` frame.
 *
 * Layout:
 *   - Eyebrow label  (12px uppercase, yellow)
 *   - Project title  (64px Inter, white)
 *   - Horizontal rule
 *   - Metadata grid  (Scope / Role / Focus / Year)
 */
export const ProjectOverviewSection = ({
  caseStudyLabel,
  title,
  metadata,
}: ProjectOverviewSectionProps): JSX.Element => {
  const metaFields = [
    { label: "Scope", value: metadata.scope },
    { label: "Role", value: metadata.role },
    { label: "Client", value: metadata.client },
    { label: "Year", value: metadata.year },
  ];

  return (
    <section
      style={{ backgroundColor: BLUE }}
      className="flex w-full flex-col items-start gap-10 px-6 pb-14 pt-16 sm:gap-12 sm:px-10 sm:pb-16 sm:pt-20 lg:gap-12 lg:px-20 lg:pb-16 lg:pt-20"
    >
      {/* Title block */}
      <div className="flex w-full flex-col gap-4">
        <p
          className="text-[12px] font-normal uppercase leading-normal"
          style={{
            color: YELLOW,
            fontFamily: "'Inter', Helvetica, sans-serif",
            letterSpacing: "0.08em",
          }}
        >
          {caseStudyLabel}
        </p>
        <h1
          className="max-w-[800px] font-normal leading-none text-white"
          style={{
            fontFamily: "'Inter', Helvetica, sans-serif",
            fontSize: "clamp(36px, 5vw, 64px)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Divider */}
      <div className="w-full border-t border-white/20" />

      {/* Metadata grid */}
      <div className="grid w-full grid-cols-2 gap-y-8 sm:grid-cols-4 sm:gap-y-0">
        {metaFields.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-2">
            <p
              className="text-[11px] font-normal uppercase leading-none text-white"
              style={{
                fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              {label}
            </p>
            <p
              className="font-normal leading-tight text-white"
              style={{
                fontFamily: "'Inter', Helvetica, sans-serif",
                fontSize: "clamp(18px, 2.5vw, 24px)",
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
