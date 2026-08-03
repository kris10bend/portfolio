import { Link } from "wouter";

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const navigationItems: NavItem[] = [
  { label: "HOME", href: "/" },
  { label: "WORK", href: "/#work" },
  { label: "CONTACT", href: "mailto:kris10bend@gmail.com", external: true },
];

const navLinkClass =
  "[font-family:'Geist',Helvetica] text-[13px] font-medium leading-[normal] text-black hover:opacity-60 transition-opacity";

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
          {navigationItems.map((item) =>
            item.external ? (
              <li key={item.label}>
                <a href={item.href} className={navLinkClass}>
                  {item.label}
                </a>
              </li>
            ) : (
              <li key={item.label}>
                <Link href={item.href} className={navLinkClass}>
                  {item.label}
                </Link>
              </li>
            )
          )}
        </ul>
      </nav>
    </header>
  );
};
