import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import BetterSqlite3 from "better-sqlite3";

import {
  assertDatabaseHealthy,
  closeDatabase,
  databasePath,
  runMigrations,
  sqlite,
} from "../src/server/db";

const backupRoot = path.resolve(
  process.cwd(),
  process.env.BACKUP_DIR ||
    (process.env.NODE_ENV === "production" ? "/data/backups" : "./backups"),
);
const uploadRoot = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR ||
    (process.env.NODE_ENV === "production"
      ? "/data/uploads"
      : "./data/uploads"),
);
const retentionDays = Number.parseInt(
  process.env.BACKUP_RETENTION_DAYS || "30",
  10,
);

function backupName(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function pruneExpiredBackups(): Promise<void> {
  if (!Number.isFinite(retentionDays) || retentionDays < 1) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  for (const entry of await readdir(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const target = path.join(backupRoot, entry.name);
    const metadata = await stat(target);
    if (metadata.mtimeMs < cutoff) {
      await rm(target, { recursive: true, force: true });
    }
  }
}

async function main(): Promise<void> {
  runMigrations();
  assertDatabaseHealthy();

  const destination = path.join(backupRoot, backupName());
  const databaseBackup = path.join(destination, "scilab.db");
  const uploadsBackup = path.join(destination, "uploads");
  await mkdir(destination, { recursive: true });

  try {
    await sqlite.backup(databaseBackup);

    let expectedMedia: Array<{ storageKey: string; sha256: string }> = [];
    const verificationDatabase = new BetterSqlite3(databaseBackup, {
      fileMustExist: true,
    });
    try {
      // Make the snapshot a self-contained file rather than a WAL + sidecar set.
      verificationDatabase.pragma("journal_mode = DELETE");
      const result = verificationDatabase.pragma("quick_check", {
        simple: true,
      });
      if (result !== "ok") {
        throw new Error(`备份数据库 quick_check 失败：${String(result)}`);
      }
      expectedMedia = verificationDatabase
        .prepare<[], { storageKey: string; sha256: string }>(
          "select storage_key as storageKey, sha256 from media_assets",
        )
        .all();
    } finally {
      verificationDatabase.close();
    }

    if (await pathExists(uploadRoot)) {
      await cp(uploadRoot, uploadsBackup, {
        recursive: true,
        dereference: false,
        errorOnExist: true,
      });
    } else {
      await mkdir(uploadsBackup, { recursive: true });
    }

    for (const asset of expectedMedia) {
      const mediaPath = path.resolve(uploadsBackup, asset.storageKey);
      if (!mediaPath.startsWith(`${uploadsBackup}${path.sep}`)) {
        throw new Error(`备份中发现非法媒体路径：${asset.storageKey}`);
      }
      const digest = createHash("sha256")
        .update(await readFile(mediaPath))
        .digest("hex");
      if (digest !== asset.sha256) {
        throw new Error(`媒体文件校验失败：${asset.storageKey}`);
      }
    }

    await writeFile(
      path.join(destination, "manifest.json"),
      `${JSON.stringify(
        {
          formatVersion: 1,
          createdAt: new Date().toISOString(),
          sourceDatabase: databasePath,
          sourceUploads: uploadRoot,
          sqliteQuickCheck: "ok",
          verifiedMediaFiles: expectedMedia.length,
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600 },
    );

    await pruneExpiredBackups();
    console.info(`备份完成：${destination}`);
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
  });
