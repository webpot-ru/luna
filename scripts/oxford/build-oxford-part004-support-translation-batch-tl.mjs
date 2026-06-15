#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "TL";
const BATCH_ID = "tl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-tl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const TL_TRANSLATIONS_TSV = `source_headword	TL	example_TL
take	kunin; dalhin	Kunin mo ang tiket.
talk	magsalita; usapan	Nag-uusap kami pagkatapos ng klase.
tall	matangkad	Matangkad ang guro ko.
taxi	taksi	Nasa labas ang taksi.
tea	tsaa	Mainit ang tsaang ito.
teach	magturo	Nagtuturo ako ng Ingles.
teacher	guro	Ngumingiti ang guro.
team	koponan; team	Nanalo ang koponan namin ngayon.
teenager	tinedyer; kabataan	Nagbabasa ng libro ang tinedyer.
telephone	telepono; tumawag	Nasa mesa ang telepono.
television	telebisyon; TV	Bago ang telebisyon.
tell	sabihin; magsabi	Sabihin mo sa akin ang pangalan mo.
ten	sampu	Mayroon akong sampung libro.
tennis	tennis	Naglalaro kami ng tennis ngayon.
terrible	kakila-kilabot; masama	Kakila-kilabot ang panahon.
test	pagsusulit; test	Nagsisimula na ang pagsusulit.
text	mensahe; text	Magpadala ng maikling mensahe.
than	kaysa	Mas marami ang sampu kaysa dalawa.
thank	magpasalamat	Magpasalamat ka sa guro mo.
thanks	salamat	Salamat sa tulong.
that	iyon; iyan	Akin ang librong iyon.
the	pantukoy na tiyak sa Ingles	Mainit ang tsaa.
theatre	teatro	Malapit sa istasyon ang teatro.
their	kanilang	Malaki ang bahay nila.
them	sila; kanila	Kilala ko sila.
then	pagkatapos; noon	Kumain ka, pagkatapos mag-aral.
there	doon; mayroon	May upuan doon.
they	sila	Nasa paaralan sila.
thing	bagay	Kapaki-pakinabang ang bagay na ito.
think	mag-isip; isipin	Iniisip ko ang bahay.
third	ikatlo; isang-katlo	Ito ang ikatlong aralin.
thirsty	uhaw	Uhaw ako.
thirteen	labintatlo	Labintatlong taong gulang siya.
thirty	tatlumpu	Tatlumpung taong gulang ang ate ko.
this	ito; itong	Bago ang tiket na ito.
thousand	libo	Dumating ang isang libong tao.
three	tatlo	Nakikita ko ang tatlong ibon.
through	sa pamamagitan ng; dumaan sa	Dumaan kami sa parke.
Thursday	Huwebes	Magkikita kami sa Huwebes.
ticket	tiket	Kailangan ko ng tiket.
time	oras; panahon	Anong oras na?
tired	pagod	Pagod ako.
title	pamagat	Basahin ang pamagat.
to	sa; papunta sa; para sa	Pumupunta ako sa klase.
today	ngayon; araw na ito	Maaraw ngayon.
together	magkasama	Kumakain kami nang magkasama.
toilet	palikuran; banyo	Malinis ang banyo.
tomato	kamatis	Pula ang kamatis na ito.
tomorrow	bukas	Magkita tayo bukas.
tonight	ngayong gabi	Mag-aaral kami ngayong gabi.
too	rin; masyado	Gusto ko rin ng tsaa.
tooth	ngipin	Masakit ang ngipin ko.
topic	paksa	Piliin ang paksa.
tourist	turista	Kumukuha ng litrato ang turista.
town	bayan	Tahimik ang bayan.
traffic	trapiko	Mabagal ang trapiko.
train	tren	Huli ang tren.
travel	maglakbay; paglalakbay	Naglalakbay kami gamit ang tren.
tree	puno	Matangkad ang puno.
trip	biyahe; lakbay	Nagsisimula bukas ang biyahe.
trousers	pantalon	Itim ang pantalon ko.
true	totoo; tama	Totoo ang kuwento.
try	subukan; sumubok	Subukan mo ang tsaang ito.
T-shirt	T-shirt	Nagsusuot ako ng T-shirt.
Tuesday	Martes	Magkikita kami sa Martes.
turn	lumiko; tira	Lumiko ka pakaliwa rito.
TV	TV; telebisyon	Malakas ang TV.
twelve	labindalawa	Mayroon akong labindalawang lapis.
twenty	dalawampu	May dalawampung estudyante rito.
twice	dalawang beses	Lumalangoy ako dalawang beses sa isang linggo.
two	dalawa	Naghihintay ang dalawang tao.
type	uri; mag-type	Anong uri ng musika ang gusto mo?
umbrella	payong	Kunin mo ang payong.
uncle	tiyuhin; tito	Mabait ang tito ko.
under	sa ilalim ng	Nasa ilalim ng mesa ang bag.
understand	umintindi; maunawaan	Naiintindihan ko ang tanong.
university	unibersidad; pamantasan	Malapit ang unibersidad.
until	hanggang	Maghintay hanggang alas singko.
up	pataas; itaas	Tumayo ka na ngayon.
upstairs	sa itaas; sa taas	Nasa itaas ang kuwarto ko.
us	kami; tayo	Tulungan mo kami, pakiusap.
use	gamitin; paggamit	Gamitin mo ang panulat na ito.
useful	kapaki-pakinabang	Kapaki-pakinabang ang kard na ito.
usually	karaniwan; madalas	Karaniwan akong naglalakad pauwi.
vacation	bakasyon	Magsisimula bukas ang bakasyon namin.
vegetable	gulay	Ang karot ay gulay.
very	napaka; sobrang	Napakatahimik ng kuwarto.
video	video	Panoorin ang videong ito.
village	nayon; baryo	Maliit ang nayon.
visit	bumisita; dalawin	Bibisita kami sa tita.
visitor	bisita; panauhin	Naghihintay sa labas ang bisita.
wait	maghintay	Maghintay ka rito, pakiusap.
waiter	waiter; tagapagsilbi	Nagdadala ng tsaa ang waiter.
wake	gumising; gisingin	Maaga akong gumigising.
walk	maglakad; lakad	Naglalakad kami papuntang paaralan.
wall	pader; dingding	Puti ang dingding.
want	gusto; nais	Gusto ko ng tubig.
warm	mainit-init; mainit	Mainit-init ang kuwarto.
wash	hugasan; maghugas	Hugasan mo ang mga kamay mo.
watch	manood; relo	Nanonood ako ng TV.
water	tubig; diligan	Uminom ng kaunting tubig.
way	daan; paraan	Maikli ang daang ito.
we	kami; tayo	Nag-aaral kami ng Ingles.
wear	magsuot; suotin	Nagsusuot ako ng amerikana.
weather	panahon; lagay ng panahon	Malamig ang panahon.
website	website	Kapaki-pakinabang ang website na ito.
Wednesday	Miyerkules	Nagsisimula ang klase sa Miyerkules.
week	linggo	Abala ang linggong ito.
weekend	katapusan ng linggo	Magsisimula bukas ang weekend.
welcome	maligayang pagdating; tanggapin	Maligayang pagdating sa klase namin.
well	mabuti; maayos	Maayos siyang kumanta.
west	kanluran	Lumulubog ang araw sa kanluran.
what	ano	Ano ang naroon?
when	kailan	Kailan ka nag-aaral?
where	saan	Saan ang istasyon?
which	alin; alin sa	Aling bag ang sa iyo?
white	puti	Puti ang dingding.
who	sino	Sino ang naroon?
why	bakit	Bakit ka huli?
wife	asawa; maybahay	Guro ang asawa niya.
will modal	panghinaharap na pantulong	Tutulungan kita.
win	manalo	Maaaring manalo ang koponan namin.
window	bintana	Buksan mo ang bintana.
wine	alak; bino	Pula ang alak na ito.
winter	taglamig	Malamig ang taglamig dito.
with	kasama; may	Sumama ka sa akin.
without	wala; nang wala	Masarap ang tsaa nang walang asukal.
woman	babae; ginang	Nagbabasa ng libro ang babae.
wonderful	kahanga-hanga	Kahanga-hanga ang tanawin.
word	salita	Sumulat ng isang salita.
work	trabaho; magtrabaho	Nagtatrabaho ako sa bahay.
worker	manggagawa; empleyado	Abala ang manggagawa.
world	mundo; daigdig	Malaki ang mundo.
would modal	sana; gustong	Gusto ko sana ng tsaa.
write	sumulat; isulat	Isulat mo ang pangalan mo.
writer	manunulat	Dito nakatira ang manunulat.
writing	pagsusulat; sulat-kamay	Malinaw ang sulat-kamay niya.
wrong	mali	Mali ang sagot na ito.
yeah	oo	Oo, makakapunta ako.
year	taon	Maganda ang taong ito.
yellow	dilaw	Dilaw ang saging.
yes	oo	Oo, naiintindihan ko.
yesterday	kahapon	Tumawag ako kahapon.
you	ikaw; ka; kayo	Kaibigan kita.
young	bata; kabataan	Bata pa ang bata.
your	iyong; mo	Narito ang bag mo.
yourself	sarili mo; iyong sarili	Kumuha ka ng tsaa para sa sarili mo.`;

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
  const lines = TL_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tTL\texample_TL") {
    throw new Error("Unexpected TL translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad TL translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad TL translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad TL translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad TL translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad TL example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate TL translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing TL translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`TL translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_tl_v1",
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
    TL: translation.display,
    example_TL: translation.example,
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
    "Generate the next support-language batch in language order: MY.",
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
    "- Article display: false; Tagalog/Filipino uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: TL Latin-script display/example cells and no non-Latin script",
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
      next_language: "MY",
    },
    null,
    2
  )
);
