import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

type Project = {
  title: string;
  description: string;
  metadata: string;
  image: string;
  imageAlt: string;
  imageHeight: "large" | "small";
  titleSize: "large" | "small";
  /** Slug from projects.ts — when set the card becomes a link to /work/:slug */
  slug?: string;
  descriptionWidth?: string;
  metadataWidth?: string;
  metadataAlign?: "left" | "right";
};

const featuredProject: Project = {
  title: "Building Bridges for the Future",
  description:
    "Bringing four decades of diplomacy to life through an immersive cultural experience celebrating the partnership between the UAE and China.",
  metadata: "CREATIVE DIRECTION · EXPERIENCE DESIGN · EXHIBITION DESIGN · 2024",
  image: "/figmaAssets/01112024-uae-china-ybc-day1-03016-3.png",
  imageAlt: "Element UAE china",
  imageHeight: "large",
  titleSize: "large",
  // Slug sourced directly from projects.ts — not derived from title
  slug: "building-bridges",
};

const firstProjectPair: Project[] = [
  {
    title: "Journey to Net Zero",
    description:
      "Transforming climate strategy into an experience people could explore, understand, and discuss.",
    metadata:
      "CREATIVE DIRECTION · EXPERIENCE DESIGN · EXHIBITION DESIGN · 2023",
    image: "/figmaAssets/msst0758-1.png",
    imageAlt: "Msst",
    imageHeight: "large",
    titleSize: "large",
    descriptionWidth: "max-w-[430px]",
    metadataWidth: "max-w-[253px]",
    metadataAlign: "right",
  },
  {
    title: "Designing Better Futures",
    description:
      "Helping leadership teams navigate complex challenges through collaborative experiences designed to build alignment and momentum.",
    metadata: "CREATIVE DIRECTION · EXPERIENCE STRATEGY · 2025",
    image: "/figmaAssets/dct-cover-img-1.png",
    imageAlt: "Dct cover img",
    imageHeight: "small",
    titleSize: "small",
  },
];

const expoProject: Project = {
  title: "Expo 2020 Dubai",
  description:
    "Showcasing the UAE's spirit of innovation through immersive storytelling that invited visitors to explore the country's future vision.",
  metadata: "CREATIVE DIRECTION · EXPERIENCE DESIGN · SPATIAL DESIGN · 2021",
  image: "/figmaAssets/img-4838-1.png",
  imageAlt: "Img",
  imageHeight: "large",
  titleSize: "large",
};

const secondProjectPair: Project[] = [
  {
    title: "Rethinking Collaboration",
    description:
      "Enabling teams to move from individual thinking to collective action through a collaborative experience integrating AI, facilitation, and analog tools.",
    metadata:
      "CREATIVE DIRECTION · EXPERIENCE STRATEGY · FACILITATION · AI EXPERIENCE DESIGN · 2026",
    image: "/figmaAssets/carl-1.png",
    imageAlt: "Carl",
    imageHeight: "small",
    titleSize: "small",
    metadataWidth: "max-w-[461px]",
  },
  {
    title: "Radical Imagination",
    description:
      "Helping leaders imagine bold futures by combining collaborative facilitation with AI-powered exploration and rapid prototyping.",
    metadata:
      "CREATIVE DIRECTION · WORKSHOP DESIGN · FACILITATION · AI EXPERIENCE DESIGN · 2026",
    image: "/figmaAssets/20260513-dini-4508-2.png",
    imageAlt: "Element dini",
    imageHeight: "large",
    titleSize: "large",
    descriptionWidth: "max-w-[500px]",
    metadataWidth: "max-w-[215px]",
    metadataAlign: "right",
  },
];

const finalProject: Project = {
  title: "Vibe Camp: SYPartners Learning Lab",
  description:
    "Helping teams build confidence with AI through hands-on experimentation, collaborative making, and rapid prototyping.",
  metadata:
    "CREATIVE DIRECTION · LEARNING EXPERIENCE · FACILITATION · AI EXPERIENCE DESIGN · 2026",
  image: "/figmaAssets/screenshot-2026-07-29-at-9-47-26-am-1.png",
  imageAlt: "Screenshot",
  imageHeight: "large",
  titleSize: "large",
  descriptionWidth: "max-w-[581px]",
};

