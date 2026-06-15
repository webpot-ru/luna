import {
  parseContextExampleKey,
  psqlExec,
  psqlJson,
  readRows,
  sqlJson,
  sqlNullableString,
  sqlString,
} from "./lib/qa-utils.mjs";
import { validateTranscriptionShape } from "./lib/transcription-shape.mjs";
import { validateIpaTranscriptionSanity } from "./lib/ipa-transcription-sanity.mjs";
import { validateTargetExamplePedagogicalQuality } from "./lib/target-example-pedagogical-quality.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const bulkMode = args.includes("--bulk");

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/import-ai-qa-results.mjs <results.csv|results.jsonl> [--dry-run] [--bulk]"
  );
}

const allowedResults = new Set(["pass", "fail", "needs_review"]);
const checkFamilies = new Map([
  [
    "word_selection_quality",
    {
      targetType: "content_set",
      passPrefix: "word_selection_quality_",
      statusColumn: "quality_status",
    },
  ],
  [
    "base_example_alignment",
    {
      targetType: "meaning_example",
      passPrefix: "base_example_alignment_",
      statusColumn: "quality_status",
    },
  ],
  [
    "example_quality",
    {
      targetType: "meaning_example",
      passPrefix: "example_quality_",
      statusColumn: "quality_status",
    },
  ],
  [
    "semantic_preservation",
    {
      targetType: "meaning_example_translation",
      passPrefix: "semantic_preservation_",
      statusColumn: "quality_status",
    },
  ],
  [
    "target_example_naturalness",
    {
      targetType: "meaning_example_translation",
      passPrefix: "target_example_naturalness_",
      statusColumn: "quality_status",
    },
  ],
  [
    "target_example_lexical_anchor",
    {
      targetType: "meaning_example_translation",
      passPrefix: "target_example_lexical_anchor_",
      statusColumn: "quality_status",
    },
  ],
  [
    "target_example_pedagogical_quality",
    {
      targetType: "meaning_example_translation",
      passPrefix: "target_example_pedagogical_quality_",
      statusColumn: "quality_status",
    },
  ],
  [
    "number_example_grammar",
    {
      targetType: "meaning_example_translation",
      passPrefix: "number_example_grammar_",
      statusColumn: "quality_status",
    },
  ],
  [
    "regional_variant_quality",
    {
      targetType: "meaning_example_translation",
      passPrefix: "regional_variant_quality_",
      statusColumn: "quality_status",
    },
  ],
  [
    "entry_form",
    {
      targetType: "meaning_language_entry",
      passPrefix: "entry_form_",
      statusColumn: "quality_status",
    },
  ],
  [
    "entry_form_register",
    {
      targetType: "meaning_language_entry",
      passPrefix: "entry_form_register_",
      statusColumn: "quality_status",
    },
  ],
  [
    "semantic_granularity",
    {
      targetType: "meaning_language_entry",
      passPrefix: "semantic_granularity_",
      statusColumn: "quality_status",
    },
  ],
  [
    "article_gender_marker_consistency",
    {
      targetType: "meaning_language_entry",
      passPrefix: "article_gender_marker_consistency_",
      statusColumn: "quality_status",
    },
  ],
  [
    "transcription_policy",
    {
      targetType: "meaning_language_entry",
      passPrefix: "transcription_policy_",
      statusColumn: "pronunciation_status",
    },
  ],
  [
    "pronunciation_accuracy",
    {
      targetType: "meaning_language_entry",
      passPrefix: "pronunciation_accuracy_",
      statusColumn: "pronunciation_status",
    },
  ],
]);

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function normalizedResult(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseCardKey(targetKey) {
  const parts = String(targetKey ?? "").split("::");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Expected card key set_id::meaning_id, got: ${targetKey}`);
  }
  return {
    setId: parts[0],
    meaningId: parts[1],
  };
}

function requireText(row, field, line) {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Line ${line}: ${field} is required`);
  }
  return value.trim();
}

function buildEvidence(row, inputFile) {
  const issues = parseJsonField(row.issues, []);
  const rowEvidence = parseJsonField(row.evidence, {});
  return {
    importer: "import-ai-qa-results",
    input_file: inputFile,
    result: normalizedResult(row.result),
    issues: Array.isArray(issues) ? issues : [issues],
    confidence: row.confidence === undefined || row.confidence === "" ? null : Number(row.confidence),
    runner_evidence: rowEvidence && typeof rowEvidence === "object" ? rowEvidence : { raw: rowEvidence },
  };
}

