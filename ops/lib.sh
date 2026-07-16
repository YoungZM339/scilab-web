#!/usr/bin/env bash

# 该文件由 ops/*.sh 载入，不应单独执行。

OPS_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd -- "$OPS_DIR/.." && pwd -P)"
COMPOSE_FILE="$PROJECT_ROOT/compose.yaml"
ENV_FILE="$PROJECT_ROOT/.env"
SERVICE_NAME="app"
CONTAINER_BACKUP_ROOT="/backups"
DEFAULT_HEALTH_TIMEOUT=180
LAST_BACKUP_PATH=""
BACKUP_PATHS=()
OPERATION_LOCK_DIR=""
OPERATION_LOCK_HELD=0

if [[ -t 1 ]]; then
  _COLOR_BLUE=$'\033[34m'
  _COLOR_GREEN=$'\033[32m'
  _COLOR_YELLOW=$'\033[33m'
  _COLOR_RED=$'\033[31m'
  _COLOR_RESET=$'\033[0m'
else
  _COLOR_BLUE=""
  _COLOR_GREEN=""
  _COLOR_YELLOW=""
  _COLOR_RED=""
  _COLOR_RESET=""
fi

log_info() {
  printf '%s[信息]%s %s\n' "$_COLOR_BLUE" "$_COLOR_RESET" "$*"
}

log_success() {
  printf '%s[完成]%s %s\n' "$_COLOR_GREEN" "$_COLOR_RESET" "$*"
}

log_warn() {
  printf '%s[注意]%s %s\n' "$_COLOR_YELLOW" "$_COLOR_RESET" "$*" >&2
}

log_error() {
  printf '%s[错误]%s %s\n' "$_COLOR_RED" "$_COLOR_RESET" "$*" >&2
}

die() {
  log_error "$*"
  exit 1
}

operation_lock_path() {
  local project_name key
  project_name="${COMPOSE_PROJECT_NAME:-}"
  if [[ -z "$project_name" && -f "$ENV_FILE" ]]; then
    project_name="$(read_dotenv_value COMPOSE_PROJECT_NAME || true)"
  fi
  if [[ -z "$project_name" ]]; then
    project_name="$(basename -- "$PROJECT_ROOT" | tr '[:upper:]' '[:lower:]' | \
      sed 's/[^a-z0-9_-]//g; s/^[^a-z0-9]*//')"
  fi
  [[ -n "$project_name" ]] || return 1
  [[ "$project_name" != *$'\n'* && "$project_name" != *$'\r'* ]] || return 1
  key="$(printf 'compose-project:%s' "$project_name" | cksum | awk '{print $1}')"
  [[ "$key" =~ ^[0-9]+$ ]] || return 1
  printf '/tmp/scilab-web-ops-%s.lock' "$key"
}

release_operation_lock() {
  local expected owner_pid
  (( OPERATION_LOCK_HELD == 1 )) || return 0
  expected="$(operation_lock_path)" || return 1
  [[ "$OPERATION_LOCK_DIR" == "$expected" && -d "$OPERATION_LOCK_DIR" && ! -L "$OPERATION_LOCK_DIR" ]] || {
    log_warn "运维锁目录状态异常，请人工检查：$OPERATION_LOCK_DIR"
    return 1
  }
  owner_pid="$(awk 'NR==1 {print $1}' "$OPERATION_LOCK_DIR/owner" 2>/dev/null || true)"
  if [[ "$owner_pid" == "$$" ]]; then
    rm -f -- "$OPERATION_LOCK_DIR/owner"
    rmdir -- "$OPERATION_LOCK_DIR" 2>/dev/null || {
      log_warn "运维锁目录中出现未知文件，未自动删除：$OPERATION_LOCK_DIR"
      return 1
    }
  else
    log_warn "运维锁所有者发生变化，未自动删除：$OPERATION_LOCK_DIR"
    return 1
  fi
  OPERATION_LOCK_HELD=0
}

acquire_operation_lock() {
  local operation="${1:-运维操作}"
  local lock_path owner_pid unexpected attempt
  lock_path="$(operation_lock_path)" || die "无法生成运维锁路径。"

  for attempt in 1 2; do
    if mkdir -m 700 -- "$lock_path" 2>/dev/null; then
      OPERATION_LOCK_DIR="$lock_path"
      OPERATION_LOCK_HELD=1
      if ! printf '%s %s\n' "$$" "$operation" > "$lock_path/owner" || \
         ! chmod 600 "$lock_path/owner"; then
        rm -f -- "$lock_path/owner" 2>/dev/null || true
        rmdir -- "$lock_path" 2>/dev/null || true
        OPERATION_LOCK_HELD=0
        OPERATION_LOCK_DIR=""
        die "无法初始化运维锁；请检查 /tmp 权限后重试。"
      fi
      return 0
    fi

    if [[ -d "$lock_path" && ! -L "$lock_path" && -f "$lock_path/owner" && ! -L "$lock_path/owner" ]]; then
      owner_pid="$(awk 'NR==1 {print $1}' "$lock_path/owner" 2>/dev/null || true)"
      unexpected="$(find "$lock_path" -mindepth 1 -maxdepth 1 ! -name owner -print -quit 2>/dev/null || true)"
      if [[ "$owner_pid" =~ ^[0-9]+$ && -z "$unexpected" ]] && \
         ! kill -0 "$owner_pid" 2>/dev/null && [[ ! -d "/proc/$owner_pid" ]]; then
        log_warn "发现已中断的旧运维操作，正在安全清理它留下的锁。"
        if rm -f -- "$lock_path/owner" 2>/dev/null && rmdir -- "$lock_path" 2>/dev/null; then
          continue
        fi
        die "旧运维锁属于其他系统用户，无法自动清理：$lock_path。请确认没有运维操作后再人工删除。"
      fi
      die "另一个运维操作正在执行（PID：${owner_pid:-未知}）。请等待其完成后重试。"
    fi
    die "发现无法识别的运维锁：$lock_path。为保护数据，脚本不会自动删除它。"
  done
  die "无法取得运维锁，请稍后重试。"
}

