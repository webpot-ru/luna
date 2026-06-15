export const cjkExampleSpacingRuleVersion = "cjk-example-spacing-v1-no-cjk-token-spaces";

const cjkExampleLanguageCodes = new Set(["ZH", "JA"]);
const chineseInternalSpacePattern = /(\p{Script=Han})\s+(\p{Script=Han})/u;
const japaneseInternalSpacePattern =
  /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])\s+([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/u;

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

function spacingPatternForLanguage(languageCode) {
  if (languageCode === "ZH") return chineseInternalSpacePattern;
  if (languageCode === "JA") return japaneseInternalSpacePattern;
  return null;
}

function matchSnippet(text, match) {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 8);
  const end = Math.min(text.length, index + match[0].length + 8);
  return text.slice(start, end);
}

export function validateCjkExampleSpacing(row) {
  const languageCode = rowLanguageCode(row);
  if (!cjkExampleLanguageCodes.has(languageCode)) return [];

  const exampleText = rowExampleText(row);
  if (!exampleText) return [];

  const pattern = spacingPatternForLanguage(languageCode);
  const match = pattern?.exec(exampleText);
  if (!match) return [];

  return [
    {
      severity: "fail",
      issue:
        "ZH/JA example has artificial whitespace between CJK script tokens; use normal target-script spacing instead.",
      snippet: matchSnippet(exampleText, match),
      rule_version: cjkExampleSpacingRuleVersion,
    },
  ];
}

export function buildCjkExampleSpacingFindings(rows) {
  const blockers = [];
  for (const row of rows) {
    for (const issue of validateCjkExampleSpacing(row)) {
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
  return { blockers, checked: rows.filter((row) => cjkExampleLanguageCodes.has(rowLanguageCode(row))).length };
}

export function formatCjkExampleSpacingFinding(finding) {
  return `${finding.set_id ?? "unknown"} ${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}: ${finding.issue}; snippet="${finding.snippet ?? ""}"; example="${finding.example_text ?? ""}"`;
}
