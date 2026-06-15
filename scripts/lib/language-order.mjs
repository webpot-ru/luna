import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");
const languageOrderPath = path.join(projectRoot, "config/language-order.json");

const rawLanguageOrder = JSON.parse(readFileSync(languageOrderPath, "utf8"));

function assertLanguageOrder(records) {
  if (!Array.isArray(records)) {
    throw new Error("config/language-order.json must contain an array.");
  }

  if (records.length !== 54) {
    throw new Error(`Expected 54 language variants, found ${records.length}.`);
  }

  const spreadsheetCodes = new Set();
  const dbCodes = new Set();

  for (const [index, record] of records.entries()) {
    const row = index + 1;
    for (const key of ["spreadsheetCode", "dbCode", "language", "transcriptionFormat"]) {
      if (!record[key] || typeof record[key] !== "string") {
        throw new Error(`Language row ${row} is missing string field ${key}.`);
      }
    }

    if (spreadsheetCodes.has(record.spreadsheetCode)) {
      throw new Error(`Duplicate spreadsheet language code: ${record.spreadsheetCode}.`);
    }
    spreadsheetCodes.add(record.spreadsheetCode);

    if (dbCodes.has(record.dbCode)) {
      throw new Error(`Duplicate DB language code: ${record.dbCode}.`);
    }
    dbCodes.add(record.dbCode);
  }

  const norwegian = records.find((record) => record.spreadsheetCode === "NO");
  if (!norwegian || norwegian.dbCode !== "NB") {
    throw new Error("Norwegian must use spreadsheet code NO and DB code NB.");
  }
}

assertLanguageOrder(rawLanguageOrder);

export const languageOrderRecords = rawLanguageOrder;

export const languageOrder = rawLanguageOrder.map((record) => [
  record.spreadsheetCode,
  record.dbCode,
  record.language,
  record.transcriptionFormat,
]);

export const languageSpreadsheetCodes = rawLanguageOrder.map((record) => record.spreadsheetCode);

export const canonicalLanguageOrderText = languageSpreadsheetCodes.join(", ");
