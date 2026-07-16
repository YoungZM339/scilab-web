import type { Metadata } from "next";

import { ProjectCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getProjects } from "@/server/services/public";

export const metadata: Metadata = {
  title: "科研项目",
  description: "了解实验室正在开展及已经完成的科研项目。",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <PageHero
        description="从清晰的问题出发，以严谨实验和跨学科协作推进发现。"
        eyebrow="Projects"
        title="科研项目"
      />
      <section className="content-section">
        <div className="site-container">
          {projects.length > 0 ? (
            <div className="site-grid grid-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState description="科研项目信息尚未发布。" />
          )}
        </div>
      </section>
    </>
  );
}
