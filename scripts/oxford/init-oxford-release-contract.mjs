#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const defaultTemplate = "config/oxford-vocabulary-release-contract-v0.json";
const defaultOutDir = "config";

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function requiredArg(name) {
  const value = argValue(name);
  if (!value) {
    throw new Error(`Missing required argument --${name}=...`);
  }
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function contractPathForRelease(releaseId, outDir) {
  return path.join(outDir, `${releaseId}_contract_v0.json`);
}

function workbookNameFromRelease(releaseId) {
  const coreMatch = releaseId.match(/oxford_3000_core_([abc]\d)_part_(\d{3})_/iu);
  if (coreMatch) {
    return `FlashcardsLuna_Oxford_3000_Core_${coreMatch[1].toUpperCase()}_Part_${coreMatch[2]}_source_draft.xlsx`;
  }
  const extensionMatch = releaseId.match(/oxford_5000_advanced_([bc]\d)_extension_part_(\d{3})_/iu);
  if (extensionMatch) {
    return `FlashcardsLuna_Oxford_5000_Advanced_Extension_${extensionMatch[1].toUpperCase()}_Part_${extensionMatch[2]}_source_draft.xlsx`;
  }
  return "FlashcardsLuna_Oxford_Source_Package_source_draft.xlsx";
}

function snapshotFromManifest(manifest, checkedCommand, workbookPath) {
  return {
    release_id: manifest.release_id,
    status: "source_snapshot_ready_needs_row_review",
    checked_command: checkedCommand,
    manifest_path: `outputs/oxford-vocabulary/source/${manifest.release_id}_source_snapshot_manifest.json`,
    source_id: manifest.source_id,
    source_label: manifest.source_label,
    normalized_path: manifest.normalized_path,
    candidate_pool_path: `outputs/oxford-vocabulary/candidate-pools/${manifest.release_id}_candidate_pool.jsonl`,
    workbook_path: workbookPath,
    normalized_rows: manifest.normalized_rows,
    level_filter: manifest.level_filter,
    level_filtered_rows: manifest.level_filtered_rows,
    offset: manifest.offset,
    limit: manifest.limit,
    selected_rows: manifest.selected_rows,
    selected_scope: manifest.selected_scope,
    postgres_changes: false,
    google_sheet_created: false,
    copied_definitions_examples_pronunciations: false,
  };
}

function courseFromManifest(templateCourse, manifest) {
  const course = { ...templateCourse, course_id: manifest.course_id };
  if (manifest.course_id === "oxford_5000_advanced_extension") {
    course.product_safe_working_title = "Oxford 5000 Advanced Extension";
    course.internal_benchmark_label = "oxford_5000_advanced_extension_source_package";
  }
  return course;
}

function sourcePolicyFromManifest(templatePolicy, manifest) {
  const policy = { ...templatePolicy };
  if (manifest.course_id !== "oxford_5000_advanced_extension") {
    return policy;
  }
  const allowedFields = new Set(policy.allowed_fields ?? []);
  allowedFields.add("Oxford 5000 headwords");
  allowedFields.add("Oxford 5000 name in product/workbook titles");
  policy.allowed_fields = [...allowedFields];
  return policy;
}

async function main() {
  const releaseId = requiredArg("release");
  const manifestPath = requiredArg("manifest");
  const templatePath = argValue("template", defaultTemplate);
  const outPath = argValue("out", contractPathForRelease(releaseId, defaultOutDir));
  const workbookPath = argValue(
    "workbook",
    `outputs/oxford-vocabulary/final/${workbookNameFromRelease(releaseId)}`
  );
  const checkedCommand = argValue("checked-command", "");

  const template = await readJson(templatePath);
  const manifest = await readJson(manifestPath);
  if (manifest.release_id !== releaseId) {
    throw new Error(`Manifest release_id mismatch: expected ${releaseId}, got ${manifest.release_id}`);
  }

  const contract = {
    ...template,
    contract_id: `${template.contract_id}::${releaseId}`,
    status: "source_snapshot_ready_needs_row_review",
    approved_for_generation: true,
    scope:
      "Oxford 3000 / Oxford 5000 English vocabulary course release contract for a single isolated source-package part. This contract is separate from the final Part 001 contract and must not be used to overwrite Part 001 artifacts.",
    course: courseFromManifest(template.course ?? {}, manifest),
    source_policy: sourcePolicyFromManifest(template.source_policy ?? {}, manifest),
    latest_source_snapshot: snapshotFromManifest(manifest, checkedCommand, workbookPath),
    latest_gate_report: {
      status: "not_run_for_this_release",
      report_id: "oxford_english_learning_gates_v1",
    },
    blockers_before_launch: [
      "row_review",
      "english_examples",
      "en_us_and_en_gb_pronunciation",
      "support_translation_batches",
      "support_article_display_repair",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "final_us_uk_workbook_exports",
      "google_sheet_upload_readback",
      "isolated_oxford_db_import",
    ],
    next_stage_options: [
      "Run row-level English learner sense/POS/value review for this release.",
      "Generate LunaCards-authored English examples for this release.",
      "Generate EN-US and EN-GB pronunciation evidence from approved local sources.",
      "Generate support-language translations/examples in language-order batches.",
    ],
    final_delivery_decision: {
      status: "not_approved_for_this_release_until_all_gates_pass",
      ordinary_deck_table_import_allowed: false,
      google_sheet_delivery_allowed: false,
      note:
        "Part-level source-package generation is approved, but final learner-facing delivery for this release requires all Oxford gates and readback.",
    },
  };

  for (const key of [
    "latest_row_review",
    "latest_english_examples",
    "latest_english_pronunciation",
    "latest_edition_layer",
    "latest_edition_pronunciations",
    "latest_support_translation_batches",
    "latest_weak_language_targeted_review",
    "latest_edition_exports",
    "latest_db_isolation_import",
    "latest_support_article_display_repair",
    "latest_support_translation_sample_review",
    "latest_all_fields_sample_review",
    "latest_support_translation_source_backed_audit",
    "latest_support_example_quality_audit",
    "updated_at",
  ]) {
    delete contract[key];
  }

  await writeJson(outPath, contract);
  console.log(JSON.stringify({ status: "ok", release_id: releaseId, contract_path: outPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
