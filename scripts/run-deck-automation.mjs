import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { languageOrderRecords } from "./lib/language-order.mjs";
import {
  buildDeckProfilePolicy,
  normalizeDeckProfiles,
  normalizeRiskFlags,
} from "./lib/deck-profile-policy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const masterPlanPath = path.join(projectRoot, "docs/deck-master-plan.md");
const registryPath = path.join(projectRoot, "docs/deck-specs/README.md");
const specsDir = path.join(projectRoot, "docs/deck-specs");
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const dryRun = args.includes("--dry-run") || !execute;
const checkReadyRequested = args.includes("--check-ready");
const claimOnly = args.includes("--claim-only");
const parallelPreview = args.includes("--parallel-preview");

function argValue(name, fallback = null) {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const completeRunId = argValue("--complete-run");
const failRunId = argValue("--fail-run");
const errorSummary = argValue("--error-summary", "");
const fromSort = Number(argValue("--from", "1"));
const toSort = Number(argValue("--to", "999999"));
const maxDecks = Number(argValue("--max-decks", argValue("--limit", "999999")));
const statusFilter = argValue("--status", "approved_for_generation");
const languageArg = argValue("--languages");
const repairLanguageArg = argValue("--repair-language");

const safeRunIdPattern = /^[a-zA-Z0-9_.:-]+$/;

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function sqlNullableString(value) {
  return value ? sqlString(value) : "null";
}

function sqlTextArray(values) {
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function assertSafeRunId(runId) {
  if (!safeRunIdPattern.test(runId ?? "")) {
    throw new Error(`Unsafe run_id: ${runId}`);
  }
}

function psqlJson(sql, maxBuffer = 1024 * 1024 * 20) {
  const stdout = execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer,
  });
  return JSON.parse(stdout.trim() || "[]");
}

function finishRun(runId, runStatus) {
  assertSafeRunId(runId);
  const rows = psqlJson(`
with updated as (
  update deck_generation_runs
  set
    run_status = ${sqlString(runStatus)},
    heartbeat_at = now(),
    finished_at = now(),
    updated_at = now(),
    current_stage = ${sqlString(runStatus)},
    error_summary = case
      when ${sqlNullableString(errorSummary)} is null then error_summary
      else ${sqlNullableString(errorSummary)}
    end
  where run_id = ${sqlString(runId)}
    and run_status = 'running'
  returning run_id, set_id, deck_name, run_status, finished_at
)
select coalesce(json_agg(row_to_json(updated)), '[]'::json)
from updated;
`);

  if (rows.length === 0) {
    throw new Error(`No running deck_generation_run found for run_id=${runId}`);
  }

  console.log(`deck_generation_run ${runStatus}`);
  console.log(JSON.stringify(rows[0], null, 2));
}

if (completeRunId && failRunId) {
  throw new Error("Use only one of --complete-run or --fail-run.");
}

if ((completeRunId || failRunId) && !execute) {
  throw new Error("Completing/failing a run mutates Postgres; add --execute.");
}

if (completeRunId) {
  finishRun(completeRunId, "completed");
  process.exit(0);
}

if (failRunId) {
  finishRun(failRunId, "failed");
  process.exit(0);
}

if (execute && !claimOnly) {
  throw new Error(
    "Full generation execution is intentionally disabled until a deck-data generator exists. Use --claim-only --execute to reserve decks."
  );
}

if (statusFilter !== "approved_for_generation") {
  throw new Error("Production deck automation may only select status=approved_for_generation.");
}

if (!Number.isInteger(fromSort) || !Number.isInteger(toSort) || fromSort <= 0 || toSort < fromSort) {
  throw new Error("Use numeric --from=<sort> and --to=<sort> with from <= to.");
}

if (!Number.isInteger(maxDecks) || maxDecks <= 0) {
  throw new Error("Use positive numeric --max-decks=<count>.");
}

function parseMarkdownTableRows(filePath, expectedMinCells) {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    )
    .filter((cells) => cells.length >= expectedMinCells)
    .filter((cells) => /^\d+$/.test(cells[0]));
}

function extractSpecFile(cell) {
  const markdownLink = cell.match(/\]\(([^)]+)\)/);
  return markdownLink?.[1] ?? cell;
}

