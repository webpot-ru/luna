#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const releaseId =
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const filePath = path.resolve(
  `outputs/english-core-3000/en-gb/${releaseId}_en_gb_text_v1.jsonl`
);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function isVerb(pos) {
  return /\bverb\b/i.test(pos) || /^(be|do|have)-verb$/i.test(pos);
}

function fail(message) {
  throw new Error(message);
}

const text = await fs.readFile(filePath, "utf8");
const rows = text
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (rows.length !== 150) fail(`Expected 150 EN-GB rows, got ${rows.length}.`);

const seen = new Set();
for (const row of rows) {
  if (row.release_id !== releaseId) fail(`Unexpected release_id for ${row.core_item_id}.`);
  if (!row.core_item_id) fail("Missing core_item_id.");
  if (seen.has(row.core_item_id)) fail(`Duplicate core_item_id ${row.core_item_id}.`);
  seen.add(row.core_item_id);
  if (!normalizeText(row["EN-GB"])) fail(`Missing EN-GB display for ${row.core_item_id}.`);
  if (!normalizeText(row["example_EN-GB"])) fail(`Missing example_EN-GB for ${row.core_item_id}.`);
  if ("transcription_EN-GB" in row) fail(`Forbidden transcription_EN-GB field on ${row.core_item_id}.`);
  if ("example_transcription_EN-GB" in row) {
    fail(`Forbidden example_transcription_EN-GB field on ${row.core_item_id}.`);
  }
  if (isVerb(row.part_of_speech) && !normalizeText(row["EN-GB"]).startsWith("to ")) {
    fail(`EN-GB verb display must use to + base verb for ${row.core_item_id}.`);
  }
}

const sameAsUs = rows.filter(
  (row) => row["EN-GB"] === row.en_display && row["example_EN-GB"] === row.example_EN
).length;

console.log(
  `English Core 3000 EN-GB layer OK for ${releaseId}: rows=${rows.length}, same_as_us=${sameAsUs}, no_transcription_columns=true`
);
