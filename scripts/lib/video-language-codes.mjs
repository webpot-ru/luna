import { languageOrderRecords } from "./language-order.mjs";

export function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

const bySpreadsheetCode = new Map(
  languageOrderRecords.map((record) => [normalizeLanguageCode(record.spreadsheetCode), record])
);

const byDbCode = new Map(
  languageOrderRecords.map((record) => [normalizeLanguageCode(record.dbCode), record])
);

export function getLanguageRecord(value) {
  const code = normalizeLanguageCode(value);
  return bySpreadsheetCode.get(code) || byDbCode.get(code) || null;
}

export function getDbLanguageCode(value) {
  const code = normalizeLanguageCode(value);
  return bySpreadsheetCode.get(code)?.dbCode || byDbCode.get(code)?.dbCode || code;
}

export function getSpreadsheetLanguageCode(value) {
  const code = normalizeLanguageCode(value);
  return byDbCode.get(code)?.spreadsheetCode || bySpreadsheetCode.get(code)?.spreadsheetCode || code;
}

export function isKnownLanguageCode(value) {
  return Boolean(getLanguageRecord(value));
}
