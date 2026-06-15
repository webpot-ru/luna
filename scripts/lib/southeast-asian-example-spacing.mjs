export const southeastAsianExampleSpacingRuleVersion =
  "southeast-asian-example-spacing-v1-no-tokenized-km-lo-action-clauses";

const checkedLanguageCodes = new Set(["KM", "LO"]);
const spacingPatternsByLanguage = new Map([
  ["KM", /(\p{Script=Khmer})[ \t]+(\p{Script=Khmer})/u],
  ["LO", /(\p{Script=Lao})[ \t]+(\p{Script=Lao})/u],
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode ?? "";
}

function rowExampleText(row) {
  return normalizeText(row.example_text ?? row.exampleText ?? row.target_example ?? row.targetExample);
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowCanonicalExample(row) {
  return normalizeText(row.canonical_example_en ?? row.canonicalExampleEn);
}

function rowPartOfSpeech(row) {
  return normalizeComparable(row.part_of_speech ?? row.partOfSpeech);
}

function isSimpleActionRow(row) {
  return rowPartOfSpeech(row).includes("verb") && Boolean(rowCanonicalExample(row));
}

function matchSnippet(text, match) {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 8);
  const end = Math.min(text.length, index + match[0].length + 8);
  return text.slice(start, end);
}

export function validateSoutheastAsianExampleSpacing(row) {
  const languageCode = rowLanguageCode(row);
  if (!checkedLanguageCodes.has(languageCode)) return [];
  if (!isSimpleActionRow(row)) return [];

  const exampleText = rowExampleText(row);
  if (!exampleText) return [];

  const pattern = spacingPatternsByLanguage.get(languageCode);
  const match = pattern?.exec(exampleText);
  if (!match) return [];

  return [
    {
      severity: "fail",
      issue:
        "KM/LO action example has artificial whitespace between script tokens; use a natural unsegmented short action clause.",
      snippet: matchSnippet(exampleText, match),
      rule_version: southeastAsianExampleSpacingRuleVersion,
    },
  ];
}

export function buildSoutheastAsianExampleSpacingFindings(rows) {
  const blockers = [];
  let checked = 0;
  for (const row of rows) {
    if (checkedLanguageCodes.has(rowLanguageCode(row)) && isSimpleActionRow(row)) checked += 1;
    for (const issue of validateSoutheastAsianExampleSpacing(row)) {
      blockers.push({
        ...issue,
        set_id: rowSetId(row),
        display_order: row.display_order ?? row.displayOrder ?? null,
        meaning_id: rowMeaningId(row),
        example_id: row.example_id ?? row.exampleId ?? row.context_example_id ?? null,
        language_code: rowLanguageCode(row),
        example_text: rowExampleText(row),
      });
    }
  }
  return { blockers, checked };
}

export function formatSoutheastAsianExampleSpacingFinding(finding) {
  return `${finding.set_id ?? "unknown"} ${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}: ${finding.issue}; snippet="${finding.snippet ?? ""}"; example="${finding.example_text ?? ""}"`;
}
