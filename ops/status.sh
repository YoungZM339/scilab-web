#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  local container_id status
  require_docker_compose
  if [[ ! -f "$ENV_FILE" ]]; then
    log_warn "尚未创建 .env；请运行 ops/start.sh。"
    return 1
  else
    validate_env_file
    validate_compose_config || exit 1
  fi

  compose ps
  container_id="$(service_container_id)"
  if [[ -z "$container_id" ]]; then
    log_info "应用容器尚未创建。"
    return 0
  fi
  status="$(container_health_status "$container_id" || true)"
  printf '\n容器健康状态：%s\n' "${status:-未知}"
  if [[ "$status" != "healthy" ]]; then
    show_recent_logs
    return 1
  fi
}

main "$@"
