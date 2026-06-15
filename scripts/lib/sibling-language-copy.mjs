const siblingPairs = [
  ["HI", "NE", "script-neighbor"],
  ["TA", "TE", "script-neighbor"],
  ["MS", "ID", "close-standard"],
  ["PT", "PT-BR", "regional"],
  ["ES", "ES-419", "regional"],
  ["EN", "EN-GB", "regional"],
];

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

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode;
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowExample(row) {
  return normalizeText(row.example_text ?? row.exampleText ?? row.target_example);
}

function groupByMeaning(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${rowSetId(row)}::${rowMeaningId(row)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

export function buildSiblingLanguageCopyFindings(rows) {
  const warnings = [];
  const byMeaning = groupByMeaning(rows);

  for (const meaningRows of byMeaning.values()) {
    const byLanguage = new Map(meaningRows.map((row) => [rowLanguageCode(row), row]));

    for (const [sourceCode, targetCode, pairKind] of siblingPairs) {
      const source = byLanguage.get(sourceCode);
      const target = byLanguage.get(targetCode);
      if (!source || !target) continue;

      const sourceDisplay = rowDisplay(source);
      const targetDisplay = rowDisplay(target);
      const sourceExample = rowExample(source);
      const targetExample = rowExample(target);
      const displayCopied =
        normalizeComparable(sourceDisplay) &&
        normalizeComparable(sourceDisplay) === normalizeComparable(targetDisplay);
      const exampleCopied =
        normalizeComparable(sourceExample) &&
        normalizeComparable(sourceExample) === normalizeComparable(targetExample);

      if (!displayCopied && !exampleCopied) continue;

      warnings.push({
        severity: pairKind === "regional" ? "warning" : "needs_review",
        reason:
          pairKind === "regional"
            ? "regional sibling pair has identical surface text; review if this is not a valid shared regional form."
            : "sibling/neighbor language pair has identical surface text; review for copied-language fallback.",
        pair_kind: pairKind,
        set_id: rowSetId(source) || rowSetId(target),
        meaning_id: rowMeaningId(source) || rowMeaningId(target),
        canonical_english: normalizeText(source.canonical_english ?? source.canonicalEnglish ?? target.canonical_english),
        language_codes: [sourceCode, targetCode],
        copied_fields: [
          displayCopied ? "display_word" : null,
          exampleCopied ? "example_text" : null,
        ].filter(Boolean),
        sample: `${sourceCode} display="${sourceDisplay}" example="${sourceExample}" | ${targetCode} display="${targetDisplay}" example="${targetExample}"`,
        affected_rows: [source, target].map((row) => ({
          set_id: rowSetId(row),
          meaning_id: rowMeaningId(row),
          language_code: rowLanguageCode(row),
          display_word: rowDisplay(row),
          example_text: rowExample(row),
        })),
      });
    }
  }

  return { blockers: [], warnings };
}

export function formatSiblingLanguageCopyWarning(warning) {
  return `${warning.set_id} ${warning.meaning_id} ${warning.language_codes.join("/")}: ${warning.reason}; fields=${warning.copied_fields.join(",")}; ${warning.sample}`;
}
