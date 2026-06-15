import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_4_1000_v1";
const DATE = "20260605";
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_4_1000_v1.source.json");
const CHINESE_BUILD_REPORT = path.join(ROOT, "outputs/hsk/qa/hsk3_level_4_1000_v1_chinese_examples_build_20260605.json");
const TRANSLATIONS_OUT = path.join(ROOT, "config/hsk3-level4-classic-reuse-target-translations.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_classic_target_translation_build_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_classic_target_translation_build_${DATE}.md`);

function parseTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u).filter(Boolean);
  const headers = lines.shift().split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

async function readClassicLevel(level) {
  const dir = path.join(ROOT, "config");
  const files = (await fs.readdir(dir))
    .filter((name) => name.startsWith(`hsk-classic-hsk${level}-translations-`) && name.endsWith(".tsv"))
    .sort();
  const byKey = new Map();
  for (const file of files) {
    const rows = parseTsv(await fs.readFile(path.join(dir, file), "utf8"));
    for (const [index, row] of rows.entries()) {
      const simplified = String(row.simplified ?? "").replace(/^\d+:/u, "");
      const key = `${index + 1}:${simplified}`;
      if (!byKey.has(key)) byKey.set(key, {});
      Object.assign(byKey.get(key), { ...row, simplified });
    }
  }
  return { files, byKey };
}

const [languages, sourceRows, chineseReport] = await Promise.all([
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(CHINESE_BUILD_REPORT, "utf8").then(JSON.parse),
]);
const targetCodes = languages
  .map((language) => language.spreadsheetCode)
  .filter((code) => !["ZH", "EN", "EN-GB"].includes(code));

const classicByLevel = new Map();
for (const level of [1, 2, 3, 4, 5, 6]) {
  classicByLevel.set(level, await readClassicLevel(level));
}

const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key ?? `${row.hsk_order}:${row.source_word}`, row]));
const translations = {};
const blockers = [];
const provenance = [];

for (const item of chineseReport.provenance ?? []) {
  if (!String(item.source).startsWith("classic_hsk")) continue;
  const match = /^classic_hsk(\d+):(\d+):(.+)$/u.exec(item.source);
  if (!match) {
    blockers.push({ order: item.order, hsk_key: item.hsk_key, word: item.source_word, issue: "bad_classic_source_pointer", source: item.source });
    continue;
  }
  const level = Number(match[1]);
  const classicOrder = Number(match[2]);
  const classicWord = match[3];
  const classic = classicByLevel.get(level)?.byKey.get(`${classicOrder}:${classicWord}`);
  if (!classic) {
    blockers.push({ order: item.order, hsk_key: item.hsk_key, word: item.source_word, issue: "missing_classic_translation_row", source: item.source });
    continue;
  }

  const rowTranslations = {};
  for (const code of targetCodes) {
    const translation = classic[code] ?? "";
    const example = classic[`example_${code}`] ?? "";
    if (!translation) blockers.push({ order: item.order, hsk_key: item.hsk_key, word: item.source_word, issue: "missing_translation", code, source: item.source });
    if (!example) blockers.push({ order: item.order, hsk_key: item.hsk_key, word: item.source_word, issue: "missing_example_translation", code, source: item.source });
    rowTranslations[code] = {
      translation,
      example_translation: example,
      source: item.source,
    };
  }
  translations[item.hsk_key] = rowTranslations;
  provenance.push({
    order: item.order,
    hsk_key: item.hsk_key,
    source_word: item.source_word,
    source: item.source,
    filled_language_count: Object.values(rowTranslations).filter((value) => value.translation && value.example_translation).length,
  });
}

for (const hskKey of Object.keys(translations)) {
  if (!sourceByKey.has(hskKey)) blockers.push({ hsk_key: hskKey, issue: "translation_key_not_in_hsk3_source" });
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  target_language_count: targetCodes.length,
  classic_reuse_rows: provenance.length,
  manual_or_pending_rows: sourceRows.length - provenance.length,
  word_cells_filled: provenance.length * targetCodes.length,
  example_cells_filled: provenance.length * targetCodes.length,
  translations_file: path.relative(ROOT, TRANSLATIONS_OUT),
  blockers,
  provenance,
  notes: [
    "This file copies Classic target translations only for HSK3.0 rows whose Chinese examples were explicitly sourced from Classic reuse.",
    "Rows are keyed by HSK3 hsk_key so duplicate simplified rows cannot be collapsed.",
    "EN/EN-GB pivot cells are handled by config/hsk3-level4-en-glosses.json and config/hsk3-level4-examples.json.",
    "Manual HSK3.0 rows remain pending for non-English target-language packs.",
  ],
};

await fs.writeFile(TRANSLATIONS_OUT, `${JSON.stringify(translations, null, 2)}\n`);
await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Classic Target Translation Build`,
    "",
    `Status: ${report.status}`,
    `Target languages copied: ${report.target_language_count}`,
    `Classic reuse rows: ${report.classic_reuse_rows}`,
    `Manual/pending rows: ${report.manual_or_pending_rows}`,
    `Word cells filled: ${report.word_cells_filled}`,
    `Example cells filled: ${report.example_cells_filled}`,
    `Blockers: ${blockers.length}`,
    "",
    ...blockers.map((item) => `- BLOCKER ${item.issue}${item.order ? ` row ${item.order}` : ""}${item.code ? ` ${item.code}` : ""}: ${item.word ?? item.hsk_key ?? ""}`),
    "",
  ].join("\n")
);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      status: report.status,
      classic_reuse_rows: report.classic_reuse_rows,
      manual_or_pending_rows: report.manual_or_pending_rows,
      target_language_count: report.target_language_count,
      word_cells_filled: report.word_cells_filled,
      example_cells_filled: report.example_cells_filled,
      blockers: blockers.length,
      output: path.relative(ROOT, TRANSLATIONS_OUT),
      report: path.relative(ROOT, REPORT_JSON),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
