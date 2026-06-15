#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { readRows } from "../lib/qa-utils.mjs";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const levelMatch = releaseId.match(/level_(\d+)_/u);
const rowCountMatch = releaseId.match(/level_\d+_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const expectedRows = rowCountMatch ? Number(rowCountMatch[1]) : null;

const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const csvPath = path.join(outputDir, `${releaseId}.csv`);
const examplesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-examples.json`);

const hanPattern = /\p{Script=Han}/u;
const toneNumberPattern = /[a-züv:][1-5]\b/iu;
const pinyinLatinPattern = /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/iu;

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function lookupCurated(curated, row) {
  return curated[rowKey(row)] ?? curated[row.simplified];
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, 240);
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

function basePinyin(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/u:/gu, "v")
    .replace(/[ǖǘǚǜü]/gu, "v")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "");
}

function compactPinyin(value) {
  return basePinyin(value).replace(/[^a-zv]/gu, "");
}

function requiredPinyinParts(value) {
  const text = String(value ?? "");
  const rawParts = /(?:…|\.{3})/u.test(text) ? text.split(/(?:…|\.{3})/u) : [text];
  return rawParts.map((part) => compactPinyin(part)).filter(Boolean);
}

function countHan(value) {
  return Array.from(String(value ?? "")).filter((char) => hanPattern.test(char)).length;
}

function buildSyllableSet() {
  const initials = ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"];
  const finals = [
    "a", "ai", "an", "ang", "ao",
    "e", "ei", "en", "eng", "er",
    "o", "ong", "ou",
    "i", "ia", "ian", "iang", "iao", "ie", "in", "ing", "iong", "iu",
    "u", "ua", "uai", "uan", "uang", "ue", "ui", "un", "uo",
    "v", "van", "ve", "vn",
  ];
  const explicit = [
    "m", "n", "ng", "r",
    "yi", "ya", "yan", "yang", "yao", "ye", "yin", "ying", "yo", "yong", "you", "yu", "yuan", "yue", "yun",
    "wa", "wai", "wan", "wang", "wei", "wen", "weng", "wo", "wu",
  ];
  return new Set([
    ...explicit,
    ...initials.flatMap((initial) => finals.map((final) => `${initial}${final}`)),
  ]);
}

const syllableSet = buildSyllableSet();
const maxSyllableLength = Math.max(...[...syllableSet].map((syllable) => syllable.length));

function segmentChunk(chunk) {
  const dp = Array.from({ length: chunk.length + 1 }, () => null);
  dp[chunk.length] = [];
  for (let index = chunk.length - 1; index >= 0; index -= 1) {
    for (let end = Math.min(chunk.length, index + maxSyllableLength); end > index; end -= 1) {
      const candidate = chunk.slice(index, end);
      if (!syllableSet.has(candidate) || dp[end] === null) continue;
      dp[index] = [candidate, ...dp[end]];
      break;
    }
  }
  return dp[0];
}

function segmentPinyin(value) {
  const chunks = basePinyin(value)
    .replace(/['’]/gu, " ")
    .split(/[^a-zv]+/gu)
    .filter(Boolean);
  const syllables = [];
  const unsegmented = [];
  for (const chunk of chunks) {
    const segmented = segmentChunk(chunk);
    if (!segmented) {
      unsegmented.push(chunk);
      continue;
    }
    syllables.push(...segmented);
  }
  return { chunks, syllables, unsegmented };
}

function hasHan(value) {
  return hanPattern.test(String(value ?? ""));
}

function hasToneNumber(value) {
  return toneNumberPattern.test(String(value ?? ""));
}

function hasPinyinLetters(value) {
  return pinyinLatinPattern.test(String(value ?? ""));
}

async function main() {
  const [rows, examplesText] = await Promise.all([
    readRows(csvPath),
    fs.readFile(examplesPath, "utf8"),
  ]);
  const examples = JSON.parse(examplesText);

  const blockers = [];
  const warnings = [];
  let exactKeywordHits = 0;
  let syllableCountMatches = 0;

  if (expectedRows !== null && rows.length !== expectedRows) {
    blockers.push(issue("row_count_mismatch", "blocker", null, `Expected ${expectedRows} rows, got ${rows.length}`));
  }

  for (const row of rows) {
    const example = lookupCurated(examples, row);
    if (!example) {
      blockers.push(issue("missing_example_row", "blocker", row, "Missing curated example row for pinyin alignment"));
      continue;
    }

    if (row.example_pinyin !== example.example_pinyin) {
      blockers.push(issue("example_pinyin_mismatch", "blocker", row, "Workbook example_pinyin does not match examples file", {
        expected: compact(example.example_pinyin),
        actual: compact(row.example_pinyin),
      }));
    }
    if (row.example_zh !== example.example_zh) {
      blockers.push(issue("example_zh_mismatch", "blocker", row, "Workbook example_zh does not match examples file", {
        expected: compact(example.example_zh),
        actual: compact(row.example_zh),
      }));
    }

    if (!row.example_pinyin || !hasPinyinLetters(row.example_pinyin)) {
      blockers.push(issue("missing_example_pinyin", "blocker", row, "Example pinyin is empty or has no pinyin letters"));
      continue;
    }
    if (hasHan(row.example_pinyin)) {
      blockers.push(issue("han_in_example_pinyin", "blocker", row, "Example pinyin contains Han characters", { value: compact(row.example_pinyin) }));
    }
    if (hasToneNumber(row.example_pinyin)) {
      blockers.push(issue("tone_number_in_example_pinyin", "blocker", row, "Example pinyin contains tone numbers", { value: compact(row.example_pinyin) }));
    }

    const exampleCompact = compactPinyin(row.example_pinyin);
    const missingParts = requiredPinyinParts(row.pinyin).filter((part) => !exampleCompact.includes(part));
    if (missingParts.length) {
      blockers.push(issue("word_pinyin_not_in_example_pinyin", "blocker", row, "Tone-insensitive word pinyin is not aligned to example_pinyin", {
        missing_parts: missingParts,
        example_pinyin: compact(row.example_pinyin),
      }));
    } else {
      exactKeywordHits += 1;
    }

    const expectedSyllables = countHan(row.example_zh);
    const segmented = segmentPinyin(row.example_pinyin);
    if (segmented.unsegmented.length) {
      blockers.push(issue("example_pinyin_unsegmented_chunk", "blocker", row, "Example pinyin contains a chunk that cannot be segmented as Mandarin pinyin", {
        unsegmented: segmented.unsegmented,
        example_pinyin: compact(row.example_pinyin),
      }));
      continue;
    }
    if (expectedSyllables !== segmented.syllables.length) {
      blockers.push(issue("example_pinyin_syllable_count_mismatch", "blocker", row, "Example pinyin syllable count does not match Han-character count", {
        expected_syllables: expectedSyllables,
        actual_syllables: segmented.syllables.length,
        example_zh: compact(row.example_zh),
        example_pinyin: compact(row.example_pinyin),
      }));
    } else {
      syllableCountMatches += 1;
    }
  }

  const report = {
    release_id: releaseId,
    hsk_level: hskLevel,
    generated_at: new Date().toISOString(),
    rows_checked: rows.length,
    expected_rows: expectedRows,
    word_pinyin_aligned_rows: exactKeywordHits,
    syllable_count_match_rows: syllableCountMatches,
    blockers: blockers.length,
    warnings: warnings.length,
    blocker_type_counts: countByType(blockers),
    warning_type_counts: countByType(warnings),
    blocker_samples: blockers.slice(0, 250),
    warning_samples: warnings.slice(0, 250),
    notes: [
      "This is an HSK-only pinyin alignment gate. It validates that example_pinyin is shaped like Mandarin pinyin and aligns with example_zh and the card-facing word pinyin.",
      "Tone-insensitive matching is intentional so neutral-tone particles and tone sandhi do not become false blockers.",
      "It reads HSK release CSV and HSK examples only, writes HSK QA reports only, and does not mutate ordinary deck, Oxford, Polyglot, database or Google Sheet state.",
    ],
  };

  await fs.mkdir(qaDir, { recursive: true });
  const reportPath = path.join(qaDir, `${releaseId}_pinyin_alignment_gate_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows_checked: rows.length,
        word_pinyin_aligned_rows: exactKeywordHits,
        syllable_count_match_rows: syllableCountMatches,
        blockers: blockers.length,
        warnings: warnings.length,
        report: path.relative(process.cwd(), reportPath),
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
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
