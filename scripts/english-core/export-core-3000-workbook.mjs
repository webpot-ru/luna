#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

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
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/final");
const workbookPath = path.join(outputDir, "FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final.xlsx");
const manifestPath = workbookPath.replace(/\.xlsx$/i, "_manifest.json");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
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

function rangeFor(row, col, rows, cols) {
  const start = `${colName(col)}${row}`;
  const end = `${colName(col + cols - 1)}${row + rows - 1}`;
  return `${start}:${end}`;
}

function setValues(sheet, startRow, startCol, values) {
  if (!values.length) return;
  const width = Math.max(...values.map((row) => row.length));
  const padded = values.map((row) => [...row, ...Array(width - row.length).fill("")]);
  sheet.getRange(rangeFor(startRow, startCol, padded.length, width)).values = padded;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${path.relative(process.cwd(), filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

function addSheet(workbook, name, rows) {
  const sheet = workbook.worksheets.add(name);
  setValues(sheet, 1, 0, rows);
  return sheet;
}

function asSheetRows(records, headers) {
  return [headers, ...records.map((record) => headers.map((header) => record[header] ?? ""))];
}

const [contract, languageOrder] = await Promise.all([
  readJson(contractPath),
  readJson(languageOrderPath),
]);

if (contract.course?.first_release_id !== releaseId) {
  throw new Error(`Contract release mismatch: ${contract.course?.first_release_id} !== ${releaseId}`);
}
const exportableReadinessStatuses = new Set([
  "passed_source_assisted_readiness_not_delivery_approved",
  "passed_source_assisted_readiness_google_sheet_delivered",
]);
if (!exportableReadinessStatuses.has(contract.latest_source_assisted_readiness?.status)) {
  throw new Error("Source-assisted readiness must pass before workbook export.");
}

const languageCodes = languageOrder.map((language) => language.spreadsheetCode);
const sourceRows = await readJsonl(contract.latest_en_transcription_review.path);
const enGbRows = await readJsonl(contract.latest_en_gb_text_layer.path);
const sourceSnapshot = await readJson(contract.latest_source_snapshot.manifest_path);
const courseMetadata = await readJson(contract.latest_course_metadata.path);
const allLanguageAudit = await readJson(contract.latest_all_language_native_style_audit.path);
const readiness = await readJson(contract.latest_source_assisted_readiness.path);
const licenseReview = await readJson(contract.latest_license_attribution_review.path);

const merged = new Map(
  sourceRows.map((row) => [
    row.core_item_id,
    {
      ...row,
      EN: normalizeText(row.en_display),
      example_EN: normalizeText(row.example_EN),
      qa_status: "source_assisted_ready",
      qa_notes: "AI/source-assisted QA passed; not external native-speaker approved.",
    },
  ])
);

for (const row of enGbRows) {
  const target = merged.get(row.core_item_id);
  if (!target) throw new Error(`Unknown EN-GB core_item_id ${row.core_item_id}`);
  target["EN-GB"] = normalizeText(row["EN-GB"]);
  target["example_EN-GB"] = normalizeText(row["example_EN-GB"]);
}

for (const batch of contract.latest_translation_batches) {
  const rows = await readJsonl(batch.path);
  for (const row of rows) {
    const target = merged.get(row.core_item_id);
    if (!target) throw new Error(`Unknown batch core_item_id ${row.core_item_id} in ${batch.batch_id}`);
    for (const language of batch.languages) {
      target[language] = normalizeText(row[language]);
      target[`example_${language}`] = normalizeText(row[`example_${language}`]);
    }
  }
}

const fixedColumns = contract.workbook_columns.fixed_columns;
const translationColumns = languageCodes;
const exampleColumns = languageCodes.map((code) => `example_${code}`);
const statusColumns = contract.workbook_columns.status_columns;
const transcriptionColumns = contract.workbook_columns.english_only_transcription_columns;
const headers = [...fixedColumns, ...translationColumns, ...exampleColumns, ...statusColumns, ...transcriptionColumns];
const mainRows = [...merged.values()]
  .sort((a, b) => String(a.row_id).localeCompare(String(b.row_id)))
  .map((row) =>
    headers.map((header) => {
      if (header === "semantic_scene") return JSON.stringify(row.semantic_scene ?? {});
      return row[header] ?? "";
    })
  );

if (mainRows.length !== contract.course.target_selected_rows) {
  throw new Error(`Expected ${contract.course.target_selected_rows} main rows, got ${mainRows.length}`);
}
for (const row of mainRows) {
  for (const [index, value] of row.entries()) {
    const header = headers[index];
    if ((translationColumns.includes(header) || exampleColumns.includes(header)) && !normalizeText(value)) {
      throw new Error(`Missing workbook cell for ${header}`);
    }
  }
}

const workbook = Workbook.create();
const mainSheetName = contract.delivery_contract.main_sheet_name;
addSheet(workbook, mainSheetName, [headers, ...mainRows]);

const metadataCodes = courseMetadata.rows.map((row) => row.spreadsheet_code);
const metadataByCode = new Map(courseMetadata.rows.map((row) => [row.spreadsheet_code, row]));
addSheet(workbook, "Course Metadata", [
  ["", ...metadataCodes],
  ["Title", ...metadataCodes.map((code) => metadataByCode.get(code)?.title ?? "")],
  ["Description", ...metadataCodes.map((code) => metadataByCode.get(code)?.description ?? "")],
]);

addSheet(workbook, "_README", [
  ["Field", "Value"],
  ["Workbook title", contract.delivery_contract.workbook_title],
  ["Release ID", releaseId],
  ["Course ID", contract.course.course_id],
  ["Main sheet", mainSheetName],
  ["Rows", mainRows.length],
  ["Language columns", languageCodes.length],
  ["Transcription scope", contract.course.transcription_scope],
  ["EN-GB scope", "Text/example only; no EN-GB transcription columns."],
  ["Status", "source_assisted_ready_not_google_delivered"],
  ["Oxford policy", "Benchmark only; no Oxford source data, definitions, examples, pronunciations, exact order or endorsement claims."],
  ["Google Sheet created", "false"],
  ["Postgres changes", "false"],
]);

addSheet(
  workbook,
  "_languages",
  asSheetRows(languageOrder, ["spreadsheetCode", "dbCode", "language", "transcriptionFormat"])
);

addSheet(workbook, "_source_contract", [
  ["Field", "Value"],
  ["contract_id", contract.contract_id],
  ["release_id", releaseId],
  ["source_language", contract.course.source_language_code],
  ["source_variant", contract.course.source_variant],
  ["regional_variant_code", contract.course.regional_variant_code],
  ["approved_for_generation", String(contract.approved_for_generation)],
  ["approved_for_postgres_import", String(contract.approved_for_postgres_import)],
  ["approved_for_google_sheet", String(contract.approved_for_google_sheet)],
  ["license_review_status", contract.latest_license_attribution_review.status],
  ["readiness_status", contract.latest_source_assisted_readiness.status],
]);

addSheet(
  workbook,
  "_source_snapshot",
  asSheetRows(sourceSnapshot.sources, [
    "source_id",
    "source_role",
    "source_status",
    "source_url",
    "retrieved_at",
    "raw_file_sha256",
    "normalized_file_sha256",
    "normalized_rows",
    "attribution_text",
  ])
);

addSheet(workbook, "_benchmark_audit", [
  ["Field", "Value"],
  ["Oxford 3000/5000 role", "benchmark_only"],
  ["Oxford source data copied", "false"],
  ["Oxford definitions/examples/pronunciations copied", "false"],
  ["Official/certified/endorsed claims", "false"],
  ["All-language audit status", allLanguageAudit.status],
  ["All-language audit blockers", allLanguageAudit.counts?.blockers ?? ""],
  ["All-language audit warnings", allLanguageAudit.counts?.warnings ?? ""],
]);

addSheet(workbook, "_source_assisted_qa", [
  ["Field", "Value"],
  ["readiness_status", readiness.status],
  ["rows", readiness.summary.rows],
  ["language_columns", readiness.summary.language_columns],
  ["filled_display_example_cells", readiness.summary.filled_display_example_cells],
  ["expected_display_example_cells", readiness.summary.expected_display_example_cells],
  ["blockers", readiness.summary.blockers],
  ["warnings", readiness.summary.warnings],
  ["en_transcription_rows", readiness.summary.en_transcription_rows],
  ["target_language_transcription_rows", readiness.summary.target_language_transcription_rows],
  ["google_sheet_created", String(readiness.authorization.google_sheet_created)],
  ["postgres_changes", String(readiness.authorization.postgres_changes)],
]);

addSheet(workbook, "_source_decisions", [
  ["Decision", "Value"],
  ["NGSL", "Primary source-list candidate; attribute under CC BY-SA 4.0."],
  ["CEFR-J", "Level/POS crosscheck; include acknowledgement/citation."],
  ["Oxford", "Benchmark only; not production source."],
  ["EN", "US English source/default."],
  ["EN-GB", "Text/example regional column only; no transcription in first release."],
  ["Target transcriptions", "Out of scope for first release."],
]);

addSheet(workbook, "_release_metadata", [
  ["Field", "Value"],
  ["workbook_file", path.basename(workbookPath)],
  ["workbook_title", contract.delivery_contract.workbook_title],
  ["google_sheet_title", contract.delivery_contract.google_sheet_title],
  ["future_delivery_folder_name", contract.delivery_contract.future_delivery_folder_name],
  ["future_delivery_folder_id", contract.delivery_contract.future_delivery_folder_id],
  ["NGSL notice", licenseReview.sources[0].required_release_notice],
  ["NGSL license URL", licenseReview.sources[0].license_url],
  ["CEFR-J notice", licenseReview.sources[1].required_release_notice],
  ["No endorsement", "No source provider endorses or certifies this LunaCards course."],
  ["Original content note", "LunaCards meaning notes, semantic scenes, examples and translations are original/generated-reviewed course content."],
]);

const lastMainColumn = colName(headers.length - 1);
const previewRows = Math.min(mainRows.length + 1, 8);
const mainInspect = await workbook.inspect({
  kind: "table",
  range: `${mainSheetName}!A1:${lastMainColumn}${previewRows}`,
  include: "values",
  tableMaxRows: previewRows,
  tableMaxCols: Math.min(headers.length, 20),
});
console.log(mainInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

await workbook.render({ sheetName: mainSheetName, range: `A1:${lastMainColumn}${Math.min(mainRows.length + 1, 12)}`, scale: 1 });
await workbook.render({ sheetName: "Course Metadata", range: "A1:BC3", scale: 1 });
await workbook.render({ sheetName: "_README", range: "A1:B13", scale: 1 });
await workbook.render({ sheetName: "_source_assisted_qa", range: "A1:B12", scale: 1 });
await workbook.render({ sheetName: "_release_metadata", range: "A1:B12", scale: 1 });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
const workbookBytes = await fs.readFile(workbookPath);
const workbookSha256 = createHash("sha256").update(workbookBytes).digest("hex");
const manifest = {
  release_id: releaseId,
  workbook_path: path.relative(process.cwd(), workbookPath),
  workbook_file: path.basename(workbookPath),
  workbook_sha256: workbookSha256,
  generated_at: new Date().toISOString(),
  rows: mainRows.length,
  language_columns: languageCodes.length,
  main_sheet: mainSheetName,
  service_sheets: [
    "Course Metadata",
    "_README",
    "_languages",
    "_source_contract",
    "_source_snapshot",
    "_benchmark_audit",
    "_source_assisted_qa",
    "_source_decisions",
    "_release_metadata",
  ],
  google_sheet_created: false,
  postgres_changes: false,
  source_assisted_readiness_status: readiness.status,
  source_assisted_readiness_blockers: readiness.summary.blockers,
  source_assisted_readiness_warnings: readiness.summary.warnings,
};
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `English Core 3000 workbook exported: ${path.relative(process.cwd(), workbookPath)} rows=${mainRows.length} languages=${languageCodes.length} sha256=${workbookSha256}`
);
