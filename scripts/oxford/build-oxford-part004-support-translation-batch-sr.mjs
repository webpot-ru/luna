#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SR";
const BATCH_ID = "sr_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-sr.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;
const LATIN_LETTER_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SR_LATIN_TRANSLATIONS_TSV = `source_headword	SR	example_SR
take	uzeti; poneti	Uzmi kartu.
talk	razgovarati; razgovor	Razgovaramo posle časa.
tall	visok	Moj učitelj je visok.
taxi	taksi	Taksi je napolju.
tea	čaj	Ovaj čaj je vruć.
teach	predavati; podučavati	Predajem engleski.
teacher	učitelj; nastavnica	Nastavnica se smeši.
team	tim; ekipa	Naš tim danas pobeđuje.
teenager	tinejdžer; tinejdžerka	Tinejdžer čita knjigu.
telephone	telefon; telefonirati	Telefon je na stolu.
television	televizor; televizija	Televizor je nov.
tell	reći; ispričati	Reci mi svoje ime.
ten	deset	Imam deset knjiga.
tennis	tenis	Danas igramo tenis.
terrible	užasan	Vreme je užasno.
test	test; ispit	Test počinje sada.
text	poruka; tekst	Pošalji kratku poruku.
than	nego	Deset je više nego dva.
thank	zahvaliti se	Zahvali svom učitelju.
thanks	hvala; zahvalnost	Hvala na pomoći.
that	onaj; ono	Ona knjiga je moja.
the	određeni član u engleskom	Čaj je topao.
theatre	pozorište	Pozorište je blizu stanice.
their	njihov	Njihova kuća je velika.
them	njih; im	Poznajem ih.
then	zatim; tada	Jedi, zatim uči.
there	tamo; ima	Tamo je stolica.
they	oni; one	Oni su u školi.
thing	stvar; predmet	Ova stvar je korisna.
think	misliti	Mislim na dom.
third	treći; trećina	Ovo je treća lekcija.
thirsty	žedan	Žedan sam.
thirteen	trinaest	Ima trinaest godina.
thirty	trideset	Moja sestra ima trideset godina.
this	ovaj; ovo	Ova karta je nova.
thousand	hiljada	Došlo je hiljadu ljudi.
three	tri	Vidim tri ptice.
through	kroz; preko	Hodamo kroz park.
Thursday	četvrtak	Sastajemo se u četvrtak.
ticket	karta; ulaznica	Treba mi karta.
time	vreme; sat	Koliko je sati?
tired	umoran	Umoran sam.
title	naslov	Pročitaj naslov.
to	do; prema; za	Idem na čas.
today	danas	Danas je sunčano.
together	zajedno	Jedemo zajedno.
toilet	toalet	Toalet je čist.
tomato	paradajz	Ovaj paradajz je crven.
tomorrow	sutra	Vidimo se sutra.
tonight	večeras	Večeras učimo.
too	takođe; previše	I ja želim čaj.
tooth	zub	Boli me zub.
topic	tema	Izaberi temu.
tourist	turista; turistkinja	Turista fotografiše.
town	grad; gradić	Ovaj gradić je tih.
traffic	saobraćaj	Saobraćaj je spor.
train	voz; trenirati	Voz kasni.
travel	putovati; putovanje	Putujemo vozom.
tree	drvo	Drvo je visoko.
trip	putovanje; izlet	Izlet počinje sutra.
trousers	pantalone	Moje pantalone su crne.
true	istinit; pravi	Ova priča je istinita.
try	pokušati; probati	Probaj ovaj čaj.
T-shirt	majica	Nosim majicu.
Tuesday	utorak	Sastajemo se u utorak.
turn	skrenuti; red	Ovde skreni levo.
TV	televizor; TV	Televizor je glasan.
twelve	dvanaest	Imam dvanaest olovaka.
twenty	dvadeset	Ovde je dvadeset učenika.
twice	dvaput	Plivam dvaput nedeljno.
two	dva; dve	Dvoje ljudi čeka.
type	tip; vrsta; kucati	Koju vrstu muzike?
umbrella	kišobran	Uzmi kišobran.
uncle	stric; ujak	Moj stric je ljubazan.
under	ispod	Torba je ispod stola.
understand	razumeti	Razumem pitanje.
university	univerzitet	Univerzitet je blizu.
until	do	Čekaj do pet.
up	gore; naviše	Ustani sada.
upstairs	gore; na spratu	Moja soba je gore.
us	nas; nama	Pomozi nam, molim te.
use	koristiti; upotreba	Koristi ovu olovku.
useful	koristan	Ova karta je korisna.
usually	obično	Obično idem kući peške.
vacation	odmor; raspust	Naš odmor počinje sutra.
vegetable	povrće	Šargarepa je povrće.
very	veoma	Soba je veoma tiha.
video	video	Pogledaj ovaj video.
village	selo	Selo je malo.
visit	posetiti	Posećujemo tetku.
visitor	posetilac; posetiteljka	Posetilac čeka napolju.
wait	čekati	Čekaj ovde, molim te.
waiter	konobar; konobarica	Konobar donosi čaj.
wake	probuditi se; probuditi	Budim se rano.
walk	hodati; šetnja	Hodamo do škole.
wall	zid	Zid je beo.
want	želeti; hteti	Želim vodu.
warm	topao; zagrejati	Soba je topla.
wash	prati	Operi ruke.
watch	gledati; sat	Gledam televiziju.
water	voda; zalivati	Pij malo vode.
way	put; način	Ovaj put je kratak.
we	mi	Učimo engleski.
wear	nositi	Nosim kaput.
weather	vreme	Vreme je hladno.
website	veb-sajt	Ovaj veb-sajt je koristan.
Wednesday	sreda	Čas počinje u sredu.
week	nedelja; sedmica	Ova nedelja je zauzeta.
weekend	vikend	Vikend počinje sutra.
welcome	dobrodošao; dočekati	Dobrodošao na naš čas.
well	dobro	Ona dobro peva.
west	zapad	Sunce zalazi na zapadu.
what	šta; koji	Šta je tamo?
when	kada	Kada učiš?
where	gde	Gde je stanica?
which	koji	Koja torba je tvoja?
white	beo; beli	Zid je beo.
who	ko	Ko je tamo?
why	zašto	Zašto kasniš?
wife	supruga	Njegova supruga je učiteljica.
will modal	ću; će	Pomoći ću ti.
win	pobediti	Naš tim može pobediti.
window	prozor	Otvori prozor.
wine	vino	Ovo vino je crveno.
winter	zima	Zima je ovde hladna.
with	sa	Dođi sa mnom.
without	bez	Čaj bez šećera je dobar.
woman	žena	Žena čita knjigu.
wonderful	divan; predivan	Pogled je predivan.
word	reč	Napiši jednu reč.
work	raditi; posao	Radim kod kuće.
worker	radnik; radnica	Radnik je zauzet.
world	svet	Svet je velik.
would modal	bih; bi	Želeo bih čaj.
write	pisati	Napiši svoje ime.
writer	pisac; spisateljica	Pisac živi ovde.
writing	pisanje; rukopis	Njen rukopis je jasan.
wrong	pogrešan	Ovaj odgovor je pogrešan.
yeah	da; dobro	Da, mogu doći.
year	godina	Ova godina je dobra.
yellow	žut	Banana je žuta.
yes	da	Da, razumem.
yesterday	juče	Juče sam telefonirao.
you	ti; vi	Ti si moj prijatelj.
young	mlad	Dete je mlado.
your	tvoj; vaš	Tvoja torba je ovde.
yourself	sebe; sam	Posluži se čajem.`;

