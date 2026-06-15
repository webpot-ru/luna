import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { psqlExec, psqlJson, readRows, sqlLiteralList, sqlNullableString, sqlString } from "./lib/qa-utils.mjs";
import {
  buildIntraLanguageTranscriptionCollapseFindings,
  validateTranscriptionShape,
} from "./lib/transcription-shape.mjs";
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./lib/transcription-style-consistency.mjs";
import {
  buildBatchCrossLanguageTranscriptionBlockers,
  formatCrossLanguageBlocker,
} from "./lib/transcription-cross-language-fallbacks.mjs";
import {
  buildIpaTranscriptionSanityFindings,
  formatIpaTranscriptionSanityFinding,
} from "./lib/ipa-transcription-sanity.mjs";
import {
  buildBatchEntryCrossLanguageBlockers,
  buildEntryCrossLanguageFindings,
  formatEntryCrossLanguageBlocker,
} from "./lib/entry-cross-language-fallbacks.mjs";
import {
  buildSiblingLanguageCopyFindings,
  formatSiblingLanguageCopyWarning,
} from "./lib/sibling-language-copy.mjs";
import {
  buildScriptLanguageIdentityFindings,
  formatScriptLanguageIdentityFinding,
} from "./lib/script-language-identity.mjs";
import {
  buildArticleGenderMarkerFindings,
  formatArticleGenderMarkerFinding,
} from "./lib/article-gender-marker-consistency.mjs";
import {
  buildLanguageBatchSourcePreflight,
  formatLanguageBatchSourcePreflightFinding,
} from "./lib/language-batch-source-preflight.mjs";
import {
  annotateSourcePreflightWarnings,
  defaultSourcePreflightWarningDecisionsPath,
  loadSourcePreflightWarningDecisions,
} from "./lib/source-preflight-warning-decisions.mjs";
import {
  buildSemanticGranularityFindings,
  formatSemanticGranularityFinding,
} from "./lib/semantic-granularity.mjs";
import {
  buildCjkExampleSpacingFindings,
  formatCjkExampleSpacingFinding,
} from "./lib/cjk-example-spacing.mjs";
import {
  buildThaiExampleSpacingFindings,
  formatThaiExampleSpacingFinding,
} from "./lib/thai-example-spacing.mjs";
import {
  buildSoutheastAsianExampleSpacingFindings,
  formatSoutheastAsianExampleSpacingFinding,
} from "./lib/southeast-asian-example-spacing.mjs";
import {
  buildActionExampleSurfaceFindings,
  formatActionExampleSurfaceFinding,
} from "./lib/action-example-surface.mjs";
import {
  buildExampleSurfaceGrammarFindings,
  formatExampleSurfaceGrammarFinding,
} from "./lib/example-surface-grammar.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import {
  buildSourcePreflightFreshnessContract,
  validateSourcePreflightFreshnessContract,
} from "./lib/source-preflight-freshness.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const repairLanguage = args.find((arg) => arg.startsWith("--repair-language="))?.slice("--repair-language=".length);
const sourcePreflightOutArg = args.find((arg) => arg.startsWith("--source-preflight-out="))?.slice("--source-preflight-out=".length);
const expectedPreflightReportArg = args
  .find((arg) => arg.startsWith("--expected-preflight-report="))
  ?.slice("--expected-preflight-report=".length);
const sourcePreflightDecisionsArg = args
  .find((arg) => arg.startsWith("--source-preflight-decisions="))
  ?.slice("--source-preflight-decisions=".length);
const requireWarningDecisions =
  args.includes("--require-warning-decisions") || process.env.SOURCE_PREFLIGHT_REQUIRE_WARNING_DECISIONS === "1";
const noAutoWarningDecisions = args.includes("--no-auto-warning-decisions");
const totalStartedAt = performance.now();
const timingMs = {};

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/import-language-batch.mjs <language-batch.csv|jsonl> [--repair-language=<code>] [--dry-run] [--source-preflight-out=path] [--expected-preflight-report=path] [--source-preflight-decisions=path] [--require-warning-decisions] [--no-auto-warning-decisions]"
  );
}

