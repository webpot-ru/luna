const expectedScriptByLanguage = new Map([
  ["ZH", { name: "Han", pattern: /\p{Script=Han}/u }],
  ["JA", { name: "Japanese", pattern: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u }],
  ["KO", { name: "Hangul", pattern: /\p{Script=Hangul}/u }],
  ["TH", { name: "Thai", pattern: /\p{Script=Thai}/u }],
  ["LO", { name: "Lao", pattern: /\p{Script=Lao}/u }],
  ["MY", { name: "Myanmar", pattern: /\p{Script=Myanmar}/u }],
  ["KM", { name: "Khmer", pattern: /\p{Script=Khmer}/u }],
  ["HI", { name: "Devanagari", pattern: /\p{Script=Devanagari}/u }],
  ["NE", { name: "Devanagari", pattern: /\p{Script=Devanagari}/u }],
  ["BN", { name: "Bengali", pattern: /\p{Script=Bengali}/u }],
  ["SI", { name: "Sinhala", pattern: /\p{Script=Sinhala}/u }],
  ["TA", { name: "Tamil", pattern: /\p{Script=Tamil}/u }],
  ["TE", { name: "Telugu", pattern: /\p{Script=Telugu}/u }],
  ["KN", { name: "Kannada", pattern: /\p{Script=Kannada}/u }],
  ["ML", { name: "Malayalam", pattern: /\p{Script=Malayalam}/u }],
  ["KA", { name: "Georgian", pattern: /\p{Script=Georgian}/u }],
  ["HY", { name: "Armenian", pattern: /\p{Script=Armenian}/u }],
  ["BG", { name: "Cyrillic", pattern: /\p{Script=Cyrillic}/u }],
  ["RU", { name: "Cyrillic", pattern: /\p{Script=Cyrillic}/u }],
  ["KK", { name: "Cyrillic", pattern: /\p{Script=Cyrillic}/u }],
]);

const latinPattern = /\p{Script=Latin}/u;
const letterPattern = /\p{Letter}/u;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode;
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowNative(row) {
  return normalizeText(row.native_word ?? row.nativeWord ?? row.display_word ?? row.displayWord);
}

function buildAffectedRow(row, field, value) {
  return {
    set_id: rowSetId(row),
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    field,
    value,
  };
}

function inspectField(row, field, value) {
  const languageCode = rowLanguageCode(row);
  const expectation = expectedScriptByLanguage.get(languageCode);
  if (!expectation || !value || !letterPattern.test(value)) return null;
  if (expectation.pattern.test(value)) {
    if (latinPattern.test(value)) {
      return {
        severity: "warning",
        reason: `${field} mixes Latin script with expected ${expectation.name} script; review if this is a real loanword or acronym.`,
      };
    }
    return null;
  }
  if (latinPattern.test(value)) {
    return {
      severity: "fail",
      reason: `${field} uses Latin script but ${languageCode} entry/display requires ${expectation.name} script; likely language-code or fallback error.`,
    };
  }
  return {
    severity: "fail",
    reason: `${field} does not contain expected ${expectation.name} script for ${languageCode}.`,
  };
}

export function buildScriptLanguageIdentityFindings(rows) {
  const blockers = [];
  const warnings = [];

  for (const row of rows) {
    for (const [field, value] of [
      ["native_word", rowNative(row)],
      ["display_word", rowDisplay(row)],
    ]) {
      const finding = inspectField(row, field, value);
      if (!finding) continue;
      const payload = {
        ...finding,
        set_id: rowSetId(row),
        meaning_id: rowMeaningId(row),
        language_code: rowLanguageCode(row),
        field,
        value,
        affected_rows: [buildAffectedRow(row, field, value)],
      };
      if (finding.severity === "fail") blockers.push(payload);
      else warnings.push(payload);
    }
  }

  return { blockers, warnings };
}

export function formatScriptLanguageIdentityFinding(finding) {
  return `${finding.language_code}/${finding.meaning_id} ${finding.reason} value="${finding.value}"`;
}
