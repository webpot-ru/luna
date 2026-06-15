import { readFile } from "node:fs/promises";
import path from "node:path";
import { languageOrderRecords } from "./language-order.mjs";

export const entrySourceDecisionPath = path.resolve(
  "reference-sources/manual-decisions/entry-source-decisions.jsonl"
);

const finalReadyDecisionTypes = new Set([
  "source_attested_loan",
  "source_exact_repair",
  "component_source_repair",
]);

const finalReadyConfidences = new Set(["source_exact", "deterministic"]);

const defaultEnforcedLanguageCodes = new Set(["TL"]);

export const allEntrySourceBackedTranslationLanguageCodes = new Set(
  languageOrderRecords
    .map((record) => record.dbCode)
    .filter((code) => code !== "EN" && code !== "EN-GB")
);

const nativeCopyLanguageCodes = new Set(
  languageOrderRecords
    .filter((record) => /native orthography/i.test(record.transcriptionFormat))
    .map((record) => record.dbCode)
);

const commonEnglishLoanTokensByLanguage = {
  TL: new Set([
    "air",
    "aluminum",
    "apron",
    "bag",
    "bake",
    "baking",
    "bathrobe",
    "bathtub",
    "bidet",
    "body",
    "brush",
    "cheesecloth",
    "cling",
    "conditioner",
    "counter",
    "cup",
    "cupcake",
    "cups",
    "dishwasher",
    "drawer",
    "dryer",
    "foil",
    "hair",
    "liners",
    "measuring",
    "mug",
    "pad",
    "pantry",
    "paper",
    "parchment",
    "piping",
    "plastic",
    "rolling",
    "shampoo",
    "shower",
    "spatula",
    "spray",
    "timer",
    "toilet",
    "toothpaste",
    "toothpicks",
    "tray",
    "wash",
    "wipes",
    "wrap",
  ]),
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEntrySourceSurface(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^(?:a|an|the|to)\s+/u, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  const normalized = normalizeEntrySourceSurface(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

export function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

export function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

export function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode ?? "";
}

export function rowNative(row) {
  return normalizeText(row.native_word ?? row.nativeWord ?? "");
}

export function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? rowNative(row));
}

export function rowTranscription(row) {
  return normalizeText(row.transcription ?? "");
}

export function rowCanonical(row) {
  return normalizeText(row.canonical_english ?? row.canonicalEnglish ?? "");
}

export function decisionKey(row) {
  return `${row.set_id}::${row.meaning_id}::${row.language_code}`;
}

export function rowKey(row) {
  return `${rowSetId(row)}::${rowMeaningId(row)}::${rowLanguageCode(row)}`;
}

