#!/usr/bin/env python3
"""Compatibility wrapper for the fast Oxford 150 workbook audit.

The original implementation used repeated openpyxl cell lookups and was too
slow for all 70 workbooks. Keep this entrypoint stable and delegate to the
streaming implementation.
"""

from __future__ import annotations

import os
from pathlib import Path
import sys

fast_script = Path(__file__).with_name("audit-oxford-150-workbook-quality-fast.py")
os.execv(sys.executable, [sys.executable, str(fast_script), *sys.argv[1:]])


EXPECTED_SHEETS = {
    "Course Metadata",
    "Deck Metadata",
    "Card Metadata",
    "_README",
    "_qa_status",
    "_languages",
}

LANGUAGE_COUNT = 53
MAIN_COLUMN_COUNT = 108

SCRIPT_PATTERNS = {
    "RU": re.compile(r"[\u0400-\u04FF]"),
    "BG": re.compile(r"[\u0400-\u04FF]"),
    "SR": re.compile(r"[\u0400-\u04FF]"),
    "ZH": re.compile(r"[\u4E00-\u9FFF]"),
    "JA": re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]"),
    "KO": re.compile(r"[\uAC00-\uD7AF]"),
    "TH": re.compile(r"[\u0E00-\u0E7F]"),
    "MY": re.compile(r"[\u1000-\u109F]"),
    "KM": re.compile(r"[\u1780-\u17FF]"),
    "LO": re.compile(r"[\u0E80-\u0EFF]"),
    "HI": re.compile(r"[\u0900-\u097F]"),
    "NE": re.compile(r"[\u0900-\u097F]"),
    "BN": re.compile(r"[\u0980-\u09FF]"),
    "SI": re.compile(r"[\u0D80-\u0DFF]"),
    "TA": re.compile(r"[\u0B80-\u0BFF]"),
    "TE": re.compile(r"[\u0C00-\u0C7F]"),
    "KN": re.compile(r"[\u0C80-\u0CFF]"),
    "ML": re.compile(r"[\u0D00-\u0D7F]"),
    "KA": re.compile(r"[\u10A0-\u10FF]"),
    "HY": re.compile(r"[\u0530-\u058F]"),
}

BAD_ENGLISH_ANCHOR_PATTERNS = [
    re.compile(r"\bThe AIDS changed the plan\b", re.I),
    re.compile(r"\bThe decision was audio\b", re.I),
    re.compile(r"\bThe decision was biological\b", re.I),
    re.compile(r"\bThe report mentioned an agriculture\b", re.I),
    re.compile(r"\bThey [a-z]+ the issue carefully\b", re.I),
]

FILENAME_RE = re.compile(
    r"^FlashcardsLuna_Oxford_(?P<course>3000_Core|5000_Advanced_Extension)_"
    r"(?P<level>A1|A2|B1|B2|C1)_Part_(?P<part>\d{3})_"
    r"(?P<rows>\d+)_(?P<edition>US|British)_English\.xlsx$"
)


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def metadata_map(ws) -> dict[str, str]:
    result: dict[str, str] = {}
    for row in range(2, ws.max_row + 1):
        key = norm(ws.cell(row, 1).value)
        if key:
            result[key] = norm(ws.cell(row, 2).value)
    return result


def add(
    findings: list[dict[str, Any]],
    severity: str,
    code: str,
    workbook: Path,
    detail: str,
    *,
    sheet: str | None = None,
    row: int | None = None,
    column: str | None = None,
    language: str | None = None,
) -> None:
    findings.append(
        {
            "severity": severity,
            "code": code,
            "workbook": workbook.name,
            "sheet": sheet,
            "row": row,
            "column": column,
            "language": language,
            "detail": detail,
        }
    )


