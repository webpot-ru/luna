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
import { validateTranscriptionShape } from "./lib/transcription-shape.mjs";
import { validateIpaTranscriptionSanity } from "./lib/ipa-transcription-sanity.mjs";
import { transcriptionSourceBackingFamily } from "./lib/source-backed-transcriptions.mjs";
import {
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
} from "./lib/transcription-source-policy.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-transcription-repair.mjs <repair.csv|jsonl> [--dry-run]");
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

function requireCurrentTranscription(row, line) {
  if (!Object.prototype.hasOwnProperty.call(row, "current_transcription")) {
    throw new Error(`Line ${line}: current_transcription is required`);
  }
  const value = row.current_transcription;
  if (typeof value !== "string") {
    throw new Error(`Line ${line}: current_transcription must be a string`);
  }
  return value.trim();
}

const rows = await readRows(inputPath);
if (rows.length === 0) throw new Error(`No transcription repair rows found in ${inputPath}`);

const setId = requireText(rows[0], "set_id", 2);
if (!/^[a-z0-9_]+$/.test(setId)) throw new Error(`Unsafe set_id: ${setId}`);
const finalReadySourceConfidences = new Set(["deterministic", "source_exact"]);
const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const manifestSha256 = await referenceSourcesManifestSha256();

const languageCodes = new Set();
const meaningIds = new Set();
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  if (requireText(row, "set_id", line) !== setId) {
    throw new Error(`Line ${line}: all rows must use set_id=${setId}`);
  }
  languageCodes.add(requireText(row, "language_code", line));
  meaningIds.add(requireText(row, "meaning_id", line));
  requireCurrentTranscription(row, line);
  requireText(row, "new_transcription", line);
  requireText(row, "source_note", line);
  const sourceConfidence = requireText(row, "source_confidence", line);
  if (!finalReadySourceConfidences.has(sourceConfidence)) {
    throw new Error(
      `Line ${line}: source_confidence must be deterministic or source_exact for import, got ${sourceConfidence}`
    );
  }
  const sourceId = requireText(row, "source_id", line);
  if (!manifestSourceIds.has(sourceId)) {
    throw new Error(`Line ${line}: source_id ${sourceId} is not present in reference-sources/sources.manifest.json`);
  }
  requireText(row, "source_method", line);
}

if (languageCodes.size > 3) {
  throw new Error(`Transcription repair import may contain at most 3 languages, got ${languageCodes.size}`);
}

const currentRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    mu.meaning_id,
    mu.canonical_english,
    mu.part_of_speech,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system,
    l.transcription_format
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
    and mu.meaning_id in (${sqlLiteralList([...meaningIds])})
    and le.language_code in (${sqlLiteralList([...languageCodes])})
) rows;
`);

const currentByKey = new Map(currentRows.map((row) => [`${row.meaning_id}::${row.language_code}`, row]));
const blockers = [];
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const meaningId = requireText(row, "meaning_id", line);
  const languageCode = requireText(row, "language_code", line);
  const key = `${meaningId}::${languageCode}`;
  const current = currentByKey.get(key);
  if (!current) {
    blockers.push(`Line ${line}: no active language entry for ${setId}/${meaningId}/${languageCode}`);
    continue;
  }

  const expectedCurrent = requireCurrentTranscription(row, line);
  if (String(current.transcription ?? "") !== expectedCurrent) {
    blockers.push(
      `Line ${line}: current_transcription mismatch for ${meaningId}/${languageCode}; DB="${current.transcription}", input="${expectedCurrent}"`
    );
  }

  const shapeIssues = validateTranscriptionShape({
    ...current,
    transcription: requireText(row, "new_transcription", line),
    romanization_system: optionalText(row, "new_romanization_system") ?? current.romanization_system ?? "",
  });
  for (const issue of shapeIssues) {
    blockers.push(`Line ${line}: invalid repaired transcription for ${meaningId}/${languageCode}: ${issue}`);
  }

  if (current.transcription_format === "IPA") {
    const ipaIssues = validateIpaTranscriptionSanity({
      ...current,
      transcription: requireText(row, "new_transcription", line),
      romanization_system: optionalText(row, "new_romanization_system") ?? current.romanization_system ?? "",
    })
      .filter((issue) => issue.severity === "fail")
      .map((issue) => issue.issue);
    for (const issue of ipaIssues) {
      blockers.push(`Line ${line}: invalid IPA repaired transcription for ${meaningId}/${languageCode}: ${issue}`);
    }
  }
}

if (blockers.length > 0) {
  throw new Error(`Transcription repair preflight failed:\n${blockers.join("\n")}`);
}

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
const batchId = `transcription_repair_${setId}_${[...languageCodes].join("_").toLowerCase()}_${timestamp}`;
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
  'transcription',
  ${sqlString(`Transcription repair for ${setId}: ${[...languageCodes].join(",")}`)},
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
  const languageCode = requireText(row, "language_code", line);
  const currentTranscription = requireCurrentTranscription(row, line);
  const newTranscription = requireText(row, "new_transcription", line);
  const newRomanizationSystem = optionalText(row, "new_romanization_system");
  const sourceNote = requireText(row, "source_note", line);
  const sourceId = requireText(row, "source_id", line);
  const sourceMethod = requireText(row, "source_method", line);
  const sourceConfidence = requireText(row, "source_confidence", line);
  const current = currentByKey.get(`${meaningId}::${languageCode}`);
  const isIpa = current?.transcription_format === "IPA";
  const evidence = {
    importer: "import-transcription-repair",
    input_file: inputPath,
    source_id: sourceId,
    source_method: sourceMethod,
    confidence: sourceConfidence,
    source_note: sourceNote,
    checked_display_word: current?.display_word ?? null,
    checked_native_word: current?.native_word ?? null,
    checked_transcription_before: currentTranscription,
    checked_transcription_after: newTranscription,
    manifest_sha256: manifestSha256,
  };

  statements.push(`
