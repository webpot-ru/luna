#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const acceptOrdinaryReuseSourcePartial = args.has("accept-ordinary-reuse-source-partial");

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

function candidateIsSelected(row) {
  return normalizeText(row.selection_decision) === "selected" || normalizeText(row.qa_status) === "candidate_pool_selected_pending_gate_review";
}

function warningAcceptedByKaikkiVerbEvidence(warning, row, finding) {
  if (warning.code !== "unimorph_verb_missing") return false;
  if (normalizeText(row?.part_of_speech) !== "verb") return false;
  if (!normalizeText(row?.verb_infinitive)) return false;
  if (Number(finding?.kaikki_match_count ?? 0) < 1) return false;
  if (!(finding?.kaikki_pos ?? []).includes("verb")) return false;
  if (normalizeText(finding?.source_lookup_status) !== "source_partial_lookup_found") return false;
  return true;
}

function warningAcceptedByOrdinaryReuseSourcePartial(warning, row, releaseId) {
  if (!acceptOrdinaryReuseSourcePartial) return false;
  if (releaseId !== "spanish_a1_core_part_006_300_v1") return false;
  if (warning.code !== "kaikki_exact_match_missing") return false;
  if (!normalizeText(row?.topic_domain).startsWith("ordinary_reuse_part006_")) return false;
  if (!normalizeText(row?.display_ES) || !normalizeText(row?.display_ES_419)) return false;
  if (!normalizeText(row?.example_ES) || !normalizeText(row?.example_ES_419)) return false;
  return true;
}

