#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "NL";
const BATCH_ID = "nl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-nl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NL_TRANSLATIONS_TSV = `source_headword	NL	example_NL
take	nemen; pakken; meenemen	Neem dit kaartje.
talk	praten; gesprek	We praten na de les.
tall	lang	Mijn leraar is lang.
taxi	de taxi	De taxi staat buiten.
tea	de thee	Deze thee is heet.
teach	lesgeven; onderwijzen	Ik geef Engels.
teacher	de leraar; de docent	De leraar glimlacht.
team	het team; de ploeg	Ons team wint vandaag.
teenager	de tiener	De tiener leest een boek.
telephone	de telefoon; telefoneren	De telefoon ligt op het bureau.
television	de televisie; de tv	Deze televisie is nieuw.
tell	vertellen; zeggen	Vertel mij je naam.
ten	tien	Ik heb tien boeken.
tennis	tennis	Wij spelen vandaag tennis.
terrible	vreselijk; verschrikkelijk	Het weer is vreselijk.
test	de toets; de test	De toets begint nu.
text	de sms; het tekstbericht; sms'en	Stuur een kort bericht.
than	dan	Tien is meer dan twee.
thank	bedanken	Bedank de leraar.
thanks	dank je; bedankt	Bedankt voor de hulp.
that	dat; die	Dat boek is van mij.
the	het Engelse bepaalde lidwoord	Dit woord is een Engels lidwoord.
theatre	het theater	Het theater is dicht bij het station.
their	hun	Hun huis is groot.
them	hen; ze	Ik ken hen.
then	dan; daarna	Eet, daarna studeer.
there	daar; er is	Daar staat een stoel.
they	zij; ze	Zij zijn op school.
thing	het ding; de zaak	Dit ding is handig.
think	denken	Ik denk aan thuis.
third	derde; een derde	Dit is de derde les.
thirsty	dorstig	Ik heb dorst.
thirteen	dertien	Zij is dertien jaar.
thirty	dertig	Mijn zus is dertig jaar.
this	dit; deze	Dit kaartje is nieuw.
thousand	duizend	Duizend mensen kwamen.
three	drie	Ik zie drie vogels.
through	door	Wij lopen door het park.
Thursday	donderdag	Wij ontmoeten elkaar donderdag.
ticket	het ticket; het kaartje	Ik heb een kaartje nodig.
time	de tijd; het uur	Hoe laat is het?
tired	moe	Ik ben moe.
title	de titel	Lees de titel.
to	naar; aan; om	Ik ga naar de les.
today	vandaag	Vandaag is het zonnig.
together	samen	Wij eten samen.
toilet	het toilet	Het toilet is schoon.
tomato	de tomaat	Deze tomaat is rood.
tomorrow	morgen	Tot morgen.
tonight	vanavond	Wij studeren vanavond.
too	ook; te	Ik wil ook thee.
tooth	de tand	Mijn tand doet pijn.
topic	het onderwerp	Kies een onderwerp.
tourist	de toerist	De toerist maakt een foto.
town	de stad; het dorp	Deze stad is rustig.
traffic	het verkeer	Het verkeer is traag.
train	de trein; trainen	De trein is te laat.
travel	reizen; de reis	Wij reizen met de trein.
tree	de boom	Deze boom is hoog.
trip	de reis; het uitstapje	De reis begint morgen.
trousers	de broek	Mijn broek is zwart.
true	waar; echt	Dit verhaal is waar.
try	proberen	Probeer deze thee.
T-shirt	het T-shirt	Ik draag een T-shirt.
Tuesday	dinsdag	Wij ontmoeten elkaar dinsdag.
turn	draaien; de afslag; de beurt	Sla hier linksaf.
TV	de tv	De tv staat hard.
twelve	twaalf	Ik heb twaalf pennen.
twenty	twintig	Er zijn twintig leerlingen hier.
twice	twee keer	Ik zwem twee keer per week.
two	twee	Twee mensen wachten.
type	het type; de soort	Wat voor soort muziek is dit?
umbrella	de paraplu	Neem een paraplu mee.
uncle	de oom	Mijn oom is aardig.
under	onder	De tas ligt onder de tafel.
understand	begrijpen	Ik begrijp de vraag.
university	de universiteit	De universiteit is dichtbij.
until	tot	Wacht tot vijf uur.
up	omhoog; boven	Sta nu op.
upstairs	boven	Mijn kamer is boven.
us	ons	Help ons.
use	gebruiken; het gebruik	Gebruik deze pen.
useful	nuttig; handig	Deze kaart is handig.
usually	meestal	Ik loop meestal naar huis.
vacation	de vakantie	Onze vakantie begint morgen.
vegetable	de groente	Een wortel is een groente.
very	erg; heel	De kamer is heel stil.
video	de video; het filmpje	Bekijk deze video.
village	het dorp	Dit dorp is klein.
visit	bezoeken; het bezoek	Wij bezoeken onze tante.
visitor	de bezoeker	De bezoeker wacht buiten.
wait	wachten	Wacht hier.
waiter	de ober	De ober brengt thee.
wake	wakker worden; wekken	Ik word vroeg wakker.
walk	lopen; de wandeling	Wij lopen naar school.
wall	de muur	De muur is wit.
want	willen	Ik wil water.
warm	warm; verwarmen	De kamer is warm.
wash	wassen	Was je handen.
watch	kijken; het horloge	Ik kijk televisie.
water	het water; water geven	Drink wat water.
way	de weg; de manier	Deze weg is kort.
we	wij; we	Wij leren Engels.
wear	dragen	Ik draag een jas.
weather	het weer	Het weer is koud.
website	de website	Deze website is handig.
Wednesday	woensdag	De les begint woensdag.
week	de week	Deze week is druk.
weekend	het weekend	Het weekend begint morgen.
welcome	welkom; verwelkomen	Welkom in onze klas.
well	goed	Zij zingt goed.
west	het westen	De zon gaat onder in het westen.
what	wat	Wat is dit?
when	wanneer	Wanneer studeer je?
where	waar	Waar is het station?
which	welke	Welke tas is van jou?
white	wit	De muur is wit.
who	wie	Wie is dat?
why	waarom	Waarom ben je te laat?
wife	de vrouw; de echtgenote	Zijn vrouw is lerares.
will modal	zullen; zal	Ik zal je helpen.
win	winnen	Ons team kan winnen.
window	het raam	Open het raam.
wine	de wijn	Deze wijn is rood.
winter	de winter	De winter is hier koud.
with	met	Kom met mij mee.
without	zonder	Thee zonder suiker is ook goed.
woman	de vrouw	De vrouw leest een boek.
wonderful	geweldig; prachtig	Het uitzicht is prachtig.
word	het woord	Schrijf één woord.
work	werken; het werk	Ik werk thuis.
worker	de werknemer; de arbeider	De werknemer is druk.
world	de wereld	De wereld is groot.
would modal	zou; graag willen	Ik zou graag thee willen.
write	schrijven	Schrijf je naam.
writer	de schrijver	De schrijver woont hier.
writing	schrijven; het handschrift	Haar handschrift is duidelijk.
wrong	verkeerd; fout	Dit antwoord is fout.
yeah	ja; zeker	Ja, ik kan komen.
year	het jaar	Dit jaar is goed.
yellow	geel	De banaan is geel.
yes	ja	Ja, ik begrijp het.
yesterday	gisteren	Ik belde gisteren.
you	jij; u; jullie	Jij bent mijn vriend.
young	jong	Het kind is jong.
your	jouw; uw; jullie	Je tas is hier.
yourself	jezelf; zelf	Neem zelf thee.`;

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
  const lines = NL_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tNL\texample_NL") {
    throw new Error("Unexpected NL translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad NL translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad NL translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad NL translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad NL translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad NL example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate NL translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing NL translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`NL translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_nl_v1",
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
    NL: translation.display,
    example_NL: translation.example,
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
    "Generate the next support-language batch in language order: SV.",
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
    "- Article display: included in Dutch display cells where grammatically useful",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: NL Latin-script display/example cells and no non-Latin script",
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
