const spanishArticleRules = new Map([["el", "masculine"], ["un", "masculine"], ["los", "masculine"], ["unos", "masculine"], ["la", "feminine"], ["una", "feminine"], ["las", "feminine"], ["unas", "feminine"]]);

const articleRules = new Map([
  ["DE", new Map([["der", "masculine"], ["die", "feminine"], ["das", "neuter"]])],
  ["FR", new Map([["le", "masculine"], ["un", "masculine"], ["la", "feminine"], ["une", "feminine"]])],
  ["ES", spanishArticleRules],
  ["ES-419", spanishArticleRules],
  ["IT", new Map([["il", "masculine"], ["lo", "masculine"], ["un", "masculine"], ["uno", "masculine"], ["i", "masculine"], ["gli", "masculine"], ["la", "feminine"], ["una", "feminine"], ["le", "feminine"]])],
  ["PT", new Map([["o", "masculine"], ["um", "masculine"], ["os", "masculine"], ["uns", "masculine"], ["a", "feminine"], ["uma", "feminine"], ["as", "feminine"], ["umas", "feminine"]])],
  ["PT-BR", new Map([["o", "masculine"], ["um", "masculine"], ["os", "masculine"], ["uns", "masculine"], ["a", "feminine"], ["uma", "feminine"], ["as", "feminine"], ["umas", "feminine"]])],
  ["NL", new Map([["de", "common"], ["het", "neuter"]])],
  ["SV", new Map([["en", "common"], ["ett", "neuter"]])],
  ["DA", new Map([["en", "common"], ["et", "neuter"]])],
  ["NB", new Map([["en", "common"], ["et", "neuter"]])],
]);

const ambiguousArticles = new Set(["l'", "les", "des"]);
const spanishFeminineElBeforeStressedA = new Set(["agua", "águila", "alma", "hambre", "hacha", "aula", "área"]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase();
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

function rowPartOfSpeech(row) {
  return normalizeComparable(row.part_of_speech ?? row.partOfSpeech ?? "");
}

function isPronounRow(row) {
  return /\bpronoun\b/u.test(rowPartOfSpeech(row));
}

function isNumberQuantityRow(row) {
  const partOfSpeech = rowPartOfSpeech(row);
  if (partOfSpeech === "number") return true;
  const semanticClass = normalizeComparable(row.semantic_class ?? row.semanticClass ?? "");
  if (/\b(cardinal|number|ordinal)\b/u.test(semanticClass)) return true;
  const requiredProfile = normalizeComparable(row.required_qa_profile ?? row.requiredQaProfile ?? "");
  return requiredProfile.includes("number_quantity");
}

function firstArticle(value) {
  const text = normalizeComparable(value);
  const apostrophe = text.match(/^(l')/u);
  if (apostrophe) return apostrophe[1];
  return text.split(/\s+/u)[0] ?? "";
}

function normalizedGender(value) {
  const text = normalizeComparable(value);
  if (["m", "masc", "masculine", "male"].includes(text)) return "masculine";
  if (["f", "fem", "feminine", "female"].includes(text)) return "feminine";
  if (["n", "neut", "neuter"].includes(text)) return "neuter";
  if (["c", "common"].includes(text)) return "common";
  return text;
}

function isPlural(row) {
  return normalizeComparable(row.grammatical_number).includes("plural");
}

function compatibleGender(languageCode, article, gender, row) {
  if (!article || !gender || ambiguousArticles.has(article)) return true;
  const rules = articleRules.get(languageCode);
  const expected = rules?.get(article);
  if (!expected) return true;
  if (languageCode === "ES" && article === "el" && gender === "feminine") {
    const native = normalizeComparable(row.native_word ?? row.nativeWord ?? "");
    if ([...spanishFeminineElBeforeStressedA].some((lemma) => native === lemma || native.startsWith(`${lemma} `))) return true;
  }
  if (languageCode === "ES-419" && article === "el" && gender === "feminine") {
    const native = normalizeComparable(row.native_word ?? row.nativeWord ?? "");
    if ([...spanishFeminineElBeforeStressedA].some((lemma) => native === lemma || native.startsWith(`${lemma} `))) return true;
  }
  if (languageCode === "DE" && article === "die" && isPlural(row)) return true;
  if (languageCode === "NL" && article === "de" && isPlural(row)) return true;
  if (languageCode === "NB" && article === "en" && ["masculine", "feminine", "common"].includes(gender)) return true;
  return expected === gender;
}

function payload(row, severity, reason, detail = {}) {
  return {
    severity,
    reason,
    set_id: rowSetId(row),
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    display_word: rowDisplay(row),
    article_or_marker: normalizeText(row.article_or_marker),
    gender: normalizeText(row.gender),
    grammatical_number: normalizeText(row.grammatical_number),
    ...detail,
  };
}

export function buildArticleGenderMarkerFindings(rows) {
  const blockers = [];
  const warnings = [];

  for (const row of rows) {
    const languageCode = rowLanguageCode(row);
    const rules = articleRules.get(languageCode);
    if (!rules) continue;
    if (isPronounRow(row)) continue;

    const displayArticle = firstArticle(rowDisplay(row));
    const fieldArticle = normalizeComparable(row.article_or_marker);
    const gender = normalizedGender(row.gender);

    if (fieldArticle && rules.has(fieldArticle) && displayArticle && rules.has(displayArticle) && fieldArticle !== displayArticle) {
      blockers.push(payload(row, "fail", `article_or_marker=${fieldArticle} conflicts with display article=${displayArticle}`));
    }

    const articleForGender = fieldArticle && rules.has(fieldArticle) ? fieldArticle : displayArticle;
    if (articleForGender && gender && !compatibleGender(languageCode, articleForGender, gender, row)) {
      blockers.push(
        payload(row, "fail", `gender=${gender} conflicts with article=${articleForGender}`, { article: articleForGender })
      );
    }

    if (!fieldArticle && displayArticle && rules.has(displayArticle) && !isNumberQuantityRow(row)) {
      warnings.push(payload(row, "warning", `display has article=${displayArticle}, but article_or_marker field is empty`));
    }
  }

  return { blockers, warnings };
}

export function formatArticleGenderMarkerFinding(finding) {
  return `${finding.language_code}/${finding.meaning_id} ${finding.reason}; display="${finding.display_word}" article="${finding.article_or_marker}" gender="${finding.gender}"`;
}
