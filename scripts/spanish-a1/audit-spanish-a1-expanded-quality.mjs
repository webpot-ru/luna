#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { isSpanishA1Ipa, transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();
let RELEASE_ID = "spanish_a1_core_part_001_300_v1";
let CONTRACT_PATH = path.join(ROOT, "config/spanish-a1-core-release-contract-v1.json");
const LANGUAGE_ORDER_PATH = path.join(ROOT, "config/language-order.json");
let CANDIDATE_POOL_PATH;
const SUPPORT_DIR = path.join(ROOT, "outputs/spanish-a1-core/support-translations");
const HAS_SENTENCE_TERMINAL_RE = /\p{Sentence_Terminal}$/u;
const BAD_TERMINAL_SEQUENCE_RE = /(?:[:：]\.|\.[:：]|։\.|\.։|:։|։:)$/u;
const SPANISH_NOUN_ARTICLES = new Set(["el", "la", "los", "las"]);

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);
CONTRACT_PATH = path.resolve(args.get("contract") ?? CONTRACT_PATH);

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function isDashPlaceholder(value) {
  return ["-", "–", "—"].includes(normalizeText(value));
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${rel(filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

function selectedRows(rows) {
  return rows
    .filter((row) => normalizeText(row.selection_decision ?? row.qa_status) === "selected")
    .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
}

function samplePositions(totalRows, sampleSize) {
  if (sampleSize >= totalRows) return Array.from({ length: totalRows }, (_, index) => index + 1);
  const positions = new Set();
  for (let index = 0; index < sampleSize; index += 1) {
    positions.add(Math.round(1 + index * ((totalRows - 1) / (sampleSize - 1))));
  }
  return [...positions].sort((a, b) => a - b);
}

function supportFilePath(languageCode) {
  return path.join(SUPPORT_DIR, `${RELEASE_ID}_support_translation_batch_${codeSlug(languageCode)}_v1.jsonl`);
}

function isUsefulArticle(value) {
  const article = normalizeText(value);
  return article && article !== "not_applicable";
}

function sourceLearnerDisplay(row, variantCode) {
  const display = normalizeText(variantCode === "ES-419" ? row.display_ES_419 : row.display_ES);
  const article = normalizeText(variantCode === "ES-419" ? row.article_ES_419 : row.article_ES);
  if (normalizeText(row.part_of_speech) !== "noun" || !isUsefulArticle(article)) return display;
  if (display.toLowerCase().startsWith(`${article.toLowerCase()} `)) return display;
  return `${article} ${display}`;
}

const SCRIPT_PROFILES = {
  RU: { required: /\p{Script=Cyrillic}/u, forbidden: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u },
  ZH: { required: /\p{Script=Han}/u, forbidden: /[\p{Script=Cyrillic}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u },
  JA: { required: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, forbidden: /[\p{Script=Cyrillic}\p{Script=Hangul}]/u },
  KO: { required: /\p{Script=Hangul}/u, forbidden: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}]/u },
  TH: { required: /\p{Script=Thai}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Lao}]/u },
  BG: { required: /\p{Script=Cyrillic}/u, forbidden: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u },
  HI: { required: /\p{Script=Devanagari}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Bengali}]/u },
  BN: { required: /\p{Script=Bengali}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Devanagari}]/u },
  MY: { required: /\p{Script=Myanmar}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Thai}\p{Script=Khmer}\p{Script=Lao}]/u },
  KM: { required: /\p{Script=Khmer}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Thai}\p{Script=Myanmar}\p{Script=Lao}]/u },
  LO: { required: /\p{Script=Lao}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Thai}\p{Script=Myanmar}\p{Script=Khmer}]/u },
  NE: { required: /\p{Script=Devanagari}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Bengali}]/u },
  SI: { required: /\p{Script=Sinhala}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}]/u },
  TA: { required: /\p{Script=Tamil}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Sinhala}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}]/u },
  TE: { required: /\p{Script=Telugu}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Tamil}\p{Script=Kannada}\p{Script=Malayalam}]/u },
  KN: { required: /\p{Script=Kannada}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Malayalam}]/u },
  ML: { required: /\p{Script=Malayalam}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}]/u },
  KK: { required: /\p{Script=Cyrillic}/u, forbidden: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u },
  KA: { required: /\p{Script=Georgian}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Armenian}]/u },
  HY: { required: /\p{Script=Armenian}/u, forbidden: /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Georgian}]/u },
};

