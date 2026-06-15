#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile } from "@oai/artifact-tool";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId =
  args.get("release") ??
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const languageOrderPath = path.resolve(args.get("languages") ?? "config/language-order.json");
const workbookPath = path.resolve(
  args.get("workbook") ??
    "outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final.xlsx"
);
const manifestPath = workbookPath.replace(/\.xlsx$/i, "_manifest.json");

function fail(message) {
  throw new Error(message);
}

function colName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

const [contract, languageOrder, manifest] = await Promise.all([
  fs.readFile(contractPath, "utf8").then(JSON.parse),
  fs.readFile(languageOrderPath, "utf8").then(JSON.parse),
  fs.readFile(manifestPath, "utf8").then(JSON.parse),
]);

if (contract.course.first_release_id !== releaseId) fail("Contract release mismatch.");
if (manifest.release_id !== releaseId) fail("Manifest release mismatch.");
if (manifest.rows !== contract.course.target_selected_rows) fail("Manifest row count mismatch.");
if (manifest.language_columns !== languageOrder.length) fail("Manifest language column count mismatch.");
if (manifest.google_sheet_created !== false) fail("Manifest must not claim Google Sheet creation.");
if (manifest.postgres_changes !== false) fail("Manifest must not claim Postgres changes.");

const fixedColumns = contract.workbook_columns.fixed_columns;
const languageCodes = languageOrder.map((language) => language.spreadsheetCode);
const headers = [
  ...fixedColumns,
  ...languageCodes,
  ...languageCodes.map((code) => `example_${code}`),
  ...contract.workbook_columns.status_columns,
  ...contract.workbook_columns.english_only_transcription_columns,
];
const imported = await SpreadsheetFile.importXlsx(await fs.readFile(workbookPath));
const lastColumn = colName(headers.length - 1);
const previewInspect = await imported.inspect({
  kind: "table",
  range: `${contract.delivery_contract.main_sheet_name}!A1:T6`,
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 20,
});
const preview = JSON.parse(previewInspect.ndjson);
const actualHeaders = [];
for (let start = 0; start < headers.length; start += 20) {
  const end = Math.min(headers.length - 1, start + 19);
  const inspect = await imported.inspect({
    kind: "table",
    range: `${contract.delivery_contract.main_sheet_name}!${colName(start)}1:${colName(end)}1`,
    include: "values",
    tableMaxRows: 1,
    tableMaxCols: end - start + 1,
  });
  const chunk = JSON.parse(inspect.ndjson).values?.[0] ?? [];
  actualHeaders.push(...chunk);
}
for (const [index, expected] of headers.entries()) {
  if (actualHeaders[index] !== expected) {
    fail(`Header mismatch at ${index + 1}: expected ${expected}, got ${actualHeaders[index]}`);
  }
}
if (preview.rows < 6) fail("Main sheet preview did not import expected rows.");

const metadataCodes = [];
for (let start = 1; start <= languageCodes.length; start += 20) {
  const end = Math.min(languageCodes.length, start + 19);
  const metadataInspect = await imported.inspect({
    kind: "table",
    range: `Course Metadata!${colName(start)}1:${colName(end)}1`,
    include: "values",
    tableMaxRows: 1,
    tableMaxCols: end - start + 1,
  });
  metadataCodes.push(...(JSON.parse(metadataInspect.ndjson).values?.[0] ?? []));
}
if (metadataCodes.length !== languageCodes.length) fail("Course Metadata language count mismatch.");
for (const [index, code] of languageCodes.entries()) {
  if (metadataCodes[index] !== code) fail(`Course Metadata language order mismatch at ${index + 1}: ${metadataCodes[index]} !== ${code}`);
}

const errorScan = await imported.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
if (!/matched 0 entries/i.test(errorScan.ndjson)) {
  fail(`Workbook formula/error scan found issues: ${errorScan.ndjson}`);
}

console.log(
  `English Core 3000 workbook export OK for ${releaseId}: rows=${manifest.rows}, headers=${headers.length}, languages=${languageCodes.length}, google_sheet_created=false`
);
