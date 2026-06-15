#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const releaseId = "hsk2_classic_level_4_600_v1";
const sourceRowsPath = path.resolve(`outputs/hsk/${releaseId}.jsonl`);
const hskAcademyPath = path.resolve("outputs/hsk/source/hsk2_classic_level_4_hskacademy_reference.html");
const examplesOutPath = path.resolve("config/hsk-classic-hsk4-examples.json");

const manualExamples = {
  保证: ["我保证，以后不迟到了。", "Wǒ bǎo zhèng, yǐ hòu bù chí dào le.", "I promise I will not be late again."],
  本来: ["我本来要去看演出，但是突然有事不能去了。", "Wǒ běn lái yào qù kàn yǎn chū, dàn shì tū rán yǒu shì bù néng qù le.", "I was going to watch the performance, but something suddenly came up."],
  不得不: ["外面下大雨，我不得不留在家里。", "Wài miàn xià dà yǔ, wǒ bù dé bù liú zài jiā lǐ.", "It is raining hard outside, so I have to stay at home."],
  吃惊: ["听到这个消息，他很吃惊。", "Tīng dào zhè ge xiāo xi, tā hěn chī jīng.", "He was surprised to hear the news."],
  出生: ["我出生在一个小城市。", "Wǒ chū shēng zài yí ge xiǎo chéng shì.", "I was born in a small city."],
  打扰: ["不好意思，打扰你一下。", "Bù hǎo yì si, dǎ rǎo nǐ yí xià.", "Excuse me for disturbing you for a moment."],
  厨房: ["水果刀在厨房里。", "Shuǐ guǒ dāo zài chú fáng lǐ.", "The fruit knife is in the kitchen."],
  答案: ["你的答案很正确。", "Nǐ de dá àn hěn zhèng què.", "Your answer is correct."],
  刀: ["水果刀在厨房里。", "Shuǐ guǒ dāo zài chú fáng lǐ.", "The fruit knife is in the kitchen."],
  对于: ["对于这个问题，我有不同看法。", "Duì yú zhè ge wèn tí, wǒ yǒu bù tóng kàn fǎ.", "I have a different view on this question."],
  而: ["这件衣服便宜而漂亮。", "Zhè jiàn yī fu pián yi ér piào liang.", "This piece of clothing is cheap and pretty."],
  得: ["明天要考试，我得早点睡。", "Míng tiān yào kǎo shì, wǒ děi zǎo diǎn shuì.", "I have an exam tomorrow, so I need to sleep early."],
  等: ["桌上有苹果、香蕉等水果。", "Zhuō shang yǒu píng guǒ, xiāng jiāo děng shuǐ guǒ.", "There are fruits such as apples and bananas on the table."],
  胳膊: ["他的胳膊有点疼。", "Tā de gē bo yǒu diǎn téng.", "His arm hurts a little."],
  共同: ["我们有一个共同的目标。", "Wǒ men yǒu yí ge gòng tóng de mù biāo.", "We have a common goal."],
  逛: ["周末我们去商场逛逛吧。", "Zhōu mò wǒ men qù shāng chǎng guàng guang ba.", "Let us go browse around the mall this weekend."],
  规定: ["学校有自己的规定。", "Xué xiào yǒu zì jǐ de guī dìng.", "The school has its own rules."],
  国籍: ["请在表格上填写国籍。", "Qǐng zài biǎo gé shàng tián xiě guó jí.", "Please fill in your nationality on the form."],
  国际: ["这是一次国际会议。", "Zhè shì yí cì guó jì huì yì.", "This is an international meeting."],
  果汁: ["我想喝一杯果汁。", "Wǒ xiǎng hē yì bēi guǒ zhī.", "I would like to drink a glass of juice."],
  感情: ["他们之间的感情很好。", "Tā men zhī jiān de gǎn qíng hěn hǎo.", "The relationship between them is very good."],
  过程: ["学习的过程很重要。", "Xué xí de guò chéng hěn zhòng yào.", "The process of learning is important."],
  害羞: ["她第一次上台，有点害羞。", "Tā dì yī cì shàng tái, yǒu diǎn hài xiū.", "She was a little shy the first time she went on stage."],
  寒假: ["寒假我想去南方旅行。", "Hán jià wǒ xiǎng qù nán fāng lǚ xíng.", "I want to travel south during winter vacation."],
  好处: ["多读书有很多好处。", "Duō dú shū yǒu hěn duō hǎo chu.", "Reading more has many benefits."],
  号码: ["请把你的电话号码给我。", "Qǐng bǎ nǐ de diàn huà hào mǎ gěi wǒ.", "Please give me your phone number."],
  合格: ["这件产品质量合格。", "Zhè jiàn chǎn pǐn zhì liàng hé gé.", "This product meets the quality standard."],
  合适: ["这双鞋很合适。", "Zhè shuāng xié hěn hé shì.", "This pair of shoes fits well."],
  厚: ["这本书很厚。", "Zhè běn shū hěn hòu.", "This book is thick."],
  后悔: ["我后悔没有早点告诉你。", "Wǒ hòu huǐ méi yǒu zǎo diǎn gào sù nǐ.", "I regret not telling you earlier."],
  积极: ["他学习中文很积极。", "Tā xué xí Zhōng wén hěn jī jí.", "He studies Chinese actively."],
  既然: ["既然你来了，就一起吃饭吧。", "Jì rán nǐ lái le, jiù yì qǐ chī fàn ba.", "Since you are here, let us eat together."],
  记者: ["记者正在采访校长。", "Jì zhě zhèng zài cǎi fǎng xiào zhǎng.", "The reporter is interviewing the principal."],
  交通: ["这里的交通很方便。", "Zhè lǐ de jiāo tōng hěn fāng biàn.", "Transportation here is convenient."],
  郊区: ["他住在城市的郊区。", "Tā zhù zài chéng shì de jiāo qū.", "He lives in the suburbs of the city."],
  禁止: ["这里禁止吸烟。", "Zhè lǐ jìn zhǐ xī yān.", "Smoking is prohibited here."],
  烤鸭: ["北京烤鸭很有名。", "Běi jīng kǎo yā hěn yǒu míng.", "Beijing roast duck is famous."],
  例如: ["我喜欢运动，例如跑步和游泳。", "Wǒ xǐ huan yùn dòng, lì rú pǎo bù hé yóu yǒng.", "I like sports, for example running and swimming."],
  秒: ["请等我十秒。", "Qǐng děng wǒ shí miǎo.", "Please wait for me for ten seconds."],
  能力: ["他的工作能力很强。", "Tā de gōng zuò néng lì hěn qiáng.", "His work ability is strong."],
  排队: ["买票的人正在排队。", "Mǎi piào de rén zhèng zài pái duì.", "The people buying tickets are standing in line."],
  普遍: ["这个问题很普遍。", "Zhè ge wèn tí hěn pǔ biàn.", "This problem is common."],
  其次: ["首先要安全，其次要快。", "Shǒu xiān yào ān quán, qí cì yào kuài.", "Safety comes first, and speed comes second."],
  其中: ["我们班有二十个学生，其中五个来自国外。", "Wǒ men bān yǒu èr shí ge xué sheng, qí zhōng wǔ ge lái zì guó wài.", "There are twenty students in our class, five of whom come from abroad."],
  确实: ["这个办法确实不错。", "Zhè ge bàn fǎ què shí bú cuò.", "This method is indeed good."],
  收入: ["他的收入比以前高了。", "Tā de shōu rù bǐ yǐ qián gāo le.", "His income is higher than before."],
  然而: ["我花了很多时间看这本书，然而还没看完。", "Wǒ huā le hěn duō shí jiān kàn zhè běn shū, rán ér hái méi kàn wán.", "I spent a lot of time reading this book, but I still have not finished it."],
  失败: ["虽然经历过很多失败，我从不放弃。", "Suī rán jīng lì guò hěn duō shī bài, wǒ cóng bù fàng qì.", "Although I have experienced many failures, I never give up."],
  受不了: ["天气太热了，我受不了。", "Tiān qì tài rè le, wǒ shòu bù liǎo.", "The weather is too hot; I cannot stand it."],
  数量: ["报名的人数量很多。", "Bào míng de rén shù liàng hěn duō.", "The number of people signing up is large."],
  帅: ["他今天穿得很帅。", "Tā jīn tiān chuān de hěn shuài.", "He is dressed very handsomely today."],
  特点: ["这家饭馆的特点是菜很新鲜。", "Zhè jiā fàn guǎn de tè diǎn shì cài hěn xīn xiān.", "The feature of this restaurant is that the food is fresh."],
  同时: ["他一边听音乐，同时写作业。", "Tā yì biān tīng yīn yuè, tóng shí xiě zuò yè.", "He listens to music while doing homework."],
  危险: ["晚上一个人爬山很危险。", "Wǎn shang yí ge rén pá shān hěn wēi xiǎn.", "Climbing a mountain alone at night is dangerous."],
  网站: ["这个网站上有很多中文资料。", "Zhè ge wǎng zhàn shàng yǒu hěn duō Zhōng wén zī liào.", "There are many Chinese materials on this website."],
  无聊: ["这个节目有点无聊。", "Zhè ge jié mù yǒu diǎn wú liáo.", "This program is a little boring."],
  小伙子: ["那个小伙子很热情。", "Nà ge xiǎo huǒ zi hěn rè qíng.", "That young man is very warm-hearted."],
  信息: ["请把你的联系信息发给我。", "Qǐng bǎ nǐ de lián xì xìn xī fā gěi wǒ.", "Please send me your contact information."],
  学期: ["这个学期我选了很多课，包括艺术、历史和经济。", "Zhè ge xué qī wǒ xuǎn le hěn duō kè, bāo kuò yì shù, lì shǐ hé jīng jì.", "This semester I took many courses, including art, history and economics."],
  严重: ["他的病很严重。", "Tā de bìng hěn yán zhòng.", "His illness is serious."],
  页: ["请翻到第十页。", "Qǐng fān dào dì shí yè.", "Please turn to page ten."],
  因此: ["他病了，因此没来上课。", "Tā bìng le, yīn cǐ méi lái shàng kè.", "He was sick, so he did not come to class."],
  引起: ["这件事引起了大家的不满。", "Zhè jiàn shì yǐn qǐ le dà jiā de bù mǎn.", "This matter made everyone unhappy."],
  应聘: ["她想应聘这份工作。", "Tā xiǎng yìng pìn zhè fèn gōng zuò.", "She wants to apply for this job."],
  由于: ["由于下雨，比赛推迟了。", "Yóu yú xià yǔ, bǐ sài tuī chí le.", "Because of the rain, the match was postponed."],
  增加: ["今年学生的数量增加了。", "Jīn nián xué sheng de shù liàng zēng jiā le.", "The number of students increased this year."],
  证明: ["事实证明他是对的。", "Shì shí zhèng míng tā shì duì de.", "The facts prove that he is right."],
  招聘: ["公司正在招聘新员工。", "Gōng sī zhèng zài zhāo pìn xīn yuán gōng.", "The company is hiring new employees."],
  直接: ["下班后，他直接回家了。", "Xià bān hòu, tā zhí jiē huí jiā le.", "After work, he went straight home."],
  植物: ["这种植物需要很多阳光。", "Zhè zhǒng zhí wù xū yào hěn duō yáng guāng.", "This kind of plant needs a lot of sunlight."],
  周围: ["学校周围有很多商店。", "Xué xiào zhōu wéi yǒu hěn duō shāng diàn.", "There are many shops around the school."],
};

