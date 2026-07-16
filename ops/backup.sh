#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  require_docker_compose
  validate_env_file
  validate_compose_config || exit 1
  trap release_operation_lock EXIT
  acquire_operation_lock "备份"
  perform_backup || die "备份未完成；现有数据库没有被修改。"

  printf '\n备份位置：%s\n' "$LAST_BACKUP_PATH"
  printf '%s\n' "请定期把整个备份目录加密复制到另一台机器或对象存储。"
}

main "$@"
