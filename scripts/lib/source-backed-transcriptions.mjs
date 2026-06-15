import { validateIpaTranscriptionSanity } from "./ipa-transcription-sanity.mjs";
import { validateTranscriptionShape } from "./transcription-shape.mjs";
import {
  referenceSourcesManifestSha256,
  transcriptionSourcePolicyForLanguage,
} from "./transcription-source-policy.mjs";
import { evaluateHighRiskTranscriptionLookup } from "./high-risk-transcription-lookup.mjs";
import {
  buildIpaSourceLookupContext,
  evaluateIpaSourceLookup,
} from "./ipa-source-lookup.mjs";
import {
  loadSourcePreflightWarningDecisions,
  sourcePreflightWarningDecisionStatus,
} from "./source-preflight-warning-decisions.mjs";

export const transcriptionSourceBackingFamily = "transcription_source_backing";
export const transcriptionSourceBackingRuleVersion = "transcription-source-backed-v3-display-ipa-coverage";

const finalReadyConfidences = new Set(["deterministic", "source_exact", "accepted_source_partial"]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function hasFailingIpaIssue(issues) {
  return issues.some((issue) => issue.severity === "fail");
}

function classifyPassConfidence(method) {
  if (method === "copy_display" || method === "deterministic_transliteration") return "deterministic";
  return "source_exact";
}

function sourcePreflightWarningForSourceBacking(result) {
  const failIssues = result.issues.filter((issue) => issue.severity === "fail");
  return {
    severity: "warning",
    code: `transcription_source_${result.confidence}`,
    set_id: result.set_id,
    meaning_id: result.meaning_id,
    language_code: result.language_code,
    field: "transcription",
    detail:
      failIssues.map((issue) => `${issue.code}: ${issue.detail}`).join("; ") ||
      `source-backed transcription confidence=${result.confidence}`,
    native_word: result.native_word,
    display_word: result.display_word,
    transcription: result.transcription,
    source_ids: result.source_ids,
  };
}

function canUseAcceptedSourcePartialDecision(result) {
  if (result.confidence !== "source_partial") return false;
  const strictSourceMatch = result.strict_lookup?.source_match ?? "";
  return strictSourceMatch.startsWith("high_risk_");
}

async function applyAcceptedSourcePreflightDecision(result, options = {}) {
  if (result.pass || !canUseAcceptedSourcePartialDecision(result)) return result;

  const decisions =
    options.sourcePreflightWarningDecisions ??
    options.sourcePreflightWarningDecisionsCache ??
    (await loadSourcePreflightWarningDecisions());
  const warning = sourcePreflightWarningForSourceBacking(result);
  const decisionStatus = sourcePreflightWarningDecisionStatus(warning, decisions);
  if (decisionStatus.decision_status !== "resolved") return result;

  const acceptedIssues = result.issues.map((issue) =>
    issue.severity === "fail"
      ? {
          ...issue,
          severity: "warning",
          accepted_by_decision: decisionStatus.decision_type,
        }
      : issue
  );

  return {
    ...result,
    pass: true,
    confidence: "accepted_source_partial",
    source_match: `source_preflight_warning_${decisionStatus.decision_type}`,
    manual_review_required: true,
    issues: acceptedIssues,
    source_preflight_decision: decisionStatus.decision,
    strict_lookup: result.strict_lookup
      ? {
          ...result.strict_lookup,
          source_preflight_decision: decisionStatus.decision,
        }
      : result.strict_lookup,
  };
}

export function isFinalReadySourceConfidence(confidence) {
  return finalReadyConfidences.has(confidence);
}

export async function evaluateTranscriptionSourceBacking(row, options = {}) {
  const languageCode = row.language_code ?? row.languageCode;
  const policy = await transcriptionSourcePolicyForLanguage(languageCode);
  const manifestSourceIds = options.manifestSourceIds ?? new Set();
  const manifestSha256 = options.manifestSha256 ?? (await referenceSourcesManifestSha256());

  const displayWord = normalize(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const nativeWord = normalize(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const transcription = normalize(row.transcription);
  const issues = [];

  for (const issue of validateTranscriptionShape(row)) {
    issues.push({ severity: "fail", code: "transcription_shape", detail: issue });
  }

  const ipaIssues = validateIpaTranscriptionSanity(row);
  for (const issue of ipaIssues) {
    issues.push({ severity: issue.severity, code: "ipa_transcription_sanity", detail: issue.issue });
  }

  const missingSourceIds = policy.sourceIds.filter((sourceId) => !manifestSourceIds.has(sourceId));
  if (policy.sourceIds.length === 0) {
    issues.push({ severity: "fail", code: "no_configured_source", detail: "No configured source ids" });
  }
  if (missingSourceIds.length > 0) {
    issues.push({
      severity: "fail",
      code: "missing_manifest_source",
      detail: `Missing source id(s): ${missingSourceIds.join(", ")}`,
    });
  }

  const baseHasFailingIssue = issues.some((issue) => issue.severity === "fail");
  const highRiskLookup = await evaluateHighRiskTranscriptionLookup(row, {
    manifestSourceIds,
    manualDecisions: options.manualDecisions,
  });
  if (highRiskLookup.applies) {
    for (const issue of highRiskLookup.issues ?? []) issues.push(issue);
  }
  const ipaSourceLookup = await evaluateIpaSourceLookup(row, {
    ipaSourceLookupContext: options.ipaSourceLookupContext,
  });
  if (ipaSourceLookup.applies) {
    for (const issue of ipaSourceLookup.issues ?? []) {
      if (issue.severity === "fail") issues.push(issue);
    }
  }

  let confidence = classifyPassConfidence(policy.method);
  if (baseHasFailingIssue) confidence = "conflict";
  else if (policy.sourceIds.length === 0 || missingSourceIds.length > 0) confidence = "no_source";
  else if (hasFailingIpaIssue(ipaIssues)) confidence = "source_partial";
  else if (highRiskLookup.applies) confidence = highRiskLookup.confidence;
  else if (ipaSourceLookup.applies && ipaSourceLookup.issues.some((issue) => issue.severity === "fail")) {
    confidence = ipaSourceLookup.confidence;
  } else if (issues.some((issue) => issue.severity === "fail")) confidence = "conflict";

  const pass = isFinalReadySourceConfidence(confidence);
  const sourceMatch = highRiskLookup.applies
    ? highRiskLookup.source_match
    : ipaSourceLookup.applies && ipaSourceLookup.issues.some((issue) => issue.severity === "fail")
      ? ipaSourceLookup.source_match
    : policy.method === "copy_display"
      ? "display_exact"
      : policy.method === "deterministic_transliteration"
        ? "deterministic_policy_shape"
        : "source_family_available_and_policy_shape_exact";

  return {
    pass,
    confidence,
    method: policy.method,
    manual_review_required: policy.manualReviewRequired,
    set_id: row.set_id ?? row.setId,
    language_code: languageCode,
    meaning_id: row.meaning_id ?? row.meaningId ?? row.target_key,
    display_word: displayWord,
    native_word: nativeWord,
    transcription,
    source_ids: highRiskLookup.applies
      ? highRiskLookup.source_ids
      : ipaSourceLookup.applies && ipaSourceLookup.issues.some((issue) => issue.severity === "fail")
        ? ipaSourceLookup.source_ids
        : policy.sourceIds,
    source_priority: policy.sourcePriority,
    source_match: sourceMatch,
    checked_display_word: displayWord,
    checked_native_word: nativeWord,
    checked_transcription: transcription,
    source_value: highRiskLookup.applies
      ? highRiskLookup.source_value
      : ipaSourceLookup.applies && ipaSourceLookup.source_value
        ? ipaSourceLookup.source_value
        : transcription,
    policy_version: policy.policyVersion,
    rule_version: transcriptionSourceBackingRuleVersion,
    manifest_sha256: manifestSha256,
    issues,
    strict_lookup: highRiskLookup.applies
      ? {
          source_match: highRiskLookup.source_match,
          source_value: highRiskLookup.source_value,
          source_entry: highRiskLookup.source_entry,
          source_decision: highRiskLookup.source_decision,
        }
      : null,
    ipa_source_lookup: ipaSourceLookup.applies
      ? {
          source_match: ipaSourceLookup.source_match,
          source_value: ipaSourceLookup.source_value,
          source_words: ipaSourceLookup.source_words,
          orthographic_slash: ipaSourceLookup.orthographic_slash,
          rule_version: ipaSourceLookup.rule_version,
        }
      : null,
  };
}

export async function buildTranscriptionSourceBackingFindings(rows, options = {}) {
  const progress = (message) => {
    if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") {
      console.error(`[source-backed-transcriptions] ${message}`);
    }
  };
  const timed = async (label, fn) => {
    progress(`${label}.start`);
    const startedAt = Date.now();
    try {
      return await fn();
    } finally {
      progress(`${label} ${Date.now() - startedAt}ms`);
    }
  };
  const blockers = [];
  const passes = [];
  const byLanguage = new Map();
  const ipaSourceLookupContext =
    options.ipaSourceLookupContext ?? (await timed("build_ipa_source_lookup_context", () => buildIpaSourceLookupContext(rows)));
  const sourcePreflightWarningDecisions =
    options.sourcePreflightWarningDecisions ??
    (await timed("load_source_preflight_warning_decisions", () => loadSourcePreflightWarningDecisions()));

  for (const [index, row] of rows.entries()) {
    progress(`row.${index + 1}.${row.language_code ?? row.languageCode}.${row.meaning_id ?? row.meaningId ?? row.target_key}.start`);
    const rawResult = await evaluateTranscriptionSourceBacking(row, { ...options, ipaSourceLookupContext });
    const result = await applyAcceptedSourcePreflightDecision(rawResult, {
      ...options,
      sourcePreflightWarningDecisions,
    });
    progress(
      `row.${index + 1}.${row.language_code ?? row.languageCode}.${row.meaning_id ?? row.meaningId ?? row.target_key} ${result.confidence}`
    );
    const lang = result.language_code;
    const summary = byLanguage.get(lang) ?? {
      language_code: lang,
      rows: 0,
      deterministic: 0,
      source_exact: 0,
      source_partial: 0,
      conflict: 0,
      no_source: 0,
    };
    summary.rows += 1;
    summary[result.confidence] = (summary[result.confidence] ?? 0) + 1;
    byLanguage.set(lang, summary);

    if (result.pass) passes.push(result);
    else blockers.push(result);
  }

  return {
    blockers,
    passes,
    byLanguage: [...byLanguage.values()].sort((a, b) => a.language_code.localeCompare(b.language_code)),
  };
}

export function formatTranscriptionSourceBackingBlocker(finding) {
  const issueText = finding.issues
    .filter((issue) => issue.severity === "fail")
    .map((issue) => `${issue.code}: ${issue.detail}`)
    .join("; ");
  return [
    finding.language_code,
    finding.meaning_id,
    `confidence=${finding.confidence}`,
    `method=${finding.method}`,
    `display="${finding.display_word}"`,
    `transcription="${finding.transcription}"`,
    issueText || "source-backed confidence is not final-ready",
  ].join(" ");
}
