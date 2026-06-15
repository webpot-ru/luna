#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
CMU_SOURCE_IDS = [
    "ipa-focused-english-us-cmudict-dict",
    "ipa-focused-english-us-cmudict-phones",
    "ipa-focused-english-us-cmudict-symbols",
]

PHONE_MAP = {
    "AA": "ɑ",
    "AE": "æ",
    "AH0": "ə",
    "AH1": "ʌ",
    "AH2": "ə",
    "AO": "ɔ",
    "AW": "aʊ",
    "AY": "aɪ",
    "B": "b",
    "CH": "tʃ",
    "D": "d",
    "DH": "ð",
    "EH": "ɛ",
    "ER0": "ɚ",
    "ER1": "ɝ",
    "ER2": "ɚ",
    "EY": "eɪ",
    "F": "f",
    "G": "ɡ",
    "HH": "h",
    "IH": "ɪ",
    "IY": "i",
    "JH": "dʒ",
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ŋ",
    "OW": "oʊ",
    "OY": "ɔɪ",
    "P": "p",
    "R": "r",
    "S": "s",
    "SH": "ʃ",
    "T": "t",
    "TH": "θ",
    "UH": "ʊ",
    "UW": "u",
    "V": "v",
    "W": "w",
    "Y": "j",
    "Z": "z",
    "ZH": "ʒ",
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


def lookup_key(value):
    return (
        normalize_text(value)
        .lower()
        .replace("’", "'")
        .replace("`", "'")
        .strip("'")
    )


def tokenize(value):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", normalize_text(value).replace("’", "'"))


def clean_display_terms(value):
    text = normalize_text(value).replace("’", "'")
    text = re.sub(r"\([^)]*\)", "", text)
    text = re.sub(r"\b([A-Za-z]+)\d+\b", r"\1", text)
    text = re.sub(r"\bmodal\b", "", text, flags=re.I)
    parts = []
    for chunk in re.split(r"[,/;]", text):
        chunk = normalize_text(chunk)
        if chunk:
            parts.append(chunk)
    return parts or [text]


def load_cmudict(path):
    entries = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith(";;;"):
            continue
        raw_word, *phones = line.split()
        key = raw_word.lower()
        canonical_key = re.sub(r"\(\d+\)$", "", key)
        entries.setdefault(canonical_key, []).append({"raw_word": raw_word, "phones": phones})
    return entries


def strip_stress(phone):
    return re.sub(r"[0-2]$", "", phone)


def arpabet_to_ipa(phones):
    ipa_parts = []
    for phone in phones:
        ipa = PHONE_MAP.get(phone) or PHONE_MAP.get(strip_stress(phone))
        if not ipa:
            raise ValueError(f"Unsupported CMUdict phone: {phone}")
        ipa_parts.append(ipa)
    return "".join(ipa_parts)


def transcribe_tokens(tokens, cmudict, text_label):
    if not tokens:
        raise ValueError(f"No transcribable tokens in {text_label}")
    evidence = []
    ipa_parts = []
    for token in tokens:
        key = lookup_key(token)
        variants = cmudict.get(key)
        if not variants:
            raise ValueError(f"CMUdict missing token {token!r} in {text_label}")
        selected = variants[0]
        ipa = arpabet_to_ipa(selected["phones"])
        ipa_parts.append(ipa)
        evidence.append(
            {
                "token": token,
                "cmu_key": key,
                "cmu_raw_entry": selected["raw_word"],
                "arpabet": " ".join(selected["phones"]),
                "ipa": ipa,
                "source_id": "ipa-focused-english-us-cmudict-dict",
                "match_type": "exact_token",
            }
        )
    return {"ipa": f"/{' '.join(ipa_parts)}/", "evidence": evidence}


def transcribe_display(value, cmudict):
    terms = clean_display_terms(value)
    transcriptions = []
    evidence = []
    for term in terms:
        result = transcribe_tokens(tokenize(term), cmudict, f"display term {term!r}")
        transcriptions.append(result["ipa"])
        evidence.extend(result["evidence"])
    return {"ipa": ", ".join(transcriptions), "evidence": evidence, "display_terms": terms}


def build_pronunciation_row(row, cmudict, generated_at):
    display = normalize_text(row["reviewed_display_headword"])
    example = normalize_text(row["example_EN"])
    display_transcription = transcribe_display(display, cmudict)
    example_transcription = transcribe_tokens(tokenize(example), cmudict, f"example {row['row_id']}")
    blockers = [
        blocker
        for blocker in row.get("remaining_blockers", [])
        if blocker != "english_pronunciation_source_check"
    ]
    return {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "meaning_id": row["meaning_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_headword": row["source_headword"],
        "reviewed_display_headword": display,
        "reviewed_part_of_speech": row["reviewed_part_of_speech"],
        "meaning_note": row["meaning_note"],
        "example_EN": example,
        "transcription_EN": display_transcription["ipa"],
        "example_transcription_EN": example_transcription["ipa"],
        "transcription_status": "source_backed_cmudict_component_exact",
        "example_transcription_status": "source_backed_cmudict_component_exact",
        "pronunciation_source": "cmudict_exact_token_lookup_plus_deterministic_arpabet_to_ipa",
        "pronunciation_variant": "EN-US",
        "source_ids": CMU_SOURCE_IDS,
        "source_path": "reference-sources/raw/ipa-focused/english-us/cmudict.dict",
        "source_license_path": "reference-sources/raw/ipa-focused/english-us/cmudict_LICENSE",
        "does_not_use_oxford_pronunciation": True,
        "display_terms": display_transcription["display_terms"],
        "display_pronunciation_evidence": display_transcription["evidence"],
        "example_pronunciation_evidence": example_transcription["evidence"],
        "review_status": "en_us_pronunciation_source_backed",
        "reviewer": "codex_oxford_a1_en_us_pronunciations_v1",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--examples",
        default="outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_001_150_v1_english_examples_v1.jsonl",
    )
    parser.add_argument("--cmu", default="reference-sources/raw/ipa-focused/english-us/cmudict.dict")
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/pronunciations")
    parser.add_argument("--pronunciation-id", default="en_us_pronunciations_v1")
    args = parser.parse_args()

    examples_path = Path(args.examples)
    cmu_path = Path(args.cmu)
    rows = read_jsonl(examples_path)
    if not rows:
        raise ValueError("English examples artifact is empty")
    cmudict = load_cmudict(cmu_path)
    generated_at = datetime.now(timezone.utc).isoformat()
    pronunciation_rows = [build_pronunciation_row(row, cmudict, generated_at) for row in rows]

    release_id = rows[0]["release_id"]
    out_dir = Path(args.out_dir)
    pronunciation_path = out_dir / f"{release_id}_{args.pronunciation_id}.jsonl"
    summary_path = out_dir / f"{release_id}_{args.pronunciation_id}_summary.md"
    write_jsonl(pronunciation_path, pronunciation_rows)

    summary = [
        f"# Oxford A1 EN-US Pronunciations: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- English examples source: `{examples_path}`",
        f"- Pronunciation rows: {len(pronunciation_rows)}",
        "- Source: `CMUdict` exact-token lookup plus deterministic ARPABET-to-IPA conversion",
        "- Source ids: `ipa-focused-english-us-cmudict-dict`, `ipa-focused-english-us-cmudict-phones`, `ipa-focused-english-us-cmudict-symbols`",
        "- Oxford pronunciation copied: false",
        "- Generation ready: false",
        "- Support-language translations: not filled in this artifact",
        "",
        "This artifact closes only the EN-US source-backed pronunciation layer. It does not approve final delivery.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(
        f"Oxford EN-US pronunciations built: rows={len(pronunciation_rows)} "
        f"pronunciations={pronunciation_path} summary={summary_path}"
    )


if __name__ == "__main__":
    main()
