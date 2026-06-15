#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "IT";
const BATCH_ID = "it_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-it.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const IT_TRANSLATIONS_TSV = `source_headword	IT	example_IT
take	prendere; portare	Prendi il biglietto.
talk	parlare; la conversazione	Parliamo dopo la lezione.
tall	alto; alta	Il mio insegnante è alto.
taxi	il taxi	Il taxi è fuori.
tea	il tè	Questo tè è caldo.
teach	insegnare	Insegno inglese.
teacher	l'insegnante; il professore; la professoressa	La professoressa sorride.
team	la squadra	La nostra squadra vince oggi.
teenager	l'adolescente	L'adolescente legge un libro.
telephone	il telefono; telefonare	Il telefono è sulla scrivania.
television	la televisione; il televisore	La televisione è nuova.
tell	dire; raccontare	Dimmi il tuo nome.
ten	dieci	Ho dieci libri.
tennis	il tennis	Giochiamo a tennis oggi.
terrible	terribile	Il tempo è terribile.
test	il test; l'esame; testare	Il test comincia adesso.
text	il messaggio; mandare un messaggio	Manda un breve messaggio.
than	di; che	Dieci è più di due.
thank	ringraziare	Ringrazia il tuo insegnante.
thanks	grazie	Grazie per il tuo aiuto.
that	quello; quella; ciò	Quel libro è mio.
the	il; lo; la; l'; i; gli; le	Il tè è caldo.
theatre	il teatro	Il teatro è vicino alla stazione.
their	il loro; la loro; i loro; le loro	La loro casa è grande.
them	li; le; loro	Li conosco.
then	poi; allora	Mangia e poi studia.
there	lì; là; c'è	C'è una sedia lì.
they	loro; essi; esse	Loro sono a scuola.
thing	la cosa; l'oggetto	Questa cosa è utile.
think	pensare	Penso a casa.
third	terzo; terza; il terzo	Questa è la terza lezione.
thirsty	assetato; avere sete	Ho sete.
thirteen	tredici	Lei ha tredici anni.
thirty	trenta	Mia sorella ha trenta anni.
this	questo; questa	Questo biglietto è nuovo.
thousand	mille	Sono venute mille persone.
three	tre	Vedo tre uccelli.
through	attraverso; per	Camminiamo attraverso il parco.
Thursday	giovedì	Ci vediamo giovedì.
ticket	il biglietto; l'ingresso	Ho bisogno di un biglietto.
time	il tempo; l'ora	Che ore sono?
tired	stanco; stanca	Sono stanco.
title	il titolo	Leggi il titolo.
to	a; per; da; marcatore dell'infinito	Vado a lezione.
today	oggi	Oggi c'è il sole.
together	insieme	Mangiamo insieme.
toilet	il bagno; il WC	Il bagno è pulito.
tomato	il pomodoro	Questo pomodoro è rosso.
tomorrow	domani	A domani.
tonight	stasera	Studiamo stasera.
too	anche; troppo	Voglio anche del tè.
tooth	il dente	Mi fa male un dente.
topic	l'argomento	Scegli un argomento.
tourist	il turista; la turista	Il turista scatta foto.
town	la città; il paese	Questa città è tranquilla.
traffic	il traffico	Il traffico è lento.
train	il treno; allenare	Il treno arriva in ritardo.
travel	viaggiare; il viaggio	Viaggiamo in treno.
tree	l'albero	L'albero è alto.
trip	il viaggio; la gita	Il viaggio comincia domani.
trousers	i pantaloni	I miei pantaloni sono neri.
true	vero	Questa storia è vera.
try	provare; cercare	Prova questo tè.
T-shirt	la maglietta; la t-shirt	Indosso una maglietta.
Tuesday	martedì	Ci vediamo martedì.
turn	girare; il turno	Gira a sinistra qui.
TV	la TV; il televisore	La TV ha il volume troppo alto.
twelve	dodici	Ho dodici penne.
twenty	venti	Ci sono venti studenti qui.
twice	due volte	Nuoto due volte alla settimana.
two	due	Due persone aspettano.
type	il tipo; digitare	Che tipo di musica?
umbrella	l'ombrello	Prendi un ombrello.
uncle	lo zio	Mio zio è gentile.
under	sotto	La borsa è sotto il tavolo.
understand	capire	Capisco la domanda.
university	l'università	L'università è vicina.
until	fino a	Aspetta fino alle cinque.
up	su; in alto	Alzati adesso.
upstairs	di sopra; al piano di sopra	La mia stanza è di sopra.
us	noi; ci	Aiutaci, per favore.
use	usare; l'uso	Usa questa penna.
useful	utile	Questa mappa è utile.
usually	di solito	Di solito torno a casa a piedi.
vacation	le vacanze	Le nostre vacanze cominciano domani.
vegetable	la verdura; l'ortaggio	La carota è una verdura.
very	molto	La stanza è molto tranquilla.
video	il video	Guarda questo video.
village	il villaggio; il paese	Il villaggio è piccolo.
visit	visitare; la visita	Visitiamo nostra zia.
visitor	il visitatore; la visitatrice	Il visitatore aspetta fuori.
wait	aspettare	Aspetta qui, per favore.
waiter	il cameriere; la cameriera	Il cameriere porta il tè.
wake	svegliare; svegliarsi	Mi sveglio presto.
walk	camminare; la passeggiata	Camminiamo verso la scuola.
wall	il muro; la parete	La parete è bianca.
want	volere	Voglio acqua.
warm	caldo; tiepido; riscaldare	La stanza è calda.
wash	lavare	Lavati le mani.
watch	guardare; l'orologio	Guardo la televisione.
water	l'acqua; annaffiare	Bevi un po' d'acqua.
way	la strada; il modo	Questa strada è breve.
we	noi	Studiamo inglese.
wear	indossare	Porto una giacca.
weather	il tempo; il meteo	Il tempo è freddo.
website	il sito web	Questo sito web è utile.
Wednesday	mercoledì	La lezione comincia mercoledì.
week	la settimana	Questa settimana è impegnativa.
weekend	il fine settimana	Il fine settimana comincia domani.
welcome	benvenuto; benvenuta; accogliere	Benvenuto nella nostra classe.
well	bene	Lei canta bene.
west	l'ovest	Il sole tramonta a ovest.
what	che cosa; quale	Che cos'è?
when	quando	Quando studi?
where	dove	Dov'è la stazione?
which	quale	Quale borsa è tua?
white	bianco; bianca	La parete è bianca.
who	chi	Chi è?
why	perché	Perché arrivi in ritardo?
wife	la moglie	Sua moglie è insegnante.
will modal	indicatore del futuro; volere	Ti aiuterò domani.
win	vincere	La nostra squadra può vincere.
window	la finestra	Apri la finestra.
wine	il vino	Questo vino è rosso.
winter	l'inverno	L'inverno è freddo qui.
with	con	Vieni con me.
without	senza	Il tè senza zucchero va bene.
woman	la donna	La donna legge un libro.
wonderful	meraviglioso; meravigliosa	La vista è meravigliosa.
word	la parola	Scrivi una parola.
work	lavorare; il lavoro	Lavoro a casa.
worker	il lavoratore; la lavoratrice	Il lavoratore è occupato.
world	il mondo	Il mondo è grande.
would modal	condizionale; vorrei	Vorrei del tè.
write	scrivere	Scrivi il tuo nome.
writer	lo scrittore; la scrittrice	Lo scrittore vive qui.
writing	la scrittura; il testo	La sua scrittura è chiara.
wrong	sbagliato; errato	Questa risposta è sbagliata.
yeah	sì; certo	Sì, posso venire.
year	l'anno	Quest'anno è buono.
yellow	giallo; gialla	La banana è gialla.
yes	sì	Sì, capisco.
yesterday	ieri	Ho chiamato ieri.
you	tu; voi; Lei	Tu sei mio amico.
young	giovane	Il bambino è giovane.
your	tuo; tua; tuoi; tue; Suo; Vostro	La tua borsa è qui.
yourself	te stesso; sé stesso	Serviti del tè.`;

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
  const lines = IT_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tIT\texample_IT") {
    throw new Error("Unexpected IT translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad IT translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad IT translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad IT example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate IT translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing IT translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`IT translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_it_article_display_v1",
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
    IT: translation.display,
    example_IT: translation.example,
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
    "Generate the next support-language batch in language order: PT.",
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
    "- Article display: included in Italian display cells where grammatically useful",
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
