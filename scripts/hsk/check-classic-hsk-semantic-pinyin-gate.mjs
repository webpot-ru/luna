#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const failOnReview = process.argv.includes("--fail-on-review");
const levelMatch = releaseId.match(/level_(\d+)_/u);
const rowCountMatch = releaseId.match(/level_\d+_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const expectedRows = rowCountMatch ? Number(rowCountMatch[1]) : null;

const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const csvPath = path.join(outputDir, `${releaseId}.csv`);
const sourceDir = path.join(outputDir, "source");
const sourcePath = path.join(sourceDir, `${releaseId}.source.json`);
const overridesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-card-overrides.json`);
const examplesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-examples.json`);

const toneNumberPattern = /[a-züv:][1-5]\b/iu;
const toneMarkPattern = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/iu;
const hanPattern = /\p{Script=Han}/u;
const neutralSyllables = new Set(["a", "ba", "de", "guo", "le", "ma", "me", "men", "ne", "zhe", "zi", "ya", "wa"]);
const knownPolyphonicChars = new Set(
  Array.from("挨扒薄背扁便别藏曾差长称乘传创弹当得的地都恶发分干供还行好喝和会假降教觉看空乐了量露绿落难宁强切曲少舍盛数说为相校兴血压咽要应着只重转钻")
);

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u);
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { rows };
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function sourceKey(entry, index) {
  return entry.hsk_canonical_source?.hsk_key ?? entry.hsk_key ?? `${index + 1}:${entry.simplified}`;
}

function lookupCurated(curated, row) {
  return curated[rowKey(row)] ?? curated[row.simplified];
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, 240);
}

