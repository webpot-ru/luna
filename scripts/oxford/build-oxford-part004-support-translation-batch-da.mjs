#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "DA";
const BATCH_ID = "da_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-da.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const DA_TRANSLATIONS_TSV = `source_headword	DA	example_DA
take	tage; tage med	Tag denne billet.
talk	tale; en samtale	Vi taler efter timen.
tall	høj	Min lærer er høj.
taxi	en taxa	Taxaen står udenfor.
tea	te	Denne te er varm.
teach	undervise; lære fra sig	Jeg underviser i engelsk.
teacher	en lærer	Læreren smiler.
team	et hold; et team	Vores hold vinder i dag.
teenager	en teenager	Teenageren læser en bog.
telephone	en telefon; telefonere	Telefonen ligger på skrivebordet.
television	tv; et fjernsyn	Dette fjernsyn er nyt.
tell	fortælle; sige	Fortæl mig dit navn.
ten	ti	Jeg har ti bøger.
tennis	tennis	Vi spiller tennis i dag.
terrible	forfærdelig; frygtelig	Vejret er forfærdeligt.
test	en test; en prøve	Testen begynder nu.
text	en sms; en tekstbesked	Send en kort besked.
than	end	Ti er mere end to.
thank	takke	Tak læreren.
thanks	tak	Tak for hjælpen.
that	den der; det der	Den bog er min.
the	engelsk bestemt artikel	Ordet er en engelsk artikel.
theatre	et teater	Teatret ligger nær stationen.
their	deres	Deres hus er stort.
them	dem	Jeg kender dem.
then	så; derefter	Spis, så studerer du.
there	der; der er	Der står en stol der.
they	de	De er i skole.
thing	en ting; en sag	Denne ting er nyttig.
think	tænke	Jeg tænker på hjemmet.
third	tredje; en tredjedel	Dette er tredje lektion.
thirsty	tørstig	Jeg er tørstig.
thirteen	tretten	Hun er tretten år.
thirty	tredive	Min søster er tredive år.
this	denne; dette	Denne billet er ny.
thousand	tusind	Tusind personer kom.
three	tre	Jeg ser tre fugle.
through	gennem	Vi går gennem parken.
Thursday	torsdag	Vi mødes på torsdag.
ticket	en billet	Jeg har brug for en billet.
time	tid; klokken	Hvad er klokken?
tired	træt	Jeg er træt.
title	en titel	Læs titlen.
to	til; at	Jeg går til timen.
today	i dag	I dag er det solrigt.
together	sammen	Vi spiser sammen.
toilet	et toilet	Toilettet er rent.
tomato	en tomat	Tomaten er rød.
tomorrow	i morgen	Vi ses i morgen.
tonight	i aften	Vi studerer i aften.
too	også; for	Jeg vil også have te.
tooth	en tand	Min tand gør ondt.
topic	et emne	Vælg et emne.
tourist	en turist	Turisten tager et foto.
town	en by; en lille by	Denne by er rolig.
traffic	trafik	Trafikken går langsomt.
train	et tog; træne	Toget er forsinket.
travel	rejse; en rejse	Vi rejser med tog.
tree	et træ	Træet er højt.
trip	en tur; en rejse	Turen begynder i morgen.
trousers	bukser	Mine bukser er sorte.
true	sand; ægte	Historien er sand.
try	prøve; forsøge	Prøv denne te.
T-shirt	en T-shirt	Jeg har en T-shirt på.
Tuesday	tirsdag	Vi mødes på tirsdag.
turn	dreje; en tur	Drej til venstre her.
TV	et tv	Tv'et er højt.
twelve	tolv	Jeg har tolv penne.
twenty	tyve	Der er tyve elever her.
twice	to gange	Jeg svømmer to gange om ugen.
two	to	To personer venter.
type	en type; en slags	Hvilken type musik er dette?
umbrella	en paraply	Tag en paraply med.
uncle	en onkel	Min onkel er venlig.
under	under	Tasken ligger under bordet.
understand	forstå	Jeg forstår spørgsmålet.
university	et universitet	Universitetet ligger tæt på.
until	til; indtil	Vent til klokken fem.
up	op; oppe	Stå op nu.
upstairs	ovenpå; på første sal	Mit værelse er ovenpå.
us	os	Hjælp os.
use	bruge	Brug denne pen.
useful	nyttig; brugbar	Kortet er nyttigt.
usually	normalt; som regel	Jeg går normalt hjem.
vacation	ferie	Vores ferie begynder i morgen.
vegetable	en grøntsag	En gulerod er en grøntsag.
very	meget; virkelig	Rummet er meget stille.
video	en video	Se denne video.
village	en landsby	Landsbyen er lille.
visit	besøge	Vi besøger vores tante.
visitor	en besøgende	Den besøgende venter udenfor.
wait	vente	Vent her.
waiter	en tjener	Tjeneren kommer med te.
wake	vågne; vække	Jeg vågner tidligt.
walk	gå; en gåtur	Vi går til skolen.
wall	en væg	Væggen er hvid.
want	ville; ønske	Jeg vil have vand.
warm	varm; varme	Rummet er varmt.
wash	vaske	Vask dine hænder.
watch	se på; et ur	Jeg ser tv.
water	vand; vande	Drik lidt vand.
way	en vej; en måde	Denne vej er kort.
we	vi	Vi lærer engelsk.
wear	have på; bære	Jeg har en jakke på.
weather	vejr	Vejret er koldt.
website	et websted; en hjemmeside	Dette websted er nyttigt.
Wednesday	onsdag	Timen begynder på onsdag.
week	en uge	Denne uge er travl.
weekend	en weekend	Weekenden begynder i morgen.
welcome	velkommen; byde velkommen	Velkommen til vores klasse.
well	godt; bra	Hun synger godt.
west	vest	Solen går ned i vest.
what	hvad	Hvad er dette?
when	hvornår	Hvornår studerer du?
where	hvor	Hvor ligger stationen?
which	hvilken; hvilket	Hvilken taske er din?
white	hvid; hvidt	Væggen er hvid.
who	hvem	Hvem er det?
why	hvorfor	Hvorfor er du sen?
wife	en kone; en hustru	Hans kone er lærer.
will modal	vil; skal	Jeg vil hjælpe dig.
win	vinde	Vores hold kan vinde.
window	et vindue	Åbn vinduet.
wine	vin	Denne vin er rød.
winter	vinter	Vinteren er kold her.
with	med	Kom med mig.
without	uden	Te uden sukker er også godt.
woman	en kvinde	Kvinden læser en bog.
wonderful	vidunderlig; fantastisk	Udsigten er fantastisk.
word	et ord	Skriv et ord.
work	arbejde; et arbejde	Jeg arbejder hjemme.
worker	en arbejder; en ansat	Arbejderen er optaget.
world	verden; en verden	Verden er stor.
would modal	ville; skulle	Jeg vil gerne have te.
write	skrive	Skriv dit navn.
writer	en forfatter	Forfatteren bor her.
writing	skrivning; håndskrift	Hendes håndskrift er tydelig.
wrong	forkert; fejl	Svaret er forkert.
yeah	ja; klart	Ja, jeg kan komme.
year	et år	Dette år er godt.
yellow	gul; gult	Bananen er gul.
yes	ja	Ja, jeg forstår.
yesterday	i går	Jeg ringede i går.
you	du; I	Du er min ven.
young	ung	Barnet er ungt.
your	din; dit; jeres	Din taske er her.
yourself	dig selv; selv	Tag selv te.`;

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
  const lines = DA_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tDA\texample_DA") {
    throw new Error("Unexpected DA translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad DA translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad DA translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad DA translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad DA translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad DA example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate DA translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing DA translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`DA translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_da_article_display_v1",
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
    DA: translation.display,
    example_DA: translation.example,
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
    article_display_included: true,
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
    "Generate the next support-language batch in language order: FI.",
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
    "- Article display: true where grammatically useful for Danish nouns",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: DA Latin-script display/example cells and no non-Latin script",
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
