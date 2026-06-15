#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-06-03.v2"
CMU_SOURCE_IDS = [
    "ipa-focused-english-us-cmudict-dict",
    "ipa-focused-english-us-cmudict-phones",
    "ipa-focused-english-us-cmudict-symbols",
]
BRITFONE_SOURCE_IDS = [
    "ipa-focused-english-gb-britfone-main",
    "ipa-focused-english-gb-britfone-symbols",
    "ipa-focused-english-gb-britfone-license",
    "ipa-focused-english-gb-britfone-readme",
    "ipa-focused-english-gb-lunacards-britfone-supplement-v1",
]
BRITFONE_SUPPLEMENT_SOURCE_ID = "ipa-focused-english-gb-lunacards-britfone-supplement-v1"
BRITFONE_LETTER_IPA = {
    "A": "ˈeɪ",
    "B": "bˈiː",
    "C": "sˈiː",
    "D": "dˈiː",
    "E": "ˈiː",
    "F": "ˈɛf",
    "G": "dʒˈiː",
    "H": "ˈeɪtʃ",
    "I": "ˈaɪ",
    "J": "dʒˈeɪ",
    "K": "kˈeɪ",
    "L": "ˈɛl",
    "M": "ˈɛm",
    "N": "ˈɛn",
    "O": "ˈəʊ",
    "P": "pˈiː",
    "Q": "kjˈuː",
    "R": "ˈɑː",
    "S": "ˈɛs",
    "T": "tˈiː",
    "U": "jˈuː",
    "V": "vˈiː",
    "W": "dˈʌbəljˌuː",
    "X": "ˈɛks",
    "Y": "wˈaɪ",
    "Z": "zˈɛd",
}
BRITFONE_COMPOUND_COMPONENTS = {
    "GRANDPARENT": ["GRAND", "PARENT"],
    "SMARTPHONE": ["SMART", "PHONE"],
}

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

