import type { Metadata } from "next";

import { NewsCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getNewsPosts } from "@/server/services/public";

export const metadata: Metadata = {
  title: "实验室动态",
  description: "查看实验室新闻、学术活动和重要进展。",
  alternates: { canonical: "/news" },
};

export default async function NewsPage() {
  const posts = await getNewsPosts();

  return (
    <>
      <PageHero
        description="记录研究进展、学术交流与团队里的重要时刻。"
        eyebrow="News & Events"
        title="实验室动态"
      />
      <section className="content-section">
        <div className="site-container">
          {posts.length > 0 ? (
            <div className="site-grid grid-3">
              {posts.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState description="实验室动态尚未发布。" />
          )}
        </div>
      </section>
    </>
  );
}
