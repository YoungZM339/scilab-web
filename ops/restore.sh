#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

APP_STOPPED=0
RECOVERY_POSSIBLE=0
DISASTER_MODE=0
ORIGINAL_WAS_RUNNING=0
RESTORE_ID=""
PRE_RESTORE_BACKUP=""

usage() {
  printf '用法：%s [备份名称]\n' "$0"
  printf '%s\n' "不传名称时会交互列出可用备份。无论哪种方式都必须进行两次人工确认。"
}

recover_after_failure() {
  local original_code=$?
  local rollback_ok=1
  local service_stopped=0
  trap - EXIT

  if (( original_code != 0 && APP_STOPPED == 1 )); then
    set +e
    log_warn "恢复流程未成功，正在尝试自动回滚到操作前状态……"
    if ! compose stop "$SERVICE_NAME" >/dev/null 2>&1; then
      log_warn "停止应用的命令返回失败，正在核对容器实际状态。"
    fi
    if service_is_confirmed_stopped; then
      service_stopped=1
    else
      rollback_ok=0
      log_error "无法确认应用已经停止，因此不会移动或删除任何数据库、上传文件或恢复工作区。"
      log_error "请保留 /data/.ops-restore-$RESTORE_ID 和 /data/.ops-rollback-$RESTORE_ID，并联系维护人员。"
    fi

    if (( service_stopped == 1 && RECOVERY_POSSIBLE == 1 )); then
      if ! rollback_staged_restore "$RESTORE_ID"; then
        rollback_ok=0
        log_error "自动回滚卷内文件失败。为避免扩大损失，应用将保持停止。"
        log_error "请保留 /data/.ops-restore-$RESTORE_ID 和 /data/.ops-rollback-$RESTORE_ID，并联系维护人员。"
      fi
    fi

    if (( rollback_ok == 1 && service_stopped == 1 )); then
      if (( ORIGINAL_WAS_RUNNING == 0 )); then
        log_success "已放回操作前数据；应用在恢复前就是停止状态，因此保持停止。"
      elif compose up -d "$SERVICE_NAME" && wait_for_healthy; then
        log_success "已恢复并重新启动操作前的应用。"
      else
        log_error "原数据已尝试放回，但应用仍未健康启动。请运行 ops/status.sh 查看日志。"
      fi
    fi
    [[ -z "$PRE_RESTORE_BACKUP" ]] || log_info "操作前安全备份位于：$PRE_RESTORE_BACKUP"
  fi

  release_operation_lock || true
  exit "$original_code"
}

