import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { CommonContentFields } from "@/components/admin/content-fields";
import { FormField } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { MediaUpload } from "@/components/admin/media-upload";
import { PageHeader } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { SavedAlert } from "@/components/admin/saved-alert";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { newsPosts } from "@/server/db/schema";
import { saveNewsPostAction } from "@/server/actions/news-media-account";

export default async function NewsEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id: rawId } = await params;
  const id = rawId === "new" ? null : Number(rawId);
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) notFound();
  const item = id
    ? await db
        .select()
        .from(newsPosts)
        .where(eq(newsPosts.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !item) notFound();
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title={item ? `编辑动态：${item.title}` : "新增新闻动态"}
        description="发布后会按发布时间显示在新闻列表与首页。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form action={saveNewsPostAction.bind(null, id)} className="space-y-6">
        <FormSection title="动态内容">
          <CommonContentFields value={item} />
        </FormSection>
        <FormSection title="封面图片">
          <FormField label="封面">
            <MediaUpload
              name="coverMediaId"
              initialId={item?.coverMediaId}
              label="上传新闻封面"
            />
          </FormField>
        </FormSection>
        <SaveBar cancelHref="/admin/news">
          {item ? "保存动态" : "创建动态"}
        </SaveBar>
      </form>
    </div>
  );
}
