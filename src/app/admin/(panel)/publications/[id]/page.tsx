import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { FormField, FormGrid } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { MediaUpload } from "@/components/admin/media-upload";
import { PageHeader } from "@/components/admin/page-header";
import { RelationChecklist } from "@/components/admin/relation-checklist";
import { SaveBar } from "@/components/admin/save-bar";
import { SavedAlert } from "@/components/admin/saved-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  members,
  projects,
  publicationMembers,
  publicationProjects,
  publicationResearchAreas,
  publications,
  publicationTypes,
  researchAreas,
  type PublicationType,
} from "@/server/db/schema";
import { savePublicationAction } from "@/server/actions/projects-publications";

const typeLabels: Record<PublicationType, string> = {
  journal: "期刊论文",
  conference: "会议论文",
  book_chapter: "专著章节",
  patent: "专利",
  software: "软件",
  other: "其他成果",
};

export default async function PublicationEditor({
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
  const [
    item,
    allMembers,
    allProjects,
    allAreas,
    selectedMembers,
    selectedProjects,
    selectedAreas,
  ] = await Promise.all([
    id
      ? db
          .select()
          .from(publications)
          .where(eq(publications.id, id))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    db
      .select({
        id: members.id,
        name: members.name,
        roleTitle: members.roleTitle,
      })
      .from(members)
      .orderBy(asc(members.sortOrder), asc(members.name)),
    db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .orderBy(asc(projects.sortOrder), asc(projects.title)),
    db
      .select({ id: researchAreas.id, title: researchAreas.title })
      .from(researchAreas)
      .orderBy(asc(researchAreas.sortOrder), asc(researchAreas.title)),
    id
      ? db
          .select({ id: publicationMembers.memberId })
          .from(publicationMembers)
          .where(eq(publicationMembers.publicationId, id))
          .orderBy(asc(publicationMembers.sortOrder))
      : Promise.resolve([]),
    id
      ? db
          .select({ id: publicationProjects.projectId })
          .from(publicationProjects)
          .where(eq(publicationProjects.publicationId, id))
          .orderBy(asc(publicationProjects.sortOrder))
      : Promise.resolve([]),
    id
      ? db
          .select({ id: publicationResearchAreas.researchAreaId })
          .from(publicationResearchAreas)
          .where(eq(publicationResearchAreas.publicationId, id))
          .orderBy(asc(publicationResearchAreas.sortOrder))
      : Promise.resolve([]),
  ]);
  if (id && !item) notFound();
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title={item ? "编辑论文成果" : "新增论文成果"}
        description="作者字段按论文署名原样保存；关联成员仅用于站内交叉展示。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form action={savePublicationAction.bind(null, id)} className="space-y-6">
        <FormSection title="文献信息">
          <FormField label="标题" htmlFor="title" required>
            <Textarea
              id="title"
              name="title"
              rows={3}
              required
              maxLength={500}
              defaultValue={item?.title ?? ""}
            />
          </FormField>
          <FormField
            label="作者"
            htmlFor="authors"
            required
            description="请保留论文原始作者顺序与拼写。"
          >
            <Textarea
              id="authors"
              name="authors"
              rows={3}
              required
              maxLength={3000}
              defaultValue={item?.authors ?? ""}
            />
          </FormField>
          <FormGrid>
            <FormField label="年份" htmlFor="year" required>
              <Input
                id="year"
                name="year"
                type="number"
                min={1900}
                max={2200}
                required
                defaultValue={item?.year ?? new Date().getFullYear()}
              />
            </FormField>
            <FormField label="成果类型" htmlFor="type" required>
              <Select
                id="type"
                name="type"
                defaultValue={item?.type ?? "journal"}
              >
                {publicationTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormGrid>
          <FormField label="期刊 / 会议 / 发布机构" htmlFor="venue">
            <Input
              id="venue"
              name="venue"
              maxLength={500}
              defaultValue={item?.venue ?? ""}
            />
          </FormField>
          <FormGrid>
            <FormField label="卷" htmlFor="volume">
              <Input
                id="volume"
                name="volume"
                maxLength={80}
                defaultValue={item?.volume ?? ""}
              />
            </FormField>
            <FormField label="期" htmlFor="issue">
              <Input
                id="issue"
                name="issue"
                maxLength={80}
                defaultValue={item?.issue ?? ""}
              />
            </FormField>
            <FormField label="页码" htmlFor="pages">
              <Input
                id="pages"
                name="pages"
                maxLength={80}
                defaultValue={item?.pages ?? ""}
              />
            </FormField>
            <FormField label="DOI" htmlFor="doi">
              <Input
                id="doi"
                name="doi"
                maxLength={300}
                defaultValue={item?.doi ?? ""}
                placeholder="10.xxxx/xxxxx"
              />
            </FormField>
          </FormGrid>
          <FormField label="外部链接" htmlFor="externalUrl">
            <Input
              id="externalUrl"
              name="externalUrl"
              type="url"
              defaultValue={item?.externalUrl ?? ""}
              placeholder="https://"
            />
          </FormField>
          <FormField label="摘要" htmlFor="abstract">
            <Textarea
              id="abstract"
              name="abstract"
              rows={7}
              maxLength={10000}
              defaultValue={item?.abstract ?? ""}
            />
          </FormField>
          <FormField label="论文 PDF">
            <MediaUpload
              name="pdfMediaId"
              initialId={item?.pdfMediaId}
              accept="application/pdf"
              label="上传 PDF"
            />
          </FormField>
        </FormSection>
        <FormSection title="站内关联">
          <FormField label="实验室成员">
            <RelationChecklist
              name="memberIds"
              options={allMembers.map((member) => ({
                id: member.id,
                label: member.name,
                meta: member.roleTitle,
              }))}
              selected={selectedMembers.map((row) => row.id)}
            />
          </FormField>
          <FormField label="相关项目">
            <RelationChecklist
              name="projectIds"
              options={allProjects.map((project) => ({
                id: project.id,
                label: project.title,
              }))}
              selected={selectedProjects.map((row) => row.id)}
            />
          </FormField>
          <FormField label="研究方向">
            <RelationChecklist
              name="researchAreaIds"
              options={allAreas.map((area) => ({
                id: area.id,
                label: area.title,
              }))}
              selected={selectedAreas.map((row) => row.id)}
            />
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
            <FormField label="排序" htmlFor="sortOrder">
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
        <SaveBar cancelHref="/admin/publications">
          {item ? "保存成果" : "创建成果"}
        </SaveBar>
      </form>
    </div>
  );
}
