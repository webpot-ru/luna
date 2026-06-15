#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk2_classic_level_3_300_v1";
const HSK_LEVEL = 3;
const EXPECTED_ROWS = 300;
const OUTPUT_DIR = path.resolve("outputs/hsk");
const SOURCE_DIR = path.join(OUTPUT_DIR, "source");
const QA_DIR = path.join(OUTPUT_DIR, "qa");

const mitExclusivePath = path.join(SOURCE_DIR, "hsk2_classic_level_3_298_upstream.source.json");
const hewgillCumulativePath = path.join(SOURCE_DIR, "hsk2_classic_level_3_hewgill_cumulative_600.html");
const hskAcademyPath = path.join(SOURCE_DIR, "hsk2_classic_level_3_hskacademy_reference.html");
const allSetPath = path.join(SOURCE_DIR, "hsk2_classic_level_3_allset_exclusive_reference.html");
const canonicalOutPath = path.join(SOURCE_DIR, `${RELEASE_ID}.source.json`);
const overridesOutPath = path.resolve("config/hsk-classic-hsk3-card-overrides.json");
const examplesOutPath = path.resolve("config/hsk-classic-hsk3-examples.json");

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/gu, '"')
    .replace(/&#x27;/gu, "'")
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">");
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/gu, "")).trim();
}

function stripTraditionalNote(value) {
  return String(value).replace(/[（(][^)）]+[)）]/gu, "").trim();
}

function normalizePinyin(value) {
  return String(value).replace(/\blv4\b/giu, "lǜ").replace(/^è a$/iu, "è").trim();
}

function parseHskAcademyTiles(html) {
  const pattern =
    /<button id="(\d+)" class="hsk-tile">\s*<span class="hsk-tile-content hsk-simplified">\s*([^<]+?)\s*<\/span>\s*<span class="hsk-tile-content hsk-traditional">\s*([^<]+?)\s*<\/span>\s*<span class="hsk-tile-content hsk-pinyin">\s*([^<]+?)\s*<\/span>/gsu;
  return [...html.matchAll(pattern)].map((match) => ({
    hskacademy_id: Number(match[1]),
    simplified: match[2].trim(),
    traditional: stripTraditionalNote(match[3]),
    pinyin: normalizePinyin(match[4]),
  }));
}

function parseHskAcademyMeanings(html) {
  const pattern =
    /<td class="is-size-4">\s*<a[^\n]*\s*<span>([^<]+)<\/span><br\/>\s*([^<]+?)\s*<\/a>\s*<\/td>\s*<td>(.*?)<\/td>/gsu;
  return [...html.matchAll(pattern)].map((match) => ({
    simplified: match[1].trim(),
    pinyin: normalizePinyin(match[2]),
    meaning: stripTags(match[3]),
  }));
}

function parseHewgillRows(html) {
  const pattern =
    /<tr>\s*<td class="index">(\d+)<\/td>\s*<td class="char">([^<]+)<\/td>\s*<td class="pinyin"[^>]*>([^<]+)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gsu;
  return [...html.matchAll(pattern)].map((match) => ({
    hewgill_order: Number(match[1]),
    simplified: decodeEntities(match[2].trim()),
    pinyin_compact: decodeEntities(match[3].trim()),
    hewgill_meaning: stripTags(match[4]),
  }));
}

function cleanEnglishGloss(value) {
  const parts = decodeEntities(value)
    .replace(/\bCL:[^;]+/giu, "")
    .replace(/\([^)]*\babbr\.[^)]*\)/giu, "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^surname\b/iu.test(part))
    .filter((part) => !/\babbr\./iu.test(part))
    .filter((part) => !/^\(?lit\./iu.test(part));
  return (parts.slice(0, 3).join("; ") || decodeEntities(value).trim()).replace(/\s+/gu, " ");
}

