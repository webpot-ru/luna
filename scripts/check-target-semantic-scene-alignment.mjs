#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTargetSemanticSceneAlignmentFindings,
  formatTargetSemanticSceneAlignmentFinding,
} from "./lib/target-semantic-scene-alignment.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-target-semantic-scene-alignment.mjs <set_id> [<set_id> ...]");
}

for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    e.example_id,
    e.canonical_example_en,
    jsonb_strip_nulls(jsonb_build_object(
      'target_object', e.semantic_scene->'target_object',
      'target_display', e.semantic_scene->'target_display',
      'subject_number', e.semantic_scene->'subject_number',
      'action_or_state', e.semantic_scene->'action_or_state',
      'state_or_location', e.semantic_scene->'state_or_location',
      'tense_aspect', e.semantic_scene->'tense_aspect',
      'topic_context', e.semantic_scene->'topic_context'
    )) as semantic_scene,
    et.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    et.example_text,
    sp.evidence as semantic_preservation_evidence
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
    select jsonb_strip_nulls(jsonb_build_object(
      'target_semantic_scene_alignment', jsonb_strip_nulls(jsonb_build_object(
        'supported', proof->'supported',
        'scene_preserved', proof->'scene_preserved',
        'proof_method', proof->'proof_method',
        'checked_against_current_example', proof->'checked_against_current_example',
        'language_code', proof->'language_code',
        'meaning_id', proof->'meaning_id',
        'canonical_example_en', proof->'canonical_example_en',
        'target_example_text', proof->'target_example_text',
        'scene_slots', jsonb_strip_nulls(jsonb_build_object(
          'target_object', coalesce(proof#>'{scene_slots,target_object}', proof#>'{source_scene,target_object}'),
          'target_display', coalesce(proof#>'{scene_slots,target_display}', proof#>'{source_scene,target_display}'),
          'subject_number', coalesce(proof#>'{scene_slots,subject_number}', proof#>'{source_scene,subject_number}'),
          'action_or_state', coalesce(proof#>'{scene_slots,action_or_state}', proof#>'{source_scene,action_or_state}'),
          'state_or_location', coalesce(proof#>'{scene_slots,state_or_location}', proof#>'{source_scene,state_or_location}'),
          'tense_aspect', coalesce(proof#>'{scene_slots,tense_aspect}', proof#>'{source_scene,tense_aspect}'),
          'topic_context', coalesce(proof#>'{scene_slots,topic_context}', proof#>'{source_scene,topic_context}')
        ))
      ))
    )) as evidence
    from (
      select coalesce(
        qr.evidence#>'{target_semantic_scene_alignment,scene_slot_proof}',
        qr.evidence->'target_semantic_scene_alignment',
        qr.evidence#>'{runner_evidence,target_semantic_scene_alignment,scene_slot_proof}',
        qr.evidence#>'{runner_evidence,target_semantic_scene_alignment}',
        qr.evidence->'semantic_scene_proof',
        qr.evidence#>'{runner_evidence,semantic_scene_proof}',
        qr.evidence->'scene_alignment_proof',
        qr.evidence#>'{runner_evidence,scene_alignment_proof}'
      ) as proof
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
    ) latest
  ) sp on true
  join languages l
    on l.code = et.language_code
   and l.is_active
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, et.language_code
) rows;
`, 1024 * 1024 * 160);

const findings = buildTargetSemanticSceneAlignmentFindings(rows);

if (findings.blockers.length > 0) {
  console.error(
    `Target semantic scene alignment failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`
  );
  for (const blocker of findings.blockers.slice(0, 160)) {
    console.error(formatTargetSemanticSceneAlignmentFinding(blocker));
  }
  const hidden = findings.blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(
  `Target semantic scene alignment OK for ${setIds.join(", ")}: ${findings.checked} supported/proof-backed target example row(s), ${findings.skipped} unsupported scene row(s) skipped.`
);
