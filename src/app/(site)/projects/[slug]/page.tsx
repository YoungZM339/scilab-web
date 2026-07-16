import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PersonCard, PublicationItem } from "@/components/site/cards";
import { RichText } from "@/components/site/rich-text";
import { getProjectBySlug } from "@/server/services/public";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.summary || `了解科研项目“${project.title}”。`,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: project.coverUrl
      ? { images: [{ url: project.coverUrl }] }
      : undefined,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

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
                <Link href="/projects">科研项目</Link>
              </li>
              <li>{project.title}</li>
            </ol>
          </nav>
          <p className="eyebrow">
            {project.projectStatus === "ongoing"
              ? "Ongoing Project"
              : "Completed Project"}
          </p>
          <h1 className="detail-title">{project.title}</h1>
          {project.summary && (
            <p className="detail-summary">{project.summary}</p>
          )}
        </div>
      </section>

      <section className="content-section">
        <div className="site-container detail-layout detail-layout-wide">
          <div>
            {project.html ? (
              <RichText html={project.html} />
            ) : (
              <p className="detail-summary">项目介绍正在整理中。</p>
            )}
          </div>
          <aside className="detail-aside" aria-label="项目信息">
            <h2>项目概况</h2>
            <dl className="fact-list">
              <div>
                <dt>状态</dt>
                <dd>
                  {project.projectStatus === "ongoing" ? "进行中" : "已完成"}
                </dd>
              </div>
              {project.startDate && (
                <div>
                  <dt>开始时间</dt>
                  <dd>{project.startDate}</dd>
                </div>
              )}
              {project.endDate && (
                <div>
                  <dt>结束时间</dt>
                  <dd>{project.endDate}</dd>
                </div>
              )}
              {project.funding && (
                <div>
                  <dt>资助来源</dt>
                  <dd>{project.funding}</dd>
                </div>
              )}
              {project.researchAreas.length > 0 && (
                <div>
                  <dt>研究方向</dt>
                  <dd className="badge-list">
                    {project.researchAreas.map((area) => (
                      <Link
                        className="badge"
                        href={`/research/${area.slug}`}
                        key={area.id}
                      >
                        {area.title}
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
              {project.externalUrl && (
                <div>
                  <dt>项目链接</dt>
                  <dd>
                    <a
                      href={project.externalUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      访问项目网站 <ArrowUpRight aria-hidden="true" size={13} />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </section>

      {project.members.length > 0 && (
        <section className="section section-muted">
          <div className="site-container">
            <div className="section-heading">
              <h2 className="section-title">项目成员</h2>
            </div>
            <div className="site-grid grid-4">
              {project.members.map((member) => (
                <PersonCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        </section>
      )}

      {project.publications.length > 0 && (
        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <h2 className="section-title">项目成果</h2>
            </div>
            <ol className="publication-list">
              {project.publications.map((publication) => (
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
