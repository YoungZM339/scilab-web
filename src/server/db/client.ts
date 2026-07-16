import { mkdirSync } from "node:fs";
import path from "node:path";

import BetterSqlite3 from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export type SqliteClient = InstanceType<typeof BetterSqlite3>;
export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  db: AppDatabase;
  sqlite: SqliteClient;
  path: string;
}

const globalDatabase = globalThis as typeof globalThis & {
  __scilabDatabase?: DatabaseConnection;
};

export function getDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  // Docker explicitly sets /data/scilab.db. Keeping the code default local also
  // lets CI and `next build` run as an unprivileged user.
  const fallback = "./data/scilab.db";
  const databasePath = configured || fallback;

  if (databasePath === ":memory:" || databasePath.startsWith("file:")) {
    return databasePath;
  }

  return path.resolve(/* turbopackIgnore: true */ process.cwd(), databasePath);
}

export function configureSqlite(sqlite: SqliteClient): void {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("journal_size_limit = 67108864");
}

export function createDatabase(
  databasePath = getDatabasePath(),
): DatabaseConnection {
  if (databasePath !== ":memory:" && !databasePath.startsWith("file:")) {
    mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const sqlite = new BetterSqlite3(databasePath);
  configureSqlite(sqlite);

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
    path: databasePath,
  };
}

const connection =
  globalDatabase.__scilabDatabase ??
  (globalDatabase.__scilabDatabase = createDatabase());

export const db = connection.db;
export const sqlite = connection.sqlite;
export const databasePath = connection.path;

export function closeDatabase(): void {
  if (sqlite.open) {
    sqlite.close();
  }

  delete globalDatabase.__scilabDatabase;
}