const manualEnglishGlosses = {
  矮: "short; low",
  爱好: "hobby; interest",
  办法: "method; way",
  被: "passive marker; by",
  比赛: "match; competition",
  冰箱: "refrigerator",
  草: "grass",
  层: "floor; layer",
  除了: "besides; apart from; in addition to",
  船: "boat; ship",
  春: "spring",
  词典: "dictionary",
  聪明: "smart; intelligent",
  带: "to bring; to take along; to carry",
  段: "paragraph; section",
  多么: "how; what",
  发烧: "to have a fever",
  方便: "convenient",
  地方: "place; area",
  东: "east",
  短: "short; brief",
  发: "to send; to issue",
  放心: "to feel relieved; to stop worrying",
  附近: "nearby; nearby area",
  感冒: "to have a cold; cold",
  跟: "with; to follow",
  公斤: "kilogram; kilo",
  关系: "relationship; relation",
  过: "experienced-action particle; to have done before",
  过去: "past; formerly",
  "96:花": "to spend; to cost",
  "97:花": "flower",
  极: "extremely; very",
  季节: "season",
  检查: "to check; to examine",
  讲: "to explain; to speak",
  角: "corner; angle",
  接: "to pick up; to receive; to answer",
  节目: "program; show",
  解决: "to solve; to resolve",
  经常: "often; frequently",
  久: "a long time; long duration",
  旧: "old; used",
  决定: "to decide; decision",
  刻: "quarter hour; moment",
  口: "mouth; measure word for people or animals",
  蓝: "blue",
  历史: "history",
  楼: "building; floor",
  老: "old; elderly",
  米: "meter; rice",
  明白: "to understand; clear",
  奶奶: "paternal grandmother; grandma",
  难: "difficult",
  骑: "to ride",
  起飞: "to take off",
  清楚: "clear; clearly",
  然后: "then; after that",
  容易: "easy",
  上网: "to go online",
  瘦: "thin; slim",
  水平: "level; standard",
  疼: "to hurt; painful",
  头发: "hair",
  完成: "to complete; to finish",
  位: "polite measure word for people",
  先: "first; before",
  相信: "to believe",
  像: "to look like; to be like",
  校长: "principal; headmaster",
  新鲜: "fresh",
  要求: "to request; to require",
  爷爷: "paternal grandfather; grandpa",
  一直: "always; continuously",
  饮料: "drink; beverage",
  元: "yuan; currency unit",
  越: "the more... the more...",
  又: "again; also",
  辆: "measure word for vehicles",
  长: "to grow",
  张: "measure word for flat objects; sheet",
  "283:只": "only; just",
  "284:只": "measure word for animals",
  自己: "oneself; self",
  嘴: "mouth",
};

const manualPinyinByKey = {
  "284:只": "zhī",
};

function minimalEntry(row, traditional, meaning) {
  return {
    simplified: row.simplified,
    radical: "",
    level: ["old-3"],
    frequency: "",
    pos: [],
    forms: [
      {
        traditional,
        transcriptions: {
          pinyin: row.pinyin,
          numeric: "",
          wadegiles: "",
          bopomofo: "",
          romatzyh: "",
        },
        meanings: [meaning],
        classifiers: [],
      },
    ],
  };
}

function sourceFormPinyin(entry) {
  return entry.forms?.[0]?.transcriptions?.pinyin ?? "";
}

