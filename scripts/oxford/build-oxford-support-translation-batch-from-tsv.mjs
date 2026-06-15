#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-06-01.v2";
const SCRIPT_PATH = "scripts/oxford/build-oxford-support-translation-batch-from-tsv.mjs";
const HAS_SENTENCE_TERMINAL_RE = /\p{Sentence_Terminal}$/u;
const SENTENCE_END_RE = /[.!?؟۔।。！？¿။៕។]$/u;
const ARTICLE_DISPLAY_LANGUAGES = new Set(["ES", "FR", "DE", "IT", "PT", "NL", "SV", "NO", "DA", "RO", "ES-419", "PT-BR"]);

function parseArgs(argv) {
  const args = {
    contract: "",
    translations: "",
    language: "",
    batchId: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    if (inlineValue === undefined) index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--translations") args.translations = value;
    else if (key === "--language") args.language = value;
    else if (key === "--batch-id") args.batchId = value;
    else if (key === "--out-dir") args.outDir = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!args.contract) throw new Error("Missing --contract");
  if (!args.translations) throw new Error("Missing --translations");
  if (!args.language) throw new Error("Missing --language");
  if (!args.batchId) throw new Error("Missing --batch-id");
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function parseTranslations(filePath, language) {
  const lines = (await readFile(filePath, "utf8")).trim().split(/\r?\n/u);
  const expectedHeader = `source_headword\t${language}\texample_${language}`;
  const header = lines.shift();
  if (header !== expectedHeader) {
    throw new Error(`Unexpected TSV header in ${filePath}; expected ${expectedHeader}`);
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) throw new Error(`Bad row ${index + 2}: expected 3 tab-separated fields`);
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) throw new Error(`Bad row ${index + 2}: empty field`);
    if (!HAS_SENTENCE_TERMINAL_RE.test(example)) throw new Error(`Bad ${language} example punctuation for ${sourceHeadword}`);
    if (map.has(sourceHeadword)) throw new Error(`Duplicate translation key: ${sourceHeadword}`);
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(exampleRows, translations, language) {
  const sourceKeys = exampleRows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) throw new Error(`Missing ${language} translations: ${missing.join(", ")}`);
  if (extra.length) throw new Error(`Unused ${language} translations: ${extra.join(", ")}`);
}

function buildSupportRow(exampleRow, translation, language, batchId, generatedAt) {
  return {
    release_id: exampleRow.release_id,
    course_id: exampleRow.course_id,
    row_id: exampleRow.row_id,
    core_item_id: exampleRow.core_item_id,
    meaning_id: exampleRow.meaning_id,
    source_candidate_id: exampleRow.source_candidate_id,
    source_headword: exampleRow.source_headword,
    reviewed_display_headword: exampleRow.reviewed_display_headword,
    reviewed_part_of_speech: exampleRow.reviewed_part_of_speech,
    meaning_note: exampleRow.meaning_note,
    example_EN: exampleRow.example_EN,
    support_translation_batch: batchId,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft generated through the structured local TSV contour; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: `codex_oxford_support_translation_batch_${batchId}`,
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: (exampleRow.remaining_blockers ?? []).filter(
      (blocker) =>
        ![
          "english_pronunciation_source_check",
          "english_example_quality_check",
          "support_translation_meaning_check",
          "support_example_scene_check",
        ].includes(blocker)
    ),
    [language]: translation.display,
    [`example_${language}`]: translation.example,
  };
}

function updateContract(contract, { language, batchId, batchPath, summaryPath, translationsPath, rows }) {
  const articleDisplayIncluded = ARTICLE_DISPLAY_LANGUAGES.has(language);
  const batch = {
    batch_id: batchId,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    translations_path: translationsPath,
    path: batchPath,
    summary_path: summaryPath,
    languages: [language],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: articleDisplayIncluded,
    generation_assisted_by: "structured-local-tsv",
    closes_gate_layer: [],
    does_not_close: [
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "support_article_display_repair_check",
      "final_delivery_approval_check",
    ],
  };
  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches
    : [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== batchId && !(item.languages ?? []).includes(language)),
    batch,
  ];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.updated_at = new Date().toISOString();
  contract.next_stage_options = [
    "Continue support-language batch generation in documented language order until coverage is 52/52.",
    "Run weak-language targeted review, support translation sample review, all-fields sample review, source-backed translation audit, support example quality audit and article-display check after full coverage.",
    "Export final US/UK workbooks and upload native Google Sheets only after all source-package QA gates pass.",
  ];
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = contract.latest_english_examples?.path;
if (!examplesPath) throw new Error("contract.latest_english_examples.path is missing");
const exampleRows = await readJsonl(examplesPath);
if (!exampleRows.length) throw new Error("English examples artifact is empty");
const translations = await parseTranslations(args.translations, args.language);
validateTranslationMap(exampleRows, translations, args.language);

const releaseId = exampleRows[0].release_id;
const generatedAt = new Date().toISOString();
const rows = exampleRows.map((row) =>
  buildSupportRow(row, translations.get(row.source_headword), args.language, args.batchId, generatedAt)
);
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${args.batchId}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${args.batchId}_summary.md`);
await writeJsonl(batchPath, rows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Support Translation Batch ${args.batchId}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Translation TSV: \`${args.translations}\``,
    `- Rows: ${rows.length}`,
    `- Languages: ${args.language}`,
    `- Article display: ${ARTICLE_DISPLAY_LANGUAGES.has(args.language)}`,
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Target-language transcriptions: not included",
    "- Generation assistance: `structured-local-tsv`",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, {
  language: args.language,
  batchId: args.batchId,
  batchPath,
  summaryPath,
  translationsPath: args.translations,
  rows,
});
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      batch_id: args.batchId,
      languages: [args.language],
      rows: rows.length,
      display_cells: rows.length,
      example_cells: rows.length,
      article_display_included: ARTICLE_DISPLAY_LANGUAGES.has(args.language),
      path: batchPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
