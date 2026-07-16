import Link from "next/link";
import { and, asc, eq, like, or } from "drizzle-orm";
import { Plus } from "lucide-react";

import { ContentListTable } from "@/components/admin/content-list-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SearchToolbar } from "@/components/admin/search-toolbar";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { researchAreas } from "@/server/db/schema";
import { deleteResearchAreaAction } from "@/server/actions/people-research";

export default async function ResearchAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; deleted?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const conditions = [];
  if (query.q)
    conditions.push(
      or(
        like(researchAreas.title, `%${query.q}%`),
        like(researchAreas.summary, `%${query.q}%`),
      )!,
    );
  if (query.status === "draft" || query.status === "published")
    conditions.push(eq(researchAreas.status, query.status));
  const rows = await db
    .select()
    .from(researchAreas)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(researchAreas.sortOrder), asc(researchAreas.title));
  return (
    <div className="space-y-6">
      <PageHeader
        title="研究方向"
        description="维护实验室的核心研究主题与详细介绍。"
        actions={
          <Button asChild>
            <Link href="/admin/research/new">
              <Plus className="size-4" />
              新增研究方向
            </Link>
          </Button>
        }
      />
      <SavedAlert deleted={query.deleted === "1"} />
      <SearchToolbar query={query.q} status={query.status} />
      {rows.length ? (
        <ContentListTable
          rows={rows.map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: row.summary,
            status: row.status,
            featured: row.featured,
            sortOrder: row.sortOrder,
          }))}
          baseHref="/admin/research"
          deleteAction={deleteResearchAreaAction}
        />
      ) : (
        <EmptyState
          title="没有匹配的研究方向"
          description="调整筛选条件，或创建第一个研究方向。"
          action={
            <Button asChild>
              <Link href="/admin/research/new">新增研究方向</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
