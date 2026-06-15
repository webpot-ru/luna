import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlString, toCsv } from "./lib/qa-utils.mjs";

const [setIdArg, ...args] = process.argv.slice(2);
const setId = setIdArg ?? "home_kitchen_cookware_pilot_01";
const languageCode = args.find((arg) => arg.startsWith("--language="))?.split("=")[1] ?? "RU";

assertSafeSetId(setId);

if (!/^[A-Z0-9-]+$/.test(languageCode)) {
  throw new Error(`Unsafe language code: ${languageCode}`);
}

const sql = `
with review_rows as (
  select
    msm.display_order,
    mu.meaning_id,
    e.example_id,
    ${sqlString(setId)} || '::' || mu.meaning_id || '::' || e.example_id::text as context_example_key,
    le.word_with_article_or_marker,
    le.transcription,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.meaning_id = mu.meaning_id
   and e.set_id = msm.set_id
   and e.example_role = 'context'
  left join meaning_language_entries le
    on le.meaning_id = mu.meaning_id
   and le.language_code = ${sqlString(languageCode)}
  left join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = ${sqlString(languageCode)}
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order
)
select coalesce(json_agg(row_to_json(template_rows)), '[]'::json)
from (
  select
    display_order,
    'meaning_language_entry' as target_type,
    meaning_id as target_key,
    ${sqlString(languageCode)} as language_code,
    'word_with_article_or_marker' as field,
    word_with_article_or_marker as current_value,
    '' as corrected_value,
    '' as review_status,
    '' as reviewer,
    '' as result_summary
  from review_rows

  union all
  select
    display_order,
    'meaning_language_entry',
    meaning_id,
    ${sqlString(languageCode)},
    'transcription',
    transcription,
    '',
    '',
    '',
    ''
  from review_rows

  union all
  select
    display_order,
    'meaning_example_translation',
    context_example_key,
    ${sqlString(languageCode)},
    'example_text',
    example_text,
    '',
    '',
    '',
    ''
  from review_rows
  order by display_order, target_type, field
) template_rows;
`;

const rows = await psqlJson(sql);
const headers = [
  "target_type",
  "target_key",
  "language_code",
  "field",
  "current_value",
  "corrected_value",
  "review_status",
  "reviewer",
  "result_summary",
];
const outputDir = path.resolve("outputs/review");
const outputPath = path.join(outputDir, `review_decisions_${setId}_${languageCode}.csv`);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, toCsv(rows, headers) + "\n", "utf8");

console.log(outputPath);
console.log(`Review decision rows: ${rows.length}`);
