import { Button } from "@/components/ui/button";

const navigationItems = ["HOME", "WORK", "CONTACT"];

export const HeaderNavigationSection = (): JSX.Element => {
  return (
    <header className="flex w-full items-center justify-between self-stretch px-6 py-3 md:px-20 md:py-8">
      <img
        className="h-[53px] w-[131.18px] shrink-0 object-contain"
        alt="Group"
        src="/figmaAssets/group-1.png"
      />
      <nav aria-label="Primary navigation">
        <ul className="flex items-baseline gap-5 md:gap-10">
          {navigationItems.map((item) => (
            <li key={item}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-w-0 p-0 [font-family:'Geist',Helvetica] text-[13px] font-medium leading-[normal] text-black hover:bg-transparent hover:text-black"
              >
                {item}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};
