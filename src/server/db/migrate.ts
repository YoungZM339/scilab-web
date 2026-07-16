import path from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { db, sqlite, type AppDatabase } from "./client";

export interface MigrationOptions {
  database?: AppDatabase;
  migrationsFolder?: string;
}

export function runMigrations(options: MigrationOptions = {}): void {
  const migrationsFolder =
    options.migrationsFolder ?? path.resolve(process.cwd(), "drizzle");

  migrate(options.database ?? db, { migrationsFolder });
}

export function assertDatabaseHealthy(): void {
  const result = sqlite.pragma("quick_check", { simple: true });
  if (result !== "ok") {
    throw new Error(`SQLite quick_check failed: ${String(result)}`);
  }
}
