#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
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
        throw new Error(`${rel(filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

const contract = await readJson(contractPath);
const releaseId = args.get("release") ?? contract.default_release?.release_id;
if (!releaseId) throw new Error("Missing release id.");
if (contract.default_release?.release_id !== releaseId) {
  throw new Error(`Contract release mismatch: ${contract.default_release?.release_id} !== ${releaseId}`);
}

const candidatePoolPath = path.resolve(
  args.get("candidate-pool") ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
);
const rows = await readJsonl(candidatePoolPath);
let changed = 0;
const nextRows = rows.map((row) => {
  const transcriptionES = transcribeSpanishText(row.display_ES, "ES");
  const transcriptionES419 = transcribeSpanishText(row.display_ES_419, "ES-419");
  if (normalizeText(row.transcription_ES) !== transcriptionES || normalizeText(row.transcription_ES_419) !== transcriptionES419) {
    changed += 1;
  }
  return {
    ...row,
    transcription_ES: transcriptionES,
    transcription_ES_419: transcriptionES419,
  };
});

await fs.writeFile(candidatePoolPath, `${nextRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
console.log(JSON.stringify({ release_id: releaseId, candidate_pool: rel(candidatePoolPath), rows: rows.length, changed }, null, 2));