const DIGRAPHS = [
  ["DŽ", "Џ"],
  ["Dž", "Џ"],
  ["dž", "џ"],
  ["LJ", "Љ"],
  ["Lj", "Љ"],
  ["lj", "љ"],
  ["NJ", "Њ"],
  ["Nj", "Њ"],
  ["nj", "њ"],
];

const LATIN_TO_CYRILLIC = new Map([
  ["A", "А"], ["a", "а"],
  ["B", "Б"], ["b", "б"],
  ["C", "Ц"], ["c", "ц"],
  ["Č", "Ч"], ["č", "ч"],
  ["Ć", "Ћ"], ["ć", "ћ"],
  ["D", "Д"], ["d", "д"],
  ["Đ", "Ђ"], ["đ", "ђ"],
  ["E", "Е"], ["e", "е"],
  ["F", "Ф"], ["f", "ф"],
  ["G", "Г"], ["g", "г"],
  ["H", "Х"], ["h", "х"],
  ["I", "И"], ["i", "и"],
  ["J", "Ј"], ["j", "ј"],
  ["K", "К"], ["k", "к"],
  ["L", "Л"], ["l", "л"],
  ["M", "М"], ["m", "м"],
  ["N", "Н"], ["n", "н"],
  ["O", "О"], ["o", "о"],
  ["P", "П"], ["p", "п"],
  ["R", "Р"], ["r", "р"],
  ["S", "С"], ["s", "с"],
  ["Š", "Ш"], ["š", "ш"],
  ["T", "Т"], ["t", "т"],
  ["U", "У"], ["u", "у"],
  ["V", "В"], ["v", "в"],
  ["Z", "З"], ["z", "з"],
  ["Ž", "Ж"], ["ž", "ж"],
]);

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

function toSerbianCyrillic(value) {
  let output = value;
  for (const [latin, cyrillic] of DIGRAPHS) {
    output = output.replaceAll(latin, cyrillic);
  }
  return [...output].map((char) => LATIN_TO_CYRILLIC.get(char) ?? char).join("");
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
  const lines = SR_LATIN_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tSR\texample_SR") {
    throw new Error("Unexpected SR translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad SR translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, latinDisplay, latinExample] = parts.map(normalizeText);
    const display = toSerbianCyrillic(latinDisplay);
    const example = toSerbianCyrillic(latinExample);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad SR translation row ${index + 2}: empty field`);
    }
    if (!CYRILLIC_RE.test(display) || !CYRILLIC_RE.test(example)) {
      throw new Error(`Bad SR translation row ${index + 2}: display/example must contain Cyrillic text`);
    }
    if (LATIN_LETTER_RE.test(display) || LATIN_LETTER_RE.test(example)) {
      throw new Error(`Bad SR translation row ${index + 2}: display/example contains Latin script`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad SR translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad SR example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate SR translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing SR translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`SR translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_sr_v1",
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
    SR: translation.display,
    example_SR: translation.example,
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
    "Generate the next support-language batch in language order: SL.",
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
    "- Article display: false; Serbian nouns use normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: SR Cyrillic display/example cells with no Latin or unexpected-script leakage",
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
