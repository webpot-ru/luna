#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_1_300_v1";
const DATE = "20260604";
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_1_300_v1.source.json");
const CLASSIC_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level1-classic-reuse-target-translations.json");
const MANUAL_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level1-manual-target-translations.json");
const EXAMPLES_PATH = path.join(ROOT, "config/hsk3-level1-examples.json");
const GLOSSES_PATH = path.join(ROOT, "config/hsk3-level1-en-glosses.json");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const QA_DIR = path.join(ROOT, "outputs/hsk/qa");
const REPORT_JSON = path.join(QA_DIR, `${RELEASE_ID}_manual_target_translation_gate_${DATE}.json`);
const REPORT_MD = path.join(QA_DIR, `${RELEASE_ID}_manual_target_translation_gate_${DATE}.md`);

const requireComplete = process.argv.includes("--require-complete");

const hanRegex = /\p{Script=Han}/u;
const placeholderRegex = /\b(?:todo|tbd|fixme|null|undefined|translation|example|placeholder)\b|[?？]{3,}|…{2,}/iu;

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

function countPresent(row, targetCodes) {
  let wordCells = 0;
  let exampleCells = 0;
  for (const code of targetCodes) {
    if (row?.[code]?.translation) wordCells += 1;
    if (row?.[code]?.example_translation) exampleCells += 1;
  }
  return { wordCells, exampleCells };
}

function markdownReport(report) {
  const blockers = report.blockers.length;
  const warnings = report.warnings.length;
  const lines = [
    `# HSK3 Level 1 Manual Target Translation Gate`,
    ``,
    `- release_id: ${report.release_id}`,
    `- status: ${report.status}`,
    `- blocker_count: ${blockers}`,
    `- warning_count: ${warnings}`,
    `- pending_hsk3_only_rows: ${report.counts.pending_hsk3_only_rows}`,
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
  ];
  return `${lines.join("\n")}\n`;
}

