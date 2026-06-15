import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalLanguageOrderText,
  languageOrderRecords,
} from "./lib/language-order.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const checks = [
  {
    file: "scripts/export-flashcards-working-sheet.mjs",
    required: "./lib/language-order.mjs",
    forbidden: [/const\s+languageOrder\s*=\s*\[/],
  },
  {
    file: "docs/data-delivery-pipeline.md",
    required: "config/language-order.json",
    forbidden: [],
  },
  {
    file: "docs/language-transcription-policy.md",
    required: "config/language-order.json",
    forbidden: [],
  },
];

const errors = [];

function parseTranscriptionPolicyRows(content) {
  const startMarker = "## Единая таблица display-transcription";
  const endMarker = "## QA-ограничения";
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) {
    errors.push("docs/language-transcription-policy.md: cannot find display-transcription table section");
    return [];
  }

  return content
    .slice(start, end)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    )
    .filter((cells) => cells.length >= 5)
    .filter((cells) => !["Код Sheets"].includes(cells[1]) && !/^---+$/.test(cells[0]))
    .map((cells) => ({
      language: cells[0],
      spreadsheetCode: cells[1].replace(/`/g, ""),
      dbCode: cells[2].replace(/`/g, ""),
      transcriptionFormat: cells[3].replace(/`/g, ""),
    }));
}

for (const check of checks) {
  const content = readFileSync(path.join(projectRoot, check.file), "utf8");

  if (!content.includes(check.required)) {
    errors.push(`${check.file}: missing required reference to ${check.required}`);
  }

  for (const pattern of check.forbidden) {
    if (pattern.test(content)) {
      errors.push(`${check.file}: contains forbidden hardcoded language order pattern ${pattern}`);
    }
  }
}

const policyContent = readFileSync(path.join(projectRoot, "docs/language-transcription-policy.md"), "utf8");
const policyRows = parseTranscriptionPolicyRows(policyContent);

if (policyRows.length !== languageOrderRecords.length) {
  errors.push(
    `docs/language-transcription-policy.md: expected ${languageOrderRecords.length} policy rows, found ${policyRows.length}`
  );
}

for (const [index, expected] of languageOrderRecords.entries()) {
  const actual = policyRows[index];
  const row = index + 1;
  if (!actual) continue;

  for (const field of ["language", "spreadsheetCode", "dbCode", "transcriptionFormat"]) {
    if (actual[field] !== expected[field]) {
      errors.push(
        `docs/language-transcription-policy.md row ${row}: ${field}=${actual[field]} does not match config/language-order.json ${expected[field]}`
      );
    }
  }
}

const policySpreadsheetCodes = new Set(policyRows.map((row) => row.spreadsheetCode));
for (const expected of languageOrderRecords) {
  if (!policySpreadsheetCodes.has(expected.spreadsheetCode)) {
    errors.push(`docs/language-transcription-policy.md: missing spreadsheet code ${expected.spreadsheetCode}`);
  }
}

for (const actual of policyRows) {
  if (!languageOrderRecords.some((record) => record.spreadsheetCode === actual.spreadsheetCode)) {
    errors.push(`docs/language-transcription-policy.md: extra spreadsheet code ${actual.spreadsheetCode}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Language order check failed:\n${errors.join("\n")}`);
}

console.log(`Language order OK: ${languageOrderRecords.length} variants`);
console.log(canonicalLanguageOrderText);
