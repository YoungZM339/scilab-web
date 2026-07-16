"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { memberGroups, members, researchAreas } from "@/server/db/schema";

import {
  booleanValue,
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

export async function saveMemberAction(id: number | null, formData: FormData) {
  const session = await requireAdmin();
  const name = requiredString(formData, "name", 120);
  const status = publishStatusSchema.parse(formData.get("status"));
  const group = z.enum(memberGroups).parse(formData.get("group"));
  const current = id
    ? await db
        .select()
        .from(members)
        .where(eq(members.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !current) throw new Error("成员不存在");
  const requestedSlug =
    optionalString(formData, "slug", 160) ?? (current?.slug || name);
  const slug = await uniqueSlug(requestedSlug, name, async (candidate) => {
    const condition = id
      ? and(eq(members.slug, candidate), ne(members.id, id))
      : eq(members.slug, candidate);
    return Boolean(
      await db
        .select({ id: members.id })
        .from(members)
        .where(condition)
        .limit(1)
        .then((rows) => rows[0]),
    );
  });
  const email = optionalString(formData, "email", 254);
  if (email && !z.email().safeParse(email).success)
    throw new Error("邮箱格式无效");
  const orcid = optionalString(formData, "orcid", 40);
  if (orcid && !/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(orcid))
    throw new Error("ORCID 格式无效");

  const values = {
    name,
    slug,
    roleTitle: optionalString(formData, "roleTitle", 200),
    group,
    email,
    phone: optionalString(formData, "phone", 80),
    website: optionalWebUrl(formData, "website"),
    orcid,
    bioJson: parseRichText(formData.get("bioJson")),
    avatarMediaId: optionalInteger(formData, "avatarMediaId"),
    status,
    featured: booleanValue(formData, "featured"),
    sortOrder: integerValue(formData, "sortOrder"),
    publishedAt: publishedAt(status, current?.publishedAt),
  };

  let entityId: number;
  if (id) {
    await db.update(members).set(values).where(eq(members.id, id));
    entityId = id;
  } else {
    const [created] = await db
      .insert(members)
      .values(values)
      .returning({ id: members.id });
    entityId = created.id;
  }
  await logAudit(
    session.user.id,
    id ? "update" : "create",
    "member",
    entityId,
    { status, group },
  );
  revalidateTag("members", "max");
  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath(`/people/${slug}`);
  if (current?.slug && current.slug !== slug)
    revalidatePath(`/people/${current.slug}`);
  revalidatePath("/admin/people");
  redirect(`/admin/people/${entityId}?saved=1`);
}

export async function deleteMemberAction(id: number) {
  const session = await requireAdmin();
  const [item] = await db
    .select({ slug: members.slug })
    .from(members)
    .where(eq(members.id, id))
    .limit(1);
  if (!item) return;
  await db.delete(members).where(eq(members.id, id));
  await logAudit(session.user.id, "delete", "member", id);
  revalidateTag("members", "max");
  revalidateTag("projects", "max");
  revalidateTag("publications", "max");
  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath(`/people/${item.slug}`);
  redirect("/admin/people?deleted=1");
}

export async function saveResearchAreaAction(
  id: number | null,
  formData: FormData,
) {
  const session = await requireAdmin();
  const title = requiredString(formData, "title", 200);
  const status = publishStatusSchema.parse(formData.get("status"));
  const current = id
    ? await db
        .select()
        .from(researchAreas)
        .where(eq(researchAreas.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !current) throw new Error("研究方向不存在");
  const requestedSlug =
    optionalString(formData, "slug", 160) ?? (current?.slug || title);
  const slug = await uniqueSlug(requestedSlug, title, async (candidate) => {
    const condition = id
      ? and(eq(researchAreas.slug, candidate), ne(researchAreas.id, id))
      : eq(researchAreas.slug, candidate);
    return Boolean(
      await db
        .select({ id: researchAreas.id })
        .from(researchAreas)
        .where(condition)
        .limit(1)
        .then((rows) => rows[0]),
    );
  });
  const values = {
    title,
    slug,
    summary: optionalString(formData, "summary", 1000),
    contentJson: parseRichText(formData.get("contentJson")),
    coverMediaId: optionalInteger(formData, "coverMediaId"),
    status,
    featured: booleanValue(formData, "featured"),
    sortOrder: integerValue(formData, "sortOrder"),
    publishedAt: publishedAt(status, current?.publishedAt),
  };

  let entityId: number;
  if (id) {
    await db.update(researchAreas).set(values).where(eq(researchAreas.id, id));
    entityId = id;
  } else {
    const [created] = await db
      .insert(researchAreas)
      .values(values)
      .returning({ id: researchAreas.id });
    entityId = created.id;
  }
  await logAudit(
    session.user.id,
    id ? "update" : "create",
    "research_area",
    entityId,
    { status },
  );
  revalidateTag("research-areas", "max");
  revalidatePath("/");
  revalidatePath("/research");
  revalidatePath(`/research/${slug}`);
  if (current?.slug && current.slug !== slug)
    revalidatePath(`/research/${current.slug}`);
  revalidatePath("/admin/research");
  redirect(`/admin/research/${entityId}?saved=1`);
}

export async function deleteResearchAreaAction(id: number) {
  const session = await requireAdmin();
  const [item] = await db
    .select({ slug: researchAreas.slug })
    .from(researchAreas)
    .where(eq(researchAreas.id, id))
    .limit(1);
  if (!item) return;
  await db.delete(researchAreas).where(eq(researchAreas.id, id));
  await logAudit(session.user.id, "delete", "research_area", id);
  revalidateTag("research-areas", "max");
  revalidateTag("projects", "max");
  revalidateTag("publications", "max");
  revalidatePath("/");
  revalidatePath("/research");
  revalidatePath(`/research/${item.slug}`);
  redirect("/admin/research?deleted=1");
}
