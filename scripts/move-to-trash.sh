#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/move-to-trash.sh <relative-path>" >&2
  exit 2
fi

target="$1"

case "$target" in
  ""|"/"*|".."|"../"*|*"../"*|*"/.."|*"/../"*|"."|"Trash"|"Trash/"|"Trash/"*)
    echo "Refusing to move path outside project or unsafe path: $target" >&2
    exit 2
    ;;
esac

if [ ! -e "$target" ]; then
  echo "Path does not exist: $target" >&2
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
trash_path="Trash/$timestamp/$target"
trash_dir="$(dirname "$trash_path")"

mkdir -p "$trash_dir"
mv "$target" "$trash_path"

echo "Moved $target to $trash_path"
