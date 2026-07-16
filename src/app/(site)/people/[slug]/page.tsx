import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard, PublicationItem } from "@/components/site/cards";
import { RichText } from "@/components/site/rich-text";
import { MEMBER_GROUP_LABELS } from "@/lib/constants";
import { getMemberBySlug } from "@/server/services/public";

interface MemberPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = await getMemberBySlug(slug);
  if (!member) return {};

  return {
    title: member.name,
    description: member.roleTitle || `${member.name}的个人介绍与研究成果。`,
    alternates: { canonical: `/people/${member.slug}` },
    openGraph: member.avatarUrl
      ? { images: [{ url: member.avatarUrl }] }
      : undefined,
  };
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { slug } = await params;
  const member = await getMemberBySlug(slug);
  if (!member) notFound();

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
                <Link href="/people">团队成员</Link>
              </li>
              <li>{member.name}</li>
            </ol>
          </nav>
          <p className="eyebrow">{MEMBER_GROUP_LABELS[member.group]}</p>
          <h1 className="detail-title">{member.name}</h1>
          {member.roleTitle && (
            <p className="detail-summary">{member.roleTitle}</p>
          )}
        </div>
      </section>

      <section className="content-section">
        <div className="site-container detail-layout">
          <div>
            {member.bioHtml ? (
              <RichText html={member.bioHtml} />
            ) : (
              <p className="detail-summary">个人介绍正在整理中。</p>
            )}
          </div>

          <aside className="detail-aside" aria-label="成员信息">
            {member.avatarUrl && (
              <Image
                alt={`${member.name}的照片`}
                className="aside-portrait"
                height={720}
                priority
                sizes="(max-width: 960px) 50vw, 18rem"
                src={member.avatarUrl}
                width={640}
              />
            )}
            <h2>个人信息</h2>
            <dl className="fact-list">
              {member.email && (
                <div>
                  <dt>邮箱</dt>
                  <dd>
                    <a href={`mailto:${member.email}`}>{member.email}</a>
                  </dd>
                </div>
              )}
              {member.phone && (
                <div>
                  <dt>电话</dt>
                  <dd>{member.phone}</dd>
                </div>
              )}
              {member.website && (
                <div>
                  <dt>个人主页</dt>
                  <dd>
                    <a href={member.website} rel="noreferrer" target="_blank">
                      访问主页 <ArrowUpRight aria-hidden="true" size={13} />
                    </a>
                  </dd>
                </div>
              )}
              {member.orcid && (
                <div>
                  <dt>ORCID</dt>
                  <dd>
                    <a
                      href={`https://orcid.org/${member.orcid.replace(/^https?:\/\/orcid\.org\//i, "")}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {member.orcid}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </section>

      {member.projects.length > 0 && (
        <section className="section section-muted">
          <div className="site-container">
            <div className="section-heading">
              <h2 className="section-title">参与项目</h2>
            </div>
            <div className="site-grid grid-3">
              {member.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {member.publications.length > 0 && (
        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <h2 className="section-title">相关成果</h2>
            </div>
            <ol className="publication-list">
              {member.publications.map((publication) => (
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