function checkScriptProfile(code, display, example) {
  const profile = SCRIPT_PROFILES[code];
  if (!profile) return [];
  const issues = [];
  if (!profile.required.test(display)) issues.push("display_missing_expected_script");
  if (!profile.required.test(example)) issues.push("example_missing_expected_script");
  if (profile.forbidden?.test(display)) issues.push("display_forbidden_script");
  if (profile.forbidden?.test(example)) issues.push("example_forbidden_script");
  return issues;
}

function checkSentenceTerminal(value) {
  const text = normalizeText(value);
  const blockers = [];
  if (text && !HAS_SENTENCE_TERMINAL_RE.test(text)) blockers.push("example_missing_sentence_terminal");
  if (text && BAD_TERMINAL_SEQUENCE_RE.test(text)) blockers.push("example_bad_terminal_sequence");
  return blockers;
}

function sourceVariantFields(row, variantCode) {
  return {
    display: normalizeText(variantCode === "ES-419" ? row.display_ES_419 : row.display_ES),
    example: normalizeText(variantCode === "ES-419" ? row.example_ES_419 : row.example_ES),
    transcription: normalizeText(variantCode === "ES-419" ? row.transcription_ES_419 : row.transcription_ES),
    article: normalizeText(variantCode === "ES-419" ? row.article_ES_419 : row.article_ES),
    learner_display: sourceLearnerDisplay(row, variantCode),
  };
}

function auditSpanishSourceRow(row, variantCode) {
  const fields = sourceVariantFields(row, variantCode);
  const blockers = [];
  const warnings = [];
  if (!fields.display) blockers.push("blank_display");
  if (!fields.example) blockers.push("blank_example");
  if (!fields.transcription) blockers.push("blank_transcription");
  if (fields.transcription !== transcribeSpanishText(fields.display, variantCode)) blockers.push("transcription_not_expected_broad_learner_ipa");
  if (!isSpanishA1Ipa(fields.transcription)) blockers.push("transcription_not_slash_wrapped_ipa");
  blockers.push(...checkSentenceTerminal(fields.example));
  if (/[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}]/u.test(`${fields.display} ${fields.example}`)) {
    blockers.push("unexpected_foreign_script_in_spanish_fields");
  }
  if (normalizeText(row.part_of_speech) === "noun") {
    const articleException =
      (normalizeText(row.gender) === "common" && !isUsefulArticle(fields.article)) ||
      (normalizeText(row.semantic_scene) === "month name" && !isUsefulArticle(fields.article));
    if (!SPANISH_NOUN_ARTICLES.has(fields.article) && !articleException) blockers.push("noun_missing_el_la_los_las_article");
    if (
      SPANISH_NOUN_ARTICLES.has(fields.article) &&
      !fields.learner_display.toLowerCase().startsWith(`${fields.article.toLowerCase()} `)
    ) {
      blockers.push("learner_display_missing_article");
    }
    if (articleException) warnings.push("article_exception_no_el_la");
    if (fields.transcription !== transcribeSpanishText(fields.learner_display, variantCode)) warnings.push("source_transcription_excludes_learner_article");
  } else if (isUsefulArticle(fields.article)) {
    blockers.push("non_noun_has_article");
  }
  return {
    row_id: row.row_id,
    selection_order: Number(row.selection_order),
    variant_code: variantCode,
    part_of_speech: row.part_of_speech,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    ...fields,
    blockers,
    warnings,
    status: blockers.length ? "blocked" : "pass",
  };
}

