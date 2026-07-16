import { access, cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { loadEnvFile } from "node:process";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const server = path.join(standalone, "server.js");

// The standalone server changes its cwd before loading application modules.
// Load root-level production env files first so `pnpm start` behaves like the
// other Next.js commands. Existing shell variables always keep precedence.
for (const fileName of [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
]) {
  const envPath = path.join(root, fileName);
  try {
    await access(envPath);
    loadEnvFile(envPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "ENOENT") continue;
    }
    throw new Error(`无法读取环境文件 ${envPath}`, { cause: error });
  }
}

function resolveRuntimePath(name, fallback, allowDatabaseUri = false) {
  const configured = process.env[name]?.trim() || fallback;
  if (
    allowDatabaseUri &&
    (configured === ":memory:" || configured.startsWith("file:"))
  ) {
    process.env[name] = configured;
    return;
  }
  process.env[name] = path.isAbsolute(configured)
    ? path.normalize(configured)
    : path.resolve(root, configured);
}

resolveRuntimePath("DATABASE_PATH", "./data/scilab.db", true);
resolveRuntimePath("UPLOAD_DIR", "./data/uploads");
resolveRuntimePath("BACKUP_DIR", "./backups");

try {
  await access(server);
} catch {
  console.error("未找到 standalone 构建，请先运行 pnpm build。");
  process.exit(1);
}

await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  {
    recursive: true,
    force: true,
  },
);
await cp(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
  force: true,
});

const child = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
