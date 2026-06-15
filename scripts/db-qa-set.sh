#!/usr/bin/env bash
set -euo pipefail

SET_ID="${1:-}"

if [[ -z "$SET_ID" ]]; then
  echo "Usage: scripts/db-qa-set.sh <set_id>" >&2
  exit 1
fi

SCRIPT_DIR="$(dirname "$0")"

"$SCRIPT_DIR/db-qa-pilot.sh" "$SET_ID"
node "$SCRIPT_DIR/check-course-metadata-localization.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-transcription-policy-shape.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-transcription-style-consistency.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-transcription-fallbacks.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-transcription-intra-language-collapse.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-transcription-cross-language-fallbacks.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-ipa-transcription-sanity.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-ipa-source-lookup.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-source-backed-transcriptions.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-entry-cross-language-fallbacks.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-entry-source-backed-translations.mjs" "$SET_ID" --all-languages
node "$SCRIPT_DIR/check-translation-source-policy.mjs"
node "$SCRIPT_DIR/check-translation-source-coverage.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-deck-profile-quality.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-script-language-identity.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-latin-diacritic-loss.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-article-gender-marker-consistency.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-sibling-language-copy.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-meaning-contrast.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-semantic-granularity.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-base-example-naturalness.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-example-template-diversity.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-qa-hash-coverage.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-example-casing.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-cjk-example-spacing.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-thai-example-spacing.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-southeast-asian-example-spacing.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-action-example-surface.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-example-surface-grammar.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-semantic-scene-alignment.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-target-semantic-scene-alignment.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-target-example-scene-location-anchor.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-number-example-grammar.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-example-naturalness.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-target-example-lexical-anchor.mjs" "$SET_ID"
node "$SCRIPT_DIR/check-target-example-pedagogical-quality.mjs" "$SET_ID"
