#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  local root path size index=1
  root="$(resolve_backup_root)"
  collect_backups "$root"

  printf '宿主机备份目录：%s\n' "$root"
  if (( ${#BACKUP_PATHS[@]} == 0 )); then
    printf '%s\n' "尚无可用备份。"
    return 0
  fi

  for path in "${BACKUP_PATHS[@]}"; do
    size="$(du -sh "$path" 2>/dev/null | awk '{print $1}' || true)"
    printf '%2d. %-28s %s\n' "$index" "$(basename -- "$path")" "${size:-大小未知}"
    ((index += 1))
  done
}

main "$@"
