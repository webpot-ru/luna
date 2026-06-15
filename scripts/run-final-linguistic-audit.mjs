#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readRows } from "./lib/qa-utils.mjs";
import {
  buildIntraLanguageTranscriptionCollapseFindings,
  validateTranscriptionShape,
} from "./lib/transcription-shape.mjs";
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./lib/transcription-style-consistency.mjs";
import { buildCrossLanguageTranscriptionFindings } from "./lib/transcription-cross-language-fallbacks.mjs";
import { buildEntryCrossLanguageFindings } from "./lib/entry-cross-language-fallbacks.mjs";
import {
  allEntrySourceBackedTranslationLanguageCodes,
  buildEntrySourceBackedTranslationFindings,
  formatEntrySourceBackedTranslationFinding,
} from "./lib/entry-source-backed-translations.mjs";
import { buildMeaningContrastFindings } from "./lib/meaning-contrast.mjs";
import { buildBaseExampleNaturalnessFindings } from "./lib/base-example-naturalness.mjs";
import { buildSiblingLanguageCopyFindings } from "./lib/sibling-language-copy.mjs";
import { buildScriptLanguageIdentityFindings } from "./lib/script-language-identity.mjs";
import { buildArticleGenderMarkerFindings } from "./lib/article-gender-marker-consistency.mjs";
import { buildSemanticGranularityFindings } from "./lib/semantic-granularity.mjs";
import { buildExampleTemplateDiversityFindings } from "./lib/example-template-diversity.mjs";
import { validateTargetExampleLexicalAnchor } from "./lib/target-example-lexical-anchor.mjs";
import {
  inferSceneLocationCanonical,
  validateTargetExampleSceneLocationAnchor,
} from "./lib/target-example-scene-location-anchor.mjs";
import { validateIpaTranscriptionSanity } from "./lib/ipa-transcription-sanity.mjs";
import { validateTargetExamplePedagogicalQuality } from "./lib/target-example-pedagogical-quality.mjs";
import { validateExampleAndDisplayCasing } from "./lib/example-casing.mjs";
import { validateCjkExampleSpacing } from "./lib/cjk-example-spacing.mjs";
import { validateThaiExampleSpacing } from "./lib/thai-example-spacing.mjs";
import { validateSoutheastAsianExampleSpacing } from "./lib/southeast-asian-example-spacing.mjs";
import { validateActionExampleSurface } from "./lib/action-example-surface.mjs";
import { validateExampleSurfaceGrammar } from "./lib/example-surface-grammar.mjs";
import { buildSemanticSceneAlignmentIssues } from "./lib/semantic-scene-alignment.mjs";
import { validateExampleNaturalness } from "./lib/example-naturalness.mjs";
import { validateTargetSemanticSceneAlignment } from "./lib/target-semantic-scene-alignment.mjs";
import { validateNumberExampleGrammar } from "./lib/number-example-grammar.mjs";
import {
  buildTranscriptionSourceBackingFindings,
  formatTranscriptionSourceBackingBlocker,
} from "./lib/source-backed-transcriptions.mjs";
import {
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
} from "./lib/transcription-source-policy.mjs";
import {
  buildTranslationSourceCoverageFindings,
  formatTranslationSourceCoverageBlocker,
} from "./lib/translation-source-coverage.mjs";
import {
  buildDeckProfileQualityFindings,
  formatDeckProfileFinding,
  resolveDeckProfileContext,
} from "./lib/deck-profile-policy.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const outArg = args.find((arg) => arg.startsWith("--out="))?.split("=")[1];

if (!inputPath) {
  throw new Error("Usage: node scripts/run-final-linguistic-audit.mjs <audit-batch.jsonl> [--out=path]");
}

const highRiskLanguages = new Set([
  "ZH",
  "TH",
  "LO",
  "MY",
  "JA",
  "KO",
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
  "KK",
  "BG",
  "RU",
]);

const finalReadyContentStatuses = new Set(["approved", "generated_checked"]);
const finalReadyPronunciationStatuses = new Set([
  "approved",
  "generated_checked",
  "not_applicable",
]);

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function looksLikeBadTemplate(example) {
  const text = normalize(example).toLowerCase();
  return (
    /^i need to\s+\S+\s+the food\.?$/.test(text) ||
    /^we need to\s+\S+\s+the food\.?$/.test(text) ||
    /^she needs to\s+\S+\s+the food\.?$/.test(text) ||
    /^he needs to\s+\S+\s+the food\.?$/.test(text)
  );
}