async function main() {
  const contract = await readJson(contractPath);
  const releaseId = args.get("release") ?? contract.default_release.release_id;
  const runDate = args.get("date") ?? todayStamp();
  const candidatePoolPath = path.resolve(
    args.get("candidate-pool") ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
  );
  const lookupPath = path.resolve(
    args.get("source-lookup") ??
      contract.latest_source_lookup?.path ??
      `outputs/spanish-a1-core/source-lookup/${releaseId}_spanish_source_lookup_${runDate}.json`
  );
  const outDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/source-review");
  const reportJson = path.join(outDir, `${releaseId}_source_advisory_review_${runDate}.json`);
  const reportMd = path.join(outDir, `${releaseId}_source_advisory_review_${runDate}.md`);

  const [candidateRows, sourceLookup] = await Promise.all([readJsonl(candidatePoolPath), readJson(lookupPath)]);
  const selectedRows = candidateRows.filter(candidateIsSelected);
  const rowsById = new Map(selectedRows.map((row) => [row.row_id, row]));
  const findingsById = new Map((sourceLookup.findings ?? []).map((finding) => [finding.row_id, finding]));
  const advisoryWarnings = sourceLookup.advisory_warnings ?? [];
  const blockers = [];
  const decisions = [];

  for (const warning of advisoryWarnings) {
    const row = rowsById.get(warning.row_id);
    const finding = findingsById.get(warning.row_id);
    const acceptedByKaikkiVerbEvidence = warningAcceptedByKaikkiVerbEvidence(warning, row, finding);
    const acceptedByOrdinaryReuseSourcePartial = warningAcceptedByOrdinaryReuseSourcePartial(warning, row, releaseId);
    const accepted = acceptedByKaikkiVerbEvidence || acceptedByOrdinaryReuseSourcePartial;

    if (!row) {
      blockers.push({
        row_id: warning.row_id,
        code: "source_advisory_row_missing",
        message: "Advisory warning row_id is not present in the selected candidate pool.",
      });
    } else if (!finding) {
      blockers.push({
        row_id: warning.row_id,
        code: "source_advisory_finding_missing",
        message: "Advisory warning row_id is not present in source lookup findings.",
      });
    } else if (!accepted) {
      blockers.push({
        row_id: warning.row_id,
        code: "source_advisory_unresolved",
        message: `Advisory ${warning.code} was not accepted by the current source-review policy.`,
      });
    }

    decisions.push({
      row_id: warning.row_id,
      display_ES: row?.display_ES ?? null,
      display_ES_419: row?.display_ES_419 ?? null,
      part_of_speech: row?.part_of_speech ?? null,
      verb_infinitive: row?.verb_infinitive ?? null,
      advisory_code: warning.code,
      advisory_message: warning.message,
      review_decision: acceptedByKaikkiVerbEvidence
        ? "accepted_source_partial_kaikki_exact_verb_unimorph_gap"
        : acceptedByOrdinaryReuseSourcePartial
          ? "accepted_source_partial_internal_lunacards_ordinary_reuse"
          : "unresolved_requires_manual_source_review",
      reason: acceptedByKaikkiVerbEvidence
        ? "Kaikki has an exact Spanish verb match for the row; the UniMorph miss is treated as a secondary morphology-source gap, not as a candidate blocker."
        : acceptedByOrdinaryReuseSourcePartial
          ? "The row is a Part 006 ordinary_reuse candidate with reviewed ES and ES-419 display/example fields from current LunaCards ordinary artifacts; it remains source_partial and is not promoted to source_exact."
          : "The advisory did not meet the automated acceptance rule.",
      kaikki_match_count: finding?.kaikki_match_count ?? 0,
      kaikki_pos: finding?.kaikki_pos ?? [],
      unimorph_lookup_keys: finding?.unimorph_lookup_keys ?? [],
      unimorph_forms: finding?.unimorph_forms ?? 0,
      source_truth_promotion: "none_source_partial_retained",
      candidate_pool_mutated: false,
      generation_approval: false,
    });
  }

  const acceptedAdvisories = decisions.filter((decision) => decision.review_decision.startsWith("accepted_source_partial_")).length;
  const summary = {
    release_id: releaseId,
    status: blockers.length ? "blocked" : "pass",
    source_lookup_report: rel(lookupPath),
    candidate_pool: rel(candidatePoolPath),
    reviewed_advisories: advisoryWarnings.length,
    accepted_advisories: acceptedAdvisories,
    unresolved_advisories: advisoryWarnings.length - acceptedAdvisories,
    blockers: blockers.length,
    source_truth_promotion: "none_source_partial_retained",
    candidate_pool_mutated: false,
    approved_for_generation: false,
    checked_at: runDate,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    reportJson,
    `${JSON.stringify(
      {
        summary,
        checked_files: {
          contract: rel(contractPath),
          candidate_pool: rel(candidatePoolPath),
          source_lookup: rel(lookupPath),
        },
        blockers,
        decisions,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    reportMd,
    [
      `# ${releaseId} Source Advisory Review`,
      "",
      `Status: ${summary.status}`,
      `Reviewed advisories: ${summary.reviewed_advisories}`,
      `Accepted advisories: ${summary.accepted_advisories}`,
      `Unresolved advisories: ${summary.unresolved_advisories}`,
      `Blockers: ${summary.blockers}`,
      "",
      "This review accepts only the current UniMorph verb gaps that have exact Kaikki verb evidence.",
      acceptOrdinaryReuseSourcePartial
        ? "For Part 006 only, this run also accepts ordinary_reuse_part006 Kaikki-missing rows as internal LunaCards source_partial evidence when ES and ES-419 display/example fields are present."
        : "",
      "It does not mutate the candidate pool, does not promote rows to source_exact, does not approve generation, does not import Docker/Postgres rows and does not upload Google Sheets.",
      "",
      "## Decisions",
      "",
      "| row_id | display_ES | advisory | decision | reason |",
      "| --- | --- | --- | --- | --- |",
      ...decisions.map(
        (decision) =>
          `| ${decision.row_id} | ${decision.display_ES ?? ""} | ${decision.advisory_code} | ${decision.review_decision} | ${decision.reason} |`
      ),
      "",
      "## Blockers",
      "",
      ...(blockers.length ? blockers.map((blocker) => `- ${blocker.row_id} ${blocker.code}: ${blocker.message}`) : ["- none"]),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(JSON.stringify({ ...summary, report_json: rel(reportJson), report_md: rel(reportMd) }, null, 2));
  if (blockers.length) process.exitCode = 1;
}

await main();