const safeSetIdPattern = /^[a-z0-9_]+$/;

function requireText(row, field, line) {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Line ${line}: ${field} is required`);
  }
  return value.trim();
}

function optionalText(row, field) {
  const value = row[field];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

async function timed(label, fn) {
  const startedAt = performance.now();
  try {
    return await fn();
  } finally {
    timingMs[label] = Number((performance.now() - startedAt).toFixed(3));
  }
}

const rows = await timed("read_input", () => readRows(inputPath));
if (rows.length === 0) throw new Error(`No language batch rows found in ${inputPath}`);
const inputSha256 = await timed("input_hash", async () =>
  createHash("sha256").update(await readFile(inputPath)).digest("hex")
);

const setId = requireText(rows[0], "set_id", 2);
if (!safeSetIdPattern.test(setId)) throw new Error(`Unsafe set_id: ${setId}`);

const languageCodes = new Set();
const meaningIds = new Set();
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  if (requireText(row, "set_id", line) !== setId) {
    throw new Error(`Line ${line}: all rows must use set_id=${setId}`);
  }
  languageCodes.add(requireText(row, "language_code", line));
  meaningIds.add(requireText(row, "meaning_id", line));
}

if (languageCodes.size > 3) {
  throw new Error(`Language batch may contain at most 3 languages, got ${languageCodes.size}`);
}

const referenceManifest = await timed("source_manifest", () => loadReferenceSourcesManifest());
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
let deckSpec = null;
try {
  deckSpec = await timed("deck_spec", async () => resolveDeckSpec(setId).spec);
} catch {
  deckSpec = null;
}

async function validateExpectedPreflightReport() {
  if (!expectedPreflightReportArg) return null;
  const expectedPreflight = JSON.parse(await readFile(expectedPreflightReportArg, "utf8"));
  if (expectedPreflight.input_sha256 !== inputSha256) {
    throw new Error(
      `Expected preflight report does not match current draft batch: report=${expectedPreflightReportArg}, expected_input_sha256=${expectedPreflight.input_sha256 ?? "missing"}, current_input_sha256=${inputSha256}`
    );
  }
  if (!Array.isArray(expectedPreflight.set_ids) || expectedPreflight.set_ids.length !== 1 || expectedPreflight.set_ids[0] !== setId) {
    throw new Error(`Expected preflight report is not for set_id=${setId}: ${expectedPreflightReportArg}`);
  }
  const expectedLanguages = new Set(expectedPreflight.language_codes ?? []);
  const currentLanguages = new Set([...languageCodes]);
  const sameLanguages =
    expectedLanguages.size === currentLanguages.size && [...expectedLanguages].every((code) => currentLanguages.has(code));
  if (!sameLanguages) {
    throw new Error(
      `Expected preflight report language set does not match current draft batch: report=${[...expectedLanguages].sort().join(",")}, current=${[...currentLanguages].sort().join(",")}`
    );
  }
  if (Number(expectedPreflight.blocker_count ?? 0) !== 0) {
    throw new Error(`Expected preflight report still has blockers: ${expectedPreflight.blocker_count}`);
  }
  if (
    (expectedPreflight.requires_warning_decisions || requireWarningDecisions) &&
    Number(expectedPreflight.warning_review?.unresolved_count ?? 0) !== 0
  ) {
    throw new Error(
      `Expected preflight report still has unresolved warning decisions: ${expectedPreflight.warning_review?.unresolved_count}`
    );
  }

  const currentContract = await buildSourcePreflightFreshnessContract({
    inputPath,
    inputSha256,
    setId,
    spec: deckSpec,
    decisionsPath: sourcePreflightDecisionsArg ?? defaultSourcePreflightWarningDecisionsPath,
  });
  const freshnessValidation = validateSourcePreflightFreshnessContract(expectedPreflight, currentContract, {
    inputPath,
  });
  if (!freshnessValidation.ok) {
    throw new Error(
      `Expected preflight report is stale; rerun draft-preflight before import:\n${freshnessValidation.issues.join("\n")}`
    );
  }

  return { report: expectedPreflight, freshness_contract: currentContract, freshness_validation: freshnessValidation };
}

const expectedPreflightValidation = await timed("expected_preflight_freshness", () =>
  validateExpectedPreflightReport()
);

const meaningRows = await timed("db_metadata", () => psqlJson(`
select coalesce(
  json_object_agg(
    meaning_id,
    json_build_object(
      'part_of_speech', mu.part_of_speech,
      'canonical_english', mu.canonical_english,
      'canonical_example_en', ex.canonical_example_en,
      'semantic_scene', ex.semantic_scene
    )
  ),
  '{}'::json
)
from meaning_units mu
left join lateral (
  select e.canonical_example_en, e.semantic_scene
  from meaning_examples e
  where e.meaning_id = mu.meaning_id
    and e.set_id in (${sqlLiteralList([setId])})
  order by e.example_id
  limit 1
) ex on true
where mu.meaning_id in (${sqlLiteralList([...meaningIds])});
`));
const meaningMetaByMeaningId = meaningRows && typeof meaningRows === "object" && !Array.isArray(meaningRows) ? meaningRows : {};

let sourcePreflight = null;
let preflightReused = false;
let sourcePreflightFreshnessValidation = null;
let sourcePreflightFreshnessContract = null;
const sourcePreflightDecisionsPath = sourcePreflightDecisionsArg ?? defaultSourcePreflightWarningDecisionsPath;
if (expectedPreflightValidation) {
  sourcePreflight = expectedPreflightValidation.report;
  preflightReused = true;
  sourcePreflightFreshnessValidation = expectedPreflightValidation.freshness_validation;
  sourcePreflightFreshnessContract = expectedPreflightValidation.freshness_contract;
} else {
  const rawSourcePreflight = await timed("source_preflight_build", () => buildLanguageBatchSourcePreflight(rows, {
    meaningMetaByMeaningId,
    manifestSourceIds,
    spec: deckSpec,
  }));
  const sourcePreflightDecisions = await timed("warning_decisions", () =>
    loadSourcePreflightWarningDecisions(sourcePreflightDecisionsPath)
  );
  const annotatedSourcePreflight = annotateSourcePreflightWarnings(rawSourcePreflight, sourcePreflightDecisions);
  sourcePreflightFreshnessContract = await timed("freshness_contract", () =>
    buildSourcePreflightFreshnessContract({
      inputPath,
      inputSha256,
      setId,
      spec: deckSpec,
      decisionsPath: sourcePreflightDecisionsPath,
      ruleVersion: rawSourcePreflight.rule_version,
    })
  );
  sourcePreflight = {
    ...annotatedSourcePreflight,
    freshness_contract: sourcePreflightFreshnessContract,
  };
}
const effectiveRequireWarningDecisions =
  requireWarningDecisions || (sourcePreflight.requires_warning_decisions && !noAutoWarningDecisions);
const sourcePreflightOutputPath =
  sourcePreflightOutArg ??
  path.join(
    "outputs/source-preflight",
    `${setId}_${[...languageCodes].sort().join("_").toLowerCase()}_import_${new Date()
      .toISOString()
      .replace(/[-:.]/g, "")
      .replace(/Z$/, "Z")}.json`
  );
await mkdir(path.dirname(sourcePreflightOutputPath), { recursive: true });
const sourcePreflightImportReport = {
  ...sourcePreflight,
  generated_at: new Date().toISOString(),
  original_preflight_generated_at: sourcePreflight.generated_at ?? null,
  input_path: inputPath,
  input_sha256: inputSha256,
  expected_preflight_report: expectedPreflightReportArg ?? null,
  import_preflight: true,
  preflight_reused: preflightReused,
  freshness_contract: sourcePreflight.freshness_contract ?? sourcePreflightFreshnessContract,
  freshness_validation: sourcePreflightFreshnessValidation,
  timing_ms: {
    ...(sourcePreflight.timing_ms ?? {}),
    ...timingMs,
    total: Number((performance.now() - totalStartedAt).toFixed(3)),
  },
};
await writeFile(
  sourcePreflightOutputPath,
  JSON.stringify(sourcePreflightImportReport, null, 2) + "\n",
  "utf8"
);
if (sourcePreflight.blocker_count > 0) {
  throw new Error(
    `Language batch source preflight failed:\n${sourcePreflight.blockers
      .map(formatLanguageBatchSourcePreflightFinding)
      .join("\n")}\nReport: ${sourcePreflightOutputPath}`
  );
}
if (effectiveRequireWarningDecisions && sourcePreflight.warning_review.unresolved_count > 0) {
  throw new Error(
    `Language batch source preflight has unresolved warning decisions: ${sourcePreflight.warning_review.unresolved_count}; auto_required=${sourcePreflight.requires_warning_decisions}\n${sourcePreflight.warning_review.unresolved_warnings
      .slice(0, 80)
      .map((warning) => `${formatLanguageBatchSourcePreflightFinding(warning)}; review_key=${warning.review_key}`)
      .join("\n")}\nReport: ${sourcePreflightOutputPath}`
  );
}
if (sourcePreflight.warning_count > 0) {
  console.error(
    `Language batch source preflight warnings: ${sourcePreflight.warning_count}; unresolved_decisions=${sourcePreflight.warning_review.unresolved_count}; report=${sourcePreflightOutputPath}`
  );
  for (const warning of sourcePreflight.warnings.slice(0, 30)) {
    console.error(formatLanguageBatchSourcePreflightFinding(warning));
  }
  const hidden = sourcePreflight.warnings.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

const transcriptionShapeBlockers = [];
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const nativeWord = requireText(row, "native_word", line);
  const languageCode = requireText(row, "language_code", line);
  const issues = validateTranscriptionShape({
    meaning_id: meaningId,
    language_code: languageCode,
    native_word: nativeWord,
    word_with_article_or_marker: optionalText(row, "word_with_article_or_marker") ?? nativeWord,
    transcription: requireText(row, "transcription", line),
    romanization_system: optionalText(row, "romanization_system") ?? optionalText(row, "transcription_system") ?? "",
    part_of_speech: optionalText(row, "part_of_speech") ?? meaningMetaByMeaningId[meaningId]?.part_of_speech ?? "",
    canonical_english: meaningMetaByMeaningId[meaningId]?.canonical_english ?? "",
  });
  for (const issue of issues) {
    transcriptionShapeBlockers.push(`Line ${line} ${languageCode}/${meaningId}: ${issue}`);
  }
}

if (transcriptionShapeBlockers.length > 0) {
  throw new Error(`Language batch transcription preflight failed:\n${transcriptionShapeBlockers.join("\n")}`);
}

const batchTranscriptionCollapseBlockers = buildBatchCrossLanguageTranscriptionBlockers(
  rows.map((row) => {
    const meaningId = row.meaning_id;
    return {
      set_id: setId,
      meaning_id: meaningId,
      canonical_english: meaningMetaByMeaningId[meaningId]?.canonical_english ?? "",
      language_code: row.language_code,
      native_word: row.native_word,
      word_with_article_or_marker: row.word_with_article_or_marker,
      display_word: row.word_with_article_or_marker || row.native_word,
      transcription: row.transcription,
    };
  })
);
const batchIntraLanguageTranscriptionCollapseBlockers = buildIntraLanguageTranscriptionCollapseFindings(
  rows.map((row) => {
    const meaningId = row.meaning_id;
    return {
      set_id: setId,
      meaning_id: meaningId,
      canonical_english: meaningMetaByMeaningId[meaningId]?.canonical_english ?? "",
      language_code: row.language_code,
      native_word: row.native_word,
      word_with_article_or_marker: row.word_with_article_or_marker,
      display_word: row.word_with_article_or_marker || row.native_word,
      transcription: row.transcription,
      romanization_system: row.romanization_system ?? row.transcription_system ?? "",
    };
  })
);
const batchTranscriptionStyleFindings = buildTranscriptionStyleConsistencyFindings(
  rows.map((row) => {
    const meaningId = row.meaning_id;
    return {
      set_id: setId,
      meaning_id: meaningId,
      canonical_english: meaningMetaByMeaningId[meaningId]?.canonical_english ?? "",
      language_code: row.language_code,
      native_word: row.native_word,
      word_with_article_or_marker: row.word_with_article_or_marker,
      display_word: row.word_with_article_or_marker || row.native_word,
      transcription: row.transcription,
      romanization_system: row.romanization_system ?? row.transcription_system ?? "",
    };
  })
);

const ipaSanityFindings = buildIpaTranscriptionSanityFindings(
  rows.map((row) => {
    const meaningId = row.meaning_id;
    return {
      set_id: setId,
      meaning_id: meaningId,
      canonical_english: meaningMetaByMeaningId[meaningId]?.canonical_english ?? "",
      language_code: row.language_code,
      native_word: row.native_word,
      word_with_article_or_marker: row.word_with_article_or_marker || row.native_word,
      display_word: row.word_with_article_or_marker || row.native_word,
      transcription: row.transcription,
      romanization_system: row.romanization_system ?? row.transcription_system ?? "",
    };
  })
);
if (ipaSanityFindings.blockers.length > 0) {
  throw new Error(
    `Language batch IPA transcription sanity preflight failed:\n${ipaSanityFindings.blockers
      .map(formatIpaTranscriptionSanityFinding)
      .join("\n")}`
  );
}
if (ipaSanityFindings.warnings.length > 0) {
  console.error(`Language batch IPA transcription sanity warnings: ${ipaSanityFindings.warnings.length}`);
  for (const warning of ipaSanityFindings.warnings.slice(0, 20)) {
    console.error(formatIpaTranscriptionSanityFinding(warning));
  }
  const hidden = ipaSanityFindings.warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

if (batchTranscriptionCollapseBlockers.length > 0) {
  throw new Error(
    `Language batch cross-language transcription preflight failed:\n${batchTranscriptionCollapseBlockers
      .map(formatCrossLanguageBlocker)
      .join("\n")}`
  );
}

if (batchIntraLanguageTranscriptionCollapseBlockers.length > 0) {
  throw new Error(
    `Language batch intra-language transcription preflight failed:\n${batchIntraLanguageTranscriptionCollapseBlockers
      .map(
        (blocker) =>
          `${blocker.set_id} ${blocker.language_code}: same normalized transcription ` +
          `"${blocker.normalized_transcription}" appears on ${blocker.row_count}/${blocker.total_rows} active rows`
      )
      .join("\n")}`
  );
}

if (batchTranscriptionStyleFindings.blockers.length > 0) {
  throw new Error(
    `Language batch transcription style consistency preflight failed:\n${batchTranscriptionStyleFindings.blockers
      .map(formatTranscriptionStyleConsistencyBlocker)
      .join("\n")}`
  );
}

const batchRowsForEntryPreflight = rows.map((row) => {
  const meaningId = row.meaning_id;
  return {
    set_id: setId,
    meaning_id: meaningId,
    canonical_english: meaningMetaByMeaningId[meaningId]?.canonical_english ?? "",
    language_code: row.language_code,
    native_word: row.native_word,
    word_with_article_or_marker: row.word_with_article_or_marker,
    display_word: row.word_with_article_or_marker || row.native_word,
    article_or_marker: row.article_or_marker,
    gender: row.gender,
    grammatical_number: row.grammatical_number,
    example_text: row.example_text,
    canonical_example_en: meaningMetaByMeaningId[meaningId]?.canonical_example_en ?? "",
    part_of_speech: meaningMetaByMeaningId[meaningId]?.part_of_speech ?? "",
  };
});

const batchEntryFallbackBlockers = [
  ...buildEntryCrossLanguageFindings(batchRowsForEntryPreflight).blockers,
  ...buildBatchEntryCrossLanguageBlockers(batchRowsForEntryPreflight),
];

if (batchEntryFallbackBlockers.length > 0) {
  throw new Error(
    `Language batch entry/display fallback preflight failed:\n${batchEntryFallbackBlockers
      .map(formatEntryCrossLanguageBlocker)
      .join("\n")}`
  );
}

const siblingWarnings = buildSiblingLanguageCopyFindings(batchRowsForEntryPreflight).warnings;
if (siblingWarnings.length > 0) {
  console.error(`Language batch sibling-copy warnings: ${siblingWarnings.length}`);
  for (const warning of siblingWarnings.slice(0, 20)) console.error(formatSiblingLanguageCopyWarning(warning));
  const hidden = siblingWarnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

const scriptIdentityFindings = buildScriptLanguageIdentityFindings(batchRowsForEntryPreflight);
if (scriptIdentityFindings.blockers.length > 0) {
  throw new Error(
    `Language batch script/language identity preflight failed:\n${scriptIdentityFindings.blockers
      .map(formatScriptLanguageIdentityFinding)
      .join("\n")}`
  );
}
if (scriptIdentityFindings.warnings.length > 0) {
  console.error(`Language batch script/language identity warnings: ${scriptIdentityFindings.warnings.length}`);
  for (const warning of scriptIdentityFindings.warnings.slice(0, 20)) {
    console.error(formatScriptLanguageIdentityFinding(warning));
  }
  const hidden = scriptIdentityFindings.warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

const articleGenderFindings = buildArticleGenderMarkerFindings(batchRowsForEntryPreflight);
if (articleGenderFindings.blockers.length > 0) {
  throw new Error(
    `Language batch article/gender/marker preflight failed:\n${articleGenderFindings.blockers
      .map(formatArticleGenderMarkerFinding)
      .join("\n")}`
  );
}
if (articleGenderFindings.warnings.length > 0) {
  console.error(`Language batch article/gender/marker warnings: ${articleGenderFindings.warnings.length}`);
  for (const warning of articleGenderFindings.warnings.slice(0, 20)) {
    console.error(formatArticleGenderMarkerFinding(warning));
  }
  const hidden = articleGenderFindings.warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

const semanticGranularityFindings = buildSemanticGranularityFindings(batchRowsForEntryPreflight);
if (semanticGranularityFindings.blockers.length > 0) {
  throw new Error(
    `Language batch semantic granularity preflight failed:\n${semanticGranularityFindings.blockers
      .map(formatSemanticGranularityFinding)
      .join("\n")}`
  );
}
if (semanticGranularityFindings.warnings.length > 0) {
  console.error(`Language batch semantic granularity warnings: ${semanticGranularityFindings.warnings.length}`);
  for (const warning of semanticGranularityFindings.warnings.slice(0, 20)) {
    console.error(formatSemanticGranularityFinding(warning));
  }
  const hidden = semanticGranularityFindings.warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

const cjkExampleSpacingFindings = buildCjkExampleSpacingFindings(batchRowsForEntryPreflight);
if (cjkExampleSpacingFindings.blockers.length > 0) {
  throw new Error(
    `Language batch CJK example spacing preflight failed:\n${cjkExampleSpacingFindings.blockers
      .map(formatCjkExampleSpacingFinding)
      .join("\n")}`
  );
}

const thaiExampleSpacingFindings = buildThaiExampleSpacingFindings(batchRowsForEntryPreflight);
if (thaiExampleSpacingFindings.blockers.length > 0) {
  throw new Error(
    `Language batch Thai example spacing preflight failed:\n${thaiExampleSpacingFindings.blockers
      .map(formatThaiExampleSpacingFinding)
      .join("\n")}`
  );
}

const southeastAsianExampleSpacingFindings = buildSoutheastAsianExampleSpacingFindings(batchRowsForEntryPreflight);
if (southeastAsianExampleSpacingFindings.blockers.length > 0) {
  throw new Error(
    `Language batch Southeast Asian example spacing preflight failed:\n${southeastAsianExampleSpacingFindings.blockers
      .map(formatSoutheastAsianExampleSpacingFinding)
      .join("\n")}`
  );
}

const actionExampleSurfaceFindings = buildActionExampleSurfaceFindings(batchRowsForEntryPreflight);
if (actionExampleSurfaceFindings.blockers.length > 0) {
  throw new Error(
    `Language batch action example surface preflight failed:\n${actionExampleSurfaceFindings.blockers
      .map(formatActionExampleSurfaceFinding)
      .join("\n")}`
  );
}

const exampleSurfaceGrammarFindings = buildExampleSurfaceGrammarFindings(batchRowsForEntryPreflight);
if (exampleSurfaceGrammarFindings.blockers.length > 0) {
  throw new Error(
    `Language batch example surface grammar preflight failed:\n${exampleSurfaceGrammarFindings.blockers
      .map(formatExampleSurfaceGrammarFinding)
      .join("\n")}`
  );
}

if (repairLanguage && (languageCodes.size !== 1 || !languageCodes.has(repairLanguage))) {
  throw new Error("--repair-language must match the single language in the input batch");
}

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `language_import_${setId}_${[...languageCodes].join("_").toLowerCase()}_${timestamp}`;
const languageListSql = [...languageCodes].map(sqlString).join(", ");
const statements = ["begin;"];

statements.push(`
do $$
begin
  if not exists (select 1 from content_sets where set_id = ${sqlString(setId)}) then
    raise exception 'content_set % does not exist', ${sqlString(setId)};
  end if;

  if exists (
    select 1
    from (values ${[...languageCodes].map((code) => `(${sqlString(code)})`).join(", ")}) as requested(language_code)
    left join languages l on l.code = requested.language_code and l.is_active
    where l.code is null
  ) then
    raise exception 'Input contains an inactive or unknown language code';
  end if;
end $$;
`);

if (!repairLanguage) {
  statements.push(`
do $$
declare
  blocked_language text;
begin
  select language_code
  into blocked_language
  from (
    select
      requested.language_code,
      count(msm.meaning_id) as item_count,
      count(le.meaning_id) filter (where le.quality_status in ('approved', 'generated_checked')) as entry_ready,
      count(le.meaning_id) filter (where le.pronunciation_status in ('approved', 'generated_checked', 'not_applicable')) as transcription_ready,
      count(et.example_id) filter (where et.quality_status in ('approved', 'generated_checked')) as example_ready
    from (values ${[...languageCodes].map((code) => `(${sqlString(code)})`).join(", ")}) as requested(language_code)
    join meaning_set_memberships msm
      on msm.set_id = ${sqlString(setId)}
     and msm.quality_status <> 'blocked'
    join meaning_examples e
      on e.set_id = msm.set_id
     and e.meaning_id = msm.meaning_id
     and e.example_role = 'context'
    left join meaning_language_entries le
      on le.meaning_id = msm.meaning_id
     and le.language_code = requested.language_code
    left join meaning_example_translations et
      on et.example_id = e.example_id
     and et.language_code = requested.language_code
    group by requested.language_code
  ) readiness
  where item_count > 0
    and entry_ready = item_count
    and transcription_ready = item_count
    and example_ready = item_count
  limit 1;

  if blocked_language is not null then
    raise exception 'Language % is already final-ready for set %. Use --repair-language for intentional repair.', blocked_language, ${sqlString(setId)};
  end if;
end $$;
`);
}

statements.push(`
insert into generation_batches (
  batch_id,
  batch_type,
  scope_description,
  source_model,
  quality_status,
  completed_at,
  notes
) values (
  ${sqlString(batchId)},
  'translation',
  ${sqlString(`Language batch import for ${setId}: ${[...languageCodes].join(",")}`)},
  'structured_import',
  'generated',
  now(),
  ${sqlString(inputPath)}
)
on conflict (batch_id) do nothing;
`);

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const languageCode = requireText(row, "language_code", line);
  const nativeWord = requireText(row, "native_word", line);
  const displayWord = optionalText(row, "word_with_article_or_marker") ?? nativeWord;
  const transcription = requireText(row, "transcription", line);
  const exampleText = requireText(row, "example_text", line);
  const romanization = optionalText(row, "romanization");
  const romanizationSystem = optionalText(row, "romanization_system") ?? optionalText(row, "transcription_system");
  const pronunciationIpa = optionalText(row, "pronunciation_ipa");
  const learnerPronunciation = optionalText(row, "learner_pronunciation");

  statements.push(`
do $$
begin
  if not exists (
    select 1
    from meaning_set_memberships
    where set_id = ${sqlString(setId)}
      and meaning_id = ${sqlString(meaningId)}
      and quality_status <> 'blocked'
  ) then
    raise exception 'Meaning % is not active in set %', ${sqlString(meaningId)}, ${sqlString(setId)};
  end if;

  if not exists (
    select 1
    from meaning_examples
    where set_id = ${sqlString(setId)}
      and meaning_id = ${sqlString(meaningId)}
      and example_role = 'context'
  ) then
    raise exception 'Missing context example for % in set %', ${sqlString(meaningId)}, ${sqlString(setId)};
  end if;
end $$;
`);

  statements.push(`
insert into meaning_language_entries (
  meaning_id,
  language_code,
  native_word,
  word_with_article_or_marker,
  article_or_marker,
  gender,
  grammatical_number,
  romanization,
  romanization_system,
  pronunciation_ipa,
  learner_pronunciation,
  transcription,
  pronunciation_status,
  usage_note,
  quality_status,
  source_note
) values (
  ${sqlString(meaningId)},
  ${sqlString(languageCode)},
  ${sqlString(nativeWord)},
  ${sqlString(displayWord)},
  ${sqlNullableString(optionalText(row, "article_or_marker"))},
  ${sqlNullableString(optionalText(row, "gender"))},
  ${sqlNullableString(optionalText(row, "grammatical_number"))},
  ${sqlNullableString(romanization)},
  ${sqlNullableString(romanizationSystem)},
  ${sqlNullableString(pronunciationIpa)},
  ${sqlNullableString(learnerPronunciation)},
  ${sqlString(transcription)},
  'generated',
  ${sqlNullableString(optionalText(row, "usage_note"))},
  'generated',
  ${sqlNullableString(optionalText(row, "source_note") ?? "structured language batch import")}
)
on conflict (meaning_id, language_code) do update
set
  native_word = excluded.native_word,
  word_with_article_or_marker = excluded.word_with_article_or_marker,
  article_or_marker = excluded.article_or_marker,
  gender = excluded.gender,
  grammatical_number = excluded.grammatical_number,
  romanization = excluded.romanization,
  romanization_system = excluded.romanization_system,
  pronunciation_ipa = excluded.pronunciation_ipa,
  learner_pronunciation = excluded.learner_pronunciation,
  transcription = excluded.transcription,
  pronunciation_status = 'generated',
  usage_note = excluded.usage_note,
  quality_status = 'generated',
  source_note = excluded.source_note,
  updated_at = now();
`);

  statements.push(`
with context_example as (
  select example_id
  from meaning_examples
  where set_id = ${sqlString(setId)}
    and meaning_id = ${sqlString(meaningId)}
    and example_role = 'context'
)
insert into meaning_example_translations (
  example_id,
  language_code,
  example_text,
  quality_status,
  usage_note
)
select
  example_id,
  ${sqlString(languageCode)},
  ${sqlString(exampleText)},
  'generated',
  ${sqlNullableString(optionalText(row, "example_usage_note"))}
from context_example
on conflict (example_id, language_code) do update
set
  example_text = excluded.example_text,
  quality_status = 'generated',
  usage_note = excluded.usage_note,
  updated_at = now();
`);

  statements.push(`
insert into generation_batch_items (
  batch_id,
  target_type,
  target_key,
  language_code,
  quality_status,
  notes
) values
  (${sqlString(batchId)}, 'meaning_language_entry', ${sqlString(meaningId)}, ${sqlString(languageCode)}, 'generated', 'language batch import')
on conflict do nothing;
`);
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(
  `${dryRun ? "Validated" : "Imported"} language batch: set_id=${setId} languages=${[...languageCodes].join(",")} rows=${rows.length} batch_id=${batchId} preflight_reused=${preflightReused}`
);
