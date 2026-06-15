#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { readRows, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildLanguageBatchSourcePreflight,
  formatLanguageBatchSourcePreflightFinding,
} from "./lib/language-batch-source-preflight.mjs";
import {
  annotateSourcePreflightWarnings,
  defaultSourcePreflightWarningDecisionsPath,
  loadSourcePreflightWarningDecisions,
} from "./lib/source-preflight-warning-decisions.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import { buildSourcePreflightFreshnessContract } from "./lib/source-preflight-freshness.mjs";

const args = process.argv.slice(2);
const totalStartedAt = performance.now();
const timingMs = {};
const inputPath = args.find((arg) => !arg.startsWith("--"));
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const fixtureToolSources = args.includes("--fixture-tool-sources");
const decisionsArg = args.find((arg) => arg.startsWith("--decisions="))?.slice("--decisions=".length);
const requireWarningDecisions = args.includes("--require-warning-decisions");
const noAutoWarningDecisions = args.includes("--no-auto-warning-decisions");

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/check-language-batch-source-preflight.mjs <batch.jsonl|csv> [--out=path] [--decisions=path] [--require-warning-decisions] [--no-auto-warning-decisions] [--fixture-tool-sources]"
  );
}

function requireText(row, field, line) {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Line ${line}: ${field} is required`);
  }
  return value.trim();
}

function safeSetId(setId) {
  if (!/^[a-z0-9_]+$/.test(setId ?? "")) throw new Error(`Unsafe set_id: ${setId}`);
  return setId;
}

async function timed(label, fn) {
  const startedAt = performance.now();
  try {
    return await fn();
  } finally {
    timingMs[label] = Number((performance.now() - startedAt).toFixed(3));
    if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") {
      console.error(`[source-preflight] ${label} ${timingMs[label]}ms`);
    }
  }
}

const rows = await timed("read_input", () => readRows(inputPath));
if (rows.length === 0) throw new Error(`No language batch rows found in ${inputPath}`);
const inputSha256 = await timed("input_hash", async () =>
  createHash("sha256").update(await readFile(inputPath)).digest("hex")
);

const setId = safeSetId(requireText(rows[0], "set_id", 2));
const languageCodes = new Set();
const meaningIds = new Set();
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  if (requireText(row, "set_id", line) !== setId) throw new Error(`Line ${line}: all rows must use set_id=${setId}`);
  languageCodes.add(requireText(row, "language_code", line));
  meaningIds.add(requireText(row, "meaning_id", line));
  requireText(row, "native_word", line);
  requireText(row, "transcription", line);
}
if (languageCodes.size > 3) throw new Error(`Language batch may contain at most 3 languages, got ${languageCodes.size}`);

let meaningMetaByMeaningId = {};
if ([...meaningIds].length > 0) {
  meaningMetaByMeaningId = await timed("db_metadata", () => psqlJson(`
select coalesce(
  json_object_agg(
    meaning_id,
    json_build_object(
      'part_of_speech', mu.part_of_speech,
      'canonical_english', mu.canonical_english,
      'canonical_example_en', ex.canonical_example_en,
      'semantic_scene', ex.semantic_scene
    )
  ),
  '{}'::json
)
from meaning_units mu
left join lateral (
  select e.canonical_example_en, e.semantic_scene
  from meaning_examples e
  where e.meaning_id = mu.meaning_id
    and e.set_id in (${sqlLiteralList([setId])})
  order by e.example_id
  limit 1
) ex on true
where mu.meaning_id in (${sqlLiteralList([...meaningIds])});
`));
  if (!meaningMetaByMeaningId || Array.isArray(meaningMetaByMeaningId)) meaningMetaByMeaningId = {};
}

const manifest = await timed("source_manifest", () => loadReferenceSourcesManifest());
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
let deckSpec = null;
try {
  deckSpec = await timed("deck_spec", async () => resolveDeckSpec(setId).spec);
} catch {
  deckSpec = null;
}

const rawReport = await timed("source_preflight_build", () => buildLanguageBatchSourcePreflight(rows, {
  meaningMetaByMeaningId,
  manifestSourceIds,
  spec: deckSpec,
  fixtureToolSources,
}));
const decisionsPath = decisionsArg ?? defaultSourcePreflightWarningDecisionsPath;
const decisions = await timed("warning_decisions", () => loadSourcePreflightWarningDecisions(decisionsPath));
const annotatedReport = annotateSourcePreflightWarnings(rawReport, decisions);
const freshnessContract = await timed("freshness_contract", () =>
  buildSourcePreflightFreshnessContract({
    inputPath,
    inputSha256,
    setId,
    spec: deckSpec,
    decisionsPath,
    ruleVersion: rawReport.rule_version,
  })
);
const report = {
  ...annotatedReport,
  freshness_contract: freshnessContract,
  timing_ms: {
    ...(annotatedReport.timing_ms ?? {}),
    ...timingMs,
    total: Number((performance.now() - totalStartedAt).toFixed(3)),
  },
};
const effectiveRequireWarningDecisions =
  requireWarningDecisions || (report.requires_warning_decisions && !noAutoWarningDecisions);

const outputPath =
  outArg ??
  path.join(
    "outputs/source-preflight",
    `${setId}_${[...languageCodes].sort().join("_").toLowerCase()}_${new Date()
      .toISOString()
      .replace(/[-:.]/g, "")
      .replace(/Z$/, "Z")}.json`
  );
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify(
    { generated_at: new Date().toISOString(), input_path: inputPath, input_sha256: inputSha256, ...report },
    null,
    2
  ) + "\n"
);

if (report.blocker_count > 0) {
  console.error(
    `Language batch source preflight failed: rows=${report.rows_checked}, blockers=${report.blocker_count}, warnings=${report.warning_count}.`
  );
  for (const blocker of report.blockers.slice(0, 120)) {
    console.error(formatLanguageBatchSourcePreflightFinding(blocker));
  }
  const hidden = report.blockers.length - 120;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  console.error(`Report: ${outputPath}`);
  process.exit(1);
}

if (effectiveRequireWarningDecisions && report.warning_review.unresolved_count > 0) {
  console.error(
    `Language batch source preflight warning review failed: unresolved=${report.warning_review.unresolved_count}, auto_required=${report.requires_warning_decisions}, decision_file=${decisionsArg ?? defaultSourcePreflightWarningDecisionsPath}.`
  );
  for (const warning of report.warning_review.unresolved_warnings.slice(0, 80)) {
    console.error(`${formatLanguageBatchSourcePreflightFinding(warning)}; review_key=${warning.review_key}`);
  }
  const hidden = report.warning_review.unresolved_warnings.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more unresolved warning(s)`);
  console.error(`Report: ${outputPath}`);
  process.exit(1);
}

if (report.warning_count > 0) {
  console.error(
    `Language batch source preflight warnings: rows=${report.rows_checked}, warnings=${report.warning_count}.`
  );
  for (const warning of report.warnings.slice(0, 40)) {
    console.error(formatLanguageBatchSourcePreflightFinding(warning));
  }
  const hidden = report.warnings.length - 40;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(
  `Language batch source preflight OK: rows=${report.rows_checked}, languages=${[...languageCodes]
    .sort()
    .join(",")}, blockers=0, warnings=${report.warning_count}, unresolved_warning_decisions=${report.warning_review.unresolved_count}, source_candidates=${report.source_candidate_count}, report=${outputPath}`
);
