#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  allEntrySourceBackedTranslationLanguageCodes,
  buildEntrySourceBackedTranslationFindings,
  loadEntrySourceDecisions,
} from "./lib/entry-source-backed-translations.mjs";
import { validateExampleAndDisplayCasing } from "./lib/example-casing.mjs";
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
  buildTargetExampleLexicalAnchorFindings,
  formatTargetExampleLexicalAnchorFinding,
} from "./lib/target-example-lexical-anchor.mjs";
import {
  buildTargetExampleSceneLocationAnchorFindings,
  formatTargetExampleSceneLocationAnchorFinding,
} from "./lib/target-example-scene-location-anchor.mjs";
import {
  buildTargetSemanticSceneAlignmentFindings,
  formatTargetSemanticSceneAlignmentFinding,
} from "./lib/target-semantic-scene-alignment.mjs";
import {
  buildNumberExampleGrammarFindings,
  formatNumberExampleGrammarFinding,
} from "./lib/number-example-grammar.mjs";
import { buildTranscriptionShapeBlockers } from "./lib/transcription-shape.mjs";
import {
  buildTranscriptionSourceBackingFindings,
  formatTranscriptionSourceBackingBlocker,
} from "./lib/source-backed-transcriptions.mjs";
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./lib/transcription-style-consistency.mjs";
import {
  buildTranslationSourceCoverageFindings,
  formatTranslationSourceCoverageBlocker,
} from "./lib/translation-source-coverage.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { assertSafeSetId, psqlJson, sqlLiteralList, sqlString } from "./lib/qa-utils.mjs";

const defaultSetIds = [
  "home_kitchen_cookware_pilot_01",
  "home_kitchen_cooking_actions_a1_a2",
  "home_kitchen_storage_cleaning_a2",
  "home_bathroom_essentials_a1",
  "home_kitchen_small_tools_supplies_a2",
];

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
let requestedSetIds = setIds.length ? setIds : defaultSetIds;
const sampleSize = Number(args.find((arg) => arg.startsWith("--sample-size="))?.slice("--sample-size=".length) ?? 6);
const seed = args.find((arg) => arg.startsWith("--seed="))?.slice("--seed=".length) ?? "sample-card-quality-20260502";
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const forcedRowsArg = args.find((arg) => arg.startsWith("--forced-rows="))?.slice("--forced-rows=".length);
const excludeRowsArg = args.find((arg) => arg.startsWith("--exclude-rows="))?.slice("--exclude-rows=".length);
const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const reportPath = path.resolve(outArg ?? `outputs/qa/sample_card_quality_audit_${dateStamp}.json`);

if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
  throw new Error(`sample-size must be a positive integer, got ${sampleSize}`);
}
for (const setId of requestedSetIds) assertSafeSetId(setId);

const forcedRows = [];
const excludedRows = [];
function rowIdentityFromObject(row, sourceLabel) {
  const forcedSetId = String(row.set_id ?? "");
  const meaningId = String(row.meaning_id ?? "");
  const languageCode = String(row.language_code ?? "");
  if (!forcedSetId || !meaningId || !languageCode) {
    throw new Error(`${sourceLabel} row is missing set_id/meaning_id/language_code: ${JSON.stringify(row)}`);
  }
  assertSafeSetId(forcedSetId);
  return {
    set_id: forcedSetId,
    meaning_id: meaningId,
    language_code: languageCode,
  };
}

if (forcedRowsArg) {
  const forcedRowsPath = path.resolve(forcedRowsArg);
  const lines = (await readFile(forcedRowsPath, "utf8"))
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const forcedTargetMap = new Map();
  for (const line of lines) {
    const row = JSON.parse(line);
    const identity = rowIdentityFromObject(row, "Forced");
    forcedTargetMap.set(`${identity.set_id}::${identity.meaning_id}::${identity.language_code}`, identity);
  }
  forcedRows.push(...forcedTargetMap.values());
  if (!setIds.length) {
    requestedSetIds = [...new Set(forcedRows.map((row) => row.set_id))];
  }
}

for (const setId of requestedSetIds) assertSafeSetId(setId);

if (excludeRowsArg) {
  const excludeRowsPath = path.resolve(excludeRowsArg);
  const raw = await readFile(excludeRowsPath, "utf8");
  const excludedTargetMap = new Map();
  const trimmed = raw.trim();
  const rows = trimmed.startsWith("{")
    ? (JSON.parse(raw).sampled_rows_detail ?? [])
    : raw
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
  for (const row of rows) {
    const identity = rowIdentityFromObject(row, "Excluded");
    excludedTargetMap.set(`${identity.set_id}::${identity.meaning_id}::${identity.language_code}`, identity);
  }
  excludedRows.push(...excludedTargetMap.values());
}

