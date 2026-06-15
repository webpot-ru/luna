#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "HU";
const BATCH_ID = "hu_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-hu.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HU_TRANSLATIONS_TSV = `source_headword	HU	example_HU
take	venni; elvinni	Vedd el a jegyet.
talk	beszélni; beszélgetés	Óra után beszélünk.
tall	magas	A tanárom magas.
taxi	taxi	A taxi kint van.
tea	tea	Ez a tea forró.
teach	tanítani	Angolt tanítok.
teacher	tanár	A tanár mosolyog.
team	csapat	A csapatunk ma nyer.
teenager	tinédzser	A tinédzser könyvet olvas.
telephone	telefon; telefonálni	A telefon az asztalon van.
television	televízió	A televízió új.
tell	mondani; elmondani	Mondd meg a nevedet.
ten	tíz	Tíz könyvem van.
tennis	tenisz	Ma teniszezünk.
terrible	szörnyű; borzasztó	Az időjárás szörnyű.
test	teszt; dolgozat	A teszt most kezdődik.
text	szöveges üzenet; szöveg	Küldj rövid üzenetet.
than	mint	Tíz több, mint kettő.
thank	megköszönni	Köszönd meg a tanárodnak.
thanks	köszönet; köszönöm	Köszönöm a segítséget.
that	az; az a	Az a könyv az enyém.
the	angol határozott névelő	A tea meleg.
theatre	színház	A színház közel van az állomáshoz.
their	az ő; az övék	Az ő házuk nagy.
them	őket; nekik	Ismerem őket.
then	aztán; akkor	Egyél, aztán tanulj.
there	ott; van	Ott van egy szék.
they	ők	Ők iskolában vannak.
thing	dolog; tárgy	Ez a dolog hasznos.
think	gondolni	Az otthonra gondolok.
third	harmadik; egyharmad	Ez a harmadik lecke.
thirsty	szomjas	Szomjas vagyok.
thirteen	tizenhárom	Tizenhárom éves.
thirty	harminc	A nővérem harminc éves.
this	ez; ez a	Ez a jegy új.
thousand	ezer	Ezer ember jött.
three	három	Három madarat látok.
through	keresztül; át	Átsétálunk a parkon.
Thursday	csütörtök	Csütörtökön találkozunk.
ticket	jegy	Jegyre van szükségem.
time	idő; óra	Mennyi az idő?
tired	fáradt	Fáradt vagyok.
title	cím; titulus	Olvasd el a címet.
to	-hoz/-hez/-höz; -ni	Az órára megyek.
today	ma; mai nap	Ma napos az idő.
together	együtt	Együtt eszünk.
toilet	vécé; mosdó	A vécé tiszta.
tomato	paradicsom	Ez a paradicsom piros.
tomorrow	holnap	Holnap találkozunk.
tonight	ma este	Ma este tanulunk.
too	is; túl	Én is kérek teát.
tooth	fog	Fáj a fogam.
topic	téma	Válassz témát.
tourist	turista	A turista fényképez.
town	város; kisváros	Ez a város csendes.
traffic	forgalom; közlekedés	A forgalom lassú.
train	vonat; edzeni	A vonat késik.
travel	utazni; utazás	Vonattal utazunk.
tree	fa	A fa magas.
trip	utazás; kirándulás	A kirándulás holnap kezdődik.
trousers	nadrág	A nadrágom fekete.
true	igaz; valódi	Ez a történet igaz.
try	megpróbálni; kipróbálni	Próbáld ki ezt a teát.
T-shirt	póló	Pólót viselek.
Tuesday	kedd	Kedden találkozunk.
turn	fordulni; kanyarodni; sor	Itt fordulj balra.
TV	tévé; televízió	A tévé hangos.
twelve	tizenkettő	Tizenkét tollam van.
twenty	húsz	Húsz diák van itt.
twice	kétszer	Hetente kétszer úszom.
two	kettő; két	Két ember vár.
type	típus; fajta	Milyen típusú zene?
umbrella	esernyő	Vigyél esernyőt.
uncle	nagybácsi	A nagybátyám kedves.
under	alatt	A táska az asztal alatt van.
understand	érteni	Értem a kérdést.
university	egyetem	Az egyetem közel van.
until	amíg; -ig	Várj ötig.
up	fel; fent	Állj fel most.
upstairs	fent; az emeleten	A szobám fent van.
us	minket; nekünk	Segíts nekünk.
use	használni; használat	Használd ezt a tollat.
useful	hasznos	Ez a térkép hasznos.
usually	általában; rendszerint	Általában hazasétálok.
vacation	vakáció; szabadság	A vakációnk holnap kezdődik.
vegetable	zöldség	A répa zöldség.
very	nagyon	A szoba nagyon csendes.
video	videó	Nézd meg ezt a videót.
village	falu	A falu kicsi.
visit	meglátogatni	Meglátogatjuk a nagynénénket.
visitor	látogató	A látogató kint vár.
wait	várni	Várj itt, kérlek.
waiter	pincér	A pincér teát hoz.
wake	felébredni; felébreszteni	Korán ébredek.
walk	sétálni; séta	Gyalog megyünk iskolába.
wall	fal	A fal fehér.
want	akarni; szeretne	Vizet akarok.
warm	meleg; felmelegíteni	A szoba meleg.
wash	mosni; megmosni	Mosd meg a kezed.
watch	nézni; karóra	Tévét nézek.
water	víz; öntözni	Igyál egy kis vizet.
way	út; mód	Ez az út rövid.
we	mi	Angolt tanulunk.
wear	viselni; hordani	Kabátot viselek.
weather	időjárás	Az időjárás hideg.
website	weboldal	Ez a weboldal hasznos.
Wednesday	szerda	Az óra szerdán kezdődik.
week	hét	Ez a hét zsúfolt.
weekend	hétvége	A hétvége holnap kezdődik.
welcome	üdvözölni; üdvözlet	Üdvözlünk az osztályunkban.
well	jól; jó	Jól énekel.
west	nyugat	A nap nyugaton megy le.
what	mi; milyen	Mi az ott?
when	mikor; amikor	Mikor tanulsz?
where	hol; hová	Hol van az állomás?
which	melyik; amelyik	Melyik táska a tiéd?
white	fehér	A fal fehér.
who	ki	Ki az ott?
why	miért	Miért késel?
wife	feleség	A felesége tanár.
will modal	fog; majd	Segíteni fogok neked.
win	nyerni	A csapatunk nyerhet.
window	ablak	Nyisd ki az ablakot.
wine	bor	Ez a bor vörös.
winter	tél	Itt hideg a tél.
with	-val/-vel; együtt	Gyere velem.
without	nélkül	A tea cukor nélkül jó.
woman	nő	A nő könyvet olvas.
wonderful	csodálatos; nagyszerű	A kilátás nagyszerű.
word	szó	Írj egy szót.
work	dolgozni; munka	Otthon dolgozom.
worker	dolgozó; munkás	A dolgozó elfoglalt.
world	világ	A világ nagy.
would modal	szeretne; -na/-ne	Szeretnék teát.
write	írni	Írd le a nevedet.
writer	író	Az író itt él.
writing	írás; kézírás	A kézírása tiszta.
wrong	rossz; hibás	Ez a válasz hibás.
yeah	igen; ja	Igen, el tudok jönni.
year	év	Ez az év jó.
yellow	sárga	A banán sárga.
yes	igen	Igen, értem.
yesterday	tegnap	Tegnap telefonáltam.
you	te; ön; ti	Te vagy a barátom.
young	fiatal	A gyerek fiatal.
your	a te; az ön	A táskád itt van.
yourself	önmagad; magad	Szolgáld ki magad teával.`;

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
  const lines = HU_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tHU\texample_HU") {
    throw new Error("Unexpected HU translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad HU translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad HU translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad HU translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad HU translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad HU example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate HU translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing HU translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`HU translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_hu_v1",
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
    HU: translation.display,
    example_HU: translation.example,
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
    "Generate the next support-language batch in language order: RO.",
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
    "- Article display: false; Hungarian uses normal base/citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: HU Latin-script display/example cells and no non-Latin script",
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
