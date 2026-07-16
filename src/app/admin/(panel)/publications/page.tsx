import Link from "next/link";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { Plus } from "lucide-react";

import { ContentListTable } from "@/components/admin/content-list-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SearchToolbar } from "@/components/admin/search-toolbar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  publicationResearchAreas,
  publications,
  publicationTypes,
  researchAreas,
  type PublicationType,
} from "@/server/db/schema";
import { deletePublicationAction } from "@/server/actions/projects-publications";

const typeLabels: Record<PublicationType, string> = {
  journal: "期刊论文",
  conference: "会议论文",
  book_chapter: "专著章节",
  patent: "专利",
  software: "软件",
  other: "其他成果",
};

export default async function PublicationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    year?: string;
    researchArea?: string;
    deleted?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const conditions = [];
  if (query.q)
    conditions.push(
      or(
        like(publications.title, `%${query.q}%`),
        like(publications.authors, `%${query.q}%`),
        like(publications.venue, `%${query.q}%`),
        like(publications.doi, `%${query.q}%`),
      )!,
    );
  if (query.status === "draft" || query.status === "published")
    conditions.push(eq(publications.status, query.status));
  if (publicationTypes.includes(query.type as PublicationType))
    conditions.push(eq(publications.type, query.type as PublicationType));
  const year = Number(query.year);
  if (Number.isSafeInteger(year) && year >= 1900)
    conditions.push(eq(publications.year, year));
  const areaId = Number(query.researchArea);
  if (Number.isSafeInteger(areaId) && areaId > 0)
    conditions.push(
      inArray(
        publications.id,
        db
          .select({ id: publicationResearchAreas.publicationId })
          .from(publicationResearchAreas)
          .where(eq(publicationResearchAreas.researchAreaId, areaId)),
      ),
    );
  const [rows, years, areas] = await Promise.all([
    db
      .select()
      .from(publications)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        desc(publications.year),
        asc(publications.sortOrder),
        asc(publications.title),
      ),
    db
      .selectDistinct({ year: publications.year })
      .from(publications)
      .orderBy(desc(publications.year)),
    db
      .select({ id: researchAreas.id, title: researchAreas.title })
      .from(researchAreas)
      .orderBy(asc(researchAreas.title)),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="论文成果"
        description="维护准确的作者字符串、出版信息、DOI、链接与关联内容。"
        actions={
          <Button asChild>
            <Link href="/admin/publications/new">
              <Plus className="size-4" />
              新增成果
            </Link>
          </Button>
        }
      />
      <SavedAlert deleted={query.deleted === "1"} />
      <SearchToolbar query={query.q} status={query.status}>
        <Select name="year" defaultValue={query.year ?? ""} className="sm:w-28">
          <option value="">全部年份</option>
          {years.map(({ year: itemYear }) => (
            <option key={itemYear} value={itemYear}>
              {itemYear}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={query.type ?? ""} className="sm:w-36">
          <option value="">全部类型</option>
          {publicationTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </Select>
        <Select
          name="researchArea"
          defaultValue={query.researchArea ?? ""}
          className="sm:w-44"
        >
          <option value="">全部方向</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.title}
            </option>
          ))}
        </Select>
      </SearchToolbar>
      {rows.length ? (
        <ContentListTable
          rows={rows.map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: `${row.authors} · ${typeLabels[row.type]}${row.venue ? ` · ${row.venue}` : ""}`,
            status: row.status,
            featured: row.featured,
            sortOrder: row.year,
          }))}
          baseHref="/admin/publications"
          deleteAction={deletePublicationAction}
          extraHeader="年份"
        />
      ) : (
        <EmptyState
          title="没有匹配的论文成果"
          description="调整筛选条件，或录入第一项科研成果。"
          action={
            <Button asChild>
              <Link href="/admin/publications/new">新增成果</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
