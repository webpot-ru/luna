#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "IT";
const BATCH_ID = "it_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-it.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const IT_TRANSLATIONS_TSV = `source_headword	IT	example_IT
machine	la macchina; il dispositivo	Questa macchina fa il caffè.
magazine	la rivista	Lei legge una rivista di musica.
main	principale	Questa è la porta principale.
make	fare; preparare	Preparo il pranzo a casa.
man	l'uomo	L'uomo è il mio insegnante.
many	molti; molte	Molti studenti sono qui.
map	la mappa; la cartina	Guarda la mappa.
March	marzo	Il mio compleanno è a marzo.
market	il mercato	Compriamo frutta al mercato.
married	sposato; sposata	Mia sorella è sposata.
May	maggio	La scuola finisce a maggio.
maybe	forse	Forse pioverà.
me	me; mi	Aiutami, per favore.
meal	il pasto	Questo pasto è caldo.
mean	significare	Che cosa significa questo cartello?
meaning	il significato	Qual è il significato?
meat	la carne	Mangio carne a cena.
meet	incontrare; vedersi	Ci vediamo dopo la lezione.
meeting	la riunione	La riunione comincia adesso.
member	il membro; il socio	Lei è socia del club.
menu	il menu	Leggi il menu, per favore.
message	il messaggio	Mando un breve messaggio.
metre	il metro	Fai un metro in avanti.
midnight	mezzanotte	Il treno parte a mezzanotte.
mile	il miglio	Camminiamo per un miglio.
milk	il latte	Bevo latte a colazione.
million	il milione	Un milione di persone vive qui.
minute1	il minuto	Aspetta un minuto, per favore.
miss	sentire la mancanza; perdere	Mi manca la mia vecchia scuola.
mistake	l'errore	Questa risposta ha un errore.
model	il modello	Questo è un piccolo modello.
modern	moderno	La cucina è moderna.
moment	il momento	Aspetta un momento, per favore.
Monday	lunedì	Iniziamo a lavorare lunedì.
money	il denaro; i soldi	Ho bisogno di un po' di soldi.
month	il mese	Giugno è un mese caldo.
more	più	Ho bisogno di più tempo.
morning	la mattina	Studio la mattina.
most	la maggior parte; il più	La maggior parte degli studenti ama la musica.
mother	la madre	Mia madre lavora oggi.
mountain	la montagna	La montagna è alta.
mouse	il topo; il mouse	Un topo è sotto la sedia.
mouth	la bocca	Apri la bocca, per favore.
move	muovere; spostare	Sposta la sedia qui.
movie	il film	Guardiamo un film stasera.
much	molto; quanto	Quanto costa questo?
mum	la mamma	La mamma è a casa.
museum	il museo	Il museo apre alle dieci.
music	la musica	Ascolto musica.
must modal	dovere	Devi fermarti qui.
my	mio; mia; miei; mie	Questo è il mio libro.
name	il nome; chiamare	Scrivi il tuo nome qui.
natural	naturale	Questo succo è naturale.
near	vicino; vicino a	La banca è vicina.
need	avere bisogno di	Ho bisogno di una penna.
negative	negativo	Questa risposta è negativa.
neighbour	il vicino; la vicina	Il mio vicino è gentile.
never	mai	Non bevo mai caffè.
new	nuovo	Questo telefono è nuovo.
news	le notizie	Le notizie sono buone oggi.
newspaper	il giornale	Lui legge un giornale.
next	prossimo; seguente	Il prossimo autobus è in ritardo.
next to	accanto a	Siediti accanto a me.
nice	carino; piacevole	La stanza è piacevole.
night	la notte	Dormo di notte.
nine	nove	Nove studenti sono qui.
nineteen	diciannove	Lei ha diciannove anni.
ninety	novanta	Mio nonno ha novanta anni.
no	no	No, grazie.
no one	nessuno	Nessuno è nella stanza.
nobody	nessuno	Nessuno è a casa.
north	il nord	La stazione è a nord di qui.
nose	il naso	Il mio naso è freddo.
not	non	Non sono stanco.
note	la nota	Scrivi una nota adesso.
nothing	niente; nulla	Non c'è niente nella scatola.
November	novembre	Il mio corso inizia a novembre.
now	adesso; ora	Vieni qui adesso.
number	il numero	Scrivi il numero qui.
nurse	l'infermiere; l'infermiera	L'infermiera è gentile.
object	l'oggetto	Metti l'oggetto sul tavolo.
o’clock	in punto; ore	La lezione inizia alle nove.
October	ottobre	Viaggiamo a ottobre.
of	di	Questa è una tazza di tè.
off	spento; via	Spegni la luce.
office	l'ufficio	Il mio ufficio è piccolo.
often	spesso	Vado spesso a scuola a piedi.
oh	oh	Oh, ora capisco.
OK	va bene; OK	Va bene così?
old	vecchio; vecchia	Questa casa è vecchia.
on	su; acceso	Il libro è sul tavolo.
once	una volta	Chiamo una volta alla settimana.
one	uno; una	Ho una sorella.
onion	la cipolla	Taglia una cipolla.
online	online	Studio online.
only	solo	Ho solo una borsa.
open	aprire; aperto	Apri la finestra, per favore.
opinion	l'opinione	Qual è la tua opinione?
opposite	di fronte a; opposto	Il negozio è di fronte alla banca.
or	o; oppure	Tè o caffè?
orange	l'arancia; arancione	Questa arancia è dolce.
order	ordinare; l'ordine	Ordino una zuppa.
other	altro; altra	Usa l'altra porta.
our	nostro; nostra; nostri; nostre	Questa è la nostra aula.
out	fuori	Vai fuori dopo pranzo.
outside	fuori; all'esterno	I bambini giocano fuori.
over	sopra	L'aereo vola sopra la città.
own	proprio	Ho la mia stanza.
page	la pagina	Apri la pagina dieci.
paint	dipingere; la vernice	Dipingi il muro di blu.
painting	il dipinto; la pittura	Questo dipinto è bello.
pair	il paio	Ho bisogno di un paio di calze.
paper	la carta	Scrivi su questa carta.
paragraph	il paragrafo	Leggi il primo paragrafo.
parent	il genitore	Un genitore aspetta fuori.
park	parcheggiare; il parco	Parcheggiamo vicino alla stazione.
part	la parte	Questa parte è facile.
partner	il partner; la partner	Lavora con un partner.
party	la festa	La festa comincia alle sette.
passport	il passaporto	Mostra il passaporto, per favore.
past	passato; dopo	Sono le sei e mezza.
pay	pagare	Pago con la carta.
pen	la penna	Questa penna è blu.
pencil	la matita	Scrivo con una matita.
people	la gente; le persone	Molte persone sono qui.
pepper	il pepe	Aggiungi pepe alla zuppa.
perfect	perfetto	La tua risposta è perfetta.
period	il periodo; l'ora di lezione	L'ora di lezione è breve.
person	la persona	Una persona sta aspettando.
personal	personale	Questo è il mio telefono personale.
phone	il telefono; telefonare	Il mio telefono è nella borsa.
photo	la foto	Scatta una foto qui.
photograph	la fotografia; fotografare	Questa fotografia è vecchia.
phrase	la frase; l'espressione	Ripeti la frase, per favore.
piano	il pianoforte	Lei suona il pianoforte.
picture	l'immagine; la foto	Guarda questa immagine.
piece	il pezzo	Prendi un pezzo di torta.
pig	il maiale	Il maiale è nella fattoria.
pink	rosa	La sua borsa è rosa.
place	il posto; il luogo	Questo posto è tranquillo.
plan	il piano; il programma	Abbiamo bisogno di un piano.
plane	l'aereo	L'aereo è in ritardo.
plant	la pianta	Innaffia la pianta oggi.
play	giocare; suonare	I bambini giocano nel parco.
player	il giocatore; la giocatrice	Il giocatore corre veloce.
please	per favore	Per favore, siediti qui.
point	il punto	Questo punto è importante.
police	la polizia	La polizia è fuori.
policeman	il poliziotto	Il poliziotto ci aiuta.
pool	la piscina	La piscina è fredda.
poor	povero	Il bambino povero ha fame.
popular	popolare	Questa canzone è popolare.
positive	positivo	Questo è un risultato positivo.
possible	possibile	È possibile oggi?
post	il post; pubblicare	Leggo il suo post online.
potato	la patata	Mangio una patata.
pound	la sterlina	Costa una sterlina.
practice	la pratica; l'esercizio	La pratica aiuta ogni giorno.
practise	esercitarsi; praticare	Mi esercito in inglese ogni giorno.
prefer	preferire	Preferisco il tè.
prepare	preparare	Prepara la borsa stasera.
present	presente; il regalo	Lei è presente oggi.
pretty	carino; abbastanza	Il giardino è carino.
price	il prezzo	Il prezzo è basso.
probably	probabilmente	Lei probabilmente lo sa.
problem	il problema	Questo problema è piccolo.
product	il prodotto	Questo prodotto è nuovo.
programme	il programma	Il programma comincia adesso.
project	il progetto	Il nostro progetto è pronto.
purple	viola	La camicia è viola.
put	mettere	Metti il libro qui.
quarter	il quarto	Sono le due e un quarto.
question	la domanda	Fai una domanda.
quick	veloce; rapido	Questo è un test veloce.
quickly	velocemente	Cammina velocemente, per favore.
quiet	tranquillo; silenzioso	La biblioteca è silenziosa.
quite	abbastanza	Questa stanza è abbastanza piccola.
radio	la radio	La radio è alta.
rain	la pioggia; piovere	La pioggia comincia adesso.
read	leggere	Leggi questa frase.
reader	il lettore; la lettrice	Il lettore ama la storia.
reading	la lettura	La lettura mi aiuta a imparare.
ready	pronto	La cena è pronta.
real	reale; vero	Questo è un vero problema.
really	davvero	Mi piace davvero questa canzone.
reason	il motivo; la ragione	Dimmi il motivo.
red	rosso	La porta è rossa.
relax	rilassarsi	Rilassati dopo il lavoro.
remember	ricordare	Ricorda il passaporto.
repeat	ripetere	Ripeti la frase, per favore.
report	il rapporto; la relazione	Leggi il rapporto stasera.
restaurant	il ristorante	Il ristorante è pieno.
result	il risultato	Il risultato è buono.
return	tornare; restituire	Restituisci il libro domani.
rice	il riso	Mangio riso a pranzo.
rich	ricco	La città è ricca.
ride	andare in bici; cavalcare	Vado in bici.
right	destra; giusto	Gira a destra qui.
river	il fiume	Il fiume è largo.
road	la strada	Questa strada è lunga.
room	la stanza	La mia stanza è pulita.
routine	la routine	La mia routine comincia presto.
rule	la regola	Questa regola è semplice.
run	correre	Corro ogni mattina.
sad	triste	Lui è triste oggi.
salad	l'insalata	Questa insalata è fresca.
salt	il sale	Aggiungi un po' di sale.
same	stesso; stessa	Abbiamo la stessa borsa.
sandwich	il panino; il sandwich	Mangio un panino.
Saturday	sabato	Ci vediamo sabato.
say	dire	Di' il tuo nome, per favore.
school	la scuola	La mia scuola è vicina.
science	la scienza	Studio scienze.
scientist	lo scienziato; la scienziata	Lo scienziato fa una domanda.
sea	il mare	Il mare è blu.
second1 (unit of time)	il secondo	Aspetta un secondo.
section	la sezione	Leggi questa sezione.
see	vedere	Vedo il mio amico.
sell	vendere	Vendono frutta fresca.
send	inviare; mandare	Manda il messaggio adesso.
sentence	la frase	Scrivi una frase.
September	settembre	La scuola comincia a settembre.
seven	sette	Sette persone sono qui.
seventeen	diciassette	Lui ha diciassette anni.
seventy	settanta	Mia nonna ha settanta anni.
share	condividere; dividere	Dividi la torta.
she	lei	Lei è mia sorella.
sheep	la pecora	La pecora mangia erba.
shirt	la camicia	La sua camicia è pulita.
shoe	la scarpa	Una scarpa è sotto il letto.
shop	il negozio; fare acquisti	Il negozio chiude presto.
shopping	lo shopping; fare acquisti	Fare acquisti è divertente oggi.
short	corto; breve	Questa storia è breve.
should modal	dovere; dovrebbe	Dovresti riposare oggi.
show	mostrare; lo spettacolo	Mostrami il tuo biglietto.
shower	la doccia	Faccio una doccia.
sick	malato	Mi sento malato oggi.
similar	simile	Le nostre borse sono simili.
sing	cantare	Canto in classe.
singer	il cantante; la cantante	Il cantante è famoso.
sister	la sorella	Mia sorella è giovane.
sit	sedersi	Siediti vicino alla finestra.
situation	la situazione	Questa situazione è nuova.
six	sei	Sei libri sono qui.
sixteen	sedici	Lei ha sedici anni.
sixty	sessanta	Mio padre ha sessanta anni.
skill	l'abilità; la competenza	Questa abilità è utile.
skirt	la gonna	La sua gonna è blu.
sleep	dormire; il sonno	Dormo otto ore.
slow	lento	L'autobus è lento.
small	piccolo	La stanza è piccola.
snake	il serpente	Il serpente è lungo.
snow	la neve; nevicare	La neve cade in inverno.
so	quindi; così	Sono stanco, quindi riposo.
some	un po' di; alcuni	Ho bisogno di un po' d'acqua.
somebody	qualcuno	Qualcuno è alla porta.
someone	qualcuno	Qualcuno ha lasciato un messaggio.
something	qualcosa	Ho bisogno di qualcosa da bere.
sometimes	a volte	A volte vado a scuola a piedi.
son	il figlio	Suo figlio è a scuola.
song	la canzone	Questa canzone è nuova.
soon	presto	A presto.
sorry	dispiaciuto; scusa	Mi dispiace.
sound	il suono	Il suono è forte.
soup	la zuppa; la minestra	La zuppa è calda.
south	il sud	L'hotel è a sud di qui.
space	lo spazio	C'è spazio per una sedia.
speak	parlare	Parla lentamente, per favore.
special	speciale	Oggi è un giorno speciale.
spell	fare lo spelling	Fai lo spelling del tuo nome.
spelling	l'ortografia	Controlla l'ortografia.
spend	spendere; passare	Spendo soldi per il cibo.
sport	lo sport	Il calcio è uno sport popolare.
spring	la primavera; saltare	I fiori crescono in primavera.
stand	stare in piedi	Stai vicino alla porta.
star	la stella	Vedo una stella luminosa.
start	iniziare; l'inizio	Inizia la lezione adesso.
statement	la dichiarazione; l'affermazione	Questa affermazione è vera.
station	la stazione	La stazione è vicina.
stay	restare; stare	Resta a casa oggi.
still	ancora	Ho ancora fame.
stop	fermare; la fermata	Fermati all'angolo.
story	la storia	Raccontami una storia.
street	la strada	Questa strada è tranquilla.
strong	forte	Lui è forte.
student	lo studente; la studentessa	Lo studente legge un libro.
study	studiare; lo studio	Studio inglese.
style	lo stile	Mi piace questo stile.
subject	la materia; il soggetto	L'inglese è la mia materia principale.
success	il successo	Il successo richiede pratica.
sugar	lo zucchero	Metti zucchero nel tè.
summer	l'estate	L'estate è calda qui.
sun	il sole	Il sole è luminoso.
Sunday	domenica	Ci riposiamo domenica.
supermarket	il supermercato	Il supermercato è aperto.
sure	sicuro	Sono sicuro.
sweater	il maglione	Il mio maglione è caldo.
swim	nuotare	Nuoto ogni settimana.
swimming	il nuoto	Il nuoto è un buon esercizio.
table	il tavolo	Le chiavi sono sul tavolo.`;

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
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
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
      throw new Error(`Italian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Italian translation row for ${sourceHeadword}`);
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
    article_display_policy: "include_natural_italian_articles_or_gender_markers_where_grammatically_useful_for_nouns",
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
    "Generate PT support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after PT.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-it.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_it_article_display_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_it_article_display_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(IT_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Italian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Italian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included in Italian display cells where grammatically useful
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
