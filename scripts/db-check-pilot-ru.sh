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
),
ru_entries as (
  select *
  from meaning_language_entries
  where language_code = 'RU'
    and meaning_id in (select meaning_id from set_items)
),
ru_examples as (
  select *
  from meaning_example_translations
  where language_code = 'RU'
    and example_id in (select example_id from context_examples)
)
select 'active_pilot_items' as check_name, count(*)::text as value
from set_items
union all
select 'ru_entries', count(*)::text
from ru_entries
union all
select 'ru_example_translations', count(*)::text
from ru_examples
union all
select 'ru_batch_entry_items', count(*)::text
from generation_batch_items
where batch_id = 'batch_pilot_home_kitchen_cookware_ru_v1'
  and target_type = 'meaning_language_entry'
  and language_code = 'RU'
  and quality_status <> 'blocked'
union all
select 'ru_batch_example_items', count(*)::text
from generation_batch_items
where batch_id = 'batch_pilot_home_kitchen_cookware_ru_v1'
  and target_type = 'meaning_example'
  and language_code = 'RU'
  and quality_status <> 'blocked'
union all
select 'ru_missing_entries', count(*)::text
from set_items si
where not exists (
  select 1
  from ru_entries re
  where re.meaning_id = si.meaning_id
)
union all
select 'ru_missing_examples', count(*)::text
from context_examples ce
where not exists (
  select 1
  from ru_examples rex
  where rex.example_id = ce.example_id
)
union all
select 'ru_missing_display_word', count(*)::text
from ru_entries
where nullif(trim(word_with_article_or_marker), '') is null
union all
select 'ru_missing_transcription', count(*)::text
from ru_entries
where nullif(trim(transcription), '') is null
union all
select 'ru_missing_romanization', count(*)::text
from ru_entries
where nullif(trim(romanization), '') is null
union all
select 'ru_unexpected_article_marker', count(*)::text
from ru_entries
where nullif(trim(article_or_marker), '') is not null
order by check_name;
SQL
