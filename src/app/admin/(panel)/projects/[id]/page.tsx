import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { CommonContentFields } from "@/components/admin/content-fields";
import { FormField, FormGrid } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { MediaUpload } from "@/components/admin/media-upload";
import { PageHeader } from "@/components/admin/page-header";
import { RelationChecklist } from "@/components/admin/relation-checklist";
import { SaveBar } from "@/components/admin/save-bar";
import { SavedAlert } from "@/components/admin/saved-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  members,
  projectMembers,
  projectResearchAreas,
  projects,
  researchAreas,
} from "@/server/db/schema";
import { saveProjectAction } from "@/server/actions/projects-publications";

export default async function ProjectEditor({
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
  const [item, allMembers, allAreas, selectedMembers, selectedAreas] =
    await Promise.all([
      id
        ? db
            .select()
            .from(projects)
            .where(eq(projects.id, id))
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
        .select({ id: researchAreas.id, title: researchAreas.title })
        .from(researchAreas)
        .orderBy(asc(researchAreas.sortOrder), asc(researchAreas.title)),
      id
        ? db
            .select({ id: projectMembers.memberId })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, id))
            .orderBy(asc(projectMembers.sortOrder))
        : Promise.resolve([]),
      id
        ? db
            .select({ id: projectResearchAreas.researchAreaId })
            .from(projectResearchAreas)
            .where(eq(projectResearchAreas.projectId, id))
            .orderBy(asc(projectResearchAreas.sortOrder))
        : Promise.resolve([]),
    ]);
  if (id && !item) notFound();
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title={item ? `编辑项目：${item.title}` : "新增项目"}
        description="关联成员与研究方向后，公开详情页会自动展示相关内容。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form action={saveProjectAction.bind(null, id)} className="space-y-6">
        <FormSection title="项目内容">
          <CommonContentFields value={item} />
        </FormSection>
        <FormSection title="项目信息">
          <FormGrid>
            <FormField label="项目进展" htmlFor="projectStatus" required>
              <Select
                id="projectStatus"
                name="projectStatus"
                defaultValue={item?.projectStatus ?? "ongoing"}
              >
                <option value="ongoing">进行中</option>
                <option value="completed">已完成</option>
              </Select>
            </FormField>
            <FormField label="资助信息" htmlFor="funding">
              <Input
                id="funding"
                name="funding"
                maxLength={500}
                defaultValue={item?.funding ?? ""}
              />
            </FormField>
            <FormField label="开始日期" htmlFor="startDate">
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={item?.startDate ?? ""}
              />
            </FormField>
            <FormField label="结束日期" htmlFor="endDate">
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={item?.endDate ?? ""}
              />
            </FormField>
          </FormGrid>
          <FormField label="项目外部链接" htmlFor="externalUrl">
            <Input
              id="externalUrl"
              name="externalUrl"
              type="url"
              defaultValue={item?.externalUrl ?? ""}
              placeholder="https://"
            />
          </FormField>
          <FormField label="封面图片">
            <MediaUpload
              name="coverMediaId"
              initialId={item?.coverMediaId}
              label="上传项目封面"
            />
          </FormField>
        </FormSection>
        <FormSection
          title="内容关联"
          description="勾选与项目直接相关的成员和研究方向。"
        >
          <FormField label="参与成员">
            <RelationChecklist
              name="memberIds"
              options={allMembers.map((member) => ({
                id: member.id,
                label: member.name,
                meta: member.roleTitle,
              }))}
              selected={selectedMembers.map((row) => row.id)}
              emptyText="请先在成员模块添加成员。"
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
              emptyText="请先添加研究方向。"
            />
          </FormField>
        </FormSection>
        <SaveBar cancelHref="/admin/projects">
          {item ? "保存项目" : "创建项目"}
        </SaveBar>
      </form>
    </div>
  );
}
