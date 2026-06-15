#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards}"
SET_ID="${1:-home_kitchen_cookware_pilot_01}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v set_id="$SET_ID" -P pager=off <<'SQL'
create temporary table qa_checks as
with
set_info as (
  select *
  from content_sets
  where set_id = :'set_id'
),
set_items as (
  select msm.*
  from meaning_set_memberships msm
  where msm.set_id = :'set_id'
    and msm.quality_status <> 'blocked'
),
set_meanings as (
  select mu.*, si.display_order, si.context_domain, si.context_area, si.context_category, si.context_note
  from set_items si
  join meaning_units mu on mu.meaning_id = si.meaning_id
),
context_examples as (
  select e.*
  from meaning_examples e
  join set_items si on si.meaning_id = e.meaning_id
  where e.set_id = :'set_id'
    and e.example_role = 'context'
),
qa_evidence as (
  select
    target_type,
    target_key,
    language_code,
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
      check_family = 'example_quality'
      and pass_id like 'example_quality_%'
    ) as is_example_quality
  from qa_reviews
  where review_status in ('approved', 'generated_checked')
    and nullif(trim(coalesce(reviewer, '')), '') is not null
    and reviewed_at is not null
    and nullif(trim(coalesce(check_family, '')), '') is not null
    and nullif(trim(coalesce(result_summary, '')), '') is not null
    and (
      nullif(trim(coalesce(pass_id, '')), '') is not null
      or nullif(trim(coalesce(batch_id, '')), '') is not null
    )
),
checks as (
  select
    10 as sort_order,
    'content_set_exists' as check_id,
    'ERROR' as severity,
    case when (select count(*) from set_info) = 1 then 0 else 1 end::bigint as issue_count,
    'Exactly one content_set must exist for the requested set_id.' as notes

  union all
  select
    20,
    'active_languages_count',
    'ERROR',
    case when (select count(*) from languages where is_active) = 54 then 0 else 1 end::bigint,
    'Expected 54 active language variants.'

  union all
  select
    30,
    'item_count_within_target',
    'ERROR',
    case
      when not exists (select 1 from set_info) then 1
      when (select target_item_count_min from set_info) is not null
        and (select count(*) from set_items) < (select target_item_count_min from set_info) then 1
      when (select target_item_count_max from set_info) is not null
        and (select count(*) from set_items) > (select target_item_count_max from set_info) then 1
      else 0
    end::bigint,
    'Set item count must be inside content_sets.target_item_count_min/max.'

  union all
  select
    40,
    'missing_display_order',
    'ERROR',
    count(*)::bigint,
    'Every set membership must have display_order.'
  from set_items
  where display_order is null

  union all
  select
    50,
    'duplicate_display_order',
    'ERROR',
    count(*)::bigint,
    'Display order must be unique inside one set.'
  from (
    select display_order
    from set_items
    where display_order is not null
    group by display_order
    having count(*) > 1
  ) duplicates

  union all
  select
    60,
    'obvious_nouns_in_action_deck',
    'ERROR',
    count(*)::bigint,
    'Decks labeled as actions/verbs must contain verb meaning units only.'
  from set_meanings sm
  where exists (
    select 1
    from set_info si
    where lower(concat_ws(' ', si.set_name, si.category, si.situation, si.roadmap_stage)) ~ '(action|verb)'
  )
    and sm.part_of_speech <> 'verb'

  union all
  select
    61,
    'obvious_verbs_in_object_deck',
    'ERROR',
    count(*)::bigint,
    'Object/item decks must not contain obvious verb meaning units.'
  from set_meanings sm
  where exists (
    select 1
    from set_info si
    where lower(concat_ws(' ', si.set_name, si.category, si.situation)) ~ '(basics|essentials|objects|items|supplies|furniture|tableware|cookware|utensils|appliances|tools|clothing|fruits|vegetables|drinks|food|kitchenware)'
      and lower(concat_ws(' ', si.set_name, si.category, si.situation, si.roadmap_stage)) !~ '(action|verb)'
  )
    and sm.part_of_speech = 'verb'

  union all
  select
    62,
    'duplicate_surface_pos_inside_set',
    'ERROR',
    count(*)::bigint,
    'One deck must not contain duplicate canonical_english + POS rows under different meaning_id values.'
  from (
    select lower(canonical_english), part_of_speech
    from set_meanings
    group by lower(canonical_english), part_of_speech
    having count(distinct meaning_id) > 1
  ) duplicate_surfaces

  union all
  select
    70,
    'missing_english_language_entries',
    'ERROR',
    count(*)::bigint,
    'Every pilot meaning unit must have an EN language entry.'
  from set_items si
  where not exists (
    select 1
    from meaning_language_entries le
    where le.meaning_id = si.meaning_id
      and le.language_code = 'EN'
  )

  union all
  select
    80,
    'missing_context_examples',
    'ERROR',
    count(*)::bigint,
    'Every pilot meaning unit must have one context example for this set.'
  from set_items si
  where not exists (
    select 1
    from context_examples e
    where e.meaning_id = si.meaning_id
  )

  union all
  select
    80,
    'structural_semantic_scene_missing',
    'ERROR',
    count(*)::bigint,
    'Structural semantic QA: every context example must have a non-empty semantic_scene before translation.'
  from context_examples
  where semantic_scene = '{}'::jsonb

  union all
  select
    82,
    'structural_semantic_scene_incomplete',
    'ERROR',
    count(*)::bigint,
    'Structural semantic QA: semantic_scene must preserve target, display form, number, state/location, tense/aspect and topic context.'
  from context_examples
  where not (
    semantic_scene ? 'target_object'
    and semantic_scene ? 'target_display'
    and semantic_scene ? 'subject_number'
    and semantic_scene ? 'action_or_state'
    and semantic_scene ? 'state_or_location'
    and semantic_scene ? 'tense_aspect'
    and semantic_scene ? 'topic_context'
  )

  union all
  select
    84,
    'translated_example_semantic_preservation_gate',
    'WARNING',
    0::bigint,
    'Separate QA gate before final export: translated examples must preserve semantic_scene schema v1 fields. This script checks structural scene only; AI/source-backed pass is required for translated examples.'

  union all
  select
    85,
    'missing_english_example_translations',
    'ERROR',
    count(*)::bigint,
    'Every context example must have an EN example translation.'
  from context_examples e
  where not exists (
    select 1
    from meaning_example_translations et
    where et.example_id = e.example_id
      and et.language_code = 'EN'
  )

  union all
  select
    90,
    'a0_level_values',
    'ERROR',
    count(*)::bigint,
    'A0 is not an official CEFR level and must not appear in content data.'
  from (
    select level from meaning_units where level = 'A0'
    union all
    select level_min from content_sets where level_min = 'A0'
    union all
    select level_max from content_sets where level_max = 'A0'
  ) a0_values

  union all
  select
    95,
    'missing_or_invalid_level_label',
    'ERROR',
    case
      when not exists (select 1 from set_info) then 1
      when (select level_label from set_info) in (
        'Basic',
        'Elementary',
        'Pre-Intermediate',
        'Intermediate',
        'Upper-Intermediate',
        'Advanced',
        'Proficiency'
      ) then 0
      else 1
    end::bigint,
    'Every content_set must have one canonical deck level_label.'

  union all
  select
    96,
    'level_label_cefr_mapping',
    'ERROR',
    case
      when not exists (select 1 from set_info) then 1
      when exists (
        select 1
        from set_info
        where (level_label = 'Basic' and level_min = 'A1' and level_max = 'A1')
          or (level_label = 'Elementary' and level_min = 'A1' and level_max = 'A2')
          or (level_label = 'Elementary' and level_min = 'A2' and level_max = 'A2')
          or (level_label = 'Pre-Intermediate' and level_min = 'A2' and level_max = 'B1')
          or (level_label = 'Pre-Intermediate' and level_min = 'B1' and level_max = 'B1')
          or (level_label = 'Intermediate' and level_min = 'B1' and level_max = 'B1')
          or (level_label = 'Intermediate' and level_min = 'B1' and level_max = 'B2')
          or (level_label = 'Upper-Intermediate' and level_min = 'B2' and level_max = 'B2')
          or (level_label = 'Advanced' and level_min = 'B2' and level_max = 'C1')
          or (level_label = 'Advanced' and level_min = 'C1' and level_max = 'C1')
          or (level_label = 'Proficiency' and level_min = 'C2' and level_max = 'C2')
      ) then 0
      else 1
    end::bigint,
    'level_label must match a compatible CEFR range used by the deck export.'

  union all
  select
    97,
    'missing_course_metadata_localizations',
    'ERROR',
    count(*)::bigint,
    'Every active language variant must have Course Metadata title, description, module and category.'
  from languages l
  where l.is_active
    and not exists (
      select 1
      from content_set_localizations csl
      where csl.set_id = :'set_id'
        and csl.language_code = l.code
        and nullif(trim(csl.title), '') is not null
        and nullif(trim(csl.description), '') is not null
        and nullif(trim(csl.module), '') is not null
        and nullif(trim(csl.category), '') is not null
    )

  union all
  select
    98,
    'long_course_metadata_titles',
    'ERROR',
    count(*)::bigint,
    'Course Metadata titles must be 25 characters or fewer.'
  from content_set_localizations
  where set_id = :'set_id'
    and char_length(title) > 25

  union all
  select
    99,
    'long_course_metadata_descriptions',
    'ERROR',
    count(*)::bigint,
    'Course Metadata descriptions must be 60 characters or fewer.'
  from content_set_localizations
  where set_id = :'set_id'
    and char_length(description) > 60

  union all
  select
    100,
    'long_course_metadata_modules',
    'ERROR',
    count(*)::bigint,
    'Course Metadata modules must be 25 characters or fewer.'
  from content_set_localizations
  where set_id = :'set_id'
    and char_length(module) > 25

  union all
  select
    100,
    'long_course_metadata_categories',
    'ERROR',
    count(*)::bigint,
    'Course Metadata categories must be 25 characters or fewer.'
  from content_set_localizations
  where set_id = :'set_id'
    and char_length(category) > 25

  union all
  select
    100,
    'course_metadata_category_contains_scope_list',
    'ERROR',
    count(*)::bigint,
    'Course Metadata category must be a short mobile label, not a comma-separated technical scope.'
  from content_set_localizations
  where set_id = :'set_id'
    and category like '%,%'

  union all
  select
    101,
    'missing_course_metadata_level_signal',
    'ERROR',
    count(*)::bigint,
    'Course Metadata level_signal is required as the DB-backed exact validation value.'
  from content_set_localizations
  where set_id = :'set_id'
    and nullif(trim(level_signal), '') is null

  union all
  select
    102,
    'course_metadata_level_signal_mismatch',
    'ERROR',
    count(*)::bigint,
    'Course Metadata description must contain exact level_signal.'
  from content_set_localizations
  where set_id = :'set_id'
    and nullif(trim(level_signal), '') is not null
    and position(level_signal in description) = 0

  union all
  select
    103,
    'course_metadata_description_missing_final_punctuation',
    'ERROR',
    count(*)::bigint,
    'Course Metadata description must end with localized sentence punctuation when the language row uses sentence punctuation.'
  from content_set_localizations csl
  join (
    values
      ('EN', '.'),
      ('ES', '.'),
      ('FR', '.'),
      ('DE', '.'),
      ('IT', '.'),
      ('PT', '.'),
      ('RU', '.'),
      ('ZH', '。'),
      ('JA', '。'),
      ('KO', '.'),
      ('VI', '.'),
      ('TH', '.'),
      ('MS', '.'),
      ('ID', '.'),
      ('PL', '.'),
      ('NL', '.'),
      ('SV', '.'),
      ('NB', '.'),
      ('DA', '.'),
      ('FI', '.'),
      ('CS', '.'),
      ('SK', '.'),
      ('HU', '.'),
      ('RO', '.'),
      ('BG', '.'),
      ('HR', '.'),
      ('SR', '.'),
      ('SL', '.'),
      ('LT', '.'),
      ('LV', '.'),
      ('ET', '.'),
      ('IS', '.'),
      ('HI', '।'),
      ('BN', '।'),
      ('TL', '.'),
      ('MY', '။'),
      ('KM', '។'),
      ('LO', '.'),
      ('NE', '।'),
      ('SI', '.'),
      ('TA', '.'),
      ('TE', '.'),
      ('KN', '.'),
      ('ML', '.'),
      ('UZ', '.'),
      ('KK', '.'),
      ('AZ', '.'),
      ('KA', '.'),
      ('HY', '։'),
      ('TR', '.'),
      ('SW', '.'),
      ('PT-BR', '.'),
      ('ES-419', '.'),
      ('EN-GB', '.')
  ) as punctuation(language_code, terminator)
    on punctuation.language_code = csl.language_code
  where csl.set_id = :'set_id'
    and right(regexp_replace(csl.description, '\s+$', ''), char_length(punctuation.terminator)) <> punctuation.terminator

  union all
  select
    104,
    'course_metadata_title_missing_final_punctuation',
    'ERROR',
    count(*)::bigint,
    'Course Metadata title must end with localized sentence punctuation.'
  from content_set_localizations csl
  join (
    values
      ('EN', '.'),
      ('ES', '.'),
      ('FR', '.'),
      ('DE', '.'),
      ('IT', '.'),
      ('PT', '.'),
      ('RU', '.'),
      ('ZH', '。'),
      ('JA', '。'),
      ('KO', '.'),
      ('VI', '.'),
      ('TH', '.'),
      ('MS', '.'),
      ('ID', '.'),
      ('PL', '.'),
      ('NL', '.'),
      ('SV', '.'),
      ('NB', '.'),
      ('DA', '.'),
      ('FI', '.'),
      ('CS', '.'),
      ('SK', '.'),
      ('HU', '.'),
      ('RO', '.'),
      ('BG', '.'),
      ('HR', '.'),
      ('SR', '.'),
      ('SL', '.'),
      ('LT', '.'),
      ('LV', '.'),
      ('ET', '.'),
      ('IS', '.'),
      ('HI', '।'),
      ('BN', '।'),
      ('TL', '.'),
      ('MY', '။'),
      ('KM', '។'),
      ('LO', '.'),
      ('NE', '।'),
      ('SI', '.'),
      ('TA', '.'),
      ('TE', '.'),
      ('KN', '.'),
      ('ML', '.'),
      ('UZ', '.'),
      ('KK', '.'),
      ('AZ', '.'),
      ('KA', '.'),
      ('HY', '։'),
      ('TR', '.'),
      ('SW', '.'),
      ('PT-BR', '.'),
      ('ES-419', '.'),
      ('EN-GB', '.')
  ) as punctuation(language_code, terminator)
    on punctuation.language_code = csl.language_code
  where csl.set_id = :'set_id'
    and right(regexp_replace(csl.title, '\s+$', ''), char_length(punctuation.terminator)) <> punctuation.terminator

  union all
  select
    106,
    'course_metadata_description_missing_level_sentence_separator',
    'ERROR',
    count(*)::bigint,
    'Course Metadata description must introduce level_signal as a separate sentence.'
  from content_set_localizations csl
  join (
    values
      ('EN', '. '),
      ('ES', '. '),
      ('FR', '. '),
      ('DE', '. '),
      ('IT', '. '),
      ('PT', '. '),
      ('RU', '. '),
      ('ZH', '。'),
      ('JA', '。'),
      ('KO', '. '),
      ('VI', '. '),
      ('TH', '. '),
      ('MS', '. '),
      ('ID', '. '),
      ('PL', '. '),
      ('NL', '. '),
      ('SV', '. '),
      ('NB', '. '),
      ('DA', '. '),
      ('FI', '. '),
      ('CS', '. '),
      ('SK', '. '),
      ('HU', '. '),
      ('RO', '. '),
      ('BG', '. '),
      ('HR', '. '),
      ('SR', '. '),
      ('SL', '. '),
      ('LT', '. '),
      ('LV', '. '),
      ('ET', '. '),
      ('IS', '. '),
      ('HI', '। '),
      ('BN', '। '),
      ('TL', '. '),
      ('MY', '။ '),
      ('KM', '។ '),
      ('LO', '. '),
      ('NE', '। '),
      ('SI', '. '),
      ('TA', '. '),
      ('TE', '. '),
      ('KN', '. '),
      ('ML', '. '),
      ('UZ', '. '),
      ('KK', '. '),
      ('AZ', '. '),
      ('KA', '. '),
      ('HY', '։ '),
      ('TR', '. '),
      ('SW', '. '),
      ('PT-BR', '. '),
      ('ES-419', '. '),
      ('EN-GB', '. ')
  ) as punctuation(language_code, before_level)
    on punctuation.language_code = csl.language_code
  where csl.set_id = :'set_id'
    and nullif(trim(csl.level_signal), '') is not null
    and position(punctuation.before_level || csl.level_signal in csl.description) = 0

  union all
  select
    100,
    'missing_priority_band',
    'ERROR',
    count(*)::bigint,
    'priority_band is required to separate practical card priority from CEFR and frequency.'
  from set_meanings
  where nullif(trim(priority_band), '') is null

  union all
  select
    105,
    'missing_meaning_note',
    'ERROR',
    count(*)::bigint,
    'meaning_note is required to prevent wrong translations of ambiguous English words.'
  from set_meanings
  where nullif(trim(meaning_note), '') is null

  union all
  select
    110,
    'missing_english_with_article',
    'ERROR',
    count(*)::bigint,
    'Countable English nouns must have english_with_article.'
  from set_meanings
  where part_of_speech = 'noun'
    and coalesce(requires_article, countability in ('countable', 'both'), false)
    and nullif(trim(english_with_article), '') is null

  union all
  select
    120,
    'unexpected_english_article_shape',
    'WARNING',
    count(*)::bigint,
    'Review English noun article shape; expected a/an/the for learner-facing entries.'
  from set_meanings
  where part_of_speech = 'noun'
    and coalesce(requires_article, countability in ('countable', 'both'), false)
    and nullif(trim(english_with_article), '') is not null
    and lower(english_with_article) !~ '^(a|an|the) '

  union all
  select
    130,
    'missing_plural_form_en',
    'ERROR',
    count(*)::bigint,
    'Countable English nouns need plural_form_en for examples and later grammar checks.'
  from set_meanings
  where part_of_speech = 'noun'
    and countability in ('countable', 'both')
    and nullif(trim(plural_form_en), '') is null

  union all
  select
    140,
    'duplicate_canonical_english_in_set',
    'ERROR',
    count(*)::bigint,
    'Same canonical_english repeated in one set usually means duplicate or ambiguous meaning split.'
  from (
    select lower(canonical_english) as canonical_english_key
    from set_meanings
    group by lower(canonical_english)
    having count(*) > 1
  ) duplicates

  union all
  select
    150,
    'taxonomy_mismatch_with_set',
    'ERROR',
    count(*)::bigint,
    'Meaning unit default taxonomy and membership context should match the content_set taxonomy, except explicit duplicate-policy reuse rows whose membership context matches the set.'
  from set_meanings sm
  cross join set_info cs
  where sm.context_domain is distinct from cs.domain
    or sm.context_area is distinct from cs.area
    or sm.context_category is distinct from cs.category
    or (
      (
        sm.default_domain is distinct from cs.domain
        or sm.default_area is distinct from cs.area
        or sm.default_category is distinct from cs.category
      )
      and coalesce(sm.context_note, '') !~* 'duplicate-policy reuse'
    )

  union all
  select
    160,
    'missing_base_example_en',
    'WARNING',
    count(*)::bigint,
    'base_example_en is useful for reusable meaning units, even when the set has context examples.'
  from set_meanings
  where nullif(trim(base_example_en), '') is null

  union all
  select
    170,
    'empty_context_example',
    'ERROR',
    count(*)::bigint,
    'Context examples must not be empty.'
  from context_examples
  where nullif(trim(canonical_example_en), '') is null

  union all
  select
    180,
    'long_context_example',
    'WARNING',
    count(*)::bigint,
    'Context examples should stay short; review anything over 12 words.'
  from context_examples
  where cardinality(regexp_split_to_array(trim(canonical_example_en), '[[:space:]]+')) > 12

  union all
  select
    190,
    'context_example_missing_final_punctuation',
    'WARNING',
    count(*)::bigint,
    'Learner-facing examples should end with punctuation.'
  from context_examples
  where canonical_example_en !~ '[.!?]$'

  union all
  select
    200,
    'context_example_not_capitalized',
    'WARNING',
    count(*)::bigint,
    'English examples normally should start with a capital letter.'
  from context_examples
  where canonical_example_en !~ '^[[:upper:]]'

  union all
  select
    202,
    'context_example_repeated_need_template',
    'ERROR',
    count(*)::bigint,
    'Context examples must not use repeated learner-poor templates like "I need to ..."; use concrete natural scenes.'
  from context_examples
  where canonical_example_en ~* '^I need to '

  union all
  select
    203,
    'context_example_generic_food_placeholder',
    'ERROR',
    count(*)::bigint,
    'Cooking/action examples must not overuse generic placeholders like "the food"; choose a concrete natural object.'
  from context_examples e
  join set_info cs on true
  where cs.category ilike '%action%'
    and e.canonical_example_en ~* '(^|[[:space:]])(the|some) food([[:space:].,!?;:]|$)'

  union all
  select
    204,
    'semantic_scene_target_object_is_action',
    'ERROR',
    count(*)::bigint,
    'For verb cards, semantic_scene.target_object must name the acted-on object, not repeat the target verb/action.'
  from context_examples e
  join set_meanings sm on sm.meaning_id = e.meaning_id
  where sm.part_of_speech = 'verb'
    and lower(coalesce(e.semantic_scene->>'target_object', '')) in (
      lower(sm.canonical_english),
      lower(regexp_replace(coalesce(sm.english_with_article, ''), '^to\\s+', ''))
    )

  union all
  select
    210,
    'english_entry_mismatch',
    'ERROR',
    count(*)::bigint,
    'EN language entry should mirror canonical_english and english_with_article at Gate 2.'
  from set_meanings sm
  join meaning_language_entries le
    on le.meaning_id = sm.meaning_id
    and le.language_code = 'EN'
  where le.native_word is distinct from sm.canonical_english
    or le.word_with_article_or_marker is distinct from sm.english_with_article

  union all
	  select
	    215,
	    'generated_checked_without_qa_evidence',
    'ERROR',
    count(*)::bigint,
    'generated_checked requires usable qa_reviews evidence before final export.'
  from (
    select 'content_set' as target_type, si.set_id as target_key, null::text as language_code
    from set_info si
    where si.quality_status = 'generated_checked'
      and not exists (
        select 1 from qa_evidence qe
        where qe.target_type = 'content_set'
          and qe.target_key = si.set_id
          and qe.language_code is null
      )

    union all
    select 'content_set', :'set_id' || '::course_metadata', csl.language_code
    from content_set_localizations csl
    join languages l on l.code = csl.language_code
    where csl.set_id = :'set_id'
      and l.is_active
      and csl.quality_status = 'generated_checked'
      and not exists (
        select 1 from qa_evidence qe
        where qe.target_type = 'content_set'
          and qe.target_key = :'set_id' || '::course_metadata'
          and qe.language_code = csl.language_code
      )

    union all
    select 'meaning_unit', sm.meaning_id, null::text
    from set_meanings sm
    where sm.quality_status = 'generated_checked'
      and not exists (
        select 1 from qa_evidence qe
        where qe.target_type = 'meaning_unit'
          and qe.target_key = sm.meaning_id
          and qe.language_code is null
      )

	    union all
	    select 'content_set', :'set_id' || '::' || si.meaning_id, null::text
	    from set_items si
	    where si.quality_status = 'generated_checked'
	      and not exists (
	        select 1 from qa_evidence qe
	        where qe.target_type = 'content_set'
	          and qe.target_key = :'set_id' || '::' || si.meaning_id
	          and coalesce(qe.language_code, 'EN') = 'EN'
	      )

		    union all
		    select 'meaning_example', e.example_id::text, null::text
		    from context_examples e
		    where e.quality_status = 'generated_checked'
		      and not exists (
		        select 1 from qa_evidence qe
		        where qe.target_type = 'meaning_example'
		          and qe.target_key = e.example_id::text
		          and coalesce(qe.language_code, 'EN') = 'EN'
		      )

	    union all
	    select 'meaning_language_entry', le.meaning_id, le.language_code
	    from meaning_language_entries le
	    join set_items si on si.meaning_id = le.meaning_id
    where (le.quality_status = 'generated_checked' or le.pronunciation_status = 'generated_checked')
      and not exists (
        select 1 from qa_evidence qe
        where qe.target_type = 'meaning_language_entry'
          and qe.target_key = le.meaning_id
          and qe.language_code = le.language_code
      )

    union all
	    select 'meaning_example_translation', :'set_id' || '::' || e.meaning_id || '::' || e.example_id::text, et.language_code
	    from context_examples e
	    join meaning_example_translations et on et.example_id = e.example_id
	    where et.quality_status = 'generated_checked'
	      and not exists (
	        select 1 from qa_evidence qe
	        where qe.target_type = 'meaning_example_translation'
	          and qe.target_key = :'set_id' || '::' || e.meaning_id || '::' || e.example_id::text
	          and qe.language_code = et.language_code
	      )
	  ) missing_evidence

	  union all
	  select
	    216,
	    'generated_checked_membership_without_word_selection_qa',
	    'ERROR',
	    count(*)::bigint,
	    'generated_checked set memberships require word_selection_quality QA evidence keyed to set_id::meaning_id / EN.'
	  from set_items si
	  where si.quality_status = 'generated_checked'
	    and not exists (
	      select 1 from qa_evidence qe
	      where qe.target_type = 'content_set'
	        and qe.target_key = :'set_id' || '::' || si.meaning_id
	        and coalesce(qe.language_code, 'EN') = 'EN'
	        and qe.is_word_selection_quality
	    )

	  union all
	  select
	    217,
	    'generated_checked_example_without_semantic_qa',
	    'ERROR',
	    count(*)::bigint,
	    'generated_checked example translations require semantic preservation QA evidence keyed to the exact set_id::meaning_id::example_id.'
	  from context_examples e
	  join meaning_example_translations et on et.example_id = e.example_id
	  where et.quality_status = 'generated_checked'
	    and not exists (
	      select 1 from qa_evidence qe
	      where qe.target_type = 'meaning_example_translation'
	        and qe.target_key = :'set_id' || '::' || e.meaning_id || '::' || e.example_id::text
	        and qe.language_code = et.language_code
	        and qe.is_semantic_preservation
	    )

	  union all
	  select
	    218,
	    'generated_checked_example_without_target_naturalness_qa',
	    'ERROR',
	    count(*)::bigint,
	    'generated_checked example translations require target_example_naturalness QA evidence keyed to the exact set_id::meaning_id::example_id.'
	  from context_examples e
	  join meaning_example_translations et on et.example_id = e.example_id
	  where et.quality_status = 'generated_checked'
	    and not exists (
	      select 1 from qa_evidence qe
	      where qe.target_type = 'meaning_example_translation'
	        and qe.target_key = :'set_id' || '::' || e.meaning_id || '::' || e.example_id::text
	        and qe.language_code = et.language_code
	        and qe.is_target_example_naturalness
	    )

	  union all
	  select
	    219,
	    'generated_checked_context_example_without_example_quality_qa',
	    'ERROR',
	    count(*)::bigint,
	    'generated_checked context examples require example_quality QA evidence keyed to example_id / EN.'
	  from context_examples e
	  where e.quality_status = 'generated_checked'
	    and not exists (
	      select 1 from qa_evidence qe
	      where qe.target_type = 'meaning_example'
	        and qe.target_key = e.example_id::text
	        and coalesce(qe.language_code, 'EN') = 'EN'
	        and qe.is_example_quality
	    )

  union all
  select
    220,
    'generated_items_not_approved',
    'WARNING',
    count(*)::bigint,
    'Expected before manual review: generated content must not be treated as approved.'
  from set_meanings
  where quality_status <> 'approved'
)
select
  sort_order,
  check_id,
  severity,
  issue_count,
  notes
from checks;

select
  check_id,
  severity,
  case when issue_count = 0 then 'pass' else 'fail' end as status,
  issue_count,
  notes
from qa_checks
order by sort_order;

select
  case
    when exists (
      select 1
      from qa_checks
      where severity = 'ERROR'
        and issue_count > 0
    )
    then 'true'
    else 'false'
  end as failed_errors_exist
\gset

\if :failed_errors_exist
  \echo QA failed: at least one ERROR check failed.
  select 1 / 0 as qa_failed;
\else
  \echo QA passed: no failed ERROR checks.
\endif
SQL
