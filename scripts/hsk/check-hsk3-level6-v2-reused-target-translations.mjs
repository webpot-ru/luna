#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1800_v2";
const DATE = "20260612";

const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1800_v2.source.json");
const CHINESE_BUILD_REPORT = path.join(ROOT, "outputs/hsk/qa/hsk3_level_6_1800_v2_chinese_examples_build_20260612.json");
const REUSED_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level6-v2-reused-target-translations.json");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const QA_DIR = path.join(ROOT, "outputs/hsk/qa");
const REPORT_JSON = path.join(QA_DIR, `${RELEASE_ID}_reused_target_translation_gate_${DATE}.json`);
const REPORT_MD = path.join(QA_DIR, `${RELEASE_ID}_reused_target_translation_gate_${DATE}.md`);

const hanRegex = /\p{Script=Han}/u;
const placeholderRegex = /\b(?:tbd|fixme|undefined|translation|example|placeholder)\b|[?？]{3,}|…{2,}/iu;
const exactPlaceholderValues = new Set(["null"]);

function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
}

function issue(list, code, message, data = {}) {
  list.push({ code, message, ...data });
}

function markdownReport(report) {
  return `${[
    `# ${RELEASE_ID} Reused Target Translation Gate`,
    "",
    `- status: ${report.status}`,
    `- blocker_count: ${report.blockers.length}`,
    `- warning_count: ${report.warnings.length}`,
    `- reused_rows: ${report.counts.reused_rows}`,
    `- expected_reused_rows: ${report.counts.expected_reused_rows}`,
    `- pending_manual_rows: ${report.counts.pending_manual_rows}`,
    `- target_languages_non_english: ${report.counts.target_languages_non_english}`,
    `- word_cells: ${report.counts.word_cells}`,
    `- example_cells: ${report.counts.example_cells}`,
    "",
    "## Blockers",
    report.blockers.length ? report.blockers.map((item) => `- ${item.code}: ${item.message}`).join("\n") : "- none",
    "",
    "## Warnings",
    report.warnings.length ? report.warnings.map((item) => `- ${item.code}: ${item.message}`).join("\n") : "- none",
    "",
  ].join("\n")}\n`;
}

const [sourceRows, chineseReport, reusedTargetTranslations, languages] = await Promise.all([
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(CHINESE_BUILD_REPORT, "utf8").then(JSON.parse),
  fs.readFile(REUSED_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
]);

const blockers = [];
const warnings = [];
const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key ?? `${row.hsk_order}:${row.source_word}`, row]));
const targetCodes = languages
  .map((language) => language.spreadsheetCode)
  .filter((code) => !["ZH", "EN", "EN-GB"].includes(code));
const expectedReusedKeys = (chineseReport.provenance ?? [])
  .filter((row) => row.source === "hsk3_level_6_1400_v1" || String(row.source).startsWith("classic_hsk"))
  .map((row) => row.hsk_key);
const expectedReusedKeySet = new Set(expectedReusedKeys);
const pendingManualKeys = (chineseReport.provenance ?? [])
  .filter((row) => row.source === "hsk3_v2_manual")
  .map((row) => row.hsk_key);
const reusedKeys = Object.keys(reusedTargetTranslations ?? {});

if (sourceRows.length !== 1800) issue(blockers, "source_row_count_mismatch", `Expected 1800 source rows, got ${sourceRows.length}.`);
if (targetCodes.length !== 51) issue(blockers, "target_language_count_mismatch", `Expected 51 non-English target languages, got ${targetCodes.length}.`);
if (expectedReusedKeys.length !== 1619) issue(blockers, "expected_reused_key_count_mismatch", `Expected 1619 reused keys, got ${expectedReusedKeys.length}.`);
if (pendingManualKeys.length !== 181) issue(blockers, "pending_manual_key_count_mismatch", `Expected 181 pending manual keys, got ${pendingManualKeys.length}.`);
if (reusedKeys.length !== expectedReusedKeys.length) issue(blockers, "reused_row_count_mismatch", `Expected ${expectedReusedKeys.length} reused rows, got ${reusedKeys.length}.`);

let wordCells = 0;
let exampleCells = 0;

for (const key of reusedKeys) {
  const sourceRow = sourceByKey.get(key);
  if (!sourceRow) {
    issue(blockers, "reused_key_not_in_source", `Reused target key is not in source: ${key}.`, { hsk_key: key });
    continue;
  }
  if (!expectedReusedKeySet.has(key)) {
    issue(blockers, "reused_key_not_expected", `Reused target key is not expected from legacy/Classic reuse: ${key}.`, { hsk_key: key });
  }
  const row = reusedTargetTranslations[key];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    issue(blockers, "reused_payload_not_object", `Reused target payload must be an object for ${key}.`, { hsk_key: key });
    continue;
  }
  const extraCodes = Object.keys(row).filter((code) => !targetCodes.includes(code));
  if (extraCodes.length) {
    issue(blockers, "reused_extra_language_codes", `${key} has unexpected language codes: ${extraCodes.join(", ")}.`, { hsk_key: key, extraCodes });
  }
  for (const code of targetCodes) {
    const cell = row[code];
    if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
      issue(blockers, "reused_missing_language_payload", `${key} is missing ${code} payload.`, { hsk_key: key, language_code: code });
      continue;
    }
    const translation = String(cell.translation ?? "").trim();
    const exampleTranslation = String(cell.example_translation ?? "").trim();
    if (!translation) issue(blockers, "reused_blank_translation", `${key} has blank ${code} translation.`, { hsk_key: key, language_code: code });
    if (!exampleTranslation) issue(blockers, "reused_blank_example_translation", `${key} has blank ${code} example_translation.`, { hsk_key: key, language_code: code });
    if (translation) wordCells += 1;
    if (exampleTranslation) exampleCells += 1;
    if (
      placeholderRegex.test(translation) ||
      placeholderRegex.test(exampleTranslation) ||
      exactPlaceholderValues.has(translation.toLowerCase()) ||
      exactPlaceholderValues.has(exampleTranslation.toLowerCase())
    ) {
      issue(blockers, "reused_placeholder_artifact", `${key} ${code} contains placeholder/artifact text.`, { hsk_key: key, language_code: code });
    }
    if (normalizedText(translation) === normalizedText(sourceRow.simplified)) {
      const target = code === "JA" ? warnings : blockers;
      issue(target, "reused_exact_chinese_copy", `${key} ${code} translation is an exact Chinese source copy.`, { hsk_key: key, language_code: code });
    }
    if (code !== "JA" && (hanRegex.test(translation) || hanRegex.test(exampleTranslation))) {
      issue(blockers, "reused_han_in_non_japanese_target", `${key} ${code} contains Han characters outside Japanese.`, {
        hsk_key: key,
        language_code: code,
      });
    }
  }
}

for (const key of expectedReusedKeys) {
  if (!reusedTargetTranslations[key]) issue(blockers, "expected_reused_key_missing", `Expected reused target key is missing: ${key}.`, { hsk_key: key });
}
for (const key of pendingManualKeys) {
  if (reusedTargetTranslations[key]) issue(blockers, "manual_pending_key_in_reused_layer", `Pending manual key appears in reused target layer: ${key}.`, { hsk_key: key });
}

const report = {
  release_id: RELEASE_ID,
  status: blockers.length ? "blocked" : "ok",
  counts: {
    source_rows: sourceRows.length,
    target_languages_non_english: targetCodes.length,
    expected_reused_rows: expectedReusedKeys.length,
    reused_rows: reusedKeys.length,
    pending_manual_rows: pendingManualKeys.length,
    word_cells: wordCells,
    example_cells: exampleCells,
  },
  checked_files: {
    source: path.relative(ROOT, SOURCE_PATH),
    chinese_build_report: path.relative(ROOT, CHINESE_BUILD_REPORT),
    reused_target_translations: path.relative(ROOT, REUSED_TARGET_TRANSLATIONS_PATH),
  },
  blockers,
  warnings,
  notes: [
    "This gate validates only the reused target-language layer for hsk3_level_6_1800_v2.",
    "The 181 hsk3_v2_manual rows remain intentionally outside this reused layer.",
    "It does not build a workbook, import Docker/Postgres rows or upload Google Sheets.",
  ],
};

await fs.mkdir(QA_DIR, { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(REPORT_MD, markdownReport(report));

console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
