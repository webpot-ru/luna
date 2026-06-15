import { languageOrderRecords } from "./language-order.mjs";

export const ipaTranscriptionAccuracyRuleVersion = "language-transcription-policy-v3-pronunciation-accuracy";

const ipaLanguageRecords = new Map(
  languageOrderRecords
    .filter((record) => String(record.transcriptionFormat).toLowerCase() === "ipa")
    .map((record) => [record.dbCode, record])
);

const ipaSignalPattern =
  /[ˈˌːˑəɛɪʊʌɔɒɑæɐɜɞɚɝɨɯøœɶɤɘɵɒɶɲŋɳɴʃʒʂʐçɕʑɾɽʁʀɣɰβθðɸʝɦʔɡ̯̩̥̬̪̺̻̟̠̤̰̃̍]/u;
const latinOrthographyPattern = /^[\p{Script=Latin}\p{Mark}\s'’`´.-]+$/u;
const slashWrappedPattern = /^\/(.+)\/$/u;
const asciiLikePattern = /^[A-Za-zÀ-ÿ\s'’.-]+$/u;

const orthographicFunctionWords = new Set([
  "a",
  "an",
  "the",
  "to",
  "le",
  "la",
  "les",
  "l",
  "de",
  "du",
  "des",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "ein",
  "eine",
  "einen",
  "einem",
  "einer",
  "o",
  "os",
  "um",
  "uma",
  "en",
  "ett",
  "et",
  "het",
  "de",
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
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripKnownArticles(value) {
  return normalizeComparable(value)
    .split(" ")
    .filter((token) => token && !orthographicFunctionWords.has(token))
    .join(" ");
}

function tokenSet(value) {
  return new Set(stripKnownArticles(value).split(" ").filter(Boolean));
}

function allTokensIncluded(inner, display) {
  const innerTokens = [...tokenSet(inner)];
  if (innerTokens.length === 0) return false;
  const displayTokens = tokenSet(display);
  return innerTokens.every((token) => displayTokens.has(token));
}

function startsWithOrthographicArticle(inner) {
  const first = normalizeComparable(inner).split(" ").filter(Boolean)[0] ?? "";
  return orthographicFunctionWords.has(first);
}

export function isIpaLanguage(languageCode) {
  return ipaLanguageRecords.has(languageCode);
}

export function validateIpaTranscriptionSanity(row) {
  const languageCode = row.language_code ?? row.languageCode;
  if (!isIpaLanguage(languageCode)) return [];

  const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const transcription = normalizeText(row.transcription);
  const issues = [];

  const match = transcription.match(slashWrappedPattern);
  if (!match) return issues;

  const inner = normalizeText(match[1]);
  if (!inner) return issues;

  const hasIpaSignal = ipaSignalPattern.test(inner);
  const tokenCount = normalizeComparable(inner).split(" ").filter(Boolean).length;
  const displayText = displayWord || nativeWord;
  const looksLatinOrthography = latinOrthographyPattern.test(inner);

  if (!hasIpaSignal && startsWithOrthographicArticle(inner) && tokenCount >= 2 && allTokensIncluded(inner, displayText)) {
    issues.push({
      severity: "fail",
      issue: "IPA transcription appears to contain orthographic article words rather than phonetic IPA",
    });
  }

  if (
    !hasIpaSignal &&
    languageCode !== "EN" &&
    languageCode !== "EN-GB" &&
    looksLatinOrthography &&
    tokenCount >= 2 &&
    allTokensIncluded(inner, displayText)
  ) {
    issues.push({
      severity: "fail",
      issue: "IPA transcription appears to be slash-wrapped display orthography, not IPA",
    });
  }

  if (
    !hasIpaSignal &&
    languageCode !== "EN" &&
    languageCode !== "EN-GB" &&
    asciiLikePattern.test(inner) &&
    tokenCount === 1 &&
    stripKnownArticles(inner) === stripKnownArticles(displayText)
  ) {
    issues.push({
      severity: "warning",
      issue: "IPA transcription has no IPA-specific phonetic signal and matches a short orthographic form; review if this is a genuine broad IPA value",
    });
  }

  return issues;
}

export function buildIpaTranscriptionSanityFindings(rows) {
  const blockers = [];
  const warnings = [];

  for (const row of rows) {
    for (const issue of validateIpaTranscriptionSanity(row)) {
      const finding = {
        severity: issue.severity,
        set_id: row.set_id ?? row.setId,
        meaning_id: row.meaning_id ?? row.meaningId ?? row.target_key,
        language_code: row.language_code ?? row.languageCode,
        native_word: row.native_word ?? row.nativeWord ?? row.word_with_article_or_marker ?? row.display_word ?? "",
        display_word: row.word_with_article_or_marker ?? row.display_word ?? row.native_word ?? "",
        transcription: row.transcription ?? "",
        issue: issue.issue,
      };
      if (issue.severity === "fail") blockers.push(finding);
      else warnings.push(finding);
    }
  }

  return { blockers, warnings };
}

export function formatIpaTranscriptionSanityFinding(finding) {
  const setPrefix = finding.set_id ? `${finding.set_id} ` : "";
  return `${setPrefix}${finding.language_code}/${finding.meaning_id}: ${finding.issue}; display="${finding.display_word}"; transcription="${finding.transcription}"`;
}
