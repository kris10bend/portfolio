import { HeaderNavigationSection } from "./sections/HeaderNavigationSection";
import { ProjectFooterSection } from "./sections/ProjectFooterSection";

const BLUE = "#002fa7";

/**
 * Contact page — /contact
 *
 * Two-column layout on blue background:
 *   Left  — intro copy, direct email, LinkedIn link
 *   Right — frontend-only contact form (white card)
 *
 * Followed by a full-width image section and the shared project footer.
 */
export const ContactPage = (): JSX.Element => {
  return (
    <main className="flex min-h-screen w-full flex-col bg-white">
      {/* ── Global navigation ── */}
      <HeaderNavigationSection />

      {/* ── Two-column content section ── */}
      <section
        className="flex w-full flex-1 flex-col px-6 py-16 sm:px-10 md:py-24 lg:px-20"
        style={{ backgroundColor: BLUE }}
        aria-label="Contact"
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 md:flex-row md:items-start md:gap-16 lg:gap-24">

          {/* ── Left column ── */}
          <div className="flex flex-1 flex-col gap-10">
            {/* Eyebrow */}
            <p
              className="text-[11px] font-normal uppercase leading-none text-white/60"
              style={{
                fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                letterSpacing: "0.12em",
              }}
            >
              Let's Connect
            </p>

            {/* Headline */}
            <h1
              className="font-normal text-white"
              style={{
                fontFamily: "'Inter', Helvetica, sans-serif",
                fontSize: "clamp(40px, 5vw, 64px)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                maxWidth: "480px",
              }}
            >
              Let's build what's next.
            </h1>

            {/* Body copy */}
            <p
              className="text-base font-normal leading-[1.65] text-white/70"
              style={{
                fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                maxWidth: "420px",
              }}
            >
              Whether you're hiring, looking for a creative partner, or simply
              want to continue the conversation, I'd love to hear from you.
            </p>

            {/* Direct inquiries */}
            <div className="flex flex-col gap-3">
              <p
                className="text-[11px] font-normal uppercase leading-none text-white/40"
                style={{
                  fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                  letterSpacing: "0.12em",
                }}
              >
                Direct Inquiries
              </p>
              <a
                href="mailto:kris10bend@gmail.com"
                className="text-base font-normal leading-none text-white transition-opacity hover:opacity-70"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                kris10bend@gmail.com
              </a>
            </div>

            {/* Elsewhere / LinkedIn */}
            <div className="flex flex-col gap-3">
              <p
                className="text-[11px] font-normal uppercase leading-none text-white/40"
                style={{
                  fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                  letterSpacing: "0.12em",
                }}
              >
                Elsewhere
              </p>
              <a
                href="https://www.linkedin.com/in/kristenbend"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-normal leading-none text-white transition-opacity hover:opacity-70"
                style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
              >
                LinkedIn
              </a>
            </div>
          </div>

          {/* ── Right column — contact form card ── */}
          <div
            className="w-full flex-shrink-0 md:w-[420px] lg:w-[480px]"
          >
            <div className="flex flex-col gap-6 rounded-sm bg-white p-8">
              {/* Card heading */}
              <h2
                className="font-normal leading-none text-black"
                style={{
                  fontFamily: "'Inter', Helvetica, sans-serif",
                  fontSize: "clamp(18px, 2vw, 22px)",
                  letterSpacing: "-0.01em",
                }}
              >
                Start a conversation
              </h2>

              <form
                className="flex flex-col gap-5"
                onSubmit={(e) => e.preventDefault()}
                noValidate
              >
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-name"
                    className="text-[11px] font-normal uppercase leading-none text-black/50"
                    style={{
                      fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    placeholder="e.g. Kristen Bend"
                    autoComplete="name"
                    className="w-full border border-black/15 bg-white px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-[#002fa7]"
                    style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-email"
                    className="text-[11px] font-normal uppercase leading-none text-black/50"
                    style={{
                      fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="e.g. kris10bend@gmail.com"
                    autoComplete="email"
                    className="w-full border border-black/15 bg-white px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-[#002fa7]"
                    style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-message"
                    className="text-[11px] font-normal uppercase leading-none text-black/50"
                    style={{
                      fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                      letterSpacing: "0.1em",
                    }}
                  >
                    How Can I Help?
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="Tell me a little about why you're reaching out. Whether it's a role, collaboration, speaking opportunity or simply saying hello, I'd love to hear from you."
                    className="w-full resize-none border border-black/15 bg-white px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-[#002fa7]"
                    style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 text-[13px] font-medium uppercase leading-none tracking-[0.1em] text-white transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: BLUE,
                    fontFamily: "'Geist', 'Inter', Helvetica, sans-serif",
                  }}
                >
                  Send
                </button>

                {/* Footer copy */}
                <p
                  className="text-center text-[12px] font-normal leading-[1.5] text-black/40"
                  style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
                >
                  I typically respond within a few days. Looking forward to
                  connecting.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Full-width image section ── */}
      <section className="w-full" aria-label="Photo">
        <img
          src="/figmaAssets/img-4838-1.png"
          alt=""
          role="presentation"
          className="w-full object-cover"
          style={{ aspectRatio: "16 / 7", objectPosition: "center 30%" }}
        />
      </section>

      {/* ── Footer ── */}
      <ProjectFooterSection />
    </main>
  );
};
