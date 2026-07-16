import { z } from "zod";

import { db } from "@/server/db";
import { auditLogs, type RichTextDocument } from "@/server/db/schema";
import {
  emptyRichTextDocument,
  richTextDocumentSchema,
} from "@/server/validation/rich-text";

export const publishStatusSchema = z.enum(["draft", "published"]);

export function parseRichText(
  value: FormDataEntryValue | null,
): RichTextDocument {
  if (!value || typeof value !== "string") return emptyRichTextDocument;
  if (value.length > 500_000) throw new Error("正文内容过长");
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    throw new Error("正文格式无效");
  }
  const result = richTextDocumentSchema.safeParse(json);
  if (!result.success) {
    throw new Error("正文包含不受支持或不安全的内容");
  }
  return result.data;
}

export function optionalString(formData: FormData, name: string, max = 2000) {
  const raw = formData.get(name);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.length > max) throw new Error(`${name} 内容过长`);
  return value;
}

export function requiredString(formData: FormData, name: string, max = 200) {
  const value = optionalString(formData, name, max);
  if (!value) throw new Error(`${name} 为必填项`);
  return value;
}

export function integerValue(formData: FormData, name: string, fallback = 0) {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw === "") return fallback;
  if (!/^-?\d+$/.test(raw)) throw new Error(`${name} 必须是整数`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} 必须是整数`);
  return value;
}

export function optionalInteger(formData: FormData, name: string) {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw === "") return null;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} 无效`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${name} 无效`);
  return value;
}

export function booleanValue(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export function idList(formData: FormData, name: string) {
  const values = formData.getAll(name).map((raw) => {
    if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
      throw new Error(`${name} 包含无效编号`);
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(`${name} 包含无效编号`);
    }
    return value;
  });
  const unique = [...new Set(values)];
  if (unique.length > 500) throw new Error(`${name} 最多允许 500 项`);
  return unique;
}

export function slugify(input: string) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

export async function uniqueSlug(
  desired: string,
  fallback: string,
  exists: (candidate: string) => Promise<boolean>,
) {
  const base = slugify(desired) || slugify(fallback) || `content-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${base.slice(0, Math.max(1, 156 - String(suffix).length))}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function publishedAt(
  status: "draft" | "published",
  previous?: Date | null,
) {
  return status === "published" ? (previous ?? new Date()) : null;
}

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: number | string,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({
    userId,
    action,
    entityType,
    entityId: String(entityId),
    detailsJson: details ?? null,
  });
}