trim_whitespace() {
  local value="${1-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

read_dotenv_value() {
  local key="$1"
  local line raw value=""
  local double_quoted='^"([^"]*)"[[:space:]]*(#.*)?$'
  local single_quoted="^'([^']*)'[[:space:]]*(#.*)?$"
  local inline_comment='^(.*[^[:space:]])[[:space:]]+#.*$'

  [[ -f "$ENV_FILE" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*${key}[[:space:]]*=(.*)$ ]]; then
      raw="${BASH_REMATCH[1]}"
      value="$(trim_whitespace "$raw")"
      if [[ "$value" == '"'* ]]; then
        [[ "$value" =~ $double_quoted ]] || return 2
        value="${BASH_REMATCH[1]}"
      elif [[ "$value" == "'"* ]]; then
        [[ "$value" =~ $single_quoted ]] || return 2
        value="${BASH_REMATCH[1]}"
      elif [[ "$raw" =~ ^[[:space:]]+# ]]; then
        value=""
      elif [[ "$value" =~ $inline_comment ]]; then
        value="$(trim_whitespace "${BASH_REMATCH[1]}")"
      fi
    fi
  done < "$ENV_FILE"

  [[ -n "$value" ]] || return 1
  printf '%s' "$value"
}

read_optional_dotenv_value() {
  local key="$1"
  local target_variable="$2"
  local parsed status

  if parsed="$(read_dotenv_value "$key")"; then
    printf -v "$target_variable" '%s' "$parsed"
    return 0
  else
    status=$?
  fi
  printf -v "$target_variable" '%s' ""
  if (( status == 2 )); then
    die ".env 中的 $key 使用了不支持或不完整的引号格式；请改为简单未引号值，或用一对完整的单/双引号包裹。"
  fi
  return 1
}

compose() {
  local configured_site="" legacy_site=""
  if [[ ${SITE_URL+x} ]]; then
    docker compose --project-directory "$PROJECT_ROOT" -f "$COMPOSE_FILE" "$@"
    return
  fi
  read_optional_dotenv_value SITE_URL configured_site || true
  if [[ -z "$configured_site" ]]; then
    if [[ ${NEXT_PUBLIC_SITE_URL+x} ]]; then
      legacy_site="$NEXT_PUBLIC_SITE_URL"
    else
      read_optional_dotenv_value NEXT_PUBLIC_SITE_URL legacy_site || true
    fi
    if [[ -n "$legacy_site" ]]; then
      SITE_URL="$legacy_site" docker compose --project-directory "$PROJECT_ROOT" -f "$COMPOSE_FILE" "$@"
      return
    fi
  fi
  docker compose --project-directory "$PROJECT_ROOT" -f "$COMPOSE_FILE" "$@"
}

require_docker_compose() {
  command -v docker >/dev/null 2>&1 || die "未找到 docker。请先安装 Docker Engine 或 Docker Desktop。"
  docker compose version >/dev/null 2>&1 || die "未找到 Docker Compose v2。请确认命令 'docker compose version' 可用。"
  [[ -f "$COMPOSE_FILE" ]] || die "未找到 Compose 文件：$COMPOSE_FILE"
  docker info >/dev/null 2>&1 || die "无法连接 Docker。请先启动 Docker，并确认当前用户有权限运行 docker。"
}

generate_auth_secret() {
  local secret=""
  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -hex 48)"
  elif command -v od >/dev/null 2>&1 && [[ -r /dev/urandom ]]; then
    secret="$(od -An -N48 -tx1 /dev/urandom | tr -d '[:space:]')"
  else
    return 1
  fi

  [[ "$secret" =~ ^[0-9a-fA-F]{96}$ ]] || return 1
  printf '%s' "$secret"
}

ensure_env_file() {
  local secret port site_url temp_file

  if [[ -e "$ENV_FILE" ]]; then
    [[ -f "$ENV_FILE" ]] || die "$ENV_FILE 不是普通文件，请人工检查后重试。"
    return 0
  fi

  secret="$(generate_auth_secret)" || die "无法生成安全随机密钥；请安装 openssl 后重试。"
  port="${APP_PORT:-3000}"
  if [[ ! "$port" =~ ^[0-9]{1,5}$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
    port=3000
  else
    port="$((10#$port))"
  fi
  site_url="http://localhost:$port"
  temp_file="$(mktemp "$PROJECT_ROOT/.env.tmp.XXXXXX")" || die "无法在项目目录创建临时配置文件。"
  chmod 600 "$temp_file"

  if ! {
    printf '%s\n' "# 由 ops/start.sh 首次启动时生成。请勿提交此文件。"
    printf 'BETTER_AUTH_SECRET=%s\n' "$secret"
    printf 'BETTER_AUTH_URL=%s\n' "$site_url"
    printf 'SITE_URL=%s\n' "$site_url"
    printf 'APP_PORT=%s\n' "$port"
    printf '%s\n' "# 公网部署时，请把上面两个 URL 改成真实的 https:// 域名。"
  } > "$temp_file"; then
    rm -f -- "$temp_file"
    die "写入临时 .env 文件失败。"
  fi

  if [[ -e "$ENV_FILE" ]]; then
    rm -f -- "$temp_file"
    die ".env 在生成过程中被其他程序创建；为避免覆盖，已停止。请检查该文件后重试。"
  fi
  mv -- "$temp_file" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log_success "已生成 $ENV_FILE，并写入随机认证密钥（密钥不会显示在终端）。"
  log_warn "当前 URL 是本机 HTTP 地址；如果要对外发布，请先改为真实 HTTPS 域名。"
}

validate_env_file() {
  local secret file_secret lower_mode mode auth_url site_url url_name url_value secret_source
  local using_legacy_site_url=0

  [[ -f "$ENV_FILE" ]] || die "缺少 $ENV_FILE。请先运行 ops/start.sh。"
  read_optional_dotenv_value BETTER_AUTH_SECRET file_secret || true
  [[ -n "$file_secret" ]] || die ".env 中缺少 BETTER_AUTH_SECRET。请设置至少 32 个字符的随机值。"
  if [[ ${BETTER_AUTH_SECRET+x} ]]; then
    secret="$BETTER_AUTH_SECRET"
  else
    secret="$file_secret"
  fi
  for secret_source in "$file_secret" "$secret"; do
    [[ -n "$secret_source" ]] || die "当前 shell 中的 BETTER_AUTH_SECRET 为空，会覆盖 .env。"
    [[ "$secret_source" =~ ^[0-9a-fA-F]{32,}$ ]] || \
      die "BETTER_AUTH_SECRET 必须是至少 32 位的随机十六进制值；可运行 openssl rand -hex 48 生成。"
    lower_mode="$(printf '%s' "$secret_source" | tr '[:upper:]' '[:lower:]')"
    if [[ "$lower_mode" == *replace* || "$lower_mode" == *change-me* || "$lower_mode" == *example* ]]; then
      die "BETTER_AUTH_SECRET 看起来仍是示例值，请替换为安全随机值。"
    fi
  done

  if [[ ${BETTER_AUTH_URL+x} ]]; then
    auth_url="$BETTER_AUTH_URL"
  else
    read_optional_dotenv_value BETTER_AUTH_URL auth_url || true
  fi
  if [[ ${SITE_URL+x} ]]; then
    site_url="$SITE_URL"
  elif read_optional_dotenv_value SITE_URL site_url; then
    :
  elif [[ ${NEXT_PUBLIC_SITE_URL+x} ]]; then
    site_url="$NEXT_PUBLIC_SITE_URL"
    using_legacy_site_url=1
  else
    read_optional_dotenv_value NEXT_PUBLIC_SITE_URL site_url || true
    [[ -z "$site_url" ]] || using_legacy_site_url=1
  fi
  if (( using_legacy_site_url == 1 )); then
    log_warn "正在兼容旧的 NEXT_PUBLIC_SITE_URL；请将它改名为 SITE_URL，使域名配置明确在运行时生效。"
  fi
  for url_name in BETTER_AUTH_URL SITE_URL; do
    if [[ "$url_name" == BETTER_AUTH_URL ]]; then
      url_value="$auth_url"
    else
      url_value="$site_url"
    fi
    if [[ -z "$url_value" ]]; then
      log_warn "$url_name 未设置，将使用 Compose 的 localhost 默认值。"
    elif [[ ! "$url_value" =~ ^https?://[^[:space:]\$\#\"\'\\]+$ ]]; then
      die "$url_name 必须是完整的 http:// 或 https:// URL。"
    elif [[ "$url_value" == http://* && "$url_value" != http://localhost* && "$url_value" != http://127.0.0.1* ]]; then
      log_warn "$url_name 使用公网 HTTP；正式部署应改成 HTTPS。"
    fi
  done

  if command -v stat >/dev/null 2>&1; then
    mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || true)"
    if [[ -n "$mode" ]] && (( (10#$mode % 100) != 0 )); then
      log_warn ".env 可能允许其他用户读取。建议运行：chmod 600 '$ENV_FILE'"
    fi
  fi
}

validate_compose_config() {
  local output
  if ! output="$(compose config --quiet 2>&1)"; then
    log_error "Compose 配置检查失败："
    printf '%s\n' "$output" >&2
    return 1
  fi
}

service_container_ids() {
  compose ps --all -q "$SERVICE_NAME" 2>/dev/null
}

service_container_id() {
  local container_ids container_id oneoff
  container_ids="$(service_container_ids)" || return 1
  while IFS= read -r container_id; do
    [[ -n "$container_id" ]] || continue
    oneoff="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.oneoff"}}' \
      "$container_id" 2>/dev/null)" || return 1
    if [[ "$oneoff" != "True" && "$oneoff" != "true" ]]; then
      printf '%s\n' "$container_id"
      return 0
    fi
  done <<< "$container_ids"
}

service_is_confirmed_stopped() {
  local container_ids container_id running
  container_ids="$(service_container_ids)" || return 1
  while IFS= read -r container_id; do
    [[ -n "$container_id" ]] || continue
    running="$(docker inspect --format '{{.State.Running}}' "$container_id" 2>/dev/null)" || return 1
    [[ "$running" == "false" ]] || return 1
  done <<< "$container_ids"
  return 0
}

service_running_state() {
  local container_id running
  container_id="$(service_container_id)" || return 1
  if [[ -z "$container_id" ]]; then
    printf '%s\n' missing
    return 0
  fi
  running="$(docker inspect --format '{{.State.Running}}' "$container_id" 2>/dev/null)" || return 1
  case "$running" in
    true) printf '%s\n' running ;;
    false) printf '%s\n' stopped ;;
    *) return 1 ;;
  esac
}

service_is_running() {
  [[ "$(service_running_state)" == "running" ]]
}

ensure_service_running() {
  service_is_running || die "应用当前没有运行。请先执行 ops/start.sh。"
}

ensure_service_healthy() {
  local container_id status
  ensure_service_running
  container_id="$(service_container_id)"
  status="$(container_health_status "$container_id" || true)"
  [[ "$status" == "healthy" || "$status" == "running" ]] || \
    die "应用当前不健康（状态：${status:-未知}），为保护数据已停止操作。请先运行 ops/status.sh。"
}

health_timeout() {
  local timeout="${SCILAB_HEALTH_TIMEOUT:-$DEFAULT_HEALTH_TIMEOUT}"
  if [[ ! "$timeout" =~ ^[0-9]{1,4}$ ]] || (( 10#$timeout < 10 || 10#$timeout > 1800 )); then
    timeout="$DEFAULT_HEALTH_TIMEOUT"
  else
    timeout="$((10#$timeout))"
  fi
  printf '%s' "$timeout"
}

container_health_status() {
  local container_id="$1"
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null
}

show_recent_logs() {
  log_info "最近的应用日志如下："
  compose logs --tail=80 "$SERVICE_NAME" 2>&1 || true
}

wait_for_healthy() {
  local timeout="${1:-$(health_timeout)}"
  local started_at=$SECONDS
  local container_id status last_status=""

  log_info "等待应用健康检查通过（最多 ${timeout} 秒）……"
  while (( SECONDS - started_at < timeout )); do
    container_id="$(service_container_id || true)"
    if [[ -n "$container_id" ]]; then
      status="$(container_health_status "$container_id" || true)"
      if [[ "$status" != "$last_status" && -n "$status" ]]; then
        log_info "当前容器状态：$status"
        last_status="$status"
      fi
      case "$status" in
        healthy)
          log_success "应用健康检查已通过。"
          return 0
          ;;
        unhealthy | exited | dead)
          log_error "容器状态为 $status。"
          show_recent_logs
          return 1
          ;;
        running)
          # 当前 Compose 定义了 healthcheck；保留此分支兼容以后移除 healthcheck 的情况。
          sleep 3
          log_success "应用容器已运行（当前镜像未提供 healthcheck）。"
          return 0
          ;;
      esac
    fi
    sleep 2
  done

  log_error "等待健康检查超时。"
  show_recent_logs
  return 1
}

configured_site_url() {
  local value port
  if [[ ${SITE_URL+x} ]]; then
    value="$SITE_URL"
  else
    read_optional_dotenv_value SITE_URL value || true
  fi
  if [[ -z "$value" ]]; then
    if [[ ${NEXT_PUBLIC_SITE_URL+x} ]]; then
      value="$NEXT_PUBLIC_SITE_URL"
    else
      read_optional_dotenv_value NEXT_PUBLIC_SITE_URL value || true
    fi
  fi
  if [[ -z "$value" ]]; then
    read_optional_dotenv_value BETTER_AUTH_URL value || true
    value="${BETTER_AUTH_URL:-$value}"
  fi
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return
  fi
  read_optional_dotenv_value APP_PORT port || true
  port="${APP_PORT:-$port}"
  if [[ ! "$port" =~ ^[0-9]{1,5}$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
    port=3000
  else
    port="$((10#$port))"
  fi
  printf 'http://localhost:%s' "$port"
}

path_has_parent_reference() {
  local value="$1"
  [[ "$value" == ".." || "$value" == ../* || "$value" == */../* || "$value" == */.. ]]
}

resolve_backup_root() {
  local configured="${SCILAB_BACKUP_DIR:-}"
  local candidate canonical

  if [[ -z "$configured" ]]; then
    read_optional_dotenv_value SCILAB_BACKUP_DIR configured || true
  fi
  [[ -n "$configured" ]] || configured="$OPS_DIR/backups"
  configured="$(trim_whitespace "$configured")"
  [[ -n "$configured" ]] || die "备份目录不能为空。"
  [[ "$configured" != *$'\n'* && "$configured" != *$'\r'* ]] || die "备份目录包含非法换行符。"
  [[ "$configured" != *'$'* && "$configured" != *'#'* && \
     "$configured" != *'\\'* && "$configured" != *'"'* && "$configured" != *"'"* ]] || \
    die "备份目录不能包含 $、#、引号或反斜杠；请使用普通绝对路径或项目内相对路径。"
  [[ "$configured" != '~'* ]] || die "备份目录不能使用 ~，请使用绝对路径或项目内相对路径。"
  path_has_parent_reference "$configured" && die "备份目录不能包含 '..' 路径段。"

  if [[ "$configured" == /* ]]; then
    candidate="$configured"
  else
    candidate="$PROJECT_ROOT/$configured"
  fi

  mkdir -p -- "$candidate" || die "无法创建备份目录：$candidate"
  canonical="$(cd -- "$candidate" && pwd -P)" || die "无法解析备份目录：$candidate"
  [[ "$canonical" != "/" && "$canonical" != "$PROJECT_ROOT" ]] || die "备份目录不能是根目录或项目根目录。"
  printf '%s' "$canonical"
}

backup_name_is_safe() {
  local name="$1"
  [[ "$name" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}Z$ ]]
}

validate_backup_payload() {
  local root="$1"
  local path="$2"
  local expected_name="${3-}"
  local canonical unexpected symlink payload_name

  [[ -d "$path" && ! -L "$path" ]] || return 1
  canonical="$(cd -- "$path" && pwd -P)" || return 1
  [[ "$(dirname -- "$canonical")" == "$root" ]] || return 1
  payload_name="${expected_name:-$(basename -- "$canonical")}"
  backup_name_is_safe "$payload_name" || return 1
  [[ -f "$canonical/scilab.db" && ! -L "$canonical/scilab.db" ]] || return 1
  [[ -f "$canonical/manifest.json" && ! -L "$canonical/manifest.json" ]] || return 1
  [[ -d "$canonical/uploads" && ! -L "$canonical/uploads" ]] || return 1

  unexpected="$(find "$canonical" -mindepth 1 -maxdepth 1 \
    ! -name scilab.db ! -name manifest.json ! -name uploads -print -quit 2>/dev/null || true)"
  [[ -z "$unexpected" ]] || return 1
  symlink="$(find "$canonical" -type l -print -quit 2>/dev/null || true)"
  [[ -z "$symlink" ]]
}

collect_backups() {
  local root="$1"
  local candidate name
  local names=()
  BACKUP_PATHS=()

  shopt -s nullglob
  for candidate in "$root"/*; do
    if validate_backup_payload "$root" "$candidate"; then
      names+=("$(basename -- "$candidate")")
    else
      log_warn "跳过格式不完整或不安全的目录：$candidate"
    fi
  done
  shopt -u nullglob

  if (( ${#names[@]} > 0 )); then
    while IFS= read -r name; do
      BACKUP_PATHS+=("$root/$name")
    done < <(printf '%s\n' "${names[@]}" | LC_ALL=C sort -r)
  fi
}

safe_remove_host_temp() {
  local root="$1"
  local target="$2"
  [[ "$target" == "$root"/.incoming-* && -d "$target" && ! -L "$target" ]] || return 1
  rm -rf -- "$target"
}

perform_backup_impl() {
  local mode="$1"
  local root output container_path name destination temp_dir line

  root="$(resolve_backup_root)" || return 1
  if [[ "$mode" == "online" ]]; then
    log_info "正在调用运行中应用的 SQLite 在线一致性备份……"
    if ! output="$(compose exec -T -e "BACKUP_DIR=$CONTAINER_BACKUP_ROOT" "$SERVICE_NAME" pnpm db:backup 2>&1)"; then
      log_error "容器内备份失败："
      printf '%s\n' "$output" >&2
      return 1
    fi
  elif [[ "$mode" == "offline" ]]; then
    log_info "正在从已停止的数据卷创建不执行迁移的 SQLite 一致性备份……"
    if ! output="$(compose run --rm --no-deps -T --user 0:0 --entrypoint node \
      -e "BACKUP_DIR=$CONTAINER_BACKUP_ROOT" "$SERVICE_NAME" -e '
        const crypto = require("node:crypto");
        const fs = require("node:fs/promises");
        const path = require("node:path");
        const Database = require("better-sqlite3");

        const databasePath = "/data/scilab.db";
        const uploadRoot = "/data/uploads";
        const backupRoot = process.env.BACKUP_DIR || "/backups";
        const name = new Date().toISOString().replace(/[:.]/g, "-");
        const destination = path.join(backupRoot, name);
        const databaseBackup = path.join(destination, "scilab.db");
        const uploadsBackup = path.join(destination, "uploads");

        async function assertSafeTree(target) {
          const metadata = await fs.lstat(target);
          if (metadata.isSymbolicLink()) throw new Error(`上传目录包含符号链接：${target}`);
          if (metadata.isDirectory()) {
            for (const entry of await fs.readdir(target)) await assertSafeTree(path.join(target, entry));
          } else if (!metadata.isFile()) {
            throw new Error(`上传目录包含特殊文件：${target}`);
          }
        }

        async function secureTree(target) {
          const metadata = await fs.lstat(target);
          if (metadata.isDirectory()) {
            for (const entry of await fs.readdir(target)) await secureTree(path.join(target, entry));
            await fs.chmod(target, 0o700);
          } else {
            await fs.chmod(target, 0o600);
          }
          await fs.chown(target, 1001, 1001);
        }

        async function main() {
          await fs.mkdir(destination, { recursive: false, mode: 0o700 });
          let source;
          try {
            source = new Database(databasePath, { readonly: true, fileMustExist: true });
            const quickCheck = source.pragma("quick_check", { simple: true });
            if (quickCheck !== "ok") throw new Error(`SQLite quick_check 失败：${quickCheck}`);
            const mediaTable = source.prepare(
              "select 1 from sqlite_master where type = ? and name = ?",
            ).get("table", "media_assets");
            if (!mediaTable) throw new Error("数据库缺少 media_assets 表，无法生成可恢复的一致性备份");
            await source.backup(databaseBackup);
          } finally {
            if (source) source.close();
          }

          const verification = new Database(databaseBackup, { fileMustExist: true });
          let assets;
          try {
            verification.pragma("journal_mode = DELETE");
            const quickCheck = verification.pragma("quick_check", { simple: true });
            if (quickCheck !== "ok") throw new Error(`备份数据库 quick_check 失败：${quickCheck}`);
            assets = verification.prepare(
              "select storage_key as storageKey, sha256 from media_assets",
            ).all();
          } finally {
            verification.close();
          }

          try {
            await assertSafeTree(uploadRoot);
            await fs.cp(uploadRoot, uploadsBackup, { recursive: true, dereference: false, errorOnExist: true });
          } catch (error) {
            if (error && error.code === "ENOENT") await fs.mkdir(uploadsBackup, { mode: 0o700 });
            else throw error;
          }

          for (const asset of assets) {
            const mediaPath = path.resolve(uploadsBackup, asset.storageKey);
            if (!mediaPath.startsWith(`${uploadsBackup}${path.sep}`)) {
              throw new Error(`数据库包含非法媒体路径：${asset.storageKey}`);
            }
            const metadata = await fs.lstat(mediaPath);
            if (!metadata.isFile() || metadata.isSymbolicLink()) {
              throw new Error(`媒体不是普通文件：${asset.storageKey}`);
            }
            const digest = crypto.createHash("sha256").update(await fs.readFile(mediaPath)).digest("hex");
            if (digest !== asset.sha256) throw new Error(`媒体哈希不匹配：${asset.storageKey}`);
          }

          await fs.writeFile(
            path.join(destination, "manifest.json"),
            `${JSON.stringify({
              formatVersion: 1,
              createdAt: new Date().toISOString(),
              sourceDatabase: databasePath,
              sourceUploads: uploadRoot,
              sqliteQuickCheck: "ok",
              verifiedMediaFiles: assets.length,
            }, null, 2)}\n`,
            { mode: 0o600 },
          );
          await secureTree(destination);
          process.stdout.write(`备份完成：${destination}\n`);
        }

        main().catch(async (error) => {
          await fs.rm(destination, { recursive: true, force: true }).catch(() => {});
          process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
          process.exitCode = 1;
        });
      ' 2>&1)"; then
      log_error "容器内离线备份失败："
      printf '%s\n' "$output" >&2
      return 1
    fi
  else
    log_error "未知备份模式。"
    return 1
  fi
  printf '%s\n' "$output"

  container_path=""
  while IFS= read -r line; do
    if [[ "$line" == "备份完成："* ]]; then
      container_path="${line#备份完成：}"
    fi
  done <<< "$output"

  [[ "$container_path" == "$CONTAINER_BACKUP_ROOT"/* ]] || {
    log_error "无法从备份输出中识别安全的容器路径。"
    return 1
  }
  name="${container_path#"$CONTAINER_BACKUP_ROOT"/}"
  [[ "$name" != */* ]] && backup_name_is_safe "$name" || {
    log_error "容器返回了非法备份名称：$name"
    return 1
  }

  destination="$root/$name"
  [[ ! -e "$destination" ]] || {
    log_error "宿主机上已存在同名备份，为避免覆盖已停止：$destination"
    return 1
  }
  temp_dir="$(mktemp -d "$root/.incoming-${name}.XXXXXX")" || return 1
  if ! chmod 700 "$temp_dir"; then
    safe_remove_host_temp "$root" "$temp_dir" || true
    log_error "无法收紧备份临时目录权限。"
    return 1
  fi

  log_info "正在把备份复制到宿主机：$destination"
  if ! compose cp "$SERVICE_NAME:${container_path}/." "$temp_dir/"; then
    safe_remove_host_temp "$root" "$temp_dir" || true
    log_error "从容器复制备份失败。容器内副本仍保留在 $container_path。"
    return 1
  fi
  if ! validate_backup_payload "$root" "$temp_dir" "$name"; then
    safe_remove_host_temp "$root" "$temp_dir" || true
    log_error "复制后的备份结构校验失败；已删除本次临时目录。"
    return 1
  fi

  if ! mv -- "$temp_dir" "$destination"; then
    safe_remove_host_temp "$root" "$temp_dir" || true
    log_error "无法把已校验备份移动到最终目录。"
    return 1
  fi
  if ! validate_backup_payload "$root" "$destination" "$name"; then
    log_error "最终备份目录在移动时发生并发冲突，结果不可信；未将其标记为成功。请人工检查：$destination"
    return 1
  fi
  if ! chmod -R u=rwX,go= "$destination"; then
    log_error "备份已复制到 $destination，但无法设置安全权限；本次操作按失败处理，请人工检查。"
    return 1
  fi
  LAST_BACKUP_PATH="$destination"
  log_success "宿主机备份已完成：$LAST_BACKUP_PATH"
}

perform_backup() {
  ensure_service_healthy
  perform_backup_impl online
}

perform_offline_backup() {
  local container_id
  service_is_confirmed_stopped || {
    log_error "无法确认所有应用容器均已停止，拒绝离线读取数据卷。"
    return 1
  }
  container_id="$(service_container_id)" || return 1
  [[ -n "$container_id" ]] || {
    log_error "离线备份需要一个已创建但停止的应用容器。"
    return 1
  }
  perform_backup_impl offline
}

inspect_data_volume_state() {
  compose run --rm --no-deps -T --user 0:0 --entrypoint /bin/sh "$SERVICE_NAME" -c '
    set -eu
    state=empty
    if test -e /data/scilab.db || test -e /data/scilab.db-wal || test -e /data/scilab.db-shm; then
      state=present
    elif test -L /data/uploads || { test -e /data/uploads && test ! -d /data/uploads; }; then
      state=present
    elif test -d /data/uploads; then
      first_upload="$(find /data/uploads -mindepth 1 -print -quit)" || exit 3
      test -z "$first_upload" || state=present
    fi
    if test "$state" = empty; then
      first_other="$(find /data -mindepth 1 -maxdepth 1 ! -name uploads -print -quit)"
      test -z "$first_other" || state=present
    fi
    printf "%s\n" "$state"
  '
}

restore_id_is_safe() {
  [[ "$1" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+-[0-9]+$ ]]
}

data_uid() {
  printf '%s' 1001
}

data_gid() {
  printf '%s' 1001
}

ensure_restore_slots_empty() {
  local restore_id="$1"
  restore_id_is_safe "$restore_id" || return 1
  compose run --rm --no-deps -T --user 0:0 --entrypoint /bin/sh \
    -e "OPS_RESTORE_ID=$restore_id" "$SERVICE_NAME" -c '
      set -eu
      case "$OPS_RESTORE_ID" in *[!A-Za-z0-9_-]*|"") exit 2;; esac
      test ! -e "/data/.ops-restore-$OPS_RESTORE_ID"
      test ! -e "/data/.ops-rollback-$OPS_RESTORE_ID"
      mkdir -m 700 "/data/.ops-restore-$OPS_RESTORE_ID"
    '
}

stage_backup_in_volume() {
  local backup_path="$1"
  local restore_id="$2"
  restore_id_is_safe "$restore_id" || return 1
  compose cp "$backup_path/." "$SERVICE_NAME:/data/.ops-restore-$restore_id/"
}

validate_staged_restore() {
  local restore_id="$1"
  restore_id_is_safe "$restore_id" || return 1

  compose run --rm --no-deps -T --user 0:0 --entrypoint node \
    -e "OPS_RESTORE_ID=$restore_id" "$SERVICE_NAME" -e '
      const crypto = require("node:crypto");
      const fs = require("node:fs");
      const path = require("node:path");
      const Database = require("better-sqlite3");

      const id = process.env.OPS_RESTORE_ID || "";
      if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("非法恢复任务编号");
      const root = `/data/.ops-restore-${id}`;
      const databasePath = path.join(root, "scilab.db");
      const uploads = path.join(root, "uploads");
      const manifestPath = path.join(root, "manifest.json");

      const assertRegularFile = (target, label) => {
        const metadata = fs.lstatSync(target);
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new Error(`${label} 不是普通文件`);
        }
      };
      const assertSafeDirectoryTree = (directory) => {
        const metadata = fs.lstatSync(directory);
        if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
          throw new Error(`上传路径不是普通目录：${directory}`);
        }
        for (const entry of fs.readdirSync(directory)) {
          const target = path.join(directory, entry);
          const child = fs.lstatSync(target);
          if (child.isSymbolicLink()) throw new Error(`上传目录包含符号链接：${target}`);
          if (child.isDirectory()) assertSafeDirectoryTree(target);
          else if (!child.isFile()) throw new Error(`上传目录包含特殊文件：${target}`);
        }
      };

      const rootMetadata = fs.lstatSync(root);
      if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
        throw new Error("恢复工作区不是普通目录");
      }
      const topLevel = fs.readdirSync(root).sort();
      if (JSON.stringify(topLevel) !== JSON.stringify(["manifest.json", "scilab.db", "uploads"])) {
        throw new Error(`恢复工作区顶层结构非法：${topLevel.join(", ")}`);
      }
      assertRegularFile(databasePath, "scilab.db");
      assertRegularFile(manifestPath, "manifest.json");
      assertSafeDirectoryTree(uploads);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.formatVersion !== 1) throw new Error("不支持的备份格式版本");
      if (manifest.sqliteQuickCheck !== "ok") throw new Error("备份 manifest 未通过 quick_check 标记");

      const database = new Database(databasePath, { readonly: true, fileMustExist: true });
      try {
        const quickCheck = database.pragma("quick_check", { simple: true });
        if (quickCheck !== "ok") throw new Error(`SQLite quick_check 失败：${quickCheck}`);
        const assets = database.prepare("select storage_key as storageKey, sha256 from media_assets").all();
        if (manifest.verifiedMediaFiles !== assets.length) throw new Error("manifest 中的媒体数量与数据库不一致");
        for (const asset of assets) {
          const mediaPath = path.resolve(uploads, asset.storageKey);
          if (!mediaPath.startsWith(`${uploads}${path.sep}`)) throw new Error(`非法媒体路径：${asset.storageKey}`);
          const metadata = fs.lstatSync(mediaPath);
          if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`媒体不是普通文件：${asset.storageKey}`);
          const digest = crypto.createHash("sha256").update(fs.readFileSync(mediaPath)).digest("hex");
          if (digest !== asset.sha256) throw new Error(`媒体哈希不匹配：${asset.storageKey}`);
        }
        process.stdout.write(`恢复备份校验通过：SQLite 正常，媒体文件 ${assets.length} 个。\n`);
      } finally {
        database.close();
      }
    '
}

