import { useEffect, useState } from "react";

const slides = [
  { image: "/figmaAssets/home-hero-1.png", background: "#E2CFEA" },
  { image: "/figmaAssets/home-hero-2.png", background: "#FFB41F" },
  { image: "/figmaAssets/home-hero-3.png", background: "#F24333" },
  { image: "/figmaAssets/home-hero-4.png", background: "#5E0035" },
  { image: "/figmaAssets/home-hero-5.png", background: "#71D4F8" },
  { image: "/figmaAssets/home-hero-6.png", background: "#E2CFEA" },
  { image: "/figmaAssets/home-hero-7.png", background: "#FFB41F" },
  { image: "/figmaAssets/home-hero-8.png", background: "#F24333" },
  { image: "/figmaAssets/home-hero-9.png", background: "#5E0035" },
  { image: "/figmaAssets/home-hero-10.png", background: "#71D4F8" },
];

const INTERVAL_MS = 4000;
const TRANSITION_MS = 800;

export const HeroIntroductionSection = (): JSX.Element => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      aria-labelledby="hero-introduction-title"
      className="grid w-full grid-cols-1 overflow-hidden md:grid-cols-2"
      style={{ minHeight: "clamp(700px, 85vh, 980px)" }}
    >
      {/* Left panel: per-slide background color with centered arch image */}
      <figure
        className="relative m-0 min-h-[400px] md:min-h-0"
        style={{
          backgroundColor: slides[current].background,
          transition: `background-color ${TRANSITION_MS}ms ease-in-out`,
        }}
      >
        {slides.map(({ image }, i) => (
          <img
            key={image}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              maxWidth: "80%",
              maxHeight: "80%",
              objectFit: "contain",
              opacity: i === current ? 1 : 0,
              transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
            }}
            alt={i === 0 ? "Hero" : ""}
            src={image}
            aria-hidden={i !== current}
          />
        ))}
      </figure>

      {/* Right panel: visually unchanged */}
      <div className="flex items-center justify-center min-h-[400px] bg-[#002fa7] px-8 py-12 text-white sm:px-12 sm:py-16 md:min-h-0 md:px-20 md:py-24">
        <div className="flex max-w-[580px] flex-col items-start gap-4">
          <p className="[font-family:'Inter',Helvetica] text-xs font-normal leading-normal text-[#ffb41f]">
            EXPERIENCE DESIGN &amp; CREATIVE DIRECTION
          </p>
          <h1
            id="hero-introduction-title"
            className="[font-family:'Inter',Helvetica] font-normal text-[32px] leading-tight sm:text-[48px] sm:leading-normal md:text-[50px] md:leading-[52px] lg:text-[50px] lg:leading-[1.0]"
          >
            Turning ideas into experiences people <em>actually</em> remember.
          </h1>
          <p className="[font-family:'Inter',Helvetica] max-w-[580px] text-base font-normal leading-[18px] text-[#ffffffcc] sm:text-lg sm:leading-[25px]">
            <strong>Kristen Bend</strong> is a Creative Director and Experience Designer specializing in immersive experiences, exhibitions, brand storytelling, and strategic design.
            <br />
            <br />
            I&apos;m endlessly curious about how people learn, connect, and make meaning. I partner with organizations to transform complex ideas into experiences that spark curiosity, invite participation, and stay with people long after they leave.
          </p>
        </div>
      </div>
    </section>
  );
};
