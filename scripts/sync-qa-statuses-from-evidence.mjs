#!/usr/bin/env node
import { assertSafeSetId, parseContextExampleKey, psqlExec, psqlJson, sqlString } from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);
const setId = args.find((arg) => !arg.startsWith("--")) ?? "home_kitchen_cookware_pilot_01";
const dryRun = args.includes("--dry-run");
const apply = args.includes("--apply");

assertSafeSetId(setId);

if (dryRun === apply) {
  throw new Error("Usage: node scripts/sync-qa-statuses-from-evidence.mjs <set_id> --dry-run|--apply");
}

const fetchChangesSql = `
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
  select 'content_set'::text as target_type, ${sqlString(setId)}::text as target_key

  union
  select 'content_set', ${sqlString(setId)} || '::course_metadata'

  union
  select 'meaning_unit', si.meaning_id
  from set_items si

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
    qr.pass_id,
    qr.batch_id,
    qr.check_family,
    qr.result_summary,
    qr.checked_value_hash,
    qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family) as current_value_hash
  from qa_reviews qr
  join scoped_review_targets srt
    on srt.target_type = qr.target_type
   and srt.target_key = qr.target_key
  where nullif(trim(coalesce(qr.reviewer, '')), '') is not null
    and qr.reviewed_at is not null
    and nullif(trim(coalesce(qr.check_family, '')), '') is not null
    and nullif(trim(coalesce(qr.result_summary, '')), '') is not null
    and (
      nullif(trim(coalesce(qr.pass_id, '')), '') is not null
      or nullif(trim(coalesce(qr.batch_id, '')), '') is not null
    )
),
latest_reviews as (
  select distinct on (
    target_type,
    target_key,
    case
      when target_type in ('content_set', 'meaning_example') and coalesce(language_code, '') = ''
        then 'EN'
      else coalesce(language_code, '')
    end,
    check_family
  )
    *
  from structured_reviews
  order by
    target_type,
    target_key,
    case
      when target_type in ('content_set', 'meaning_example') and coalesce(language_code, '') = ''
        then 'EN'
      else coalesce(language_code, '')
    end,
    check_family,
    reviewed_at desc,
    review_id desc
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
word_selection_changes as (
  select
    case
      when ma.approved_at is not null and ma.approved_at > lr.reviewed_at
        then 'skip'
      when si.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'conflict'
      when si.quality_status = 'approved'
        then 'skip'
      when si.quality_status <> (
        case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'word_selection_quality_%'
          and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
          and lr.checked_value_hash = lr.current_value_hash
          then 'generated_checked'
          else 'needs_review'
        end
      )
        then 'update'
      else 'skip'
    end as action,
    'word_selection_quality' as field_name,
    lr.target_type,
    lr.target_key,
    coalesce(lr.language_code, 'EN') as language_code,
    si.quality_status as current_status,
    case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'word_selection_quality_%'
      and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
      and lr.checked_value_hash = lr.current_value_hash
      then 'generated_checked'
      else 'needs_review'
    end as next_status,
    lr.check_family,
    lr.review_status,
    lr.review_id,
    case
      when si.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'latest word_selection_quality review is non-pass but set membership is approved; manual decision required'
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'word_selection_quality_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash
        then 'latest word_selection_quality pass promotes set membership quality_status'
      else 'latest word_selection_quality non-pass demotes set membership quality_status'
    end as reason
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
    and (
      lr.review_status not in ('approved', 'generated_checked')
      or lr.pass_id like 'word_selection_quality_%'
    )
),
entry_changes as (
  select
    case
      when ma.approved_at is not null and ma.approved_at > lr.reviewed_at
        then 'skip'
      when le.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'conflict'
      when le.quality_status = 'approved'
        then 'skip'
      when le.quality_status <> (
        case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'entry_form_%'
          and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
          and lr.checked_value_hash = lr.current_value_hash
          then 'generated_checked'
          else 'needs_review'
        end
      )
        then 'update'
      else 'skip'
    end as action,
    'entry_quality' as field_name,
    lr.target_type,
    le.meaning_id as target_key,
    le.language_code,
    le.quality_status as current_status,
    case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'entry_form_%'
      and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
      and lr.checked_value_hash = lr.current_value_hash
      then 'generated_checked'
      else 'needs_review'
    end as next_status,
    lr.check_family,
    lr.review_status,
    lr.review_id,
    case
      when le.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'latest entry_form review is non-pass but target is approved; manual decision required'
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'entry_form_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash
        then 'latest entry_form pass promotes entry quality_status'
      else 'latest entry_form non-pass demotes entry quality_status'
    end as reason
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
    and (
      lr.review_status not in ('approved', 'generated_checked')
      or lr.pass_id like 'entry_form_%'
    )
),
transcription_changes as (
  select
    case
      when ma.approved_at is not null and ma.approved_at > lr.reviewed_at
        then 'skip'
      when le.pronunciation_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'conflict'
      when le.pronunciation_status = 'approved'
        then 'skip'
      when le.pronunciation_status <> (
        case
          when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'transcription_policy_%'
            and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
            and lr.checked_value_hash = lr.current_value_hash then
            case
              when (l.transcription_kind = 'native_orthography' or l.transcription_format ilike 'native orthography%')
                and coalesce(le.transcription, '') = coalesce(le.word_with_article_or_marker, le.native_word, '')
                then 'not_applicable'
              else 'generated_checked'
            end
          else 'needs_review'
        end
      )
        then 'update'
      else 'skip'
    end as action,
    'entry_pronunciation' as field_name,
    lr.target_type,
    le.meaning_id as target_key,
    le.language_code,
    le.pronunciation_status as current_status,
    case
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'transcription_policy_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash then
        case
          when (l.transcription_kind = 'native_orthography' or l.transcription_format ilike 'native orthography%')
            and coalesce(le.transcription, '') = coalesce(le.word_with_article_or_marker, le.native_word, '')
            then 'not_applicable'
          else 'generated_checked'
        end
      else 'needs_review'
    end as next_status,
    lr.check_family,
    lr.review_status,
    lr.review_id,
    case
      when le.pronunciation_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'latest transcription_policy review is non-pass but pronunciation is approved; manual decision required'
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'transcription_policy_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash
        then 'latest transcription_policy pass promotes pronunciation_status according to language policy'
      else 'latest transcription_policy non-pass demotes pronunciation_status'
    end as reason
  from latest_reviews lr
  join meaning_language_entries le
    on le.meaning_id = lr.target_key
   and le.language_code = lr.language_code
  join languages l on l.code = le.language_code
  join set_items si on si.meaning_id = le.meaning_id
  left join manual_approvals ma
    on ma.target_type = lr.target_type
   and ma.target_key = lr.target_key
   and ma.language_key = coalesce(lr.language_code, '')
  where lr.target_type = 'meaning_language_entry'
    and lr.check_family = 'transcription_policy'
    and (
      lr.review_status not in ('approved', 'generated_checked')
      or lr.pass_id like 'transcription_policy_%'
    )
),
semantic_changes as (
  select
    case
      when ma.approved_at is not null and ma.approved_at > lr.reviewed_at
        then 'skip'
      when et.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'conflict'
      when et.quality_status = 'approved'
        then 'skip'
      when et.quality_status <> (
        case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'semantic_preservation_%'
          and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
          and lr.checked_value_hash = lr.current_value_hash
          then 'generated_checked'
          else 'needs_review'
        end
      )
        then 'update'
      else 'skip'
    end as action,
    'example_translation_quality' as field_name,
    lr.target_type,
    lr.target_key,
    et.language_code,
    et.quality_status as current_status,
    case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'semantic_preservation_%'
      and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
      and lr.checked_value_hash = lr.current_value_hash
      then 'generated_checked'
      else 'needs_review'
    end as next_status,
    lr.check_family,
    lr.review_status,
    lr.review_id,
    case
      when et.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'latest semantic_preservation review is non-pass but translation is approved; manual decision required'
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'semantic_preservation_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash
        then 'latest semantic_preservation pass promotes example translation quality_status'
      else 'latest semantic_preservation non-pass demotes example translation quality_status'
    end as reason
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
    and (
      lr.review_status not in ('approved', 'generated_checked')
      or lr.pass_id like 'semantic_preservation_%'
    )
),
base_example_changes as (
  select
    case
      when ma.approved_at is not null and ma.approved_at > lr.reviewed_at
        then 'skip'
      when e.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'conflict'
      when e.quality_status = 'approved'
        then 'skip'
      when e.quality_status <> (
        case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'base_example_alignment_%'
          and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
          and lr.checked_value_hash = lr.current_value_hash
          then 'generated_checked'
          else 'needs_review'
        end
      )
        then 'update'
      else 'skip'
    end as action,
    'base_example_quality' as field_name,
    lr.target_type,
    e.example_id::text as target_key,
    coalesce(lr.language_code, 'EN') as language_code,
    e.quality_status as current_status,
    case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'base_example_alignment_%'
      and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
      and lr.checked_value_hash = lr.current_value_hash
      then 'generated_checked'
      else 'needs_review'
    end as next_status,
    lr.check_family,
    lr.review_status,
    lr.review_id,
    case
      when e.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'latest base_example_alignment review is non-pass but context example is approved; manual decision required'
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'base_example_alignment_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash
        then 'latest base_example_alignment pass promotes context example quality_status'
      else 'latest base_example_alignment non-pass demotes context example quality_status'
    end as reason
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
    and (
      lr.review_status not in ('approved', 'generated_checked')
      or lr.pass_id like 'base_example_alignment_%'
    )
),
example_quality_changes as (
  select
    case
      when ma.approved_at is not null and ma.approved_at > lr.reviewed_at
        then 'skip'
      when e.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'conflict'
      when e.quality_status = 'approved'
        then 'skip'
      when e.quality_status <> (
        case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'example_quality_%'
          and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
          and lr.checked_value_hash = lr.current_value_hash
          then 'generated_checked'
          else 'needs_review'
        end
      )
        then 'update'
      else 'skip'
    end as action,
    'example_quality' as field_name,
    lr.target_type,
    e.example_id::text as target_key,
    coalesce(lr.language_code, 'EN') as language_code,
    e.quality_status as current_status,
    case when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'example_quality_%'
      and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
      and lr.checked_value_hash = lr.current_value_hash
      then 'generated_checked'
      else 'needs_review'
    end as next_status,
    lr.check_family,
    lr.review_status,
    lr.review_id,
    case
      when e.quality_status = 'approved' and lr.review_status not in ('approved', 'generated_checked')
        then 'latest example_quality review is non-pass but context example is approved; manual decision required'
      when lr.review_status in ('approved', 'generated_checked') and lr.pass_id like 'example_quality_%'
        and nullif(trim(coalesce(lr.checked_value_hash, '')), '') is not null
        and lr.checked_value_hash = lr.current_value_hash
        then 'latest example_quality pass promotes context example quality_status'
      else 'latest example_quality non-pass demotes context example quality_status'
    end as reason
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
    and (
      lr.review_status not in ('approved', 'generated_checked')
      or lr.pass_id like 'example_quality_%'
    )
),
changes as (
  select * from word_selection_changes
  union all
  select * from entry_changes
  union all select * from transcription_changes
  union all select * from semantic_changes
  union all select * from base_example_changes
  union all select * from example_quality_changes
)
select coalesce(json_agg(row_to_json(ordered_changes)), '[]'::json)
from (
  select *
  from changes
  where action <> 'skip'
  order by field_name, target_type, target_key, language_code
) ordered_changes;
`;

