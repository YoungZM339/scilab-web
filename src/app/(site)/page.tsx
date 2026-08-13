import { ArrowRight, CalendarDays, Microscope, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicationItem } from "@/components/site/cards";
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

const quickLinks = [
  {
    href: "/research",
    label: "研究方向",
    note: "探索前沿科学问题",
    icon: Microscope,
  },
  {
    href: "/people",
    label: "科研团队",
    note: "认识我们的研究者",
    icon: UsersRound,
  },
  {
    href: "/join",
    label: "加入我们",
    note: "一起推动科学发现",
    icon: CalendarDays,
  },
];

export default async function HomePage() {
  const data = await getHomePageData();
  const { settings } = data;
  const leadNews = data.news[0];
  const otherNews = data.news.slice(1, 4);

  return (
    <>
      <section className="institutional-hero">
        {settings.heroImageUrl ? (
          <Image
            alt=""
            className="institutional-hero-image"
            fill
            priority
            sizes="100vw"
            src={settings.heroImageUrl}
          />
        ) : (
          <div className="institutional-hero-pattern" aria-hidden="true" />
        )}
        <div className="institutional-hero-shade" />
        <div className="site-container institutional-hero-content">
          <p className="hero-kicker">Science · Innovation · Future</p>
          <h1>{settings.heroTitle || settings.siteName}</h1>
          <p>
            {settings.heroSubtitle || settings.tagline || settings.description}
          </p>
          <Link className="hero-more" href="/about">
            了解实验室 <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          <span /> 向下探索
        </div>
      </section>

      <nav className="home-quick-nav" aria-label="首页快捷入口">
        <div className="site-container home-quick-grid">
          {quickLinks.map(({ href, label, note, icon: Icon }, index) => (
            <Link href={href} key={href}>
              <span className="quick-number">0{index + 1}</span>
              <Icon aria-hidden="true" size={28} strokeWidth={1.5} />
              <span>
                <strong>{label}</strong>
                <small>{note}</small>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="quick-arrow"
                size={19}
              />
            </Link>
          ))}
        </div>
      </nav>

      {data.news.length > 0 && (
        <section className="section home-news-section">
          <div className="site-container">
            <HomeHeading cn="实验室动态" en="Laboratory News" href="/news" />
            <div className="home-news-layout">
              {leadNews && (
                <Link className="lead-news" href={`/news/${leadNews.slug}`}>
                  <div className="lead-news-media">
                    {leadNews.coverUrl ? (
                      <Image
                        alt=""
                        fill
                        sizes="(max-width: 800px) 100vw, 55vw"
                        src={leadNews.coverUrl}
                      />
                    ) : (
                      <div className="lead-news-placeholder" />
                    )}
                  </div>
                  <div className="lead-news-copy">
                    <time>{leadNews.publishedAt}</time>
                    <h3>{leadNews.title}</h3>
                    {leadNews.summary && <p>{leadNews.summary}</p>}
                  </div>
                </Link>
              )}
              <div className="news-brief-list">
                {otherNews.map((post) => (
                  <Link href={`/news/${post.slug}`} key={post.id}>
                    <time>{post.publishedAt}</time>
                    <h3>{post.title}</h3>
                    {post.summary && <p>{post.summary}</p>}
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {data.researchAreas.length > 0 && (
        <section className="section home-research-section">
          <div className="site-container">
            <HomeHeading
              cn="研究方向"
              en="Research Directions"
              href="/research"
              light
            />
            <div className="research-showcase">
              {data.researchAreas.map((area, index) => (
                <Link href={`/research/${area.slug}`} key={area.id}>
                  {area.coverUrl && (
                    <Image
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      src={area.coverUrl}
                    />
                  )}
                  <span className="research-index">0{index + 1}</span>
                  <div>
                    <h3>{area.title}</h3>
                    {area.summary && <p>{area.summary}</p>}
                  </div>
                  <ArrowRight aria-hidden="true" size={20} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.publications.length > 0 && (
        <section className="section home-output-section">
          <div className="site-container">
            <HomeHeading
              cn="最新成果"
              en="Latest Outputs"
              href="/publications"
            />
            <ol className="publication-list">
              {data.publications.slice(0, 4).map((publication) => (
                <PublicationItem
                  key={publication.id}
                  publication={publication}
                />
              ))}
            </ol>
          </div>
        </section>
      )}

      <section className="home-cta">
        <div className="site-container">
          <div>
            <p>JOIN OUR TEAM</p>
            <h2>{data.join?.title || "与优秀的人，一起探索未知"}</h2>
            <span>
              {data.join?.summary || "欢迎对科学充满热情的青年人才加入我们。"}
            </span>
          </div>
          <Link href="/join">
            查看加入方式 <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}

function HomeHeading({
  cn,
  en,
  href,
  light = false,
}: {
  cn: string;
  en: string;
  href: string;
  light?: boolean;
}) {
  return (
    <div
      className={`institutional-heading${light ? " institutional-heading-light" : ""}`}
    >
      <div>
        <p>{en}</p>
        <h2>{cn}</h2>
      </div>
      <Link href={href}>
        查看更多 <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </div>
  );
}