choose_backup() {
  local root="$1"
  local requested="${2-}"
  local candidate answer answer_number index=1

  collect_backups "$root"
  (( ${#BACKUP_PATHS[@]} > 0 )) || die "没有找到可恢复的备份。请先运行 ops/backup.sh。"

  if [[ -n "$requested" ]]; then
    backup_name_is_safe "$requested" || die "备份名称格式非法。只能使用列表中显示的完整名称。"
    candidate="$root/$requested"
    validate_backup_payload "$root" "$candidate" || die "指定备份不存在、内容不完整或包含不安全路径。"
    SELECTED_BACKUP="$candidate"
    return 0
  fi

  [[ -t 0 && -t 1 ]] || die "交互恢复需要终端。请在终端直接运行 ops/restore.sh。"
  printf '\n可用备份：\n'
  for candidate in "${BACKUP_PATHS[@]}"; do
    printf '  %d) %s\n' "$index" "$(basename -- "$candidate")"
    ((index += 1))
  done
  printf '\n请输入序号：'
  IFS= read -r answer
  [[ "$answer" =~ ^[0-9]{1,6}$ ]] || die "请输入列表中的数字序号。"
  answer_number="$((10#$answer))"
  (( answer_number >= 1 && answer_number <= ${#BACKUP_PATHS[@]} )) || die "序号超出范围。"
  SELECTED_BACKUP="${BACKUP_PATHS[answer_number-1]}"
}

confirm_restore_twice() {
  local backup_name="$1"
  local answer

  [[ -t 0 && -t 1 ]] || die "恢复必须在交互终端中确认。"
  printf '\n%s\n' "即将用以下备份替换当前数据库和全部上传文件："
  printf '  %s\n' "$backup_name"
  if (( DISASTER_MODE == 1 )); then
    printf '%s\n' "当前应用并非 healthy，将进入灾难恢复：停止应用后保留原始数据的卷内回滚点，再恢复并校验备份。"
    printf '%s\n' "恢复成功后也不会自动删除该回滚点；它可能包含损坏但仍需取证的数据。"
  else
    printf '%s\n' "脚本会先创建操作前安全备份，停止应用，恢复数据，再通过健康检查后才删除卷内回滚点。"
  fi
  printf '%s' "第一次确认：请输入“恢复”两个字："
  IFS= read -r answer
  [[ "$answer" == "恢复" ]] || die "确认内容不匹配，已取消；当前数据未修改。"

  printf '第二次确认：请完整输入备份名称 %s ：' "$backup_name"
  IFS= read -r answer
  [[ "$answer" == "$backup_name" ]] || die "备份名称不匹配，已取消；当前数据未修改。"
}

main() {
  local root selected_name container_id current_health service_state
  local requested="${1-}"
  (( $# <= 1 )) || { usage; exit 2; }
  if [[ "$requested" == "-h" || "$requested" == "--help" ]]; then
    usage
    return 0
  fi

  require_docker_compose
  validate_env_file
  validate_compose_config || exit 1
  trap release_operation_lock EXIT
  acquire_operation_lock "恢复"

  container_id="$(service_container_id)"
  if [[ -z "$container_id" ]]; then
    log_warn "应用容器尚未创建，正在从现有镜像创建一个停止状态的容器以访问持久卷。"
    compose create "$SERVICE_NAME" || die "无法创建应用容器；请先确认本机已有可用镜像。"
    container_id="$(service_container_id)"
    [[ -n "$container_id" ]] || die "Compose 未能创建应用容器。"
  fi
  service_state="$(service_running_state)" || die "无法可靠读取应用运行状态；恢复尚未修改任何数据。"
  [[ "$service_state" != "running" ]] || ORIGINAL_WAS_RUNNING=1
  current_health="$(container_health_status "$container_id" || true)"
  if (( ORIGINAL_WAS_RUNNING == 0 )) || [[ "$current_health" != "healthy" ]]; then
    DISASTER_MODE=1
    log_warn "当前应用状态为 ${current_health:-未知}；将使用保留原始卷内回滚点的灾难恢复流程。"
  fi

  root="$(resolve_backup_root)"
  SELECTED_BACKUP=""
  choose_backup "$root" "$requested"
  selected_name="$(basename -- "$SELECTED_BACKUP")"
  confirm_restore_twice "$selected_name"

  if (( DISASTER_MODE == 0 )); then
    log_info "先创建操作前安全备份……"
    perform_backup || die "操作前安全备份失败，因此不会执行恢复。"
    PRE_RESTORE_BACKUP="$LAST_BACKUP_PATH"
    log_success "操作前安全备份已保存：$PRE_RESTORE_BACKUP"
  else
    log_warn "当前数据无法进行可信在线备份；停止后会尝试无迁移离线备份，并始终保留原始 DB/WAL/SHM/uploads 回滚点。"
  fi

  RESTORE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$-$RANDOM"
  restore_id_is_safe "$RESTORE_ID" || die "无法生成安全的恢复任务编号。"
  trap recover_after_failure EXIT

  log_info "正在停止应用……"
  APP_STOPPED=1
  compose stop "$SERVICE_NAME"
  service_is_confirmed_stopped || die "无法确认应用已经停止；恢复未开始，将尝试重新启动原应用。"

  if (( DISASTER_MODE == 1 )); then
    if perform_offline_backup; then
      PRE_RESTORE_BACKUP="$LAST_BACKUP_PATH"
      log_success "当前数据仍可通过一致性检查，离线安全备份已保存：$PRE_RESTORE_BACKUP"
    else
      log_warn "当前数据未能通过离线一致性备份；继续恢复时只会把原始文件保留在卷内回滚点。"
    fi
  fi

  RECOVERY_POSSIBLE=1
  ensure_restore_slots_empty "$RESTORE_ID" || die "无法创建独立恢复工作区；当前应用将自动重新启动。"
  log_info "正在把选定备份放入隔离恢复区……"
  stage_backup_in_volume "$SELECTED_BACKUP" "$RESTORE_ID" || die "复制恢复文件失败。"
  log_info "正在复查 SQLite 完整性和每个媒体文件的哈希……"
  validate_staged_restore "$RESTORE_ID" || die "恢复备份内容校验失败。"

  log_info "正在原子替换数据库和上传目录，并保留卷内回滚点……"
  apply_staged_restore "$RESTORE_ID" || die "替换数据失败。"

  log_info "正在启动恢复后的应用；启动时会自动执行已提交的数据库迁移……"
  compose up -d "$SERVICE_NAME"
  wait_for_healthy || die "恢复后的应用未通过健康检查。"

  APP_STOPPED=0
  if (( DISASTER_MODE == 0 )); then
    if ! discard_restore_rollback "$RESTORE_ID"; then
      log_warn "应用已恢复成功，但卷内回滚临时目录清理失败。请联系维护人员清理任务：$RESTORE_ID"
    fi
  else
    log_warn "灾难恢复已成功；原始数据保留在 /data/.ops-rollback-$RESTORE_ID，请在完成核验和异地留存前不要删除。"
  fi
  RECOVERY_POSSIBLE=0
  release_operation_lock || true
  trap - EXIT

  log_success "恢复完成，应用健康检查已通过：$(configured_site_url)"
  if [[ -n "$PRE_RESTORE_BACKUP" ]]; then
    log_info "操作前安全备份仍保留在：$PRE_RESTORE_BACKUP"
  fi
}

main "$@"
