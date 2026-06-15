#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "PT-BR";
const BASE_LANGUAGE = "PT";
const BASE_BATCH_ID = "pt_v1";
const BATCH_ID = "pt_br_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-pt-br.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_SCRIPT_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u10A0-\u10FF\u1780-\u17FF\u3040-\u9FFF\uAC00-\uD7AF]/u;
const EUROPEAN_PORTUGUESE_RISK_RE =
  /\b(pequeno-almoço|comboio|rapariga|fixe|chávena|natas|rés do chão|ginásio|gelado|sumo|ganga|trabalhos de casa|condutor|condutora|autocarro|facto|catorze|vemo-nos|teu|tua|teus|tuas|ti)\b/iu;
const EUROPEAN_PORTUGUESE_PHRASE_RISK_RE =
  /\b(estou|estás|está|estamos|estão)\s+a\s+\p{Letter}+/iu;

const BRAZIL_OVERRIDES = {
  cool: ["fresco; legal", "O quarto está fresco."],
  correct: ["correto; corrigir", "Sua resposta está correta."],
  course: ["o curso", "Estou fazendo um curso de inglês."],
  cream: ["o creme de leite; o creme", "Ponho creme de leite no café."],
  cup: ["a xícara", "Esta xícara está vazia."],
  describe: ["descrever", "Descreva seu quarto."],
  do1: ["fazer", "O que você está fazendo?"],
  down: ["baixo; para baixo", "Sente-se aqui embaixo."],
  downstairs: ["embaixo; no andar de baixo", "A cozinha fica embaixo."],
  driver: ["o motorista/a motorista", "O motorista para aqui."],
  email: ["o e-mail", "Envie-me um e-mail."],
  evening: ["a noite", "Nos vemos esta noite."],
  exercise: ["o exercício; fazer exercício", "Faço exercício antes do café da manhã."],
  fact: ["o fato", "Este fato é importante."],
  fast: ["rápido", "Este trem é rápido."],
  fill: ["encher; preencher", "Encha a xícara com água."],
  finish: ["terminar; acabar", "Termine sua lição de casa."],
  follow: ["seguir", "Siga-me, por favor."],
  for: ["para", "Este presente é para você."],
  forget: ["esquecer", "Não se esqueça das chaves."],
  fourteen: ["quatorze", "Ela tem quatorze anos."],
  free: ["grátis; livre", "O ingresso é grátis."],
  Friday: ["sexta-feira", "Nos vemos na sexta-feira."],
  future: ["o futuro", "Pense no seu futuro."],
  girl: ["a menina; a garota", "A menina sorri."],
  give: ["dar", "Dê-me o livro."],
  goodbye: ["tchau; adeus", "Tchau, até amanhã."],
  grey: ["cinza", "O céu está cinza."],
  gym: ["a academia", "Vou à academia."],
  help: ["a ajuda; ajudar", "Ajude-me, por favor."],
  homework: ["a lição de casa; a tarefa de casa", "Faça a lição de casa hoje à noite."],
  "ice cream": ["o sorvete", "Quero um sorvete."],
  include: ["incluir", "Inclua seu nome, por favor."],
  introduce: ["apresentar", "Apresente seu amigo, por favor."],
  jacket: ["a jaqueta; o casaco", "Minha jaqueta é nova."],
  jeans: ["o jeans; a calça jeans", "Minha calça jeans é azul."],
  juice: ["o suco", "Bebo suco de laranja."],
  late: ["tarde; atrasado", "O ônibus está atrasado."],
  lose: ["perder", "Não perca seu ingresso."],
  lot: ["muito; um monte", "Tenho muita lição de casa."],
};

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    outDir: "outputs/oxford-vocabulary/support-translations",
    examples: null,
    base: null,
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
    } else if (item === "--base") {
      args.base = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--base=")) {
      args.base = item.slice("--base=".length);
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

function findBasePath(contract, explicitBase) {
  if (explicitBase) {
    return explicitBase;
  }
  const baseBatch = (contract.latest_support_translation_batches ?? []).find(
    (item) => item.batch_id === BASE_BATCH_ID
  );
  if (!baseBatch?.path) {
    throw new Error(`Could not find ${BASE_BATCH_ID} in contract.latest_support_translation_batches`);
  }
  return baseBatch.path;
}

function validateBaseRows(exampleRows, baseRows) {
  const expected = exampleRows.map((row) => row.source_headword);
  const actual = baseRows.map((row) => row.source_headword);
  const missing = expected.filter((sourceHeadword) => !actual.includes(sourceHeadword));
  const extra = actual.filter((sourceHeadword) => !expected.includes(sourceHeadword));
  const orderMismatch = expected.findIndex((sourceHeadword, index) => actual[index] !== sourceHeadword);
  if (missing.length || extra.length || orderMismatch !== -1) {
    throw new Error(
      `PT-BR base source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(
        extra
      )} orderMismatch=${orderMismatch}`
    );
  }
}

function regionalize(row) {
  const override = BRAZIL_OVERRIDES[row.source_headword];
  const display = override ? override[0] : row[BASE_LANGUAGE];
  const example = override ? override[1] : row[`example_${BASE_LANGUAGE}`];
  if (!display || !example) {
    throw new Error(`Missing PT base display/example for ${row.source_headword}`);
  }
  if (!SENTENCE_END_RE.test(example)) {
    throw new Error(`Brazilian Portuguese example for ${row.source_headword} must end with sentence punctuation`);
  }
  if (!LATIN_SCRIPT_RE.test(display) || !LATIN_SCRIPT_RE.test(example)) {
    throw new Error(`Brazilian Portuguese row for ${row.source_headword} must contain Latin-script text`);
  }
  if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
    throw new Error(`Brazilian Portuguese row for ${row.source_headword} contains an unexpected non-Latin script`);
  }
  const combined = `${display} ${example}`;
  if (EUROPEAN_PORTUGUESE_RISK_RE.test(combined) || EUROPEAN_PORTUGUESE_PHRASE_RISK_RE.test(combined)) {
    throw new Error(`Brazilian Portuguese row for ${row.source_headword} still contains regional PT risk text`);
  }
  return { display, example, usedOverride: Boolean(override) };
}

