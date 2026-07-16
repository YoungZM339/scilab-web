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
import { researchAreas } from "@/server/db/schema";
import { saveResearchAreaAction } from "@/server/actions/people-research";

export default async function ResearchEditor({
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
        .from(researchAreas)
        .where(eq(researchAreas.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !item) notFound();
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title={item ? `编辑：${item.title}` : "新增研究方向"}
        description="发布后会显示在研究方向列表与独立详情页面。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form
        action={saveResearchAreaAction.bind(null, id)}
        className="space-y-6"
      >
        <FormSection title="研究方向内容">
          <CommonContentFields value={item} />
        </FormSection>
        <FormSection title="封面图片">
          <FormField label="封面">
            <MediaUpload
              name="coverMediaId"
              initialId={item?.coverMediaId}
              label="上传封面图片"
            />
          </FormField>
        </FormSection>
        <SaveBar cancelHref="/admin/research">
          {item ? "保存研究方向" : "创建研究方向"}
        </SaveBar>
      </form>
    </div>
  );
}
