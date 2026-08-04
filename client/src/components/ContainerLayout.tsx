import React from "react";

interface ContainerLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared responsive content container.
 * Keeps content centered and within a comfortable reading width at all viewport sizes.
 * Use inside sections that provide their own full-bleed background and padding.
 */
export const ContainerLayout = ({
  children,
  className = "",
}: ContainerLayoutProps): JSX.Element => (
  <div className={`mx-auto w-full max-w-[1400px] ${className}`.trim()}>
    {children}
  </div>
);
