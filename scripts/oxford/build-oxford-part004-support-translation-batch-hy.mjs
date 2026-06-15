#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_004_147_v1";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "HY";
const BATCH_ID = "hy_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-hy.mjs";
const DEFAULT_TRANSLATIONS_PATH =
  "config/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_hy_v1.tsv";
const RELEASE_ENTRY_COUNT = 147;
const SENTENCE_END_RE = /[.!?։]$/u;
const ARMENIAN_RE = /\p{Script=Armenian}/u;
const LATIN_RE = /[A-Za-z]/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u10A0-\u10FF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} HY translation rows, found ${lines.length}`);
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
      throw new Error(`Armenian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!ARMENIAN_RE.test(display) || !ARMENIAN_RE.test(example)) {
      throw new Error(`Armenian row for ${sourceHeadword} must contain Armenian-script text`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Armenian row for ${sourceHeadword} contains Latin-script fallback`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Armenian row for ${sourceHeadword} contains an unexpected non-Armenian script`);
    }
    translations.set(sourceHeadword, { display, example });
  }
  return translations;
}

function validateTranslationMap(exampleRows, translations) {
  const expected = exampleRows.map((row) => row.source_headword);
  const missing = expected.filter((sourceHeadword) => !translations.has(sourceHeadword));
  const extra = [...translations.keys()].filter((sourceHeadword) => !expected.includes(sourceHeadword));
  if (missing.length || extra.length) {
    throw new Error(
      `HY translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: "codex_oxford_part004_support_translation_batch_hy_v1",
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
    HY: translation.display,
    example_HY: translation.example,
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
    article_display_included: false,
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: TR.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
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
const releaseId = exampleRows[0].release_id;
if (releaseId !== RELEASE_ID) {
  throw new Error(`Unexpected release_id: ${releaseId}`);
}
const translations = await parseTranslations(args.translations);
validateTranslationMap(exampleRows, translations);

const generatedAt = new Date().toISOString();
const supportRows = exampleRows.map((row) => buildSupportRow(row, translations.get(row.source_headword), generatedAt));
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 004 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Translation TSV: \`${args.translations}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: false; Armenian uses normal Armenian native-script citation/base forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: HY Armenian display/example cells, sentence punctuation, no Latin fallback and no unexpected-script leakage",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows, generatedAt);
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
      next_language: "TR",
    },
    null,
    2
  )
);
