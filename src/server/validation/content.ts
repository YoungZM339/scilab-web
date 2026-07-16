import { z } from "zod";

import {
  memberGroups,
  pageKeys,
  projectStatuses,
  publicationTypes,
  publishStatuses,
} from "../db/schema";
import { richTextInputSchema } from "./rich-text";
import { slugSchema } from "./slug";

export const publishStatusSchema = z.enum(publishStatuses);
export const projectStatusSchema = z.enum(projectStatuses);
export const memberGroupSchema = z.enum(memberGroups);
export const publicationTypeSchema = z.enum(publicationTypes);
export const pageKeySchema = z.enum(pageKeys);

export const idSchema = z.coerce.number().int().positive();
export const optionalIdSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().int().positive().nullable(),
);
export const sortOrderSchema = z.coerce.number().int().min(-10_000).max(10_000);

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(maxLength).nullable(),
  );

const optionalUrl = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().url("请输入有效网址").max(2_000).nullable(),
);

const optionalEmail = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().email("请输入有效邮箱").max(320).nullable(),
);

const booleanInput = z.preprocess((value) => {
  if (value === "true" || value === "on" || value === "1" || value === 1) {
    return true;
  }
  if (
    value === "false" ||
    value === "off" ||
    value === "0" ||
    value === 0 ||
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return false;
  }
  return value;
}, z.boolean());

const socialLinksSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    if (!value.trim()) return [];
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  },
  z
    .array(
      z.object({
        label: z.string().trim().min(1).max(50),
        url: z.string().url().max(2_000),
      }),
    )
    .max(20),
);

const commonContentFields = {
  status: publishStatusSchema.default("draft"),
  featured: booleanInput.default(false),
  sortOrder: sortOrderSchema.default(0),
};

export const siteSettingsInputSchema = z.object({
  siteName: z.string().trim().min(1, "请输入实验室名称").max(120),
  tagline: optionalText(200),
  description: optionalText(1_000),
  heroTitle: optionalText(200),
  heroSubtitle: optionalText(500),
  heroImageId: optionalIdSchema,
  logoImageId: optionalIdSchema,
  contactEmail: optionalEmail,
  contactPhone: optionalText(50),
  address: optionalText(300),
  socialLinksJson: socialLinksSchema.default([]),
  footerText: optionalText(300),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
});

export const pageInputSchema = z.object({
  key: pageKeySchema,
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  summary: optionalText(1_000),
  contentJson: richTextInputSchema,
  status: commonContentFields.status,
  sortOrder: commonContentFields.sortOrder,
});

export const memberInputSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  roleTitle: optionalText(120),
  group: memberGroupSchema,
  email: optionalEmail,
  phone: optionalText(50),
  website: optionalUrl,
  orcid: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i, "请输入有效 ORCID")
      .nullable(),
  ),
  bioJson: richTextInputSchema,
  avatarMediaId: optionalIdSchema,
  ...commonContentFields,
});

const isoDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
    .nullable(),
);

export const researchAreaInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  summary: optionalText(1_000),
  contentJson: richTextInputSchema,
  coverMediaId: optionalIdSchema,
  ...commonContentFields,
});

export const projectInputSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(200),
    summary: optionalText(1_000),
    contentJson: richTextInputSchema,
    projectStatus: projectStatusSchema.default("ongoing"),
    coverMediaId: optionalIdSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    funding: optionalText(300),
    externalUrl: optionalUrl,
    memberIds: z.array(idSchema).max(500).default([]),
    researchAreaIds: z.array(idSchema).max(500).default([]),
    ...commonContentFields,
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || endDate >= startDate,
    { message: "结束日期不能早于开始日期", path: ["endDate"] },
  );

export const publicationInputSchema = z.object({
  title: z.string().trim().min(1).max(500),
  authors: z.string().trim().min(1).max(5_000),
  year: z.coerce.number().int().min(1900).max(2200),
  type: publicationTypeSchema,
  venue: optionalText(500),
  volume: optionalText(50),
  issue: optionalText(50),
  pages: optionalText(100),
  doi: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z
      .string()
      .trim()
      .regex(/^10\.\d{4,9}\/\S+$/i, "请输入有效 DOI（不含 https://doi.org/）")
      .max(300)
      .nullable(),
  ),
  externalUrl: optionalUrl,
  pdfMediaId: optionalIdSchema,
  abstract: optionalText(10_000),
  memberIds: z.array(idSchema).max(500).default([]),
  projectIds: z.array(idSchema).max(500).default([]),
  researchAreaIds: z.array(idSchema).max(500).default([]),
  ...commonContentFields,
});

export const newsPostInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  summary: optionalText(1_000),
  contentJson: richTextInputSchema,
  coverMediaId: optionalIdSchema,
  ...commonContentFields,
});

export const adminCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(14).max(128),
  name: z.string().trim().min(1).max(120).default("管理员"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
export type PageInput = z.infer<typeof pageInputSchema>;
export type MemberInput = z.infer<typeof memberInputSchema>;
export type ResearchAreaInput = z.infer<typeof researchAreaInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type PublicationInput = z.infer<typeof publicationInputSchema>;
export type NewsPostInput = z.infer<typeof newsPostInputSchema>;
