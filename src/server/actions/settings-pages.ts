"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  pageKeys,
  pages,
  siteSettings,
  type SocialLink,
} from "@/server/db/schema";

import {
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

function parseSocialLinks(value: string | null): SocialLink[] {
  if (!value) return [];
  const lines = value.split(/\r?\n/).filter(Boolean);
  if (lines.length > 12) throw new Error("社交链接不能超过 12 条");
  return lines.map((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) throw new Error("社交链接格式应为“名称 | https://地址”");
    const label = line.slice(0, separator).trim().slice(0, 50);
    const url = line.slice(separator + 1).trim();
    if (!z.url().safeParse(url).success || !/^https?:\/\//i.test(url)) {
      throw new Error(`社交链接“${label}”地址无效`);
    }
    return { label, url };
  });
}

export async function updateSiteSettingsAction(formData: FormData) {
  const session = await requireAdmin();
  const values = {
    siteName: requiredString(formData, "siteName", 120),
    tagline: optionalString(formData, "tagline", 200),
    description: optionalString(formData, "description", 2000),
    heroTitle: optionalString(formData, "heroTitle", 200),
    heroSubtitle: optionalString(formData, "heroSubtitle", 500),
    heroImageId: optionalInteger(formData, "heroImageId"),
    logoImageId: optionalInteger(formData, "logoImageId"),
    contactEmail: optionalString(formData, "contactEmail", 254),
    contactPhone: optionalString(formData, "contactPhone", 80),
    address: optionalString(formData, "address", 500),
    socialLinksJson: parseSocialLinks(
      optionalString(formData, "socialLinks", 4000),
    ),
    footerText: optionalString(formData, "footerText", 500),
    seoTitle: optionalString(formData, "seoTitle", 120),
    seoDescription: optionalString(formData, "seoDescription", 300),
  };

  if (
    values.contactEmail &&
    !z.email().safeParse(values.contactEmail).success
  ) {
    throw new Error("联系邮箱格式无效");
  }

  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });
  await logAudit(session.user.id, "update", "site_settings", 1);
  revalidateTag("site-settings", "max");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function savePageAction(id: number | null, formData: FormData) {
  const session = await requireAdmin();
  const key = z.enum(pageKeys).parse(requiredString(formData, "key", 20));
  const title = requiredString(formData, "title", 200);
  const status = publishStatusSchema.parse(formData.get("status"));
  const current = id
    ? await db
        .select()
        .from(pages)
        .where(eq(pages.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !current) throw new Error("固定页面不存在");

  const requestedSlug = optionalString(formData, "slug", 160) ?? key;
  const slug = await uniqueSlug(requestedSlug, title, async (candidate) => {
    const condition = id
      ? and(eq(pages.slug, candidate), ne(pages.id, id))
      : eq(pages.slug, candidate);
    return Boolean(
      await db
        .select({ id: pages.id })
        .from(pages)
        .where(condition)
        .limit(1)
        .then((rows) => rows[0]),
    );
  });
  const values = {
    key,
    title,
    slug,
    summary: optionalString(formData, "summary", 1000),
    contentJson: parseRichText(formData.get("contentJson")),
    status,
    sortOrder: integerValue(formData, "sortOrder"),
    publishedAt: publishedAt(status, current?.publishedAt),
  };

  let entityId: number;
  if (id) {
    await db.update(pages).set(values).where(eq(pages.id, id));
    entityId = id;
  } else {
    const [created] = await db
      .insert(pages)
      .values(values)
      .returning({ id: pages.id });
    entityId = created.id;
  }
  await logAudit(session.user.id, id ? "update" : "create", "page", entityId, {
    status,
    key,
  });
  revalidateTag("pages", "max");
  revalidatePath(`/${key}`);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${entityId}?saved=1`);
}

export async function deletePageAction(id: number) {
  const session = await requireAdmin();
  const [item] = await db
    .select({ key: pages.key })
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);
  if (!item) return;
  await db.delete(pages).where(eq(pages.id, id));
  await logAudit(session.user.id, "delete", "page", id, { key: item.key });
  revalidateTag("pages", "max");
  revalidatePath(`/${item.key}`);
  revalidatePath("/admin/pages");
  redirect("/admin/pages?deleted=1");
}
