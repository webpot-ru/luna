#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "IT";
const BATCH_ID = "it_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-it.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const IT_TRANSLATIONS_TSV = `source_headword	IT	example_IT
clothes	i vestiti	I miei vestiti sono puliti.
club	il club	Lei va in un club di musica.
coat	il cappotto	Il mio cappotto è caldo.
coffee	il caffè	Bevo caffè al mattino.
cold	freddo; il freddo	L'acqua è fredda.
college	l'università	Mia sorella studia all'università.
colour	il colore	Il mio colore preferito è il blu.
come	venire	Vieni qui, per favore.
common	comune	Questo nome è comune.
company	l'azienda	Mia madre lavora in un'azienda.
compare	confrontare	Confronta queste due immagini.
complete	completo; completare	Il modulo è completo.
computer	il computer	Questo computer è nuovo.
concert	il concerto	Stasera andiamo a un concerto.
conversation	la conversazione	Abbiamo avuto una breve conversazione.
cook	cucinare; il cuoco	Cucino la cena a casa.
cooking	la cucina; cucinare	Mi piace cucinare con mio padre.
cool	fresco; forte	La stanza è fresca.
correct	corretto; correggere	La tua risposta è corretta.
cost	costare; il costo	Quanto costa questo?
could modal	potrebbe	Potrei aiutarti.
country	il paese	Il Canada è un grande paese.
course	il corso	Seguo un corso di inglese.
cousin	il cugino/la cugina	Mio cugino vive vicino.
cow	la mucca	La mucca mangia erba.
cream	la panna; la crema	Aggiungo panna al caffè.
create	creare	Loro creano un nuovo gioco.
culture	la cultura	Studiamo la cultura locale.
cup	la tazza	Questa tazza è vuota.
customer	il cliente/la cliente	Il cliente fa una domanda.
cut	tagliare	Taglia la mela a metà.
dad	papà	Papà è al lavoro.
dance	la danza; ballare	Balliamo dopo cena.
dancer	il ballerino/la ballerina	Il ballerino si muove velocemente.
dancing	la danza; ballare	Ballare è divertente.
dangerous	pericoloso	Questa strada è pericolosa.
dark	scuro; buio	La stanza è buia.
date	la data	Che data è oggi?
daughter	la figlia	Sua figlia ha sei anni.
day	il giorno	Buona giornata.
dear	caro	Caro amico, grazie.
December	dicembre	Il mio compleanno è a dicembre.
decide	decidere	Decidi ora, per favore.
delicious	delizioso	Questa zuppa è deliziosa.
describe	descrivere	Descrivi la tua stanza.
description	la descrizione	Leggi la breve descrizione.
design	il design; progettare	Faccio un design semplice per la carta.
desk	la scrivania	Il libro è sulla mia scrivania.
detail	il dettaglio	Manca un dettaglio.
dialogue	il dialogo	Leggi il dialogo adesso.
dictionary	il dizionario	Usa un dizionario in classe.
die	morire	I fiori muoiono senza acqua.
diet	la dieta; l'alimentazione	La mia dieta include frutta.
difference	la differenza	C'è una differenza.
different	diverso	Abbiamo nomi diversi.
difficult	difficile	Questa domanda è difficile.
dinner	la cena	La cena è pronta.
dirty	sporco	Le mie scarpe sono sporche.
discuss	discutere	Discutiamo il piano.
dish	il piatto	Questo piatto è caldo.
do1	fare	Che cosa fai?
doctor	il medico/la medica	Il medico è occupato.
dog	il cane	Il cane corre fuori.
dollar	il dollaro	Questo costa un dollaro.
door	la porta	Chiudi la porta, per favore.
down	giù; in basso	Siediti qui sotto.
downstairs	al piano di sotto	La cucina è al piano di sotto.
draw	disegnare	Disegna una piccola casa.
dress	il vestito; vestirsi	Lei indossa un vestito rosso.
drink	la bevanda; bere	Bevo acqua.
drive	guidare	Guido per andare al lavoro.
driver	l'autista	L'autista si ferma qui.
during	durante	Dormo durante il volo.
DVD	il DVD	Questo DVD è vecchio.
each	ogni	Ogni bambino ha un libro.
ear	l'orecchio	Mi fa male l'orecchio.
early	presto; precoce	Mi alzo presto.
east	l'est	Il sole sorge a est.
easy	facile	Questo test è facile.
eat	mangiare	Mangiamo insieme.
egg	l'uovo	Mangio un uovo.
eight	otto	Ho otto carte.
eighteen	diciotto	Lei ha diciotto anni.
eighty	ottanta	Mio nonno ha ottanta anni.
elephant	l'elefante	L'elefante è grande.
eleven	undici	La lezione inizia alle undici.
else	altro	Di che altro hai bisogno?
email	l'e-mail	Mandami un'e-mail.
end	la fine; finire	Questa è la fine.
enjoy	godersi; apprezzare	Mi godo questa canzone.
enough	abbastanza	Abbiamo abbastanza tempo.
euro	l'euro	Questo costa un euro.
even	persino; anche	Persino mio fratello lo sa.
evening	la sera	Ci vediamo questa sera.
event	l'evento	L'evento inizia oggi.
ever	mai	Cucini mai?
every	ogni	Studio ogni giorno.
everybody	tutti	Tutti sono qui.
everyone	tutti	A tutti piace la musica.
everything	tutto	Tutto è pronto.
exam	l'esame	L'esame inizia presto.
example	l'esempio	Questo è un buon esempio.
excited	emozionato	Sono emozionato oggi.
exciting	emozionante	Il gioco è emozionante.
exercise	l'esercizio; fare esercizio	Faccio esercizio prima di colazione.
expensive	caro	Questo cappotto è caro.
explain	spiegare	Spiega questa parola, per favore.
extra	extra; aggiuntivo	Ho bisogno di tempo extra.
eye	l'occhio	Ho l'occhio rosso.
face	il viso	Lavati il viso.
fact	il fatto	Questo fatto è importante.
fall	cadere; l'autunno	Le foglie cadono in autunno.
false	falso	Questa risposta è falsa.
family	la famiglia	La mia famiglia è piccola.
famous	famoso	Lei è una cantante famosa.
fantastic	fantastico	Il concerto è stato fantastico.
far	lontano	La scuola è lontana.
farm	la fattoria	Vivono in una fattoria.
farmer	l'agricoltore/l'agricoltrice	L'agricoltore coltiva cibo.
fast	veloce	Questo treno è veloce.
fat	grasso	Il gatto è grasso.
father	il padre	Mio padre è alto.
favourite	preferito	Questa è la mia canzone preferita.
February	febbraio	Febbraio è freddo qui.
feel	sentire; sentirsi	Mi sento felice.
feeling	il sentimento; la sensazione	Conosco questa sensazione.
festival	il festival	Il festival inizia domani.
few	pochi; alcuni	Ci sono pochi studenti qui.
fifteen	quindici	Ho quindici anni.
fifth	quinto	Questa è la quinta lezione.
fifty	cinquanta	Mia madre ha cinquanta anni.
fill	riempire; compilare	Riempi la tazza d'acqua.
film	il film	Guardiamo un film.
final	finale; ultimo	Questa è l'ultima domanda.
find	trovare	Trovo le chiavi.
fine	bene; buono	Ora sto bene.
finish	finire	Finisci i compiti.
fire	il fuoco; l'incendio	Il fuoco è caldo.
first	primo	Lei è la prima in fila.
fish	il pesce	Mangio pesce a cena.
five	cinque	Ho cinque libri.
flat	l'appartamento	Il mio appartamento è piccolo.
flight	il volo	Il volo è in ritardo.
floor	il pavimento; il piano	La borsa è sul pavimento.
flower	il fiore	Questo fiore è giallo.
fly	volare	Gli uccelli volano nel cielo.
follow	seguire	Seguimi, per favore.
food	il cibo	Il cibo è pronto.
foot	il piede	Mi fa male il piede.
football	il calcio	Giochiamo a calcio oggi.
for	per	Questo regalo è per te.
forget	dimenticare	Non dimenticare le chiavi.
form	il modulo	Compila il modulo.
forty	quaranta	Mio padre ha quaranta anni.
four	quattro	Vedo quattro uccelli.
fourteen	quattordici	Lei ha quattordici anni.
fourth	quarto	Questo è il quarto piano.
free	gratis; libero	Il biglietto è gratis.
Friday	venerdì	Ci vediamo venerdì.
friend	l'amico/l'amica	Il mio amico è qui.
friendly	amichevole	L'insegnante è amichevole.
from	da; di	Vengo da qui.
front	il davanti; davanti	Mettiti davanti.
fruit	la frutta; il frutto	Mangio frutta ogni giorno.
full	pieno	La bottiglia è piena.
fun	il divertimento; divertente	Questo gioco è divertente.
funny	divertente	Il film è divertente.
future	il futuro	Pensa al tuo futuro.
game	il gioco	Il gioco inizia adesso.
garden	il giardino	Il giardino è bello.
geography	la geografia	Studio geografia a scuola.
get	ricevere; arrivare	Arrivo a casa alle sei.
girl	la ragazza; la bambina	La ragazza sorride.
girlfriend	la fidanzata	La sua fidanzata è gentile.
give	dare	Dammi il libro.
glass	il bicchiere; il vetro	Bevo da un bicchiere.
go	andare	Andiamo a casa adesso.
good	buono	Questo caffè è buono.
goodbye	arrivederci	Arrivederci, a domani.
grandfather	il nonno	Mio nonno è anziano.
grandmother	la nonna	Mia nonna prepara la zuppa.
grandparent	il nonno/la nonna	Uno dei miei nonni vive con noi.
great	ottimo; grande	È un'ottima idea.
green	verde	La porta è verde.
grey	grigio	Il cielo è grigio.
group	il gruppo	Lavorate in un piccolo gruppo.
grow	crescere; coltivare	Le piante crescono in giardino.
guess	indovinare; l'ipotesi	Indovina la risposta.
guitar	la chitarra	Lui suona la chitarra.
gym	la palestra	Vado in palestra.
hair	i capelli	Lei ha i capelli lunghi.
half	la metà	Taglia la torta a metà.
hand	la mano	Alza la mano.
happen	succedere	Che cosa succede dopo?
happy	felice	Sono felice oggi.
hard	duro; difficile	Questa sedia è dura.
hat	il cappello	Il mio cappello è nero.
hate	odiare	Odio il tè freddo.
have	avere	Ho una macchina.
have to modal	dovere	Devo studiare.
he	lui	Lui è mio fratello.
head	la testa	Mi fa male la testa.
health	la salute	Il buon cibo aiuta la salute.
healthy	sano	Questo piatto è sano.
hear	sentire	Sento la musica.
hello	ciao; buongiorno	Ciao, piacere di conoscerti.
help	l'aiuto; aiutare	Aiutami, per favore.
her	suo; lei	Questa è la sua borsa.
here	qui	Vieni qui adesso.
hey	ehi	Ehi, aspettami.
hi	ciao	Ciao, come stai?
high	alto	Il muro è alto.
him	lui; lo	Lo conosco.
his	suo	Il suo cappotto è blu.
history	la storia	Studio storia.
hobby	l'hobby	Leggere è il mio hobby.
holiday	la vacanza	Andiamo in vacanza a luglio.
home	la casa; a casa	Sono a casa.
homework	i compiti	Fai i compiti stasera.
hope	sperare	Spero che tu venga.
horse	il cavallo	Il cavallo corre veloce.
hospital	l'ospedale	L'ospedale è vicino.
hot	caldo	La zuppa è calda.
hotel	l'hotel	L'hotel è pulito.
hour	l'ora	Aspetta un'ora.
house	la casa	Questa casa è vecchia.
how	come	Come stai?
however	tuttavia	Tuttavia posso restare qui.
hundred	cento	Sono venute cento persone.
hungry	affamato	Ho fame.
husband	il marito	Suo marito è medico.
I	io	Amo il tè.
ice	il ghiaccio	Il ghiaccio è freddo.
ice cream	il gelato	Voglio un gelato.
idea	l'idea	È una buona idea.
if	se	Chiamami se hai bisogno di aiuto.
imagine	immaginare	Immagina una piccola casa.
important	importante	Questa lezione è importante.
improve	migliorare	Voglio migliorare.
in	in; dentro	Le chiavi sono nella mia borsa.
include	includere	Includi il tuo nome, per favore.
information	l'informazione	Ho bisogno di più informazioni.
interest	l'interesse	Lei si interessa all'arte.
interested	interessato	Mi interessa la musica.
interesting	interessante	Questo libro è interessante.
internet	internet	Internet è lento.
interview	il colloquio; l'intervista	Ho un colloquio oggi.
into	in; dentro	Metti i libri nella borsa.
introduce	presentare	Presenta il tuo amico, per favore.
island	l'isola	Questa isola è piccola.
it	esso; questo	Fa freddo.
its	suo	Al cane piace il suo letto.
jacket	la giacca	La mia giacca è nuova.
January	gennaio	Gennaio è il primo mese.
jeans	i jeans	I miei jeans sono blu.
job	il lavoro	Ho bisogno di un nuovo lavoro.
join	unirsi	Unisciti alla nostra lezione oggi.
journey	il viaggio	Il viaggio è lungo.
juice	il succo	Bevo succo d'arancia.
July	luglio	Viaggiamo a luglio.
June	giugno	La scuola finisce a giugno.
just	solo; appena	Ho solo bisogno d'acqua.
keep	tenere; conservare	Tieni questa chiave.
key	la chiave	Ho perso la chiave.
kilometre	il chilometro	Cammina per un chilometro.
kind (type)	il tipo	Che tipo di musica ti piace?
kitchen	la cucina	La cucina è pulita.
know	sapere; conoscere	So la risposta.
land	la terra	L'aereo è a terra.
language	la lingua	L'inglese è una lingua.
large	grande	Questa stanza è grande.
last1 (final)	ultimo	Questa è l'ultima pagina.
late	tardi; in ritardo	L'autobus è in ritardo.
later	più tardi	A più tardi.
laugh	ridere; la risata	Ridiamo insieme.
learn	imparare	Imparo l'inglese.
leave	partire; lasciare	Lascia la porta aperta.
left	sinistra; sinistro	Gira a sinistra qui.
leg	la gamba	Mi fa male la gamba.
lesson	la lezione	La lezione inizia adesso.
let	lasciare; permettere	Lascia che ti aiuti.
letter	la lettera	Scrivo una lettera.
library	la biblioteca	La biblioteca apre alle nove.
lie1	sdraiarsi	Sdraiati sul letto, per favore.
life	la vita	La vita in città è vivace.
like (similar)	come; simile a	Questo sembra un gioco.
like (find sb/sth pleasant)	piacere	Mi piace questa canzone.
line	la linea; la fila	Mettiti in fila.
lion	il leone	Il leone dorme.
list	la lista; fare una lista	Fai una lista della spesa.
listen	ascoltare	Ascolta l'insegnante.
little	piccolo; poco	Ho pochi soldi.
live1	vivere	Abito vicino alla scuola.
local	locale	Questo è un negozio locale.
long1	lungo	La strada è lunga.
look	guardare; sembrare	Guarda l'immagine.
lose	perdere	Non perdere il biglietto.
lot	molto; un sacco	Ho molti compiti.
love	l'amore; amare	Amo la mia famiglia.
lunch	il pranzo	Il pranzo è pronto.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
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
    reviewer: "codex_oxford_part002_support_translation_batch_it_v1",
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order.",
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
    `# Oxford Part 002 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
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
