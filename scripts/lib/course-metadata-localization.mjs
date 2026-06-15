const englishLanguageCodes = new Set(["EN", "EN-GB"]);
const latinPattern = /\p{Script=Latin}/u;
const letterPattern = /\p{Letter}/u;

const expectedScriptByLanguage = new Map([
  ["ES", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["FR", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["DE", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["IT", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["PT", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["ZH", { name: "Han", pattern: /\p{Script=Han}/u }],
  ["JA", { name: "Japanese", pattern: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u }],
  ["KO", { name: "Hangul", pattern: /\p{Script=Hangul}/u }],
  ["VI", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["TH", { name: "Thai", pattern: /\p{Script=Thai}/u }],
  ["MS", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["ID", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["PL", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["NL", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["SV", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["NB", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["DA", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["FI", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["CS", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["SK", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["HU", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["RO", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
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
  ["HR", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["SR", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["SL", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["LT", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["LV", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["ET", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["IS", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["TL", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["UZ", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["AZ", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["TR", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["SW", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["PT-BR", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
  ["ES-419", { name: "Latin", pattern: /\p{Script=Latin}/u, forbidOtherLetters: true }],
]);

const nonLatinLetterPattern =
  /[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Sinhala}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Georgian}\p{Script=Armenian}]/u;

export function normalizeCourseMetadataText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}

function inspectMetadataScript(languageCode, field, value) {
  const expectation = expectedScriptByLanguage.get(languageCode);
  const text = String(value ?? "").normalize("NFC").trim();
  if (!expectation || !text || !letterPattern.test(text)) return null;
  if (!expectation.pattern.test(text)) {
    return {
      severity: "ERROR",
      issue_type: "course_metadata_script_mismatch",
      message: `${languageCode} Course Metadata ${field} does not contain expected ${expectation.name} script.`,
    };
  }
  if (expectation.forbidOtherLetters && nonLatinLetterPattern.test(text)) {
    return {
      severity: "ERROR",
      issue_type: "course_metadata_mixed_script",
      message: `${languageCode} Course Metadata ${field} mixes non-Latin script with expected ${expectation.name} script.`,
    };
  }
  if (!expectation.forbidOtherLetters && latinPattern.test(text)) {
    return {
      severity: "ERROR",
      issue_type: "course_metadata_mixed_script",
      message: `${languageCode} Course Metadata ${field} mixes Latin script with expected ${expectation.name} script.`,
    };
  }
  return null;
}

export function buildCourseMetadataLocalizationFindings(courseMetadata, { setId = "" } = {}) {
  const findings = [];
  const en = {
    title: courseMetadata.title?.EN ?? "",
    description: courseMetadata.description?.EN ?? "",
    levelSignal: courseMetadata.levelSignal?.EN ?? "",
  };
  const normalizedEn = {
    title: normalizeCourseMetadataText(en.title),
    description: normalizeCourseMetadataText(en.description),
    levelSignal: normalizeCourseMetadataText(en.levelSignal),
  };

  for (const [languageCode, title] of Object.entries(courseMetadata.title ?? {})) {
    if (englishLanguageCodes.has(languageCode)) continue;

    const description = courseMetadata.description?.[languageCode] ?? "";
    const levelSignal = courseMetadata.levelSignal?.[languageCode] ?? "";
    const normalized = {
      title: normalizeCourseMetadataText(title),
      description: normalizeCourseMetadataText(description),
      levelSignal: normalizeCourseMetadataText(levelSignal),
    };

    if (normalizedEn.description && normalized.description === normalizedEn.description) {
      findings.push({
        severity: "ERROR",
        set_id: setId,
        language_code: languageCode,
        field: "description",
        issue_type: "course_metadata_english_fallback_description",
        value: description,
        en_value: en.description,
        message: `${languageCode} Course Metadata description is an English fallback with possible localized punctuation.`,
      });
    }

    if (
      normalizedEn.title &&
      normalizedEn.description &&
      normalized.title === normalizedEn.title &&
      normalized.description === normalizedEn.description
    ) {
      findings.push({
        severity: "ERROR",
        set_id: setId,
        language_code: languageCode,
        field: "title",
        issue_type: "course_metadata_english_fallback_title",
        value: title,
        en_value: en.title,
        message: `${languageCode} Course Metadata title and description both match English fallback text.`,
      });
    }

    if (normalizedEn.levelSignal && normalized.levelSignal === normalizedEn.levelSignal) {
      findings.push({
        severity: "ERROR",
        set_id: setId,
        language_code: languageCode,
        field: "level_signal",
        issue_type: "course_metadata_english_fallback_level_signal",
        value: levelSignal,
        en_value: en.levelSignal,
        message: `${languageCode} Course Metadata level_signal matches English instead of localized level wording.`,
      });
    }

    const scriptFields = [
      ["title", title],
      ["description", description],
      ["level_signal", levelSignal],
      ["module", courseMetadata.module?.[languageCode] ?? ""],
      ["category", courseMetadata.category?.[languageCode] ?? ""],
    ];
    for (const [field, value] of scriptFields) {
      const scriptFinding = inspectMetadataScript(languageCode, field, value);
      if (!scriptFinding) continue;
      findings.push({
        ...scriptFinding,
        set_id: setId,
        language_code: languageCode,
        field,
        value,
      });
    }
  }

  return findings;
}

export function formatCourseMetadataLocalizationFinding(finding) {
  return [
    finding.issue_type,
    finding.set_id,
    finding.language_code,
    finding.field,
    JSON.stringify(finding.value),
    finding.expected_value === undefined ? undefined : `expected ${JSON.stringify(finding.expected_value)}`,
    finding.message,
  ]
    .filter((part) => part !== undefined && part !== "")
    .join(": ");
}
