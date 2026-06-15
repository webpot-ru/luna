#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "DE";
const BATCH_ID = "de_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-de.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const DE_TRANSLATIONS_TSV = `source_headword	DE	example_DE
take	nehmen; mitnehmen	Nimm das Ticket.
talk	sprechen; das Gespräch	Wir sprechen nach dem Unterricht.
tall	groß	Mein Lehrer ist groß.
taxi	das Taxi	Das Taxi steht draußen.
tea	der Tee	Dieser Tee ist heiß.
teach	unterrichten	Ich unterrichte Englisch.
teacher	der Lehrer; die Lehrerin	Die Lehrerin lächelt.
team	das Team; die Mannschaft	Unser Team gewinnt heute.
teenager	der Teenager; die Teenagerin	Der Teenager liest ein Buch.
telephone	das Telefon; telefonieren	Das Telefon steht auf dem Schreibtisch.
television	das Fernsehen; der Fernseher	Der Fernseher ist neu.
tell	sagen; erzählen	Sag mir deinen Namen.
ten	zehn	Ich habe zehn Bücher.
tennis	das Tennis	Wir spielen heute Tennis.
terrible	schrecklich	Das Wetter ist schrecklich.
test	der Test; die Prüfung; testen	Der Test beginnt jetzt.
text	die Textnachricht; schreiben	Schreib eine kurze Nachricht.
than	als	Zehn ist mehr als zwei.
thank	danken	Bedanke dich bei deinem Lehrer.
thanks	danke	Danke für deine Hilfe.
that	das; dieser; jener	Das Buch gehört mir.
the	der; die; das	Der Tee ist heiß.
theatre	das Theater	Das Theater ist nahe dem Bahnhof.
their	ihr; ihre	Ihr Haus ist groß.
them	sie; ihnen	Ich kenne sie.
then	dann; danach	Iss und lerne danach.
there	dort; da; es gibt	Dort steht ein Stuhl.
they	sie	Sie sind in der Schule.
thing	die Sache; das Ding	Diese Sache ist nützlich.
think	denken	Ich denke an mein Zuhause.
third	dritte; der dritte Teil	Das ist die dritte Lektion.
thirsty	durstig; Durst haben	Ich habe Durst.
thirteen	dreizehn	Sie ist dreizehn Jahre alt.
thirty	dreißig	Meine Schwester ist dreißig.
this	dies; dieser; diese	Dieses Ticket ist neu.
thousand	tausend	Tausend Menschen kamen.
three	drei	Ich sehe drei Vögel.
through	durch; über	Wir gehen durch den Park.
Thursday	der Donnerstag	Wir sehen uns am Donnerstag.
ticket	das Ticket; die Eintrittskarte	Ich brauche ein Ticket.
time	die Zeit; die Uhrzeit	Wie spät ist es?
tired	müde	Ich bin müde.
title	der Titel	Lies den Titel.
to	zu; nach; um; Infinitivmarker	Ich gehe zum Unterricht.
today	heute	Heute scheint die Sonne.
together	zusammen	Wir essen zusammen.
toilet	die Toilette	Die Toilette ist sauber.
tomato	die Tomate	Diese Tomate ist rot.
tomorrow	morgen	Bis morgen.
tonight	heute Abend	Wir lernen heute Abend.
too	auch; zu	Ich möchte auch Tee.
tooth	der Zahn	Mir tut ein Zahn weh.
topic	das Thema	Wähle ein Thema.
tourist	der Tourist; die Touristin	Der Tourist macht Fotos.
town	die Stadt; der Ort	Diese Stadt ist ruhig.
traffic	der Verkehr	Der Verkehr ist langsam.
train	der Zug; trainieren	Der Zug kommt zu spät.
travel	reisen; die Reise	Wir reisen mit dem Zug.
tree	der Baum	Der Baum ist groß.
trip	die Reise; der Ausflug	Die Reise beginnt morgen.
trousers	die Hose	Meine Hose ist schwarz.
true	wahr; richtig	Diese Geschichte ist wahr.
try	versuchen; probieren	Probier diesen Tee.
T-shirt	das T-Shirt	Ich trage ein T-Shirt.
Tuesday	der Dienstag	Wir sehen uns am Dienstag.
turn	drehen; abbiegen; die Reihe	Bieg hier links ab.
TV	der Fernseher; das Fernsehen	Der Fernseher ist zu laut.
twelve	zwölf	Ich habe zwölf Stifte.
twenty	zwanzig	Hier sind zwanzig Studenten.
twice	zweimal	Ich schwimme zweimal pro Woche.
two	zwei	Zwei Personen warten.
type	der Typ; die Art; tippen	Welche Art von Musik?
umbrella	der Regenschirm	Nimm einen Regenschirm.
uncle	der Onkel	Mein Onkel ist freundlich.
under	unter	Die Tasche ist unter dem Tisch.
understand	verstehen	Ich verstehe die Frage.
university	die Universität	Die Universität ist in der Nähe.
until	bis	Warte bis fünf Uhr.
up	oben; nach oben	Steh jetzt auf.
upstairs	oben; im Obergeschoss	Mein Zimmer ist oben.
us	uns	Bitte hilf uns.
use	benutzen; die Verwendung	Benutz diesen Stift.
useful	nützlich	Diese Karte ist nützlich.
usually	normalerweise	Normalerweise gehe ich zu Fuß nach Hause.
vacation	der Urlaub; die Ferien	Unser Urlaub beginnt morgen.
vegetable	das Gemüse	Die Karotte ist ein Gemüse.
very	sehr	Das Zimmer ist sehr ruhig.
video	das Video	Schau dieses Video an.
village	das Dorf	Das Dorf ist klein.
visit	besuchen; der Besuch	Wir besuchen unsere Tante.
visitor	der Besucher; die Besucherin	Der Besucher wartet draußen.
wait	warten	Bitte warte hier.
waiter	der Kellner; die Kellnerin	Der Kellner bringt Tee.
wake	wecken; aufwachen	Ich wache früh auf.
walk	gehen; spazieren gehen; der Spaziergang	Wir gehen zur Schule.
wall	die Wand	Die Wand ist weiß.
want	wollen	Ich will Wasser.
warm	warm; wärmen	Das Zimmer ist warm.
wash	waschen	Wasch dir die Hände.
watch	anschauen; beobachten; die Uhr	Ich sehe fern.
water	das Wasser; gießen	Trink etwas Wasser.
way	der Weg; die Art	Dieser Weg ist kurz.
we	wir	Wir lernen Englisch.
wear	tragen	Ich trage eine Jacke.
weather	das Wetter	Das Wetter ist kalt.
website	die Website; die Webseite	Diese Website ist nützlich.
Wednesday	der Mittwoch	Der Kurs beginnt am Mittwoch.
week	die Woche	Diese Woche ist voll.
weekend	das Wochenende	Das Wochenende beginnt morgen.
welcome	willkommen; begrüßen	Willkommen in unserer Klasse.
well	gut	Sie singt gut.
west	der Westen	Die Sonne geht im Westen unter.
what	was; welcher	Was ist das?
when	wann	Wann lernst du?
where	wo	Wo ist der Bahnhof?
which	welcher; welche	Welche Tasche gehört dir?
white	weiß	Die Wand ist weiß.
who	wer	Wer ist das?
why	warum	Warum kommst du zu spät?
wife	die Ehefrau	Seine Ehefrau ist Lehrerin.
will modal	werden; Zukunftsmarker	Ich werde dir morgen helfen.
win	gewinnen	Unser Team kann gewinnen.
window	das Fenster	Öffne das Fenster.
wine	der Wein	Dieser Wein ist rot.
winter	der Winter	Der Winter ist hier kalt.
with	mit	Komm mit mir.
without	ohne	Tee ohne Zucker ist gut.
woman	die Frau	Die Frau liest ein Buch.
wonderful	wunderbar	Die Aussicht ist wunderbar.
word	das Wort	Schreib ein Wort.
work	arbeiten; die Arbeit	Ich arbeite zu Hause.
worker	der Arbeiter; die Arbeiterin	Der Arbeiter ist beschäftigt.
world	die Welt	Die Welt ist groß.
would modal	würde; Konditionalmarker	Ich würde gern Tee trinken.
write	schreiben	Schreib deinen Namen.
writer	der Schriftsteller; die Schriftstellerin	Der Schriftsteller lebt hier.
writing	das Schreiben; die Schrift	Die Schrift ist klar.
wrong	falsch	Diese Antwort ist falsch.
yeah	ja; klar	Ja, ich kann kommen.
year	das Jahr	Dieses Jahr ist gut.
yellow	gelb	Die Banane ist gelb.
yes	ja	Ja, ich verstehe.
yesterday	gestern	Ich habe gestern angerufen.
you	du; Sie; ihr	Du bist mein Freund.
young	jung	Das Kind ist jung.
your	dein; deine; Ihr; Ihre	Deine Tasche ist hier.
yourself	dich selbst; sich selbst; Sie selbst	Nimm dir Tee.`;

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
  const lines = DE_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tDE\texample_DE") {
    throw new Error("Unexpected DE translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad DE translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad DE translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad DE example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate DE translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing DE translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`DE translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_de_article_display_v1",
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
    DE: translation.display,
    example_DE: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
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
    "Generate the next support-language batch in language order: IT.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
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
    "- Article display: included in German display cells where grammatically useful",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows);
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
