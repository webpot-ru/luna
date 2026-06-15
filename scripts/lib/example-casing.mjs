export const sentenceCaseLanguageCodes = new Set([
  "EN",
  "EN-GB",
  "ES",
  "ES-419",
  "FR",
  "DE",
  "IT",
  "PT",
  "PT-BR",
  "RU",
  "PL",
  "NL",
  "SV",
  "NB",
  "DA",
  "FI",
  "CS",
  "SK",
  "HU",
  "RO",
  "BG",
  "HR",
  "SR",
  "SL",
  "LT",
  "LV",
  "ET",
  "IS",
  "HY",
  "KK",
  "AZ",
  "TR",
  "UZ",
  "VI",
  "MS",
  "ID",
  "TL",
  "SW",
]);

export const noSentenceCaseLanguageCodes = new Set([
  "ZH",
  "JA",
  "KO",
  "TH",
  "LO",
  "MY",
  "KM",
  "HI",
  "BN",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
  "KA",
]);

const localeByLanguageCode = new Map([
  ["AZ", "az"],
  ["TR", "tr"],
]);

const letterPattern = /\p{Letter}/u;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function localeFor(languageCode) {
  return localeByLanguageCode.get(languageCode) ?? undefined;
}

function lowerChar(char, languageCode) {
  const locale = localeFor(languageCode);
  return locale ? char.toLocaleLowerCase(locale) : char.toLocaleLowerCase();
}

function upperChar(char, languageCode) {
  const locale = localeFor(languageCode);
  return locale ? char.toLocaleUpperCase(locale) : char.toLocaleUpperCase();
}

function isLetter(char) {
  return letterPattern.test(char);
}

function isCasedLetter(char, languageCode) {
  return isLetter(char) && lowerChar(char, languageCode) !== upperChar(char, languageCode);
}

export function findFirstCasedLetter(value, languageCode) {
  const text = String(value ?? "").normalize("NFC");
  for (const match of text.matchAll(/\p{Letter}/gu)) {
    const char = match[0];
    if (isCasedLetter(char, languageCode)) {
      return {
        index: match.index,
        char,
        lower: lowerChar(char, languageCode),
        upper: upperChar(char, languageCode),
      };
    }
  }
  return null;
}

export function uppercaseFirstCasedLetter(value, languageCode) {
  const text = String(value ?? "").normalize("NFC");
  const first = findFirstCasedLetter(text, languageCode);
  if (!first) return text;
  return `${text.slice(0, first.index)}${first.upper}${text.slice(first.index + first.char.length)}`;
}

export function isFirstCasedLetterLowercase(value, languageCode) {
  const first = findFirstCasedLetter(value, languageCode);
  return Boolean(first && first.char === first.lower && first.char !== first.upper);
}

export function isFirstCasedLetterUppercase(value, languageCode) {
  const first = findFirstCasedLetter(value, languageCode);
  return Boolean(first && first.char === first.upper && first.char !== first.lower);
}

function firstLetterWord(value) {
  const text = String(value ?? "").normalize("NFC").trim();
  const match = text.match(/^\p{Letter}+/u);
  return match?.[0] ?? "";
}

function isAllowedUppercaseDisplayPrefix(displayWord, languageCode) {
  const word = firstLetterWord(displayWord);
  if (word.length < 2) return false;
  const casedLetters = Array.from(word).filter((char) => isCasedLetter(char, languageCode));
  return casedLetters.length >= 2 && casedLetters.every((char) => char === upperChar(char, languageCode));
}

function isRequiredUppercaseDisplayWord(row, languageCode, displayWord) {
  const canonicalEnglish = normalizeText(row.canonical_english ?? row.canonicalEnglish);
  if (languageCode === "DE") return true;
  const properCalendarNames = new Set([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
  if (properCalendarNames.has(canonicalEnglish)) return true;
  const properMenuTerms = new Set(["Earl Grey tea", "English breakfast tea", "French press coffee", "Turkish coffee"]);
  if (properMenuTerms.has(canonicalEnglish)) return true;
  return (languageCode === "EN" || languageCode === "EN-GB") && displayWord === "I" && canonicalEnglish === "I";
}

export function validateExampleCasing(row) {
  const languageCode = row.language_code ?? row.languageCode;
  const exampleText = normalizeText(row.example_text ?? row.exampleText ?? row.target_example ?? row.targetExample);
  const issues = [];

  if (!exampleText || !sentenceCaseLanguageCodes.has(languageCode)) return issues;

  if (isFirstCasedLetterLowercase(exampleText, languageCode)) {
    issues.push("example must start with language-appropriate sentence capitalization");
  }

  return issues;
}

export function validateDisplayWordCasing(row) {
  const languageCode = row.language_code ?? row.languageCode;
  const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.displayWord ?? row.native_word);
  const issues = [];

  if (!displayWord || !sentenceCaseLanguageCodes.has(languageCode)) return issues;

  if (
    isFirstCasedLetterUppercase(displayWord, languageCode) &&
    !isAllowedUppercaseDisplayPrefix(displayWord, languageCode) &&
    !isRequiredUppercaseDisplayWord(row, languageCode, displayWord)
  ) {
    issues.push("display word must not start with artificial uppercase/title case");
  }

  return issues;
}

export function validateExampleAndDisplayCasing(row) {
  return [...validateExampleCasing(row), ...validateDisplayWordCasing(row)];
}

export function isSingleInitialCasingRepair(before, after, languageCode) {
  const beforeText = String(before ?? "").normalize("NFC");
  const afterText = String(after ?? "").normalize("NFC");
  return beforeText !== afterText && uppercaseFirstCasedLetter(beforeText, languageCode) === afterText;
}

export function buildExampleCasingBlockers(rows) {
  const blockers = [];
  for (const row of rows) {
    const issues = validateExampleAndDisplayCasing(row);
    for (const issue of issues) {
      blockers.push({
        set_id: row.set_id ?? row.setId,
        meaning_id: row.meaning_id ?? row.meaningId,
        example_id: row.example_id ?? row.exampleId,
        language_code: row.language_code ?? row.languageCode,
        issue,
        display_word: row.word_with_article_or_marker ?? row.display_word ?? row.displayWord ?? row.native_word ?? "",
        example_text: row.example_text ?? row.exampleText ?? row.target_example ?? row.targetExample ?? "",
      });
    }
  }
  return blockers;
}
