#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "LT";
const BATCH_ID = "lt_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-lt.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LT_TRANSLATIONS_TSV = `source_headword	LT	example_LT
take	imti; paimti	Paimk bilietą.
talk	kalbėti; pokalbis	Kalbame po pamokos.
tall	aukštas	Mano mokytojas aukštas.
taxi	taksi	Taksi yra lauke.
tea	arbata	Ši arbata karšta.
teach	mokyti	Mokau anglų kalbos.
teacher	mokytojas; mokytoja	Mokytoja šypsosi.
team	komanda	Mūsų komanda šiandien laimi.
teenager	paauglys; paauglė	Paauglys skaito knygą.
telephone	telefonas; skambinti	Telefonas yra ant stalo.
television	televizorius; televizija	Televizorius naujas.
tell	pasakyti; papasakoti	Pasakyk savo vardą.
ten	dešimt	Turiu dešimt knygų.
tennis	tenisas	Šiandien žaidžiame tenisą.
terrible	baisus	Oras baisus.
test	testas; egzaminas	Testas prasideda dabar.
text	žinutė; tekstas	Siųsk trumpą žinutę.
than	nei	Dešimt yra daugiau nei du.
thank	padėkoti	Padėkok mokytojui.
thanks	ačiū; padėka	Ačiū už pagalbą.
that	tas; tai	Ta knyga mano.
the	anglų kalbos žymimasis artikelis	Arbata šilta.
theatre	teatras	Teatras yra prie stoties.
their	jų	Jų namas didelis.
them	juos; jiems	Aš juos pažįstu.
then	tada; paskui	Valgyk, paskui mokykis.
there	ten; yra	Ten yra kėdė.
they	jie; jos	Jie yra mokykloje.
thing	daiktas; dalykas	Šis daiktas naudingas.
think	galvoti	Galvoju apie namus.
third	trečias; trečdalis	Tai trečia pamoka.
thirsty	ištroškęs	Aš ištroškęs.
thirteen	trylika	Jam trylika metų.
thirty	trisdešimt	Mano seseriai trisdešimt metų.
this	šis; tai	Šis bilietas naujas.
thousand	tūkstantis	Atėjo tūkstantis žmonių.
three	trys	Matau tris paukščius.
through	per; pro	Einame per parką.
Thursday	ketvirtadienis	Susitinkame ketvirtadienį.
ticket	bilietas	Man reikia bilieto.
time	laikas; valanda	Kiek dabar valandų?
tired	pavargęs	Aš pavargęs.
title	pavadinimas	Perskaityk pavadinimą.
to	į; iki; pas	Einu į pamoką.
today	šiandien	Šiandien saulėta.
together	kartu	Valgome kartu.
toilet	tualetas	Tualetas švarus.
tomato	pomidoras	Šis pomidoras raudonas.
tomorrow	rytoj	Pasimatysime rytoj.
tonight	šiąnakt; šį vakarą	Šį vakarą mokomės.
too	taip pat; per	Aš taip pat noriu arbatos.
tooth	dantis	Man skauda dantį.
topic	tema	Pasirink temą.
tourist	turistas; turistė	Turistas fotografuoja.
town	miestas; miestelis	Šis miestelis ramus.
traffic	eismas	Eismas lėtas.
train	traukinys; treniruoti	Traukinys vėluoja.
travel	keliauti; kelionė	Keliaujame traukiniu.
tree	medis	Medis aukštas.
trip	kelionė; išvyka	Išvyka prasideda rytoj.
trousers	kelnės	Mano kelnės juodos.
true	tikras; teisingas	Ši istorija teisinga.
try	pabandyti; mėginti	Pabandyk šią arbatą.
T-shirt	marškinėliai	Dėviu marškinėlius.
Tuesday	antradienis	Susitinkame antradienį.
turn	pasukti; eilė	Čia pasuk kairėn.
TV	televizorius; TV	Televizorius garsus.
twelve	dvylika	Turiu dvylika pieštukų.
twenty	dvidešimt	Čia yra dvidešimt mokinių.
twice	du kartus	Plaukioju du kartus per savaitę.
two	du; dvi	Du žmonės laukia.
type	tipas; rūšis; spausdinti	Kokios rūšies muzikos nori?
umbrella	skėtis	Pasiimk skėtį.
uncle	dėdė	Mano dėdė malonus.
under	po	Krepšys po stalu.
understand	suprasti	Suprantu klausimą.
university	universitetas	Universitetas arti.
until	iki	Lauk iki penkių.
up	aukštyn; viršuje	Atsistok dabar.
upstairs	viršuje; antrame aukšte	Mano kambarys viršuje.
us	mus; mums	Padėk mums, prašau.
use	naudoti; naudojimas	Naudok šį rašiklį.
useful	naudingas	Šis bilietas naudingas.
usually	paprastai	Paprastai einu namo pėsčiomis.
vacation	atostogos	Mūsų atostogos prasideda rytoj.
vegetable	daržovė	Morka yra daržovė.
very	labai	Kambarys labai tylus.
video	vaizdo įrašas	Pažiūrėk šį vaizdo įrašą.
village	kaimas	Kaimas mažas.
visit	aplankyti	Aplankome tetą.
visitor	lankytojas; lankytoja	Lankytojas laukia lauke.
wait	laukti	Lauk čia, prašau.
waiter	padavėjas; padavėja	Padavėjas atneša arbatą.
wake	pabusti; pažadinti	Pabundu anksti.
walk	eiti; pasivaikščiojimas	Einame į mokyklą.
wall	siena	Siena balta.
want	norėti	Noriu vandens.
warm	šiltas; sušildyti	Kambarys šiltas.
wash	plauti	Nusiplauk rankas.
watch	žiūrėti; laikrodis	Žiūriu televiziją.
water	vanduo; laistyti	Gerk truputį vandens.
way	kelias; būdas	Šis kelias trumpas.
we	mes	Mokomės anglų kalbos.
wear	dėvėti	Dėviu paltą.
weather	oras	Oras šaltas.
website	svetainė	Ši svetainė naudinga.
Wednesday	trečiadienis	Pamoka prasideda trečiadienį.
week	savaitė	Ši savaitė užimta.
weekend	savaitgalis	Savaitgalis prasideda rytoj.
welcome	sveikas atvykęs; pasveikinti	Sveikas atvykęs į pamoką.
well	gerai	Ji gerai dainuoja.
west	vakarai	Saulė leidžiasi vakaruose.
what	kas; koks	Kas ten yra?
when	kada	Kada mokaisi?
where	kur	Kur yra stotis?
which	kuris	Kuris krepšys tavo?
white	baltas	Siena balta.
who	kas	Kas ten yra?
why	kodėl	Kodėl vėluoji?
wife	žmona	Jo žmona yra mokytoja.
will modal	bus; darysiu	Aš tau padėsiu.
win	laimėti	Mūsų komanda gali laimėti.
window	langas	Atidaryk langą.
wine	vynas	Šis vynas raudonas.
winter	žiema	Žiema čia šalta.
with	su	Ateik su manimi.
without	be	Arbata be cukraus gera.
woman	moteris	Moteris skaito knygą.
wonderful	nuostabus	Vaizdas nuostabus.
word	žodis	Parašyk vieną žodį.
work	dirbti; darbas	Dirbu namuose.
worker	darbuotojas; darbuotoja	Darbuotojas užsiėmęs.
world	pasaulis	Pasaulis didelis.
would modal	norėčiau; būtų	Norėčiau arbatos.
write	rašyti	Parašyk savo vardą.
writer	rašytojas; rašytoja	Rašytojas gyvena čia.
writing	rašymas; rašysena	Jos rašysena aiški.
wrong	neteisingas	Šis atsakymas neteisingas.
yeah	taip; jo	Taip, galiu ateiti.
year	metai	Šie metai geri.
yellow	geltonas	Bananas geltonas.
yes	taip	Taip, suprantu.
yesterday	vakar	Vakar skambinau telefonu.
you	tu; jūs	Tu esi mano draugas.
young	jaunas	Vaikas jaunas.
your	tavo; jūsų	Tavo krepšys čia.
yourself	save; pats	Pasivaišink arbata.`;

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
  const lines = LT_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tLT\texample_LT") {
    throw new Error("Unexpected LT translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad LT translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad LT translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad LT translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad LT translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad LT example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate LT translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing LT translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`LT translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_lt_v1",
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
    LT: translation.display,
    example_LT: translation.example,
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
    "Generate the next support-language batch in language order: LV.",
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
    "- Article display: false; Lithuanian uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: LT Latin-script display/example cells and no non-Latin script",
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
