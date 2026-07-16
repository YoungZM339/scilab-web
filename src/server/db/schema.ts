import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const publishStatuses = ["draft", "published"] as const;
export type PublishStatus = (typeof publishStatuses)[number];

export const projectStatuses = ["ongoing", "completed"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const memberGroups = [
  "principal_investigator",
  "faculty",
  "postdoc_researcher",
  "student",
  "alumni",
] as const;
export type MemberGroup = (typeof memberGroups)[number];

export const publicationTypes = [
  "journal",
  "conference",
  "book_chapter",
  "patent",
  "software",
  "other",
] as const;
export type PublicationType = (typeof publicationTypes)[number];

export const pageKeys = ["about", "join", "contact"] as const;
export type PageKey = (typeof pageKeys)[number];

export const mediaKinds = ["image", "pdf"] as const;
export type MediaKind = (typeof mediaKinds)[number];

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
}

export interface RichTextDocument extends RichTextNode {
  type: "doc";
}

export interface SocialLink {
  label: string;
  url: string;
}

const createdAtColumn = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedAtColumn = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date());

/** Better Auth's canonical user model. A database trigger enforces one row. */
export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
    index("session_expires_at_idx").on(table.expiresAt),
  ],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: mediaKinds }).notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    sha256: text("sha256").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("media_assets_storage_key_unique").on(table.storageKey),
    index("media_assets_kind_idx").on(table.kind),
    index("media_assets_created_at_idx").on(table.createdAt),
    check("media_assets_kind_check", sql`${table.kind} in ('image', 'pdf')`),
    check("media_assets_size_check", sql`${table.size} >= 0`),
  ],
);

export const siteSettings = sqliteTable(
  "site_settings",
  {
    id: integer("id").primaryKey().default(1),
    siteName: text("site_name").notNull().default("科研实验室"),
    tagline: text("tagline"),
    description: text("description"),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    heroImageId: integer("hero_image_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    logoImageId: integer("logo_image_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    socialLinksJson: text("social_links_json", { mode: "json" })
      .$type<SocialLink[]>()
      .notNull()
      .default(sql`'[]'`),
    footerText: text("footer_text"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [check("site_settings_singleton_check", sql`${table.id} = 1`)],
);

export const pages = sqliteTable(
  "pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("page_key", { enum: pageKeys }).notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentJson: text("content_json", {
      mode: "json",
    }).$type<RichTextDocument>(),
    status: text("status", { enum: publishStatuses })
      .notNull()
      .default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("pages_key_unique").on(table.key),
    uniqueIndex("pages_slug_unique").on(table.slug),
    index("pages_status_idx").on(table.status),
    check("pages_key_check", sql`${table.key} in ('about', 'join', 'contact')`),
    check("pages_status_check", sql`${table.status} in ('draft', 'published')`),
  ],
);

export const members = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    roleTitle: text("role_title"),
    group: text("member_group", { enum: memberGroups }).notNull(),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    orcid: text("orcid"),
    bioJson: text("bio_json", { mode: "json" }).$type<RichTextDocument>(),
    avatarMediaId: integer("avatar_media_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    status: text("status", { enum: publishStatuses })
      .notNull()
      .default("draft"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("members_slug_unique").on(table.slug),
    index("members_status_group_sort_idx").on(
      table.status,
      table.group,
      table.sortOrder,
    ),
    check(
      "members_group_check",
      sql`${table.group} in ('principal_investigator', 'faculty', 'postdoc_researcher', 'student', 'alumni')`,
    ),
    check(
      "members_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
  ],
);

export const researchAreas = sqliteTable(
  "research_areas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentJson: text("content_json", {
      mode: "json",
    }).$type<RichTextDocument>(),
    coverMediaId: integer("cover_media_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    status: text("status", { enum: publishStatuses })
      .notNull()
      .default("draft"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("research_areas_slug_unique").on(table.slug),
    index("research_areas_status_sort_idx").on(table.status, table.sortOrder),
    check(
      "research_areas_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentJson: text("content_json", {
      mode: "json",
    }).$type<RichTextDocument>(),
    projectStatus: text("project_status", { enum: projectStatuses })
      .notNull()
      .default("ongoing"),
    status: text("status", { enum: publishStatuses })
      .notNull()
      .default("draft"),
    coverMediaId: integer("cover_media_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    startDate: text("start_date"),
    endDate: text("end_date"),
    funding: text("funding"),
    externalUrl: text("external_url"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("projects_slug_unique").on(table.slug),
    index("projects_status_sort_idx").on(table.status, table.sortOrder),
    check(
      "projects_project_status_check",
      sql`${table.projectStatus} in ('ongoing', 'completed')`,
    ),
    check(
      "projects_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
  ],
);

export const publications = sqliteTable(
  "publications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    authors: text("authors").notNull(),
    year: integer("year").notNull(),
    type: text("publication_type", { enum: publicationTypes }).notNull(),
    venue: text("venue"),
    volume: text("volume"),
    issue: text("issue"),
    pages: text("pages"),
    doi: text("doi"),
    externalUrl: text("external_url"),
    pdfMediaId: integer("pdf_media_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    abstract: text("abstract"),
    status: text("status", { enum: publishStatuses })
      .notNull()
      .default("draft"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("publications_doi_unique").on(table.doi),
    index("publications_status_year_idx").on(table.status, table.year),
    index("publications_type_idx").on(table.type),
    check(
      "publications_type_check",
      sql`${table.type} in ('journal', 'conference', 'book_chapter', 'patent', 'software', 'other')`,
    ),
    check(
      "publications_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
    check("publications_year_check", sql`${table.year} between 1900 and 2200`),
  ],
);

export const newsPosts = sqliteTable(
  "news_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentJson: text("content_json", {
      mode: "json",
    }).$type<RichTextDocument>(),
    coverMediaId: integer("cover_media_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    status: text("status", { enum: publishStatuses })
      .notNull()
      .default("draft"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("news_posts_slug_unique").on(table.slug),
    index("news_posts_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
    check(
      "news_posts_status_check",
      sql`${table.status} in ('draft', 'published')`,
    ),
  ],
);

export const projectMembers = sqliteTable(
  "project_members",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.memberId] }),
    index("project_members_member_idx").on(table.memberId),
  ],
);

