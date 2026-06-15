#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const jsonlPath = path.resolve("outputs/hsk", `${releaseId}.jsonl`);

const articlePatterns = {
  ES: /^(el|la|los|las|un|una)\b/i,
  "ES-419": /^(el|la|los|las|un|una)\b/i,
  FR: /^(?:(le|la|les|un|une|des)\b|l['’])/i,
  DE: /^(der|die|das|ein|eine)\b/i,
  IT: /^(?:(il|lo|la|gli|i|le|un|uno|una)\b|l['’]|un['’])/i,
  PT: /^(o|a|os|as|um|uma)\b/i,
  "PT-BR": /^(o|a|os|as|um|uma)\b/i,
  NL: /^(de|het|een)\b/i,
  SV: /^(en|ett)\b/i,
  NO: /^(en|et)\b/i,
  DA: /^(en|et)\b/i,
  RO: /^(un|o)\b/i,
};

// HSK1 rows where at least one article-language component is noun-like and should be checked.
// Proper nouns and uncountable-only rows such as Beijing, China, water, money and cooked rice
// are deliberately excluded.
const auditedWords = new Set([
  "爸爸",
  "杯子",
  "本",
  "菜",
  "出租车",
  "的",
  "点",
  "电脑",
  "电视",
  "电影",
  "东西",
  "儿子",
  "饭馆",
  "飞机",
  "分钟",
  "个",
  "工作",
  "狗",
  "火车站",
  "家",
  "块",
  "老师",
  "了",
  "妈妈",
  "吗",
  "猫",
  "名字",
  "年",
  "呢",
  "女儿",
  "朋友",
  "苹果",
  "人",
  "日",
  "商店",
  "书",
  "同学",
  "先生",
  "小姐",
  "星期",
  "学生",
  "学校",
  "医生",
  "医院",
  "椅子",
  "月",
  "桌子",
  "字",
]);

const allowedBare = {
  ES: new Set(["de", "papá", "mamá", "un poco", "trabajar", "¿y...?"]),
  "ES-419": new Set(["de", "papá", "mamá", "un poco", "trabajar", "¿y...?"]),
  FR: new Set(["de", "papa", "maman", "un peu", "travailler", "monsieur", "mademoiselle", "et"]),
  DE: new Set(["von", "Papa", "Mama", "ein bisschen", "arbeiten", "und was ist mit"]),
  IT: new Set(["di", "papà", "mamma", "un po'", "lavorare", "e"]),
  PT: new Set(["de", "papá", "a mamã", "um pouco", "trabalhar", "e"]),
  "PT-BR": new Set(["de", "papai", "mamãe", "um pouco", "trabalhar", "e"]),
  NL: new Set(["van", "papa", "mama", "werken", "meneer", "en"]),
  SV: new Set(["-s", "klockan", "lite", "arbeta", "grönsaker", "saker", "människor", "då"]),
  NO: new Set(["klokken", "litt", "å jobbe", "arbeid", "saker", "folk", "genitiv", "da", "grønnsaker"]),
  DA: new Set([
    "papa",
    "mor",
    "klokken",
    "lidt",
    "at arbejde",
    "arbejde",
    "ting",
    "mennesker",
    "hr.",
    "frøken",
    "hvad med",
    "grøntsager",
  ]),
  RO: new Set(["tata", "mama", "ora", "puțin", "a lucra", "muncă", "televiziune", "mâncare", "oameni", "dar", "Luna"]),
};

function splitParts(value) {
  return String(value ?? "")
    .split(";")
    .map((part) => part.normalize("NFC").trim())
    .filter(Boolean);
}

const rows = (await fs.readFile(jsonlPath, "utf8")).trimEnd().split(/\r?\n/).map(JSON.parse);
const blockers = [];

for (const row of rows) {
  if (!auditedWords.has(row.simplified)) continue;
  for (const [language, articlePattern] of Object.entries(articlePatterns)) {
    const parts = splitParts(row[language]);
    for (const part of parts) {
      if (allowedBare[language]?.has(part)) continue;
      if (!articlePattern.test(part)) {
        blockers.push({
          order: row.hsk_order,
          simplified: row.simplified,
          language,
          part,
          value: row[language],
        });
      }
    }
  }
}

if (blockers.length) {
  console.error(`HSK article policy check failed: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 80)) {
    console.error(
      `${blocker.order}\t${blocker.simplified}\t${blocker.language}\t${blocker.part}\t${blocker.value}`
    );
  }
  if (blockers.length > 80) console.error(`... +${blockers.length - 80} more`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      audited_words: auditedWords.size,
      article_languages: Object.keys(articlePatterns).length,
      blockers: 0,
    },
    null,
    2
  )
);
