import { psqlExec, readRows, sqlJson, sqlNullableString, sqlString } from "./lib/qa-utils.mjs";
import {
  buildBaseExampleNaturalnessFindings,
  formatBaseExampleNaturalnessBlocker,
} from "./lib/base-example-naturalness.mjs";
import {
  buildMeaningContrastFindings,
  formatMeaningContrastFinding,
} from "./lib/meaning-contrast.mjs";
import {
  buildExampleTemplateDiversityFindings,
  formatExampleTemplateDiversityFinding,
} from "./lib/example-template-diversity.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-deck-base-data.mjs <deck-base.csv|jsonl> [--dry-run]");
}

const safeIdPattern = /^[a-z0-9_]+$/;
const contentTypeMap = new Map([
  ["vocabulary", "vocabulary"],
  ["Vocabulary", "vocabulary"],
  ["core_foundation", "core_foundation"],
  ["Core Foundation", "core_foundation"],
]);

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

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function parseInteger(value, field, line) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`Line ${line}: ${field} must be an integer`);
  return number;
}

function optionalIntegerSql(row, field, line) {
  const value = optionalText(row, field);
  return value === null ? "null" : String(parseInteger(value, field, line));
}

function optionalBooleanSql(row, field) {
  const value = optionalText(row, field);
  if (value === null) return "null";
  const normalized = value.toLowerCase();
  if (["true", "t", "yes", "y", "1"].includes(normalized)) return "true";
  if (["false", "f", "no", "n", "0"].includes(normalized)) return "false";
  throw new Error(`${field} must be boolean-like, got: ${value}`);
}

const rows = await readRows(inputPath);
if (rows.length === 0) throw new Error(`No deck base rows found in ${inputPath}`);

const first = rows[0];
const setId = requireText(first, "set_id", 2);
if (!safeIdPattern.test(setId)) throw new Error(`Unsafe set_id: ${setId}`);

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  if (requireText(row, "set_id", line) !== setId) {
    throw new Error(`Line ${line}: all rows must use the same set_id=${setId}`);
  }
}

const contentType = contentTypeMap.get(requireText(first, "content_type", 2));
if (!contentType) {
  throw new Error("content_type must be Vocabulary, vocabulary, Core Foundation or core_foundation");
}

const baseRowsForPreflight = rows.map((row, index) => {
  const line = index + 2;
  const canonicalEnglish = requireText(row, "canonical_english", line);
  const englishWithArticle = optionalText(row, "english_with_article") ?? canonicalEnglish;
  return {
    set_id: setId,
    meaning_id: requireText(row, "meaning_id", line),
    canonical_english: canonicalEnglish,
    canonical_example_en: requireText(row, "context_example_en", line),
    display_word: englishWithArticle,
    example_text: requireText(row, "context_example_en", line),
    language_code: "EN",
  };
});

const baseExamplePreflight = buildBaseExampleNaturalnessFindings(baseRowsForPreflight);
const meaningContrastPreflight = buildMeaningContrastFindings(baseRowsForPreflight);
const templateDiversityPreflight = buildExampleTemplateDiversityFindings(baseRowsForPreflight);
const basePreflightBlockers = [
  ...baseExamplePreflight.blockers.map(formatBaseExampleNaturalnessBlocker),
  ...meaningContrastPreflight.blockers.map(formatMeaningContrastFinding),
  ...templateDiversityPreflight.blockers.map(formatExampleTemplateDiversityFinding),
];
if (templateDiversityPreflight.warnings.length > 0) {
  console.error(`Base deck example template diversity warnings: ${templateDiversityPreflight.warnings.length}`);
  for (const warning of templateDiversityPreflight.warnings.slice(0, 20)) {
    console.error(formatExampleTemplateDiversityFinding(warning));
  }
  const hidden = templateDiversityPreflight.warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}
