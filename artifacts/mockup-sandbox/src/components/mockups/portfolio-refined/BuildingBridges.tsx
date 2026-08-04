const BLUE = "#002fa7";
const INTER = "'Inter', Helvetica, sans-serif";
const GEIST = "'Geist', 'Inter', Helvetica, sans-serif";

const HERO_IMG = "/__mockup/images/01112024-uae-china-ybc-day1-03016-3.png";
const LOGO_IMG = "/__mockup/images/group-1.png";

function BackArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path
        d="M10 3L5 8L10 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-medium tracking-[0.18em] uppercase text-gray-400 mb-5"
      style={{ fontFamily: GEIST }}
    >
      {children}
    </p>
  );
}

function BodyHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[22px] font-normal leading-snug text-gray-900 mb-4"
      style={{ fontFamily: INTER, letterSpacing: "-0.01em" }}
    >
      {children}
    </h3>
  );
}

function BodyPara({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-base font-normal leading-[1.75] text-gray-600"
      style={{ fontFamily: GEIST }}
    >
      {children}
    </p>
  );
}

export function BuildingBridges() {
  const backHref = "/__mockup/preview/portfolio-refined/Refined";

  return (
    <div
      className="min-h-screen w-full bg-white"
      style={{ fontFamily: INTER }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 flex w-full items-center justify-between bg-white px-6 py-4 md:px-20 md:py-5"
        style={{ borderBottom: "1px solid #f0f0f0" }}
      >
        <img
          className="h-[40px] w-auto shrink-0 object-contain"
          alt="Kristen Bend"
          src={LOGO_IMG}
        />
        <a
          href={backHref}
          className="flex items-center gap-1.5 text-[11px] font-medium tracking-widest text-black uppercase transition-opacity duration-150 hover:opacity-40"
          style={{ fontFamily: GEIST, textDecoration: "none" }}
        >
          <BackArrow />
          Selected Works
        </a>
      </header>

      {/* ── Hero image ── */}
      <figure className="m-0 w-full overflow-hidden" style={{ height: "clamp(380px, 58vw, 720px)" }}>
        <img
          className="h-full w-full object-cover object-center"
          alt="Building Bridges for the Future — exhibition panels on Abu Dhabi waterfront"
          src={HERO_IMG}
        />
      </figure>

      {/* ── Project overview ── */}
      <section className="w-full px-6 py-16 sm:px-10 lg:px-20">
        <div className="mx-auto w-full max-w-[900px]">
          {/* Eyebrow / metadata strip */}
          <div
            className="mb-10 flex flex-wrap items-baseline justify-between gap-4 pb-8"
            style={{ borderBottom: "1px solid #e8e8e8" }}
          >
            <p
              className="text-[10px] font-medium tracking-[0.18em] uppercase text-gray-400"
              style={{ fontFamily: GEIST }}
            >
              Creative Direction · Experience Design · Exhibition Design
            </p>
            <p
              className="text-[10px] font-medium tracking-[0.18em] uppercase text-gray-400"
              style={{ fontFamily: GEIST }}
            >
              2024
            </p>
          </div>

          {/* Project title */}
          <h1
            className="mb-8 text-[38px] font-normal leading-[1.06] text-gray-900 sm:text-[46px] md:text-[54px]"
            style={{ letterSpacing: "-0.025em" }}
          >
            Building Bridges
            <br />
            for the Future
          </h1>

          {/* Intro paragraph */}
          <p
            className="max-w-[680px] text-lg font-normal leading-[1.7] text-gray-600 sm:text-xl"
            style={{ fontFamily: GEIST }}
          >
            To celebrate forty years of partnership between the UAE and China, our
            team was invited into the project during its final stages to help bring
            clarity to an ambitious public exhibition already in development.
          </p>
          <p
            className="max-w-[680px] text-lg font-normal leading-[1.7] text-gray-600 sm:text-xl"
            style={{ fontFamily: GEIST }}
          >
            As Creative Director, I helped establish a cohesive narrative and
            visitor experience that connected history, culture, and participation
            into a single journey. We aligned multiple creative partners around a
            shared narrative that transformed diplomatic history into something
            visitors could experience, reflect on, and contribute to. Through
            immersive storytelling, contemporary cultural perspectives, and
            participatory installations, the exhibition invited thousands of
            visitors to discover the values connecting two nations—and add their
            own hopes for what the next chapter could become.
          </p>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-[900px] px-6 sm:px-10 lg:px-20">
        <div style={{ borderTop: "1px solid #e8e8e8" }} />
      </div>

      {/* ── Body sections ── */}
      <section className="w-full px-6 py-16 sm:px-10 lg:px-20">
        <div className="mx-auto w-full max-w-[900px] flex flex-col gap-20">

          {/* Context */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
            <div className="pt-1">
              <SectionLabel>Context</SectionLabel>
            </div>
            <div>
              <BodyHeading>Forty years of partnership, told in three languages</BodyHeading>
              <BodyPara>
                In 2024, the UAE and China marked four decades of diplomatic relations — a relationship
                built on trade, cultural exchange, and shared ambition. The client wanted an exhibition
                that would honor this milestone not through a catalogue of statistics, but through the
                texture of real connection: the people, places, and moments that made two very different
                nations feel genuinely close.
              </BodyPara>
              <p
                className="mt-5 text-base font-normal leading-[1.75] text-gray-600"
                style={{ fontFamily: GEIST }}
              >
                The brief asked for something simultaneously celebratory and sincere — public-facing
                enough to draw in curious visitors, yet substantial enough to satisfy a diplomatic
                audience. It would need to speak fluently in Arabic, Chinese, and English, and hold its
                own on the Abu Dhabi waterfront in open air.
              </p>
            </div>
          </div>

          {/* Full-bleed image break */}
          <div className="w-full overflow-hidden" style={{ borderRadius: "2px" }}>
            <img
              className="h-auto w-full object-cover"
              style={{ maxHeight: "520px", objectPosition: "center 30%" }}
              alt="Exhibition panels on the Abu Dhabi waterfront"
              src={HERO_IMG}
            />
          </div>

          {/* Approach */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
            <div className="pt-1">
              <SectionLabel>Approach</SectionLabel>
            </div>
            <div>
              <BodyHeading>Stories first, structure second</BodyHeading>
              <BodyPara>
                We began with research: interviews with Emirati and Chinese nationals who had lived,
                worked, or studied in each other's countries. Their accounts became the connective
                tissue of the exhibition — not background material, but the thing you encountered first.
                Each panel was built around a moment of genuine exchange rather than an institutional
                talking point.
              </BodyPara>
              <p
                className="mt-5 text-base font-normal leading-[1.75] text-gray-600"
                style={{ fontFamily: GEIST }}
              >
                Spatially, we designed a series of tall freestanding panels in organic, scroll-like forms
                — a visual language that referenced both Arabic and Chinese calligraphic traditions without
                literalizing either. Visitors moved through the installation at their own pace, discovering
                the timeline of the relationship as they circled each structure. The open waterfront setting
                meant the sky, sea, and city were always part of the composition.
              </p>
            </div>
          </div>

          {/* Outcomes */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
            <div className="pt-1">
              <SectionLabel>Outcomes</SectionLabel>
            </div>
            <div>
              <BodyHeading>An exhibition that invited people to stay</BodyHeading>
              <BodyPara>
                The installation ran for three weeks on the Abu Dhabi Corniche, drawing visitors from
                both the general public and diplomatic delegations. Feedback from the client noted that
                the work had successfully avoided the ceremonial coldness that often marks official
                commemorations — people stopped, read, and talked with each other in front of the panels.
              </BodyPara>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[
                  { stat: "40", label: "Years of UAE–China diplomatic relations commemorated" },
                  { stat: "3", label: "Languages — Arabic, Chinese, English — woven throughout" },
                  { stat: "3 wks", label: "Public installation on the Abu Dhabi waterfront" },
                ].map(({ stat, label }) => (
                  <div
                    key={stat}
                    className="flex flex-col gap-2 py-6"
                    style={{ borderTop: `2px solid ${BLUE}` }}
                  >
                    <p
                      className="text-[36px] font-normal leading-none text-gray-900"
                      style={{ letterSpacing: "-0.03em" }}
                    >
                      {stat}
                    </p>
                    <p
                      className="text-sm font-normal leading-[1.55] text-gray-500"
                      style={{ fontFamily: GEIST }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deliverables */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
            <div className="pt-1">
              <SectionLabel>Deliverables</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                "Exhibition concept & narrative",
                "Spatial design",
                "Graphic design system",
                "Trilingual editorial",
                "Production oversight",
                "Visitor experience strategy",
              ].map((item) => (
                <span
                  key={item}
                  className="inline-block rounded-full border border-gray-200 px-4 py-2 text-[12px] font-normal text-gray-600"
                  style={{ fontFamily: GEIST, letterSpacing: "0.01em" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Next project nudge ── */}
      <section
        className="w-full px-6 py-16 sm:px-10 lg:px-20"
        style={{ borderTop: "1px solid #e8e8e8" }}
      >
        <div className="mx-auto w-full max-w-[900px] flex items-center justify-between gap-6">
          <p
            className="text-[10px] font-medium tracking-[0.18em] uppercase text-gray-400"
            style={{ fontFamily: GEIST }}
          >
            Selected Works
          </p>
          <a
            href={backHref}
            className="group flex items-center gap-2 text-[13px] font-normal text-gray-900 transition-opacity hover:opacity-50"
            style={{ fontFamily: GEIST, textDecoration: "none" }}
          >
            View all projects
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="flex w-full flex-col gap-10 px-6 pb-10 pt-20 sm:px-10 lg:px-20"
        style={{ backgroundColor: BLUE }}
      >
        <div className="w-full border-t border-white/15" />

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
              style={{ fontFamily: GEIST }}
            >
              Currently designing experiences
              <br />
              that help people see possibility.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3">
            <p
              className="text-[10px] font-normal tracking-[0.18em] text-white/40 uppercase"
              style={{ fontFamily: GEIST }}
            >
              Inquiries
            </p>
            {["kris10bend@gmail.com", "+1 (203) 948 5626"].map((detail) => (
              <p
                key={detail}
                className="text-sm font-normal leading-none text-white/80 transition-opacity hover:text-white"
                style={{ fontFamily: GEIST }}
              >
                {detail}
              </p>
            ))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center pt-2">
          <p
            className="text-[11px] font-normal leading-none text-white/25"
            style={{ fontFamily: GEIST }}
          >
            © 2026 Kristen Bend
          </p>
        </div>
      </footer>
    </div>
  );
}