const forcedTargetsSql = forcedRows.length
  ? `values ${forcedRows
      .map((row) => `(${sqlString(row.set_id)}, ${sqlString(row.meaning_id)}, ${sqlString(row.language_code)})`)
      .join(",\n")}`
  : "select null::text as set_id, null::text as meaning_id, null::text as language_code where false";
const excludedTargetsSql = excludedRows.length
  ? `values ${excludedRows
      .map((row) => `(${sqlString(row.set_id)}, ${sqlString(row.meaning_id)}, ${sqlString(row.language_code)})`)
      .join(",\n")}`
  : "select null::text as set_id, null::text as meaning_id, null::text as language_code where false";
const forcedJoinSql = forcedRows.length
  ? `join forced_targets ft
      on ft.set_id = msm.set_id
     and ft.meaning_id = mu.meaning_id
     and ft.language_code = le.language_code`
  : "";
const excludedJoinSql = excludedRows.length
  ? `left join excluded_targets xt
      on xt.set_id = msm.set_id
     and xt.meaning_id = mu.meaning_id
     and xt.language_code = le.language_code`
  : "";
const excludedWhereSql = excludedRows.length ? "and xt.meaning_id is null" : "";
const sampledWhereSql = forcedRows.length ? "" : `where sample_rank <= ${sampleSize}`;

const finalReviewStatuses = new Set(["approved", "generated_checked"]);
const finalContentStatuses = new Set(["approved", "generated_checked"]);
const finalPronunciationStatuses = new Set(["approved", "generated_checked", "not_applicable"]);
const ipaLanguageCodes = new Set(
  languageOrderRecords
    .filter((record) => record.transcriptionFormat === "IPA")
    .map((record) => record.dbCode)
);

function stableKey(row) {
  return `${row.set_id}::${row.meaning_id}::${row.language_code}`;
}

function decisionKey(decision) {
  return `${decision.set_id}::${decision.meaning_id}::${decision.language_code}`;
}

