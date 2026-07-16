import Link from "next/link";
import { count, desc } from "drizzle-orm";
import {
  BookOpen,
  FilePlus2,
  FlaskConical,
  FolderKanban,
  Images,
  Newspaper,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  auditLogs,
  mediaAssets,
  members,
  newsPosts,
  projects,
  publications,
  researchAreas,
} from "@/server/db/schema";

const actionLabels: Record<string, string> = {
  create: "创建",
  update: "更新",
  delete: "删除",
  change_password: "修改密码",
};

const entityLabels: Record<string, string> = {
  member: "成员",
  research_area: "研究方向",
  project: "项目",
  publication: "论文成果",
  news_post: "新闻",
  page: "固定页面",
  site_settings: "站点设置",
  media_asset: "媒体文件",
  admin_account: "管理员账户",
};

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [
    memberStats,
    researchStats,
    projectStats,
    publicationStats,
    newsStats,
    mediaStats,
    recentLogs,
  ] = await Promise.all([
    db
      .select({ total: count(), published: count(members.publishedAt) })
      .from(members),
    db
      .select({ total: count(), published: count(researchAreas.publishedAt) })
      .from(researchAreas),
    db
      .select({ total: count(), published: count(projects.publishedAt) })
      .from(projects),
    db
      .select({ total: count(), published: count(publications.publishedAt) })
      .from(publications),
    db
      .select({ total: count(), published: count(newsPosts.publishedAt) })
      .from(newsPosts),
    db.select({ total: count() }).from(mediaAssets),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
  ]);
  const stats = [
    { label: "成员", href: "/admin/people", icon: Users, ...memberStats[0] },
    {
      label: "研究方向",
      href: "/admin/research",
      icon: FlaskConical,
      ...researchStats[0],
    },
    {
      label: "项目",
      href: "/admin/projects",
      icon: FolderKanban,
      ...projectStats[0],
    },
    {
      label: "论文成果",
      href: "/admin/publications",
      icon: BookOpen,
      ...publicationStats[0],
    },
    { label: "新闻", href: "/admin/news", icon: Newspaper, ...newsStats[0] },
    {
      label: "媒体文件",
      href: "/admin/media",
      icon: Images,
      total: mediaStats[0].total,
      published: null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="仪表盘"
        description="查看内容状态并快速进入常用管理任务。"
        actions={
          <Button asChild>
            <Link href="/admin/news/new">
              <FilePlus2 className="size-4" />
              发布动态
            </Link>
          </Button>
        }
      />
      <section
        aria-label="内容统计"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-700">
                  <Icon className="size-5" />
                </span>
                {stat.published !== null ? (
                  <span className="text-xs text-slate-500">
                    已发布 {stat.published}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                {stat.total}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </Link>
          );
        })}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>最近操作</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length ? (
              <ol className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="text-slate-700">
                      {actionLabels[log.action] ?? log.action}{" "}
                      {entityLabels[log.entityType] ?? log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </span>
                    <time
                      className="shrink-0 text-xs text-slate-400"
                      dateTime={log.createdAt.toISOString()}
                    >
                      {new Intl.DateTimeFormat("zh-CN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(log.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                暂无操作记录。
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>快速入口</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {[
              ["新增成员", "/admin/people/new"],
              ["新增研究方向", "/admin/research/new"],
              ["新增项目", "/admin/projects/new"],
              ["新增论文成果", "/admin/publications/new"],
              ["管理站点信息", "/admin/settings"],
            ].map(([label, href]) => (
              <Button
                key={href}
                asChild
                variant="outline"
                className="justify-start"
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
