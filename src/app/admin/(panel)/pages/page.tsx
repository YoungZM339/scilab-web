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
import { pages } from "@/server/db/schema";
import { deletePageAction } from "@/server/actions/settings-pages";

export default async function PagesAdminPage({
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
        like(pages.title, `%${query.q}%`),
        like(pages.summary, `%${query.q}%`),
      )!,
    );
  if (query.status === "draft" || query.status === "published")
    conditions.push(eq(pages.status, query.status));
  const rows = await db
    .select()
    .from(pages)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(pages.sortOrder), asc(pages.title));
  return (
    <div className="space-y-6">
      <PageHeader
        title="固定页面"
        description="维护实验室介绍、加入我们和联系我们页面。"
        actions={
          <Button asChild>
            <Link href="/admin/pages/new">
              <Plus className="size-4" />
              新增页面
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
            subtitle: `${row.key} · /${row.slug}`,
            status: row.status,
            sortOrder: row.sortOrder,
          }))}
          baseHref="/admin/pages"
          deleteAction={deletePageAction}
        />
      ) : (
        <EmptyState
          title="没有匹配的固定页面"
          description="调整筛选条件，或创建尚未配置的固定页面。"
          action={
            <Button asChild>
              <Link href="/admin/pages/new">新增页面</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
