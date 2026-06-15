#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk2_classic_level_6_2500_v1";
const HSK_LEVEL = 6;
const EXPECTED_ROWS = 2500;
const OUTPUT_DIR = path.resolve("outputs/hsk");
const SOURCE_DIR = path.join(OUTPUT_DIR, "source");
const QA_DIR = path.join(OUTPUT_DIR, "qa");

const mitExclusivePath = path.join(SOURCE_DIR, "hsk2_classic_level_6_upstream.source.json");
const hskAcademyPath = path.join(SOURCE_DIR, "hsk2_classic_level_6_hskacademy_reference.html");
const hewgillCumulativePath = path.join(SOURCE_DIR, "hsk2_classic_level_6_hewgill_cumulative_5000.html");
const previousSourcePaths = [
  path.join(SOURCE_DIR, "hsk2_classic_level_1_150_v1.source.json"),
  path.join(SOURCE_DIR, "hsk2_classic_level_2_150_v1.source.json"),
  path.join(SOURCE_DIR, "hsk2_classic_level_3_300_v1.source.json"),
  path.join(SOURCE_DIR, "hsk2_classic_level_4_600_v1.source.json"),
  path.join(SOURCE_DIR, "hsk2_classic_level_5_1300_v1.source.json"),
];
const canonicalOutPath = path.join(SOURCE_DIR, `${RELEASE_ID}.source.json`);
const overridesOutPath = path.resolve("config/hsk-classic-hsk6-card-overrides.json");
const examplesOutPath = path.resolve("config/hsk-classic-hsk6-examples.json");
const manualEnglishGlosses = {
  "907:简体字": "simplified Chinese character",
  "2021:兴隆": "prosperous; thriving",
};

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
  return decodeEntities(value)
    .replace(/\s+/gu, " ")
    .replace(/\bnv3\b/giu, "nǚ")
    .replace(/nvè/giu, "nüè")
    .replace(/\blv3\b/giu, "lǚ")
    .replace(/\blv4\b/giu, "lǜ")
    .replace(/lvè/giu, "lüè")
    .replace(/\s*'\s*/gu, "'")
    .trim();
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
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/\([^)]*\babbr\.[^)]*\)/giu, "")
    .replace(/\([^)]*\)/gu, "")
    .replace(/（[^）]*）/gu, "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^surname\b/iu.test(part))
    .filter((part) => !/\babbr\./iu.test(part))
    .filter((part) => !/\bused in\b/iu.test(part))
    .filter((part) => !/^\(?lit\./iu.test(part))
    .filter((part) => !/[\u3400-\u9fff]/u.test(part));
  return (parts.slice(0, 3).join("; ") || decodeEntities(value).trim()).replace(/\s+/gu, " ");
}

function minimalEntry(row, meaning) {
  return {
    simplified: row.simplified,
    radical: "",
    level: ["old-6"],
    frequency: "",
    pos: [],
    forms: [
      {
        traditional: row.traditional,
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
  const [mitText, hskAcademyHtml, hewgillHtml, ...previousTexts] = await Promise.all([
    fs.readFile(mitExclusivePath, "utf8"),
    fs.readFile(hskAcademyPath, "utf8"),
    fs.readFile(hewgillCumulativePath, "utf8"),
    ...previousSourcePaths.map((sourcePath) => fs.readFile(sourcePath, "utf8")),
  ]);

  const mitEntries = JSON.parse(mitText);
  const previousRows = previousTexts.flatMap((text, sourceIndex) =>
    JSON.parse(text).map((entry, rowIndex) => ({
      level: sourceIndex + 1,
      order: rowIndex + 1,
      word: entry.simplified,
      key: entry.hsk_canonical_source?.hsk_key ?? entry.hsk_key ?? entry.simplified,
    }))
  );
  const previousWords = new Map();
  for (const row of previousRows) {
    if (!previousWords.has(row.word)) previousWords.set(row.word, []);
    previousWords.get(row.word).push(row);
  }

  const mitByWord = new Map(mitEntries.map((entry) => [entry.simplified, entry]));
  const hewgillRows = parseHewgillRows(hewgillHtml);
  const hewgillByWord = new Map();
  for (const row of hewgillRows) {
    if (!hewgillByWord.has(row.simplified)) hewgillByWord.set(row.simplified, []);
    hewgillByWord.get(row.simplified).push(row);
  }

  const tiles = parseHskAcademyTiles(hskAcademyHtml);
  const meanings = parseHskAcademyMeanings(hskAcademyHtml);
  if (tiles.length !== EXPECTED_ROWS || meanings.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} HSK Academy rows, got tiles=${tiles.length}, meanings=${meanings.length}`);
  }

  const duplicateSimplified = new Map();
  for (const tile of tiles) {
    duplicateSimplified.set(tile.simplified, (duplicateSimplified.get(tile.simplified) ?? 0) + 1);
  }
  const duplicateRows = [...duplicateSimplified.entries()].filter(([, count]) => count > 1);

  const entries = [];
  const overrides = {};
  const examples = {};
  const overlapsWithPrevious = [];
  const mitNotAcademy = mitEntries
    .filter((entry) => !tiles.some((tile) => tile.simplified === entry.simplified))
    .map((entry) => entry.simplified);
  const academyNotMit = [];
  const academyNotHewgill = [];

  for (const [index, tile] of tiles.entries()) {
    const meaning = meanings[index];
    if (tile.simplified !== meaning.simplified || tile.pinyin !== meaning.pinyin) {
      throw new Error(`HSK Academy tile/meaning mismatch at ${index + 1}: ${tile.simplified}/${tile.pinyin} vs ${meaning.simplified}/${meaning.pinyin}`);
    }
    const hskOrder = index + 1;
    const hskKey = `${hskOrder}:${tile.simplified}`;
    const cardPinyin = tile.pinyin;
    if (previousWords.has(tile.simplified)) {
      overlapsWithPrevious.push({
        hsk6_order: hskOrder,
        simplified: tile.simplified,
        hsk6_pinyin: cardPinyin,
        previous_rows: previousWords.get(tile.simplified),
      });
    }

    const mitEntry = mitByWord.get(tile.simplified);
    const hewgillCandidates = hewgillByWord.get(tile.simplified) ?? [];
    const hewgill = hewgillCandidates.find((row) => row.hewgill_order > 2500) ?? hewgillCandidates[0] ?? null;
    if (!mitEntry) academyNotMit.push(tile.simplified);
    if (!hewgill) academyNotHewgill.push(tile.simplified);
    const baseEntry = mitEntry
      ? structuredClone(mitEntry)
      : minimalEntry({ ...tile, pinyin: cardPinyin }, hewgill?.hewgill_meaning ?? meaning.meaning);
    baseEntry.hsk_canonical_source = {
      release_id: RELEASE_ID,
      hsk_level: HSK_LEVEL,
      hsk_order: hskOrder,
      hsk_key: hskKey,
      derivation: mitEntry
        ? "hskacademy_2500_with_matching_complete_hsk_vocabulary_entry"
        : "hskacademy_2500_cross_source_curated_minimal_entry",
      hskacademy_id: tile.hskacademy_id,
      hskacademy_pinyin: tile.pinyin,
      card_pinyin: cardPinyin,
      hskacademy_meaning: meaning.meaning,
      hewgill_order: hewgill?.hewgill_order ?? "",
      hewgill_pinyin: hewgill?.pinyin_compact ?? "",
      hewgill_meaning: hewgill?.hewgill_meaning ?? "",
      support_sources: [
        "hsk-academy-2500",
        ...(hewgill ? ["hewgill-cumulative-5000"] : []),
        ...(mitEntry ? ["complete-hsk-vocabulary-exclusive-old-6"] : []),
      ],
    };
    if (mitEntry && sourceFormPinyin(mitEntry) && normalizePinyin(sourceFormPinyin(mitEntry)) !== cardPinyin) {
      baseEntry.hsk_canonical_source.notes = [
        `Card-facing pinyin follows HSK Academy row (${cardPinyin}) instead of first MIT form (${sourceFormPinyin(mitEntry)}).`,
      ];
    }
    entries.push(baseEntry);

    const en = manualEnglishGlosses[hskKey] ?? cleanEnglishGloss(meaning.meaning);
    overrides[hskKey] = {
      traditional: tile.traditional,
      pinyin: cardPinyin,
      en,
    };
    examples[hskKey] = {
      example_zh: `我今天学习“${tile.simplified}”这个词。`,
      example_pinyin: `Wǒ jīntiān xuéxí “${cardPinyin}” zhè ge cí.`,
      example_en: `Today I am studying the word "${en}".`,
    };
  }

  const report = {
    release_id: RELEASE_ID,
    generated_at: new Date().toISOString(),
    expected_rows: EXPECTED_ROWS,
    canonical_rows: entries.length,
    method: "Use HSK Academy HSK6 2500-row reference order for HSK 2.0 classic level 6; enrich with MIT complete-hsk-vocabulary old/6 entries where exact simplified entries exist; use Hewgill cumulative 5000 as cross-source support. Do not treat any single external source as final truth without row-level reconciliation.",
    input_paths: {
      mit_exclusive_old_6: path.relative(ROOT, mitExclusivePath),
      hskacademy_reference_html: path.relative(ROOT, hskAcademyPath),
      hewgill_cumulative_5000_html: path.relative(ROOT, hewgillCumulativePath),
      previous_hsk1_to_hsk5_sources: previousSourcePaths.map((sourcePath) => path.relative(ROOT, sourcePath)),
    },
    source_counts: {
      mit_exclusive_old_6_rows: mitEntries.length,
      hskacademy_rows: tiles.length,
      hewgill_cumulative_rows: hewgillRows.length,
      canonical_rows_from_mit_entry: entries.filter((entry) => entry.hsk_canonical_source.support_sources.includes("complete-hsk-vocabulary-exclusive-old-6")).length,
      canonical_rows_cross_source_curated: entries.filter((entry) => !entry.hsk_canonical_source.support_sources.includes("complete-hsk-vocabulary-exclusive-old-6")).length,
      mit_rows_not_in_hskacademy: mitNotAcademy.length,
      hskacademy_rows_not_in_mit: academyNotMit.length,
      hskacademy_rows_not_in_hewgill: academyNotHewgill.length,
      hewgill_supported_rows: entries.filter((entry) => entry.hsk_canonical_source.support_sources.includes("hewgill-cumulative-5000")).length,
    },
    duplicate_simplified_rows: duplicateRows.map(([simplified, count]) => ({ simplified, count })),
    overlap_with_hsk1_to_hsk5_count: overlapsWithPrevious.length,
    overlap_with_hsk1_to_hsk5: overlapsWithPrevious,
    mit_not_in_hskacademy_sample: mitNotAcademy.slice(0, 160),
    hskacademy_not_in_mit_sample: academyNotMit.slice(0, 160),
    hskacademy_not_in_hewgill_sample: academyNotHewgill.slice(0, 160),
    notes: [
      "HSK Academy HSK6 has exactly 2500 rows, ids 2501-5000.",
      "Generated HSK6 examples are structural placeholders for the preparation workbook. They must be replaced with real pedagogical Chinese examples before target-language translation starts.",
      "HSK6 keeps candidate evidence separate from release truth: HSK Academy defines row order and membership for this snapshot, while MIT and Hewgill are support sources.",
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
        source: path.relative(ROOT, canonicalOutPath),
        overrides: path.relative(ROOT, overridesOutPath),
        examples: path.relative(ROOT, examplesOutPath),
        report: path.relative(ROOT, reportPath),
        source_counts: report.source_counts,
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
