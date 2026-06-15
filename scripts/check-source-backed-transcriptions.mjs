#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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
  buildTranscriptionSourceBackingFindings,
  formatTranscriptionSourceBackingBlocker,
  transcriptionSourceBackingFamily,
} from "./lib/source-backed-transcriptions.mjs";
import {
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
  validateTranscriptionSourcePolicyCompleteness,
} from "./lib/transcription-source-policy.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const writeEvidence = args.includes("--write-evidence");
const verifyManifestHashes = args.includes("--verify-manifest-hashes");
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);

if (setIds.length === 0) {
  throw new Error(
    "Usage: node scripts/check-source-backed-transcriptions.mjs <set_id> [<set_id> ...] [--write-evidence] [--verify-manifest-hashes] [--out=path]"
  );
}

for (const setId of setIds) assertSafeSetId(setId);

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const buffer = await readFile(filePath);
  return hash.update(buffer).digest("hex");
}

async function verifyManifest(manifest) {
  const blockers = [];
  for (const source of manifest.sources ?? []) {
    const isToolAdapter = source.kind === "tool_adapter" || source.kind === "deferred_tool_adapter";
    if (!source.id) blockers.push("manifest source is missing id");
    if (isToolAdapter) {
      if (!source.license_note) blockers.push(`${source.id}: missing license_note`);
      if (!Array.isArray(source.primary_lunacards_use) || source.primary_lunacards_use.length === 0) {
        blockers.push(`${source.id}: missing primary_lunacards_use`);
      }
      continue;
    }
    if (!source.local_path) blockers.push(`${source.id}: missing local_path`);
    if (!source.sha256) blockers.push(`${source.id}: missing sha256`);
    if (!source.bytes && source.bytes !== 0) blockers.push(`${source.id}: missing bytes`);
    if (!source.local_path) continue;
    try {
      const info = await stat(source.local_path);
      if (source.bytes !== undefined && Number(source.bytes) !== Number(info.size)) {
        blockers.push(`${source.id}: size mismatch manifest=${source.bytes} actual=${info.size}`);
      }
      if (verifyManifestHashes) {
        const actualSha = await sha256File(source.local_path);
        if (actualSha !== source.sha256) blockers.push(`${source.id}: sha256 mismatch`);
      }
    } catch (error) {
      blockers.push(`${source.id}: local source missing at ${source.local_path}: ${error.message}`);
    }
  }
  return blockers;
}

function jsonl(rows) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

function compactReportResult(result) {
  const compact = { ...result };
  if (compact.strict_lookup && typeof compact.strict_lookup === "object") {
    const { source_entry: _sourceEntry, ...strictLookup } = compact.strict_lookup;
    compact.strict_lookup = strictLookup;
  }
  return compact;
}

async function writeEvidenceRows(passes, batchId) {
  if (passes.length === 0) return;
  const statements = ["begin;"];
  for (const result of passes) {
    const evidence = {
      importer: "check-source-backed-transcriptions",
      result: "pass",
      method: result.method,
      confidence: result.confidence,
      source_ids: result.source_ids,
      source_priority: result.source_priority,
      source_match: result.source_match,
      checked_display_word: result.checked_display_word,
      checked_native_word: result.checked_native_word,
      checked_transcription: result.checked_transcription,
      source_value: result.source_value,
      strict_lookup: result.strict_lookup,
      policy_version: result.policy_version,
      rule_version: result.rule_version,
      manifest_sha256: result.manifest_sha256,
      manual_review_required: result.manual_review_required,
      issues: result.issues,
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
  evidence,
  checked_value_hash
) values (
  'meaning_language_entry',
  ${sqlString(result.meaning_id)},
  ${sqlString(result.language_code)},
  'generated_checked',
  null,
  ${sqlString(`Source-backed transcription ${result.confidence} via ${result.method}`)},
  'source-backed-transcription-auditor',
  now(),
  ${sqlString(`${transcriptionSourceBackingFamily}_${batchId}`)},
  ${sqlString(batchId)},
  ${sqlString(transcriptionSourceBackingFamily)},
  ${sqlString(`confidence=${result.confidence}; method=${result.method}; source_match=${result.source_match}`)},
  ${sqlString(`sources=${result.source_ids.join(",")}; manifest_sha256=${result.manifest_sha256}`)},
  ${sqlJson(evidence)},
  qa_checked_value_hash('meaning_language_entry', ${sqlString(result.meaning_id)}, ${sqlString(result.language_code)}, ${sqlString(transcriptionSourceBackingFamily)})
);
`);
  }
  statements.push("commit;");
  await psqlExec(statements.join("\n"), 1024 * 1024 * 80);
}

const completeness = await validateTranscriptionSourcePolicyCompleteness();
if (completeness.blockers.length > 0) {
  console.error(`Transcription source policy is incomplete: ${completeness.blockers.length} blocker(s).`);
  for (const blocker of completeness.blockers) console.error(blocker);
  process.exit(1);
}

const manifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
const manifestSha256 = await referenceSourcesManifestSha256();
const manifestBlockers = await verifyManifest(manifest);
if (manifestBlockers.length > 0) {
  console.error(`Reference source manifest check failed: ${manifestBlockers.length} blocker(s).`);
  for (const blocker of manifestBlockers.slice(0, 120)) console.error(blocker);
  const hidden = manifestBlockers.length - 120;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system,
    le.pronunciation_status
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and l.is_active
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`, 1024 * 1024 * 160);

const findings = await buildTranscriptionSourceBackingFindings(rows, {
  manifestSourceIds,
  manifestSha256,
});

const report = {
  generated_at: new Date().toISOString(),
  set_ids: setIds,
  rows: rows.length,
  manifest_sha256: manifestSha256,
  policy: {
    active_language_count: completeness.activeLanguageCount,
    configured_language_count: completeness.configuredLanguageCount,
    manifest_source_count: completeness.manifestSourceCount,
  },
  summary_by_language: findings.byLanguage,
  blockers: findings.blockers.map(compactReportResult),
};

if (outArg) {
  const outPath = path.resolve(outArg);
  await mkdir(path.dirname(outPath), { recursive: true });
  const reportRows = findings.blockers.map(compactReportResult);
  await writeFile(outPath, outPath.endsWith(".jsonl") ? jsonl(reportRows) : JSON.stringify(report, null, 2), "utf8");
}

if (findings.blockers.length > 0) {
  console.error(
    `Source-backed transcription check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`
  );
  for (const blocker of findings.blockers.slice(0, 160)) {
    console.error(formatTranscriptionSourceBackingBlocker(blocker));
  }
  const hidden = findings.blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

if (writeEvidence) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
  const batchId = `${transcriptionSourceBackingFamily}_${setIds.join("_")}_${timestamp}`;
  await writeEvidenceRows(findings.passes, batchId);
  console.log(
    `Source-backed transcription evidence written: set_ids=${setIds.join(",")} rows=${findings.passes.length} batch_id=${batchId}`
  );
} else {
  console.log(
    `Source-backed transcription OK for ${setIds.join(", ")}: ${rows.length} row(s), manifest_sha256=${manifestSha256}`
  );
}
