import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectCard {
  slug: string;
  title: string;
  /** Short description / excerpt shown under the project title */
  excerpt: string;
  heroImageSrc: string;
  heroImageAlt: string;
  cardOverlay: 'in_progress' | 'confidential' | null;
  isPasswordProtected?: boolean;
  /** Optional featured image (falls back to heroImageSrc when absent) */
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  /** Wide-crop anchor (used for large card slots) */
  featuredImageObjectPosition?: string;
  featuredImageZoom?: number;
  /** Square-crop anchor (used for small card slots) */
  featuredSquareCropX?: number | null;
  featuredSquareCropY?: number | null;
  featuredSquareCropZoom?: number | null;
}

type ImageHeight = "large" | "small";
type TitleSize = "large" | "small";

/**
 * Returns image-height and title-size for a project at a given 0-based index
 * in the homepage grid.
 *
 * Layout slots:
 *   0         → featured (full width, large)
 *   1         → first pair left  column (760fr → large)
 *   2         → first pair right column (480fr → small)
 *   3         → solo card (large)
 *   4         → second pair left  column (480fr → small)
 *   5         → second pair right column (760fr → large)
 *   6+        → final/extra solo cards (large)
 */
function slotSizes(index: number): { imageHeight: ImageHeight; titleSize: TitleSize } {
  const small: { imageHeight: ImageHeight; titleSize: TitleSize } = {
    imageHeight: "small",
    titleSize: "small",
  };
  const large: { imageHeight: ImageHeight; titleSize: TitleSize } = {
    imageHeight: "large",
    titleSize: "large",
  };
  if (index === 2) return small; // first pair right column (480fr)
  if (index === 4) return small; // second pair left column (480fr)
  return large;
}

// ─── Password form for confidential cards ─────────────────────────────────────

/**
 * variant="overlay"  — white text/inputs on blue background (inside the image overlay)
 * variant="inline"   — dark text/inputs on light background (below the card title)
 * isVisible          — when true, auto-focuses the input (used for touch-toggle)
 */