CONTRACTION_EXPANSIONS = {
    "i'm": ["I", "am"],
    "it's": ["it", "is"],
    "that's": ["that", "is"],
    "there's": ["there", "is"],
    "he's": ["he", "is"],
    "she's": ["she", "is"],
    "we're": ["we", "are"],
    "they're": ["they", "are"],
    "you're": ["you", "are"],
    "i've": ["I", "have"],
    "we've": ["we", "have"],
    "don't": ["do", "not"],
    "can't": ["can", "not"],
    "won't": ["will", "not"],
    "isn't": ["is", "not"],
    "aren't": ["are", "not"],
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
    return normalize_text(value).lower().replace("’", "'").replace("`", "'").strip("'")


def tokenize(value):
    raw_tokens = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", normalize_text(value).replace("’", "'"))
    tokens = []
    for token in raw_tokens:
        expanded = CONTRACTION_EXPANSIONS.get(token.lower())
        if expanded:
            tokens.extend(expanded)
        else:
            tokens.append(token)
    return tokens


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
        key = re.sub(r"\(\d+\)$", "", raw_word.lower())
        entries.setdefault(key, []).append({"raw_word": raw_word, "phones": phones})
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


def load_britfone(path):
    entries = {}
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        if "," not in line:
            raise ValueError(f"Invalid Britfone row at {path}:{index}: {line}")
        raw_word, ipa = line.split(",", 1)
        raw_word = normalize_text(raw_word)
        canonical = re.sub(r"\(\d+\)$", "", raw_word).replace("_", " ").upper()
        entries.setdefault(canonical, []).append(
            {
                "raw_word": raw_word,
                "ipa_spaced": normalize_text(ipa),
                "source_id": "ipa-focused-english-gb-britfone-main",
                "match_type": "exact_token",
            }
        )
    return entries


def load_britfone_supplement(path, entries):
    supplement_path = Path(path)
    if not supplement_path.exists():
        return 0
    added = 0
    for index, line in enumerate(supplement_path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) != 3:
            raise ValueError(f"Invalid Britfone supplement row at {path}:{index}: {line}")
        raw_word, ipa_spaced, note = [normalize_text(part) for part in parts]
        key = raw_word.upper()
        if key in entries:
            continue
        entries.setdefault(key, []).append(
            {
                "raw_word": raw_word,
                "ipa_spaced": ipa_spaced,
                "source_id": BRITFONE_SUPPLEMENT_SOURCE_ID,
                "match_type": "reviewed_lunacards_britfone_supplement",
                "source_note": note,
                "supplement_path": str(supplement_path),
            }
        )
        added += 1
    return added


def compact_britfone_ipa(value):
    return "".join(normalize_text(value).split())


def britfone_suffix_ipa(base_ipa, suffix):
    if suffix == "s":
        if base_ipa.endswith(("p", "t", "k", "f", "θ")):
            return "s"
        if base_ipa.endswith(("s", "z", "ʃ", "ʒ", "tʃ", "dʒ")):
            return "ɪz"
        return "z"
    if suffix == "ed":
        if base_ipa.endswith(("t", "d")):
            return "ɪd"
        if base_ipa.endswith(("p", "k", "f", "θ", "s", "ʃ", "tʃ")):
            return "t"
        return "d"
    if suffix == "ing":
        return "ɪŋ"
    raise ValueError(f"Unsupported Britfone suffix rule: {suffix}")


def compact_compound_component_ipa(ipa_spaced, is_first):
    ipa = compact_britfone_ipa(ipa_spaced)
    if is_first:
        return ipa
    return ipa.replace("ˈ", "ˌ", 1)


def select_britfone_token(token, britfone, text_label):
    key = normalize_text(token).replace("’", "'").replace("`", "'").strip("'").upper()
    variants = britfone.get(key)
    if variants:
        selected = variants[0]
        result = {
            "token": token,
            "lookup_key": key,
            "raw_entry": selected["raw_word"],
            "source_form": selected["ipa_spaced"],
            "ipa": compact_britfone_ipa(selected["ipa_spaced"]),
            "source_id": selected.get("source_id", "ipa-focused-english-gb-britfone-main"),
            "match_type": selected.get("match_type", "exact_token"),
        }
        if selected.get("source_note"):
            result["source_note"] = selected["source_note"]
        if selected.get("supplement_path"):
            result["source_path"] = selected["supplement_path"]
        return result

    if key.endswith("'S") and len(key) > 2:
        base_key = key[:-2]
        variants = britfone.get(base_key)
        if variants:
            selected = variants[0]
            base_ipa = compact_britfone_ipa(selected["ipa_spaced"])
            suffix_ipa = britfone_suffix_ipa(base_ipa, "s")
            return {
                "token": token,
                "lookup_key": key,
                "raw_entry": selected["raw_word"],
                "source_form": selected["ipa_spaced"],
                "ipa": f"{base_ipa}{suffix_ipa}",
                "source_id": selected.get("source_id", "ipa-focused-english-gb-britfone-main"),
                "match_type": "regular_possessive_s_suffix_from_exact_base",
                "derived_from_lookup_key": base_key,
                "deterministic_suffix_ipa": suffix_ipa,
            }

    if re.fullmatch(r"[A-Z]+", normalize_text(token)):
        missing_letters = [letter for letter in key if letter not in BRITFONE_LETTER_IPA]
        if missing_letters:
            raise ValueError(f"Unsupported Britfone initialism letters {missing_letters} in {text_label}")
        ipa = " ".join(BRITFONE_LETTER_IPA[letter] for letter in key)
        return {
            "token": token,
            "lookup_key": key,
            "raw_entry": " ".join(key),
            "source_form": "Britfone README initialism rule: pronounce by letter names",
            "ipa": ipa,
            "source_id": "ipa-focused-english-gb-britfone-readme",
            "match_type": "initialism_letter_names_from_britfone_readme_policy",
        }

    candidates = []
    lower = key.lower()
    if lower.endswith("ies") and len(lower) > 3:
        candidates.append((key[:-3] + "Y", "s", "regular_ies_suffix_from_exact_base"))
    if lower.endswith("es") and len(lower) > 2:
        candidates.append((key[:-2], "s", "regular_es_suffix_from_exact_base"))
        candidates.append((key[:-1], "s", "regular_s_suffix_from_exact_base"))
    if lower.endswith("s") and len(lower) > 1:
        candidates.append((key[:-1], "s", "regular_s_suffix_from_exact_base"))
    if lower.endswith("ed") and len(lower) > 2:
        candidates.append((key[:-1], "ed", "regular_d_suffix_from_exact_base"))
        candidates.append((key[:-2], "ed", "regular_ed_suffix_from_exact_base"))
    if lower.endswith("ing") and len(lower) > 3:
        candidates.append((key[:-3], "ing", "regular_ing_suffix_from_exact_base"))
        candidates.append((key[:-3] + "E", "ing", "regular_drop_e_ing_suffix_from_exact_base"))

    for base_key, suffix, match_type in candidates:
        variants = britfone.get(base_key)
        if not variants:
            continue
        selected = variants[0]
        base_ipa = compact_britfone_ipa(selected["ipa_spaced"])
        suffix_ipa = britfone_suffix_ipa(base_ipa, suffix)
        return {
            "token": token,
            "lookup_key": key,
            "raw_entry": selected["raw_word"],
            "source_form": selected["ipa_spaced"],
            "ipa": f"{base_ipa}{suffix_ipa}",
            "source_id": "ipa-focused-english-gb-britfone-main",
            "match_type": match_type,
            "derived_from_lookup_key": base_key,
            "deterministic_suffix_ipa": suffix_ipa,
        }

    reverse_ing_candidates = []
    if key.endswith("E"):
        reverse_ing_candidates.append(key[:-1] + "ING")
    reverse_ing_candidates.append(key + "ING")
    for derived_key in reverse_ing_candidates:
        variants = britfone.get(derived_key)
        if not variants:
            continue
        selected = variants[0]
        derived_ipa = compact_britfone_ipa(selected["ipa_spaced"])
        if not derived_ipa.endswith("ɪŋ"):
            continue
        return {
            "token": token,
            "lookup_key": key,
            "raw_entry": selected["raw_word"],
            "source_form": selected["ipa_spaced"],
            "ipa": derived_ipa.removesuffix("ɪŋ"),
            "source_id": "ipa-focused-english-gb-britfone-main",
            "match_type": "deterministic_base_from_exact_britfone_ing_form",
            "derived_from_lookup_key": derived_key,
            "deterministic_removed_suffix_ipa": "ɪŋ",
        }

    component_keys = BRITFONE_COMPOUND_COMPONENTS.get(key)
    if component_keys:
        component_entries = []
        ipa_parts = []
        for index, component_key in enumerate(component_keys):
            variants = britfone.get(component_key)
            if not variants:
                component_entries = []
                ipa_parts = []
                break
            selected = variants[0]
            component_entries.append(
                {
                    "component_key": component_key,
                    "raw_entry": selected["raw_word"],
                    "source_form": selected["ipa_spaced"],
                    "ipa": compact_britfone_ipa(selected["ipa_spaced"]),
                    "source_id": "ipa-focused-english-gb-britfone-main",
                    "match_type": "exact_component",
                }
            )
            ipa_parts.append(compact_compound_component_ipa(selected["ipa_spaced"], index == 0))
        if component_entries:
            return {
                "token": token,
                "lookup_key": key,
                "raw_entry": "+".join(component_keys),
                "source_form": " + ".join(item["source_form"] for item in component_entries),
                "ipa": "".join(ipa_parts),
                "source_id": "ipa-focused-english-gb-britfone-main",
                "match_type": "deterministic_compound_from_exact_britfone_components",
                "component_entries": component_entries,
                "compound_rule": "join exact Britfone components and demote non-initial primary stress to secondary stress",
            }

    raise ValueError(f"Britfone missing token {token!r} in {text_label}")


def transcribe_tokens_cmu(tokens, cmudict, text_label):
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
                "lookup_key": key,
                "cmu_key": key,
                "raw_entry": selected["raw_word"],
                "cmu_raw_entry": selected["raw_word"],
                "source_form": " ".join(selected["phones"]),
                "arpabet": " ".join(selected["phones"]),
                "ipa": ipa,
                "source_id": "ipa-focused-english-us-cmudict-dict",
                "match_type": "exact_token",
            }
        )
    return {"ipa": f"/{' '.join(ipa_parts)}/", "evidence": evidence}


