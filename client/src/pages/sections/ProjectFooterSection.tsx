import { Link } from "wouter";
import { ContainerLayout } from "@/components/ContainerLayout";

const BLUE = "#002fa7";

/**
 * Project-page footer.
 *
 * Extends the homepage `PortfolioFooterSection` with:
 * - A Social column (LinkedIn + Instagram)
 * - A "Selected Works" back-link in the bottom bar
 *
 * This is kept as a separate component to avoid altering the homepage footer.
 */
export const ProjectFooterSection = (): JSX.Element => {
  return (
    <footer
      className="w-full px-6 pb-10 pt-20 sm:px-10 lg:px-20"
      style={{ backgroundColor: BLUE }}
    >
      <ContainerLayout className="flex flex-col gap-10">
      {/* Divider */}
      <div className="w-full border-t border-white/15" />

      {/* Main row */}
      <div className="flex w-full items-start justify-between gap-8">
        {/* Left: name + tagline */}
        <section className="flex max-w-[380px] flex-col gap-4">
          <h2
            className="font-normal leading-none text-white"
            style={{
              fontFamily: "'Inter', Helvetica, sans-serif",
              fontSize: "clamp(24px, 3vw, 32px)",
              letterSpacing: "-0.01em",
            }}
          >
            Kristen Bend
          </h2>
          <p
            className="text-sm font-normal leading-[1.6] text-white/55"
            style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
          >
            Currently designing experiences
            <br />
            that help people see possibility.
          </p>
        </section>

        {/* Right: contact + social */}
        <div className="flex shrink-0 flex-col items-start gap-10 sm:flex-row sm:gap-20">
          {/* Inquiries */}
          <section className="flex flex-col gap-4" aria-labelledby="project-footer-inquiries">
            <h3
              id="project-footer-inquiries"
              className="text-[11px] font-normal uppercase leading-none text-white/40"
              style={{
                fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                letterSpacing: "0.12em",
              }}
            >
              Inquiries
            </h3>
            {["kris10bend@gmail.com", "+1 (203) 948 5626"].map((detail) => (
              <p
                key={detail}
                className="text-sm font-normal leading-none text-white/80"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                {detail}
              </p>
            ))}
          </section>

          {/* Social */}
          <section className="flex flex-col gap-4" aria-labelledby="project-footer-social">
            <h3
              id="project-footer-social"
              className="text-[11px] font-normal uppercase leading-none text-white/40"
              style={{
                fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                letterSpacing: "0.12em",
              }}
            >
              Social
            </h3>
            {["LinkedIn"].map((link) => (
              <p
                key={link}
                className="text-sm font-normal leading-none text-white/80 transition-opacity hover:text-white"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                {link}
              </p>
            ))}
          </section>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex w-full items-center justify-between pt-2">
        <p
          className="text-[11px] font-normal leading-none text-white/25"
          style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
        >
          © 2026 Kristen Bend. Built in shadows.
        </p>
        <Link
          href="/"
          className="text-[11px] font-normal leading-none text-white/50 transition-opacity hover:text-white/80"
          style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
        >
          Selected Works
        </Link>
      </div>
      </ContainerLayout>
    </footer>
  );
};
