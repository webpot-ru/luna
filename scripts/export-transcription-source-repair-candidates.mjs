#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlString, toCsv } from "./lib/qa-utils.mjs";
import { evaluateTranscriptionSourceBacking } from "./lib/source-backed-transcriptions.mjs";
import {
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
} from "./lib/transcription-source-policy.mjs";

const args = process.argv.slice(2);
const setId = args.find((arg) => !arg.startsWith("--")) ?? "";
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);

if (!setId) {
  throw new Error("Usage: node scripts/export-transcription-source-repair-candidates.mjs <set_id> [--out=path]");
}
assertSafeSetId(setId);

const manifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
const manifestSha256 = await referenceSourcesManifestSha256();

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
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order, le.language_code
) rows;
`);

const candidates = [];
for (const row of rows) {
  const result = await evaluateTranscriptionSourceBacking(row, { manifestSourceIds, manifestSha256 });
  if (result.pass) continue;
  if (result.method === "copy_display" && row.display_word && row.transcription !== row.display_word) {
    candidates.push({
      set_id: setId,
      meaning_id: row.meaning_id,
      language_code: row.language_code,
      current_transcription: row.transcription,
      new_transcription: row.display_word,
      new_romanization_system: row.romanization_system ?? "",
      source_id: result.source_ids[0] ?? "",
      source_method: result.method,
      source_confidence: "deterministic",
      source_note: "copy_display deterministic repair candidate",
    });
  }
}

const outPath =
  outArg ?? path.join("outputs", "qa", `transcription_source_repair_candidates_${setId}.csv`);
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  toCsv(candidates, [
    "set_id",
    "meaning_id",
    "language_code",
    "current_transcription",
    "new_transcription",
    "new_romanization_system",
    "source_id",
    "source_method",
    "source_confidence",
    "source_note",
  ]),
  "utf8"
);

console.log(`Transcription source repair candidates exported: ${outPath} rows=${candidates.length}`);
