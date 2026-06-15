#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const cliArgs = process.argv.slice(2);
const releaseId = cliArgs.find((arg) => !arg.startsWith("--")) ?? "english_core_3000_a1_a2_part_001_150_v1";
const contractArg = cliArgs.find((arg) => arg.startsWith("--contract="))?.slice("--contract=".length);
const sourceDirArg = cliArgs.find((arg) => arg.startsWith("--source-dir="))?.slice("--source-dir=".length);

const contractPath = path.resolve(contractArg ?? "config/english-core-3000-source-contract-v0.json");
const sourceDir = path.resolve(sourceDirArg ?? "outputs/english-core-3000/source");
const manifestPath = path.join(sourceDir, `${releaseId}_source_snapshot_manifest.json`);

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

function required(value) {
  if (Array.isArray(value)) return true;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  if (!(await pathExists(manifestPath))) {
    throw new Error(`Missing source snapshot manifest: ${path.relative(process.cwd(), manifestPath)}`);
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const errors = [];
  const warnings = [];

  if (manifest.release_id !== releaseId) errors.push(`manifest release_id=${manifest.release_id} does not match ${releaseId}`);
  if (manifest.contract_id !== contract.contract_id) {
    errors.push(`manifest contract_id=${manifest.contract_id} does not match ${contract.contract_id}`);
  }
  if (manifest.approved_for_generation !== false) {
    errors.push("source snapshot manifest must keep approved_for_generation=false");
  }

  const requiredMetadata = contract.snapshot_requirements?.required_metadata ?? [];
  for (const source of manifest.sources ?? []) {
    for (const field of requiredMetadata) {
      if (["raw_file_sha256", "normalized_file_sha256"].includes(field)) continue;
      if (!required(source[field])) errors.push(`${source.source_id}: missing ${field}`);
    }

    const sourceContract = contract.source_stack?.find((item) => item.source_id === source.source_id);
    if (!sourceContract) errors.push(`${source.source_id}: not listed in contract source_stack`);
    if (source.source_status !== sourceContract?.status) {
      warnings.push(`${source.source_id}: manifest status=${source.source_status || "blank"} differs from contract status=${sourceContract?.status || "blank"}`);
    }

    const normalizedPath = path.resolve(source.normalized_path);
    if (!(await pathExists(normalizedPath))) {
      errors.push(`${source.source_id}: missing normalized file ${source.normalized_path}`);
    } else {
      const normalizedSha = await sha256File(normalizedPath);
      if (normalizedSha !== source.normalized_file_sha256) {
        errors.push(`${source.source_id}: normalized_file_sha256 mismatch`);
      }
    }

    if (!Number.isInteger(source.normalized_rows) || source.normalized_rows <= 0) {
      errors.push(`${source.source_id}: normalized_rows must be > 0`);
    }

    if (source.source_id === "ngsl_1_2" && !/sharealike/i.test(source.source_status)) {
      warnings.push("ngsl_1_2: expected share-alike review status before production use");
    }
    if (source.source_id === "cefr_j_wordlist" && !/crosscheck/i.test(source.source_status)) {
      warnings.push("cefr_j_wordlist: expected crosscheck-only status until exact snapshot/citation review");
    }
  }

  const sourceIds = new Set((manifest.sources ?? []).map((source) => source.source_id));
  if (!sourceIds.has("ngsl_1_2")) {
    errors.push("ngsl_1_2 source snapshot is required before first English Core 3000 candidate pool.");
  }

  if (errors.length) {
    throw new Error(`English Core 3000 source snapshot is not ready:\n${errors.join("\n")}`);
  }

  console.log(
    `English Core 3000 source snapshot OK for ${releaseId}: sources=${[...sourceIds].join(", ")} warnings=${warnings.length}`
  );
  for (const warning of warnings) console.log(`WARN ${warning}`);
}

await main();
