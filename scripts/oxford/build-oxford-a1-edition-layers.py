#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"

EDITION_IDS = {
    "EN-US": {
        "edition_id": "us_english",
        "primary_language_code": "EN",
        "source_variant": "EN-US",
        "deck_title": "FlashcardsLuna Oxford 3000 Core A1 Part 001 - US English",
    },
    "EN-GB": {
        "edition_id": "british_english",
        "primary_language_code": "EN-GB",
        "source_variant": "EN-GB",
        "deck_title": "FlashcardsLuna Oxford 3000 Core A1 Part 001 - British English",
    },
}

US_OVERRIDES_BY_MEANING_ID = {
    "oxford3000_centre_middle_or_main_place_01": {
        "display_headword": "center",
        "example": "The center of town is busy.",
        "variant_status": "us_spelling_override_from_british_source_spelling",
        "variant_note": "US edition uses center; canonical Oxford source row and UK edition retain centre.",
    }
}

GB_OVERRIDES_BY_MEANING_ID = {
    "oxford3000_centre_middle_or_main_place_01": {
        "display_headword": "centre",
        "example": "The centre of town is busy.",
        "variant_status": "british_spelling_retained",
        "variant_note": "British edition retains centre from the canonical source row.",
    }
}


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def read_jsonl(path):
    rows = []
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def apply_variant(base_display, base_example, meaning_id, overrides):
    override = overrides.get(meaning_id)
    if not override:
        return {
            "display_headword": base_display,
            "example": base_example,
            "variant_status": "same_surface_as_canonical_source_layer",
            "variant_note": "No spelling/example override needed for this A1 row.",
        }
    return override


def build_layer_row(row_review, example_row, generated_at):
    row_id = row_review["row_id"]
    if example_row["row_id"] != row_id:
        raise ValueError(f"Row id mismatch while building edition layer: {row_id} != {example_row['row_id']}")

    base_display = normalize_text(example_row["reviewed_display_headword"])
    base_example = normalize_text(example_row["example_EN"])
    meaning_id = row_review["meaning_id"]
    us = apply_variant(base_display, base_example, meaning_id, US_OVERRIDES_BY_MEANING_ID)
    gb = apply_variant(base_display, base_example, meaning_id, GB_OVERRIDES_BY_MEANING_ID)

    semantic_scene = dict(row_review.get("semantic_scene") or {})
    semantic_scene["edition_layer_rule_version"] = "oxford-a1-us-uk-edition-layer-v1"
    semantic_scene["edition_layer_status"] = "reviewed_draft_overlay"

    blockers = [
        blocker
        for blocker in example_row.get("remaining_blockers", [])
        if blocker
        not in {
            "english_pronunciation_source_check",
            "english_example_quality_check",
            "support_translation_meaning_check",
            "support_example_scene_check",
            "weak_language_targeted_review",
        }
    ]

    return {
        "release_id": row_review["release_id"],
        "course_id": row_review["course_id"],
        "row_id": row_id,
        "core_item_id": row_review["core_item_id"],
        "meaning_id": meaning_id,
        "source_candidate_id": row_review["source_candidate_id"],
        "source_language": "EN",
        "canonical_source_variant": "Oxford 3000 source row with LunaCards-authored English layer",
        "source_headword": row_review["source_headword"],
        "reviewed_part_of_speech": row_review["reviewed_part_of_speech"],
        "sense_no": row_review["sense_no"],
        "core_band": row_review["core_band"],
        "level_min": row_review["level_min"],
        "level_max": row_review["level_max"],
        "benchmark_membership": row_review["benchmark_membership"],
        "source_status": "user_reported_oup_permission_pending_written_evidence",
        "meaning_note": row_review["meaning_note"],
        "semantic_scene": semantic_scene,
        "display_headword_EN_US": us["display_headword"],
        "example_EN_US": us["example"],
        "edition_status_EN_US": us["variant_status"],
        "edition_note_EN_US": us["variant_note"],
        "display_headword_EN_GB": gb["display_headword"],
        "example_EN_GB": gb["example"],
        "edition_status_EN_GB": gb["variant_status"],
        "edition_note_EN_GB": gb["variant_note"],
        "edition_layer_status": "draft_overlay_ready_for_pronunciation_and_export",
        "reviewer": "codex_oxford_a1_us_uk_edition_layer_v1",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--row-review",
        default="outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a1_part_001_150_v1_row_review_v1.jsonl",
    )
    parser.add_argument(
        "--examples",
        default="outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_001_150_v1_english_examples_v1.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/edition-layers")
    parser.add_argument("--layer-id", default="us_uk_edition_layer_v1")
    args = parser.parse_args()

    row_review_path = Path(args.row_review)
    examples_path = Path(args.examples)
    row_review_rows = read_jsonl(row_review_path)
    example_rows = read_jsonl(examples_path)
    if len(row_review_rows) != len(example_rows):
        raise ValueError(f"Row count mismatch: row_review={len(row_review_rows)} examples={len(example_rows)}")

    examples_by_id = {row["row_id"]: row for row in example_rows}
    generated_at = datetime.now(timezone.utc).isoformat()
    layer_rows = []
    for row_review in row_review_rows:
        row_id = row_review["row_id"]
        example_row = examples_by_id.get(row_id)
        if not example_row:
            raise ValueError(f"Missing English example row for {row_id}")
        layer_rows.append(build_layer_row(row_review, example_row, generated_at))

    if not layer_rows:
        raise ValueError("No edition layer rows built")

    us_overrides = sum(1 for row in layer_rows if row["edition_status_EN_US"] != "same_surface_as_canonical_source_layer")
    gb_overrides = sum(1 for row in layer_rows if row["edition_status_EN_GB"] != "same_surface_as_canonical_source_layer")
    release_id = layer_rows[0]["release_id"]
    out_dir = Path(args.out_dir)
    layer_path = out_dir / f"{release_id}_{args.layer_id}.jsonl"
    summary_path = out_dir / f"{release_id}_{args.layer_id}_summary.md"
    write_jsonl(layer_path, layer_rows)

    summary = [
        f"# Oxford A1 US/UK Edition Layer: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Row review source: `{row_review_path}`",
        f"- English examples source: `{examples_path}`",
        f"- Rows: {len(layer_rows)}",
        f"- US edition spelling/example overrides: {us_overrides}",
        f"- British edition spelling/example overrides: {gb_overrides}",
        "- Primary decision: one canonical source package, two buyer-facing edition overlays.",
        "- Postgres changes: false",
        "- Google Sheet created: false",
        "- Generation ready: false",
        "",
        "This artifact prepares edition-specific display/example text only. Pronunciation and workbook export are separate reproducible artifacts.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford US/UK edition layer built: rows={len(layer_rows)} layer={layer_path} summary={summary_path}")


if __name__ == "__main__":
    main()
