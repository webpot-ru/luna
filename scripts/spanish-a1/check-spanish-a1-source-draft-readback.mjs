#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile } from "@oai/artifact-tool";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");

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

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function workbookFileName(releaseId) {
  if (releaseId !== "spanish_a1_core_part_001_300_v1") {
    return `FlashcardsLuna_${releaseId}_source_draft.xlsx`;
  }
  return "FlashcardsLuna_Spanish_A1_Core_Part_001_source_draft.xlsx";
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function inspectTable(workbook, range, rows, cols) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values",
    tableMaxRows: rows,
    tableMaxCols: cols,
  });
  const records = result.ndjson
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const table = records.find((record) => record.kind === "table");
  if (!table) {
    throw new Error(`No table record returned for ${range}.`);
  }
  return table;
}

async function main() {
  const contract = await readJson(contractPath);
  const releaseId = args.get("release") ?? contract.default_release.release_id;
  const workbookPath = path.resolve(
    args.get("workbook") ??
      contract.latest_source_draft?.workbook_path ??
      path.join("outputs/spanish-a1-core/source-drafts", workbookFileName(releaseId))
  );
  const manifestPath = path.resolve(args.get("manifest") ?? workbookPath.replace(/\.xlsx$/i, "_manifest.json"));
  const manifest = await readJson(manifestPath);
  const expectedRows = Number(contract.default_release.expected_row_count);
  const expectedColumns = Number(contract.latest_source_draft?.main_sheet_columns ?? 138);
  const workbook = await SpreadsheetFile.importXlsx(await fs.readFile(workbookPath));
  const sheet = contract.workbook.main_sheet_name;
  const headers = [];

  for (let start = 0; start < expectedColumns; start += 20) {
    const end = Math.min(expectedColumns - 1, start + 19);
    const chunk = await inspectTable(workbook, `${sheet}!${colName(start)}1:${colName(end)}1`, 1, end - start + 1);
    headers.push(...(chunk.values?.[0] ?? []));
  }

  const valuesForHeader = async (header) => {
    const index = headers.indexOf(header);
    if (index < 0) throw new Error(`Missing header: ${header}`);
    const table = await inspectTable(workbook, `${sheet}!${colName(index)}1:${colName(index)}${expectedRows + 1}`, expectedRows + 1, 1);
    return (table.values ?? []).map((row) => row[0] ?? "");
  };

  const rowIds = await valuesForHeader("row_id");
  const countFilled = async (header) => (await valuesForHeader(header)).slice(1).filter((value) => String(value).trim()).length;
  const qa = await inspectTable(workbook, "Source Assisted QA!A1:B8", 8, 2);
  const sourceContract = await inspectTable(workbook, "Source Contract!A1:B12", 12, 2);
  const qaRows = Object.fromEntries((qa.values ?? []).slice(1).map((row) => [row[0], row[1]]));
  const sourceContractRows = Object.fromEntries((sourceContract.values ?? []).slice(1).map((row) => [row[0], row[1]]));

  const summary = {
    release_id: releaseId,
    status: "pass",
    workbook: rel(workbookPath),
    manifest: rel(manifestPath),
    workbook_sha256: manifest.workbook_sha256,
    main_rows: rowIds.slice(1).filter((value) => String(value).trim()).length,
    main_cols: headers.length,
    filled_ES: await countFilled("ES"),
    filled_ES_419: await countFilled("ES-419"),
    filled_example_ES: await countFilled("example_ES"),
    filled_example_ES_419: await countFilled("example_ES-419"),
    source_contract_status: sourceContractRows.status ?? null,
    source_advisory_review: sourceContractRows.latest_source_advisory_review ?? null,
    spanish_source_candidate_gate: qaRows.spanish_source_candidate_gate ?? null,
    spanish_morphology_gate: qaRows.spanish_morphology_gate ?? null,
    blockers: 0,
  };

  const blockers = [];
  if (summary.main_rows !== expectedRows) blockers.push(`main_rows ${summary.main_rows} !== ${expectedRows}`);
  if (summary.main_cols !== expectedColumns) blockers.push(`main_cols ${summary.main_cols} !== ${expectedColumns}`);
  for (const field of ["filled_ES", "filled_ES_419", "filled_example_ES", "filled_example_ES_419"]) {
    if (summary[field] !== expectedRows) blockers.push(`${field} ${summary[field]} !== ${expectedRows}`);
  }
  if (summary.source_contract_status !== contract.status) {
    blockers.push(`source_contract_status ${summary.source_contract_status} !== ${contract.status}`);
  }
  if (summary.source_advisory_review !== contract.latest_source_advisory_review?.path) {
    blockers.push("source advisory review path missing or stale in workbook Source Contract sheet");
  }
  if (summary.spanish_source_candidate_gate !== "source_lookup_advisory_review_pass_source_partial") {
    blockers.push(`spanish_source_candidate_gate ${summary.spanish_source_candidate_gate} is not review-pass status`);
  }

  summary.blockers = blockers.length;
  summary.status = blockers.length ? "blocked" : "pass";
  console.log(JSON.stringify({ ...summary, blockers }, null, 2));
  if (blockers.length) process.exitCode = 1;
}

await main();
