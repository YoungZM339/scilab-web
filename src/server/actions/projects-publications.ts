"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  auditLogs,
  members,
  projectMembers,
  projectResearchAreas,
  projects,
  projectStatuses,
  publicationMembers,
  publicationProjects,
  publicationResearchAreas,
  publications,
  publicationTypes,
  researchAreas,
} from "@/server/db/schema";

import {
  booleanValue,
  idList,
  integerValue,
  logAudit,
  optionalInteger,
  optionalString,
  parseRichText,
  publishedAt,
  publishStatusSchema,
  requiredString,
  uniqueSlug,
} from "./shared";

async function assertRelationIds(
  memberIds: number[],
  researchAreaIds: number[],
  projectIds: number[] = [],
) {
  const [memberRows, areaRows, projectRows] = await Promise.all([
    memberIds.length
      ? db
          .select({ id: members.id })
          .from(members)
          .where(inArray(members.id, memberIds))
      : Promise.resolve([]),
    researchAreaIds.length
      ? db
          .select({ id: researchAreas.id })
          .from(researchAreas)
          .where(inArray(researchAreas.id, researchAreaIds))
      : Promise.resolve([]),
    projectIds.length
      ? db
          .select({ id: projects.id })
          .from(projects)
          .where(inArray(projects.id, projectIds))
      : Promise.resolve([]),
  ]);

  if (memberRows.length !== memberIds.length) throw new Error("关联成员不存在");
  if (areaRows.length !== researchAreaIds.length)
    throw new Error("关联研究方向不存在");
  if (projectRows.length !== projectIds.length)
    throw new Error("关联项目不存在");
}

function optionalWebUrl(formData: FormData, name: string) {
  const value = optionalString(formData, name, 2048);
  if (
    value &&
    (!z.url().safeParse(value).success || !/^https?:\/\//i.test(value))
  ) {
    throw new Error(`${name} 必须是完整的 http(s) 地址`);
  }
  return value;
}

function optionalDate(formData: FormData, name: string) {
  const value = optionalString(formData, name, 10);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`${name} 日期格式无效`);
  return value;
}

export async function saveProjectAction(id: number | null, formData: FormData) {
  const session = await requireAdmin();
  const title = requiredString(formData, "title", 200);
  const status = publishStatusSchema.parse(formData.get("status"));
  const projectStatus = z
    .enum(projectStatuses)
    .parse(formData.get("projectStatus"));
  const current = id
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !current) throw new Error("项目不存在");
  const requestedSlug =
    optionalString(formData, "slug", 160) ?? (current?.slug || title);
  const slug = await uniqueSlug(requestedSlug, title, async (candidate) => {
    const condition = id
      ? and(eq(projects.slug, candidate), ne(projects.id, id))
      : eq(projects.slug, candidate);
    return Boolean(
      await db
        .select({ id: projects.id })
        .from(projects)
        .where(condition)
        .limit(1)
        .then((rows) => rows[0]),
    );
  });
  const startDate = optionalDate(formData, "startDate");
  const endDate = optionalDate(formData, "endDate");
  if (startDate && endDate && endDate < startDate)
    throw new Error("结束日期不能早于开始日期");
  const values = {
    title,
    slug,
    summary: optionalString(formData, "summary", 1000),
    contentJson: parseRichText(formData.get("contentJson")),
    projectStatus,
    status,
    coverMediaId: optionalInteger(formData, "coverMediaId"),
    startDate,
    endDate,
    funding: optionalString(formData, "funding", 500),
    externalUrl: optionalWebUrl(formData, "externalUrl"),
    featured: booleanValue(formData, "featured"),
    sortOrder: integerValue(formData, "sortOrder"),
    publishedAt: publishedAt(status, current?.publishedAt),
  };
  const memberIds = idList(formData, "memberIds");
  const researchAreaIds = idList(formData, "researchAreaIds");
  await assertRelationIds(memberIds, researchAreaIds);

  const entityId = db.transaction((tx) => {
    const savedId = id
      ? (tx.update(projects).set(values).where(eq(projects.id, id)).run(), id)
      : tx.insert(projects).values(values).returning({ id: projects.id }).get()
          .id;

    tx.delete(projectMembers)
      .where(eq(projectMembers.projectId, savedId))
      .run();
    tx.delete(projectResearchAreas)
      .where(eq(projectResearchAreas.projectId, savedId))
      .run();
    if (memberIds.length) {
      tx.insert(projectMembers)
        .values(
          memberIds.map((memberId, sortOrder) => ({
            projectId: savedId,
            memberId,
            sortOrder,
          })),
        )
        .run();
    }
    if (researchAreaIds.length) {
      tx.insert(projectResearchAreas)
        .values(
          researchAreaIds.map((researchAreaId, sortOrder) => ({
            projectId: savedId,
            researchAreaId,
            sortOrder,
          })),
        )
        .run();
    }
    tx.insert(auditLogs)
      .values({
        userId: session.user.id,
        action: id ? "update" : "create",
        entityType: "project",
        entityId: String(savedId),
        detailsJson: { status, projectStatus, memberIds, researchAreaIds },
      })
      .run();
    return savedId;
  });
  revalidateTag("projects", "max");
  revalidateTag("publications", "max");
  revalidateTag("members", "max");
  revalidateTag("research-areas", "max");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
  if (current?.slug && current.slug !== slug)
    revalidatePath(`/projects/${current.slug}`);
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${entityId}?saved=1`);
}

export async function deleteProjectAction(id: number) {
  const session = await requireAdmin();
  const [item] = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!item) return;
  await db.delete(projects).where(eq(projects.id, id));
  await logAudit(session.user.id, "delete", "project", id);
  revalidateTag("projects", "max");
  revalidateTag("publications", "max");
  revalidateTag("members", "max");
  revalidateTag("research-areas", "max");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${item.slug}`);
  revalidatePath("/publications");
  redirect("/admin/projects?deleted=1");
}

