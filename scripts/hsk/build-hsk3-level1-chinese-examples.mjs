import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_1_300_v1";
const sourcePath = path.join(ROOT, "outputs/hsk/source/hsk3_level_1_300_v1.source.json");
const reuseMapPath = path.join(ROOT, "outputs/hsk/qa/hsk3_level_1_300_v1_classic_reuse_map_20260604.json");
const examplesOut = path.join(ROOT, "config/hsk3-level1-examples.json");
const glossesOut = path.join(ROOT, "config/hsk3-level1-en-glosses.json");
const reportOut = path.join(ROOT, "outputs/hsk/qa/hsk3_level_1_300_v1_chinese_examples_build_20260604.json");

const manualRows = [
  ["白天", "daytime", "白天我在学校学习。", "Bái tiān wǒ zài xué xiào xué xí.", "I study at school during the day."],
  ["边", "side; edge", "书在桌子旁边。", "Shū zài zhuō zi páng biān.", "The book is beside the table."],
  ["病", "illness; to be ill", "他生病了。", "Tā shēng bìng le.", "He is ill."],
  ["不要", "do not; do not want", "不要喝太多咖啡。", "Bú yào hē tài duō kā fēi.", "Do not drink too much coffee."],
  ["唱", "to sing", "妹妹喜欢唱中文歌。", "Mèi mei xǐ huan chàng Zhōng wén gē.", "My younger sister likes singing Chinese songs."],
  ["车", "car; vehicle", "门口有一辆车。", "Mén kǒu yǒu yí liàng chē.", "There is a car at the door."],
  ["大学", "university", "哥哥在大学学习。", "Gē ge zài dà xué xué xí.", "My older brother studies at university."],
  ["大学生", "university student", "她是大学生。", "Tā shì dà xué shēng.", "She is a university student."],
  ["第", "ordinal prefix", "这是第一课。", "Zhè shì dì yī kè.", "This is lesson one."],
  ["店", "shop; store", "这家店很小。", "Zhè jiā diàn hěn xiǎo.", "This shop is small."],
  ["电话", "telephone; phone call", "你的电话是多少？", "Nǐ de diàn huà shì duō shao?", "What is your phone number?"],
  ["电影院", "movie theater", "电影院在学校旁边。", "Diàn yǐng yuàn zài xué xiào páng biān.", "The movie theater is next to the school."],
  ["读书", "to read; to study", "孩子在房间里读书。", "Hái zi zài fáng jiān lǐ dú shū.", "The child is reading in the room."],
  ["饭", "meal; cooked rice", "我正在吃饭。", "Wǒ zhèng zài chī fàn.", "I am eating a meal."],
  ["饭店", "restaurant; hotel", "这家饭店很有名。", "Zhè jiā fàn diàn hěn yǒu míng.", "This restaurant is very famous."],
  ["歌", "song", "这首歌很好听。", "Zhè shǒu gē hěn hǎo tīng.", "This song sounds nice."],
  ["国", "country; nation", "中国是一个大国。", "Zhōng guó shì yí ge dà guó.", "China is a large country."],
  ["还", "still; also", "我还想喝茶。", "Wǒ hái xiǎng hē chá.", "I still want to drink tea."],
  ["汉字", "Chinese character", "这个汉字不难。", "Zhè ge Hàn zì bù nán.", "This Chinese character is not difficult."],
  ["好看", "good-looking; nice to look at", "这张照片很好看。", "Zhè zhāng zhào piàn hěn hǎo kàn.", "This photo looks nice."],
  ["好听", "pleasant to hear", "这首歌很好听。", "Zhè shǒu gē hěn hǎo tīng.", "This song sounds nice."],
  ["好玩儿", "fun; amusing", "这个游戏很好玩儿。", "Zhè ge yóu xì hěn hǎo wánr.", "This game is fun."],
  ["后", "back; after; behind", "学校后边有公园。", "Xué xiào hòu bian yǒu gōng yuán.", "There is a park behind the school."],
  ["火车", "train", "我坐火车去北京。", "Wǒ zuò huǒ chē qù Běi jīng.", "I take the train to Beijing."],
  ["家人", "family member; family", "我的家人都在北京。", "Wǒ de jiā rén dōu zài Běi jīng.", "My family are all in Beijing."],
  ["见", "to see; to meet", "我明天见老师。", "Wǒ míng tiān jiàn lǎo shī.", "I will meet the teacher tomorrow."],
  ["今年", "this year", "今年我学习中文。", "Jīn nián wǒ xué xí Zhōng wén.", "This year I am studying Chinese."],
  ["开车", "to drive a car", "爸爸每天开车上班。", "Bà ba měi tiān kāi chē shàng bān.", "Dad drives to work every day."],
  ["看病", "to see a doctor", "我明天去医院看病。", "Wǒ míng tiān qù yī yuàn kàn bìng.", "I will go to the hospital to see a doctor tomorrow."],
  ["没事", "it is nothing; to be fine", "我没事，你别担心。", "Wǒ méi shì, nǐ bié dān xīn.", "I am fine; do not worry."],
  ["没有", "not have; there is not", "我没有手机。", "Wǒ méi yǒu shǒu jī.", "I do not have a phone."],
  ["们", "plural suffix for people", "老师们在办公室。", "Lǎo shī men zài bàn gōng shì.", "The teachers are in the office."],
  ["面条儿", "noodles", "我中午吃面条儿。", "Wǒ zhōng wǔ chī miàn tiáor.", "I eat noodles at noon."],
  ["明年", "next year", "明年我去中国。", "Míng nián wǒ qù Zhōng guó.", "Next year I will go to China."],
  ["哪个", "which one", "你喜欢哪个杯子？", "Nǐ xǐ huan nǎ ge bēi zi?", "Which cup do you like?"],
  ["哪里", "where", "你住在哪里？", "Nǐ zhù zài nǎ lǐ?", "Where do you live?"],
  ["哪儿", "where", "你去哪儿？", "Nǐ qù nǎr?", "Where are you going?"],
  ["哪些", "which; which ones", "哪些书是你的？", "Nǎ xiē shū shì nǐ de?", "Which books are yours?"],
  ["那边", "over there; that side", "商店在那边。", "Shāng diàn zài nà biān.", "The shop is over there."],
  ["那个", "that one", "那个学生是我朋友。", "Nà ge xué sheng shì wǒ péng you.", "That student is my friend."],
  ["那里", "there", "老师在那里。", "Lǎo shī zài nà lǐ.", "The teacher is there."],
  ["那儿", "there", "我朋友在那儿。", "Wǒ péng you zài nàr.", "My friend is there."],
  ["那些", "those", "那些苹果很新鲜。", "Nà xiē píng guǒ hěn xīn xiān.", "Those apples are fresh."],
  ["男", "male; man", "这个孩子是男的。", "Zhè ge hái zi shì nán de.", "This child is male."],
  ["男朋友", "boyfriend", "她的男朋友会开车。", "Tā de nán péng you huì kāi chē.", "Her boyfriend can drive."],
  ["你好", "hello", "你好，我叫小李。", "Nǐ hǎo, wǒ jiào Xiǎo Lǐ.", "Hello, my name is Xiao Li."],
  ["你们", "you; you all", "你们今天上课吗？", "Nǐ men jīn tiān shàng kè ma?", "Do you have class today?"],
  ["女", "female; woman", "她是女医生。", "Tā shì nǚ yī shēng.", "She is a female doctor."],
  ["女朋友", "girlfriend", "他的女朋友喜欢音乐。", "Tā de nǚ péng you xǐ huan yīn yuè.", "His girlfriend likes music."],
  ["前", "front; before", "学校前边有一家书店。", "Xué xiào qián bian yǒu yì jiā shū diàn.", "There is a bookstore in front of the school."],
  ["请问", "excuse me; may I ask", "请问，洗手间在哪儿？", "Qǐng wèn, xǐ shǒu jiān zài nǎr?", "Excuse me, where is the restroom?"],
  ["上课", "to attend class; to start class", "我们八点上课。", "Wǒ men bā diǎn shàng kè.", "We have class at eight."],
  ["上学", "to go to school", "孩子们每天上学。", "Hái zi men měi tiān shàng xué.", "The children go to school every day."],
  ["事", "matter; thing", "我今天有很多事。", "Wǒ jīn tiān yǒu hěn duō shì.", "I have many things to do today."],
  ["书店", "bookstore", "书店在电影院旁边。", "Shū diàn zài diàn yǐng yuàn páng biān.", "The bookstore is next to the movie theater."],
  ["睡", "to sleep", "孩子已经睡了。", "Hái zi yǐ jīng shuì le.", "The child is already asleep."],
  ["说", "to speak; to say", "他说中文说得很好。", "Tā shuō Zhōng wén shuō de hěn hǎo.", "He speaks Chinese very well."],
  ["他们", "they; them (male or mixed)", "他们在教室里。", "Tā men zài jiào shì lǐ.", "They are in the classroom."],
  ["它们", "they; them (non-human)", "这些猫很小，它们很可爱。", "Zhè xiē māo hěn xiǎo, tā men hěn kě ài.", "These cats are small; they are cute."],
  ["她们", "they; them (female)", "她们都是大学生。", "Tā men dōu shì dà xué shēng.", "They are all university students."],
  ["天", "day; sky", "今天是星期天。", "Jīn tiān shì xīng qī tiān.", "Today is Sunday."],
  ["听见", "to hear", "我听见你的电话了。", "Wǒ tīng jiàn nǐ de diàn huà le.", "I heard your phone."],
  ["外边", "outside", "外边下雨了。", "Wài bian xià yǔ le.", "It is raining outside."],
  ["晚", "late; evening", "现在很晚了。", "Xiàn zài hěn wǎn le.", "It is very late now."],
  ["晚饭", "dinner", "晚饭我想吃米饭。", "Wǎn fàn wǒ xiǎng chī mǐ fàn.", "For dinner I want to eat rice."],
  ["午饭", "lunch", "午饭我们吃面条儿。", "Wǔ fàn wǒ men chī miàn tiáor.", "For lunch we eat noodles."],
  ["下班", "to get off work", "妈妈五点下班。", "Mā ma wǔ diǎn xià bān.", "Mom gets off work at five."],
  ["下课", "class is over; to finish class", "下课以后我去书店。", "Xià kè yǐ hòu wǒ qù shū diàn.", "After class I go to the bookstore."],
  ["小朋友", "child; little friend", "小朋友在公园玩儿。", "Xiǎo péng yǒu zài gōng yuán wánr.", "The children are playing in the park."],
  ["小学", "primary school", "我妹妹在小学上学。", "Wǒ mèi mei zài xiǎo xué shàng xué.", "My younger sister goes to primary school."],
  ["小学生", "primary school student", "他是小学生。", "Tā shì xiǎo xué shēng.", "He is a primary school student."],
  ["星期日", "Sunday", "星期日我不上课。", "Xīng qī rì wǒ bù shàng kè.", "I do not have class on Sunday."],
  ["星期天", "Sunday", "星期天我去看电影。", "Xīng qī tiān wǒ qù kàn diàn yǐng.", "On Sunday I go to see a movie."],
  ["学", "to learn; to study", "我学中文。", "Wǒ xué Zhōng wén.", "I study Chinese."],
  ["一半", "half", "我吃了一半米饭。", "Wǒ chī le yí bàn mǐ fàn.", "I ate half of the rice."],
  ["一下", "a short while; once", "请等一下。", "Qǐng děng yí xià.", "Please wait a moment."],
  ["一点儿", "a little", "我有一点儿累。", "Wǒ yǒu yì diǎnr lèi.", "I am a little tired."],
  ["一些", "some; a few", "我买了一些苹果。", "Wǒ mǎi le yì xiē píng guǒ.", "I bought some apples."],
  ["有的", "some; certain", "有的学生喜欢唱歌。", "Yǒu de xué sheng xǐ huan chàng gē.", "Some students like singing."],
  ["有点儿", "a little; somewhat", "今天有点儿冷。", "Jīn tiān yǒu diǎnr lěng.", "Today is a little cold."],
  ["有些", "some", "有些书在老师那里。", "Yǒu xiē shū zài lǎo shī nà lǐ.", "Some books are with the teacher."],
  ["雨", "rain", "今天有雨。", "Jīn tiān yǒu yǔ.", "There is rain today."],
  ["早", "early; morning", "他每天早上很早起床。", "Tā měi tiān zǎo shang hěn zǎo qǐ chuáng.", "He gets up early every morning."],
  ["早饭", "breakfast", "早饭我喝牛奶。", "Zǎo fàn wǒ hē niú nǎi.", "For breakfast I drink milk."],
  ["怎么", "how", "你怎么去学校？", "Nǐ zěn me qù xué xiào?", "How do you go to school?"],
  ["字", "character; written word", "他的字很漂亮。", "Tā de zì hěn piào liang.", "His handwriting is beautiful."],
  ["这边", "this side; over here", "请来这边。", "Qǐng lái zhè biān.", "Please come this way."],
  ["这个", "this one", "这个包子很好吃。", "Zhè ge bāo zi hěn hǎo chī.", "This bun is tasty."],
  ["这里", "here", "这里是我的学校。", "Zhè lǐ shì wǒ de xué xiào.", "This is my school."],
  ["这儿", "here", "这儿有一家饭店。", "Zhèr yǒu yì jiā fàn diàn.", "There is a restaurant here."],
  ["这些", "these", "这些汉字很好写。", "Zhè xiē Hàn zì hěn hǎo xiě.", "These Chinese characters are easy to write."],
  ["只", "classifier for animals or one of a pair", "桌子下有一只猫。", "Zhuō zi xià yǒu yì zhī māo.", "There is a cat under the table."],
  ["中学", "middle school; secondary school", "哥哥在中学学习。", "Gē ge zài zhōng xué xué xí.", "My older brother studies at middle school."],
  ["中学生", "middle school student", "她是中学生。", "Tā shì zhōng xué shēng.", "She is a middle school student."],
  ["做饭", "to cook; to prepare a meal", "爸爸在厨房做饭。", "Bà ba zài chú fáng zuò fàn.", "Dad is cooking in the kitchen."]
];

function hasToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(value);
}

function requiredSourceParts(simplified) {
  return String(simplified).split("…").filter(Boolean);
}

const sourceRows = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const reuseRows = JSON.parse(await fs.readFile(reuseMapPath, "utf8")).rows;
const reuseByWord = new Map(reuseRows.map((row) => [row.hsk3_simplified, row]));
const classicExamples = await (async () => {
  const merged = {};
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const filePath = path.join(ROOT, `config/hsk-classic-hsk${level}-examples.json`);
    const data = JSON.parse(await fs.readFile(filePath, "utf8"));
    for (const [key, value] of Object.entries(data)) {
      const simplified = key.replace(/^\d+:/u, "");
      if (!merged[simplified]) merged[simplified] = { ...value, classic_key: key, classic_level: level };
    }
  }
  return merged;
})();
const manualByWord = new Map(manualRows.map(([word, gloss, example_zh, example_pinyin, example_en]) => [word, { gloss, example_zh, example_pinyin, example_en }]));

const examples = {};
const glosses = {};
const provenance = [];
const blockers = [];

for (const sourceRow of sourceRows) {
  const word = sourceRow.simplified;
  const manual = manualByWord.get(word);
  const reuse = reuseByWord.get(word);
  let value = null;
  let gloss = "";
  let source = "";

  if (manual) {
    value = {
      example_zh: manual.example_zh,
      example_pinyin: manual.example_pinyin,
      example_en: manual.example_en,
    };
    gloss = manual.gloss;
    source = "hsk3_manual";
  } else if (reuse?.classic_reuse_allowed && classicExamples[word]) {
    const classic = classicExamples[word];
    value = {
      example_zh: classic.example_zh,
      example_pinyin: classic.example_pinyin,
      example_en: classic.example_en,
    };
    gloss = reuse.first_classic_en || "";
    source = `classic_hsk${classic.classic_level}:${classic.classic_key}`;
  }

  if (!value) {
    blockers.push({ order: sourceRow.hsk_order, word, issue: "missing_example" });
    continue;
  }
  if (!gloss) {
    blockers.push({ order: sourceRow.hsk_order, word, issue: "missing_gloss" });
  }
  if (!requiredSourceParts(word).every((part) => value.example_zh.includes(part))) {
    blockers.push({ order: sourceRow.hsk_order, word, issue: "example_missing_source_word", example_zh: value.example_zh });
  }
  if (hasToneNumber(value.example_pinyin)) {
    blockers.push({ order: sourceRow.hsk_order, word, issue: "tone_number_pinyin", example_pinyin: value.example_pinyin });
  }
  examples[word] = value;
  glosses[word] = gloss;
  provenance.push({ order: sourceRow.hsk_order, word, source, reuse_class: reuse?.classic_reuse_class ?? "" });
}

const unknownManual = [...manualByWord.keys()].filter((word) => !sourceRows.some((row) => row.simplified === word));
for (const word of unknownManual) blockers.push({ word, issue: "manual_word_not_in_hsk3_source" });

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
