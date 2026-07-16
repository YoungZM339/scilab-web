import type { Metadata } from "next";

import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { getStaticPage } from "@/server/services/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage("about");
  return {
    title: page?.title || "关于我们",
    description: page?.summary || "了解实验室的研究使命、发展历程与学术文化。",
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const page = await getStaticPage("about");

  return (
    <>
      <PageHero
        description={
          page?.summary || "了解我们的研究使命、学术文化与发展方向。"
        }
        eyebrow="About"
        title={page?.title || "关于我们"}
      />
      <section className="content-section">
        <div className="narrow-container">
          {page?.html ? (
            <RichText html={page.html} />
          ) : (
            <EmptyState description="实验室介绍尚未发布。" />
          )}
        </div>
      </section>
    </>
  );
}
