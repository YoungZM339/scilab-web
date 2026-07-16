import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";
import { Plus } from "lucide-react";

import { ContentListTable } from "@/components/admin/content-list-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SearchToolbar } from "@/components/admin/search-toolbar";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { newsPosts } from "@/server/db/schema";
import { deleteNewsPostAction } from "@/server/actions/news-media-account";

export default async function NewsAdminPage({
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
        like(newsPosts.title, `%${query.q}%`),
        like(newsPosts.summary, `%${query.q}%`),
      )!,
    );
  if (query.status === "draft" || query.status === "published")
    conditions.push(eq(newsPosts.status, query.status));
  const rows = await db
    .select()
    .from(newsPosts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(newsPosts.publishedAt), desc(newsPosts.createdAt));
  return (
    <div className="space-y-6">
      <PageHeader
        title="新闻动态"
        description="发布实验室新闻、通知和学术动态。"
        actions={
          <Button asChild>
            <Link href="/admin/news/new">
              <Plus className="size-4" />
              新增动态
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
          baseHref="/admin/news"
          deleteAction={deleteNewsPostAction}
        />
      ) : (
        <EmptyState
          title="没有匹配的新闻动态"
          description="调整筛选条件，或发布第一条实验室动态。"
          action={
            <Button asChild>
              <Link href="/admin/news/new">新增动态</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
