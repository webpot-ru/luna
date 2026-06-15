#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertSafeSetId,
  psqlExec,
  psqlJson,
  sqlJson,
  sqlLiteralList,
  sqlString,
} from "./lib/qa-utils.mjs";
import {
  buildNumberExampleGrammarFindings,
  buildNumberExampleGrammarProof,
  formatNumberExampleGrammarFinding,
} from "./lib/number-example-grammar.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const writeEvidence = args.includes("--write-evidence");
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);

if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-number-example-grammar.mjs <set_id> [<set_id> ...] [--write-evidence] [--out=path]");
}
for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
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
    et.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    et.example_text,
    nge.evidence as number_example_grammar_evidence
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  left join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
   and le.language_code = et.language_code
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = msm.set_id || '::' || msm.meaning_id || '::' || e.example_id::text
      and qr.language_code = et.language_code
      and qr.check_family = 'number_example_grammar'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'number_example_grammar_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) nge on true
  join languages l
    on l.code = et.language_code
   and l.is_active
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, et.language_code
) rows;
`, 1024 * 1024 * 80);

const findings = buildNumberExampleGrammarFindings(rows, { requireProof: !writeEvidence });

const report = {
  generated_at: new Date().toISOString(),
  set_ids: setIds,
  checked: findings.checked,
  blocker_count: findings.blockers.length,
  blockers: findings.blockers.map((blocker) => ({
    set_id: blocker.set_id,
    display_order: blocker.display_order,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    issue: blocker.issue,
    example_text: blocker.example_text,
  })),
};

if (outArg) {
  const outPath = path.resolve(outArg);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
}

if (findings.blockers.length > 0) {
  console.error(`Number example grammar failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 160)) {
    console.error(formatNumberExampleGrammarFinding(blocker));
  }
  const hidden = findings.blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

if (writeEvidence) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
  const batchId = `number_example_grammar_${setIds.join("_")}_${timestamp}`;
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
  ${sqlString(`Number example grammar evidence for ${setIds.join(", ")}`)},
  'codex_number_example_grammar_v1',
  'generated_checked',
  now(),
  'number + noun agreement / classifier / linker / script gate'
)
on conflict (batch_id) do nothing;
`);

  for (const row of rows) {
    const targetKey = `${row.set_id}::${row.meaning_id}::${row.example_id}`;
    const proof = buildNumberExampleGrammarProof(row);
    const evidence = {
      set_id: row.set_id,
      meaning_id: row.meaning_id,
      language_code: row.language_code,
      display_word: row.display_word,
      example_text: row.example_text,
      number_example_grammar_proof: proof,
    };
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
  ${sqlString(targetKey)},
  ${sqlString(row.language_code)},
  'generated_checked',
  'number_example_grammar',
  'Pass: number example grammar proof is current for the target example.',
  'codex-number-example-grammar',
  now(),
  ${sqlString(`number_example_grammar_${timestamp}`)},
  ${sqlString(batchId)},
  'number_example_grammar',
  'Pass: target example preserves number grammar, classifier/linker requirements, script consistency and the EN scene.',
  'Deterministic known-risk gate plus Codex checked proof; not native-speaker approval.',
  qa_checked_value_hash('meaning_example_translation', ${sqlString(targetKey)}, ${sqlString(row.language_code)}, 'number_example_grammar'),
  ${sqlJson(evidence)}
);
`);
  }
  statements.push("commit;");
  await psqlExec(statements.join("\n"), 1024 * 1024 * 120);
}

console.log(
  `Number example grammar OK for ${setIds.join(", ")}: ${findings.checked} checked row(s), 0 blockers${writeEvidence ? ", evidence written" : ""}.`
);
