#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const SCRIPT_VERSION = "2026-06-03.v2";
const PRONUNCIATION_BUILDER_VERSION = "2026-06-03.v2";

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    enUs: "",
    enGb: "",
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
    else if (key === "--en-us") args.enUs = value;
    else if (key === "--en-gb") args.enGb = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

function countEvidence(rows, predicate) {
  let count = 0;
  for (const row of rows) {
    const evidence = [
      ...(row.display_pronunciation_evidence ?? []),
      ...(row.example_pronunciation_evidence ?? []),
    ];
    count += evidence.filter(predicate).length;
  }
  return count;
}

function artifactSummary({ path, rows, variant }) {
  const isUs = variant === "EN-US";
  const pronunciationId = isUs ? "en_us_edition_pronunciations_v1" : "en_gb_edition_pronunciations_v1";
  const summaryPath = path.replace(/\.jsonl$/u, "_summary.md");
  return {
    pronunciation_id: pronunciationId,
    status: isUs
      ? "source_backed_en_us_edition_pronunciations_not_delivery_ready"
      : "source_backed_en_gb_edition_pronunciations_not_delivery_ready",
    script_path: "scripts/oxford/build-oxford-a1-edition-pronunciations.py",
    script_version: PRONUNCIATION_BUILDER_VERSION,
    path,
    summary_path: summaryPath,
    rows: rows.length,
    source_variant: variant,
    pronunciation_source: isUs
      ? "CMUdict"
      : "Britfone with exact-token lookup, documented inflection/initialism fallback, component-backed compound fallback and LunaCards reviewed supplement fallback",
    source_method: isUs
      ? "cmudict_exact_token_lookup_plus_deterministic_arpabet_to_ipa"
      : "britfone_exact_token_lookup_plus_deterministic_spacing_normalization_documented_fallbacks_and_reviewed_supplement",
    source_ids: isUs
      ? [
          "ipa-focused-english-us-cmudict-dict",
          "ipa-focused-english-us-cmudict-phones",
          "ipa-focused-english-us-cmudict-symbols",
        ]
      : [
          "ipa-focused-english-gb-britfone-main",
          "ipa-focused-english-gb-britfone-symbols",
          "ipa-focused-english-gb-britfone-license",
          "ipa-focused-english-gb-britfone-readme",
          "ipa-focused-english-gb-lunacards-britfone-supplement-v1",
        ],
    copied_oxford_pronunciation: false,
    component_fallback_evidence_count: isUs
      ? 0
      : countEvidence(
          rows,
          (item) => item.match_type === "deterministic_compound_from_exact_britfone_components"
        ),
    reviewed_supplement_evidence_count: isUs
      ? 0
      : countEvidence(rows, (item) => item.source_id === "ipa-focused-english-gb-lunacards-britfone-supplement-v1"),
    closes_gate_layer: isUs ? ["english_pronunciation_source_check"] : ["edition_pronunciation_variant_check"],
    does_not_close: [
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "final_delivery_approval_check",
    ],
  };
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const releaseId = contract.latest_source_snapshot?.release_id ?? contract.source_snapshot?.release_id;
if (!releaseId) {
  throw new Error("contract.source_snapshot.release_id is missing");
}
const enUsPath =
  args.enUs || `outputs/oxford-vocabulary/pronunciations/${releaseId}_en_us_edition_pronunciations_v1.jsonl`;
const enGbPath =
  args.enGb || `outputs/oxford-vocabulary/pronunciations/${releaseId}_en_gb_edition_pronunciations_v1.jsonl`;
const enUsRows = await readJsonl(enUsPath);
const enGbRows = await readJsonl(enGbPath);
if (!enUsRows.length || !enGbRows.length) {
  throw new Error("Pronunciation artifacts must not be empty");
}
if (enUsRows.length !== enGbRows.length) {
  throw new Error(`Pronunciation row count mismatch: EN-US=${enUsRows.length} EN-GB=${enGbRows.length}`);
}
const expectedRows = contract.latest_row_review?.rows ?? null;
if (expectedRows !== null && enUsRows.length !== expectedRows) {
  throw new Error(`Pronunciation row count ${enUsRows.length} does not match contract.latest_row_review.rows ${expectedRows}`);
}

const enUsSummary = artifactSummary({ path: enUsPath, rows: enUsRows, variant: "EN-US" });
const enGbSummary = artifactSummary({ path: enGbPath, rows: enGbRows, variant: "EN-GB" });

contract.latest_english_pronunciation = enUsSummary;
contract.latest_edition_pronunciations = [enUsSummary, enGbSummary];
contract.next_stage_options = [
  "Generate support-language translations/examples in language-order batches.",
  "Run weak-language targeted review and source-backed support-language audits.",
  "Export US/UK workbooks only after all support-language gates pass.",
];
const { latest_part_002_status: _oldLatestPart002Status, ...pronunciationScope } =
  contract.pronunciation_scope ?? {};
contract.pronunciation_scope = {
  ...pronunciationScope,
  latest_edition_pronunciation_status: "en_us_and_en_gb_pronunciation_artifacts_ready_not_delivery_ready",
  latest_registered_by: "scripts/oxford/register-oxford-pronunciation-artifacts.mjs",
  latest_registered_script_version: SCRIPT_VERSION,
};

await writeFile(args.contract, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      en_us_rows: enUsRows.length,
      en_gb_rows: enGbRows.length,
      en_gb_component_fallback_evidence_count: enGbSummary.component_fallback_evidence_count,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
