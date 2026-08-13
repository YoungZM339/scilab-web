import { and, asc, desc, eq } from "drizzle-orm";
import {
  ArrowUpRight,
  BookOpen,
  Eye,
  FlaskConical,
  ImageIcon,
  Newspaper,
  Settings2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { FormField } from "@/components/admin/form-field";
import { MediaUpload } from "@/components/admin/media-upload";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateHomepageAction } from "@/server/actions/settings-pages";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  newsPosts,
  publications,
  researchAreas,
  siteSettings,
} from "@/server/db/schema";

const moduleHelp = [
  {
    title: "实验室动态",
    description: "最近发布的 4 条动态会出现在主页，最新一条会重点展示。",
    href: "/admin/news",
    action: "管理动态",
    icon: Newspaper,
  },
  {
    title: "研究方向",
    description: "选择希望重点介绍的研究方向，并调整它们的展示顺序。",
    href: "/admin/research",
    action: "管理方向",
    icon: FlaskConical,
  },
  {
    title: "最新成果",
    description: "选择希望重点介绍的成果，主页最多展示最新 4 项。",
    href: "/admin/publications",
    action: "管理成果",
    icon: BookOpen,
  },
  {
    title: "加入我们",
    description: "编辑招募标题和简介，向访问者介绍团队与加入机会。",
    href: "/admin/pages",
    action: "编辑页面",
    icon: Users,
  },
];

export default async function HomepageAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const [settings, featuredResearch, latestNews, featuredOutputs] =
    await Promise.all([
      db
        .select()
        .from(siteSettings)
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({
          id: researchAreas.id,
          title: researchAreas.title,
          status: researchAreas.status,
        })
        .from(researchAreas)
        .where(
          and(
            eq(researchAreas.featured, true),
            eq(researchAreas.status, "published"),
          ),
        )
        .orderBy(asc(researchAreas.sortOrder))
        .limit(6),
      db
        .select({
          id: newsPosts.id,
          title: newsPosts.title,
          status: newsPosts.status,
        })
        .from(newsPosts)
        .where(eq(newsPosts.status, "published"))
        .orderBy(desc(newsPosts.publishedAt), desc(newsPosts.createdAt))
        .limit(4),
      db
        .select({
          id: publications.id,
          title: publications.title,
          status: publications.status,
        })
        .from(publications)
        .where(
          and(
            eq(publications.featured, true),
            eq(publications.status, "published"),
          ),
        )
        .orderBy(desc(publications.year))
        .limit(4),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="主页管理"
        description="集中维护访客第一眼看到的内容，修改后可直接预览公开主页。"
        actions={
          <Button asChild variant="outline">
            <Link href="/" target="_blank">
              <Eye className="size-4" />
              预览主页
            </Link>
          </Button>
        }
      />
      <SavedAlert saved={query.saved === "1"} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card>
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-blue-50 text-[#0052d9]">
                <ImageIcon className="size-5" />
              </span>
              <div>
                <CardTitle>首页主视觉</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  设置主页大图及核心介绍；留空时会使用网站名称与简介。
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={updateHomepageAction} className="space-y-5">
              <FormField
                label="主标题"
                htmlFor="heroTitle"
                description="建议 10–24 个字，清晰表达实验室定位。"
              >
                <Input
                  id="heroTitle"
                  name="heroTitle"
                  maxLength={200}
                  defaultValue={settings?.heroTitle ?? ""}
                  placeholder={settings?.siteName ?? "科研实验室"}
                />
              </FormField>
              <FormField
                label="副标题"
                htmlFor="heroSubtitle"
                description="用一句话说明使命、研究重点或愿景。"
              >
                <Textarea
                  id="heroSubtitle"
                  name="heroSubtitle"
                  rows={3}
                  maxLength={500}
                  defaultValue={settings?.heroSubtitle ?? ""}
                />
              </FormField>
              <FormField
                label="主视觉图片"
                description="推荐使用清晰的横向图片；暂不上传也能正常展示。"
              >
                <MediaUpload
                  name="heroImageId"
                  initialId={settings?.heroImageId}
                  label="选择主视觉图片"
                />
              </FormField>
              <div className="flex justify-end border-t border-slate-100 pt-5">
                <SubmitButton>保存主视觉</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle>当前展示概览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <Overview
              label="近期动态"
              count={latestNews.length}
              total={4}
              href="/admin/news"
            />
            <Overview
              label="精选研究方向"
              count={featuredResearch.length}
              href="/admin/research"
            />
            <Overview
              label="精选成果"
              count={featuredOutputs.length}
              total={4}
              href="/admin/publications"
            />
            <div className="rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              主页只会展示已经发布的内容。需要重点展示研究方向或成果时，请开启“重点展示”。
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="homepage-modules">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="size-5 text-[#0052d9]" />
          <h2
            id="homepage-modules"
            className="text-lg font-semibold text-slate-950"
          >
            主页内容
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {moduleHelp.map(({ icon: Icon, ...item }) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex gap-4 rounded-lg border border-slate-200 bg-white p-5 transition hover:border-[#0052d9] hover:shadow-sm"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#0052d9]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="text-sm text-slate-950">{item.title}</strong>
                <span className="mt-1 block text-sm leading-6 text-slate-500">
                  {item.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0052d9]">
                  {item.action}
                  <ArrowUpRight className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Overview({
  label,
  count,
  total,
  href,
  note,
}: {
  label: string;
  count: number;
  total?: number;
  href: string;
  note?: string;
}) {
  const ready = total ? count >= total : count > 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {note || (ready ? "展示内容已就绪" : "建议补充展示内容")}
        </p>
      </div>
      <Link
        href={href}
        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-blue-50 hover:text-[#0052d9]"
      >
        <strong>{count}</strong>
        {total ? ` / ${total}` : " 项"}
      </Link>
    </div>
  );
}
