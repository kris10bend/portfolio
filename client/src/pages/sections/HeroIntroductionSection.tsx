export const HeroIntroductionSection = (): JSX.Element => {
  return (
    <section
      aria-labelledby="hero-introduction-title"
      className="grid w-full grid-cols-1 overflow-hidden md:grid-cols-2"
    >
      <figure className="m-0 min-h-[400px] md:min-h-[800px]">
        <img
          className="h-full w-full object-cover"
          alt="Hero"
          src="/figmaAssets/hero.svg"
        />
      </figure>
      <div className="flex min-h-[400px] bg-[#002fa7] px-8 py-12 text-white sm:px-12 sm:py-16 md:min-h-[800px] md:px-20 md:py-24">
        <div className="flex max-w-[580px] flex-col items-start gap-4">
          <p className="[font-family:'Inter',Helvetica] text-xs font-normal leading-normal">
            EXPERIENCE DESIGN &amp; CREATIVE DIRECTION
          </p>
          <h1
            id="hero-introduction-title"
            className="[font-family:'Inter',Helvetica] text-[42px] font-normal leading-[0.95] sm:text-[48px] md:text-[55px] md:leading-[52.2px]"
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
