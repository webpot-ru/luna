#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "DE";
const BATCH_ID = "de_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-de.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const DE_TRANSLATIONS_TSV = `source_headword	DE	example_DE
machine	die Maschine; das Gerät	Diese Maschine macht Kaffee.
magazine	die Zeitschrift	Sie liest eine Musikzeitschrift.
main	wichtigste; Haupt-	Das ist die Haupttür.
make	machen; zubereiten	Ich mache zu Hause Mittagessen.
man	der Mann	Der Mann ist mein Lehrer.
many	viele	Viele Studenten sind hier.
map	die Karte	Schau auf die Karte.
March	der März	Mein Geburtstag ist im März.
market	der Markt	Wir kaufen Obst auf dem Markt.
married	verheiratet	Meine Schwester ist verheiratet.
May	der Mai	Die Schule endet im Mai.
maybe	vielleicht	Vielleicht regnet es.
me	mich; mir	Bitte hilf mir.
meal	die Mahlzeit	Diese Mahlzeit ist warm.
mean	bedeuten	Was bedeutet dieses Schild?
meaning	die Bedeutung	Was ist die Bedeutung?
meat	das Fleisch	Ich esse Fleisch zum Abendessen.
meet	sich treffen	Wir treffen uns nach dem Unterricht.
meeting	die Besprechung; das Treffen	Die Besprechung beginnt jetzt.
member	das Mitglied	Sie ist Mitglied im Club.
menu	die Speisekarte; das Menü	Lies bitte die Speisekarte.
message	die Nachricht	Ich sende eine kurze Nachricht.
metre	der Meter	Geh einen Meter nach vorn.
midnight	die Mitternacht	Der Zug fährt um Mitternacht ab.
mile	die Meile	Wir gehen eine Meile.
milk	die Milch	Ich trinke Milch zum Frühstück.
million	die Million	Eine Million Menschen leben hier.
minute1	die Minute	Warte bitte eine Minute.
miss	vermissen; verpassen	Ich vermisse meine alte Schule.
mistake	der Fehler	Diese Antwort hat einen Fehler.
model	das Modell	Das ist ein kleines Modell.
modern	modern	Die Küche ist modern.
moment	der Moment	Warte bitte einen Moment.
Monday	der Montag	Wir beginnen am Montag mit der Arbeit.
money	das Geld	Ich brauche etwas Geld.
month	der Monat	Juni ist ein warmer Monat.
more	mehr	Ich brauche mehr Zeit.
morning	der Morgen	Ich lerne am Morgen.
most	die meisten; am meisten	Die meisten Studenten mögen Musik.
mother	die Mutter	Meine Mutter arbeitet heute.
mountain	der Berg	Der Berg ist hoch.
mouse	die Maus	Eine Maus ist unter dem Stuhl.
mouth	der Mund	Öffne bitte deinen Mund.
move	bewegen; verschieben	Bewege den Stuhl hierher.
movie	der Film	Wir sehen heute Abend einen Film.
much	viel; wie viel	Wie viel kostet das?
mum	die Mama	Mama ist zu Hause.
museum	das Museum	Das Museum öffnet um zehn.
music	die Musik	Ich höre Musik.
must modal	müssen	Du musst hier anhalten.
my	mein; meine	Das ist mein Buch.
name	der Name; nennen	Schreib deinen Namen hier.
natural	natürlich	Dieser Saft ist natürlich.
near	nahe; in der Nähe	Die Bank ist in der Nähe.
need	brauchen	Ich brauche einen Stift.
negative	negativ	Diese Antwort ist negativ.
neighbour	der Nachbar; die Nachbarin	Mein Nachbar ist freundlich.
never	nie	Ich trinke nie Kaffee.
new	neu	Dieses Telefon ist neu.
news	die Nachrichten	Die Nachrichten sind heute gut.
newspaper	die Zeitung	Er liest eine Zeitung.
next	nächste; als Nächstes	Der nächste Bus ist spät.
next to	neben	Setz dich neben mich.
nice	nett; angenehm	Das Zimmer ist angenehm.
night	die Nacht	Ich schlafe nachts.
nine	neun	Neun Studenten sind hier.
nineteen	neunzehn	Sie ist neunzehn.
ninety	neunzig	Mein Großvater ist neunzig.
no	nein; kein	Nein, danke.
no one	niemand	Niemand ist im Zimmer.
nobody	niemand	Niemand ist zu Hause.
north	der Norden	Der Bahnhof liegt nördlich von hier.
nose	die Nase	Meine Nase ist kalt.
not	nicht	Ich bin nicht müde.
note	die Notiz	Schreib jetzt eine Notiz.
nothing	nichts	Es ist nichts in der Kiste.
November	der November	Mein Kurs beginnt im November.
now	jetzt	Komm jetzt hierher.
number	die Zahl; die Nummer	Schreib die Nummer hier.
nurse	der Krankenpfleger; die Krankenschwester	Die Krankenschwester ist freundlich.
object	der Gegenstand	Leg den Gegenstand auf den Tisch.
o’clock	Uhr	Der Unterricht beginnt um neun Uhr.
October	der Oktober	Wir reisen im Oktober.
of	von	Das ist eine Tasse Tee.
off	aus; weg	Schalte das Licht aus.
office	das Büro	Mein Büro ist klein.
often	oft	Ich gehe oft zu Fuß zur Schule.
oh	oh	Oh, jetzt verstehe ich.
OK	okay; in Ordnung	Ist das okay?
old	alt	Dieses Haus ist alt.
on	auf; an	Das Buch liegt auf dem Tisch.
once	einmal	Ich rufe einmal pro Woche an.
one	eins; ein; eine	Ich habe eine Schwester.
onion	die Zwiebel	Schneide eine Zwiebel.
online	online	Ich lerne online.
only	nur	Ich habe nur eine Tasche.
open	öffnen; offen	Öffne bitte das Fenster.
opinion	die Meinung	Was ist deine Meinung?
opposite	gegenüber; entgegengesetzt	Der Laden ist gegenüber der Bank.
or	oder	Tee oder Kaffee?
orange	die Orange; orange	Diese Orange ist süß.
order	bestellen; die Bestellung	Ich bestelle Suppe.
other	andere	Benutze die andere Tür.
our	unser; unsere	Das ist unser Klassenzimmer.
out	hinaus; draußen	Geh nach dem Mittagessen hinaus.
outside	draußen; außerhalb	Die Kinder spielen draußen.
over	über	Das Flugzeug fliegt über die Stadt.
own	eigen	Ich habe mein eigenes Zimmer.
page	die Seite	Öffne Seite zehn.
paint	malen; anstreichen	Streich die Wand blau.
painting	das Gemälde; das Malen	Dieses Gemälde ist schön.
pair	das Paar	Ich brauche ein Paar Socken.
paper	das Papier	Schreib auf dieses Papier.
paragraph	der Absatz	Lies den ersten Absatz.
parent	der Elternteil	Ein Elternteil wartet draußen.
park	parken; der Park	Wir parken in der Nähe des Bahnhofs.
part	der Teil	Dieser Teil ist einfach.
partner	der Partner; die Partnerin	Arbeite mit einem Partner.
party	die Party; die Feier	Die Party beginnt um sieben.
passport	der Reisepass	Zeig bitte deinen Reisepass.
past	vorbei; nach	Es ist halb sieben.
pay	bezahlen	Ich bezahle mit Karte.
pen	der Stift	Dieser Stift ist blau.
pencil	der Bleistift	Ich schreibe mit einem Bleistift.
people	die Leute; die Menschen	Viele Leute sind hier.
pepper	der Pfeffer	Gib Pfeffer in die Suppe.
perfect	perfekt	Deine Antwort ist perfekt.
period	die Stunde; der Zeitraum	Die Unterrichtsstunde ist kurz.
person	die Person	Eine Person wartet.
personal	persönlich	Das ist mein persönliches Telefon.
phone	das Telefon; anrufen	Mein Telefon ist in meiner Tasche.
photo	das Foto	Mach hier ein Foto.
photograph	das Foto; fotografieren	Dieses Foto ist alt.
phrase	der Ausdruck	Wiederhole bitte den Ausdruck.
piano	das Klavier	Sie spielt Klavier.
picture	das Bild	Schau dir dieses Bild an.
piece	das Stück	Nimm ein Stück Kuchen.
pig	das Schwein	Das Schwein ist auf dem Bauernhof.
pink	rosa	Ihre Tasche ist rosa.
place	der Ort; stellen	Dieser Ort ist ruhig.
plan	der Plan; planen	Wir brauchen einen Plan.
plane	das Flugzeug	Das Flugzeug ist spät.
plant	die Pflanze; pflanzen	Gieße die Pflanze heute.
play	spielen; das Spiel	Kinder spielen im Park.
player	der Spieler; die Spielerin	Der Spieler läuft schnell.
please	bitte	Bitte setz dich hier.
point	der Punkt	Dieser Punkt ist wichtig.
police	die Polizei	Die Polizei ist draußen.
policeman	der Polizist	Der Polizist hilft uns.
pool	das Schwimmbecken; der Pool	Das Schwimmbecken ist kalt.
poor	arm	Das arme Kind ist hungrig.
popular	beliebt	Dieses Lied ist beliebt.
positive	positiv	Das ist ein positives Ergebnis.
possible	möglich	Ist es heute möglich?
post	der Beitrag; posten	Ich lese ihren Beitrag online.
potato	die Kartoffel	Ich esse eine Kartoffel.
pound	das Pfund	Es kostet ein Pfund.
practice	die Übung; die Praxis	Übung hilft jeden Tag.
practise	üben	Ich übe jeden Tag Englisch.
prefer	bevorzugen	Ich bevorzuge Tee.
prepare	vorbereiten	Bereite heute Abend deine Tasche vor.
present	anwesend; das Geschenk	Sie ist heute anwesend.
pretty	hübsch; ziemlich	Der Garten ist hübsch.
price	der Preis	Der Preis ist niedrig.
probably	wahrscheinlich	Sie weiß es wahrscheinlich.
problem	das Problem	Dieses Problem ist klein.
product	das Produkt	Dieses Produkt ist neu.
programme	das Programm	Das Programm beginnt jetzt.
project	das Projekt	Unser Projekt ist fertig.
purple	lila; violett	Das Hemd ist lila.
put	legen; stellen	Leg das Buch hierhin.
quarter	das Viertel	Es ist Viertel nach zwei.
question	die Frage	Stell eine Frage.
quick	schnell	Das ist ein schneller Test.
quickly	schnell	Bitte geh schnell.
quiet	ruhig	Die Bibliothek ist ruhig.
quite	ziemlich	Dieses Zimmer ist ziemlich klein.
radio	das Radio	Das Radio ist laut.
rain	der Regen; regnen	Der Regen beginnt jetzt.
read	lesen	Lies diesen Satz.
reader	der Leser; die Leserin	Der Leser mag die Geschichte.
reading	das Lesen	Lesen hilft mir beim Lernen.
ready	fertig; bereit	Das Abendessen ist fertig.
real	echt; wirklich	Das ist ein echtes Problem.
really	wirklich	Ich mag dieses Lied wirklich.
reason	der Grund	Sag mir den Grund.
red	rot	Die Tür ist rot.
relax	sich entspannen	Entspann dich nach der Arbeit.
remember	sich erinnern; nicht vergessen	Vergiss deinen Reisepass nicht.
repeat	wiederholen	Wiederhole bitte den Satz.
report	der Bericht; berichten	Lies heute Abend den Bericht.
restaurant	das Restaurant	Das Restaurant ist voll.
result	das Ergebnis	Das Ergebnis ist gut.
return	zurückgeben; zurückkehren	Gib das Buch morgen zurück.
rice	der Reis	Ich esse Reis zum Mittagessen.
rich	reich	Die Stadt ist reich.
ride	fahren; die Fahrt	Ich fahre Fahrrad.
right	rechts; richtig	Bieg hier rechts ab.
river	der Fluss	Der Fluss ist breit.
road	die Straße	Diese Straße ist lang.
room	das Zimmer	Mein Zimmer ist sauber.
routine	die Routine	Meine Routine beginnt früh.
rule	die Regel	Diese Regel ist einfach.
run	laufen	Ich laufe jeden Morgen.
sad	traurig	Er ist heute traurig.
salad	der Salat	Dieser Salat ist frisch.
salt	das Salz	Gib ein wenig Salz dazu.
same	gleich; derselbe	Wir haben die gleiche Tasche.
sandwich	das Sandwich	Ich esse ein Sandwich.
Saturday	der Samstag	Wir treffen uns am Samstag.
say	sagen	Sag bitte deinen Namen.
school	die Schule	Meine Schule ist in der Nähe.
science	die Wissenschaft; Naturwissenschaft	Ich lerne Naturwissenschaft.
scientist	der Wissenschaftler; die Wissenschaftlerin	Der Wissenschaftler stellt eine Frage.
sea	das Meer	Das Meer ist blau.
second1 (unit of time)	die Sekunde	Warte eine Sekunde.
section	der Abschnitt	Lies diesen Abschnitt.
see	sehen	Ich sehe meinen Freund.
sell	verkaufen	Sie verkaufen frisches Obst.
send	senden; schicken	Sende die Nachricht jetzt.
sentence	der Satz	Schreib einen Satz.
September	der September	Die Schule beginnt im September.
seven	sieben	Sieben Leute sind hier.
seventeen	siebzehn	Er ist siebzehn.
seventy	siebzig	Meine Großmutter ist siebzig.
share	teilen	Teil den Kuchen.
she	sie	Sie ist meine Schwester.
sheep	das Schaf	Das Schaf frisst Gras.
shirt	das Hemd	Sein Hemd ist sauber.
shoe	der Schuh	Ein Schuh ist unter dem Bett.
shop	der Laden; einkaufen	Der Laden schließt früh.
shopping	das Einkaufen	Einkaufen macht heute Spaß.
short	kurz	Diese Geschichte ist kurz.
should modal	sollen; sollte	Du solltest dich heute ausruhen.
show	zeigen; die Show	Zeig mir dein Ticket.
shower	die Dusche; duschen	Ich dusche.
sick	krank	Ich fühle mich heute krank.
similar	ähnlich	Unsere Taschen sind ähnlich.
sing	singen	Ich singe im Unterricht.
singer	der Sänger; die Sängerin	Der Sänger ist berühmt.
sister	die Schwester	Meine Schwester ist jung.
sit	sitzen	Setz dich ans Fenster.
situation	die Situation	Diese Situation ist neu.
six	sechs	Sechs Bücher sind hier.
sixteen	sechzehn	Sie ist sechzehn.
sixty	sechzig	Mein Vater ist sechzig.
skill	die Fähigkeit	Diese Fähigkeit ist nützlich.
skirt	der Rock	Ihr Rock ist blau.
sleep	schlafen; der Schlaf	Ich schlafe acht Stunden.
slow	langsam	Der Bus ist langsam.
small	klein	Das Zimmer ist klein.
snake	die Schlange	Die Schlange ist lang.
snow	der Schnee; schneien	Im Winter fällt Schnee.
so	also; so	Ich bin müde, also ruhe ich mich aus.
some	etwas; einige	Ich brauche etwas Wasser.
somebody	jemand	Jemand ist an der Tür.
someone	jemand	Jemand hat eine Nachricht hinterlassen.
something	etwas	Ich brauche etwas zu trinken.
sometimes	manchmal	Ich gehe manchmal zu Fuß zur Schule.
son	der Sohn	Ihr Sohn ist in der Schule.
song	das Lied	Dieses Lied ist neu.
soon	bald	Bis bald.
sorry	entschuldigung; leid	Es tut mir leid.
sound	der Ton; klingen	Der Ton ist laut.
soup	die Suppe	Die Suppe ist heiß.
south	der Süden	Das Hotel liegt südlich von hier.
space	der Platz; der Raum	Es gibt Platz für einen Stuhl.
speak	sprechen	Sprich bitte langsam.
special	besonders	Heute ist ein besonderer Tag.
spell	buchstabieren	Buchstabiere deinen Namen.
spelling	die Rechtschreibung	Prüfe deine Rechtschreibung.
spend	ausgeben; verbringen	Ich gebe Geld für Essen aus.
sport	der Sport	Fußball ist ein beliebter Sport.
spring	der Frühling; springen	Im Frühling wachsen Blumen.
stand	stehen	Steh nahe an der Tür.
star	der Stern	Ich sehe einen hellen Stern.
start	anfangen; der Start	Fang jetzt mit der Stunde an.
statement	die Aussage	Diese Aussage ist wahr.
station	der Bahnhof; die Station	Der Bahnhof ist in der Nähe.
stay	bleiben	Bleib heute zu Hause.
still	noch	Ich bin noch hungrig.
stop	anhalten; der Halt	Halte an der Ecke an.
story	die Geschichte	Erzähl mir eine Geschichte.
street	die Straße	Diese Straße ist ruhig.
strong	stark	Er ist stark.
student	der Student; die Studentin	Der Student liest ein Buch.
study	lernen; das Studium	Ich lerne Englisch.
style	der Stil	Ich mag diesen Stil.
subject	das Fach; das Thema	Englisch ist mein Hauptfach.
success	der Erfolg	Erfolg braucht Übung.
sugar	der Zucker	Gib Zucker in den Tee.
summer	der Sommer	Der Sommer ist hier heiß.
sun	die Sonne	Die Sonne ist hell.
Sunday	der Sonntag	Wir ruhen uns am Sonntag aus.
supermarket	der Supermarkt	Der Supermarkt ist offen.
sure	sicher	Ich bin sicher.
sweater	der Pullover	Mein Pullover ist warm.
swim	schwimmen	Ich schwimme jede Woche.
swimming	das Schwimmen	Schwimmen ist gute Bewegung.
table	der Tisch	Die Schlüssel liegen auf dem Tisch.`;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  const headers = headerLine.split("\t");
  if (headers.join("\t") !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`German example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate German translation row for ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildSupportRow(row, translation) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: true,
    article_display_policy: "include_natural_german_articles_or_gender_markers_where_grammatically_useful_for_nouns",
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}

function updateContract(contract, outputPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: outputPath,
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

  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.latest_support_translation_batches = [...existing, batch];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate IT support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after IT.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

async function main() {
  const args = parseArgs();
  const contractPath = args.get("contract");
  if (!contractPath) {
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-de.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_de_article_display_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_de_article_display_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(DE_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing German translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter(
    (sourceHeadword) => !rows.some((row) => row.source_headword === sourceHeadword),
  );
  if (unexpected.length) {
    throw new Error(`Unexpected German translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included in German display cells where grammatically useful
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(summaryPath, summary);

  const updatedContract = updateContract(contract, outputPath, summaryPath, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: outputPath,
    contract_updated: contractPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
