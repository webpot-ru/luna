import { assertSafeSetId, psqlJson, sqlString } from "./lib/qa-utils.mjs";
import {
  buildIntraLanguageTranscriptionCollapseFindings,
  buildTranscriptionShapeBlockers,
} from "./lib/transcription-shape.mjs";
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
import { buildExampleCasingBlockers } from "./lib/example-casing.mjs";
import { buildSemanticSceneAlignmentBlockers } from "./lib/semantic-scene-alignment.mjs";
import { buildExampleNaturalnessBlockers } from "./lib/example-naturalness.mjs";
import { requiredHashFamilies } from "./lib/qa-hash-coverage.mjs";
import { isRegionalVariantRisk } from "./lib/regional-variant-quality.mjs";
import {
  buildScriptLanguageIdentityFindings,
  formatScriptLanguageIdentityFinding,
} from "./lib/script-language-identity.mjs";
import {
  buildArticleGenderMarkerFindings,
  formatArticleGenderMarkerFinding,
} from "./lib/article-gender-marker-consistency.mjs";
import {
  buildSemanticGranularityFindings,
  formatSemanticGranularityFinding,
} from "./lib/semantic-granularity.mjs";
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
} from "./lib/target-example-scene-location-anchor.mjs";
import {
  buildIpaTranscriptionSanityFindings,
  formatIpaTranscriptionSanityFinding,
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
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
} from "./lib/transcription-source-policy.mjs";
import {
  buildTranslationSourceCoverageFindings,
  formatTranslationSourceCoverageBlocker,
} from "./lib/translation-source-coverage.mjs";

const setId = process.argv[2] ?? "home_kitchen_cookware_pilot_01";
const finalReadyContentStatuses = new Set(["approved", "generated_checked"]);

assertSafeSetId(setId);

let deckSpec = null;
try {
  deckSpec = resolveDeckSpec(setId).spec;
} catch {
  deckSpec = null;
}

