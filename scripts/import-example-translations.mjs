#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { psqlExec, psqlJson, readRows, sqlJson, sqlNullableString, sqlString } from "./lib/qa-utils.mjs";
import {
  targetSceneAlignmentProof,
  validateTargetSemanticSceneAlignment,
} from "./lib/target-semantic-scene-alignment.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-example-translations.mjs <rows.jsonl|rows.csv> [--dry-run]");
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

function optionalJsonish(row, field) {
  const value = row[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") return JSON.parse(value);
  return null;
}

async function readExampleRows(filePath) {
  if (path.extname(filePath).toLowerCase() !== ".json") {
    return readRows(filePath);
  }

  const payload = JSON.parse(await readFile(filePath, "utf8"));
  if (Array.isArray(payload.rows)) return payload.rows;

  if (
    typeof payload.set_id === "string" &&
    Array.isArray(payload.meaning_order) &&
    payload.languages &&
    typeof payload.languages === "object"
  ) {
    const rows = [];
    for (const [languageCode, examples] of Object.entries(payload.languages)) {
      if (!Array.isArray(examples)) {
        throw new Error(`Compact JSON language ${languageCode} must be an array`);
      }
      if (examples.length !== payload.meaning_order.length) {
        throw new Error(
          `Compact JSON language ${languageCode} has ${examples.length} examples, expected ${payload.meaning_order.length}`
        );
      }
      for (const [index, meaningId] of payload.meaning_order.entries()) {
        rows.push({
          set_id: payload.set_id,
          meaning_id: meaningId,
          language_code: languageCode,
          example_text: examples[index],
          source_note: payload.source_note ?? "",
          result_summary: payload.result_summary ?? "",
        });
      }
    }
    return rows;
  }

  throw new Error("JSON input must be either {rows:[...]} or compact {set_id, meaning_order, languages}");
}

const rows = await readExampleRows(inputPath);
if (rows.length === 0) {
  throw new Error(`No example translation rows found in ${inputPath}`);
}

const safeSetIdPattern = /^[a-z0-9_]+$/;
const setIds = new Set();
const languageCodes = new Set();
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const setId = requireText(row, "set_id", line);
  if (!safeSetIdPattern.test(setId)) throw new Error(`Line ${line}: unsafe set_id=${setId}`);
  setIds.add(setId);
  languageCodes.add(requireText(row, "language_code", line));
  requireText(row, "meaning_id", line);
  requireText(row, "example_text", line);
}

if (setIds.size !== 1) {
  throw new Error(`Input must contain exactly one set_id, got ${[...setIds].join(", ")}`);
}

const setId = [...setIds][0];
const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `example_translation_repair_${setId}_${timestamp}`;
const passId = `semantic_preservation_example_repair_${timestamp}`;
const statements = ["begin;"];
const requestedPairs = rows.map((row, index) => {
  const line = index + 2;
  return {
    line,
    meaning_id: requireText(row, "meaning_id", line),
    language_code: requireText(row, "language_code", line),
    example_text: requireText(row, "example_text", line),
  };
});

const alignmentRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
    requested.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word
  from (values ${requestedPairs.map((row) => `(${sqlString(row.meaning_id)}, ${sqlString(row.language_code)})`).join(", ")}) as requested(meaning_id, language_code)
  join meaning_set_memberships msm
    on msm.set_id = ${sqlString(setId)}
   and msm.meaning_id = requested.meaning_id
   and msm.quality_status <> 'blocked'
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  left join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
   and le.language_code = requested.language_code
  order by msm.display_order, requested.language_code
) rows;
`);
const alignmentRowsByKey = new Map(
  alignmentRows.map((row) => [`${row.meaning_id}::${row.language_code}`, row])
);
const alignmentProofByKey = new Map();

for (const row of requestedPairs) {
  const key = `${row.meaning_id}::${row.language_code}`;
  const current = alignmentRowsByKey.get(key);
  if (!current) {
    throw new Error(`Line ${row.line}: no active context example target for ${key} in ${setId}`);
  }
  const validationRow = {
    ...current,
    example_text: row.example_text,
    semantic_scene_proof:
      optionalJsonish(rows[row.line - 2] ?? {}, "semantic_scene_proof") ??
      optionalJsonish(rows[row.line - 2] ?? {}, "scene_alignment_proof") ??
      optionalJsonish(rows[row.line - 2] ?? {}, "target_semantic_scene_alignment"),
  };
  const issues = validateTargetSemanticSceneAlignment(validationRow);
  if (issues.length > 0) {
    throw new Error(
      `Line ${row.line}: target semantic scene alignment failed for ${key}: ${issues.join("; ")}`
    );
  }
  alignmentProofByKey.set(key, targetSceneAlignmentProof(validationRow));
}

statements.push(`
do $$
begin
  if not exists (select 1 from content_sets where set_id = ${sqlString(setId)}) then
    raise exception 'content_set % does not exist', ${sqlString(setId)};
  end if;

  if exists (
    select 1
    from (values ${[...languageCodes].map((code) => `(${sqlString(code)})`).join(", ")}) as requested(language_code)
    left join languages l on l.code = requested.language_code and l.is_active
    where l.code is null
  ) then
    raise exception 'Input contains an inactive or unknown language code';
  end if;
