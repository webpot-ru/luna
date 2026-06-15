#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_004_147_v1";
const SCRIPT_VERSION = "2026-05-21.v1";
const LANGUAGE = "ES-419";
const BATCH_ID = "es_419_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-es-419.mjs";
const DEFAULT_TRANSLATIONS_PATH =
  "config/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_es_419_article_display_v1.tsv";
const RELEASE_ENTRY_COUNT = 147;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_SCRIPT_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u10A0-\u10FF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;
const SPAIN_SPANISH_RISK_RE =
  /\b(ordenador|zumo|vaqueros|coche|billete|coste|nata|móvil|patata|bocadillo|aparcar|aparcamos|echar de menos|echo de menos|jersey|vosotros|vuestro|vuestra|vuestros|vuestras|bolígrafo|autobús|coger|coge|coged|cogemos|cogí|cogió|cogieron|coges|cogéis|piso de arriba|camarero)\b/iu;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json",
    outDir: "outputs/oxford-vocabulary/support-translations",
    examples: null,
    translations: DEFAULT_TRANSLATIONS_PATH,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--contract") {
      args.contract = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--contract=")) {
      args.contract = item.slice("--contract=".length);
    } else if (item === "--out-dir") {
      args.outDir = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--out-dir=")) {
      args.outDir = item.slice("--out-dir=".length);
    } else if (item === "--examples") {
      args.examples = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--examples=")) {
      args.examples = item.slice("--examples=".length);
    } else if (item === "--translations") {
      args.translations = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--translations=")) {
      args.translations = item.slice("--translations=".length);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\n/u)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function parseTranslations(filePath) {
  const raw = await readFile(filePath, "utf8");
  const lines = raw.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${header}`);
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} ES-419 translation rows, found ${lines.length}`);
  }
  const translations = new Map();
  for (const [index, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`TSV row ${index + 2} must have exactly 3 tab-separated cells`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`TSV row ${index + 2} has an empty required cell`);
    }
    if (translations.has(sourceHeadword)) {
      throw new Error(`Duplicate translation source headword: ${sourceHeadword}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Latin American Spanish example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_SCRIPT_RE.test(display) || !LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Latin American Spanish row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Latin American Spanish row for ${sourceHeadword} contains an unexpected non-Latin script`);
    }
    const combined = `${display} ${example}`;
    if (SPAIN_SPANISH_RISK_RE.test(combined)) {
      throw new Error(`Latin American Spanish row for ${sourceHeadword} still contains Spain Spanish risk text`);
    }
    translations.set(sourceHeadword, { display, example });
  }
  return translations;
}

function validateTranslationMap(exampleRows, translations) {
  const expected = exampleRows.map((row) => row.source_headword);
  const actual = [...translations.keys()];
  const missing = expected.filter((sourceHeadword) => !translations.has(sourceHeadword));
  const extra = actual.filter((sourceHeadword) => !expected.includes(sourceHeadword));
  const orderMismatch = expected.findIndex((sourceHeadword, index) => actual[index] !== sourceHeadword);
  if (missing.length || extra.length || orderMismatch !== -1) {
    throw new Error(
      `ES-419 translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(
        extra
      )} orderMismatch=${orderMismatch}`
    );
  }
}

function buildSupportRow(exampleRow, translation, generatedAt) {
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
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: true,
    article_display_policy:
      "include_natural_latin_american_spanish_articles_or_gender_markers_where_grammatically_useful_for_nouns",
    support_translation_source: "codex_authored_latin_american_spanish_part004_support_tsv_not_oxford",
    support_example_source: "codex_authored_latin_american_spanish_part004_support_tsv_not_oxford",
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: generatedAt,
  };
}

function updateContract(contract, batchPath, summaryPath, rows, generatedAt) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    translation_tsv_path: DEFAULT_TRANSLATIONS_PATH,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: true,
    closes_gate_layer: [
      "support_translation_meaning_check",
      "support_example_scene_check"
    ],
    does_not_close: [
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "support_article_display_repair_check",
      "final_delivery_approval_check",
    ],
  };
  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.status = "support_language_batches_complete_needs_source_package_qa";
  contract.latest_support_translation_batches = [...existing, batch];
  contract.next_stage_options = [
    "Run weak-language targeted review and source-backed support-language audits now that all support languages are covered.",
    "Run support article display repair/check for article languages.",
    "Export and auto-publish US/UK workbooks only after source-package QA gates pass.",
  ];
  contract.updated_at = generatedAt;
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = args.examples || contract.latest_english_examples?.path;
if (!examplesPath) {
  throw new Error("No examples path provided and contract.latest_english_examples.path is empty");
}
const exampleRows = await readJsonl(examplesPath);
if (!exampleRows.length) {
  throw new Error("English examples artifact is empty");
}
if (exampleRows.length !== RELEASE_ENTRY_COUNT) {
  throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 004 rows, found ${exampleRows.length}`);
}
if (exampleRows.some((row) => row.release_id !== RELEASE_ID)) {
  throw new Error(`Unexpected release_id; expected ${RELEASE_ID}`);
}
const translations = await parseTranslations(args.translations);
validateTranslationMap(exampleRows, translations);

const generatedAt = new Date().toISOString();
const supportRows = exampleRows.map((row) => buildSupportRow(row, translations.get(row.source_headword), generatedAt));
const batchPath = path.join(args.outDir, `${RELEASE_ID}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${RELEASE_ID}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 004 Support Translation Batch ${BATCH_ID}: ${RELEASE_ID}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Translation TSV: \`${args.translations}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: included in Latin American Spanish display cells where grammatically useful",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: ES-419 Latin orthography, sentence punctuation, unexpected-script leak guard, source-key parity and Spain Spanish risk-term guard",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact completes support-language coverage for this source package, but it does not close full support-language QA, article-display repair or final delivery approval by itself.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows, generatedAt);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      batch_id: BATCH_ID,
      languages: [LANGUAGE],
      rows: supportRows.length,
      display_cells: supportRows.length,
      example_cells: supportRows.length,
      path: batchPath,
      contract_updated: args.contract,
      next_step: "support_qa_audits",
    },
    null,
    2
  )
);
