import { readFileSync } from "node:fs";

import { hashPassword } from "better-auth/crypto";
import { and, count, eq } from "drizzle-orm";

import { createAuth } from "../src/server/auth/config";
import {
  account,
  auditLogs,
  closeDatabase,
  db,
  runMigrations,
  session,
  user,
} from "../src/server/db";
import { adminCredentialsSchema } from "../src/server/validation";

type Command = "create" | "reset-password";

function flag(name: string): string | undefined {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];

  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function passwordInput(): string | undefined {
  if (hasFlag("password-stdin")) {
    return readFileSync(0, "utf8").replace(/[\r\n]+$/, "");
  }
  return flag("password") ?? process.env.ADMIN_PASSWORD;
}

function usage(): never {
  throw new Error(
    [
      "用法：",
      "  pnpm admin:create -- --email admin@example.com --name 管理员 --password-stdin",
      "  pnpm admin:reset-password -- --email admin@example.com --password-stdin",
      "也可通过 ADMIN_EMAIL、ADMIN_NAME、ADMIN_PASSWORD 环境变量传入。",
    ].join("\n"),
  );
}

async function createAdministrator(): Promise<void> {
  const parsed = adminCredentialsSchema.safeParse({
    email: flag("email") ?? process.env.ADMIN_EMAIL,
    name: flag("name") ?? process.env.ADMIN_NAME ?? "管理员",
    password: passwordInput(),
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }

  const existing = db.select({ value: count() }).from(user).get()?.value ?? 0;
  if (existing > 0) {
    throw new Error(
      "管理员已存在；如需修改密码，请使用 admin:reset-password。 ",
    );
  }

  const cliAuth = createAuth({ allowSignUp: true });
  const result = await cliAuth.api.signUpEmail({ body: parsed.data });
  const administratorId = result.user.id;
  const now = new Date();

  db.transaction((tx) => {
    tx.update(user)
      .set({ emailVerified: true, updatedAt: now })
      .where(eq(user.id, administratorId))
      .run();
    tx.delete(session).where(eq(session.userId, administratorId)).run();
    tx.insert(auditLogs)
      .values({
        userId: administratorId,
        action: "admin.create",
        entityType: "administrator",
        entityId: administratorId,
        detailsJson: { source: "cli" },
      })
      .run();
  });

  console.info(`管理员已创建：${parsed.data.email}`);
}

async function resetAdministratorPassword(): Promise<void> {
  const email = (flag("email") ?? process.env.ADMIN_EMAIL)
    ?.trim()
    .toLowerCase();
  const password = passwordInput();
  const passwordResult =
    adminCredentialsSchema.shape.password.safeParse(password);
  if (!passwordResult.success) {
    throw new Error(
      passwordResult.error.issues.map((issue) => issue.message).join("；"),
    );
  }

  const administrators = db.select().from(user).limit(2).all();
  if (administrators.length !== 1) {
    throw new Error("数据库中必须恰好存在一个管理员账号。 ");
  }
  const administrator = administrators[0];
  if (email && administrator.email.toLowerCase() !== email) {
    throw new Error("指定邮箱与现有管理员不匹配。 ");
  }

  const credentialAccount = db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, administrator.id),
        eq(account.providerId, "credential"),
      ),
    )
    .get();
  if (!credentialAccount) {
    throw new Error("管理员账号缺少 credential 登录记录。 ");
  }

  const passwordHash = await hashPassword(passwordResult.data);
  const now = new Date();
  db.transaction((tx) => {
    tx.update(account)
      .set({ password: passwordHash, updatedAt: now })
      .where(eq(account.id, credentialAccount.id))
      .run();
    tx.delete(session).where(eq(session.userId, administrator.id)).run();
    tx.update(user)
      .set({ updatedAt: now })
      .where(eq(user.id, administrator.id))
      .run();
    tx.insert(auditLogs)
      .values({
        userId: administrator.id,
        action: "admin.password.reset",
        entityType: "administrator",
        entityId: administrator.id,
        detailsJson: { source: "cli", sessionsRevoked: true },
      })
      .run();
  });

  console.info(`管理员密码已重置，全部现有会话已撤销：${administrator.email}`);
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  if (command !== "create" && command !== "reset-password") usage();
  if (
    !process.env.BETTER_AUTH_SECRET &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("生产环境必须设置 BETTER_AUTH_SECRET。 ");
  }

  runMigrations();
  if (command === "create") await createAdministrator();
  else await resetAdministratorPassword();
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
  });
