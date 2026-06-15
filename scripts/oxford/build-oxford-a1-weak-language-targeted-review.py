#!/usr/bin/env python3
"""Build a deterministic weak-language targeted review artifact for Oxford A1."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONTRACT_PATH = PROJECT_ROOT / "config/oxford-vocabulary-release-contract-v0.json"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "outputs/oxford-vocabulary/qa"
REPORT_ID = "weak_language_targeted_review_v1"

SENTENCE_END_RE = re.compile(r"[.!?。！？؟।॥။؟։។៕]$")
LATIN_RE = re.compile(r"[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]")
HAN_RE = re.compile(r"[\u3400-\u9FFF]")
JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u3400-\u9FFF]")
HANGUL_RE = re.compile(r"[\uAC00-\uD7AF]")
THAI_RE = re.compile(r"[\u0E00-\u0E7F]")
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
BENGALI_RE = re.compile(r"[\u0980-\u09FF]")
MYANMAR_RE = re.compile(r"[\u1000-\u109F]")
KHMER_RE = re.compile(r"[\u1780-\u17FF]")
LAO_RE = re.compile(r"[\u0E80-\u0EFF]")
SINHALA_RE = re.compile(r"[\u0D80-\u0DFF]")
TAMIL_RE = re.compile(r"[\u0B80-\u0BFF]")
TELUGU_RE = re.compile(r"[\u0C00-\u0C7F]")
KANNADA_RE = re.compile(r"[\u0C80-\u0CFF]")
MALAYALAM_RE = re.compile(r"[\u0D00-\u0D7F]")
GEORGIAN_RE = re.compile(r"[\u10A0-\u10FF]")
ARMENIAN_RE = re.compile(r"[\u0530-\u058F]")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")

SCRIPT_REQUIREMENTS = {
    "ZH": ("Han", HAN_RE),
    "JA": ("Japanese", JAPANESE_RE),
    "KO": ("Hangul", HANGUL_RE),
    "TH": ("Thai", THAI_RE),
    "HI": ("Devanagari", DEVANAGARI_RE),
    "NE": ("Devanagari", DEVANAGARI_RE),
    "BN": ("Bengali", BENGALI_RE),
    "MY": ("Myanmar", MYANMAR_RE),
    "KM": ("Khmer", KHMER_RE),
    "LO": ("Lao", LAO_RE),
    "SI": ("Sinhala", SINHALA_RE),
    "TA": ("Tamil", TAMIL_RE),
    "TE": ("Telugu", TELUGU_RE),
    "KN": ("Kannada", KANNADA_RE),
    "ML": ("Malayalam", MALAYALAM_RE),
    "KA": ("Georgian", GEORGIAN_RE),
    "HY": ("Armenian", ARMENIAN_RE),
    "RU": ("Cyrillic", CYRILLIC_RE),
    "BG": ("Cyrillic", CYRILLIC_RE),
    "SR": ("Cyrillic", CYRILLIC_RE),
    "KK": ("Cyrillic", CYRILLIC_RE),
}

WEAK_OR_TARGETED_CODES = {
    "ZH",
    "JA",
    "KO",
    "TH",
    "HI",
    "BN",
    "TL",
    "MY",
    "KM",
    "LO",
    "NE",
    "SI",
    "TA",
    "TE",
    "KN",
    "ML",
    "UZ",
    "KK",
    "AZ",
    "KA",
    "HY",
    "SW",
    "PT-BR",
    "ES-419",
}


def normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    for index, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def relative(path: Path) -> str:
    return str(path.resolve().relative_to(PROJECT_ROOT))


def load_language_codes() -> list[str]:
    rows = read_json(PROJECT_ROOT / "config/language-order.json")
    return [row["spreadsheetCode"] for row in rows if row["spreadsheetCode"] not in {"EN", "EN-GB"}]


def build_review(contract_path: Path, output_dir: Path) -> tuple[Path, Path, dict]:
    contract = read_json(contract_path)
    release_id = contract["latest_source_snapshot"]["release_id"]
    target_language_codes = load_language_codes()
    expected_languages = set(target_language_codes)
    expected_row_count = contract["latest_source_snapshot"]["selected_rows"]

    blockers = []
    warnings = []
    batches_reviewed = []
    language_counts = defaultdict(lambda: {"display": 0, "example": 0})
    row_language_keys = set()
    row_ids = set()
    language_sources = defaultdict(list)

    for batch in contract.get("latest_support_translation_batches", []):
        batch_id = batch.get("batch_id") or "unknown_batch"
        batch_path = PROJECT_ROOT / batch["path"]
        batch_languages = batch.get("languages") or []
        rows = read_jsonl(batch_path)
        batches_reviewed.append(
            {
                "batch_id": batch_id,
                "path": batch["path"],
                "rows": len(rows),
                "languages": batch_languages,
            }
        )
        if len(rows) != expected_row_count:
            blockers.append(
                {
                    "batch_id": batch_id,
                    "reason": "wrong_row_count",
                    "rows": len(rows),
                    "expected": expected_row_count,
                }
            )
        duplicate_row_ids = [row_id for row_id, count in Counter(row.get("row_id") for row in rows).items() if count > 1]
        if duplicate_row_ids:
            blockers.append({"batch_id": batch_id, "reason": "duplicate_row_ids", "sample": duplicate_row_ids[:10]})
        for language in batch_languages:
            language_sources[language].append(batch_id)
            if language not in expected_languages:
                blockers.append({"batch_id": batch_id, "language": language, "reason": "unsupported_language"})
        for row in rows:
            row_id = row.get("row_id")
            row_ids.add(row_id)
            source_headword = normalize_text(row.get("source_headword"))
            for language in batch_languages:
                display = normalize_text(row.get(language))
                example = normalize_text(row.get(f"example_{language}"))
                row_language_keys.add((row_id, language))
                if f"transcription_{language}" in row or f"example_transcription_{language}" in row:
                    blockers.append(
                        {
                            "batch_id": batch_id,
                            "row_id": row_id,
                            "language": language,
                            "reason": "target_language_transcription_forbidden",
                        }
                    )
                if not display:
                    blockers.append({"batch_id": batch_id, "row_id": row_id, "language": language, "reason": "missing_display"})
                else:
                    language_counts[language]["display"] += 1
                if not example:
                    blockers.append({"batch_id": batch_id, "row_id": row_id, "language": language, "reason": "missing_example"})
                else:
                    language_counts[language]["example"] += 1
                    if not SENTENCE_END_RE.search(example):
                        blockers.append(
                            {
                                "batch_id": batch_id,
                                "row_id": row_id,
                                "language": language,
                                "reason": "example_missing_sentence_punctuation",
                            }
                        )
                script_requirement = SCRIPT_REQUIREMENTS.get(language)
                if script_requirement:
                    script_name, pattern = script_requirement
                    if display and not pattern.search(display):
                        blockers.append(
                            {
                                "batch_id": batch_id,
                                "row_id": row_id,
                                "language": language,
                                "reason": f"display_missing_{script_name}_script",
                                "display": display,
                            }
                        )
                    if example and not pattern.search(example):
                        blockers.append(
                            {
                                "batch_id": batch_id,
                                "row_id": row_id,
                                "language": language,
                                "reason": f"example_missing_{script_name}_script",
                                "example": example,
                            }
                        )
                elif display and not LATIN_RE.search(display):
                    blockers.append(
                        {
                            "batch_id": batch_id,
                            "row_id": row_id,
                            "language": language,
                            "reason": "display_missing_latin_script",
                            "display": display,
                        }
                    )
                if language not in {"ZH", "JA"} and (HAN_RE.search(display) or HAN_RE.search(example)):
                    blockers.append(
                        {
                            "batch_id": batch_id,
                            "row_id": row_id,
                            "language": language,
                            "reason": "han_script_leak_outside_zh_ja",
                        }
                    )
                if display and normalize_text(display).lower() == source_headword.lower():
                    warnings.append(
                        {
                            "batch_id": batch_id,
                            "row_id": row_id,
                            "language": language,
                            "reason": "display_matches_source_headword_reviewed_as_possible_loanword_or_proper_name",
                            "display": display,
                        }
                    )

    missing_languages = sorted(expected_languages - set(language_sources))
    duplicate_language_batches = {
        language: sources for language, sources in sorted(language_sources.items()) if len(sources) > 1
    }
    if missing_languages:
        blockers.append({"reason": "missing_languages", "languages": missing_languages})
    if duplicate_language_batches:
        blockers.append({"reason": "duplicate_language_batches", "languages": duplicate_language_batches})

    expected_cells = expected_row_count * len(target_language_codes)
    filled_display_cells = sum(counts["display"] for counts in language_counts.values())
    filled_example_cells = sum(counts["example"] for counts in language_counts.values())
    if filled_display_cells != expected_cells or filled_example_cells != expected_cells:
        blockers.append(
            {
                "reason": "coverage_mismatch",
                "filled_display_cells": filled_display_cells,
                "filled_example_cells": filled_example_cells,
                "expected_cells": expected_cells,
            }
        )

    status = "passed_deterministic_weak_language_review_not_external_native_approval" if not blockers else "blocked"
    generated_at = datetime.now(timezone.utc).isoformat()
    report = {
        "release_id": release_id,
        "report_id": REPORT_ID,
        "generated_at": generated_at,
        "status": status,
        "review_scope": "Deterministic targeted review of Oxford A1 support-language artifacts. This is source-package QA and not external native-speaker approval.",
        "targeted_language_codes": sorted(WEAK_OR_TARGETED_CODES),
        "summary": {
            "batches_reviewed": len(batches_reviewed),
            "rows_reviewed": len(row_ids),
            "target_support_languages": len(target_language_codes),
            "filled_display_cells": filled_display_cells,
            "filled_example_cells": filled_example_cells,
            "expected_cells": expected_cells,
            "blockers": len(blockers),
            "warnings": len(warnings),
        },
        "batches_reviewed": batches_reviewed,
        "language_counts": {language: language_counts[language] for language in sorted(language_counts)},
        "blockers": blockers,
        "warnings": warnings[:200],
        "warning_count_total": len(warnings),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    report_json_path = output_dir / f"{release_id}_{REPORT_ID}.json"
    report_md_path = output_dir / f"{release_id}_{REPORT_ID}.md"
    report_json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Oxford A1 Weak-Language Targeted Review v1",
        "",
        f"Release: `{release_id}`",
        f"Status: `{status}`",
        "",
        "This deterministic review checks support-language batch shape, script requirements, forbidden target-language transcriptions, sentence punctuation, Han-script leakage and exact English fallback warnings. It is not external native-speaker approval.",
        "",
        "| Metric | Value |",
        "| --- | ---: |",
        f"| Batches reviewed | {len(batches_reviewed)} |",
        f"| Rows reviewed | {len(row_ids)} |",
        f"| Support languages | {len(target_language_codes)} |",
        f"| Display cells | {filled_display_cells}/{expected_cells} |",
        f"| Example cells | {filled_example_cells}/{expected_cells} |",
        f"| Blockers | {len(blockers)} |",
        f"| Warnings | {len(warnings)} |",
        "",
        "## Targeted Languages",
        "",
        ", ".join(sorted(WEAK_OR_TARGETED_CODES)),
        "",
        "## Blockers",
        "",
    ]
    if blockers:
        lines.extend(f"- `{item.get('reason')}`: `{item}`" for item in blockers[:50])
    else:
        lines.append("- none")
    lines.extend(["", "## Warnings", ""])
    if warnings:
        lines.extend(f"- `{item.get('reason')}`: `{item}`" for item in warnings[:50])
        if len(warnings) > 50:
            lines.append(f"- ... {len(warnings) - 50} additional warnings stored in JSON.")
    else:
        lines.append("- none")
    lines.extend(
        [
            "",
            "## Report Files",
            "",
            f"- JSON: `{relative(report_json_path)}`",
            f"- Markdown: `{relative(report_md_path)}`",
        ]
    )
    report_md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    contract["latest_weak_language_targeted_review"] = {
        "review_id": REPORT_ID,
        "status": status,
        "script_path": "scripts/oxford/build-oxford-a1-weak-language-targeted-review.py",
        "path": relative(report_json_path),
        "summary_path": relative(report_md_path),
        "rows_reviewed": len(row_ids),
        "target_support_languages": len(target_language_codes),
        "display_cells": filled_display_cells,
        "example_cells": filled_example_cells,
        "blockers": len(blockers),
        "warnings": len(warnings),
        "review_scope": report["review_scope"],
        "closes_gate_layer": ["weak_language_targeted_review"],
        "does_not_close": [
            "permission_evidence_or_project_evidence_decision",
            "allowed_fields_review",
            "final_delivery_approval_check",
        ],
    }
    write_json(contract_path, contract)
    return report_json_path, report_md_path, report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", default=str(DEFAULT_CONTRACT_PATH))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    args = parser.parse_args()

    report_json_path, report_md_path, report = build_review(Path(args.contract), Path(args.output_dir))
    if report["blockers"]:
        raise SystemExit(
            f"Oxford A1 weak-language targeted review blocked: blockers={len(report['blockers'])} report={relative(report_md_path)}"
        )
    print(
        f"Oxford A1 weak-language targeted review OK: blockers=0 warnings={report['summary']['warnings']} report={relative(report_md_path)}"
    )


if __name__ == "__main__":
    main()