function parseScene(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function severityFromIssues(issues) {
  if (issues.some((issue) => issue.severity === "fail")) return "fail";
  if (issues.some((issue) => issue.severity === "needs_review")) return "needs_review";
  return "pass";
}

let crossLanguageIssuesByTarget = new Map();
let intraLanguageTranscriptionIssuesByTarget = new Map();
let transcriptionStyleIssuesByTarget = new Map();
let entryCrossLanguageIssuesByTarget = new Map();
let entrySourceBackedTranslationIssuesByTarget = new Map();
let meaningContrastIssuesByTarget = new Map();
let baseExampleIssuesByMeaning = new Map();
let siblingWarningsByTarget = new Map();
let scriptLanguageIssuesByTarget = new Map();
let articleGenderIssuesByTarget = new Map();
let semanticGranularityIssuesByTarget = new Map();
let exampleTemplateIssuesByMeaning = new Map();
let transcriptionSourceBackingIssuesByTarget = new Map();
let translationSourceCoverageIssuesByTarget = new Map();
let deckProfileQualityIssuesByTarget = new Map();

function normalizeSceneLocationKey(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function auditRow(row) {
  const issues = [];
  const languageCode = row.language_code;
  const targetKey = `${row.set_id}::${row.meaning_id}::${languageCode}`;
  const displayWord = normalize(row.display_word);
  const nativeWord = normalize(row.native_word);
  const exampleText = normalize(row.example_text);
  const englishExample = normalize(row.canonical_example_en);
  const transcription = normalize(row.transcription);
  const semanticScene = parseScene(row.semantic_scene);

  if (!displayWord) issues.push({ severity: "fail", code: "missing_display_word" });
  if (!nativeWord) issues.push({ severity: "fail", code: "missing_native_word" });
  if (!exampleText) issues.push({ severity: "fail", code: "missing_example" });
  if (!transcription) issues.push({ severity: "fail", code: "missing_transcription" });

  if (!finalReadyContentStatuses.has(row.membership_quality_status)) {
    issues.push({
      severity: "needs_review",
      code: "membership_not_final_ready",
      value: row.membership_quality_status,
    });
  }
  if (!finalReadyContentStatuses.has(row.meaning_quality_status)) {
    issues.push({
      severity: "needs_review",
      code: "meaning_not_final_ready",
      value: row.meaning_quality_status,
    });
  }
  if (!finalReadyContentStatuses.has(row.context_example_quality_status)) {
    issues.push({
      severity: "needs_review",
      code: "context_example_not_final_ready",
      value: row.context_example_quality_status,
    });
  }
  if (!finalReadyContentStatuses.has(row.entry_quality_status)) {
    issues.push({
      severity: "needs_review",
      code: "entry_not_final_ready",
      value: row.entry_quality_status,
    });
  }
  if (!finalReadyContentStatuses.has(row.example_quality_status)) {
    issues.push({
      severity: "needs_review",
      code: "example_translation_not_final_ready",
      value: row.example_quality_status,
    });
  }
  if (!finalReadyPronunciationStatuses.has(row.pronunciation_status)) {
    issues.push({
      severity: "needs_review",
      code: "pronunciation_not_final_ready",
      value: row.pronunciation_status,
    });
  }

  for (const issue of validateTranscriptionShape(row)) {
    issues.push({ severity: "fail", code: "transcription_shape", detail: issue });
  }

  for (const issue of validateIpaTranscriptionSanity(row)) {
    issues.push({ severity: issue.severity, code: "ipa_transcription_sanity", detail: issue.issue });
  }

  const crossLanguageIssue = crossLanguageIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`);
  if (crossLanguageIssue) {
    issues.push({
      severity: "fail",
      code: "transcription_cross_language_fallback",
      detail: crossLanguageIssue,
    });
  }

  const intraLanguageIssue = intraLanguageTranscriptionIssuesByTarget.get(
    `${row.set_id}::${row.meaning_id}::${languageCode}`
  );
  if (intraLanguageIssue) {
    issues.push({
      severity: "fail",
      code: "transcription_intra_language_collapse",
      detail: intraLanguageIssue,
    });
  }

  const transcriptionStyleIssue = transcriptionStyleIssuesByTarget.get(
    `${row.set_id}::${row.meaning_id}::${languageCode}`
  );
  if (transcriptionStyleIssue) {
    issues.push({
      severity: "fail",
      code: "transcription_style_consistency",
      detail: transcriptionStyleIssue,
    });
  }

  const entryCrossLanguageIssue = entryCrossLanguageIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`);
  if (entryCrossLanguageIssue) {
    issues.push({
      severity: "fail",
      code: "entry_cross_language_fallback",
      detail: entryCrossLanguageIssue,
    });
  }

  const entrySourceBackedTranslationIssue = entrySourceBackedTranslationIssuesByTarget.get(
    `${row.set_id}::${row.meaning_id}::${languageCode}`
  );
  if (entrySourceBackedTranslationIssue) {
    issues.push({
      severity: "fail",
      code: "entry_source_backed_translation",
      detail: entrySourceBackedTranslationIssue,
    });
  }

  const translationSourceCoverageIssue = translationSourceCoverageIssuesByTarget.get(
    `${row.set_id}::${row.meaning_id}::${languageCode}`
  );
  if (translationSourceCoverageIssue) {
    issues.push({
      severity: "fail",
      code: "translation_source_coverage",
      detail: translationSourceCoverageIssue,
    });
  }

  const deckProfileQualityIssue =
    deckProfileQualityIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`) ??
    deckProfileQualityIssuesByTarget.get(`${row.set_id}::${row.meaning_id}`);
  if (deckProfileQualityIssue) {
    issues.push({ severity: "fail", code: "deck_profile_quality", detail: deckProfileQualityIssue });
  }

  const meaningContrastIssue = meaningContrastIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`);
  if (meaningContrastIssue) {
    issues.push({
      severity: "fail",
      code: "meaning_contrast",
      detail: meaningContrastIssue,
    });
  }

  const baseExampleIssue = baseExampleIssuesByMeaning.get(`${row.set_id}::${row.meaning_id}`);
  if (baseExampleIssue) {
    issues.push({
      severity: "fail",
      code: "base_example_naturalness",
      detail: baseExampleIssue,
    });
  }

  const scriptLanguageIssue = scriptLanguageIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`);
  if (scriptLanguageIssue) {
    issues.push({ severity: "fail", code: "script_language_identity", detail: scriptLanguageIssue });
  }

  const articleGenderIssue = articleGenderIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`);
  if (articleGenderIssue) {
    issues.push({ severity: "fail", code: "article_gender_marker_consistency", detail: articleGenderIssue });
  }

  const semanticGranularityIssue = semanticGranularityIssuesByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`);
  if (semanticGranularityIssue) {
    issues.push({ severity: "fail", code: "semantic_granularity", detail: semanticGranularityIssue });
  }

  const transcriptionSourceBackingIssue = transcriptionSourceBackingIssuesByTarget.get(
    `${row.set_id}::${row.meaning_id}::${languageCode}`
  );
  if (transcriptionSourceBackingIssue) {
    issues.push({
      severity: "fail",
      code: "transcription_source_backing",
      detail: transcriptionSourceBackingIssue,
    });
  }

  const exampleTemplateIssue = exampleTemplateIssuesByMeaning.get(`${row.set_id}::${row.meaning_id}`);
  if (exampleTemplateIssue) {
    issues.push({ severity: "fail", code: "example_template_diversity", detail: exampleTemplateIssue });
  }

  for (const issue of validateExampleAndDisplayCasing(row)) {
    issues.push({ severity: "fail", code: "example_casing_shape", detail: issue });
  }

  for (const issue of validateCjkExampleSpacing(row)) {
    issues.push({ severity: "fail", code: "cjk_example_spacing", detail: issue.issue });
  }

  for (const issue of validateThaiExampleSpacing(row)) {
    issues.push({ severity: "fail", code: "thai_example_spacing", detail: issue.issue });
  }

  for (const issue of validateSoutheastAsianExampleSpacing(row)) {
    issues.push({ severity: "fail", code: "southeast_asian_example_spacing", detail: issue.issue });
  }

  for (const issue of validateActionExampleSurface(row)) {
    issues.push({ severity: "fail", code: "action_example_surface", detail: issue.issue });
  }

  for (const issue of validateExampleSurfaceGrammar(row)) {
    issues.push({ severity: "fail", code: "example_surface_grammar", detail: issue.issue });
  }

  for (const issue of validateExampleNaturalness(row)) {
    issues.push({ severity: "fail", code: "target_example_naturalness", detail: issue });
  }

  for (const issue of validateTargetExampleLexicalAnchor(row)) {
    issues.push({ severity: issue.severity, code: "target_example_lexical_anchor", detail: issue.issue });
  }

  for (const issue of validateTargetExampleSceneLocationAnchor(row)) {
    issues.push({ severity: issue.severity, code: "target_example_scene_location_anchor", detail: issue.issue });
  }

  for (const issue of validateTargetExamplePedagogicalQuality(row)) {
    issues.push({ severity: issue.severity, code: "target_example_pedagogical_quality", detail: issue.issue });
  }

  if (languageCode !== "EN" && languageCode !== "EN-GB" && exampleText && englishExample) {
    if (exampleText === englishExample) {
      issues.push({ severity: "fail", code: "example_untranslated_equals_english" });
    }
  }

  if (looksLikeBadTemplate(exampleText) || looksLikeBadTemplate(englishExample)) {
    issues.push({ severity: "fail", code: "bad_generic_example_template" });
  }

  if (!semanticScene || Object.keys(semanticScene).length === 0) {
    issues.push({ severity: "needs_review", code: "missing_or_invalid_semantic_scene" });
  } else {
    for (const requiredKey of [
      "target_object",
      "target_display",
      "subject_number",
      "action_or_state",
      "state_or_location",
      "tense_aspect",
      "topic_context",
    ]) {
      if (!normalize(semanticScene[requiredKey])) {
        issues.push({ severity: "needs_review", code: `semantic_scene_missing_${requiredKey}` });
      }
    }
  }

  for (const issue of buildSemanticSceneAlignmentIssues(row)) {
    issues.push({ severity: "fail", code: "semantic_scene_alignment", detail: issue });
  }

  for (const issue of validateTargetSemanticSceneAlignment(row)) {
    issues.push({ severity: "fail", code: "target_semantic_scene_alignment", detail: issue });
  }

  for (const issue of validateNumberExampleGrammar(row)) {
    issues.push({ severity: "fail", code: "number_example_grammar", detail: issue });
  }

  const result = severityFromIssues(issues);
  const highRisk = highRiskLanguages.has(languageCode);

  return {
    result,
    target_type: "export",
    target_key: targetKey,
    language_code: languageCode,
    reviewer: "codex-final-linguistic-audit",
    pass_id: `final_linguistic_audit_${runTimestamp}`,
    batch_id: auditBatchId,
    check_family: "final_linguistic_audit",
    result_summary:
      result === "pass"
        ? `Pass: deterministic post-final linguistic audit found no blockers for ${row.meaning_id}/${languageCode}.`
        : `${result}: deterministic post-final linguistic audit found ${issues.length} issue(s) for ${row.meaning_id}/${languageCode}.`,
    source_note: highRisk
      ? "High-risk language for script/romanization; deterministic audit is a sanity pass and not native approval."
      : "Deterministic post-final linguistic audit; not native approval.",
    issues,
    confidence: result === "pass" ? (highRisk ? 0.84 : 0.9) : 0.65,
    evidence: {
      audit_scope: "entry_example_transcription_semantic_scene_pronunciation_pedagogy",
      set_id: row.set_id,
      meaning_id: row.meaning_id,
      display_order: row.display_order,
      language_order: row.language_order,
      spreadsheet_code: row.spreadsheet_code,
      language_name: row.expected_language_name ?? row.language_name,
      transcription_format:
        row.expected_transcription_format ?? row.transcription_format ?? row.language_transcription_format,
      high_risk_language: highRisk,
      canonical_english: row.canonical_english,
      display_word: row.display_word,
      example_text: row.example_text,
      transcription: row.transcription,
      normal_qa_statuses: {
        membership_quality_status: row.membership_quality_status,
        meaning_quality_status: row.meaning_quality_status,
        context_example_quality_status: row.context_example_quality_status,
        entry_quality_status: row.entry_quality_status,
        example_quality_status: row.example_quality_status,
        pronunciation_status: row.pronunciation_status,
      },
      warnings: siblingWarningsByTarget.get(`${row.set_id}::${row.meaning_id}::${languageCode}`) ?? [],
    },
  };
}

const rows = await readRows(inputPath);
if (rows.length === 0) throw new Error(`No audit batch rows found in ${inputPath}`);

const setIds = [...new Set(rows.map((row) => row.set_id))];
if (setIds.length !== 1) {
  throw new Error(`Audit batch must contain exactly one set_id, found: ${setIds.join(", ")}`);
}

const rowsByCanonicalAndLanguage = new Map();
for (const row of rows) {
  rowsByCanonicalAndLanguage.set(
    `${normalizeSceneLocationKey(row.canonical_english)}::${row.language_code}`,
    row
  );
}
for (const row of rows) {
  const locationCanonical = inferSceneLocationCanonical(row);
  const locationRow = rowsByCanonicalAndLanguage.get(
    `${normalizeSceneLocationKey(locationCanonical)}::${row.language_code}`
  );
  if (!locationRow) continue;
  row.location_canonical_english = locationCanonical;
  row.location_display_word = locationRow.display_word;
  row.location_native_word = locationRow.native_word;
}

const runTimestamp = timestampId();
const auditBatchId = `final_linguistic_audit_${setIds[0]}_${runTimestamp}`;
const outputPath =
  outArg ??
  path.join("outputs", "audit", `final_linguistic_audit_${setIds[0]}_${runTimestamp}_results.jsonl`);
const summaryPath = outputPath.replace(/\.jsonl$/i, "_summary.json");

let deckSpec = null;
try {
  deckSpec = resolveDeckSpec(setIds[0]).spec;
} catch {
  deckSpec = null;
}

const crossLanguageFindings = buildCrossLanguageTranscriptionFindings(rows);
crossLanguageIssuesByTarget = new Map();
for (const blocker of crossLanguageFindings.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    crossLanguageIssuesByTarget.set(
      `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`,
      blocker.reason
    );
  }
}

const intraLanguageTranscriptionFindings = buildIntraLanguageTranscriptionCollapseFindings(rows);
intraLanguageTranscriptionIssuesByTarget = new Map();
for (const blocker of intraLanguageTranscriptionFindings) {
  const reason =
    `same normalized transcription "${blocker.normalized_transcription}" appears on ` +
    `${blocker.row_count}/${blocker.total_rows} active rows`;
  for (const affectedRow of blocker.affected_rows ?? []) {
    intraLanguageTranscriptionIssuesByTarget.set(
      `${blocker.set_id}::${affectedRow.meaning_id}::${blocker.language_code}`,
      reason
    );
  }
}

const transcriptionStyleFindings = buildTranscriptionStyleConsistencyFindings(rows);
transcriptionStyleIssuesByTarget = new Map();
for (const blocker of transcriptionStyleFindings.blockers) {
  const detail = formatTranscriptionStyleConsistencyBlocker(blocker);
  for (const affectedRow of blocker.affected_rows ?? []) {
    transcriptionStyleIssuesByTarget.set(
      `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`,
      detail
    );
  }
}

const entryCrossLanguageFindings = buildEntryCrossLanguageFindings(rows);
entryCrossLanguageIssuesByTarget = new Map();
for (const blocker of entryCrossLanguageFindings.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    entryCrossLanguageIssuesByTarget.set(
      `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`,
      blocker.reason
    );
  }
}

const referenceManifest = await loadReferenceSourcesManifest();
const referenceManifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const referenceManifestSha256 = await referenceSourcesManifestSha256();

const entrySourceBackedTranslationFindings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds: referenceManifestSourceIds,
  enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
});
entrySourceBackedTranslationIssuesByTarget = new Map();
for (const blocker of entrySourceBackedTranslationFindings.blockers) {
  entrySourceBackedTranslationIssuesByTarget.set(
    `${blocker.set_id}::${blocker.meaning_id}::${blocker.language_code}`,
    formatEntrySourceBackedTranslationFinding(blocker)
  );
}

const translationSourceCoverageFindings = await buildTranslationSourceCoverageFindings(rows, {
  manifestSourceIds: referenceManifestSourceIds,
});
translationSourceCoverageIssuesByTarget = new Map();
for (const blocker of translationSourceCoverageFindings.blockers) {
  translationSourceCoverageIssuesByTarget.set(
    `${blocker.set_id}::${blocker.meaning_id}::${blocker.language_code}`,
    formatTranslationSourceCoverageBlocker(blocker)
  );
}

const meaningContrastFindings = buildMeaningContrastFindings(rows);
meaningContrastIssuesByTarget = new Map();
for (const blocker of meaningContrastFindings.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    meaningContrastIssuesByTarget.set(
      `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`,
      blocker.reason
    );
  }
}

const deckProfileContext = resolveDeckProfileContext({ spec: deckSpec, rows });
const deckProfileQualityFindings = buildDeckProfileQualityFindings(rows, deckProfileContext);
deckProfileQualityIssuesByTarget = new Map();
for (const blocker of deckProfileQualityFindings.blockers) {
  const key = blocker.language_code
    ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.language_code}`
    : `${blocker.set_id}::${blocker.meaning_id}`;
  deckProfileQualityIssuesByTarget.set(key, formatDeckProfileFinding(blocker));
}