do $$
begin
  update meaning_language_entries
  set
    transcription = ${sqlString(newTranscription)},
    romanization_system = coalesce(${sqlNullableString(newRomanizationSystem)}, romanization_system),
    pronunciation_status = ${isIpa ? "'generated_checked'" : "'generated'"},
    updated_at = now()
  where meaning_id = ${sqlString(meaningId)}
    and language_code = ${sqlString(languageCode)}
    and coalesce(transcription, '') = ${sqlString(currentTranscription)};

  if not found then
    raise exception 'Transcription repair update failed for %/%', ${sqlString(meaningId)}, ${sqlString(languageCode)};
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
  ${sqlString(`${sourceNote}; transcription repaired from ${currentTranscription} to ${newTranscription}`)}
)
on conflict do nothing;
`);

  statements.push(`
insert into qa_reviews (
  target_type,
  target_key,
  language_code,
  review_status,
  reviewer,
  reviewed_at,
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  evidence,
  checked_value_hash
) values (
  'meaning_language_entry',
  ${sqlString(meaningId)},
  ${sqlString(languageCode)},
  'generated_checked',
  'source-backed-transcription-repair',
  now(),
  ${sqlString(`${transcriptionSourceBackingFamily}_${batchId}`)},
  ${sqlString(batchId)},
  ${sqlString(transcriptionSourceBackingFamily)},
  ${sqlString(`confidence=${sourceConfidence}; method=${sourceMethod}; repaired transcription`)},
  ${sqlString(`${sourceNote}; source_id=${sourceId}; manifest_sha256=${manifestSha256}`)},
  ${sqlJson(evidence)},
  qa_checked_value_hash('meaning_language_entry', ${sqlString(meaningId)}, ${sqlString(languageCode)}, ${sqlString(transcriptionSourceBackingFamily)})
);
`);

  if (isIpa) {
    const pronunciationEvidence = {
      ...evidence,
      check_family: "pronunciation_accuracy",
      result: "pass",
      rule_version: "source-backed-ipa-repair-v1",
    };

    statements.push(`
insert into qa_reviews (
  target_type,
  target_key,
  language_code,
  review_status,
  reviewer,
  reviewed_at,
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  evidence,
  checked_value_hash
) values (
  'meaning_language_entry',
  ${sqlString(meaningId)},
  ${sqlString(languageCode)},
  'generated_checked',
  'source-backed-transcription-repair',
  now(),
  ${sqlString(`pronunciation_accuracy_${batchId}`)},
  ${sqlString(batchId)},
  'pronunciation_accuracy',
  ${sqlString(`source-backed IPA repair; confidence=${sourceConfidence}; method=${sourceMethod}`)},
  ${sqlString(`${sourceNote}; source_id=${sourceId}; manifest_sha256=${manifestSha256}`)},
  ${sqlJson(pronunciationEvidence)},
  qa_checked_value_hash('meaning_language_entry', ${sqlString(meaningId)}, ${sqlString(languageCode)}, 'pronunciation_accuracy')
);
`);
  }
}

statements.push(dryRun ? "rollback;" : "commit;");
await psqlExec(statements.join("\n"));

console.log(
  `${dryRun ? "Validated" : "Imported"} transcription repair: set_id=${setId} languages=${[...languageCodes].join(",")} rows=${rows.length} batch_id=${batchId}`
);