function CardPasswordForm({ slug, variant = "overlay", isVisible = false }: { slug: string; variant?: "overlay" | "inline"; isVisible?: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when the overlay becomes visible on touch devices.
  useEffect(() => {
    if (isVisible && variant === "overlay") {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isVisible, variant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        navigate(`/work/${slug}`);
      } else {
        setError("Incorrect password");
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    variant === "inline"
      ? "flex-1 min-w-0 rounded px-2 py-1 text-[12px] bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400 outline-none focus:border-[#002fa7] focus:bg-white transition"
      : "flex-1 min-w-0 rounded px-2 py-1 text-[12px] bg-white/20 border border-white/40 text-white placeholder-white/60 outline-none focus:border-white/80 focus:bg-white/30 transition";

  const buttonClass =
    variant === "inline"
      ? "shrink-0 rounded px-2 py-1 text-[12px] font-medium bg-[#002fa7] text-white hover:bg-[#002fa7]/90 disabled:opacity-50 transition"
      : "shrink-0 rounded px-2 py-1 text-[12px] font-medium bg-white text-[#002fa7] hover:bg-white/90 disabled:opacity-50 transition";

  const errorClass =
    variant === "inline"
      ? "text-[11px] text-red-600 leading-tight"
      : "text-[11px] text-white/80 leading-tight";

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className={`flex flex-col gap-2 w-full max-w-[220px] ${variant === "inline" ? "mt-3" : "mt-3"}`}
    >
      <div className="flex gap-1">
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          placeholder="Password"
          autoComplete="off"
          className={inputClass}
          style={{ fontFamily: "'Geist', Helvetica" }}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={!password || submitting}
          className={buttonClass}
          style={{ fontFamily: "'Geist', Helvetica" }}
        >
          {submitting ? "…" : "Enter"}
        </button>
      </div>
      {error && (
        <p className={errorClass} style={{ fontFamily: "'Geist', Helvetica" }}>
          {error}
        </p>
      )}
    </form>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────

const ProjectCardContent = ({
  card,
  imageHeight,
  titleSize,
  cardOverlay = null,
  overlayVisible = false,
}: {
  card: ProjectCard;
  imageHeight: ImageHeight;
  titleSize: TitleSize;
  cardOverlay?: 'in_progress' | 'confidential' | null;
  overlayVisible?: boolean;
}): JSX.Element => {
  const isLarge = imageHeight === "large";

  // Choose crop coordinates based on slot size.
  // Small slots use the square crop; large slots use the wide crop.
  const useSquareCrop =
    !isLarge &&
    card.featuredSquareCropX != null &&
    card.featuredSquareCropY != null;
  const objectPosition = useSquareCrop
    ? `${(card.featuredSquareCropX as number).toFixed(1)}% ${(card.featuredSquareCropY as number).toFixed(1)}%`
    : card.featuredImageObjectPosition || "50% 50%";
  const cropZoom = useSquareCrop
    ? (card.featuredSquareCropZoom ?? 1)
    : (card.featuredImageZoom ?? 1);

  const isConfidentialWithPassword =
    cardOverlay === 'confidential' && card.isPasswordProtected === true;

  // Extra class applied when the touch-toggle is active, so the overlay is
  // visible on devices that don't support CSS :hover.
  const touchVisibleClass = overlayVisible ? "opacity-100" : "";

  return (
    <CardContent className="space-y-6 p-0">
      <div
        className={`group relative overflow-hidden rounded ${
          isLarge ? "h-[320px] lg:h-[400px]" : "h-[240px] lg:h-[300px]"
        }`}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          alt={card.featuredImageAlt || card.heroImageAlt}
          src={card.featuredImageUrl || card.heroImageSrc}
          style={{
            objectPosition,
            ...(cropZoom !== 1
              ? {
                  transform: `scale(${cropZoom})`,
                  transformOrigin: objectPosition,
                }
              : {}),
          }}
        />
        {cardOverlay === 'in_progress' && (
          <div className={`absolute inset-0 flex items-center justify-center bg-[#002fa7]/75 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${touchVisibleClass}`}>
            <p className="max-w-[260px] text-center text-[13px] font-normal leading-[1.6] text-white [font-family:'Geist',Helvetica] tracking-[0.01em]">
              Case study in progress — reach out for information.
            </p>
          </div>
        )}
        {cardOverlay === 'confidential' && !isConfidentialWithPassword && (
          <div className={`absolute inset-0 flex items-center justify-center bg-[#002fa7]/75 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${touchVisibleClass}`}>
            <p className="max-w-[260px] text-center text-[13px] font-normal leading-[1.6] text-white [font-family:'Geist',Helvetica] tracking-[0.01em]">
              Confidential project — reach out for information.
            </p>
          </div>
        )}
        {isConfidentialWithPassword && (
          /* focus-within keeps the overlay open while the user is typing */
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#002fa7]/75 opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100 ${touchVisibleClass}`}>
            <p className="text-[13px] font-normal text-white/80 [font-family:'Geist',Helvetica] tracking-[0.01em]">
              Enter password to view
            </p>
            <CardPasswordForm slug={card.slug} variant="overlay" isVisible={overlayVisible} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className={`mt-[-1px] [font-family:'Inter',Helvetica] font-normal tracking-[0] text-gray-900 leading-[normal] ${
            titleSize === "large"
              ? "text-[28px] lg:text-[32px]"
              : "text-[26px] lg:text-[28px]"
          }`}
        >
          {card.title}
        </h3>
        <p className="[font-family:'Geist',Helvetica] text-sm font-normal leading-[21px] tracking-[0] text-gray-700">
          {card.excerpt}
        </p>
      </div>
    </CardContent>
  );
};

const ProjectCard = ({
  card,
  index,
  className = "",
  cardOverlay = null,
}: {
  card: ProjectCard;
  index: number;
  className?: string;
  cardOverlay?: 'in_progress' | 'confidential' | null;
}): JSX.Element => {
  const { imageHeight, titleSize } = slotSizes(index);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dismiss the touch-toggled overlay when the user taps outside the card.
  useEffect(() => {
    if (!overlayVisible) return;
    function onTouchOutside(e: TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOverlayVisible(false);
      }
    }
    document.addEventListener("touchstart", onTouchOutside, { passive: true });
    return () => document.removeEventListener("touchstart", onTouchOutside);
  }, [overlayVisible]);

  const inner = (
    <Card className={`w-full border-0 bg-transparent p-0 shadow-none ${className}`}>
      <ProjectCardContent
        card={card}
        imageHeight={imageHeight}
        titleSize={titleSize}
        cardOverlay={cardOverlay}
        overlayVisible={overlayVisible}
      />
    </Card>
  );

  if (cardOverlay !== null) {
    return (
      <div
        ref={containerRef}
        className="cursor-default"
        onClick={() => setOverlayVisible((v) => !v)}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/work/${card.slug}`} className="block">
      {inner}
    </Link>
  );
};

// ─── Section ──────────────────────────────────────────────────────────────────

export const SelectedProjectsSection = (): JSX.Element => {
  const { data: projects = [] } = useQuery<ProjectCard[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json() as Promise<ProjectCard[]>;
    },
    staleTime: 30_000,
  });

  // Derive the seven layout slots from the ordered project list.
  // Slots beyond the project list are omitted rather than rendered empty.
  const featured = projects[0];
  const firstPair = projects.slice(1, 3);
  const solo = projects[3];
  const secondPair = projects.slice(4, 6);
  const finalSolo = projects[6];

  return (
    <section id="work" className="w-full bg-white px-6 pt-8 pb-16 sm:px-10 sm:pt-10 sm:pb-24 lg:px-20 lg:pt-10 lg:pb-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 lg:gap-12">
        <header className="space-y-4 lg:space-y-5">
          <h2 className="mt-[-1px] [font-family:'Inter',Helvetica] text-4xl font-normal leading-[normal] tracking-[0] text-gray-900 lg:text-5xl">
            Selected Works
          </h2>
          <p className="mt-2 [font-family:'Inter',Helvetica] text-sm font-normal leading-snug tracking-[0] text-gray-600 lg:text-base">
            The projects I love most begin with a question:
            <br />
            <em>How can we help people see this differently?</em>
          </p>
        </header>

        {featured && <ProjectCard card={featured} index={0} cardOverlay={featured.cardOverlay} />}

        {firstPair.length > 0 && (
          <div className="grid items-start gap-5 lg:gap-8 lg:grid-cols-[minmax(0,760fr)_minmax(0,480fr)]">
            {firstPair.map((card, i) => (
              <ProjectCard key={card.slug} card={card} index={1 + i} cardOverlay={card.cardOverlay} />
            ))}
          </div>
        )}

        {solo && <ProjectCard card={solo} index={3} cardOverlay={solo.cardOverlay} />}

        {secondPair.length > 0 && (
          <div className="grid items-start gap-5 lg:gap-8 lg:grid-cols-[minmax(0,480fr)_minmax(0,760fr)]">
            {secondPair.map((card, i) => (
              <ProjectCard key={card.slug} card={card} index={4 + i} cardOverlay={card.cardOverlay} />
            ))}
          </div>
        )}

        {finalSolo && <ProjectCard card={finalSolo} index={6} cardOverlay={finalSolo.cardOverlay} />}
      </div>
    </section>
  );
};
