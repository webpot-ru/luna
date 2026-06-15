#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "LV";
const BATCH_ID = "lv_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-lv.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LV_TRANSLATIONS_TSV = `source_headword	LV	example_LV
take	ņemt; paņemt	Paņem biļeti.
talk	runāt; saruna	Mēs runājam pēc stundas.
tall	garš	Mans skolotājs ir garš.
taxi	taksometrs; taksis	Taksometrs ir ārā.
tea	tēja	Šī tēja ir karsta.
teach	mācīt	Es mācu angļu valodu.
teacher	skolotājs; skolotāja	Skolotāja smaida.
team	komanda	Mūsu komanda šodien uzvar.
teenager	pusaudzis; pusaudze	Pusaudzis lasa grāmatu.
telephone	telefons; zvanīt	Telefons ir uz galda.
television	televizors; televīzija	Televizors ir jauns.
tell	pateikt; pastāstīt	Pasaki savu vārdu.
ten	desmit	Man ir desmit grāmatas.
tennis	teniss	Šodien spēlējam tenisu.
terrible	briesmīgs	Laiks ir briesmīgs.
test	tests; pārbaudījums	Tests sākas tagad.
text	ziņa; teksts	Nosūti īsu ziņu.
than	nekā	Desmit ir vairāk nekā divi.
thank	pateikties	Pateicies skolotājam.
thanks	paldies; pateicība	Paldies par palīdzību.
that	tas; tā	Tā grāmata ir mana.
the	angļu noteiktais artikuls	Tēja ir silta.
theatre	teātris	Teātris ir pie stacijas.
their	viņu	Viņu māja ir liela.
them	viņus; viņiem	Es viņus pazīstu.
then	tad; pēc tam	Ēd, pēc tam mācies.
there	tur; ir	Tur ir krēsls.
they	viņi; viņas	Viņi ir skolā.
thing	lieta; priekšmets	Šī lieta ir noderīga.
think	domāt	Es domāju par mājām.
third	trešais; trešdaļa	Šī ir trešā stunda.
thirsty	izslāpis	Es esmu izslāpis.
thirteen	trīspadsmit	Viņam ir trīspadsmit gadi.
thirty	trīsdesmit	Manai māsai ir trīsdesmit gadu.
this	šis; šī	Šī biļete ir jauna.
thousand	tūkstotis	Atnāca tūkstotis cilvēku.
three	trīs	Es redzu trīs putnus.
through	caur; pa	Ejam caur parku.
Thursday	ceturtdiena	Tiekamies ceturtdien.
ticket	biļete	Man vajag biļeti.
time	laiks; pulkstenis	Cik ir pulkstenis?
tired	noguris	Es esmu noguris.
title	virsraksts	Izlasi virsrakstu.
to	uz; līdz; pie	Es eju uz stundu.
today	šodien	Šodien ir saulains.
together	kopā	Mēs ēdam kopā.
toilet	tualete	Tualete ir tīra.
tomato	tomāts	Šis tomāts ir sarkans.
tomorrow	rīt	Tiekamies rīt.
tonight	šovakar	Šovakar mācāmies.
too	arī; pārāk	Es arī gribu tēju.
tooth	zobs	Man sāp zobs.
topic	tēma	Izvēlies tēmu.
tourist	tūrists; tūriste	Tūrists fotografē.
town	pilsēta; mazpilsēta	Šī mazpilsēta ir klusa.
traffic	satiksme	Satiksme ir lēna.
train	vilciens; trenēt	Vilciens kavējas.
travel	ceļot; ceļojums	Ceļojam ar vilcienu.
tree	koks	Koks ir augsts.
trip	ceļojums; izbrauciens	Izbrauciens sākas rīt.
trousers	bikses	Manas bikses ir melnas.
true	patiess; pareizs	Šis stāsts ir patiess.
try	mēģināt; pamēģināt	Pamēģini šo tēju.
T-shirt	T krekls	Es valkāju T kreklu.
Tuesday	otrdiena	Tiekamies otrdien.
turn	pagriezties; kārta	Šeit pagriezies pa kreisi.
TV	televizors; TV	Televizors ir skaļš.
twelve	divpadsmit	Man ir divpadsmit zīmuļi.
twenty	divdesmit	Šeit ir divdesmit skolēnu.
twice	divreiz	Es peldu divreiz nedēļā.
two	divi; divas	Divi cilvēki gaida.
type	tips; veids; rakstīt	Kādu mūzikas veidu gribi?
umbrella	lietussargs	Paņem lietussargu.
uncle	tēvocis	Mans tēvocis ir laipns.
under	zem	Soma ir zem galda.
understand	saprast	Es saprotu jautājumu.
university	universitāte	Universitāte ir tuvu.
until	līdz	Gaidi līdz pieciem.
up	augšā; uz augšu	Celies tagad.
upstairs	augšā; augšstāvā	Mana istaba ir augšā.
us	mūs; mums	Palīdzi mums, lūdzu.
use	lietot; izmantošana	Lieto šo pildspalvu.
useful	noderīgs	Šī karte ir noderīga.
usually	parasti	Parasti eju mājās kājām.
vacation	brīvdienas; atvaļinājums	Mūsu brīvdienas sākas rīt.
vegetable	dārzenis	Burkāns ir dārzenis.
very	ļoti	Istaba ir ļoti klusa.
video	video	Noskaties šo video.
village	ciems	Ciems ir mazs.
visit	apmeklēt	Mēs apmeklējam tanti.
visitor	apmeklētājs; apmeklētāja	Apmeklētājs gaida ārā.
wait	gaidīt	Gaidi šeit, lūdzu.
waiter	viesmīlis; viesmīle	Viesmīlis atnes tēju.
wake	pamosties; modināt	Es pamostos agri.
walk	iet; pastaiga	Ejam uz skolu.
wall	siena	Siena ir balta.
want	gribēt	Es gribu ūdeni.
warm	silts; sasildīt	Istaba ir silta.
wash	mazgāt	Mazgā rokas.
watch	skatīties; pulkstenis	Es skatos televīziju.
water	ūdens; laistīt	Dzer mazliet ūdens.
way	ceļš; veids	Šis ceļš ir īss.
we	mēs	Mēs mācāmies angļu valodu.
wear	valkāt	Es valkāju mēteli.
weather	laiks	Laiks ir auksts.
website	tīmekļa vietne	Šī tīmekļa vietne ir noderīga.
Wednesday	trešdiena	Stunda sākas trešdien.
week	nedēļa	Šī nedēļa ir aizņemta.
weekend	nedēļas nogale	Nedēļas nogale sākas rīt.
welcome	laipni lūgts; sveikt	Laipni lūgts mūsu stundā.
well	labi	Viņa labi dzied.
west	rietumi	Saule noriet rietumos.
what	kas; kāds	Kas tur ir?
when	kad	Kad tu mācies?
where	kur	Kur ir stacija?
which	kurš; kura	Kura soma ir tava?
white	balts	Siena ir balta.
who	kas	Kas tur ir?
why	kāpēc	Kāpēc tu kavē?
wife	sieva	Viņa sieva ir skolotāja.
will modal	būs; darīšu	Es tev palīdzēšu.
win	uzvarēt	Mūsu komanda var uzvarēt.
window	logs	Atver logu.
wine	vīns	Šis vīns ir sarkans.
winter	ziema	Ziema šeit ir auksta.
with	ar	Nāc ar mani.
without	bez	Tēja bez cukura ir laba.
woman	sieviete	Sieviete lasa grāmatu.
wonderful	brīnišķīgs	Skats ir brīnišķīgs.
word	vārds	Uzraksti vienu vārdu.
work	strādāt; darbs	Es strādāju mājās.
worker	strādnieks; darbiniece	Strādnieks ir aizņemts.
world	pasaule	Pasaule ir liela.
would modal	gribētu; būtu	Es gribētu tēju.
write	rakstīt	Uzraksti savu vārdu.
writer	rakstnieks; rakstniece	Rakstnieks dzīvo šeit.
writing	rakstīšana; rokraksts	Viņas rokraksts ir skaidrs.
wrong	nepareizs	Šī atbilde ir nepareiza.
yeah	jā; labi	Jā, es varu atnākt.
year	gads	Šis gads ir labs.
yellow	dzeltens	Banāns ir dzeltens.
yes	jā	Jā, es saprotu.
yesterday	vakar	Vakar es zvanīju.
you	tu; jūs	Tu esi mans draugs.
young	jauns	Bērns ir jauns.
your	tavs; jūsu	Tava soma ir šeit.
yourself	sevi; pats	Pacienā sevi ar tēju.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json",
    examples: "",
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

function parseTranslations() {
  const lines = LV_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tLV\texample_LV") {
    throw new Error("Unexpected LV translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad LV translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad LV translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad LV translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad LV translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad LV example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate LV translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing LV translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`LV translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_lv_v1",
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
    LV: translation.display,
    example_LV: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows, generatedAt) {
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
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: ET.",
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
const translations = parseTranslations();
validateTranslationMap(exampleRows, translations);

const releaseId = exampleRows[0].release_id;
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
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: false; Latvian uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: LV Latin-script display/example cells and no non-Latin script",
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
    },
    null,
    2
  )
);
