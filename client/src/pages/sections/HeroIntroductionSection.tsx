import { useEffect, useState } from "react";

const slides = [
  "/figmaAssets/hero-tall-0.png",
  "/figmaAssets/hero-tall-1.png",
  "/figmaAssets/hero-tall-2.png",
  "/figmaAssets/hero-tall-3.png",
  "/figmaAssets/hero-tall-4.png",
  "/figmaAssets/hero-tall-5.png",
  "/figmaAssets/hero-tall-6.png",
  "/figmaAssets/hero-tall-7.png",
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
      className="grid w-full grid-cols-1 overflow-hidden md:grid-cols-2 md:h-[calc(100vh-85px)]"
    >
      <figure className="relative m-0 min-h-[400px] overflow-hidden md:min-h-0 md:h-full">
        {slides.map((src, i) => (
          <img
            key={src}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: i === current ? 1 : 0,
              transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
            }}
            alt={i === 0 ? "Hero" : ""}
            src={src}
            aria-hidden={i !== current}
          />
        ))}
      </figure>
      <div className="flex items-center justify-center min-h-[400px] bg-[#002fa7] px-8 py-12 text-white sm:px-12 sm:py-16 md:min-h-0 md:h-full md:px-20 md:py-24">
        <div className="flex max-w-[580px] flex-col items-start gap-4">
          <p className="[font-family:'Inter',Helvetica] text-xs font-normal leading-normal">
            EXPERIENCE DESIGN &amp; CREATIVE DIRECTION
          </p>
          <h1
            id="hero-introduction-title"
            className="[font-family:'Inter',Helvetica] font-normal sm:text-[48px] md:text-[55px] md:leading-[52.2px] text-[75px]"
          >
            Designing experiences
            <br />
            that invite new perspectives.
          </h1>
          <p className="[font-family:'Inter',Helvetica] max-w-[580px] text-base font-normal leading-[25.6px] text-[#ffffffcc] sm:text-lg sm:leading-[28.8px]">
            I&apos;m endlessly curious about how people learn, connect, and make
            meaning. I help organizations turn complex ideas into experiences
            that invite curiosity, shift perspectives, and stay with people long
            after they leave.
          </p>
        </div>
      </div>
    </section>
  );
};
