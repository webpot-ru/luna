import { languageOrderRecords } from "./language-order.mjs";

export const highRiskEntryFallbackCodes = new Set([
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
  "HY",
  "BG",
  "RU",
  "KK",
]);

const languageMetaByDbCode = new Map(languageOrderRecords.map((record) => [record.dbCode, record]));
const latinScriptPattern = /\p{Script=Latin}/u;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEntrySurface(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^(?:a|an|the|to|el|la|los|las|un|una|o|a|os|as)\s+/u, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stableUnique(values) {
  return [...new Set(values.filter(Boolean))];
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode;
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowNative(row) {
  return normalizeText(row.native_word ?? row.nativeWord ?? row.display_word ?? row.displayWord);
}

function rowSurface(row) {
  return rowDisplay(row) || rowNative(row);
}

function isHighRiskEntryRow(row) {
  return highRiskEntryFallbackCodes.has(rowLanguageCode(row));
}

function hasLatin(value) {
  return latinScriptPattern.test(value);
}

function collapseSample(group) {
  return group
    .slice()
    .sort((a, b) => rowLanguageCode(a).localeCompare(rowLanguageCode(b)))
    .map((row) => `${rowLanguageCode(row)}=${rowSurface(row)}`)
    .join(" | ");
}

function buildAffectedRows(group) {
  return group.map((row) => ({
    set_id: rowSetId(row),
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    native_word: rowNative(row),
    display_word: rowDisplay(row),
  }));
}

function buildEnglishFallbackBlockers(rows) {
  const blockers = [];
  for (const row of rows) {
    const languageCode = rowLanguageCode(row);
    if (languageCode === "EN" || languageCode === "EN-GB") continue;
    if (!isHighRiskEntryRow(row)) continue;

    const canonical = normalizeEntrySurface(row.canonical_english ?? row.canonicalEnglish);
    const surface = normalizeEntrySurface(rowSurface(row));
    const native = normalizeEntrySurface(rowNative(row));
    if (!canonical) continue;

    if ((surface === canonical || native === canonical) && hasLatin(rowSurface(row))) {
      blockers.push({
        severity: "fail",
        reason: "high-risk non-English entry/display appears to be copied from canonical English",
        set_id: rowSetId(row),
        meaning_id: rowMeaningId(row),
        canonical_english: normalizeText(row.canonical_english ?? row.canonicalEnglish),
        language_code: languageCode,
        language_codes: [languageCode],
        sample: `${languageCode}=${rowSurface(row)}`,
        affected_rows: buildAffectedRows([row]),
      });
    }
  }
  return blockers;
}

export function buildEntryCrossLanguageFindings(rows) {
  const blockers = buildEnglishFallbackBlockers(rows);
  const warnings = [];
  const rowsBySet = new Map();

  for (const row of rows) {
    if (!isHighRiskEntryRow(row)) continue;
    const surface = rowSurface(row);
    if (!surface || !hasLatin(surface)) continue;
    const setId = rowSetId(row);
    const meaningId = rowMeaningId(row);
    if (!setId || !meaningId) continue;
    if (!rowsBySet.has(setId)) rowsBySet.set(setId, []);
    rowsBySet.get(setId).push(row);
  }

  for (const [setId, setRows] of rowsBySet.entries()) {
    const activeMeaningIds = stableUnique(setRows.map(rowMeaningId));
    const collapsedGroups = [];

    for (const meaningId of activeMeaningIds) {
      const meaningRows = setRows.filter((row) => rowMeaningId(row) === meaningId);
      const bySurface = new Map();
      for (const row of meaningRows) {
        const normalized = normalizeEntrySurface(rowSurface(row));
        if (!normalized) continue;
        if (!bySurface.has(normalized)) bySurface.set(normalized, []);
        bySurface.get(normalized).push(row);
      }

      for (const [normalizedSurface, group] of bySurface.entries()) {
        const languageCodes = stableUnique(group.map(rowLanguageCode)).sort();
        if (languageCodes.length < 3) continue;
        const finding = {
          set_id: setId,
          meaning_id: meaningId,
          canonical_english: normalizeText(group[0]?.canonical_english ?? group[0]?.canonicalEnglish),
          normalized_surface: normalizedSurface,
          language_codes: languageCodes,
          language_count: languageCodes.length,
          sample: collapseSample(group),
          affected_rows: buildAffectedRows(group),
        };
        if (languageCodes.length >= 5) {
          collapsedGroups.push(finding);
        } else {
          warnings.push({
            ...finding,
            severity: "warning",
            reason: "3-4 high-risk languages share the same Latin entry/display surface; review if not a genuine loanword.",
          });
        }
      }
    }

    const activeMeaningCount = activeMeaningIds.length;
    const collapsedMeaningCount = collapsedGroups.length;
    const ratioThreshold = Math.ceil(activeMeaningCount * 0.4);
    const isHardCollapse =
      collapsedMeaningCount >= 10 ||
      (collapsedMeaningCount >= 3 && activeMeaningCount > 0 && collapsedMeaningCount >= ratioThreshold);

    if (isHardCollapse) {
      blockers.push({
        set_id: setId,
        severity: "fail",
        reason:
          `entry/display cross-language collapse: ${collapsedMeaningCount}/${activeMeaningCount} active meanings have ` +
          "the same Latin surface across 5+ high-risk languages",
        collapsed_meaning_count: collapsedMeaningCount,
        active_meaning_count: activeMeaningCount,
        collapsed_groups: collapsedGroups,
        affected_rows: collapsedGroups.flatMap((group) => group.affected_rows),
      });
    } else {
      for (const group of collapsedGroups) {
        warnings.push({
          ...group,
          severity: "warning",
          reason: "5+ high-risk languages share one Latin entry/display surface on a single card, but set-level collapse threshold was not met.",
        });
      }
    }
  }

  return { blockers, warnings };
}

export function buildBatchEntryCrossLanguageBlockers(rows) {
  const highRiskLanguages = stableUnique(rows.map(rowLanguageCode).filter((code) => highRiskEntryFallbackCodes.has(code)));
  if (highRiskLanguages.length < 3) return [];

  const meaningIds = stableUnique(rows.map(rowMeaningId));
  const comparableGroups = [];
  const collapsedGroups = [];

  for (const meaningId of meaningIds) {
    const meaningRows = rows.filter((row) => rowMeaningId(row) === meaningId && highRiskLanguages.includes(rowLanguageCode(row)));
    const presentLanguages = stableUnique(meaningRows.map(rowLanguageCode));
    if (presentLanguages.length !== highRiskLanguages.length) continue;
    comparableGroups.push(meaningId);

    const normalizedValues = stableUnique(meaningRows.map((row) => normalizeEntrySurface(rowSurface(row))));
    const hasLatinSurface = meaningRows.some((row) => hasLatin(rowSurface(row)));
    if (normalizedValues.length === 1 && normalizedValues[0] && hasLatinSurface) {
      collapsedGroups.push({
        meaning_id: meaningId,
        canonical_english: normalizeText(meaningRows[0]?.canonical_english ?? meaningRows[0]?.canonicalEnglish),
        normalized_surface: normalizedValues[0],
        language_codes: highRiskLanguages.slice().sort(),
        sample: collapseSample(meaningRows),
        affected_rows: buildAffectedRows(meaningRows),
      });
    }
  }

  if (comparableGroups.length === 0) return [];
  const ratio = collapsedGroups.length / comparableGroups.length;
  if (collapsedGroups.length >= 3 && ratio >= 0.6) {
    return [
      {
        severity: "fail",
        reason:
          `batch entry/display collapse: ${collapsedGroups.length}/${comparableGroups.length} comparable rows ` +
          `(${Math.round(ratio * 100)}%) have identical Latin surfaces across ${highRiskLanguages.join(",")}`,
        collapsed_groups: collapsedGroups,
        affected_rows: collapsedGroups.flatMap((group) => group.affected_rows),
      },
    ];
  }

  return [];
}

export function formatEntryCrossLanguageBlocker(blocker) {
  const samples = (blocker.collapsed_groups ?? [])
    .slice(0, 8)
    .map((group) => {
      const label = [group.meaning_id, group.canonical_english].filter(Boolean).join(" / ");
      return `${label}: ${group.sample}`;
    })
    .join("; ");
  return samples ? `${blocker.reason}; samples: ${samples}` : `${blocker.reason}; ${blocker.sample ?? ""}`.trim();
}

export function formatEntryCrossLanguageWarning(warning) {
  const languageNames = warning.language_codes
    .map((code) => languageMetaByDbCode.get(code)?.spreadsheetCode ?? code)
    .join(",");
  return `${warning.set_id} ${warning.meaning_id} ${languageNames}: ${warning.reason}; ${warning.sample}`;
}
