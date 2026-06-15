#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_004_147_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lo_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lo_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-lo.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "LO";
const BATCH_ID = "lo_v1";
const RELEASE_ENTRY_COUNT = 147;
const SENTENCE_END_RE = /[.!?]$/u;
const LAO_RE = /\p{Script=Lao}/u;
const LATIN_RE = /[A-Za-z]/u;
const LAO_TOKEN_SPACE_RE = /\p{Script=Lao}\s+\p{Script=Lao}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LO_TRANSLATIONS_TSV = `source_headword	LO	example_LO
take	ເອົາ;ນຳໄປ	ເອົາປີ້ນີ້.
talk	ເວົ້າ;ການສົນທະນາ	ພວກເຮົາເວົ້າຫຼັງຮຽນ.
tall	ສູງ	ຄູຂອງຂ້ອຍສູງ.
taxi	ແທັກຊີ	ແທັກຊີຢູ່ຂ້າງນອກ.
tea	ຊາ	ຊານີ້ຮ້ອນ.
teach	ສອນ	ຂ້ອຍສອນພາສາອັງກິດ.
teacher	ຄູ;ຜູ້ສອນ	ຄູຍິ້ມ.
team	ທີມ;ກຸ່ມ	ທີມຂອງພວກເຮົາຊະນະມື້ນີ້.
teenager	ໄວລຸ້ນ	ໄວລຸ້ນອ່ານປຶ້ມ.
telephone	ໂທລະສັບ;ໂທຫາ	ໂທລະສັບຢູ່ເທິງໂຕະ.
television	ໂທລະທັດ	ໂທລະທັດໃໝ່.
tell	ບອກ	ບອກຊື່ເຈົ້າໃຫ້ຂ້ອຍ.
ten	ສິບ	ຂ້ອຍມີປຶ້ມສິບຫົວ.
tennis	ເທນນິດ	ມື້ນີ້ພວກເຮົາຫຼິ້ນເທນນິດ.
terrible	ຮ້າຍແຮງ;ແຍ່ຫຼາຍ	ອາກາດແຍ່ຫຼາຍ.
test	ການສອບເສັງ;ການທົດສອບ	ການສອບເສັງເລີ່ມດຽວນີ້.
text	ຂໍ້ຄວາມ;ບົດຄວາມ	ສົ່ງຂໍ້ຄວາມສັ້ນ.
than	ກວ່າ	ສິບຫຼາຍກວ່າສອງ.
thank	ຂອບໃຈ	ຂອບໃຈຄູຂອງເຈົ້າ.
thanks	ຂອບໃຈ	ຂອບໃຈສຳລັບການຊ່ວຍ.
that	ນັ້ນ	ປຶ້ມນັ້ນເປັນຂອງຂ້ອຍ.
the	ຄຳນຳໜ້າຄຳນາມຊີ້ຈຳເພາະ	ຊາຮ້ອນ.
theatre	ໂຮງລະຄອນ	ໂຮງລະຄອນຢູ່ໃກ້ສະຖານີ.
their	ຂອງພວກເຂົາ	ເຮືອນຂອງພວກເຂົາໃຫຍ່.
them	ພວກເຂົາ	ຂ້ອຍຮູ້ຈັກພວກເຂົາ.
then	ແລ້ວ;ຈາກນັ້ນ	ກິນແລ້ວຈາກນັ້ນຮຽນ.
there	ຢູ່ທີ່ນັ້ນ	ມີຕັ່ງໜຶ່ງຢູ່ທີ່ນັ້ນ.
they	ພວກເຂົາ	ພວກເຂົາຢູ່ໂຮງຮຽນ.
thing	ສິ່ງ;ຂອງ	ສິ່ງນີ້ມີປະໂຫຍດ.
think	ຄິດ	ຂ້ອຍຄິດເຖິງເຮືອນ.
third	ທີສາມ;ໜຶ່ງໃນສາມ	ນີ້ແມ່ນບົດຮຽນທີສາມ.
thirsty	ຫິວນ້ຳ	ຂ້ອຍຫິວນ້ຳ.
thirteen	ສິບສາມ	ລາວອາຍຸສິບສາມປີ.
thirty	ສາມສິບ	ເອື້ອຍຂ້ອຍອາຍຸສາມສິບປີ.
this	ນີ້	ປີ້ນີ້ໃໝ່.
thousand	ໜຶ່ງພັນ	ຄົນໜຶ່ງພັນມາຮອດ.
three	ສາມ	ຂ້ອຍເຫັນນົກສາມໂຕ.
through	ຜ່ານ;ທາງ	ພວກເຮົາຍ່າງຜ່ານສວນ.
Thursday	ວັນພະຫັດ	ພວກເຮົາພົບກັນວັນພະຫັດ.
ticket	ປີ້	ຂ້ອຍຕ້ອງການປີ້.
time	ເວລາ;ໂມງ	ດຽວນີ້ຈັກໂມງ?
tired	ເມື່ອຍ	ຂ້ອຍເມື່ອຍ.
title	ຫົວຂໍ້	ອ່ານຫົວຂໍ້.
to	ໄປ;ຫາ;ສຳລັບ	ຂ້ອຍໄປຫ້ອງຮຽນ.
today	ມື້ນີ້	ມື້ນີ້ແດດອອກ.
together	ຮ່ວມກັນ	ພວກເຮົາກິນຮ່ວມກັນ.
toilet	ຫ້ອງນ້ຳ	ຫ້ອງນ້ຳສະອາດ.
tomato	ໝາກເລັ່ນ	ໝາກເລັ່ນນີ້ສີແດງ.
tomorrow	ມື້ອື່ນ	ພົບກັນມື້ອື່ນ.
tonight	ຄືນນີ້	ພວກເຮົາຮຽນຄືນນີ້.
too	ກໍ;ເກີນໄປ	ຂ້ອຍກໍຢາກໄດ້ຊາ.
tooth	ແຂ້ວ	ແຂ້ວຂອງຂ້ອຍເຈັບ.
topic	ຫົວຂໍ້	ເລືອກຫົວຂໍ້.
tourist	ນັກທ່ອງທ່ຽວ	ນັກທ່ອງທ່ຽວຖ່າຍຮູບ.
town	ເມືອງນ້ອຍ;ເມືອງ	ເມືອງນ້ອຍນີ້ງຽບ.
traffic	ການຈະລາຈອນ	ການຈະລາຈອນຊ້າ.
train	ລົດໄຟ	ລົດໄຟມາຊ້າ.
travel	ເດີນທາງ;ການເດີນທາງ	ພວກເຮົາເດີນທາງໂດຍລົດໄຟ.
tree	ຕົ້ນໄມ້	ຕົ້ນໄມ້ສູງ.
trip	ການເດີນທາງ;ທຣິບ	ການເດີນທາງເລີ່ມມື້ອື່ນ.
trousers	ໂສ້ງຂາຍາວ	ໂສ້ງຂາຍາວຂອງຂ້ອຍສີດຳ.
true	ຈິງ;ຖືກຕ້ອງ	ເລື່ອງນີ້ເປັນຈິງ.
try	ພະຍາຍາມ;ລອງ	ລອງຊານີ້.
T-shirt	ເສື້ອຍືດ	ຂ້ອຍໃສ່ເສື້ອຍືດ.
Tuesday	ວັນອັງຄານ	ພວກເຮົາພົບກັນວັນອັງຄານ.
turn	ລ້ຽວ;ຜຽນ	ລ້ຽວຊ້າຍທີ່ນີ້.
TV	ໂທລະທັດ	ໂທລະທັດສຽງດັງ.
twelve	ສິບສອງ	ຂ້ອຍມີສໍດຳສິບສອງອັນ.
twenty	ຊາວ	ນັກຮຽນຊາວຄົນຢູ່ທີ່ນີ້.
twice	ສອງຄັ້ງ	ຂ້ອຍລອຍນ້ຳສອງຄັ້ງຕໍ່ອາທິດ.
two	ສອງ	ຄົນສອງຄົນກຳລັງລໍຖ້າ.
type	ປະເພດ;ພິມ	ເຈົ້າຢາກໄດ້ດົນຕີປະເພດໃດ?
umbrella	ຄັນຮົ່ມ	ເອົາຄັນຮົ່ມ.
uncle	ລຸງ;ອາ	ລຸງຂອງຂ້ອຍໃຈດີ.
under	ໃຕ້	ກະເປົາຢູ່ໃຕ້ໂຕະ.
understand	ເຂົ້າໃຈ	ຂ້ອຍເຂົ້າໃຈຄຳຖາມ.
university	ມະຫາວິທະຍາໄລ	ມະຫາວິທະຍາໄລຢູ່ໃກ້.
until	ຈົນກວ່າ;ເຖິງ	ລໍຖ້າຈົນເຖິງຫ້າໂມງ.
up	ຂຶ້ນ;ເທິງ	ລຸກຂຶ້ນດຽວນີ້.
upstairs	ຊັ້ນເທິງ	ຫ້ອງຂອງຂ້ອຍຢູ່ຊັ້ນເທິງ.
us	ພວກເຮົາ	ກະລຸນາຊ່ວຍພວກເຮົາ.
use	ໃຊ້;ການໃຊ້	ໃຊ້ປາກການີ້.
useful	ມີປະໂຫຍດ	ບັດນີ້ມີປະໂຫຍດ.
usually	ໂດຍປົກກະຕິ	ປົກກະຕິຂ້ອຍຍ່າງກັບບ້ານ.
vacation	ວັນພັກ;ພັກຮ້ອນ	ວັນພັກຂອງພວກເຮົາເລີ່ມມື້ອື່ນ.
vegetable	ຜັກ	ແຄຣອດເປັນຜັກ.
very	ຫຼາຍ	ຫ້ອງນີ້ງຽບຫຼາຍ.
video	ວິດີໂອ	ເບິ່ງວິດີໂອນີ້.
village	ບ້ານ	ບ້ານນ້ອຍ.
visit	ໄປຢ້ຽມ;ຢ້ຽມຢາມ	ພວກເຮົາໄປຢ້ຽມເຮືອນປ້າ.
visitor	ແຂກ;ຜູ້ຢ້ຽມຢາມ	ແຂກລໍຖ້າຂ້າງນອກ.
wait	ລໍຖ້າ	ກະລຸນາລໍຖ້າທີ່ນີ້.
waiter	ພະນັກງານເສີບ	ພະນັກງານເສີບນຳຊາມາ.
wake	ຕື່ນ;ປຸກ	ຂ້ອຍຕື່ນແຕ່ເຊົ້າ.
walk	ຍ່າງ	ພວກເຮົາຍ່າງໄປໂຮງຮຽນ.
wall	ຝາ	ຝາເປັນສີຂາວ.
want	ຢາກໄດ້;ຕ້ອງການ	ຂ້ອຍຢາກໄດ້ນ້ຳ.
warm	ອົບອຸ່ນ	ຫ້ອງອົບອຸ່ນ.
wash	ລ້າງ	ລ້າງມືຂອງເຈົ້າ.
watch	ເບິ່ງ;ໂມງຂໍ້ມື	ຂ້ອຍເບິ່ງໂທລະທັດ.
water	ນ້ຳ;ຫົດນ້ຳ	ດື່ມນ້ຳໜ້ອຍໜຶ່ງ.
way	ທາງ;ວິທີ	ທາງນີ້ສັ້ນ.
we	ພວກເຮົາ	ພວກເຮົາຮຽນພາສາອັງກິດ.
wear	ໃສ່	ຂ້ອຍໃສ່ເສື້ອກັນໜາວ.
weather	ອາກາດ	ອາກາດເຢັນ.
website	ເວັບໄຊ	ເວັບໄຊນີ້ມີປະໂຫຍດ.
Wednesday	ວັນພຸດ	ຫ້ອງຮຽນເລີ່ມວັນພຸດ.
week	ອາທິດ;ສັບດາ	ອາທິດນີ້ຍຸ່ງ.
weekend	ທ້າຍອາທິດ	ທ້າຍອາທິດເລີ່ມມື້ອື່ນ.
welcome	ຍິນດີຕ້ອນຮັບ	ຍິນດີຕ້ອນຮັບສູ່ຫ້ອງຮຽນຂອງພວກເຮົາ.
well	ດີ;ຢ່າງດີ	ນາງຮ້ອງເພງຢ່າງດີ.
west	ທິດຕາເວັນຕົກ	ຕາເວັນຕົກທາງທິດຕາເວັນຕົກ.
what	ຫຍັງ	ມີຫຍັງຢູ່ທີ່ນັ້ນ?
when	ເມື່ອໃດ	ເຈົ້າຮຽນເມື່ອໃດ?
where	ຢູ່ໃສ	ສະຖານີຢູ່ໃສ?
which	ອັນໃດ	ກະເປົາອັນໃດເປັນຂອງເຈົ້າ?
white	ສີຂາວ	ຝາເປັນສີຂາວ.
who	ໃຜ	ໃຜຢູ່ທີ່ນັ້ນ?
why	ເປັນຫຍັງ	ເປັນຫຍັງເຈົ້າມາຊ້າ?
wife	ເມຍ;ພັນລະຍາ	ເມຍຂອງລາວເປັນຄູ.
will modal	ຈະ	ຂ້ອຍຈະຊ່ວຍເຈົ້າ.
win	ຊະນະ	ທີມຂອງພວກເຮົາອາດຊະນະ.
window	ປ່ອງຢ້ຽມ	ເປີດປ່ອງຢ້ຽມ.
wine	ເຫຼົ້າແວງ	ເຫຼົ້າແວງນີ້ສີແດງ.
winter	ລະດູໜາວ	ລະດູໜາວຢູ່ນີ້ເຢັນ.
with	ກັບ;ພ້ອມກັບ	ມາກັບຂ້ອຍ.
without	ໂດຍບໍ່ມີ	ຊາໂດຍບໍ່ມີນ້ຳຕານດີ.
woman	ຜູ້ຍິງ	ຜູ້ຍິງອ່ານປຶ້ມ.
wonderful	ວິເສດ;ຍອດຢ້ຽມ	ທິວທັດຍອດຢ້ຽມ.
word	ຄຳ	ຂຽນຄຳໜຶ່ງ.
work	ເຮັດວຽກ;ວຽກ	ຂ້ອຍເຮັດວຽກຢູ່ເຮືອນ.
worker	ຄົນງານ;ພະນັກງານ	ພະນັກງານຍຸ່ງ.
world	ໂລກ	ໂລກໃຫຍ່.
would modal	ຈະ;ຢາກ	ຂ້ອຍຢາກໄດ້ຊາ.
write	ຂຽນ	ຂຽນຊື່ຂອງເຈົ້າ.
writer	ນັກຂຽນ	ນັກຂຽນອາໄສຢູ່ທີ່ນີ້.
writing	ການຂຽນ;ລາຍມື	ລາຍມືຂອງນາງຊັດເຈນ.
wrong	ຜິດ	ຄຳຕອບນີ້ຜິດ.
yeah	ແມ່ນ;ໂດຍ	ແມ່ນຂ້ອຍມາໄດ້.
year	ປີ	ປີນີ້ດີ.
yellow	ສີເຫຼືອງ	ກ້ວຍເປັນສີເຫຼືອງ.
yes	ແມ່ນ	ແມ່ນຂ້ອຍເຂົ້າໃຈ.
yesterday	ມື້ວານ	ຂ້ອຍໂທມື້ວານ.
you	ເຈົ້າ	ເຈົ້າເປັນໝູ່ຂອງຂ້ອຍ.
young	ໜຸ່ມ;ອ່ອນໄວ	ເດັກນ້ອຍຍັງອ່ອນໄວ.
your	ຂອງເຈົ້າ	ກະເປົາຂອງເຈົ້າຢູ່ທີ່ນີ້.
yourself	ຕົວເອງ	ເອົາຊາດ້ວຍຕົວເອງ.`;

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
  const lines = LO_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tLO\texample_LO") {
    throw new Error("Unexpected LO translation TSV header");
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} LO translation rows, found ${lines.length}`);
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad LO translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad LO translation row ${index + 2}: empty field`);
    }
    if (!LAO_RE.test(display) || !LAO_RE.test(example)) {
      throw new Error(`Bad LO translation row ${index + 2}: display/example must contain Lao text`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Bad LO translation row ${index + 2}: display/example contains Latin fallback text`);
    }
    if (LAO_TOKEN_SPACE_RE.test(example)) {
      throw new Error(`Bad LO example row ${index + 2}: generated Lao token spaces are not allowed`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad LO translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad LO example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate LO translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing LO translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`LO translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_lo_v1",
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
    LO: translation.display,
    example_LO: translation.example,
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
    "Generate the next support-language batch in language order: NE.",
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
    "- Article display: false; Lao uses normal Lao-script citation/base forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: LO Lao-script display/example cells, sentence punctuation, no Latin fallback, no generated Lao token spaces and no unexpected-script leakage",
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
      next_language: "NE",
    },
    null,
    2
  )
);
