#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "FR";
const BATCH_ID = "fr_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-fr.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const FR_TRANSLATIONS_TSV = `source_headword	FR	example_FR
machine	la machine; l'appareil	Cette machine prépare du café.
magazine	le magazine	Elle lit un magazine de musique.
main	principal	C'est la porte principale.
make	faire; préparer	Je prépare le déjeuner à la maison.
man	l'homme	L'homme est mon professeur.
many	beaucoup de; de nombreux	Beaucoup d'étudiants sont ici.
map	la carte	Regarde la carte.
March	mars	Mon anniversaire est en mars.
market	le marché	Nous achetons des fruits au marché.
married	marié; mariée	Ma sœur est mariée.
May	mai	L'école finit en mai.
maybe	peut-être	Peut-être qu'il va pleuvoir.
me	me; moi	Aide-moi, s'il te plaît.
meal	le repas	Ce repas est chaud.
mean	signifier	Que signifie ce panneau ?
meaning	le sens; la signification	Quelle est la signification ?
meat	la viande	Je mange de la viande au dîner.
meet	rencontrer; se réunir	Nous nous réunissons après le cours.
meeting	la réunion	La réunion commence maintenant.
member	le membre	Elle est membre du club.
menu	le menu	Lis le menu, s'il te plaît.
message	le message	J'envoie un court message.
metre	le mètre	Avance d'un mètre.
midnight	minuit	Le train part à minuit.
mile	le mile	Nous marchons un mile.
milk	le lait	Je bois du lait au petit-déjeuner.
million	le million	Un million de personnes vivent ici.
minute1	la minute	Attends une minute, s'il te plaît.
miss	manquer; rater	Mon ancienne école me manque.
mistake	l'erreur	Cette réponse contient une erreur.
model	le modèle	C'est un petit modèle.
modern	moderne	La cuisine est moderne.
moment	le moment	Attends un moment, s'il te plaît.
Monday	lundi	Nous commençons le travail lundi.
money	l'argent	J'ai besoin d'un peu d'argent.
month	le mois	Juin est un mois chaud.
more	plus	J'ai besoin de plus de temps.
morning	le matin	J'étudie le matin.
most	la plupart; le plus	La plupart des étudiants aiment la musique.
mother	la mère	Ma mère travaille aujourd'hui.
mountain	la montagne	La montagne est haute.
mouse	la souris	Une souris est sous la chaise.
mouth	la bouche	Ouvre la bouche, s'il te plaît.
move	déplacer; bouger	Déplace la chaise ici.
movie	le film	Nous regardons un film ce soir.
much	beaucoup; combien	Combien cela coûte-t-il ?
mum	maman	Maman est à la maison.
museum	le musée	Le musée ouvre à dix heures.
music	la musique	J'écoute de la musique.
must modal	devoir	Tu dois t'arrêter ici.
my	mon; ma; mes	C'est mon livre.
name	le nom; nommer	Écris ton nom ici.
natural	naturel	Ce jus est naturel.
near	près de; proche	La banque est près d'ici.
need	avoir besoin de	J'ai besoin d'un stylo.
negative	négatif	Cette réponse est négative.
neighbour	le voisin; la voisine	Mon voisin est sympathique.
never	jamais	Je ne bois jamais de café.
new	nouveau; neuve	Ce téléphone est neuf.
news	les nouvelles; l'actualité	Les nouvelles sont bonnes aujourd'hui.
newspaper	le journal	Il lit un journal.
next	suivant	Le bus suivant est en retard.
next to	à côté de	Assieds-toi à côté de moi.
nice	agréable; gentil	La pièce est agréable.
night	la nuit	Je dors la nuit.
nine	neuf	Neuf étudiants sont ici.
nineteen	dix-neuf	Elle a dix-neuf ans.
ninety	quatre-vingt-dix	Mon grand-père a quatre-vingt-dix ans.
no	non	Non, merci.
no one	personne	Personne n'est dans la pièce.
nobody	personne	Personne n'est à la maison.
north	le nord	La gare est au nord d'ici.
nose	le nez	Mon nez est froid.
not	ne pas	Je ne suis pas fatigué.
note	la note	Écris une note maintenant.
nothing	rien	Il n'y a rien dans la boîte.
November	novembre	Mon cours commence en novembre.
now	maintenant	Viens ici maintenant.
number	le nombre; le numéro	Écris le numéro ici.
nurse	l'infirmier; l'infirmière	L'infirmière est gentille.
object	l'objet	Pose l'objet sur la table.
o’clock	heures	Le cours commence à neuf heures.
October	octobre	Nous voyageons en octobre.
of	de	C'est une tasse de thé.
off	éteint; hors de	Éteins la lumière.
office	le bureau	Mon bureau est petit.
often	souvent	Je vais souvent à l'école à pied.
oh	oh	Oh, je comprends maintenant.
OK	d'accord; bien	Est-ce que c'est d'accord ?
old	vieux; vieille	Cette maison est vieille.
on	sur; allumé	Le livre est sur la table.
once	une fois	J'appelle une fois par semaine.
one	un; une	J'ai une sœur.
onion	l'oignon	Coupe un oignon.
online	en ligne	J'étudie en ligne.
only	seulement	J'ai seulement un sac.
open	ouvrir; ouvert	Ouvre la fenêtre, s'il te plaît.
opinion	l'opinion	Quelle est ton opinion ?
opposite	en face de; opposé	Le magasin est en face de la banque.
or	ou	Thé ou café ?
orange	l'orange; orange	Cette orange est sucrée.
order	commander; la commande	Je commande de la soupe.
other	autre	Utilise l'autre porte.
our	notre; nos	C'est notre salle de classe.
out	dehors; vers l'extérieur	Sors après le déjeuner.
outside	dehors; à l'extérieur	Les enfants jouent dehors.
over	au-dessus de; par-dessus	L'avion vole au-dessus de la ville.
own	propre	J'ai ma propre chambre.
page	la page	Ouvre la page dix.
paint	peindre	Peins le mur en bleu.
painting	la peinture; le tableau	Ce tableau est beau.
pair	la paire	J'ai besoin d'une paire de chaussettes.
paper	le papier	Écris sur ce papier.
paragraph	le paragraphe	Lis le premier paragraphe.
parent	le parent	Un parent attend dehors.
park	se garer; le parc	Nous nous garons près de la gare.
part	la partie	Cette partie est facile.
partner	le partenaire; la partenaire	Travaille avec un partenaire.
party	la fête	La fête commence à sept heures.
passport	le passeport	Montre ton passeport, s'il te plaît.
past	passé; et demie	Il est six heures et demie.
pay	payer	Je paie par carte.
pen	le stylo	Ce stylo est bleu.
pencil	le crayon	J'écris avec un crayon.
people	les gens; les personnes	Beaucoup de gens sont ici.
pepper	le poivre	Ajoute du poivre à la soupe.
perfect	parfait	Ta réponse est parfaite.
period	la période; le cours	Le cours est court.
person	la personne	Une personne attend.
personal	personnel	C'est mon téléphone personnel.
phone	le téléphone	Mon téléphone est dans mon sac.
photo	la photo	Prends une photo ici.
photograph	la photographie	Cette photographie est vieille.
phrase	la phrase	Répète la phrase, s'il te plaît.
piano	le piano	Elle joue du piano.
picture	l'image; le dessin	Regarde cette image.
piece	le morceau; la pièce	Prends un morceau de gâteau.
pig	le cochon	Le cochon est à la ferme.
pink	rose	Son sac est rose.
place	le lieu; l'endroit	Cet endroit est calme.
plan	le plan	Nous avons besoin d'un plan.
plane	l'avion	L'avion est en retard.
plant	la plante; planter	Arrose la plante aujourd'hui.
play	jouer	Les enfants jouent dans le parc.
player	le joueur; la joueuse	Le joueur court vite.
please	s'il te plaît; s'il vous plaît	Assieds-toi ici, s'il te plaît.
point	le point	Ce point est important.
police	la police	La police est dehors.
policeman	le policier	Le policier nous aide.
pool	la piscine	La piscine est froide.
poor	pauvre	Le pauvre enfant a faim.
popular	populaire	Cette chanson est populaire.
positive	positif	C'est un résultat positif.
possible	possible	Est-ce possible aujourd'hui ?
post	la publication; le courrier	Je lis sa publication en ligne.
potato	la pomme de terre	Je mange une pomme de terre.
pound	la livre	Cela coûte une livre.
practice	la pratique	La pratique aide chaque jour.
practise	pratiquer	Je pratique l'anglais tous les jours.
prefer	préférer	Je préfère le thé.
prepare	préparer	Prépare ton sac ce soir.
present	présent; le cadeau	Elle est présente aujourd'hui.
pretty	joli; assez	Le jardin est joli.
price	le prix	Le prix est bas.
probably	probablement	Elle le sait probablement.
problem	le problème	Ce problème est petit.
product	le produit	Ce produit est nouveau.
programme	le programme	Le programme commence maintenant.
project	le projet	Notre projet est prêt.
purple	violet	La chemise est violette.
put	mettre	Mets le livre ici.
quarter	le quart	Il est deux heures et quart.
question	la question	Pose une question.
quick	rapide	C'est un test rapide.
quickly	rapidement	Marche vite, s'il te plaît.
quiet	calme; silencieux	La bibliothèque est calme.
quite	assez	Cette pièce est assez petite.
radio	la radio	La radio est forte.
rain	la pluie	La pluie commence maintenant.
read	lire	Lis cette phrase.
reader	le lecteur; la lectrice	Le lecteur aime l'histoire.
reading	la lecture	La lecture m'aide à apprendre.
ready	prêt; prête	Le dîner est prêt.
real	réel	C'est un vrai problème.
really	vraiment	J'aime vraiment cette chanson.
reason	la raison	Dis-moi la raison.
red	rouge	La porte est rouge.
relax	se détendre	Détends-toi après le travail.
remember	se souvenir de	N'oublie pas ton passeport.
repeat	répéter	Répète la phrase, s'il te plaît.
report	le rapport	Lis le rapport ce soir.
restaurant	le restaurant	Le restaurant est occupé.
result	le résultat	Le résultat est bon.
return	retourner; rendre	Rends le livre demain.
rice	le riz	Je mange du riz au déjeuner.
rich	riche	La ville est riche.
ride	monter; faire du vélo	Je fais du vélo.
right	droit; correct	Tourne à droite ici.
river	la rivière	La rivière est large.
road	la route	Cette route est longue.
room	la chambre; la pièce	Ma chambre est propre.
routine	la routine	Ma routine commence tôt.
rule	la règle	Cette règle est simple.
run	courir	Je cours chaque matin.
sad	triste	Il est triste aujourd'hui.
salad	la salade	Cette salade est fraîche.
salt	le sel	Ajoute un peu de sel.
same	même; pareil	Nous avons le même sac.
sandwich	le sandwich	Je mange un sandwich.
Saturday	samedi	Nous nous voyons samedi.
say	dire	Dis ton nom, s'il te plaît.
school	l'école	Mon école est près d'ici.
science	la science	J'étudie les sciences.
scientist	le scientifique; la scientifique	Le scientifique pose une question.
sea	la mer	La mer est bleue.
second1 (unit of time)	la seconde	Attends une seconde.
section	la section	Lis cette section.
see	voir	Je vois mon ami.
sell	vendre	Ils vendent des fruits frais.
send	envoyer	Envoie le message maintenant.
sentence	la phrase	Écris une phrase.
September	septembre	L'école commence en septembre.
seven	sept	Sept personnes sont ici.
seventeen	dix-sept	Il a dix-sept ans.
seventy	soixante-dix	Ma grand-mère a soixante-dix ans.
share	partager	Partage le gâteau.
she	elle	Elle est ma sœur.
sheep	le mouton	Le mouton mange de l'herbe.
shirt	la chemise	Sa chemise est propre.
shoe	la chaussure	Une chaussure est sous le lit.
shop	le magasin	Le magasin ferme tôt.
shopping	les achats; le shopping	Les achats sont amusants aujourd'hui.
short	court	Cette histoire est courte.
should modal	devrait	Tu devrais te reposer aujourd'hui.
show	montrer	Montre-moi ton billet.
shower	la douche	Je prends une douche.
sick	malade	Je me sens malade aujourd'hui.
similar	similaire	Nos sacs sont similaires.
sing	chanter	Je chante en classe.
singer	le chanteur; la chanteuse	Le chanteur est célèbre.
sister	la sœur	Ma sœur est jeune.
sit	s'asseoir	Assieds-toi près de la fenêtre.
situation	la situation	Cette situation est nouvelle.
six	six	Six livres sont ici.
sixteen	seize	Elle a seize ans.
sixty	soixante	Mon père a soixante ans.
skill	la compétence	Cette compétence est utile.
skirt	la jupe	Sa jupe est bleue.
sleep	dormir	Je dors huit heures.
slow	lent	Le bus est lent.
small	petit	La pièce est petite.
snake	le serpent	Le serpent est long.
snow	la neige	La neige tombe en hiver.
so	donc; si	Je suis fatigué, donc je me repose.
some	du; des; quelques	J'ai besoin d'un peu d'eau.
somebody	quelqu'un	Quelqu'un est à la porte.
someone	quelqu'un	Quelqu'un a laissé un message.
something	quelque chose	J'ai besoin de quelque chose à boire.
sometimes	parfois	Je vais parfois à l'école à pied.
son	le fils	Son fils est à l'école.
song	la chanson	Cette chanson est nouvelle.
soon	bientôt	À bientôt.
sorry	désolé; pardon	Je suis désolé.
sound	le son	Le son est fort.
soup	la soupe	La soupe est chaude.
south	le sud	L'hôtel est au sud d'ici.
space	l'espace; la place	Il y a de la place pour une chaise.
speak	parler	Parle lentement, s'il te plaît.
special	spécial	Aujourd'hui est un jour spécial.
spell	épeler	Épelle ton nom.
spelling	l'orthographe	Vérifie ton orthographe.
spend	dépenser	Je dépense de l'argent pour la nourriture.
sport	le sport	Le football est un sport populaire.
spring	le printemps	Les fleurs poussent au printemps.
stand	être debout	Mets-toi debout près de la porte.
star	l'étoile	Je vois une étoile brillante.
start	commencer	Commence le cours maintenant.
statement	la déclaration; l'affirmation	Cette affirmation est vraie.
station	la gare	La gare est proche.
stay	rester	Reste à la maison aujourd'hui.
still	encore	J'ai encore faim.
stop	arrêter; l'arrêt	Arrête-toi au coin.
story	l'histoire	Raconte-moi une histoire.
street	la rue	Cette rue est calme.
strong	fort	Il est fort.
student	l'étudiant; l'étudiante	L'étudiant lit un livre.
study	étudier; l'étude	J'étudie l'anglais.
style	le style	J'aime ce style.
subject	la matière	L'anglais est ma matière principale.
success	le succès	Le succès demande de la pratique.
sugar	le sucre	Mets du sucre dans le thé.
summer	l'été	L'été est chaud ici.
sun	le soleil	Le soleil brille.
Sunday	dimanche	Nous nous reposons dimanche.
supermarket	le supermarché	Le supermarché est ouvert.
sure	sûr; certaine	Je suis sûr.
sweater	le pull	Mon pull est chaud.
swim	nager	Je nage chaque semaine.
swimming	la natation	La natation est un bon exercice.
table	la table	Les clés sont sur la table.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json",
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
  const lines = FR_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tFR\texample_FR") {
    throw new Error("Unexpected FR translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad FR translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad FR translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad FR example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate FR translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing FR translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`FR translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part003_support_translation_batch_fr_v1",
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
    FR: translation.display,
    example_FR: translation.example,
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate DE support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after DE.",
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
    `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: included in French display cells where grammatically useful",
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
