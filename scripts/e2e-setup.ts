import { mkdir, rm, unlink } from "node:fs/promises";
import path from "node:path";

import { seedPublicAccessibilityFixtures } from "../tests/e2e/accessibility-fixtures";

async function main() {
  const databasePath = process.env.DATABASE_PATH;
  const uploadDirectory = process.env.UPLOAD_DIR;
  const email = process.env.E2E_ADMIN_EMAIL;
  const name = process.env.E2E_ADMIN_NAME;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!databasePath || !uploadDirectory || !email || !name || !password) {
    throw new Error("E2E 数据库、上传目录和管理员环境变量必须完整配置");
  }

  await Promise.all([
    unlink(databasePath).catch(() => undefined),
    unlink(`${databasePath}-shm`).catch(() => undefined),
    unlink(`${databasePath}-wal`).catch(() => undefined),
    rm(uploadDirectory, { recursive: true, force: true }),
    // unstable_cache persists between local dev-server runs. Clearing only its
    // generated cache keeps the isolated E2E database and rendered data in sync.
    rm(path.join(process.cwd(), ".next", "cache"), {
      recursive: true,
      force: true,
    }),
    rm(path.join(process.cwd(), ".next", "dev", "cache"), {
      recursive: true,
      force: true,
    }),
  ]);
  await Promise.all([
    mkdir(path.dirname(databasePath), { recursive: true }),
    mkdir(uploadDirectory, { recursive: true }),
  ]);

  const [{ createAuth }, database, { eq }] = await Promise.all([
    import("../src/server/auth/config"),
    import("../src/server/db"),
    import("drizzle-orm"),
  ]);

  try {
    database.runMigrations();
    seedPublicAccessibilityFixtures(database.sqlite);
    const auth = createAuth({ allowSignUp: true });
    const result = await auth.api.signUpEmail({
      body: { email, name, password },
    });
    database.db
      .update(database.user)
      .set({ emailVerified: true })
      .where(eq(database.user.id, result.user.id))
      .run();
    database.db
      .delete(database.session)
      .where(eq(database.session.userId, result.user.id))
      .run();
    console.info(`E2E 管理员与隔离数据库已初始化：${email}`);
  } finally {
    database.closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