const displayOrders = new Map();
const meaningIds = new Map();
const deckDomain = optionalText(first, "domain");
const deckArea = optionalText(first, "area");
const deckCategory = optionalText(first, "category");
function taxonomyCompatible(rowValue, deckValue) {
  if (!rowValue || !deckValue) return true;
  const rowText = rowValue.toLowerCase();
  const deckText = deckValue.toLowerCase();
  return rowText === deckText || rowText.includes(deckText) || deckText.includes(rowText);
}
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const displayOrder = requireText(row, "display_order", line);
  const meaningId = requireText(row, "meaning_id", line);
  const rowDomain = optionalText(row, "domain");
  const rowArea = optionalText(row, "area");
  const rowCategory = optionalText(row, "category");
  const semanticScene = parseJsonField(row.semantic_scene, {});
  if (displayOrders.has(displayOrder)) {
    basePreflightBlockers.push(`duplicate display_order=${displayOrder} on lines ${displayOrders.get(displayOrder)} and ${line}`);
  }
  if (meaningIds.has(meaningId)) {
    basePreflightBlockers.push(`duplicate meaning_id=${meaningId} on lines ${meaningIds.get(meaningId)} and ${line}`);
  }
  if (deckDomain && rowDomain && rowDomain !== deckDomain) {
    basePreflightBlockers.push(`line ${line} domain=${rowDomain} does not match deck domain=${deckDomain}`);
  }
  if (deckArea && rowArea && rowArea !== deckArea) {
    basePreflightBlockers.push(`line ${line} area=${rowArea} does not match deck area=${deckArea}`);
  }
  if (!taxonomyCompatible(rowCategory, deckCategory)) {
    basePreflightBlockers.push(`line ${line} category=${rowCategory} does not match deck category=${deckCategory}`);
  }
  for (const requiredKey of [
    "target_object",
    "target_display",
    "subject_number",
    "action_or_state",
    "state_or_location",
    "tense_aspect",
    "topic_context",
  ]) {
    if (
      !semanticScene ||
      typeof semanticScene !== "object" ||
      typeof semanticScene[requiredKey] !== "string" ||
      semanticScene[requiredKey].trim() === ""
    ) {
      basePreflightBlockers.push(`line ${line} semantic_scene missing ${requiredKey}`);
    }
  }
  displayOrders.set(displayOrder, line);
  meaningIds.set(meaningId, line);
}

if (basePreflightBlockers.length > 0) {
  throw new Error(`Base deck import preflight failed:\n${basePreflightBlockers.join("\n")}`);
}

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `base_import_${setId}_${timestamp}`;
const nextRecommendedSetIds = parseJsonField(first.next_recommended_set_ids, []);

const statements = ["begin;"];

