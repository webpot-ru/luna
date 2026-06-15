#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "RO";
const BATCH_ID = "ro_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-ro.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const RO_TRANSLATIONS_TSV = `source_headword	RO	example_RO
take	a lua; a duce	Ia biletul.
talk	a vorbi; o conversație	Vorbim după curs.
tall	înalt	Profesorul meu este înalt.
taxi	un taxi	Taxiul este afară.
tea	ceai	Ceaiul acesta este fierbinte.
teach	a preda	Predau engleză.
teacher	un profesor; o profesoară	Profesoara zâmbește.
team	o echipă	Echipa noastră câștigă azi.
teenager	un adolescent; o adolescentă	Adolescentul citește o carte.
telephone	un telefon; a telefona	Telefonul este pe masă.
television	un televizor; televiziune	Televizorul este nou.
tell	a spune; a povesti	Spune-mi numele tău.
ten	zece	Am zece cărți.
tennis	tenis	Jucăm tenis azi.
terrible	teribil; îngrozitor	Vremea este teribilă.
test	un test; un examen	Testul începe acum.
text	un mesaj; un text	Trimite un mesaj scurt.
than	decât	Zece este mai mult decât doi.
thank	a mulțumi	Mulțumește profesorului tău.
thanks	mulțumesc; mulțumiri	Mulțumesc pentru ajutor.
that	acel; acea; acela	Cartea aceea este a mea.
the	articol hotărât englezesc	Ceaiul este cald.
theatre	un teatru	Teatrul este lângă stație.
their	al lor; a lor	Casa lor este mare.
them	pe ei; lor	Îi cunosc.
then	apoi; atunci	Mănâncă, apoi învață.
there	acolo; există	Există un scaun acolo.
they	ei; ele	Ei sunt la școală.
thing	un lucru; un obiect	Lucrul acesta este util.
think	a gândi; a crede	Mă gândesc la casă.
third	al treilea; o treime	Aceasta este a treia lecție.
thirsty	însetat	Îmi este sete.
thirteen	treisprezece	Are treisprezece ani.
thirty	treizeci	Sora mea are treizeci de ani.
this	acest; aceasta	Biletul acesta este nou.
thousand	o mie	O mie de oameni au venit.
three	trei	Văd trei păsări.
through	prin; de-a lungul	Mergem prin parc.
Thursday	joi	Ne întâlnim joi.
ticket	un bilet	Am nevoie de un bilet.
time	timp; o oră	Cât este ceasul?
tired	obosit	Sunt obosit.
title	un titlu	Citește titlul.
to	la; către; să	Merg la curs.
today	azi; astăzi	Azi este soare.
together	împreună	Mâncăm împreună.
toilet	o toaletă; o baie	Toaleta este curată.
tomato	o roșie	Roșia aceasta este roșie.
tomorrow	mâine	Ne vedem mâine.
tonight	în seara asta	Învățăm în seara asta.
too	și; prea	Vreau și eu ceai.
tooth	un dinte	Mă doare un dinte.
topic	un subiect	Alege un subiect.
tourist	un turist; o turistă	Turistul face fotografii.
town	un oraș; un orășel	Orășelul acesta este liniștit.
traffic	trafic	Traficul este lent.
train	un tren; a antrena	Trenul întârzie.
travel	a călători; o călătorie	Călătorim cu trenul.
tree	un copac	Copacul este înalt.
trip	o excursie; o călătorie	Excursia începe mâine.
trousers	pantaloni	Pantalonii mei sunt negri.
true	adevărat	Povestea aceasta este adevărată.
try	a încerca	Încearcă ceaiul acesta.
T-shirt	un tricou	Port un tricou.
Tuesday	marți	Ne întâlnim marți.
turn	a vira; o tură	Virează la stânga aici.
TV	un televizor; TV	Televizorul este tare.
twelve	doisprezece	Am douăsprezece pixuri.
twenty	douăzeci	Sunt douăzeci de studenți aici.
twice	de două ori	Înot de două ori pe săptămână.
two	doi; două	Două persoane așteaptă.
type	un tip; a tasta	Ce tip de muzică?
umbrella	o umbrelă	Ia o umbrelă.
uncle	un unchi	Unchiul meu este amabil.
under	sub	Geanta este sub masă.
understand	a înțelege	Înțeleg întrebarea.
university	o universitate	Universitatea este aproape.
until	până la	Așteaptă până la cinci.
up	sus; în sus	Ridică-te acum.
upstairs	la etaj; sus	Camera mea este sus.
us	pe noi; nouă	Ajută-ne, te rog.
use	a folosi; o folosire	Folosește acest pix.
useful	util	Harta aceasta este utilă.
usually	de obicei	De obicei merg acasă pe jos.
vacation	o vacanță	Vacanța noastră începe mâine.
vegetable	o legumă	Morcovul este o legumă.
very	foarte	Camera este foarte liniștită.
video	un videoclip; un video	Uită-te la acest video.
village	un sat	Satul este mic.
visit	a vizita	Vizităm mătușa noastră.
visitor	un vizitator; o vizitatoare	Vizitatorul așteaptă afară.
wait	a aștepta	Așteaptă aici, te rog.
waiter	un chelner; o chelneriță	Chelnerul aduce ceai.
wake	a se trezi; a trezi	Mă trezesc devreme.
walk	a merge pe jos; o plimbare	Mergem pe jos la școală.
wall	un perete	Peretele este alb.
want	a vrea	Vreau apă.
warm	cald; a încălzi	Camera este caldă.
wash	a spăla	Spală-te pe mâini.
watch	a privi; un ceas	Mă uit la televizor.
water	apă; a uda	Bea puțină apă.
way	un drum; un mod	Drumul acesta este scurt.
we	noi	Învățăm engleză.
wear	a purta	Port o haină.
weather	vreme	Vremea este rece.
website	un site web	Site-ul acesta este util.
Wednesday	miercuri	Cursul începe miercuri.
week	o săptămână	Săptămâna aceasta este aglomerată.
weekend	un weekend	Weekendul începe mâine.
welcome	bun venit; a primi	Bun venit la cursul nostru.
well	bine	Ea cântă bine.
west	vest	Soarele apune în vest.
what	ce; care	Ce este acolo?
when	când	Când înveți?
where	unde	Unde este stația?
which	care	Care geantă este a ta?
white	alb	Peretele este alb.
who	cine	Cine este acolo?
why	de ce	De ce întârzii?
wife	o soție	Soția lui este profesoară.
will modal	voi; va	Te voi ajuta.
win	a câștiga	Echipa noastră poate câștiga.
window	o fereastră	Deschide fereastra.
wine	un vin	Vinul acesta este roșu.
winter	iarnă	Iarna este rece aici.
with	cu	Vino cu mine.
without	fără	Ceaiul fără zahăr este bun.
woman	o femeie	Femeia citește o carte.
wonderful	minunat; grozav	Priveliștea este minunată.
word	un cuvânt	Scrie un cuvânt.
work	a lucra; muncă	Lucrez acasă.
worker	un lucrător; o lucrătoare	Lucrătorul este ocupat.
world	o lume	Lumea este mare.
would modal	aș; ar	Aș vrea ceai.
write	a scrie	Scrie-ți numele.
writer	un scriitor; o scriitoare	Scriitorul locuiește aici.
writing	scris; o scriere	Scrisul ei este clar.
wrong	greșit	Răspunsul acesta este greșit.
yeah	da; sigur	Da, pot veni.
year	un an	Anul acesta este bun.
yellow	galben	Banana este galbenă.
yes	da	Da, înțeleg.
yesterday	ieri	Am telefonat ieri.
you	tu; dumneavoastră; voi	Tu ești prietenul meu.
young	tânăr	Copilul este tânăr.
your	tău; ta; dumneavoastră	Geanta ta este aici.
yourself	tu însuți; dumneavoastră	Servește-te cu ceai.`;

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
  const lines = RO_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tRO\texample_RO") {
    throw new Error("Unexpected RO translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad RO translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad RO translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad RO translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad RO translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad RO example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate RO translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing RO translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`RO translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_ro_article_display_v1",
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
    RO: translation.display,
    example_RO: translation.example,
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
    "Generate the next support-language batch in language order: BG.",
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
    "- Article display: included in Romanian display cells where learner-useful",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: RO Latin-script display/example cells with Romanian diacritics allowed and no non-Latin script",
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