const sql = `
with
set_info as (
  select *
  from content_sets
  where set_id = ${sqlString(setId)}
),
set_items as (
  select *
  from meaning_set_memberships
  where set_id = ${sqlString(setId)}
    and quality_status <> 'blocked'
),
set_meanings as (
  select mu.*
  from set_items si
  join meaning_units mu on mu.meaning_id = si.meaning_id
),
context_examples as (
  select e.*
  from meaning_examples e
  join set_items si on si.meaning_id = e.meaning_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
),
scoped_review_targets as (
  select 'content_set'::text as target_type, si.set_id::text as target_key
  from set_info si

  union
  select 'content_set', ${sqlString(setId)} || '::course_metadata'

  union
  select 'meaning_unit', sm.meaning_id
  from set_meanings sm

  union
  select 'content_set', ${sqlString(setId)} || '::' || si.meaning_id
  from set_items si

  union
  select 'meaning_example', e.example_id::text
  from context_examples e

  union
  select 'meaning_language_entry', le.meaning_id
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id

  union
  select
    'meaning_example_translation',
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
),
structured_reviews as (
  select
    qr.review_id,
    qr.target_type,
    qr.target_key,
    qr.language_code,
    qr.review_status,
    qr.reviewed_at,
    qr.reviewer,
    qr.pass_id,
    qr.batch_id,
    qr.check_family,
    qr.result_summary,
    qr.source_note,
    qr.checked_value_hash,
    qr.evidence
  from qa_reviews qr
  join scoped_review_targets srt
    on srt.target_type = qr.target_type
   and srt.target_key = qr.target_key
  where qr.check_family in (
      'metadata_review',
      'word_selection_quality',
      'entry_form',
      'transcription_policy',
      'transcription_source_backing',
      'semantic_preservation',
      'target_example_naturalness',
      'base_example_alignment',
      'example_quality',
      'manual_review'
    )
    and nullif(trim(coalesce(qr.reviewer, '')), '') is not null
    and qr.reviewed_at is not null
    and nullif(trim(coalesce(qr.check_family, '')), '') is not null
    and nullif(trim(coalesce(qr.result_summary, '')), '') is not null
    and (
      nullif(trim(coalesce(qr.pass_id, '')), '') is not null
      or nullif(trim(coalesce(qr.batch_id, '')), '') is not null
    )
),
latest_reviews_raw as (
  select distinct on (target_type, target_key, coalesce(language_code, ''), check_family)
    *
  from structured_reviews
  order by
    target_type,
    target_key,
    coalesce(language_code, ''),
    check_family,
    reviewed_at desc,
    review_id desc
),
latest_reviews as (
  select
    lr.*,
    case
      when lr.check_family in (
        'metadata_review',
        'word_selection_quality',
        'entry_form',
        'transcription_policy',
        'transcription_source_backing',
        'semantic_preservation',
        'target_example_naturalness',
        'base_example_alignment',
        'example_quality',
        'manual_review'
      )
        then qa_checked_value_hash(lr.target_type, lr.target_key, lr.language_code, lr.check_family)
      else null
    end as current_value_hash
  from latest_reviews_raw lr
),
manual_approvals as (
  select
    target_type,
    target_key,
    coalesce(language_code, '') as language_key,
    max(reviewed_at) as approved_at
  from structured_reviews
  where review_status = 'approved'
    and check_family = 'manual_review'
  group by target_type, target_key, coalesce(language_code, '')
),
latest_pass_evidence as (
  select
    *,
    (
      check_family = 'word_selection_quality'
      and pass_id like 'word_selection_quality_%'
    ) as is_word_selection_quality,
    (
      check_family = 'semantic_preservation'
      and pass_id like 'semantic_preservation_%'
    ) as is_semantic_preservation,
    (
      check_family = 'target_example_naturalness'
      and pass_id like 'target_example_naturalness_%'
    ) as is_target_example_naturalness,
    (
      check_family = 'entry_form'
      and pass_id like 'entry_form_%'
    ) as is_entry_form,
    (
      check_family = 'transcription_policy'
      and pass_id like 'transcription_policy_%'
    ) as is_transcription_policy,
    (
      check_family = 'transcription_source_backing'
      and pass_id like 'transcription_source_backing_%'
    ) as is_transcription_source_backing,
    (
      check_family = 'base_example_alignment'
      and pass_id like 'base_example_alignment_%'
    ) as is_base_example_alignment,
    (
      check_family = 'example_quality'
      and pass_id like 'example_quality_%'
    ) as is_example_quality,
    (
      check_family in (
        'metadata_review',
        'word_selection_quality',
        'entry_form',
        'transcription_policy',
        'transcription_source_backing',
        'semantic_preservation',
        'target_example_naturalness',
        'base_example_alignment',
        'example_quality',
        'manual_review'
      )
    ) as is_hash_scoped,
    (
      check_family not in (
        'metadata_review',
        'word_selection_quality',
        'entry_form',
        'transcription_policy',
        'transcription_source_backing',
        'semantic_preservation',
        'target_example_naturalness',
        'base_example_alignment',
        'example_quality',
        'manual_review'
      )
      or (
        nullif(trim(coalesce(checked_value_hash, '')), '') is not null
        and nullif(trim(coalesce(current_value_hash, '')), '') is not null
        and checked_value_hash = current_value_hash
      )
    ) as checked_value_hash_matches
  from latest_reviews
  where review_status in ('approved', 'generated_checked')
    and not (
      lower(coalesce(reviewer, '')) like '%dry-run%'
      or lower(coalesce(reviewer, '')) like '%dry_run%'
      or lower(coalesce(reviewer, '')) like '%synthetic%'
      or lower(coalesce(source_note, '')) like '%dry-run%'
      or lower(coalesce(source_note, '')) like '%dry_run%'
      or lower(coalesce(source_note, '')) like '%synthetic%'
      or coalesce(evidence, '{}'::jsonb) @> '{"dry_run": true}'::jsonb
      or coalesce(evidence, '{}'::jsonb) @> '{"synthetic": true}'::jsonb
      or coalesce(evidence, '{}'::jsonb) @> '{"runner_evidence": {"dry_run": true}}'::jsonb
      or coalesce(evidence, '{}'::jsonb) @> '{"runner_evidence": {"synthetic": true}}'::jsonb
    )
    and (
      check_family not in (
        'metadata_review',
        'word_selection_quality',
        'entry_form',
        'transcription_policy',
        'transcription_source_backing',
        'semantic_preservation',
        'target_example_naturalness',
        'base_example_alignment',
        'example_quality',
        'manual_review'
      )
      or (
        nullif(trim(coalesce(checked_value_hash, '')), '') is not null
        and nullif(trim(coalesce(current_value_hash, '')), '') is not null
        and checked_value_hash = current_value_hash
      )
    )
),
checked_value_hash_mismatch as (
  select
    target_type,
    target_key,
    language_code,
    'checked_value_hash missing/stale for ' || check_family as reason
  from latest_reviews
  where review_status in ('approved', 'generated_checked')
    and check_family in (
      'metadata_review',
      'word_selection_quality',
        'entry_form',
        'transcription_policy',
        'transcription_source_backing',
        'semantic_preservation',
      'target_example_naturalness',
      'base_example_alignment',
      'example_quality',
      'manual_review'
    )
    and not (
      target_type = 'meaning_example'
      and check_family in ('base_example_alignment', 'example_quality')
      and coalesce(language_code, '') <> 'EN'
    )
    and (
      nullif(trim(coalesce(checked_value_hash, '')), '') is null
      or nullif(trim(coalesce(current_value_hash, '')), '') is null
      or checked_value_hash <> current_value_hash
    )
    and exists (
      select 1
      from scoped_review_targets srt
      where srt.target_type = latest_reviews.target_type
        and srt.target_key = latest_reviews.target_key
    )
),
missing_general as (
  select 'content_set' as target_type, si.set_id as target_key, null::text as language_code, 'content_set quality_status' as reason
  from set_info si
  where si.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'content_set'
        and qe.target_key = si.set_id
        and qe.language_code is null
    )

  union all
  select 'content_set', ${sqlString(setId)} || '::course_metadata', csl.language_code, 'Course Metadata quality_status'
  from content_set_localizations csl
  join languages l on l.code = csl.language_code
  where csl.set_id = ${sqlString(setId)}
    and l.is_active
    and csl.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'content_set'
        and qe.target_key = ${sqlString(setId)} || '::course_metadata'
        and qe.language_code = csl.language_code
    )

  union all
  select 'meaning_unit', sm.meaning_id, null::text, 'meaning quality_status'
  from set_meanings sm
  where sm.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_unit'
        and qe.target_key = sm.meaning_id
        and qe.language_code is null
    )

  union all
  select 'content_set', ${sqlString(setId)} || '::' || si.meaning_id, null::text, 'membership quality_status'
  from set_items si
  where si.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'content_set'
        and qe.target_key = ${sqlString(setId)} || '::' || si.meaning_id
        and coalesce(qe.language_code, 'EN') = 'EN'
    )

  union all
  select 'meaning_example', e.example_id::text, null::text, 'context example quality_status'
  from context_examples e
  where e.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_example'
        and qe.target_key = e.example_id::text
        and coalesce(qe.language_code, 'EN') = 'EN'
    )

  union all
  select 'meaning_language_entry', le.meaning_id, le.language_code, 'language entry/pronunciation status'
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id
  where (le.quality_status = 'generated_checked' or le.pronunciation_status = 'generated_checked')
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_language_entry'
        and qe.target_key = le.meaning_id
        and qe.language_code = le.language_code
    )

  union all
  select
    'meaning_example_translation',
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text,
    et.language_code,
    'example translation quality_status'
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
  where et.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_example_translation'
        and qe.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        and qe.language_code = et.language_code
    )
),
missing_word_selection_quality as (
  select
    'content_set' as target_type,
    ${sqlString(setId)} || '::' || si.meaning_id as target_key,
    'EN'::text as language_code,
    'word_selection_quality evidence' as reason
  from set_items si
  where si.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'content_set'
        and qe.target_key = ${sqlString(setId)} || '::' || si.meaning_id
        and coalesce(qe.language_code, 'EN') = 'EN'
        and qe.is_word_selection_quality
    )
),
missing_base_example_alignment as (
  select 'meaning_example' as target_type, e.example_id::text as target_key, 'EN'::text as language_code, 'base_example_alignment evidence' as reason
  from context_examples e
  where e.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_example'
        and qe.target_key = e.example_id::text
        and qe.is_base_example_alignment
        and coalesce(qe.language_code, 'EN') = 'EN'
    )
),
missing_example_quality as (
  select 'meaning_example' as target_type, e.example_id::text as target_key, 'EN'::text as language_code, 'example_quality evidence' as reason
  from context_examples e
  where e.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_example'
        and qe.target_key = e.example_id::text
        and qe.is_example_quality
        and coalesce(qe.language_code, 'EN') = 'EN'
    )
),
missing_entry_form as (
  select 'meaning_language_entry' as target_type, le.meaning_id as target_key, le.language_code, 'entry_form evidence' as reason
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id
  where le.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_language_entry'
        and qe.target_key = le.meaning_id
        and qe.language_code = le.language_code
        and qe.is_entry_form
    )
),
missing_transcription_policy as (
  select 'meaning_language_entry' as target_type, le.meaning_id as target_key, le.language_code, 'transcription_policy evidence' as reason
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id
  where le.pronunciation_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_language_entry'
        and qe.target_key = le.meaning_id
        and qe.language_code = le.language_code
        and qe.is_transcription_policy
    )
),
missing_transcription_source_backing as (
  select 'meaning_language_entry' as target_type, le.meaning_id as target_key, le.language_code, 'transcription_source_backing evidence' as reason
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id
  where le.pronunciation_status in ('approved', 'generated_checked', 'not_applicable')
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_language_entry'
        and qe.target_key = le.meaning_id
        and qe.language_code = le.language_code
        and qe.is_transcription_source_backing
    )
),
missing_semantic as (
  select
    'meaning_example_translation' as target_type,
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text as target_key,
    et.language_code,
    'semantic preservation evidence' as reason
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
  where et.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_example_translation'
        and qe.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        and qe.language_code = et.language_code
        and qe.is_semantic_preservation
    )
),
missing_target_example_naturalness as (
  select
    'meaning_example_translation' as target_type,
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text as target_key,
    et.language_code,
    'target example naturalness evidence' as reason
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
  where et.quality_status = 'generated_checked'
    and not exists (
      select 1 from latest_pass_evidence qe
      where qe.target_type = 'meaning_example_translation'
        and qe.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        and qe.language_code = et.language_code
        and qe.is_target_example_naturalness
    )
),
word_selection_status_drift as (
  select
    'content_set' as target_type,
    qe.target_key,
    'EN'::text as language_code,
    'latest word_selection_quality pass is not reflected in meaning_set_memberships.quality_status=' || si.quality_status as reason
  from latest_pass_evidence qe
  join set_items si
    on qe.target_key = ${sqlString(setId)} || '::' || si.meaning_id
  where qe.target_type = 'content_set'
    and qe.is_word_selection_quality
    and coalesce(qe.language_code, 'EN') = 'EN'
    and si.quality_status not in ('approved', 'generated_checked')
),
entry_status_drift as (
  select
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'latest entry_form pass is not reflected in meaning_language_entries.quality_status=' || le.quality_status as reason
  from latest_pass_evidence qe
  join meaning_language_entries le
    on le.meaning_id = qe.target_key
   and le.language_code = qe.language_code
  join set_items si on si.meaning_id = le.meaning_id
  where qe.target_type = 'meaning_language_entry'
    and qe.is_entry_form
    and le.quality_status not in ('approved', 'generated_checked')
),
transcription_status_drift as (
  select
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'latest transcription_policy pass expects pronunciation_status=' ||
      case
        when (l.transcription_kind = 'native_orthography' or l.transcription_format ilike 'native orthography%')
          and coalesce(le.transcription, '') = coalesce(le.word_with_article_or_marker, le.native_word, '')
          then 'not_applicable'
        else 'generated_checked'
      end ||
      ', current=' || le.pronunciation_status as reason
  from latest_pass_evidence qe
  join meaning_language_entries le
    on le.meaning_id = qe.target_key
   and le.language_code = qe.language_code
  join languages l on l.code = le.language_code
  join set_items si on si.meaning_id = le.meaning_id
  where qe.target_type = 'meaning_language_entry'
    and qe.is_transcription_policy
    and le.pronunciation_status <> 'approved'
    and le.pronunciation_status <> (
      case
        when (l.transcription_kind = 'native_orthography' or l.transcription_format ilike 'native orthography%')
          and coalesce(le.transcription, '') = coalesce(le.word_with_article_or_marker, le.native_word, '')
          then 'not_applicable'
        else 'generated_checked'
      end
    )
),
semantic_status_drift as (
  select
    'meaning_example_translation' as target_type,
    qe.target_key,
    et.language_code,
    'latest semantic_preservation pass is not reflected in meaning_example_translations.quality_status=' || et.quality_status as reason
  from latest_pass_evidence qe
  join context_examples e
    on qe.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = qe.language_code
  where qe.target_type = 'meaning_example_translation'
    and qe.is_semantic_preservation
    and et.quality_status not in ('approved', 'generated_checked')
),
target_example_naturalness_status_drift as (
  select
    'meaning_example_translation' as target_type,
    qe.target_key,
    et.language_code,
    'latest target_example_naturalness pass is not reflected in meaning_example_translations.quality_status=' || et.quality_status as reason
  from latest_pass_evidence qe
  join context_examples e
    on qe.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = qe.language_code
  where qe.target_type = 'meaning_example_translation'
    and qe.is_target_example_naturalness
    and et.quality_status not in ('approved', 'generated_checked')
),
base_example_status_drift as (
  select
    'meaning_example' as target_type,
    e.example_id::text as target_key,
    'EN'::text as language_code,
    'latest base_example_alignment pass is not reflected in meaning_examples.quality_status=' || e.quality_status as reason
  from latest_pass_evidence qe
  join context_examples e
    on e.example_id::text = qe.target_key
  where qe.target_type = 'meaning_example'
    and qe.is_base_example_alignment
    and coalesce(qe.language_code, 'EN') = 'EN'
    and e.quality_status not in ('approved', 'generated_checked')
),
example_quality_status_drift as (
  select
    'meaning_example' as target_type,
    e.example_id::text as target_key,
    'EN'::text as language_code,
    'latest example_quality pass is not reflected in meaning_examples.quality_status=' || e.quality_status as reason
  from latest_pass_evidence qe
  join context_examples e
    on e.example_id::text = qe.target_key
  where qe.target_type = 'meaning_example'
    and qe.is_example_quality
    and coalesce(qe.language_code, 'EN') = 'EN'
    and e.quality_status not in ('approved', 'generated_checked')
),
latest_negative_word_selection as (
  select
    'content_set' as target_type,
    ${sqlString(setId)} || '::' || si.meaning_id as target_key,
    'EN'::text as language_code,
    'latest word_selection_quality review_status=' || lr.review_status || ' blocks current membership quality_status=' || si.quality_status as reason
  from latest_reviews lr
  join set_items si
    on lr.target_key = ${sqlString(setId)} || '::' || si.meaning_id
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'content_set'
    and lr.check_family = 'word_selection_quality'
    and coalesce(lr.language_code, 'EN') = 'EN'
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and si.quality_status in ('approved', 'generated_checked')
),
latest_negative_entry as (
  select
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'latest entry_form review_status=' || lr.review_status || ' blocks current quality_status=' || le.quality_status as reason
  from latest_reviews lr
  join meaning_language_entries le
    on le.meaning_id = lr.target_key
   and le.language_code = lr.language_code
  join set_items si on si.meaning_id = le.meaning_id
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_language_entry'
    and lr.check_family = 'entry_form'
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and le.quality_status in ('approved', 'generated_checked')
),
latest_negative_transcription as (
  select
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'latest ' || lr.check_family || ' review_status=' || lr.review_status || ' blocks current pronunciation_status=' || le.pronunciation_status as reason
  from latest_reviews lr
  join meaning_language_entries le
    on le.meaning_id = lr.target_key
   and le.language_code = lr.language_code
  join set_items si on si.meaning_id = le.meaning_id
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_language_entry'
    and lr.check_family in ('transcription_policy', 'transcription_source_backing')
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and le.pronunciation_status in ('approved', 'generated_checked', 'not_applicable')
),
latest_negative_semantic as (
  select
    'meaning_example_translation' as target_type,
    lr.target_key,
    et.language_code,
    'latest semantic_preservation review_status=' || lr.review_status || ' blocks current example quality_status=' || et.quality_status as reason
  from latest_reviews lr
  join context_examples e
    on lr.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = lr.language_code
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_example_translation'
    and lr.check_family = 'semantic_preservation'
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and et.quality_status in ('approved', 'generated_checked')
),
latest_negative_target_example_naturalness as (
  select
    'meaning_example_translation' as target_type,
    lr.target_key,
    et.language_code,
    'latest target_example_naturalness review_status=' || lr.review_status || ' blocks current example quality_status=' || et.quality_status as reason
  from latest_reviews lr
  join context_examples e
    on lr.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = lr.language_code
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_example_translation'
    and lr.check_family = 'target_example_naturalness'
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and et.quality_status in ('approved', 'generated_checked')
),
latest_negative_base_example as (
  select
    'meaning_example' as target_type,
    e.example_id::text as target_key,
    'EN'::text as language_code,
    'latest base_example_alignment review_status=' || lr.review_status || ' blocks current context example quality_status=' || e.quality_status as reason
  from latest_reviews lr
  join context_examples e
    on e.example_id::text = lr.target_key
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_example'
    and lr.check_family = 'base_example_alignment'
    and coalesce(lr.language_code, 'EN') = 'EN'
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and e.quality_status in ('approved', 'generated_checked')
),
latest_negative_example_quality as (
  select
    'meaning_example' as target_type,
    e.example_id::text as target_key,
    'EN'::text as language_code,
    'latest example_quality review_status=' || lr.review_status || ' blocks current context example quality_status=' || e.quality_status as reason
  from latest_reviews lr
  join context_examples e
    on e.example_id::text = lr.target_key
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_example'
    and lr.check_family = 'example_quality'
    and coalesce(lr.language_code, 'EN') = 'EN'
    and lr.review_status not in ('approved', 'generated_checked')
    and not (ma.approved_at is not null and ma.approved_at > lr.reviewed_at)
    and e.quality_status in ('approved', 'generated_checked')
),
result_rows as (
  select 'general' as blocker_type, * from missing_general
  union all
  select 'word_selection_quality' as blocker_type, * from missing_word_selection_quality
  union all
  select 'base_example_alignment' as blocker_type, * from missing_base_example_alignment
  union all
  select 'example_quality' as blocker_type, * from missing_example_quality
  union all
  select 'entry_form' as blocker_type, * from missing_entry_form
  union all
  select 'transcription_policy' as blocker_type, * from missing_transcription_policy
  union all
  select 'transcription_source_backing' as blocker_type, * from missing_transcription_source_backing
  union all
  select 'semantic' as blocker_type, * from missing_semantic
  union all
  select 'target_example_naturalness' as blocker_type, * from missing_target_example_naturalness
  union all
  select 'status_drift' as blocker_type, * from word_selection_status_drift
  union all
  select 'status_drift' as blocker_type, * from entry_status_drift
  union all
  select 'status_drift' as blocker_type, * from transcription_status_drift
  union all
  select 'status_drift' as blocker_type, * from semantic_status_drift
  union all
  select 'status_drift' as blocker_type, * from target_example_naturalness_status_drift
  union all
  select 'status_drift' as blocker_type, * from base_example_status_drift
  union all
  select 'status_drift' as blocker_type, * from example_quality_status_drift
  union all
  select 'checked_value_hash' as blocker_type, * from checked_value_hash_mismatch
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_word_selection
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_entry
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_transcription
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_semantic
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_target_example_naturalness
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_base_example
  union all
  select 'latest_review_blocks_status' as blocker_type, * from latest_negative_example_quality
)
select coalesce(json_agg(row_to_json(ordered_rows)), '[]'::json)
from (
  select *
  from result_rows
  order by blocker_type, target_type, target_key, language_code
) ordered_rows;
`;

