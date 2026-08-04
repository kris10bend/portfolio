import { ContainerLayout } from "@/components/ContainerLayout";

export const PortfolioFooterSection = (): JSX.Element => {
  return (
    <footer className="w-full bg-[#002fa7] px-5 pb-12 pt-24 sm:px-10 lg:px-20">
      <ContainerLayout className="flex flex-col gap-12">
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
        </div>
        <div className="flex w-full items-center justify-center pt-4">
          <p className="[font-family:'Geist',Helvetica] text-xs font-normal leading-none tracking-[0] text-[#ffffffcc]">
            © 2026 Kristen Bend.
          </p>
        </div>
      </ContainerLayout>
    </footer>
  );
};
