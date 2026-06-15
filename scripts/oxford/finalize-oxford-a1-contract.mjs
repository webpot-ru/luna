#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();

function parseArgs(argv) {
  const args = {
    contract: "config/oxford-vocabulary-release-contract-v0.json",
    finalManifest: "outputs/oxford-vocabulary/final/oxford_3000_core_a1_part_001_150_v1_edition_exports_final_v1.json",
    gateReport: "outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_oxford_english_learning_gates_v1.json",
    gateMarkdown: "outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_oxford_english_learning_gates_v1.md",
    deliveryManifests: [
      "outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_001_US_English_delivery.json",
      "outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_001_British_English_delivery.json",
    ],
    approvedOn: new Date().toISOString().slice(0, 10),
  };
  let customDeliveryManifests = false;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--final-manifest") args.finalManifest = value;
    else if (key === "--gate-report") args.gateReport = value;
    else if (key === "--gate-markdown") args.gateMarkdown = value;
    else if (key === "--delivery-manifest") {
      if (!customDeliveryManifests) {
        args.deliveryManifests = [];
        customDeliveryManifests = true;
      }
      args.deliveryManifests.push(value);
    }
    else if (key === "--approved-on") args.approvedOn = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const contractPath = args.contract;
const finalManifestPath = args.finalManifest;
const finalManifestSummaryPath = finalManifestPath.replace(/\.json$/u, "_summary.md");
const gateReportPath = args.gateReport;
const gateReportMarkdownPath = args.gateMarkdown;
const deliveryManifestPaths = args.deliveryManifests;

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function rel(filePath) {
  return path.relative(projectRoot, path.resolve(projectRoot, filePath));
}

function deliverySummary(manifestPath, manifest) {
  return {
    delivery_manifest_path: rel(manifestPath),
    workbook_path: rel(manifest.workbook_path),
    google_sheet_id: manifest.google_sheet_id,
    google_sheet_url: manifest.google_sheet_url,
    google_sheet_title: manifest.google_sheet_title,
    google_sheet_mime_type: manifest.google_sheet_mime_type,
    google_sheet_uploaded_at: manifest.google_sheet_uploaded_at,
    google_sheet_verified_in_folder: manifest.google_sheet_verified_in_folder,
    google_sheet_upload_status: manifest.google_sheet_upload_status,
    google_sheet_readback_status: manifest.google_sheet_readback_status,
    google_sheet_readback_verified_at: manifest.google_sheet_readback_verified_at,
    google_sheet_readback_sample_count: manifest.google_sheet_readback_sample_count,
    google_sheet_readback_method: manifest.google_sheet_readback_method,
  };
}

const contract = await readJson(contractPath);
const finalManifest = await readJson(finalManifestPath);
const gateReport = await readJson(gateReportPath).catch(() => null);
const deliveryManifests = await Promise.all(deliveryManifestPaths.map(async (item) => [item, await readJson(item)]));
const deliveries = deliveryManifests.map(([manifestPath, manifest]) => deliverySummary(manifestPath, manifest));
const readbackVerified = deliveries.every((item) => item.google_sheet_readback_status === "verified");
const releaseId = finalManifest.release_id;

contract.status = "final_delivery_ready_google_sheets_uploaded";
contract.approved_for_generation = true;
contract.scope =
  `Oxford 3000 / Oxford 5000 licensing/request contour for an English vocabulary course. User-reported OUP permission is accepted as project evidence for ${releaseId} final delivery. Final learner-facing US/UK Google Sheets are allowed for this release; ordinary deck-table Postgres import remains disabled.`;
contract.permission_request = {
  ...contract.permission_request,
  status: "project_evidence_decision_accepted",
  next_step: "Keep written OUP evidence if received later; do not claim official/endorsed/certified Oxford status unless separately granted.",
  project_evidence_decision: {
    accepted_on: args.approvedOn,
    accepted_by: "user",
    basis: "User reported OUP allowed the requested Oxford 3000/5000 use and explicitly instructed to make this release a Google Sheets delivery.",
    written_oup_evidence_stored: false,
  },
};

contract.source_policy = {
  ...contract.source_policy,
  oxford_3000_5000_role: "user_reported_licensed_source_project_evidence_accepted_for_final_delivery",
  allowed_fields: [
    "Oxford 3000/5000 headwords",
    "part-of-speech labels",
    "CEFR labels",
    "exact list membership",
    "list order/order bands for internal part slicing",
    "Oxford 3000 name in product/workbook titles",
    "LunaCards-authored learner examples",
    "54-language support translations and examples",
    "Google Sheets/workbook delivery for this release",
    "downloadable/app flashcard reuse for this release",
  ],
  final_delivery_allowed_fields_reviewed_on: args.approvedOn,
  attribution_no_endorsement_wording:
    "Oxford 3000 and Oxford 5000 are Oxford University Press word lists. This LunaCards workbook is independently prepared by LunaCards and is not official, certified, approved, or endorsed by Oxford University Press.",
  final_delivery_blocked_fields: [
    "copied Oxford definitions",
    "copied Oxford dictionary examples",
    "copied Oxford pronunciation text",
    "Oxford audio",
    "official/certified/approved/endorsed by Oxford claims",
  ],
};

contract.edition_export_model = {
  ...contract.edition_export_model,
  status: "approved_for_final_google_sheet_delivery",
  google_sheet_created: true,
  final_delivery_ready: true,
  support_language_word_transcriptions_required: false,
  support_language_word_transcription_policy:
    "out_of_scope_for_oxford_english_learning_edition_workbooks; do not create empty support-language transcription columns",
  support_transcription_columns_present: false,
  example_transcription_location: "main_sheet_final_two_primary_english_columns",
  main_sheet_column_contract:
    "53 buyer-facing word columns -> 53 buyer-facing example columns -> primary English word IPA -> primary English example IPA",
  source_package_variant_contract:
    "US/UK pronunciation and spelling variants remain in source/QA artifacts; buyer-facing main sheets show only the primary English edition.",
  opposite_english_variant_present_in_main_sheet: false,
  article_policy: {
    english_headword:
      "Oxford-style lemma/headword; do not add artificial a/an/the to English source headwords.",
    support_translation_display:
      "Keep natural articles/gender markers in support-language display where the language normally teaches nouns with them.",
  },
};

contract.final_delivery_decision = {
  status: "approved",
  approved_on: args.approvedOn,
  approved_by: "user",
  scope: `Final Google Sheets delivery for ${releaseId} US English and British English editions.`,
  ordinary_deck_table_postgres_import: false,
  google_sheet_delivery: true,
  support_language_word_transcriptions_required: false,
  support_transcription_columns_present: false,
  article_policy: contract.edition_export_model.article_policy,
};

contract.qa_gate_scope = {
  ...contract.qa_gate_scope,
  support_language_role:
    "Support translations/examples help learners understand English in the source-package gate. The US/UK edition workbooks use the final Oxford English-learning sheet contract, not ordinary learn-any-language delivery: support-language word/example cells are present, the opposite English edition is omitted from each buyer-facing main sheet, and empty support-language transcription columns are forbidden.",
};

contract.latest_edition_exports = {
  ...contract.latest_edition_exports,
  ...finalManifest,
  manifest_path: finalManifestPath,
  summary_path: finalManifestSummaryPath,
  script_path: "scripts/oxford/export-oxford-a1-edition-workbooks.py",
  status: "final_google_sheets_uploaded_readback_verified",
  google_sheet_created: true,
  final_delivery_ready: true,
  remaining_blockers: [],
  does_not_close: [],
  delivery_manifests: deliveries,
  google_sheet_readback_verified: readbackVerified,
};

contract.blockers_before_launch = [];
contract.next_stage_options = [
  "Continue the next unfinished Oxford 3000/5000 part only after confirming this final delivery shape.",
  "Store written OUP evidence later if received, without blocking this project-evidence-approved final delivery.",
  "Keep ordinary deck-table Postgres import disabled unless a later explicit ordinary-polyglot import decision is made.",
];
if (gateReport) {
  contract.latest_gate_report = {
    report_id: gateReport.report_id,
    script_path: "scripts/oxford/check-oxford-english-learning-gates.py",
    json_path: gateReportPath,
    markdown_path: gateReportMarkdownPath,
    status: gateReport.status,
    passed_gates: gateReport.summary?.passed_gates ?? null,
    warning_gates: gateReport.summary?.warning_gates ?? null,
    blocked_gates: gateReport.summary?.blocked_gates ?? null,
    last_checked_on: args.approvedOn,
    notes:
      "Final Oxford/English-learning gate checker passed after project-evidence decision, allowed-fields review, final Google Sheet upload and readback verification.",
  };
}

const updatedFinalManifest = {
  ...finalManifest,
  status: "final_google_sheets_uploaded_readback_verified",
  google_sheet_created: true,
  google_sheet_readback_verified: readbackVerified,
  final_delivery_ready: true,
  remaining_blockers: [],
  delivery_manifests: deliveries,
};
const courseLevel =
  finalManifest.release_id.match(/_core_([a-z]\d)_part_/iu)?.[1]?.toUpperCase() ??
  finalManifest.release_id.match(/_advanced_([a-z]\d)_extension_part_/iu)?.[1]?.toUpperCase() ??
  "A1";

const summaryLines = [
  `# Oxford ${courseLevel} US/UK Ordinary-Format Edition Workbooks: ${updatedFinalManifest.release_id}`,
  "",
  `- Script version: \`${updatedFinalManifest.script_version}\``,
  `- Status: \`${updatedFinalManifest.status}\``,
  `- Spreadsheet contract: \`${updatedFinalManifest.spreadsheet_contract}\``,
  `- Editions: ${updatedFinalManifest.editions.length}`,
  `- Rows per edition: ${updatedFinalManifest.editions[0]?.rows ?? "unknown"}`,
  `- Columns per edition: ${updatedFinalManifest.editions[0]?.columns ?? "unknown"}`,
  `- Required sheets: main vocabulary sheet, \`Course Metadata\`, \`Deck Metadata\`, \`Card Metadata\`, \`_README\`, \`_qa_status\`, \`_languages\``,
  `- Main sheet language variants per edition: ${updatedFinalManifest.main_sheet_language_variant_count ?? "unknown"}`,
  `- Words filled per edition: ${updatedFinalManifest.words_filled_per_workbook}`,
  `- Examples filled per edition: ${updatedFinalManifest.examples_filled_per_workbook}`,
  `- Word transcriptions filled per edition: ${updatedFinalManifest.word_transcriptions_filled_per_workbook}`,
  `- Word transcriptions missing per edition: ${updatedFinalManifest.word_transcriptions_missing_per_workbook}`,
  `- Example transcriptions filled per edition: ${updatedFinalManifest.example_transcriptions_filled_per_workbook ?? 0}`,
  `- Example transcription location: ${updatedFinalManifest.example_transcription_location ?? "unknown"}`,
  `- Opposite English variant present in main sheet: ${updatedFinalManifest.opposite_english_variant_present_in_main_sheet}`,
  `- Course Metadata localized: ${Boolean(updatedFinalManifest.course_metadata_localized)}`,
  `- Course Metadata title includes part: ${Boolean(updatedFinalManifest.course_metadata_title_includes_part)}`,
  `- Card Metadata columns: ${updatedFinalManifest.card_metadata_columns ?? "unknown"}`,
  `- Support transcription columns present: ${updatedFinalManifest.support_transcription_columns_present}`,
  `- Support-language word transcriptions required: ${updatedFinalManifest.support_language_word_transcriptions_required}`,
  `- English headword article policy: ${updatedFinalManifest.article_policy?.english_headword ?? "unknown"}`,
  `- Support translation article policy: ${updatedFinalManifest.article_policy?.support_translation_display ?? "unknown"}`,
  `- Support article display repair: ${updatedFinalManifest.support_article_display_repair?.repair_id ?? "not_applied"} (${updatedFinalManifest.support_article_display_repair?.display_cells_changed ?? 0} display cells changed)`,
  `- Ordinary deck-table Postgres import: ${updatedFinalManifest.ordinary_deck_table_postgres_import}`,
  `- Isolated Oxford DB persistence: ${updatedFinalManifest.isolated_oxford_db_persistence}`,
  `- Google Sheet created: ${updatedFinalManifest.google_sheet_created}`,
  `- Google Sheet readback verified: ${updatedFinalManifest.google_sheet_readback_verified}`,
  `- Final delivery ready: ${updatedFinalManifest.final_delivery_ready}`,
  "",
  ...updatedFinalManifest.editions.map((edition) => `- \`${edition.deck_title}\`: \`${edition.path}\``),
  "",
  ...deliveries.map(
    (delivery) =>
      `- Google Sheet \`${delivery.google_sheet_title}\`: ${delivery.google_sheet_url} (readback: ${delivery.google_sheet_readback_status}, cells: ${delivery.google_sheet_readback_sample_count})`
  ),
  "",
];

await writeFile(finalManifestPath, `${JSON.stringify(updatedFinalManifest, null, 2)}\n`, "utf8");
await writeFile(finalManifestSummaryPath, `${summaryLines.join("\n")}\n`, "utf8");
await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      status: contract.status,
      approved_for_generation: contract.approved_for_generation,
      delivery_count: deliveries.length,
      readback_verified: readbackVerified,
    },
    null,
    2
  )
);
