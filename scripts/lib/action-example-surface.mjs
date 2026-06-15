export const actionExampleSurfaceRuleVersion =
  "action-example-surface-v1-no-burmese-infinitive-template-for-imperative-scenes";

const burmesePurposeMarkerPattern = /ရန်/u;

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

function rowCanonicalExample(row) {
  return normalizeText(row.canonical_example_en ?? row.canonicalExampleEn);
}

function rowPartOfSpeech(row) {
  return normalizeComparable(row.part_of_speech ?? row.partOfSpeech);
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function isSimpleImperativeActionScene(row) {
  if (!rowPartOfSpeech(row).includes("verb")) return false;
  return /^[A-Z][a-z]+(?:\s+(?:the|a|an)\s+|\s+)[^.!?]+[.!?]$/u.test(rowCanonicalExample(row));
}

export function validateActionExampleSurface(row) {
  if (rowLanguageCode(row) !== "MY") return [];
  if (!isSimpleImperativeActionScene(row)) return [];

  const exampleText = rowExampleText(row);
  if (!exampleText || !burmesePurposeMarkerPattern.test(exampleText)) return [];

  return [
    {
      severity: "fail",
      issue:
        "MY action example uses the Burmese purpose/infinitive marker for a simple imperative action scene; use a natural action clause instead.",
      rule_version: actionExampleSurfaceRuleVersion,
    },
  ];
}

export function buildActionExampleSurfaceFindings(rows) {
  const blockers = [];
  let checked = 0;
  for (const row of rows) {
    if (rowLanguageCode(row) === "MY" && isSimpleImperativeActionScene(row)) checked += 1;
    for (const issue of validateActionExampleSurface(row)) {
      blockers.push({
        ...issue,
        set_id: rowSetId(row),
        display_order: row.display_order ?? row.displayOrder ?? null,
        meaning_id: rowMeaningId(row),
        example_id: row.example_id ?? row.exampleId ?? row.context_example_id ?? null,
        language_code: rowLanguageCode(row),
        canonical_example_en: rowCanonicalExample(row),
        example_text: rowExampleText(row),
      });
    }
  }
  return { blockers, checked };
}

export function formatActionExampleSurfaceFinding(finding) {
  return `${finding.set_id ?? "unknown"} ${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}: ${finding.issue}; canonical="${finding.canonical_example_en ?? ""}"; example="${finding.example_text ?? ""}"`;
}
