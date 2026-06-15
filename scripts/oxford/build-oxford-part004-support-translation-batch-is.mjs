#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "IS";
const BATCH_ID = "is_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-is.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const IS_TRANSLATIONS_TSV = `source_headword	IS	example_IS
take	taka; taka með	Taktu miðann.
talk	tala; samtal	Við tölum eftir tímann.
tall	hár	Kennarinn minn er hár.
taxi	leigubíll	Leigubíllinn er úti.
tea	te	Þetta te er heitt.
teach	kenna	Ég kenni ensku.
teacher	kennari	Kennarinn brosir.
team	lið	Okkar lið vinnur í dag.
teenager	unglingur	Unglingurinn les bók.
telephone	sími; hringja	Síminn er á borðinu.
television	sjónvarp	Sjónvarpið er nýtt.
tell	segja; segja frá	Segðu mér nafnið þitt.
ten	tíu	Ég á tíu bækur.
tennis	tennis	Við spilum tennis í dag.
terrible	hræðilegur	Veðrið er hræðilegt.
test	próf	Prófið byrjar núna.
text	skilaboð; texti	Sendu stutt skilaboð.
than	en	Tíu er meira en tveir.
thank	þakka	Þakkaðu kennaranum þínum.
thanks	takk; þakkir	Takk fyrir hjálpina.
that	sá; það	Sú bók er mín.
the	ákveðinn greinir í ensku	Teið er volgt.
theatre	leikhús	Leikhúsið er nálægt stöðinni.
their	þeirra	Húsið þeirra er stórt.
them	þá; þeim	Ég þekki þá.
then	þá; síðan	Borðaðu, síðan lærðu.
there	þar; er	Þar er stóll.
they	þeir; þær	Þau eru í skólanum.
thing	hlutur; atriði	Þessi hlutur er gagnlegur.
think	hugsa	Ég hugsa um heimilið.
third	þriðji; þriðjungur	Þetta er þriðja kennslustundin.
thirsty	þyrstur	Ég er þyrstur.
thirteen	þrettán	Hann er þrettán ára.
thirty	þrjátíu	Systir mín er þrítug.
this	þessi; þetta	Þessi miði er nýr.
thousand	þúsund	Þúsund manns komu.
three	þrír; þrjár	Ég sé þrjá fugla.
through	í gegnum	Við göngum í gegnum garðinn.
Thursday	fimmtudagur	Við hittumst á fimmtudag.
ticket	miði	Ég þarf miða.
time	tími; klukka	Hvað er klukkan?
tired	þreyttur	Ég er þreyttur.
title	titill; fyrirsögn	Lestu titilinn.
to	til; að	Ég fer í tíma.
today	í dag	Það er sól í dag.
together	saman	Við borðum saman.
toilet	klósett	Klósettið er hreint.
tomato	tómatur	Þessi tómatur er rauður.
tomorrow	á morgun	Við sjáumst á morgun.
tonight	í kvöld	Við lærum í kvöld.
too	líka; of	Ég vil líka te.
tooth	tönn	Tönnin mín er sár.
topic	efni	Veldu efni.
tourist	ferðamaður	Ferðamaðurinn tekur mynd.
town	bær; kaupstaður	Þessi bær er rólegur.
traffic	umferð	Umferðin er hæg.
train	lest; æfa	Lestin er sein.
travel	ferðast; ferðalag	Við ferðumst með lest.
tree	tré	Tréð er hátt.
trip	ferð	Ferðin byrjar á morgun.
trousers	buxur	Buxurnar mínar eru svartar.
true	sannur; réttur	Þessi saga er sönn.
try	reyna	Prófaðu þetta te.
T-shirt	bolur	Ég er í bol.
Tuesday	þriðjudagur	Við hittumst á þriðjudag.
turn	beygja; röð	Beygðu til vinstri hér.
TV	sjónvarp	Sjónvarpið er hátt.
twelve	tólf	Ég á tólf blýanta.
twenty	tuttugu	Hér eru tuttugu nemendur.
twice	tvisvar	Ég syndi tvisvar í viku.
two	tveir; tvær	Tveir menn bíða.
type	gerð; tegund; vélrita	Hvaða tegund tónlistar viltu?
umbrella	regnhlíf	Taktu regnhlíf.
uncle	frændi; föðurbróðir	Frændi minn er vingjarnlegur.
under	undir	Taskan er undir borðinu.
understand	skilja	Ég skil spurninguna.
university	háskóli	Háskólinn er nálægt.
until	þangað til	Bíddu til klukkan fimm.
up	upp; uppi	Stattu upp núna.
upstairs	uppi; á efri hæð	Herbergið mitt er uppi.
us	okkur	Hjálpaðu okkur, vinsamlegast.
use	nota; notkun	Notaðu þennan penna.
useful	gagnlegur	Þetta kort er gagnlegt.
usually	venjulega	Ég fer venjulega heim gangandi.
vacation	frí	Fríið okkar byrjar á morgun.
vegetable	grænmeti	Gulrót er grænmeti.
very	mjög	Herbergið er mjög hljótt.
video	myndband	Horfðu á þetta myndband.
village	þorp	Þorpið er lítið.
visit	heimsækja	Við heimsækjum frænku.
visitor	gestur	Gesturinn bíður úti.
wait	bíða	Bíddu hér, vinsamlegast.
waiter	þjónn	Þjónninn kemur með te.
wake	vakna; vekja	Ég vakna snemma.
walk	ganga; gönguferð	Við göngum í skólann.
wall	veggur	Veggurinn er hvítur.
want	vilja	Ég vil vatn.
warm	hlýr; hita	Herbergið er hlýtt.
wash	þvo	Þvoðu hendurnar.
watch	horfa; úr	Ég horfi á sjónvarp.
water	vatn; vökva	Drekktu smá vatn.
way	leið; háttur	Þessi leið er stutt.
we	við	Við lærum ensku.
wear	vera í; klæðast	Ég er í kápu.
weather	veður	Veðrið er kalt.
website	vefsíða	Þessi vefsíða er gagnleg.
Wednesday	miðvikudagur	Tíminn byrjar á miðvikudag.
week	vika	Þessi vika er annasöm.
weekend	helgi	Helgin byrjar á morgun.
welcome	velkominn; bjóða velkominn	Velkomin í tímann okkar.
well	vel	Hún syngur vel.
west	vestur	Sólin sest í vestri.
what	hvað	Hvað er þarna?
when	hvenær	Hvenær lærir þú?
where	hvar	Hvar er stöðin?
which	hvor; hvaða	Hvaða taska er þín?
white	hvítur	Veggurinn er hvítur.
who	hver	Hver er þar?
why	af hverju	Af hverju ert þú seinn?
wife	eiginkona	Eiginkona hans er kennari.
will modal	mun; skal	Ég mun hjálpa þér.
win	vinna	Liðið okkar getur unnið.
window	gluggi	Opnaðu gluggann.
wine	vín	Þetta vín er rautt.
winter	vetur	Veturinn er kaldur hér.
with	með	Komdu með mér.
without	án	Te án sykurs er gott.
woman	kona	Kona les bók.
wonderful	dásamlegur	Útsýnið er dásamlegt.
word	orð	Skrifaðu eitt orð.
work	vinna; starf	Ég vinn heima.
worker	starfsmaður	Starfsmaðurinn er upptekinn.
world	heimur	Heimurinn er stór.
would modal	myndi; vildi	Ég myndi vilja te.
write	skrifa	Skrifaðu nafnið þitt.
writer	rithöfundur	Rithöfundurinn býr hér.
writing	skrif; rithönd	Rithönd hennar er skýr.
wrong	rangur	Þetta svar er rangt.
yeah	já; jú	Já, ég get komið.
year	ár	Þetta ár er gott.
yellow	gulur	Bananinn er gulur.
yes	já	Já, ég skil.
yesterday	í gær	Ég hringdi í gær.
you	þú; þið	Þú ert vinur minn.
young	ungur	Barnið er ungt.
your	þinn; ykkar	Taskan þín er hér.
yourself	sjálfur; sjálfa þig	Fáðu þér te.`;

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
  const lines = IS_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tIS\texample_IS") {
    throw new Error("Unexpected IS translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad IS translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad IS translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad IS translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad IS translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad IS example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate IS translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing IS translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`IS translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_is_v1",
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
    IS: translation.display,
    example_IS: translation.example,
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
    "Generate the next support-language batch in language order: HI.",
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
    "- Article display: false; Icelandic uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: IS Latin-script display/example cells and no non-Latin script",
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