function buildSupportRow(row, regionalized, generatedAt) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    support_translation_source: "codex_regionalized_from_pt_support_batch_with_brazil_overrides_not_oxford",
    support_example_source: "codex_regionalized_from_pt_support_batch_with_brazil_overrides_not_oxford",
    support_regionalization_base_batch: BASE_BATCH_ID,
    generated_at: generatedAt,
    [LANGUAGE]: regionalized.display,
    [`example_${LANGUAGE}`]: regionalized.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    regionalization_base_batch: BASE_BATCH_ID,
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
    "Generate the next support-language batch in language order.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = args.examples || contract.latest_english_examples?.path;
if (!examplesPath) {
  throw new Error("No examples path provided and contract.latest_english_examples.path is empty");
}
const basePath = findBasePath(contract, args.base);
const exampleRows = await readJsonl(examplesPath);
const baseRows = await readJsonl(basePath);
if (!exampleRows.length || !baseRows.length) {
  throw new Error("English examples or PT base artifact is empty");
}
validateBaseRows(exampleRows, baseRows);

const releaseId = exampleRows[0].release_id;
const generatedAt = new Date().toISOString();
let overrideCount = 0;
const supportRows = baseRows.map((row) => {
  const regionalized = regionalize(row);
  if (regionalized.usedOverride) {
    overrideCount += 1;
  }
  return buildSupportRow(row, regionalized, generatedAt);
});
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 002 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Regionalization base: \`${basePath}\` (${BASE_LANGUAGE} / ${BASE_BATCH_ID})`,
    `- Explicit Brazilian Portuguese overrides: ${overrideCount}`,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: PT-BR Latin orthography, sentence punctuation, unexpected-script leak guard, source-key parity and European Portuguese risk-term guard",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows);
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
      regionalization_base: basePath,
      explicit_overrides: overrideCount,
      path: batchPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
