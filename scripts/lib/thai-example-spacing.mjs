export const thaiExampleSpacingRuleVersion = "thai-example-spacing-v1-no-tokenized-thai-clauses";

const thaiLanguageCodes = new Set(["TH"]);
const thaiInternalSpacePattern = /(\p{Script=Thai})[ \t]+(\p{Script=Thai})/u;

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim();
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

function matchSnippet(text, match) {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 8);
  const end = Math.min(text.length, index + match[0].length + 8);
  return text.slice(start, end);
}

export function validateThaiExampleSpacing(row) {
  const languageCode = rowLanguageCode(row);
  if (!thaiLanguageCodes.has(languageCode)) return [];

  const exampleText = rowExampleText(row);
  if (!exampleText) return [];

  const match = thaiInternalSpacePattern.exec(exampleText);
  if (!match) return [];

  return [
    {
      severity: "fail",
      issue:
        "TH example has artificial whitespace between Thai script tokens; use a natural unsegmented Thai clause for simple card examples.",
      snippet: matchSnippet(exampleText, match),
      rule_version: thaiExampleSpacingRuleVersion,
    },
  ];
}

export function buildThaiExampleSpacingFindings(rows) {
  const blockers = [];
  for (const row of rows) {
    for (const issue of validateThaiExampleSpacing(row)) {
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
  return { blockers, checked: rows.filter((row) => thaiLanguageCodes.has(rowLanguageCode(row))).length };
}

export function formatThaiExampleSpacingFinding(finding) {
  return `${finding.set_id ?? "unknown"} ${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}: ${finding.issue}; snippet="${finding.snippet ?? ""}"; example="${finding.example_text ?? ""}"`;
}
