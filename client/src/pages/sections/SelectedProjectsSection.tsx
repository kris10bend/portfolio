import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectCard {
  slug: string;
  title: string;
  /** Short description / excerpt shown under the project title */
  excerpt: string;
  heroImageSrc: string;
  heroImageAlt: string;
}

type ImageHeight = "large" | "small";
type TitleSize = "large" | "small";

/**
 * Returns image-height and title-size for a project at a given 0-based index
 * in the homepage grid.
 *
 * Layout slots:
 *   0         → featured (full width, large)
 *   1         → first pair left  column (760fr → large)
 *   2         → first pair right column (480fr → small)
 *   3         → solo card (large)
 *   4         → second pair left  column (480fr → small)
 *   5         → second pair right column (760fr → large)
 *   6+        → final/extra solo cards (large)
 */
function slotSizes(index: number): { imageHeight: ImageHeight; titleSize: TitleSize } {
  const small: { imageHeight: ImageHeight; titleSize: TitleSize } = {
    imageHeight: "small",
    titleSize: "small",
  };
  const large: { imageHeight: ImageHeight; titleSize: TitleSize } = {
    imageHeight: "large",
    titleSize: "large",
  };
  if (index === 2) return small; // first pair right column (480fr)
  if (index === 4) return small; // second pair left column (480fr)
  return large;
}

// ─── Card components ──────────────────────────────────────────────────────────

const ProjectCardContent = ({
  card,
  imageHeight,
  titleSize,
  showOverlay = false,
}: {
  card: ProjectCard;
  imageHeight: ImageHeight;
  titleSize: TitleSize;
  showOverlay?: boolean;
}): JSX.Element => {
  const isLarge = imageHeight === "large";

  return (
    <CardContent className="space-y-6 p-0">
      <div
        className={`group relative overflow-hidden rounded ${
          isLarge ? "h-[440px] lg:h-[500px]" : "h-[360px]"
        }`}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          alt={card.heroImageAlt}
          src={card.heroImageSrc}
        />
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#002fa7]/75 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="max-w-[260px] text-center text-[13px] font-normal leading-[1.6] text-white [font-family:'Geist',Helvetica] tracking-[0.01em]">
              Case study in progress, reach out for information.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className={`mt-[-1px] [font-family:'Inter',Helvetica] font-normal tracking-[0] text-gray-900 leading-[normal] ${
            titleSize === "large"
              ? "text-[28px] lg:text-[32px]"
              : "text-[26px] lg:text-[28px]"
          }`}
        >
          {card.title}
        </h3>
        <p className="[font-family:'Geist',Helvetica] text-sm font-normal leading-[21px] tracking-[0] text-gray-700">
          {card.excerpt}
        </p>
      </div>
    </CardContent>
  );
};

const ProjectCard = ({
  card,
  index,
  className = "",
  showOverlay = false,
}: {
  card: ProjectCard;
  index: number;
  className?: string;
  showOverlay?: boolean;
}): JSX.Element => {
  const { imageHeight, titleSize } = slotSizes(index);

  const inner = (
    <Card className={`w-full border-0 bg-transparent p-0 shadow-none ${className}`}>
      <ProjectCardContent
        card={card}
        imageHeight={imageHeight}
        titleSize={titleSize}
        showOverlay={showOverlay}
      />
    </Card>
  );

  return (
    <Link href={`/work/${card.slug}`} className="block">
      {inner}
    </Link>
  );
};

// ─── Section ──────────────────────────────────────────────────────────────────

export const SelectedProjectsSection = (): JSX.Element => {
  const { data: projects = [] } = useQuery<ProjectCard[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json() as Promise<ProjectCard[]>;
    },
    staleTime: 30_000,
  });

  // Derive the seven layout slots from the ordered project list.
  // Slots beyond the project list are omitted rather than rendered empty.
  const featured = projects[0];
  const firstPair = projects.slice(1, 3);
  const solo = projects[3];
  const secondPair = projects.slice(4, 6);
  const finalSolo = projects[6];

  return (
    <section id="work" className="w-full bg-white px-6 pt-8 pb-16 sm:px-10 sm:pt-10 sm:pb-24 lg:px-20 lg:pt-10 lg:pb-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[30px] lg:gap-20">
        <header className="space-y-4 lg:space-y-5">
          <h2 className="mt-[-1px] [font-family:'Inter',Helvetica] text-4xl font-normal leading-[normal] tracking-[0] text-gray-900 lg:text-5xl">
            Selected Works
          </h2>
          <p className="mt-2 [font-family:'Inter',Helvetica] text-sm font-normal leading-snug tracking-[0] text-gray-600 lg:text-base">
            The projects I love most begin with a question:
            <br />
            <em>How can we help people see this differently?</em>
          </p>
        </header>

        {featured && <ProjectCard card={featured} index={0} />}

        {firstPair.length > 0 && (
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,760fr)_minmax(0,480fr)]">
            {firstPair.map((card, i) => (
              <ProjectCard key={card.slug} card={card} index={1 + i} />
            ))}
          </div>
        )}

        {solo && <ProjectCard card={solo} index={3} className="pt-10" />}

        {secondPair.length > 0 && (
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,480fr)_minmax(0,760fr)]">
            {secondPair.map((card, i) => (
              <ProjectCard key={card.slug} card={card} index={4 + i} />
            ))}
          </div>
        )}

        {finalSolo && <ProjectCard card={finalSolo} index={6} className="pt-10" />}
      </div>
    </section>
  );
};
