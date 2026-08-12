import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HeaderNavigationSection } from "./sections/HeaderNavigationSection";
import { ProjectHeroSection } from "./sections/ProjectHeroSection";
import { ProjectFeaturedImageSection } from "./sections/ProjectFeaturedImageSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { ProjectNarrativeSection } from "./sections/ProjectNarrativeSection";
import { ProjectGallerySection } from "./sections/ProjectGallerySection";
import { NextProjectSection } from "./sections/NextProjectSection";
import { ProjectFooterSection } from "./sections/ProjectFooterSection";
import type { ProjectData } from "@/types/project";

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
 * Previously this component called `getProjectBySlug` from the static file
 * directly. That function is now deprecated in favour of the API.
 */
export const ProjectPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();

  const { data: project, isLoading } = useQuery<ProjectData | null>({
    queryKey: ["/api/projects", slug],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug ?? "")}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json() as Promise<ProjectData>;
    },
    enabled: !!slug,
    staleTime: 30_000,
  });

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
    }
  }, [slug, project]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen w-full flex-col bg-white">
        <HeaderNavigationSection />
        {/* Blank loading state — intentionally minimal to avoid layout shift */}
        <div className="flex-1" />
      </main>
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

      {/* Featured image with focal-point crop — only shown when set in CMS */}
      {project.featuredImage && (
        <ProjectFeaturedImageSection image={project.featuredImage} />
      )}

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
