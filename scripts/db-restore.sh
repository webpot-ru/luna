#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards}"
POSTGRES_DB="${POSTGRES_DB:-lunacards}"
POSTGRES_USER="${POSTGRES_USER:-lunacards}"
DUMP_PATH="${1:-}"

if [[ -z "$DUMP_PATH" ]]; then
  echo "Usage: scripts/db-restore.sh <relative_dump_sql>" >&2
  exit 1
fi

case "$DUMP_PATH" in
  /*)
    echo "Dump path must be relative to project root: $DUMP_PATH" >&2
    exit 1
    ;;
  *..*)
    echo "Dump path must not contain '..': $DUMP_PATH" >&2
    exit 1
    ;;
esac

cd "$ROOT_DIR"

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "Dump file does not exist: $DUMP_PATH" >&2
  exit 1
fi

if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP_PATH"; then
  echo "Database restore applied from: $DUMP_PATH"
  exit 0
fi

echo "Local psql restore failed; trying docker compose postgres psql fallback..." >&2

CONTAINER_DUMP_PATH="/tmp/lunacards_restore_$(basename "$DUMP_PATH")"

docker compose cp "$DUMP_PATH" "postgres:${CONTAINER_DUMP_PATH}"
docker compose exec -T postgres psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -f "$CONTAINER_DUMP_PATH"

echo "Database restore applied via docker compose fallback from: $DUMP_PATH"