function hasDryRunOrSyntheticMarker(row) {
  const reviewer = String(row.reviewer ?? "").toLowerCase();
  const sourceNote = String(row.source_note ?? "").toLowerCase();
  const issues = parseJsonField(row.issues, []);
  const rowEvidence = parseJsonField(row.evidence, {});
  const issueList = Array.isArray(issues) ? issues : [issues];

  return (
    reviewer.includes("dry-run") ||
    reviewer.includes("dry_run") ||
    reviewer.includes("synthetic") ||
    sourceNote.includes("dry-run") ||
    sourceNote.includes("dry_run") ||
    sourceNote.includes("synthetic") ||
    issueList.some((issue) => String(issue ?? "").toLowerCase().includes("dry_run")) ||
    issueList.some((issue) => String(issue ?? "").toLowerCase().includes("dry-run")) ||
    rowEvidence?.dry_run === true ||
    rowEvidence?.synthetic === true ||
    rowEvidence?.runner_evidence?.dry_run === true ||
    rowEvidence?.runner_evidence?.synthetic === true
  );
}

function validateRow(row, inputFile, line) {
  const targetType = requireText(row, "target_type", line);
  const targetKey = requireText(row, "target_key", line);
  const languageCode = requireText(row, "language_code", line);
  const result = normalizedResult(row.result);
  const reviewer = requireText(row, "reviewer", line);
  const passId = requireText(row, "pass_id", line);
  const checkFamily = requireText(row, "check_family", line);
  const resultSummary = requireText(row, "result_summary", line);
  const batchId = row.batch_id ?? "";
  const sourceNote = row.source_note ?? "";

  if (!allowedResults.has(result)) {
    throw new Error(`Line ${line}: result must be pass, fail or needs_review`);
  }
  if (result === "pass" && hasDryRunOrSyntheticMarker(row)) {
    throw new Error(`Line ${line}: dry-run/synthetic QA output cannot be imported as a pass decision`);
  }

  const checkConfig = checkFamilies.get(checkFamily);
  if (!checkConfig) {
    throw new Error(`Line ${line}: unsupported check_family=${checkFamily}`);
  }
  if (targetType !== checkConfig.targetType) {
    throw new Error(`Line ${line}: ${checkFamily} requires target_type=${checkConfig.targetType}`);
  }
  if (!passId.startsWith(checkConfig.passPrefix)) {
    throw new Error(`Line ${line}: pass_id must start with ${checkConfig.passPrefix}`);
  }

  if (checkFamily === "word_selection_quality") {
    parseCardKey(targetKey);
    if (languageCode !== "EN") {
      throw new Error(`Line ${line}: word_selection_quality uses language_code=EN`);
    }
  } else if (
    checkFamily === "semantic_preservation" ||
    checkFamily === "target_example_naturalness" ||
    checkFamily === "target_example_lexical_anchor" ||
    checkFamily === "target_example_pedagogical_quality" ||
    checkFamily === "regional_variant_quality"
  ) {
    parseContextExampleKey(targetKey);
  } else if (checkFamily === "base_example_alignment" || checkFamily === "example_quality") {
    if (!/^\d+$/.test(targetKey)) {
      throw new Error(`Line ${line}: ${checkFamily} target_key must be numeric example_id`);
    }
    if (languageCode !== "EN") {
      throw new Error(`Line ${line}: ${checkFamily} uses language_code=EN`);
    }
  }

  return {
    targetType,
    targetKey,
    languageCode,
    result,
    reviewer,
    passId,
    checkFamily,
    resultSummary,
    batchId,
    sourceNote,
    reviewStatus: result === "pass" ? "generated_checked" : "needs_review",
    evidence: buildEvidence(row, inputFile),
  };
}

