#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SL";
const BATCH_ID = "sl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-sl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SL_TRANSLATIONS_TSV = `source_headword	SL	example_SL
take	vzeti; odnesti	Vzemi karto.
talk	govoriti; pogovor	Govorimo po pouku.
tall	visok	Moj učitelj je visok.
taxi	taksi	Taksi je zunaj.
tea	čaj	Ta čaj je vroč.
teach	poučevati; učiti	Poučujem angleščino.
teacher	učitelj; učiteljica	Učiteljica se smehlja.
team	ekipa; tim	Naša ekipa danes zmaga.
teenager	najstnik; najstnica	Najstnik bere knjigo.
telephone	telefon; telefonirati	Telefon je na mizi.
television	televizor; televizija	Televizor je nov.
tell	povedati; reči	Povej mi svoje ime.
ten	deset	Imam deset knjig.
tennis	tenis	Danes igramo tenis.
terrible	grozen	Vreme je grozno.
test	test; izpit	Test se začne zdaj.
text	sporočilo; besedilo	Pošlji kratko sporočilo.
than	kot	Deset je več kot dva.
thank	zahvaliti se	Zahvali se učitelju.
thanks	hvala; zahvala	Hvala za pomoč.
that	tisti; to	Tista knjiga je moja.
the	določeni člen v angleščini	Čaj je topel.
theatre	gledališče	Gledališče je blizu postaje.
their	njihov	Njihova hiša je velika.
them	njih; jim	Poznam jih.
then	nato; takrat	Jej, nato se uči.
there	tam; obstaja	Tam je stol.
they	oni; one	Oni so v šoli.
thing	stvar; predmet	Ta stvar je koristna.
think	misliti	Mislim na dom.
third	tretji; tretjina	To je tretja lekcija.
thirsty	žejen	Žejen sem.
thirteen	trinajst	Star je trinajst let.
thirty	trideset	Moja sestra ima trideset let.
this	ta; to	Ta karta je nova.
thousand	tisoč	Prišlo je tisoč ljudi.
three	tri	Vidim tri ptice.
through	skozi; prek	Hodimo skozi park.
Thursday	četrtek	Srečamo se v četrtek.
ticket	karta; vstopnica	Potrebujem karto.
time	čas; ura	Koliko je ura?
tired	utrujen	Utrujen sem.
title	naslov	Preberi naslov.
to	do; proti; za	Grem na tečaj.
today	danes	Danes je sončno.
together	skupaj	Jemo skupaj.
toilet	stranišče	Stranišče je čisto.
tomato	paradižnik	Ta paradižnik je rdeč.
tomorrow	jutri	Se vidimo jutri.
tonight	nocoj	Nocoj se učimo.
too	tudi; preveč	Tudi jaz želim čaj.
tooth	zob	Boli me zob.
topic	tema	Izberi temo.
tourist	turist; turistka	Turist fotografira.
town	mesto; mestece	To mestece je tiho.
traffic	promet	Promet je počasen.
train	vlak; trenirati	Vlak zamuja.
travel	potovati; potovanje	Potujemo z vlakom.
tree	drevo	Drevo je visoko.
trip	potovanje; izlet	Izlet se začne jutri.
trousers	hlače	Moje hlače so črne.
true	resničen; pravilen	Ta zgodba je resnična.
try	poskusiti; poskus	Poskusi ta čaj.
T-shirt	majica	Nosim majico.
Tuesday	torek	Srečamo se v torek.
turn	zaviti; obrat	Tukaj zavij levo.
TV	televizor; TV	Televizor je glasen.
twelve	dvanajst	Imam dvanajst svinčnikov.
twenty	dvajset	Tukaj je dvajset učencev.
twice	dvakrat	Plavam dvakrat na teden.
two	dva; dve	Dve osebi čakata.
type	tip; vrsta; tipkati	Katero vrsto glasbe želiš?
umbrella	dežnik	Vzemi dežnik.
uncle	stric	Moj stric je prijazen.
under	pod	Torba je pod mizo.
understand	razumeti	Razumem vprašanje.
university	univerza	Univerza je blizu.
until	do	Čakaj do petih.
up	gor; navzgor	Vstani zdaj.
upstairs	zgoraj; v nadstropju	Moja soba je zgoraj.
us	nas; nam	Pomagaj nam, prosim.
use	uporabljati; uporaba	Uporabi to pisalo.
useful	koristen	Ta karta je koristna.
usually	običajno	Običajno grem domov peš.
vacation	počitnice; dopust	Naše počitnice se začnejo jutri.
vegetable	zelenjava	Korenje je zelenjava.
very	zelo	Soba je zelo tiha.
video	video	Poglej ta video.
village	vas	Vas je majhna.
visit	obiskati	Obiščemo teto.
visitor	obiskovalec; obiskovalka	Obiskovalec čaka zunaj.
wait	čakati	Čakaj tukaj, prosim.
waiter	natakar; natakarica	Natakar prinese čaj.
wake	zbuditi se; zbuditi	Zbudim se zgodaj.
walk	hoditi; sprehod	Hodimo do šole.
wall	stena; zid	Stena je bela.
want	želeti; hoteti	Želim vodo.
warm	topel; ogreti	Soba je topla.
wash	prati; umiti	Umij si roke.
watch	gledati; ura	Gledam televizijo.
water	voda; zalivati	Popij malo vode.
way	pot; način	Ta pot je kratka.
we	mi	Učimo se angleščine.
wear	nositi	Nosim plašč.
weather	vreme	Vreme je hladno.
website	spletna stran	Ta spletna stran je koristna.
Wednesday	sreda	Ura se začne v sredo.
week	teden	Ta teden je naporen.
weekend	vikend	Vikend se začne jutri.
welcome	dobrodošel; pozdraviti	Dobrodošel na naši uri.
well	dobro	Ona dobro poje.
west	zahod	Sonce zahaja na zahodu.
what	kaj; kateri	Kaj je tam?
when	kdaj	Kdaj se učiš?
where	kje	Kje je postaja?
which	kateri	Katera torba je tvoja?
white	bel	Stena je bela.
who	kdo	Kdo je tam?
why	zakaj	Zakaj zamujaš?
wife	žena; soproga	Njegova žena je učiteljica.
will modal	bom; bo	Pomagal ti bom.
win	zmagati	Naša ekipa lahko zmaga.
window	okno	Odpri okno.
wine	vino	To vino je rdeče.
winter	zima	Zima je tukaj hladna.
with	z; s	Pridi z mano.
without	brez	Čaj brez sladkorja je dober.
woman	ženska	Ženska bere knjigo.
wonderful	čudovit; krasen	Razgled je čudovit.
word	beseda	Napiši eno besedo.
work	delati; delo	Delam doma.
worker	delavec; delavka	Delavec je zaposlen.
world	svet	Svet je velik.
would modal	bi	Rad bi čaj.
write	pisati	Napiši svoje ime.
writer	pisatelj; pisateljica	Pisatelj živi tukaj.
writing	pisanje; pisava	Njena pisava je jasna.
wrong	napačen	Ta odgovor je napačen.
yeah	ja; da	Ja, lahko pridem.
year	leto	To leto je dobro.
yellow	rumen	Banana je rumena.
yes	da	Da, razumem.
yesterday	včeraj	Včeraj sem telefoniral.
you	ti; vi	Ti si moj prijatelj.
young	mlad	Otrok je mlad.
your	tvoj; vaš	Tvoja torba je tukaj.
yourself	sebe; sam	Postrezi si s čajem.`;

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
  const lines = SL_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tSL\texample_SL") {
    throw new Error("Unexpected SL translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad SL translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad SL translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad SL translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad SL translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad SL example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate SL translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing SL translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`SL translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_sl_v1",
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
    SL: translation.display,
    example_SL: translation.example,
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
    "Generate the next support-language batch in language order: LT.",
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
    "- Article display: false; Slovenian uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: SL Latin-script display/example cells and no non-Latin script",
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
