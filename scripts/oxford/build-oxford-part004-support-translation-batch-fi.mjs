#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "FI";
const BATCH_ID = "fi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-fi.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const FI_TRANSLATIONS_TSV = `source_headword	FI	example_FI
take	ottaa; viedä	Ota lippu.
talk	puhua; keskustelu	Puhumme tunnin jälkeen.
tall	pitkä	Opettajani on pitkä.
taxi	taksi	Taksi on ulkona.
tea	tee	Tämä tee on kuumaa.
teach	opettaa	Opetan englantia.
teacher	opettaja	Opettaja hymyilee.
team	joukkue; tiimi	Joukkueemme voittaa tänään.
teenager	teini-ikäinen	Teini lukee kirjaa.
telephone	puhelin; soittaa	Puhelin on pöydällä.
television	televisio	Televisio on uusi.
tell	kertoa; sanoa	Kerro minulle nimesi.
ten	kymmenen	Minulla on kymmenen kirjaa.
tennis	tennis	Pelaamme tennistä tänään.
terrible	kauhea; hirveä	Sää on kauhea.
test	koe; testi	Koe alkaa nyt.
text	tekstiviesti; teksti	Lähetä lyhyt viesti.
than	kuin	Kymmenen on enemmän kuin kaksi.
thank	kiittää	Kiitä opettajaasi.
thanks	kiitos	Kiitos avustasi.
that	tuo; se	Tuo kirja on minun.
the	englannin määräinen artikkeli	Tee on lämmintä.
theatre	teatteri	Teatteri on lähellä asemaa.
their	heidän	Heidän talonsa on iso.
them	heidät; heitä	Tunnen heidät.
then	sitten; sen jälkeen	Syö, sitten opiskele.
there	siellä; on	Siellä on tuoli.
they	he	He ovat koulussa.
thing	asia; esine	Tämä asia on hyödyllinen.
think	ajatella	Ajattelen kotia.
third	kolmas; kolmasosa	Tämä on kolmas oppitunti.
thirsty	janoinen	Olen janoinen.
thirteen	kolmetoista	Hän on kolmetoista.
thirty	kolmekymmentä	Siskoni on kolmekymmentä.
this	tämä	Tämä lippu on uusi.
thousand	tuhat	Tuhat ihmistä tuli.
three	kolme	Näen kolme lintua.
through	läpi; kautta	Kävelemme puiston läpi.
Thursday	torstai	Tapaamme torstaina.
ticket	lippu	Tarvitsen lipun.
time	aika; kello	Paljonko kello on?
tired	väsynyt	Olen väsynyt.
title	otsikko; nimi	Lue otsikko.
to	-lle; kohti; tekemään	Menen tunnille.
today	tänään; tämä päivä	Tänään on aurinkoista.
together	yhdessä	Syömme yhdessä.
toilet	wc; vessa	Vessa on puhdas.
tomato	tomaatti	Tämä tomaatti on punainen.
tomorrow	huomenna; huominen	Nähdään huomenna.
tonight	tänä iltana	Opiskelemme tänä iltana.
too	myös; liian	Haluan myös teetä.
tooth	hammas	Hammastani särkee.
topic	aihe	Valitse aihe.
tourist	turisti	Turisti ottaa valokuvia.
town	kaupunki; pikkukaupunki	Tämä kaupunki on hiljainen.
traffic	liikenne	Liikenne on hidasta.
train	juna; harjoitella	Juna on myöhässä.
travel	matkustaa; matka	Matkustamme junalla.
tree	puu	Puu on korkea.
trip	matka; retki	Matka alkaa huomenna.
trousers	housut	Housuni ovat mustat.
true	totta; oikea	Tuo tarina on totta.
try	yrittää; kokeilla	Kokeile tätä teetä.
T-shirt	T-paita	Käytän T-paitaa.
Tuesday	tiistai	Tapaamme tiistaina.
turn	kääntyä; vuoro	Käänny vasemmalle tästä.
TV	televisio; TV	Televisio on äänekäs.
twelve	kaksitoista	Minulla on kaksitoista kynää.
twenty	kaksikymmentä	Täällä on kaksikymmentä opiskelijaa.
twice	kahdesti; kaksi kertaa	Uin kahdesti viikossa.
two	kaksi	Kaksi ihmistä odottaa.
type	tyyppi; laji	Minkä tyyppistä musiikkia?
umbrella	sateenvarjo	Ota sateenvarjo.
uncle	setä; eno	Setäni on ystävällinen.
under	alla	Laukku on pöydän alla.
understand	ymmärtää	Ymmärrän kysymyksen.
university	yliopisto	Yliopisto on lähellä.
until	kunnes; asti	Odota viiteen asti.
up	ylös; yllä	Nouse ylös nyt.
upstairs	yläkerrassa	Huoneeni on yläkerrassa.
us	meidät; meitä	Auta meitä.
use	käyttää; käyttö	Käytä tätä kynää.
useful	hyödyllinen	Tämä kartta on hyödyllinen.
usually	yleensä; tavallisesti	Kävelen yleensä kotiin.
vacation	loma	Lomamme alkaa huomenna.
vegetable	vihannes; kasvis	Porkkana on vihannes.
very	hyvin; erittäin	Huone on hyvin hiljainen.
video	video	Katso tämä video.
village	kylä	Kylä on pieni.
visit	käydä; vierailla	Käymme tätimme luona.
visitor	vierailija	Vierailija odottaa ulkona.
wait	odottaa	Odota tässä, kiitos.
waiter	tarjoilija	Tarjoilija tuo teetä.
wake	herätä; herättää	Herään aikaisin.
walk	kävellä; kävely	Kävelemme kouluun.
wall	seinä	Seinä on valkoinen.
want	haluta	Haluan vettä.
warm	lämmin; lämmittää	Huone on lämmin.
wash	pestä	Pese kätesi.
watch	katsoa; kello	Katson televisiota.
water	vesi; kastella	Juo vähän vettä.
way	tie; tapa	Tämä tie on lyhyt.
we	me	Opiskelemme englantia.
wear	käyttää; pitää yllä	Käytän takkia.
weather	sää	Sää on kylmä.
website	verkkosivusto	Verkkosivusto on hyödyllinen.
Wednesday	keskiviikko	Tunti alkaa keskiviikkona.
week	viikko	Tämä viikko on kiireinen.
weekend	viikonloppu	Viikonloppu alkaa huomenna.
welcome	tervetuloa; toivottaa tervetulleeksi	Tervetuloa luokkaamme.
well	hyvin; hyvä	Hän laulaa hyvin.
west	länsi	Aurinko laskee lännessä.
what	mikä; mitä	Mikä tuo on?
when	milloin; kun	Milloin opiskelet?
where	missä; minne	Missä asema on?
which	mikä; kumpi	Mikä laukku on sinun?
white	valkoinen	Seinä on valkoinen.
who	kuka	Kuka tuo on?
why	miksi	Miksi olet myöhässä?
wife	vaimo	Hänen vaimonsa on opettaja.
will modal	tulee; aikoo	Autan sinua.
win	voittaa	Joukkueemme voi voittaa.
window	ikkuna	Avaa ikkuna.
wine	viini	Tämä viini on punaista.
winter	talvi	Talvi on täällä kylmä.
with	kanssa; -lla/-llä	Tule kanssani.
without	ilman	Tee ilman sokeria on hyvä.
woman	nainen	Nainen lukee kirjaa.
wonderful	ihana; upea	Näkymä on upea.
word	sana	Kirjoita yksi sana.
work	työskennellä; työ	Työskentelen kotona.
worker	työntekijä	Työntekijä on kiireinen.
world	maailma	Maailma on suuri.
would modal	haluaisi; -isi	Haluaisin teetä.
write	kirjoittaa	Kirjoita nimesi.
writer	kirjailija	Kirjailija asuu täällä.
writing	kirjoittaminen; käsiala	Hänen käsialansa on selvä.
wrong	väärä; väärin	Tämä vastaus on väärä.
yeah	joo; kyllä	Joo, voin tulla.
year	vuosi	Tämä vuosi on hyvä.
yellow	keltainen	Banaani on keltainen.
yes	kyllä	Kyllä, ymmärrän.
yesterday	eilen	Soitin eilen.
you	sinä; te	Sinä olet ystäväni.
young	nuori	Lapsi on nuori.
your	sinun; teidän	Laukkusi on täällä.
yourself	itse; sinä itse	Ota itse teetä.`;

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
  const lines = FI_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tFI\texample_FI") {
    throw new Error("Unexpected FI translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad FI translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad FI translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad FI translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad FI translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad FI example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate FI translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing FI translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`FI translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_fi_v1",
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
    FI: translation.display,
    example_FI: translation.example,
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
    "Generate the next support-language batch in language order: CS.",
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
    "- Article display: false; Finnish uses normal base/citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: FI Latin-script display/example cells and no non-Latin script",
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