export const projectResearchAreas = sqliteTable(
  "project_research_areas",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    researchAreaId: integer("research_area_id")
      .notNull()
      .references(() => researchAreas.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.researchAreaId] }),
    index("project_research_areas_area_idx").on(table.researchAreaId),
  ],
);

export const publicationMembers = sqliteTable(
  "publication_members",
  {
    publicationId: integer("publication_id")
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.publicationId, table.memberId] }),
    index("publication_members_member_idx").on(table.memberId),
  ],
);

export const publicationProjects = sqliteTable(
  "publication_projects",
  {
    publicationId: integer("publication_id")
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.publicationId, table.projectId] }),
    index("publication_projects_project_idx").on(table.projectId),
  ],
);

export const publicationResearchAreas = sqliteTable(
  "publication_research_areas",
  {
    publicationId: integer("publication_id")
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
    researchAreaId: integer("research_area_id")
      .notNull()
      .references(() => researchAreas.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.publicationId, table.researchAreaId] }),
    index("publication_research_areas_area_idx").on(table.researchAreaId),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    detailsJson: text("details_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    ipAddress: text("ip_address"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_user_idx").on(table.userId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  auditLogs: many(auditLogs),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
  heroImage: one(mediaAssets, {
    fields: [siteSettings.heroImageId],
    references: [mediaAssets.id],
    relationName: "siteHeroImage",
  }),
  logoImage: one(mediaAssets, {
    fields: [siteSettings.logoImageId],
    references: [mediaAssets.id],
    relationName: "siteLogoImage",
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  avatar: one(mediaAssets, {
    fields: [members.avatarMediaId],
    references: [mediaAssets.id],
  }),
  projects: many(projectMembers),
  publications: many(publicationMembers),
}));

export const researchAreasRelations = relations(
  researchAreas,
  ({ one, many }) => ({
    cover: one(mediaAssets, {
      fields: [researchAreas.coverMediaId],
      references: [mediaAssets.id],
    }),
    projects: many(projectResearchAreas),
    publications: many(publicationResearchAreas),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  cover: one(mediaAssets, {
    fields: [projects.coverMediaId],
    references: [mediaAssets.id],
  }),
  members: many(projectMembers),
  researchAreas: many(projectResearchAreas),
  publications: many(publicationProjects),
}));

export const publicationsRelations = relations(
  publications,
  ({ one, many }) => ({
    pdf: one(mediaAssets, {
      fields: [publications.pdfMediaId],
      references: [mediaAssets.id],
    }),
    members: many(publicationMembers),
    projects: many(publicationProjects),
    researchAreas: many(publicationResearchAreas),
  }),
);

export const newsPostsRelations = relations(newsPosts, ({ one }) => ({
  cover: one(mediaAssets, {
    fields: [newsPosts.coverMediaId],
    references: [mediaAssets.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  member: one(members, {
    fields: [projectMembers.memberId],
    references: [members.id],
  }),
}));

export const projectResearchAreasRelations = relations(
  projectResearchAreas,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectResearchAreas.projectId],
      references: [projects.id],
    }),
    researchArea: one(researchAreas, {
      fields: [projectResearchAreas.researchAreaId],
      references: [researchAreas.id],
    }),
  }),
);

export const publicationMembersRelations = relations(
  publicationMembers,
  ({ one }) => ({
    publication: one(publications, {
      fields: [publicationMembers.publicationId],
      references: [publications.id],
    }),
    member: one(members, {
      fields: [publicationMembers.memberId],
      references: [members.id],
    }),
  }),
);

export const publicationProjectsRelations = relations(
  publicationProjects,
  ({ one }) => ({
    publication: one(publications, {
      fields: [publicationProjects.publicationId],
      references: [publications.id],
    }),
    project: one(projects, {
      fields: [publicationProjects.projectId],
      references: [projects.id],
    }),
  }),
);

export const publicationResearchAreasRelations = relations(
  publicationResearchAreas,
  ({ one }) => ({
    publication: one(publications, {
      fields: [publicationResearchAreas.publicationId],
      references: [publications.id],
    }),
    researchArea: one(researchAreas, {
      fields: [publicationResearchAreas.researchAreaId],
      references: [researchAreas.id],
    }),
  }),
);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Member = typeof members.$inferSelect;
export type ResearchArea = typeof researchAreas.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Publication = typeof publications.$inferSelect;
export type NewsPost = typeof newsPosts.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type NewSiteSettings = typeof siteSettings.$inferInsert;
export type NewPage = typeof pages.$inferInsert;
export type NewMember = typeof members.$inferInsert;
export type NewResearchArea = typeof researchAreas.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewPublication = typeof publications.$inferInsert;
export type NewNewsPost = typeof newsPosts.$inferInsert;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type NewAuditLog = typeof auditLogs.$inferInsert;