const bannedExampleFragments = [
  "你本来说好要来的亚洲",
  "选男友的遍",
  "管理照",
  "今天是为我们的第一次演出",
  "常友好",
  "今年下午",
  "裤子当然觉得很合适",
];

function extractReactData(html) {
  const match = html.match(/window\.__REACT_DATA = (.*?);\s*<\/script>/su);
  if (!match) throw new Error("Missing HSK Academy React data");
  return JSON.parse(match[1]);
}

function scoreCandidate(word, sentence) {
  let score = sentence.hanzi.length;
  if (sentence.hanzi.startsWith(word)) score -= 5;
  if (sentence.def.length > 120) score += 25;
  if (/[0-9]/u.test(sentence.hanzi)) score += 5;
  return score;
}

function normalizeSentence(sentence) {
  return {
    example_zh: sentence.hanzi.replace(/\s+([。！？])/gu, "$1").replace(/\s+/gu, " ").trim(),
    example_pinyin: sentence.pinyinTone.trim(),
    example_en: sentence.def.trim().replace(/^she\b/u, "She"),
  };
}

async function main() {
  const [html, rowsText] = await Promise.all([
    fs.readFile(hskAcademyPath, "utf8"),
    fs.readFile(sourceRowsPath, "utf8"),
  ]);
  const rows = rowsText.trim().split("\n").map((line) => JSON.parse(line));
  const data = extractReactData(html);
  const examples = {};
  const report = {
    release_id: releaseId,
    generated_at: new Date().toISOString(),
    rows: rows.length,
    from_hskacademy_sentence_candidates: 0,
    manual_examples: 0,
    missing: [],
  };

  for (const row of rows) {
    const manual = manualExamples[row.simplified];
    if (manual) {
      examples[row.simplified] = {
        example_zh: manual[0],
        example_pinyin: manual[1],
        example_en: manual[2],
      };
      report.manual_examples += 1;
      continue;
    }

    const candidates = data.localizedSentences
      .filter((sentence) => sentence.hanzi.includes(row.simplified))
      .filter((sentence) => !bannedExampleFragments.some((fragment) => sentence.hanzi.includes(fragment)))
      .sort((a, b) => scoreCandidate(row.simplified, a) - scoreCandidate(row.simplified, b));
    if (!candidates.length) {
      report.missing.push({ order: row.hsk_order, simplified: row.simplified });
      continue;
    }
    examples[row.simplified] = normalizeSentence(candidates[0]);
    report.from_hskacademy_sentence_candidates += 1;
  }

  if (report.missing.length) {
    throw new Error(`Missing HSK4 examples for ${report.missing.length} rows: ${JSON.stringify(report.missing.slice(0, 20))}`);
  }

  await fs.writeFile(examplesOutPath, `${JSON.stringify(examples, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ examples: Object.keys(examples).length, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
