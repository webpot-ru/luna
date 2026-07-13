export const TARGET_ONLY_REGIONAL_SUPPORTS = new Set(["EN-GB", "ES", "PT"]);

const SAME_VIEWER_LANGUAGE_TARGETS_BY_SUPPORT = new Map([
  ["EN", new Set(["EN", "EN-GB"])],
  ["ES-419", new Set(["ES", "ES-419"])],
  ["PT-BR", new Set(["PT", "PT-BR"])],
]);

export function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

export function isTargetOnlyRegionalSupport(code) {
  return TARGET_ONLY_REGIONAL_SUPPORTS.has(normalizeLanguageCode(code));
}

export function sameViewerLanguageTargetBlocker({ supportLang, targetLang }) {
  const support = normalizeLanguageCode(supportLang);
  const target = normalizeLanguageCode(targetLang);
  if (!support || !target) return null;

  if (support === target) {
    return {
      reason: "same_support_target_language",
      message: `Support language ${support} cannot target itself.`,
    };
  }

  if (SAME_VIEWER_LANGUAGE_TARGETS_BY_SUPPORT.get(support)?.has(target)) {
    return {
      reason: "same_viewer_language_regional_target",
      message: `Canonical support ${support} must not target same viewer-language regional variant ${target}.`,
    };
  }

  return null;
}
