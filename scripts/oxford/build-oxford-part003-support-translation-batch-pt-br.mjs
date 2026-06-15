#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const LANGUAGE = "PT-BR";
const BASE_LANGUAGE = "PT";
const BASE_BATCH_ID = "pt_article_display_v1";
const BATCH_ID = "pt_br_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-pt-br.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_SCRIPT_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u10A0-\u10FF\u1780-\u17FF\u3040-\u9FFF\uAC00-\uD7AF]/u;
const EUROPEAN_PORTUGUESE_RISK_RE =
  /\b(pequeno-almoço|comboio|rapariga|fixe|chávena|natas|rés do chão|ginásio|gelado|sumo|ganga|trabalhos de casa|condutor|condutora|autocarro|facto|catorze|dezasseis|dezassete|dezanove|vemo-nos|telemóvel|ementa|sandes|duche|camisola|secção|teu|tua|teus|tuas|ti)\b/iu;
const EUROPEAN_PROGRESSIVE_RE = /\b(estou|estás|está|estamos|estão)\s+a\s+\p{Letter}+/iu;

const BRAZIL_OVERRIDES = {
  map: ["o mapa", "Olhe para o mapa."],
  me: ["me; mim", "Me ajude, por favor."],
  menu: ["o menu; o cardápio", "Leia o cardápio, por favor."],
  midnight: ["a meia-noite", "O trem sai à meia-noite."],
  milk: ["o leite", "Bebo leite no café da manhã."],
  name: ["o nome; chamar", "Escreva seu nome aqui."],
  natural: ["natural", "Este suco é natural."],
  new: ["novo; nova", "Este celular é novo."],
  next: ["próximo; seguinte", "O próximo ônibus está atrasado."],
  nineteen: ["dezenove", "Ela tem dezenove anos."],
  of: ["de", "Esta é uma xícara de chá."],
  opinion: ["a opinião", "Qual é a sua opinião?"],
  perfect: ["perfeito", "Sua resposta é perfeita."],
  personal: ["pessoal", "Este é meu celular pessoal."],
  phone: ["o telefone; o celular", "Meu celular está na bolsa."],
  prepare: ["preparar", "Prepare sua mochila esta noite."],
  policeman: ["o policial; a policial", "O policial nos ajuda."],
  sandwich: ["o sanduíche", "Como um sanduíche."],
  say: ["dizer", "Diga seu nome, por favor."],
  section: ["a seção", "Leia esta seção."],
  seventeen: ["dezessete", "Ele tem dezessete anos."],
  show: ["mostrar; o espetáculo", "Mostre seu ingresso."],
  shower: ["o banho; tomar banho", "Tomo banho."],
  sixteen: ["dezesseis", "Ela tem dezesseis anos."],
  slow: ["lento; devagar", "O ônibus é lento."],
  spell: ["soletrar", "Soletre seu nome."],
  sweater: ["o suéter; a blusa de frio", "Minha blusa de frio é quente."],
};

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json",
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
  if (explicitBase) return explicitBase;
  const baseBatch = (contract.latest_support_translation_batches ?? []).find(
    (item) => item.batch_id === BASE_BATCH_ID
  );
  if (!baseBatch?.path) {
    throw new Error(`Could not find ${BASE_BATCH_ID} in contract.latest_support_translation_batches`);
  }
  return baseBatch.path;
}

function validateSourceAndBaseRows(exampleRows, baseRows) {
  if (exampleRows.length !== 300 || baseRows.length !== 300) {
    throw new Error(`Expected 300 rows; examples=${exampleRows.length}, base=${baseRows.length}`);
  }
  if (exampleRows.some((row) => row.release_id !== RELEASE_ID) || baseRows.some((row) => row.release_id !== RELEASE_ID)) {
    throw new Error(`Unexpected release_id; expected ${RELEASE_ID}`);
  }
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

function brazilianizeGenericText(value) {
  return String(value)
    .replace(/\btelemóvel\b/giu, "celular")
    .replace(/\bautocarro\b/giu, "ônibus")
    .replace(/\bcomboio\b/giu, "trem")
    .replace(/\bpequeno-almoço\b/giu, "café da manhã")
    .replace(/\bsumo\b/giu, "suco")
    .replace(/\bchávena\b/giu, "xícara")
    .replace(/\bementa\b/giu, "cardápio")
    .replace(/\bsandes\b/giu, "sanduíche")
    .replace(/\bduche\b/giu, "banho")
    .replace(/\bsecção\b/giu, "seção")
    .replace(/\bdezasseis\b/giu, "dezesseis")
    .replace(/\bdezassete\b/giu, "dezessete")
    .replace(/\bdezanove\b/giu, "dezenove");
}

function brazilianizePossessives(value) {
  return value
    .replace(/\bO meu\b/gu, "Meu")
    .replace(/\bA minha\b/gu, "Minha")
    .replace(/\bOs meus\b/gu, "Meus")
    .replace(/\bAs minhas\b/gu, "Minhas")
    .replace(/\bo meu\b/gu, "meu")
    .replace(/\ba minha\b/gu, "minha")
    .replace(/\bos meus\b/gu, "meus")
    .replace(/\bas minhas\b/gu, "minhas");
}

function regionalize(row) {
  const override = BRAZIL_OVERRIDES[row.source_headword];
  let display = override ? override[0] : row[BASE_LANGUAGE];
  let example = override ? override[1] : row[`example_${BASE_LANGUAGE}`];
  if (!display || !example) {
    throw new Error(`Missing PT base display/example for ${row.source_headword}`);
  }
  if (!override) {
    display = brazilianizeGenericText(display);
    example = brazilianizePossessives(brazilianizeGenericText(example));
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
  if (EUROPEAN_PORTUGUESE_RISK_RE.test(combined) || EUROPEAN_PROGRESSIVE_RE.test(combined)) {
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
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: regionalized.display,
    [`example_${LANGUAGE}`]: regionalized.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: true,
    article_display_policy:
      "include_natural_brazilian_portuguese_articles_or_gender_markers_where_grammatically_useful_for_nouns",
    support_translation_source: "codex_regionalized_from_pt_part003_support_batch_with_brazil_overrides_not_oxford",
    support_example_source: "codex_regionalized_from_pt_part003_support_batch_with_brazil_overrides_not_oxford",
    support_regionalization_base_batch: BASE_BATCH_ID,
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: generatedAt,
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
    article_display_included: true,
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
  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [...existing, batch];
  contract.next_stage_options = [
    "Generate ES-419 support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
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
validateSourceAndBaseRows(exampleRows, baseRows);

const generatedAt = new Date().toISOString();
let overrideCount = 0;
const supportRows = baseRows.map((row) => {
  const regionalized = regionalize(row);
  if (regionalized.usedOverride) overrideCount += 1;
  return buildSupportRow(row, regionalized, generatedAt);
});
const batchPath = path.join(args.outDir, `${RELEASE_ID}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${RELEASE_ID}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${RELEASE_ID}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Regionalization base: \`${basePath}\` (${BASE_LANGUAGE} / ${BASE_BATCH_ID})`,
    `- Explicit Brazilian Portuguese overrides: ${overrideCount}`,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: included in Brazilian Portuguese display cells where grammatically useful",
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
      release_id: RELEASE_ID,
      batch_id: BATCH_ID,
      languages: [LANGUAGE],
      rows: supportRows.length,
      display_cells: supportRows.length,
      example_cells: supportRows.length,
      regionalization_base: basePath,
      explicit_overrides: overrideCount,
      path: batchPath,
      contract_updated: args.contract,
      next_language: "ES-419",
    },
    null,
    2
  )
);