function statusObject(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function requireFamilies(row, families, statusField, targetLabel) {
  const statuses = statusObject(row[statusField]);
  const blockers = [];
  for (const family of families) {
    if (!finalReviewStatuses.has(statuses[family])) {
      blockers.push({
        set_id: row.set_id,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        language_code: row.language_code,
        blocker_type: "sample_missing_or_nonpass_qa_evidence",
        reason: `${targetLabel} ${family} latest status is ${statuses[family] ?? "missing"}`,
      });
    }
  }
  return blockers;
}

const rows = await psqlJson(`
with forced_targets(set_id, meaning_id, language_code) as (
  ${forcedTargetsSql}
),
excluded_targets(set_id, meaning_id, language_code) as (
  ${excludedTargetsSql}
),
sampled as (
  select *
  from (
    select
      msm.set_id,
      cs.set_name,
      msm.display_order,
      mu.meaning_id,
      mu.canonical_english,
      mu.meaning_note,
      mu.part_of_speech,
      mu.level,
      mu.frequency_band,
      mu.priority_band,
      msm.quality_status as membership_quality_status,
      mu.quality_status as meaning_quality_status,
      e.example_id,
      e.canonical_example_en,
      e.semantic_scene,
      e.quality_status as context_example_quality_status,
      le.language_code,
      le.native_word,
      le.word_with_article_or_marker,
      coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
      le.transcription,
      le.romanization_system,
      le.quality_status as entry_quality_status,
      le.pronunciation_status,
      et.example_text,
      et.quality_status as example_translation_quality_status,
      row_number() over (
        partition by msm.set_id, le.language_code
        order by md5(msm.set_id || '::' || le.language_code || '::' || mu.meaning_id || '::' || ${`'${seed.replace(/'/g, "''")}'`})
      ) as sample_rank
    from meaning_set_memberships msm
    join content_sets cs on cs.set_id = msm.set_id
    join meaning_units mu on mu.meaning_id = msm.meaning_id
    join meaning_examples e
      on e.set_id = msm.set_id
     and e.meaning_id = msm.meaning_id
     and e.example_role = 'context'
    join meaning_language_entries le on le.meaning_id = msm.meaning_id
    join languages l on l.code = le.language_code and l.is_active
    join meaning_example_translations et
      on et.example_id = e.example_id
     and et.language_code = le.language_code
    ${forcedJoinSql}
    ${excludedJoinSql}
    where msm.set_id in (${sqlLiteralList(requestedSetIds)})
      and msm.quality_status <> 'blocked'
      ${excludedWhereSql}
  ) ranked
  ${sampledWhereSql}
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    sampled.*,
    loc_entry.location_canonical_english,
    loc_entry.location_display_word,
    loc_entry.location_native_word,
    semantic_preservation.evidence as semantic_preservation_evidence,
    number_example_grammar.evidence as number_example_grammar_evidence,
    entry_qa.statuses as entry_qa_statuses,
    example_qa.statuses as example_qa_statuses
  from sampled
  left join lateral (
    select case
      when sampled.semantic_scene->>'state_or_location' ~* '^(next to|in front of|on top of|inside|outside|against|beside|behind|under|above|near|by|on|in|at) (the |a |an )?.+'
      then lower(regexp_replace(
        regexp_replace(
          regexp_replace(sampled.semantic_scene->>'state_or_location',
            '^(next to|in front of|on top of|inside|outside|against|beside|behind|under|above|near|by|on|in|at) (the |a |an )?',
            '',
            'i'
          ),
          '^(the |a |an )?',
          '',
          'i'
        ),
        '[^a-z0-9 ]+',
        ' ',
        'g'
      ))
      else null
    end as location_canonical_english
  ) loc on true
  left join lateral (
    select
      loc.location_canonical_english,
      coalesce(loc_le.word_with_article_or_marker, loc_le.native_word) as location_display_word,
      loc_le.native_word as location_native_word
    from meaning_units loc_mu
    join meaning_language_entries loc_le
      on loc_le.meaning_id = loc_mu.meaning_id
     and loc_le.language_code = sampled.language_code
    where lower(regexp_replace(loc_mu.canonical_english, '[^a-z0-9 ]+', ' ', 'g')) = loc.location_canonical_english
      and loc.location_canonical_english not in ('wall', 'window', 'door', 'floor', 'room', 'bathroom', 'kitchen')
    order by loc_mu.created_at desc nulls last, loc_mu.meaning_id
    limit 1
  ) loc_entry on true
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = sampled.set_id || '::' || sampled.meaning_id || '::' || sampled.example_id::text
      and qr.language_code = sampled.language_code
      and qr.check_family = 'semantic_preservation'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'semantic_preservation_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) semantic_preservation on true
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = sampled.set_id || '::' || sampled.meaning_id || '::' || sampled.example_id::text
      and qr.language_code = sampled.language_code
      and qr.check_family = 'number_example_grammar'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'number_example_grammar_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) number_example_grammar on true
  left join lateral (
    select jsonb_object_agg(check_family, review_status) as statuses
    from (
      select distinct on (qr.check_family)
        qr.check_family,
        qr.review_status
      from qa_reviews qr
      where qr.target_type = 'meaning_language_entry'
        and qr.target_key = sampled.meaning_id
        and qr.language_code = sampled.language_code
        and qr.check_family in (
          'entry_form',
          'entry_form_register',
          'semantic_granularity',
          'article_gender_marker_consistency',
          'transcription_policy',
          'transcription_source_backing',
          'pronunciation_accuracy'
        )
      order by qr.check_family, qr.created_at desc, qr.reviewed_at desc nulls last, qr.review_id desc
    ) latest
  ) entry_qa on true
  left join lateral (
    select jsonb_object_agg(check_family, review_status) as statuses
    from (
      select distinct on (qr.check_family)
        qr.check_family,
        qr.review_status
      from qa_reviews qr
      where qr.target_type = 'meaning_example_translation'
        and qr.target_key = sampled.set_id || '::' || sampled.meaning_id || '::' || sampled.example_id::text
        and qr.language_code = sampled.language_code
        and qr.check_family in (
          'semantic_preservation',
          'target_example_naturalness',
          'target_example_lexical_anchor',
          'target_example_pedagogical_quality',
          'number_example_grammar',
          'regional_variant_quality'
        )
      order by qr.check_family, qr.created_at desc, qr.reviewed_at desc nulls last, qr.review_id desc
    ) latest
  ) example_qa on true
  order by sampled.set_id, sampled.language_code, sampled.sample_rank
) rows;
`, 1024 * 1024 * 200);

const expectedRows = forcedRows.length || requestedSetIds.length * languageOrderRecords.length * sampleSize;
const blockers = [];
const warnings = [];

if (rows.length !== expectedRows) {
  blockers.push({
    blocker_type: "sample_size_mismatch",
    reason: `Expected ${expectedRows} sampled rows (${requestedSetIds.length} decks * ${languageOrderRecords.length} languages * ${sampleSize}), got ${rows.length}`,
  });
}

for (const row of rows) {
  for (const [field, label] of [
    ["native_word", "translation/native_word"],
    ["display_word", "translation/display_word"],
    ["example_text", "example"],
    ["transcription", "transcription"],
  ]) {
    if (!String(row[field] ?? "").trim()) {
      blockers.push({
        set_id: row.set_id,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        language_code: row.language_code,
        blocker_type: "sample_missing_required_field",
        reason: `${label} is empty`,
      });
    }
  }

  for (const [field, allowed, label] of [
    ["entry_quality_status", finalContentStatuses, "entry quality status"],
    ["example_translation_quality_status", finalContentStatuses, "example translation status"],
    ["pronunciation_status", finalPronunciationStatuses, "pronunciation status"],
  ]) {
    if (!allowed.has(row[field])) {
      blockers.push({
        set_id: row.set_id,
        display_order: row.display_order,
        meaning_id: row.meaning_id,
        language_code: row.language_code,
        blocker_type: "sample_nonfinal_status",
        reason: `${label} is ${row[field] ?? "missing"}`,
      });
    }
  }

  const entryFamilies = [
    "entry_form",
    "entry_form_register",
    "semantic_granularity",
    "article_gender_marker_consistency",
    "transcription_policy",
    "transcription_source_backing",
  ];
  if (ipaLanguageCodes.has(row.language_code)) entryFamilies.push("pronunciation_accuracy");
  blockers.push(...requireFamilies(row, entryFamilies, "entry_qa_statuses", "entry"));
  blockers.push(
    ...requireFamilies(
      row,
      [
        "semantic_preservation",
        "target_example_naturalness",
        "target_example_lexical_anchor",
        "target_example_pedagogical_quality",
      ],
      "example_qa_statuses",
      "example"
    )
  );

  for (const issue of validateExampleAndDisplayCasing(row)) {
    blockers.push({
      set_id: row.set_id,
      display_order: row.display_order,
      meaning_id: row.meaning_id,
      language_code: row.language_code,
      blocker_type: "sample_example_or_display_casing",
      reason: issue,
    });
  }
}

for (const blocker of buildTranscriptionShapeBlockers(rows)) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_transcription_shape",
    reason: `${blocker.issue}; display="${blocker.display_word}"; transcription="${blocker.transcription}"`,
  });
}

const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const sampleKeys = new Set(rows.map(stableKey));
const decisions = (await loadEntrySourceDecisions()).filter((decision) => sampleKeys.has(decisionKey(decision)));

const entryFindings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds,
  decisions,
  enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
});
for (const blocker of entryFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_entry_source_backed_translation",
    reason: blocker.reason,
  });
}
for (const warning of entryFindings.warnings) {
  warnings.push({
    set_id: warning.set_id,
    display_order: warning.display_order,
    meaning_id: warning.meaning_id,
    language_code: warning.language_code,
    warning_type: "sample_entry_source_backed_translation",
    reason: warning.reason,
  });
}

const translationCoverage = await buildTranslationSourceCoverageFindings(rows, {
  manifestSourceIds,
  decisions,
});
for (const blocker of translationCoverage.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_translation_source_coverage",
    reason: formatTranslationSourceCoverageBlocker(blocker),
  });
}

const transcriptionSourceBacking = await buildTranscriptionSourceBackingFindings(rows, {
  manifestSourceIds,
});
for (const blocker of transcriptionSourceBacking.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_transcription_source_backing",
    reason: formatTranscriptionSourceBackingBlocker(blocker),
  });
}

const transcriptionStyleConsistency = buildTranscriptionStyleConsistencyFindings(rows);
for (const blocker of transcriptionStyleConsistency.blockers) {
  for (const affectedRow of blocker.affected_rows ?? []) {
    if (!sampleKeys.has(stableKey(affectedRow))) continue;
    blockers.push({
      set_id: affectedRow.set_id,
      display_order: affectedRow.display_order,
      meaning_id: affectedRow.meaning_id,
      language_code: affectedRow.language_code,
      blocker_type: "sample_transcription_style_consistency",
      reason: formatTranscriptionStyleConsistencyBlocker(blocker),
    });
  }
}

const lexicalAnchorFindings = buildTargetExampleLexicalAnchorFindings(rows);
for (const blocker of lexicalAnchorFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_target_example_lexical_anchor",
    reason: formatTargetExampleLexicalAnchorFinding(blocker),
  });
}
for (const warning of lexicalAnchorFindings.warnings) {
  warnings.push({
    set_id: warning.set_id,
    meaning_id: warning.meaning_id,
    language_code: warning.language_code,
    warning_type: "sample_target_example_lexical_anchor",
    reason: formatTargetExampleLexicalAnchorFinding(warning),
  });
}

const semanticSceneFindings = buildTargetSemanticSceneAlignmentFindings(rows);
for (const blocker of semanticSceneFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_target_semantic_scene_alignment",
    reason: formatTargetSemanticSceneAlignmentFinding(blocker),
  });
}

const sceneLocationAnchorFindings = buildTargetExampleSceneLocationAnchorFindings(rows);
for (const blocker of sceneLocationAnchorFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_target_example_scene_location_anchor",
    reason: formatTargetExampleSceneLocationAnchorFinding(blocker),
  });
}
for (const warning of sceneLocationAnchorFindings.warnings) {
  warnings.push({
    set_id: warning.set_id,
    display_order: warning.display_order,
    meaning_id: warning.meaning_id,
    language_code: warning.language_code,
    warning_type: "sample_target_example_scene_location_anchor",
    reason: formatTargetExampleSceneLocationAnchorFinding(warning),
  });
}

const cjkExampleSpacingFindings = buildCjkExampleSpacingFindings(rows);
for (const blocker of cjkExampleSpacingFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_cjk_example_spacing",
    reason: formatCjkExampleSpacingFinding(blocker),
  });
}

const thaiExampleSpacingFindings = buildThaiExampleSpacingFindings(rows);
for (const blocker of thaiExampleSpacingFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_thai_example_spacing",
    reason: formatThaiExampleSpacingFinding(blocker),
  });
}

const southeastAsianExampleSpacingFindings = buildSoutheastAsianExampleSpacingFindings(rows);
for (const blocker of southeastAsianExampleSpacingFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_southeast_asian_example_spacing",
    reason: formatSoutheastAsianExampleSpacingFinding(blocker),
  });
}

const actionExampleSurfaceFindings = buildActionExampleSurfaceFindings(rows);
for (const blocker of actionExampleSurfaceFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_action_example_surface",
    reason: formatActionExampleSurfaceFinding(blocker),
  });
}

const exampleSurfaceGrammarFindings = buildExampleSurfaceGrammarFindings(rows);
for (const blocker of exampleSurfaceGrammarFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_example_surface_grammar",
    reason: formatExampleSurfaceGrammarFinding(blocker),
  });
}

const numberExampleGrammarFindings = buildNumberExampleGrammarFindings(rows);
for (const blocker of numberExampleGrammarFindings.blockers) {
  blockers.push({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    blocker_type: "sample_number_example_grammar",
    reason: formatNumberExampleGrammarFinding(blocker),
  });
}

const byDeck = {};
const byLanguage = {};
for (const row of rows) {
  byDeck[row.set_id] ??= { sampled_rows: 0 };
  byDeck[row.set_id].sampled_rows += 1;
  byLanguage[row.language_code] ??= { sampled_rows: 0 };
  byLanguage[row.language_code].sampled_rows += 1;
}

for (const blocker of blockers) {
  if (blocker.set_id) {
    byDeck[blocker.set_id] ??= { sampled_rows: 0 };
    byDeck[blocker.set_id].blockers = (byDeck[blocker.set_id].blockers ?? 0) + 1;
  }
  if (blocker.language_code) {
    byLanguage[blocker.language_code] ??= { sampled_rows: 0 };
    byLanguage[blocker.language_code].blockers = (byLanguage[blocker.language_code].blockers ?? 0) + 1;
  }
}

for (const warning of warnings) {
  if (warning.set_id) {
    byDeck[warning.set_id] ??= { sampled_rows: 0 };
    byDeck[warning.set_id].warnings = (byDeck[warning.set_id].warnings ?? 0) + 1;
  }
  if (warning.language_code) {
    byLanguage[warning.language_code] ??= { sampled_rows: 0 };
    byLanguage[warning.language_code].warnings = (byLanguage[warning.language_code].warnings ?? 0) + 1;
  }
}

const sampledRows = rows.map((row) => ({
  set_id: row.set_id,
  deck: row.set_name,
  language_code: row.language_code,
  sample_rank: row.sample_rank,
  display_order: row.display_order,
  meaning_id: row.meaning_id,
  canonical_english: row.canonical_english,
  display_word: row.display_word,
  native_word: row.native_word,
  example_text: row.example_text,
  transcription: row.transcription,
  entry_quality_status: row.entry_quality_status,
  example_translation_quality_status: row.example_translation_quality_status,
  pronunciation_status: row.pronunciation_status,
  entry_qa_statuses: statusObject(row.entry_qa_statuses),
  example_qa_statuses: statusObject(row.example_qa_statuses),
}));

const report = {
  generated_at: new Date().toISOString(),
  mode: forcedRows.length ? "forced_row_card_quality_audit" : "sample_card_quality_audit",
  seed,
  sample_size_per_deck_language: sampleSize,
  forced_rows_source: forcedRowsArg ?? null,
  forced_rows_expected: forcedRows.length || null,
  set_ids: requestedSetIds,
  expected_rows: expectedRows,
  sampled_rows: rows.length,
  blocker_count: blockers.length,
  warning_count: warnings.length,
  semantic_scene_alignment_checked: semanticSceneFindings.checked,
  semantic_scene_alignment_skipped: semanticSceneFindings.skipped,
  scene_location_anchor_checked: sceneLocationAnchorFindings.checked,
  scene_location_anchor_skipped: sceneLocationAnchorFindings.skipped,
  number_example_grammar_checked: numberExampleGrammarFindings.checked,
  example_surface_grammar_checked: exampleSurfaceGrammarFindings.checked,
  translation_source_coverage_summary: {
    rows_checked: translationCoverage.rows.length,
    blocker_count: translationCoverage.blockers.length,
    by_status: translationCoverage.byStatus,
  },
  transcription_source_backing_summary: transcriptionSourceBacking.byLanguage,
  by_deck: byDeck,
  by_language: byLanguage,
  blockers,
  warnings,
  sampled_rows_detail: sampledRows,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

const markdownPath = reportPath.replace(/\.json$/u, ".md");
await writeFile(
  markdownPath,
  [
    "# Sample Card Quality Audit",
    "",
    `Generated at: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Seed: \`${seed}\``,
    forcedRows.length
      ? `Forced rows: ${forcedRows.length} from \`${forcedRowsArg}\``
      : `Sample: ${sampleSize} row(s) per deck/language`,
    "",
    `Rows checked: ${rows.length}/${expectedRows}`,
    `Blockers: ${blockers.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "| Deck | Sampled rows | Blockers | Warnings |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(byDeck).map(
      ([setId, value]) =>
        `| ${setId} | ${value.sampled_rows ?? 0} | ${value.blockers ?? 0} | ${value.warnings ?? 0} |`
    ),
    "",
    `Translation source coverage statuses: ${JSON.stringify(translationCoverage.byStatus)}.`,
    `Target semantic scene alignment checked ${semanticSceneFindings.checked} supported row(s), skipped ${semanticSceneFindings.skipped} unsupported scene row(s).`,
    `Number example grammar checked ${numberExampleGrammarFindings.checked} row(s).`,
    "",
    blockers.length ? "## Blockers" : "## Blockers\n\nNone.",
    ...(blockers.length
      ? blockers.slice(0, 100).map((blocker) => `- ${blocker.set_id ?? "?"} ${blocker.language_code ?? "?"} ${blocker.meaning_id ?? "?"}: ${blocker.reason}`)
      : []),
    "",
    warnings.length ? "## Warnings" : "## Warnings\n\nNone.",
    ...(warnings.length
      ? warnings.slice(0, 100).map((warning) => `- ${warning.set_id ?? "?"} ${warning.language_code ?? "?"} ${warning.meaning_id ?? "?"}: ${warning.reason}`)
      : []),
    "",
  ].join("\n"),
  "utf8"
);

if (blockers.length > 0) {
  console.error(`Sample card quality audit failed: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 80)) {
    console.error(`${blocker.set_id ?? "?"} ${blocker.language_code ?? "?"} ${blocker.meaning_id ?? "?"}: ${blocker.reason}`);
  }
  const hidden = blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

console.log(
  `Sample card quality audit OK: rows=${rows.length}, blockers=${blockers.length}, warnings=${warnings.length}, report=${path.relative(process.cwd(), reportPath)}`
);
