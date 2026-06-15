#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATE = "20260605";
const HSK_DIR = path.join(ROOT, "outputs/hsk");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/hsk_measure_naturalness_gate_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/hsk_measure_naturalness_gate_${DATE}.md`);

const standaloneJinRegex = /(^|[^公])斤/u;
const blockedTargetMeasureRegex =
  /catty|\b[\p{L}-]*jin[\p{L}-]*\b|цзин|дзин|ђин|đin|džin|ťin|ძინ|ջին|ဂျင်|ជីន|ຈິນ|जिन|জিন|ජින්|ஜின்|జిన్|ಜಿನ್|ജിൻ|斤|근|จิน|\bkati\b|\bcân\b/iu;

function parseJsonl(text) {
  return text
    .trim()
    .split(/\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function isCurrentHskJsonl(name) {
  return (
    name.endsWith(".jsonl") &&
    (name.startsWith("hsk2_classic_level_") || name.startsWith("hsk3_level_"))
  );
}

function hasStandaloneJinSource(row) {
  if (row.source_word === "斤" || row.simplified === "斤") return true;
  return standaloneJinRegex.test(String(row.example_zh ?? ""));
}

const [languageRows, outputNames] = await Promise.all([
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
  fs.readdir(HSK_DIR),
]);
const targetCodes = languageRows.map((language) => language.spreadsheetCode).filter((code) => code !== "ZH");
const files = outputNames.filter(isCurrentHskJsonl).sort();
const blockers = [];
const checkedRows = [];

for (const file of files) {
  const rows = parseJsonl(await fs.readFile(path.join(HSK_DIR, file), "utf8"));
  for (const row of rows.filter(hasStandaloneJinSource)) {
    const releaseId = row.release_id ?? file.replace(/\.jsonl$/u, "");
    checkedRows.push({
      release_id: releaseId,
      hsk_order: Number(row.hsk_order),
      hsk_key: row.hsk_key ?? row.simplified,
      simplified: row.simplified,
      example_zh: row.example_zh,
    });
    for (const code of targetCodes) {
      const field = `example_${code}`;
      const value = String(row[field] ?? "");
      if (!value) {
        blockers.push({
          code: "hsk_measure_blank_target_example",
          release_id: releaseId,
          hsk_order: Number(row.hsk_order),
          hsk_key: row.hsk_key ?? row.simplified,
          language_code: code,
          field,
        });
      } else if (blockedTargetMeasureRegex.test(value)) {
        blockers.push({
          code: "hsk_measure_loan_unit_in_target_example",
          release_id: releaseId,
          hsk_order: Number(row.hsk_order),
          hsk_key: row.hsk_key ?? row.simplified,
          language_code: code,
          field,
          value,
        });
      }
    }
  }
}

const report = {
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  scope: "HSK-only gate for standalone Chinese 斤 in source/example rows. Word translations may explain jin/catty, but learner-facing target examples must use natural metric or half-kilo wording.",
  files_checked: files.map((name) => `outputs/hsk/${name}`),
  target_language_count: targetCodes.length,
  source_rows_with_standalone_jin: checkedRows.length,
  target_example_cells_checked: checkedRows.length * targetCodes.length,
  checked_rows: checkedRows,
  blockers,
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    "# HSK Measure Naturalness Gate",
    "",
    `Status: ${report.status}`,
    `Source rows with standalone 斤: ${report.source_rows_with_standalone_jin}`,
    `Target example cells checked: ${report.target_example_cells_checked}`,
    `Blockers: ${blockers.length}`,
    "",
    "This gate is scoped to HSK outputs only. It does not inspect ordinary decks, Oxford or Polyglot artifacts.",
    "",
    "## Checked Rows",
    "",
    ...checkedRows.map((row) => `- ${row.release_id} row ${row.hsk_order} ${row.hsk_key}: ${row.example_zh}`),
    "",
    "## Findings",
    "",
    blockers.length
      ? blockers.map((blocker) => `- BLOCKER ${blocker.release_id} row ${blocker.hsk_order} ${blocker.language_code}: ${blocker.value}`).join("\n")
      : "- No blockers.",
    "",
  ].join("\n")
);

console.log(
  JSON.stringify(
    {
      status: report.status,
      source_rows_with_standalone_jin: report.source_rows_with_standalone_jin,
      target_example_cells_checked: report.target_example_cells_checked,
      blockers: blockers.length,
      report: path.relative(ROOT, REPORT_JSON),
      markdown: path.relative(ROOT, REPORT_MD),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