export async function savePublicationAction(
  id: number | null,
  formData: FormData,
) {
  const session = await requireAdmin();
  const title = requiredString(formData, "title", 500);
  const authors = requiredString(formData, "authors", 3000);
  const year = integerValue(formData, "year", new Date().getFullYear());
  if (year < 1900 || year > 2200) throw new Error("发表年份无效");
  const type = z.enum(publicationTypes).parse(formData.get("type"));
  const status = publishStatusSchema.parse(formData.get("status"));
  const current = id
    ? await db
        .select()
        .from(publications)
        .where(eq(publications.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !current) throw new Error("论文成果不存在");
  const rawDoi = optionalString(formData, "doi", 300);
  const doi =
    rawDoi?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim() ?? null;
  if (doi && !/^10\.\d{4,9}\/\S+$/i.test(doi)) throw new Error("DOI 格式无效");
  if (doi) {
    const duplicateCondition = id
      ? and(eq(publications.doi, doi), ne(publications.id, id))
      : eq(publications.doi, doi);
    if (
      await db
        .select({ id: publications.id })
        .from(publications)
        .where(duplicateCondition)
        .limit(1)
        .then((rows) => rows[0])
    ) {
      throw new Error("该 DOI 已存在");
    }
  }
  const values = {
    title,
    authors,
    year,
    type,
    venue: optionalString(formData, "venue", 500),
    volume: optionalString(formData, "volume", 80),
    issue: optionalString(formData, "issue", 80),
    pages: optionalString(formData, "pages", 80),
    doi,
    externalUrl: optionalWebUrl(formData, "externalUrl"),
    pdfMediaId: optionalInteger(formData, "pdfMediaId"),
    abstract: optionalString(formData, "abstract", 10_000),
    status,
    featured: booleanValue(formData, "featured"),
    sortOrder: integerValue(formData, "sortOrder"),
    publishedAt: publishedAt(status, current?.publishedAt),
  };
  const memberIds = idList(formData, "memberIds");
  const projectIds = idList(formData, "projectIds");
  const researchAreaIds = idList(formData, "researchAreaIds");
  await assertRelationIds(memberIds, researchAreaIds, projectIds);

  const entityId = db.transaction((tx) => {
    const savedId = id
      ? (tx
          .update(publications)
          .set(values)
          .where(eq(publications.id, id))
          .run(),
        id)
      : tx
          .insert(publications)
          .values(values)
          .returning({ id: publications.id })
          .get().id;

    tx.delete(publicationMembers)
      .where(eq(publicationMembers.publicationId, savedId))
      .run();
    tx.delete(publicationProjects)
      .where(eq(publicationProjects.publicationId, savedId))
      .run();
    tx.delete(publicationResearchAreas)
      .where(eq(publicationResearchAreas.publicationId, savedId))
      .run();
    if (memberIds.length) {
      tx.insert(publicationMembers)
        .values(
          memberIds.map((memberId, sortOrder) => ({
            publicationId: savedId,
            memberId,
            sortOrder,
          })),
        )
        .run();
    }
    if (projectIds.length) {
      tx.insert(publicationProjects)
        .values(
          projectIds.map((projectId, sortOrder) => ({
            publicationId: savedId,
            projectId,
            sortOrder,
          })),
        )
        .run();
    }
    if (researchAreaIds.length) {
      tx.insert(publicationResearchAreas)
        .values(
          researchAreaIds.map((researchAreaId, sortOrder) => ({
            publicationId: savedId,
            researchAreaId,
            sortOrder,
          })),
        )
        .run();
    }
    tx.insert(auditLogs)
      .values({
        userId: session.user.id,
        action: id ? "update" : "create",
        entityType: "publication",
        entityId: String(savedId),
        detailsJson: {
          status,
          year,
          type,
          memberIds,
          projectIds,
          researchAreaIds,
        },
      })
      .run();
    return savedId;
  });
  revalidateTag("publications", "max");
  revalidateTag("projects", "max");
  revalidateTag("members", "max");
  revalidateTag("research-areas", "max");
  revalidatePath("/");
  revalidatePath("/publications");
  revalidatePath("/admin/publications");
  redirect(`/admin/publications/${entityId}?saved=1`);
}

export async function deletePublicationAction(id: number) {
  const session = await requireAdmin();
  await db.delete(publications).where(eq(publications.id, id));
  await logAudit(session.user.id, "delete", "publication", id);
  revalidateTag("publications", "max");
  revalidateTag("projects", "max");
  revalidateTag("members", "max");
  revalidateTag("research-areas", "max");
  revalidatePath("/");
  revalidatePath("/publications");
  redirect("/admin/publications?deleted=1");
}