apply_staged_restore() {
  local restore_id="$1"
  local uid gid
  restore_id_is_safe "$restore_id" || return 1
  uid="$(data_uid)"
  gid="$(data_gid)"

  compose run --rm --no-deps -T --user 0:0 --entrypoint /bin/sh \
    -e "OPS_RESTORE_ID=$restore_id" -e "OPS_DATA_UID=$uid" -e "OPS_DATA_GID=$gid" \
    "$SERVICE_NAME" -c '
      set -eu
      case "$OPS_RESTORE_ID" in *[!A-Za-z0-9_-]*|"") exit 2;; esac
      case "$OPS_DATA_UID:$OPS_DATA_GID" in *[!0-9:]*|:|*:|*:*:*) exit 2;; esac
      stage="/data/.ops-restore-$OPS_RESTORE_ID"
      rollback="/data/.ops-rollback-$OPS_RESTORE_ID"
      test -d "$stage"
      test -f "$stage/scilab.db"
      test -d "$stage/uploads"
      test -f "$stage/manifest.json"
      test ! -e "$rollback"
      mkdir -m 700 "$rollback"

      had_db=0; had_wal=0; had_shm=0; had_uploads=0
      test ! -e /data/scilab.db || had_db=1
      test ! -e /data/scilab.db-wal || had_wal=1
      test ! -e /data/scilab.db-shm || had_shm=1
      test ! -e /data/uploads || had_uploads=1
      {
        echo "HAD_DB=$had_db"
        echo "HAD_WAL=$had_wal"
        echo "HAD_SHM=$had_shm"
        echo "HAD_UPLOADS=$had_uploads"
      } > "$rollback/state"
      chmod 600 "$rollback/state"

      test "$had_db" -eq 0 || mv /data/scilab.db "$rollback/scilab.db"
      test "$had_wal" -eq 0 || mv /data/scilab.db-wal "$rollback/scilab.db-wal"
      test "$had_shm" -eq 0 || mv /data/scilab.db-shm "$rollback/scilab.db-shm"
      test "$had_uploads" -eq 0 || mv /data/uploads "$rollback/uploads"

      mv "$stage/scilab.db" /data/scilab.db
      mv "$stage/uploads" /data/uploads
      rm -f "$stage/manifest.json"
      rmdir "$stage"

      chown "$OPS_DATA_UID:$OPS_DATA_GID" /data/scilab.db
      chmod 600 /data/scilab.db
      chown -R "$OPS_DATA_UID:$OPS_DATA_GID" /data/uploads
      chmod -R u=rwX,go= /data/uploads
    '
}

