#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "ZH";
const BATCH_ID = "zh_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-zh.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const HAN_RE = /[\u4E00-\u9FFF]/u;

const ZH_TRANSLATIONS_TSV = `source_headword	ZH	example_ZH
machine	机器; 设备	这台机器做咖啡。
magazine	杂志	她读一本音乐杂志。
main	主要的	这是正门。
make	做; 制作	我在家做午饭。
man	男人	那个男人是我的老师。
many	许多; 很多	许多学生在这里。
map	地图	看地图。
March	三月	我的生日在三月。
market	市场	我们在市场买水果。
married	已婚的	我姐姐结婚了。
May	五月	学校五月结束。
maybe	也许	也许会下雨。
me	我; 我自己	请帮帮我。
meal	一餐; 饭	这顿饭很热。
mean	意思是	这个标志是什么意思？
meaning	意思; 含义	这是什么意思？
meat	肉	我晚饭吃肉。
meet	见面; 遇见	我们课后见面。
meeting	会议	会议现在开始。
member	成员	她是俱乐部成员。
menu	菜单	请读菜单。
message	消息; 信息	我发一条短消息。
metre	米	向前走一米。
midnight	午夜	火车午夜出发。
mile	英里	我们走一英里。
milk	牛奶	我早餐喝牛奶。
million	百万	这里住着一百万人。
minute1	分钟	请等一分钟。
miss	想念; 错过	我想念我的旧学校。
mistake	错误	这个答案有一个错误。
model	模型; 模特	这是一个小模型。
modern	现代的	厨房很现代。
moment	片刻; 时刻	请等一会儿。
Monday	星期一	我们星期一开始工作。
money	钱	我需要一些钱。
month	月; 月份	六月是一个热的月份。
more	更多	我需要更多时间。
morning	早上; 上午	我早上学习。
most	大多数; 最	大多数学生喜欢音乐。
mother	母亲; 妈妈	我妈妈今天工作。
mountain	山	这座山很高。
mouse	老鼠; 鼠标	一只老鼠在椅子下面。
mouth	嘴	请张开嘴。
move	移动; 搬动	把椅子移到这里。
movie	电影	我们今晚看电影。
much	很多; 多少	这个多少钱？
mum	妈妈	妈妈在家。
museum	博物馆	博物馆十点开门。
music	音乐	我听音乐。
must modal	必须	你必须在这里停下。
my	我的	这是我的书。
name	名字; 命名	在这里写你的名字。
natural	自然的	这个果汁很天然。
near	近的; 在附近	银行就在附近。
need	需要	我需要一支笔。
negative	否定的; 负面的	这个答案是否定的。
neighbour	邻居	我的邻居很友好。
never	从不	我从不喝咖啡。
new	新的	这部手机是新的。
news	新闻	今天的新闻很好。
newspaper	报纸	他读一份报纸。
next	下一个; 接下来的	下一辆公交车晚点了。
next to	在旁边	坐在我旁边。
nice	好的; 友好的	这个房间很舒服。
night	夜晚	我晚上睡觉。
nine	九	这里有九个学生。
nineteen	十九	她十九岁。
ninety	九十	我爷爷九十岁。
no	不; 没有	不，谢谢。
no one	没有人	房间里没有人。
nobody	没有人	家里没有人。
north	北方; 北部	车站在这里北边。
nose	鼻子	我的鼻子很冷。
not	不	我不累。
note	笔记; 便条	现在写一张便条。
nothing	没有东西; 什么也没有	盒子里什么也没有。
November	十一月	我的课程十一月开始。
now	现在	现在来这里。
number	数字; 号码	在这里写号码。
nurse	护士	护士很友好。
object	物体; 东西	把这个物体放在桌子上。
o’clock	点钟	课九点开始。
October	十月	我们十月旅行。
of	的	这是一杯茶。
off	关掉; 离开	把灯关掉。
office	办公室	我的办公室很小。
often	经常	我经常走路去学校。
oh	哦	哦，我现在明白了。
OK	可以; 好	这样可以吗？
old	旧的; 老的	这所房子很旧。
on	在上面; 开着	书在桌子上。
once	一次	我每周打一次电话。
one	一	我有一个姐姐。
onion	洋葱	切一个洋葱。
online	在线	我在线学习。
only	只; 只有	我只有一个包。
open	打开; 开着	请打开窗户。
opinion	意见; 看法	你的看法是什么？
opposite	在对面; 相反的	商店在银行对面。
or	或者	茶还是咖啡？
orange	橙子; 橙色	这个橙子很甜。
order	点餐; 订单	我点汤。
other	其他的; 另一个	用另一扇门。
our	我们的	这是我们的教室。
out	出去; 在外面	午饭后出去。
outside	外面	孩子们在外面玩。
over	在上方; 越过	飞机飞过城市上空。
own	自己的	我有自己的房间。
page	页	打开第十页。
paint	画; 油漆	把墙刷成蓝色。
painting	画; 绘画	这幅画很漂亮。
pair	一双; 一对	我需要一双袜子。
paper	纸	在这张纸上写。
paragraph	段落	读第一段。
parent	父母中的一方; 家长	一位家长在外面等。
park	停车; 公园	我们在车站附近停车。
part	部分	这部分很容易。
partner	伙伴; 搭档	和一个伙伴一起工作。
party	聚会; 派对	聚会七点开始。
passport	护照	请出示你的护照。
past	过去的; 过	现在六点半。
pay	付款; 支付	我用卡付款。
pen	钢笔; 笔	这支笔是蓝色的。
pencil	铅笔	我用铅笔写字。
people	人们	很多人在这里。
pepper	胡椒	往汤里加胡椒。
perfect	完美的	你的答案很完美。
period	时期; 一节课	这节课很短。
person	人	有一个人在等。
personal	个人的	这是我的个人电话。
phone	电话; 手机	我的手机在包里。
photo	照片	在这里拍一张照片。
photograph	照片; 拍照	这张照片很旧。
phrase	短语	请重复这个短语。
piano	钢琴	她弹钢琴。
picture	图片; 照片	看这张图片。
piece	一块; 一片	拿一块蛋糕。
pig	猪	猪在农场里。
pink	粉色的	她的包是粉色的。
place	地方; 放置	这个地方很安静。
plan	计划	我们需要一个计划。
plane	飞机	飞机晚点了。
plant	植物; 种植	今天给植物浇水。
play	玩; 演奏	孩子们在公园玩。
player	运动员; 玩家	那名运动员跑得很快。
please	请	请坐在这里。
point	点; 要点	这一点很重要。
police	警察; 警方	警察在外面。
policeman	男警察	那位男警察帮助我们。
pool	游泳池	游泳池很冷。
poor	贫穷的; 可怜的	那个可怜的孩子饿了。
popular	受欢迎的	这首歌很受欢迎。
positive	积极的; 正面的	这是一个积极的结果。
possible	可能的	今天可以吗？
post	帖子; 发布	我在网上读她的帖子。
potato	土豆	我吃一个土豆。
pound	英镑	它要一英镑。
practice	练习	练习每天都有帮助。
practise	练习	我每天练习英语。
prefer	更喜欢	我更喜欢茶。
prepare	准备	今晚准备好你的包。
present	在场的; 礼物	她今天在场。
pretty	漂亮的; 相当	花园很漂亮。
price	价格	价格很低。
probably	可能; 大概	她可能知道。
problem	问题	这个问题很小。
product	产品	这个产品是新的。
programme	节目; 计划	节目现在开始。
project	项目	我们的项目准备好了。
purple	紫色的	这件衬衫是紫色的。
put	放	把书放在这里。
quarter	四分之一; 一刻钟	现在两点一刻。
question	问题	问一个问题。
quick	快的	这是一个快速测试。
quickly	快速地	请快点走。
quiet	安静的	图书馆很安静。
quite	相当	这个房间相当小。
radio	收音机	收音机声音很大。
rain	雨; 下雨	雨现在开始下了。
read	读	读这个句子。
reader	读者	这位读者喜欢这个故事。
reading	阅读	阅读帮助我学习。
ready	准备好的	晚饭准备好了。
real	真实的	这是一个真实的问题。
really	真的	我真的喜欢这首歌。
reason	原因	告诉我原因。
red	红色的	门是红色的。
relax	放松	下班后放松一下。
remember	记得	记得带护照。
repeat	重复	请重复这个句子。
report	报告	今晚读这份报告。
restaurant	餐馆	餐馆很忙。
result	结果	结果很好。
return	归还; 返回	明天归还这本书。
rice	米饭	我午饭吃米饭。
rich	富有的	这个城市很富有。
ride	骑; 乘坐	我骑自行车。
right	右边; 正确的	在这里右转。
river	河	这条河很宽。
road	路; 道路	这条路很长。
room	房间	我的房间很干净。
routine	日常安排	我的日常安排很早开始。
rule	规则	这条规则很简单。
run	跑	我每天早上跑步。
sad	难过的	他今天很难过。
salad	沙拉	这份沙拉很新鲜。
salt	盐	加一点盐。
same	相同的	我们有同样的包。
sandwich	三明治	我吃一个三明治。
Saturday	星期六	我们星期六见面。
say	说	请说你的名字。
school	学校	我的学校在附近。
science	科学	我学习科学。
scientist	科学家	科学家问了一个问题。
sea	海	大海是蓝色的。
second1 (unit of time)	秒	等一秒。
section	部分; 章节	读这一部分。
see	看见	我看见我的朋友。
sell	卖	他们卖新鲜水果。
send	发送; 寄	现在发送这条消息。
sentence	句子	写一个句子。
September	九月	学校九月开始。
seven	七	这里有七个人。
seventeen	十七	他十七岁。
seventy	七十	我奶奶七十岁。
share	分享; 分	分这个蛋糕。
she	她	她是我的姐姐。
sheep	羊	羊吃草。
shirt	衬衫	他的衬衫很干净。
shoe	鞋	一只鞋在床下。
shop	商店; 购物	商店很早关门。
shopping	购物	今天购物很有趣。
short	短的	这个故事很短。
should modal	应该	你今天应该休息。
show	展示; 给看	给我看你的票。
shower	淋浴	我洗个淋浴。
sick	生病的	我今天觉得不舒服。
similar	相似的	我们的包很相似。
sing	唱	我在课堂上唱歌。
singer	歌手	这位歌手很有名。
sister	姐妹; 姐姐; 妹妹	我妹妹很年轻。
sit	坐	坐在窗户旁边。
situation	情况	这个情况是新的。
six	六	这里有六本书。
sixteen	十六	她十六岁。
sixty	六十	我爸爸六十岁。
skill	技能	这项技能很有用。
skirt	裙子	她的裙子是蓝色的。
sleep	睡觉; 睡眠	我睡八个小时。
slow	慢的	公交车很慢。
small	小的	房间很小。
snake	蛇	这条蛇很长。
snow	雪; 下雪	冬天下雪。
so	所以; 这么	我累了，所以休息。
some	一些	我需要一些水。
somebody	某人	有人在门口。
someone	某人	有人留了消息。
something	某物; 某事	我需要喝点东西。
sometimes	有时	我有时走路去学校。
son	儿子	她儿子在学校。
song	歌曲	这首歌是新的。
soon	很快	很快见。
sorry	抱歉的; 对不起	对不起。
sound	声音	声音很大。
soup	汤	汤很热。
south	南方; 南部	酒店在这里南边。
space	空间	这里有放一把椅子的空间。
speak	说话	请慢慢说。
special	特别的	今天是特别的一天。
spell	拼写	拼写你的名字。
spelling	拼写	检查你的拼写。
spend	花费; 度过	我把钱花在食物上。
sport	运动	足球是一项受欢迎的运动。
spring	春天; 跳	花在春天生长。
stand	站	站在门旁边。
star	星星	我看到一颗明亮的星星。
start	开始	现在开始上课。
statement	陈述; 说法	这个说法是真的。
station	车站	车站在附近。
stay	待; 停留	今天待在家里。
still	仍然	我仍然饿。
stop	停止; 停车	在拐角处停下。
story	故事	给我讲一个故事。
street	街道	这条街很安静。
strong	强壮的	他很强壮。
student	学生	学生读一本书。
study	学习	我学习英语。
style	风格	我喜欢这种风格。
subject	科目; 主题	英语是我的主要科目。
success	成功	成功需要练习。
sugar	糖	在茶里放糖。
summer	夏天	这里夏天很热。
sun	太阳	太阳很亮。
Sunday	星期日	我们星期日休息。
supermarket	超市	超市开门了。
sure	确定的	我确定。
sweater	毛衣	我的毛衣很暖和。
swim	游泳	我每周游泳。
swimming	游泳	游泳是很好的锻炼。
table	桌子	钥匙在桌子上。`;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!HAN_RE.test(display) || !HAN_RE.test(example)) {
      throw new Error(`Chinese row must contain Han characters for ${sourceHeadword}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Chinese example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Chinese translation row for ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildSupportRow(row, translation) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: false,
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}

function updateContract(contract, outputPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: outputPath,
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

  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.latest_support_translation_batches = [...existing, batch];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate JA support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after JA.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

async function main() {
  const args = parseArgs();
  const contractPath = args.get("contract");
  if (!contractPath) {
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-zh.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_zh_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_zh_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(ZH_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Chinese translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Chinese translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Chinese
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(summaryPath, summary);

  const updatedContract = updateContract(contract, outputPath, summaryPath, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: outputPath,
    contract_updated: contractPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
