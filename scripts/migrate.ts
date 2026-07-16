import {
  assertDatabaseHealthy,
  closeDatabase,
  databasePath,
  runMigrations,
} from "../src/server/db";

try {
  runMigrations();
  assertDatabaseHealthy();
  console.info(`数据库迁移完成：${databasePath}`);
} finally {
  closeDatabase();
}
