import {
  allEntrySourceBackedTranslationLanguageCodes,
  buildEntrySourceBackedTranslationFindings,
  decisionKey,
  loadEntrySourceDecisions,
  rowKey,
  rowLanguageCode,
  rowMeaningId,
  rowSetId,
  validateEntrySourceDecision,
} from "./entry-source-backed-translations.mjs";
import { loadTranslationSourcePolicy } from "./translation-source-policy.mjs";

export const translationSourceCoverageRuleVersion = "translation-source-coverage-v1";

function keyForParts(setId, meaningId, languageCode) {
  return `${setId}::${meaningId}::${languageCode}`;
}

function compactRisk(risk) {
  if (!risk) return null;
  return {
    exact_english_fallback: Boolean(risk.exact_english_fallback),
    high_english_token_ratio: Boolean(risk.high_english_token_ratio),
    english_token_ratio: risk.english_token_ratio,
    english_like_tokens: risk.english_like_tokens ?? [],
  };
}

export async function buildTranslationSourceCoverageFindings(rows, options = {}) {
  const manifestSourceIds = options.manifestSourceIds ?? new Set();
  const decisions = options.decisions ?? (await loadEntrySourceDecisions(options.decisionPath));
  const policy = options.policy ?? (await loadTranslationSourcePolicy());
  const enforcedLanguageCodes = options.enforcedLanguageCodes ?? allEntrySourceBackedTranslationLanguageCodes;
  const rowsByKey = new Map(rows.map((row) => [rowKey(row), row]));
  const checkedSetIds = new Set(rows.map((row) => rowSetId(row)));
  const blockers = [];

  const entryFindings = await buildEntrySourceBackedTranslationFindings(rows, {
    manifestSourceIds,
    decisions,
    enforcedLanguageCodes,
  });

  const blockerByKey = new Map();
  for (const blocker of entryFindings.blockers) {
    const key = keyForParts(blocker.set_id, blocker.meaning_id, blocker.language_code);
    blockerByKey.set(key, blocker);
    blockers.push({
      set_id: blocker.set_id,
      display_order: blocker.display_order,
      meaning_id: blocker.meaning_id,
      language_code: blocker.language_code,
      status: "conflict",
      reason: "entry_source_backed_translation_blocker",
      detail: blocker.reason ?? "English-shaped entry/display needs source-backed loan or repair decision.",
      risk: compactRisk(blocker.risk),
      source_ids: blocker.source_ids ?? [],
      decision_type: blocker.decision_type ?? null,
    });
  }

  const reviewedByKey = new Map();
  for (const reviewed of entryFindings.reviewed) {
    reviewedByKey.set(keyForParts(reviewed.set_id, reviewed.meaning_id, reviewed.language_code), reviewed);
  }

  for (const decision of decisions) {
    if (!checkedSetIds.has(decision.set_id)) continue;
    const key = decisionKey(decision);
    const row = rowsByKey.get(key);
    if (!row) {
      blockers.push({
        set_id: decision.set_id,
        display_order: null,
        meaning_id: decision.meaning_id,
        language_code: decision.language_code,
        status: "stale_decision",
        reason: "decision_without_current_row",
        detail: "Entry source decision no longer matches an active row in the checked deck set.",
        source_ids: decision.source_ids ?? [],
        decision_type: decision.decision_type ?? null,
      });
      continue;
    }
    const validation = validateEntrySourceDecision(decision, row, manifestSourceIds);
    if (!validation.ok) {
      blockers.push({
        set_id: rowSetId(row),
        display_order: row.display_order ?? row.displayOrder ?? null,
        meaning_id: rowMeaningId(row),
        language_code: rowLanguageCode(row),
        status: "stale_decision",
        reason: "invalid_or_stale_source_decision",
        detail: validation.issues.join("|"),
        source_ids: validation.sourceIds,
        decision_type: decision.decision_type ?? null,
      });
    }
  }

  const results = [];
  const byStatus = {};
  const byLanguage = {};

  for (const row of rows) {
    const setId = rowSetId(row);
    const meaningId = rowMeaningId(row);
    const languageCode = rowLanguageCode(row);
    const key = keyForParts(setId, meaningId, languageCode);
    const languageSourceIds = policy.language_source_ids?.[languageCode] ?? [];
    const entryBlocker = blockerByKey.get(key);
    const reviewed = reviewedByKey.get(key);
    let status = "source_partial";
    let reason = "source_family_available_without_exact_v1_lookup";
    let sourceIds = languageSourceIds;

    if (entryBlocker) {
      status = "conflict";
      reason = "entry_source_backed_translation_blocker";
      sourceIds = entryBlocker.source_ids ?? [];
    } else if (reviewed) {
      status = "loan_decision";
      reason = "current_value_locked_source_decision";
      sourceIds = reviewed.source_ids ?? [];
    } else if (languageCode === "EN" || languageCode === "EN-GB") {
      status = "not_checkable";
      reason = "base_or_regional_english_not_checked_as_translation";
    } else if (!sourceIds.length) {
      status = "no_source";
      reason = "no_configured_translation_sources";
    }

    byStatus[status] = (byStatus[status] ?? 0) + 1;
    byLanguage[languageCode] ??= {};
    byLanguage[languageCode][status] = (byLanguage[languageCode][status] ?? 0) + 1;

    results.push({
      set_id: setId,
      display_order: row.display_order ?? row.displayOrder ?? null,
      meaning_id: meaningId,
      canonical_english: row.canonical_english ?? row.canonicalEnglish ?? "",
      language_code: languageCode,
      status,
      reason,
      source_ids: sourceIds,
      global_supporting_source_ids: policy.global_supporting_source_ids ?? [],
      rule_version: translationSourceCoverageRuleVersion,
      policy_version: policy.policy_version,
    });
  }

  return {
    rows: results,
    blockers,
    byStatus,
    byLanguage,
    decisionCount: decisions.length,
    reviewed: entryFindings.reviewed,
    warnings: entryFindings.warnings,
  };
}

export function formatTranslationSourceCoverageBlocker(blocker) {
  return (
    `${blocker.set_id ?? "unknown"}#${blocker.display_order ?? "?"} ` +
    `${blocker.language_code ?? "??"}/${blocker.meaning_id ?? "unknown"}: ` +
    `${blocker.status}; ${blocker.reason}; ${blocker.detail ?? ""}`
  );
}
