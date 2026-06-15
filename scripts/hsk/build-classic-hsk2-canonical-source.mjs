#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk2_classic_level_2_150_v1";
const HSK_LEVEL = 2;
const EXPECTED_ROWS = 150;
const OUTPUT_DIR = path.resolve("outputs/hsk");
const SOURCE_DIR = path.join(OUTPUT_DIR, "source");
const QA_DIR = path.join(OUTPUT_DIR, "qa");

const hsk1SourcePath = path.join(SOURCE_DIR, "hsk2_classic_level_1_150_v1.source.json");
const mitExclusivePath = path.join(SOURCE_DIR, "hsk2_classic_level_2_147_upstream.source.json");
const hewgillCumulativePath = path.join(SOURCE_DIR, "hsk2_classic_level_2_hewgill_cumulative_300.html");
const canonicalOutPath = path.join(SOURCE_DIR, `${RELEASE_ID}.source.json`);

const excludedVariantWords = new Set(["哪儿", "那儿", "这儿"]);
const crossSourceSupport = {
  等: ["hewgill-cumulative-300", "hsk-academy-150", "hanzi-stroke-150", "chineseskill-150"],
  对: ["hewgill-cumulative-300", "hsk-academy-150", "hanzi-stroke-150", "chineseskill-150"],
  过: ["hewgill-cumulative-300", "hsk-academy-150", "hanzi-stroke-150", "chineseskill-150"],
  踢足球: ["hewgill-cumulative-300", "hsk-academy-150", "chineseskill-150"],
  为什么: ["hewgill-cumulative-300", "hsk-academy-150", "chineseskill-150"],
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&#39;/gu, "'");
}

function parseHewgillRows(html) {
  const rowPattern =
    /<tr>\s*<td class="index">(\d+)<\/td>\s*<td class="char">([^<]+)<\/td>\s*<td class="pinyin"[^>]*>([^<]+)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gsu;
  return [...html.matchAll(rowPattern)].map((match) => ({
    hewgill_order: Number(match[1]),
    simplified: decodeEntities(match[2].trim()),
    pinyin_compact: decodeEntities(match[3].trim()),
    hewgill_meaning: decodeEntities(match[4].replace(/<[^>]+>/gu, "").trim()),
  }));
}

function minimalEntryFromHewgill(row) {
  return {
    simplified: row.simplified,
    radical: "",
    level: ["old-2"],
    frequency: "",
    pos: [],
    forms: [
      {
        traditional: row.simplified,
        transcriptions: {
          pinyin: row.pinyin_compact,
          numeric: "",
          wadegiles: "",
          bopomofo: "",
          romatzyh: "",
        },
        meanings: [row.hewgill_meaning],
        classifiers: [],
      },
    ],
  };
}

async function main() {
  const [hsk1Text, mitExclusiveText, hewgillHtml] = await Promise.all([
    fs.readFile(hsk1SourcePath, "utf8"),
    fs.readFile(mitExclusivePath, "utf8"),
    fs.readFile(hewgillCumulativePath, "utf8"),
  ]);

  const hsk1Words = new Set(JSON.parse(hsk1Text).map((entry) => entry.simplified));
  const mitEntries = JSON.parse(mitExclusiveText);
  const mitByWord = new Map(mitEntries.map((entry) => [entry.simplified, entry]));
  const hewgillRows = parseHewgillRows(hewgillHtml);
  const canonicalRows = hewgillRows.filter(
    (row) => !hsk1Words.has(row.simplified) && !excludedVariantWords.has(row.simplified)
  );

  if (canonicalRows.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} HSK2 canonical rows, got ${canonicalRows.length}`);
  }

  const seen = new Set();
  const entries = canonicalRows.map((row, index) => {
    if (seen.has(row.simplified)) throw new Error(`Duplicate HSK2 canonical word: ${row.simplified}`);
    seen.add(row.simplified);
    const mitEntry = mitByWord.get(row.simplified);
    const entry = mitEntry ? structuredClone(mitEntry) : minimalEntryFromHewgill(row);
    entry.hsk_canonical_source = {
      release_id: RELEASE_ID,
      hsk_level: HSK_LEVEL,
      hsk_order: index + 1,
      derivation: mitEntry
        ? "hewgill_cumulative_300_minus_current_hsk1_with_mit_entry"
        : "hewgill_cumulative_300_minus_current_hsk1_cross_source_curated",
      hewgill_order: row.hewgill_order,
      hewgill_pinyin: row.pinyin_compact,
      hewgill_meaning: row.hewgill_meaning,
      support_sources: mitEntry
        ? ["complete-hsk-vocabulary-exclusive-old-2", "hewgill-cumulative-300"]
        : (crossSourceSupport[row.simplified] ?? ["hewgill-cumulative-300"]),
    };
    return entry;
  });

  const missingFromMit = entries
    .filter((entry) => !mitByWord.has(entry.simplified))
    .map((entry) => entry.simplified);
  const canonicalSet = new Set(entries.map((entry) => entry.simplified));
  const mitNotCanonical = mitEntries
    .filter((entry) => !canonicalSet.has(entry.simplified))
    .map((entry) => entry.simplified);

  const report = {
    release_id: RELEASE_ID,
    generated_at: new Date().toISOString(),
    expected_rows: EXPECTED_ROWS,
    canonical_rows: entries.length,
    method: "HSK2 cumulative 300 minus current LunaCards HSK1 150; excludes location variants 哪儿/那儿/这儿 because current HSK1 already contains 哪/那/这.",
    input_paths: {
      hsk1_source: path.relative(ROOT, hsk1SourcePath),
      mit_exclusive_old_2: path.relative(ROOT, mitExclusivePath),
      hewgill_cumulative_300_html: path.relative(ROOT, hewgillCumulativePath),
    },
    source_counts: {
      current_hsk1_rows: hsk1Words.size,
      mit_exclusive_old_2_rows: mitEntries.length,
      hewgill_parsed_rows: hewgillRows.length,
      canonical_rows_from_mit_entry: entries.length - missingFromMit.length,
      canonical_rows_cross_source_curated: missingFromMit.length,
    },
    excluded_variant_words: Array.from(excludedVariantWords),
    missing_from_mit_exclusive_old_2: missingFromMit,
    mit_exclusive_old_2_not_in_canonical: mitNotCanonical,
    notes: [
      "MIT upstream old/2 exclusive has 147 rows; this canonical source intentionally targets the expected 150-row non-duplicating second HSK deck.",
      "Rows absent from MIT old/2 exclusive are not treated as dictionary truth; they are included because the cumulative 300 source and public HSK2 150 references support them.",
      "Card-facing pinyin, EN glosses and examples still need curated override/example files before workbook generation.",
    ],
  };

  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });
  const reportPath = path.join(QA_DIR, `${RELEASE_ID}_source_reconciliation_${todayStamp()}.json`);
  await Promise.all([
    fs.writeFile(canonicalOutPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8"),
    fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ]);

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        rows: entries.length,
        from_mit: entries.length - missingFromMit.length,
        cross_source_curated: missingFromMit.length,
        source: path.relative(ROOT, canonicalOutPath),
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
