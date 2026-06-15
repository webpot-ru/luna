#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "NO";
const BATCH_ID = "no_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-no.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NO_TRANSLATIONS_TSV = `source_headword	NO	example_NO
take	ta; ta med	Ta denne billetten.
talk	snakke; en samtale	Vi snakker etter timen.
tall	høy	Læreren min er høy.
taxi	en taxi	Taxien står utenfor.
tea	te	Denne teen er varm.
teach	undervise; lære bort	Jeg underviser i engelsk.
teacher	en lærer	Læreren smiler.
team	et lag; et team	Laget vårt vinner i dag.
teenager	en tenåring	Tenåringen leser en bok.
telephone	en telefon; telefonere	Telefonen ligger på skrivebordet.
television	tv; et fjernsyn	Denne tv-en er ny.
tell	fortelle; si	Fortell meg navnet ditt.
ten	ti	Jeg har ti bøker.
tennis	tennis	Vi spiller tennis i dag.
terrible	forferdelig; fryktelig	Været er forferdelig.
test	en test; en prøve	Testen begynner nå.
text	en tekstmelding; sende melding	Send en kort melding.
than	enn	Ti er mer enn to.
thank	takke	Takk læreren.
thanks	takk	Takk for hjelpen.
that	den der; det der	Den boken er min.
the	engelsk bestemt artikkel	Ordet er en engelsk artikkel.
theatre	et teater	Teateret ligger nær stasjonen.
their	deres	Huset deres er stort.
them	dem	Jeg kjenner dem.
then	så; deretter	Spis, så studerer du.
there	der; det finnes	Det står en stol der.
they	de	De er på skolen.
thing	en ting; en sak	Denne tingen er nyttig.
think	tenke	Jeg tenker på hjemmet.
third	tredje; en tredjedel	Dette er tredje leksjon.
thirsty	tørst	Jeg er tørst.
thirteen	tretten	Hun er tretten år.
thirty	tretti	Søsteren min er tretti år.
this	denne; dette	Denne billetten er ny.
thousand	tusen	Tusen personer kom.
three	tre	Jeg ser tre fugler.
through	gjennom	Vi går gjennom parken.
Thursday	torsdag	Vi møtes på torsdag.
ticket	en billett	Jeg trenger en billett.
time	tid; klokkeslett	Hva er klokka?
tired	trøtt	Jeg er trøtt.
title	en tittel	Les tittelen.
to	til; å	Jeg går til timen.
today	i dag	I dag er det sol.
together	sammen	Vi spiser sammen.
toilet	et toalett	Toalettet er rent.
tomato	en tomat	Tomaten er rød.
tomorrow	i morgen	Vi ses i morgen.
tonight	i kveld	Vi studerer i kveld.
too	også; for	Jeg vil også ha te.
tooth	en tann	Tannen min gjør vondt.
topic	et tema	Velg et tema.
tourist	en turist	Turisten tar et bilde.
town	en by; et tettsted	Denne byen er rolig.
traffic	trafikk	Trafikken går sakte.
train	et tog; trene	Toget er sent.
travel	reise; en reise	Vi reiser med tog.
tree	et tre	Treet er høyt.
trip	en tur; en reise	Turen begynner i morgen.
trousers	bukser	Buksene mine er svarte.
true	sann; ekte	Historien er sann.
try	prøve; forsøke	Prøv denne teen.
T-shirt	en T-skjorte	Jeg har på meg en T-skjorte.
Tuesday	tirsdag	Vi møtes på tirsdag.
turn	svinge; en tur	Sving til venstre her.
TV	en tv	Tv-en er høylytt.
twelve	tolv	Jeg har tolv penner.
twenty	tjue	Det er tjue elever her.
twice	to ganger	Jeg svømmer to ganger i uken.
two	to	To personer venter.
type	en type; et slag	Hvilken type musikk er dette?
umbrella	en paraply	Ta med en paraply.
uncle	en onkel	Onkelen min er snill.
under	under	Vesken ligger under bordet.
understand	forstå	Jeg forstår spørsmålet.
university	et universitet	Universitetet ligger nær.
until	til; fram til	Vent til klokka fem.
up	opp; oppe	Stå opp nå.
upstairs	oppe; i andre etasje	Rommet mitt er oppe.
us	oss	Hjelp oss.
use	bruke	Bruk denne pennen.
useful	nyttig; brukbar	Kartet er nyttig.
usually	vanligvis; som regel	Jeg går vanligvis hjem.
vacation	ferie	Ferien vår begynner i morgen.
vegetable	en grønnsak	En gulrot er en grønnsak.
very	veldig; svært	Rommet er veldig stille.
video	en video	Se denne videoen.
village	en landsby	Landsbyen er liten.
visit	besøke	Vi besøker tanten vår.
visitor	en besøkende	Den besøkende venter utenfor.
wait	vente	Vent her.
waiter	en kelner	Kelneren kommer med te.
wake	våkne; vekke	Jeg våkner tidlig.
walk	gå; en tur	Vi går til skolen.
wall	en vegg	Veggen er hvit.
want	ville; ønske	Jeg vil ha vann.
warm	varm; varme	Rommet er varmt.
wash	vaske	Vask hendene dine.
watch	se på; en klokke	Jeg ser på TV.
water	vann; vanne	Drikk litt vann.
way	en vei; en måte	Denne veien er kort.
we	vi	Vi lærer engelsk.
wear	ha på seg; bære	Jeg har på meg en jakke.
weather	vær	Været er kaldt.
website	et nettsted; en nettside	Dette nettstedet er nyttig.
Wednesday	onsdag	Timen begynner på onsdag.
week	en uke	Denne uken er travel.
weekend	en helg	Helgen begynner i morgen.
welcome	velkommen; ønske velkommen	Velkommen til klassen vår.
well	bra; godt	Hun synger bra.
west	vest	Solen går ned i vest.
what	hva	Hva er dette?
when	når	Når studerer du?
where	hvor	Hvor ligger stasjonen?
which	hvilken; hvilket	Hvilken veske er din?
white	hvit; hvitt	Veggen er hvit.
who	hvem	Hvem er det?
why	hvorfor	Hvorfor er du sen?
wife	en kone; en hustru	Kona hans er lærer.
will modal	skal; kommer til å	Jeg skal hjelpe deg.
win	vinne	Laget vårt kan vinne.
window	et vindu	Åpne vinduet.
wine	vin	Denne vinen er rød.
winter	vinter	Vinteren er kald her.
with	med	Kom med meg.
without	uten	Te uten sukker er også godt.
woman	en kvinne	Kvinnen leser en bok.
wonderful	fantastisk; nydelig	Utsikten er fantastisk.
word	et ord	Skriv ett ord.
work	arbeide; jobb	Jeg jobber hjemme.
worker	en arbeider; en ansatt	Arbeideren er opptatt.
world	verden; en verden	Verden er stor.
would modal	ville; skulle	Jeg vil gjerne ha te.
write	skrive	Skriv navnet ditt.
writer	en forfatter	Forfatteren bor her.
writing	skriving; håndskrift	Håndskriften hennes er tydelig.
wrong	feil; gal	Svaret er feil.
yeah	ja; klart	Ja, jeg kan komme.
year	et år	Dette året er bra.
yellow	gul; gult	Bananen er gul.
yes	ja	Ja, jeg forstår.
yesterday	i går	Jeg ringte i går.
you	du; dere	Du er vennen min.
young	ung	Barnet er ungt.
your	din; ditt; deres	Vesken din er her.
yourself	deg selv; selv	Ta te selv.`;

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
  const lines = NO_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tNO\texample_NO") {
    throw new Error("Unexpected NO translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad NO translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad NO translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad NO translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad NO translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad NO example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate NO translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing NO translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`NO translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_no_article_display_v1",
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
    NO: translation.display,
    example_NO: translation.example,
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
    "Generate the next support-language batch in language order: DA.",
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
    "- Article display: true where grammatically useful for Norwegian nouns",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: NO Latin-script display/example cells and no non-Latin script",
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