def transcribe_tokens_britfone(tokens, britfone, text_label):
    if not tokens:
        raise ValueError(f"No transcribable tokens in {text_label}")
    evidence = []
    ipa_parts = []
    for token in tokens:
        selected = select_britfone_token(token, britfone, text_label)
        ipa = selected["ipa"]
        ipa_parts.append(ipa)
        evidence.append(selected)
    return {"ipa": f"/{' '.join(ipa_parts)}/", "evidence": evidence}


def transcribe_display(value, dictionary, text_label, variant):
    terms = clean_display_terms(value)
    transcriptions = []
    evidence = []
    for term in terms:
        if variant == "EN-US":
            result = transcribe_tokens_cmu(tokenize(term), dictionary, f"{text_label} display term {term!r}")
        else:
            result = transcribe_tokens_britfone(tokenize(term), dictionary, f"{text_label} display term {term!r}")
        transcriptions.append(result["ipa"])
        evidence.extend(result["evidence"])
    return {"ipa": ", ".join(transcriptions), "evidence": evidence, "display_terms": terms}


def build_pronunciation_row(layer_row, dictionary, generated_at, variant):
    if variant == "EN-US":
        display = normalize_text(layer_row["display_headword_EN_US"])
        example = normalize_text(layer_row["example_EN_US"])
        display_result = transcribe_display(display, dictionary, layer_row["row_id"], "EN-US")
        example_result = transcribe_tokens_cmu(tokenize(example), dictionary, f"example {layer_row['row_id']}")
        field_suffix = "EN"
        source_ids = CMU_SOURCE_IDS
        source_path = "reference-sources/raw/ipa-focused/english-us/cmudict.dict"
        source_license_path = "reference-sources/raw/ipa-focused/english-us/cmudict_LICENSE"
        source_method = "cmudict_exact_token_lookup_plus_deterministic_arpabet_to_ipa"
        status = "source_backed_cmudict_component_exact"
        reviewer = "codex_oxford_en_us_edition_pronunciations_v1"
        review_status = "en_us_edition_pronunciation_source_backed"
    else:
        display = normalize_text(layer_row["display_headword_EN_GB"])
        example = normalize_text(layer_row["example_EN_GB"])
        display_result = transcribe_display(display, dictionary, layer_row["row_id"], "EN-GB")
        example_result = transcribe_tokens_britfone(tokenize(example), dictionary, f"example {layer_row['row_id']}")
        field_suffix = "EN_GB"
        source_ids = BRITFONE_SOURCE_IDS
        source_path = "reference-sources/raw/ipa-focused/english-gb/britfone.main.3.0.1.csv"
        source_license_path = "reference-sources/raw/ipa-focused/english-gb/britfone_LICENSE.txt"
        source_method = "britfone_exact_token_lookup_plus_deterministic_spacing_normalization_and_lunacards_reviewed_supplement"
        status = "source_backed_britfone_component_exact"
        reviewer = "codex_oxford_en_gb_edition_pronunciations_v1"
        review_status = "en_gb_edition_pronunciation_source_backed"

    blockers = [
        blocker
        for blocker in layer_row.get("remaining_blockers", [])
        if blocker != "english_pronunciation_source_check"
    ]
    row = {
        "release_id": layer_row["release_id"],
        "course_id": layer_row["course_id"],
        "row_id": layer_row["row_id"],
        "core_item_id": layer_row["core_item_id"],
        "meaning_id": layer_row["meaning_id"],
        "source_candidate_id": layer_row["source_candidate_id"],
        "source_headword": layer_row["source_headword"],
        "reviewed_display_headword": display,
        "reviewed_part_of_speech": layer_row["reviewed_part_of_speech"],
        "meaning_note": layer_row["meaning_note"],
        "example": example,
        "transcription": display_result["ipa"],
        "example_transcription": example_result["ipa"],
        "transcription_status": status,
        "example_transcription_status": status,
        "pronunciation_source": source_method,
        "pronunciation_variant": variant,
        "source_ids": source_ids,
        "source_path": source_path,
        "source_license_path": source_license_path,
        "does_not_use_oxford_pronunciation": True,
        "display_terms": display_result["display_terms"],
        "display_pronunciation_evidence": display_result["evidence"],
        "example_pronunciation_evidence": example_result["evidence"],
        "review_status": review_status,
        "reviewer": reviewer,
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }
    if field_suffix == "EN":
        row["example_EN"] = example
        row["transcription_EN"] = display_result["ipa"]
        row["example_transcription_EN"] = example_result["ipa"]
    else:
        row["example_EN_GB"] = example
        row["transcription_EN_GB"] = display_result["ipa"]
        row["example_transcription_EN_GB"] = example_result["ipa"]
    return row


