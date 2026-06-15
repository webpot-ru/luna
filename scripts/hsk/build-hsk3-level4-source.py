#!/usr/bin/env python3
"""Build the HSK 3.0 Level 4 source snapshot from the local official PDF."""

from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader


ROOT = Path.cwd()
DATE = "20260605"
RELEASE_ID = "hsk3_level_4_1000_v1"
SOURCE_URL = (
    "https://hsk.cn-bj.ufileos.com/3.0/"
    "%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88"
    "%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81"
    "%E8%AF%AD%E6%B3%95%EF%BC%89.pdf"
)
CHINESE_TEST_URL = "https://www.chinesetest.cn/hsk"
PDF_RELATIVE = "outputs/hsk/source/hsk3_official_syllabus_vocab_chars_grammar_202511_202607.pdf"
PDF_PATH = ROOT / PDF_RELATIVE
SOURCE_OUT = ROOT / "outputs/hsk/source" / f"{RELEASE_ID}.source.json"
OVERLAP_JSON_OUT = ROOT / "outputs/hsk/qa" / f"{RELEASE_ID}_classic_overlap_{DATE}.json"
OVERLAP_MD_OUT = ROOT / "outputs/hsk/qa" / f"{RELEASE_ID}_classic_overlap_{DATE}.md"

CLASSIC_CSV_SPECS = [
    (1, 150),
    (2, 150),
    (3, 300),
    (4, 600),
    (5, 1300),
    (6, 2500),
]


def normalize_source_word(word: str) -> str:
    return re.sub(r"[0-9]+$", "", word)


def parse_level(raw_level: str) -> dict:
    level = int(re.match(r"^\d+", raw_level).group(0))
    cross_level_notes = re.findall(r"（([^）]+)）", raw_level)
    return {"level": level, "raw_level": raw_level, "cross_level_notes": cross_level_notes}


def clean_pdf_text(text: str) -> str:
    text = re.sub(r"序号\s+等级\s+词语\s+拼音\s+词性", " ", text)
    text = re.sub(r"\b\d+\s+汉考国际(?:\s+汉考国际)*", " ", text)
    text = re.sub(r"汉考国际", " ", text)
    return " ".join(text.split())


def extract_level4_rows() -> list[dict]:
    reader = PdfReader(PDF_PATH)
    # PDF pages 29-53 (0-indexed 28-52) contain official vocabulary rows 1001-2000.
    text = "\n".join((reader.pages[index].extract_text() or "") for index in range(28, 53))
    text = clean_pdf_text(text)
    row_start = re.compile(r"(?<!\d)(1\d{3}|2000)\s+((?:4)(?:（[^）]+）)*)\s+")
    matches = list(row_start.finditer(text))
    parsed_rows: list[dict] = []

    for index, match in enumerate(matches):
        order = int(match.group(1))
        raw_level = match.group(2)
        if not 1001 <= order <= 2000:
            continue
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        segment = text[start:end].strip()
        tokens = segment.split()
        if not tokens:
            raise ValueError(f"Empty row segment for HSK3 order {order}")

        source_word = tokens[0]
        pinyin_tokens: list[str] = []
        pos_tokens: list[str] = []
        in_pos = False
        for token in tokens[1:]:
            if re.search(r"[\u4e00-\u9fff]", token):
                in_pos = True
            if in_pos:
                pos_tokens.append(token)
            else:
                pinyin_tokens.append(token)

        level = parse_level(raw_level)
        parsed_rows.append(
            {
                "release_id": RELEASE_ID,
                "hsk_version": "HSK 3.0",
                "hsk_order": order,
                "hsk_level": level["level"],
                "raw_level": level["raw_level"],
                "cross_level_notes": level["cross_level_notes"],
                "source_word": source_word,
                "simplified": normalize_source_word(source_word),
                "hsk_key": f"{order}:{source_word}",
                "pinyin": " ".join(pinyin_tokens),
                "pos": " ".join(pos_tokens),
                "source": {
                    "label": "Official HSK 3.0 syllabus vocabulary/characters/grammar PDF",
                    "publisher": "中外语言交流合作中心",
                    "publication_date": "2025-11",
                    "implementation_date": "2026-07",
                    "official_page_url": CHINESE_TEST_URL,
                    "pdf_url": SOURCE_URL,
                    "local_pdf_path": PDF_RELATIVE,
                    "extraction_note": (
                        "Extracted from the official local PDF snapshot with bundled pypdf; "
                        "rows 1001-2000 are the HSK 3.0 Level 4 vocabulary table."
                    ),
                },
            }
        )

    orders = [row["hsk_order"] for row in parsed_rows]
    missing = [order for order in range(1001, 2001) if order not in orders]
    if len(parsed_rows) != 1000 or missing:
        raise ValueError(f"Expected 1000 continuous rows 1001-2000, got {len(parsed_rows)}; missing={missing[:20]}")
    return parsed_rows


