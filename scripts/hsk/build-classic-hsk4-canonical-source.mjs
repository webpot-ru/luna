#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk2_classic_level_4_600_v1";
const HSK_LEVEL = 4;
const EXPECTED_ROWS = 600;
const OUTPUT_DIR = path.resolve("outputs/hsk");
const SOURCE_DIR = path.join(OUTPUT_DIR, "source");
const QA_DIR = path.join(OUTPUT_DIR, "qa");

const mitExclusivePath = path.join(SOURCE_DIR, "hsk2_classic_level_4_upstream.source.json");
const hskAcademyPath = path.join(SOURCE_DIR, "hsk2_classic_level_4_hskacademy_reference.html");
const hewgillCumulativePath = path.join(SOURCE_DIR, "hsk2_classic_level_4_hewgill_cumulative_1200.html");
const allSetPath = path.join(SOURCE_DIR, "hsk2_classic_level_4_allset_cumulative_reference.html");
const previousSourcePaths = [
  path.join(SOURCE_DIR, "hsk2_classic_level_1_150_v1.source.json"),
  path.join(SOURCE_DIR, "hsk2_classic_level_2_150_v1.source.json"),
  path.join(SOURCE_DIR, "hsk2_classic_level_3_300_v1.source.json"),
];
const canonicalOutPath = path.join(SOURCE_DIR, `${RELEASE_ID}.source.json`);
const overridesOutPath = path.resolve("config/hsk-classic-hsk4-card-overrides.json");
const examplesOutPath = path.resolve("config/hsk-classic-hsk4-examples.json");

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
  return String(value)
    .replace(/\s+/gu, " ")
    .replace(/\blv4\b/giu, "lǜ")
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

function parseAllSetHsk4Words(html) {
  const rows = [...html.matchAll(/<tr>\s*<td>([^<]{1,16})<\/td>\s*<td>[^<]+<\/td>\s*<td>.*?<\/td>\s*<td>HSK 4<\/td>\s*<\/tr>/gsu)];
  return new Set(rows.map((match) => stripTags(match[1])));
}

function cleanEnglishGloss(value) {
  const parts = decodeEntities(value)
    .replace(/\bCL:[^;]+/giu, "")
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/\([^)]*\babbr\.[^)]*\)/giu, "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^surname\b/iu.test(part))
    .filter((part) => !/\babbr\./iu.test(part))
    .filter((part) => !/^\(?lit\./iu.test(part));
  return (parts.slice(0, 3).join("; ") || decodeEntities(value).trim()).replace(/\s+/gu, " ");
}

const manualPinyinByWord = {
  倒: "dǎo",
  得: "děi",
};

const manualEnglishGlosses = {
  从来: "always; never before",
  倒: "to fall; to collapse; to knock down",
  得: "to have to; must; need to",
  等: "and so on; etc.",
};