function auditSampleLanguageRow({ sourceRow, targetRow, language, englishTargetRow }) {
  const code = language.spreadsheetCode;
  const display = normalizeText(targetRow?.display_translation ?? targetRow?.display);
  const example = normalizeText(targetRow?.example_translation ?? targetRow?.example);
  const blockers = [];
  const warnings = [];
  if (!targetRow) blockers.push("missing_target_row");
  if (normalizeText(targetRow?.row_id) !== sourceRow.row_id) blockers.push("row_id_mismatch");
  if (normalizeText(targetRow?.language_code ?? targetRow?.spreadsheet_code) !== code) blockers.push("language_code_mismatch");
  if (!display) blockers.push("blank_display");
  if (isDashPlaceholder(display)) blockers.push("dash_placeholder_display");
  if (!example) blockers.push("blank_example");
  if (/[\t\r\n]/u.test(display) || /[\t\r\n]/u.test(example)) blockers.push("tab_or_newline_in_cell");
  blockers.push(...checkSentenceTerminal(example));
  blockers.push(...checkScriptProfile(code, display, example));

  const englishDisplay = normalizeText(englishTargetRow?.display_translation ?? englishTargetRow?.display);
  const englishExample = normalizeText(englishTargetRow?.example_translation ?? englishTargetRow?.example);
  if (!["EN", "EN-GB"].includes(code) && display && englishDisplay && display.toLowerCase() === englishDisplay.toLowerCase()) {
    warnings.push("display_equals_english_sample_value");
  }
  if (!["EN", "EN-GB"].includes(code) && example && englishExample && example.toLowerCase() === englishExample.toLowerCase()) {
    warnings.push("example_equals_english_sample_value");
  }
  if (!["ES", "ES-419"].includes(code) && display && display.toLowerCase() === normalizeText(sourceRow.display_ES).toLowerCase()) {
    warnings.push("display_equals_spanish_source_value");
  }
  if (!["ES", "ES-419"].includes(code) && example && example.toLowerCase() === normalizeText(sourceRow.example_ES).toLowerCase()) {
    blockers.push("example_copies_spanish_source_sentence");
  }

  return {
    row_id: sourceRow.row_id,
    selection_order: Number(sourceRow.selection_order),
    language_code: code,
    language_name: language.language,
    source_display_ES: sourceRow.display_ES,
    source_display_ES_419: sourceRow.display_ES_419,
    meaning_note: sourceRow.meaning_note,
    semantic_scene: sourceRow.semantic_scene,
    display,
    example,
    blockers,
    warnings,
    status: blockers.length ? "blocked" : "pass",
  };
}

const reportStamp = args.get("date") ?? todayStamp();
const sampleSize = Number(args.get("sample-size") ?? 10);
if (!Number.isInteger(sampleSize) || sampleSize < 1) throw new Error("--sample-size must be a positive integer");

const [contract, languageOrder] = await Promise.all([
  readJson(CONTRACT_PATH),
  readJson(LANGUAGE_ORDER_PATH),
]);
RELEASE_ID = args.get("release") ?? contract.default_release?.release_id ?? RELEASE_ID;
CANDIDATE_POOL_PATH = path.resolve(
  args.get("candidate-pool") ??
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools", `${RELEASE_ID}_candidate_pool.jsonl`)
);
const candidateRows = await readJsonl(CANDIDATE_POOL_PATH);
if (contract.default_release?.release_id !== RELEASE_ID) {
  throw new Error(`Unexpected release id in contract: ${contract.default_release?.release_id}`);
}

const sourceRows = selectedRows(candidateRows);
if (sourceRows.length !== Number(contract.default_release.expected_row_count)) {
  throw new Error(`Expected ${contract.default_release.expected_row_count} selected rows, got ${sourceRows.length}`);
}

const positions = samplePositions(sourceRows.length, sampleSize);
const sampledRows = positions.map((position) => sourceRows[position - 1]);
const supportLanguages = languageOrder.filter((language) => !["ES", "ES-419"].includes(language.spreadsheetCode));

const supportRowsByLanguage = new Map();
for (const language of supportLanguages) {
  const rows = await readJsonl(supportFilePath(language.spreadsheetCode));
  if (rows.length !== sourceRows.length) {
    throw new Error(`${rel(supportFilePath(language.spreadsheetCode))} has ${rows.length} rows, expected ${sourceRows.length}`);
  }
  supportRowsByLanguage.set(language.spreadsheetCode, new Map(rows.map((row) => [normalizeText(row.row_id), row])));
}

