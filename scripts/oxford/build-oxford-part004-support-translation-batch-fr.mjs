#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "FR";
const BATCH_ID = "fr_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-fr.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const FR_TRANSLATIONS_TSV = `source_headword	FR	example_FR
take	prendre; emporter	Prends le billet.
talk	parler; la conversation	Nous parlons après le cours.
tall	grand; grande	Mon professeur est grand.
taxi	le taxi	Le taxi est dehors.
tea	le thé	Ce thé est chaud.
teach	enseigner	J'enseigne l'anglais.
teacher	le professeur; la professeure	La professeure sourit.
team	l'équipe	Notre équipe gagne aujourd'hui.
teenager	l'adolescent; l'adolescente	L'adolescent lit un livre.
telephone	le téléphone; téléphoner	Le téléphone est sur le bureau.
television	la télévision; le téléviseur	La télévision est neuve.
tell	dire; raconter	Dis-moi ton nom.
ten	dix	J'ai dix livres.
tennis	le tennis	Nous jouons au tennis aujourd'hui.
terrible	terrible	Le temps est terrible.
test	le test; l'examen; tester	Le test commence maintenant.
text	le SMS; envoyer un message	Envoie un court SMS.
than	que	Dix est plus que deux.
thank	remercier	Remercie ton professeur.
thanks	merci	Merci pour ton aide.
that	ce; cette; cela	Ce livre est à moi.
the	le; la; les; l'	Le thé est chaud.
theatre	le théâtre	Le théâtre est près de la gare.
their	leur; leurs	Leur maison est grande.
them	les; leur; eux; elles	Je les connais.
then	ensuite; alors	Mange, puis étudie.
there	là; il y a	Il y a une chaise là.
they	ils; elles	Ils sont à l'école.
thing	la chose; l'objet	Cette chose est utile.
think	penser	Je pense à la maison.
third	troisième; le tiers	C'est la troisième leçon.
thirsty	assoiffé; avoir soif	J'ai soif.
thirteen	treize	Elle a treize ans.
thirty	trente	Ma sœur a trente ans.
this	ce; cette	Ce billet est neuf.
thousand	mille	Mille personnes sont venues.
three	trois	Je vois trois oiseaux.
through	par; à travers	Nous traversons le parc.
Thursday	jeudi	Nous nous voyons jeudi.
ticket	le billet; l'entrée	J'ai besoin d'un billet.
time	le temps; l'heure	Quelle heure est-il ?
tired	fatigué; fatiguée	Je suis fatigué.
title	le titre	Lis le titre.
to	à; pour; marqueur d'infinitif	Je vais en classe.
today	aujourd'hui	Aujourd'hui, il fait beau.
together	ensemble	Nous mangeons ensemble.
toilet	les toilettes; le WC	Les toilettes sont propres.
tomato	la tomate	Cette tomate est rouge.
tomorrow	demain	À demain.
tonight	ce soir	Nous étudions ce soir.
too	aussi; trop	Je veux aussi du thé.
tooth	la dent	J'ai mal à une dent.
topic	le sujet	Choisis un sujet.
tourist	le touriste; la touriste	Le touriste prend des photos.
town	la ville; le village	Cette ville est calme.
traffic	la circulation	La circulation est lente.
train	le train; entraîner	Le train arrive en retard.
travel	voyager; le voyage	Nous voyageons en train.
tree	l'arbre	L'arbre est grand.
trip	le voyage; l'excursion	Le voyage commence demain.
trousers	le pantalon	Mon pantalon est noir.
true	vrai; véritable	Cette histoire est vraie.
try	essayer; goûter	Goûte ce thé.
T-shirt	le t-shirt	Je porte un t-shirt.
Tuesday	mardi	Nous nous voyons mardi.
turn	tourner; le tour	Tourne à gauche ici.
TV	la télé; la télévision	La télé est trop forte.
twelve	douze	J'ai douze stylos.
twenty	vingt	Il y a vingt étudiants ici.
twice	deux fois	Je nage deux fois par semaine.
two	deux	Deux personnes attendent.
type	le type; taper	Quel type de musique ?
umbrella	le parapluie	Prends un parapluie.
uncle	l'oncle	Mon oncle est gentil.
under	sous	Le sac est sous la table.
understand	comprendre	Je comprends la question.
university	l'université	L'université est proche.
until	jusqu'à	Attends jusqu'à cinq heures.
up	en haut; vers le haut	Lève-toi maintenant.
upstairs	en haut; à l'étage	Ma chambre est à l'étage.
us	nous	Aide-nous, s'il te plaît.
use	utiliser; l'utilisation	Utilise ce stylo.
useful	utile	Cette carte est utile.
usually	généralement; d'habitude	D'habitude, je rentre à pied.
vacation	les vacances	Nos vacances commencent demain.
vegetable	le légume	La carotte est un légume.
very	très	La pièce est très calme.
video	la vidéo	Regarde cette vidéo.
village	le village	Le village est petit.
visit	visiter; la visite	Nous visitons notre tante.
visitor	le visiteur; la visiteuse	Le visiteur attend dehors.
wait	attendre	Attends ici, s'il te plaît.
waiter	le serveur; la serveuse	Le serveur apporte du thé.
wake	réveiller; se réveiller	Je me réveille tôt.
walk	marcher; la promenade	Nous marchons vers l'école.
wall	le mur	Le mur est blanc.
want	vouloir	Je veux de l'eau.
warm	chaud; tiède; réchauffer	La pièce est chaude.
wash	laver	Lave-toi les mains.
watch	regarder; la montre	Je regarde la télévision.
water	l'eau; arroser	Bois un peu d'eau.
way	le chemin; la manière	Ce chemin est court.
we	nous	Nous étudions l'anglais.
wear	porter	Je porte une veste.
weather	le temps; la météo	Le temps est froid.
website	le site web	Ce site web est utile.
Wednesday	mercredi	Le cours commence mercredi.
week	la semaine	Cette semaine est chargée.
weekend	le week-end	Le week-end commence demain.
welcome	bienvenue; accueillir	Bienvenue dans notre classe.
well	bien	Elle chante bien.
west	l'ouest	Le soleil se couche à l'ouest.
what	quoi; quel; quelle	Qu'est-ce que c'est ?
when	quand	Quand étudies-tu ?
where	où	Où est la gare ?
which	quel; quelle; lequel	Quel sac est à toi ?
white	blanc; blanche	Le mur est blanc.
who	qui	Qui est-ce ?
why	pourquoi	Pourquoi arrives-tu tard ?
wife	l'épouse; la femme	Son épouse est professeure.
will modal	marqueur du futur; vouloir	Je t'aiderai demain.
win	gagner	Notre équipe peut gagner.
window	la fenêtre	Ouvre la fenêtre.
wine	le vin	Ce vin est rouge.
winter	l'hiver	L'hiver est froid ici.
with	avec	Viens avec moi.
without	sans	Le thé sans sucre est bon.
woman	la femme	La femme lit un livre.
wonderful	merveilleux; merveilleuse	La vue est merveilleuse.
word	le mot	Écris un mot.
work	travailler; le travail	Je travaille à la maison.
worker	le travailleur; la travailleuse	Le travailleur est occupé.
world	le monde	Le monde est grand.
would modal	conditionnel; vouloir	Je voudrais du thé.
write	écrire	Écris ton nom.
writer	l'écrivain; l'écrivaine	L'écrivain vit ici.
writing	l'écriture; le texte	Son écriture est claire.
wrong	faux; incorrect	Cette réponse est fausse.
yeah	oui; d'accord	Oui, je peux venir.
year	l'année	Cette année est bonne.
yellow	jaune	La banane est jaune.
yes	oui	Oui, je comprends.
yesterday	hier	J'ai appelé hier.
you	tu; vous	Tu es mon ami.
young	jeune	L'enfant est jeune.
your	ton; ta; tes; votre; vos	Ton sac est ici.
yourself	toi-même; vous-même	Sers-toi du thé.`;

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
    reviewer: "codex_oxford_part004_support_translation_batch_fr_article_display_v1",
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
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: DE.",
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