const changes = await psqlJson(fetchChangesSql);
const updateChanges = changes.filter((change) => change.action === "update");
const conflictChanges = changes.filter((change) => change.action === "conflict");

function countBy(rows, key) {
  return rows.reduce((accumulator, row) => {
    accumulator[row[key]] = (accumulator[row[key]] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildUpdateStatement(change) {
  if (change.field_name === "word_selection_quality") {
    const [keySetId, meaningId] = String(change.target_key ?? "").split("::");
    if (keySetId !== setId || !meaningId) {
      throw new Error(`Refusing to sync set membership outside active set: ${change.target_key}`);
    }
    return `
update meaning_set_memberships
set quality_status = ${sqlString(change.next_status)},
    updated_at = now()
where set_id = ${sqlString(setId)}
  and meaning_id = ${sqlString(meaningId)}
  and quality_status <> 'approved';`;
  }

  if (change.field_name === "entry_quality") {
    return `
update meaning_language_entries
set quality_status = ${sqlString(change.next_status)},
    updated_at = now()
where meaning_id = ${sqlString(change.target_key)}
  and language_code = ${sqlString(change.language_code)}
  and quality_status <> 'approved';`;
  }

  if (change.field_name === "entry_pronunciation") {
    return `
update meaning_language_entries
set pronunciation_status = ${sqlString(change.next_status)},
    updated_at = now()
where meaning_id = ${sqlString(change.target_key)}
  and language_code = ${sqlString(change.language_code)}
  and pronunciation_status <> 'approved';`;
  }

  if (change.field_name === "example_translation_quality") {
    const { setId: keySetId, meaningId, exampleId } = parseContextExampleKey(change.target_key);
    if (keySetId !== setId) {
      throw new Error(`Refusing to sync target outside active set: ${change.target_key}`);
    }
    return `
update meaning_example_translations
set quality_status = ${sqlString(change.next_status)},
    updated_at = now()
where example_id = ${Number(exampleId)}
  and language_code = ${sqlString(change.language_code)}
  and quality_status <> 'approved'
  and exists (
    select 1
    from meaning_examples e
    where e.example_id = ${Number(exampleId)}
      and e.set_id = ${sqlString(setId)}
      and e.meaning_id = ${sqlString(meaningId)}
  );`;
  }

  if (change.field_name === "base_example_quality" || change.field_name === "example_quality") {
    if (!/^\d+$/.test(change.target_key)) {
      throw new Error(`Unsafe meaning_example target_key: ${change.target_key}`);
    }
    return `
update meaning_examples
set quality_status = ${sqlString(change.next_status)},
    updated_at = now()
where example_id = ${Number(change.target_key)}
  and set_id = ${sqlString(setId)}
  and example_role = 'context'
  and quality_status <> 'approved';`;
  }

  throw new Error(`Unsupported sync field_name=${change.field_name}`);
}

if (apply && conflictChanges.length > 0) {
  console.error(`QA status sync blocked for ${setId}: ${conflictChanges.length} approved-status conflict(s).`);
  for (const conflict of conflictChanges.slice(0, 40)) {
    const lang = conflict.language_code ? ` ${conflict.language_code}` : "";
    console.error(`${conflict.field_name}: ${conflict.target_key}${lang} - ${conflict.reason}`);
  }
  const hidden = conflictChanges.length - 40;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

if (apply && updateChanges.length > 0) {
  await psqlExec(["begin;", ...updateChanges.map(buildUpdateStatement), "commit;"].join("\n"));
}

console.log(`${dryRun ? "Dry run" : "Applied"} QA status sync for ${setId}`);
console.log(`updates=${updateChanges.length}`);
console.log(`conflicts=${conflictChanges.length}`);
console.log(`updates_by_field=${JSON.stringify(countBy(updateChanges, "field_name"))}`);
console.log(`conflicts_by_field=${JSON.stringify(countBy(conflictChanges, "field_name"))}`);

for (const change of changes.slice(0, 80)) {
  const lang = change.language_code ? ` ${change.language_code}` : "";
  console.log(
    `${change.action}: ${change.field_name} ${change.target_key}${lang} ${change.current_status} -> ${change.next_status}; ${change.reason}`
  );
}
const hidden = changes.length - 80;
if (hidden > 0) console.log(`... +${hidden} more`);