const evidenceBlockers = await psqlJson(sql);
const transcriptionRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    mu.meaning_id,
    mu.canonical_english,
    mu.part_of_speech,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order, le.language_code
) rows;
`);
const transcriptionShapeBlockers = buildTranscriptionShapeBlockers(transcriptionRows).map((blocker) => ({
  blocker_type: "transcription_shape",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: `${blocker.issue}; display="${blocker.display_word}"; transcription="${blocker.transcription}"`,
}));
const ipaTranscriptionSanityBlockers = buildIpaTranscriptionSanityFindings(
  transcriptionRows.map((row) => ({ ...row, set_id: setId }))
).blockers.map((blocker) => ({
  blocker_type: "ipa_transcription_sanity",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatIpaTranscriptionSanityFinding(blocker),
}));
const referenceManifest = await loadReferenceSourcesManifest();
const referenceManifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const referenceManifestSha256 = await referenceSourcesManifestSha256();
const transcriptionSourceBackingBlockers = (
  await buildTranscriptionSourceBackingFindings(
    transcriptionRows.map((row) => ({ ...row, set_id: setId })),
    {
      manifestSourceIds: referenceManifestSourceIds,
      manifestSha256: referenceManifestSha256,
    }
  )
).blockers.map((blocker) => ({
  blocker_type: "transcription_source_backing",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatTranscriptionSourceBackingBlocker(blocker),
}));
const crossLanguageTranscriptionBlockers = buildCrossLanguageTranscriptionFindings(
  transcriptionRows.map((row) => ({ ...row, set_id: setId }))
).blockers.map((blocker) => ({
  blocker_type: "transcription_cross_language_fallback",
  target_type: "content_set",
  target_key: blocker.set_id,
  language_code: null,
  reason: formatCrossLanguageBlocker(blocker),
}));
const intraLanguageTranscriptionBlockers = buildIntraLanguageTranscriptionCollapseFindings(
  transcriptionRows.map((row) => ({ ...row, set_id: setId }))
).map((blocker) => ({
  blocker_type: "transcription_intra_language_collapse",
  target_type: "content_set",
  target_key: blocker.set_id,
  language_code: blocker.language_code,
  reason:
    `same normalized transcription "${blocker.normalized_transcription}" appears on ` +
    `${blocker.row_count}/${blocker.total_rows} active rows`,
}));
const entryCrossLanguageBlockers = buildEntryCrossLanguageFindings(
  transcriptionRows.map((row) => ({ ...row, set_id: setId }))
).blockers.map((blocker) => ({
  blocker_type: "entry_cross_language_fallback",
  target_type: "content_set",
  target_key: blocker.set_id ?? setId,
  language_code: null,
  reason: formatEntryCrossLanguageBlocker(blocker),
}));
const entrySourceBackedTranslationBlockers = (
  await buildEntrySourceBackedTranslationFindings(
    transcriptionRows.map((row) => ({ ...row, set_id: setId })),
    {
      manifestSourceIds: referenceManifestSourceIds,
      enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
    }
  )
).blockers.map((blocker) => ({
  blocker_type: "entry_source_backed_translation",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatEntrySourceBackedTranslationFinding(blocker),
}));
const translationSourceCoverageBlockers = (
  await buildTranslationSourceCoverageFindings(transcriptionRows.map((row) => ({ ...row, set_id: setId })), {
    manifestSourceIds: referenceManifestSourceIds,
  })
).blockers.map((blocker) => ({
  blocker_type: "translation_source_coverage",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatTranslationSourceCoverageBlocker(blocker),
}));
const exampleCasingRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    mu.meaning_id,
    mu.canonical_english,
    mu.part_of_speech,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
    et.language_code,
    et.quality_status as example_quality_status,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.native_word,
    le.word_with_article_or_marker,
    loc_entry.location_canonical_english,
    loc_entry.location_display_word,
    loc_entry.location_native_word,
    et.example_text,
    sp.evidence as semantic_preservation_evidence,
    nge.evidence as number_example_grammar_evidence
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  left join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
   and le.language_code = et.language_code
  left join lateral (
    select lower(regexp_replace(
      regexp_replace(
        regexp_replace(e.semantic_scene->>'state_or_location',
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
    )) as location_canonical_english
  ) loc on true
  left join lateral (
    select
      loc.location_canonical_english,
      coalesce(loc_le.word_with_article_or_marker, loc_le.native_word) as location_display_word,
      loc_le.native_word as location_native_word
    from meaning_units loc_mu
    join meaning_language_entries loc_le
      on loc_le.meaning_id = loc_mu.meaning_id
     and loc_le.language_code = et.language_code
    where lower(regexp_replace(loc_mu.canonical_english, '[^a-z0-9 ]+', ' ', 'g')) = loc.location_canonical_english
      and loc.location_canonical_english not in ('wall', 'window', 'door', 'floor', 'room', 'bathroom', 'kitchen')
    order by loc_mu.created_at desc nulls last, loc_mu.meaning_id
    limit 1
  ) loc_entry on true
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = msm.set_id || '::' || msm.meaning_id || '::' || e.example_id::text
      and qr.language_code = et.language_code
      and qr.check_family = 'semantic_preservation'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'semantic_preservation_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) sp on true
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = msm.set_id || '::' || msm.meaning_id || '::' || e.example_id::text
      and qr.language_code = et.language_code
      and qr.check_family = 'number_example_grammar'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'number_example_grammar_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) nge on true
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order, et.language_code
) rows;
`, 1024 * 1024 * 160);
const exampleCasingBlockers = buildExampleCasingBlockers(exampleCasingRows).map((blocker) => ({
  blocker_type: "example_casing_shape",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: `${blocker.issue}; display="${blocker.display_word}"; example="${blocker.example_text}"`,
}));
const exampleNaturalnessBlockers = buildExampleNaturalnessBlockers(exampleCasingRows).map((blocker) => ({
  blocker_type: "example_naturalness_shape",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: `${blocker.issue}; example="${blocker.example_text}"`,
}));
const targetSemanticSceneAlignmentBlockers = buildTargetSemanticSceneAlignmentFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "target_semantic_scene_alignment",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatTargetSemanticSceneAlignmentFinding(blocker),
}));
const targetExampleSceneLocationAnchorBlockers = buildTargetExampleSceneLocationAnchorFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "target_example_scene_location_anchor",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatTargetExampleSceneLocationAnchorFinding(blocker),
}));
const numberExampleGrammarBlockers = buildNumberExampleGrammarFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "number_example_grammar",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatNumberExampleGrammarFinding(blocker),
}));
const exampleSurfaceGrammarBlockers = buildExampleSurfaceGrammarFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "example_surface_grammar",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatExampleSurfaceGrammarFinding(blocker),
}));
const deckProfileContext = resolveDeckProfileContext({ spec: deckSpec, rows: exampleCasingRows });
const deckProfileQualityBlockers = buildDeckProfileQualityFindings(exampleCasingRows, deckProfileContext).blockers.map((blocker) => ({
  blocker_type: "deck_profile_quality",
  target_type: blocker.language_code ? "meaning_example_translation" : "content_set",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id ?? setId,
  language_code: blocker.language_code,
  reason: formatDeckProfileFinding(blocker),
}));
const meaningContrastBlockers = buildMeaningContrastFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "meaning_contrast",
  target_type: "content_set",
  target_key: blocker.set_id,
  language_code: blocker.language_code,
  reason: formatMeaningContrastFinding(blocker),
}));
const regionalRiskRows = exampleCasingRows
  .filter((row) => isRegionalVariantRisk(row))
  .map((row) => ({
    ...row,
    target_key: `${row.set_id}::${row.meaning_id}::${row.example_id}`,
  }));
