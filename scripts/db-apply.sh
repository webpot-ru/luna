#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards}"
EXTRA_SQL_FILES=("$@")

cd "$ROOT_DIR"

for file in db/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

for file in db/seeds/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

for file in "${EXTRA_SQL_FILES[@]}"; do
  if [[ "$file" = /* || "$file" == *".."* || "$file" != *.sql || ! -f "$file" ]]; then
    echo "Extra SQL files must be existing project-relative .sql files, got: $file" >&2
    exit 1
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

EXPECTED_LANGUAGE_COUNT=54
LANGUAGE_COUNT="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "select count(*) from languages;")"

if [[ "$LANGUAGE_COUNT" != "$EXPECTED_LANGUAGE_COUNT" ]]; then
  echo "Expected $EXPECTED_LANGUAGE_COUNT languages, got $LANGUAGE_COUNT" >&2
  exit 1
fi

PILOT_COUNT="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "select count(*) from meaning_set_memberships where set_id = 'home_kitchen_cookware_pilot_01' and quality_status <> 'blocked';")"

if [[ "$PILOT_COUNT" != "50" ]]; then
  echo "Expected 50 pilot items, got $PILOT_COUNT" >&2
  exit 1
fi

echo "Database schema applied. languages=$LANGUAGE_COUNT pilot_home_kitchen_cookware=$PILOT_COUNT"
