#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { readRows } from "../lib/qa-utils.mjs";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1800_v2";
const EXPECTED_ROWS = 1800;
const DATE = "20260612";

const CSV_PATH = path.join(ROOT, "outputs/hsk/hsk3_level_6_1800_v2.csv");
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1800_v2.source.json");
const EXAMPLES_PATH = path.join(ROOT, "config/hsk3-level6-v2-examples.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_pinyin_alignment_gate_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_pinyin_alignment_gate_${DATE}.md`);

const hanPattern = /\p{Script=Han}/u;
const toneNumberPattern = /[a-züv:][1-5]\b/iu;
const toneMarkPattern = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/iu;
const pinyinLatinPattern = /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/iu;

const acceptedNeutralSourcePinyin = new Map([
  ["啊", "a"],
  ["得", "de"],
  ["地", "de"],
  ["过", "guo"],
  ["啦", "la"],
  ["嘛", "ma"],
  ["子", "zi"],
  ["头", "tou"],
  ["着", "zhe"],
]);

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, 260);
}

function issue(type, severity, row, message, extra = {}) {
  return {
    type,
    severity,
    hsk_order: row ? Number(row.hsk_order) : "",
    hsk_key: row ? row.hsk_key ?? rowKey(row) : "",
    simplified: row?.simplified ?? "",
    pinyin: row?.pinyin ?? "",
    message,
    ...extra,
  };
}

function baseChar(char) {
  return char
    .normalize("NFC")
    .toLowerCase()
    .replace(/u:/gu, "v")
    .replace(/[ǖǘǚǜü]/gu, "v")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "");
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

function segmentBaseChunk(baseChunk) {
  const dp = Array.from({ length: baseChunk.length + 1 }, () => null);
  dp[baseChunk.length] = [];
  for (let index = baseChunk.length - 1; index >= 0; index -= 1) {
    for (let end = Math.min(baseChunk.length, index + maxSyllableLength); end > index; end -= 1) {
      const candidate = baseChunk.slice(index, end);
      if (!syllableSet.has(candidate) || dp[end] === null) continue;
      dp[index] = [candidate, ...dp[end]];
      break;
    }
  }
  return dp[0];
}

function pinyinChunks(value) {
  const chunks = [];
  let current = "";
  for (const char of String(value ?? "").normalize("NFC")) {
    if (/[A-Za-züÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/iu.test(char)) {
      current += char;
      continue;
    }
    if (current) chunks.push(current);
    current = "";
  }
  if (current) chunks.push(current);
  return chunks;
}

function annotatedBase(chunk) {
  let base = "";
  const offsets = [];
  let originalOffset = 0;
  for (const char of chunk) {
    const normalized = baseChar(char).replace(/[^a-zv]/gu, "");
    for (const baseLetter of normalized) {
      base += baseLetter;
      offsets.push({ start: originalOffset, end: originalOffset + char.length });
    }
    originalOffset += char.length;
  }
  return { base, offsets };
}

function segmentPinyin(value) {
  const chunks = pinyinChunks(value);
  const syllables = [];
  const unsegmented = [];
  const ignoredLatinAcronyms = [];
  for (const chunk of chunks) {
    if (/^[A-Z]{2,}$/u.test(chunk)) {
      ignoredLatinAcronyms.push(chunk);
      continue;
    }
    const annotated = annotatedBase(chunk);
    const segmented = segmentBaseChunk(annotated.base);
    if (!segmented) {
      unsegmented.push(chunk);
      continue;
    }
    const effectiveSegmented =
      segmented.length > 1 && segmented[segmented.length - 1] === "r" ? segmented.slice(0, -1) : segmented;
    let baseIndex = 0;
    for (const syllable of effectiveSegmented) {
      const startOffset = annotated.offsets[baseIndex]?.start ?? 0;
      const endOffset = annotated.offsets[baseIndex + syllable.length - 1]?.end ?? chunk.length;
      const raw = chunk.slice(startOffset, endOffset);
      syllables.push({
        syllable,
        raw,
        has_tone_mark: toneMarkPattern.test(raw),
      });
      baseIndex += syllable.length;
    }
  }
  return { chunks, syllables, unsegmented, ignoredLatinAcronyms };
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

function countByType(items) {
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
  return counts;
}

const [rows, sourceRows, examples] = await Promise.all([
  readRows(CSV_PATH),
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(EXAMPLES_PATH, "utf8").then(JSON.parse),
]);

const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key, row]));
const blockers = [];
const warnings = [];
const neutralSyllableCounts = {};
let sourcePinyinExactRows = 0;
let examplePinyinExactRows = 0;
let wordPinyinAlignedRows = 0;
let syllableCountMatchRows = 0;
let sourceRowsWithToneMarks = 0;
let exampleRowsWithToneMarks = 0;
let sourceSyllablesChecked = 0;
let sourceSyllablesWithToneMarks = 0;
let exampleSyllablesChecked = 0;
let exampleSyllablesWithToneMarks = 0;

