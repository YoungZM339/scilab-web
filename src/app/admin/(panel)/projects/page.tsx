import Link from "next/link";
import { and, asc, eq, like, or } from "drizzle-orm";
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
  projects,
  projectStatuses,
  type ProjectStatus,
} from "@/server/db/schema";
import { deleteProjectAction } from "@/server/actions/projects-publications";

const statusLabels: Record<ProjectStatus, string> = {
  ongoing: "进行中",
  completed: "已完成",
};

export default async function ProjectsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    projectStatus?: string;
    deleted?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const conditions = [];
  if (query.q)
    conditions.push(
      or(
        like(projects.title, `%${query.q}%`),
        like(projects.summary, `%${query.q}%`),
        like(projects.funding, `%${query.q}%`),
      )!,
    );
  if (query.status === "draft" || query.status === "published")
    conditions.push(eq(projects.status, query.status));
  if (projectStatuses.includes(query.projectStatus as ProjectStatus))
    conditions.push(
      eq(projects.projectStatus, query.projectStatus as ProjectStatus),
    );
  const rows = await db
    .select()
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(projects.sortOrder), asc(projects.title));
  return (
    <div className="space-y-6">
      <PageHeader
        title="项目"
        description="管理项目进展、参与成员、研究方向与资助信息。"
        actions={
          <Button asChild>
            <Link href="/admin/projects/new">
              <Plus className="size-4" />
              新增项目
            </Link>
          </Button>
        }
      />
      <SavedAlert deleted={query.deleted === "1"} />
      <SearchToolbar query={query.q} status={query.status}>
        <Select
          name="projectStatus"
          defaultValue={query.projectStatus ?? ""}
          className="sm:w-36"
        >
          <option value="">全部进展</option>
          {projectStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </Select>
      </SearchToolbar>
      {rows.length ? (
        <ContentListTable
          rows={rows.map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: `${statusLabels[row.projectStatus]}${row.funding ? ` · ${row.funding}` : ""}`,
            status: row.status,
            featured: row.featured,
            sortOrder: row.sortOrder,
          }))}
          baseHref="/admin/projects"
          deleteAction={deleteProjectAction}
        />
      ) : (
        <EmptyState
          title="没有匹配的项目"
          description="调整筛选条件，或创建第一个科研项目。"
          action={
            <Button asChild>
              <Link href="/admin/projects/new">新增项目</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
