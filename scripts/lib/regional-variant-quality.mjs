export const regionalVariantLanguages = new Set(["EN-GB", "ES-419", "PT-BR"]);

const regionalRiskByLanguage = new Map([
  [
    "EN-GB",
    new Set([
      "apartment",
      "closet",
      "counter",
      "countertop",
      "diaper",
      "drugstore",
      "elevator",
      "faucet",
      "garbage can",
      "gasoline",
      "sidewalk",
      "trash bag",
      "trash can",
      "truck",
    ]),
  ],
  [
    "ES-419",
    new Set([
      "counter",
      "countertop",
      "faucet",
      "garbage can",
      "recycling bin",
      "sink",
      "trash bag",
      "trash can",
    ]),
  ],
  [
    "PT-BR",
    new Set([
      "compost bin",
      "counter",
      "countertop",
      "faucet",
      "garbage can",
      "recycling bin",
      "sink",
      "trash bag",
      "trash can",
    ]),
  ],
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isRegionalVariantRisk(row) {
  const languageCode = row.language_code ?? row.languageCode;
  const risks = regionalRiskByLanguage.get(languageCode);
  if (!risks) return false;
  const canonical = normalizeComparable(row.canonical_english ?? row.canonicalEnglish);
  return risks.has(canonical);
}

export function regionalVariantRiskReason(row) {
  const languageCode = row.language_code ?? row.languageCode;
  const canonical = normalizeText(row.canonical_english ?? row.canonicalEnglish);
  return `${languageCode} regional variant QA required for region-sensitive term "${canonical}"`;
}
