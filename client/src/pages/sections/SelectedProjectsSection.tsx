import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

type Project = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageHeight: "large" | "small";
  titleSize: "large" | "small";
  /** Slug from projects.ts — when set the card becomes a link to /work/:slug */
  slug?: string;
};

const featuredProject: Project = {
  title: "Building Bridges for the Future",
  description:
    "Bringing forty years of UAE–China partnership to life through shared stories and public participation.",
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
      "Bringing the UAE's vision for a net zero future to life at COP28.",
    image: "/figmaAssets/msst0758-1.png",
    imageAlt: "Msst",
    imageHeight: "large",
    titleSize: "large",
  },
  {
    title: "Designing Better Futures",
    description:
      "Helping leaders experience possible futures before choosing which one to pursue.",
    image: "/figmaAssets/dct-cover-img-1.png",
    imageAlt: "Dct cover img",
    imageHeight: "small",
    titleSize: "small",
  },
];

const expoProject: Project = {
  title: "Expo 2020",
  description:
    "Translating breakthrough ideas into an exhibition celebrating the UAE's innovators.",
  image: "/figmaAssets/img-4838-1.png",
  imageAlt: "Img",
  imageHeight: "large",
  titleSize: "large",
};

const secondProjectPair: Project[] = [
  {
    title: "Collective Intelligence",
    description:
      "Transforming employee insights into collective action through human-AI collaboration.",
    image: "/figmaAssets/carl-1.png",
    imageAlt: "Carl",
    imageHeight: "small",
    titleSize: "small",
  },
  {
    title: "Radical Imagination",
    description:
      "Designing an interactive studio to build radical imagination in the age of AI.",
    image: "/figmaAssets/20260513-dini-4508-2.png",
    imageAlt: "Element dini",
    imageHeight: "large",
    titleSize: "large",
  },
];

const finalProject: Project = {
  title: "Vibe Camp",
  description:
    "Helping teams build together in the era of AI collaboration.",
  image: "/figmaAssets/screenshot-2026-07-29-at-9-47-26-am-1.png",
  imageAlt: "Screenshot",
  imageHeight: "large",
  titleSize: "large",
};

const ProjectCardContent = ({
  project,
  showOverlay = false,
}: {
  project: Project;
  showOverlay?: boolean;
}): JSX.Element => {
  const isLarge = project.imageHeight === "large";

  return (
    <CardContent className="space-y-6 p-0">
      <div
        className={`group relative overflow-hidden rounded ${
          isLarge ? "h-[440px] lg:h-[500px]" : "h-[360px]"
        }`}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          alt={project.imageAlt}
          src={project.image}
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
            project.titleSize === "large"
              ? "text-[28px] lg:text-[32px]"
              : "text-[26px] lg:text-[28px]"
          }`}
        >
          {project.title}
        </h3>
        <p className="[font-family:'Geist',Helvetica] text-sm font-normal leading-[21px] tracking-[0] text-gray-700">
          {project.description}
        </p>
      </div>
    </CardContent>
  );
};

const ProjectCard = ({
  project,
  className = "",
  showOverlay = false,
}: {
  project: Project;
  className?: string;
  showOverlay?: boolean;
}): JSX.Element => {
  const card = (
    <Card
      className={`w-full border-0 bg-transparent p-0 shadow-none ${className}`}
    >
      <ProjectCardContent project={project} showOverlay={showOverlay} />
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
        <ProjectCard project={featuredProject} />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,760fr)_minmax(0,480fr)]">
          {firstProjectPair.map((project) => (
            <ProjectCard
              key={project.title}
              project={project}
              className=""
              showOverlay={!project.slug}
            />
          ))}
        </div>
        <ProjectCard project={expoProject} className="pt-10" showOverlay={!expoProject.slug} />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,480fr)_minmax(0,760fr)]">
          {secondProjectPair.map((project) => (
            <ProjectCard
              key={project.title}
              project={project}
              className=""
              showOverlay={!project.slug}
            />
          ))}
        </div>
        <ProjectCard project={finalProject} className="pt-10" showOverlay={!finalProject.slug} />
      </div>
    </section>
  );
};
