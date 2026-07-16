import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { FormField, FormGrid } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { MediaUpload } from "@/components/admin/media-upload";
import { PageHeader } from "@/components/admin/page-header";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SaveBar } from "@/components/admin/save-bar";
import { SavedAlert } from "@/components/admin/saved-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { memberGroups, members, type MemberGroup } from "@/server/db/schema";
import { saveMemberAction } from "@/server/actions/people-research";

const groupLabels: Record<MemberGroup, string> = {
  principal_investigator: "负责人",
  faculty: "教师",
  postdoc_researcher: "博士后 / 研究人员",
  student: "学生",
  alumni: "校友",
};

export default async function MemberEditor({
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
        .from(members)
        .where(eq(members.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !item) notFound();
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title={item ? `编辑成员：${item.name}` : "新增成员"}
        description="已发布成员会出现在公开成员页面；精选成员可显示在首页。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form action={saveMemberAction.bind(null, id)} className="space-y-6">
        <FormSection title="基本资料">
          <FormGrid>
            <FormField label="姓名" htmlFor="name" required>
              <Input
                id="name"
                name="name"
                required
                maxLength={120}
                defaultValue={item?.name ?? ""}
              />
            </FormField>
            <FormField
              label="页面路径"
              htmlFor="slug"
              description="留空时根据姓名生成；发布后不会随姓名自动变化。"
            >
              <Input
                id="slug"
                name="slug"
                maxLength={160}
                defaultValue={item?.slug ?? ""}
              />
            </FormField>
            <FormField label="成员分组" htmlFor="group" required>
              <Select
                id="group"
                name="group"
                defaultValue={item?.group ?? "student"}
              >
                {memberGroups.map((group) => (
                  <option key={group} value={group}>
                    {groupLabels[group]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="职位 / 身份" htmlFor="roleTitle">
              <Input
                id="roleTitle"
                name="roleTitle"
                maxLength={200}
                defaultValue={item?.roleTitle ?? ""}
                placeholder="例如：教授、博士研究生"
              />
            </FormField>
          </FormGrid>
          <FormField label="头像">
            <MediaUpload
              name="avatarMediaId"
              initialId={item?.avatarMediaId}
              label="上传头像"
            />
          </FormField>
        </FormSection>
        <FormSection title="联系方式">
          <FormGrid>
            <FormField label="邮箱" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                maxLength={254}
                defaultValue={item?.email ?? ""}
              />
            </FormField>
            <FormField label="电话" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                maxLength={80}
                defaultValue={item?.phone ?? ""}
              />
            </FormField>
            <FormField label="个人主页" htmlFor="website">
              <Input
                id="website"
                name="website"
                type="url"
                defaultValue={item?.website ?? ""}
                placeholder="https://"
              />
            </FormField>
            <FormField label="ORCID" htmlFor="orcid">
              <Input
                id="orcid"
                name="orcid"
                defaultValue={item?.orcid ?? ""}
                placeholder="0000-0000-0000-0000"
              />
            </FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="个人简介">
          <FormField label="简介正文">
            <RichTextEditor name="bioJson" initialContent={item?.bioJson} />
          </FormField>
        </FormSection>
        <FormSection title="发布设置">
          <FormGrid>
            <FormField label="发布状态" htmlFor="status">
              <Select
                id="status"
                name="status"
                defaultValue={item?.status ?? "draft"}
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </Select>
            </FormField>
            <FormField
              label="排序"
              htmlFor="sortOrder"
              description="数值越小越靠前。"
            >
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={item?.sortOrder ?? 0}
              />
            </FormField>
          </FormGrid>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={item?.featured ?? false}
              className="size-4"
            />
            在首页精选展示
          </label>
        </FormSection>
        <SaveBar cancelHref="/admin/people">
          {item ? "保存成员" : "创建成员"}
        </SaveBar>
      </form>
    </div>
  );
}
