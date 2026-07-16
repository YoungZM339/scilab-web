#!/bin/sh
set -eu

mkdir -p "${UPLOAD_DIR:-/data/uploads}"
pnpm db:migrate
exec "$@"
