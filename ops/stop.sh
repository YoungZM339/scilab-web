#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  local container_id service_state
  require_docker_compose
  validate_env_file
  validate_compose_config || exit 1
  trap release_operation_lock EXIT
  acquire_operation_lock "停止"

  container_id="$(service_container_id)" || die "无法可靠读取应用容器状态；不会执行停止操作。"
  if [[ -z "$container_id" ]]; then
    log_info "没有找到已创建的应用容器，无需停止。"
    return 0
  fi
  service_state="$(service_running_state)" || die "无法可靠读取应用运行状态；不会执行停止操作。"
  if [[ "$service_state" != "running" ]]; then
    log_info "应用已经处于停止状态。"
    return 0
  fi

  log_info "正在停止应用（数据库和上传文件会保留）……"
  compose stop "$SERVICE_NAME"
  log_success "应用已停止。"
}

main "$@"
