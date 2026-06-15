#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_2_200_v1";
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_2_200_v1.source.json");
const CLASSIC_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level2-classic-reuse-target-translations.json");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const CONFIG_DIR = path.join(ROOT, "config");
const OUTPUT_PATH = path.join(CONFIG_DIR, "hsk3-level2-manual-target-translations.json");
const REPORT_PATH = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_manual_target_translation_build_20260604.json`);
const batchPattern = /^hsk3-level2-manual-translations-.+\.tsv$/iu;

function parseTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u).filter(Boolean);
  const headers = lines.shift()?.split("\t") ?? [];
  return lines.map((line, index) => {
    const values = line.split("\t");
    return {
      line_number: index + 2,
      row: Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""])),
    };
  });
}

function normalized(value) {
  return String(value ?? "").normalize("NFC").trim();
}

const [sourceRows, classicTargetTranslations, languages, configNames] = await Promise.all([
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(CLASSIC_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
  fs.readdir(CONFIG_DIR),
]);

const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key ?? `${row.hsk_order}:${row.source_word}`, row]));
const classicKeys = new Set(Object.keys(classicTargetTranslations));
const pendingKeys = new Set([...sourceByKey.keys()].filter((key) => !classicKeys.has(key)));
const allowedCodes = new Set(
  languages
    .map((language) => language.spreadsheetCode)
    .filter((code) => !["ZH", "EN", "EN-GB"].includes(code))
);
const batchNames = configNames.filter((name) => batchPattern.test(name)).sort();
const output = {};
const blockers = [];
const languageCounts = {};

for (const batchName of batchNames) {
  const batchPath = path.join(CONFIG_DIR, batchName);
  const parsed = parseTsv(await fs.readFile(batchPath, "utf8"));
  for (const { line_number: lineNumber, row } of parsed) {
    const hskKey = normalized(row.hsk_key);
    if (!hskKey) {
      blockers.push({ code: "blank_hsk_key", batch: batchName, line: lineNumber });
      continue;
    }
    const sourceRow = sourceByKey.get(hskKey);
    if (!sourceRow) {
      blockers.push({ code: "key_not_in_hsk3_source", batch: batchName, line: lineNumber, hsk_key: hskKey });
      continue;
    }
    if (!pendingKeys.has(hskKey)) {
      blockers.push({ code: "key_not_pending_manual", batch: batchName, line: lineNumber, hsk_key: hskKey });
      continue;
    }
    if (normalized(row.source_word) && normalized(row.source_word) !== sourceRow.source_word) {
      blockers.push({
        code: "source_word_mismatch",
        batch: batchName,
        line: lineNumber,
        hsk_key: hskKey,
        expected: sourceRow.source_word,
        actual: normalized(row.source_word),
      });
      continue;
    }
    output[hskKey] ??= {};
    for (const [header, rawValue] of Object.entries(row)) {
      if (["hsk_key", "source_word", "simplified"].includes(header) || header.startsWith("example_")) continue;
      const code = header;
      if (!allowedCodes.has(code)) {
        blockers.push({ code: "unexpected_language_code", batch: batchName, line: lineNumber, hsk_key: hskKey, language_code: code });
        continue;
      }
      const translation = normalized(rawValue);
      const exampleTranslation = normalized(row[`example_${code}`]);
      if (!translation && !exampleTranslation) continue;
      if (!translation || !exampleTranslation) {
        blockers.push({ code: "incomplete_language_pair", batch: batchName, line: lineNumber, hsk_key: hskKey, language_code: code });
        continue;
      }
      if (output[hskKey][code]) {
        blockers.push({ code: "duplicate_language_pair", batch: batchName, line: lineNumber, hsk_key: hskKey, language_code: code });
        continue;
      }
      output[hskKey][code] = {
        translation,
        example_translation: exampleTranslation,
        source: "hsk3_level2_manual_target_v1",
        batch: `config/${batchName}`,
      };
      languageCounts[code] = (languageCounts[code] ?? 0) + 1;
    }
  }
}

await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
const report = {
  release_id: RELEASE_ID,
  status: blockers.length ? "blocked" : "ok",
  batch_files: batchNames.map((name) => `config/${name}`),
  manual_keys: Object.keys(output).length,
  pending_keys: pendingKeys.size,
  language_counts: languageCounts,
  blockers,
};
await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
