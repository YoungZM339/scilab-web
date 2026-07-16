#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
COMPOSE_FILE="$PROJECT_ROOT/compose.yaml"

command -v docker >/dev/null 2>&1 || {
  printf '%s\n' "Docker smoke 需要 docker 命令。" >&2
  exit 1
}
docker compose version >/dev/null 2>&1 || {
  printf '%s\n' "Docker smoke 需要 Docker Compose v2。" >&2
  exit 1
}
command -v curl >/dev/null 2>&1 || {
  printf '%s\n' "Docker smoke 需要 curl。" >&2
  exit 1
}

export COMPOSE_PROJECT_NAME="scilab_smoke_${GITHUB_RUN_ID:-$$}_${RANDOM}"
export APP_PORT="${SCILAB_SMOKE_PORT:-31080}"
export BETTER_AUTH_SECRET="docker-smoke-only-secret-with-more-than-thirty-two-characters"
export BETTER_AUTH_URL="http://127.0.0.1:${APP_PORT}"
export SITE_URL="https://runtime-smoke.example.test"

compose() {
  docker compose --project-directory "$PROJECT_ROOT" -f "$COMPOSE_FILE" "$@"
}

cleanup() {
  local exit_code=$?
  trap - EXIT
  if (( exit_code != 0 )); then
    printf '%s\n' "Docker smoke 失败，最近日志如下：" >&2
    compose logs --tail=120 app >&2 || true
  fi
  compose down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "$exit_code"
}
trap cleanup EXIT

printf '%s\n' "[smoke] 检查 Compose 配置并构建镜像……"
compose config --quiet
compose build app

printf '%s\n' "[smoke] 启动应用并等待健康检查……"
compose up -d --wait app
curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null

robots="$(curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT}/robots.txt")"
grep -Fq "https://runtime-smoke.example.test/sitemap.xml" <<< "$robots" || {
  printf '%s\n' "robots.txt 没有使用容器启动时传入的 SITE_URL。" >&2
  exit 1
}

marker="smoke-${COMPOSE_PROJECT_NAME}"
printf '%s\n' "[smoke] 写入数据库和上传卷持久化标记……"
compose exec -T -e "SMOKE_MARKER=$marker" app node <<'NODE'
const fs = require("node:fs");
const Database = require("better-sqlite3");

const marker = process.env.SMOKE_MARKER;
if (!marker) throw new Error("缺少 smoke marker");
const database = new Database("/data/scilab.db");
try {
  const migrationTable = database
    .prepare(
      "select name from sqlite_master where type = 'table' and name = '__drizzle_migrations'",
    )
    .get();
  if (!migrationTable) throw new Error("Drizzle migration 尚未执行");
  database.exec(
    "create table if not exists docker_smoke_persistence (marker text primary key)",
  );
  database
    .prepare("insert or replace into docker_smoke_persistence(marker) values (?)")
    .run(marker);
} finally {
  database.close();
}
fs.mkdirSync("/data/uploads", { recursive: true });
fs.writeFileSync("/data/uploads/.docker-smoke-persistence", `${marker}\n`, {
  mode: 0o600,
});
NODE

printf '%s\n' "[smoke] 重启容器并复查持久卷……"
compose restart app
compose up -d --wait app
curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null

compose exec -T -e "SMOKE_MARKER=$marker" app node <<'NODE'
const fs = require("node:fs");
const Database = require("better-sqlite3");

const marker = process.env.SMOKE_MARKER;
const database = new Database("/data/scilab.db", {
  readonly: true,
  fileMustExist: true,
});
try {
  const row = database
    .prepare("select marker from docker_smoke_persistence where marker = ?")
    .get(marker);
  if (!row) throw new Error("容器重启后数据库标记丢失");
  const integrity = database.pragma("quick_check", { simple: true });
  if (integrity !== "ok") throw new Error(`SQLite quick_check 失败：${integrity}`);
} finally {
  database.close();
}
const uploadMarker = fs
  .readFileSync("/data/uploads/.docker-smoke-persistence", "utf8")
  .trim();
if (uploadMarker !== marker) throw new Error("容器重启后上传卷标记丢失");
NODE

printf '%s\n' "[smoke] 通过：migration、健康检查、运行时域名和持久卷均正常。"
