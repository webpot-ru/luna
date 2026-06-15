#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "english_core_3000_a1_a2_part_001_150_v1";
const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const filePath = path.resolve(
  args.get("file") ?? `outputs/english-core-3000/candidate-pools/${releaseId}_candidate_pool.jsonl`
);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function isBlank(value) {
  return normalizeText(value) === "";
}

async function readJsonl(file) {
  const text = await fs.readFile(file, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  const rows = await readJsonl(filePath);
  const errors = [];
  const warnings = [];
  const poolContract = contract.candidate_pool_contract;
  const allowedDecisions = new Set(poolContract.allowed_selection_decisions);
  const requiredFields = poolContract.required_fields;
  const selectedRows = rows.filter((row) => row.selection_decision === "selected");
  const normalizedSelected = new Set();

  if (rows.length < poolContract.min_rows) {
    errors.push(`candidate pool has ${rows.length} rows, expected at least ${poolContract.min_rows}`);
  }
  if (selectedRows.length !== poolContract.selected_rows) {
    errors.push(`selected rows=${selectedRows.length}, expected ${poolContract.selected_rows}`);
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    for (const field of requiredFields) {
      if (!(field in row)) errors.push(`row ${rowNumber}: missing field ${field}`);
      if (field !== "oxford_benchmark_match" && isBlank(row[field])) errors.push(`row ${rowNumber}: blank field ${field}`);
    }
    if (!allowedDecisions.has(row.selection_decision)) {
      errors.push(`row ${rowNumber}: invalid selection_decision=${row.selection_decision}`);
    }
    if (row.release_id !== releaseId) errors.push(`row ${rowNumber}: release_id mismatch`);
    if (row.selection_decision === "selected") {
      if (!/(^|\|)(A1|A2)(\||$)/.test(row.cefr_j_level)) {
        errors.push(`row ${rowNumber}: selected row lacks CEFR-J A1/A2 support`);
      }
      const key = normalizeText(row.normalized_headword).toLowerCase();
      if (normalizedSelected.has(key)) errors.push(`row ${rowNumber}: duplicate selected normalized_headword=${key}`);
      normalizedSelected.add(key);
      if (row.oxford_benchmark_match !== "not_checked_no_oxford_source_snapshot") {
        errors.push(`row ${rowNumber}: Oxford benchmark field must not imply copied Oxford source data`);
      }
    }
  }

  const backupRows = rows.filter((row) => row.selection_decision === "backup");
  if (backupRows.length === 0) warnings.push("candidate pool has no backup rows");

  if (errors.length > 0) {
    throw new Error(`English Core 3000 candidate pool is not ready:\n${errors.join("\n")}`);
  }

  console.log(
    `English Core 3000 candidate pool OK for ${releaseId}: rows=${rows.length}, selected=${selectedRows.length}, backup=${backupRows.length}, warnings=${warnings.length}, file=${path.relative(process.cwd(), filePath)}`
  );
  for (const warning of warnings) console.log(`WARN ${warning}`);
}

await main();