end $$;
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
  'translation',
  ${sqlString(`Example translation repair for ${setId}: ${languageCodes.size} languages`)},
  'codex_structured_repair',
  'generated_checked',
  now(),
  ${sqlString(inputPath)}
)
on conflict (batch_id) do nothing;
`);

let imported = 0;

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const languageCode = requireText(row, "language_code", line);
  const exampleText = requireText(row, "example_text", line);
  const sourceNote =
    optionalText(row, "source_note") ??
    "Codex repaired example translation from the canonical English semantic scene; AI/source-backed QA, not native-approved.";
  const resultSummary =
    optionalText(row, "result_summary") ??
    "Pass: translated example preserves the repaired English semantic scene, target display, object/action/location slots and simple usage.";
  const semanticSceneProof =
    optionalJsonish(row, "semantic_scene_proof") ??
    optionalJsonish(row, "scene_alignment_proof") ??
    optionalJsonish(row, "target_semantic_scene_alignment");

  statements.push(`
do $$
begin
  if not exists (
    select 1
    from meaning_set_memberships
    where set_id = ${sqlString(setId)}
      and meaning_id = ${sqlString(meaningId)}
      and quality_status <> 'blocked'
  ) then
    raise exception 'Meaning % is not active in set %', ${sqlString(meaningId)}, ${sqlString(setId)};
  end if;

  if not exists (
    select 1
    from meaning_examples
    where set_id = ${sqlString(setId)}
      and meaning_id = ${sqlString(meaningId)}
      and example_role = 'context'
  ) then
    raise exception 'Missing context example for % in set %', ${sqlString(meaningId)}, ${sqlString(setId)};
  end if;
end $$;
`);

  statements.push(`
with context_example as (
  select example_id
  from meaning_examples
  where set_id = ${sqlString(setId)}
    and meaning_id = ${sqlString(meaningId)}
    and example_role = 'context'
)
insert into meaning_example_translations (
  example_id,
  language_code,
  example_text,
  quality_status,
  usage_note
)
select
  example_id,
  ${sqlString(languageCode)},
  ${sqlString(exampleText)},
  'generated_checked',
  ${sqlNullableString(optionalText(row, "usage_note"))}
from context_example
on conflict (example_id, language_code) do update
set
  example_text = excluded.example_text,
  quality_status = 'generated_checked',
  usage_note = excluded.usage_note,
  updated_at = now();
`);

  const evidence = {
    importer: "import-example-translations",
    input_file: inputPath,
    set_id: setId,
    meaning_id: meaningId,
    language_code: languageCode,
    example_text: exampleText,
    repair_scope: `Example translation repair for ${setId}`,
    semantic_scene_proof: semanticSceneProof,
    target_semantic_scene_alignment: alignmentProofByKey.get(`${meaningId}::${languageCode}`) ?? null,
  };

  statements.push(`
with context_example as (
  select example_id
  from meaning_examples
  where set_id = ${sqlString(setId)}
    and meaning_id = ${sqlString(meaningId)}
    and example_role = 'context'
)
insert into qa_reviews (
  target_type,
  target_key,
  language_code,
  review_status,
  issue_type,
  notes,
  reviewer,
  reviewed_at,
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  checked_value_hash,
  evidence
)
select
  'meaning_example_translation',
  ${sqlString(setId)} || '::' || ${sqlString(meaningId)} || '::' || example_id::text,
  ${sqlString(languageCode)},
  'generated_checked',
  'semantic_preservation',
  ${sqlString(resultSummary)},
  'codex-example-repair',
  now(),
  ${sqlString(passId)},
  ${sqlString(batchId)},
  'semantic_preservation',
  ${sqlString(resultSummary)},
  ${sqlString(sourceNote)},
  qa_checked_value_hash('meaning_example_translation', ${sqlString(setId)} || '::' || ${sqlString(meaningId)} || '::' || example_id::text, ${sqlString(languageCode)}, 'semantic_preservation'),
  ${sqlJson(evidence)}
from context_example;
`);

  statements.push(`
insert into generation_batch_items (
  batch_id,
  target_type,
  target_key,
  language_code,
  quality_status,
  notes
)
select
  ${sqlString(batchId)},
  'meaning_example',
  ${sqlString(setId)} || '::' || ${sqlString(meaningId)} || '::' || example_id::text,
  ${sqlString(languageCode)},
  'generated_checked',
  'example translation repair import'
from meaning_examples
where set_id = ${sqlString(setId)}
  and meaning_id = ${sqlString(meaningId)}
  and example_role = 'context'
on conflict do nothing;
`);

  imported += 1;
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(
  `${dryRun ? "Validated" : "Imported"} example translations: set_id=${setId} languages=${languageCodes.size} rows=${imported} batch_id=${batchId}`
);
