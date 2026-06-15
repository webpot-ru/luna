import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const defaultSourcePreflightWarningDecisionsPath =
  "reference-sources/manual-decisions/source-preflight-warning-decisions.jsonl";

const nonActionableWarningCodes = new Set([
  "optional_tool_missing",
  "optional_source_missing",
  "translation_source_partial",
  "translation_no_source",
  "translation_not_checkable",
  "tool_candidate_mismatch",
]);

export const sourcePreflightResolvingDecisionTypes = new Set([
  "accepted_warning",
  "deferred_optional_source",
  "false_positive",
  "reviewed_no_action",
]);

export const sourcePreflightDecisionTypes = new Set([
  ...sourcePreflightResolvingDecisionTypes,
  "fix_required",
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function warningReviewPayload(warning) {
  return {
    set_id: warning.set_id ?? "",
    meaning_id: warning.meaning_id ?? "",
    language_code: warning.language_code ?? "",
    warning_code: warning.code ?? "",
    field: warning.field ?? "",
    detail: warning.detail ?? "",
    current_native_word: warning.native_word ?? "",
    current_display_word: warning.display_word ?? "",
    current_transcription: warning.transcription ?? "",
    source_ids: warning.source_ids ?? [],
  };
}

export function sourcePreflightWarningReviewKey(warning) {
  return createHash("sha256").update(stableJson(warningReviewPayload(warning))).digest("hex");
}

export async function loadSourcePreflightWarningDecisions(decisionsPath = defaultSourcePreflightWarningDecisionsPath) {
  const resolvedPath = path.resolve(decisionsPath);
  let content = "";
  try {
    content = await readFile(resolvedPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const row = JSON.parse(line);
      return { ...row, __line: index + 1, __path: resolvedPath };
    });
}

export function warningRequiresDecision(warning) {
  if (!warning?.code) return false;
  if (nonActionableWarningCodes.has(warning.code)) return false;
  if (!warning.meaning_id || !warning.language_code) return false;
  return true;
}

function decisionMatchesWarning(decision, warning) {
  const reviewKey = sourcePreflightWarningReviewKey(warning);
  if (decision.review_key && decision.review_key !== reviewKey) return false;
  return (
    normalize(decision.set_id) === normalize(warning.set_id) &&
    normalize(decision.meaning_id) === normalize(warning.meaning_id) &&
    normalize(decision.language_code) === normalize(warning.language_code) &&
    normalize(decision.warning_code ?? decision.code) === normalize(warning.code) &&
    normalize(decision.field) === normalize(warning.field) &&
    normalize(decision.current_native_word) === normalize(warning.native_word) &&
    normalize(decision.current_display_word) === normalize(warning.display_word) &&
    normalize(decision.current_transcription) === normalize(warning.transcription)
  );
}

export function sourcePreflightWarningDecisionStatus(warning, decisions) {
  const match = decisions.find((decision) => decisionMatchesWarning(decision, warning));
  if (!match) return { decision_status: "unresolved", decision_type: null, decision: null };
  const decisionType = normalize(match.decision_type);
  if (sourcePreflightResolvingDecisionTypes.has(decisionType)) {
    return { decision_status: "resolved", decision_type: decisionType, decision: match };
  }
  if (decisionType === "fix_required") {
    return { decision_status: "fix_required", decision_type: decisionType, decision: match };
  }
  return { decision_status: "invalid_decision_type", decision_type: decisionType || null, decision: match };
}

function validateSafeId(value, label, errors, decision) {
  if (!normalize(value)) errors.push(`${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: ${label} is required`);
}

export function validateSourcePreflightWarningDecisions(decisions, options = {}) {
  const manifestSourceIds = options.manifestSourceIds ?? new Set();
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const decision of decisions) {
    validateSafeId(decision.set_id, "set_id", errors, decision);
    validateSafeId(decision.meaning_id, "meaning_id", errors, decision);
    validateSafeId(decision.language_code, "language_code", errors, decision);
    validateSafeId(decision.warning_code ?? decision.code, "warning_code", errors, decision);
    validateSafeId(decision.field, "field", errors, decision);
    validateSafeId(decision.current_native_word, "current_native_word", errors, decision);
    validateSafeId(decision.current_display_word, "current_display_word", errors, decision);

    const decisionType = normalize(decision.decision_type);
    if (!sourcePreflightDecisionTypes.has(decisionType)) {
      errors.push(
        `${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: invalid decision_type=${decision.decision_type ?? ""}`
      );
    }
    if (decisionType === "fix_required" && !normalize(decision.repair_note ?? decision.review_note)) {
      errors.push(`${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: fix_required needs repair_note or review_note`);
    }
    if (sourcePreflightResolvingDecisionTypes.has(decisionType) && !normalize(decision.review_note ?? decision.source_note)) {
      warnings.push(
        `${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: resolved warning should include review_note or source_note`
      );
    }
    if (decision.review_key && !/^[a-f0-9]{64}$/i.test(decision.review_key)) {
      errors.push(`${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: review_key must be 64 hex chars`);
    }
    for (const sourceId of decision.source_ids ?? []) {
      if (!manifestSourceIds.has(sourceId)) {
        errors.push(`${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: unknown source_id=${sourceId}`);
      }
    }
    const stableKey = [
      normalize(decision.set_id),
      normalize(decision.meaning_id),
      normalize(decision.language_code),
      normalize(decision.warning_code ?? decision.code),
      normalize(decision.field),
      normalize(decision.current_native_word),
      normalize(decision.current_display_word),
      normalize(decision.current_transcription),
      decision.review_key ? normalize(decision.review_key) : "",
    ].join("::");
    if (seen.has(stableKey)) {
      errors.push(`${decision.__path ?? "decisions"}:${decision.__line ?? "?"}: duplicate decision row`);
    }
    seen.add(stableKey);
  }

  return {
    decision_count: decisions.length,
    error_count: errors.length,
    warning_count: warnings.length,
    errors,
    warnings,
  };
}

export function annotateSourcePreflightWarnings(report, decisions = []) {
  const warningReviewRows = [];
  const unresolvedWarnings = [];
  let requiresDecisionCount = 0;
  let resolvedCount = 0;
  let nonActionableCount = 0;

  const annotatedWarnings = (report.warnings ?? []).map((warning) => {
    const reviewKey = sourcePreflightWarningReviewKey(warning);
    const requiresDecision = warningRequiresDecision(warning);
    const decision = requiresDecision ? sourcePreflightWarningDecisionStatus(warning, decisions) : { decision_status: "not_required" };
    if (requiresDecision) {
      requiresDecisionCount += 1;
      if (decision.decision_status === "resolved") resolvedCount += 1;
      else unresolvedWarnings.push({ ...warning, review_key: reviewKey, decision_status: decision.decision_status });
      warningReviewRows.push({
        review_key: reviewKey,
        set_id: warning.set_id,
        meaning_id: warning.meaning_id,
        language_code: warning.language_code,
        warning_code: warning.code,
        field: warning.field,
        detail: warning.detail,
        current_native_word: warning.native_word,
        current_display_word: warning.display_word,
        current_transcription: warning.transcription,
        source_ids: warning.source_ids ?? [],
        decision_type: decision.decision_type ?? "REVIEW_REQUIRED",
        decision_status: decision.decision_status,
      });
    } else {
      nonActionableCount += 1;
    }
    return {
      ...warning,
      review_key: reviewKey,
      requires_decision: requiresDecision,
      decision_status: decision.decision_status,
      decision_type: decision.decision_type ?? null,
    };
  });

  return {
    ...report,
    warnings: annotatedWarnings,
    actionable_warnings: annotatedWarnings.filter((warning) => warning.requires_decision),
    warning_review: {
      decision_file: defaultSourcePreflightWarningDecisionsPath,
      warning_count: report.warning_count ?? annotatedWarnings.length,
      non_actionable_warning_count: nonActionableCount,
      requires_decision_count: requiresDecisionCount,
      resolved_count: resolvedCount,
      unresolved_count: unresolvedWarnings.length,
      unresolved_warnings: unresolvedWarnings,
      review_rows: warningReviewRows,
    },
  };
}
