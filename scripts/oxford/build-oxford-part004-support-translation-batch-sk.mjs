#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SK";
const BATCH_ID = "sk_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-sk.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SK_TRANSLATIONS_TSV = `source_headword	SK	example_SK
take	vziať; brať	Vezmi lístok.
talk	hovoriť; rozhovor	Hovoríme po hodine.
tall	vysoký	Môj učiteľ je vysoký.
taxi	taxík; taxi	Taxík je vonku.
tea	čaj	Tento čaj je horúci.
teach	učiť	Učím angličtinu.
teacher	učiteľ; učiteľka	Učiteľ sa usmieva.
team	tím; družstvo	Náš tím dnes vyhrá.
teenager	tínedžer; dospievajúci	Tínedžer číta knihu.
telephone	telefón; telefonovať	Telefón je na stole.
television	televízia	Televízia je nová.
tell	povedať; rozprávať	Povedz mi svoje meno.
ten	desať	Mám desať kníh.
tennis	tenis	Dnes hráme tenis.
terrible	hrozný; strašný	Počasie je hrozné.
test	test; skúška	Test sa začína teraz.
text	textová správa; text	Pošli krátku správu.
than	než; ako	Desať je viac než dve.
thank	poďakovať	Poďakuj svojmu učiteľovi.
thanks	vďaka; ďakujem	Ďakujem za pomoc.
that	tamten; to	Tamta kniha je moja.
the	anglický určitý člen	Čaj je teplý.
theatre	divadlo	Divadlo je blízko stanice.
their	ich	Ich dom je veľký.
them	ich; im	Poznám ich.
then	potom; vtedy	Jedz, potom sa uč.
there	tam; je	Je tam stolička.
they	oni; ony	Sú v škole.
thing	vec	Táto vec je užitočná.
think	myslieť	Myslím na domov.
third	tretí; tretina	Toto je tretia lekcia.
thirsty	smädný	Som smädný.
thirteen	trinásť	Má trinásť rokov.
thirty	tridsať	Moja sestra má tridsať rokov.
this	tento; táto; toto	Tento lístok je nový.
thousand	tisíc	Prišlo tisíc ľudí.
three	tri	Vidím tri vtáky.
through	cez; skrz	Ideme cez park.
Thursday	štvrtok	Stretneme sa vo štvrtok.
ticket	lístok; cestovný lístok	Potrebujem lístok.
time	čas; hodiny	Koľko je hodín?
tired	unavený	Som unavený.
title	názov; titul	Prečítaj názov.
to	do; k; infinitívna častica	Idem do triedy.
today	dnes; dnešok	Dnes je slnečno.
together	spolu; spoločne	Jeme spolu.
toilet	toaleta	Toaleta je čistá.
tomato	paradajka	Táto paradajka je červená.
tomorrow	zajtra; zajtrajšok	Uvidíme sa zajtra.
tonight	dnes večer	Dnes večer sa učíme.
too	tiež; príliš	Chcem tiež čaj.
tooth	zub	Bolí ma zub.
topic	téma	Vyber tému.
tourist	turista	Turista fotí.
town	mesto; mestečko	Toto mesto je tiché.
traffic	doprava	Doprava je pomalá.
train	vlak; trénovať	Vlak mešká.
travel	cestovať; cesta	Cestujeme vlakom.
tree	strom	Strom je vysoký.
trip	výlet; cesta	Výlet sa začína zajtra.
trousers	nohavice	Moje nohavice sú čierne.
true	pravdivý; pravda	Ten príbeh je pravdivý.
try	skúsiť; snažiť sa	Skús tento čaj.
T-shirt	tričko	Mám na sebe tričko.
Tuesday	utorok	Stretneme sa v utorok.
turn	otočiť; odbočiť; rad	Tu odboč doľava.
TV	televízia; TV	Televízia je hlasná.
twelve	dvanásť	Mám dvanásť pier.
twenty	dvadsať	Je tu dvadsať študentov.
twice	dvakrát	Plávam dvakrát týždenne.
two	dva; dve	Čakajú dvaja ľudia.
type	typ; druh	Aký typ hudby?
umbrella	dáždnik	Vezmi dáždnik.
uncle	strýko; ujo	Môj strýko je láskavý.
under	pod	Taška je pod stolom.
understand	rozumieť	Rozumiem otázke.
university	univerzita	Univerzita je blízko.
until	kým; do	Počkaj do piatej.
up	hore; nahor	Vstaň teraz.
upstairs	hore; na poschodí	Moja izba je hore.
us	nás; nám	Pomôž nám.
use	použiť; používať	Použi toto pero.
useful	užitočný	Táto mapa je užitočná.
usually	zvyčajne; obyčajne	Zvyčajne idem domov pešo.
vacation	dovolenka; prázdniny	Naša dovolenka sa začína zajtra.
vegetable	zelenina	Mrkva je zelenina.
very	veľmi; moc	Izba je veľmi tichá.
video	video	Pozri si toto video.
village	dedina	Dedina je malá.
visit	navštíviť	Navštívime našu tetu.
visitor	návštevník	Návštevník čaká vonku.
wait	čakať	Čakaj tu, prosím.
waiter	čašník	Čašník nesie čaj.
wake	zobudiť sa; zobudiť	Budím sa skoro.
walk	ísť pešo; prechádzka	Ideme pešo do školy.
wall	stena	Stena je biela.
want	chcieť	Chcem vodu.
warm	teplý; zahriať	Izba je teplá.
wash	umyť; umývať	Umy si ruky.
watch	pozerať; hodinky	Pozerám televíziu.
water	voda; polievať	Napi sa vody.
way	cesta; spôsob	Táto cesta je krátka.
we	my	Učíme sa anglicky.
wear	nosiť; mať na sebe	Mám na sebe bundu.
weather	počasie	Počasie je chladné.
website	webová stránka	Táto stránka je užitočná.
Wednesday	streda	Hodina sa začína v stredu.
week	týždeň	Tento týždeň je rušný.
weekend	víkend	Víkend sa začína zajtra.
welcome	vítať; vitaj	Vitaj v našej triede.
well	dobre; dobrý	Spieva dobre.
west	západ	Slnko zapadá na západe.
what	čo; aký	Čo je tamto?
when	kedy; keď	Kedy sa učíš?
where	kde; kam	Kde je stanica?
which	ktorý; aký	Ktorá taška je tvoja?
white	biely	Stena je biela.
who	kto	Kto je tamto?
why	prečo	Prečo meškáš?
wife	manželka	Jeho manželka je učiteľka.
will modal	budem; bude	Pomôžem ti.
win	vyhrať	Náš tím môže vyhrať.
window	okno	Otvor okno.
wine	víno	Toto víno je červené.
winter	zima	Zima je tu studená.
with	s; so	Poď so mnou.
without	bez	Čaj bez cukru je dobrý.
woman	žena	Žena číta knihu.
wonderful	nádherný; skvelý	Výhľad je skvelý.
word	slovo	Napíš jedno slovo.
work	pracovať; práca	Pracujem doma.
worker	pracovník; robotník	Pracovník je zaneprázdnený.
world	svet	Svet je veľký.
would modal	by; rád by som	Rád by som čaj.
write	písať	Napíš svoje meno.
writer	spisovateľ	Spisovateľ žije tu.
writing	písanie; rukopis	Jej rukopis je jasný.
wrong	zlý; nesprávne	Táto odpoveď je nesprávna.
yeah	hej; áno	Hej, môžem prísť.
year	rok	Tento rok je dobrý.
yellow	žltý	Banán je žltý.
yes	áno	Áno, rozumiem.
yesterday	včera	Volal som včera.
you	ty; vy	Si môj priateľ.
young	mladý	Dieťa je mladé.
your	tvoj; váš	Tvoja taška je tu.
yourself	sám seba; sama seba	Nalej si čaj.`;

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
  const lines = SK_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tSK\texample_SK") {
    throw new Error("Unexpected SK translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad SK translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad SK translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad SK translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad SK translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad SK example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate SK translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing SK translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`SK translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_sk_v1",
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
    SK: translation.display,
    example_SK: translation.example,
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
    "Generate the next support-language batch in language order: HU.",
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
    "- Article display: false; Slovak uses normal base/citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: SK Latin-script display/example cells and no non-Latin script",
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
