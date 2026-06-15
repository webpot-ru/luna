#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_004_147_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_si_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_si_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-si.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SI";
const BATCH_ID = "si_v1";
const RELEASE_ENTRY_COUNT = 147;
const SENTENCE_END_RE = /[.!?]$/u;
const SINHALA_RE = /\p{Script=Sinhala}/u;
const LATIN_RE = /[A-Za-z]/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SI_TRANSLATIONS_TSV = `source_headword	SI	example_SI
take	ගන්න; රැගෙන යන්න	ප්‍රවේශපත්‍රය ගන්න.
talk	කතා කරන්න; කතාබහ	අපි පාඩමෙන් පසුව කතා කරමු.
tall	උස	මගේ ගුරුවරයා උසය.
taxi	ටැක්සිය	ටැක්සිය පිටත ඇත.
tea	තේ	මෙම තේ උණුසුම්ය.
teach	උගන්වන්න	මම ඉංග්‍රීසි උගන්වමි.
teacher	ගුරුවරයා; ගුරුවරිය	ගුරුවරිය සිනාසෙයි.
team	කණ්ඩායම	අපේ කණ්ඩායම අද ජය ගනී.
teenager	නවයොවුන් කෙනා	නවයොවුන් ළමයා පොතක් කියවයි.
telephone	දුරකථනය; දුරකථන කරන්න	දුරකථනය මේසය මත ඇත.
television	රූපවාහිනිය	රූපවාහිනිය අලුත්ය.
tell	කියන්න; පවසන්න	ඔබේ නම මට කියන්න.
ten	දහය	මා ළඟ පොත් දහයක් ඇත.
tennis	ටෙනිස්	අද අපි ටෙනිස් ක්‍රීඩා කරමු.
terrible	ඉතා නරක; භයානක	කාලගුණය ඉතා නරකය.
test	පරීක්ෂණය; විභාගය	පරීක්ෂණය දැන් ආරම්භ වේ.
text	පණිවිඩය; පෙළ	කෙටි පණිවිඩයක් යවන්න.
than	වඩා	දහය දෙකට වඩා වැඩිය.
thank	ස්තුති කරන්න	ඔබේ ගුරුවරයාට ස්තුති කරන්න.
thanks	ස්තුතියි	උදව්වට ස්තුතියි.
that	ඒ; එය	ඒ පොත මගේය.
the	ඉංග්‍රීසි නිශ්චිත පදය	තේ උණුසුම්ය.
theatre	නාට්‍යශාලාව	නාට්‍යශාලාව ස්ථානය ළඟය.
their	ඔවුන්ගේ	ඔවුන්ගේ නිවස විශාලය.
them	ඔවුන්ට; ඔවුන්ව	මම ඔවුන්ව හඳුනමි.
then	ඉන්පසු; එවිට	කන්න, ඉන්පසු පාඩම් කරන්න.
there	එහි; අතැන	එහි පුටුවක් ඇත.
they	ඔවුන්	ඔවුන් පාසලේ ඇත.
thing	දේ; වස්තුව	මෙම දේ ප්‍රයෝජනවත්ය.
think	සිතන්න	මම නිවස ගැන සිතමි.
third	තුන්වන; තුනෙන් එකක්	මෙය තුන්වන පාඩමය.
thirsty	පිපාසිත	මට පිපාසය ඇත.
thirteen	දහතුන	ඔහුට වයස දහතුනකි.
thirty	තිහ	මගේ අක්කාට වයස තිහකි.
this	මෙය; මේ	මෙම ප්‍රවේශපත්‍රය අලුත්ය.
thousand	දහස	මිනිසුන් දහසක් පැමිණියා.
three	තුන	මම කුරුල්ලන් තුන්දෙනෙක් දකිමි.
through	හරහා; මඟින්	අපි උද්‍යානය හරහා ඇවිදිමු.
Thursday	බ්‍රහස්පතින්දා	අපි බ්‍රහස්පතින්දා හමුවෙමු.
ticket	ප්‍රවේශපත්‍රය	මට ප්‍රවේශපත්‍රයක් අවශ්‍යය.
time	කාලය; වේලාව	දැන් වේලාව කීයද?
tired	මහන්සි	මට මහන්සියි.
title	ශීර්ෂය	ශීර්ෂය කියවන්න.
to	වෙත; සඳහා	මම පන්තියට යමි.
today	අද	අද හිරු පායයි.
together	එකට	අපි එකට කමු.
toilet	වැසිකිළිය	වැසිකිළිය පිරිසිදුය.
tomato	තක්කාලි	මෙම තක්කාලි රතුය.
tomorrow	හෙට	හෙට හමුවෙමු.
tonight	අද රෑ	අපි අද රෑ පාඩම් කරමු.
too	ද; ඉතා	මටද තේ අවශ්‍යය.
tooth	දත	මගේ දත රිදෙයි.
topic	මාතෘකාව	මාතෘකාවක් තෝරන්න.
tourist	සංචාරකයා	සංචාරකයා රූපයක් ගනී.
town	නගරය; කුඩා නගරය	මෙම නගරය නිහඬය.
traffic	වාහන ගමනාගමනය	වාහන ගමනාගමනය මන්දය.
train	දුම්රිය	දුම්රිය ප්‍රමාදයි.
travel	ගමන් කරන්න; සංචාරය	අපි දුම්රියෙන් ගමන් කරමු.
tree	ගස	ගස උසය.
trip	ගමන; සංචාරය	ගමන හෙට ආරම්භ වේ.
trousers	කලිසම	මගේ කලිසම කළුය.
true	සත්‍ය; නිවැරදි	මෙම කතාව සත්‍යය.
try	උත්සාහ කරන්න; අත්හදා බලන්න	මෙම තේ රස බලන්න.
T-shirt	ටීෂර්ට්	මම ටීෂර්ට් එකක් අඳිමි.
Tuesday	අඟහරුවාදා	අපි අඟහරුවාදා හමුවෙමු.
turn	හැරෙන්න; වාරය	මෙහි වමට හැරෙන්න.
TV	රූපවාහිනිය	රූපවාහිනියේ ශබ්දය ඉහළය.
twelve	දොළහ	මා ළඟ පැන්සල් දොළහක් ඇත.
twenty	විස්ස	සිසුන් විස්සක් මෙහි සිටිති.
twice	දෙවරක්	මම සතියකට දෙවරක් පිහිනමි.
two	දෙක	මිනිසුන් දෙදෙනෙක් බලා සිටිති.
type	වර්ගය; ටයිප් කරන්න	ඔබට කුමන සංගීත වර්ගයක් අවශ්‍යද?
umbrella	කුඩය	කුඩය ගන්න.
uncle	මාමා; බාප්පා	මගේ මාමා කරුණාවන්තය.
under	යට	බෑගය මේසය යට ඇත.
understand	තේරුම් ගන්න	මට ප්‍රශ්නය තේරෙයි.
university	විශ්වවිද්‍යාලය	විශ්වවිද්‍යාලය ළඟය.
until	දක්වා	පහවන තුරු බලා සිටින්න.
up	ඉහළට; නැඟිටින්න	දැන් නැඟිටින්න.
upstairs	ඉහළ මහලේ	මගේ කාමරය ඉහළ මහලේය.
us	අපට; අපිව	කරුණාකර අපට උදව් කරන්න.
use	භාවිතා කරන්න; භාවිතය	මෙම පෑන භාවිතා කරන්න.
useful	ප්‍රයෝජනවත්	මෙම කාඩ්පත ප්‍රයෝජනවත්ය.
usually	සාමාන්‍යයෙන්	මම සාමාන්‍යයෙන් නිවසට ඇවිදිමි.
vacation	නිවාඩුව	අපේ නිවාඩුව හෙට ආරම්භ වේ.
vegetable	එළවළුව	කැරට් එළවළුවකි.
very	ඉතා	කාමරය ඉතා නිහඬය.
video	වීඩියෝව	මෙම වීඩියෝව බලන්න.
village	ගම	ගම කුඩාය.
visit	බැලීමට යන්න; සංචාරය කරන්න	අපි නැන්දාගේ නිවසට යමු.
visitor	අමුත්තා	අමුත්තා පිටත බලා සිටියි.
wait	බලා සිටින්න	කරුණාකර මෙහි බලා සිටින්න.
waiter	වේටර්	වේටර් තේ ගෙන එයි.
wake	අවදි වෙන්න; අවදි කරන්න	මම උදේම අවදි වෙමි.
walk	ඇවිදින්න	අපි පාසලට ඇවිදිමු.
wall	බිත්තිය	බිත්තිය සුදුය.
want	අවශ්‍ය වෙන්න; කැමති වෙන්න	මට වතුර අවශ්‍යය.
warm	උණුසුම්	කාමරය උණුසුම්ය.
wash	සේදන්න	ඔබේ අත් සේදන්න.
watch	බලන්න; අත් ඔරලෝසුව	මම රූපවාහිනිය බලමි.
water	වතුර; ජලය දමන්න	වතුර ටිකක් බොන්න.
way	මාර්ගය; ක්‍රමය	මෙම මාර්ගය කෙටිය.
we	අපි	අපි ඉංග්‍රීසිය ඉගෙන ගනිමු.
wear	අඳින්න	මම කබායක් අඳිමි.
weather	කාලගුණය	කාලගුණය සීතලය.
website	වෙබ්අඩවිය	මෙම වෙබ්අඩවිය ප්‍රයෝජනවත්ය.
Wednesday	බදාදා	පන්තිය බදාදා ආරම්භ වේ.
week	සතිය	මෙම සතිය කාර්යබහුලය.
weekend	සතිඅන්තය	සතිඅන්තය හෙට ආරම්භ වේ.
welcome	පිළිගැනීම; පිළිගන්න	අපේ පන්තියට සාදරයෙන් පිළිගනිමු.
well	හොඳින්	ඇය හොඳින් ගායනා කරයි.
west	බටහිර	ඉර බටහිරින් බසී.
what	කුමක්ද	එහි කුමක් ඇතද?
when	කවදාද	ඔබ කවදා පාඩම් කරනවාද?
where	කොහේද	දුම්රිය ස්ථානය කොහේද?
which	කුමන; කොයි	කුමන බෑගය ඔබගේද?
white	සුදු	බිත්තිය සුදුය.
who	කවුද	එහි කවුද සිටින්නේ?
why	ඇයි	ඔබ ඇයි ප්‍රමාදද?
wife	බිරිඳ	ඔහුගේ බිරිඳ ගුරුවරියකි.
will modal	කරනු ඇත	මම ඔබට උදව් කරනු ඇත.
win	ජය ගන්න	අපේ කණ්ඩායම ජය ගත හැක.
window	ජනේලය	ජනේලය විවෘත කරන්න.
wine	වයින්	මෙම වයින් රතුය.
winter	ශීතකාලය	මෙහි ශීතකාලය සීතලය.
with	සමඟ	මා සමඟ එන්න.
without	නැතිව	සීනි නැතිව තේ හොඳය.
woman	කාන්තාව	කාන්තාව පොතක් කියවයි.
wonderful	අපූරු; විශිෂ්ට	දර්ශනය අපූරුය.
word	වචනය	වචනයක් ලියන්න.
work	වැඩ කරන්න; වැඩ	මම නිවසේ වැඩ කරමි.
worker	කම්කරුවා; සේවකයා	සේවකයා කාර්යබහුලය.
world	ලෝකය	ලෝකය විශාලය.
would modal	කරනු ඇත; කැමතියි	මම තේට කැමතියි.
write	ලියන්න	ඔබේ නම ලියන්න.
writer	ලේඛකයා; ලේඛිකාව	ලේඛකයා මෙහි ජීවත් වේ.
writing	ලේඛනය; අත්අකුරු	ඇගේ අත්අකුරු පැහැදිලිය.
wrong	වැරදි	මෙම පිළිතුර වැරදිය.
yeah	ඔව්	ඔව්, මට එන්න පුළුවන්.
year	වර්ෂය; අවුරුද්ද	මෙම වර්ෂය හොඳය.
yellow	කහ	කෙසෙල් කහය.
yes	ඔව්	ඔව්, මට තේරෙනවා.
yesterday	ඊයේ	මම ඊයේ දුරකථනයෙන් කතා කළෙමි.
you	ඔබ	ඔබ මගේ මිතුරාය.
young	තරුණ; කුඩා	ළමයා කුඩාය.
your	ඔබගේ	ඔබගේ බෑගය මෙහි ඇත.
yourself	ඔබම	ඔබම තේ ගන්න.`;

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
  const lines = SI_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tSI\texample_SI") {
    throw new Error("Unexpected SI translation TSV header");
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} SI translation rows, found ${lines.length}`);
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad SI translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad SI translation row ${index + 2}: empty field`);
    }
    if (!SINHALA_RE.test(display) || !SINHALA_RE.test(example)) {
      throw new Error(`Bad SI translation row ${index + 2}: display/example must contain Sinhala text`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Bad SI translation row ${index + 2}: display/example contains Latin fallback text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad SI translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad SI example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate SI translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing SI translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`SI translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_si_v1",
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
    SI: translation.display,
    example_SI: translation.example,
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
    "Generate the next support-language batch in language order: TA.",
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
if (exampleRows.length !== RELEASE_ENTRY_COUNT) {
  throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 004 rows, found ${exampleRows.length}`);
}
const releaseId = exampleRows[0].release_id;
if (releaseId !== RELEASE_ID) {
  throw new Error(`Unexpected release_id: ${releaseId}`);
}
const translations = parseTranslations();
validateTranslationMap(exampleRows, translations);

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
    "- Article display: false; Sinhala uses normal Sinhala-script citation/base forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: SI Sinhala display/example cells, sentence punctuation, no Latin fallback and no unexpected-script leakage",
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
      next_language: "TA",
    },
    null,
    2
  )
);