async function importBulk(validRows, dryRun) {
  if (validRows.some((row) => row.checkFamily === "transcription_policy" || row.checkFamily === "pronunciation_accuracy")) {
    throw new Error(
      "--bulk does not support transcription_policy or pronunciation_accuracy because it must run current-row transcription validation"
    );
  }

  const statements = ["begin;"];
  statements.push(`
create temporary table qa_import_results (
  target_type text not null,
  target_key text not null,
  language_code text not null,
  result text not null,
  review_status text not null,
  reviewer text not null,
  pass_id text not null,
  batch_id text,
  check_family text not null,
  result_summary text not null,
  source_note text,
  evidence jsonb not null
) on commit drop;
`);

  const values = validRows.map(
    (row) => `(
  ${sqlString(row.targetType)},
  ${sqlString(row.targetKey)},
  ${sqlString(row.languageCode)},
  ${sqlString(row.result)},
  ${sqlString(row.reviewStatus)},
  ${sqlString(row.reviewer)},
  ${sqlString(row.passId)},
  ${sqlNullableString(row.batchId)},
  ${sqlString(row.checkFamily)},
  ${sqlString(row.resultSummary)},
  ${sqlNullableString(row.sourceNote)},
  ${sqlJson(row.evidence)}
)`
  );

  statements.push(`
insert into qa_import_results (
  target_type,
  target_key,
  language_code,
  result,
  review_status,
  reviewer,
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  evidence
) values
${values.join(",\n")};
`);

  statements.push(`
do $$
declare
  missing text;
begin
  select string_agg(target_key || '/' || language_code, ', ' order by target_key, language_code)
  into missing
  from qa_import_results r
  where r.check_family = 'word_selection_quality'
    and not exists (
      select 1
      from meaning_set_memberships m
      where m.set_id = split_part(r.target_key, '::', 1)
        and m.meaning_id = split_part(r.target_key, '::', 2)
    );
  if missing is not null then
    raise exception 'Missing word_selection_quality targets: %', missing;
  end if;

  select string_agg(target_key || '/' || language_code, ', ' order by target_key, language_code)
  into missing
  from qa_import_results r
  where r.check_family in (
	    'semantic_preservation',
	    'target_example_naturalness',
	    'target_example_lexical_anchor',
	    'target_example_pedagogical_quality',
	    'regional_variant_quality'
  )
    and not exists (
      select 1
      from meaning_examples e
      join meaning_example_translations et on et.example_id = e.example_id
      where e.set_id = split_part(r.target_key, '::', 1)
        and e.meaning_id = split_part(r.target_key, '::', 2)
        and e.example_id = split_part(r.target_key, '::', 3)::integer
        and et.language_code = r.language_code
    );
  if missing is not null then
    raise exception 'Missing example translation targets: %', missing;
  end if;

  select string_agg(target_key || '/' || language_code, ', ' order by target_key, language_code)
  into missing
  from qa_import_results r
  where r.check_family in ('base_example_alignment', 'example_quality')
    and not exists (
      select 1
      from meaning_examples e
      where e.example_id = r.target_key::integer
        and e.example_role = 'context'
    );
  if missing is not null then
    raise exception 'Missing base example targets: %', missing;
  end if;

  select string_agg(target_key || '/' || language_code, ', ' order by target_key, language_code)
  into missing
  from qa_import_results r
  where r.check_family in (
	    'entry_form',
	    'entry_form_register',
	    'semantic_granularity',
	    'article_gender_marker_consistency',
	    'pronunciation_accuracy'
  )
    and not exists (
      select 1
      from meaning_language_entries le
      where le.meaning_id = r.target_key
        and le.language_code = r.language_code
    );
  if missing is not null then
    raise exception 'Missing language entry targets: %', missing;
  end if;
end $$;
`);

  statements.push(`
update meaning_set_memberships m
set quality_status = case when r.result = 'pass' then 'generated_checked' else 'needs_review' end,
    updated_at = now()
from qa_import_results r
where r.check_family = 'word_selection_quality'
  and m.set_id = split_part(r.target_key, '::', 1)
  and m.meaning_id = split_part(r.target_key, '::', 2)
  and m.quality_status <> 'approved';
`);

  statements.push(`
update meaning_example_translations et
set quality_status = case when r.result = 'pass' then 'generated_checked' else 'needs_review' end,
    updated_at = now()
from qa_import_results r
join meaning_examples e
  on e.set_id = split_part(r.target_key, '::', 1)
 and e.meaning_id = split_part(r.target_key, '::', 2)
 and e.example_id = split_part(r.target_key, '::', 3)::integer
where r.check_family = 'semantic_preservation'
  and et.example_id = e.example_id
  and et.language_code = r.language_code;
`);

  statements.push(`
update meaning_examples e
set quality_status = case when r.result = 'pass' then 'generated_checked' else 'needs_review' end,
    updated_at = now()
from qa_import_results r
where r.check_family in ('base_example_alignment', 'example_quality')
  and e.example_id = r.target_key::integer
  and e.example_role = 'context';
`);

  statements.push(`
update meaning_language_entries le
set quality_status = case when r.result = 'pass' then 'generated_checked' else 'needs_review' end,
    updated_at = now()
from qa_import_results r
where r.check_family = 'entry_form'
  and le.meaning_id = r.target_key
  and le.language_code = r.language_code;
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
)
select
  target_type,
  target_key,
  language_code,
  review_status,
  check_family,
  result_summary,
  reviewer,
  now(),
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  qa_checked_value_hash(target_type, target_key, language_code, check_family),
  evidence
from qa_import_results;
`);

  statements.push(dryRun ? "rollback;" : "commit;");
  await psqlExec(statements.join("\n"));
}

