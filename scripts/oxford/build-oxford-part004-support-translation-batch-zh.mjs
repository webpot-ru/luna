#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "ZH";
const BATCH_ID = "zh_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-zh.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const HAN_RE = /[\u4E00-\u9FFF]/u;

const ZH_TRANSLATIONS_TSV = `source_headword	ZH	example_ZH
take	拿; 取; 带走	拿这张票。
talk	说话; 谈话	下课后我们说话。
tall	高的	我的老师很高。
taxi	出租车	出租车在外面。
tea	茶	这杯茶很热。
teach	教	我教英语。
teacher	老师	老师微笑。
team	团队; 队伍	我们队今天赢。
teenager	青少年; 少年	这个少年读一本书。
telephone	电话; 打电话	电话在桌子上。
television	电视	这台电视是新的。
tell	告诉; 讲	告诉我你的名字。
ten	十	我有十本书。
tennis	网球	我们今天打网球。
terrible	糟糕的; 可怕的	天气很糟糕。
test	测试; 考试	测试现在开始。
text	短信; 发短信	发一条短信。
than	比	十比二多。
thank	感谢	感谢你的老师。
thanks	谢谢	谢谢你的帮助。
that	那个; 那	那本书是我的。
the	英语定冠词	这杯茶很热。
theatre	剧院	剧院在车站附近。
their	他们的; 她们的	他们的房子很大。
them	他们; 她们	我认识他们。
then	然后; 那么	吃饭，然后学习。
there	那里; 有	那里有一把椅子。
they	他们; 她们	他们在学校。
thing	东西; 事情	这个东西很有用。
think	想; 认为	我想家。
third	第三; 三分之一	这是第三课。
thirsty	渴的; 口渴	我口渴。
thirteen	十三	她十三岁。
thirty	三十	我姐姐三十岁。
this	这个; 这	这张票是新的。
thousand	一千	来了一千个人。
three	三	我看见三只鸟。
through	通过; 穿过	我们穿过公园。
Thursday	星期四	我们星期四见。
ticket	票; 车票	我需要一张票。
time	时间; 点钟	现在几点？
tired	累的	我累了。
title	标题	读标题。
to	到; 向; 给; 不定式标记	我去上课。
today	今天	今天有阳光。
together	一起	我们一起吃饭。
toilet	厕所; 卫生间	厕所很干净。
tomato	西红柿; 番茄	这个西红柿是红的。
tomorrow	明天	明天见。
tonight	今晚	我们今晚学习。
too	也; 太	我也想喝茶。
tooth	牙齿	我的牙疼。
topic	话题; 主题	选一个话题。
tourist	游客	游客拍照片。
town	镇; 城镇	这个小镇很安静。
traffic	交通	交通很慢。
train	火车; 训练	火车晚点了。
travel	旅行	我们坐火车旅行。
tree	树	这棵树很高。
trip	旅行; 行程	旅行明天开始。
trousers	裤子	我的裤子是黑色的。
true	真的; 正确的	那个故事是真的。
try	尝试; 试试	试试这杯茶。
T-shirt	T恤	我穿一件T恤。
Tuesday	星期二	我们星期二见。
turn	转; 转弯; 轮到	向左转。
TV	电视	电视声音很大。
twelve	十二	我有十二支笔。
twenty	二十	这里有二十个学生。
twice	两次	我每周游泳两次。
two	二	两个人在等。
type	类型; 打字	什么类型的音乐？
umbrella	雨伞	带一把雨伞。
uncle	叔叔; 舅舅	我的叔叔很友好。
under	在下面	包在桌子下面。
understand	理解; 明白	我理解这个问题。
university	大学	大学在附近。
until	直到	等到五点。
up	向上; 起来	现在站起来。
upstairs	楼上	我的房间在楼上。
us	我们	请帮助我们。
use	使用; 用	使用这支笔。
useful	有用的	这张地图很有用。
usually	通常	我通常走路回家。
vacation	假期	我们的假期明天开始。
vegetable	蔬菜	胡萝卜是一种蔬菜。
very	非常	房间非常安静。
video	视频	看这个视频。
village	村庄	村子很小。
visit	拜访; 参观	我们拜访阿姨。
visitor	访客; 游客	访客在外面等。
wait	等待	请在这里等。
waiter	服务员	服务员端来茶。
wake	醒来; 叫醒	我很早醒来。
walk	走路; 散步	我们走路去学校。
wall	墙	墙是白色的。
want	想要	我要水。
warm	温暖的; 热的	房间很暖和。
wash	洗	洗手。
watch	看; 手表	我看电视。
water	水; 浇水	喝点水。
way	路; 方法	这条路很短。
we	我们	我们学英语。
wear	穿; 戴	我穿一件夹克。
weather	天气	天气很冷。
website	网站	这个网站很有用。
Wednesday	星期三	周三开始上课。
week	周; 星期	这周很忙。
weekend	周末	周末明天开始。
welcome	欢迎	欢迎来到我们的班。
well	好	她唱得很好。
west	西方; 西部	太阳在西方落下。
what	什么	那是什么？
when	什么时候	你什么时候学习？
where	哪里	车站在哪里？
which	哪一个	哪个包是你的？
white	白色的	墙是白色的。
who	谁	那是谁？
why	为什么	你为什么迟到？
wife	妻子	他的妻子是老师。
will modal	将; 会	我会帮助你。
win	赢	我们队会赢。
window	窗户	打开窗户。
wine	葡萄酒	这杯葡萄酒是红色的。
winter	冬天	这里冬天很冷。
with	和; 带着	跟我来。
without	没有; 不带	不加糖的茶也可以。
woman	女人; 女性	这个女人读一本书。
wonderful	精彩的; 美妙的	风景很美妙。
word	单词; 词	写一个单词。
work	工作	我在家工作。
worker	工人	工人很忙。
world	世界	世界很大。
would modal	会; 想要	我想喝茶。
write	写	写你的名字。
writer	作家	作家住在这里。
writing	写作; 字迹	她的字迹很清楚。
wrong	错的	这个答案是错的。
yeah	是的; 好的	是的，我能来。
year	年	今年很好。
yellow	黄色的	香蕉是黄色的。
yes	是; 是的	是的，我明白。
yesterday	昨天	我昨天打了电话。
you	你; 你们	你是我的朋友。
young	年轻的	孩子很年轻。
your	你的; 你们的	你的包在这里。
yourself	你自己	请自己倒茶。`;

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
  const lines = ZH_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tZH\texample_ZH") {
    throw new Error("Unexpected ZH translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad ZH translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad ZH translation row ${index + 2}: empty field`);
    }
    if (!HAN_RE.test(display) || !HAN_RE.test(example)) {
      throw new Error(`Bad ZH translation row ${index + 2}: display/example must contain Han characters`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad ZH example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate ZH translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing ZH translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`ZH translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_zh_v1",
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
    ZH: translation.display,
    example_ZH: translation.example,
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
    "Generate the next support-language batch in language order: JA.",
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
    "- Article display: not applicable for Chinese",
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
