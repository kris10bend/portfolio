const inquiryDetails = ["kris10bend@gmail.com", "+1 (203) 948 5626"];

export const PortfolioFooterSection = (): JSX.Element => {
  return (
    <footer className="flex w-full flex-col gap-12 bg-[#002fa7] px-5 pb-12 pt-24 sm:px-10 lg:px-20">
      <img
        className="h-px w-full object-cover"
        alt="Line"
        src="/figmaAssets/line.svg"
      />
      <div className="flex w-full items-start justify-between gap-8">
        <section className="flex max-w-[380px] flex-col gap-4">
          <h2 className="[font-family:'Inter',Helvetica] text-[32px] font-normal leading-none tracking-[0] text-white">
            Kristen Bend
          </h2>
          <p className="[font-family:'Geist',Helvetica] text-sm font-normal leading-[22.4px] tracking-[0] text-[#ffffffcc]">
            Currently designing experiences <br />
            that help people see possibility.
          </p>
        </section>
        <section
          className="flex shrink-0 flex-col items-start gap-4"
          aria-labelledby="inquiries-heading"
        >
          <h3
            id="inquiries-heading"
            className="[font-family:'Geist',Helvetica] text-[11px] font-normal leading-none text-white"
          >
            INQUIRIES
          </h3>
          {inquiryDetails.map((detail) => (
            <p
              key={detail}
              className="[font-family:'Geist',Helvetica] text-sm font-normal leading-none tracking-[0] text-white"
            >
              {detail}
            </p>
          ))}
        </section>
      </div>
      <div className="flex w-full items-center justify-center pt-4">
        <p className="[font-family:'Geist',Helvetica] text-xs font-normal leading-none tracking-[0] text-[#ffffffcc]">
          © 2026 Kristen Bend.
        </p>
      </div>
    </footer>
  );
};
