const BLUE = "#002fa7";

type Project = {
  title: string;
  description: string;
  metadata: string;
  image: string;
  imageAlt: string;
  imageHeight: "large" | "small";
  titleSize: "large" | "small";
  descriptionWidth?: string;
  metadataWidth?: string;
  metadataAlign?: "left" | "right";
};

const featuredProject: Project = {
  title: "Building Bridges for the Future",
  description:
    "Bringing four decades of diplomacy to life through an immersive cultural experience celebrating the partnership between the UAE and China.",
  metadata: "CREATIVE DIRECTION · EXPERIENCE DESIGN · EXHIBITION DESIGN · 2024",
  image: "/__mockup/images/01112024-uae-china-ybc-day1-03016-3.png",
  imageAlt: "UAE China exhibition",
  imageHeight: "large",
  titleSize: "large",
};

const firstProjectPair: Project[] = [
  {
    title: "Journey to Net Zero",
    description:
      "Transforming climate strategy into an experience people could explore, understand, and discuss.",
    metadata: "CREATIVE DIRECTION · EXPERIENCE DESIGN · EXHIBITION DESIGN · 2023",
    image: "/__mockup/images/msst0758-1.png",
    imageAlt: "Journey to Net Zero",
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
    image: "/__mockup/images/dct-cover-img-1.png",
    imageAlt: "Designing Better Futures",
    imageHeight: "small",
    titleSize: "small",
  },
];

const expoProject: Project = {
  title: "Expo 2020 Dubai",
  description:
    "Showcasing the UAE's spirit of innovation through immersive storytelling that invited visitors to explore the country's future vision.",
  metadata: "CREATIVE DIRECTION · EXPERIENCE DESIGN · SPATIAL DESIGN · 2021",
  image: "/__mockup/images/img-4838-1.png",
  imageAlt: "Expo 2020 Dubai",
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
    image: "/__mockup/images/carl-1.png",
    imageAlt: "Rethinking Collaboration",
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
    image: "/__mockup/images/20260513-dini-4508-2.png",
    imageAlt: "Radical Imagination",
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
  image: "/__mockup/images/screenshot-2026-07-29-at-9-47-26-am-1.png",
  imageAlt: "Vibe Camp learning lab",
  imageHeight: "large",
  titleSize: "large",
  descriptionWidth: "max-w-[581px]",
};

