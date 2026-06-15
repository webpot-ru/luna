#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1800_v2";
const DATE = "20260612";
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1800_v2.source.json");
const REUSED_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level6-v2-reused-target-translations.json");
const MANUAL_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level6-v2-manual-target-translations.json");
const EXAMPLES_PATH = path.join(ROOT, "config/hsk3-level6-v2-examples.json");
const GLOSSES_PATH = path.join(ROOT, "config/hsk3-level6-v2-en-glosses.json");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const QA_DIR = path.join(ROOT, "outputs/hsk/qa");
const REPORT_JSON = path.join(QA_DIR, `${RELEASE_ID}_manual_target_translation_gate_${DATE}.json`);
const REPORT_MD = path.join(QA_DIR, `${RELEASE_ID}_manual_target_translation_gate_${DATE}.md`);

const requireComplete = process.argv.includes("--require-complete");
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
  const blockers = report.blockers.length;
  const warnings = report.warnings.length;
  return `${[
    `# ${RELEASE_ID} Manual Target Translation Gate`,
    ``,
    `- status: ${report.status}`,
    `- require_complete: ${report.require_complete}`,
    `- blocker_count: ${blockers}`,
    `- warning_count: ${warnings}`,
    `- pending_manual_rows: ${report.counts.pending_manual_rows}`,
    `- manual_complete_rows: ${report.counts.manual_complete_rows}`,
    `- manual_missing_rows: ${report.counts.manual_missing_rows}`,
    `- manual_word_cells: ${report.counts.manual_word_cells}`,
    `- manual_example_cells: ${report.counts.manual_example_cells}`,
    ``,
    `## Blockers`,
    blockers ? report.blockers.map((item) => `- ${item.code}: ${item.message}`).join("\n") : `- none`,
    ``,
    `## Warnings`,
    warnings ? report.warnings.map((item) => `- ${item.code}: ${item.message}`).join("\n") : `- none`,
    ``,
  ].join("\n")}\n`;
}

const [sourceRows, reusedTargetTranslations, manualTargetTranslations, examples, glosses, languages] = await Promise.all([
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(REUSED_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(MANUAL_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(EXAMPLES_PATH, "utf8").then(JSON.parse),
  fs.readFile(GLOSSES_PATH, "utf8").then(JSON.parse),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
]);

const blockers = [];
const warnings = [];
const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key ?? `${row.hsk_order}:${row.source_word}`, row]));
const reusedKeys = new Set(Object.keys(reusedTargetTranslations));
const pendingKeys = [...sourceByKey.keys()].filter((key) => !reusedKeys.has(key));
const pendingKeySet = new Set(pendingKeys);
const targetCodes = languages
  .map((language) => language.spreadsheetCode)
  .filter((code) => !["ZH", "EN", "EN-GB"].includes(code));

if (!manualTargetTranslations || typeof manualTargetTranslations !== "object" || Array.isArray(manualTargetTranslations)) {
  issue(blockers, "manual_layer_not_object", "Manual target translation layer must be a JSON object keyed by HSK3 hsk_key.");
}
if (sourceRows.length !== 1800) issue(blockers, "source_row_count_mismatch", `Expected 1800 source rows, got ${sourceRows.length}.`);
if (reusedKeys.size !== 1619) issue(blockers, "reused_row_count_mismatch", `Expected 1619 reused target rows, got ${reusedKeys.size}.`);
if (pendingKeys.length !== 181) issue(blockers, "pending_row_count_mismatch", `Expected 181 pending manual rows, got ${pendingKeys.length}.`);
if (targetCodes.length !== 51) issue(blockers, "target_language_count_mismatch", `Expected 51 non-English target languages, got ${targetCodes.length}.`);

let manualCompleteRows = 0;
let manualWordCells = 0;
let manualExampleCells = 0;
const manualKeys = Object.keys(manualTargetTranslations ?? {});

for (const hskKey of manualKeys) {
  const sourceRow = sourceByKey.get(hskKey);
  if (!sourceRow) {
    issue(blockers, "manual_key_not_in_source", `Manual key is not in HSK3 Level 6 v2 source: ${hskKey}.`, { hsk_key: hskKey });
    continue;
  }
  if (reusedKeys.has(hskKey)) {
    issue(blockers, "manual_key_is_reused_target", `Manual key already has reused target translations: ${hskKey}.`, { hsk_key: hskKey });
  }
  if (!pendingKeySet.has(hskKey)) {
    issue(blockers, "manual_key_not_pending_hsk3_v2", `Manual key is not one of the pending HSK3 Level 6 v2 rows: ${hskKey}.`, { hsk_key: hskKey });
  }

  const row = manualTargetTranslations[hskKey];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    issue(blockers, "manual_key_payload_not_object", `Manual payload must be an object for ${hskKey}.`, { hsk_key: hskKey });
    continue;
  }

  const extraCodes = Object.keys(row).filter((code) => !targetCodes.includes(code));
  if (extraCodes.length) {
    issue(blockers, "manual_extra_language_codes", `${hskKey} has unexpected language codes: ${extraCodes.join(", ")}.`, { hsk_key: hskKey, extraCodes });
  }

  let completeForKey = true;
  const sourceExample = examples[hskKey]?.example_zh ?? "";
  const englishGloss = glosses[hskKey] ?? "";
  const englishExample = examples[hskKey]?.example_en ?? "";
  for (const code of targetCodes) {
    const cell = row[code];
    if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
      if (requireComplete) {
        issue(blockers, "manual_missing_language_payload", `${hskKey} is missing ${code} payload.`, { hsk_key: hskKey, language_code: code });
      }
      completeForKey = false;
      continue;
    }
    const translation = String(cell.translation ?? "").trim();
    const exampleTranslation = String(cell.example_translation ?? "").trim();
    if (!translation) {
      issue(blockers, "manual_blank_translation", `${hskKey} has blank ${code} translation.`, { hsk_key: hskKey, language_code: code });
      completeForKey = false;
    }
    if (!exampleTranslation) {
      issue(blockers, "manual_blank_example_translation", `${hskKey} has blank ${code} example_translation.`, { hsk_key: hskKey, language_code: code });
      completeForKey = false;
    }
    if (translation) manualWordCells += 1;
    if (exampleTranslation) manualExampleCells += 1;
    if (
      placeholderRegex.test(translation) ||
      placeholderRegex.test(exampleTranslation) ||
      exactPlaceholderValues.has(translation.toLowerCase()) ||
      exactPlaceholderValues.has(exampleTranslation.toLowerCase())
    ) {
      issue(blockers, "manual_placeholder_artifact", `${hskKey} ${code} contains placeholder/artifact text.`, { hsk_key: hskKey, language_code: code });
    }
    if (normalizedText(translation) === normalizedText(sourceRow.simplified) || normalizedText(exampleTranslation) === normalizedText(sourceExample)) {
      const target = code === "JA" ? warnings : blockers;
      issue(target, "manual_exact_chinese_copy", `${hskKey} ${code} is an exact Chinese source/example copy.`, { hsk_key: hskKey, language_code: code });
    }
    if (code !== "JA" && (hanRegex.test(translation) || hanRegex.test(exampleTranslation))) {
      issue(blockers, "manual_han_in_non_japanese_target", `${hskKey} ${code} contains Han characters outside Japanese.`, {
        hsk_key: hskKey,
        language_code: code,
      });
    }
    if (normalizedText(exampleTranslation) === normalizedText(englishExample)) {
      issue(blockers, "manual_exact_english_example_fallback", `${hskKey} ${code} example is an exact English fallback.`, {
        hsk_key: hskKey,
        language_code: code,
      });
    }
    if (normalizedText(translation) === normalizedText(englishGloss)) {
      issue(warnings, "manual_exact_english_word_match", `${hskKey} ${code} translation equals the English gloss; verify this is a real loanword or fixed term.`, {
        hsk_key: hskKey,
        language_code: code,
      });
    }
  }
  if (completeForKey) manualCompleteRows += 1;
}

const missingManualKeys = pendingKeys.filter((key) => !manualTargetTranslations[key]);
if (missingManualKeys.length && requireComplete) {
  issue(blockers, "manual_layer_incomplete", `${missingManualKeys.length} pending HSK3 Level 6 v2 rows are still missing manual target translations.`);
} else if (missingManualKeys.length) {
  issue(warnings, "manual_layer_incomplete", `${missingManualKeys.length} pending HSK3 Level 6 v2 rows are still missing manual target translations.`);
}

const maxManualCells = manualKeys.length * targetCodes.length;
if (manualWordCells > maxManualCells || manualExampleCells > maxManualCells) {
  issue(blockers, "manual_cell_count_overflow", `Manual cells exceed possible language count: words=${manualWordCells}, examples=${manualExampleCells}.`);
}

const report = {
  release_id: RELEASE_ID,
  status: blockers.length ? "blocked" : "ok",
  require_complete: requireComplete,
  counts: {
    source_rows: sourceRows.length,
    reused_target_rows: reusedKeys.size,
    pending_manual_rows: pendingKeys.length,
    target_languages_non_english: targetCodes.length,
    manual_rows_present: manualKeys.length,
    manual_complete_rows: manualCompleteRows,
    manual_partial_rows: manualKeys.length - manualCompleteRows,
    manual_missing_rows: missingManualKeys.length,
    manual_word_cells: manualWordCells,
    manual_example_cells: manualExampleCells,
  },
  missing_manual_keys: missingManualKeys,
  blockers,
  warnings,
};

await fs.mkdir(QA_DIR, { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(REPORT_MD, markdownReport(report));

console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
