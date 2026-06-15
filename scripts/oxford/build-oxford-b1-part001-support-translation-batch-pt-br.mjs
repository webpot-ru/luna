#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_b1_part_001_300_v1";
const SCRIPT_VERSION = "2026-05-26.v1";
const LANGUAGE = "PT-BR";
const BATCH_ID = "pt_br_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-b1-part001-support-translation-batch-pt-br.mjs";
const DEFAULT_TRANSLATIONS = `config/${RELEASE_ID}_support_translation_batch_pt_br_article_display_v1.tsv`;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_SCRIPT_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u10A0-\u10FF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;
const EUROPEAN_PORTUGUESE_RISK_RE =
  /\b(pequeno-almoço|comboio|rapariga|fixe|chávena|natas|rés do chão|ginásio|gelado|sumo|ganga|trabalhos de casa|condutor|condutora|autocarro|facto|catorze|dezasseis|dezassete|dezanove|vemo-nos|telemóvel|ementa|sandes|duche|camisola|secção|bilhete|bilhetes|casa de banho|sanita|ficheiro|ecrã|alojamento|reservámos|académico|académica|bêbedo|contigo|convosco|tu|teu|tua|teus|tuas|ti)\b/iu;
const EUROPEAN_PROGRESSIVE_RE = /\b(estou|estás|está|estamos|estão)\s+a\s+\p{Letter}+/iu;

function parseArgs(argv) {
  const args = {
    contract: `config/${RELEASE_ID}_contract_v0.json`,
    examples: "",
    translations: DEFAULT_TRANSLATIONS,
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    if (inlineValue === undefined) index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--examples") args.examples = value;
    else if (key === "--translations") args.translations = value;
    else if (key === "--out-dir") args.outDir = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
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

function assertBrazilianPortugueseText(value, context) {
  if (!LATIN_SCRIPT_RE.test(value)) {
    throw new Error(`${context}: expected Brazilian Portuguese Latin-script text`);
  }
  if (UNEXPECTED_SCRIPT_RE.test(value)) {
    throw new Error(`${context}: unexpected non-Latin script`);
  }
  if (EUROPEAN_PORTUGUESE_RISK_RE.test(value) || EUROPEAN_PROGRESSIVE_RE.test(value)) {
    throw new Error(`${context}: European Portuguese risk text`);
  }
}

async function parseTranslations(filePath) {
  const lines = (await readFile(filePath, "utf8")).trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tPT-BR\texample_PT-BR") {
    throw new Error(`Unexpected PT-BR translation TSV header in ${filePath}`);
  }
  const rows = [];
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad PT-BR translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad PT-BR translation row ${index + 2}: empty field`);
    }
    assertBrazilianPortugueseText(display, `${sourceHeadword} PT-BR`);
    assertBrazilianPortugueseText(example, `${sourceHeadword} example_PT-BR`);
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad PT-BR example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate PT-BR translation key: ${sourceHeadword}`);
    }
    const translation = { sourceHeadword, display, example };
    rows.push(translation);
    map.set(sourceHeadword, translation);
  }
  return { rows, map };
}

function validateTranslationRows(exampleRows, translations) {
  const sourceKeys = exampleRows.map((row) => row.source_headword);
  const translationKeys = translations.rows.map((row) => row.sourceHeadword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.map.has(key));
  const extra = translationKeys.filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing PT-BR translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`PT-BR translation TSV has unused rows: ${extra.join(", ")}`);
  }
  for (const [index, sourceKey] of sourceKeys.entries()) {
    if (translationKeys[index] !== sourceKey) {
      throw new Error(
        `PT-BR translation row order mismatch at row ${index + 2}: expected ${sourceKey}, found ${translationKeys[index]}`
      );
    }
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
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: "codex_oxford_b1_part001_support_translation_batch_pt_br_article_display_v1",
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
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, translationsPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    translations_path: translationsPath,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: true,
    article_display_policy:
      "include_natural_brazilian_portuguese_articles_or_gender_markers_where_grammatically_useful_for_nouns",
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
  const existing = contract.latest_support_translation_batches ?? [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID && !item.languages?.includes(LANGUAGE)),
    batch,
  ];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.updated_at = new Date().toISOString();
  contract.next_stage_options = [
    "Generate the next support-language batch in documented order: ES-419.",
    "Run weak-language targeted review, source-backed support-language audits and support example quality audit after all support languages are covered.",
    "Export final US/UK workbooks and upload native Google Sheets only after all support-language gates pass under the standing Oxford auto-publish rule.",
  ];
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = args.examples || contract.latest_english_examples?.path;
if (!examplesPath) {
  throw new Error("No examples path provided and contract.latest_english_examples.path is empty");
}
const exampleRows = await readJsonl(examplesPath);
if (exampleRows.length !== 300) {
  throw new Error(`Expected 300 English example rows, found ${exampleRows.length}`);
}
const translations = await parseTranslations(args.translations);
validateTranslationRows(exampleRows, translations);

const releaseId = exampleRows[0].release_id;
const generatedAt = new Date().toISOString();
const supportRows = exampleRows.map((row) => buildSupportRow(row, translations.map.get(row.source_headword), generatedAt));
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford B1 Part 001 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Translation TSV: \`${args.translations}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: included where grammatically useful for Brazilian Portuguese nouns",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: Brazilian Portuguese Latin text, sentence punctuation, unexpected-script leak guard and European Portuguese risk-term guard",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, args.translations, supportRows);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      batch_id: BATCH_ID,
      languages: [LANGUAGE],
      rows: supportRows.length,
      display_cells: supportRows.length,
      example_cells: supportRows.length,
      path: batchPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
