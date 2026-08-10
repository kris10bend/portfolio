import { useEffect } from "react";
import { useParams } from "wouter";
import { HeaderNavigationSection } from "./sections/HeaderNavigationSection";
import { ProjectHeroSection } from "./sections/ProjectHeroSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { ProjectNarrativeSection } from "./sections/ProjectNarrativeSection";
import { ProjectGallerySection } from "./sections/ProjectGallerySection";
import { NextProjectSection } from "./sections/NextProjectSection";
import { ProjectFooterSection } from "./sections/ProjectFooterSection";
import { getProjectBySlug } from "@/data/projects";

/**
 * Reusable project case-study page template.
 *
 * Reads the `slug` param from the URL (/work/:slug), looks up the matching
 * project in the data layer, and renders every section.  All layout and
 * styling decisions live in the individual section components; new case studies
 * are added purely by appending entries to `src/data/projects.ts`.
 */
export const ProjectPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();
  const project = getProjectBySlug(slug);

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
