#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards}"
POSTGRES_DB="${POSTGRES_DB:-lunacards}"
POSTGRES_USER="${POSTGRES_USER:-lunacards}"
OUTPUT_DIR="${OUTPUT_DIR:-outputs/db}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_PATH="${1:-${OUTPUT_DIR}/lunacards_${TIMESTAMP}.sql}"

case "$OUTPUT_PATH" in
  /*)
    echo "Output path must be relative to project root: $OUTPUT_PATH" >&2
    exit 1
    ;;
  *..*)
    echo "Output path must not contain '..': $OUTPUT_PATH" >&2
    exit 1
    ;;
esac

cd "$ROOT_DIR"
mkdir -p "$(dirname "$OUTPUT_PATH")"

if pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file "$OUTPUT_PATH"; then
  echo "Database dump written: $OUTPUT_PATH"
  exit 0
fi

echo "Local pg_dump failed; trying docker compose postgres pg_dump fallback..." >&2

CONTAINER_DUMP_PATH="/tmp/lunacards_dump_${TIMESTAMP}.sql"

docker compose exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file "$CONTAINER_DUMP_PATH"

docker compose cp "postgres:${CONTAINER_DUMP_PATH}" "$OUTPUT_PATH"

echo "Database dump written via docker compose fallback: $OUTPUT_PATH"
