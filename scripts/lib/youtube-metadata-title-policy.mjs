function clean(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function includesFolded(haystack, needle) {
  const expected = clean(needle).normalize("NFKC").toLocaleLowerCase();
  if (!expected) return true;
  return clean(haystack).normalize("NFKC").toLocaleLowerCase().includes(expected);
}

export function minimumYouTubeTitleLength(supportLang) {
  return ["ZH", "JA", "KO"].includes(String(supportLang || "").trim().toUpperCase()) ? 15 : 25;
}

export function campaignTitleFallbackReasons({
  title,
  supportLang,
  videoType,
  targetLanguageName,
  deckTitle,
}) {
  const normalized = clean(title);
  const length = Array.from(normalized).length;
  const reasons = [];
  if (length < minimumYouTubeTitleLength(supportLang)) reasons.push("below_search_intent_minimum");
  if (length > 100) reasons.push("above_youtube_maximum");
  if (videoType === "ordinary" && !includesFolded(normalized, targetLanguageName)) reasons.push("missing_target_language_name");
  if (videoType === "ordinary" && !includesFolded(normalized, deckTitle)) reasons.push("missing_deck_title");
  return reasons;
}