function ProjectCard({
  project,
  className = "",
}: {
  project: Project;
  className?: string;
}) {
  const isLarge = project.imageHeight === "large";

  return (
    <article className={`w-full ${className}`}>
      {/* Image with subtle hover zoom */}
      <div
        className={`overflow-hidden ${
          isLarge ? "h-[440px] lg:h-[500px]" : "h-[360px]"
        }`}
        style={{ borderRadius: "2px" }}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
          alt={project.imageAlt}
          src={project.image}
        />
      </div>

      {/* Text block */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8">
        <div className={`min-w-0 ${project.descriptionWidth ?? ""}`}>
          <h3
            className={`font-normal text-gray-900 leading-snug tracking-tight ${
              project.titleSize === "large"
                ? "text-[28px] lg:text-[32px]"
                : "text-[24px] lg:text-[27px]"
            }`}
            style={{ fontFamily: "'Inter', Helvetica, sans-serif" }}
          >
            {project.title}
          </h3>
          <p
            className="mt-2.5 text-sm font-normal leading-[1.6] text-gray-500"
            style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
          >
            {project.description}
          </p>
        </div>
        <p
          className={`shrink-0 text-[10px] font-normal leading-relaxed tracking-wide text-gray-400 uppercase ${
            project.metadataWidth ?? ""
          } ${project.metadataAlign === "right" ? "text-left lg:text-right" : ""}`}
          style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif", letterSpacing: "0.06em" }}
        >
          {project.metadata}
        </p>
      </div>
    </article>
  );
}

export function Refined() {
  return (
    <div className="min-h-screen w-full bg-white" style={{ fontFamily: "'Inter', Helvetica, sans-serif" }}>
      {/* ── Header ── */}
      <header
        className="flex w-full items-center justify-between px-6 py-4 md:px-20 md:py-7"
        style={{ borderBottom: "1px solid #f0f0f0" }}
      >
        <img
          className="h-[46px] w-auto shrink-0 object-contain"
          alt="Kristen Bend"
          src="/__mockup/images/group-1.png"
        />
        <nav aria-label="Primary navigation">
          <ul className="flex items-baseline gap-8 md:gap-10">
            {["HOME", "WORK", "CONTACT"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="text-[11px] font-medium tracking-widest text-black transition-opacity duration-150 hover:opacity-40"
                  style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif", textDecoration: "none" }}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="grid w-full grid-cols-1 md:grid-cols-2">
        <figure className="m-0 min-h-[400px] md:min-h-[720px]">
          <img
            className="h-full w-full object-cover"
            alt="Hero"
            src="/__mockup/images/hero.svg"
          />
        </figure>
        <div
          className="flex min-h-[400px] md:min-h-[720px] px-8 py-12 sm:px-12 sm:py-16 md:px-20 md:py-24"
          style={{ backgroundColor: BLUE }}
        >
          <div className="flex max-w-[560px] flex-col items-start gap-5 self-end md:self-center">
            {/* Eyebrow */}
            <p
              className="text-[10px] font-normal tracking-[0.18em] text-white/60 uppercase"
              style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
            >
              Experience Design &amp; Creative Direction
            </p>

            {/* Thin rule */}
            <div className="w-8 border-t border-white/30" />

            {/* Headline */}
            <h1
              className="text-[38px] font-normal leading-[1.02] text-white sm:text-[46px] md:text-[52px]"
              style={{ letterSpacing: "-0.02em" }}
            >
              Designing experiences
              <br />
              that invite new&nbsp;perspectives.
            </h1>

            {/* Body */}
            <p
              className="max-w-[500px] text-base font-normal leading-[1.7] text-white/75 sm:text-lg"
              style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
            >
              I'm endlessly curious about how people learn, connect, and make
              meaning. I help organizations turn complex ideas into experiences
              that invite curiosity, shift perspectives, and stay with people long
              after they leave.
            </p>
          </div>
        </div>
      </section>

      {/* ── Selected Works ── */}
      <section className="w-full bg-white px-6 py-16 sm:px-10 sm:py-24 lg:px-20 lg:py-32">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16 lg:gap-24">
          {/* Section header */}
          <header>
            <div className="flex items-baseline justify-between gap-6 pb-8" style={{ borderBottom: "1px solid #e8e8e8" }}>
              <h2
                className="text-4xl font-normal leading-none text-gray-900 lg:text-5xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Selected Works
              </h2>
              <p
                className="shrink-0 text-[10px] font-normal tracking-widest text-gray-400 uppercase"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                01 / 07
              </p>
            </div>

            <p
              className="mt-10 text-xl font-normal leading-[1.45] text-gray-800 lg:text-2xl"
              style={{ letterSpacing: "-0.01em" }}
            >
              The projects I love most begin with a question:
              <br />
              <em className="text-gray-500 not-italic" style={{ fontStyle: "italic" }}>How can we help people see this differently?</em>
            </p>
          </header>

          {/* Project grid */}
          <a
            href="/__mockup/preview/portfolio-refined/BuildingBridges"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <ProjectCard project={featuredProject} />
          </a>

          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,760fr)_minmax(0,480fr)]">
            {firstProjectPair.map((project, index) => (
              <ProjectCard
                key={project.title}
                project={project}
                className={index === 1 ? "lg:pt-[100px]" : ""}
              />
            ))}
          </div>

          <ProjectCard project={expoProject} className="pt-6" />

          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,480fr)_minmax(0,760fr)]">
            {secondProjectPair.map((project, index) => (
              <ProjectCard
                key={project.title}
                project={project}
                className={index === 0 ? "lg:pt-[100px]" : ""}
              />
            ))}
          </div>

          <ProjectCard project={finalProject} className="pt-6" />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="flex w-full flex-col gap-10 px-6 pb-10 pt-20 sm:px-10 lg:px-20"
        style={{ backgroundColor: BLUE }}
      >
        {/* Divider */}
        <div className="w-full border-t border-white/15" />

        {/* Main row */}
        <div className="flex w-full items-start justify-between gap-8">
          <div className="flex max-w-[360px] flex-col gap-3">
            <h2
              className="text-[28px] font-normal leading-none text-white"
              style={{ letterSpacing: "-0.01em" }}
            >
              Kristen Bend
            </h2>
            <p
              className="text-sm font-normal leading-[1.65] text-white/55"
              style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
            >
              Currently designing experiences
              <br />
              that help people see possibility.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3">
            <p
              className="text-[10px] font-normal tracking-[0.18em] text-white/40 uppercase"
              style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
            >
              Inquiries
            </p>
            {["kris10bend@gmail.com", "+1 (203) 948 5626"].map((detail) => (
              <p
                key={detail}
                className="text-sm font-normal leading-none text-white/80 transition-opacity hover:text-white"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                {detail}
              </p>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="flex w-full items-center justify-center pt-2">
          <p
            className="text-[11px] font-normal leading-none text-white/25"
            style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
          >
            © 2026 Kristen Bend
          </p>
        </div>
      </footer>
    </div>
  );
}