def write_summary(path, release_id, rows, variant, source_name, layer_path):
    fallback_count = 0
    supplement_count = 0
    if variant == "EN-GB":
        for row in rows:
            evidence = list(row.get("display_pronunciation_evidence") or []) + list(
                row.get("example_pronunciation_evidence") or []
            )
            fallback_count += sum(
                1
                for item in evidence
                if item.get("match_type") == "deterministic_compound_from_exact_britfone_components"
            )
            supplement_count += sum(
                1 for item in evidence if item.get("source_id") == BRITFONE_SUPPLEMENT_SOURCE_ID
            )
    source_note = (
        f"`{source_name}` exact-token lookup plus documented deterministic fallbacks"
        if variant == "EN-GB"
        else f"`{source_name}` exact-token lookup"
    )
    summary = [
        f"# Oxford {variant} Edition Pronunciations: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Edition layer source: `{layer_path}`",
        f"- Pronunciation rows: {len(rows)}",
        f"- Source: {source_note}",
        "- Oxford pronunciation copied: false",
        "- Generation ready: false",
    ]
    if variant == "EN-GB":
        summary.extend(
            [
                f"- Component-backed compound fallback evidence: {fallback_count}",
                f"- Reviewed LunaCards Britfone supplement evidence: {supplement_count}",
                "- Compound fallback rule: exact Britfone components are joined and non-initial primary stress is demoted to secondary stress.",
            ]
        )
    summary.extend(
        [
            "",
            "This artifact closes only source-backed pronunciation evidence for its English edition. It does not approve final delivery.",
            "",
        ]
    )
    path.write_text("\n".join(summary), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--edition-layer",
        default="outputs/oxford-vocabulary/edition-layers/oxford_3000_core_a1_part_001_150_v1_us_uk_edition_layer_v1.jsonl",
    )
    parser.add_argument("--cmu", default="reference-sources/raw/ipa-focused/english-us/cmudict.dict")
    parser.add_argument("--britfone", default="reference-sources/raw/ipa-focused/english-gb/britfone.main.3.0.1.csv")
    parser.add_argument(
        "--britfone-supplement",
        default="reference-sources/raw/ipa-focused/english-gb/lunacards_britfone_supplement_v1.tsv",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/pronunciations")
    args = parser.parse_args()

    layer_path = Path(args.edition_layer)
    layer_rows = read_jsonl(layer_path)
    if not layer_rows:
        raise ValueError("Edition layer artifact is empty")
    release_id = layer_rows[0]["release_id"]
    generated_at = datetime.now(timezone.utc).isoformat()
    cmudict = load_cmudict(Path(args.cmu))
    britfone = load_britfone(Path(args.britfone))
    load_britfone_supplement(args.britfone_supplement, britfone)

    outputs = []
    for variant, dictionary, artifact_id, source_name in [
        ("EN-US", cmudict, "en_us_edition_pronunciations_v1", "CMUdict"),
        ("EN-GB", britfone, "en_gb_edition_pronunciations_v1", "Britfone"),
    ]:
        rows = [build_pronunciation_row(row, dictionary, generated_at, variant) for row in layer_rows]
        out_dir = Path(args.out_dir)
        out_path = out_dir / f"{release_id}_{artifact_id}.jsonl"
        summary_path = out_dir / f"{release_id}_{artifact_id}_summary.md"
        write_jsonl(out_path, rows)
        write_summary(summary_path, release_id, rows, variant, source_name, layer_path)
        outputs.append((variant, out_path, summary_path, len(rows)))

    for variant, out_path, summary_path, count in outputs:
        print(f"Oxford {variant} edition pronunciations built: rows={count} path={out_path} summary={summary_path}")


if __name__ == "__main__":
    main()
