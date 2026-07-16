import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createDatabase,
  isMediaAssetPublic,
  type DatabaseConnection,
  runMigrations,
} from "@/server/db";
import {
  mediaAssets,
  members,
  pages,
  projectMembers,
  projects,
  publications,
  siteSettings,
  user,
} from "@/server/db/schema";

describe("SQLite database", () => {
  let directory: string;
  let connection: DatabaseConnection;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "scilab-db-test-"));
    connection = createDatabase(path.join(directory, "test.db"));
    runMigrations({ database: connection.db });
  });

  afterEach(() => {
    connection.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("enables the required SQLite safety pragmas", () => {
    expect(connection.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(connection.sqlite.pragma("journal_mode", { simple: true })).toBe(
      "wal",
    );
    expect(connection.sqlite.pragma("busy_timeout", { simple: true })).toBe(
      5_000,
    );
    expect(connection.sqlite.pragma("quick_check", { simple: true })).toBe(
      "ok",
    );
  });

  it("enforces one administrator at the database boundary", () => {
    connection.db
      .insert(user)
      .values({ id: "admin-1", name: "Admin", email: "admin@example.com" })
      .run();

    expect(() =>
      connection.db
        .insert(user)
        .values({ id: "admin-2", name: "Other", email: "other@example.com" })
        .run(),
    ).toThrow(/only one administrator/i);
  });

  it("enforces singleton settings and content constraints", () => {
    connection.db
      .insert(siteSettings)
      .values({ id: 1, siteName: "Lab", socialLinksJson: [] })
      .run();
    expect(() =>
      connection.db
        .insert(siteSettings)
        .values({ id: 2, siteName: "Other", socialLinksJson: [] })
        .run(),
    ).toThrow();

    connection.db
      .insert(publications)
      .values({
        title: "Paper A",
        authors: "A. Author",
        year: 2026,
        type: "journal",
        doi: "10.1000/example",
      })
      .run();
    expect(() =>
      connection.db
        .insert(publications)
        .values({
          title: "Paper B",
          authors: "B. Author",
          year: 2026,
          type: "journal",
          doi: "10.1000/example",
        })
        .run(),
    ).toThrow();
  });

  it("restricts referenced media deletion", () => {
    const asset = connection.db
      .insert(mediaAssets)
      .values({
        kind: "image",
        storageKey: "asset.webp",
        originalName: "asset.png",
        fileName: "asset.webp",
        mimeType: "image/webp",
        size: 100,
        sha256: "a".repeat(64),
      })
      .returning({ id: mediaAssets.id })
      .get();
    connection.db
      .insert(members)
      .values({
        slug: "member",
        name: "Member",
        group: "student",
        avatarMediaId: asset.id,
      })
      .run();

    expect(() =>
      connection.db
        .delete(mediaAssets)
        .where(eq(mediaAssets.id, asset.id))
        .run(),
    ).toThrow(/foreign key/i);
  });

  it("exposes media only when referenced by published content", async () => {
    const privateAsset = connection.db
      .insert(mediaAssets)
      .values({
        kind: "image",
        storageKey: "private-1.webp",
        originalName: "private-1.png",
        fileName: "private-1.webp",
        mimeType: "image/webp",
        size: 100,
        sha256: "b".repeat(64),
      })
      .returning({ id: mediaAssets.id })
      .get();
    let publicAsset = privateAsset;
    for (let index = 2; index <= 12; index += 1) {
      publicAsset = connection.db
        .insert(mediaAssets)
        .values({
          kind: "image",
          storageKey: `asset-${index}.webp`,
          originalName: `asset-${index}.png`,
          fileName: `asset-${index}.webp`,
          mimeType: "image/webp",
          size: 100,
          sha256: index.toString(16).padStart(64, "0"),
        })
        .returning({ id: mediaAssets.id })
        .get();
    }
    expect(privateAsset.id).toBe(1);
    expect(publicAsset.id).toBe(12);

    const page = connection.db
      .insert(pages)
      .values({
        key: "about",
        slug: "about",
        title: "About",
        status: "draft",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "image",
              attrs: {
                src: `/api/media/${publicAsset.id}`,
                mediaId: publicAsset.id,
              },
            },
          ],
        },
      })
      .returning({ id: pages.id })
      .get();

    await expect(
      isMediaAssetPublic(publicAsset.id, connection.db),
    ).resolves.toBe(false);
    await expect(
      isMediaAssetPublic(privateAsset.id, connection.db),
    ).resolves.toBe(false);
    connection.db
      .update(pages)
      .set({ status: "published" })
      .where(eq(pages.id, page.id))
      .run();
    await expect(
      isMediaAssetPublic(publicAsset.id, connection.db),
    ).resolves.toBe(true);
    await expect(
      isMediaAssetPublic(privateAsset.id, connection.db),
    ).resolves.toBe(false);
  });

  it("cascades relation rows when their parent is deleted", () => {
    const member = connection.db
      .insert(members)
      .values({ slug: "member", name: "Member", group: "student" })
      .returning({ id: members.id })
      .get();
    const project = connection.db
      .insert(projects)
      .values({ slug: "project", title: "Project" })
      .returning({ id: projects.id })
      .get();
    connection.db
      .insert(projectMembers)
      .values({ projectId: project.id, memberId: member.id })
      .run();

    connection.db.delete(projects).where(eq(projects.id, project.id)).run();
    expect(connection.db.select().from(projectMembers).all()).toHaveLength(0);
  });
});