const [sourceRows, classicTargetTranslations, manualTargetTranslations, examples, glosses, languages] = await Promise.all([
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(CLASSIC_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(MANUAL_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(EXAMPLES_PATH, "utf8").then(JSON.parse),
  fs.readFile(GLOSSES_PATH, "utf8").then(JSON.parse),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
]);

const blockers = [];
const warnings = [];
const sourceWords = new Set(sourceRows.map((row) => row.simplified));
const classicWords = new Set(Object.keys(classicTargetTranslations));
const pendingWords = sourceRows.map((row) => row.simplified).filter((word) => !classicWords.has(word));
const pendingWordSet = new Set(pendingWords);
const targetCodes = languages
  .map((language) => language.spreadsheetCode)
  .filter((code) => !["ZH", "EN", "EN-GB"].includes(code));

if (!manualTargetTranslations || typeof manualTargetTranslations !== "object" || Array.isArray(manualTargetTranslations)) {
  issue(blockers, "manual_layer_not_object", "Manual target translation layer must be a JSON object keyed by simplified HSK3 word.");
}
if (sourceRows.length !== 300) issue(blockers, "source_row_count_mismatch", `Expected 300 source rows, got ${sourceRows.length}.`);
if (targetCodes.length !== 51) issue(blockers, "target_language_count_mismatch", `Expected 51 non-English target languages, got ${targetCodes.length}.`);

let manualCompleteRows = 0;
let manualWordCells = 0;
let manualExampleCells = 0;
const manualWords = Object.keys(manualTargetTranslations ?? {});

for (const word of manualWords) {
  if (!sourceWords.has(word)) {
    issue(blockers, "manual_word_not_in_source", `Manual word is not in HSK3 Level 1 source: ${word}.`, { word });
    continue;
  }
  if (classicWords.has(word)) {
    issue(blockers, "manual_word_is_classic_reuse", `Manual word already has Classic reuse target translations: ${word}.`, { word });
  }
  if (!pendingWordSet.has(word)) {
    issue(blockers, "manual_word_not_pending_hsk3_only", `Manual word is not one of the pending HSK3-only rows: ${word}.`, { word });
  }

  const row = manualTargetTranslations[word];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    issue(blockers, "manual_word_payload_not_object", `Manual payload must be an object for ${word}.`, { word });
    continue;
  }

  const extraCodes = Object.keys(row).filter((code) => !targetCodes.includes(code));
  if (extraCodes.length) {
    issue(blockers, "manual_extra_language_codes", `${word} has unexpected language codes: ${extraCodes.join(", ")}.`, { word, extraCodes });
  }

  let completeForWord = true;
  const sourceExample = examples[word]?.example_zh ?? "";
  const englishGloss = glosses[word] ?? "";
  const englishExample = examples[word]?.example_en ?? "";
  for (const code of targetCodes) {
    const cell = row[code];
    if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
      if (requireComplete) {
      issue(blockers, "manual_missing_language_payload", `${word} is missing ${code} payload.`, { word, language_code: code });
      }
      completeForWord = false;
      continue;
    }
    const translation = String(cell.translation ?? "").trim();
    const exampleTranslation = String(cell.example_translation ?? "").trim();
    if (!translation) {
    issue(blockers, "manual_blank_translation", `${word} has blank ${code} translation.`, { word, language_code: code });
      completeForWord = false;
    }
    if (!exampleTranslation) {
      issue(blockers, "manual_blank_example_translation", `${word} has blank ${code} example_translation.`, { word, language_code: code });
      completeForWord = false;
    }
    if (translation) manualWordCells += 1;
    if (exampleTranslation) manualExampleCells += 1;
    if (placeholderRegex.test(translation) || placeholderRegex.test(exampleTranslation)) {
      issue(blockers, "manual_placeholder_artifact", `${word} ${code} contains placeholder/artifact text.`, { word, language_code: code });
    }
    if (normalizedText(translation) === normalizedText(word) || normalizedText(exampleTranslation) === normalizedText(sourceExample)) {
      issue(blockers, "manual_exact_chinese_copy", `${word} ${code} is an exact Chinese source/example copy.`, { word, language_code: code });
    }
    if (code !== "JA" && (hanRegex.test(translation) || hanRegex.test(exampleTranslation))) {
      issue(blockers, "manual_han_in_non_japanese_target", `${word} ${code} contains Han characters outside Japanese.`, { word, language_code: code });
    }
    if (normalizedText(exampleTranslation) === normalizedText(englishExample)) {
      issue(blockers, "manual_exact_english_example_fallback", `${word} ${code} example is an exact English fallback.`, { word, language_code: code });
    }
    if (normalizedText(translation) === normalizedText(englishGloss)) {
      issue(warnings, "manual_exact_english_word_match", `${word} ${code} translation equals the English gloss; verify this is a real loanword or fixed term.`, {
        word,
        language_code: code,
      });
    }
  }
  if (completeForWord) manualCompleteRows += 1;
}

const missingManualWords = pendingWords.filter((word) => !manualTargetTranslations[word]);
if (missingManualWords.length && requireComplete) {
  issue(blockers, "manual_layer_incomplete", `${missingManualWords.length} pending HSK3-only rows are still missing manual target translations.`);
} else if (missingManualWords.length) {
  issue(warnings, "manual_layer_incomplete", `${missingManualWords.length} pending HSK3-only rows are still missing manual target translations.`);
}

const maxManualCells = manualWords.length * targetCodes.length;
if (manualWordCells > maxManualCells || manualExampleCells > maxManualCells) {
  issue(blockers, "manual_cell_count_overflow", `Manual cells exceed possible language count: words=${manualWordCells}, examples=${manualExampleCells}.`);
}

const report = {
  release_id: RELEASE_ID,
  status: blockers.length ? "blocked" : "ok",
  require_complete: requireComplete,
  counts: {
    source_rows: sourceRows.length,
    classic_reuse_rows: classicWords.size,
    pending_hsk3_only_rows: pendingWords.length,
    target_languages_non_english: targetCodes.length,
    manual_rows_present: manualWords.length,
    manual_complete_rows: manualCompleteRows,
    manual_partial_rows: manualWords.length - manualCompleteRows,
    manual_missing_rows: missingManualWords.length,
    manual_word_cells: manualWordCells,
    manual_example_cells: manualExampleCells,
  },
  missing_manual_words: missingManualWords,
  blockers,
  warnings,
};

await fs.mkdir(QA_DIR, { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(REPORT_MD, markdownReport(report));

console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