const rows = await readRows(inputPath);
if (rows.length === 0) {
  throw new Error(`No AI QA result rows found in ${inputPath}`);
}

if (bulkMode) {
  let passCount = 0;
  let reviewCount = 0;
  const validRows = rows.map((row, index) => {
    const validRow = validateRow(row, inputPath, index + 2);
    if (validRow.result === "pass") passCount += 1;
    else reviewCount += 1;
    return validRow;
  });

  await importBulk(validRows, dryRun);

  console.log(
    `${dryRun ? "Validated" : "Imported"} AI QA results: pass=${passCount}, needs_review_or_fail=${reviewCount}`
  );
  process.exit(0);
}

const statements = ["begin;"];
let passCount = 0;
let reviewCount = 0;

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const targetType = requireText(row, "target_type", line);
  const targetKey = requireText(row, "target_key", line);
  const languageCode = requireText(row, "language_code", line);
  const result = normalizedResult(row.result);
  const reviewer = requireText(row, "reviewer", line);
  const passId = requireText(row, "pass_id", line);
  const checkFamily = requireText(row, "check_family", line);
  const resultSummary = requireText(row, "result_summary", line);
  const batchId = row.batch_id ?? "";
  const sourceNote = row.source_note ?? "";

  if (!allowedResults.has(result)) {
    throw new Error(`Line ${line}: result must be pass, fail or needs_review`);
  }
  if (result === "pass" && hasDryRunOrSyntheticMarker(row)) {
    throw new Error(`Line ${line}: dry-run/synthetic QA output cannot be imported as a pass decision`);
  }

  const checkConfig = checkFamilies.get(checkFamily);
  if (!checkConfig) {
    throw new Error(`Line ${line}: unsupported check_family=${checkFamily}`);
  }
  if (targetType !== checkConfig.targetType) {
    throw new Error(`Line ${line}: ${checkFamily} requires target_type=${checkConfig.targetType}`);
  }
  if (!passId.startsWith(checkConfig.passPrefix)) {
    throw new Error(`Line ${line}: pass_id must start with ${checkConfig.passPrefix}`);
  }

  if ((checkFamily === "transcription_policy" || checkFamily === "pronunciation_accuracy") && result === "pass") {
    const currentRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    mu.meaning_id,
    mu.canonical_english,
    mu.part_of_speech,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system
  from meaning_language_entries le
  join meaning_units mu on mu.meaning_id = le.meaning_id
  where le.meaning_id = ${sqlString(targetKey)}
    and le.language_code = ${sqlString(languageCode)}
) rows;
`);
    if (currentRows.length !== 1) {
      throw new Error(`Line ${line}: no exact current transcription target for ${targetKey} / ${languageCode}`);
    }
    const issues =
      checkFamily === "transcription_policy"
        ? validateTranscriptionShape(currentRows[0])
        : validateIpaTranscriptionSanity(currentRows[0])
            .filter((issue) => issue.severity === "fail")
            .map((issue) => issue.issue);
    if (issues.length > 0) {
      throw new Error(
        `Line ${line}: ${checkFamily} pass cannot be imported because current transcription is invalid for ${targetKey} / ${languageCode}:\n${issues.join("\n")}`
      );
    }
  }

  if (checkFamily === "target_example_pedagogical_quality" && result === "pass") {
    const { setId, meaningId, exampleId } = parseContextExampleKey(targetKey);
    const currentRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    e.set_id,
    e.meaning_id,
    e.example_id,
    mu.canonical_english,
    e.canonical_example_en,
    e.semantic_scene,
    et.language_code,
    et.example_text,
    coalesce(le.word_with_article_or_marker, le.native_word) as target_display_word
  from meaning_examples e
  join meaning_units mu on mu.meaning_id = e.meaning_id
  join meaning_example_translations et on et.example_id = e.example_id
  left join meaning_language_entries le
    on le.meaning_id = e.meaning_id
   and le.language_code = et.language_code
  where e.set_id = ${sqlString(setId)}
    and e.meaning_id = ${sqlString(meaningId)}
    and e.example_id = ${exampleId}
    and et.language_code = ${sqlString(languageCode)}
) rows;
`);
    if (currentRows.length !== 1) {
      throw new Error(`Line ${line}: no exact current example target for ${targetKey} / ${languageCode}`);
    }
    const issues = validateTargetExamplePedagogicalQuality(currentRows[0])
      .filter((issue) => issue.severity === "fail")
      .map((issue) => issue.issue);
    if (issues.length > 0) {
      throw new Error(
        `Line ${line}: target_example_pedagogical_quality pass cannot be imported because deterministic blockers remain for ${targetKey} / ${languageCode}:\n${issues.join("\n")}`
      );
    }
  }

  const reviewStatus = result === "pass" ? "generated_checked" : "needs_review";
  const evidence = buildEvidence(row, inputPath);

  if (checkFamily === "word_selection_quality") {
    const { setId, meaningId } = parseCardKey(targetKey);
    if (languageCode !== "EN") {
      throw new Error(`Line ${line}: word_selection_quality uses language_code=EN`);
    }
    const nextStatus = result === "pass" ? "generated_checked" : "needs_review";

    statements.push(`
do $$
begin
  if not exists (
    select 1
    from meaning_set_memberships
    where set_id = ${sqlString(setId)}
      and meaning_id = ${sqlString(meaningId)}
  ) then
    raise exception 'No exact set membership target for %', ${sqlString(targetKey)};
  end if;
end $$;
`);

    statements.push(`
update meaning_set_memberships
set quality_status = ${sqlString(nextStatus)},
    updated_at = now()
where set_id = ${sqlString(setId)}
  and meaning_id = ${sqlString(meaningId)}
  and quality_status <> 'approved';
`);
  } else if (
	    checkFamily === "semantic_preservation" ||
	    checkFamily === "target_example_naturalness" ||
	    checkFamily === "target_example_lexical_anchor" ||
	    checkFamily === "target_example_pedagogical_quality" ||
	    checkFamily === "regional_variant_quality"
  ) {
    const { setId, meaningId, exampleId } = parseContextExampleKey(targetKey);
    const nextStatus = result === "pass" ? "generated_checked" : "needs_review";

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

    if (checkFamily === "semantic_preservation") {
      statements.push(`
update meaning_example_translations
set quality_status = ${sqlString(nextStatus)},
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
    }
  } else if (checkFamily === "base_example_alignment" || checkFamily === "example_quality") {
    if (!/^\d+$/.test(targetKey)) {
      throw new Error(`Line ${line}: ${checkFamily} target_key must be numeric example_id`);
    }
    if (languageCode !== "EN") {
      throw new Error(`Line ${line}: ${checkFamily} uses language_code=EN`);
    }
    const nextStatus = result === "pass" ? "generated_checked" : "needs_review";

    statements.push(`
do $$
begin
  if not exists (
    select 1
    from meaning_examples
    where example_id = ${Number(targetKey)}
      and example_role = 'context'
  ) then
    raise exception 'No context meaning_example target for %', ${sqlString(targetKey)};
  end if;
end $$;
`);

    statements.push(`
update meaning_examples
set quality_status = ${sqlString(nextStatus)},
    updated_at = now()
where example_id = ${Number(targetKey)}
  and example_role = 'context';
`);
  } else if (
	    checkFamily === "entry_form" ||
	    checkFamily === "entry_form_register" ||
	    checkFamily === "semantic_granularity" ||
	    checkFamily === "article_gender_marker_consistency" ||
	    checkFamily === "pronunciation_accuracy"
  ) {
    const nextStatus = result === "pass" ? "generated_checked" : "needs_review";

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

    if (checkFamily === "entry_form") {
      statements.push(`
update meaning_language_entries
set quality_status = ${sqlString(nextStatus)},
    updated_at = now()
where meaning_id = ${sqlString(targetKey)}
  and language_code = ${sqlString(languageCode)};
`);
    }
  } else if (checkFamily === "transcription_policy") {
    const nextStatusSql =
      result === "pass"
        ? `
case
  when exists (
    select 1
    from languages l
    where l.code = ${sqlString(languageCode)}
      and (
        l.transcription_kind = 'native_orthography'
        or l.transcription_format ilike 'native orthography%'
      )
  )
  and coalesce(transcription, '') = coalesce(word_with_article_or_marker, native_word, '')
    then 'not_applicable'
  else 'generated_checked'
end`
        : "'needs_review'";

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
set pronunciation_status = ${nextStatusSql},
    updated_at = now()
where meaning_id = ${sqlString(targetKey)}
  and language_code = ${sqlString(languageCode)};
`);
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
  ${sqlString(passId)},
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
`);

  if (result === "pass") passCount += 1;
  else reviewCount += 1;
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(
  `${dryRun ? "Validated" : "Imported"} AI QA results: pass=${passCount}, needs_review_or_fail=${reviewCount}`
);
