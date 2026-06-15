#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "DE";
const BATCH_ID = "de_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-de.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const DE_TRANSLATIONS_TSV = `source_headword	DE	example_DE
clothes	die Kleidung	Meine Kleidung ist sauber.
club	der Club	Sie geht in einen Musikclub.
coat	der Mantel	Mein Mantel ist warm.
coffee	der Kaffee	Ich trinke morgens Kaffee.
cold	kalt; die Kälte	Das Wasser ist kalt.
college	die Hochschule	Meine Schwester studiert an der Hochschule.
colour	die Farbe	Meine Lieblingsfarbe ist Blau.
come	kommen	Komm bitte hierher.
common	gewöhnlich; häufig	Dieser Name ist häufig.
company	die Firma	Meine Mutter arbeitet in einer Firma.
compare	vergleichen	Vergleiche diese zwei Bilder.
complete	vollständig; vervollständigen	Das Formular ist vollständig.
computer	der Computer	Dieser Computer ist neu.
concert	das Konzert	Wir gehen heute Abend zu einem Konzert.
conversation	das Gespräch	Wir hatten ein kurzes Gespräch.
cook	kochen; der Koch	Ich koche das Abendessen zu Hause.
cooking	das Kochen	Ich koche gern mit meinem Vater.
cool	kühl; toll	Das Zimmer ist kühl.
correct	richtig; korrigieren	Deine Antwort ist richtig.
cost	kosten; die Kosten	Wie viel kostet das?
could modal	könnte	Ich könnte dir helfen.
country	das Land	Kanada ist ein großes Land.
course	der Kurs	Ich mache einen Englischkurs.
cousin	der Cousin/die Cousine	Mein Cousin wohnt in der Nähe.
cow	die Kuh	Die Kuh frisst Gras.
cream	die Sahne; die Creme	Ich gebe Sahne in den Kaffee.
create	erstellen; schaffen	Sie erstellen ein neues Spiel.
culture	die Kultur	Wir lernen die lokale Kultur kennen.
cup	die Tasse	Diese Tasse ist leer.
customer	der Kunde/die Kundin	Der Kunde stellt eine Frage.
cut	schneiden	Schneide den Apfel in zwei Hälften.
dad	der Papa	Papa ist bei der Arbeit.
dance	der Tanz; tanzen	Wir tanzen nach dem Abendessen.
dancer	der Tänzer/die Tänzerin	Der Tänzer bewegt sich schnell.
dancing	das Tanzen	Tanzen macht Spaß.
dangerous	gefährlich	Diese Straße ist gefährlich.
dark	dunkel	Das Zimmer ist dunkel.
date	das Datum	Welches Datum ist heute?
daughter	die Tochter	Ihre Tochter ist sechs Jahre alt.
day	der Tag	Ich wünsche dir einen schönen Tag.
dear	lieber; sehr geehrt	Lieber Freund, danke.
December	der Dezember	Mein Geburtstag ist im Dezember.
decide	entscheiden	Entscheide bitte jetzt.
delicious	lecker	Diese Suppe ist lecker.
describe	beschreiben	Beschreibe dein Zimmer.
description	die Beschreibung	Lies die kurze Beschreibung.
design	das Design; entwerfen	Ich mache ein einfaches Kartendesign.
desk	der Schreibtisch	Das Buch liegt auf meinem Schreibtisch.
detail	das Detail	Ein Detail fehlt.
dialogue	der Dialog	Lies jetzt den Dialog.
dictionary	das Wörterbuch	Benutze im Unterricht ein Wörterbuch.
die	sterben	Blumen sterben ohne Wasser.
diet	die Ernährung; die Diät	Zu meiner Ernährung gehört Obst.
difference	der Unterschied	Es gibt einen Unterschied.
different	anders; verschieden	Wir haben verschiedene Namen.
difficult	schwierig	Diese Frage ist schwierig.
dinner	das Abendessen	Das Abendessen ist fertig.
dirty	schmutzig	Meine Schuhe sind schmutzig.
discuss	besprechen	Wir besprechen den Plan.
dish	das Gericht; der Teller	Dieses Gericht ist heiß.
do1	tun; machen	Was machst du?
doctor	der Arzt/die Ärztin	Der Arzt ist beschäftigt.
dog	der Hund	Der Hund läuft draußen.
dollar	der Dollar	Das kostet einen Dollar.
door	die Tür	Schließ bitte die Tür.
down	nach unten; unten	Setz dich hier unten hin.
downstairs	unten; im Erdgeschoss	Die Küche ist unten.
draw	zeichnen	Zeichne ein kleines Haus.
dress	das Kleid; sich anziehen	Sie trägt ein rotes Kleid.
drink	das Getränk; trinken	Ich trinke Wasser.
drive	fahren	Ich fahre mit dem Auto zur Arbeit.
driver	der Fahrer/die Fahrerin	Der Fahrer hält hier an.
during	während	Ich schlafe während des Fluges.
DVD	die DVD	Diese DVD ist alt.
each	jeder; jede	Jedes Kind hat ein Buch.
ear	das Ohr	Mein Ohr tut weh.
early	früh	Ich stehe früh auf.
east	der Osten	Die Sonne geht im Osten auf.
easy	einfach	Dieser Test ist einfach.
eat	essen	Wir essen zusammen.
egg	das Ei	Ich esse ein Ei.
eight	acht	Ich habe acht Karten.
eighteen	achtzehn	Sie ist achtzehn Jahre alt.
eighty	achtzig	Mein Großvater ist achtzig.
elephant	der Elefant	Der Elefant ist groß.
eleven	elf	Der Unterricht beginnt um elf.
else	sonst; anderer	Was brauchst du sonst?
email	die E-Mail	Schick mir eine E-Mail.
end	das Ende; enden	Das ist das Ende.
enjoy	genießen	Ich genieße dieses Lied.
enough	genug	Wir haben genug Zeit.
euro	der Euro	Das kostet einen Euro.
even	sogar	Sogar mein Bruder weiß es.
evening	der Abend	Wir treffen uns heute Abend.
event	die Veranstaltung	Die Veranstaltung beginnt heute.
ever	jemals	Kochst du jemals?
every	jeder; jede	Ich lerne jeden Tag.
everybody	alle	Alle sind hier.
everyone	jeder; alle	Alle mögen Musik.
everything	alles	Alles ist fertig.
exam	die Prüfung	Die Prüfung beginnt bald.
example	das Beispiel	Das ist ein gutes Beispiel.
excited	aufgeregt	Ich bin heute aufgeregt.
exciting	spannend	Das Spiel ist spannend.
exercise	die Übung; Sport machen	Ich mache vor dem Frühstück Sport.
expensive	teuer	Dieser Mantel ist teuer.
explain	erklären	Erklär bitte dieses Wort.
extra	zusätzlich	Ich brauche zusätzliche Zeit.
eye	das Auge	Mein Auge ist rot.
face	das Gesicht	Wasch dein Gesicht.
fact	die Tatsache	Diese Tatsache ist wichtig.
fall	fallen; der Herbst	Die Blätter fallen im Herbst.
false	falsch	Diese Antwort ist falsch.
family	die Familie	Meine Familie ist klein.
famous	berühmt	Sie ist eine berühmte Sängerin.
fantastic	fantastisch	Das Konzert war fantastisch.
far	weit; fern	Die Schule ist weit weg.
farm	der Bauernhof	Sie wohnen auf einem Bauernhof.
farmer	der Bauer/die Bäuerin	Der Bauer baut Lebensmittel an.
fast	schnell	Dieser Zug ist schnell.
fat	dick	Die Katze ist dick.
father	der Vater	Mein Vater ist groß.
favourite	liebster; Lieblings-	Das ist mein Lieblingslied.
February	der Februar	Der Februar ist hier kalt.
feel	sich fühlen	Ich fühle mich glücklich.
feeling	das Gefühl	Ich kenne dieses Gefühl.
festival	das Festival	Das Festival beginnt morgen.
few	ein paar; wenige	Hier sind wenige Schüler.
fifteen	fünfzehn	Ich bin fünfzehn.
fifth	fünfte	Das ist die fünfte Stunde.
fifty	fünfzig	Meine Mutter ist fünfzig.
fill	füllen; ausfüllen	Fülle die Tasse mit Wasser.
film	der Film	Wir sehen einen Film.
final	letzt; endgültig	Das ist die letzte Frage.
find	finden	Ich finde die Schlüssel.
fine	gut; in Ordnung	Jetzt geht es mir gut.
finish	beenden	Beende deine Hausaufgaben.
fire	das Feuer; der Brand	Das Feuer ist heiß.
first	erste	Sie ist die Erste in der Reihe.
fish	der Fisch	Ich esse Fisch zum Abendessen.
five	fünf	Ich habe fünf Bücher.
flat	die Wohnung	Meine Wohnung ist klein.
flight	der Flug	Der Flug ist verspätet.
floor	der Boden; die Etage	Die Tasche liegt auf dem Boden.
flower	die Blume	Diese Blume ist gelb.
fly	fliegen	Vögel fliegen am Himmel.
follow	folgen	Folge mir bitte.
food	das Essen	Das Essen ist fertig.
foot	der Fuß	Mein Fuß tut weh.
football	der Fußball	Wir spielen heute Fußball.
for	für	Dieses Geschenk ist für dich.
forget	vergessen	Vergiss die Schlüssel nicht.
form	das Formular	Fülle das Formular aus.
forty	vierzig	Mein Vater ist vierzig.
four	vier	Ich sehe vier Vögel.
fourteen	vierzehn	Sie ist vierzehn.
fourth	vierte	Das ist die vierte Etage.
free	kostenlos; frei	Die Eintrittskarte ist kostenlos.
Friday	der Freitag	Wir treffen uns am Freitag.
friend	der Freund/die Freundin	Mein Freund ist hier.
friendly	freundlich	Der Lehrer ist freundlich.
from	von; aus	Ich komme von hier.
front	die Vorderseite; vorne	Stell dich nach vorne.
fruit	das Obst; die Frucht	Ich esse jeden Tag Obst.
full	voll	Die Flasche ist voll.
fun	der Spaß; spaßig	Dieses Spiel macht Spaß.
funny	lustig	Der Film ist lustig.
future	die Zukunft	Denk an deine Zukunft.
game	das Spiel	Das Spiel beginnt jetzt.
garden	der Garten	Der Garten ist schön.
geography	die Geografie	Ich lerne Geografie in der Schule.
get	bekommen; kommen	Ich komme um sechs nach Hause.
girl	das Mädchen	Das Mädchen lächelt.
girlfriend	die Freundin	Seine Freundin ist nett.
give	geben	Gib mir das Buch.
glass	das Glas	Ich trinke aus einem Glas.
go	gehen; fahren	Wir gehen jetzt nach Hause.
good	gut	Dieser Kaffee ist gut.
goodbye	auf Wiedersehen	Auf Wiedersehen, bis morgen.
grandfather	der Großvater	Mein Großvater ist alt.
grandmother	die Großmutter	Meine Großmutter kocht Suppe.
grandparent	der Großelternteil	Ein Großelternteil wohnt bei uns.
great	großartig; groß	Das ist eine großartige Idee.
green	grün	Die Tür ist grün.
grey	grau	Der Himmel ist grau.
group	die Gruppe	Arbeitet in einer kleinen Gruppe.
grow	wachsen; anbauen	Pflanzen wachsen im Garten.
guess	raten; die Vermutung	Rate die Antwort.
guitar	die Gitarre	Er spielt Gitarre.
gym	das Fitnessstudio	Ich gehe ins Fitnessstudio.
hair	das Haar; die Haare	Sie hat lange Haare.
half	die Hälfte	Schneide den Kuchen in zwei Hälften.
hand	die Hand	Heb die Hand.
happen	passieren	Was passiert als Nächstes?
happy	glücklich	Ich bin heute glücklich.
hard	hart; schwierig	Dieser Stuhl ist hart.
hat	der Hut; die Mütze	Meine Mütze ist schwarz.
hate	hassen	Ich hasse kalten Tee.
have	haben	Ich habe ein Auto.
have to modal	müssen	Ich muss lernen.
he	er	Er ist mein Bruder.
head	der Kopf	Mein Kopf tut weh.
health	die Gesundheit	Gutes Essen hilft der Gesundheit.
healthy	gesund	Dieses Gericht ist gesund.
hear	hören	Ich höre Musik.
hello	hallo	Hallo, schön dich kennenzulernen.
help	die Hilfe; helfen	Hilf mir bitte.
her	ihr; sie	Das ist ihre Tasche.
here	hier	Komm jetzt hierher.
hey	hey	Hey, warte auf mich.
hi	hi; hallo	Hallo, wie geht es dir?
high	hoch	Die Wand ist hoch.
him	ihn; ihm	Ich kenne ihn.
his	sein	Sein Mantel ist blau.
history	die Geschichte	Ich lerne Geschichte.
hobby	das Hobby	Lesen ist mein Hobby.
holiday	der Urlaub; der Feiertag	Wir machen im Juli Urlaub.
home	das Zuhause; nach Hause	Ich bin zu Hause.
homework	die Hausaufgaben	Mach heute Abend deine Hausaufgaben.
hope	hoffen	Ich hoffe, dass du kommst.
horse	das Pferd	Das Pferd läuft schnell.
hospital	das Krankenhaus	Das Krankenhaus ist in der Nähe.
hot	heiß	Die Suppe ist heiß.
hotel	das Hotel	Das Hotel ist sauber.
hour	die Stunde	Warte eine Stunde.
house	das Haus	Dieses Haus ist alt.
how	wie	Wie geht es dir?
however	jedoch	Jedoch kann ich hier bleiben.
hundred	hundert	Hundert Leute kamen.
hungry	hungrig	Ich bin hungrig.
husband	der Ehemann	Ihr Ehemann ist Arzt.
I	ich	Ich liebe Tee.
ice	das Eis	Das Eis ist kalt.
ice cream	das Eis	Ich möchte Eis.
idea	die Idee	Das ist eine gute Idee.
if	wenn; falls	Ruf mich an, wenn du Hilfe brauchst.
imagine	sich vorstellen	Stell dir ein kleines Haus vor.
important	wichtig	Diese Stunde ist wichtig.
improve	verbessern	Ich möchte mich verbessern.
in	in; im	Die Schlüssel sind in meiner Tasche.
include	einschließen; angeben	Gib bitte deinen Namen an.
information	die Information	Ich brauche mehr Informationen.
interest	das Interesse	Sie interessiert sich für Kunst.
interested	interessiert	Ich interessiere mich für Musik.
interesting	interessant	Dieses Buch ist interessant.
internet	das Internet	Das Internet ist langsam.
interview	das Interview; das Vorstellungsgespräch	Ich habe heute ein Vorstellungsgespräch.
into	in; hinein	Leg die Bücher in die Tasche.
introduce	vorstellen	Stell bitte deinen Freund vor.
island	die Insel	Diese Insel ist klein.
it	es	Es ist kalt.
its	sein; ihr	Der Hund mag sein Bett.
jacket	die Jacke	Meine Jacke ist neu.
January	der Januar	Der Januar ist der erste Monat.
jeans	die Jeans	Meine Jeans ist blau.
job	der Job; die Arbeit	Ich brauche einen neuen Job.
join	beitreten; mitmachen	Mach heute bei unserem Unterricht mit.
journey	die Reise	Die Reise ist lang.
juice	der Saft	Ich trinke Orangensaft.
July	der Juli	Wir reisen im Juli.
June	der Juni	Die Schule endet im Juni.
just	nur; gerade	Ich brauche nur Wasser.
keep	behalten; aufbewahren	Behalte diesen Schlüssel.
key	der Schlüssel	Ich habe den Schlüssel verloren.
kilometre	der Kilometer	Geh einen Kilometer.
kind (type)	die Art; der Typ	Welche Art von Musik magst du?
kitchen	die Küche	Die Küche ist sauber.
know	wissen; kennen	Ich kenne die Antwort.
land	das Land; die Erde	Das Flugzeug steht am Boden.
language	die Sprache	Englisch ist eine Sprache.
large	groß	Dieses Zimmer ist groß.
last1 (final)	letzt	Das ist die letzte Seite.
late	spät; verspätet	Der Bus ist verspätet.
later	später	Bis später.
laugh	lachen; das Lachen	Wir lachen zusammen.
learn	lernen	Ich lerne Englisch.
leave	gehen; lassen	Lass die Tür offen.
left	links; linke	Bieg hier links ab.
leg	das Bein	Mein Bein tut weh.
lesson	die Stunde; die Lektion	Die Stunde beginnt jetzt.
let	lassen; erlauben	Lass mich dir helfen.
letter	der Brief; der Buchstabe	Ich schreibe einen Brief.
library	die Bibliothek	Die Bibliothek öffnet um neun.
lie1	liegen	Leg dich bitte aufs Bett.
life	das Leben	Das Leben in der Stadt ist lebhaft.
like (similar)	wie; ähnlich	Das ist wie ein Spiel.
like (find sb/sth pleasant)	mögen	Ich mag dieses Lied.
line	die Linie; die Reihe	Stell dich in die Reihe.
lion	der Löwe	Der Löwe schläft.
list	die Liste; auflisten	Mach eine Einkaufsliste.
listen	zuhören	Hör dem Lehrer zu.
little	klein; wenig	Ich habe wenig Geld.
live1	leben; wohnen	Ich wohne in der Nähe der Schule.
local	lokal; örtlich	Das ist ein lokales Geschäft.
long1	lang	Der Weg ist lang.
look	sehen; aussehen	Sieh dir das Bild an.
lose	verlieren	Verliere dein Ticket nicht.
lot	viel; eine Menge	Ich habe viele Hausaufgaben.
love	die Liebe; lieben	Ich liebe meine Familie.
lunch	das Mittagessen	Das Mittagessen ist fertig.`;

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
    reviewer: "codex_oxford_part002_support_translation_batch_de_v1",
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