function minimalEntry(row, meaning) {
  return {
    simplified: row.simplified,
    radical: "",
    level: ["old-4"],
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
  const [mitText, hskAcademyHtml, hewgillHtml, allSetHtml, ...previousTexts] = await Promise.all([
    fs.readFile(mitExclusivePath, "utf8"),
    fs.readFile(hskAcademyPath, "utf8"),
    fs.readFile(hewgillCumulativePath, "utf8"),
    fs.readFile(allSetPath, "utf8"),
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
  const hewgillByWord = new Map(parseHewgillRows(hewgillHtml).map((row) => [row.simplified, row]));
  const allSetHsk4Words = parseAllSetHsk4Words(allSetHtml);

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
  if (duplicateRows.length) {
    throw new Error(`Unexpected duplicate HSK4 simplified rows: ${JSON.stringify(duplicateRows)}`);
  }

  const entries = [];
  const overrides = {};
  const examples = {};
  const overlapsWithPrevious = [];
  const mitNotAcademy = mitEntries
    .filter((entry) => !tiles.some((tile) => tile.simplified === entry.simplified))
    .map((entry) => entry.simplified);
  const academyNotMit = [];

  for (const [index, tile] of tiles.entries()) {
    const meaning = meanings[index];
    if (tile.simplified !== meaning.simplified || tile.pinyin !== meaning.pinyin) {
      throw new Error(`HSK Academy tile/meaning mismatch at ${index + 1}: ${tile.simplified}/${tile.pinyin} vs ${meaning.simplified}/${meaning.pinyin}`);
    }
    const hskOrder = index + 1;
    const hskKey = `${hskOrder}:${tile.simplified}`;
    const cardPinyin = manualPinyinByWord[tile.simplified] ?? tile.pinyin;
    if (previousWords.has(tile.simplified)) {
      overlapsWithPrevious.push({
        hsk4_order: hskOrder,
        simplified: tile.simplified,
        hsk4_pinyin: cardPinyin,
        previous_rows: previousWords.get(tile.simplified),
      });
    }

    const mitEntry = mitByWord.get(tile.simplified);
    const hewgill = hewgillByWord.get(tile.simplified);
    if (!mitEntry) academyNotMit.push(tile.simplified);
    const baseEntry = mitEntry
      ? structuredClone(mitEntry)
      : minimalEntry({ ...tile, pinyin: cardPinyin }, hewgill?.hewgill_meaning ?? meaning.meaning);
    baseEntry.hsk_canonical_source = {
      release_id: RELEASE_ID,
      hsk_level: HSK_LEVEL,
      hsk_order: hskOrder,
      hsk_key: hskKey,
      derivation: mitEntry
        ? "hskacademy_600_with_matching_complete_hsk_vocabulary_entry"
        : "hskacademy_600_cross_source_curated_minimal_entry",
      hskacademy_id: tile.hskacademy_id,
      hskacademy_pinyin: tile.pinyin,
      card_pinyin: cardPinyin,
      hskacademy_meaning: meaning.meaning,
      hewgill_order: hewgill?.hewgill_order ?? "",
      hewgill_pinyin: hewgill?.pinyin_compact ?? "",
      hewgill_meaning: hewgill?.hewgill_meaning ?? "",
      support_sources: [
        "hsk-academy-600",
        ...(allSetHsk4Words.has(tile.simplified) ? ["allset-hsk4"] : []),
        ...(hewgill ? ["hewgill-cumulative-1200"] : []),
        ...(mitEntry ? ["complete-hsk-vocabulary-exclusive-old-4"] : []),
      ],
    };
    if (mitEntry && sourceFormPinyin(mitEntry) && sourceFormPinyin(mitEntry) !== cardPinyin) {
      baseEntry.hsk_canonical_source.notes = [
        `Card-facing pinyin follows curated/reference row (${cardPinyin}) instead of first MIT form (${sourceFormPinyin(mitEntry)}).`,
      ];
    }
    entries.push(baseEntry);

    const en = manualEnglishGlosses[tile.simplified] ?? cleanEnglishGloss(meaning.meaning);
    overrides[tile.simplified] = {
      traditional: tile.traditional,
      pinyin: cardPinyin,
      en,
    };
    examples[tile.simplified] = {
      example_zh: `这个词是“${tile.simplified}”。`,
      example_pinyin: `Zhè ge cí shì “${cardPinyin}”.`,
      example_en: `This word is "${en}".`,
    };
  }

  const report = {
    release_id: RELEASE_ID,
    generated_at: new Date().toISOString(),
    expected_rows: EXPECTED_ROWS,
    canonical_rows: entries.length,
    method: "Use HSK Academy HSK4 600-row reference order for HSK 2.0 classic level 4; enrich with MIT complete-hsk-vocabulary old/4 entries where exact simplified entries exist; use Hewgill cumulative 1200 and AllSet HSK4 as cross-source support.",
    input_paths: {
      mit_exclusive_old_4: path.relative(ROOT, mitExclusivePath),
      hskacademy_reference_html: path.relative(ROOT, hskAcademyPath),
      hewgill_cumulative_1200_html: path.relative(ROOT, hewgillCumulativePath),
      allset_cumulative_reference_html: path.relative(ROOT, allSetPath),
      previous_hsk1_to_hsk3_sources: previousSourcePaths.map((sourcePath) => path.relative(ROOT, sourcePath)),
    },
    source_counts: {
      mit_exclusive_old_4_rows: mitEntries.length,
      hskacademy_rows: tiles.length,
      canonical_rows_from_mit_entry: entries.filter((entry) => entry.hsk_canonical_source.support_sources.includes("complete-hsk-vocabulary-exclusive-old-4")).length,
      canonical_rows_cross_source_curated: entries.filter((entry) => !entry.hsk_canonical_source.support_sources.includes("complete-hsk-vocabulary-exclusive-old-4")).length,
      mit_rows_not_in_hskacademy: mitNotAcademy.length,
      hskacademy_rows_not_in_mit: academyNotMit.length,
      hewgill_supported_rows: entries.filter((entry) => entry.hsk_canonical_source.support_sources.includes("hewgill-cumulative-1200")).length,
      allset_supported_rows: entries.filter((entry) => entry.hsk_canonical_source.support_sources.includes("allset-hsk4")).length,
    },
    duplicate_simplified_rows: duplicateRows.map(([simplified, count]) => ({ simplified, count })),
    overlap_with_hsk1_to_hsk3_count: overlapsWithPrevious.length,
    overlap_with_hsk1_to_hsk3: overlapsWithPrevious,
    mit_not_in_hskacademy_sample: mitNotAcademy.slice(0, 120),
    hskacademy_not_in_mit_sample: academyNotMit.slice(0, 120),
    notes: [
      "MIT upstream old/4 exclusive has 598 rows and overlaps prior HSK1-HSK3 LunaCards source rows, so it is not treated as final membership truth.",
      "HSK Academy HSK4 has exactly 600 rows and contains two repeated simplified forms from current HSK1-HSK3 source snapshots: 得 and 等. They are retained as separate HSK listed senses/readings.",
      "Generated HSK4 examples are structural placeholders for the preparation workbook and must be replaced with real pedagogical Chinese examples before final target-language delivery.",
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
