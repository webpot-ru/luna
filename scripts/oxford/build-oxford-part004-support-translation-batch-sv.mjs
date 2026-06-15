#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SV";
const BATCH_ID = "sv_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-sv.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SV_TRANSLATIONS_TSV = `source_headword	SV	example_SV
take	ta; ta med	Ta den här biljetten.
talk	prata; ett samtal	Vi pratar efter lektionen.
tall	lång	Min lärare är lång.
taxi	en taxi	Taxin står utanför.
tea	te	Det här teet är varmt.
teach	undervisa; lära ut	Jag undervisar i engelska.
teacher	en lärare	Läraren ler.
team	ett lag; ett team	Vårt lag vinner i dag.
teenager	en tonåring	Tonåringen läser en bok.
telephone	en telefon; telefonera	Telefonen ligger på skrivbordet.
television	television; en tv	Den här tv:n är ny.
tell	berätta; säga	Berätta ditt namn för mig.
ten	tio	Jag har tio böcker.
tennis	tennis	Vi spelar tennis i dag.
terrible	hemsk; fruktansvärd	Vädret är hemskt.
test	ett prov; ett test	Provet börjar nu.
text	ett sms; ett textmeddelande; sms:a	Skicka ett kort meddelande.
than	än	Tio är mer än två.
thank	tacka	Tacka läraren.
thanks	tack; tack så mycket	Tack för hjälpen.
that	den där; det där	Den där boken är min.
the	engelsk bestämd artikel	Ordet är en engelsk artikel.
theatre	en teater	Teatern ligger nära stationen.
their	deras	Deras hus är stort.
them	dem; dom	Jag känner dem.
then	sedan; då	Ät, sedan studerar du.
there	där; det finns	Det finns en stol där.
they	de; dom	De är i skolan.
thing	en sak	Saken är användbar.
think	tänka	Jag tänker på hemmet.
third	tredje; en tredjedel	Det här är tredje lektionen.
thirsty	törstig	Jag är törstig.
thirteen	tretton	Hon är tretton år.
thirty	trettio	Min syster är trettio år.
this	den här; det här	Den här biljetten är ny.
thousand	tusen	Tusen personer kom.
three	tre	Jag ser tre fåglar.
through	genom	Vi går genom parken.
Thursday	torsdag	Vi träffas på torsdag.
ticket	en biljett	Jag behöver en biljett.
time	tid; klockan	Vad är klockan?
tired	trött	Jag är trött.
title	en titel	Läs titeln.
to	till; att	Jag går till lektionen.
today	i dag	I dag är det soligt.
together	tillsammans	Vi äter tillsammans.
toilet	en toalett	Toaletten är ren.
tomato	en tomat	Tomaten är röd.
tomorrow	i morgon	Vi ses i morgon.
tonight	i kväll	Vi studerar i kväll.
too	också; för	Jag vill också ha te.
tooth	en tand	Min tand gör ont.
topic	ett ämne	Välj ett ämne.
tourist	en turist	Turisten tar ett foto.
town	en stad; en småstad	Den här staden är lugn.
traffic	trafik	Trafiken är långsam.
train	ett tåg; träna	Tåget är sent.
travel	resa; en resa	Vi reser med tåg.
tree	ett träd	Trädet är högt.
trip	en resa; en utflykt	Resan börjar i morgon.
trousers	byxor	Mina byxor är svarta.
true	sann; riktig	Berättelsen är sann.
try	prova; försöka	Prova det här teet.
T-shirt	en T-shirt	Jag har på mig en T-shirt.
Tuesday	tisdag	Vi träffas på tisdag.
turn	svänga; en tur	Sväng vänster här.
TV	en tv	Tv:n är högljudd.
twelve	tolv	Jag har tolv pennor.
twenty	tjugo	Det finns tjugo elever här.
twice	två gånger	Jag simmar två gånger i veckan.
two	två	Två personer väntar.
type	en typ; ett slags	Vilken typ av musik är det?
umbrella	ett paraply	Ta med ett paraply.
uncle	en farbror; en morbror	Min morbror är snäll.
under	under	Väskan ligger under bordet.
understand	förstå	Jag förstår frågan.
university	ett universitet	Universitetet ligger nära.
until	tills; fram till	Vänta tills klockan fem.
up	upp; uppe	Stå upp nu.
upstairs	på övervåningen; där uppe	Mitt rum är på övervåningen.
us	oss	Hjälp oss.
use	använda	Använd den här pennan.
useful	användbar; nyttig	Kartan är användbar.
usually	vanligtvis; oftast	Jag går oftast hem.
vacation	semester; lov	Vår semester börjar i morgon.
vegetable	en grönsak	En morot är en grönsak.
very	mycket; väldigt	Rummet är väldigt tyst.
video	en video; ett videoklipp	Titta på den här videon.
village	en by	Den här byn är liten.
visit	besöka	Vi besöker vår moster.
visitor	en besökare	Besökaren väntar utanför.
wait	vänta	Vänta här.
waiter	en servitör	Servitören kommer med te.
wake	vakna; väcka	Jag vaknar tidigt.
walk	gå; en promenad	Vi går till skolan.
wall	en vägg	Väggen är vit.
want	vilja	Jag vill ha vatten.
warm	varm; värma	Rummet är varmt.
wash	tvätta	Tvätta händerna.
watch	titta på; en klocka	Jag tittar på tv.
water	vatten; vattna	Drick lite vatten.
way	en väg; ett sätt	Den här vägen är kort.
we	vi	Vi lär oss engelska.
wear	ha på sig; bära	Jag har på mig en jacka.
weather	väder	Vädret är kallt.
website	en webbplats	Webbplatsen är användbar.
Wednesday	onsdag	Lektionen börjar på onsdag.
week	en vecka	Den här veckan är upptagen.
weekend	en helg	Helgen börjar i morgon.
welcome	välkommen; välkomna	Välkommen till vår klass.
well	bra	Hon sjunger bra.
west	väster	Solen går ner i väster.
what	vad	Vad är det här?
when	när	När studerar du?
where	var	Var ligger stationen?
which	vilken; vilket	Vilken väska är din?
white	vit; vitt	Väggen är vit.
who	vem	Vem är det?
why	varför	Varför är du sen?
wife	en fru; en hustru	Hans fru är lärare.
will modal	ska; kommer att	Jag ska hjälpa dig.
win	vinna	Vårt lag kan vinna.
window	ett fönster	Öppna fönstret.
wine	vin	Det här vinet är rött.
winter	vinter	Vintern är kall här.
with	med	Kom med mig.
without	utan	Te utan socker är också bra.
woman	en kvinna	Kvinnan läser en bok.
wonderful	underbar; fantastisk	Utsikten är underbar.
word	ett ord	Skriv ett ord.
work	arbeta; arbete	Jag arbetar hemma.
worker	en arbetare; en anställd	Arbetaren är upptagen.
world	världen; en värld	Världen är stor.
would modal	skulle; vilja	Jag skulle vilja ha te.
write	skriva	Skriv ditt namn.
writer	en författare	Författaren bor här.
writing	skrivande; handstil	Hennes handstil är tydlig.
wrong	fel; oriktig	Svaret är fel.
yeah	ja; visst	Ja, jag kan komma.
year	ett år	Det här året är bra.
yellow	gul; gult	Bananen är gul.
yes	ja	Ja, jag förstår.
yesterday	i går	Jag ringde i går.
you	du; ni	Du är min vän.
young	ung	Barnet är ungt.
your	din; ditt; dina; er	Din väska är här.
yourself	dig själv; själv	Ta te själv.`;

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
  const lines = SV_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tSV\texample_SV") {
    throw new Error("Unexpected SV translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad SV translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad SV translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad SV translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad SV translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad SV example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate SV translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing SV translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`SV translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_sv_article_display_v1",
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
    SV: translation.display,
    example_SV: translation.example,
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
    "Generate the next support-language batch in language order: NO.",
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
    "- Article display: true where grammatically useful for Swedish nouns",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: SV Latin-script display/example cells and no non-Latin script",
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
