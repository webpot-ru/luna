#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_004_147_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_km_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_km_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-km.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "KM";
const BATCH_ID = "km_v1";
const RELEASE_ENTRY_COUNT = 147;
const SENTENCE_END_RE = /[.!?។]$/u;
const KHMER_RE = /\p{Script=Khmer}/u;
const LATIN_RE = /[A-Za-z]/u;
const KHMER_TOKEN_SPACE_RE = /\p{Script=Khmer}\s+\p{Script=Khmer}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const KM_TRANSLATIONS_TSV = `source_headword	KM	example_KM
take	យក;នាំយក	យកសំបុត្រនេះ។
talk	និយាយ;ការសន្ទនា	យើងនិយាយបន្ទាប់ពីថ្នាក់។
tall	ខ្ពស់	គ្រូរបស់ខ្ញុំខ្ពស់។
taxi	តាក់ស៊ី	តាក់ស៊ីនៅខាងក្រៅ។
tea	តែ	តែនេះក្តៅ។
teach	បង្រៀន	ខ្ញុំបង្រៀនភាសាអង់គ្លេស។
teacher	គ្រូ;អ្នកបង្រៀន	គ្រូញញឹម។
team	ក្រុម;ក្រុមកីឡា	ក្រុមរបស់យើងឈ្នះថ្ងៃនេះ។
teenager	ក្មេងជំទង់	ក្មេងជំទង់អានសៀវភៅ។
telephone	ទូរស័ព្ទ;ទូរស័ព្ទទៅ	ទូរស័ព្ទនៅលើតុ។
television	ទូរទស្សន៍	ទូរទស្សន៍ថ្មី។
tell	ប្រាប់	ប្រាប់ឈ្មោះអ្នកមកខ្ញុំ។
ten	ដប់	ខ្ញុំមានសៀវភៅដប់ក្បាល។
tennis	តេនីស	ថ្ងៃនេះយើងលេងតេនីស។
terrible	អាក្រក់ណាស់;គួរឱ្យខ្លាច	អាកាសធាតុអាក្រក់ណាស់។
test	ការប្រឡង;តេស្ត	ការប្រឡងចាប់ផ្តើមឥឡូវនេះ។
text	សារ;អត្ថបទ	ផ្ញើសារខ្លីមួយ។
than	ជាង	ដប់ច្រើនជាងពីរ។
thank	អរគុណ;ថ្លែងអំណរគុណ	អរគុណគ្រូរបស់អ្នក។
thanks	អរគុណ	អរគុណចំពោះជំនួយ។
that	នោះ	សៀវភៅនោះជារបស់ខ្ញុំ។
the	ពាក្យកំណត់នាម	តែក្តៅ។
theatre	រោងល្ខោន	រោងល្ខោននៅជិតស្ថានីយ។
their	របស់ពួកគេ	ផ្ទះរបស់ពួកគេធំ។
them	ពួកគេ	ខ្ញុំស្គាល់ពួកគេ។
then	បន្ទាប់មក;ពេលនោះ	ញ៉ាំរួចបន្ទាប់មករៀន។
there	នៅទីនោះ	មានកៅអីមួយនៅទីនោះ។
they	ពួកគេ	ពួកគេនៅសាលា។
thing	របស់;វត្ថុ	របស់នេះមានប្រយោជន៍។
think	គិត	ខ្ញុំគិតអំពីផ្ទះ។
third	ទីបី;មួយភាគបី	នេះជាមេរៀនទីបី។
thirsty	ស្រេកទឹក	ខ្ញុំស្រេកទឹក។
thirteen	ដប់បី	គាត់អាយុដប់បីឆ្នាំ។
thirty	សាមសិប	បងស្រីខ្ញុំអាយុសាមសិបឆ្នាំ។
this	នេះ	សំបុត្រនេះថ្មី។
thousand	មួយពាន់	មនុស្សមួយពាន់នាក់មកដល់។
three	បី	ខ្ញុំឃើញបក្សីបីក្បាល។
through	ឆ្លងកាត់;តាម	យើងដើរឆ្លងកាត់ឧទ្យាន។
Thursday	ថ្ងៃព្រហស្បតិ៍	យើងជួបគ្នាថ្ងៃព្រហស្បតិ៍។
ticket	សំបុត្រ	ខ្ញុំត្រូវការសំបុត្រ។
time	ពេលវេលា;ម៉ោង	ឥឡូវនេះម៉ោងប៉ុន្មាន?
tired	នឿយហត់	ខ្ញុំនឿយហត់។
title	ចំណងជើង	អានចំណងជើង។
to	ទៅ;ដល់;សម្រាប់	ខ្ញុំទៅថ្នាក់រៀន។
today	ថ្ងៃនេះ	ថ្ងៃនេះមានថ្ងៃរះ។
together	ជាមួយគ្នា	យើងញ៉ាំជាមួយគ្នា។
toilet	បង្គន់	បង្គន់ស្អាត។
tomato	ប៉េងប៉ោះ	ប៉េងប៉ោះនេះក្រហម។
tomorrow	ថ្ងៃស្អែក	ជួបគ្នាថ្ងៃស្អែក។
tonight	យប់នេះ	យើងរៀនយប់នេះ។
too	ផងដែរ;ពេក	ខ្ញុំក៏ចង់បានតែដែរ។
tooth	ធ្មេញ	ធ្មេញរបស់ខ្ញុំឈឺ។
topic	ប្រធានបទ	ជ្រើសរើសប្រធានបទ។
tourist	ភ្ញៀវទេសចរ	ភ្ញៀវទេសចរថតរូប។
town	ក្រុងតូច;ទីក្រុង	ក្រុងតូចនេះស្ងាត់។
traffic	ចរាចរណ៍	ចរាចរណ៍យឺត។
train	រថភ្លើង	រថភ្លើងយឺត។
travel	ធ្វើដំណើរ;ការធ្វើដំណើរ	យើងធ្វើដំណើរដោយរថភ្លើង។
tree	ដើមឈើ	ដើមឈើខ្ពស់។
trip	ដំណើរកម្សាន្ត;ដំណើរ	ដំណើរកម្សាន្តចាប់ផ្តើមថ្ងៃស្អែក។
trousers	ខោវែង	ខោវែងរបស់ខ្ញុំពណ៌ខ្មៅ។
true	ពិត;ត្រឹមត្រូវ	រឿងនេះពិត។
try	ព្យាយាម;សាកល្បង	សាកល្បងតែនេះ។
T-shirt	អាវយឺត	ខ្ញុំពាក់អាវយឺត។
Tuesday	ថ្ងៃអង្គារ	យើងជួបគ្នាថ្ងៃអង្គារ។
turn	បត់;វេន	បត់ឆ្វេងនៅទីនេះ។
TV	ទូរទស្សន៍	ទូរទស្សន៍ឮខ្លាំង។
twelve	ដប់ពីរ	ខ្ញុំមានខ្មៅដៃដប់ពីរដើម។
twenty	ម្ភៃ	សិស្សម្ភៃនាក់នៅទីនេះ។
twice	ពីរដង	ខ្ញុំហែលទឹកពីរដងក្នុងមួយសប្តាហ៍។
two	ពីរ	មនុស្សពីរនាក់កំពុងរង់ចាំ។
type	ប្រភេទ;វាយអក្សរ	អ្នកចង់បានតន្ត្រីប្រភេទណា?
umbrella	ឆ័ត្រ	យកឆ័ត្រ។
uncle	ពូ;មា;អ៊ំប្រុស	ពូរបស់ខ្ញុំចិត្តល្អ។
under	ក្រោម	កាបូបនៅក្រោមតុ។
understand	យល់	ខ្ញុំយល់សំណួរ។
university	សាកលវិទ្យាល័យ	សាកលវិទ្យាល័យនៅជិត។
until	រហូតដល់	រង់ចាំរហូតដល់ម៉ោងប្រាំ។
up	ឡើង;ខាងលើ	ឥឡូវនេះក្រោកឡើង។
upstairs	ជាន់លើ	បន្ទប់ខ្ញុំនៅជាន់លើ។
us	ពួកយើង;យើង	សូមជួយពួកយើង។
use	ប្រើ;ការប្រើប្រាស់	ប្រើប៊ិចនេះ។
useful	មានប្រយោជន៍	កាតនេះមានប្រយោជន៍។
usually	ជាធម្មតា	ជាធម្មតាខ្ញុំដើរទៅផ្ទះ។
vacation	វិស្សមកាល	វិស្សមកាលរបស់យើងចាប់ផ្តើមថ្ងៃស្អែក។
vegetable	បន្លែ	ការ៉ុតជាបន្លែ។
very	ខ្លាំងណាស់	បន្ទប់ស្ងាត់ខ្លាំងណាស់។
video	វីដេអូ	មើលវីដេអូនេះ។
village	ភូមិ	ភូមិតូច។
visit	ទៅលេង;ទស្សនា	យើងទៅលេងផ្ទះមីង។
visitor	ភ្ញៀវ	ភ្ញៀវរង់ចាំខាងក្រៅ។
wait	រង់ចាំ	សូមរង់ចាំនៅទីនេះ។
waiter	អ្នករត់តុ	អ្នករត់តុនាំតែមក។
wake	ភ្ញាក់;ដាស់	ខ្ញុំភ្ញាក់ពីព្រលឹម។
walk	ដើរ	យើងដើរទៅសាលា។
wall	ជញ្ជាំង	ជញ្ជាំងមានពណ៌ស។
want	ចង់បាន;ចង់	ខ្ញុំចង់បានទឹក។
warm	កក់ក្តៅ	បន្ទប់កក់ក្តៅ។
wash	លាង	លាងដៃរបស់អ្នក។
watch	មើល;នាឡិកាដៃ	ខ្ញុំមើលទូរទស្សន៍។
water	ទឹក;ស្រោចទឹក	ផឹកទឹកបន្តិច។
way	ផ្លូវ;វិធី	ផ្លូវនេះខ្លី។
we	យើង	យើងរៀនភាសាអង់គ្លេស។
wear	ពាក់	ខ្ញុំពាក់អាវធំ។
weather	អាកាសធាតុ	អាកាសធាតុត្រជាក់។
website	គេហទំព័រ	គេហទំព័រនេះមានប្រយោជន៍។
Wednesday	ថ្ងៃពុធ	ថ្នាក់ចាប់ផ្តើមថ្ងៃពុធ។
week	សប្តាហ៍	សប្តាហ៍នេះរវល់។
weekend	ចុងសប្តាហ៍	ចុងសប្តាហ៍ចាប់ផ្តើមថ្ងៃស្អែក។
welcome	ស្វាគមន៍	ស្វាគមន៍មកកាន់ថ្នាក់របស់យើង។
well	យ៉ាងល្អ	នាងច្រៀងយ៉ាងល្អ។
west	ខាងលិច	ព្រះអាទិត្យលិចនៅខាងលិច។
what	អ្វី	មានអ្វីនៅទីនោះ?
when	ពេលណា	អ្នករៀនពេលណា?
where	នៅឯណា	ស្ថានីយនៅឯណា?
which	មួយណា	កាបូបមួយណាជារបស់អ្នក?
white	ពណ៌ស	ជញ្ជាំងមានពណ៌ស។
who	អ្នកណា	អ្នកណានៅទីនោះ?
why	ហេតុអ្វី	ហេតុអ្វីអ្នកមកយឺត?
wife	ប្រពន្ធ;ភរិយា	ប្រពន្ធរបស់គាត់ជាគ្រូ។
will modal	នឹង	ខ្ញុំនឹងជួយអ្នក។
win	ឈ្នះ	ក្រុមរបស់យើងអាចឈ្នះ។
window	បង្អួច	បើកបង្អួច។
wine	ស្រា	ស្រានេះពណ៌ក្រហម។
winter	រដូវរងា	រដូវរងានៅទីនេះត្រជាក់។
with	ជាមួយ	មកជាមួយខ្ញុំ។
without	ដោយគ្មាន	តែដោយគ្មានស្ករល្អ។
woman	ស្ត្រី;នារី	ស្ត្រីអានសៀវភៅ។
wonderful	អស្ចារ្យ	ទេសភាពអស្ចារ្យ។
word	ពាក្យ	សរសេរពាក្យមួយ។
work	ធ្វើការ;ការងារ	ខ្ញុំធ្វើការនៅផ្ទះ។
worker	កម្មករ;បុគ្គលិក	បុគ្គលិករវល់។
world	ពិភពលោក	ពិភពលោកធំ។
would modal	នឹង;ចង់	ខ្ញុំចង់បានតែ។
write	សរសេរ	សរសេរឈ្មោះរបស់អ្នក។
writer	អ្នកនិពន្ធ	អ្នកនិពន្ធរស់នៅទីនេះ។
writing	ការសរសេរ;អក្សរ	អក្សររបស់នាងច្បាស់។
wrong	ខុស	ចម្លើយនេះខុស។
yeah	បាទ;ចាស	បាទខ្ញុំអាចមកបាន។
year	ឆ្នាំ	ឆ្នាំនេះល្អ។
yellow	ពណ៌លឿង	ចេកមានពណ៌លឿង។
yes	បាទ;ចាស	បាទខ្ញុំយល់។
yesterday	ម្សិលមិញ	ខ្ញុំទូរស័ព្ទម្សិលមិញ។
you	អ្នក	អ្នកជាមិត្តរបស់ខ្ញុំ។
young	ក្មេង;វ័យក្មេង	កុមារនៅក្មេង។
your	របស់អ្នក	កាបូបរបស់អ្នកនៅទីនេះ។
yourself	ខ្លួនឯង	យកតែដោយខ្លួនឯង។`;

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
  const lines = KM_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tKM\texample_KM") {
    throw new Error("Unexpected KM translation TSV header");
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} KM translation rows, found ${lines.length}`);
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad KM translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad KM translation row ${index + 2}: empty field`);
    }
    if (!KHMER_RE.test(display) || !KHMER_RE.test(example)) {
      throw new Error(`Bad KM translation row ${index + 2}: display/example must contain Khmer text`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Bad KM translation row ${index + 2}: display/example contains Latin fallback text`);
    }
    if (KHMER_TOKEN_SPACE_RE.test(example)) {
      throw new Error(`Bad KM example row ${index + 2}: generated Khmer token spaces are not allowed`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad KM translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad KM example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate KM translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing KM translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`KM translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_km_v1",
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
    KM: translation.display,
    example_KM: translation.example,
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
    "Generate the next support-language batch in language order: LO.",
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
    "- Article display: false; Khmer uses normal Khmer-script citation/base forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: KM Khmer-script display/example cells, sentence punctuation, no Latin fallback, no generated Khmer token spaces and no unexpected-script leakage",
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
      next_language: "LO",
    },
    null,
    2
  )
);