const regionalTargetKeys = regionalRiskRows.map((row) => row.target_key);
const regionalReviews =
  regionalTargetKeys.length > 0
    ? await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select distinct on (target_type, target_key, coalesce(language_code, ''), check_family)
    target_type,
    target_key,
    language_code,
    review_status,
    pass_id,
    checked_value_hash,
    qa_checked_value_hash(target_type, target_key, language_code, check_family) as current_value_hash
  from qa_reviews
  where check_family = 'regional_variant_quality'
    and target_type = 'meaning_example_translation'
    and target_key in (${regionalTargetKeys.map(sqlString).join(", ")})
  order by target_type, target_key, coalesce(language_code, ''), check_family, reviewed_at desc, review_id desc
) rows;
`)
    : [];
const regionalReviewByKey = new Map(
  regionalReviews.map((review) => [`${review.target_key}::${review.language_code}`, review])
);
const regionalVariantBlockers = [];
for (const row of regionalRiskRows) {
  if (!finalReadyContentStatuses.has(row.example_quality_status)) continue;
  const review = regionalReviewByKey.get(`${row.target_key}::${row.language_code}`);
  if (!review) {
    regionalVariantBlockers.push({
      blocker_type: "regional_variant_quality",
      target_type: "meaning_example_translation",
      target_key: row.target_key,
      language_code: row.language_code,
      reason: "missing regional_variant_quality evidence",
    });
    continue;
  }
  if (
    !finalReadyContentStatuses.has(review.review_status) ||
    typeof review.pass_id !== "string" ||
    !review.pass_id.startsWith("regional_variant_quality_")
  ) {
    regionalVariantBlockers.push({
      blocker_type: "regional_variant_quality",
      target_type: "meaning_example_translation",
      target_key: row.target_key,
      language_code: row.language_code,
      reason: `latest regional_variant_quality review_status=${review.review_status ?? "missing"} blocks final-ready row`,
    });
  } else if (!review.checked_value_hash || review.checked_value_hash !== review.current_value_hash) {
    regionalVariantBlockers.push({
      blocker_type: "regional_variant_quality",
      target_type: "meaning_example_translation",
      target_key: row.target_key,
      language_code: row.language_code,
      reason: "regional_variant_quality checked_value_hash missing/stale",
    });
  }
}

const v2EvidenceBlockers = await psqlJson(`
with
set_items as (
  select *
  from meaning_set_memberships
  where set_id = ${sqlString(setId)}
    and quality_status <> 'blocked'
),
context_examples as (
  select e.*
  from meaning_examples e
  join set_items si on si.meaning_id = e.meaning_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
),
scoped_review_targets as (
  select
    'meaning_language_entry'::text as target_type,
    le.meaning_id as target_key,
    le.language_code
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id

  union all

  select
    'meaning_example_translation',
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text,
    et.language_code
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
),
structured_reviews as (
  select
    qr.review_id,
    qr.target_type,
    qr.target_key,
    qr.language_code,
    qr.review_status,
    qr.reviewed_at,
    qr.pass_id,
    qr.batch_id,
    qr.check_family,
    qr.checked_value_hash
  from qa_reviews qr
  join scoped_review_targets srt
    on srt.target_type = qr.target_type
   and srt.target_key = qr.target_key
   and srt.language_code = qr.language_code
  where qr.check_family in (
      'entry_form_register',
      'semantic_granularity',
      'article_gender_marker_consistency',
      'target_example_lexical_anchor'
    )
    and nullif(trim(coalesce(qr.reviewer, '')), '') is not null
    and qr.reviewed_at is not null
    and nullif(trim(coalesce(qr.result_summary, '')), '') is not null
    and (
      nullif(trim(coalesce(qr.pass_id, '')), '') is not null
      or nullif(trim(coalesce(qr.batch_id, '')), '') is not null
    )
),
latest_reviews_raw as (
  select distinct on (target_type, target_key, coalesce(language_code, ''), check_family)
    *
  from structured_reviews
  order by target_type, target_key, coalesce(language_code, ''), check_family, reviewed_at desc, review_id desc
),
latest_reviews as (
  select
    lr.*,
    qa_checked_value_hash(lr.target_type, lr.target_key, lr.language_code, lr.check_family) as current_value_hash
  from latest_reviews_raw lr
),
latest_pass as (
  select *
  from latest_reviews
  where review_status in ('approved', 'generated_checked')
    and pass_id like check_family || '_%'
    and nullif(trim(coalesce(checked_value_hash, '')), '') is not null
    and nullif(trim(coalesce(current_value_hash, '')), '') is not null
    and checked_value_hash = current_value_hash
),
required_entry_checks(check_family) as (
  values
    ('entry_form_register'),
    ('semantic_granularity'),
    ('article_gender_marker_consistency')
),
required_example_checks(check_family) as (
  values ('target_example_lexical_anchor')
),
missing_entry as (
  select
    req.check_family as blocker_type,
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    req.check_family || ' evidence' as reason
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id
  cross join required_entry_checks req
  where le.quality_status = 'generated_checked'
    and not exists (
      select 1
      from latest_pass lp
      where lp.target_type = 'meaning_language_entry'
        and lp.target_key = le.meaning_id
        and lp.language_code = le.language_code
        and lp.check_family = req.check_family
    )
),
missing_example as (
  select
    req.check_family as blocker_type,
    'meaning_example_translation' as target_type,
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text as target_key,
    et.language_code,
    req.check_family || ' evidence' as reason
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
  cross join required_example_checks req
  where et.quality_status = 'generated_checked'
    and not exists (
      select 1
      from latest_pass lp
      where lp.target_type = 'meaning_example_translation'
        and lp.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        and lp.language_code = et.language_code
        and lp.check_family = req.check_family
    )
),
latest_negative_entry as (
  select
    lr.check_family as blocker_type,
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'latest ' || lr.check_family || ' review_status=' || lr.review_status || ' blocks current quality_status=' || le.quality_status as reason
  from latest_reviews lr
  join meaning_language_entries le
    on le.meaning_id = lr.target_key
   and le.language_code = lr.language_code
  join set_items si on si.meaning_id = le.meaning_id
  where lr.target_type = 'meaning_language_entry'
    and lr.review_status not in ('approved', 'generated_checked')
    and le.quality_status in ('approved', 'generated_checked')
),
latest_negative_example as (
  select
    lr.check_family as blocker_type,
    'meaning_example_translation' as target_type,
    lr.target_key,
    et.language_code,
    'latest ' || lr.check_family || ' review_status=' || lr.review_status || ' blocks current quality_status=' || et.quality_status as reason
  from latest_reviews lr
  join context_examples e
    on lr.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = lr.language_code
  where lr.target_type = 'meaning_example_translation'
    and lr.review_status not in ('approved', 'generated_checked')
    and et.quality_status in ('approved', 'generated_checked')
),
stale_reviews as (
  select
    lr.check_family as blocker_type,
    lr.target_type,
    lr.target_key,
    lr.language_code,
    lr.check_family || ' checked_value_hash missing/stale' as reason
  from latest_reviews lr
  where lr.review_status in ('approved', 'generated_checked')
    and (
      (
        lr.target_type = 'meaning_language_entry'
        and exists (
          select 1
          from set_items si
          where si.meaning_id = lr.target_key
        )
      )
      or (
        lr.target_type = 'meaning_example_translation'
        and exists (
          select 1
          from context_examples e
          where lr.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        )
      )
    )
    and (
      nullif(trim(coalesce(lr.checked_value_hash, '')), '') is null
      or nullif(trim(coalesce(lr.current_value_hash, '')), '') is null
      or lr.checked_value_hash <> lr.current_value_hash
    )
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select * from missing_entry
  union all
  select * from missing_example
  union all
  select * from latest_negative_entry
  union all
  select * from latest_negative_example
  union all
  select * from stale_reviews
  order by blocker_type, target_type, target_key, language_code
) rows;
`);
const v3EvidenceBlockers = await psqlJson(`
with
set_items as (
  select *
  from meaning_set_memberships
  where set_id = ${sqlString(setId)}
    and quality_status <> 'blocked'
),
context_examples as (
  select e.*
  from meaning_examples e
  join set_items si on si.meaning_id = e.meaning_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
),
scoped_review_targets as (
  select
    'meaning_language_entry'::text as target_type,
    le.meaning_id as target_key,
    le.language_code
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id

  union all

  select
    'meaning_example_translation',
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text,
    et.language_code
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
),
structured_reviews as (
  select
    qr.review_id,
    qr.target_type,
    qr.target_key,
    qr.language_code,
    qr.review_status,
    qr.reviewed_at,
    qr.pass_id,
    qr.batch_id,
    qr.check_family,
    qr.checked_value_hash
  from qa_reviews qr
  join scoped_review_targets srt
    on srt.target_type = qr.target_type
   and srt.target_key = qr.target_key
   and srt.language_code = qr.language_code
  where qr.check_family in (
      'pronunciation_accuracy',
      'target_example_pedagogical_quality'
    )
    and nullif(trim(coalesce(qr.reviewer, '')), '') is not null
    and qr.reviewed_at is not null
    and nullif(trim(coalesce(qr.result_summary, '')), '') is not null
    and (
      nullif(trim(coalesce(qr.pass_id, '')), '') is not null
      or nullif(trim(coalesce(qr.batch_id, '')), '') is not null
    )
),
latest_reviews_raw as (
  select distinct on (target_type, target_key, coalesce(language_code, ''), check_family)
    *
  from structured_reviews
  order by target_type, target_key, coalesce(language_code, ''), check_family, reviewed_at desc, review_id desc
),
latest_reviews as (
  select
    lr.*,
    qa_checked_value_hash(lr.target_type, lr.target_key, lr.language_code, lr.check_family) as current_value_hash
  from latest_reviews_raw lr
),
latest_pass as (
  select *
  from latest_reviews
  where review_status in ('approved', 'generated_checked')
    and pass_id like check_family || '_%'
    and nullif(trim(coalesce(checked_value_hash, '')), '') is not null
    and nullif(trim(coalesce(current_value_hash, '')), '') is not null
    and checked_value_hash = current_value_hash
),
missing_pronunciation as (
  select
    'pronunciation_accuracy' as blocker_type,
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'pronunciation_accuracy evidence' as reason
  from meaning_language_entries le
  join set_items si on si.meaning_id = le.meaning_id
  join languages l on l.code = le.language_code
  where le.pronunciation_status = 'generated_checked'
    and l.transcription_format = 'IPA'
    and not exists (
      select 1
      from latest_pass lp
      where lp.target_type = 'meaning_language_entry'
        and lp.target_key = le.meaning_id
        and lp.language_code = le.language_code
        and lp.check_family = 'pronunciation_accuracy'
    )
),
missing_example as (
  select
    'target_example_pedagogical_quality' as blocker_type,
    'meaning_example_translation' as target_type,
    ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text as target_key,
    et.language_code,
    'target_example_pedagogical_quality evidence' as reason
  from context_examples e
  join meaning_example_translations et on et.example_id = e.example_id
  where et.quality_status = 'generated_checked'
    and not exists (
      select 1
      from latest_pass lp
      where lp.target_type = 'meaning_example_translation'
        and lp.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        and lp.language_code = et.language_code
        and lp.check_family = 'target_example_pedagogical_quality'
    )
),
latest_negative_pronunciation as (
  select
    lr.check_family as blocker_type,
    'meaning_language_entry' as target_type,
    le.meaning_id as target_key,
    le.language_code,
    'latest ' || lr.check_family || ' review_status=' || lr.review_status || ' blocks current pronunciation_status=' || le.pronunciation_status as reason
  from latest_reviews lr
  join meaning_language_entries le
    on le.meaning_id = lr.target_key
   and le.language_code = lr.language_code
  join set_items si on si.meaning_id = le.meaning_id
  where lr.target_type = 'meaning_language_entry'
    and lr.check_family = 'pronunciation_accuracy'
    and lr.review_status not in ('approved', 'generated_checked')
    and le.pronunciation_status in ('approved', 'generated_checked')
),
latest_negative_example as (
  select
    lr.check_family as blocker_type,
    'meaning_example_translation' as target_type,
    lr.target_key,
    et.language_code,
    'latest ' || lr.check_family || ' review_status=' || lr.review_status || ' blocks current quality_status=' || et.quality_status as reason
  from latest_reviews lr
  join context_examples e
    on lr.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = lr.language_code
  where lr.target_type = 'meaning_example_translation'
    and lr.check_family = 'target_example_pedagogical_quality'
    and lr.review_status not in ('approved', 'generated_checked')
    and et.quality_status in ('approved', 'generated_checked')
),
stale_reviews as (
  select
    lr.check_family as blocker_type,
    lr.target_type,
    lr.target_key,
    lr.language_code,
    lr.check_family || ' checked_value_hash missing/stale' as reason
  from latest_reviews lr
  where lr.review_status in ('approved', 'generated_checked')
    and (
      (
        lr.target_type = 'meaning_language_entry'
        and exists (
          select 1
          from set_items si
          where si.meaning_id = lr.target_key
        )
      )
      or (
        lr.target_type = 'meaning_example_translation'
        and exists (
          select 1
          from context_examples e
          where lr.target_key = ${sqlString(setId)} || '::' || e.meaning_id || '::' || e.example_id::text
        )
      )
    )
    and (
      nullif(trim(coalesce(lr.checked_value_hash, '')), '') is null
      or nullif(trim(coalesce(lr.current_value_hash, '')), '') is null
      or lr.checked_value_hash <> lr.current_value_hash
    )
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select * from missing_pronunciation
  union all
  select * from missing_example
  union all
  select * from latest_negative_pronunciation
  union all
  select * from latest_negative_example
  union all
  select * from stale_reviews
  order by blocker_type, target_type, target_key, language_code
) rows;
`);
const semanticSceneRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order
) rows;
`);
const semanticSceneBlockers = buildSemanticSceneAlignmentBlockers(semanticSceneRows).map((blocker) => ({
  blocker_type: "semantic_scene_alignment",
  target_type: "meaning_example",
  target_key: String(blocker.example_id ?? ""),
  language_code: "EN",
  reason: `${blocker.issue}; example="${blocker.canonical_example_en}"`,
}));
const baseExampleNaturalnessBlockers = buildBaseExampleNaturalnessFindings(semanticSceneRows).blockers.map((blocker) => ({
  blocker_type: "base_example_naturalness",
  target_type: "meaning_example",
  target_key: String(blocker.example_id ?? ""),
  language_code: "EN",
  reason: formatBaseExampleNaturalnessBlocker(blocker),
}));
const entryRowsForV2 = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.article_or_marker,
    le.gender,
    le.grammatical_number
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order, le.language_code
) rows;
`);
const scriptLanguageIdentityBlockers = buildScriptLanguageIdentityFindings(entryRowsForV2).blockers.map((blocker) => ({
  blocker_type: "script_language_identity",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatScriptLanguageIdentityFinding(blocker),
}));
const articleGenderMarkerBlockers = buildArticleGenderMarkerFindings(entryRowsForV2).blockers.map((blocker) => ({
  blocker_type: "article_gender_marker_consistency",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatArticleGenderMarkerFinding(blocker),
}));
const semanticGranularityBlockers = buildSemanticGranularityFindings(entryRowsForV2).blockers.map((blocker) => ({
  blocker_type: "semantic_granularity",
  target_type: "meaning_language_entry",
  target_key: blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatSemanticGranularityFinding(blocker),
}));
const exampleTemplateDiversityBlockers = buildExampleTemplateDiversityFindings(semanticSceneRows).blockers.map((blocker) => ({
  blocker_type: "example_template_diversity",
  target_type: "content_set",
  target_key: blocker.set_id,
  language_code: "EN",
  reason: formatExampleTemplateDiversityFinding(blocker),
}));
const targetExampleLexicalAnchorBlockers = buildTargetExampleLexicalAnchorFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "target_example_lexical_anchor",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatTargetExampleLexicalAnchorFinding(blocker),
}));
const targetExamplePedagogicalQualityBlockers = buildTargetExamplePedagogicalQualityFindings(exampleCasingRows).blockers.map((blocker) => ({
  blocker_type: "target_example_pedagogical_quality",
  target_type: "meaning_example_translation",
  target_key: blocker.example_id ? `${blocker.set_id}::${blocker.meaning_id}::${blocker.example_id}` : blocker.meaning_id,
  language_code: blocker.language_code,
  reason: formatTargetExamplePedagogicalQualityFinding(blocker),
}));

const hashCoverageBlockers = [];
if (semanticSceneRows.length > 0) {
  const sample = semanticSceneRows[0];
  const sampleTargets = {
    meaning_id: sample.meaning_id,
    example_id: String(sample.example_id ?? ""),
    card_key: `${setId}::${sample.meaning_id}`,
    context_example_key: `${setId}::${sample.meaning_id}::${sample.example_id}`,
  };
  for (const family of requiredHashFamilies) {
    const targetKey = sampleTargets[family.target_key_kind];
    const hashRows = await psqlJson(`
