#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "ZH";
const BATCH_ID = "zh_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-zh.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const HAN_RE = /[\u4E00-\u9FFF]/u;

const ZH_TRANSLATIONS_TSV = `source_headword	ZH	example_ZH
clothes	衣服	我的衣服很干净。
club	俱乐部	她去音乐俱乐部。
coat	外套	我的外套很暖和。
coffee	咖啡	我早上喝咖啡。
cold	冷的; 寒冷	水很冷。
college	学院; 大学	我姐姐在大学学习。
colour	颜色	我最喜欢的颜色是蓝色。
come	来	请到这里来。
common	常见的	这个名字很常见。
company	公司	我妈妈在一家公司工作。
compare	比较	比较这两张图片。
complete	完整的; 完成	表格已经填完整了。
computer	电脑	这台电脑是新的。
concert	音乐会	我们今晚去音乐会。
conversation	谈话	我们有一次简短的谈话。
cook	做饭; 厨师	我在家做晚饭。
cooking	烹饪; 做饭	我喜欢和爸爸一起做饭。
cool	凉爽的; 酷的	房间很凉爽。
correct	正确的; 改正	你的答案是正确的。
cost	花费; 费用	这个多少钱？
could modal	可以; 能够	我可以帮你。
country	国家	加拿大是一个大国家。
course	课程	我在上英语课程。
cousin	堂兄弟姐妹; 表兄弟姐妹	我的表哥住在附近。
cow	奶牛	奶牛吃草。
cream	奶油	我在咖啡里加奶油。
create	创造; 创建	他们创建一个新游戏。
culture	文化	我们学习当地文化。
cup	杯子	这个杯子是空的。
customer	顾客	顾客问了一个问题。
cut	切; 剪	把苹果切成两半。
dad	爸爸	爸爸在工作。
dance	跳舞; 舞蹈	晚饭后我们跳舞。
dancer	舞者	那位舞者动作很快。
dancing	跳舞; 舞蹈	跳舞很有趣。
dangerous	危险的	这条路很危险。
dark	黑暗的; 深色的	房间很暗。
date	日期	今天是几号？
daughter	女儿	她的女儿六岁。
day	一天; 日子	祝你今天愉快。
dear	亲爱的	亲爱的朋友，谢谢你。
December	十二月	我的生日在十二月。
decide	决定	请现在决定。
delicious	美味的	这汤很好吃。
describe	描述	描述你的房间。
description	描述	读这段简短的描述。
design	设计	我给卡片做一个简单设计。
desk	书桌	书在我的书桌上。
detail	细节	少了一个细节。
dialogue	对话	现在读这段对话。
dictionary	词典	在课堂上用词典。
die	死亡; 死去	花没有水会枯死。
diet	饮食	我的饮食包括水果。
difference	差别; 不同	这里有一个差别。
different	不同的	我们有不同的名字。
difficult	困难的	这个问题很难。
dinner	晚饭	晚饭准备好了。
dirty	脏的	我的鞋很脏。
discuss	讨论	我们讨论这个计划。
dish	盘子; 菜肴	这个盘子很热。
do1	做	你在做什么？
doctor	医生	医生很忙。
dog	狗	狗在外面跑。
dollar	美元	这个要一美元。
door	门	请把门关上。
down	向下; 在下面	坐在这里下面。
downstairs	在楼下; 到楼下	厨房在楼下。
draw	画	画一座小房子。
dress	连衣裙; 穿衣	她穿一条红色连衣裙。
drink	饮料; 喝	我喝水。
drive	开车; 驾驶	我开车去上班。
driver	司机	司机在这里停车。
during	在期间	我在飞行期间睡觉。
DVD	数字光盘	这张数字光盘很旧。
each	每个; 每一	每个孩子都有一本书。
ear	耳朵	我的耳朵疼。
early	早的; 早	我起得很早。
east	东方; 东部	太阳从东方升起。
easy	容易的	这个测试很容易。
eat	吃	我们一起吃饭。
egg	鸡蛋	我吃一个鸡蛋。
eight	八	我有八张卡片。
eighteen	十八	她十八岁。
eighty	八十	我爷爷八十岁。
elephant	大象	大象很大。
eleven	十一	课十一点开始。
else	别的; 其他	你还需要什么？
email	电子邮件	给我发一封电子邮件。
end	结尾; 结束	这是结尾。
enjoy	喜欢; 享受	我喜欢这首歌。
enough	足够的	我们有足够的时间。
euro	欧元	这个要一欧元。
even	甚至	甚至我弟弟也知道。
evening	晚上	我们晚上见。
event	活动; 事件	活动今天开始。
ever	曾经	你曾经做过饭吗？
every	每个; 每一	我每天学习。
everybody	每个人; 大家	大家都在这里。
everyone	每个人	每个人都喜欢音乐。
everything	一切; 所有东西	一切都准备好了。
exam	考试	考试很快开始。
example	例子	这是一个好例子。
excited	兴奋的	我今天很兴奋。
exciting	令人兴奋的	这场比赛很令人兴奋。
exercise	练习; 锻炼	我早饭前锻炼。
expensive	昂贵的	这件外套很贵。
explain	解释	请解释这个词。
extra	额外的	我需要额外的时间。
eye	眼睛	我的眼睛红了。
face	脸	洗洗脸。
fact	事实	这个事实很重要。
fall	落下; 摔倒	叶子在秋天落下。
false	错误的; 假的	这个答案是错误的。
family	家庭; 家人	我的家庭很小。
famous	著名的	她是一位著名歌手。
fantastic	极好的	音乐会非常棒。
far	远的; 远	学校很远。
farm	农场	他们住在农场。
farmer	农民	农民种植食物。
fast	快的	这列火车很快。
fat	胖的	那只猫很胖。
father	父亲; 爸爸	我爸爸很高。
favourite	最喜欢的	这是我最喜欢的歌。
February	二月	这里二月很冷。
feel	感觉; 感到	我感到很高兴。
feeling	感觉; 感情	我知道那种感觉。
festival	节日; 庆典	节日明天开始。
few	少数的; 几个	这里学生很少。
fifteen	十五	我十五岁。
fifth	第五	这是第五节课。
fifty	五十	我妈妈五十岁。
fill	装满; 填写	把杯子装满水。
film	电影	我们看一部电影。
final	最后的; 最终的	这是最后一个问题。
find	找到	我找到了钥匙。
fine	好的; 不错的	我现在很好。
finish	完成; 结束	完成你的作业。
fire	火; 火灾	火很热。
first	第一的; 首先	她排在第一位。
fish	鱼; 鱼肉	我晚饭吃鱼。
five	五	我有五本书。
flat	公寓	我的公寓很小。
flight	航班	航班晚点了。
floor	地板; 楼层	包在地板上。
flower	花	这朵花是黄色的。
fly	飞; 乘飞机	鸟在天上飞。
follow	跟随; 遵循	请跟着我。
food	食物	食物准备好了。
foot	脚	我的脚疼。
football	足球	我们今天踢足球。
for	给; 为了	这份礼物是给你的。
forget	忘记	别忘了钥匙。
form	表格; 形成	请填写这张表格。
forty	四十	我爸爸四十岁。
four	四	我看见四只鸟。
fourteen	十四	她十四岁。
fourth	第四	这是第四层。
free	免费的; 空闲的	票是免费的。
Friday	星期五	我们星期五见。
friend	朋友	我的朋友在这里。
friendly	友好的	老师很友好。
from	从; 来自	我来自这里。
front	前面; 前部	它在前面。
fruit	水果	我每天吃水果。
full	满的; 饱的	瓶子满了。
fun	乐趣; 有趣的	这个游戏很有趣。
funny	有趣的; 好笑的	这部电影很好笑。
future	未来	想想你的未来。
game	游戏; 比赛	游戏现在开始。
garden	花园	花园很漂亮。
geography	地理	我在学校学地理。
get	得到; 到达	我六点到家。
girl	女孩	女孩在微笑。
girlfriend	女朋友	他的女朋友很友善。
give	给	把书给我。
glass	玻璃杯; 玻璃	我用玻璃杯喝水。
go	去	我们现在回家。
good	好的	这杯咖啡很好。
goodbye	再见	再见，明天见。
grandfather	祖父; 外祖父	我爷爷年纪大了。
grandmother	祖母; 外祖母	我奶奶做汤。
grandparent	祖父母; 外祖父母	我的一位祖父母和我们住在一起。
great	很棒的; 伟大的	这是个很棒的主意。
green	绿色的	门是绿色的。
grey	灰色的	天空是灰色的。
group	小组; 群体	请在一个小组里工作。
grow	生长; 种植	植物在花园里生长。
guess	猜; 猜测	猜猜答案。
guitar	吉他	他弹吉他。
gym	健身房	我去健身房。
hair	头发	她有长头发。
half	一半	把蛋糕切成两半。
hand	手	举起你的手。
happen	发生	接下来会发生什么？
happy	高兴的; 快乐的	我今天很高兴。
hard	硬的; 困难的	这把椅子很硬。
hat	帽子	我的帽子是黑色的。
hate	讨厌; 恨	我讨厌冷茶。
have	有; 经历	我有一辆车。
have to modal	必须; 不得不	我必须学习。
he	他	他是我的哥哥。
head	头	我的头疼。
health	健康	好食物有助于健康。
healthy	健康的	这道菜很健康。
hear	听见	我听见音乐。
hello	你好	你好，很高兴认识你。
help	帮助	请帮帮我。
her	她的; 她	这是她的包。
here	这里	现在到这里来。
hey	嘿; 你好	嘿，等等我。
hi	你好	你好，你好吗？
high	高的	这堵墙很高。
him	他	我认识他。
his	他的	他的外套是蓝色的。
history	历史	我学历史。
hobby	爱好	阅读是我的爱好。
holiday	假期	我们七月去度假。
home	家; 在家	我在家。
homework	家庭作业	今晚做家庭作业。
hope	希望	我希望你来。
horse	马	马跑得很快。
hospital	医院	医院在附近。
hot	热的	汤很热。
hotel	酒店; 旅馆	酒店很干净。
hour	小时	等一个小时。
house	房子	这所房子很旧。
how	怎样; 如何	你好吗？
however	然而; 不过	不过，我可以留在这里。
hundred	一百	来了一百个人。
hungry	饿的	我饿了。
husband	丈夫	她的丈夫是医生。
I	我	我喜欢茶。
ice	冰	冰很冷。
ice cream	冰淇淋	我想要一个冰淇淋。
idea	想法; 主意	这是个好主意。
if	如果	如果你需要帮助，就给我打电话。
imagine	想象	想象一座小房子。
important	重要的	这节课很重要。
improve	改进; 提高	我想提高。
in	在; 在里面	钥匙在我的包里。
include	包括	请写上你的名字。
information	信息	我需要更多信息。
interest	兴趣	她对艺术有兴趣。
interested	感兴趣的	我对音乐感兴趣。
interesting	有趣的	这本书很有趣。
internet	互联网	互联网很慢。
interview	面试; 采访	我今天有一次面试。
into	进入; 到里面	把书放进包里。
introduce	介绍	请介绍你的朋友。
island	岛	这个岛很小。
it	它	天气很冷。
its	它的	狗喜欢它的床。
jacket	夹克; 外套	我的夹克是新的。
January	一月	一月是一年中的第一个月。
jeans	牛仔裤	我的牛仔裤是蓝色的。
job	工作	我需要一份新工作。
join	加入	今天加入我们的课堂。
journey	旅程	旅程很长。
juice	果汁	我喝橙汁。
July	七月	我们七月旅行。
June	六月	学校六月放假。
just	只; 刚刚	我只需要水。
keep	保留; 保持	请保管这把钥匙。
key	钥匙	我丢了钥匙。
kilometre	公里	走一公里。
kind (type)	种类; 类型	你喜欢哪种音乐？
kitchen	厨房	厨房很干净。
know	知道; 认识	我知道答案。
land	陆地; 土地	我们站在陆地上。
language	语言	英语是一种语言。
large	大的	这个房间很大。
last1 (final)	最后的	这是最后一页。
late	迟的; 晚的	公共汽车晚点了。
later	稍后; 以后	稍后见。
laugh	笑	我们一起笑。
learn	学习	我学习英语。
leave	离开; 留下	我现在离开家。
left	左边的; 向左	在这里向左转。
leg	腿	我的腿疼。
lesson	课; 课程	课现在开始。
let	让; 允许	让我帮助你。
letter	信; 字母	我写一封信。
library	图书馆	图书馆九点开门。
lie1	躺	请躺在床上。
life	生活; 生命	城市生活很热闹。
like (similar)	像; 类似	这像一个游戏。
like (find sb/sth pleasant)	喜欢	我喜欢这首歌。
line	队伍; 线	请排队。
lion	狮子	狮子在睡觉。
list	清单; 列表	列一张购物清单。
listen	听	听老师讲。
little	小的; 少的	我钱很少。
live1	居住; 生活	我住在学校附近。
local	当地的	这是一家当地商店。
long1	长的	这条路很长。
look	看; 看起来	看这张图片。
lose	丢失; 失去	不要丢票。
lot	许多; 大量	我有很多家庭作业。
love	爱; 喜爱	我爱我的家人。
lunch	午饭	午饭准备好了。`;

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
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad ZH example punctuation for ${sourceHeadword}`);
    }
    if (!HAN_RE.test(display)) {
      throw new Error(`Bad ZH display script for ${sourceHeadword}`);
    }
    if (!HAN_RE.test(example)) {
      throw new Error(`Bad ZH example script for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate ZH translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  if (rows.length !== 300) {
    throw new Error(`Expected exactly 300 English example rows, got ${rows.length}`);
  }
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
    reviewer: "codex_oxford_part002_support_translation_batch_zh_v1",
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
    "- Script-aware validation: ZH Han script for display and example cells",
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
