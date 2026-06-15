#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList, sqlString } from "./lib/qa-utils.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";

const args = process.argv.slice(2);
const setId = args.find((arg) => !arg.startsWith("--")) ?? "";
const languageArg = args.find((arg) => arg.startsWith("--languages="))?.split("=")[1] ?? "all";
const outArg = args.find((arg) => arg.startsWith("--out="))?.split("=")[1];

if (!setId) {
  throw new Error("Usage: node scripts/export-final-linguistic-audit-batch.mjs <set_id> [--languages=all|codes] [--out=path]");
}
assertSafeSetId(setId);

const languageLookup = new Map();
const languageMetaByDbCode = new Map();
for (const record of languageOrderRecords) {
  languageLookup.set(record.dbCode, record.dbCode);
  languageLookup.set(record.spreadsheetCode, record.dbCode);
  languageMetaByDbCode.set(record.dbCode, record);
}

function resolveLanguageCodes(value) {
  if (value === "all") return languageOrderRecords.map((record) => record.dbCode);
  const resolved = [];
  for (const rawCode of value.split(",").map((code) => code.trim()).filter(Boolean)) {
    const dbCode = languageLookup.get(rawCode);
    if (!dbCode) throw new Error(`Unknown active language code: ${rawCode}`);
    if (!resolved.includes(dbCode)) resolved.push(dbCode);
  }
  if (resolved.length === 0) throw new Error("At least one language code is required.");
  return resolved;
}

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

const languageCodes = resolveLanguageCodes(languageArg);
const timestamp = timestampId();
const outputPath =
  outArg ??
  path.join("outputs", "audit", `final_linguistic_audit_${setId}_${timestamp}_batch.jsonl`);

const sql = `
with active_items as (
  select
    msm.display_order,
    msm.set_id,
    msm.meaning_id,
    msm.context_domain,
    msm.context_area,
    msm.context_category,
    msm.context_note,
    msm.quality_status as membership_quality_status,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.level,
    mu.frequency_band,
    mu.priority_band,
    mu.countability,
    mu.plural_form_en,
    mu.semantic_class,
    mu.quality_status as meaning_quality_status
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
),
context_examples as (
  select
    e.example_id,
    e.meaning_id,
    e.canonical_example_en,
    e.semantic_scene,
    e.quality_status as context_example_quality_status
  from meaning_examples e
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
)
select coalesce(json_agg(row_to_json(audit_rows)), '[]'::json)
from (
  select
    ai.set_id,
    ai.display_order,
    ai.meaning_id,
    ai.canonical_english,
    ai.english_with_article,
    ai.part_of_speech,
    ai.meaning_note,
    ai.default_domain,
    ai.default_area,
    ai.default_category,
    ai.context_domain,
    ai.context_area,
    ai.context_category,
    ai.context_note,
    ai.level,
    ai.frequency_band,
    ai.priority_band,
    ai.countability,
    ai.plural_form_en,
    ai.semantic_class,
    ai.meaning_quality_status,
    ai.membership_quality_status,
    ce.example_id,
    ce.canonical_example_en,
    ce.semantic_scene,
    ce.context_example_quality_status,
    le.language_code,
    le.native_word,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.article_or_marker,
    le.gender,
    le.grammatical_number,
    le.transcription,
    le.romanization_system,
    le.quality_status as entry_quality_status,
    le.pronunciation_status,
    et.example_text,
    et.quality_status as example_quality_status,
    sp.evidence as semantic_preservation_evidence,
    nge.evidence as number_example_grammar_evidence,
    l.name_en as language_name,
    l.spreadsheet_code as db_spreadsheet_code,
    l.transcription_format,
    l.romanization_system as language_romanization_system
  from active_items ai
  join context_examples ce on ce.meaning_id = ai.meaning_id
  join meaning_language_entries le on le.meaning_id = ai.meaning_id
  join meaning_example_translations et
    on et.example_id = ce.example_id
   and et.language_code = le.language_code
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = ai.set_id || '::' || ai.meaning_id || '::' || ce.example_id::text
      and qr.language_code = et.language_code
      and qr.check_family = 'semantic_preservation'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'semantic_preservation_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) sp on true
  left join lateral (
    select qr.evidence
    from qa_reviews qr
    where qr.target_type = 'meaning_example_translation'
      and qr.target_key = ai.set_id || '::' || ai.meaning_id || '::' || ce.example_id::text
      and qr.language_code = et.language_code
      and qr.check_family = 'number_example_grammar'
      and qr.review_status in ('approved', 'generated_checked')
      and qr.pass_id like 'number_example_grammar_%'
      and qr.checked_value_hash = qa_checked_value_hash(qr.target_type, qr.target_key, qr.language_code, qr.check_family)
    order by qr.reviewed_at desc, qr.review_id desc
    limit 1
  ) nge on true
  join languages l on l.code = le.language_code
  where le.language_code in (${sqlLiteralList(languageCodes)})
  order by ai.display_order, le.language_code
) audit_rows;
`;

const rows = (await psqlJson(sql, 1024 * 1024 * 80))
  .map((row) => {
    const languageMeta = languageMetaByDbCode.get(row.language_code);
    return {
      ...row,
      language_order: languageMeta?.order ?? null,
      spreadsheet_code: languageMeta?.spreadsheetCode ?? row.language_code,
      expected_language_name: languageMeta?.language ?? row.language_name,
      expected_transcription_format: languageMeta?.transcriptionFormat ?? row.transcription_format,
    };
  })
  .sort((a, b) => {
    const displayOrderDelta = Number(a.display_order) - Number(b.display_order);
    if (displayOrderDelta !== 0) return displayOrderDelta;
    return Number(a.language_order) - Number(b.language_order);
  });
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");

const languageSet = new Set(rows.map((row) => row.language_code));
const meaningSet = new Set(rows.map((row) => row.meaning_id));
console.log(
  JSON.stringify(
    {
      set_id: setId,
      output_path: path.resolve(outputPath),
      rows: rows.length,
      meanings: meaningSet.size,
      languages: languageSet.size,
      expected_languages: languageCodes.length,
    },
    null,
    2
  )
);