function parseSourceIds(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value
        .split(/[;,]/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export async function loadEntrySourceDecisions(filePath = entrySourceDecisionPath) {
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

function isCurrentDecisionForRow(decision, row) {
  return (
    decision.set_id === rowSetId(row) &&
    decision.meaning_id === rowMeaningId(row) &&
    decision.language_code === rowLanguageCode(row) &&
    decision.current_native_word === rowNative(row) &&
    decision.current_display_word === rowDisplay(row) &&
    decision.current_transcription === rowTranscription(row)
  );
}

export function validateEntrySourceDecision(decision, row, manifestSourceIds) {
  const sourceIds = parseSourceIds(decision.source_ids);
  const issues = [];

  if (!isCurrentDecisionForRow(decision, row)) issues.push("stale_decision_current_value_mismatch");
  if (!finalReadyDecisionTypes.has(decision.decision_type)) issues.push(`unsupported_decision_type:${decision.decision_type}`);
  if (!finalReadyConfidences.has(decision.source_confidence)) {
    issues.push(`unsupported_source_confidence:${decision.source_confidence}`);
  }
  if (sourceIds.length === 0) issues.push("missing_source_ids");
  for (const sourceId of sourceIds) {
    if (!manifestSourceIds.has(sourceId)) issues.push(`unknown_source_id:${sourceId}`);
  }
  if (!normalizeText(decision.source_note)) issues.push("missing_source_note");

  return {
    ok: issues.length === 0,
    issues,
    sourceIds,
  };
}

function englishFallbackRisk(row) {
  const languageCode = rowLanguageCode(row);
  const display = rowDisplay(row);
  const canonical = rowCanonical(row);
  const displayNormalized = normalizeEntrySourceSurface(display);
  const canonicalNormalized = normalizeEntrySourceSurface(canonical);
  if (!displayNormalized || !canonicalNormalized) return null;

  const exactEnglishFallback = displayNormalized === canonicalNormalized;
  const displayTokens = tokens(display);
  const canonicalTokens = new Set(tokens(canonical));
  const loanTokens = commonEnglishLoanTokensByLanguage[languageCode] ?? new Set();
  const englishLikeTokens = displayTokens.filter((token) => canonicalTokens.has(token) || loanTokens.has(token));
  const englishTokenRatio = displayTokens.length ? englishLikeTokens.length / displayTokens.length : 0;
  const highEnglishTokenRatio = englishLikeTokens.length >= 2 || englishTokenRatio >= 0.5;

  if (!exactEnglishFallback && !highEnglishTokenRatio) return null;

  return {
    exact_english_fallback: exactEnglishFallback,
    high_english_token_ratio: highEnglishTokenRatio,
    english_token_ratio: Number(englishTokenRatio.toFixed(3)),
    english_like_tokens: englishLikeTokens,
  };
}

export async function buildEntrySourceBackedTranslationFindings(rows, options = {}) {
  const manifestSourceIds = options.manifestSourceIds ?? new Set();
  const enforcedLanguageCodes = options.enforcedLanguageCodes ?? defaultEnforcedLanguageCodes;
  const decisions = options.decisions ?? (await loadEntrySourceDecisions(options.decisionPath));
  const decisionsByKey = new Map();

  for (const decision of decisions) {
    const key = decisionKey(decision);
    if (!decisionsByKey.has(key)) decisionsByKey.set(key, []);
    decisionsByKey.get(key).push(decision);
  }

  const blockers = [];
  const warnings = [];
  const reviewed = [];

  for (const row of rows) {
    const languageCode = rowLanguageCode(row);
    if (languageCode === "EN" || languageCode === "EN-GB") continue;
    if (!nativeCopyLanguageCodes.has(languageCode)) continue;

    const risk = englishFallbackRisk(row);
    if (!risk) continue;

    const key = rowKey(row);
    const rowDecisions = decisionsByKey.get(key) ?? [];
    const acceptedDecision = rowDecisions
      .map((decision) => ({ decision, validation: validateEntrySourceDecision(decision, row, manifestSourceIds) }))
      .find((item) => item.validation.ok);

    const record = {
      set_id: rowSetId(row),
      display_order: row.display_order ?? row.displayOrder ?? null,
      meaning_id: rowMeaningId(row),
      canonical_english: rowCanonical(row),
      language_code: languageCode,
      native_word: rowNative(row),
      display_word: rowDisplay(row),
      transcription: rowTranscription(row),
      risk,
      decision_type: acceptedDecision?.decision.decision_type ?? null,
      source_ids: acceptedDecision?.validation.sourceIds ?? [],
      source_note: acceptedDecision?.decision.source_note ?? "",
    };

    if (acceptedDecision) {
      reviewed.push({
        ...record,
        severity: "pass",
        reason: "English-shaped entry is covered by a current source-backed decision.",
      });
      continue;
    }

    const staleOrInvalidDecisionIssues = rowDecisions
      .map((decision) => validateEntrySourceDecision(decision, row, manifestSourceIds).issues)
      .flat();
    const finding = {
      ...record,
      severity: enforcedLanguageCodes.has(languageCode) ? "fail" : "warning",
      reason: "English-shaped entry/display needs source-backed loan or repair decision.",
      decision_issues: [...new Set(staleOrInvalidDecisionIssues)],
      affected_rows: [
        {
          set_id: rowSetId(row),
          meaning_id: rowMeaningId(row),
          language_code: languageCode,
          native_word: rowNative(row),
          display_word: rowDisplay(row),
        },
      ],
    };

    if (enforcedLanguageCodes.has(languageCode)) blockers.push(finding);
    else warnings.push(finding);
  }

  return {
    blockers,
    warnings,
    reviewed,
    decision_count: decisions.length,
  };
}

export function formatEntrySourceBackedTranslationFinding(finding) {
  const riskBits = [];
  if (finding.risk?.exact_english_fallback) riskBits.push("exact English fallback");
  if (finding.risk?.high_english_token_ratio) {
    riskBits.push(`English token ratio ${finding.risk.english_token_ratio}`);
  }
  const riskText = riskBits.length ? riskBits.join(", ") : "English-shaped entry";
  const decisionText = finding.decision_issues?.length
    ? `; decision issues=${finding.decision_issues.join("|")}`
    : "";
  return (
    `${finding.set_id}#${finding.display_order ?? "?"} ${finding.language_code}/${finding.meaning_id}: ` +
    `${riskText}; canonical="${finding.canonical_english}", display="${finding.display_word}"${decisionText}`
  );
}
