import { Link } from "wouter";

type NavItem = {
  label: string;
  href: string;
  /**
   * When true, render as a wouter <Link> for SPA navigation (no full reload).
   * When false (default), render as a plain <a> so the browser handles hash
   * scrolling and external hrefs correctly.
   */
  useRouter?: boolean;
};

const navigationItems: NavItem[] = [
  // HOME: SPA navigation — wouter handles this without a page reload
  { label: "HOME", href: "/", useRouter: true },
  // WORK: hash anchor — must be a plain <a> so the browser scrolls to #work
  // correctly whether navigating from / (same-page scroll) or from any other
  // route (full navigation then scroll).
  { label: "WORK", href: "/#work" },
  // CONTACT: mailto — plain <a>, no router involvement
  { label: "CONTACT", href: "mailto:kris10bend@gmail.com" },
];

const navLinkClass =
  "no-underline [font-family:'Geist',Helvetica] text-[13px] font-medium leading-[normal] text-black hover:opacity-60 transition-opacity";

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
            item.useRouter ? (
              <li key={item.label}>
                <Link href={item.href} className={navLinkClass}>
                  {item.label}
                </Link>
              </li>
            ) : (
              <li key={item.label}>
                <a href={item.href} className={navLinkClass}>
                  {item.label}
                </a>
              </li>
            )
          )}
        </ul>
      </nav>
    </header>
  );
};
