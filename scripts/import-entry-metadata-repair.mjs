#!/usr/bin/env node
import {
  psqlExec,
  psqlJson,
  readRows,
  sqlLiteralList,
  sqlNullableString,
  sqlString,
} from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-entry-metadata-repair.mjs <entry-metadata-repair.csv|jsonl> [--dry-run]");
}

function requireText(row, field, line) {
  const value = row[field];
  if (typeof value !== "string") {
    throw new Error(`Line ${line}: ${field} is required`);
  }
  return value.trim();
}

function optionalText(row, field) {
  const value = row[field];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeNullable(value) {
  return value === null || value === undefined ? "" : String(value);
}

const rows = await readRows(inputPath);
if (rows.length === 0) throw new Error(`No entry metadata repair rows found in ${inputPath}`);

const setId = requireText(rows[0], "set_id", 2);
if (!/^[a-z0-9_]+$/.test(setId)) throw new Error(`Unsafe set_id: ${setId}`);

const languageCodes = new Set();
const meaningIds = new Set();
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  if (requireText(row, "set_id", line) !== setId) {
    throw new Error(`Line ${line}: all rows must use set_id=${setId}`);
  }
  languageCodes.add(requireText(row, "language_code", line));
  meaningIds.add(requireText(row, "meaning_id", line));
  requireText(row, "current_native_word", line);
  requireText(row, "current_display_word", line);
  requireText(row, "source_note", line);
}

if (languageCodes.size > 3) {
  throw new Error(`Entry metadata repair import may contain at most 3 languages, got ${languageCodes.size}`);
}

const currentRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    le.meaning_id,
    le.language_code,
    le.native_word,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.article_or_marker,
    le.gender,
    le.grammatical_number
  from meaning_set_memberships msm
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
    and le.meaning_id in (${sqlLiteralList([...meaningIds])})
    and le.language_code in (${sqlLiteralList([...languageCodes])})
) rows;
`);

const currentByKey = new Map(currentRows.map((row) => [`${row.meaning_id}::${row.language_code}`, row]));
const blockers = [];
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const languageCode = requireText(row, "language_code", line);
  const current = currentByKey.get(`${meaningId}::${languageCode}`);
  if (!current) {
    blockers.push(`Line ${line}: no active language entry for ${setId}/${meaningId}/${languageCode}`);
    continue;
  }
  if (current.native_word !== requireText(row, "current_native_word", line)) {
    blockers.push(`Line ${line}: current_native_word mismatch for ${meaningId}/${languageCode}`);
  }
  if (current.display_word !== requireText(row, "current_display_word", line)) {
    blockers.push(`Line ${line}: current_display_word mismatch for ${meaningId}/${languageCode}`);
  }
  if (normalizeNullable(current.article_or_marker) !== requireText(row, "current_article_or_marker", line)) {
    blockers.push(`Line ${line}: current_article_or_marker mismatch for ${meaningId}/${languageCode}`);
  }
  if (normalizeNullable(current.gender) !== requireText(row, "current_gender", line)) {
    blockers.push(`Line ${line}: current_gender mismatch for ${meaningId}/${languageCode}`);
  }
  if (normalizeNullable(current.grammatical_number) !== requireText(row, "current_grammatical_number", line)) {
    blockers.push(`Line ${line}: current_grammatical_number mismatch for ${meaningId}/${languageCode}`);
  }
}

if (blockers.length > 0) {
  throw new Error(`Entry metadata repair preflight failed:\n${blockers.join("\n")}`);
}

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `entry_metadata_repair_${setId}_${[...languageCodes].join("_").toLowerCase()}_${timestamp}`;
const statements = ["begin;"];

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
  'qa',
  ${sqlString(`Entry metadata repair for ${setId}: ${[...languageCodes].join(",")}`)},
  'structured_metadata_repair',
  'generated',
  now(),
  ${sqlString(inputPath)}
)
on conflict (batch_id) do nothing;
`);

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const languageCode = requireText(row, "language_code", line);
  const sourceNote = requireText(row, "source_note", line);

  statements.push(`
do $$
begin
  update meaning_language_entries
  set
    article_or_marker = ${sqlNullableString(optionalText(row, "new_article_or_marker"))},
    gender = ${sqlNullableString(optionalText(row, "new_gender"))},
    grammatical_number = ${sqlNullableString(optionalText(row, "new_grammatical_number"))},
    quality_status = 'generated',
    updated_at = now()
  where meaning_id = ${sqlString(meaningId)}
    and language_code = ${sqlString(languageCode)}
    and native_word = ${sqlString(requireText(row, "current_native_word", line))}
    and coalesce(word_with_article_or_marker, native_word) = ${sqlString(requireText(row, "current_display_word", line))}
    and coalesce(article_or_marker, '') = ${sqlString(requireText(row, "current_article_or_marker", line))}
    and coalesce(gender, '') = ${sqlString(requireText(row, "current_gender", line))}
    and coalesce(grammatical_number, '') = ${sqlString(requireText(row, "current_grammatical_number", line))};

  if not found then
    raise exception 'Entry metadata repair update failed for %/%', ${sqlString(meaningId)}, ${sqlString(languageCode)};
  end if;
end $$;
`);

  statements.push(`
insert into generation_batch_items (
  batch_id,
  target_type,
  target_key,
  language_code,
  quality_status,
  notes
) values (
  ${sqlString(batchId)},
  'meaning_language_entry',
  ${sqlString(meaningId)},
  ${sqlString(languageCode)},
  'generated',
  ${sqlString(sourceNote)}
)
on conflict do nothing;
`);
}

statements.push(dryRun ? "rollback;" : "commit;");
await psqlExec(statements.join("\n"));

console.log(`${dryRun ? "Validated" : "Imported"} entry metadata repair: set_id=${setId} languages=${[...languageCodes].join(",")} rows=${rows.length} batch_id=${batchId}`);