const sourceSampleChecks = sampledRows.flatMap((row) => [
  auditSpanishSourceRow(row, "ES"),
  auditSpanishSourceRow(row, "ES-419"),
]);
const supportSampleChecks = [];
for (const language of supportLanguages) {
  const byRowId = supportRowsByLanguage.get(language.spreadsheetCode);
  const englishByRowId = supportRowsByLanguage.get("EN");
  for (const sourceRow of sampledRows) {
    supportSampleChecks.push(
      auditSampleLanguageRow({
        sourceRow,
        targetRow: byRowId.get(sourceRow.row_id),
        language,
        englishTargetRow: englishByRowId?.get(sourceRow.row_id),
      })
    );
  }
}

const fullSpanishChecks = sourceRows.flatMap((row) => [
  auditSpanishSourceRow(row, "ES"),
  auditSpanishSourceRow(row, "ES-419"),
]);
const regionalDifferences = sourceRows
  .map((row) => {
    const es = sourceVariantFields(row, "ES");
    const es419 = sourceVariantFields(row, "ES-419");
    const changedFields = ["display", "example", "article", "transcription"].filter((field) => es[field] !== es419[field]);
    return {
      row_id: row.row_id,
      selection_order: Number(row.selection_order),
      meaning_note: row.meaning_note,
      semantic_scene: row.semantic_scene,
      changed_fields: changedFields,
      ES: es,
      "ES-419": es419,
    };
  })
  .filter((row) => row.changed_fields.length);

const sourceSampleBlockers = sourceSampleChecks.filter((check) => check.blockers.length);
const supportSampleBlockers = supportSampleChecks.filter((check) => check.blockers.length);
const fullSpanishBlockers = fullSpanishChecks.filter((check) => check.blockers.length);
const sourceSampleWarnings = sourceSampleChecks.filter((check) => check.warnings.length);
const supportSampleWarnings = supportSampleChecks.filter((check) => check.warnings.length);
const fullSpanishWarnings = fullSpanishChecks.filter((check) => check.warnings.length);

const warningCounts = {};
for (const check of [...sourceSampleWarnings, ...supportSampleWarnings, ...fullSpanishWarnings]) {
  for (const warning of check.warnings) warningCounts[warning] = (warningCounts[warning] ?? 0) + 1;
}

const languageSummaries = Object.fromEntries(
  languageOrder.map((language) => {
    const code = language.spreadsheetCode;
    const checks = code === "ES" || code === "ES-419"
      ? sourceSampleChecks.filter((check) => check.variant_code === code)
      : supportSampleChecks.filter((check) => check.language_code === code);
    return [
      code,
      {
        language: language.language,
        sampled_rows: checks.length,
        blockers: checks.filter((check) => check.blockers.length).length,
        warnings: checks.filter((check) => check.warnings.length).length,
      },
    ];
  })
);

const nounChecks = fullSpanishChecks.filter((check) => check.part_of_speech === "noun");
const fullSpanishSummary = {
  rows: sourceRows.length,
  variant_checks: fullSpanishChecks.length,
  source_display_transcription_matches_expected_ipa: fullSpanishChecks.filter((check) =>
    check.transcription === transcribeSpanishText(check.display, check.variant_code)
  ).length,
  source_display_transcription_mismatches_expected_ipa: fullSpanishChecks.filter((check) =>
    check.transcription !== transcribeSpanishText(check.display, check.variant_code)
  ).length,
  source_display_transcription_raw_copy_count: fullSpanishChecks.filter((check) => check.transcription === check.display).length,
  noun_variant_checks: nounChecks.length,
  noun_variant_checks_where_transcription_excludes_article: nounChecks.filter((check) =>
    check.warnings.includes("source_transcription_excludes_learner_article")
  ).length,
  regional_difference_rows: regionalDifferences.length,
  regional_difference_changed_field_counts: regionalDifferences.reduce((acc, row) => {
    for (const field of row.changed_fields) acc[field] = (acc[field] ?? 0) + 1;
    return acc;
  }, {}),
};

const blockers = [
  ...sourceSampleBlockers.map((check) => ({
    scope: "source_sample",
    language_code: check.variant_code,
    row_id: check.row_id,
    blockers: check.blockers,
  })),
  ...supportSampleBlockers.map((check) => ({
    scope: "support_sample",
    language_code: check.language_code,
    row_id: check.row_id,
    blockers: check.blockers,
  })),
  ...fullSpanishBlockers.map((check) => ({
    scope: "full_spanish",
    language_code: check.variant_code,
    row_id: check.row_id,
    blockers: check.blockers,
  })),
];

