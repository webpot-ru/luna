import { languageOrderRecords } from "./language-order.mjs";

const recordsByDbCode = new Map(languageOrderRecords.map((record) => [record.dbCode, record]));

const nativeScriptPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Sinhala}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Cyrillic}\p{Script=Armenian}\p{Script=Georgian}]/u;
const latinScriptPattern = /\p{Script=Latin}/u;
const pinyinToneMarkPattern = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ]/u;
const learnerToneMarkPattern =
  /[àáâǎèéêěìíîǐòóôǒùúûǔỳýŷÀÁÂǍÈÉÊĚÌÍÎǏÒÓÔǑÙÚÛǓỲÝŶ]|[\u0300-\u0302\u030C]/u;
const parentheticalToneLabelPattern = /\((?:mid|low|falling|high|rising|tone|register)[^)]+\)|\((?:mid|low|falling|high|rising)\)/iu;
const englishFallbackTokenAllowlist = new Set(["pizza", "press"]);
export const transcriptionPolicyShapeRuleVersion = "transcription-policy-shape-v18-ru-ingredient-loanwords";
const sourceBackedRomanizationLoanTokenAllowlist = new Map([
  // Native-script loanwords whose project romanization legitimately matches
  // the English source token. Keep this narrow so fallback tails still fail.
  ["BG", new Set(["burger", "chili", "grey", "hamburger", "hot", "latte", "mango", "masala", "matcha", "mate", "nachos", "papaya", "park", "pasta", "ranch", "tartar", "teriyaki", "yerba"])],
  ["HY", new Set(["ale", "bar", "burger", "dispenser", "french", "grey", "hamburger", "hash", "ketchup", "lager", "lungo", "mango", "margarita", "martini", "masala", "matcha", "mate", "nachos", "papaya", "ranch", "sake", "salsa", "sangria", "shot", "soda", "soju", "teriyaki", "yerba"])],
  ["JA", new Set(["banana", "chai", "matcha", "teriyaki", "tomato"])],
  ["KA", new Set(["lungo", "mango", "margarita", "martini", "over", "sake", "sangria", "salsa", "shot", "soda", "soju"])],
  ["KK", new Set(["bar", "burger", "burrito", "chili", "drip", "espresso", "french", "ketchup", "lager", "latte", "lungo", "mango", "margarita", "martini", "nachos", "protein", "ranch", "ristretto", "sake", "salsa", "shot", "soda", "tartar", "teriyaki"])],
  ["KM", new Set(["soda", "spray"])],
  ["KO", new Set(["banana", "chai", "kiwi", "papaya", "sake", "salsa", "soju", "tomato"])],
  ["HI", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["BN", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["NE", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["SI", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "sink", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["TA", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["TE", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["KN", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["ML", new Set(["ale", "aperitif", "brandy", "cider", "digestif", "gin", "lager", "margarita", "martini", "mojito", "prosecco", "rum", "sake", "sangria", "soju", "spritz", "stout", "tequila", "vermouth", "vodka"])],
  ["RU", new Set(["bar", "burger", "burrito", "chili", "espresso", "fast", "fish", "french", "grey", "ketchup", "lager", "latte", "lungo", "mango", "margarita", "martini", "masala", "matcha", "mate", "mineral", "nachos", "paprika", "park", "ranch", "ristretto", "sake", "salsa", "shot", "soda", "tartar", "teriyaki", "topping", "vodka", "yerba", "yogurt"])],
]);
const sourceBackedExactRomanizationAllowlist = new Set([
  // Georgian national romanization: მე -> me. This is a legitimate
  // deterministic romanization even when the English card is also "me".
  "KA::მე::me::me",
  "KA::მანგო::mango::mango",
  "KA::სოდა::soda::soda",
  "KA::ლუნგო::lungo::lungo",
  "KA::სალსა::salsa::salsa",
  // Russian practical Latin transliteration: парк -> park. This is a
  // legitimate deterministic romanization, not an English fallback.
  "BG::парк::park::park",
  "BG::паста::pasta::pasta",
  "BG::манго::mango::mango",
  "BG::папая::papaya::papaya",
  "BG::матча::matcha::matcha",
  "BG::йерба мате::yerba mate::yerba mate",
  "BG::бургер::burger::burger",
  "BG::хот-дог::hot dog::hot dog",
  "BG::хамбургер::hamburger::hamburger",
  "BG::начос::nachos::nachos",
  "BG::чили сос::chili sauce::chili sos",
  "BG::чили сосът::chili sauce::chili sosat",
  "BG::ранч дресинг::ranch dressing::ranch dresing",
  "BG::ранч дресингът::ranch dressing::ranch dresingat",
  "BG::терияки сос::teriyaki sauce::teriyaki sos",
  "BG::терияки сосът::teriyaki sauce::teriyaki sosat",
  "BG::тартар сос::tartar sauce::tartar sos",
  "BG::тартар сосът::tartar sauce::tartar sosat",
  "JA::バナナ::banana::banana",
  "JA::トマト::tomato::tomato",
  "JA::チャイ::chai::chai",
  "JA::抹茶::matcha::matcha",
  "JA::照り焼きソース::teriyaki sauce::teriyaki sōsu",
  "KO::바나나::banana::banana",
  "KO::차이::chai::chai",
  "KO::키위::kiwi::kiwi",
  "KO::파파야::papaya::papaya",
  "KO::사케::sake::sake",
  "KO::소주::soju::soju",
  "KO::토마토::tomato::tomato",
  "KO::살사::salsa::salsa",
  "HY::մանգո::mango::mango",
  "HY::պապայա::papaya::papaya",
  "HY::սոդա::soda::soda",
  "HY::լունգո::lungo::lungo",
  "HY::Էրլ Գրեյ թեյ::earl grey tea::erl grey tey",
  "HY::մասալա չայ::masala chai::masala chay",
  "HY::մատչա::matcha::matcha",
  "HY::մատչան::matcha::matcha",
  "HY::մատչա լատե::matcha latte::matcha late",
  "HY::յերբա մատե::yerba mate::yerba mate",
  "HY::յերբա մատեն::yerba mate::yerba mate",
  "HY::բուրգեր::burger::burger",
  "HY::բուրգերը::burger::burger",
  "HY::հոթ-դոգ::hot dog::hot dog",
  "HY::հոթ-դոգը::hot dog::hot dog",
  "HY::համբուրգեր::hamburger::hamburger",
  "HY::համբուրգերը::hamburger::hamburger",
  "HY::նաչոս::nachos::nachos",
  "HY::նաչոսը::nachos::nachos",
  "HY::կետչուպ::ketchup::ketchup",
  "HY::կետչուպը::ketchup::ketchup",
  "HY::սալսա::salsa::salsa",
  "HY::սալսան::salsa::salsa",
  "KK::манго::mango::mango",
  "KK::эспрессо::espresso::espresso",
  "KK::ристретто::ristretto::ristretto",
  "KK::лунго::lungo::lungo",
  "KK::латте::latte::latte",
  "KK::бургер::burger::burger",
  "KK::буррито::burrito::burrito",
  "KK::начос::nachos::nachos",
  "KK::кетчуп::ketchup::ketchup",
  "KK::чили тұздығы::chili sauce::chili tuzdygy",
  "KK::ранч тұздығы::ranch dressing::ranch tuzdygy",
  "KK::терияки тұздығы::teriyaki sauce::teriyaki tuzdygy",
  "KK::сальса::salsa::salsa",
  "KK::тартар тұздығы::tartar sauce::tartar tuzdygy",
  "RU::парк::park::park",
  "RU::йогурт::yogurt::yogurt",
  "RU::манго::mango::mango",
  "RU::паприка::paprika::paprika",
  "RU::эспрессо::espresso::espresso",
  "RU::ристретто::ristretto::ristretto",
  "RU::лунго::lungo::lungo",
  "RU::латте::latte::latte",
  "RU::бургер::burger::burger",
  "RU::буррито::burrito::burrito",
  "RU::начос::nachos::nachos",
  "RU::кетчуп::ketchup::ketchup",
  "RU::сальса::salsa::salsa",
  "RU::топпинг::topping::topping",
  "RU::матча::matcha::matcha",
  "RU::матча латте::matcha latte::matcha latte",
  "RU::йерба мате::yerba mate::yerba mate",
  "RU::бар::bar::bar",
  "RU::шот::shot::shot",
  "RU::лагер::lager::lager",
  "RU::саке::sake::sake",
  "RU::водка::vodka::vodka",
  "RU::мартини::martini::martini",
  "RU::маргарита::margarita::margarita",
]);
const misspelledEnglishFallbackPattern = /\bkitcen\b/iu;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePolicyText(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeFallbackText(value) {
  return normalizePolicyText(value)
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function withoutEnglishDisplayPrefix(value) {
  return value.replace(/^(?:a|an|the|to)\s+/u, "");
}

function matchesCanonicalEnglishFallback(transcriptionFallback, canonicalEnglishFallback) {
  if (!transcriptionFallback || !canonicalEnglishFallback) return false;
  return (
    transcriptionFallback === canonicalEnglishFallback ||
    withoutEnglishDisplayPrefix(transcriptionFallback) === withoutEnglishDisplayPrefix(canonicalEnglishFallback)
  );
}

function isAllowedExactRomanizationFallback({ languageCode, nativeWord, displayWord, transcriptionFallback, canonicalEnglishFallback }) {
  if (!transcriptionFallback || transcriptionFallback !== canonicalEnglishFallback) return false;
  const nativeCandidates = new Set([normalizeText(nativeWord), normalizeText(displayWord)].filter(Boolean));
  const sourceBackedLoanTokens =
    sourceBackedRomanizationLoanTokenAllowlist.get(languageCode) ?? new Set();
  const canonicalTokens = normalizeFallbackText(canonicalEnglishFallback).split(" ").filter(Boolean);
  if (
    canonicalTokens.length === 1 &&
    sourceBackedLoanTokens.has(canonicalTokens[0]) &&
    [...nativeCandidates].some((nativeCandidate) => hasNativeScript(nativeCandidate))
  ) {
    return true;
  }
  for (const nativeCandidate of nativeCandidates) {
    if (
      sourceBackedExactRomanizationAllowlist.has(
        `${languageCode}::${nativeCandidate}::${canonicalEnglishFallback}::${transcriptionFallback}`
      )
    ) {
      return true;
    }
  }
  return false;
}

function canonicalEnglishTokens(value, languageCode) {
  const sourceBackedLoanTokens =
    sourceBackedRomanizationLoanTokenAllowlist.get(languageCode) ?? new Set();
  return normalizeFallbackText(value)
    .split(" ")
    .filter(
      (token) =>
        token.length >= 4 &&
        !englishFallbackTokenAllowlist.has(token) &&
        !sourceBackedLoanTokens.has(token)
    );
}

function transcriptionFallbackTokens(value) {
  return new Set(normalizeFallbackText(value).split(" ").filter(Boolean));
}

function findCanonicalEnglishTokenLeaks(transcription, canonicalEnglish, languageCode) {
  const transcriptionTokens = transcriptionFallbackTokens(transcription);
  return canonicalEnglishTokens(canonicalEnglish, languageCode).filter((token) =>
    transcriptionTokens.has(token)
  );
}

function policyKind(record) {
  const format = record.transcriptionFormat.toLowerCase();
  if (format.startsWith("native orthography")) return "native_orthography";
  if (format === "ipa") return "ipa";
  return "romanization";
}

function hasNativeScript(value) {
  return nativeScriptPattern.test(value);
}

function hasLatinScript(value) {
  return latinScriptPattern.test(value);
}

function isIpaShape(value) {
  const text = normalizeText(value);
  return /^\/.+\/$/.test(text);
}

function ipaInner(value) {
  return normalizeText(value).replace(/^\/|\/$/gu, "").trim();
}

function normalizeIpaPrefixComparable(value) {
  return ipaInner(value)
    .normalize("NFC")
    .replace(/^[ˈˌ.\s]+/gu, "")
    .replace(/\s+/gu, " ");
}

function startsWithIpaPrefix(transcription, prefixes) {
  const inner = normalizeIpaPrefixComparable(transcription);
  return prefixes.some((prefix) => inner.startsWith(prefix));
}

const ipaDisplayPrefixRules = [
  {
    languages: new Set(["EN"]),
    pattern: /^a pair of\b/iu,
    expected: ["ə ˈpɛr əv", "eɪ ˈpɛr əv"],
    label: "a pair of",
  },
  {
    languages: new Set(["EN-GB"]),
    pattern: /^a pair of\b/iu,
    expected: ["ə ˈpeə əv", "eɪ ˈpeə əv", "ə ˌpeər əv", "eɪ ˌpeər əv"],
    label: "a pair of",
  },
  {
    languages: new Set(["EN", "EN-GB"]),
    pattern: /^an\b/iu,
    expected: ["ən"],
    label: "an",
  },
  {
    languages: new Set(["EN", "EN-GB"]),
    pattern: /^a\b/iu,
    expected: ["ə", "eɪ"],
    label: "a",
  },
  {
    languages: new Set(["EN", "EN-GB"]),
    pattern: /^the\b/iu,
    expected: ["ðə", "ði", "ðɪ"],
    label: "the",
  },
  {
    languages: new Set(["EN", "EN-GB"]),
    pattern: /^to\b/iu,
    expected: ["tə", "tu", "tʊ"],
    label: "to",
  },
  {
    languages: new Set(["FR"]),
    pattern: /^l['’ʼ]/iu,
    expected: ["l"],
    label: "l'",
  },
  {
    languages: new Set(["FR"]),
    pattern: /^le\b/iu,
    expected: ["lə", "lœ"],
    label: "le",
  },
  {
    languages: new Set(["FR"]),
    pattern: /^la\b/iu,
    expected: ["la"],
    label: "la",
  },
  {
    languages: new Set(["FR"]),
    pattern: /^les\b/iu,
    expected: ["le", "lɛ"],
    label: "les",
  },
  {
    languages: new Set(["FR"]),
    pattern: /^un\b/iu,
    expected: ["œ̃", "ɛ̃"],
    label: "un",
  },
  {
    languages: new Set(["FR"]),
    pattern: /^une\b/iu,
    expected: ["yn"],
    label: "une",
  },
  {
    languages: new Set(["DE"]),
    pattern: /^der\b/iu,
    expected: ["deːɐ̯", "dɛɐ̯"],
    label: "der",
  },
  {
    languages: new Set(["DE"]),
    pattern: /^die\b/iu,
    expected: ["diː"],
    label: "die",
  },
  {
    languages: new Set(["DE"]),
    pattern: /^das\b/iu,
    expected: ["das"],
    label: "das",
  },
  {
    languages: new Set(["PT"]),
    pattern: /^o\b/iu,
    expected: ["u"],
    label: "o",
  },
  {
    languages: new Set(["PT"]),
    pattern: /^a\b/iu,
    expected: ["ɐ", "a"],
    label: "a",
  },
  {
    languages: new Set(["PT"]),
    pattern: /^os\b/iu,
    expected: ["uʃ"],
    label: "os",
  },
  {
    languages: new Set(["PT"]),
    pattern: /^as\b/iu,
    expected: ["ɐʃ", "aʃ"],
    label: "as",
  },
  {
    languages: new Set(["PT-BR"]),
    pattern: /^o\b/iu,
    expected: ["u"],
    label: "o",
  },
  {
    languages: new Set(["PT-BR"]),
    pattern: /^a\b/iu,
    expected: ["a", "ɐ"],
    label: "a",
  },
  {
    languages: new Set(["PT-BR"]),
    pattern: /^os\b/iu,
    expected: ["us", "uz", "uʃ"],
    label: "os",
  },
  {
    languages: new Set(["PT-BR"]),
    pattern: /^as\b/iu,
    expected: ["as", "aʃ", "ɐʃ"],
    label: "as",
  },
  {
    languages: new Set(["NL"]),
    pattern: /^de\b/iu,
    expected: ["də", "dɛ"],
    label: "de",
  },
  {
    languages: new Set(["NL"]),
    pattern: /^het\b/iu,
    expected: ["hət", "ət", "hɛt"],
    label: "het",
  },
  {
    languages: new Set(["SV"]),
    pattern: /^en\b/iu,
    expected: ["ɛn", "en"],
    label: "en",
  },
  {
    languages: new Set(["SV"]),
    pattern: /^ett\b/iu,
    expected: ["ɛt", "et"],
    label: "ett",
  },
  {
    languages: new Set(["NB"]),
    pattern: /^en\b/iu,
    expected: ["en", "ɛn", "ən"],
    label: "en",
  },
  {
    languages: new Set(["NB"]),
    pattern: /^et\b/iu,
    expected: ["et", "eː", "ɛt", "ət"],
    label: "et",
  },
  {
    languages: new Set(["DA"]),
    pattern: /^en\b/iu,
    expected: ["en", "ɛn"],
    label: "en",
  },
  {
    languages: new Set(["DA"]),
    pattern: /^et\b/iu,
    expected: ["ed", "et", "eð"],
    label: "et",
  },
];

function findIpaDisplayCoverageIssue(languageCode, displayWord, transcription) {
  const normalizedDisplay = normalizePolicyText(displayWord);
  for (const rule of ipaDisplayPrefixRules) {
    if (!rule.languages.has(languageCode) || !rule.pattern.test(normalizedDisplay)) continue;
    if (!startsWithIpaPrefix(transcription, rule.expected)) {
      return `IPA transcription must include the display function word "${rule.label}" at the start`;
    }
    return null;
  }
  return null;
}

function isDeprecatedToneSystem(languageCode, romanizationSystem) {
  const system = normalizePolicyText(romanizationSystem);
  if (languageCode === "TH") return /\brtgs\b/.test(system);
  if (languageCode === "LO") return /\bbgn\b|\bpcgn\b/.test(system);
  if (languageCode === "MY") {
    return system === "practical learner romanization" || !/tone|register/.test(system);
  }
  return false;
}

function declaresLearnerToneSystem(languageCode, romanizationSystem) {
  const system = normalizePolicyText(romanizationSystem);
  if (languageCode === "TH") return /paiboon|tone/.test(system);
  if (languageCode === "LO") return /vientiane|tone/.test(system);
  if (languageCode === "MY") return /tone|register/.test(system);
  return false;
}

export function getLanguagePolicyRecord(languageCode) {
  const record = recordsByDbCode.get(languageCode);
  if (!record) throw new Error(`No transcription policy for DB language code ${languageCode}`);
  return record;
}

export function findTranscriptionFallbackIssues(row) {
  const record = getLanguagePolicyRecord(row.language_code ?? row.languageCode);
  const languageCode = record.dbCode;
  if (policyKind(record) !== "romanization") return [];

  const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const transcription = normalizeText(row.transcription);
  const canonicalEnglish = normalizeText(row.canonical_english ?? row.canonicalEnglish).toLowerCase();
  const canonicalEnglishFallback = normalizeFallbackText(canonicalEnglish);
  const transcriptionFallback = normalizeFallbackText(transcription);

  if (!transcription) return [];

  const hasNativeDisplay = hasNativeScript(displayWord) || hasNativeScript(nativeWord);
  if (!hasNativeDisplay && languageCode !== "MY") return [];

  if (!canonicalEnglishFallback) {
    return ["canonical English is required for romanization fallback check"];
  }

  if (
    matchesCanonicalEnglishFallback(transcriptionFallback, canonicalEnglishFallback) &&
    !isAllowedExactRomanizationFallback({
      languageCode,
      nativeWord,
      displayWord,
      transcriptionFallback,
      canonicalEnglishFallback,
    })
  ) {
    return ["romanization transcription must not fall back to canonical English"];
  }

  const leakedTokens = findCanonicalEnglishTokenLeaks(transcription, canonicalEnglish, languageCode);
  if (leakedTokens.length > 0) {
    return [`romanization transcription contains canonical English token(s): ${leakedTokens.join(", ")}`];
  }

  if (misspelledEnglishFallbackPattern.test(transcription)) {
    return ['romanization transcription contains misspelled English fallback token "kitcen"'];
  }

  return [];
}

export function validateTranscriptionShape(row) {
  const record = getLanguagePolicyRecord(row.language_code ?? row.languageCode);
  const languageCode = record.dbCode;
  const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const transcription = normalizeText(row.transcription);
  const romanizationSystem = normalizeText(row.romanization_system ?? row.romanizationSystem ?? row.transcription_system ?? row.transcriptionSystem);
  const partOfSpeech = normalizeText(row.part_of_speech ?? row.partOfSpeech).toLowerCase();
  const issues = [];

  if (!displayWord) {
    issues.push("display word is empty");
  }
  if (!transcription) {
    issues.push("transcription is empty");
  }

  if ((languageCode === "EN" || languageCode === "EN-GB") && partOfSpeech === "verb") {
    if (!/^to\s+\S+/i.test(displayWord)) {
      issues.push(`${languageCode} verb display must use "to + base verb"`);
    }
  }

  if (!transcription) {
    return issues;
  }

  const kind = policyKind(record);
  if (kind === "native_orthography") {
    if (transcription !== displayWord) {
      issues.push("native-orthography transcription must exactly repeat the display word");
    }
    return issues;
  }

  if (kind === "ipa") {
    if (!isIpaShape(transcription)) {
      issues.push("IPA transcription must be wrapped in /.../");
    }
    if (transcription === displayWord || transcription === nativeWord) {
      issues.push("IPA transcription must not be the plain display/native word");
    }
    const coverageIssue = findIpaDisplayCoverageIssue(languageCode, displayWord, transcription);
    if (coverageIssue) issues.push(coverageIssue);
    return issues;
  }

  if (displayWord && hasNativeScript(displayWord)) {
    if (hasNativeScript(transcription)) {
      issues.push("romanization transcription must not contain native-script characters");
    }
    if (transcription === displayWord || transcription === nativeWord) {
      issues.push("romanization transcription must not copy the display/native word");
    }
    if (!hasLatinScript(transcription)) {
      issues.push("romanization transcription must contain Latin-script letters");
    }
  }

  for (const issue of findTranscriptionFallbackIssues(row)) issues.push(issue);

  if (languageCode === "ZH") {
    if (hasNativeScript(transcription)) {
      issues.push("ZH transcription must be pinyin, not Han characters");
    }
    if (!pinyinToneMarkPattern.test(transcription)) {
      issues.push("ZH pinyin must contain tone marks");
    }
  }

  if (languageCode === "TH" || languageCode === "LO") {
    if (parentheticalToneLabelPattern.test(transcription)) {
      issues.push(`${languageCode} tone information must use vowel diacritics, not parenthetical tone labels`);
    }
    if (isDeprecatedToneSystem(languageCode, romanizationSystem)) {
      issues.push(`${languageCode} romanization system is deprecated for final-ready tone-aware transcription`);
    }
    if (!learnerToneMarkPattern.test(transcription) && !declaresLearnerToneSystem(languageCode, romanizationSystem)) {
      issues.push(`${languageCode} tone-aware learner romanization must declare the project learner tone system`);
    }
  }

  if (languageCode === "MY") {
    if (isDeprecatedToneSystem(languageCode, romanizationSystem)) {
      issues.push("MY romanization system must declare practical tone/register notation");
    }
  }

  return issues;
}

export function buildTranscriptionShapeBlockers(rows) {
  const blockers = [];
  for (const row of rows) {
    const issues = validateTranscriptionShape(row);
    for (const issue of issues) {
      blockers.push({
        language_code: row.language_code ?? row.languageCode,
        meaning_id: row.meaning_id ?? row.meaningId,
        issue,
        display_word: row.word_with_article_or_marker ?? row.display_word ?? row.native_word ?? "",
        transcription: row.transcription ?? "",
      });
    }
  }
  return blockers;
}

export function buildIntraLanguageTranscriptionCollapseFindings(rows) {
  const byLanguage = new Map();
  for (const row of rows) {
    const record = getLanguagePolicyRecord(row.language_code ?? row.languageCode);
    if (policyKind(record) !== "romanization") continue;

    const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
    const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
    if (!hasNativeScript(displayWord) && !hasNativeScript(nativeWord) && record.dbCode !== "MY") continue;

    const transcription = normalizeText(row.transcription);
    if (!transcription) continue;

    const setId = row.set_id ?? row.setId ?? "";
    const languageCode = record.dbCode;
    const groupKey = `${setId}::${languageCode}`;
    if (!byLanguage.has(groupKey)) {
      byLanguage.set(groupKey, {
        set_id: setId,
        language_code: languageCode,
        rows: [],
      });
    }
    byLanguage.get(groupKey).rows.push({
      meaning_id: row.meaning_id ?? row.meaningId,
      canonical_english: row.canonical_english ?? row.canonicalEnglish,
      display_word: displayWord,
      transcription,
      normalized_transcription: normalizeFallbackText(transcription),
    });
  }

  const findings = [];
  for (const group of byLanguage.values()) {
    const byTranscription = new Map();
    for (const row of group.rows) {
      if (!byTranscription.has(row.normalized_transcription)) byTranscription.set(row.normalized_transcription, []);
      byTranscription.get(row.normalized_transcription).push(row);
    }

    const threshold = Math.max(6, Math.ceil(group.rows.length * 0.25));
    for (const [normalizedTranscription, collapsedRows] of byTranscription.entries()) {
      const uniqueDisplayWords = new Set(collapsedRows.map((row) => normalizeFallbackText(row.display_word)));
      if (collapsedRows.length < threshold || uniqueDisplayWords.size < 3) continue;
      findings.push({
        set_id: group.set_id,
        language_code: group.language_code,
        normalized_transcription: normalizedTranscription,
        row_count: collapsedRows.length,
        total_rows: group.rows.length,
        affected_rows: collapsedRows.map((row) => ({
          meaning_id: row.meaning_id,
          canonical_english: row.canonical_english,
          display_word: row.display_word,
          transcription: row.transcription,
        })),
      });
    }
  }

  return findings;
}