function normalizePinyin(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/u:/gu, "ü")
    .replace(/v/gu, "ü")
    .replace(/[0-9]/gu, "")
    .replace(/[’']/gu, "")
    .replace(/[\s\-·.,;:!?，。；：！？“”"()[\]{}]/gu, "")
    .trim();
}

function pinyinSyllables(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/u:/gu, "ü")
    .replace(/v/gu, "ü")
    .split(/[\s\-·'’]+/u)
    .map((part) => part.replace(/[“”"()[\]{}.,;:!?，。；：！？]/gu, "").trim())
    .filter(Boolean);
}

function hasToneNumber(value) {
  return toneNumberPattern.test(String(value ?? ""));
}

function hasToneMark(value) {
  return toneMarkPattern.test(String(value ?? ""));
}

function containsHan(value) {
  return hanPattern.test(String(value ?? ""));
}

function issue(type, severity, row, message, extra = {}) {
  return {
    type,
    severity,
    hsk_order: row ? Number(row.hsk_order) : "",
    hsk_key: row ? rowKey(row) : "",
    simplified: row?.simplified ?? "",
    pinyin: row?.pinyin ?? "",
    message,
    ...extra,
  };
}

function addCandidate(map, source, value) {
  const normalized = normalizePinyin(value);
  if (!normalized) return;
  if (!map.has(normalized)) map.set(normalized, { pinyin: value, sources: new Set() });
  map.get(normalized).sources.add(source);
}

function sourceCandidates(entry) {
  const candidates = new Map();
  const source = entry?.hsk_canonical_source ?? {};
  addCandidate(candidates, "hsk_canonical_card", source.card_pinyin);
  addCandidate(candidates, "hsk_academy", source.hskacademy_pinyin);
  addCandidate(candidates, "hewgill", source.hewgill_pinyin);
  for (const form of entry?.forms ?? []) {
    addCandidate(candidates, "source_form", form.transcriptions?.pinyin);
  }
  return candidates;
}

function candidateSummary(candidates) {
  return [...candidates.values()].map((candidate) => ({
    pinyin: candidate.pinyin,
    sources: [...candidate.sources].sort(),
  }));
}

function sourceSupported(candidates, normalizedCard) {
  const candidate = candidates.get(normalizedCard);
  if (!candidate) return false;
  return [...candidate.sources].some((source) => source !== "hsk_canonical_card");
}

function sourceSupportedWithSandhi(candidates, cardPinyin, simplified) {
  const normalizedCard = normalizePinyin(cardPinyin);
  if (sourceSupported(candidates, normalizedCard)) return true;
  const cardSyllables = pinyinSyllables(cardPinyin);
  for (const [normalizedCandidate, candidate] of candidates.entries()) {
    if (![...candidate.sources].some((source) => source !== "hsk_canonical_card")) continue;
    const candidateSyllables = pinyinSyllables(candidate.pinyin);
    if (cardSyllables.length !== candidateSyllables.length) continue;
    if (String(simplified).startsWith("不") && cardSyllables[0] === "bú" && candidateSyllables[0] === "bù") {
      if (cardSyllables.slice(1).join("|") === candidateSyllables.slice(1).join("|")) return true;
    }
    if (String(simplified).startsWith("一") && ["yí", "yì"].includes(cardSyllables[0]) && candidateSyllables[0] === "yī") {
      if (cardSyllables.slice(1).join("|") === candidateSyllables.slice(1).join("|")) return true;
    }
    if (["过", "着", "得", "地", "的", "了"].includes(String(simplified)) && neutralOnly(cardPinyin)) {
      if (normalizedCandidate === normalizePinyin(candidate.pinyin)) return true;
    }
  }
  return false;
}

async function loadAllHskOccurrences() {
  const files = (await fs.readdir(sourceDir))
    .filter((file) => /^hsk2_classic_level_\d+_\d+_v1\.source\.json$/u.test(file))
    .sort();
  const bySimplified = new Map();
  for (const file of files) {
    const text = await fs.readFile(path.join(sourceDir, file), "utf8");
    const rows = JSON.parse(text);
    const level = Number(file.match(/level_(\d+)_/u)?.[1] ?? 0);
    for (const [index, entry] of rows.entries()) {
      const key = sourceKey(entry, index);
      const pinyin = entry.hsk_canonical_source?.card_pinyin ?? entry.hsk_canonical_source?.hskacademy_pinyin ?? entry.forms?.[0]?.transcriptions?.pinyin ?? "";
      if (!bySimplified.has(entry.simplified)) bySimplified.set(entry.simplified, []);
      bySimplified.get(entry.simplified).push({ release_file: file, level, key, pinyin });
    }
  }
  return bySimplified;
}

function hasKnownPolyphonicChar(value) {
  return Array.from(String(value ?? "")).some((char) => knownPolyphonicChars.has(char));
}

function neutralOnly(value) {
  const syllables = pinyinSyllables(value);
  return syllables.length > 0 && syllables.every((syllable) => neutralSyllables.has(syllable));
}

async function main() {
  const [csvText, sourceText, overridesText, examplesText, allOccurrences] = await Promise.all([
    fs.readFile(csvPath, "utf8"),
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(overridesPath, "utf8"),
    fs.readFile(examplesPath, "utf8"),
    loadAllHskOccurrences(),
  ]);
  const { rows } = parseCsv(csvText);
  const sourceRows = JSON.parse(sourceText);
  const overrides = JSON.parse(overridesText);
  const examples = JSON.parse(examplesText);
  const sourceByKey = new Map(sourceRows.map((entry, index) => [sourceKey(entry, index), entry]));

  const blockers = [];
  const needsReview = [];
  const warnings = [];
  let sourceSupportedRows = 0;
  let multiReadingRows = 0;
  let polyphonicRows = 0;

  if (expectedRows !== null && rows.length !== expectedRows) {
    blockers.push(issue("row_count_mismatch", "blocker", null, `Expected ${expectedRows} rows, got ${rows.length}`));
  }

  for (const row of rows) {
    const key = rowKey(row);
    const source = sourceByKey.get(key);
    const override = lookupCurated(overrides, row);
    const example = lookupCurated(examples, row);
    const cardPinyin = row.pinyin;
    const normalizedCard = normalizePinyin(cardPinyin);
    const candidates = sourceCandidates(source);
    const candidateList = candidateSummary(candidates);

    if (!source) {
      blockers.push(issue("missing_source_row", "blocker", row, "Missing HSK source row for semantic pinyin check"));
      continue;
    }
    if (!override) {
      blockers.push(issue("missing_card_override", "blocker", row, "Missing card override for semantic pinyin check"));
      continue;
    }
    if (!example) {
      blockers.push(issue("missing_example_row", "blocker", row, "Missing example row for semantic pinyin check"));
    }

    if (row.pinyin !== override.pinyin) {
      blockers.push(issue("pinyin_override_mismatch", "blocker", row, "Workbook pinyin does not match card override", {
        expected: override.pinyin,
        actual: row.pinyin,
      }));
    }
    if (source.hsk_canonical_source?.card_pinyin && normalizePinyin(source.hsk_canonical_source.card_pinyin) !== normalizedCard) {
      blockers.push(issue("canonical_card_pinyin_mismatch", "blocker", row, "Workbook pinyin does not match canonical source card_pinyin", {
        expected: source.hsk_canonical_source.card_pinyin,
        actual: row.pinyin,
      }));
    }
    if (hasToneNumber(cardPinyin)) {
      blockers.push(issue("pinyin_tone_number", "blocker", row, "Card-facing pinyin contains tone numbers", { value: compact(cardPinyin) }));
    }
    if (containsHan(cardPinyin)) {
      blockers.push(issue("han_in_pinyin", "blocker", row, "Card-facing pinyin contains Han characters", { value: compact(cardPinyin) }));
    }

    const supported = sourceSupportedWithSandhi(candidates, cardPinyin, row.simplified);
    if (supported) sourceSupportedRows += 1;
    if (!supported) {
      needsReview.push(issue("card_pinyin_not_supported_by_candidate_source", "needs_review", row, "Card pinyin is not directly supported by HSK Academy, Hewgill or source forms", {
        candidates: candidateList,
      }));
    }

    const sourceReadingCount = new Set(
      [...candidates.entries()]
        .filter(([, candidate]) => [...candidate.sources].some((sourceName) => sourceName !== "hsk_canonical_card"))
        .map(([normalized]) => normalized)
    ).size;
    if (sourceReadingCount > 1) {
      multiReadingRows += 1;
      if (!supported) {
        needsReview.push(issue("multi_reading_without_card_support", "needs_review", row, "Source has multiple readings and none directly support the card pinyin", {
          candidates: candidateList,
        }));
      } else {
        warnings.push(issue("multi_reading_source_row", "warning", row, "Source has multiple readings; card pinyin is supported but row is semantically riskier", {
          candidates: candidateList,
        }));
      }
    }

    if (hasKnownPolyphonicChar(row.simplified)) {
      polyphonicRows += 1;
      warnings.push(issue("known_polyphonic_character_present", "warning", row, "Simplified item contains a known polyphonic character; pinyin is source-supported but this row is worth keeping in semantic audit history", {
        candidates: candidateList,
      }));
    }

    if (!hasToneMark(cardPinyin) && !neutralOnly(cardPinyin)) {
      needsReview.push(issue("non_neutral_pinyin_without_tone_mark", "needs_review", row, "Card pinyin has no tone mark and is not a known neutral-only particle shape", {
        value: compact(cardPinyin),
      }));
    }

    const duplicateOccurrences = allOccurrences.get(row.simplified) ?? [];
    if (duplicateOccurrences.length > 1) {
      const variantPinyins = new Set(duplicateOccurrences.map((item) => normalizePinyin(item.pinyin)).filter(Boolean));
      const duplicateIssue = issue(
        variantPinyins.size > 1 ? "cross_level_duplicate_with_pinyin_variants" : "cross_level_duplicate_same_pinyin",
        variantPinyins.size > 1 ? "needs_review" : "warning",
        row,
        "Simplified item appears in multiple HSK source rows; verify the intended sense/reading remains distinct",
        { occurrences: duplicateOccurrences }
      );
      if (variantPinyins.size > 1) needsReview.push(duplicateIssue);
      else warnings.push(duplicateIssue);
    }

    if (example?.example_zh && !example.example_zh.includes(row.simplified) && !row.simplified.includes("…")) {
      needsReview.push(issue("example_does_not_anchor_exact_word", "needs_review", row, "Example does not contain the exact simplified item; semantic pinyin evidence is weaker", {
        example_zh: compact(example.example_zh),
      }));
    }
  }

  const report = {
    release_id: releaseId,
    hsk_level: hskLevel,
    generated_at: new Date().toISOString(),
    rows_checked: rows.length,
    expected_rows: expectedRows,
    source_supported_rows: sourceSupportedRows,
    multi_reading_rows: multiReadingRows,
    known_polyphonic_rows: polyphonicRows,
    blockers: blockers.length,
    needs_review: needsReview.length,
    warnings: warnings.length,
    blocker_type_counts: countByType(blockers),
    needs_review_type_counts: countByType(needsReview),
    warning_type_counts: countByType(warnings),
    blocker_samples: blockers.slice(0, 250),
    needs_review_samples: needsReview.slice(0, 250),
    warning_samples: warnings.slice(0, 250),
    notes: [
      "This is an HSK-only semantic pinyin gate. It reads only HSK release CSV, HSK source snapshots, HSK card overrides and HSK examples.",
      "It writes only HSK QA reports under outputs/hsk/qa and does not mutate ordinary deck, Oxford/English Core, Polyglot or database pipelines.",
      "Blockers are hard contradictions or invalid pinyin shape. needs_review marks semantic risk that should be inspected before treating tones as native-approved.",
      "Passing this automated gate is not equivalent to external native-speaker approval.",
    ],
  };

  await fs.mkdir(qaDir, { recursive: true });
  const reportPath = path.join(qaDir, `${releaseId}_semantic_pinyin_gate_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows_checked: rows.length,
        source_supported_rows: sourceSupportedRows,
        multi_reading_rows: multiReadingRows,
        known_polyphonic_rows: polyphonicRows,
        blockers: blockers.length,
        needs_review: needsReview.length,
        warnings: warnings.length,
        report: path.relative(process.cwd(), reportPath),
      },
      null,
      2
    )
  );

  if (blockers.length || (failOnReview && needsReview.length)) process.exitCode = 1;
}

function countByType(items) {
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
  return counts;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
