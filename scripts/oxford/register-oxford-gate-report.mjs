#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const SCRIPT_VERSION = "2026-05-24.v2";

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    json: "",
    markdown: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--json") args.json = value;
    else if (key === "--markdown") args.markdown = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadExpectedSupportLanguageCodes() {
  try {
    const rows = await readJson("config/language-order.json");
    return rows
      .map((row) => row.spreadsheetCode)
      .filter((code) => code && !["EN", "EN-GB"].includes(code));
  } catch {
    return [];
  }
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const releaseId = contract.latest_source_snapshot?.release_id ?? contract.source_snapshot?.release_id;
if (!releaseId) {
  throw new Error("Contract release id is missing");
}
const jsonPath =
  args.json || `outputs/oxford-vocabulary/qa/${releaseId}_oxford_english_learning_gates_v1.json`;
const markdownPath =
  args.markdown || `outputs/oxford-vocabulary/qa/${releaseId}_oxford_english_learning_gates_v1.md`;
const report = await readJson(jsonPath);
if (report.release_id !== releaseId) {
  throw new Error(`Gate report release mismatch: ${report.release_id} != ${releaseId}`);
}

const expectedSupportLanguageCodes = await loadExpectedSupportLanguageCodes();
const blockers = report.blockers ?? report.gate_results.filter((item) => item.status === "blocker");
const warnings = report.warnings ?? report.gate_results.filter((item) => item.status === "warning");
const blockerIds = blockers.map((item) => item.gate ?? item.gate_id).filter(Boolean);
const englishBlockers = blockerIds.filter((gate) =>
  [
    "english_pronunciation_source_check",
    "english_example_quality_check",
    "english_example_artifact_check",
    "english_example_semantic_smell_check",
  ].includes(gate)
);
const onlyFinalDeliveryBlocked =
  blockerIds.length === 1 && blockerIds[0] === "final_delivery_approval_check";

const latestSupportTranslationBatches = contract.latest_support_translation_batches ?? [];
const supportBatchesStarted = latestSupportTranslationBatches.length > 0;
const coveredSupportLanguageCodes = new Set(
  latestSupportTranslationBatches.flatMap((batch) => batch.languages ?? [])
);
const supportBatchesComplete =
  expectedSupportLanguageCodes.length > 0 &&
  expectedSupportLanguageCodes.every((code) => coveredSupportLanguageCodes.has(code));
const editionExports = contract.latest_edition_exports ?? {};
const deliveryManifests = editionExports.delivery_manifests ?? [];
const finalDeliveryVerified =
  contract.final_delivery_decision?.status === "approved" &&
  editionExports.final_delivery_ready === true &&
  editionExports.google_sheet_created === true &&
  deliveryManifests.length > 0 &&
  deliveryManifests.every((item) => item.google_sheet_readback_status === "verified");
contract.status =
  report.status === "passed" && finalDeliveryVerified
    ? "final_delivery_ready_google_sheets_uploaded"
    : report.status === "passed"
      ? "gates_passed_ready_for_final_delivery_decision"
    : onlyFinalDeliveryBlocked
      ? "source_package_qa_complete_not_delivery_ready"
    : englishBlockers.length === 0 && supportBatchesComplete
      ? "support_language_batches_complete_not_delivery_ready"
    : englishBlockers.length === 0 && supportBatchesStarted
      ? "support_language_batches_in_progress_not_delivery_ready"
    : englishBlockers.length === 0
        ? "english_examples_pronunciation_ready_needs_support_language_batches"
        : "gate_checked_blocked";
contract.latest_gate_report = {
  report_id: report.report_id,
  script_path: "scripts/oxford/check-oxford-english-learning-gates.py",
  json_path: jsonPath,
  markdown_path: markdownPath,
  status: report.status,
  passed_gates: report.summary?.passed_gates ?? null,
  warning_gates: report.summary?.warning_gates ?? null,
  blocked_gates: report.summary?.blocked_gates ?? null,
  blocker_gates: blockerIds,
  warning_gates_list: warnings.map((item) => item.gate ?? item.gate_id).filter(Boolean),
  last_checked_at: report.generated_at,
  registered_by: "scripts/oxford/register-oxford-gate-report.mjs",
  registered_script_version: SCRIPT_VERSION,
};
contract.blockers_before_launch = blockerIds;
contract.next_stage_options =
  finalDeliveryVerified
    ? [
        "Continue the next unfinished Oxford 3000/5000 source package from the source-of-truth docs and contract files.",
        "Apply the standing Oxford auto-publish rule when the next part finishes source-package QA: export final US/UK workbooks, upload native Google Sheets, run readback, update docs/contract and register the gate report.",
        "Keep ordinary deck-table Postgres import and isolated Oxford DB import disabled unless explicitly approved.",
      ]
    : onlyFinalDeliveryBlocked
    ? [
        "Apply the documented Oxford standing auto-publish rule: export US/UK workbooks, upload native Google Sheets, verify readback, and then re-run the gate checker.",
        "If upload cannot run, resolve the concrete Google Drive/OAuth/tooling blocker; source-package QA is otherwise complete.",
        `Do not import ${releaseId} into ordinary deck tables.`,
      ]
    : englishBlockers.length === 0 && supportBatchesComplete
    ? [
        "Run support translation sample review and source-backed support-language audits.",
        "Run support article display repair/check for article languages.",
        "Export US/UK workbooks only after all support-language gates pass and final delivery is explicitly approved.",
      ]
    : englishBlockers.length === 0
    ? [
        "Generate support-language translations/examples in language-order batches.",
        "Run weak-language targeted review and source-backed support-language audits.",
        "Export US/UK workbooks only after all support-language gates pass.",
      ]
    : contract.next_stage_options;

await writeFile(args.contract, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      status: contract.status,
      passed_gates: contract.latest_gate_report.passed_gates,
      warning_gates: contract.latest_gate_report.warning_gates,
      blocked_gates: contract.latest_gate_report.blocked_gates,
      blockers: blockerIds,
      support_languages_covered: coveredSupportLanguageCodes.size,
      support_languages_expected: expectedSupportLanguageCodes.length || null,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