rollback_staged_restore() {
  local restore_id="$1"
  local uid gid
  restore_id_is_safe "$restore_id" || return 1
  uid="$(data_uid)"
  gid="$(data_gid)"

  compose run --rm --no-deps -T --user 0:0 --entrypoint /bin/sh \
    -e "OPS_RESTORE_ID=$restore_id" -e "OPS_DATA_UID=$uid" -e "OPS_DATA_GID=$gid" \
    "$SERVICE_NAME" -c '
      set -eu
      case "$OPS_RESTORE_ID" in *[!A-Za-z0-9_-]*|"") exit 2;; esac
      stage="/data/.ops-restore-$OPS_RESTORE_ID"
      rollback="/data/.ops-rollback-$OPS_RESTORE_ID"

      if test -d "$rollback"; then
        test -f "$rollback/state"
        . "$rollback/state"
        case "$HAD_DB:$HAD_WAL:$HAD_SHM:$HAD_UPLOADS" in *[!01:]*|*:*:*:*:*) exit 3;; esac

        if test "$HAD_DB" -eq 1; then
          if test -e "$rollback/scilab.db"; then
            rm -f /data/scilab.db
            mv "$rollback/scilab.db" /data/scilab.db
          fi
        else
          rm -f /data/scilab.db
        fi
        if test "$HAD_WAL" -eq 1; then
          if test -e "$rollback/scilab.db-wal"; then
            rm -f /data/scilab.db-wal
            mv "$rollback/scilab.db-wal" /data/scilab.db-wal
          fi
        else
          rm -f /data/scilab.db-wal
        fi
        if test "$HAD_SHM" -eq 1; then
          if test -e "$rollback/scilab.db-shm"; then
            rm -f /data/scilab.db-shm
            mv "$rollback/scilab.db-shm" /data/scilab.db-shm
          fi
        else
          rm -f /data/scilab.db-shm
        fi
        if test "$HAD_UPLOADS" -eq 1; then
          if test -e "$rollback/uploads"; then
            rm -rf /data/uploads
            mv "$rollback/uploads" /data/uploads
          fi
        else
          rm -rf /data/uploads
          mkdir -p /data/uploads
        fi

        rm -f "$rollback/state"
        rmdir "$rollback"
      fi

      if test -e "$stage"; then
        rm -rf "$stage"
      fi
      chown "$OPS_DATA_UID:$OPS_DATA_GID" /data 2>/dev/null || true
      test ! -e /data/scilab.db || { chown "$OPS_DATA_UID:$OPS_DATA_GID" /data/scilab.db; chmod 600 /data/scilab.db; }
      chown -R "$OPS_DATA_UID:$OPS_DATA_GID" /data/uploads
      chmod -R u=rwX,go= /data/uploads
    '
}

discard_restore_rollback() {
  local restore_id="$1"
  restore_id_is_safe "$restore_id" || return 1
  compose run --rm --no-deps -T --user 0:0 --entrypoint /bin/sh \
    -e "OPS_RESTORE_ID=$restore_id" "$SERVICE_NAME" -c '
      set -eu
      case "$OPS_RESTORE_ID" in *[!A-Za-z0-9_-]*|"") exit 2;; esac
      rm -rf "/data/.ops-restore-$OPS_RESTORE_ID"
      rm -rf "/data/.ops-rollback-$OPS_RESTORE_ID"
    '
}
