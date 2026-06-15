#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlString } from "./lib/qa-utils.mjs";
import {
  sentenceCaseLanguageCodes,
  uppercaseFirstCasedLetter,
  validateExampleCasing,
} from "./lib/example-casing.mjs";

const args = process.argv.slice(2);
const setId = args.find((arg) => !arg.startsWith("--")) ?? "";
const outputArg = args.find((arg) => arg.startsWith("--output="));
const outputDirArg = args.find((arg) => arg.startsWith("--output-dir="));

if (!setId) {
  throw new Error("Usage: node scripts/export-example-casing-repair.mjs <set_id> [--output=path]");
}

assertSafeSetId(setId);

const outputPath =
  outputArg?.slice("--output=".length) ??
  path.join(
    outputDirArg?.slice("--output-dir=".length) ?? "outputs/import",
    `${setId}_repair_example_casing_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.jsonl`
  );

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    e.example_id,
    et.language_code,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order, et.language_code
) rows;
`);

const repairs = [];
for (const row of rows) {
  if (!sentenceCaseLanguageCodes.has(row.language_code)) continue;
  const issues = validateExampleCasing(row);
  if (!issues.length) continue;
  const repaired = uppercaseFirstCasedLetter(row.example_text, row.language_code);
  repairs.push({
    set_id: row.set_id,
    meaning_id: row.meaning_id,
    example_id: String(row.example_id),
    language_code: row.language_code,
    before_example_text: row.example_text,
    repaired_example_text: repaired,
    repair_type: "sentence_case_initial_uppercase",
    result_summary:
      "Pass: casing-only repair uppercases the first cased letter according to target-language sentence-case policy; semantic scene is unchanged.",
    source_note:
      "Deterministic example casing policy repair; only the first cased letter changed, with no lexical or semantic edit.",
  });
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, repairs.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");

console.log(`Exported example casing repairs: set_id=${setId} rows=${repairs.length} path=${outputPath}`);
