const weakTokens = new Set([
  "a",
  "an",
  "the",
  "to",
  "and",
  "or",
  "of",
  "for",
  "with",
  "in",
  "on",
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
    .replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  return normalizeComparable(value)
    .split(" ")
    .filter((token) => token && !weakTokens.has(token));
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode;
}

function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowExample(row) {
  return normalizeText(row.example_text ?? row.exampleText ?? row.target_example);
}

function areCanonicalNeighbors(left, right) {
  const leftTokens = tokens(left.canonical_english ?? left.canonicalEnglish);
  const rightTokens = tokens(right.canonical_english ?? right.canonicalEnglish);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  const shared = leftTokens.filter((token) => rightTokens.includes(token));
  if (shared.length > 0) return true;
  const leftText = leftTokens.join(" ");
  const rightText = rightTokens.join(" ");
  return leftText.includes(rightText) || rightText.includes(leftText);
}

export function buildMeaningContrastFindings(rows) {
  const blockers = [];
  const warnings = [];
  const rowsBySetLanguage = new Map();

  for (const row of rows) {
    const setId = rowSetId(row);
    const languageCode = rowLanguageCode(row);
    const meaningId = rowMeaningId(row);
    if (!setId || !languageCode || !meaningId) continue;
    const key = `${setId}::${languageCode}`;
    if (!rowsBySetLanguage.has(key)) rowsBySetLanguage.set(key, []);
    rowsBySetLanguage.get(key).push(row);
  }

  for (const groupRows of rowsBySetLanguage.values()) {
    for (let leftIndex = 0; leftIndex < groupRows.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < groupRows.length; rightIndex += 1) {
        const left = groupRows[leftIndex];
        const right = groupRows[rightIndex];
        if (rowMeaningId(left) === rowMeaningId(right)) continue;

        const leftDisplay = normalizeComparable(rowDisplay(left));
        const rightDisplay = normalizeComparable(rowDisplay(right));
        const leftExample = normalizeComparable(rowExample(left));
        const rightExample = normalizeComparable(rowExample(right));
        const displaySame = leftDisplay && leftDisplay === rightDisplay;
        const exampleSame = leftExample && leftExample === rightExample;
        if (!displaySame && !exampleSame) continue;

        const finding = {
          set_id: rowSetId(left),
          language_code: rowLanguageCode(left),
          meaning_id: `${rowMeaningId(left)} / ${rowMeaningId(right)}`,
          canonical_english: `${normalizeText(left.canonical_english ?? left.canonicalEnglish)} / ${normalizeText(right.canonical_english ?? right.canonicalEnglish)}`,
          sample: `${rowMeaningId(left)} display="${rowDisplay(left)}" example="${rowExample(left)}" | ${rowMeaningId(right)} display="${rowDisplay(right)}" example="${rowExample(right)}"`,
          affected_rows: [left, right].map((row) => ({
            set_id: rowSetId(row),
            meaning_id: rowMeaningId(row),
            language_code: rowLanguageCode(row),
            display_word: rowDisplay(row),
            example_text: rowExample(row),
          })),
        };

        if (displaySame && exampleSame) {
          blockers.push({
            ...finding,
            severity: "fail",
            reason: "distinct meanings in the same deck/language have identical display word and example text",
          });
        } else if (displaySame && areCanonicalNeighbors(left, right)) {
          warnings.push({
            ...finding,
            severity: "needs_review",
            reason: "nearby meanings share the same display word; review whether the contrast is still learnable",
          });
        }
      }
    }
  }

  return { blockers, warnings };
}

export function formatMeaningContrastFinding(finding) {
  return `${finding.set_id} ${finding.language_code} ${finding.meaning_id}: ${finding.reason}; ${finding.sample}`;
}