const ProjectCardContent = ({
  project,
}: {
  project: Project;
}): JSX.Element => {
  const isLarge = project.imageHeight === "large";

  return (
    <CardContent className="space-y-6 p-0">
      <figure
        className={`overflow-hidden rounded ${
          isLarge ? "h-[440px] lg:h-[500px]" : "h-[360px]"
        }`}
      >
        <img
          className="h-full w-full object-cover"
          alt={project.imageAlt}
          src={project.image}
        />
      </figure>
      <div
        className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8"
      >
        <div className={`min-w-0 ${project.descriptionWidth ?? ""}`}>
          <h3
            className={`mt-[-1px] [font-family:'Inter',Helvetica] font-normal tracking-[0] text-gray-900 leading-[normal] ${
              project.titleSize === "large"
                ? "text-[28px] lg:text-[32px]"
                : "text-[26px] lg:text-[28px]"
            }`}
          >
            {project.title}
          </h3>
          <p className="mt-2 [font-family:'Geist',Helvetica] text-sm font-normal leading-[21px] tracking-[0] text-gray-700">
            {project.description}
          </p>
        </div>
        <p
          className={`shrink-0 [font-family:'Geist',Helvetica] text-xs font-normal leading-[normal] text-gray-900 ${
            project.metadataWidth ?? ""
          } ${project.metadataAlign === "right" ? "text-left lg:text-right" : ""}`}
        >
          {project.metadata}
        </p>
      </div>
    </CardContent>
  );
};

const ProjectCard = ({
  project,
  className = "",
}: {
  project: Project;
  className?: string;
}): JSX.Element => {
  const card = (
    <Card
      className={`w-full border-0 bg-transparent p-0 shadow-none ${className}`}
    >
      <ProjectCardContent project={project} />
    </Card>
  );

  if (project.slug) {
    return (
      <Link href={`/work/${project.slug}`} className="block">
        {card}
      </Link>
    );
  }

  return card;
};

export const SelectedProjectsSection = (): JSX.Element => {
  return (
    <section id="work" className="w-full bg-white px-6 py-16 sm:px-10 sm:py-24 lg:px-20 lg:py-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16 lg:gap-20">
        <header className="space-y-8 lg:space-y-20">
          <div className="flex items-baseline justify-between gap-6">
            <h2 className="mt-[-1px] [font-family:'Inter',Helvetica] text-4xl font-normal leading-[normal] tracking-[0] text-gray-900 lg:text-5xl">
              Selected Works
            </h2>
            <p className="shrink-0 [font-family:'Geist',Helvetica] text-[11px] font-normal leading-[normal] text-gray-500 lg:text-[13px]">
              01 / 07 PROJECTS
            </p>
          </div>
          <p className="mt-[-1px] [font-family:'Inter',Helvetica] text-xl font-normal leading-[normal] tracking-[0] text-gray-900 lg:text-2xl">
            The projects I love most begin with a question:
            <br />
            <em>How can we help people see this differently?</em>
          </p>
        </header>
        <ProjectCard project={featuredProject} />
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,760fr)_minmax(0,480fr)]">
          {firstProjectPair.map((project, index) => (
            <ProjectCard
              key={project.title}
              project={project}
              className={index === 1 ? "lg:pt-[120px]" : ""}
            />
          ))}
        </div>
        <ProjectCard project={expoProject} className="pt-10" />
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,480fr)_minmax(0,760fr)]">
          {secondProjectPair.map((project, index) => (
            <ProjectCard
              key={project.title}
              project={project}
              className={index === 0 ? "lg:pt-[120px]" : ""}
            />
          ))}
        </div>
        <ProjectCard project={finalProject} className="pt-10" />
      </div>
    </section>
  );
};
