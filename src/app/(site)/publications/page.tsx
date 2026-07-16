import type { Metadata } from "next";
import Link from "next/link";

import { PublicationItem } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import {
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_TYPES,
  type PublicationType,
} from "@/lib/constants";
import {
  getPublicationFilters,
  getPublications,
} from "@/server/services/public";

export const metadata: Metadata = {
  title: "研究成果",
  description: "按年份、成果类型和研究方向浏览实验室的论文及其他科研成果。",
  alternates: { canonical: "/publications" },
};

interface PublicationsPageProps {
  searchParams: Promise<{
    area?: string | string[];
    type?: string | string[];
    year?: string | string[];
  }>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublicationsPage({
  searchParams,
}: PublicationsPageProps) {
  const rawFilters = await searchParams;
  const yearValue = first(rawFilters.year) ?? "";
  const typeValue = first(rawFilters.type) ?? "";
  const areaValue = first(rawFilters.area) ?? "";
  const year = /^\d{4}$/.test(yearValue) ? Number(yearValue) : undefined;
  const type = PUBLICATION_TYPES.includes(typeValue as PublicationType)
    ? (typeValue as PublicationType)
    : undefined;

  const [filterOptions, publications] = await Promise.all([
    getPublicationFilters(),
    getPublications({ year, type, researchAreaSlug: areaValue || undefined }),
  ]);
  const hasFilters = Boolean(year || type || areaValue);

  return (
    <>
      <PageHero
        description="以可检验、可复现、可交流的成果沉淀研究过程。"
        eyebrow="Publications"
        title="研究成果"
      />
      <section className="content-section">
        <div className="site-container">
          <form className="filter-panel" method="get">
            <div className="form-field">
              <label htmlFor="publication-year">年份</label>
              <select
                className="form-control"
                defaultValue={yearValue}
                id="publication-year"
                name="year"
              >
                <option value="">全部年份</option>
                {filterOptions.years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="publication-type">成果类型</label>
              <select
                className="form-control"
                defaultValue={typeValue}
                id="publication-type"
                name="type"
              >
                <option value="">全部类型</option>
                {PUBLICATION_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {PUBLICATION_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="publication-area">研究方向</label>
              <select
                className="form-control"
                defaultValue={areaValue}
                id="publication-area"
                name="area"
              >
                <option value="">全部方向</option>
                {filterOptions.researchAreas.map((area) => (
                  <option key={area.id} value={area.slug}>
                    {area.title}
                  </option>
                ))}
              </select>
            </div>
            <button className="button button-primary" type="submit">
              筛选
            </button>
          </form>

          {hasFilters && (
            <div style={{ marginBottom: "1rem" }}>
              <Link className="text-link" href="/publications">
                清除筛选
              </Link>
            </div>
          )}

          {publications.length > 0 ? (
            <ol className="publication-list">
              {publications.map((publication) => (
                <PublicationItem
                  key={publication.id}
                  publication={publication}
                />
              ))}
            </ol>
          ) : (
            <EmptyState
              description={
                hasFilters
                  ? "没有符合当前筛选条件的成果，请尝试其他条件。"
                  : "研究成果尚未发布。"
              }
              title={hasFilters ? "未找到匹配成果" : "内容正在整理中"}
            />
          )}
        </div>
      </section>
    </>
  );
}
