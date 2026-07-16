import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1, "请输入 slug")
  .max(160, "slug 不能超过 160 个字符")
  .regex(
    /^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u,
    "slug 只能包含字母、数字和分隔用的连字符",
  );

/** Produces stable, URL-safe slugs while retaining Chinese characters. */
export function createSlug(input: string, fallback = "item"): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("zh-CN")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");

  return normalized || fallback;
}
