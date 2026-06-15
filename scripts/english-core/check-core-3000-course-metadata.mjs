#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const releaseId =
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const metadataPath = path.resolve(
  `outputs/english-core-3000/course-metadata/${releaseId}_course_metadata_v0.json`
);
const languageOrderPath = path.resolve("config/language-order.json");

const sentenceTerminators = /(?:[.!?。！？։။။؟]|\u0964|\u17D4)$/u;

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function visibleLength(value) {
  return Array.from(normalizeText(value)).length;
}

function fail(message) {
  throw new Error(message);
}

const [artifact, languageOrder] = await Promise.all([
  fs.readFile(metadataPath, "utf8").then(JSON.parse),
  fs.readFile(languageOrderPath, "utf8").then(JSON.parse),
]);

if (artifact.release_id !== releaseId) fail(`release_id mismatch: ${artifact.release_id}`);
if (!Array.isArray(artifact.rows)) fail("Course Metadata artifact rows must be an array.");
if (artifact.rows.length !== languageOrder.length) {
  fail(`Expected ${languageOrder.length} metadata rows, got ${artifact.rows.length}.`);
}

const rowsByCode = new Map(artifact.rows.map((row) => [row.spreadsheet_code, row]));
const titleLimit = artifact.title_limit ?? 25;
const descriptionLimit = artifact.description_limit ?? 60;

for (const [index, language] of languageOrder.entries()) {
  const row = rowsByCode.get(language.spreadsheetCode);
  if (!row) fail(`Missing metadata for ${language.spreadsheetCode}.`);
  if (row.order !== index + 1) fail(`Wrong order for ${language.spreadsheetCode}.`);
  if (row.db_code !== language.dbCode) fail(`Wrong db_code for ${language.spreadsheetCode}.`);
  const title = normalizeText(row.title);
  const description = normalizeText(row.description);
  const levelSignal = normalizeText(row.level_signal);
  if (!title) fail(`Empty title for ${language.spreadsheetCode}.`);
  if (!description) fail(`Empty description for ${language.spreadsheetCode}.`);
  if (!levelSignal) fail(`Empty level_signal for ${language.spreadsheetCode}.`);
  if (visibleLength(title) > titleLimit) {
    fail(`Title too long for ${language.spreadsheetCode}: ${visibleLength(title)} > ${titleLimit}.`);
  }
  if (visibleLength(description) > descriptionLimit) {
    fail(
      `Description too long for ${language.spreadsheetCode}: ${visibleLength(description)} > ${descriptionLimit}.`
    );
  }
  if (!sentenceTerminators.test(title)) fail(`Title lacks sentence punctuation for ${language.spreadsheetCode}.`);
  if (!sentenceTerminators.test(description)) {
    fail(`Description lacks sentence punctuation for ${language.spreadsheetCode}.`);
  }
  if (!description.includes(levelSignal)) {
    fail(`Description must include level_signal for ${language.spreadsheetCode}.`);
  }
}

console.log(
  `English Core 3000 Course Metadata OK for ${releaseId}: rows=${artifact.rows.length}, title_limit=${titleLimit}, description_limit=${descriptionLimit}`
);
