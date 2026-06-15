import { readRows, parseContextExampleKey, psqlExec, sqlJson, sqlNullableString, sqlString } from "./lib/qa-utils.mjs";

const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node scripts/import-semantic-qa-results.mjs <results.csv|results.jsonl>");
}

const rows = await readRows(inputPath);
if (rows.length === 0) {
  throw new Error(`No QA result rows found in ${inputPath}`);
}

const statements = ["begin;"];
let passCount = 0;
let reviewCount = 0;

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const targetType = row.target_type ?? "meaning_example_translation";
  const targetKey = row.target_key ?? row.context_example_key;
  const languageCode = row.language_code;
  const result = String(row.result ?? "").toLowerCase();
  const reviewer = row.reviewer;
  const passId = row.pass_id;
  const batchId = row.batch_id;
  const checkFamily = row.check_family ?? "semantic_preservation";
  const resultSummary = row.result_summary;
  const sourceNote = row.source_note ?? "";

  if (targetType !== "meaning_example_translation") {
    throw new Error(`Line ${line}: semantic QA import only supports target_type=meaning_example_translation`);
  }
  if (!targetKey || !languageCode || !result || !reviewer || !resultSummary || !passId) {
    throw new Error(`Line ${line}: target_key, language_code, result, reviewer, pass_id and result_summary are required`);
  }
  if (checkFamily !== "semantic_preservation") {
    throw new Error(`Line ${line}: check_family must be semantic_preservation`);
  }
  if (!passId.startsWith("semantic_preservation_")) {
    throw new Error(`Line ${line}: pass_id must start with semantic_preservation_`);
  }
  if (!["pass", "fail", "needs_review"].includes(result)) {
    throw new Error(`Line ${line}: result must be pass, fail or needs_review`);
  }

  const { setId, meaningId, exampleId } = parseContextExampleKey(targetKey);
  const reviewStatus = result === "pass" ? "generated_checked" : "needs_review";
  const nextContentStatus = result === "pass" ? "generated_checked" : "needs_review";
  const evidence = {
    importer: "import-semantic-qa-results",
    result,
    input_file: inputPath,
  };

  statements.push(`
do $$
begin
  if not exists (
    select 1
    from meaning_examples e
    join meaning_example_translations et on et.example_id = e.example_id
    where e.set_id = ${sqlString(setId)}
      and e.meaning_id = ${sqlString(meaningId)}
      and e.example_id = ${exampleId}
      and et.language_code = ${sqlString(languageCode)}
  ) then
    raise exception 'No exact example translation target for % / %', ${sqlString(targetKey)}, ${sqlString(languageCode)};
  end if;
end $$;
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
  ${sqlString(targetType)},
  ${sqlString(targetKey)},
  ${sqlString(languageCode)},
  ${sqlString(reviewStatus)},
  ${sqlString(checkFamily)},
  ${sqlString(resultSummary)},
  ${sqlString(reviewer)},
  now(),
  ${sqlNullableString(passId)},
  ${sqlNullableString(batchId)},
  ${sqlString(checkFamily)},
  ${sqlString(resultSummary)},
  ${sqlNullableString(sourceNote)},
  qa_checked_value_hash(
    ${sqlString(targetType)},
    ${sqlString(targetKey)},
    ${sqlString(languageCode)},
    ${sqlString(checkFamily)}
  ),
  ${sqlJson(evidence)}
);

update meaning_example_translations
set quality_status = ${sqlString(nextContentStatus)},
    updated_at = now()
where example_id = ${exampleId}
  and language_code = ${sqlString(languageCode)}
  and exists (
    select 1
    from meaning_examples e
    where e.example_id = ${exampleId}
      and e.set_id = ${sqlString(setId)}
      and e.meaning_id = ${sqlString(meaningId)}
  );
`);

  if (result === "pass") passCount += 1;
  else reviewCount += 1;
}

statements.push("commit;");

await psqlExec(statements.join("\n"));

console.log(`Imported semantic QA results: pass=${passCount}, needs_review_or_fail=${reviewCount}`);