const report = {
  summary: {
    release_id: RELEASE_ID,
    status: blockers.length ? "blocked" : "pass",
    audit_method: "deterministic expanded sample checks plus full ES/ES-419 source-field checks; no Gemini or external quota used",
    does_not_replace: "native-speaker certification or full row-by-row support-language linguistic audit",
    sample_positions: positions,
    sampled_source_rows: sampledRows.map((row) => row.row_id),
    language_variants_sampled: languageOrder.length,
    sample_checks_total: sourceSampleChecks.length + supportSampleChecks.length,
    source_sample_checks: sourceSampleChecks.length,
    support_sample_checks: supportSampleChecks.length,
    full_spanish_variant_checks: fullSpanishChecks.length,
    blockers: blockers.length,
    warnings: sourceSampleWarnings.length + supportSampleWarnings.length + fullSpanishWarnings.length,
    checked_at: new Date().toISOString(),
  },
  full_spanish_summary: fullSpanishSummary,
  language_summaries: languageSummaries,
  warning_counts: warningCounts,
  blockers,
  source_sample_warnings: sourceSampleWarnings,
  support_sample_warnings: supportSampleWarnings,
  full_spanish_warning_sample: fullSpanishWarnings.slice(0, 40),
  regional_differences: regionalDifferences,
  source_sample_checks: sourceSampleChecks,
  support_sample_checks: supportSampleChecks,
};

const reportJsonPath = path.join(
  ROOT,
  "outputs/spanish-a1-core/qa",
  `${RELEASE_ID}_expanded_quality_audit_${reportStamp}.json`
);
const reportMdPath = reportJsonPath.replace(/\.json$/iu, ".md");
await writeJson(reportJsonPath, report);
await fs.writeFile(
  reportMdPath,
  [
    `# Spanish A1 Expanded Quality Audit - ${RELEASE_ID}`,
    "",
    `- Status: ${report.summary.status}`,
    `- Method: ${report.summary.audit_method}`,
    `- Does not replace: ${report.summary.does_not_replace}`,
    `- Sample positions: ${positions.join(", ")}`,
    `- Language variants sampled: ${report.summary.language_variants_sampled}`,
    `- Sample checks total: ${report.summary.sample_checks_total}`,
    `- Full ES/ES-419 checks: ${report.summary.full_spanish_variant_checks}`,
    `- Regional difference rows: ${fullSpanishSummary.regional_difference_rows}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    "",
    "## Spanish Source Summary",
    "",
    `- Source display/transcription matches expected IPA: ${fullSpanishSummary.source_display_transcription_matches_expected_ipa}/${fullSpanishSummary.variant_checks}`,
    `- Source display/transcription mismatches expected IPA: ${fullSpanishSummary.source_display_transcription_mismatches_expected_ipa}`,
    `- Source display/transcription raw-copy count: ${fullSpanishSummary.source_display_transcription_raw_copy_count}`,
    `- Noun variant checks: ${fullSpanishSummary.noun_variant_checks}`,
    `- Noun variant checks where source transcription excludes learner article: ${fullSpanishSummary.noun_variant_checks_where_transcription_excludes_article}`,
    "",
    "## Blockers",
    "",
    ...(blockers.length
      ? blockers.map((blocker) => `- ${blocker.scope} ${blocker.language_code} ${blocker.row_id}: ${blocker.blockers.join("; ")}`)
      : ["None."]),
    "",
    "## Warning Counts",
    "",
    ...Object.entries(warningCounts).map(([warning, count]) => `- ${warning}: ${count}`),
    ...(Object.keys(warningCounts).length ? [] : ["None."]),
    "",
    "## Regional Differences",
    "",
    ...(regionalDifferences.length
      ? regionalDifferences.map((row) =>
          `- ${row.selection_order} ${row.row_id}: ${row.meaning_note}; fields=${row.changed_fields.join(", ")}; ES=${row.ES.learner_display}; ES-419=${row["ES-419"].learner_display}`
        )
      : ["None."]),
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      ...report.summary,
      full_spanish_summary: report.full_spanish_summary,
      report_json: rel(reportJsonPath),
      report_md: rel(reportMdPath),
    },
    null,
    2
  )
);
if (blockers.length) process.exitCode = 1;
