#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "PL";
const BATCH_ID = "pl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-pl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const PL_TRANSLATIONS_TSV = `source_headword	PL	example_PL
take	wziąć; zabrać	Weź ten bilet.
talk	rozmawiać; rozmowa	Porozmawiamy po lekcji.
tall	wysoki	Mój nauczyciel jest wysoki.
taxi	taksówka	Taksówka jest na zewnątrz.
tea	herbata	Ta herbata jest gorąca.
teach	uczyć	Uczę angielskiego.
teacher	nauczyciel	Nauczyciel się uśmiecha.
team	zespół; drużyna	Nasza drużyna dziś wygrywa.
teenager	nastolatek	Ten nastolatek czyta książkę.
telephone	telefon; telefonować	Telefon jest na biurku.
television	telewizja; telewizor	Ten telewizor jest nowy.
tell	powiedzieć; opowiedzieć	Powiedz mi swoje imię.
ten	dziesięć	Mam dziesięć książek.
tennis	tenis	Dziś gramy w tenisa.
terrible	okropny; straszny	Pogoda jest okropna.
test	test; sprawdzian	Test zaczyna się teraz.
text	wiadomość tekstowa; pisać wiadomość	Wyślij krótką wiadomość.
than	niż	Dziesięć to więcej niż dwa.
thank	dziękować	Podziękuj nauczycielowi.
thanks	dziękuję; dzięki	Dziękuję za pomoc.
that	tamten; to	Tamta książka jest moja.
the	angielski przedimek określony	To słowo jest przedimkiem angielskim.
theatre	teatr	Teatr jest blisko stacji.
their	ich	Ich dom jest duży.
them	ich; im	Znam ich.
then	potem; wtedy	Zjedz, potem się ucz.
there	tam; tam jest	Tam jest krzesło.
they	oni; one	Oni są w szkole.
thing	rzecz; sprawa	Ta rzecz jest przydatna.
think	myśleć	Myślę o domu.
third	trzeci; jedna trzecia	To jest trzecia lekcja.
thirsty	spragniony	Jestem spragniony.
thirteen	trzynaście	Ona ma trzynaście lat.
thirty	trzydzieści	Moja siostra ma trzydzieści lat.
this	to; ten	Ten bilet jest nowy.
thousand	tysiąc	Przyszło tysiąc osób.
three	trzy	Widzę trzy ptaki.
through	przez	Przechodzimy przez park.
Thursday	czwartek	Spotkamy się w czwartek.
ticket	bilet	Potrzebuję biletu.
time	czas; godzina	Która jest godzina?
tired	zmęczony	Jestem zmęczony.
title	tytuł	Przeczytaj tytuł.
to	do; dla; aby	Idę na lekcję.
today	dzisiaj	Dzisiaj jest słonecznie.
together	razem	Jemy razem.
toilet	toaleta	Toaleta jest czysta.
tomato	pomidor	Ten pomidor jest czerwony.
tomorrow	jutro	Do zobaczenia jutro.
tonight	dziś wieczorem	Uczymy się dziś wieczorem.
too	też; zbyt	Ja też chcę herbatę.
tooth	ząb	Boli mnie ząb.
topic	temat	Wybierz temat.
tourist	turysta	Turysta robi zdjęcie.
town	miasto; miasteczko	To miasteczko jest ciche.
traffic	ruch uliczny	Ruch uliczny jest wolny.
train	pociąg; trenować	Pociąg jest spóźniony.
travel	podróżować; podróż	Podróżujemy pociągiem.
tree	drzewo	To drzewo jest wysokie.
trip	wycieczka; podróż	Wycieczka zaczyna się jutro.
trousers	spodnie	Moje spodnie są czarne.
true	prawdziwy; prawda	Ta historia jest prawdziwa.
try	spróbować; próbować	Spróbuj tej herbaty.
T-shirt	koszulka	Mam na sobie koszulkę.
Tuesday	wtorek	Spotkamy się we wtorek.
turn	skręcić; kolej	Skręć tutaj w lewo.
TV	telewizor; TV	Telewizor jest głośny.
twelve	dwanaście	Mam dwanaście długopisów.
twenty	dwadzieścia	Tu jest dwudziestu uczniów.
twice	dwa razy	Pływam dwa razy w tygodniu.
two	dwa	Dwie osoby czekają.
type	typ; rodzaj	Jaki to rodzaj muzyki?
umbrella	parasol	Weź parasol.
uncle	wujek	Mój wujek jest miły.
under	pod	Torba jest pod stołem.
understand	rozumieć	Rozumiem pytanie.
university	uniwersytet	Uniwersytet jest blisko.
until	do; aż do	Czekaj do piątej.
up	w górę; do góry	Wstań teraz.
upstairs	na górze	Mój pokój jest na górze.
us	nas; nam	Pomóż nam.
use	używać	Użyj tego długopisu.
useful	przydatny	Ta mapa jest przydatna.
usually	zwykle	Zwykle wracam pieszo.
vacation	wakacje	Nasze wakacje zaczynają się jutro.
vegetable	warzywo	Marchewka to warzywo.
very	bardzo	Pokój jest bardzo cichy.
video	wideo; film	Obejrzyj ten film.
village	wieś	Ta wieś jest mała.
visit	odwiedzać	Odwiedzamy ciocię.
visitor	gość; odwiedzający	Gość czeka na zewnątrz.
wait	czekać	Czekaj tutaj.
waiter	kelner	Kelner przynosi herbatę.
wake	budzić się; budzić	Budzę się wcześnie.
walk	iść pieszo; spacer	Idziemy pieszo do szkoły.
wall	ściana	Ściana jest biała.
want	chcieć	Chcę wody.
warm	ciepły; ogrzać	Pokój jest ciepły.
wash	myć; prać	Umyj ręce.
watch	oglądać; zegarek	Oglądam telewizję.
water	woda; podlewać	Wypij trochę wody.
way	droga; sposób	Ta droga jest krótka.
we	my	Uczymy się angielskiego.
wear	nosić	Mam na sobie kurtkę.
weather	pogoda	Pogoda jest zimna.
website	strona internetowa	Ta strona jest przydatna.
Wednesday	środa	Lekcja zaczyna się w środę.
week	tydzień	Ten tydzień jest zajęty.
weekend	weekend	Weekend zaczyna się jutro.
welcome	witamy; witać	Witamy w naszej klasie.
well	dobrze	Ona dobrze śpiewa.
west	zachód	Słońce zachodzi na zachodzie.
what	co	Co to jest?
when	kiedy	Kiedy się uczysz?
where	gdzie	Gdzie jest stacja?
which	który; które	Która torba jest twoja?
white	biały	Ściana jest biała.
who	kto	Kto to jest?
why	dlaczego	Dlaczego się spóźniłeś?
wife	żona	Jego żona jest nauczycielką.
will modal	będzie; czasownik modalny przyszłości	Pomogę ci.
win	wygrać	Nasza drużyna może wygrać.
window	okno	Otwórz okno.
wine	wino	To wino jest czerwone.
winter	zima	Zima tutaj jest zimna.
with	z; razem z	Chodź ze mną.
without	bez	Herbata bez cukru też jest dobra.
woman	kobieta	Ta kobieta czyta książkę.
wonderful	wspaniały	Widok jest wspaniały.
word	słowo	Napisz jedno słowo.
work	pracować; praca	Pracuję w domu.
worker	pracownik	Ten pracownik jest zajęty.
world	świat	Świat jest duży.
would modal	chciałby; forma modalna	Chciałbym herbatę.
write	pisać	Napisz swoje imię.
writer	pisarz	Pisarz mieszka tutaj.
writing	pisanie; pismo	Jej pismo jest czytelne.
wrong	błędny; zły	Ta odpowiedź jest błędna.
yeah	tak; jasne	Tak, mogę przyjść.
year	rok	Ten rok jest dobry.
yellow	żółty	Banan jest żółty.
yes	tak	Tak, rozumiem.
yesterday	wczoraj	Wczoraj zadzwoniłem.
you	ty; wy	Jesteś moim przyjacielem.
young	młody	To dziecko jest młode.
your	twój; wasz	Twoja torba jest tutaj.
yourself	siebie; sam	Weź herbatę sam.`;

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
  const lines = PL_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tPL\texample_PL") {
    throw new Error("Unexpected PL translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad PL translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad PL translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad PL translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad PL translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad PL example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate PL translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing PL translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`PL translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_pl_v1",
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
    PL: translation.display,
    example_PL: translation.example,
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
    "Generate the next support-language batch in language order: NL.",
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
    "- Article display: not applicable for Polish",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: PL Latin-script display/example cells and no non-Latin script",
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