statements.push(`
insert into content_sets (
  set_id,
  content_type,
  set_name,
  slug,
  domain,
  area,
  category,
  situation,
  level_label,
  level_min,
  level_max,
  target_item_count_min,
  target_item_count_max,
  roadmap_stage,
  learning_goal,
  next_recommended_set_ids,
  selection_status,
  quality_status,
  sheet_contract_version,
  notes
) values (
  ${sqlString(setId)},
  ${sqlString(contentType)},
  ${sqlString(requireText(first, "set_name", 2))},
  ${sqlNullableString(optionalText(first, "slug"))},
  ${sqlNullableString(optionalText(first, "domain"))},
  ${sqlNullableString(optionalText(first, "area"))},
  ${sqlNullableString(optionalText(first, "category"))},
  ${sqlNullableString(optionalText(first, "situation"))},
  ${sqlNullableString(optionalText(first, "level_label"))},
  ${sqlNullableString(optionalText(first, "level_min"))},
  ${sqlNullableString(optionalText(first, "level_max"))},
  ${optionalIntegerSql(first, "target_item_count_min", 2)},
  ${optionalIntegerSql(first, "target_item_count_max", 2)},
  ${sqlNullableString(optionalText(first, "roadmap_stage"))},
  ${sqlNullableString(optionalText(first, "learning_goal"))},
  ${sqlJson(nextRecommendedSetIds)},
  'candidate_pool',
  'generated',
  ${sqlNullableString(optionalText(first, "sheet_contract_version") ?? "spreadsheet-contract-v1")},
  ${sqlNullableString(optionalText(first, "set_notes"))}
)
on conflict (set_id) do update
set
  set_name = excluded.set_name,
  slug = excluded.slug,
  domain = excluded.domain,
  area = excluded.area,
  category = excluded.category,
  situation = excluded.situation,
  level_label = excluded.level_label,
  level_min = excluded.level_min,
  level_max = excluded.level_max,
  target_item_count_min = excluded.target_item_count_min,
  target_item_count_max = excluded.target_item_count_max,
  roadmap_stage = excluded.roadmap_stage,
  learning_goal = excluded.learning_goal,
  next_recommended_set_ids = excluded.next_recommended_set_ids,
  sheet_contract_version = excluded.sheet_contract_version,
  updated_at = now();
`);

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
  'meaning_selection',
  ${sqlString(`Base deck import for ${setId}`)},
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
  if (!safeIdPattern.test(meaningId)) throw new Error(`Line ${line}: unsafe meaning_id=${meaningId}`);

  const displayOrder = parseInteger(requireText(row, "display_order", line), "display_order", line);
  const semanticScene = parseJsonField(row.semantic_scene, {});
  const tags = parseJsonField(row.tags, []);
  const englishWithArticle = optionalText(row, "english_with_article") ?? requireText(row, "canonical_english", line);
  const enTranscription = optionalText(row, "en_transcription");

  statements.push(`
do $$
begin
  if exists (
    select 1
    from meaning_units
    where meaning_id = ${sqlString(meaningId)}
      and (
        canonical_english <> ${sqlString(requireText(row, "canonical_english", line))}
        or part_of_speech <> ${sqlString(requireText(row, "part_of_speech", line))}
        or meaning_note <> ${sqlString(requireText(row, "meaning_note", line))}
        or default_domain <> ${sqlString(requireText(row, "domain", line))}
        or coalesce(default_area, '') <> coalesce(${sqlNullableString(optionalText(row, "area"))}, '')
        or coalesce(default_category, '') <> coalesce(${sqlNullableString(optionalText(row, "category"))}, '')
      )
  ) then
    raise exception 'meaning_id % exists with a different fingerprint; review reuse before importing', ${sqlString(meaningId)};
  end if;
end $$;
`);

  statements.push(`
insert into meaning_units (
  meaning_id,
  source_language_code,
  canonical_english,
  english_with_article,
  canonical_meaning,
  part_of_speech,
  meaning_note,
  default_domain,
  default_area,
  default_category,
  level,
  frequency_band,
  priority_band,
  concreteness,
  countability,
  plural_form_en,
  requires_article,
  semantic_class,
  tags,
  base_example_en,
  quality_status,
  notes
) values (
  ${sqlString(meaningId)},
  'EN',
  ${sqlString(requireText(row, "canonical_english", line))},
  ${sqlString(englishWithArticle)},
  ${sqlNullableString(optionalText(row, "canonical_meaning"))},
  ${sqlString(requireText(row, "part_of_speech", line))},
  ${sqlString(requireText(row, "meaning_note", line))},
  ${sqlString(requireText(row, "domain", line))},
  ${sqlNullableString(optionalText(row, "area"))},
  ${sqlNullableString(optionalText(row, "category"))},
  ${sqlNullableString(optionalText(row, "level"))},
  ${sqlNullableString(optionalText(row, "frequency_band"))},
  ${sqlNullableString(optionalText(row, "priority_band"))},
  ${sqlNullableString(optionalText(row, "concreteness"))},
  ${sqlNullableString(optionalText(row, "countability"))},
  ${sqlNullableString(optionalText(row, "plural_form_en"))},
  ${optionalBooleanSql(row, "requires_article")},
  ${sqlNullableString(optionalText(row, "semantic_class"))},
  ${sqlJson(tags)},
  ${sqlString(requireText(row, "context_example_en", line))},
  'generated',
  ${sqlNullableString(optionalText(row, "meaning_notes"))}
)
on conflict (meaning_id) do update
set
  english_with_article = excluded.english_with_article,
  canonical_meaning = excluded.canonical_meaning,
  level = excluded.level,
  frequency_band = excluded.frequency_band,
  priority_band = excluded.priority_band,
  tags = excluded.tags,
  base_example_en = excluded.base_example_en,
  updated_at = now();
`);

  statements.push(`
insert into meaning_set_memberships (
  meaning_id,
  set_id,
  display_order,
  context_domain,
  context_area,
  context_category,
  context_note,
  quality_status
) values (
  ${sqlString(meaningId)},
  ${sqlString(setId)},
  ${displayOrder},
  ${sqlNullableString(optionalText(row, "domain"))},
  ${sqlNullableString(optionalText(row, "area"))},
  ${sqlNullableString(optionalText(row, "category"))},
  ${sqlNullableString(optionalText(row, "context_note"))},
  'generated'
)
on conflict (meaning_id, set_id) do update
set
  display_order = excluded.display_order,
  context_domain = excluded.context_domain,
  context_area = excluded.context_area,
  context_category = excluded.context_category,
  context_note = excluded.context_note,
  quality_status = 'generated',
  updated_at = now();
`);

  statements.push(`
insert into meaning_language_entries (
  meaning_id,
  language_code,
  native_word,
  word_with_article_or_marker,
  article_or_marker,
  transcription,
  pronunciation_status,
  usage_note,
  quality_status,
  source_note
) values (
  ${sqlString(meaningId)},
  'EN',
  ${sqlString(requireText(row, "canonical_english", line))},
  ${sqlString(englishWithArticle)},
  ${sqlNullableString(optionalText(row, "article_or_marker"))},
  ${sqlNullableString(enTranscription)},
  'generated',
  ${sqlNullableString(optionalText(row, "usage_note"))},
  'generated',
  'structured base deck import'
)
on conflict (meaning_id, language_code) do update
set
  native_word = excluded.native_word,
  word_with_article_or_marker = excluded.word_with_article_or_marker,
  article_or_marker = excluded.article_or_marker,
  transcription = excluded.transcription,
  pronunciation_status = 'generated',
  usage_note = excluded.usage_note,
  quality_status = 'generated',
  source_note = excluded.source_note,
  updated_at = now();
`);

  statements.push(`
with upserted as (
  insert into meaning_examples (
    meaning_id,
    set_id,
    example_role,
    canonical_example_en,
    semantic_scene,
    quality_status,
    notes
  ) values (
    ${sqlString(meaningId)},
    ${sqlString(setId)},
    'context',
    ${sqlString(requireText(row, "context_example_en", line))},
    ${sqlJson(semanticScene)},
    'generated',
    ${sqlNullableString(optionalText(row, "example_notes"))}
  )
  on conflict (meaning_id, set_id) where example_role = 'context'
  do update
  set
    canonical_example_en = excluded.canonical_example_en,
    semantic_scene = excluded.semantic_scene,
    quality_status = 'generated',
    notes = excluded.notes,
    updated_at = now()
  returning example_id
),
selected_example as (
  select example_id from upserted
  union all
  select example_id
  from meaning_examples
  where meaning_id = ${sqlString(meaningId)}
    and set_id = ${sqlString(setId)}
    and example_role = 'context'
  limit 1
)
insert into meaning_example_translations (
  example_id,
  language_code,
  example_text,
  quality_status
)
select
  example_id,
  'EN',
  ${sqlString(requireText(row, "context_example_en", line))},
  'generated'
from selected_example
on conflict (example_id, language_code) do update
set
  example_text = excluded.example_text,
  quality_status = 'generated',
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
  (${sqlString(batchId)}, 'meaning_unit', ${sqlString(meaningId)}, null, 'generated', 'base deck import'),
  (${sqlString(batchId)}, 'meaning_language_entry', ${sqlString(meaningId)}, 'EN', 'generated', 'base deck import')
on conflict do nothing;
`);
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(`${dryRun ? "Validated" : "Imported"} base deck data: set_id=${setId} rows=${rows.length} batch_id=${batchId}`);