if (rows.length !== EXPECTED_ROWS) {
  blockers.push(issue("row_count_mismatch", "blocker", null, `Expected ${EXPECTED_ROWS} workbook rows, got ${rows.length}.`));
}
if (sourceRows.length !== EXPECTED_ROWS) {
  blockers.push(issue("source_row_count_mismatch", "blocker", null, `Expected ${EXPECTED_ROWS} source rows, got ${sourceRows.length}.`));
}

for (const row of rows) {
  const key = row.hsk_key ?? rowKey(row);
  const source = sourceByKey.get(key);
  const example = examples[key];

  if (!source) {
    blockers.push(issue("missing_source_row", "blocker", row, `Missing official source row for ${key}.`));
    continue;
  }
  if (!example) {
    blockers.push(issue("missing_example_row", "blocker", row, `Missing curated example row for ${key}.`));
    continue;
  }

  if (row.pinyin !== source.pinyin) {
    blockers.push(issue("source_pinyin_mismatch", "blocker", row, "Workbook ZH transcription does not match official source pinyin.", {
      expected: source.pinyin,
      actual: row.pinyin,
    }));
  } else {
    sourcePinyinExactRows += 1;
  }

  if (row.example_pinyin !== example.example_pinyin) {
    blockers.push(issue("example_pinyin_mismatch", "blocker", row, "Workbook ZH example transcription does not match curated example pinyin.", {
      expected: compact(example.example_pinyin),
      actual: compact(row.example_pinyin),
    }));
  } else {
    examplePinyinExactRows += 1;
  }
  if (row.example_zh !== example.example_zh) {
    blockers.push(issue("example_zh_mismatch", "blocker", row, "Workbook ZH example does not match curated example text.", {
      expected: compact(example.example_zh),
      actual: compact(row.example_zh),
    }));
  }

  for (const [field, value] of [
    ["source_pinyin", row.pinyin],
    ["example_pinyin", row.example_pinyin],
  ]) {
    if (!value || !hasPinyinLetters(value)) {
      blockers.push(issue(`missing_${field}`, "blocker", row, `${field} is empty or has no pinyin letters.`));
    }
    if (hasHan(value)) {
      blockers.push(issue(`han_in_${field}`, "blocker", row, `${field} contains Han characters.`, { value: compact(value) }));
    }
    if (hasToneNumber(value)) {
      blockers.push(issue(`tone_number_in_${field}`, "blocker", row, `${field} contains tone-number notation.`, { value: compact(value) }));
    }
  }

  if (toneMarkPattern.test(row.pinyin)) {
    sourceRowsWithToneMarks += 1;
  } else if (acceptedNeutralSourcePinyin.get(row.simplified) !== row.pinyin) {
    warnings.push(issue("source_pinyin_no_tone_mark", "warning", row, "Source pinyin has no tone mark and is not in the accepted neutral/source list."));
  }
  if (toneMarkPattern.test(row.example_pinyin)) {
    exampleRowsWithToneMarks += 1;
  } else {
    blockers.push(issue("example_pinyin_no_tone_marks", "blocker", row, "Example pinyin has no tone marks at all."));
  }

  const exampleCompact = compactPinyin(row.example_pinyin);
  const missingParts = requiredPinyinParts(row.pinyin).filter((part) => !exampleCompact.includes(part));
  if (missingParts.length) {
    blockers.push(issue("word_pinyin_not_in_example_pinyin", "blocker", row, "Tone-insensitive word pinyin is not aligned to example_pinyin.", {
      missing_parts: missingParts,
      example_pinyin: compact(row.example_pinyin),
    }));
  } else {
    wordPinyinAlignedRows += 1;
  }

  for (const [field, value] of [
    ["source_pinyin", row.pinyin],
    ["example_pinyin", row.example_pinyin],
  ]) {
    const segmented = segmentPinyin(value);
    if (segmented.unsegmented.length) {
      blockers.push(issue(`${field}_unsegmented_chunk`, "blocker", row, `${field} contains a chunk that cannot be segmented as Mandarin pinyin.`, {
        unsegmented: segmented.unsegmented,
        value: compact(value),
      }));
      continue;
    }
    for (const syllable of segmented.syllables) {
      if (field === "source_pinyin") {
        sourceSyllablesChecked += 1;
        if (syllable.has_tone_mark) sourceSyllablesWithToneMarks += 1;
      } else {
        exampleSyllablesChecked += 1;
        if (syllable.has_tone_mark) exampleSyllablesWithToneMarks += 1;
      }
      if (!syllable.has_tone_mark) {
        neutralSyllableCounts[syllable.syllable] = (neutralSyllableCounts[syllable.syllable] ?? 0) + 1;
      }
    }
  }

  const segmentedExample = segmentPinyin(row.example_pinyin);
  const erhuaHanCount = Array.from(String(row.example_zh ?? "")).filter((char) => char === "儿").length;
  const explicitErSyllableCount = segmentedExample.syllables.filter((syllable) => syllable.syllable === "er").length;
  const expectedSyllables = countHan(row.example_zh) - Math.max(0, erhuaHanCount - explicitErSyllableCount);
  if (!segmentedExample.unsegmented.length && expectedSyllables === segmentedExample.syllables.length) {
    syllableCountMatchRows += 1;
  } else if (!segmentedExample.unsegmented.length) {
    blockers.push(issue("example_pinyin_syllable_count_mismatch", "blocker", row, "Example pinyin syllable count does not match Han-character count.", {
      expected_syllables: expectedSyllables,
      actual_syllables: segmentedExample.syllables.length,
      example_zh: compact(row.example_zh),
      example_pinyin: compact(row.example_pinyin),
    }));
  }
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  rows_checked: rows.length,
  expected_rows: EXPECTED_ROWS,
  source_pinyin_exact_rows: sourcePinyinExactRows,
  example_pinyin_exact_rows: examplePinyinExactRows,
  source_rows_with_tone_marks: sourceRowsWithToneMarks,
  example_rows_with_tone_marks: exampleRowsWithToneMarks,
  word_pinyin_aligned_rows: wordPinyinAlignedRows,
  syllable_count_match_rows: syllableCountMatchRows,
  source_syllables_checked: sourceSyllablesChecked,
  source_syllables_with_tone_marks: sourceSyllablesWithToneMarks,
  example_syllables_checked: exampleSyllablesChecked,
  example_syllables_with_tone_marks: exampleSyllablesWithToneMarks,
  neutral_or_unmarked_syllable_counts: Object.fromEntries(Object.entries(neutralSyllableCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  blockers,
  warnings,
  blocker_type_counts: countByType(blockers),
  warning_type_counts: countByType(warnings),
  checked_files: {
    workbook_csv: path.relative(ROOT, CSV_PATH),
    official_source: path.relative(ROOT, SOURCE_PATH),
    curated_examples: path.relative(ROOT, EXAMPLES_PATH),
  },
  notes: [
    "This gate validates HSK3 Level 6 v2 Chinese-facing transcriptions only: ZH transcription and ZH example transcription.",
    "It checks exact workbook/source/config alignment, Han leakage, tone-number notation, Mandarin pinyin segmentation, word-pinyin alignment inside the example pinyin, and pinyin syllable count against Han-character count.",
    "Unmarked syllables are counted as neutral/unmarked syllables; they are not automatically blockers because neutral-tone syllables are legitimate in Hanyu Pinyin.",
    "HSK target-language columns intentionally have no target transcription layer in this release contract.",
  ],
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Pinyin Alignment Gate`,
    "",
    `Status: ${report.status}`,
    `Rows checked: ${report.rows_checked}`,
    `Source pinyin exact rows: ${report.source_pinyin_exact_rows}`,
    `Example pinyin exact rows: ${report.example_pinyin_exact_rows}`,
    `Source rows with tone marks: ${report.source_rows_with_tone_marks}`,
    `Example rows with tone marks: ${report.example_rows_with_tone_marks}`,
    `Word pinyin aligned rows: ${report.word_pinyin_aligned_rows}`,
    `Syllable count match rows: ${report.syllable_count_match_rows}`,
    `Source syllables checked: ${report.source_syllables_checked}`,
    `Source syllables with tone marks: ${report.source_syllables_with_tone_marks}`,
    `Example syllables checked: ${report.example_syllables_checked}`,
    `Example syllables with tone marks: ${report.example_syllables_with_tone_marks}`,
    `Blockers: ${blockers.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "## Scope",
    "",
    "Checks Chinese-facing HSK transcriptions only. Target-language columns have no transcription/audio layer by contract.",
    "",
    "## Findings",
    "",
    blockers.length ? blockers.map((item) => `- BLOCKER ${item.type}${item.hsk_order ? ` row ${item.hsk_order}` : ""}: ${item.message}`).join("\n") : "- No blockers.",
    "",
    warnings.length ? warnings.map((item) => `- WARNING ${item.type}${item.hsk_order ? ` row ${item.hsk_order}` : ""}: ${item.message}`).join("\n") : "- No warnings.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      status: report.status,
      rows_checked: report.rows_checked,
      source_pinyin_exact_rows: report.source_pinyin_exact_rows,
      example_pinyin_exact_rows: report.example_pinyin_exact_rows,
      word_pinyin_aligned_rows: report.word_pinyin_aligned_rows,
      syllable_count_match_rows: report.syllable_count_match_rows,
      blockers: blockers.length,
      warnings: warnings.length,
      report: path.relative(ROOT, REPORT_JSON),
      markdown: path.relative(ROOT, REPORT_MD),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
