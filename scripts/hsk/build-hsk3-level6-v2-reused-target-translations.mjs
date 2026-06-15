#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1800_v2";
const DATE = "20260612";
const LEGACY_RELEASE_ID = "hsk3_level_6_1400_v1";

const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1800_v2.source.json");
const CHINESE_BUILD_REPORT = path.join(ROOT, "outputs/hsk/qa/hsk3_level_6_1800_v2_chinese_examples_build_20260612.json");
const LEGACY_CLASSIC_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level6-classic-reuse-target-translations.json");
const LEGACY_MANUAL_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level6-manual-target-translations.json");
const TRANSLATIONS_OUT = path.join(ROOT, "config/hsk3-level6-v2-reused-target-translations.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_reused_target_translation_build_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_reused_target_translation_build_${DATE}.md`);

function parseTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u).filter(Boolean);
  const headers = lines.shift()?.split("\t") ?? [];
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

function hskKey(row) {
  return row.hsk_key ?? `${row.hsk_order}:${row.source_word}`;
}

function copyCompleteRow(sourcePayload, targetCodes, provenanceSource, blockers, context) {
  const copied = {};
  for (const code of targetCodes) {
    const cell = sourcePayload?.[code];
    const translation = cell?.translation ?? "";
    const exampleTranslation = cell?.example_translation ?? "";
    if (!translation) blockers.push({ ...context, issue: "missing_translation", code });
    if (!exampleTranslation) blockers.push({ ...context, issue: "missing_example_translation", code });
    copied[code] = {
      translation,
      example_translation: exampleTranslation,
      source: provenanceSource,
      source_detail: cell?.source ?? "",
    };
  }
  return copied;
}

const [languages, sourceRows, chineseReport, legacyClassic, legacyManual] = await Promise.all([
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(CHINESE_BUILD_REPORT, "utf8").then(JSON.parse),
  fs.readFile(LEGACY_CLASSIC_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(LEGACY_MANUAL_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
]);

const targetCodes = languages
  .map((language) => language.spreadsheetCode)
  .filter((code) => !["ZH", "EN", "EN-GB"].includes(code));

const classicByLevel = new Map();
for (const level of [1, 2, 3, 4, 5, 6]) {
  classicByLevel.set(level, await readClassicLevel(level));
}

const sourceByKey = new Map(sourceRows.map((row) => [hskKey(row), row]));
const translations = {};
const blockers = [];
const provenance = [];
let legacyRows = 0;
let deltaClassicReuseRows = 0;
let pendingManualRows = 0;

for (const item of chineseReport.provenance ?? []) {
  const sourceRow = sourceByKey.get(item.hsk_key);
  if (!sourceRow) {
    blockers.push({ hsk_key: item.hsk_key, issue: "provenance_key_not_in_source" });
    continue;
  }

  if (item.source === LEGACY_RELEASE_ID) {
    const legacyPayload = legacyClassic[item.hsk_key] ?? legacyManual[item.hsk_key];
    if (!legacyPayload) {
      blockers.push({ order: item.order, hsk_key: item.hsk_key, word: item.source_word, issue: "missing_legacy_target_payload" });
      continue;
    }
    translations[item.hsk_key] = copyCompleteRow(
      legacyPayload,
      targetCodes,
      `${LEGACY_RELEASE_ID}_target_reuse`,
      blockers,
      { order: item.order, hsk_key: item.hsk_key, word: item.source_word, source: item.source }
    );
    legacyRows += 1;
    provenance.push({
      order: item.order,
      hsk_key: item.hsk_key,
      source_word: item.source_word,
      target_source: `${LEGACY_RELEASE_ID}_target_reuse`,
      filled_language_count: targetCodes.length,
    });
    continue;
  }

  if (String(item.source).startsWith("classic_hsk")) {
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
        source: "classic_target_reuse_for_hsk3_level6_v2",
        source_detail: item.source,
      };
    }
    translations[item.hsk_key] = rowTranslations;
    deltaClassicReuseRows += 1;
    provenance.push({
      order: item.order,
      hsk_key: item.hsk_key,
      source_word: item.source_word,
      target_source: "classic_target_reuse_for_hsk3_level6_v2",
      source_detail: item.source,
      filled_language_count: targetCodes.length,
    });
    continue;
  }

  if (item.source === "hsk3_v2_manual") {
    pendingManualRows += 1;
    continue;
  }

  blockers.push({ order: item.order, hsk_key: item.hsk_key, word: item.source_word, issue: "unknown_chinese_provenance_source", source: item.source });
}

for (const hskKey of Object.keys(translations)) {
  if (!sourceByKey.has(hskKey)) blockers.push({ hsk_key: hskKey, issue: "translation_key_not_in_hsk3_source" });
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  target_language_count: targetCodes.length,
  reused_rows: provenance.length,
  legacy_rows: legacyRows,
  delta_classic_reuse_rows: deltaClassicReuseRows,
  pending_manual_rows: pendingManualRows,
  word_cells_filled: provenance.length * targetCodes.length,
  example_cells_filled: provenance.length * targetCodes.length,
  translations_file: path.relative(ROOT, TRANSLATIONS_OUT),
  blockers,
  provenance,
  notes: [
    "This file reuses target translations only from verified local HSK3 Level 6 legacy rows and row-level Classic evidence.",
    "It intentionally leaves hsk3_v2_manual Chinese rows pending for separate target-language authoring.",
    "Rows are keyed by hsk3_level_6_1800_v2 hsk_key so duplicate simplified rows cannot be collapsed.",
    "This script does not build a workbook, import Docker/Postgres rows or upload Google Sheets.",
  ],
};

await fs.writeFile(TRANSLATIONS_OUT, `${JSON.stringify(translations, null, 2)}\n`);
await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Reused Target Translation Build`,
    "",
    `Status: ${report.status}`,
    `Target languages copied: ${report.target_language_count}`,
    `Reused rows: ${report.reused_rows}`,
    `Legacy rows: ${report.legacy_rows}`,
    `Delta Classic reuse rows: ${report.delta_classic_reuse_rows}`,
    `Pending manual rows: ${report.pending_manual_rows}`,
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
      reused_rows: report.reused_rows,
      legacy_rows: report.legacy_rows,
      delta_classic_reuse_rows: report.delta_classic_reuse_rows,
      pending_manual_rows: report.pending_manual_rows,
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
