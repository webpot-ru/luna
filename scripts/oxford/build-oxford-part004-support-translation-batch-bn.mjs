#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "BN";
const BATCH_ID = "bn_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-bn.mjs";
const SENTENCE_END_RE = /[.!?।]$/u;
const BENGALI_RE = /\p{Script=Bengali}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u0963\u0966-\u097F\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const BN_TRANSLATIONS_TSV = `source_headword	BN	example_BN
take	নেওয়া; সঙ্গে নেওয়া	টিকিটটা নাও।
talk	কথা বলা; আলাপ	আমরা ক্লাসের পরে কথা বলি।
tall	লম্বা	আমার শিক্ষক লম্বা।
taxi	ট্যাক্সি	ট্যাক্সি বাইরে আছে।
tea	চা	এই চা গরম।
teach	পড়ানো; শেখানো	আমি ইংরেজি পড়াই।
teacher	শিক্ষক; শিক্ষিকা	শিক্ষিকা হাসেন।
team	দল; টিম	আমাদের দল আজ জেতে।
teenager	কিশোর; কিশোরী	কিশোরটি বই পড়ে।
telephone	টেলিফোন; ফোন করা	ফোনটি টেবিলে আছে।
television	টেলিভিশন; টিভি	টেলিভিশনটি নতুন।
tell	বলা; জানানো	আমাকে তোমার নাম বলো।
ten	দশ	আমার দশটি বই আছে।
tennis	টেনিস	আজ আমরা টেনিস খেলি।
terrible	ভয়ানক	আবহাওয়া ভয়ানক।
test	পরীক্ষা; টেস্ট	পরীক্ষা এখন শুরু হয়।
text	বার্তা; পাঠ	ছোট বার্তা পাঠাও।
than	চেয়ে	দশ দুইয়ের চেয়ে বেশি।
thank	ধন্যবাদ দেওয়া	তোমার শিক্ষককে ধন্যবাদ দাও।
thanks	ধন্যবাদ	সাহায্যের জন্য ধন্যবাদ।
that	ওই; সেটা	ওই বইটি আমার।
the	ইংরেজি নির্দিষ্ট আর্টিকেল	চা গরম।
theatre	নাট্যমঞ্চ; থিয়েটার	থিয়েটারটি স্টেশনের কাছে।
their	তাদের	তাদের বাড়ি বড়।
them	তাদের; তাদেরকে	আমি তাদের চিনি।
then	তারপর; তখন	খাও, তারপর পড়ো।
there	সেখানে; আছে	সেখানে একটি চেয়ার আছে।
they	তারা	তারা স্কুলে আছে।
thing	জিনিস; বস্তু	এই জিনিসটি দরকারি।
think	ভাবা	আমি বাড়ির কথা ভাবি।
third	তৃতীয়; এক-তৃতীয়াংশ	এটি তৃতীয় পাঠ।
thirsty	পিপাসিত	আমি পিপাসিত।
thirteen	তেরো	সে তেরো বছর বয়সী।
thirty	ত্রিশ	আমার বোন ত্রিশ বছর বয়সী।
this	এই; এটা	এই টিকিটটি নতুন।
thousand	হাজার	হাজার মানুষ এসেছিল।
three	তিন	আমি তিনটি পাখি দেখি।
through	মধ্য দিয়ে; মাধ্যমে	আমরা পার্কের মধ্য দিয়ে হাঁটি।
Thursday	বৃহস্পতিবার	আমরা বৃহস্পতিবার দেখা করি।
ticket	টিকিট	আমার টিকিট দরকার।
time	সময়; বাজে	এখন কয়টা বাজে?
tired	ক্লান্ত	আমি ক্লান্ত।
title	শিরোনাম	শিরোনামটি পড়ো।
to	প্রতি; দিকে; জন্য	আমি ক্লাসে যাই।
today	আজ	আজ রোদ আছে।
together	একসঙ্গে	আমরা একসঙ্গে খাই।
toilet	শৌচাগার; টয়লেট	টয়লেটটি পরিষ্কার।
tomato	টমেটো	এই টমেটো লাল।
tomorrow	আগামীকাল; কাল	কাল দেখা হবে।
tonight	আজ রাতে	আমরা আজ রাতে পড়ি।
too	ও; খুব	আমিও চা চাই।
tooth	দাঁত	আমার দাঁত ব্যথা করছে।
topic	বিষয়	বিষয়টি বেছে নাও।
tourist	পর্যটক	পর্যটক ছবি তোলে।
town	শহর; ছোট শহর	শহরটি শান্ত।
traffic	যানজট; যানবাহন	যানজট ধীর।
train	রেলগাড়ি; ট্রেন	ট্রেন দেরি করছে।
travel	ভ্রমণ করা; ভ্রমণ	আমরা ট্রেনে ভ্রমণ করি।
tree	গাছ	গাছটি লম্বা।
trip	ভ্রমণ; সফর	সফর কাল শুরু হয়।
trousers	প্যান্ট; ট্রাউজার্স	আমার প্যান্ট কালো।
true	সত্য; ঠিক	গল্পটি সত্য।
try	চেষ্টা করা	এই চা চেখে দেখো।
T-shirt	টি-শার্ট	আমি টি-শার্ট পরি।
Tuesday	মঙ্গলবার	আমরা মঙ্গলবার দেখা করি।
turn	ঘোরা; পালা	এখানে বাঁয়ে ঘোরো।
TV	টিভি	টিভির শব্দ বেশি।
twelve	বারো	আমার বারোটি পেন্সিল আছে।
twenty	বিশ	এখানে বিশজন ছাত্র আছে।
twice	দুইবার	আমি সপ্তাহে দুইবার সাঁতার কাটি।
two	দুই	দুইজন লোক অপেক্ষা করছে।
type	ধরন; টাইপ করা	তুমি কোন ধরনের গান চাও?
umbrella	ছাতা	ছাতা নাও।
uncle	চাচা; মামা	আমার চাচা দয়ালু।
under	নিচে	ব্যাগটি টেবিলের নিচে।
understand	বোঝা	আমি প্রশ্নটি বুঝি।
university	বিশ্ববিদ্যালয়	বিশ্ববিদ্যালয়টি কাছে।
until	পর্যন্ত	পাঁচটা পর্যন্ত অপেক্ষা করো।
up	ওপরে; উঠে	এখন উঠে দাঁড়াও।
upstairs	ওপরে; ওপরতলায়	আমার ঘর ওপরতলায়।
us	আমাদের; আমাদেরকে	দয়া করে আমাদের সাহায্য করো।
use	ব্যবহার করা; ব্যবহার	এই কলম ব্যবহার করো।
useful	দরকারি; উপকারী	এই কার্ডটি দরকারি।
usually	সাধারণত	আমি সাধারণত হেঁটে বাড়ি যাই।
vacation	ছুটি	আমাদের ছুটি কাল শুরু হয়।
vegetable	সবজি	গাজর একটি সবজি।
very	খুব	ঘরটি খুব শান্ত।
video	ভিডিও	এই ভিডিও দেখো।
village	গ্রাম	গ্রামটি ছোট।
visit	দেখা করতে যাওয়া; ঘোরা	আমরা খালার বাড়ি যাই।
visitor	দর্শনার্থী; অতিথি	অতিথি বাইরে অপেক্ষা করছেন।
wait	অপেক্ষা করা	দয়া করে এখানে অপেক্ষা করো।
waiter	ওয়েটার	ওয়েটার চা আনে।
wake	জাগা; জাগানো	আমি ভোরে জাগি।
walk	হাঁটা; হাঁটাহাঁটি	আমরা স্কুলে হাঁটি।
wall	দেয়াল	দেয়ালটি সাদা।
want	চাওয়া	আমার পানি চাই।
warm	উষ্ণ; গরম	ঘরটি উষ্ণ।
wash	ধোয়া	তোমার হাত ধোও।
watch	দেখা; ঘড়ি	আমি টিভি দেখি।
water	পানি; জল দেওয়া	একটু পানি খাও।
way	পথ; উপায়	এই পথটি ছোট।
we	আমরা	আমরা ইংরেজি শিখি।
wear	পরা	আমি কোট পরি।
weather	আবহাওয়া	আবহাওয়া ঠান্ডা।
website	ওয়েবসাইট	এই ওয়েবসাইট দরকারি।
Wednesday	বুধবার	ক্লাস বুধবার শুরু হয়।
week	সপ্তাহ	এই সপ্তাহ ব্যস্ত।
weekend	সপ্তাহান্ত	সপ্তাহান্ত কাল শুরু হয়।
welcome	স্বাগতম; স্বাগত জানানো	আমাদের ক্লাসে স্বাগতম।
well	ভালোভাবে	সে ভালোভাবে গান গায়।
west	পশ্চিম	সূর্য পশ্চিমে অস্ত যায়।
what	কী	সেখানে কী আছে?
when	কখন	তুমি কখন পড়ো?
where	কোথায়	স্টেশন কোথায়?
which	কোনটি; কোন	কোন ব্যাগটি তোমার?
white	সাদা	দেয়ালটি সাদা।
who	কে	সেখানে কে আছে?
why	কেন	তুমি দেরি করেছ কেন?
wife	স্ত্রী	তার স্ত্রী শিক্ষিকা।
will modal	করব; হবে	আমি তোমাকে সাহায্য করব।
win	জেতা	আমাদের দল জিততে পারে।
window	জানালা	জানালা খুলে দাও।
wine	ওয়াইন	এই ওয়াইন লাল।
winter	শীতকাল	এখানে শীত ঠান্ডা।
with	সঙ্গে; দিয়ে	আমার সঙ্গে এসো।
without	ছাড়া	চিনি ছাড়া চা ভালো।
woman	নারী; মহিলা	মহিলা বই পড়ছেন।
wonderful	চমৎকার	দৃশ্যটি চমৎকার।
word	শব্দ	একটি শব্দ লেখো।
work	কাজ করা; কাজ	আমি বাড়িতে কাজ করি।
worker	কর্মী; শ্রমিক	কর্মী ব্যস্ত।
world	পৃথিবী; বিশ্ব	পৃথিবী বড়।
would modal	করতাম; চাইতাম	আমি চা চাইতাম।
write	লেখা	তোমার নাম লেখো।
writer	লেখক; লেখিকা	লেখক এখানে থাকেন।
writing	লেখা; হাতের লেখা	তার হাতের লেখা পরিষ্কার।
wrong	ভুল	এই উত্তর ভুল।
yeah	হ্যাঁ	হ্যাঁ, আমি আসতে পারি।
year	বছর	এই বছর ভালো।
yellow	হলুদ	কলা হলুদ।
yes	হ্যাঁ	হ্যাঁ, আমি বুঝি।
yesterday	গতকাল; কাল	আমি গতকাল ফোন করেছি।
you	তুমি; আপনি	তুমি আমার বন্ধু।
young	তরুণ; ছোট	শিশুটি ছোট।
your	তোমার; আপনার	তোমার ব্যাগ এখানে।
yourself	নিজে; নিজেরা	নিজে চা নাও।`;

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
  const lines = BN_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tBN\texample_BN") {
    throw new Error("Unexpected BN translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad BN translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad BN translation row ${index + 2}: empty field`);
    }
    if (!BENGALI_RE.test(display) || !BENGALI_RE.test(example)) {
      throw new Error(`Bad BN translation row ${index + 2}: display/example must contain Bengali text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad BN translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad BN example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate BN translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing BN translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`BN translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_bn_v1",
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
    BN: translation.display,
    example_BN: translation.example,
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
    "Generate the next support-language batch in language order: TL.",
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
    "- Article display: false; Bengali uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: BN Bengali display/example cells and no unexpected script",
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
      next_language: "TL",
    },
    null,
    2
  )
);
