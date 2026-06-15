import { isOfficialDictionaryAdapter, isStrongDictionaryAdapter } from "./weak-language-quality-policy.mjs";

const panlexAdapters = new Set(["panlex", "panlex_meaning"]);
const weakBulkAdapters = new Set([
  "wikidata",
  "concepticon",
  "north_euralex",
  "clics",
  "alar_kn",
  "tezaurs_lv",
  "slovak_wordnet",
  "sloleks_sl",
  "indowordnet",
  "myordbok_my",
  "uzwordnet",
  "myanmar_mcfnlp_dict",
  "darsala_en_ka_lexicon",
  "weak_dictionary",
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeResolverSurface(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "")
    .trim();
}

function comparableTokens(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

export function sourceFamilyForCandidate(candidate) {
  const adapter = String(candidate.adapter ?? candidate.source ?? "");
  if (adapter === "nikl") return "official_nikl";
  if (adapter === "lexitron") return "official_lexitron";
  if (adapter === "sealang") return "sealang";
  if (adapter === "official_dictionary") return "official_dictionary";
  if (adapter === "freedict") return "freedict";
  if (adapter === "apertium") return "apertium";
  if (adapter === "dbnary") return "dbnary";
  if (adapter === "kaikki") return "kaikki";
  if (panlexAdapters.has(adapter)) return "panlex";
  if (adapter === "sinhala_para_dict") return "sinhala_para_dict";
  if (adapter === "alar_kn") return "alar_kn";
  if (adapter === "tezaurs_lv") return "tezaurs_lv";
  if (adapter === "slovak_wordnet") return "slovak_wordnet";
  if (adapter === "sloleks_sl") return "sloleks_sl";
  if (adapter === "indowordnet") return "indowordnet";
  if (adapter === "myordbok_my") return "myordbok_my";
  if (adapter === "dakshina") return "dakshina";
  if (weakBulkAdapters.has(adapter)) return adapter;
  const sourceId = String(candidate.source_id ?? candidate.source_ids?.[0] ?? "");
  if (/nikl/u.test(sourceId)) return "official_nikl";
  if (/lexitron/u.test(sourceId)) return "official_lexitron";
  if (/panlex/u.test(sourceId)) return "panlex";
  if (/freedict/u.test(sourceId)) return "freedict";
  if (/dbnary/u.test(sourceId)) return "dbnary";
  return adapter || sourceId || "unknown";
}

export function isStrongResolverCandidate(candidate) {
  const adapter = String(candidate.adapter ?? candidate.source ?? "");
  const sourceIds = candidate.source_ids ?? [candidate.source_id].filter(Boolean);
  if (isStrongDictionaryAdapter(adapter)) return true;
  return sourceIds.some((sourceId) => /nikl|lexitron|freedict|apertium|dbnary|sinhala|alar|tezaurs/i.test(String(sourceId)));
}

export function isOfficialResolverCandidate(candidate) {
  const adapter = String(candidate.adapter ?? candidate.source ?? "");
  const sourceIds = candidate.source_ids ?? [candidate.source_id].filter(Boolean);
  if (isOfficialDictionaryAdapter(adapter)) return true;
  return sourceIds.some((sourceId) => /official-nikl|official-lexitron|sealang/u.test(String(sourceId)));
}

export function candidateMatchesCurrent(candidate, row) {
  const candidateValue = normalizeResolverSurface(candidate.value);
  if (!candidateValue) return false;
  const currentValues = [
    row.native_word,
    row.display_word,
    row.word_with_article_or_marker,
  ].map(normalizeResolverSurface);
  return currentValues.some((value) => value && value === candidateValue);
}

export function englishFallbackRisk(row) {
  const current = normalizeResolverSurface(row.display_word ?? row.word_with_article_or_marker ?? row.native_word);
  const canonical = normalizeResolverSurface(row.canonical_english);
  if (!current || !canonical) return false;
  if (current === canonical) return true;
  const currentTokens = comparableTokens(row.display_word ?? row.native_word);
  const canonicalTokens = new Set(comparableTokens(row.canonical_english));
  if (currentTokens.length === 0 || canonicalTokens.size === 0) return false;
  const englishTokenCount = currentTokens.filter((token) => canonicalTokens.has(token)).length;
  return englishTokenCount >= 2 || englishTokenCount / currentTokens.length >= 0.5;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

export function classifyForcedReviewResolution({ queueItem = {}, row = {}, candidates = [] }) {
  const normalizedCandidates = candidates
    .filter((candidate) => candidate?.value)
    .map((candidate) => ({
      ...candidate,
      source_family: sourceFamilyForCandidate(candidate),
      matches_current: candidateMatchesCurrent(candidate, row),
      strong_candidate: isStrongResolverCandidate(candidate),
      official_candidate: isOfficialResolverCandidate(candidate),
    }));

  const exactMatches = normalizedCandidates.filter((candidate) => candidate.matches_current);
  const exactStrongMatches = exactMatches.filter((candidate) => candidate.strong_candidate);
  const exactOfficialMatches = exactMatches.filter((candidate) => candidate.official_candidate);
  const strongCandidates = normalizedCandidates.filter((candidate) => candidate.strong_candidate);
  const officialCandidates = normalizedCandidates.filter((candidate) => candidate.official_candidate);
  const matchedFamilies = uniqueSorted(exactMatches.map((candidate) => candidate.source_family));
  const matchedSourceIds = uniqueSorted(exactMatches.flatMap((candidate) => candidate.source_ids ?? [candidate.source_id]));
  const strongSourceIds = uniqueSorted(exactStrongMatches.flatMap((candidate) => candidate.source_ids ?? [candidate.source_id]));
  const fallbackRisk = englishFallbackRisk(row);

  let resolutionClass = "still_source_partial";
  let confidenceReason = "only weak/noisy source support or no exact current-value source match";
  let autoConfirmable = false;

  if (!row?.set_id || !row?.meaning_id || !row?.language_code) {
    resolutionClass = "not_checkable";
    confidenceReason = "current DB row was not found for this queue item";
  } else if (
    queueItem.priority === "P0" ||
    ["conflict", "source_mismatch", "stale_decision"].includes(queueItem.source_status)
  ) {
    resolutionClass = "source_conflict_needs_repair";
    confidenceReason = "existing forced queue item is already a blocker/conflict";
  } else if (exactOfficialMatches.length > 0 || exactStrongMatches.length > 0) {
    resolutionClass = "auto_confirmed_strong";
    confidenceReason = exactOfficialMatches.length > 0
      ? "current value exactly matches an official dictionary candidate"
      : "current value exactly matches a strong bilingual dictionary candidate";
    autoConfirmable = true;
  } else if (matchedFamilies.length >= 2) {
    resolutionClass = "auto_supported_multi_source";
    confidenceReason = "current value appears in at least two independent source families";
    autoConfirmable = true;
  } else if (fallbackRisk && strongCandidates.length > 0 && exactMatches.length === 0) {
    resolutionClass = "source_conflict_needs_repair";
    confidenceReason = "current value looks English-like while strong source candidates suggest another target-language value";
  } else if (normalizedCandidates.length === 0) {
    resolutionClass = "not_checkable";
    confidenceReason = "no source candidates were available for this row";
  } else if (officialCandidates.length > 0 && exactMatches.length === 0) {
    resolutionClass = "still_source_partial";
    confidenceReason = "official source has candidates, but none exactly match current value; keep for review rather than auto-repair";
  }

  return {
    resolution_class: resolutionClass,
    auto_confirmable: autoConfirmable,
    confidence_reason: confidenceReason,
    matched_source_families: matchedFamilies,
    matched_source_ids: matchedSourceIds,
    strong_source_ids: strongSourceIds,
    candidate_count: normalizedCandidates.length,
    exact_match_count: exactMatches.length,
    strong_candidate_count: strongCandidates.length,
    official_candidate_count: officialCandidates.length,
    english_fallback_risk: fallbackRisk,
    candidates: normalizedCandidates,
  };
}
