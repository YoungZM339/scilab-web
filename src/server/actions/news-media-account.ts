"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, requireAdmin } from "@/server/auth";
import { db, getMediaAssetReferences } from "@/server/db";
import {
  mediaAssets,
  newsPosts,
  session as sessionTable,
  user,
} from "@/server/db/schema";
import { getUploadDirectory } from "@/server/services/media";

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

export async function saveNewsPostAction(
  id: number | null,
  formData: FormData,
) {
  const session = await requireAdmin();
  const title = requiredString(formData, "title", 200);
  const status = publishStatusSchema.parse(formData.get("status"));
  const current = id
    ? await db
        .select()
        .from(newsPosts)
        .where(eq(newsPosts.id, id))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;
  if (id && !current) throw new Error("新闻不存在");
  const requestedSlug =
    optionalString(formData, "slug", 160) ?? (current?.slug || title);
  const slug = await uniqueSlug(requestedSlug, title, async (candidate) => {
    const condition = id
      ? and(eq(newsPosts.slug, candidate), ne(newsPosts.id, id))
      : eq(newsPosts.slug, candidate);
    return Boolean(
      await db
        .select({ id: newsPosts.id })
        .from(newsPosts)
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
    await db.update(newsPosts).set(values).where(eq(newsPosts.id, id));
    entityId = id;
  } else {
    const [created] = await db
      .insert(newsPosts)
      .values(values)
      .returning({ id: newsPosts.id });
    entityId = created.id;
  }
  await logAudit(
    session.user.id,
    id ? "update" : "create",
    "news_post",
    entityId,
    { status },
  );
  revalidateTag("news", "max");
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath(`/news/${slug}`);
  if (current?.slug && current.slug !== slug)
    revalidatePath(`/news/${current.slug}`);
  revalidatePath("/admin/news");
  redirect(`/admin/news/${entityId}?saved=1`);
}

export async function deleteNewsPostAction(id: number) {
  const session = await requireAdmin();
  const [item] = await db
    .select({ slug: newsPosts.slug })
    .from(newsPosts)
    .where(eq(newsPosts.id, id))
    .limit(1);
  if (!item) return;
  await db.delete(newsPosts).where(eq(newsPosts.id, id));
  await logAudit(session.user.id, "delete", "news_post", id);
  revalidateTag("news", "max");
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath(`/news/${item.slug}`);
  redirect("/admin/news?deleted=1");
}

export async function updateMediaAction(id: number, formData: FormData) {
  const session = await requireAdmin();
  const altText = optionalString(formData, "altText", 300);
  await db.update(mediaAssets).set({ altText }).where(eq(mediaAssets.id, id));
  await logAudit(session.user.id, "update", "media_asset", id, { altText });
  for (const tag of [
    "site-settings",
    "pages",
    "members",
    "research-areas",
    "projects",
    "publications",
    "news",
  ]) {
    revalidateTag(tag, "max");
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/media");
  redirect(`/admin/media?edited=${id}`);
}

export async function deleteMediaAction(id: number) {
  const adminSession = await requireAdmin();
  const references = await getMediaAssetReferences(id);
  if (references.length) {
    const labels = references
      .slice(0, 3)
      .map((reference) => reference.label)
      .join("、");
    throw new Error(
      `该文件仍被 ${labels}${references.length > 3 ? " 等内容" : ""} 引用，不能删除`,
    );
  }
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  if (!asset) return;
  const root = getUploadDirectory();
  const filePath = path.resolve(root, asset.storageKey);
  if (!filePath.startsWith(`${root}${path.sep}`))
    throw new Error("媒体存储路径无效");
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  await logAudit(adminSession.user.id, "delete", "media_asset", id, {
    originalName: asset.originalName,
  });
  revalidatePath("/admin/media");
  redirect("/admin/media?deleted=1");
}

export async function updateAccountAction(formData: FormData) {
  const adminSession = await requireAdmin();
  const name = requiredString(formData, "name", 120);
  const email = requiredString(formData, "email", 254).toLowerCase();
  if (!z.email().safeParse(email).success) throw new Error("邮箱格式无效");
  const duplicate = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, email), ne(user.id, adminSession.user.id)))
    .limit(1)
    .then((rows) => rows[0]);
  if (duplicate) throw new Error("该邮箱已被使用");
  await db
    .update(user)
    .set({ name, email })
    .where(eq(user.id, adminSession.user.id));
  await logAudit(
    adminSession.user.id,
    "update",
    "admin_account",
    adminSession.user.id,
    { email },
  );
  revalidatePath("/admin/account");
  redirect("/admin/account?saved=1");
}

export async function changePasswordAction(formData: FormData) {
  const adminSession = await requireAdmin();
  const currentPassword = requiredString(formData, "currentPassword", 128);
  const newPassword = requiredString(formData, "newPassword", 128);
  const confirmPassword = requiredString(formData, "confirmPassword", 128);
  if (newPassword.length < 14) throw new Error("新密码至少需要 14 个字符");
  if (newPassword !== confirmPassword)
    throw new Error("两次输入的新密码不一致");
  if (newPassword === currentPassword)
    throw new Error("新密码不能与当前密码相同");

  await auth.api.changePassword({
    headers: await headers(),
    body: { currentPassword, newPassword, revokeOtherSessions: true },
  });
  await logAudit(
    adminSession.user.id,
    "change_password",
    "admin_account",
    adminSession.user.id,
  );
  await db
    .delete(sessionTable)
    .where(eq(sessionTable.userId, adminSession.user.id));
  redirect("/admin/login?passwordChanged=1");
}