def load_classic_rows() -> list[dict]:
    rows: list[dict] = []
    for level, count in CLASSIC_CSV_SPECS:
        csv_path = ROOT / "outputs/hsk" / f"hsk2_classic_level_{level}_{count}_v1.csv"
        with csv_path.open("r", encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                rows.append(
                    {
                        "release_id": row["release_id"],
                        "classic_level": level,
                        "hsk_order": int(row["hsk_order"]),
                        "simplified": normalize_source_word(row["simplified"]),
                        "source_word": row["simplified"],
                        "pinyin": row["pinyin"],
                        "en": row.get("EN", ""),
                    }
                )
    return rows


def build_overlap(new_rows: list[dict], classic_rows: list[dict]) -> list[dict]:
    by_simplified: dict[str, list[dict]] = {}
    for row in classic_rows:
        by_simplified.setdefault(row["simplified"], []).append(row)

    overlap_rows: list[dict] = []
    for row in new_rows:
        exact_matches = by_simplified.get(row["simplified"], [])
        overlap_rows.append(
            {
                "hsk3_order": row["hsk_order"],
                "hsk3_level": row["hsk_level"],
                "hsk3_source_word": row["source_word"],
                "hsk3_simplified": row["simplified"],
                "hsk3_pinyin": row["pinyin"],
                "hsk3_pos": row["pos"],
                "overlap_type": "exact_classic_word" if exact_matches else "absent_as_exact_classic_word",
                "classic_matches": [
                    {
                        "classic_release_id": match["release_id"],
                        "classic_level": match["classic_level"],
                        "classic_order": match["hsk_order"],
                        "classic_source_word": match["source_word"],
                        "classic_pinyin": match["pinyin"],
                        "classic_en": match["en"],
                        "pinyin_same": match["pinyin"] == row["pinyin"],
                    }
                    for match in exact_matches
                ],
            }
        )
    return overlap_rows


def summarize(overlap_rows: list[dict]) -> dict:
    exact = [row for row in overlap_rows if row["overlap_type"] == "exact_classic_word"]
    absent = [row for row in overlap_rows if row["overlap_type"] == "absent_as_exact_classic_word"]
    by_classic_level: dict[str, int] = {}
    for row in exact:
        for match in row["classic_matches"]:
            key = str(match["classic_level"])
            by_classic_level[key] = by_classic_level.get(key, 0) + 1
    return {
        "release_id": RELEASE_ID,
        "hsk3_rows": len(overlap_rows),
        "exact_classic_word_rows": len(exact),
        "absent_as_exact_classic_word_rows": len(absent),
        "exact_match_count_by_classic_level": by_classic_level,
        "note": (
            "This first-pass report checks exact simplified source-word reuse only. "
            "Compound-related rows require separate HSK 3.0 work before reuse."
        ),
    }


def to_markdown(summary: dict, overlap_rows: list[dict]) -> str:
    sample_absent = ", ".join(
        f"{row['hsk3_order']} {row['hsk3_source_word']} ({row['hsk3_pinyin']})"
        for row in overlap_rows
        if row["overlap_type"] == "absent_as_exact_classic_word"
    )[:3000]
    return "\n".join(
        [
            f"# {RELEASE_ID} Classic Overlap",
            "",
            f"Rows checked: {summary['hsk3_rows']}",
            f"Exact Classic word rows: {summary['exact_classic_word_rows']}",
            f"Absent as exact Classic word rows: {summary['absent_as_exact_classic_word_rows']}",
            f"Exact matches by Classic level: {json.dumps(summary['exact_match_count_by_classic_level'], ensure_ascii=False)}",
            "",
            "This is an exact simplified-word overlap report only. It deliberately does not auto-reuse compound-related rows.",
            "",
            "First absent exact rows:",
            "",
            sample_absent or "None",
            "",
        ]
    )


def main() -> None:
    new_rows = extract_level4_rows()
    classic_rows = load_classic_rows()
    overlap_rows = build_overlap(new_rows, classic_rows)
    summary = summarize(overlap_rows)

    SOURCE_OUT.parent.mkdir(parents=True, exist_ok=True)
    OVERLAP_JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    SOURCE_OUT.write_text(json.dumps(new_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OVERLAP_JSON_OUT.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source_release_id": RELEASE_ID,
                "source_path": str(SOURCE_OUT.relative_to(ROOT)),
                "classic_inputs": [
                    f"outputs/hsk/hsk2_classic_level_{level}_{count}_v1.csv"
                    for level, count in CLASSIC_CSV_SPECS
                ],
                "summary": summary,
                "rows": overlap_rows,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    OVERLAP_MD_OUT.write_text(to_markdown(summary, overlap_rows), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "ok",
                "release_id": RELEASE_ID,
                "source": str(SOURCE_OUT.relative_to(ROOT)),
                "overlap_json": str(OVERLAP_JSON_OUT.relative_to(ROOT)),
                "overlap_md": str(OVERLAP_MD_OUT.relative_to(ROOT)),
                "summary": summary,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
