import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { getStaticPage } from "@/server/services/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage("join");
  return {
    title: page?.title || "加入我们",
    description: page?.summary || "了解实验室的招生、招聘与合作机会。",
    alternates: { canonical: "/join" },
  };
}

export default async function JoinPage() {
  const page = await getStaticPage("join");

  return (
    <>
      <PageHero
        description={
          page?.summary || "欢迎对科学问题抱有好奇、重视严谨与协作的伙伴。"
        }
        eyebrow="Join Us"
        title={page?.title || "加入我们"}
      />
      <section className="content-section">
        <div className="narrow-container">
          {page?.html ? (
            <RichText html={page.html} />
          ) : (
            <EmptyState description="招生与招聘信息尚未发布。" />
          )}
          <div className="button-row">
            <Link className="button button-secondary" href="/contact">
              联系实验室
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