const uniqueBaseRows = [
  ...new Map(rows.map((row) => [`${row.set_id}::${row.meaning_id}`, row])).values(),
];
const baseExampleFindings = buildBaseExampleNaturalnessFindings(uniqueBaseRows);
baseExampleIssuesByMeaning = new Map();
for (const blocker of baseExampleFindings.blockers) {
  baseExampleIssuesByMeaning.set(`${blocker.set_id}::${blocker.meaning_id}`, blocker.issue);
}

const exampleTemplateFindings = buildExampleTemplateDiversityFindings(uniqueBaseRows);
exampleTemplateIssuesByMeaning = new Map();
for (const blocker of exampleTemplateFindings.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    exampleTemplateIssuesByMeaning.set(`${affectedRow.set_id}::${affectedRow.meaning_id}`, blocker.reason);
  }
}

const scriptLanguageFindings = buildScriptLanguageIdentityFindings(rows);
scriptLanguageIssuesByTarget = new Map();
for (const blocker of scriptLanguageFindings.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    scriptLanguageIssuesByTarget.set(
      `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`,
      blocker.reason
    );
  }
}

const articleGenderFindings = buildArticleGenderMarkerFindings(rows);
articleGenderIssuesByTarget = new Map();
for (const blocker of articleGenderFindings.blockers) {
  articleGenderIssuesByTarget.set(`${blocker.set_id}::${blocker.meaning_id}::${blocker.language_code}`, blocker.reason);
}