def audit_workbook(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    match = FILENAME_RE.match(path.name)
    findings: list[dict[str, Any]] = []
    info: dict[str, Any] = {
        "workbook": path.name,
        "row_count": None,
        "course": None,
        "level": None,
        "part": None,
        "edition": None,
    }
    if not match:
        add(findings, "blocker", "filename_shape", path, "Unexpected Oxford 150 workbook filename.")
        return info, findings

    course_slug = match.group("course")
    expected_course = (
        "Oxford 3000 Core"
        if course_slug == "3000_Core"
        else "Oxford 5000 Advanced Extension"
    )
    expected_level = match.group("level")
    expected_rows = int(match.group("rows"))
    expected_edition = "US English" if match.group("edition") == "US" else "British English"
    info.update(
        {
            "course": expected_course,
            "level": expected_level,
            "part": match.group("part"),
            "edition": expected_edition,
            "row_count": expected_rows,
        }
    )

    wb = load_workbook(path, read_only=True, data_only=False)
    missing_sheets = sorted(EXPECTED_SHEETS - set(wb.sheetnames))
    for sheet in missing_sheets:
        add(findings, "blocker", "missing_service_sheet", path, f"Missing sheet {sheet}.")

    main_sheet_name = wb.sheetnames[0]
    ws = wb[main_sheet_name]
    if ws.max_column != MAIN_COLUMN_COUNT:
        add(
            findings,
            "blocker",
            "main_column_count",
            path,
            f"Expected {MAIN_COLUMN_COUNT} columns, got {ws.max_column}.",
            sheet=main_sheet_name,
        )
    if ws.max_row - 1 != expected_rows:
        add(
            findings,
            "blocker",
            "main_row_count",
            path,
            f"Filename expects {expected_rows} card rows, got {ws.max_row - 1}.",
            sheet=main_sheet_name,
        )
    if expected_level not in main_sheet_name:
        add(
            findings,
            "blocker",
            "main_sheet_level_mismatch",
            path,
            f"Main sheet title {main_sheet_name!r} does not include {expected_level}.",
            sheet=main_sheet_name,
        )

    word_langs = [norm(ws.cell(1, col).value) for col in range(1, LANGUAGE_COUNT + 1)]
    example_langs = [
        norm(ws.cell(1, col).value).removesuffix(" example")
        for col in range(LANGUAGE_COUNT + 1, LANGUAGE_COUNT * 2 + 1)
    ]
    if word_langs != example_langs:
        add(findings, "blocker", "word_example_language_order", path, "Word and example language headers differ.", sheet=main_sheet_name)
    if norm(ws.cell(1, 107).value) != "EN transcription" or norm(ws.cell(1, 108).value) != "EN example transcription":
        add(findings, "blocker", "english_transcription_headers", path, "Unexpected English transcription header shape.", sheet=main_sheet_name)

    for row in range(2, ws.max_row + 1):
        en_word = norm(ws.cell(row, 1).value)
        en_example = norm(ws.cell(row, LANGUAGE_COUNT + 1).value)
        for pattern in BAD_ENGLISH_ANCHOR_PATTERNS:
            if pattern.search(en_example):
                add(
                    findings,
                    "blocker",
                    "known_bad_english_anchor",
                    path,
                    f"Known bad English anchor example: {en_example}",
                    sheet=main_sheet_name,
                    row=row,
                    language="EN",
                )
        for idx, lang in enumerate(word_langs, start=1):
            word = norm(ws.cell(row, idx).value)
            example = norm(ws.cell(row, LANGUAGE_COUNT + idx).value)
            if not word:
                add(findings, "blocker", "empty_word_cell", path, "Empty word/display cell.", sheet=main_sheet_name, row=row, column=lang, language=lang)
            if not example:
                add(findings, "blocker", "empty_example_cell", path, "Empty example cell.", sheet=main_sheet_name, row=row, column=f"{lang} example", language=lang)
            if lang != "EN":
                if word and word.casefold() == en_word.casefold():
                    add(findings, "warning", "exact_english_word_fallback", path, f"Target word equals EN word: {word}", sheet=main_sheet_name, row=row, column=lang, language=lang)
                if example and example.casefold() == en_example.casefold():
                    add(findings, "blocker", "exact_english_example_fallback", path, "Target example equals EN example.", sheet=main_sheet_name, row=row, column=f"{lang} example", language=lang)
            script_re = SCRIPT_PATTERNS.get(lang)
            if script_re and word and not script_re.search(word):
                add(findings, "warning", "expected_script_missing_word", path, f"No expected script detected in word cell: {word}", sheet=main_sheet_name, row=row, column=lang, language=lang)
            if script_re and example and not script_re.search(example):
                add(findings, "warning", "expected_script_missing_example", path, f"No expected script detected in example cell: {example}", sheet=main_sheet_name, row=row, column=f"{lang} example", language=lang)

    if "Deck Metadata" in wb.sheetnames:
        dm = metadata_map(wb["Deck Metadata"])
        if dm.get("domain") != expected_course:
            add(findings, "blocker", "deck_metadata_domain_mismatch", path, f"Expected domain {expected_course!r}, got {dm.get('domain')!r}.", sheet="Deck Metadata")
        if dm.get("area") != expected_level:
            add(findings, "blocker", "deck_metadata_area_mismatch", path, f"Expected area {expected_level!r}, got {dm.get('area')!r}.", sheet="Deck Metadata")
        if dm.get("deck_edition") != expected_edition:
            add(findings, "blocker", "deck_metadata_edition_mismatch", path, f"Expected deck_edition {expected_edition!r}, got {dm.get('deck_edition')!r}.", sheet="Deck Metadata")
        if str(expected_rows) not in dm.get("slug", ""):
            add(findings, "warning", "deck_metadata_slug_missing_row_count", path, f"Slug does not include row count {expected_rows}.", sheet="Deck Metadata")
    else:
        dm = {}

    if "Card Metadata" in wb.sheetnames:
        cmeta = wb["Card Metadata"]
        headers = [norm(cmeta.cell(1, col).value) for col in range(1, cmeta.max_column + 1)]
        header_index = {header: idx + 1 for idx, header in enumerate(headers)}
        if cmeta.max_row - 1 != expected_rows:
            add(findings, "blocker", "card_metadata_row_count", path, f"Expected {expected_rows} card metadata rows, got {cmeta.max_row - 1}.", sheet="Card Metadata")
        required = {"main_sheet_row", "card_key", "set_id", "meaning_id", "level"}
        for header in sorted(required - set(header_index)):
            add(findings, "blocker", "card_metadata_missing_column", path, f"Missing column {header}.", sheet="Card Metadata")
        set_id = dm.get("set_id", "")
        for row in range(2, cmeta.max_row + 1):
            main_row_col = header_index.get("main_sheet_row")
            if main_row_col:
                try:
                    main_row = int(cmeta.cell(row, main_row_col).value)
                except (TypeError, ValueError):
                    main_row = None
                if main_row != row:
                    add(findings, "blocker", "card_metadata_main_row_mismatch", path, f"Expected main_sheet_row {row}, got {main_row}.", sheet="Card Metadata", row=row)
            set_id_col = header_index.get("set_id")
            if set_id and set_id_col and norm(cmeta.cell(row, set_id_col).value) != set_id:
                add(findings, "blocker", "card_metadata_set_id_mismatch", path, "Card Metadata set_id differs from Deck Metadata set_id.", sheet="Card Metadata", row=row)
            level_col = header_index.get("level")
            if level_col and norm(cmeta.cell(row, level_col).value) != expected_level:
                add(findings, "blocker", "card_metadata_level_mismatch", path, f"Expected level {expected_level}, got {norm(cmeta.cell(row, level_col).value)!r}.", sheet="Card Metadata", row=row)

    if "Course Metadata" in wb.sheetnames:
        cm = wb["Course Metadata"]
        cm_langs = [norm(cm.cell(1, col).value) for col in range(2, cm.max_column + 1)]
        if cm_langs != word_langs:
            add(findings, "blocker", "course_metadata_language_order", path, "Course Metadata language order differs from main sheet.", sheet="Course Metadata")
        labels = [norm(cm.cell(row, 1).value) for row in range(2, cm.max_row + 1)]
        for required_label in ["Title", "Description", "Module", "Category"]:
            if required_label not in labels:
                add(findings, "blocker", "course_metadata_missing_row", path, f"Missing row {required_label}.", sheet="Course Metadata")
        for row in range(2, cm.max_row + 1):
            label = norm(cm.cell(row, 1).value)
            for col, lang in enumerate(cm_langs, start=2):
                value = norm(cm.cell(row, col).value)
                if not value:
                    add(findings, "blocker", "course_metadata_empty_cell", path, f"Empty {label} for {lang}.", sheet="Course Metadata", row=row, language=lang)
                if label == "Title" and len(value) > 30:
                    add(findings, "warning", "course_metadata_title_long", path, f"Title length {len(value)}: {value}", sheet="Course Metadata", row=row, language=lang)
                if label == "Description" and len(value) > 80:
                    add(findings, "warning", "course_metadata_description_long", path, f"Description length {len(value)}: {value}", sheet="Course Metadata", row=row, language=lang)
                script_re = SCRIPT_PATTERNS.get(lang)
                if script_re and value and label in {"Title", "Description", "Category"} and not script_re.search(value):
                    add(findings, "warning", "course_metadata_expected_script_missing", path, f"No expected script in {label}: {value}", sheet="Course Metadata", row=row, language=lang)

    return info, findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", default="outputs/oxford-vocabulary/final-150")
    parser.add_argument("--out", default="outputs/oxford-vocabulary/qa/oxford_150_workbook_quality_audit_v1.json")
    parser.add_argument("--max-findings", type=int, default=500)
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    workbooks = sorted(input_dir.glob("*.xlsx"))
    all_findings: list[dict[str, Any]] = []
    workbook_infos: list[dict[str, Any]] = []
    for workbook in workbooks:
        info, findings = audit_workbook(workbook)
        workbook_infos.append(info)
        all_findings.extend(findings)

    severity_counts = Counter(finding["severity"] for finding in all_findings)
    code_counts = Counter(finding["code"] for finding in all_findings)
    workbook_blockers = defaultdict(int)
    for finding in all_findings:
        if finding["severity"] == "blocker":
            workbook_blockers[finding["workbook"]] += 1

    report = {
        "report_id": "oxford_150_workbook_quality_audit_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(input_dir),
        "status": "blocked" if severity_counts["blocker"] else "pass",
        "scope": "Oxford 150-word local XLSX workbooks; read-only deterministic audit",
        "native_speaker_certification": False,
        "workbook_count": len(workbooks),
        "checked_rows": sum(info.get("row_count") or 0 for info in workbook_infos),
        "severity_counts": dict(severity_counts),
        "code_counts": dict(code_counts),
        "blocked_workbook_count": len(workbook_blockers),
        "blocked_workbooks": dict(sorted(workbook_blockers.items())),
        "workbooks": workbook_infos,
        "findings_sample": all_findings[: args.max_findings],
        "finding_count": len(all_findings),
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_path = out_path.with_suffix(".md")
    lines = [
        "# Oxford 150 Workbook Quality Audit",
        "",
        f"- Status: `{report['status']}`",
        f"- Workbooks: {report['workbook_count']}",
        f"- Checked card rows from filenames: {report['checked_rows']}",
        f"- Native-speaker certification: `{report['native_speaker_certification']}`",
        f"- Severity counts: `{dict(severity_counts)}`",
        f"- Blocked workbooks: {len(workbook_blockers)}",
        "",
        "## Top Finding Codes",
        "",
    ]
    for code, count in code_counts.most_common(20):
        lines.append(f"- `{code}`: {count}")
    lines.extend(["", "## Blocked Workbooks", ""])
    if workbook_blockers:
        for workbook, count in sorted(workbook_blockers.items()):
            lines.append(f"- `{workbook}`: {count} blockers")
    else:
        lines.append("- None")
    lines.extend(["", "## Sample Findings", ""])
    for finding in all_findings[:50]:
        lines.append(
            f"- `{finding['severity']}` `{finding['code']}` `{finding['workbook']}` "
            f"{finding.get('sheet') or ''} row={finding.get('row') or ''} "
            f"lang={finding.get('language') or ''}: {finding['detail']}"
        )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps({k: report[k] for k in ["status", "workbook_count", "checked_rows", "severity_counts", "blocked_workbook_count"]}, ensure_ascii=False))
    return 1 if report["status"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
