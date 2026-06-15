import { languageOrderRecords } from "./language-order.mjs";

export const highRiskCrossLanguageRomanizationCodes = new Set([
  "BN",
  "HI",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
]);

const languageMetaByDbCode = new Map(languageOrderRecords.map((record) => [record.dbCode, record]));

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCrossLanguageTranscription(value) {
  return normalizeText(value)
    .toLowerCase()
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

function isHighRiskRomanizationRow(row) {
  const languageCode = rowLanguageCode(row);
  return highRiskCrossLanguageRomanizationCodes.has(languageCode);
}

function collapseSample(group) {
  return group
    .slice()
    .sort((a, b) => rowLanguageCode(a).localeCompare(rowLanguageCode(b)))
    .map((row) => `${rowLanguageCode(row)}=${normalizeText(row.transcription)}`)
    .join(" | ");
}

function buildAffectedRows(group) {
  return group.map((row) => ({
    set_id: rowSetId(row),
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    transcription: normalizeText(row.transcription),
    native_word: normalizeText(row.native_word ?? row.nativeWord),
    display_word: normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word),
  }));
}

export function buildCrossLanguageTranscriptionFindings(rows) {
  const rowsBySet = new Map();
  for (const row of rows) {
    if (!isHighRiskRomanizationRow(row)) continue;
    if (!normalizeText(row.transcription)) continue;
    const setId = rowSetId(row);
    const meaningId = rowMeaningId(row);
    if (!setId || !meaningId) continue;
    if (!rowsBySet.has(setId)) rowsBySet.set(setId, []);
    rowsBySet.get(setId).push(row);
  }

  const blockers = [];
  const warnings = [];

  for (const [setId, setRows] of rowsBySet.entries()) {
    const activeMeaningIds = stableUnique(setRows.map(rowMeaningId));
    const collapsedGroups = [];

    for (const meaningId of activeMeaningIds) {
      const meaningRows = setRows.filter((row) => rowMeaningId(row) === meaningId);
      const byTranscription = new Map();
      for (const row of meaningRows) {
        const normalized = normalizeCrossLanguageTranscription(row.transcription);
        if (!normalized) continue;
        if (!byTranscription.has(normalized)) byTranscription.set(normalized, []);
        byTranscription.get(normalized).push(row);
      }

      for (const [normalizedTranscription, group] of byTranscription.entries()) {
        const languageCodes = stableUnique(group.map(rowLanguageCode)).sort();
        if (languageCodes.length < 3) continue;

        const finding = {
          set_id: setId,
          meaning_id: meaningId,
          canonical_english: normalizeText(group[0]?.canonical_english ?? group[0]?.canonicalEnglish),
          normalized_transcription: normalizedTranscription,
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
            reason: "3-4 high-risk romanization languages share the same normalized transcription; review if not a genuine shared loanword.",
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
          `cross-language romanization collapse: ${collapsedMeaningCount}/${activeMeaningCount} active meanings have ` +
          "the same normalized transcription across 5+ high-risk romanization languages",
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
          reason: "5+ high-risk romanization languages share a transcription on one card, but the set-level collapse threshold was not met.",
        });
      }
    }
  }

  return { blockers, warnings };
}

export function buildBatchCrossLanguageTranscriptionBlockers(rows) {
  const highRiskLanguages = stableUnique(rows.map(rowLanguageCode).filter((code) => highRiskCrossLanguageRomanizationCodes.has(code)));
  if (highRiskLanguages.length < 3) return [];

  const meaningIds = stableUnique(rows.map(rowMeaningId));
  const comparableGroups = [];
  const collapsedGroups = [];

  for (const meaningId of meaningIds) {
    const meaningRows = rows.filter((row) => rowMeaningId(row) === meaningId && highRiskLanguages.includes(rowLanguageCode(row)));
    const presentLanguages = stableUnique(meaningRows.map(rowLanguageCode));
    if (presentLanguages.length !== highRiskLanguages.length) continue;
    comparableGroups.push(meaningId);

    const normalizedValues = stableUnique(meaningRows.map((row) => normalizeCrossLanguageTranscription(row.transcription)));
    if (normalizedValues.length === 1 && normalizedValues[0]) {
      collapsedGroups.push({
        meaning_id: meaningId,
        canonical_english: normalizeText(meaningRows[0]?.canonical_english ?? meaningRows[0]?.canonicalEnglish),
        normalized_transcription: normalizedValues[0],
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
          `batch romanization collapse: ${collapsedGroups.length}/${comparableGroups.length} comparable rows ` +
          `(${Math.round(ratio * 100)}%) have identical transcriptions across ${highRiskLanguages.join(",")}`,
        collapsed_groups: collapsedGroups,
        affected_rows: collapsedGroups.flatMap((group) => group.affected_rows),
      },
    ];
  }

  return [];
}

export function formatCrossLanguageBlocker(blocker) {
  const samples = (blocker.collapsed_groups ?? [])
    .slice(0, 8)
    .map((group) => {
      const label = [group.meaning_id, group.canonical_english].filter(Boolean).join(" / ");
      return `${label}: ${group.sample}`;
    })
    .join("; ");
  return samples ? `${blocker.reason}; samples: ${samples}` : blocker.reason;
}

export function formatCrossLanguageWarning(warning) {
  const languageNames = warning.language_codes
    .map((code) => languageMetaByDbCode.get(code)?.spreadsheetCode ?? code)
    .join(",");
  return `${warning.set_id} ${warning.meaning_id} ${languageNames}: ${warning.reason}; ${warning.sample}`;
}
