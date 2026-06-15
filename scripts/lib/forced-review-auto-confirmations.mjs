import { readFile } from "node:fs/promises";
import path from "node:path";

export const autoSourceConfirmationPath = path.resolve(
  "reference-sources/manual-decisions/auto-source-confirmations.jsonl"
);

const supportedDecisionTypes = new Set(["auto_confirmed_strong", "auto_supported_multi_source"]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function autoConfirmationRowKey(row) {
  return `${row.set_id ?? row.setId ?? ""}::${row.meaning_id ?? row.meaningId ?? ""}::${row.language_code ?? row.languageCode ?? ""}`;
}

export function autoConfirmationCurrentValueKey(row) {
  return [
    row.set_id ?? row.setId ?? "",
    row.meaning_id ?? row.meaningId ?? "",
    row.language_code ?? row.languageCode ?? "",
    normalizeText(row.current_native_word ?? row.native_word ?? row.nativeWord ?? ""),
    normalizeText(row.current_display_word ?? row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word ?? ""),
    normalizeText(row.current_transcription ?? row.transcription ?? ""),
  ].join("::");
}

export async function loadAutoSourceConfirmations(filePath = autoSourceConfirmationPath) {
  try {
    const content = await readFile(filePath, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export function validateAutoSourceConfirmation(decision, row, manifestSourceIds = null) {
  const sourceIds = Array.isArray(decision.source_ids)
    ? decision.source_ids.map(String).filter(Boolean)
    : String(decision.source_ids ?? "")
        .split(/[;,]/u)
        .map((part) => part.trim())
        .filter(Boolean);
  const issues = [];

  if (!supportedDecisionTypes.has(decision.decision_type)) {
    issues.push(`unsupported_decision_type:${decision.decision_type ?? "missing"}`);
  }
  if (decision.set_id !== (row.set_id ?? row.setId ?? "")) issues.push("set_id_mismatch");
  if (decision.meaning_id !== (row.meaning_id ?? row.meaningId ?? "")) issues.push("meaning_id_mismatch");
  if (decision.language_code !== (row.language_code ?? row.languageCode ?? "")) issues.push("language_code_mismatch");
  if (normalizeText(decision.current_native_word) !== normalizeText(row.native_word ?? row.nativeWord ?? "")) {
    issues.push("current_native_word_mismatch");
  }
  if (
    normalizeText(decision.current_display_word) !==
    normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word ?? "")
  ) {
    issues.push("current_display_word_mismatch");
  }
  if (normalizeText(decision.current_transcription) !== normalizeText(row.transcription ?? "")) {
    issues.push("current_transcription_mismatch");
  }
  if (sourceIds.length === 0) issues.push("missing_source_ids");
  if (!normalizeText(decision.source_note)) issues.push("missing_source_note");
  if (manifestSourceIds) {
    for (const sourceId of sourceIds) {
      if (!manifestSourceIds.has(sourceId)) issues.push(`unknown_source_id:${sourceId}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    sourceIds,
  };
}

export function buildCurrentAutoConfirmationMap(decisions, rows, manifestSourceIds = null) {
  const rowByKey = new Map(rows.map((row) => [autoConfirmationRowKey(row), row]));
  const validByKey = new Map();
  const stale = [];
  for (const decision of decisions) {
    const row = rowByKey.get(autoConfirmationRowKey(decision));
    if (!row) {
      stale.push({ decision, issues: ["decision_without_current_row"] });
      continue;
    }
    const validation = validateAutoSourceConfirmation(decision, row, manifestSourceIds);
    if (!validation.ok) {
      stale.push({ decision, issues: validation.issues });
      continue;
    }
    validByKey.set(autoConfirmationRowKey(row), { decision, validation });
  }
  return { validByKey, stale };
}
