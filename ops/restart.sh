#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  require_docker_compose
  if [[ ! -f "$ENV_FILE" ]]; then
    log_warn "尚未初始化配置，将改为执行首次启动。"
    exec "$SCRIPT_DIR/start.sh"
  fi
  validate_env_file
  validate_compose_config || exit 1

  if [[ -z "$(service_container_id)" ]]; then
    log_warn "尚未创建应用容器，将改为执行首次启动。"
    exec "$SCRIPT_DIR/start.sh"
  fi
  trap release_operation_lock EXIT
  acquire_operation_lock "重启"

  ensure_service_healthy
  log_info "正在重启应用……"
  compose restart "$SERVICE_NAME"
  wait_for_healthy || die "重启后健康检查失败。"
  log_success "应用已经重启：$(configured_site_url)"
}

main "$@"
