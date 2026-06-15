#!/usr/bin/env node
import {
  psqlExec,
  psqlJson,
  readRows,
  sqlJson,
  sqlLiteralList,
  sqlNullableString,
  sqlString,
} from "./lib/qa-utils.mjs";
import {
  buildBaseExampleNaturalnessFindings,
  formatBaseExampleNaturalnessBlocker,
} from "./lib/base-example-naturalness.mjs";
import { buildSemanticSceneAlignmentBlockers } from "./lib/semantic-scene-alignment.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-base-example-repair.mjs <base-example-repair.csv|jsonl> [--dry-run]");
}

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

const rows = await readRows(inputPath);
if (rows.length === 0) throw new Error(`No base example repair rows found in ${inputPath}`);

const setId = requireText(rows[0], "set_id", 2);
if (!/^[a-z0-9_]+$/.test(setId)) throw new Error(`Unsafe set_id: ${setId}`);

const meaningIds = new Set();
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  if (requireText(row, "set_id", line) !== setId) {
    throw new Error(`Line ${line}: all rows must use set_id=${setId}`);
  }
  meaningIds.add(requireText(row, "meaning_id", line));
  requireText(row, "current_canonical_example_en", line);
  requireText(row, "new_canonical_example_en", line);
  parseJsonField(row.new_semantic_scene, {});
  requireText(row, "source_note", line);
}

const currentRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    mu.meaning_id,
    mu.canonical_english,
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
    and msm.meaning_id in (${sqlLiteralList([...meaningIds])})
) rows;
`);

const currentByMeaning = new Map(currentRows.map((row) => [row.meaning_id, row]));
const blockers = [];
const repairedRows = [];
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const current = currentByMeaning.get(meaningId);
  if (!current) {
    blockers.push(`Line ${line}: no active context example for ${setId}/${meaningId}`);
    continue;
  }
  if (current.canonical_example_en !== requireText(row, "current_canonical_example_en", line)) {
    blockers.push(`Line ${line}: current_canonical_example_en mismatch for ${meaningId}`);
    continue;
  }
  const repaired = {
    ...current,
    canonical_example_en: requireText(row, "new_canonical_example_en", line),
    semantic_scene: parseJsonField(row.new_semantic_scene, {}),
  };
  repairedRows.push(repaired);
}

for (const blocker of buildBaseExampleNaturalnessFindings(repairedRows).blockers) {
  blockers.push(formatBaseExampleNaturalnessBlocker(blocker));
}
for (const blocker of buildSemanticSceneAlignmentBlockers(repairedRows)) {
  blockers.push(`${blocker.meaning_id}: ${blocker.issue}; example="${blocker.canonical_example_en}"`);
}

if (blockers.length > 0) {
  throw new Error(`Base example repair preflight failed:\n${blockers.join("\n")}`);
}

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `base_example_repair_${setId}_${timestamp}`;
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
  'translation',
  ${sqlString(`Base example repair for ${setId}`)},
  'structured_repair',
  'generated',
  now(),
  ${sqlString(inputPath)}
)
on conflict (batch_id) do nothing;
`);

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const currentExample = requireText(row, "current_canonical_example_en", line);
  const newExample = requireText(row, "new_canonical_example_en", line);
  const newScene = parseJsonField(row.new_semantic_scene, {});
  const sourceNote = requireText(row, "source_note", line);

  statements.push(`
do $$
declare
  repaired_example_id bigint;
begin
  update meaning_examples
  set
    canonical_example_en = ${sqlString(newExample)},
    semantic_scene = ${sqlJson(newScene)},
    quality_status = 'generated',
    notes = coalesce(notes, '') || ${sqlString(`\n${sourceNote}`)},
    updated_at = now()
  where set_id = ${sqlString(setId)}
    and meaning_id = ${sqlString(meaningId)}
    and example_role = 'context'
    and canonical_example_en = ${sqlString(currentExample)}
  returning example_id into repaired_example_id;

  if repaired_example_id is null then
    raise exception 'Base example repair update failed for %', ${sqlString(meaningId)};
  end if;

  update meaning_example_translations
  set
    example_text = case when language_code = 'EN' then ${sqlString(newExample)} else example_text end,
    quality_status = 'generated',
    updated_at = now()
  where example_id = repaired_example_id;
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
  'meaning_example',
  ${sqlString(meaningId)},
  'EN',
  'generated',
  ${sqlNullableString(sourceNote)}
)
on conflict do nothing;
`);
}

statements.push(dryRun ? "rollback;" : "commit;");
await psqlExec(statements.join("\n"));

console.log(`${dryRun ? "Validated" : "Imported"} base example repair: set_id=${setId} rows=${rows.length} batch_id=${batchId}`);
