#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "ET";
const BATCH_ID = "et_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-et.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const ET_TRANSLATIONS_TSV = `source_headword	ET	example_ET
take	võtma; kaasa võtma	Võta pilet.
talk	rääkima; vestlus	Räägime pärast tundi.
tall	pikk	Minu õpetaja on pikk.
taxi	takso	Takso on väljas.
tea	tee	See tee on kuum.
teach	õpetama	Ma õpetan inglise keelt.
teacher	õpetaja	Õpetaja naeratab.
team	meeskond; tiim	Meie meeskond võidab täna.
teenager	teismeline	Teismeline loeb raamatut.
telephone	telefon; helistama	Telefon on laual.
television	televiisor; televisioon	Televiisor on uus.
tell	ütlema; rääkima	Ütle oma nimi.
ten	kümme	Mul on kümme raamatut.
tennis	tennis	Täna mängime tennist.
terrible	kohutav	Ilm on kohutav.
test	test; eksam	Test algab nüüd.
text	sõnum; tekst	Saada lühike sõnum.
than	kui	Kümme on rohkem kui kaks.
thank	tänama	Täna oma õpetajat.
thanks	aitäh; tänu	Aitäh abi eest.
that	see; too	Too raamat on minu.
the	inglise määrav artikkel	Tee on soe.
theatre	teater	Teater on jaama lähedal.
their	nende	Nende maja on suur.
them	neid; neile	Ma tunnen neid.
then	siis; seejärel	Söö, seejärel õpi.
there	seal; on	Seal on tool.
they	nad	Nad on koolis.
thing	asi; ese	See asi on kasulik.
think	mõtlema	Mõtlen kodule.
third	kolmas; kolmandik	See on kolmas tund.
thirsty	janune	Ma olen janune.
thirteen	kolmteist	Ta on kolmteist aastat vana.
thirty	kolmkümmend	Minu õde on kolmkümmend.
this	see	See pilet on uus.
thousand	tuhat	Tuli tuhat inimest.
three	kolm	Näen kolme lindu.
through	läbi	Kõnnime läbi pargi.
Thursday	neljapäev	Kohtume neljapäeval.
ticket	pilet	Mul on piletit vaja.
time	aeg; kell	Mis kell on?
tired	väsinud	Ma olen väsinud.
title	pealkiri	Loe pealkiri.
to	juurde; kuni; -le	Lähen tundi.
today	täna	Täna on päikeseline.
together	koos	Sööme koos.
toilet	tualett; WC	Tualett on puhas.
tomato	tomat	See tomat on punane.
tomorrow	homme	Näeme homme.
tonight	täna õhtul	Täna õhtul õpime.
too	ka; liiga	Ma tahan ka teed.
tooth	hammas	Mul valutab hammas.
topic	teema	Vali teema.
tourist	turist	Turist pildistab.
town	linn; alev	See alev on vaikne.
traffic	liiklus	Liiklus on aeglane.
train	rong; treenima	Rong hilineb.
travel	reisima; reis	Reisime rongiga.
tree	puu	Puu on kõrge.
trip	reis; väljasõit	Väljasõit algab homme.
trousers	püksid	Minu püksid on mustad.
true	tõene; õige	See lugu on tõene.
try	proovima	Proovi seda teed.
T-shirt	T-särk	Ma kannan T-särki.
Tuesday	teisipäev	Kohtume teisipäeval.
turn	pöörama; kord	Siin pööra vasakule.
TV	televiisor; TV	Televiisor on vali.
twelve	kaksteist	Mul on kaksteist pliiatsit.
twenty	kakskümmend	Siin on kakskümmend õpilast.
twice	kaks korda	Ujun kaks korda nädalas.
two	kaks	Kaks inimest ootab.
type	tüüp; liik; trükkima	Millist muusikaliiki tahad?
umbrella	vihmavari	Võta vihmavari.
uncle	onu	Minu onu on lahke.
under	all	Kott on laua all.
understand	aru saama	Ma saan küsimusest aru.
university	ülikool	Ülikool on lähedal.
until	kuni	Oota viieni.
up	üles; üleval	Tõuse nüüd üles.
upstairs	üleval; ülemisel korrusel	Minu tuba on üleval.
us	meid; meile	Aita meid, palun.
use	kasutama; kasutus	Kasuta seda pliiatsit.
useful	kasulik	See kaart on kasulik.
usually	tavaliselt	Tavaliselt lähen koju jalgsi.
vacation	puhkus	Meie puhkus algab homme.
vegetable	köögivili	Porgand on köögivili.
very	väga	Tuba on väga vaikne.
video	video	Vaata seda videot.
village	küla	Küla on väike.
visit	külastama	Külastame tädi.
visitor	külastaja	Külastaja ootab väljas.
wait	ootama	Oota siin, palun.
waiter	kelner	Kelner toob tee.
wake	ärkama; äratama	Ärkan vara.
walk	kõndima; jalutuskäik	Kõnnime kooli.
wall	sein	Sein on valge.
want	tahtma	Ma tahan vett.
warm	soe; soojendama	Tuba on soe.
wash	pesema	Pese käed.
watch	vaatama; kell	Vaatan televiisorit.
water	vesi; kastma	Joo natuke vett.
way	tee; viis	See tee on lühike.
we	meie	Õpime inglise keelt.
wear	kandma	Ma kannan mantlit.
weather	ilm	Ilm on külm.
website	veebisait	See veebisait on kasulik.
Wednesday	kolmapäev	Tund algab kolmapäeval.
week	nädal	See nädal on kiire.
weekend	nädalavahetus	Nädalavahetus algab homme.
welcome	tere tulemast; tervitama	Tere tulemast meie tundi.
well	hästi	Ta laulab hästi.
west	lääs	Päike loojub läänes.
what	mis	Mis seal on?
when	millal	Millal sa õpid?
where	kus	Kus on jaam?
which	milline	Milline kott on sinu?
white	valge	Sein on valge.
who	kes	Kes seal on?
why	miks	Miks sa hilined?
wife	abikaasa; naine	Tema naine on õpetaja.
will modal	tuleviku abitegusõna	Aitan sind.
win	võitma	Meie meeskond võib võita.
window	aken	Ava aken.
wine	vein	See vein on punane.
winter	talv	Talv on siin külm.
with	koos; -ga	Tule minuga.
without	ilma	Tee ilma suhkruta on hea.
woman	naine	Naine loeb raamatut.
wonderful	imeline	Vaade on imeline.
word	sõna	Kirjuta üks sõna.
work	töötama; töö	Töötan kodus.
worker	töötaja	Töötaja on hõivatud.
world	maailm	Maailm on suur.
would modal	tahaks; oleks	Tahaksin teed.
write	kirjutama	Kirjuta oma nimi.
writer	kirjanik	Kirjanik elab siin.
writing	kirjutamine; käekiri	Tema käekiri on selge.
wrong	vale	See vastus on vale.
yeah	jah; nojah	Jah, ma saan tulla.
year	aasta	See aasta on hea.
yellow	kollane	Banaan on kollane.
yes	jah	Jah, ma saan aru.
yesterday	eile	Eile helistasin.
you	sina; teie	Sa oled minu sõber.
young	noor	Laps on noor.
your	sinu; teie	Sinu kott on siin.
yourself	ise; ennast	Paku endale teed.`;

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
  const lines = ET_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tET\texample_ET") {
    throw new Error("Unexpected ET translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad ET translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad ET translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad ET translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad ET translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad ET example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate ET translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing ET translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`ET translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_et_v1",
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
    ET: translation.display,
    example_ET: translation.example,
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
    "Generate the next support-language batch in language order: IS.",
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
    "- Article display: false; Estonian uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: ET Latin-script display/example cells and no non-Latin script",
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
