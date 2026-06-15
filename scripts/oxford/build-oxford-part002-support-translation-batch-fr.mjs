#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "FR";
const BATCH_ID = "fr_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-fr.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const FR_TRANSLATIONS_TSV = `source_headword	FR	example_FR
clothes	les vêtements	Mes vêtements sont propres.
club	le club	Elle va dans un club de musique.
coat	le manteau	Mon manteau est chaud.
coffee	le café	Je bois du café le matin.
cold	froid; le froid	L'eau est froide.
college	l'université	Ma sœur étudie à l'université.
colour	la couleur	Ma couleur préférée est le bleu.
come	venir	Viens ici, s'il te plaît.
common	commun	Ce prénom est commun.
company	l'entreprise	Ma mère travaille dans une entreprise.
compare	comparer	Compare ces deux images.
complete	complet; compléter	Le formulaire est complet.
computer	l'ordinateur	Cet ordinateur est neuf.
concert	le concert	Nous allons à un concert ce soir.
conversation	la conversation	Nous avons eu une courte conversation.
cook	cuisiner; le cuisinier	Je cuisine le dîner à la maison.
cooking	la cuisine; cuisiner	J'aime cuisiner avec mon père.
cool	frais; super	La pièce est fraîche.
correct	correct; corriger	Ta réponse est correcte.
cost	coûter; le coût	Combien cela coûte-t-il ?
could modal	pourrait	Je pourrais t'aider.
country	le pays	Le Canada est un grand pays.
course	le cours	Je suis un cours d'anglais.
cousin	le cousin/la cousine	Mon cousin habite près d'ici.
cow	la vache	La vache mange de l'herbe.
cream	la crème	J'ajoute de la crème au café.
create	créer	Ils créent un nouveau jeu.
culture	la culture	Nous étudions la culture locale.
cup	la tasse	Cette tasse est vide.
customer	le client/la cliente	Le client pose une question.
cut	couper	Coupe la pomme en deux.
dad	papa	Papa est au travail.
dance	la danse; danser	Nous dansons après le dîner.
dancer	le danseur/la danseuse	Le danseur bouge vite.
dancing	la danse	La danse est amusante.
dangerous	dangereux	Cette route est dangereuse.
dark	sombre	La pièce est sombre.
date	la date	Quelle est la date aujourd'hui ?
daughter	la fille	Sa fille a six ans.
day	le jour	Passe une bonne journée.
dear	cher; chère	Cher ami, merci.
December	décembre	Mon anniversaire est en décembre.
decide	décider	Décide maintenant, s'il te plaît.
delicious	délicieux	Cette soupe est délicieuse.
describe	décrire	Décris ta chambre.
description	la description	Lis la courte description.
design	le design; concevoir	Je fais un design simple pour la carte.
desk	le bureau	Le livre est sur mon bureau.
detail	le détail	Il manque un détail.
dialogue	le dialogue	Lis le dialogue maintenant.
dictionary	le dictionnaire	Utilise un dictionnaire en classe.
die	mourir	Les fleurs meurent sans eau.
diet	l'alimentation; le régime	Mon alimentation comprend des fruits.
difference	la différence	Il y a une différence.
different	différent	Nous avons des noms différents.
difficult	difficile	Cette question est difficile.
dinner	le dîner	Le dîner est prêt.
dirty	sale	Mes chaussures sont sales.
discuss	discuter	Nous discutons du plan.
dish	le plat	Ce plat est chaud.
do1	faire	Que fais-tu ?
doctor	le médecin	Le médecin est occupé.
dog	le chien	Le chien court dehors.
dollar	le dollar	Cela coûte un dollar.
door	la porte	Ferme la porte, s'il te plaît.
down	en bas	Assieds-toi ici en bas.
downstairs	en bas; au rez-de-chaussée	La cuisine est en bas.
draw	dessiner	Dessine une petite maison.
dress	la robe; s'habiller	Elle porte une robe rouge.
drink	la boisson; boire	Je bois de l'eau.
drive	conduire	Je conduis pour aller au travail.
driver	le conducteur/la conductrice	Le conducteur s'arrête ici.
during	pendant	Je dors pendant le vol.
DVD	le DVD	Ce DVD est vieux.
each	chaque	Chaque enfant a un livre.
ear	l'oreille	J'ai mal à l'oreille.
early	tôt; précoce	Je me lève tôt.
east	l'est	Le soleil se lève à l'est.
easy	facile	Ce test est facile.
eat	manger	Nous mangeons ensemble.
egg	l'œuf	Je mange un œuf.
eight	huit	J'ai huit cartes.
eighteen	dix-huit	Elle a dix-huit ans.
eighty	quatre-vingts	Mon grand-père a quatre-vingts ans.
elephant	l'éléphant	L'éléphant est grand.
eleven	onze	Le cours commence à onze heures.
else	autre; encore	De quoi d'autre as-tu besoin ?
email	l'e-mail; le courriel	Envoie-moi un e-mail.
end	la fin; terminer	C'est la fin.
enjoy	apprécier	J'apprécie cette chanson.
enough	assez	Nous avons assez de temps.
euro	l'euro	Cela coûte un euro.
even	même	Même mon frère le sait.
evening	le soir	Nous nous voyons ce soir.
event	l'événement	L'événement commence aujourd'hui.
ever	déjà	Est-ce que tu cuisines parfois ?
every	chaque	J'étudie chaque jour.
everybody	tout le monde	Tout le monde est ici.
everyone	tout le monde	Tout le monde aime la musique.
everything	tout	Tout est prêt.
exam	l'examen	L'examen commence bientôt.
example	l'exemple	C'est un bon exemple.
excited	enthousiaste	Je suis enthousiaste aujourd'hui.
exciting	passionnant	Le jeu est passionnant.
exercise	l'exercice; faire de l'exercice	Je fais de l'exercice avant le petit-déjeuner.
expensive	cher	Ce manteau est cher.
explain	expliquer	Explique ce mot, s'il te plaît.
extra	supplémentaire	J'ai besoin de temps supplémentaire.
eye	l'œil	J'ai l'œil rouge.
face	le visage	Lave ton visage.
fact	le fait	Ce fait est important.
fall	tomber; l'automne	Les feuilles tombent en automne.
false	faux	Cette réponse est fausse.
family	la famille	Ma famille est petite.
famous	célèbre	Elle est une chanteuse célèbre.
fantastic	fantastique	Le concert était fantastique.
far	loin; lointain	L'école est loin.
farm	la ferme	Ils vivent dans une ferme.
farmer	l'agriculteur/l'agricultrice	L'agriculteur cultive de la nourriture.
fast	rapide	Ce train est rapide.
fat	gros	Le chat est gros.
father	le père	Mon père est grand.
favourite	préféré	C'est ma chanson préférée.
February	février	Février est froid ici.
feel	se sentir	Je me sens heureux.
feeling	le sentiment	Je connais ce sentiment.
festival	le festival	Le festival commence demain.
few	quelques; peu	Il y a peu d'élèves ici.
fifteen	quinze	J'ai quinze ans.
fifth	cinquième	C'est le cinquième cours.
fifty	cinquante	Ma mère a cinquante ans.
fill	remplir; compléter	Remplis la tasse d'eau.
film	le film	Nous regardons un film.
final	final; dernier	C'est la dernière question.
find	trouver	Je trouve les clés.
fine	bien; correct	Je vais bien maintenant.
finish	finir	Finis tes devoirs.
fire	le feu; l'incendie	Le feu est chaud.
first	premier	Elle est la première dans la file.
fish	le poisson	Je mange du poisson au dîner.
five	cinq	J'ai cinq livres.
flat	l'appartement	Mon appartement est petit.
flight	le vol	Le vol est en retard.
floor	le sol; l'étage	Le sac est sur le sol.
flower	la fleur	Cette fleur est jaune.
fly	voler	Les oiseaux volent dans le ciel.
follow	suivre	Suis-moi, s'il te plaît.
food	la nourriture	La nourriture est prête.
foot	le pied	J'ai mal au pied.
football	le football	Nous jouons au football aujourd'hui.
for	pour	Ce cadeau est pour toi.
forget	oublier	N'oublie pas les clés.
form	le formulaire	Remplis le formulaire.
forty	quarante	Mon père a quarante ans.
four	quatre	Je vois quatre oiseaux.
fourteen	quatorze	Elle a quatorze ans.
fourth	quatrième	C'est le quatrième étage.
free	gratuit; libre	Le billet est gratuit.
Friday	vendredi	Nous nous voyons vendredi.
friend	l'ami/l'amie	Mon ami est ici.
friendly	amical; sympathique	Le professeur est sympathique.
from	de; depuis	Je viens d'ici.
front	le devant; devant	Mets-toi devant.
fruit	le fruit	Je mange des fruits tous les jours.
full	plein	La bouteille est pleine.
fun	l'amusement; amusant	Ce jeu est amusant.
funny	drôle	Le film est drôle.
future	l'avenir	Pense à ton avenir.
game	le jeu	Le jeu commence maintenant.
garden	le jardin	Le jardin est joli.
geography	la géographie	J'étudie la géographie à l'école.
get	obtenir; arriver	J'arrive à la maison à six heures.
girl	la fille	La fille sourit.
girlfriend	la petite amie	Sa petite amie est gentille.
give	donner	Donne-moi le livre.
glass	le verre	Je bois dans un verre.
go	aller	Nous rentrons à la maison maintenant.
good	bon	Ce café est bon.
goodbye	au revoir	Au revoir, à demain.
grandfather	le grand-père	Mon grand-père est âgé.
grandmother	la grand-mère	Ma grand-mère prépare de la soupe.
grandparent	le grand-parent	Un de mes grands-parents vit avec nous.
great	super; grand	C'est une super idée.
green	vert	La porte est verte.
grey	gris	Le ciel est gris.
group	le groupe	Travaillez en petit groupe.
grow	grandir; cultiver	Les plantes poussent dans le jardin.
guess	deviner; la supposition	Devine la réponse.
guitar	la guitare	Il joue de la guitare.
gym	la salle de sport	Je vais à la salle de sport.
hair	les cheveux	Elle a les cheveux longs.
half	la moitié	Coupe le gâteau en deux.
hand	la main	Lève la main.
happen	arriver	Que se passe-t-il ensuite ?
happy	heureux	Je suis heureux aujourd'hui.
hard	dur; difficile	Cette chaise est dure.
hat	le chapeau; le bonnet	Mon bonnet est noir.
hate	détester	Je déteste le thé froid.
have	avoir	J'ai une voiture.
have to modal	devoir	Je dois étudier.
he	il	Il est mon frère.
head	la tête	J'ai mal à la tête.
health	la santé	La bonne nourriture aide la santé.
healthy	sain	Ce plat est sain.
hear	entendre	J'entends de la musique.
hello	bonjour	Bonjour, ravi de te rencontrer.
help	l'aide; aider	Aide-moi, s'il te plaît.
her	son; sa; la; lui	C'est son sac.
here	ici	Viens ici maintenant.
hey	hé; salut	Hé, attends-moi.
hi	salut	Salut, ça va ?
high	haut; élevé	Le mur est haut.
him	le; lui	Je le connais.
his	son; sa	Son manteau est bleu.
history	l'histoire	J'étudie l'histoire.
hobby	le loisir	La lecture est mon loisir.
holiday	les vacances	Nous partons en vacances en juillet.
home	la maison; chez soi	Je suis à la maison.
homework	les devoirs	Fais tes devoirs ce soir.
hope	espérer	J'espère que tu viendras.
horse	le cheval	Le cheval court vite.
hospital	l'hôpital	L'hôpital est proche.
hot	chaud	La soupe est chaude.
hotel	l'hôtel	L'hôtel est propre.
hour	l'heure	Attends une heure.
house	la maison	Cette maison est vieille.
how	comment	Comment ça va ?
however	cependant	Cependant, je peux rester ici.
hundred	cent	Cent personnes sont venues.
hungry	affamé	J'ai faim.
husband	le mari	Son mari est médecin.
I	je	J'aime le thé.
ice	la glace	La glace est froide.
ice cream	la glace	Je veux une glace.
idea	l'idée	C'est une bonne idée.
if	si	Appelle-moi si tu as besoin d'aide.
imagine	imaginer	Imagine une petite maison.
important	important	Ce cours est important.
improve	améliorer	Je veux m'améliorer.
in	dans; en	Les clés sont dans mon sac.
include	inclure	Indique ton nom, s'il te plaît.
information	l'information	J'ai besoin de plus d'informations.
interest	l'intérêt	Elle s'intéresse à l'art.
interested	intéressé	Je m'intéresse à la musique.
interesting	intéressant	Ce livre est intéressant.
internet	internet	Internet est lent.
interview	l'entretien	J'ai un entretien aujourd'hui.
into	dans; à l'intérieur	Mets les livres dans le sac.
introduce	présenter	Présente ton ami, s'il te plaît.
island	l'île	Cette île est petite.
it	ça; il; elle	Il fait froid.
its	son; sa	Le chien aime son panier.
jacket	la veste	Ma veste est neuve.
January	janvier	Janvier est le premier mois.
jeans	le jean	Mon jean est bleu.
job	le travail	J'ai besoin d'un nouveau travail.
join	rejoindre	Rejoins notre cours aujourd'hui.
journey	le voyage	Le voyage est long.
juice	le jus	Je bois du jus d'orange.
July	juillet	Nous voyageons en juillet.
June	juin	L'école se termine en juin.
just	juste; seulement	J'ai juste besoin d'eau.
keep	garder	Garde cette clé.
key	la clé	J'ai perdu la clé.
kilometre	le kilomètre	Marche un kilomètre.
kind (type)	le type; la sorte	Quel type de musique aimes-tu ?
kitchen	la cuisine	La cuisine est propre.
know	savoir; connaître	Je connais la réponse.
land	la terre	L'avion est au sol.
language	la langue	L'anglais est une langue.
large	grand	Cette pièce est grande.
last1 (final)	dernier	C'est la dernière page.
late	tard; en retard	Le bus est en retard.
later	plus tard	À plus tard.
laugh	rire; le rire	Nous rions ensemble.
learn	apprendre	J'apprends l'anglais.
leave	partir; laisser	Laisse la porte ouverte.
left	gauche; à gauche	Tourne à gauche ici.
leg	la jambe	J'ai mal à la jambe.
lesson	la leçon; le cours	Le cours commence maintenant.
let	laisser; permettre	Laisse-moi t'aider.
letter	la lettre	J'écris une lettre.
library	la bibliothèque	La bibliothèque ouvre à neuf heures.
lie1	s'allonger	Allonge-toi sur le lit, s'il te plaît.
life	la vie	La vie en ville est animée.
like (similar)	comme; semblable à	Cela ressemble à un jeu.
like (find sb/sth pleasant)	aimer	J'aime cette chanson.
line	la ligne; la file	Mets-toi dans la file.
lion	le lion	Le lion dort.
list	la liste; faire une liste	Fais une liste de courses.
listen	écouter	Écoute le professeur.
little	petit; peu	J'ai peu d'argent.
live1	vivre	J'habite près de l'école.
local	local	C'est un magasin local.
long1	long	La route est longue.
look	regarder; avoir l'air	Regarde l'image.
lose	perdre	Ne perds pas ton billet.
lot	beaucoup; un tas	J'ai beaucoup de devoirs.
love	l'amour; aimer	J'aime ma famille.
lunch	le déjeuner	Le déjeuner est prêt.`;

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
    reviewer: "codex_oxford_part002_support_translation_batch_fr_v1",
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
