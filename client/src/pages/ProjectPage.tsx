import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeaderNavigationSection } from "./sections/HeaderNavigationSection";
import { ProjectHeroSection } from "./sections/ProjectHeroSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { ProjectNarrativeSection } from "./sections/ProjectNarrativeSection";
import { ProjectGallerySection } from "./sections/ProjectGallerySection";
import { NextProjectSection } from "./sections/NextProjectSection";
import { ProjectFooterSection } from "./sections/ProjectFooterSection";
import type { ProjectData } from "@/types/project";

// ─── Password gate ────────────────────────────────────────────────────────────

function PasswordGate({
  slug,
  projectTitle,
  onUnlocked,
}: {
  slug: string;
  projectTitle?: string;
  onUnlocked: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        onUnlocked();
      } else {
        setError("Incorrect password");
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-white">
      <HeaderNavigationSection />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-sm space-y-8">
          {projectTitle ? (
            <div>
              <p
                className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-2"
                style={{ fontFamily: "'Geist', Helvetica" }}
              >
                Case Study
              </p>
              <h1
                className="text-[28px] font-normal leading-snug text-gray-900"
                style={{ fontFamily: "'Inter', Helvetica" }}
              >
                {projectTitle}
              </h1>
            </div>
          ) : (
            <h1
              className="text-[28px] font-normal leading-snug text-gray-900"
              style={{ fontFamily: "'Inter', Helvetica" }}
            >
              Password required
            </h1>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="gate-password"
                className="text-xs text-gray-500 uppercase tracking-[0.08em]"
                style={{ fontFamily: "'Geist', Helvetica" }}
              >
                Password
              </label>
              <input
                id="gate-password"
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                autoComplete="current-password"
                className="w-full rounded border border-gray-200 px-3 py-2 text-[14px] text-gray-900 outline-none focus:border-[#002fa7] transition"
                style={{ fontFamily: "'Geist', Helvetica" }}
                disabled={submitting}
              />
              {error && (
                <p
                  className="text-[12px] text-red-500"
                  style={{ fontFamily: "'Geist', Helvetica" }}
                >
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={!password || submitting}
              className="w-full rounded bg-[#002fa7] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#002080] disabled:opacity-50 transition"
              style={{ fontFamily: "'Geist', Helvetica" }}
            >
              {submitting ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Reusable project case-study page template.
 *
 * Reads the `slug` param from the URL (/work/:slug), fetches project data
 * from the public API (/api/projects/:slug), and renders every section.
 *
 * The API falls back to the static projects.ts data for any slug not yet
 * migrated to the CMS database, so all existing case studies remain accessible
 * during gradual migration.
 *
 * If the API returns 401 with { passwordRequired: true }, shows a centred
 * password gate. Correct password unlocks the project (session-scoped) and
 * refetches the data without a hard navigation.
 *
 * Previously this component called `getProjectBySlug` from the static file
 * directly. That function is now deprecated in favour of the API.
 */
export const ProjectPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  // Derive the project title from the homepage list cache (if available) so
  // the password gate can display a name even before the detail loads.
  const listCache = queryClient.getQueryData<Array<{ slug: string; title: string }>>(["/api/projects"]);
  const cachedTitle = listCache?.find((p) => p.slug === slug)?.title;

  const { data: project, isLoading, error: queryError } = useQuery<ProjectData | null>({
    queryKey: ["/api/projects", slug],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug ?? "")}`);
      if (res.status === 404) return null;
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        if (body.passwordRequired) {
          // Signal the password gate by throwing a tagged error
          const err: any = new Error("password_required");
          err.passwordRequired = true;
          throw err;
        }
      }
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json() as Promise<ProjectData>;
    },
    enabled: !!slug,
    staleTime: 30_000,
    retry: false,
  });

  const passwordRequired = (queryError as any)?.passwordRequired === true;

  useEffect(() => {
    window.scrollTo(0, 0);

    if (project) {
      const titleLine = project.title.split("\n")[0];
      document.title = `${titleLine} — Case Study`;

      // Upsert the meta description tag
      let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = project.metaDescription ?? "";

      // Remove any noindex tag that may have been set while navigating to a
      // hidden project URL — this page is publicly visible and should be indexed.
      document.querySelector('meta[name="robots"]')?.remove();
    } else if (!isLoading && !passwordRequired) {
      // Project is not found (404 / hidden). Tell crawlers to drop any cached
      // version so URLs that were indexed before the project was hidden are
      // removed on the next crawl.
      let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.name = "robots";
        document.head.appendChild(metaRobots);
      }
      metaRobots.content = "noindex, nofollow";
    }

    return () => {
      // Clean up on unmount so the tag doesn't bleed into subsequent pages.
      document.querySelector('meta[name="robots"]')?.remove();
    };
  }, [slug, project, isLoading, passwordRequired]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen w-full flex-col bg-white">
        <HeaderNavigationSection />
        {/* Blank loading state — intentionally minimal to avoid layout shift */}
        <div className="flex-1" />
      </main>
    );
  }

  if (passwordRequired) {
    return (
      <PasswordGate
        slug={slug ?? ""}
        projectTitle={cachedTitle}
        onUnlocked={() => {
          // Invalidate the query so it refetches — the session now has the unlock
          queryClient.invalidateQueries({ queryKey: ["/api/projects", slug] });
        }}
      />
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-white">
        <p
          className="text-gray-400"
          style={{ fontFamily: "'Geist', 'Inter', Helvetica, sans-serif" }}
        >
          Project not found.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-white">
      {/* Global nav — shared with homepage */}
      <HeaderNavigationSection />

      {/* Full-bleed hero image */}
      <ProjectHeroSection image={project.heroImage} />

      {/* Blue panel: title + metadata */}
      <ProjectOverviewSection
        caseStudyLabel={project.caseStudyLabel}
        title={project.title}
        metadata={project.metadata}
      />

      {/* Quote + description split */}
      <ProjectNarrativeSection
        quote={project.quote}
        description={project.description}
      />

      {/* Photo gallery rows */}
      <ProjectGallerySection blocks={project.gallery} />

      {/* Next project teaser — only shown when data includes a nextProject */}
      {project.nextProject && (
        <NextProjectSection nextProject={project.nextProject} />
      )}

      {/* Project-specific footer */}
      <ProjectFooterSection />
    </main>
  );
};
