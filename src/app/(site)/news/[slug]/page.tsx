import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichText } from "@/components/site/rich-text";
import { getNewsPostBySlug } from "@/server/services/public";

interface NewsPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: NewsPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary || post.title,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: post.coverUrl
      ? { type: "article", images: [{ url: post.coverUrl }] }
      : { type: "article" },
  };
}

export default async function NewsPostPage({ params }: NewsPostPageProps) {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) notFound();

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
                <Link href="/news">实验室动态</Link>
              </li>
              <li>{post.title}</li>
            </ol>
          </nav>
          <p className="eyebrow">{post.publishedAt || "News"}</p>
          <h1 className="detail-title">{post.title}</h1>
          {post.summary && <p className="detail-summary">{post.summary}</p>}
        </div>
      </section>
      <article className="content-section">
        <div className="narrow-container">
          {post.coverUrl && (
            <Image
              alt={post.title}
              className="card"
              height={900}
              priority
              sizes="(max-width: 860px) 100vw, 820px"
              src={post.coverUrl}
              style={{
                aspectRatio: "16 / 9",
                marginBottom: "2.5rem",
                objectFit: "cover",
                width: "100%",
              }}
              width={1600}
            />
          )}
          {post.html ? (
            <RichText html={post.html} />
          ) : (
            <p className="detail-summary">正文正在整理中。</p>
          )}
        </div>
      </article>
    </>
  );
}
