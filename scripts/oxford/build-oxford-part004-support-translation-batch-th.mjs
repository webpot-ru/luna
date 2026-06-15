#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "TH";
const BATCH_ID = "th_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-th.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const THAI_RE = /[\u0E00-\u0E7F]/u;
const THAI_TOKENIZATION_SPACE_RE = /[\u0E00-\u0E7F]\s+[\u0E00-\u0E7F]/u;

const TH_TRANSLATIONS_TSV = `source_headword	TH	example_TH
take	เอา;รับ	เอาตั๋วนี้ไป.
talk	คุย;พูด	เราคุยหลังเรียน.
tall	สูง	ครูของฉันสูง.
taxi	แท็กซี่	แท็กซี่อยู่ข้างนอก.
tea	ชา	ชานี้ร้อน.
teach	สอน	ฉันสอนภาษาอังกฤษ.
teacher	ครู	ครูยิ้ม.
team	ทีม;กลุ่ม	ทีมของเราชนะวันนี้.
teenager	วัยรุ่น	วัยรุ่นคนนั้นอ่านหนังสือ.
telephone	โทรศัพท์;โทร	โทรศัพท์อยู่บนโต๊ะ.
television	โทรทัศน์;ทีวี	โทรทัศน์เครื่องนี้ใหม่.
tell	บอก;เล่า	บอกชื่อของคุณ.
ten	สิบ	ฉันมีหนังสือสิบเล่ม.
tennis	เทนนิส	วันนี้เราเล่นเทนนิส.
terrible	แย่;น่ากลัว	อากาศแย่มาก.
test	การทดสอบ;ข้อสอบ	ข้อสอบเริ่มตอนนี้.
text	ข้อความ;ส่งข้อความ	ส่งข้อความสั้นหนึ่งข้อความ.
than	กว่า	สิบมากกว่าสอง.
thank	ขอบคุณ	ขอบคุณครูของคุณ.
thanks	ขอบคุณ	ขอบคุณที่ช่วย.
that	นั้น;สิ่งนั้น	หนังสือนั้นเป็นของฉัน.
the	คำนำหน้านามชี้เฉพาะภาษาอังกฤษ	คำนี้เป็นคำนำหน้านาม.
theatre	โรงละคร	โรงละครอยู่ใกล้สถานี.
their	ของพวกเขา	บ้านของพวกเขาใหญ่.
them	พวกเขา;พวกเขานั้น	ฉันรู้จักพวกเขา.
then	แล้ว;จากนั้น	กินแล้วเรียน.
there	ที่นั่น;มี	มีเก้าอี้อยู่ที่นั่น.
they	พวกเขา	พวกเขาอยู่ที่โรงเรียน.
thing	สิ่งของ;เรื่อง	สิ่งของนี้มีประโยชน์.
think	คิด	ฉันคิดถึงบ้าน.
third	ที่สาม;หนึ่งในสาม	นี่คือบทเรียนที่สาม.
thirsty	กระหายน้ำ	ฉันกระหายน้ำ.
thirteen	สิบสาม	เธออายุสิบสามปี.
thirty	สามสิบ	พี่สาวของฉันอายุสามสิบปี.
this	นี้;สิ่งนี้	ตั๋วนี้ใหม่.
thousand	หนึ่งพัน	มีคนหนึ่งพันคนมา.
three	สาม	ฉันเห็นนกสามตัว.
through	ผ่าน	เราเดินผ่านสวน.
Thursday	วันพฤหัสบดี	เจอกันวันพฤหัสบดี.
ticket	ตั๋ว	ฉันต้องการตั๋ว.
time	เวลา;กี่โมง	ตอนนี้กี่โมง?
tired	เหนื่อย	ฉันเหนื่อย.
title	ชื่อเรื่อง	อ่านชื่อเรื่อง.
to	ถึง;ไปยัง;เพื่อ	ฉันไปชั้นเรียน.
today	วันนี้	วันนี้แดดออก.
together	ด้วยกัน	เรากินด้วยกัน.
toilet	ห้องน้ำ	ห้องน้ำสะอาด.
tomato	มะเขือเทศ	มะเขือเทศนี้สีแดง.
tomorrow	พรุ่งนี้	เจอกันพรุ่งนี้.
tonight	คืนนี้	เราเรียนคืนนี้.
too	ด้วย;เกินไป	ฉันก็อยากดื่มชา.
tooth	ฟัน	ฟันของฉันเจ็บ.
topic	หัวข้อ	เลือกหัวข้อหนึ่ง.
tourist	นักท่องเที่ยว	นักท่องเที่ยวถ่ายรูป.
town	เมือง;เมืองเล็ก	เมืองนี้เงียบ.
traffic	การจราจร	การจราจรช้า.
train	รถไฟ;ฝึก	รถไฟมาช้า.
travel	เดินทาง;ท่องเที่ยว	เราเดินทางโดยรถไฟ.
tree	ต้นไม้	ต้นไม้นั้นสูง.
trip	การเดินทาง	การเดินทางเริ่มพรุ่งนี้.
trousers	กางเกงขายาว	กางเกงของฉันสีดำ.
true	จริง;ถูก	เรื่องนั้นจริง.
try	ลอง	ลองชานี้.
T-shirt	เสื้อยืด	ฉันใส่เสื้อยืด.
Tuesday	วันอังคาร	เจอกันวันอังคาร.
turn	เลี้ยว;รอบ	เลี้ยวซ้ายตรงนี้.
TV	ทีวี	เสียงทีวีดัง.
twelve	สิบสอง	ฉันมีปากกาสิบสองด้าม.
twenty	ยี่สิบ	มีนักเรียนยี่สิบคนที่นี่.
twice	สองครั้ง	ฉันว่ายน้ำสัปดาห์ละสองครั้ง.
two	สอง	มีคนสองคนรออยู่.
type	ชนิด;ประเภท	คุณชอบเพลงประเภทไหน?
umbrella	ร่ม	เอาร่มไปด้วย.
uncle	ลุง;น้า;อา	ลุงของฉันใจดี.
under	ใต้	กระเป๋าอยู่ใต้โต๊ะ.
understand	เข้าใจ	ฉันเข้าใจคำถาม.
university	มหาวิทยาลัย	มหาวิทยาลัยอยู่ใกล้.
until	จนถึง	รอจนถึงห้าโมง.
up	ขึ้น;ลุกขึ้น	ลุกขึ้นตอนนี้.
upstairs	ชั้นบน	ห้องของฉันอยู่ชั้นบน.
us	เรา;พวกเรา	ช่วยพวกเราด้วย.
use	ใช้	ใช้ปากกานี้.
useful	มีประโยชน์	แผนที่นี้มีประโยชน์.
usually	โดยปกติ;มักจะ	ฉันมักเดินกลับบ้าน.
vacation	วันหยุด;การพักร้อน	วันหยุดของเราเริ่มพรุ่งนี้.
vegetable	ผัก	แครอตเป็นผัก.
very	มาก	ห้องเงียบมาก.
video	วิดีโอ	ดูวิดีโอนี้.
village	หมู่บ้าน	หมู่บ้านนั้นเล็ก.
visit	เยี่ยม;ไปเที่ยว	เราไปเยี่ยมป้า.
visitor	ผู้มาเยือน;แขก	แขกรออยู่ข้างนอก.
wait	รอ	รอที่นี่.
waiter	พนักงานเสิร์ฟชาย	พนักงานเสิร์ฟนำชามา.
wake	ตื่น;ปลุก	ฉันตื่นเช้า.
walk	เดิน;การเดิน	เราเดินไปโรงเรียน.
wall	กำแพง;ผนัง	ผนังสีขาว.
want	ต้องการ	ฉันต้องการน้ำ.
warm	อุ่น;ทำให้อุ่น	ห้องนี้อุ่น.
wash	ล้าง;ซัก	ล้างมือของคุณ.
watch	ดู;นาฬิกา	ฉันดูทีวี.
water	น้ำ;รดน้ำ	ดื่มน้ำเล็กน้อย.
way	ทาง;วิธี	ทางนี้สั้น.
we	เรา	เราเรียนภาษาอังกฤษ.
wear	ใส่;สวม	ฉันใส่แจ็กเก็ต.
weather	อากาศ;สภาพอากาศ	อากาศหนาว.
website	เว็บไซต์	เว็บไซต์นี้มีประโยชน์.
Wednesday	วันพุธ	ชั้นเรียนเริ่มวันพุธ.
week	สัปดาห์	สัปดาห์นี้ยุ่ง.
weekend	สุดสัปดาห์	สุดสัปดาห์เริ่มพรุ่งนี้.
welcome	ยินดีต้อนรับ	ยินดีต้อนรับสู่ชั้นเรียนของเรา.
well	ดี;เก่ง	เธอร้องเพลงได้ดี.
west	ทิศตะวันตก	ดวงอาทิตย์ตกทางตะวันตก.
what	อะไร	นั่นคืออะไร?
when	เมื่อไร	คุณเรียนเมื่อไร?
where	ที่ไหน	สถานีอยู่ที่ไหน?
which	อันไหน;ไหน	กระเป๋าใบไหนเป็นของคุณ?
white	สีขาว;ขาว	ผนังสีขาว.
who	ใคร	นั่นคือใคร?
why	ทำไม	ทำไมคุณมาสาย?
wife	ภรรยา	ภรรยาของเขาเป็นครู.
will modal	จะ	ฉันจะช่วยคุณ.
win	ชนะ	ทีมของเราชนะได้.
window	หน้าต่าง	เปิดหน้าต่าง.
wine	ไวน์	ไวน์นี้สีแดง.
winter	ฤดูหนาว	ฤดูหนาวที่นี่หนาว.
with	กับ;ด้วย	มากับฉัน.
without	ไม่มี;โดยไม่มี	ชาไม่ใส่น้ำตาลก็ได้.
woman	ผู้หญิง	ผู้หญิงคนนั้นอ่านหนังสือ.
wonderful	ยอดเยี่ยม	วิวนี้ยอดเยี่ยม.
word	คำ	เขียนคำหนึ่งคำ.
work	ทำงาน;งาน	ฉันทำงานที่บ้าน.
worker	คนงาน	คนงานคนนั้นยุ่ง.
world	โลก	โลกใหญ่.
would modal	อยาก;จะ	ฉันอยากดื่มชา.
write	เขียน	เขียนชื่อของคุณ.
writer	นักเขียน	นักเขียนอยู่ที่นี่.
writing	การเขียน;ลายมือ	ลายมือของเธอชัด.
wrong	ผิด	คำตอบนี้ผิด.
yeah	ใช่;อืม	ใช่ฉันมาได้.
year	ปี	ปีนี้ดี.
yellow	สีเหลือง	กล้วยสีเหลือง.
yes	ใช่	ใช่ฉันเข้าใจ.
yesterday	เมื่อวาน	ฉันโทรเมื่อวาน.
you	คุณ;พวกคุณ	คุณเป็นเพื่อนของฉัน.
young	เด็ก;หนุ่มสาว	เด็กคนนั้นยังเล็ก.
your	ของคุณ	กระเป๋าของคุณอยู่ที่นี่.
yourself	ตัวคุณเอง	เอาชาเองนะ.`;

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
  const lines = TH_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tTH\texample_TH") {
    throw new Error("Unexpected TH translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad TH translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad TH translation row ${index + 2}: empty field`);
    }
    if (!THAI_RE.test(display) || !THAI_RE.test(example)) {
      throw new Error(`Bad TH translation row ${index + 2}: display/example must contain Thai script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad TH example punctuation for ${sourceHeadword}`);
    }
    if (THAI_TOKENIZATION_SPACE_RE.test(example)) {
      throw new Error(`Bad TH example tokenization spaces for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate TH translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing TH translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`TH translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_th_v1",
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
    TH: translation.display,
    example_TH: translation.example,
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
    "Generate the next support-language batch in language order: MS.",
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
    "- Article display: not applicable for Thai",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: TH Thai-script display/example cells and no generated Thai tokenization spaces in examples",
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
