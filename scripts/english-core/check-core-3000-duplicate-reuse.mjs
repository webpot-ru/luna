#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(args.get("input") ?? `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/reuse");
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function normalizeSurface(value) {
  return normalizeText(value)
    .replace(/^(a|an|the|to)\s+/u, "")
    .replace(/[^\p{Letter}\p{Number}' ]+/gu, "")
    .trim();
}

function normalizePos(value) {
  const pos = normalizeText(value);
  if (pos === "be-verb" || pos === "have-verb" || pos === "do-verb") return "verb";
  if (pos === "modal auxiliary" || pos === "infinitive-to") return pos;
  return pos;
}

async function readJsonl(file) {
  const text = await fs.readFile(file, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

async function psqlJson(sql) {
  const { stdout } = await execFileAsync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql], {
    maxBuffer: 1024 * 1024 * 80,
  });
  return JSON.parse(stdout.trim() || "[]");
}

function candidateFingerprint(row) {
  return {
    surface: normalizeSurface(row.source_headword),
    part_of_speech: normalizePos(row.part_of_speech),
    meaning_note: normalizeText(row.meaning_note),
  };
}

function existingFingerprint(row) {
  return {
    surface: normalizeSurface(row.canonical_english ?? row.english_with_article),
    part_of_speech: normalizePos(row.part_of_speech),
    meaning_note: normalizeText(row.meaning_note),
  };
}

function classify(row, existingByMeaningId, existingBySurface) {
  const fp = candidateFingerprint(row);
  const sameMeaningId = existingByMeaningId.get(row.meaning_id);
  if (sameMeaningId) {
    const existingFp = existingFingerprint(sameMeaningId);
    const exact =
      fp.surface === existingFp.surface &&
      fp.part_of_speech === existingFp.part_of_speech &&
      fp.meaning_note === existingFp.meaning_note;
    return {
      decision: exact ? "blocked_existing_meaning_id_exact_duplicate" : "blocked_existing_meaning_id_conflict",
      matched_meaning_ids: [sameMeaningId.meaning_id],
      matched_existing_rows: [sameMeaningId],
      reason: exact
        ? "The proposed meaning_id already exists in Postgres with the same fingerprint. Reuse or membership planning is required."
        : "The proposed meaning_id already exists in Postgres but does not match the current row fingerprint.",
    };
  }

  const surfaceMatches = existingBySurface.get(fp.surface) ?? [];
  const samePosMatches = surfaceMatches.filter((existing) => normalizePos(existing.part_of_speech) === fp.part_of_speech);
  const exactMatches = samePosMatches.filter((existing) => normalizeText(existing.meaning_note) === fp.meaning_note);

  if (exactMatches.length === 1) {
    return {
      decision: "needs_review_exact_fingerprint_match",
      matched_meaning_ids: exactMatches.map((match) => match.meaning_id),
      matched_existing_rows: exactMatches,
      reason: "Surface, POS and meaning_note match one existing meaning. Explicit reuse decision is required before import.",
    };
  }
  if (exactMatches.length > 1) {
    return {
      decision: "blocked_multiple_exact_fingerprint_matches",
      matched_meaning_ids: exactMatches.map((match) => match.meaning_id),
      matched_existing_rows: exactMatches,
      reason: "More than one existing meaning has the same surface, POS and meaning_note.",
    };
  }
  if (samePosMatches.length > 0) {
    return {
      decision: "needs_review_surface_pos_match",
      matched_meaning_ids: samePosMatches.map((match) => match.meaning_id),
      matched_existing_rows: samePosMatches,
      reason: "Same surface and POS already exist, but meaning_note differs. Surface-only reuse is not allowed.",
    };
  }
  if (surfaceMatches.length > 0) {
    return {
      decision: "needs_review_surface_only_match",
      matched_meaning_ids: surfaceMatches.map((match) => match.meaning_id),
      matched_existing_rows: surfaceMatches,
      reason: "Same English surface exists with another POS or meaning. This is not a safe reuse decision.",
    };
  }
  return {
    decision: "new_meaning_candidate",
    matched_meaning_ids: [],
    matched_existing_rows: [],
    reason: "No existing active Postgres meaning has the same normalized English surface.",
  };
}

async function main() {
  const rows = await readJsonl(inputPath);
  const existingRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.quality_status,
    coalesce(array_agg(distinct msm.set_id) filter (where msm.set_id is not null), '{}') as set_ids
  from meaning_units mu
  left join meaning_set_memberships msm on msm.meaning_id = mu.meaning_id
  where mu.quality_status <> ${sqlString("blocked")}
  group by mu.meaning_id
  order by mu.canonical_english, mu.meaning_id
) rows;
`);

  const existingByMeaningId = new Map(existingRows.map((row) => [row.meaning_id, row]));
  const existingBySurface = new Map();
  for (const existing of existingRows) {
    const surface = existingFingerprint(existing).surface;
    if (!existingBySurface.has(surface)) existingBySurface.set(surface, []);
    existingBySurface.get(surface).push(existing);
  }

  const reportRows = rows.map((row) => {
    const result = classify(row, existingByMeaningId, existingBySurface);
    return {
      release_id: row.release_id,
      core_item_id: row.core_item_id,
      meaning_id: row.meaning_id,
      source_headword: row.source_headword,
      en_display: row.en_display,
      part_of_speech: row.part_of_speech,
      meaning_note: row.meaning_note,
      decision: result.decision,
      matched_meaning_ids: result.matched_meaning_ids,
      matched_existing_rows: result.matched_existing_rows.map((match) => ({
        meaning_id: match.meaning_id,
        canonical_english: match.canonical_english,
        english_with_article: match.english_with_article,
        part_of_speech: match.part_of_speech,
        meaning_note: match.meaning_note,
        default_domain: match.default_domain,
        default_area: match.default_area,
        default_category: match.default_category,
        set_ids: match.set_ids,
      })),
      reason: result.reason,
    };
  });

  const counts = reportRows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});

  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, `${releaseId}_duplicate_reuse_review_v1.json`);
  const summaryPath = path.join(outputDir, `${releaseId}_duplicate_reuse_review_v1_summary.md`);
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        release_id: releaseId,
        generated_at: new Date().toISOString(),
        source_file: path.relative(process.cwd(), inputPath),
        existing_meaning_rows_checked: existingRows.length,
        rows: reportRows.length,
        counts,
        report_rows: reportRows,
        status: "read_only_review_no_postgres_changes",
      },
      null,
      2
    ),
    "utf8"
  );
  await fs.writeFile(
    summaryPath,
    [
      `# Duplicate/Reuse Review v1: ${releaseId}`,
      "",
      `- Rows checked: ${reportRows.length}`,
      `- Existing Postgres meaning rows checked: ${existingRows.length}`,
      "",
      "## Counts",
      "",
      ...Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([decision, count]) => `- ${decision}: ${count}`),
      "",
      "This is a read-only report. It does not create content sets, memberships, meaning units or Google Sheet output.",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `English Core 3000 duplicate/reuse review written: ${path.relative(process.cwd(), jsonPath)} rows=${reportRows.length} existing=${existingRows.length}`
  );
}

await main();