select json_agg(row_to_json(rows))
from (
  select qa_checked_value_hash(
    ${sqlString(family.target_type)},
    ${sqlString(targetKey)},
    ${sqlString(family.language_code)},
    ${sqlString(family.check_family)}
  ) as checked_value_hash
) rows;
`);
    if (!hashRows?.[0]?.checked_value_hash) {
      hashCoverageBlockers.push({
        blocker_type: "qa_hash_coverage",
        target_type: family.target_type,
        target_key: targetKey,
        language_code: family.language_code,
        reason: `qa_checked_value_hash returned null for ${family.check_family}`,
      });
    }
  }
}
const blockers = [
  ...evidenceBlockers,
  ...transcriptionShapeBlockers,
  ...ipaTranscriptionSanityBlockers,
  ...transcriptionSourceBackingBlockers,
  ...crossLanguageTranscriptionBlockers,
  ...intraLanguageTranscriptionBlockers,
  ...entryCrossLanguageBlockers,
  ...entrySourceBackedTranslationBlockers,
  ...translationSourceCoverageBlockers,
  ...exampleCasingBlockers,
  ...exampleNaturalnessBlockers,
  ...targetSemanticSceneAlignmentBlockers,
  ...targetExampleSceneLocationAnchorBlockers,
  ...numberExampleGrammarBlockers,
  ...exampleSurfaceGrammarBlockers,
  ...deckProfileQualityBlockers,
  ...meaningContrastBlockers,
  ...regionalVariantBlockers,
  ...v2EvidenceBlockers,
  ...v3EvidenceBlockers,
  ...semanticSceneBlockers,
  ...baseExampleNaturalnessBlockers,
  ...scriptLanguageIdentityBlockers,
  ...articleGenderMarkerBlockers,
  ...semanticGranularityBlockers,
  ...exampleTemplateDiversityBlockers,
  ...targetExampleLexicalAnchorBlockers,
  ...targetExamplePedagogicalQualityBlockers,
  ...hashCoverageBlockers,
];

if (blockers.length > 0) {
  console.error(`QA evidence check failed for ${setId}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 80)) {
    const lang = blocker.language_code ? ` ${blocker.language_code}` : "";
    console.error(`${blocker.blocker_type}: ${blocker.target_type} ${blocker.target_key}${lang} - ${blocker.reason}`);
  }
  const hidden = blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`QA evidence OK for ${setId}: latest structured QA evidence and DB statuses are synchronized.`);
