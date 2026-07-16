import type { Metadata } from "next";

import { ResearchCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { getResearchAreas } from "@/server/services/public";

export const metadata: Metadata = {
  title: "研究方向",
  description: "浏览实验室关注的核心科学问题与研究方向。",
  alternates: { canonical: "/research" },
};

export default async function ResearchPage() {
  const areas = await getResearchAreas();

  return (
    <>
      <PageHero
        description="围绕前沿科学问题，发展可验证的方法并沉淀可复用的知识。"
        eyebrow="Research"
        title="研究方向"
      />
      <section className="content-section">
        <div className="site-container">
          {areas.length > 0 ? (
            <div className="site-grid grid-3">
              {areas.map((area) => (
                <ResearchCard area={area} key={area.id} />
              ))}
            </div>
          ) : (
            <EmptyState description="研究方向尚未发布。" />
          )}
        </div>
      </section>
    </>
  );
}
