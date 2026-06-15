import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { languageOrder } from "./lib/language-order.mjs";
import {
  buildIntraLanguageTranscriptionCollapseFindings,
  validateTranscriptionShape,
} from "./lib/transcription-shape.mjs";
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./lib/transcription-style-consistency.mjs";
import {
  buildCrossLanguageTranscriptionFindings,
  formatCrossLanguageBlocker,
} from "./lib/transcription-cross-language-fallbacks.mjs";
import {
  buildEntryCrossLanguageFindings,
  formatEntryCrossLanguageBlocker,
} from "./lib/entry-cross-language-fallbacks.mjs";
import {
  allEntrySourceBackedTranslationLanguageCodes,
  buildEntrySourceBackedTranslationFindings,
  formatEntrySourceBackedTranslationFinding,
} from "./lib/entry-source-backed-translations.mjs";
import {
  buildMeaningContrastFindings,
  formatMeaningContrastFinding,
} from "./lib/meaning-contrast.mjs";
import {
  buildBaseExampleNaturalnessFindings,
  formatBaseExampleNaturalnessBlocker,
} from "./lib/base-example-naturalness.mjs";
import { isRegionalVariantRisk } from "./lib/regional-variant-quality.mjs";
import { validateExampleAndDisplayCasing } from "./lib/example-casing.mjs";
import { buildSemanticSceneAlignmentBlockers } from "./lib/semantic-scene-alignment.mjs";
import { buildExampleNaturalnessBlockers } from "./lib/example-naturalness.mjs";
import { buildScriptLanguageIdentityFindings, formatScriptLanguageIdentityFinding } from "./lib/script-language-identity.mjs";
import {
  buildLatinDiacriticLossFindings,
  formatLatinDiacriticLossFinding,
} from "./lib/latin-diacritic-loss.mjs";
import {
  buildArticleGenderMarkerFindings,
  formatArticleGenderMarkerFinding,
} from "./lib/article-gender-marker-consistency.mjs";
import { buildSemanticGranularityFindings, formatSemanticGranularityFinding } from "./lib/semantic-granularity.mjs";
import {
  buildExampleTemplateDiversityFindings,
  formatExampleTemplateDiversityFinding,
} from "./lib/example-template-diversity.mjs";
import {
  buildTargetExampleLexicalAnchorFindings,
  formatTargetExampleLexicalAnchorFinding,
} from "./lib/target-example-lexical-anchor.mjs";
import {
  buildTargetExampleSceneLocationAnchorFindings,
  formatTargetExampleSceneLocationAnchorFinding,
  inferSceneLocationCanonical,
} from "./lib/target-example-scene-location-anchor.mjs";
import {
  buildIpaTranscriptionSanityFindings,
  formatIpaTranscriptionSanityFinding,
  isIpaLanguage,
} from "./lib/ipa-transcription-sanity.mjs";
import {
  buildTargetExamplePedagogicalQualityFindings,
  formatTargetExamplePedagogicalQualityFinding,
} from "./lib/target-example-pedagogical-quality.mjs";
import {
  buildTargetSemanticSceneAlignmentFindings,
  formatTargetSemanticSceneAlignmentFinding,
} from "./lib/target-semantic-scene-alignment.mjs";
import {
  buildNumberExampleGrammarFindings,
  formatNumberExampleGrammarFinding,
} from "./lib/number-example-grammar.mjs";
import {
  buildCourseMetadataLocalizationFindings,
  formatCourseMetadataLocalizationFinding,
} from "./lib/course-metadata-localization.mjs";
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
import {
  buildDeckProfileQualityFindings,
  formatDeckProfileFinding,
  resolveDeckProfileContext,
} from "./lib/deck-profile-policy.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import {
  buildTranscriptionSourceBackingFindings,
  formatTranscriptionSourceBackingBlocker,
} from "./lib/source-backed-transcriptions.mjs";
import {
  buildTranslationSourceCoverageFindings,
  formatTranslationSourceCoverageBlocker,
} from "./lib/translation-source-coverage.mjs";
import {
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
} from "./lib/transcription-source-policy.mjs";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const exportMode = args.includes("--final") || args.includes("--mode=final") ? "final" : "working";
const setId = args.find((arg) => !arg.startsWith("--")) ?? "home_kitchen_cookware_pilot_01";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

const outputDir = path.resolve("outputs/google-sheets");
const qaEvidenceMaxBuffer = 1024 * 1024 * 220;

const metadataLimits = {
  title: 25,
  description: 60,
  module: 25,
  category: 25,
};
const sentencePunctuationPattern = /[.!?。！？।။។։]/u;
const finalSentencePunctuationPattern = /[.!?。！？।။។։]\s*$/u;
const levelSentenceSeparatorPattern = /[.!?。！？।။។։]\s*/u;

let deckSpec = null;
try {
  deckSpec = resolveDeckSpec(setId).spec;
} catch {
  deckSpec = null;
}

const allowedLevelLabels = new Set([
  "Basic",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper-Intermediate",
  "Advanced",
  "Proficiency",
]);

const levelLabelCompatibleCefrRanges = new Map([
  ["Basic", [["A1", "A1"]]],
  ["Elementary", [["A1", "A2"], ["A2", "A2"]]],
  ["Pre-Intermediate", [["A2", "B1"], ["B1", "B1"]]],
  ["Intermediate", [["B1", "B1"], ["B1", "B2"]]],
  ["Upper-Intermediate", [["B2", "B2"]]],
  ["Advanced", [["B2", "C1"], ["C1", "C1"]]],
  ["Proficiency", [["C2", "C2"]]],
]);

if (!/^[a-z0-9_]+$/.test(setId)) {
  throw new Error(`Unsafe set_id: ${setId}`);
}

if (languageOrder.length !== 54) {
  throw new Error(`Expected 54 language variants, got ${languageOrder.length}`);
}

function visibleLength(value) {
  return Array.from(value ?? "").length;
}

function safeFilePart(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "flashcards";
}

