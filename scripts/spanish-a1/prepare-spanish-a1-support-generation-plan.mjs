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
const languageOrderPath = path.resolve(args.get("languages") ?? "config/language-order.json");

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function batchForLanguage(releaseId, language, rows) {
  const code = language.spreadsheetCode;
  const slug = codeSlug(code);
  return {
    batch_id: `${releaseId}_support_generation_batch_${slug}_v1`,
    language_code: code,
    db_code: language.dbCode,
    language_name: language.language,
    rows,
    expected_display_cells: rows,
    expected_example_cells: rows,
    output_jsonl: `outputs/spanish-a1-core/support-translations/${releaseId}_support_translation_batch_${slug}_v1.jsonl`,
    summary_md: `outputs/spanish-a1-core/support-translations/${releaseId}_support_translation_batch_${slug}_v1_summary.md`,
    status: "not_started",
    required_row_fields: [
      "release_id",
      "row_id",
      "spanish_item_id",
      "meaning_id",
      "language_code",
      "display",
      "example",
      "support_translation_status",
      "support_example_status",
      "generation_source",
      "qa_notes",
    ],
    hard_gates_before_registration: [
      "row_count_and_identity_match",
      "nonblank_display_and_example",
      "meaning_note_alignment",
      "spanish_source_copy_guard",
      "target_script_language_identity",
      "target_example_scene_alignment",
      "target_example_surface_grammar",
      "source_assisted_translation_preflight",
      "five_row_per_language_spot_review",
    ],
  };
}

