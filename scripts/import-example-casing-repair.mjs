#!/usr/bin/env node
import { psqlExec, readRows, sqlJson, sqlString } from "./lib/qa-utils.mjs";
import {
  isSingleInitialCasingRepair,
  sentenceCaseLanguageCodes,
  validateExampleCasing,
} from "./lib/example-casing.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const languagesArg = args.find((arg) => arg.startsWith("--languages="));
const selectedLanguages = languagesArg
  ? new Set(
      languagesArg
        .slice("--languages=".length)
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean)
    )
  : null;

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/import-example-casing-repair.mjs <repair.jsonl|repair.csv> [--languages=A,B,C] [--dry-run]"
  );
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

const allRows = await readRows(inputPath);
const rows = selectedLanguages ? allRows.filter((row) => selectedLanguages.has(row.language_code)) : allRows;

if (rows.length === 0) {
  throw new Error(`No selected example casing repair rows found in ${inputPath}`);
}

const safeSetIdPattern = /^[a-z0-9_]+$/;
const setIds = new Set();
const languageCodes = new Set();

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const setId = requireText(row, "set_id", line);
  const languageCode = requireText(row, "language_code", line);
  const before = requireText(row, "before_example_text", line);
  const repaired = requireText(row, "repaired_example_text", line);

  if (!safeSetIdPattern.test(setId)) throw new Error(`Line ${line}: unsafe set_id=${setId}`);
  if (!sentenceCaseLanguageCodes.has(languageCode)) {
    throw new Error(`Line ${line}: ${languageCode} is not a sentence-case repair language`);
  }
  if (!validateExampleCasing({ language_code: languageCode, example_text: before }).length) {
    throw new Error(`Line ${line}: before_example_text has no sentence-case issue`);
  }
  if (validateExampleCasing({ language_code: languageCode, example_text: repaired }).length) {
    throw new Error(`Line ${line}: repaired_example_text still violates sentence-case policy`);
  }
  if (!isSingleInitialCasingRepair(before, repaired, languageCode)) {
    throw new Error(`Line ${line}: repair must change only the first cased letter`);
  }

  setIds.add(setId);
  languageCodes.add(languageCode);
  requireText(row, "meaning_id", line);
  requireText(row, "example_id", line);
}

if (setIds.size !== 1) {
  throw new Error(`Input must contain exactly one set_id per import, got ${[...setIds].join(", ")}`);
}

if (languageCodes.size > 3) {
  throw new Error(`Example casing repair imports must contain at most 3 languages, got ${[...languageCodes].join(", ")}`);
}

if (selectedLanguages && selectedLanguages.size !== languageCodes.size) {
  throw new Error(
    `Requested languages ${[...selectedLanguages].join(", ")} but selected rows contain ${[...languageCodes].join(", ")}`
  );
}

const setId = [...setIds][0];
const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `example_casing_repair_${setId}_${timestamp}`;
const passId = `semantic_preservation_example_casing_${timestamp}`;
const statements = ["begin;"];

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
  ${sqlString(`Example casing repair for ${setId}: ${[...languageCodes].join(", ")}`)},
  'codex_deterministic_casing_repair',
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
  const exampleId = requireText(row, "example_id", line);
  const languageCode = requireText(row, "language_code", line);
  const before = requireText(row, "before_example_text", line);
  const repaired = requireText(row, "repaired_example_text", line);
  const resultSummary =
    optionalText(row, "result_summary") ??
    "Pass: casing-only repair uppercases the first cased letter according to target-language sentence-case policy; semantic scene is unchanged.";
  const sourceNote =
    optionalText(row, "source_note") ??
    "Deterministic example casing policy repair; only the first cased letter changed, with no lexical or semantic edit.";

  const evidence = {
    importer: "import-example-casing-repair",
    input_file: inputPath,
    set_id: setId,
    meaning_id: meaningId,
    example_id: exampleId,
    language_code: languageCode,
    repair_type: "sentence_case_initial_uppercase",
    before_example_text: before,
    repaired_example_text: repaired,
  };

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
      and example_id = ${sqlString(exampleId)}::bigint
      and example_role = 'context'
  ) then
    raise exception 'Missing context example % for % in set %', ${sqlString(exampleId)}, ${sqlString(meaningId)}, ${sqlString(setId)};
  end if;

  if not exists (
    select 1
    from meaning_example_translations
    where example_id = ${sqlString(exampleId)}::bigint
      and language_code = ${sqlString(languageCode)}
      and example_text = ${sqlString(before)}
  ) then
    raise exception 'Current example text does not match repair input for % % %', ${sqlString(setId)}, ${sqlString(meaningId)}, ${sqlString(languageCode)};
  end if;
end $$;
`);

  statements.push(`
update meaning_example_translations
set
  example_text = ${sqlString(repaired)},
  quality_status = 'generated_checked',
  updated_at = now()
where example_id = ${sqlString(exampleId)}::bigint
  and language_code = ${sqlString(languageCode)};
`);

  statements.push(`
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
) values (
  'meaning_example_translation',
  ${sqlString(`${setId}::${meaningId}::${exampleId}`)},
  ${sqlString(languageCode)},
  'generated_checked',
  'semantic_preservation',
  ${sqlString(resultSummary)},
  'codex-example-casing-repair',
  now(),
  ${sqlString(passId)},
  ${sqlString(batchId)},
  'semantic_preservation',
  ${sqlString(resultSummary)},
  ${sqlString(sourceNote)},
  qa_checked_value_hash('meaning_example_translation', ${sqlString(`${setId}::${meaningId}::${exampleId}`)}, ${sqlString(languageCode)}, 'semantic_preservation'),
  ${sqlJson(evidence)}
);
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
  ${sqlString(exampleId)},
  ${sqlString(languageCode)},
  'generated_checked',
  'example casing repair import'
)
on conflict do nothing;
`);

  imported += 1;
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(
  `${dryRun ? "Validated" : "Imported"} example casing repairs: set_id=${setId} languages=${[...languageCodes].join(",")} rows=${imported} batch_id=${batchId}`
);
