import { readRows, parseContextExampleKey, psqlExec, sqlJson, sqlString } from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-review-decisions.mjs <review-decisions.csv|jsonl> [--dry-run]");
}

const allowedEntryFields = new Set([
  "native_word",
  "word_with_article_or_marker",
  "article_or_marker",
  "gender",
  "grammatical_number",
  "transcription",
  "usage_note",
]);
const allowedReviewStatuses = new Set(["approved", "generated_checked", "needs_review", "blocked"]);

const rows = (await readRows(inputPath)).filter((row) => row.review_status || row.corrected_value);
if (rows.length === 0) {
  throw new Error(`No review decisions found in ${inputPath}`);
}

const passId = `manual_review_${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")}`;
const statements = ["begin;"];
let imported = 0;

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const targetType = row.target_type;
  const targetKey = row.target_key;
  const languageCode = row.language_code;
  const field = row.field;
  const correctedValue = row.corrected_value ?? "";
  const reviewStatus = row.review_status || "needs_review";
  const reviewer = row.reviewer;
  const resultSummary = row.result_summary;

  if (!targetType || !targetKey || !languageCode || !field || !reviewer || !resultSummary) {
    throw new Error(`Line ${line}: target_type, target_key, language_code, field, reviewer and result_summary are required`);
  }
  if (!allowedReviewStatuses.has(reviewStatus)) {
    throw new Error(`Line ${line}: unsupported review_status=${reviewStatus}`);
  }
  if (reviewStatus === "approved" && languageCode !== "RU") {
    throw new Error(`Line ${line}: only RU can become approved through this manual review flow`);
  }

  const evidence = {
    importer: "import-review-decisions",
    input_file: inputPath,
    field,
  };

  if (targetType === "meaning_language_entry") {
    if (!allowedEntryFields.has(field)) {
      throw new Error(`Line ${line}: unsupported meaning_language_entry field=${field}`);
    }
    const statusColumn = field === "transcription" ? "pronunciation_status" : "quality_status";
    const updateField = correctedValue
      ? `${field} = ${sqlString(correctedValue)},`
      : "";
    statements.push(`
do $$
begin
  if not exists (
    select 1
    from meaning_language_entries
    where meaning_id = ${sqlString(targetKey)}
      and language_code = ${sqlString(languageCode)}
  ) then
    raise exception 'No exact language entry target for % / %', ${sqlString(targetKey)}, ${sqlString(languageCode)};
  end if;
end $$;
`);
    statements.push(`
update meaning_language_entries
set ${updateField}
    ${statusColumn} = ${sqlString(reviewStatus)},
    updated_at = now()
where meaning_id = ${sqlString(targetKey)}
  and language_code = ${sqlString(languageCode)};
`);
  } else if (targetType === "meaning_example_translation") {
    if (field !== "example_text") {
      throw new Error(`Line ${line}: unsupported meaning_example_translation field=${field}`);
    }
    const { setId, meaningId, exampleId } = parseContextExampleKey(targetKey);
    const updateField = correctedValue ? `example_text = ${sqlString(correctedValue)},` : "";
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
update meaning_example_translations
set ${updateField}
    quality_status = ${sqlString(reviewStatus)},
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
  } else {
    throw new Error(`Line ${line}: unsupported target_type=${targetType}`);
  }

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
  'manual_review',
  ${sqlString(resultSummary)},
  ${sqlString(reviewer)},
  now(),
  ${sqlString(passId)},
  'manual_review',
  ${sqlString(resultSummary)},
  'manual user review import',
  qa_checked_value_hash(
    ${sqlString(targetType)},
    ${sqlString(targetKey)},
    ${sqlString(languageCode)},
    'manual_review'
  ),
  ${sqlJson(evidence)}
);
`);
  imported += 1;
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(`${dryRun ? "Validated" : "Imported"} manual review decisions: ${imported}`);
