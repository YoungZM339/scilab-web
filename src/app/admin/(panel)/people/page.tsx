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
import { memberGroups, members, type MemberGroup } from "@/server/db/schema";
import { deleteMemberAction } from "@/server/actions/people-research";

const groupLabels: Record<MemberGroup, string> = {
  principal_investigator: "负责人",
  faculty: "教师",
  postdoc_researcher: "博士后 / 研究人员",
  student: "学生",
  alumni: "校友",
};

export default async function PeopleAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    group?: string;
    deleted?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const conditions = [];
  if (query.q)
    conditions.push(
      or(
        like(members.name, `%${query.q}%`),
        like(members.roleTitle, `%${query.q}%`),
      )!,
    );
  if (query.status === "draft" || query.status === "published")
    conditions.push(eq(members.status, query.status));
  if (memberGroups.includes(query.group as MemberGroup))
    conditions.push(eq(members.group, query.group as MemberGroup));
  const rows = await db
    .select()
    .from(members)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(members.sortOrder), asc(members.name));
  return (
    <div className="space-y-6">
      <PageHeader
        title="成员"
        description="管理负责人、教师、研究人员、学生与校友资料。"
        actions={
          <Button asChild>
            <Link href="/admin/people/new">
              <Plus className="size-4" />
              新增成员
            </Link>
          </Button>
        }
      />
      <SavedAlert deleted={query.deleted === "1"} />
      <SearchToolbar query={query.q} status={query.status}>
        <Select
          name="group"
          defaultValue={query.group ?? ""}
          className="sm:w-48"
        >
          <option value="">全部分组</option>
          {memberGroups.map((group) => (
            <option key={group} value={group}>
              {groupLabels[group]}
            </option>
          ))}
        </Select>
      </SearchToolbar>
      {rows.length ? (
        <ContentListTable
          rows={rows.map((row) => ({
            id: row.id,
            title: row.name,
            subtitle: `${groupLabels[row.group]}${row.roleTitle ? ` · ${row.roleTitle}` : ""}`,
            status: row.status,
            featured: row.featured,
            sortOrder: row.sortOrder,
          }))}
          baseHref="/admin/people"
          deleteAction={deleteMemberAction}
        />
      ) : (
        <EmptyState
          title="没有匹配的成员"
          description="调整筛选条件，或添加第一位实验室成员。"
          action={
            <Button asChild>
              <Link href="/admin/people/new">新增成员</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
