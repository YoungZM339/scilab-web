import { and, eq, like, or } from "drizzle-orm";

import { db as defaultDb, type AppDatabase } from "./client";
import {
  members,
  newsPosts,
  pages,
  projects,
  publications,
  researchAreas,
  siteSettings,
} from "./schema";

export interface MediaAssetReference {
  entityType:
    | "siteSettings"
    | "page"
    | "member"
    | "researchArea"
    | "project"
    | "publication"
    | "newsPost";
  entityId: string;
  label: string;
  field: string;
}

/** Returns true only when the asset is currently reachable from public content. */
export async function isMediaAssetPublic(
  assetId: number,
  database: AppDatabase = defaultDb,
): Promise<boolean> {
  const patterns = richTextPatterns(assetId);
  const contentMatch = (column: typeof pages.contentJson) =>
    or(...patterns.map((pattern) => like(column, pattern)));

  const checks = await Promise.all([
    database
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(
        or(
          eq(siteSettings.heroImageId, assetId),
          eq(siteSettings.logoImageId, assetId),
        ),
      )
      .limit(1),
    database
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(eq(pages.status, "published"), contentMatch(pages.contentJson)),
      )
      .limit(1),
    database
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.status, "published"),
          or(
            eq(members.avatarMediaId, assetId),
            ...patterns.map((pattern) => like(members.bioJson, pattern)),
          ),
        ),
      )
      .limit(1),
    database
      .select({ id: researchAreas.id })
      .from(researchAreas)
      .where(
        and(
          eq(researchAreas.status, "published"),
          or(
            eq(researchAreas.coverMediaId, assetId),
            ...patterns.map((pattern) =>
              like(researchAreas.contentJson, pattern),
            ),
          ),
        ),
      )
      .limit(1),
    database
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.status, "published"),
          or(
            eq(projects.coverMediaId, assetId),
            ...patterns.map((pattern) => like(projects.contentJson, pattern)),
          ),
        ),
      )
      .limit(1),
    database
      .select({ id: publications.id })
      .from(publications)
      .where(
        and(
          eq(publications.status, "published"),
          eq(publications.pdfMediaId, assetId),
        ),
      )
      .limit(1),
    database
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.status, "published"),
          or(
            eq(newsPosts.coverMediaId, assetId),
            ...patterns.map((pattern) => like(newsPosts.contentJson, pattern)),
          ),
        ),
      )
      .limit(1),
  ]);

  return checks.some((rows) => rows.length > 0);
}

const richTextPatterns = (assetId: number) => [
  `%\"src\":\"/api/media/${assetId}\"%`,
  `%\"src\": \"/api/media/${assetId}\"%`,
];

function documentReferencesAsset(value: unknown, assetId: number): boolean {
  if (!value) return false;
  const serialized = JSON.stringify(value);
  return serialized.includes(`\"src\":\"/api/media/${assetId}\"`);
}

/** Finds direct foreign-key and rich-text references before media deletion. */
export async function getMediaAssetReferences(
  assetId: number,
  database: AppDatabase = defaultDb,
): Promise<MediaAssetReference[]> {
  const references: MediaAssetReference[] = [];
  const patterns = richTextPatterns(assetId);

  const [
    settingsRows,
    pageRows,
    memberRows,
    areaRows,
    projectRows,
    publicationRows,
    newsRows,
  ] = await Promise.all([
    database
      .select({
        id: siteSettings.id,
        label: siteSettings.siteName,
        heroImageId: siteSettings.heroImageId,
        logoImageId: siteSettings.logoImageId,
      })
      .from(siteSettings)
      .where(
        or(
          eq(siteSettings.heroImageId, assetId),
          eq(siteSettings.logoImageId, assetId),
        ),
      ),
    database
      .select({ id: pages.id, label: pages.title, content: pages.contentJson })
      .from(pages)
      .where(
        or(...patterns.map((pattern) => like(pages.contentJson, pattern))),
      ),
    database
      .select({
        id: members.id,
        label: members.name,
        directId: members.avatarMediaId,
        content: members.bioJson,
      })
      .from(members)
      .where(
        or(
          eq(members.avatarMediaId, assetId),
          ...patterns.map((pattern) => like(members.bioJson, pattern)),
        ),
      ),
    database
      .select({
        id: researchAreas.id,
        label: researchAreas.title,
        directId: researchAreas.coverMediaId,
        content: researchAreas.contentJson,
      })
      .from(researchAreas)
      .where(
        or(
          eq(researchAreas.coverMediaId, assetId),
          ...patterns.map((pattern) =>
            like(researchAreas.contentJson, pattern),
          ),
        ),
      ),
    database
      .select({
        id: projects.id,
        label: projects.title,
        directId: projects.coverMediaId,
        content: projects.contentJson,
      })
      .from(projects)
      .where(
        or(
          eq(projects.coverMediaId, assetId),
          ...patterns.map((pattern) => like(projects.contentJson, pattern)),
        ),
      ),
    database
      .select({
        id: publications.id,
        label: publications.title,
      })
      .from(publications)
      .where(eq(publications.pdfMediaId, assetId)),
    database
      .select({
        id: newsPosts.id,
        label: newsPosts.title,
        directId: newsPosts.coverMediaId,
        content: newsPosts.contentJson,
      })
      .from(newsPosts)
      .where(
        or(
          eq(newsPosts.coverMediaId, assetId),
          ...patterns.map((pattern) => like(newsPosts.contentJson, pattern)),
        ),
      ),
  ]);

  for (const row of settingsRows) {
    if (row.heroImageId === assetId) {
      references.push({
        entityType: "siteSettings",
        entityId: String(row.id),
        label: row.label,
        field: "heroImageId",
      });
    }
    if (row.logoImageId === assetId) {
      references.push({
        entityType: "siteSettings",
        entityId: String(row.id),
        label: row.label,
        field: "logoImageId",
      });
    }
  }

  for (const row of pageRows) {
    if (documentReferencesAsset(row.content, assetId)) {
      references.push({
        entityType: "page",
        entityId: String(row.id),
        label: row.label,
        field: "contentJson",
      });
    }
  }

  const addContentReference = (
    entityType: "member" | "researchArea" | "project" | "newsPost",
    row: {
      id: number;
      label: string;
      directId: number | null;
      content: unknown;
    },
    directField: string,
  ) => {
    if (row.directId === assetId) {
      references.push({
        entityType,
        entityId: String(row.id),
        label: row.label,
        field: directField,
      });
    }
    if (documentReferencesAsset(row.content, assetId)) {
      references.push({
        entityType,
        entityId: String(row.id),
        label: row.label,
        field: "contentJson",
      });
    }
  };

  memberRows.forEach((row) =>
    addContentReference("member", row, "avatarMediaId"),
  );
  areaRows.forEach((row) =>
    addContentReference("researchArea", row, "coverMediaId"),
  );
  projectRows.forEach((row) =>
    addContentReference("project", row, "coverMediaId"),
  );
  newsRows.forEach((row) =>
    addContentReference("newsPost", row, "coverMediaId"),
  );

  publicationRows.forEach((row) => {
    references.push({
      entityType: "publication",
      entityId: String(row.id),
      label: row.label,
      field: "pdfMediaId",
    });
  });

  return references;
}