async function main() {
  const contract = await readJson(contractPath);
  const languageOrder = await readJson(languageOrderPath);
  const releaseId = args.get("release") ?? contract.default_release.release_id;
  const runDate = args.get("date") ?? todayStamp();
  const candidatePoolPath = path.resolve(
    args.get("candidate-pool") ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
  );
  const outDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/support-generation");
  const reportJson = path.join(outDir, `${releaseId}_support_generation_plan_${runDate}.json`);
  const reportMd = path.join(outDir, `${releaseId}_support_generation_plan_${runDate}.md`);
  const rows = (await readJsonl(candidatePoolPath)).filter((row) => row.selection_decision === "selected");
  const blockers = [];

  if (rows.length !== Number(contract.default_release.expected_row_count)) {
    blockers.push({
      code: "selected_row_count_mismatch",
      message: `Selected rows=${rows.length}, expected ${contract.default_release.expected_row_count}.`,
    });
  }
  if (contract.latest_source_advisory_review?.status !== "pass") {
    blockers.push({
      code: "source_advisory_review_not_pass",
      message: "Support generation plan requires source advisory review pass.",
    });
  }
  if (contract.latest_source_draft?.xlsx_readback?.status !== "pass") {
    blockers.push({
      code: "source_draft_readback_not_pass",
      message: "Support generation plan requires source-draft xlsx readback pass.",
    });
  }
  if (contract.workbook?.postgres_import !== false || contract.workbook?.ordinary_deck_sort !== null) {
    blockers.push({
      code: "ordinary_deck_boundary_violation",
      message: "Spanish A1 support generation must stay outside ordinary deck/Postgres import.",
    });
  }

  const sourceCodes = new Set([contract.course.source_language_code, contract.course.regional_variant_code]);
  const targetLanguages = languageOrder.filter((language) => !sourceCodes.has(language.spreadsheetCode));
  const batches = targetLanguages.map((language) => batchForLanguage(releaseId, language, rows.length));
  const missingExistingOutputs = [];
  for (const batch of batches) {
    if (!(await pathExists(path.resolve(batch.output_jsonl)))) {
      missingExistingOutputs.push(batch.language_code);
    }
  }
  const completedSupportLanguages = batches.length - missingExistingOutputs.length;
  const supportGenerationStatus =
    completedSupportLanguages === 0
      ? "planned_not_started"
      : completedSupportLanguages === batches.length
        ? "complete"
        : "in_progress_partial";

  const summary = {
    release_id: releaseId,
    status: blockers.length ? "blocked" : "pass",
    support_generation_status: supportGenerationStatus,
    approved_for_generation: contract.approved_for_generation,
    generation_ready_without_external_quota: false,
    quality_target: "oxford_contour_equivalent_fail_closed",
    rows: rows.length,
    total_language_columns: languageOrder.length,
    source_language_columns: [...sourceCodes],
    target_support_languages: targetLanguages.length,
    expected_support_display_cells: rows.length * targetLanguages.length,
    expected_support_example_cells: rows.length * targetLanguages.length,
    completed_support_languages: completedSupportLanguages,
    missing_support_language_outputs: missingExistingOutputs.length,
    blockers: blockers.length,
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
          language_order: rel(languageOrderPath),
          candidate_pool: rel(candidatePoolPath),
          source_advisory_review: contract.latest_source_advisory_review?.path ?? null,
          source_draft_workbook: contract.latest_source_draft?.workbook_path ?? null,
        },
        ai_and_quota_policy: {
          default_generation_path: "structured_local_first",
          gemini_role: contract.ai_tool_policy?.gemini_role ?? "reviewer_or_repair_support_only",
          paid_api_usage: contract.ai_tool_policy?.paid_api_usage ?? "requires_explicit_user_confirmation",
          live_generation_started_by_this_plan: false,
        },
        quality_exit_criteria: [
          "52/52 support-language batches registered",
          "15600/15600 support display cells nonblank",
          "15600/15600 support example cells nonblank",
          "source-assisted translation preflight pass",
          "target example scene-alignment pass",
          "target script/language identity pass",
          "example surface grammar and semantic-smell checks pass",
          "5-row-per-language spot review pass",
          "final workbook export/readback pass",
          "native Google Sheet upload/readback pass",
        ],
        blockers,
        batches,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    reportMd,
    [
      `# ${releaseId} Support Generation Plan`,
      "",
      `Status: ${summary.status}`,
      `Support generation status: ${summary.support_generation_status}`,
      `Rows: ${summary.rows}`,
      `Target support languages: ${summary.target_support_languages}`,
      `Expected support display cells: ${summary.expected_support_display_cells}`,
      `Expected support example cells: ${summary.expected_support_example_cells}`,
      `Completed support languages: ${summary.completed_support_languages}`,
      `Missing support-language outputs: ${summary.missing_support_language_outputs}`,
      `Approved for generation: ${summary.approved_for_generation}`,
      "",
      "Quality target: Oxford-contour-equivalent fail-closed checks. This plan does not start live AI generation, spend API quota, import Docker/Postgres rows or upload Google Sheets.",
      "",
      "## Required Exit Criteria",
      "",
      "- 52/52 support-language batches registered.",
      "- 15,600/15,600 support display cells nonblank.",
      "- 15,600/15,600 support example cells nonblank.",
      "- Source-assisted translation preflight, example scene-alignment, script identity, surface grammar, semantic-smell and 5-row-per-language spot review pass.",
      "- Final workbook export/readback and native Google Sheet upload/readback pass.",
      "",
      "## Batches",
      "",
      "| language | batch_id | status | expected cells |",
      "| --- | --- | --- | --- |",
      ...batches.map(
        (batch) =>
          `| ${batch.language_code} | ${batch.batch_id} | ${batch.status} | ${batch.expected_display_cells} display + ${batch.expected_example_cells} example |`
      ),
      "",
      "## Blockers",
      "",
      ...(blockers.length ? blockers.map((blocker) => `- ${blocker.code}: ${blocker.message}`) : ["- none"]),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(JSON.stringify({ ...summary, report_json: rel(reportJson), report_md: rel(reportMd) }, null, 2));
  if (blockers.length) process.exitCode = 1;
}

await main();
