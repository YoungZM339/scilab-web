import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  NewsCard,
  PersonCard,
  ProjectCard,
  PublicationItem,
  ResearchCard,
} from "@/components/site/cards";
import { RichText } from "@/components/site/rich-text";
import { getHomePageData, getSiteSettings } from "@/server/services/public";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: { absolute: settings.seoTitle || settings.siteName },
    description:
      settings.seoDescription || settings.description || settings.tagline,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const data = await getHomePageData();
  const { settings } = data;

  return (
    <>
      <section className="hero">
        {settings.heroImageUrl && (
          <div className="hero-media-wrap" aria-hidden="true">
            <Image
              alt=""
              className="hero-media"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 58vw"
              src={settings.heroImageUrl}
            />
          </div>
        )}
        <div className="site-container hero-content">
          <p className="eyebrow">Research · Discovery · Collaboration</p>
          <h1 className="hero-title">
            {settings.heroTitle || settings.siteName}
          </h1>
          {(settings.heroSubtitle || settings.tagline) && (
            <p className="hero-subtitle">
              {settings.heroSubtitle || settings.tagline}
            </p>
          )}
          <div className="hero-actions">
            <Link className="button button-primary" href="/research">
              探索研究方向 <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link className="button button-secondary" href="/join">
              加入我们
            </Link>
          </div>
        </div>
      </section>

      {data.about && (data.about.summary || data.about.html) && (
        <section className="section">
          <div className="narrow-container">
            <p className="eyebrow">About the Lab</p>
            <h2 className="section-title">{data.about.title}</h2>
            {data.about.summary && (
              <p className="section-lead">{data.about.summary}</p>
            )}
            {!data.about.summary && <RichText html={data.about.html} />}
            <div className="button-row">
              <Link className="text-link" href="/about">
                了解实验室 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {data.researchAreas.length > 0 && (
        <section className="section section-muted">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Research Areas</p>
                <h2 className="section-title">研究方向</h2>
                <p className="section-lead">
                  聚焦重要科学问题，在交叉协作中形成新的理解与方法。
                </p>
              </div>
              <Link className="text-link" href="/research">
                查看全部 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="site-grid grid-3">
              {data.researchAreas.map((area) => (
                <ResearchCard area={area} key={area.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.projects.length > 0 && (
        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Selected Projects</p>
                <h2 className="section-title">精选项目</h2>
              </div>
              <Link className="text-link" href="/projects">
                查看全部 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="site-grid grid-3">
              {data.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.members.length > 0 && (
        <section className="section section-muted">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">People</p>
                <h2 className="section-title">团队成员</h2>
              </div>
              <Link className="text-link" href="/people">
                认识团队 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="site-grid grid-4">
              {data.members.map((member) => (
                <PersonCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.publications.length > 0 && (
        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Latest Outputs</p>
                <h2 className="section-title">最新成果</h2>
              </div>
              <Link className="text-link" href="/publications">
                浏览全部 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <ol className="publication-list">
              {data.publications.map((publication) => (
                <PublicationItem
                  key={publication.id}
                  publication={publication}
                />
              ))}
            </ol>
          </div>
        </section>
      )}

      {data.news.length > 0 && (
        <section className="section section-muted">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">News & Events</p>
                <h2 className="section-title">最新动态</h2>
              </div>
              <Link className="text-link" href="/news">
                查看全部 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="site-grid grid-3">
              {data.news.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.join && (
        <section className="section">
          <div className="narrow-container">
            <p className="eyebrow">Join Us</p>
            <h2 className="section-title">{data.join.title}</h2>
            {data.join.summary && (
              <p className="section-lead">{data.join.summary}</p>
            )}
            <div className="button-row">
              <Link className="button button-primary" href="/join">
                查看机会 <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
