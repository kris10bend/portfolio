import { HeaderNavigationSection } from "./sections/HeaderNavigationSection";
import { HeroIntroductionSection } from "./sections/HeroIntroductionSection";
import { PortfolioFooterSection } from "./sections/PortfolioFooterSection";
import { SelectedProjectsSection } from "./sections/SelectedProjectsSection";

export const Home = (): JSX.Element => {
  return (
    <main className="flex min-h-screen w-full flex-col bg-white">
      <HeaderNavigationSection />
      <HeroIntroductionSection />
      <SelectedProjectsSection />
      <PortfolioFooterSection />
    </main>
  );
};
