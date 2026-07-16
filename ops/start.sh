#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  local container_id deployment_backup="" image_prebuilt=0 service_state volume_state

  require_docker_compose
  ensure_env_file
  validate_env_file
  validate_compose_config || exit 1
  trap release_operation_lock EXIT
  acquire_operation_lock "启动"

  container_id="$(service_container_id)" || die "无法可靠读取现有应用容器状态。"
  if [[ -n "$container_id" ]]; then
    service_state="$(service_running_state)" || die "无法可靠读取现有应用运行状态；不会触碰数据或部署。"
    if [[ "$service_state" == "running" ]]; then
      ensure_service_healthy
      log_info "先构建新镜像；旧应用在构建期间继续服务……"
      compose build "$SERVICE_NAME" || die "镜像构建失败；旧应用和数据未被修改。"
      image_prebuilt=1
      log_info "构建完成。正在停止旧应用，以消除部署备份后的写入窗口……"
      compose stop "$SERVICE_NAME" || die "无法停止旧应用；不会迁移新版本。"
      service_is_confirmed_stopped || die "无法确认旧应用已经停止；不会备份或迁移。"
      if ! perform_offline_backup; then
        log_warn "部署前离线备份失败，正在尝试重新启动未修改的旧应用……"
        compose start "$SERVICE_NAME" && wait_for_healthy || true
        die "部署前备份失败；不会迁移新版本。"
      fi
      deployment_backup="$LAST_BACKUP_PATH"
      log_success "部署前备份已保存：$deployment_backup"
    else
      volume_state="$(inspect_data_volume_state)" || die "无法安全检查 /data 持久卷；不会启动或迁移。"
      if [[ "$volume_state" == "present" ]]; then
        log_info "应用处于停止状态且卷中有数据；先离线备份，且不会执行旧镜像入口或数据库迁移……"
        perform_offline_backup || die "停止状态的数据无法通过一致性检查；不会构建或迁移新版本。请使用 ops/restore.sh 恢复已知良好备份。"
        deployment_backup="$LAST_BACKUP_PATH"
        log_success "部署前备份已保存：$deployment_backup"
      elif [[ "$volume_state" == "empty" ]]; then
        log_info "停止容器的数据卷为空，将按首次部署启动。"
      else
        die "持久卷检查返回了无法识别的结果；不会启动或迁移。"
      fi
    fi
  else
    log_info "尚无应用容器；先只构建镜像，再检查持久卷是否留有历史数据……"
    compose build "$SERVICE_NAME" || die "镜像构建失败；尚未启动容器或迁移数据库。"
    image_prebuilt=1
    volume_state="$(inspect_data_volume_state)" || die "无法安全检查 /data 持久卷；不会启动或迁移。"
    case "$volume_state" in
      empty)
        log_info "持久卷为空，将按首次部署启动。"
        ;;
      present)
        log_warn "未找到旧容器，但持久卷中存在历史数据；将先创建停止容器并做离线备份。"
        compose create "$SERVICE_NAME" || die "无法创建停止状态的应用容器；不会迁移历史数据。"
        perform_offline_backup || die "历史数据无法通过一致性备份；不会启动或迁移。请使用 ops/restore.sh 恢复已知良好备份。"
        deployment_backup="$LAST_BACKUP_PATH"
        log_success "历史数据备份已保存：$deployment_backup"
        ;;
      *)
        die "持久卷检查返回了无法识别的结果；不会启动或迁移。"
        ;;
    esac
  fi

  log_info "开始构建并启动科研实验室系统……"
  if (( image_prebuilt == 1 )); then
    compose up -d "$SERVICE_NAME" || {
      [[ -z "$deployment_backup" ]] || log_info "部署前备份位于：$deployment_backup"
      die "启动失败。请查看上方 Docker 输出。"
    }
  elif ! compose up -d --build "$SERVICE_NAME"; then
    [[ -z "$deployment_backup" ]] || log_info "部署前备份位于：$deployment_backup"
    die "构建或启动失败。请查看上方 Docker 输出。"
  fi
  if ! wait_for_healthy; then
    [[ -z "$deployment_backup" ]] || log_info "部署前备份位于：$deployment_backup"
    die "应用未能健康启动。可运行 ops/status.sh 查看状态，并用 ops/restore.sh 恢复部署前备份。"
  fi

  log_success "系统已经启动：$(configured_site_url)"
  log_info "首次使用时，请按项目说明创建管理员；系统不会生成默认密码。"
}

main "$@"