async function main() {
  const [mitText, hewgillHtml, hskAcademyHtml, allSetHtml] = await Promise.all([
    fs.readFile(mitExclusivePath, "utf8"),
    fs.readFile(hewgillCumulativePath, "utf8"),
    fs.readFile(hskAcademyPath, "utf8"),
    fs.readFile(allSetPath, "utf8"),
  ]);

  const mitEntries = JSON.parse(mitText);
  const mitByWord = new Map(mitEntries.map((entry) => [entry.simplified, entry]));
  const hewgillByWord = new Map(parseHewgillRows(hewgillHtml).map((row) => [row.simplified, row]));
  const allSetWords = new Set([...allSetHtml.matchAll(/<td>([^<]{1,12})<\/td>\s*<td>[^<]+<\/td>\s*<td>.*?<\/td>\s*<td>HSK 3<\/td>/gsu)].map((match) => stripTags(match[1])));

  const tiles = parseHskAcademyTiles(hskAcademyHtml);
  const meanings = parseHskAcademyMeanings(hskAcademyHtml);
  if (tiles.length !== EXPECTED_ROWS || meanings.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} HSK Academy rows, got tiles=${tiles.length}, meanings=${meanings.length}`);
  }

  const entries = [];
  const overrides = {};
  const examples = {};
  const duplicateSimplified = new Map();
  for (const tile of tiles) {
    duplicateSimplified.set(tile.simplified, (duplicateSimplified.get(tile.simplified) ?? 0) + 1);
  }

  for (const [index, tile] of tiles.entries()) {
    const meaning = meanings[index];
    if (tile.simplified !== meaning.simplified || tile.pinyin !== meaning.pinyin) {
      throw new Error(`HSK Academy tile/meaning mismatch at ${index + 1}: ${tile.simplified}/${tile.pinyin} vs ${meaning.simplified}/${meaning.pinyin}`);
    }

    const hskOrder = index + 1;
    const hskKey = `${hskOrder}:${tile.simplified}`;
    const hewgill = hewgillByWord.get(tile.simplified);
    const mitEntry = mitByWord.get(tile.simplified);
    const baseEntry = mitEntry ? structuredClone(mitEntry) : minimalEntry(tile, tile.traditional, hewgill?.hewgill_meaning ?? meaning.meaning);
    baseEntry.hsk_canonical_source = {
      release_id: RELEASE_ID,
      hsk_level: HSK_LEVEL,
      hsk_order: hskOrder,
      hsk_key: hskKey,
      derivation: mitEntry
        ? "hskacademy_300_with_matching_complete_hsk_vocabulary_entry"
        : "hskacademy_300_cross_source_curated_minimal_entry",
      hskacademy_id: tile.hskacademy_id,
      hskacademy_pinyin: tile.pinyin,
      hskacademy_meaning: meaning.meaning,
      hewgill_order: hewgill?.hewgill_order ?? "",
      hewgill_pinyin: hewgill?.pinyin_compact ?? "",
      hewgill_meaning: hewgill?.hewgill_meaning ?? "",
      support_sources: [
        "hsk-academy-300",
        ...(allSetWords.has(tile.simplified) ? ["allset-hsk3-exclusive"] : []),
        ...(hewgill ? ["hewgill-cumulative-600"] : []),
        ...(mitEntry ? ["complete-hsk-vocabulary-exclusive-old-3"] : []),
      ],
    };
    entries.push(baseEntry);

    const key = (duplicateSimplified.get(tile.simplified) ?? 0) > 1 ? hskKey : tile.simplified;
    const en = manualEnglishGlosses[key] ?? manualEnglishGlosses[tile.simplified] ?? cleanEnglishGloss(meaning.meaning);
    const pinyin = manualPinyinByKey[key] ?? tile.pinyin;
    overrides[key] = {
      traditional: tile.traditional,
      pinyin,
      en,
    };
    examples[key] = {
      example_zh: `这个词是“${tile.simplified}”。`,
      example_pinyin: `Zhè ge cí shì “${tile.pinyin}”.`,
      example_en: `This word is "${en}".`,
    };

    if (mitEntry && sourceFormPinyin(mitEntry) && sourceFormPinyin(mitEntry) !== tile.pinyin) {
      baseEntry.hsk_canonical_source.notes = [
        `Card-facing pinyin follows HSK Academy/reference row (${tile.pinyin}) instead of first MIT form (${sourceFormPinyin(mitEntry)}).`,
      ];
    }
  }

  const duplicateRows = [...duplicateSimplified.entries()].filter(([, count]) => count > 1);
  const report = {
    release_id: RELEASE_ID,
    generated_at: new Date().toISOString(),
    expected_rows: EXPECTED_ROWS,
    canonical_rows: entries.length,
    method: "Use HSK Academy HSK3 300-row reference order for HSK 2.0 classic level 3; enrich with MIT complete-hsk-vocabulary old/3 entries where exact simplified entries exist; use Hewgill cumulative 600 as cross-source support for compound rows missing from MIT old/3.",
    input_paths: {
      mit_exclusive_old_3: path.relative(ROOT, mitExclusivePath),
      hewgill_cumulative_600_html: path.relative(ROOT, hewgillCumulativePath),
      hskacademy_reference_html: path.relative(ROOT, hskAcademyPath),
      allset_reference_html: path.relative(ROOT, allSetPath),
    },
    source_counts: {
      mit_exclusive_old_3_rows: mitEntries.length,
      hskacademy_rows: tiles.length,
      canonical_rows_from_mit_entry: entries.filter((entry) => entry.hsk_canonical_source.support_sources.includes("complete-hsk-vocabulary-exclusive-old-3")).length,
      canonical_rows_cross_source_curated: entries.filter((entry) => !entry.hsk_canonical_source.support_sources.includes("complete-hsk-vocabulary-exclusive-old-3")).length,
    },
    duplicate_simplified_rows: duplicateRows.map(([simplified, count]) => ({ simplified, count })),
    notes: [
      "MIT upstream old/3 exclusive has 298 rows and uses raw character rows for some public HSK3 compounds; it is not treated as final membership truth.",
      "HSK3 public 300-row references include repeated simplified forms for separate senses, including 花 and 只; generated overrides/examples use hsk_key order:simplified for those duplicate rows.",
      "Generated HSK3 examples are structural placeholders for the preparation workbook and must be replaced with real pedagogical Chinese examples before final target-language delivery.",
    ],
  };

  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });
  const reportPath = path.join(QA_DIR, `${RELEASE_ID}_source_reconciliation_${todayStamp()}.json`);
  await Promise.all([
    fs.writeFile(canonicalOutPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8"),
    fs.writeFile(overridesOutPath, `${JSON.stringify(overrides, null, 2)}\n`, "utf8"),
    fs.writeFile(examplesOutPath, `${JSON.stringify(examples, null, 2)}\n`, "utf8"),
    fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ]);

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        rows: entries.length,
        duplicate_simplified_rows: duplicateRows,
        source: path.relative(ROOT, canonicalOutPath),
        overrides: path.relative(ROOT, overridesOutPath),
        examples: path.relative(ROOT, examplesOutPath),
        report: path.relative(ROOT, reportPath),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
