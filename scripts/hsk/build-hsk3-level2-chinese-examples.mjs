import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_2_200_v1";
const DATE = "20260604";
const sourcePath = path.join(ROOT, "outputs/hsk/source/hsk3_level_2_200_v1.source.json");
const reuseMapPath = path.join(ROOT, "outputs/hsk/qa/hsk3_level_2_200_v1_classic_reuse_map_20260604.json");
const examplesOut = path.join(ROOT, "config/hsk3-level2-examples.json");
const glossesOut = path.join(ROOT, "config/hsk3-level2-en-glosses.json");
const reportOut = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_chinese_examples_build_${DATE}.json`);

const manualRows = [
  [303, "白色", "white color", "我喜欢白色的杯子。", "Wǒ xǐ huan bái sè de bēi zi.", "I like the white cup."],
  [305, "帮", "to help", "请帮我打开门。", "Qǐng bāng wǒ dǎ kāi mén.", "Please help me open the door."],
  [308, "本子", "notebook", "这个本子是我的。", "Zhè ge běn zi shì wǒ de.", "This notebook is mine."],
  [310, "笔", "pen; pencil", "我有一支笔。", "Wǒ yǒu yì zhī bǐ.", "I have a pen."],
  [312, "不错", "not bad; pretty good", "这家饭馆不错。", "Zhè jiā fàn guǎn bú cuò.", "This restaurant is pretty good."],
  [313, "不好意思", "sorry; embarrassed", "不好意思，我来晚了。", "Bù hǎo yì si, wǒ lái wǎn le.", "Sorry, I came late."],
  [315, "车站", "station; stop", "车站在前面。", "Chē zhàn zài qián miàn.", "The station is ahead."],
  [317, "出国", "to go abroad", "他明年出国学习。", "Tā míng nián chū guó xué xí.", "He will go abroad to study next year."],
  [318, "出来", "to come out", "请你出来一下。", "Qǐng nǐ chū lái yí xià.", "Please come out for a moment."],
  [319, "出门", "to go out; to leave home", "我早上八点出门。", "Wǒ zǎo shang bā diǎn chū mén.", "I leave home at eight in the morning."],
  [320, "出去", "to go out", "我想出去走走。", "Wǒ xiǎng chū qù zǒu zou.", "I want to go out for a walk."],
  [321, "床", "bed", "床在房间里。", "Chuáng zài fáng jiān lǐ.", "The bed is in the room."],
  [322, "词", "word", "这个词我不懂。", "Zhè ge cí wǒ bù dǒng.", "I do not understand this word."],
  [325, "从小", "since childhood", "我从小喜欢画画。", "Wǒ cóng xiǎo xǐ huan huà huà.", "I have liked drawing since childhood."],
  [327, "打1", "to make; to hit; to play", "我给爸爸打电话。", "Wǒ gěi bà ba dǎ diàn huà.", "I call my dad."],
  [328, "打车", "to take a taxi", "我们打车去机场。", "Wǒ men dǎ chē qù jī chǎng.", "We take a taxi to the airport."],
  [329, "打开", "to open", "请打开书。", "Qǐng dǎ kāi shū.", "Please open the book."],
  [330, "但", "but", "我很忙，但我很高兴。", "Wǒ hěn máng, dàn wǒ hěn gāo xìng.", "I am busy, but I am happy."],
  [338, "动", "to move", "别动。", "Bié dòng.", "Do not move."],
  [340, "飞", "to fly", "鸟在天上飞。", "Niǎo zài tiān shang fēi.", "The bird is flying in the sky."],
  [342, "高中", "senior high school", "我哥哥在高中学习。", "Wǒ gē ge zài gāo zhōng xué xí.", "My older brother studies at senior high school."],
  [346, "公交车", "bus", "我坐公交车上学。", "Wǒ zuò gōng jiāo chē shàng xué.", "I take the bus to school."],
  [348, "过来", "to come over", "请过来一下。", "Qǐng guò lái yí xià.", "Please come over for a moment."],
  [349, "过年", "to celebrate the New Year", "我们回家过年。", "Wǒ men huí jiā guò nián.", "We go home to celebrate the New Year."],
  [353, "黑色", "black color", "黑色的书包在床上。", "Hēi sè de shū bāo zài chuáng shang.", "The black schoolbag is on the bed."],
  [354, "红茶", "black tea", "妈妈喜欢喝红茶。", "Mā ma xǐ huan hē hóng chá.", "Mom likes drinking black tea."],
  [355, "红色", "red color", "我有一件红色衣服。", "Wǒ yǒu yí jiàn hóng sè yī fu.", "I have a red piece of clothing."],
  [361, "回来", "to come back", "他晚上回来。", "Tā wǎn shang huí lái.", "He comes back in the evening."],
  [362, "回去", "to go back", "我下课后回去。", "Wǒ xià kè hòu huí qù.", "I go back after class."],
  [364, "机票", "plane ticket", "我买了一张机票。", "Wǒ mǎi le yì zhāng jī piào.", "I bought a plane ticket."],
  [366, "间", "measure word for rooms", "这是一间教室。", "Zhè shì yì jiān jiào shì.", "This is one classroom."],
  [372, "进来", "to come in", "请进来。", "Qǐng jìn lái.", "Please come in."],
  [373, "进去", "to go in", "我们进去吧。", "Wǒ men jìn qù ba.", "Let's go in."],
  [375, "酒店", "hotel", "酒店离机场很近。", "Jiǔ diàn lí jī chǎng hěn jìn.", "The hotel is very close to the airport."],
  [379, "开学", "school starts", "明天开学。", "Míng tiān kāi xué.", "School starts tomorrow."],
  [380, "考", "to take an exam; to test", "我明天考中文。", "Wǒ míng tiān kǎo Zhōng wén.", "I have a Chinese exam tomorrow."],
  [386, "快要", "almost; soon", "火车快要到了。", "Huǒ chē kuài yào dào le.", "The train is almost here."],
  [387, "篮球", "basketball", "我喜欢打篮球。", "Wǒ xǐ huan dǎ lán qiú.", "I like playing basketball."],
  [390, "里面", "inside", "书在书包里面。", "Shū zài shū bāo lǐ miàn.", "The book is inside the schoolbag."],
  [393, "路上", "on the road; on the way", "我在路上。", "Wǒ zài lù shang.", "I am on the way."],
  [395, "绿茶", "green tea", "爸爸喜欢喝绿茶。", "Bà ba xǐ huan hē lǜ chá.", "Dad likes drinking green tea."],
  [396, "绿色", "green color", "这个杯子是绿色的。", "Zhè ge bēi zi shì lǜ sè de.", "This cup is green."],
  [398, "没意思", "boring; not interesting", "这个电影没意思。", "Zhè ge diàn yǐng méi yì si.", "This movie is boring."],
  [401, "门口", "doorway; entrance", "我在学校门口等你。", "Wǒ zài xué xiào mén kǒu děng nǐ.", "I am waiting for you at the school gate."],
  [402, "门票", "admission ticket", "门票不贵。", "Mén piào bú guì.", "The ticket is not expensive."],
  [403, "面1", "side; surface; suffix for location words", "外面下雨了。", "Wài miàn xià yǔ le.", "It is raining outside."],
  [404, "名", "measure word for people", "这是一名老师。", "Zhè shì yì míng lǎo shī.", "This is one teacher."],
  [406, "那么", "so; that way", "他没有那么忙。", "Tā méi yǒu nà me máng.", "He is not that busy."],
  [407, "那样", "that kind; that way", "不要那样说。", "Bú yào nà yàng shuō.", "Do not say it that way."],
  [408, "奶茶", "milk tea", "我想喝奶茶。", "Wǒ xiǎng hē nǎi chá.", "I want to drink milk tea."],
  [410, "男孩儿", "boy", "那个男孩儿在跑步。", "Nà ge nán háir zài pǎo bù.", "That boy is running."],
  [412, "女孩儿", "girl", "那个女孩儿喜欢跳舞。", "Nà ge nǚ háir xǐ huan tiào wǔ.", "That girl likes dancing."],
  [414, "跑", "to run", "他跑得很快。", "Tā pǎo de hěn kuài.", "He runs very fast."],
  [421, "球", "ball", "这个球是红色的。", "Zhè ge qiú shì hóng sè de.", "This ball is red."],
  [423, "肉", "meat", "我不吃肉。", "Wǒ bù chī ròu.", "I do not eat meat."],
  [424, "商场", "shopping mall", "商场里有很多人。", "Shāng chǎng lǐ yǒu hěn duō rén.", "There are many people in the mall."],
  [425, "上来", "to come up", "请上来。", "Qǐng shàng lái.", "Please come up."],
  [426, "上面", "above; on top", "书在桌子上面。", "Shū zài zhuō zi shàng miàn.", "The book is on the table."],
  [427, "上去", "to go up", "我们上去看看。", "Wǒ men shàng qù kàn kan.", "Let's go up and have a look."],
  [431, "时", "time; when", "那时我在学校。", "Nà shí wǒ zài xué xiào.", "At that time, I was at school."],
  [433, "手", "hand", "我的手很冷。", "Wǒ de shǒu hěn lěng.", "My hands are cold."],
  [435, "书包", "schoolbag", "我的书包很大。", "Wǒ de shū bāo hěn dà.", "My schoolbag is big."],
  [438, "虽然", "although", "虽然下雨，我还要出门。", "Suī rán xià yǔ, wǒ hái yào chū mén.", "Although it is raining, I still need to go out."],
  [441, "踢", "to kick", "他喜欢踢足球。", "Tā xǐ huan tī zú qiú.", "He likes playing soccer."],
  [445, "头", "head", "我头疼。", "Wǒ tóu téng.", "My head hurts."],
  [446, "外国", "foreign country", "他在外国工作。", "Tā zài wài guó gōng zuò.", "He works in a foreign country."],
  [447, "外面", "outside", "外面很冷。", "Wài miàn hěn lěng.", "It is cold outside."],
  [450, "往", "toward", "请往前走。", "Qǐng wǎng qián zǒu.", "Please walk forward."],
  [451, "网上", "online; on the internet", "我在网上买书。", "Wǒ zài wǎng shang mǎi shū.", "I buy books online."],
  [452, "忘", "to forget", "我忘了他的名字。", "Wǒ wàng le tā de míng zi.", "I forgot his name."],
  [458, "下来", "to come down", "请下来。", "Qǐng xià lái.", "Please come down."],
  [459, "下面", "below; underneath", "猫在桌子下面。", "Māo zài zhuō zi xià miàn.", "The cat is under the table."],
  [460, "下去", "to go down", "我们下去吧。", "Wǒ men xià qù ba.", "Let's go down."],
  [461, "小孩儿", "child", "小孩儿在玩球。", "Xiǎo háir zài wán qiú.", "The child is playing with a ball."],
  [462, "小时候", "childhood; when young", "我小时候住在北京。", "Wǒ xiǎo shí hou zhù zài Běi jīng.", "I lived in Beijing when I was a child."],
  [465, "姓名", "full name", "请写你的姓名。", "Qǐng xiě nǐ de xìng míng.", "Please write your full name."],
  [469, "药店", "pharmacy", "药店在医院旁边。", "Yào diàn zài yī yuàn páng biān.", "The pharmacy is next to the hospital."],
  [477, "游", "to swim; to move through water", "鱼在水里游。", "Yú zài shuǐ lǐ yóu.", "The fish swims in the water."],
  [479, "有意思", "interesting", "这本书很有意思。", "Zhè běn shū hěn yǒu yì si.", "This book is very interesting."],
  [480, "有时", "sometimes", "我有时坐公交车上学。", "Wǒ yǒu shí zuò gōng jiāo chē shàng xué.", "I sometimes take the bus to school."],
  [481, "右", "right side", "请看右边。", "Qǐng kàn yòu biān.", "Please look to the right."],
  [488, "这么", "so; this much", "这本书这么贵。", "Zhè běn shū zhè me guì.", "This book is this expensive."],
  [489, "这样", "this way; like this", "这样做不错。", "Zhè yàng zuò bú cuò.", "Doing it this way is pretty good."],
  [492, "周", "week", "下周我去北京。", "Xià zhōu wǒ qù Běi jīng.", "I am going to Beijing next week."],
  [496, "走路", "to walk", "我每天走路去学校。", "Wǒ měi tiān zǒu lù qù xué xiào.", "I walk to school every day."],
  [497, "足球", "soccer; football", "他在踢足球。", "Tā zài tī zú qiú.", "He is playing soccer."],
  [499, "左", "left side", "请往左走。", "Qǐng wǎng zuǒ zǒu.", "Please go left."],
];

function hasToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(value);
}

function requiredSourceParts(row) {
  return [row.simplified].filter(Boolean);
}

async function loadClassicExamples() {
  const byLevel = new Map();
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const filePath = path.join(ROOT, `config/hsk-classic-hsk${level}-examples.json`);
    byLevel.set(level, JSON.parse(await fs.readFile(filePath, "utf8")));
  }
  return byLevel;
}

function findClassicExample(classicExamples, reuse) {
  const level = Number(reuse.first_classic_level);
  const order = Number(reuse.first_classic_order);
  const sourceWord = reuse.first_classic_source_word || reuse.hsk3_simplified;
  const data = classicExamples.get(level) ?? {};
  return data[`${order}:${sourceWord}`] ?? data[sourceWord] ?? data[reuse.hsk3_simplified] ?? null;
}

const sourceRows = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const reuseRows = JSON.parse(await fs.readFile(reuseMapPath, "utf8")).rows;
const reuseByOrder = new Map(reuseRows.map((row) => [row.hsk3_order, row]));
const classicExamples = await loadClassicExamples();
const manualByOrder = new Map(manualRows.map(([order, sourceWord, gloss, example_zh, example_pinyin, example_en]) => [
  order,
  { sourceWord, gloss, example_zh, example_pinyin, example_en },
]));

const examples = {};
const glosses = {};
const provenance = [];
const blockers = [];

for (const sourceRow of sourceRows) {
  const hskKey = sourceRow.hsk_key ?? `${sourceRow.hsk_order}:${sourceRow.source_word}`;
  const manual = manualByOrder.get(sourceRow.hsk_order);
  const reuse = reuseByOrder.get(sourceRow.hsk_order);
  let value = null;
  let gloss = "";
  let source = "";

  if (manual) {
    if (manual.sourceWord !== sourceRow.source_word) {
      blockers.push({
        order: sourceRow.hsk_order,
        hsk_key: hskKey,
        issue: "manual_source_word_mismatch",
        expected: sourceRow.source_word,
        actual: manual.sourceWord,
      });
    }
    value = {
      example_zh: manual.example_zh,
      example_pinyin: manual.example_pinyin,
      example_en: manual.example_en,
    };
    gloss = manual.gloss;
    source = "hsk3_manual";
  } else if (reuse?.classic_reuse_allowed) {
    const classic = findClassicExample(classicExamples, reuse);
    if (classic) {
      value = {
        example_zh: classic.example_zh,
        example_pinyin: classic.example_pinyin,
        example_en: classic.example_en,
      };
      gloss = reuse.first_classic_en || "";
      source = `classic_hsk${reuse.first_classic_level}:${reuse.first_classic_order}:${reuse.first_classic_source_word}`;
    }
  }

  if (!value) {
    blockers.push({ order: sourceRow.hsk_order, hsk_key: hskKey, word: sourceRow.source_word, issue: "missing_example" });
    continue;
  }
  if (!gloss) {
    blockers.push({ order: sourceRow.hsk_order, hsk_key: hskKey, word: sourceRow.source_word, issue: "missing_gloss" });
  }
  if (!requiredSourceParts(sourceRow).every((part) => value.example_zh.includes(part))) {
    blockers.push({
      order: sourceRow.hsk_order,
      hsk_key: hskKey,
      word: sourceRow.source_word,
      issue: "example_missing_source_word",
      example_zh: value.example_zh,
    });
  }
  if (hasToneNumber(value.example_pinyin)) {
    blockers.push({
      order: sourceRow.hsk_order,
      hsk_key: hskKey,
      word: sourceRow.source_word,
      issue: "tone_number_pinyin",
      example_pinyin: value.example_pinyin,
    });
  }
  examples[hskKey] = value;
  glosses[hskKey] = gloss;
  provenance.push({
    order: sourceRow.hsk_order,
    hsk_key: hskKey,
    source_word: sourceRow.source_word,
    simplified: sourceRow.simplified,
    source,
    reuse_class: reuse?.classic_reuse_class ?? "",
  });
}

const sourceOrders = new Set(sourceRows.map((row) => row.hsk_order));
for (const order of manualByOrder.keys()) {
  if (!sourceOrders.has(order)) blockers.push({ order, issue: "manual_order_not_in_hsk3_source" });
}

if (Object.keys(examples).length !== sourceRows.length) {
  blockers.push({ issue: "example_count_mismatch", expected: sourceRows.length, actual: Object.keys(examples).length });
}
if (Object.keys(glosses).length !== sourceRows.length) {
  blockers.push({ issue: "gloss_count_mismatch", expected: sourceRows.length, actual: Object.keys(glosses).length });
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  examples: Object.keys(examples).length,
  glosses: Object.keys(glosses).length,
  manual_examples: provenance.filter((row) => row.source === "hsk3_manual").length,
  classic_reuse_examples: provenance.filter((row) => row.source.startsWith("classic_hsk")).length,
  blockers,
  provenance,
};

await fs.writeFile(examplesOut, `${JSON.stringify(examples, null, 2)}\n`);
await fs.writeFile(glossesOut, `${JSON.stringify(glosses, null, 2)}\n`);
await fs.mkdir(path.dirname(reportOut), { recursive: true });
await fs.writeFile(reportOut, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      examples: report.examples,
      glosses: report.glosses,
      manual_examples: report.manual_examples,
      classic_reuse_examples: report.classic_reuse_examples,
      blockers: blockers.length,
      output_examples: path.relative(ROOT, examplesOut),
      output_glosses: path.relative(ROOT, glossesOut),
      report: path.relative(ROOT, reportOut),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