const semanticGranularityFindings = buildSemanticGranularityFindings(rows);
semanticGranularityIssuesByTarget = new Map();
for (const blocker of semanticGranularityFindings.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    semanticGranularityIssuesByTarget.set(
      `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`,
      blocker.reason
    );
  }
}

const siblingFindings = buildSiblingLanguageCopyFindings(rows);
siblingWarningsByTarget = new Map();
for (const warning of siblingFindings.warnings) {
  for (const affectedRow of warning.affected_rows ?? []) {
    const key = `${affectedRow.set_id}::${affectedRow.meaning_id}::${affectedRow.language_code}`;
    const warnings = siblingWarningsByTarget.get(key) ?? [];
    warnings.push(warning.reason);
    siblingWarningsByTarget.set(key, warnings);
  }
}

const transcriptionSourceBackingFindings = await buildTranscriptionSourceBackingFindings(rows, {
  manifestSourceIds: referenceManifestSourceIds,
  manifestSha256: referenceManifestSha256,
});
transcriptionSourceBackingIssuesByTarget = new Map();
for (const blocker of transcriptionSourceBackingFindings.blockers) {
  transcriptionSourceBackingIssuesByTarget.set(
    `${blocker.set_id ?? setIds[0]}::${blocker.meaning_id}::${blocker.language_code}`,
    formatTranscriptionSourceBackingBlocker(blocker)
  );
}

const results = await Promise.all(rows.map(auditRow));
const summary = {
  set_id: setIds[0],
  input_path: path.resolve(inputPath),
  output_path: path.resolve(outputPath),
  summary_path: path.resolve(summaryPath),
  rows: results.length,
  pass: results.filter((row) => row.result === "pass").length,
  needs_review: results.filter((row) => row.result === "needs_review").length,
  fail: results.filter((row) => row.result === "fail").length,
  languages: new Set(results.map((row) => row.language_code)).size,
  meanings: new Set(rows.map((row) => row.meaning_id)).size,
  high_risk_languages_checked: [...new Set(results.filter((row) => row.evidence.high_risk_language).map((row) => row.language_code))].sort(),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, results.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

console.log(JSON.stringify(summary, null, 2));
