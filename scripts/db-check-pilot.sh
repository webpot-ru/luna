#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards}"
SET_ID="${1:-home_kitchen_cookware_pilot_01}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v set_id="$SET_ID" -P pager=off <<SQL
with set_items as (
  select meaning_id
  from meaning_set_memberships
  where set_id = :'set_id'
    and quality_status <> 'blocked'
),
context_examples as (
  select example_id, meaning_id
  from meaning_examples
  where set_id = :'set_id'
    and example_role = 'context'
    and meaning_id in (select meaning_id from set_items)
)
select 'languages' as check_name, count(*)::text as value
from languages
union all
select 'pilot_memberships', count(*)::text
from set_items
union all
select 'pilot_batch_items', count(*)::text
from generation_batch_items
where batch_id = 'batch_pilot_home_kitchen_cookware_en_v1'
  and target_type = 'meaning_unit'
  and quality_status <> 'blocked'
union all
select 'pilot_meaning_units', count(*)::text
from meaning_units
where meaning_id in (select meaning_id from set_items)
union all
select 'pilot_en_entries', count(*)::text
from meaning_language_entries
where language_code = 'EN'
  and meaning_id in (select meaning_id from set_items)
union all
select 'pilot_en_transcriptions', count(*)::text
from meaning_language_entries
where language_code = 'EN'
  and meaning_id in (select meaning_id from set_items)
  and nullif(trim(transcription), '') is not null
union all
select 'pilot_context_examples', count(*)::text
from context_examples
union all
select 'missing_semantic_scene', count(*)::text
from meaning_examples
where set_id = :'set_id'
  and example_role = 'context'
  and meaning_id in (select meaning_id from set_items)
  and semantic_scene = '{}'::jsonb
union all
select 'missing_semantic_scene_core_fields', count(*)::text
from meaning_examples
where set_id = :'set_id'
  and example_role = 'context'
  and meaning_id in (select meaning_id from set_items)
  and not (
    semantic_scene ? 'target_object'
    and semantic_scene ? 'target_display'
    and semantic_scene ? 'subject_number'
    and semantic_scene ? 'action_or_state'
    and semantic_scene ? 'state_or_location'
    and semantic_scene ? 'tense_aspect'
    and semantic_scene ? 'topic_context'
  )
union all
select 'pilot_en_example_translations', count(*)::text
from meaning_example_translations
where language_code = 'EN'
  and example_id in (select example_id from context_examples)
union all
select 'missing_english_articles', count(*)::text
from meaning_units
where meaning_id in (select meaning_id from set_items)
  and nullif(trim(english_with_article), '') is null
union all
select 'missing_english_transcription', count(*)::text
from meaning_language_entries
where language_code = 'EN'
  and meaning_id in (select meaning_id from set_items)
  and nullif(trim(transcription), '') is null
union all
select 'missing_priority_band', count(*)::text
from meaning_units
where meaning_id in (select meaning_id from set_items)
  and nullif(trim(priority_band), '') is null
union all
select 'missing_content_set_level_label', count(*)::text
from content_sets
where set_id = :'set_id'
  and nullif(trim(level_label), '') is null
union all
select 'missing_course_metadata_localizations', (
  (select count(*) from languages where is_active)
  -
  (
    select count(*)
    from content_set_localizations csl
    join languages l on l.code = csl.language_code
    where csl.set_id = :'set_id'
      and l.is_active
      and nullif(trim(csl.title), '') is not null
      and nullif(trim(csl.description), '') is not null
      and nullif(trim(csl.level_signal), '') is not null
  )
)::text
union all
select 'long_course_metadata_titles', count(*)::text
from content_set_localizations
where set_id = :'set_id'
  and char_length(title) > 25
union all
select 'long_course_metadata_descriptions', count(*)::text
from content_set_localizations
where set_id = :'set_id'
  and char_length(description) > 60
union all
select 'course_metadata_level_signal_mismatch', count(*)::text
from content_set_localizations
where set_id = :'set_id'
  and nullif(trim(level_signal), '') is not null
  and position(level_signal in description) = 0
union all
select 'duplicate_canonical_english_in_set', count(*)::text
from (
  select mu.canonical_english
  from meaning_units mu
  join set_items si on si.meaning_id = mu.meaning_id
  group by mu.canonical_english
  having count(*) > 1
) duplicates
order by check_name;
SQL