function buildMainSheetName(deck) {
  const categoryOrSituation = deck.category ? String(deck.category).split(",")[0] : deck.situation;
  const parts = [deck.domain, deck.area, categoryOrSituation]
    .filter(Boolean)
    .map((part) => String(part).replace(/[\\/*?:\[\]]/g, " ").replace(/\s+/g, " ").trim());
  return (parts.join(" ") || deck.set_name || deck.set_id).slice(0, 31).trim();
}

function buildOutputPath(deck) {
  return path.join(outputDir, `FlashcardsLuna_${safeFilePart(deck.slug ?? deck.set_id)}_${exportMode}.xlsx`);
}

function buildDeliveryManifestPath(workbookPath) {
  return workbookPath.replace(/\.xlsx$/i, "_delivery.json");
}

function validateCourseMetadata(courseMetadata, deck) {
  const errors = [];
  for (const [spreadsheetCode] of languageOrder) {
    for (const [field, limit] of Object.entries(metadataLimits)) {
      const value = courseMetadata[field]?.[spreadsheetCode] ?? "";
      const length = visibleLength(value);
      if (!value) errors.push(`${spreadsheetCode} ${field} is empty`);
      if (length > limit) {
        errors.push(`${spreadsheetCode} ${field} is ${length} chars, max ${limit}: ${value}`);
      }
    }

    const levelSignal = courseMetadata.levelSignal?.[spreadsheetCode] ?? "";
    const title = courseMetadata.title?.[spreadsheetCode] ?? "";
    const description = courseMetadata.description?.[spreadsheetCode] ?? "";
    const category = courseMetadata.category?.[spreadsheetCode] ?? "";
    if (!levelSignal) {
      errors.push(`${spreadsheetCode} Course Metadata level_signal is empty`);
    } else if (!description.includes(levelSignal)) {
      errors.push(
        `${spreadsheetCode} Course Metadata description must contain exact level_signal "${levelSignal}" for level_label=${deck.level_label}`
      );
    }
    if (sentencePunctuationPattern.test(description) && !finalSentencePunctuationPattern.test(description)) {
      errors.push(`${spreadsheetCode} Course Metadata description must end with sentence punctuation: ${description}`);
    }
    if (!finalSentencePunctuationPattern.test(title)) {
      errors.push(`${spreadsheetCode} Course Metadata title must end with sentence punctuation: ${title}`);
    }
    if (levelSignal && !levelSentenceSeparatorPattern.test(description.slice(0, description.indexOf(levelSignal)))) {
      errors.push(
        `${spreadsheetCode} Course Metadata description must introduce level_signal as a separate sentence: ${description}`
      );
    }
    if (category.includes(",")) {
      errors.push(`${spreadsheetCode} Course Metadata category must be a short mobile label, not a comma-separated scope: ${category}`);
    }
  }

  if (errors.length) {
    throw new Error(`Course Metadata validation failed:\n${errors.join("\n")}`);
  }

  const localizationFindings = buildCourseMetadataLocalizationFindings(courseMetadata, { setId });
  if (localizationFindings.length) {
    throw new Error(
      `Course Metadata localization failed:\n${localizationFindings
        .map(formatCourseMetadataLocalizationFinding)
        .join("\n")}`
    );
  }
}

function validateRowCount(deck, rows) {
  const min = Number(deck.target_item_count_min);
  const max = Number(deck.target_item_count_max);
  if (Number.isFinite(min) && rows.length < min) {
    throw new Error(`Expected at least ${min} rows for ${setId}, got ${rows.length}`);
  }
  if (Number.isFinite(max) && rows.length > max) {
    throw new Error(`Expected at most ${max} rows for ${setId}, got ${rows.length}`);
  }
}

function colName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function rangeFor(row, col, rows, cols) {
  const start = `${colName(col)}${row}`;
  const end = `${colName(col + cols - 1)}${row + rows - 1}`;
  return `${start}:${end}`;
}

function setValues(sheet, startRow, startCol, values) {
  if (!values.length) return;
  const width = Math.max(...values.map((row) => row.length));
  const padded = values.map((row) => [...row, ...Array(width - row.length).fill("")]);
  sheet.getRange(rangeFor(startRow, startCol, padded.length, width)).values = padded;
}

function formatTags(tags) {
  if (Array.isArray(tags)) return tags.join(", ");
  if (!tags) return "";
  if (typeof tags === "string") return tags;
  return JSON.stringify(tags);
}

function formatList(value) {
  if (Array.isArray(value)) return value.join("; ");
  if (!value) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlLiteralList(values) {
  const uniqueValues = [...new Set(values.filter((value) => value !== undefined && value !== null))];
  if (uniqueValues.length === 0) return "null";
  return uniqueValues.map(sqlLiteral).join(", ");
}

async function fetchDeckMetadata() {
  const sql = `
select coalesce(row_to_json(deck_row), '{}'::json)
from (
  select
    set_id,
    content_type,
    set_name,
    domain,
    area,
    category,
    situation,
    level_min,
    level_max,
    level_label,
    target_item_count_min,
    target_item_count_max,
    slug,
    roadmap_stage,
    learning_goal,
    next_recommended_set_ids,
    selection_status,
    sheet_contract_version,
    quality_status,
    notes
  from content_sets
  where set_id = '${setId}'
) deck_row;
`;

  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer: qaEvidenceMaxBuffer }
  );

  return JSON.parse(stdout.trim() || "{}");
}

async function fetchCourseMetadata() {
  const sql = `
select coalesce(jsonb_object_agg(
  l.spreadsheet_code,
  jsonb_build_object(
    'title', csl.title,
    'description', csl.description,
    'module', csl.module,
    'category', csl.category,
    'level_signal', csl.level_signal,
    'quality_status', csl.quality_status
  )
), '{}'::jsonb)
from content_set_localizations csl
join languages l on l.code = csl.language_code
where csl.set_id = '${setId}'
  and l.is_active;
`;

  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer: qaEvidenceMaxBuffer }
  );

  const raw = JSON.parse(stdout.trim() || "{}");
  return {
    title: Object.fromEntries(Object.entries(raw).map(([spreadsheetCode, value]) => [spreadsheetCode, value.title ?? ""])),
    description: Object.fromEntries(
      Object.entries(raw).map(([spreadsheetCode, value]) => [spreadsheetCode, value.description ?? ""])
    ),
    module: Object.fromEntries(
      Object.entries(raw).map(([spreadsheetCode, value]) => [spreadsheetCode, value.module ?? ""])
    ),
    category: Object.fromEntries(
      Object.entries(raw).map(([spreadsheetCode, value]) => [spreadsheetCode, value.category ?? ""])
    ),
    levelSignal: Object.fromEntries(
      Object.entries(raw).map(([spreadsheetCode, value]) => [spreadsheetCode, value.level_signal ?? ""])
    ),
    qualityStatus: Object.fromEntries(
      Object.entries(raw).map(([spreadsheetCode, value]) => [spreadsheetCode, value.quality_status ?? "missing"])
    ),
  };
}

async function fetchRows() {
  const sql = `
with active_items as (
  select
    msm.display_order,
    mu.meaning_id,
    mu.english_with_article,
    mu.canonical_english,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.level,
    mu.frequency_band,
    mu.priority_band,
    mu.countability,
    mu.plural_form_en,
    mu.semantic_class,
    mu.tags,
    mu.quality_status as meaning_quality_status,
    msm.context_domain,
    msm.context_area,
    msm.context_category,
    msm.context_note,
    msm.quality_status as membership_quality_status
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  where msm.set_id = '${setId}'
    and msm.quality_status <> 'blocked'
),
	context_examples as (
	  select example_id, meaning_id, canonical_example_en, semantic_scene, quality_status
	  from meaning_examples
	  where set_id = '${setId}'
	    and example_role = 'context'
	),
language_entries as (
  select
    le.meaning_id,
    le.language_code,
    le.native_word,
    coalesce(le.word_with_article_or_marker, le.native_word) as word,
    le.article_or_marker,
    le.gender,
    le.grammatical_number,
    le.transcription,
    le.romanization_system,
    le.quality_status,
    le.pronunciation_status
  from meaning_language_entries le
  where le.meaning_id in (select meaning_id from active_items)
),
	example_translations as (
	  select
	    ce.example_id,
	    ce.meaning_id,
	    et.language_code,
	    et.example_text,
    et.quality_status
  from context_examples ce
  join meaning_example_translations et on et.example_id = ce.example_id
)
select coalesce(json_agg(row_to_json(result_rows)), '[]'::json)
from (
  select
    ai.display_order,
    ai.meaning_id,
    ai.english_with_article,
    ai.canonical_english,
    ai.part_of_speech,
    ai.meaning_note,
    ai.default_domain,
    ai.default_area,
    ai.default_category,
    ai.level,
    ai.frequency_band,
    ai.priority_band,
    ai.countability,
    ai.plural_form_en,
    ai.semantic_class,
    ai.tags,
    ai.meaning_quality_status,
    ai.context_domain,
    ai.context_area,
	    ai.context_category,
	    ai.context_note,
	    ai.membership_quality_status,
	    ce.example_id as context_example_id,
	    ce.quality_status as context_example_quality_status,
	    ce.canonical_example_en,
	    ce.semantic_scene as context_semantic_scene,
	    coalesce(jsonb_object_agg(le.language_code, le.native_word) filter (where le.language_code is not null), '{}'::jsonb) as native_words,
	    coalesce(jsonb_object_agg(le.language_code, le.word) filter (where le.language_code is not null), '{}'::jsonb) as words,
    coalesce(jsonb_object_agg(le.language_code, le.article_or_marker) filter (where le.language_code is not null), '{}'::jsonb) as article_or_markers,
    coalesce(jsonb_object_agg(le.language_code, le.gender) filter (where le.language_code is not null), '{}'::jsonb) as genders,
    coalesce(jsonb_object_agg(le.language_code, le.grammatical_number) filter (where le.language_code is not null), '{}'::jsonb) as grammatical_numbers,
    coalesce(jsonb_object_agg(et.language_code, et.example_text) filter (where et.language_code is not null), '{}'::jsonb) as examples,
    coalesce(jsonb_object_agg(le.language_code, le.transcription) filter (where le.language_code is not null), '{}'::jsonb) as transcriptions,
    coalesce(jsonb_object_agg(le.language_code, le.romanization_system) filter (where le.language_code is not null), '{}'::jsonb) as romanization_systems,
    coalesce(jsonb_object_agg(le.language_code, le.quality_status) filter (where le.language_code is not null), '{}'::jsonb) as entry_statuses,
    coalesce(jsonb_object_agg(et.language_code, et.quality_status) filter (where et.language_code is not null), '{}'::jsonb) as example_statuses,
    coalesce(jsonb_object_agg(le.language_code, le.pronunciation_status) filter (where le.language_code is not null), '{}'::jsonb) as pronunciation_statuses
	  from active_items ai
	  left join context_examples ce on ce.meaning_id = ai.meaning_id
	  left join language_entries le on le.meaning_id = ai.meaning_id
	  left join example_translations et on et.example_id = ce.example_id
	  group by
    ai.display_order,
    ai.meaning_id,
    ai.english_with_article,
    ai.canonical_english,
    ai.part_of_speech,
    ai.meaning_note,
    ai.default_domain,
    ai.default_area,
    ai.default_category,
    ai.level,
    ai.frequency_band,
    ai.priority_band,
    ai.countability,
    ai.plural_form_en,
    ai.semantic_class,
    ai.tags,
    ai.meaning_quality_status,
    ai.context_domain,
    ai.context_area,
	    ai.context_category,
	    ai.context_note,
	    ai.membership_quality_status,
	    ce.example_id,
	    ce.quality_status,
	    ce.canonical_example_en,
	    ce.semantic_scene
	  order by ai.display_order
) result_rows;
`;

  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer: 1024 * 1024 * 20 }
  );

  return JSON.parse(stdout.trim() || "[]");
}

async function fetchQaEvidence(rows) {
	const targetKeys = [
	    setId,
	    `${setId}::course_metadata`,
	    ...rows.map((row) => row.meaning_id),
	    ...rows.map((row) => `${setId}::${row.meaning_id}`),
	    ...rows.map((row) => row.context_example_id).filter(Boolean).map(String),
	    ...rows
	      .map((row) =>
	        row.context_example_id ? `${setId}::${row.meaning_id}::${row.context_example_id}` : null
	      )
	      .filter(Boolean),
	  ];
  const sql = `
select coalesce(json_agg(row_to_json(review_rows)), '[]'::json)
from (
  select distinct on (target_type, target_key, coalesce(language_code, ''), check_family)
    target_type,
    target_key,
    language_code,
    review_status,
    reviewer,
    reviewed_at,
    pass_id,
    batch_id,
    check_family,
    result_summary,
    source_note,
    checked_value_hash,
    evidence,
    qa_checked_value_hash(target_type, target_key, language_code, check_family) as current_value_hash
  from qa_reviews
  where target_type in (
	      'content_set',
	      'meaning_unit',
	      'meaning_example',
	      'meaning_language_entry',
	      'meaning_example_translation'
	    )
    and target_key in (${sqlLiteralList(targetKeys)})
    and nullif(trim(coalesce(reviewer, '')), '') is not null
    and reviewed_at is not null
    and nullif(trim(coalesce(check_family, '')), '') is not null
    and nullif(trim(coalesce(result_summary, '')), '') is not null
    and (
      nullif(trim(coalesce(pass_id, '')), '') is not null
      or nullif(trim(coalesce(batch_id, '')), '') is not null
    )
  order by target_type, target_key, coalesce(language_code, ''), check_family, reviewed_at desc, review_id desc
) review_rows;
`;

  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer: qaEvidenceMaxBuffer }
  );

  return JSON.parse(stdout.trim() || "[]");
}

function getValue(row, mapName, spreadsheetCode, dbCode) {
  if (spreadsheetCode === "EN" && mapName === "words") return row.english_with_article ?? "";
  if (spreadsheetCode === "EN" && mapName === "examples") return row.canonical_example_en ?? "";
  return row[mapName]?.[dbCode] ?? "";
}

const finalReadyContentStatuses = new Set(["approved", "generated_checked"]);
const finalReadyPronunciationStatuses = new Set([
  "approved",
  "generated_checked",
  "not_applicable",
]);
const finalReadySelectionStatuses = new Set(["approved"]);

function countStatusMap(rows, mapName, dbCode) {
  const counts = {};
  for (const row of rows) {
    const status = row[mapName]?.[dbCode] ?? "missing";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function formatStatusCounts(counts) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${status}:${count}`)
    .join(", ");
}

function statusIssues(counts, allowedStatuses) {
  return Object.entries(counts)
    .filter(([status, count]) => count > 0 && !allowedStatuses.has(status))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${status}:${count}`);
}

function qaEvidenceKey(targetType, targetKey, languageCode = "") {
  return `${targetType}::${targetKey}::${languageCode ?? ""}`;
}

function hasSemanticPreservationReference(review) {
  return (
    review.check_family === "semantic_preservation" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("semantic_preservation_")
  );
}

function hasTargetExampleNaturalnessReference(review) {
  return (
    review.check_family === "target_example_naturalness" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("target_example_naturalness_")
  );
}

function hasTargetExampleLexicalAnchorReference(review) {
  return (
    review.check_family === "target_example_lexical_anchor" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("target_example_lexical_anchor_")
  );
}

function hasTargetExamplePedagogicalQualityReference(review) {
  return (
    review.check_family === "target_example_pedagogical_quality" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("target_example_pedagogical_quality_")
  );
}

function hasEntryFormReference(review) {
  return (
    review.check_family === "entry_form" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("entry_form_")
  );
}

function hasEntryFormRegisterReference(review) {
  return (
    review.check_family === "entry_form_register" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("entry_form_register_")
  );
}

function hasSemanticGranularityReference(review) {
  return (
    review.check_family === "semantic_granularity" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("semantic_granularity_")
  );
}

function hasArticleGenderMarkerConsistencyReference(review) {
  return (
    review.check_family === "article_gender_marker_consistency" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("article_gender_marker_consistency_")
  );
}

function hasTranscriptionPolicyReference(review) {
  return (
    review.check_family === "transcription_policy" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("transcription_policy_")
  );
}

function hasPronunciationAccuracyReference(review) {
  return (
    review.check_family === "pronunciation_accuracy" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("pronunciation_accuracy_")
  );
}

function hasTranscriptionSourceBackingReference(review) {
  return (
    review.check_family === "transcription_source_backing" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("transcription_source_backing_")
  );
}

function hasBaseExampleAlignmentReference(review) {
  return (
    review.check_family === "base_example_alignment" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("base_example_alignment_")
  );
}

function hasExampleQualityReference(review) {
  return (
    review.check_family === "example_quality" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("example_quality_")
  );
}

function hasWordSelectionQualityReference(review) {
  return (
    review.check_family === "word_selection_quality" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("word_selection_quality_")
  );
}

function hasRegionalVariantQualityReference(review) {
  return (
    review.check_family === "regional_variant_quality" &&
    typeof review.pass_id === "string" &&
    review.pass_id.startsWith("regional_variant_quality_")
  );
}

const hashScopedCheckFamilies = new Set([
  "metadata_review",
  "word_selection_quality",
  "entry_form",
  "transcription_policy",
  "pronunciation_accuracy",
  "transcription_source_backing",
  "semantic_preservation",
  "target_example_naturalness",
  "target_example_lexical_anchor",
  "target_example_pedagogical_quality",
  "number_example_grammar",
  "regional_variant_quality",
  "entry_form_register",
  "semantic_granularity",
  "article_gender_marker_consistency",
  "base_example_alignment",
  "example_quality",
  "manual_review",
]);

function isHashScopedReview(review) {
  return hashScopedCheckFamilies.has(review.check_family);
}

function hasCurrentCheckedValueHash(review) {
  if (!isHashScopedReview(review)) return true;
  return (
    Boolean(review.checked_value_hash) &&
    Boolean(review.current_value_hash) &&
    review.checked_value_hash === review.current_value_hash
  );
}

function isRealReviewEvidence(review) {
  const reviewer = String(review.reviewer ?? "").toLowerCase();
  const sourceNote = String(review.source_note ?? "").toLowerCase();
  const evidence = review.evidence && typeof review.evidence === "object" ? review.evidence : {};
  const runnerEvidence =
    evidence.runner_evidence && typeof evidence.runner_evidence === "object" ? evidence.runner_evidence : {};

  return !(
    reviewer.includes("dry-run") ||
    reviewer.includes("dry_run") ||
    reviewer.includes("synthetic") ||
    sourceNote.includes("dry-run") ||
    sourceNote.includes("dry_run") ||
    sourceNote.includes("synthetic") ||
    evidence.dry_run === true ||
    evidence.synthetic === true ||
    runnerEvidence.dry_run === true ||
    runnerEvidence.synthetic === true
  );
}

function isUsableQaEvidence(review) {
  return (
    finalReadyContentStatuses.has(review.review_status) &&
    Boolean(review.reviewer) &&
    Boolean(review.reviewed_at) &&
    Boolean(review.check_family) &&
    Boolean(review.result_summary) &&
    (Boolean(review.pass_id) || Boolean(review.batch_id)) &&
    isRealReviewEvidence(review) &&
    hasCurrentCheckedValueHash(review)
  );
}

function buildQaEvidenceMap(qaReviews) {
  const evidence = {
    general: new Set(),
    semanticPreservation: new Set(),
    targetExampleNaturalness: new Set(),
    targetExampleLexicalAnchor: new Set(),
    targetExamplePedagogicalQuality: new Set(),
    entryForm: new Set(),
    entryFormRegister: new Set(),
    semanticGranularity: new Set(),
    articleGenderMarkerConsistency: new Set(),
    transcriptionPolicy: new Set(),
    pronunciationAccuracy: new Set(),
    transcriptionSourceBacking: new Set(),
    baseExampleAlignment: new Set(),
    exampleQuality: new Set(),
    wordSelectionQuality: new Set(),
    regionalVariantQuality: new Set(),
    latestNegative: new Set(),
    hashMismatch: new Set(),
    usableReviews: new Map(),
  };

  const manualApprovals = new Map();
  for (const review of qaReviews) {
    if (
      review.review_status === "approved" &&
      review.check_family === "manual_review" &&
      review.reviewed_at
    ) {
      const key = qaEvidenceKey(review.target_type, review.target_key, review.language_code ?? "");
      const reviewedAt = Date.parse(review.reviewed_at);
      const previous = manualApprovals.get(key) ?? 0;
      if (Number.isFinite(reviewedAt) && reviewedAt > previous) {
        manualApprovals.set(key, reviewedAt);
      }
    }
  }

  for (const review of qaReviews) {
    const key = qaEvidenceKey(review.target_type, review.target_key, review.language_code ?? "");
    if (
      finalReadyContentStatuses.has(review.review_status) &&
      isHashScopedReview(review) &&
      !hasCurrentCheckedValueHash(review)
    ) {
      evidence.hashMismatch.add(`${review.check_family}::${key}`);
    }
    if (isUsableQaEvidence(review)) {
      evidence.general.add(key);
      evidence.usableReviews.set(`${review.check_family}::${key}`, review);
      if (hasSemanticPreservationReference(review)) {
        evidence.semanticPreservation.add(key);
      }
      if (hasTargetExampleNaturalnessReference(review)) {
        evidence.targetExampleNaturalness.add(key);
      }
      if (hasTargetExampleLexicalAnchorReference(review)) {
        evidence.targetExampleLexicalAnchor.add(key);
      }
      if (hasTargetExamplePedagogicalQualityReference(review)) {
        evidence.targetExamplePedagogicalQuality.add(key);
      }
      if (hasEntryFormReference(review)) {
        evidence.entryForm.add(key);
      }
      if (hasEntryFormRegisterReference(review)) {
        evidence.entryFormRegister.add(key);
      }
      if (hasSemanticGranularityReference(review)) {
        evidence.semanticGranularity.add(key);
      }
      if (hasArticleGenderMarkerConsistencyReference(review)) {
        evidence.articleGenderMarkerConsistency.add(key);
      }
      if (hasTranscriptionPolicyReference(review)) {
        evidence.transcriptionPolicy.add(key);
      }
      if (hasPronunciationAccuracyReference(review)) {
        evidence.pronunciationAccuracy.add(key);
      }
      if (hasTranscriptionSourceBackingReference(review)) {
        evidence.transcriptionSourceBacking.add(key);
      }
      if (hasBaseExampleAlignmentReference(review)) {
        evidence.baseExampleAlignment.add(key);
      }
      if (hasExampleQualityReference(review)) {
        evidence.exampleQuality.add(key);
      }
      if (hasWordSelectionQualityReference(review)) {
        evidence.wordSelectionQuality.add(key);
      }
      if (hasRegionalVariantQualityReference(review)) {
        evidence.regionalVariantQuality.add(key);
      }
    } else if (
      [
        "word_selection_quality",
        "base_example_alignment",
        "example_quality",
        "semantic_preservation",
        "target_example_naturalness",
        "target_example_lexical_anchor",
        "target_example_pedagogical_quality",
        "regional_variant_quality",
        "entry_form",
        "entry_form_register",
        "semantic_granularity",
        "article_gender_marker_consistency",
        "transcription_policy",
        "pronunciation_accuracy",
        "transcription_source_backing",
      ].includes(
        review.check_family
      )
    ) {
      const reviewedAt = Date.parse(review.reviewed_at);
      const manualApprovedAt = manualApprovals.get(key) ?? 0;
      if (!Number.isFinite(reviewedAt) || manualApprovedAt <= reviewedAt) {
        evidence.latestNegative.add(`${review.check_family}::${key}`);
      }
    }
  }
  return evidence;
}

function hasQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.general.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasSemanticQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.semanticPreservation.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasTargetExampleNaturalnessQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.targetExampleNaturalness.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasTargetExampleLexicalAnchorQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.targetExampleLexicalAnchor.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasTargetExamplePedagogicalQualityQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.targetExamplePedagogicalQuality.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasEntryFormQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.entryForm.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasEntryFormRegisterQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.entryFormRegister.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasSemanticGranularityQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.semanticGranularity.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasArticleGenderMarkerConsistencyQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.articleGenderMarkerConsistency.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasTranscriptionPolicyQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.transcriptionPolicy.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasPronunciationAccuracyQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.pronunciationAccuracy.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasTranscriptionSourceBackingQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.transcriptionSourceBacking.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasBaseExampleAlignmentQaEvidence(evidence, targetType, targetKey) {
  return (
    evidence.baseExampleAlignment.has(qaEvidenceKey(targetType, targetKey, "EN")) ||
    evidence.baseExampleAlignment.has(qaEvidenceKey(targetType, targetKey, ""))
  );
}

function hasExampleQualityQaEvidence(evidence, targetType, targetKey) {
  return (
    evidence.exampleQuality.has(qaEvidenceKey(targetType, targetKey, "EN")) ||
    evidence.exampleQuality.has(qaEvidenceKey(targetType, targetKey, ""))
  );
}

function hasWordSelectionQualityQaEvidence(evidence, targetType, targetKey) {
  return (
    evidence.wordSelectionQuality.has(qaEvidenceKey(targetType, targetKey, "EN")) ||
    evidence.wordSelectionQuality.has(qaEvidenceKey(targetType, targetKey, ""))
  );
}

function hasRegionalVariantQualityQaEvidence(evidence, targetType, targetKey, languageCode = "") {
  return evidence.regionalVariantQuality.has(qaEvidenceKey(targetType, targetKey, languageCode ?? ""));
}

function hasLatestNegativeQaReview(evidence, checkFamily, targetType, targetKey, languageCode = "") {
  return evidence.latestNegative.has(
    `${checkFamily}::${qaEvidenceKey(targetType, targetKey, languageCode ?? "")}`
  );
}

function hasHashMismatchQaReview(evidence, checkFamily, targetType, targetKey, languageCode = "") {
  return evidence.hashMismatch.has(
    `${checkFamily}::${qaEvidenceKey(targetType, targetKey, languageCode ?? "")}`
  );
}

function getUsableQaReview(evidence, checkFamily, targetType, targetKey, languageCode = "") {
  return evidence.usableReviews.get(
    `${checkFamily}::${qaEvidenceKey(targetType, targetKey, languageCode ?? "")}`
  );
}

function buildContextExampleKey(row) {
  return row.context_example_id ? `${setId}::${row.meaning_id}::${row.context_example_id}` : "";
}

function summarizeBlockers(blockers, maxItems = 12) {
  if (blockers.length === 0) return "none";
  const shown = blockers.slice(0, maxItems).join("; ");
  const hidden = blockers.length - maxItems;
  return hidden > 0 ? `${shown}; ... +${hidden} more` : shown;
}

function buildGlobalStatusBlockers(deck, courseMetadata, rows) {
  const blockers = [];

  if (!finalReadyContentStatuses.has(deck.quality_status)) {
    blockers.push(`Deck Metadata quality_status=${deck.quality_status ?? "missing"}`);
  }

  if (!finalReadySelectionStatuses.has(deck.selection_status)) {
    blockers.push(`Deck Metadata selection_status=${deck.selection_status ?? "missing"}`);
  }

  for (const [spreadsheetCode] of languageOrder) {
    const status = courseMetadata.qualityStatus?.[spreadsheetCode] ?? "missing";
    if (!finalReadyContentStatuses.has(status)) {
      blockers.push(`${spreadsheetCode} Course Metadata quality_status=${status}`);
    }
  }

  for (const row of rows) {
    if (!finalReadyContentStatuses.has(row.meaning_quality_status)) {
      blockers.push(`${row.meaning_id} meaning_quality_status=${row.meaning_quality_status ?? "missing"}`);
    }
	    if (!finalReadyContentStatuses.has(row.membership_quality_status)) {
	      blockers.push(
	        `${setId}::${row.meaning_id} membership_quality_status=${row.membership_quality_status ?? "missing"}`
	      );
	    }
	    if (!finalReadyContentStatuses.has(row.context_example_quality_status)) {
	      blockers.push(
	        `${row.meaning_id} context_example_quality_status=${row.context_example_quality_status ?? "missing"}`
	      );
	    }
	  }

  return blockers;
}

function buildQaEvidenceBlockers(deck, courseMetadata, rows, qaEvidence) {
  const blockers = [];

  if (
    deck.quality_status === "generated_checked" &&
    !hasQaEvidence(qaEvidence, "content_set", setId)
  ) {
    blockers.push(`missing QA evidence for content_set ${setId}`);
  }

  for (const [spreadsheetCode, dbCode] of languageOrder) {
    const status = courseMetadata.qualityStatus?.[spreadsheetCode] ?? "missing";
    if (
      status === "generated_checked" &&
      !hasQaEvidence(qaEvidence, "content_set", `${setId}::course_metadata`, dbCode)
    ) {
      blockers.push(`missing QA evidence for ${spreadsheetCode} Course Metadata`);
    }
    if (
      status === "generated_checked" &&
      hasHashMismatchQaReview(qaEvidence, "metadata_review", "content_set", `${setId}::course_metadata`, dbCode)
    ) {
      blockers.push(`stale QA evidence for ${spreadsheetCode} Course Metadata`);
    }
  }

  for (const row of rows) {
    const cardKey = `${setId}::${row.meaning_id}`;

    if (
      row.meaning_quality_status === "generated_checked" &&
      !hasQaEvidence(qaEvidence, "meaning_unit", row.meaning_id)
    ) {
      blockers.push(`missing QA evidence for meaning_unit ${row.meaning_id}`);
    }

	    if (
	      row.membership_quality_status === "generated_checked" &&
	      !hasQaEvidence(qaEvidence, "content_set", cardKey)
    ) {
	      blockers.push(`missing QA evidence for set membership ${cardKey}`);
	    }

    if (
      row.membership_quality_status === "generated_checked" &&
      !hasWordSelectionQualityQaEvidence(qaEvidence, "content_set", cardKey)
    ) {
      blockers.push(`missing word-selection QA evidence for set membership ${cardKey}`);
    }

    if (
      row.membership_quality_status === "generated_checked" &&
      hasHashMismatchQaReview(qaEvidence, "word_selection_quality", "content_set", cardKey, "EN")
    ) {
      blockers.push(`stale word-selection QA evidence for set membership ${cardKey}`);
    }

    if (
      finalReadyContentStatuses.has(row.membership_quality_status) &&
      hasLatestNegativeQaReview(qaEvidence, "word_selection_quality", "content_set", cardKey, "EN")
    ) {
      blockers.push(`latest word-selection QA blocks set membership ${cardKey}`);
    }

	    if (
	      row.context_example_quality_status === "generated_checked" &&
	      !hasQaEvidence(qaEvidence, "meaning_example", String(row.context_example_id ?? ""))
    ) {
	      blockers.push(`missing QA evidence for context example ${row.context_example_id ?? "missing"}`);
	    }

	    if (
	      row.context_example_quality_status === "generated_checked" &&
	      !hasBaseExampleAlignmentQaEvidence(qaEvidence, "meaning_example", String(row.context_example_id ?? ""))
	    ) {
	      blockers.push(`missing base-example alignment QA evidence for context example ${row.context_example_id ?? "missing"}`);
	    }

	    if (
	      row.context_example_quality_status === "generated_checked" &&
	      !hasExampleQualityQaEvidence(qaEvidence, "meaning_example", String(row.context_example_id ?? ""))
	    ) {
	      blockers.push(`missing example-quality QA evidence for context example ${row.context_example_id ?? "missing"}`);
	    }

	    if (
	      row.context_example_quality_status === "generated_checked" &&
	      hasHashMismatchQaReview(qaEvidence, "base_example_alignment", "meaning_example", String(row.context_example_id ?? ""), "EN")
	    ) {
	      blockers.push(`stale base-example alignment QA evidence for context example ${row.context_example_id ?? "missing"}`);
	    }

	    if (
	      row.context_example_quality_status === "generated_checked" &&
	      hasHashMismatchQaReview(qaEvidence, "example_quality", "meaning_example", String(row.context_example_id ?? ""), "EN")
	    ) {
	      blockers.push(`stale example-quality QA evidence for context example ${row.context_example_id ?? "missing"}`);
	    }

	    if (
	      finalReadyContentStatuses.has(row.context_example_quality_status) &&
	      hasLatestNegativeQaReview(qaEvidence, "base_example_alignment", "meaning_example", String(row.context_example_id ?? ""), "EN")
	    ) {
	      blockers.push(`latest base-example alignment QA blocks context example ${row.context_example_id ?? "missing"}`);
	    }

	    if (
	      finalReadyContentStatuses.has(row.context_example_quality_status) &&
	      hasLatestNegativeQaReview(qaEvidence, "example_quality", "meaning_example", String(row.context_example_id ?? ""), "EN")
	    ) {
	      blockers.push(`latest example-quality QA blocks context example ${row.context_example_id ?? "missing"}`);
	    }

	    for (const [spreadsheetCode, dbCode] of languageOrder) {
      const entryStatus = row.entry_statuses?.[dbCode] ?? "missing";
      const exampleStatus = row.example_statuses?.[dbCode] ?? "missing";
      const pronunciationStatus = row.pronunciation_statuses?.[dbCode] ?? "missing";

      if (
        entryStatus === "generated_checked" &&
        !hasQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
      }

      if (
        entryStatus === "generated_checked" &&
        !hasEntryFormQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing entry-form QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
      }

      if (
        entryStatus === "generated_checked" &&
        !hasEntryFormRegisterQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing entry-form register QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
      }

      if (
        entryStatus === "generated_checked" &&
        !hasSemanticGranularityQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing semantic-granularity QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
      }

      if (
        entryStatus === "generated_checked" &&
        !hasArticleGenderMarkerConsistencyQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing article/gender/marker QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
      }

      if (
        entryStatus === "generated_checked" &&
        hasHashMismatchQaReview(qaEvidence, "entry_form", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`stale entry-form QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
      }

      for (const checkFamily of [
        ["entry_form_register", "entry-form register"],
        ["semantic_granularity", "semantic-granularity"],
        ["article_gender_marker_consistency", "article/gender/marker"],
      ]) {
        if (
          entryStatus === "generated_checked" &&
          hasHashMismatchQaReview(qaEvidence, checkFamily[0], "meaning_language_entry", row.meaning_id, dbCode)
        ) {
          blockers.push(`stale ${checkFamily[1]} QA evidence for ${spreadsheetCode} entry ${row.meaning_id}`);
        }
        if (
          finalReadyContentStatuses.has(entryStatus) &&
          hasLatestNegativeQaReview(qaEvidence, checkFamily[0], "meaning_language_entry", row.meaning_id, dbCode)
        ) {
          blockers.push(`latest ${checkFamily[1]} QA blocks ${spreadsheetCode} entry ${row.meaning_id}`);
        }
      }

      if (
        finalReadyContentStatuses.has(entryStatus) &&
        hasLatestNegativeQaReview(qaEvidence, "entry_form", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`latest entry-form QA blocks ${spreadsheetCode} entry ${row.meaning_id}`);
      }

	      if (
	        exampleStatus === "generated_checked" &&
	        !hasQaEvidence(qaEvidence, "meaning_example_translation", buildContextExampleKey(row), dbCode)
	      ) {
	        blockers.push(`missing QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

      if (
        exampleStatus === "generated_checked" &&
        !hasSemanticQaEvidence(qaEvidence, "meaning_example_translation", buildContextExampleKey(row), dbCode)
      ) {
	        blockers.push(
	          `missing semantic preservation QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`
        );
      }

	      if (
	        exampleStatus === "generated_checked" &&
	        !hasTargetExampleNaturalnessQaEvidence(qaEvidence, "meaning_example_translation", buildContextExampleKey(row), dbCode)
	      ) {
	        blockers.push(
	          `missing target-example naturalness QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`
	        );
	      }

      if (
        exampleStatus === "generated_checked" &&
        !hasTargetExampleLexicalAnchorQaEvidence(qaEvidence, "meaning_example_translation", buildContextExampleKey(row), dbCode)
      ) {
        blockers.push(
          `missing target-example lexical-anchor QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`
        );
      }

      if (
        exampleStatus === "generated_checked" &&
        !hasTargetExamplePedagogicalQualityQaEvidence(qaEvidence, "meaning_example_translation", buildContextExampleKey(row), dbCode)
      ) {
        blockers.push(
          `missing target-example pedagogical-quality QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`
        );
      }

	      if (
	        exampleStatus === "generated_checked" &&
	        isRegionalVariantRisk({
	          canonical_english: row.canonical_english,
	          language_code: dbCode,
	        }) &&
	        !hasRegionalVariantQualityQaEvidence(qaEvidence, "meaning_example_translation", buildContextExampleKey(row), dbCode)
	      ) {
	        blockers.push(
	          `missing regional-variant QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`
	        );
	      }

	      if (
	        exampleStatus === "generated_checked" &&
	        hasHashMismatchQaReview(
	          qaEvidence,
	          "semantic_preservation",
	          "meaning_example_translation",
	          buildContextExampleKey(row),
	          dbCode
	        )
	      ) {
	        blockers.push(`stale semantic-preservation QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

	      if (
	        exampleStatus === "generated_checked" &&
	        hasHashMismatchQaReview(
	          qaEvidence,
	          "target_example_naturalness",
	          "meaning_example_translation",
	          buildContextExampleKey(row),
	          dbCode
	        )
	      ) {
	        blockers.push(`stale target-example naturalness QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

      if (
        exampleStatus === "generated_checked" &&
        hasHashMismatchQaReview(
          qaEvidence,
          "target_example_lexical_anchor",
          "meaning_example_translation",
          buildContextExampleKey(row),
          dbCode
        )
      ) {
        blockers.push(`stale target-example lexical-anchor QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
      }

      if (
        exampleStatus === "generated_checked" &&
        hasHashMismatchQaReview(
          qaEvidence,
          "target_example_pedagogical_quality",
          "meaning_example_translation",
          buildContextExampleKey(row),
          dbCode
        )
      ) {
        blockers.push(`stale target-example pedagogical-quality QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
      }

	      if (
	        exampleStatus === "generated_checked" &&
	        isRegionalVariantRisk({
	          canonical_english: row.canonical_english,
	          language_code: dbCode,
	        }) &&
	        hasHashMismatchQaReview(
	          qaEvidence,
	          "regional_variant_quality",
	          "meaning_example_translation",
	          buildContextExampleKey(row),
	          dbCode
	        )
	      ) {
	        blockers.push(`stale regional-variant QA evidence for ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

	      if (
	        finalReadyContentStatuses.has(exampleStatus) &&
	        hasLatestNegativeQaReview(
	          qaEvidence,
	          "semantic_preservation",
	          "meaning_example_translation",
	          buildContextExampleKey(row),
	          dbCode
	        )
	      ) {
	        blockers.push(`latest semantic-preservation QA blocks ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

	      if (
	        finalReadyContentStatuses.has(exampleStatus) &&
	        hasLatestNegativeQaReview(
	          qaEvidence,
	          "target_example_naturalness",
	          "meaning_example_translation",
	          buildContextExampleKey(row),
	          dbCode
	        )
	      ) {
	        blockers.push(`latest target-example naturalness QA blocks ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

      if (
        finalReadyContentStatuses.has(exampleStatus) &&
        hasLatestNegativeQaReview(
          qaEvidence,
          "target_example_lexical_anchor",
          "meaning_example_translation",
          buildContextExampleKey(row),
          dbCode
        )
      ) {
        blockers.push(`latest target-example lexical-anchor QA blocks ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
      }

      if (
        finalReadyContentStatuses.has(exampleStatus) &&
        hasLatestNegativeQaReview(
          qaEvidence,
          "target_example_pedagogical_quality",
          "meaning_example_translation",
          buildContextExampleKey(row),
          dbCode
        )
      ) {
        blockers.push(`latest target-example pedagogical-quality QA blocks ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
      }

	      if (
	        finalReadyContentStatuses.has(exampleStatus) &&
	        isRegionalVariantRisk({
	          canonical_english: row.canonical_english,
	          language_code: dbCode,
	        }) &&
	        hasLatestNegativeQaReview(
	          qaEvidence,
	          "regional_variant_quality",
	          "meaning_example_translation",
	          buildContextExampleKey(row),
	          dbCode
	        )
	      ) {
	        blockers.push(`latest regional-variant QA blocks ${spreadsheetCode} example ${buildContextExampleKey(row) || row.meaning_id}`);
	      }

      if (
        pronunciationStatus === "generated_checked" &&
        !hasQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        pronunciationStatus === "generated_checked" &&
        !hasTranscriptionPolicyQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing transcription-policy QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        finalReadyPronunciationStatuses.has(pronunciationStatus) &&
        !hasTranscriptionSourceBackingQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing source-backed transcription QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        pronunciationStatus === "generated_checked" &&
        isIpaLanguage(dbCode) &&
        !hasPronunciationAccuracyQaEvidence(qaEvidence, "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`missing pronunciation-accuracy QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        pronunciationStatus === "generated_checked" &&
        hasHashMismatchQaReview(qaEvidence, "transcription_policy", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`stale transcription-policy QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        finalReadyPronunciationStatuses.has(pronunciationStatus) &&
        hasHashMismatchQaReview(qaEvidence, "transcription_source_backing", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`stale source-backed transcription QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        pronunciationStatus === "generated_checked" &&
        isIpaLanguage(dbCode) &&
        hasHashMismatchQaReview(qaEvidence, "pronunciation_accuracy", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`stale pronunciation-accuracy QA evidence for ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        finalReadyPronunciationStatuses.has(pronunciationStatus) &&
        hasLatestNegativeQaReview(qaEvidence, "transcription_policy", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`latest transcription-policy QA blocks ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }
      if (
        finalReadyPronunciationStatuses.has(pronunciationStatus) &&
        isIpaLanguage(dbCode) &&
        hasLatestNegativeQaReview(qaEvidence, "pronunciation_accuracy", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`latest pronunciation-accuracy QA blocks ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }

      if (
        finalReadyPronunciationStatuses.has(pronunciationStatus) &&
        hasLatestNegativeQaReview(qaEvidence, "transcription_source_backing", "meaning_language_entry", row.meaning_id, dbCode)
      ) {
        blockers.push(`latest source-backed transcription QA blocks ${spreadsheetCode} pronunciation ${row.meaning_id}`);
      }
    }
  }

  return blockers;
}

function buildTranscriptionShapeBlockersForExport(rows) {
  const blockers = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      const displayWord = getValue(row, "words", spreadsheetCode, dbCode);
      const transcription = getValue(row, "transcriptions", spreadsheetCode, dbCode);
      const romanizationSystem = getValue(row, "romanization_systems", spreadsheetCode, dbCode);
      const issues = validateTranscriptionShape({
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        native_word: displayWord,
        word_with_article_or_marker: displayWord,
        transcription,
        romanization_system: romanizationSystem,
        part_of_speech: row.part_of_speech,
      });
      for (const issue of issues) {
        blockers.push(
          `transcription shape ${spreadsheetCode} ${row.meaning_id}: ${issue}; display="${displayWord}"; transcription="${transcription}"`
        );
      }
    }
  }
  return blockers;
}

function buildIpaTranscriptionSanityBlockersForExport(rows) {
  const transcriptionRows = buildTranscriptionRowsForExport(rows);
  return buildIpaTranscriptionSanityFindings(transcriptionRows).blockers.map(
    (blocker) => `IPA transcription sanity ${formatIpaTranscriptionSanityFinding(blocker)}`
  );
}

function buildTranscriptionRowsForExport(rows) {
  const transcriptionRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      transcriptionRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        english_with_article: row.english_with_article,
        part_of_speech: row.part_of_speech,
        meaning_note: row.meaning_note,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode) || getValue(row, "words", spreadsheetCode, dbCode),
        word_with_article_or_marker: getValue(row, "words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        transcription: getValue(row, "transcriptions", spreadsheetCode, dbCode),
        romanization_system: getValue(row, "romanization_systems", spreadsheetCode, dbCode),
      });
    }
  }
  return transcriptionRows;
}

async function buildTranscriptionSourceBackingBlockersForExport(rows) {
  const manifest = await loadReferenceSourcesManifest();
  const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
  const manifestSha256 = await referenceSourcesManifestSha256();
  const findings = await buildTranscriptionSourceBackingFindings(buildTranscriptionRowsForExport(rows), {
    manifestSourceIds,
    manifestSha256,
  });
  return findings.blockers.map(
    (blocker) => `source-backed transcription ${formatTranscriptionSourceBackingBlocker(blocker)}`
  );
}

function buildCrossLanguageTranscriptionBlockersForExport(rows) {
  const transcriptionRows = buildTranscriptionRowsForExport(rows);

  return buildCrossLanguageTranscriptionFindings(transcriptionRows).blockers.map(
    (blocker) => `transcription cross-language fallback ${blocker.set_id}: ${formatCrossLanguageBlocker(blocker)}`
  );
}

function buildIntraLanguageTranscriptionBlockersForExport(rows) {
  const transcriptionRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      transcriptionRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        transcription: getValue(row, "transcriptions", spreadsheetCode, dbCode),
      });
    }
  }

  return buildIntraLanguageTranscriptionCollapseFindings(transcriptionRows).map(
    (blocker) =>
      `transcription intra-language collapse ${blocker.set_id} ${blocker.language_code}: ` +
      `same normalized transcription "${blocker.normalized_transcription}" appears on ` +
      `${blocker.row_count}/${blocker.total_rows} active rows`
  );
}

function buildTranscriptionStyleConsistencyBlockersForExport(rows) {
  const findings = buildTranscriptionStyleConsistencyFindings(buildTranscriptionRowsForExport(rows));
  return findings.blockers.map(
    (blocker) => `transcription style consistency ${formatTranscriptionStyleConsistencyBlocker(blocker)}`
  );
}

function buildEntryCrossLanguageBlockersForExport(rows) {
  const entryRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      entryRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
      });
    }
  }

  return buildEntryCrossLanguageFindings(entryRows).blockers.map(
    (blocker) => `entry cross-language fallback ${blocker.set_id ?? setId}: ${formatEntryCrossLanguageBlocker(blocker)}`
  );
}

async function buildEntrySourceBackedTranslationBlockersForExport(rows) {
  const entryRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      entryRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode) || getValue(row, "words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        transcription: getValue(row, "transcriptions", spreadsheetCode, dbCode),
      });
    }
  }

  const manifest = await loadReferenceSourcesManifest();
  const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
  const findings = await buildEntrySourceBackedTranslationFindings(entryRows, {
    manifestSourceIds,
    enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
  });
  return findings.blockers.map(
    (blocker) => `entry source-backed translation ${formatEntrySourceBackedTranslationFinding(blocker)}`
  );
}

async function buildTranslationSourceCoverageForExport(rows) {
  const entryRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      entryRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode) || getValue(row, "words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        transcription: getValue(row, "transcriptions", spreadsheetCode, dbCode),
      });
    }
  }

  const manifest = await loadReferenceSourcesManifest();
  const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
  const findings = await buildTranslationSourceCoverageFindings(entryRows, {
    manifestSourceIds,
  });
  return {
    summary: {
      rows_checked: entryRows.length,
      decision_count: findings.decisionCount,
      by_status: findings.byStatus,
      blocker_count: findings.blockers.length,
      warning_count: findings.warnings.length,
    },
    blockers: findings.blockers.map(
      (blocker) => `translation source coverage ${formatTranslationSourceCoverageBlocker(blocker)}`
    ),
  };
}

function buildMeaningContrastBlockersForExport(rows) {
  const contrastRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      contrastRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }

  return buildMeaningContrastFindings(contrastRows).blockers.map(
    (blocker) => `meaning contrast ${formatMeaningContrastFinding(blocker)}`
  );
}

function buildBaseExampleNaturalnessBlockersForExport(rows) {
  return buildBaseExampleNaturalnessFindings(
    rows.map((row) => ({
      set_id: setId,
      meaning_id: row.meaning_id,
      example_id: row.context_example_id,
      canonical_english: row.canonical_english,
      canonical_example_en: row.canonical_example_en,
      semantic_scene: row.context_semantic_scene,
    }))
  ).blockers.map((blocker) => `base example naturalness ${formatBaseExampleNaturalnessBlocker(blocker)}`);
}

function buildExampleCasingBlockersForExport(rows) {
  const blockers = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      const displayWord = getValue(row, "words", spreadsheetCode, dbCode);
      const exampleText = getValue(row, "examples", spreadsheetCode, dbCode);
      const issues = validateExampleAndDisplayCasing({
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        display_word: displayWord,
        example_text: exampleText,
      });
      for (const issue of issues) {
        blockers.push(
          `example casing ${spreadsheetCode} ${row.meaning_id}: ${issue}; display="${displayWord}"; example="${exampleText}"`
        );
      }
    }
  }
  return blockers;
}

function buildCjkExampleSpacingBlockersForExport(rows) {
  const exampleRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      exampleRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildCjkExampleSpacingFindings(exampleRows).blockers.map(
    (blocker) => `CJK example spacing ${formatCjkExampleSpacingFinding(blocker)}`
  );
}

function buildThaiExampleSpacingBlockersForExport(rows) {
  const exampleRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      exampleRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildThaiExampleSpacingFindings(exampleRows).blockers.map(
    (blocker) => `Thai example spacing ${formatThaiExampleSpacingFinding(blocker)}`
  );
}

function buildSoutheastAsianExampleSpacingBlockersForExport(rows) {
  const exampleRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      exampleRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        part_of_speech: row.part_of_speech,
        canonical_example_en: row.canonical_example_en,
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildSoutheastAsianExampleSpacingFindings(exampleRows).blockers.map(
    (blocker) => `Southeast Asian example spacing ${formatSoutheastAsianExampleSpacingFinding(blocker)}`
  );
}

function buildActionExampleSurfaceBlockersForExport(rows) {
  const exampleRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      exampleRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        part_of_speech: row.part_of_speech,
        canonical_example_en: row.canonical_example_en,
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildActionExampleSurfaceFindings(exampleRows).blockers.map(
    (blocker) => `Action example surface ${formatActionExampleSurfaceFinding(blocker)}`
  );
}

function buildExampleSurfaceGrammarBlockersForExport(rows) {
  const exampleRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      exampleRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        canonical_example_en: row.canonical_example_en,
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildExampleSurfaceGrammarFindings(exampleRows).blockers.map(
    (blocker) => `example surface grammar ${formatExampleSurfaceGrammarFinding(blocker)}`
  );
}

function buildExampleNaturalnessBlockersForExport(rows) {
  const blockers = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      const exampleText = getValue(row, "examples", spreadsheetCode, dbCode);
      const issues = buildExampleNaturalnessBlockers([
        {
          set_id: setId,
          meaning_id: row.meaning_id,
          canonical_english: row.canonical_english,
          example_id: row.context_example_id,
          semantic_scene: row.context_semantic_scene,
          language_code: dbCode,
          display_word: getValue(row, "words", spreadsheetCode, dbCode),
          example_text: exampleText,
        },
      ]);
      for (const issue of issues) {
        blockers.push(
          `example naturalness ${spreadsheetCode} ${row.meaning_id}: ${issue.issue}; example="${exampleText}"`
        );
      }
    }
  }
  return blockers;
}

function buildTargetSemanticSceneAlignmentBlockersForExport(rows, qaEvidence) {
  const targetRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      const targetKey = buildContextExampleKey(row);
      targetRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        canonical_english: row.canonical_english,
        semantic_scene: row.context_semantic_scene,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
        semantic_preservation_evidence: getUsableQaReview(
          qaEvidence,
          "semantic_preservation",
          "meaning_example_translation",
          targetKey,
          dbCode
        )?.evidence,
      });
    }
  }
  return buildTargetSemanticSceneAlignmentFindings(targetRows).blockers.map(
    (blocker) => `target semantic scene ${formatTargetSemanticSceneAlignmentFinding(blocker)}`
  );
}

function buildNumberExampleGrammarBlockersForExport(rows, qaEvidence) {
  const targetRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      const targetKey = buildContextExampleKey(row);
      targetRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        canonical_english: row.canonical_english,
        canonical_example_en: row.canonical_example_en,
        semantic_scene: row.context_semantic_scene,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
        number_example_grammar_evidence: getUsableQaReview(
          qaEvidence,
          "number_example_grammar",
          "meaning_example_translation",
          targetKey,
          dbCode
        )?.evidence,
      });
    }
  }
  return buildNumberExampleGrammarFindings(targetRows).blockers.map(
    (blocker) => `number example grammar ${formatNumberExampleGrammarFinding(blocker)}`
  );
}

function buildSemanticSceneAlignmentBlockersForExport(rows) {
  return buildSemanticSceneAlignmentBlockers(
    rows.map((row) => ({
      set_id: setId,
      display_order: row.display_order,
      meaning_id: row.meaning_id,
      canonical_english: row.canonical_english,
      english_with_article: row.english_with_article,
      part_of_speech: row.part_of_speech,
      example_id: row.context_example_id,
      canonical_example_en: row.canonical_example_en,
      semantic_scene: row.context_semantic_scene,
    }))
  ).map(
    (blocker) =>
      `semantic scene ${blocker.meaning_id}: ${blocker.issue}; example="${blocker.canonical_example_en}"`
  );
}

function buildEntryRowsForExport(rows) {
  const entryRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      entryRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode) || getValue(row, "words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        word_with_article_or_marker: getValue(row, "words", spreadsheetCode, dbCode),
        article_or_marker: getValue(row, "article_or_markers", spreadsheetCode, dbCode),
        gender: getValue(row, "genders", spreadsheetCode, dbCode),
        grammatical_number: getValue(row, "grammatical_numbers", spreadsheetCode, dbCode),
      });
    }
  }
  return entryRows;
}

function buildScriptLanguageIdentityBlockersForExport(rows) {
  return buildScriptLanguageIdentityFindings(buildEntryRowsForExport(rows)).blockers.map(
    (blocker) => `script/language identity ${formatScriptLanguageIdentityFinding(blocker)}`
  );
}

function buildLatinDiacriticLossBlockersForExport(rows) {
  const diacriticRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      diacriticRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode),
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        word_with_article_or_marker: getValue(row, "words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildLatinDiacriticLossFindings(diacriticRows).blockers.map(
    (blocker) => `latin diacritic loss ${formatLatinDiacriticLossFinding(blocker)}`
  );
}

function buildArticleGenderMarkerBlockersForExport(rows) {
  return buildArticleGenderMarkerFindings(buildEntryRowsForExport(rows)).blockers.map(
    (blocker) => `article/gender/marker ${formatArticleGenderMarkerFinding(blocker)}`
  );
}

function buildSemanticGranularityBlockersForExport(rows) {
  return buildSemanticGranularityFindings(buildEntryRowsForExport(rows)).blockers.map(
    (blocker) => `semantic granularity ${formatSemanticGranularityFinding(blocker)}`
  );
}

function buildExampleTemplateDiversityBlockersForExport(rows) {
  return buildExampleTemplateDiversityFindings(
    rows.map((row) => ({
      set_id: setId,
      display_order: row.display_order,
      meaning_id: row.meaning_id,
      example_id: row.context_example_id,
      canonical_example_en: row.canonical_example_en,
      semantic_scene: row.context_semantic_scene,
    }))
  ).blockers.map((blocker) => `example template diversity ${formatExampleTemplateDiversityFinding(blocker)}`);
}

function buildTargetExampleLexicalAnchorBlockersForExport(rows) {
  const anchorRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      anchorRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        part_of_speech: row.part_of_speech,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildTargetExampleLexicalAnchorFindings(anchorRows).blockers.map(
    (blocker) => `target-example lexical anchor ${formatTargetExampleLexicalAnchorFinding(blocker)}`
  );
}

function normalizeSceneLocationKey(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildTargetExampleSceneLocationAnchorBlockersForExport(rows) {
  const rowsByCanonical = new Map();
  for (const row of rows) {
    rowsByCanonical.set(normalizeSceneLocationKey(row.canonical_english), row);
  }

  const anchorRows = [];
  for (const row of rows) {
    const locationCanonical = inferSceneLocationCanonical({
      semantic_scene: row.context_semantic_scene,
    });
    const locationRow = rowsByCanonical.get(normalizeSceneLocationKey(locationCanonical));
    if (!locationRow) continue;

    for (const [spreadsheetCode, dbCode] of languageOrder) {
      anchorRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        semantic_scene: row.context_semantic_scene,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
        location_canonical_english: locationCanonical,
        location_display_word: getValue(locationRow, "words", spreadsheetCode, dbCode),
        location_native_word: getValue(locationRow, "native_words", spreadsheetCode, dbCode),
      });
    }
  }

  return buildTargetExampleSceneLocationAnchorFindings(anchorRows).blockers.map(
    (blocker) => `target-example scene location anchor ${formatTargetExampleSceneLocationAnchorFinding(blocker)}`
  );
}

function buildTargetExamplePedagogicalQualityBlockersForExport(rows) {
  const pedagogicalRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      pedagogicalRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        example_id: row.context_example_id,
        canonical_english: row.canonical_english,
        canonical_example_en: row.canonical_example_en,
        semantic_scene: row.context_semantic_scene,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        target_display_word: getValue(row, "words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  return buildTargetExamplePedagogicalQualityFindings(pedagogicalRows).blockers.map(
    (blocker) => `target-example pedagogical quality ${formatTargetExamplePedagogicalQualityFinding(blocker)}`
  );
}

function buildDeckProfileQualityBlockersForExport(rows, deck) {
  const profileRows = [];
  for (const row of rows) {
    for (const [spreadsheetCode, dbCode] of languageOrder) {
      profileRows.push({
        set_id: setId,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        canonical_english: row.canonical_english,
        english_with_article: row.english_with_article,
        part_of_speech: row.part_of_speech,
        meaning_note: row.meaning_note,
        domain: deck.domain ?? row.default_domain,
        area: deck.area ?? row.default_area,
        category: deck.category ?? row.default_category,
        canonical_example_en: row.canonical_example_en,
        semantic_scene: row.context_semantic_scene,
        language_code: dbCode,
        spreadsheet_code: spreadsheetCode,
        display_word: getValue(row, "words", spreadsheetCode, dbCode),
        native_word: getValue(row, "native_words", spreadsheetCode, dbCode),
        example_text: getValue(row, "examples", spreadsheetCode, dbCode),
      });
    }
  }
  const context = resolveDeckProfileContext({ spec: deckSpec, rows: profileRows });
  return buildDeckProfileQualityFindings(profileRows, context).blockers.map(
    (blocker) => `deck profile quality ${formatDeckProfileFinding(blocker)}`
  );
}

function isFinalReady(coverage, globalStatusBlockers, qaEvidenceBlockers) {
  return (
    coverage.every((row) => row.finalReady) &&
    globalStatusBlockers.length === 0 &&
    qaEvidenceBlockers.length === 0
  );
}

function buildCoverage(rows) {
  return languageOrder.map(([spreadsheetCode, dbCode]) => {
    let missingWords = 0;
    let missingExamples = 0;
    let missingTranscriptions = 0;

    for (const row of rows) {
      if (!getValue(row, "words", spreadsheetCode, dbCode)) missingWords += 1;
      if (!getValue(row, "examples", spreadsheetCode, dbCode)) missingExamples += 1;
      if (!getValue(row, "transcriptions", spreadsheetCode, dbCode)) missingTranscriptions += 1;
    }

    const entryStatusMap = countStatusMap(rows, "entry_statuses", dbCode);
    const exampleStatusMap = countStatusMap(rows, "example_statuses", dbCode);
    const pronunciationStatusMap = countStatusMap(rows, "pronunciation_statuses", dbCode);
    const statusIssueList = [
      ...statusIssues(entryStatusMap, finalReadyContentStatuses).map((issue) => `entry ${issue}`),
      ...statusIssues(exampleStatusMap, finalReadyContentStatuses).map((issue) => `example ${issue}`),
      ...statusIssues(pronunciationStatusMap, finalReadyPronunciationStatuses).map(
        (issue) => `pronunciation ${issue}`
      ),
    ];
    const hasFullCoverage =
      missingWords === 0 && missingExamples === 0 && missingTranscriptions === 0;

    return {
      spreadsheetCode,
      dbCode,
      missingWords,
      missingExamples,
      missingTranscriptions,
      entryStatuses: formatStatusCounts(entryStatusMap),
      exampleStatuses: formatStatusCounts(exampleStatusMap),
      pronunciationStatuses: formatStatusCounts(pronunciationStatusMap),
      statusIssues: statusIssueList.join("; "),
      finalReady: hasFullCoverage && statusIssueList.length === 0,
    };
  });
}

function validateFinalReadiness(coverage, globalStatusBlockers, qaEvidenceBlockers) {
  const failures = coverage.filter((row) => !row.finalReady);
  const finalBlockers = [];

  if (failures.length) {
    finalBlockers.push(
      failures
      .map(
        (row) =>
          `${row.spreadsheetCode}: missing words=${row.missingWords}, examples=${row.missingExamples}, transcriptions=${row.missingTranscriptions}, status issues=${row.statusIssues || "none"}`
      )
      .join("\n")
    );
  }

  if (globalStatusBlockers.length) {
    finalBlockers.push(`Global status blockers:\n${globalStatusBlockers.join("\n")}`);
  }

  if (qaEvidenceBlockers.length) {
    finalBlockers.push(`QA evidence blockers:\n${qaEvidenceBlockers.join("\n")}`);
  }

  if (exportMode === "final" && finalBlockers.length) {
    throw new Error(
      `Final export blocked: incomplete coverage, non-final status or missing QA evidence.\n${finalBlockers.join("\n")}`
    );
  }
}

function validateDeckMetadata(deck) {
  const missing = [];
  const invalid = [];
  const requiredFields = [
    "set_id",
    "content_type",
    "domain",
    "area",
    "level_min",
    "level_max",
    "level_label",
    "target_item_count_min",
    "target_item_count_max",
    "slug",
    "roadmap_stage",
    "learning_goal",
    "selection_status",
    "quality_status",
    "sheet_contract_version",
  ];

  for (const field of requiredFields) {
    if (deck[field] === undefined || deck[field] === null || deck[field] === "") {
      missing.push(field);
    }
  }

  if (!deck.category && !deck.situation) {
    missing.push("category_or_situation");
  }

  if (deck.content_type && !["vocabulary", "core_foundation"].includes(deck.content_type)) {
    invalid.push(`content_type=${deck.content_type} is not allowed in current vocabulary-only export`);
  }

  if (deck.level_label && !allowedLevelLabels.has(deck.level_label)) {
    invalid.push(`level_label=${deck.level_label}`);
  }

  const expectedRanges = levelLabelCompatibleCefrRanges.get(deck.level_label);
  if (
    expectedRanges &&
    !expectedRanges.some(([min, max]) => deck.level_min === min && deck.level_max === max)
  ) {
    invalid.push(
      `level_label=${deck.level_label} expects compatible CEFR range ${expectedRanges
        .map((range) => range.join("-"))
        .join(" or ")}`
    );
  }

  if (!Array.isArray(deck.next_recommended_set_ids)) {
    missing.push("next_recommended_set_ids");
  }

  if (missing.length || invalid.length) {
    throw new Error(
      `Deck Metadata validation failed for ${setId}. Missing required fields: ${missing.join(", ") || "none"}. Invalid fields: ${invalid.join(", ") || "none"}`
    );
  }
}

function addMainSheet(workbook, rows, mainSheetName) {
  const sheet = workbook.worksheets.add(mainSheetName);
  const codes = languageOrder.map(([spreadsheetCode]) => spreadsheetCode);
  const headers = [
    ...codes,
    ...codes.map((code) => `${code} example`),
    ...codes.map((code) => `${code} transcription`),
  ];

  const values = rows.map((row) => [
    ...languageOrder.map(([spreadsheetCode, dbCode]) => getValue(row, "words", spreadsheetCode, dbCode)),
    ...languageOrder.map(([spreadsheetCode, dbCode]) => getValue(row, "examples", spreadsheetCode, dbCode)),
    ...languageOrder.map(([spreadsheetCode, dbCode]) => getValue(row, "transcriptions", spreadsheetCode, dbCode)),
  ]);

  setValues(sheet, 1, 0, [headers, ...values]);
}

function addCourseMetadata(workbook, courseMetadata) {
  const sheet = workbook.worksheets.add("Course Metadata");
  const codes = languageOrder.map(([spreadsheetCode]) => spreadsheetCode);
  const headers = ["", ...codes];
  const rows = [
    ["Title", ...codes.map((code) => courseMetadata.title[code] ?? "")],
    ["Description", ...codes.map((code) => courseMetadata.description[code] ?? "")],
    ["Module", ...codes.map((code) => courseMetadata.module[code] ?? "")],
    ["Category", ...codes.map((code) => courseMetadata.category[code] ?? "")],
  ];

  setValues(sheet, 1, 0, [headers, ...rows]);
}

function addDeckMetadata(
  workbook,
  deck,
  rows,
  coverage,
  courseMetadata,
  mainSheetName,
  globalStatusBlockers,
  qaEvidenceBlockers
) {
  const finalReady = isFinalReady(coverage, globalStatusBlockers, qaEvidenceBlockers);
  const sheet = workbook.worksheets.add("Deck Metadata");
  const exportStatus =
    finalReady && exportMode === "final" ? "final_candidate" : "working_preview_not_final_ready";
  const categoryOrSituation = deck.category ?? deck.situation;

  setValues(sheet, 1, 0, [
    ["field", "value", "notes"],
    ["set_id", deck.set_id, "Stable internal deck id."],
    ["slug", deck.slug, "Suggested stable slug."],
    ["content_type", deck.content_type, "Deck type."],
    ["domain", deck.domain, "Top-level taxonomy domain."],
    ["area", deck.area, "Second-level taxonomy area."],
    ["category_or_situation", categoryOrSituation ?? "", "Category for the vocabulary deck."],
    ["roadmap_stage", deck.roadmap_stage, "Content ladder stage from Content Roadmap."],
    ["level_label", deck.level_label, "Canonical deck level label."],
    ["level_min", deck.level_min, "Official CEFR minimum level."],
    ["level_max", deck.level_max, "Official CEFR maximum level."],
    ["target_item_count_min", deck.target_item_count_min, "Target range, not a forced fill number."],
    ["target_item_count_max", deck.target_item_count_max, "Target range, not a forced fill number."],
    ["actual_item_count", rows.length, "Rows in the main card sheet."],
    ["title_en", courseMetadata.title.EN, "Human-readable title from Course Metadata."],
    ["description_en", courseMetadata.description.EN, "Human-readable description from Course Metadata."],
    ["module_en", courseMetadata.module.EN, "Short mobile-app module label from Course Metadata."],
    ["category_en", courseMetadata.category.EN, "Short mobile-app category label from Course Metadata."],
    ["title_ru", courseMetadata.title.RU, "Russian title for quick review."],
    ["description_ru", courseMetadata.description.RU, "Russian description for quick review."],
    ["module_ru", courseMetadata.module.RU, "Russian module label for quick review."],
    ["category_ru", courseMetadata.category.RU, "Russian category label for quick review."],
    ["learning_goal", deck.learning_goal, "What the learner should get from this deck."],
    ["next_recommended_set_ids", formatList(deck.next_recommended_set_ids), "Suggested next decks in the content ladder."],
    ["selection_status", deck.selection_status, "Selection/review state for the set composition."],
    ["quality_status", deck.quality_status, "Database quality status for the content set."],
    ["global_status_blockers", summarizeBlockers(globalStatusBlockers), "Deck/course/meaning/membership statuses blocking final export."],
    ["qa_evidence_blockers", summarizeBlockers(qaEvidenceBlockers), "Missing qa_reviews evidence for generated_checked statuses."],
    ["export_mode", exportMode, "working or final."],
    ["export_status", exportStatus, "Spreadsheet export readiness."],
    ["language_variant_count", languageOrder.length, "Active language variants in this export."],
    ["main_sheet", mainSheetName, "User-facing card sheet."],
    ["column_contract", "translations -> examples -> word transcriptions", "Main sheet grouped-column contract."],
    ["spreadsheet_contract", "config/spreadsheet-contract-v1.json", "Machine-readable workbook contract."],
    ["card_key_policy", "card_key = set_id::meaning_id", "Deck-scoped stable row key in the workbook."],
    ["sheet_contract_version", deck.sheet_contract_version, "Workbook metadata/export contract version."],
  ]);
}

function addCardMetadata(workbook, rows) {
  const sheet = workbook.worksheets.add("Card Metadata");
  const headers = [
    "main_sheet_row",
    "display_order",
    "card_key",
    "set_id",
    "meaning_id",
    "canonical_english",
    "english_with_article",
    "part_of_speech",
    "level",
    "frequency_band",
    "priority_band",
    "domain",
    "area",
    "category",
    "context_domain",
    "context_area",
    "context_category",
    "countability",
    "plural_form_en",
    "semantic_class",
    "tags",
    "meaning_note",
	    "context_note",
	    "context_example_id",
	    "context_example_key",
	    "context_example_quality_status",
	    "meaning_quality_status",
	    "membership_quality_status",
	  ];

  const values = rows.map((row, index) => [
    index + 2,
    row.display_order,
    `${setId}::${row.meaning_id}`,
    setId,
    row.meaning_id,
    row.canonical_english,
    row.english_with_article,
    row.part_of_speech,
    row.level,
    row.frequency_band,
    row.priority_band,
    row.default_domain,
    row.default_area,
    row.default_category,
    row.context_domain,
    row.context_area,
    row.context_category,
    row.countability,
    row.plural_form_en,
    row.semantic_class,
	    formatTags(row.tags),
	    row.meaning_note,
	    row.context_note,
	    row.context_example_id,
	    buildContextExampleKey(row),
	    row.context_example_quality_status,
	    row.meaning_quality_status,
	    row.membership_quality_status,
	  ]);

  setValues(sheet, 1, 0, [headers, ...values]);
}

function exportReadinessLabel(coverage, globalStatusBlockers, qaEvidenceBlockers) {
  const finalReady = isFinalReady(coverage, globalStatusBlockers, qaEvidenceBlockers);
  if (finalReady && exportMode === "final") return "final candidate";
  if (finalReady) return "coverage complete; working preview export";
  return exportMode === "final" ? "blocked for final export" : "not final-ready; working preview only";
}

function coverageStatusSummary(coverage, globalStatusBlockers, qaEvidenceBlockers) {
  const complete = coverage.filter(
    (row) => row.missingWords === 0 && row.missingExamples === 0 && row.missingTranscriptions === 0
  );
  const incomplete = coverage.filter(
    (row) => row.missingWords > 0 || row.missingExamples > 0 || row.missingTranscriptions > 0
  );
  const statusBlocked = coverage.filter((row) => row.statusIssues);

  return {
    fieldCoverage: `Complete fields: ${complete.length}/${coverage.length} language variants`,
    missingCoverage:
      incomplete.length === 0
        ? "No missing words/examples/transcriptions"
        : incomplete
            .map(
              (row) =>
                `${row.spreadsheetCode} missing W${row.missingWords}/E${row.missingExamples}/T${row.missingTranscriptions}`
            )
            .join("; "),
    statusCoverage:
      statusBlocked.length === 0
        ? "No non-final statuses"
        : statusBlocked.map((row) => `${row.spreadsheetCode}: ${row.statusIssues}`).join("; "),
    globalStatusBlockers: summarizeBlockers(globalStatusBlockers),
    qaEvidenceBlockers: summarizeBlockers(qaEvidenceBlockers),
  };
}

function addReadme(workbook, rows, coverage, mainSheetName, globalStatusBlockers, qaEvidenceBlockers) {
  const summary = coverageStatusSummary(coverage, globalStatusBlockers, qaEvidenceBlockers);
  const sheet = workbook.worksheets.add("_README");
  setValues(sheet, 1, 0, [
    ["FlashcardsLuna Google Sheets export"],
    ["Set ID", setId],
    ["Export mode", exportMode],
    ["Export readiness", exportReadinessLabel(coverage, globalStatusBlockers, qaEvidenceBlockers)],
    ["Main sheet", mainSheetName],
    ["Rows", rows.length],
    ["Language variants", languageOrder.length],
    ["Column contract", "translations -> examples -> word transcriptions"],
    ["Spreadsheet contract", "config/spreadsheet-contract-v1.json"],
    ["Order rule", "The same 54-language order is repeated in all three blocks."],
    ["Transcription rule", "Transcription is for the displayed word only, not for examples."],
    ["Current field coverage", summary.fieldCoverage],
    ["Missing coverage", summary.missingCoverage],
    ["Status blockers", summary.statusCoverage],
    ["Global status blockers", summary.globalStatusBlockers],
	    ["QA evidence blockers", summary.qaEvidenceBlockers],
	    ["Course metadata", "Course Metadata contains deck title/description/module/category in 54-language order from the database."],
	    ["Deck metadata", "Deck Metadata contains set-level fields: taxonomy, CEFR, level_label, goal, status and next deck ids."],
	    ["Card metadata", "Card Metadata contains card_key, set_id, meaning_id, context_example_id, level, POS, priority, taxonomy and row statuses."],
	    ["QA status", "See _qa_status. Final export requires complete fields, final-ready statuses, context-example gates and structured QA evidence for generated_checked."],
    ["Drive folder target", "https://drive.google.com/drive/folders/1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"],
  ]);
}

function addQaStatus(workbook, rows, coverage, globalStatusBlockers, qaEvidenceBlockers) {
  const sheet = workbook.worksheets.add("_qa_status");
  setValues(sheet, 1, 0, [
    ["Export mode", exportMode],
    ["Export readiness", exportReadinessLabel(coverage, globalStatusBlockers, qaEvidenceBlockers)],
    ["Rows", rows.length],
    ["Language variants", languageOrder.length],
	    ["Rule", "Final export requires zero missing words/examples/transcriptions, final-ready statuses, context-example gates and semantic QA evidence for generated_checked examples."],
    ["Global status blockers", summarizeBlockers(globalStatusBlockers)],
    ["QA evidence blockers", summarizeBlockers(qaEvidenceBlockers)],
    [],
    [
      "spreadsheet_code",
      "db_code",
      "missing_words",
      "missing_examples",
      "missing_transcriptions",
      "entry_statuses",
      "example_statuses",
      "pronunciation_statuses",
      "status_issues",
      "final_ready",
    ],
    ...coverage.map((row) => [
      row.spreadsheetCode,
      row.dbCode,
      row.missingWords,
      row.missingExamples,
      row.missingTranscriptions,
      row.entryStatuses,
      row.exampleStatuses,
      row.pronunciationStatuses,
      row.statusIssues,
      row.finalReady ? "yes" : "no",
    ]),
    [],
    ["global_status_blocker"],
    ...globalStatusBlockers.map((blocker) => [blocker]),
    [],
    ["qa_evidence_blocker"],
    ...qaEvidenceBlockers.map((blocker) => [blocker]),
  ]);
}

function addLanguages(workbook) {
  const sheet = workbook.worksheets.add("_languages");
  setValues(sheet, 1, 0, [["order", "spreadsheet_code", "db_code", "language", "transcription_format"]]);
  setValues(
    sheet,
    2,
    0,
    languageOrder.map(([spreadsheetCode, dbCode, language, transcriptionFormat], index) => [
      index + 1,
      spreadsheetCode,
      dbCode,
      language,
      transcriptionFormat,
    ])
  );
}

const deckMetadata = await fetchDeckMetadata();
validateDeckMetadata(deckMetadata);
const courseMetadata = await fetchCourseMetadata();
validateCourseMetadata(courseMetadata, deckMetadata);
const rows = await fetchRows();
validateRowCount(deckMetadata, rows);
const qaEvidence = buildQaEvidenceMap(await fetchQaEvidence(rows));
const translationSourceCoverage = await buildTranslationSourceCoverageForExport(rows);

const coverage = buildCoverage(rows);
const globalStatusBlockers = buildGlobalStatusBlockers(deckMetadata, courseMetadata, rows);
const qaEvidenceBlockers = [
  ...buildQaEvidenceBlockers(deckMetadata, courseMetadata, rows, qaEvidence),
  ...buildTranscriptionShapeBlockersForExport(rows),
  ...buildIpaTranscriptionSanityBlockersForExport(rows),
  ...(await buildTranscriptionSourceBackingBlockersForExport(rows)),
  ...buildTranscriptionStyleConsistencyBlockersForExport(rows),
  ...buildCrossLanguageTranscriptionBlockersForExport(rows),
  ...buildIntraLanguageTranscriptionBlockersForExport(rows),
  ...buildEntryCrossLanguageBlockersForExport(rows),
  ...(await buildEntrySourceBackedTranslationBlockersForExport(rows)),
  ...translationSourceCoverage.blockers,
  ...buildMeaningContrastBlockersForExport(rows),
  ...buildScriptLanguageIdentityBlockersForExport(rows),
  ...buildLatinDiacriticLossBlockersForExport(rows),
  ...buildArticleGenderMarkerBlockersForExport(rows),
  ...buildSemanticGranularityBlockersForExport(rows),
  ...buildBaseExampleNaturalnessBlockersForExport(rows),
  ...buildExampleTemplateDiversityBlockersForExport(rows),
  ...buildExampleCasingBlockersForExport(rows),
  ...buildCjkExampleSpacingBlockersForExport(rows),
  ...buildThaiExampleSpacingBlockersForExport(rows),
  ...buildSoutheastAsianExampleSpacingBlockersForExport(rows),
  ...buildActionExampleSurfaceBlockersForExport(rows),
  ...buildExampleSurfaceGrammarBlockersForExport(rows),
  ...buildExampleNaturalnessBlockersForExport(rows),
	  ...buildTargetSemanticSceneAlignmentBlockersForExport(rows, qaEvidence),
	  ...buildNumberExampleGrammarBlockersForExport(rows, qaEvidence),
	  ...buildDeckProfileQualityBlockersForExport(rows, deckMetadata),
	  ...buildTargetExampleLexicalAnchorBlockersForExport(rows),
  ...buildTargetExampleSceneLocationAnchorBlockersForExport(rows),
  ...buildTargetExamplePedagogicalQualityBlockersForExport(rows),
  ...buildSemanticSceneAlignmentBlockersForExport(rows),
];
validateFinalReadiness(coverage, globalStatusBlockers, qaEvidenceBlockers);
const mainSheetName = buildMainSheetName(deckMetadata);
const outputPath = buildOutputPath(deckMetadata);
const lastMainColumn = colName(languageOrder.length * 3 - 1);
const previewRows = Math.min(rows.length + 1, 6);
const renderRows = Math.min(rows.length + 1, 12);

const workbook = Workbook.create();
addMainSheet(workbook, rows, mainSheetName);
addCourseMetadata(workbook, courseMetadata);
addDeckMetadata(
  workbook,
  deckMetadata,
  rows,
  coverage,
  courseMetadata,
  mainSheetName,
  globalStatusBlockers,
  qaEvidenceBlockers
);
addCardMetadata(workbook, rows);
addReadme(workbook, rows, coverage, mainSheetName, globalStatusBlockers, qaEvidenceBlockers);
addQaStatus(workbook, rows, coverage, globalStatusBlockers, qaEvidenceBlockers);
addLanguages(workbook);

const mainInspect = await workbook.inspect({
  kind: "table",
  range: `${mainSheetName}!A1:${lastMainColumn}${previewRows}`,
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 170,
});
console.log(mainInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

await workbook.render({ sheetName: mainSheetName, range: `A1:${lastMainColumn}${renderRows}`, scale: 1 });
await workbook.render({ sheetName: "Course Metadata", range: "A1:BC5", scale: 1 });
await workbook.render({ sheetName: "Deck Metadata", range: "A1:C35", scale: 1 });
await workbook.render({ sheetName: "Card Metadata", range: "A1:AB12", scale: 1 });
await workbook.render({ sheetName: "_README", range: "A1:B21", scale: 1 });
await workbook.render({ sheetName: "_qa_status", range: "A1:J24", scale: 1 });
await workbook.render({ sheetName: "_languages", range: "A1:E56", scale: 1 });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
const workbookSha256 = createHash("sha256").update(await fs.readFile(outputPath)).digest("hex");
const sourceDataSha256 = createHash("sha256")
  .update(
    JSON.stringify({
      set_id: setId,
      export_mode: exportMode,
      deck: deckMetadata,
      course_metadata: courseMetadata,
      rows,
      coverage,
      global_status_blockers: globalStatusBlockers,
      qa_evidence_blockers: qaEvidenceBlockers,
      translation_source_coverage: translationSourceCoverage.summary,
    })
  )
  .digest("hex");

const deliveryManifestPath = buildDeliveryManifestPath(outputPath);
let previousDeliveryManifest = {};
try {
  previousDeliveryManifest = JSON.parse(await fs.readFile(deliveryManifestPath, "utf8"));
} catch {
  previousDeliveryManifest = {};
}
const hasPreviousGoogleSheet = Boolean(previousDeliveryManifest.google_sheet_id);
await fs.writeFile(
  deliveryManifestPath,
  `${JSON.stringify(
    {
      set_id: setId,
      slug: deckMetadata.slug,
      export_mode: exportMode,
      export_readiness: exportReadinessLabel(coverage, globalStatusBlockers, qaEvidenceBlockers),
      workbook_path: outputPath,
      workbook_file: path.basename(outputPath),
      workbook_sha256: workbookSha256,
      source_data_sha256: sourceDataSha256,
      main_sheet: mainSheetName,
      row_count: rows.length,
      language_count: languageOrder.length,
      language_variant_count: languageOrder.length,
      final_ready: isFinalReady(coverage, globalStatusBlockers, qaEvidenceBlockers),
      translation_source_coverage: translationSourceCoverage.summary,
      exported_at: new Date().toISOString(),
      drive_folder_id: "1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei",
      google_sheet_id: previousDeliveryManifest.google_sheet_id ?? null,
      google_sheet_url: previousDeliveryManifest.google_sheet_url ?? null,
      google_sheet_title: previousDeliveryManifest.google_sheet_title ?? null,
      google_sheet_uploaded_at: previousDeliveryManifest.google_sheet_uploaded_at ?? null,
      google_sheet_verified_in_folder: Boolean(previousDeliveryManifest.google_sheet_verified_in_folder),
      google_sheet_matches_current_workbook: false,
      google_sheet_uploaded_workbook_sha256: previousDeliveryManifest.google_sheet_uploaded_workbook_sha256 ?? null,
      google_sheet_upload_status: hasPreviousGoogleSheet ? "needs_upload_after_export" : "not_uploaded",
      google_sheet_upload_mode: previousDeliveryManifest.google_sheet_upload_mode ?? null,
      google_sheet_readback_status: hasPreviousGoogleSheet ? "needs_readback_after_export" : "not_uploaded",
      google_sheet_readback_verified_at: null,
      google_sheet_readback_sample_count: null,
      google_sheet_readback_workbook_sha256: null,
      google_sheet_readback_errors: [],
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(outputPath);
console.log(deliveryManifestPath);
