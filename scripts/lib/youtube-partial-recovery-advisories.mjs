const normalize = (value) => String(value || "").trim().toUpperCase();

const polyglotSlotKey = ({ supportLang, bundleKey, contentScope }) => [
  normalize(supportLang),
  String(bundleKey || "").trim(),
  String(contentScope || "").trim(),
].join("|");

export function selectBlockingPartialRecoveryAdvisories(advisories = [], missingAssignments = []) {
  const selectedSupports = new Set(missingAssignments.map((row) => normalize(row.supportLang)).filter(Boolean));
  const selectedPolyglotSlots = new Set(
    missingAssignments
      .filter((row) => row.videoType === "polyglot")
      .map((row) => polyglotSlotKey(row)),
  );

  return advisories.filter((row) => {
    const supportLang = normalize(row.supportLang);
    if (!supportLang || !selectedSupports.has(supportLang)) return false;
    if (row.type !== "polyglot_full_tail_deferred_by_active_short_unverified") return true;
    return selectedPolyglotSlots.has(polyglotSlotKey({
      supportLang,
      bundleKey: row.bundleKey,
      contentScope: row.expectedContentScope || "full",
    }));
  });
}