function parseSpecIdentity(specFile) {
  const content = readFileSync(specFile, "utf8");
  const fieldValues = new Map();

  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/`/g, ""));
    if (cells.length >= 2) fieldValues.set(cells[0], cells[1].replace(/^`|`$/g, ""));
  }

  return {
    sort: fieldValues.get("Sort") ?? "",
    deck: fieldValues.get("Deck") ?? "",
    setId: fieldValues.get("set_id") ?? fieldValues.get("Proposed set_id") ?? "",
    status: fieldValues.get("Status") ?? "",
    deckProfile: fieldValues.get("deck_profile") ?? "",
    riskFlags: fieldValues.get("risk_flags") ?? "",
  };
}

function parseRows() {
  return readFileSync(masterPlanPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return {
        sort: Number(cells[0]),
        deck: cells[1],
        contentType: cells[2],
        domain: cells[3],
        levelLabel: cells[4],
        cefr: cells[5],
        frequencyScope: cells[6],
        status: cells[7],
      };
    });
}

function normalizeKey(sort, deck) {
  return `${sort}::${deck}`;
}

function loadSpecIdentities() {
  const registryRows = parseMarkdownTableRows(registryPath, 5).map((cells) => ({
    sort: cells[0],
    deck: cells[1],
    status: cells[2],
    specFile: extractSpecFile(cells[3]),
  }));
  const identities = new Map();

  for (const registryRow of registryRows) {
    if (!registryRow.specFile || registryRow.specFile === "-") continue;
    const specPath = path.join(specsDir, registryRow.specFile);
    if (!existsSync(specPath)) continue;
    identities.set(normalizeKey(registryRow.sort, registryRow.deck), {
      ...registryRow,
      ...parseSpecIdentity(specPath),
    });
  }

  for (const fileName of readdirSync(specsDir)) {
    if (!fileName.endsWith(".md") || fileName === "README.md" || fileName === "TEMPLATE.md") continue;
    const spec = parseSpecIdentity(path.join(specsDir, fileName));
    identities.set(normalizeKey(spec.sort, spec.deck), { ...spec, specFile: fileName });
  }

  return identities;
}

function runCheckReady(sort) {
  try {
    execFileSync("node", ["scripts/check-deck-ready.mjs", String(sort)], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, message: "ready" };
  } catch (error) {
    return {
      ok: false,
      message: String(error.stderr || error.stdout || error.message).trim(),
    };
  }
}

const languageByAnyCode = new Map();
for (const record of languageOrderRecords) {
  languageByAnyCode.set(record.spreadsheetCode.toUpperCase(), record);
  languageByAnyCode.set(record.dbCode.toUpperCase(), record);
}

function normalizeLanguageCode(code) {
  const record = languageByAnyCode.get(String(code ?? "").trim().toUpperCase());
  if (!record) throw new Error(`Unknown active language code: ${code}`);
  return record;
}

function parseLanguageBatch() {
  if (languageArg && repairLanguageArg) {
    throw new Error("Use either --languages=<codes> or --repair-language=<code>, not both.");
  }

  const records = [];
  if (repairLanguageArg) {
    records.push(normalizeLanguageCode(repairLanguageArg));
  } else if (languageArg) {
    records.push(
      ...languageArg
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean)
        .map(normalizeLanguageCode)
    );
  }

  const unique = new Map(records.map((record) => [record.dbCode, record]));
  const deduped = [...unique.values()];

  if (repairLanguageArg && deduped.length !== 1) {
    throw new Error("--repair-language must resolve to exactly one language.");
  }

  if (deduped.length > 3) {
    throw new Error("Language batch may contain at most 3 languages. Use multiple jobs for parallelism.");
  }

  return {
    records: deduped,
    dbCodes: deduped.map((record) => record.dbCode),
    spreadsheetCodes: deduped.map((record) => record.spreadsheetCode),
    repairMode: Boolean(repairLanguageArg),
  };
}

function getActiveLocks(setIds) {
  if (setIds.length === 0) return { ok: true, rows: [] };
  try {
    const rows = psqlJson(`
select coalesce(json_agg(row_to_json(active_locks)), '[]'::json)
from (
  select run_id, set_id, deck_name, locked_by, started_at, heartbeat_at, current_stage, language_batch
  from deck_generation_runs
  where run_status = 'running'
    and set_id in (${setIds.map(sqlString).join(", ")})
  order by started_at
) active_locks;
`);
    return { ok: true, rows };
  } catch (error) {
    return { ok: false, rows: [], message: String(error.stderr || error.message).trim() };
  }
}

function getLanguageReadiness(setId, languageDbCodes) {
  if (languageDbCodes.length === 0) return { ok: true, rows: [] };
  try {
    const rows = psqlJson(`
with
requested_languages as (
  select unnest(${sqlTextArray(languageDbCodes)}) as language_code
),
set_exists as (
  select exists(select 1 from content_sets where set_id = ${sqlString(setId)}) as exists
),
set_items as (
  select meaning_id
  from meaning_set_memberships
  where set_id = ${sqlString(setId)}
    and quality_status <> 'blocked'
),
context_examples as (
  select e.example_id, e.meaning_id
  from meaning_examples e
  join set_items si on si.meaning_id = e.meaning_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
),
readiness as (
  select
    rl.language_code,
    (select exists from set_exists) as content_set_exists,
    (select count(*) from set_items) as item_count,
    count(si.meaning_id) filter (where le.quality_status in ('approved', 'generated_checked')) as final_entry_count,
    count(si.meaning_id) filter (where le.pronunciation_status in ('approved', 'generated_checked', 'not_applicable')) as final_pronunciation_count,
    count(si.meaning_id) filter (where et.quality_status in ('approved', 'generated_checked')) as final_example_count
  from requested_languages rl
  left join set_items si on true
  left join context_examples ce on ce.meaning_id = si.meaning_id
  left join meaning_language_entries le
    on le.meaning_id = si.meaning_id
   and le.language_code = rl.language_code
  left join meaning_example_translations et
    on et.example_id = ce.example_id
   and et.language_code = rl.language_code
  group by rl.language_code
)
select coalesce(json_agg(row_to_json(readiness)), '[]'::json)
from readiness;
`);
    return { ok: true, rows };
  } catch (error) {
    return { ok: false, rows: [], message: String(error.stderr || error.message).trim() };
  }
}

function isLanguageComplete(row) {
  const itemCount = Number(row.item_count);
  return (
    row.content_set_exists &&
    itemCount > 0 &&
    Number(row.final_entry_count) === itemCount &&
    Number(row.final_example_count) === itemCount &&
    Number(row.final_pronunciation_count) === itemCount
  );
}

function claimDeck(row, spec, languageBatch) {
  const now = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
  const runId = `run_${spec.setId}_${now}_${randomUUID().slice(0, 8)}`;
  const lockedBy = process.env.LUNACARDS_RUNNER_ID ?? `local:${process.pid}`;
  const languageBatchSql = sqlTextArray(languageBatch.dbCodes);

  const rows = psqlJson(`
with inserted as (
  insert into deck_generation_runs (
    run_id,
    sort,
    set_id,
    deck_name,
    run_status,
    locked_by,
    current_stage,
    language_batch
  )
  select
    ${sqlString(runId)},
    ${row.sort},
    ${sqlString(spec.setId)},
    ${sqlString(row.deck)},
    'running',
    ${sqlString(lockedBy)},
    'claimed',
    ${languageBatchSql}
  where not exists (
    select 1
    from deck_generation_runs
    where set_id = ${sqlString(spec.setId)}
      and run_status = 'running'
  )
  returning run_id, sort, set_id, deck_name, run_status, locked_by, started_at, current_stage, language_batch
)
select coalesce(json_agg(row_to_json(inserted)), '[]'::json)
from inserted;
`);

  return rows[0] ?? null;
}

const languageBatch = parseLanguageBatch();
const allRows = parseRows();
const specIdentities = loadSpecIdentities();
const inRange = allRows.filter((row) => row.sort >= fromSort && row.sort <= toSort);
const skippedCounts = new Map();
const lockMessages = [];
const candidateRows = [];

for (const row of inRange) {
  if (row.status !== statusFilter) {
    skippedCounts.set(row.status, (skippedCounts.get(row.status) ?? 0) + 1);
    continue;
  }
  candidateRows.push(row);
}

const candidateSetIds = candidateRows
  .map((row) => specIdentities.get(normalizeKey(String(row.sort), row.deck))?.setId)
  .filter(Boolean);
const activeLocks = getActiveLocks(candidateSetIds);
const activeLocksBySetId = new Map(activeLocks.rows.map((lock) => [lock.set_id, lock]));
const selected = [];

console.log("Deck automation preflight");
console.log(`mode=${dryRun ? "dry-run" : "execute"}`);
console.log(`range=${fromSort}-${toSort}`);
console.log(`status_filter=${statusFilter}`);
console.log(`max_decks=${maxDecks}`);
console.log(`parallel_preview=${parallelPreview ? "yes" : "no"}`);
console.log(`claim_only=${claimOnly ? "yes" : "no"}`);
console.log(
  `language_batch=${
    languageBatch.spreadsheetCodes.length ? languageBatch.spreadsheetCodes.join(",") : "not_selected"
  }`
);
console.log(`repair_mode=${languageBatch.repairMode ? "yes" : "no"}`);
console.log(
  `skipped_status_counts=${JSON.stringify(Object.fromEntries([...skippedCounts.entries()].sort(([a], [b]) => a.localeCompare(b))))}`
);

if (!activeLocks.ok) {
  const message = `active lock check unavailable: ${activeLocks.message}`;
  if (claimOnly) throw new Error(message);
  console.log(message);
}

for (const row of candidateRows) {
  if (selected.length >= maxDecks) break;

  const key = normalizeKey(String(row.sort), row.deck);
  const spec = specIdentities.get(key);

  if (!spec?.setId) {
    lockMessages.push(`${key}: skipped missing spec set_id`);
    continue;
  }

  const lock = activeLocksBySetId.get(spec.setId);
  if (lock) {
    lockMessages.push(`${key}: skipped already_running run_id=${lock.run_id}`);
    continue;
  }

  const ready = checkReadyRequested || claimOnly ? runCheckReady(row.sort) : { ok: true, message: "not_run" };
  if (!ready.ok) {
    lockMessages.push(`${key}: skipped check_deck_ready=fail`);
    if (parallelPreview) lockMessages.push(ready.message);
    continue;
  }

  const languageReadiness = getLanguageReadiness(spec.setId, languageBatch.dbCodes);
  if (!languageReadiness.ok) {
    const message = `${key}: language readiness check unavailable: ${languageReadiness.message}`;
    if (claimOnly) throw new Error(message);
    lockMessages.push(message);
    continue;
  }

  const completeLanguages = languageReadiness.rows.filter(isLanguageComplete);
  if (completeLanguages.length > 0 && !languageBatch.repairMode) {
    lockMessages.push(
      `${key}: skipped language_already_final=${completeLanguages.map((item) => item.language_code).join(",")}`
    );
    continue;
  }

  selected.push({
    row,
    spec,
    ready,
    languageReadiness: languageReadiness.rows,
  });
}

console.log(`eligible_decks=${selected.length}`);

if (selected.length === 0) {
  console.log("\nNo decks are eligible for production automation under the current gates.");
}

if (lockMessages.length) {
  console.log("\nSkipped / blocker notes:");
  for (const message of lockMessages) console.log(`- ${message}`);
}

for (const item of selected) {
  const { row, spec, ready, languageReadiness } = item;
  console.log(`\n# ${row.sort}. ${row.deck}`);
  console.log(`set_id=${spec.setId}`);
  console.log(`status=${row.status}`);
  console.log(`content_type=${row.contentType}`);
  console.log(`domain=${row.domain}`);
  console.log(`level=${row.levelLabel} / ${row.cefr}`);
  const deckProfiles = normalizeDeckProfiles(spec.deckProfile);
  const riskFlags = normalizeRiskFlags(spec.riskFlags);
  const profilePolicy = buildDeckProfilePolicy(deckProfiles, riskFlags);
  console.log(`deck_profile=${deckProfiles.join(",") || "missing"}`);
  console.log(`risk_flags=${riskFlags.join(",") || "none"}`);
  console.log(`profile_requires_single_language_batch=${profilePolicy.requires_single_language_batch ? "yes" : "no"}`);
  console.log(`check_deck_ready=${ready.message === "not_run" ? "not_run" : "pass"}`);
  if (languageReadiness.length) {
    console.log(`language_readiness=${JSON.stringify(languageReadiness)}`);
  }

  if (claimOnly && execute) {
    const claimed = claimDeck(row, spec, languageBatch);
    if (!claimed) {
      console.log("claim=skipped already_running");
      continue;
    }
    console.log(`claim=created run_id=${claimed.run_id}`);
  } else {
    console.log(`claim=${parallelPreview ? "would_create_runtime_lock" : "not_requested"}`);
  }

  console.log("next_required_pipeline:");
  console.log("- generate deck data into Postgres");
  console.log(
    `- generate language variant draft JSONL in ${profilePolicy.requires_single_language_batch ? "1-language strict batches" : "batches of at most 3 languages"} based on deck_profile/risk_flags`
  );
  console.log("- run source preflight on each draft and import only blocker-free batches");
  console.log("- run AI/source-backed QA and import structured evidence");
  console.log("- run final export");
  console.log("- import/upload Google Sheet and verify target Drive folder");
}

console.log("\nAutomation preflight completed.");
