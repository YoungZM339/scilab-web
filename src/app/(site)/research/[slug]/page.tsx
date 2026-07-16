import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard, PublicationItem } from "@/components/site/cards";
import { RichText } from "@/components/site/rich-text";
import { getResearchAreaBySlug } from "@/server/services/public";

interface ResearchAreaPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ResearchAreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = await getResearchAreaBySlug(slug);
  if (!area) return {};

  return {
    title: area.title,
    description: area.summary || `了解实验室在${area.title}方向的研究。`,
    alternates: { canonical: `/research/${area.slug}` },
    openGraph: area.coverUrl ? { images: [{ url: area.coverUrl }] } : undefined,
  };
}

export default async function ResearchAreaPage({
  params,
}: ResearchAreaPageProps) {
  const { slug } = await params;
  const area = await getResearchAreaBySlug(slug);
  if (!area) notFound();

  return (
    <>
      <section className="page-hero">
        <div className="site-container">
          <nav aria-label="面包屑导航">
            <ol className="breadcrumb">
              <li>
                <Link href="/">首页</Link>
              </li>
              <li>
                <Link href="/research">研究方向</Link>
              </li>
              <li>{area.title}</li>
            </ol>
          </nav>
          <p className="eyebrow">Research Area</p>
          <h1 className="detail-title">{area.title}</h1>
          {area.summary && <p className="detail-summary">{area.summary}</p>}
        </div>
      </section>

      <section className="content-section">
        <div className="narrow-container">
          {area.html ? (
            <RichText html={area.html} />
          ) : (
            <p className="detail-summary">研究介绍正在整理中。</p>
          )}
        </div>
      </section>

      {area.projects.length > 0 && (
        <section className="section section-muted">
          <div className="site-container">
            <div className="section-heading">
              <h2 className="section-title">相关项目</h2>
            </div>
            <div className="site-grid grid-3">
              {area.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {area.publications.length > 0 && (
        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <h2 className="section-title">相关成果</h2>
            </div>
            <ol className="publication-list">
              {area.publications.map((publication) => (
                <PublicationItem
                  key={publication.id}
                  publication={publication}
                />
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
