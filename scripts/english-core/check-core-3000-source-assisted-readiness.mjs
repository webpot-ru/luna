#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId =
  args.get("release") ??
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const outputDir = path.resolve("outputs/english-core-3000/readiness");
const reportId = "source_assisted_readiness_v1";
const reportJsonPath = path.join(outputDir, `${releaseId}_${reportId}.json`);
const reportMdPath = path.join(outputDir, `${releaseId}_${reportId}.md`);
const sentenceTerminators = /(?:[.!?。！？։။।؟]|\u17D4)$/u;

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
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
        throw new Error(`Invalid JSONL at ${path.relative(process.cwd(), filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function addIssue(collection, severity, gate, message, detail = {}) {
  collection.push({ severity, gate, message, ...detail });
}

function relative(filePath) {
  return path.relative(process.cwd(), filePath);
}

function rowKey(row) {
  return `${row.release_id}::${row.core_item_id}`;
}

const errors = [];
const warnings = [];
const contract = await readJson(contractPath);
const languageOrder = await readJson(path.resolve("config/language-order.json"));
const languageCodes = languageOrder.map((language) => language.spreadsheetCode);
const expectedRows = contract.course.target_selected_rows;

if (contract.course.first_release_id !== releaseId) {
  addIssue(errors, "blocker", "contract_release", `Contract first_release_id does not match ${releaseId}.`, {
    actual: contract.course.first_release_id,
  });
}

const googleDeliveryVerifiedStatuses = new Set([
  "uploaded_and_readback_verified",
  "updated_existing_and_readback_verified_after_focused_polish",
]);
const googleDeliveryVerified = googleDeliveryVerifiedStatuses.has(contract.latest_google_sheet_delivery?.status);

for (const flag of ["approved_for_generation", "approved_for_postgres_import"]) {
  if (contract[flag] !== false) {
    addIssue(errors, "blocker", "authorization_flags", `${flag} must remain false for this readiness gate.`, {
      actual: contract[flag],
    });
  }
}
if (contract.approved_for_google_sheet !== false && !googleDeliveryVerified) {
  addIssue(
    errors,
    "blocker",
    "authorization_flags",
    "approved_for_google_sheet may be true only after verified Google Sheet delivery.",
    { actual: contract.approved_for_google_sheet }
  );
}

if (contract.course.transcription_scope !== "US English source word and US English source example only") {
  addIssue(errors, "blocker", "transcription_scope", "Unexpected transcription scope.", {
    actual: contract.course.transcription_scope,
  });
}

if (languageCodes.length !== contract.course.first_release_language_column_count) {
  addIssue(errors, "blocker", "language_order", "Language order count does not match contract.", {
    actual: languageCodes.length,
    expected: contract.course.first_release_language_column_count,
  });
}

const artifactChecks = [
  ["source_snapshot", contract.latest_source_snapshot?.manifest_path],
  ["candidate_pool", contract.latest_candidate_pool?.path],
  ["base_draft", contract.latest_base_draft?.path],
  ["row_review", contract.latest_row_review?.path],
  ["en_transcriptions", contract.latest_en_transcription_review?.path],
  ["duplicate_reuse_review", contract.latest_duplicate_reuse_review?.path],
  ["en_gb_text_layer", contract.latest_en_gb_text_layer?.path],
  ["course_metadata", contract.latest_course_metadata?.path],
  ["all_language_native_style_audit", contract.latest_all_language_native_style_audit?.path],
];

for (const [gate, artifactPath] of artifactChecks) {
  if (!artifactPath) {
    addIssue(errors, "blocker", gate, "Contract is missing artifact path.");
    continue;
  }
  if (!(await exists(path.resolve(artifactPath)))) {
    addIssue(errors, "blocker", gate, "Artifact path does not exist.", { path: artifactPath });
  }
}

const sourceSnapshot = await readJson(path.resolve(contract.latest_source_snapshot.manifest_path));
if (sourceSnapshot.release_id !== releaseId) {
  addIssue(errors, "blocker", "source_snapshot", "Source snapshot release mismatch.");
}
if (sourceSnapshot.approved_for_generation !== false) {
  addIssue(errors, "blocker", "source_snapshot", "Source snapshot must remain not approved for generation.");
}
if ((sourceSnapshot.sources ?? []).length < 2) {
  addIssue(errors, "blocker", "source_snapshot", "Source snapshot must include primary source and level crosscheck sources.");
}
for (const source of sourceSnapshot.sources ?? []) {
  if (!source.normalized_file_sha256 || !source.raw_file_sha256 || !source.attribution_text) {
    addIssue(errors, "blocker", "source_snapshot", "Source snapshot is missing hash or attribution metadata.", {
      source_id: source.source_id,
    });
  }
}

const candidateRows = await readJsonl(path.resolve(contract.latest_candidate_pool.path));
const selectedCandidateRows = candidateRows.filter((row) => row.selection_decision === "selected");
if (candidateRows.length < contract.candidate_pool_contract.min_rows) {
  addIssue(errors, "blocker", "candidate_pool", "Candidate pool is smaller than contract minimum.", {
    actual: candidateRows.length,
    expected: contract.candidate_pool_contract.min_rows,
  });
}
if (selectedCandidateRows.length !== expectedRows) {
  addIssue(errors, "blocker", "candidate_pool", "Selected candidate row count mismatch.", {
    actual: selectedCandidateRows.length,
    expected: expectedRows,
  });
}

const baseRows = await readJsonl(path.resolve(contract.latest_base_draft.path));
const rowReviewRows = await readJsonl(path.resolve(contract.latest_row_review.path));
const enRows = await readJsonl(path.resolve(contract.latest_en_transcription_review.path));
const enGbRows = await readJsonl(path.resolve(contract.latest_en_gb_text_layer.path));

for (const [gate, rows] of [
  ["base_draft", baseRows],
  ["row_review", rowReviewRows],
  ["en_transcriptions", enRows],
  ["en_gb_text_layer", enGbRows],
]) {
  if (rows.length !== expectedRows) {
    addIssue(errors, "blocker", gate, "Row count mismatch.", { actual: rows.length, expected: expectedRows });
  }
  const seen = new Set();
  for (const row of rows) {
    if (row.release_id !== releaseId) addIssue(errors, "blocker", gate, "Row release mismatch.", { core_item_id: row.core_item_id });
    if (seen.has(row.core_item_id)) addIssue(errors, "blocker", gate, "Duplicate core_item_id.", { core_item_id: row.core_item_id });
    seen.add(row.core_item_id);
  }
}

const rowReviewIds = new Set(rowReviewRows.map(rowKey));
const enRowsById = new Map(enRows.map((row) => [row.core_item_id, row]));
for (const row of enRows) {
  if (!rowReviewIds.has(rowKey(row))) {
    addIssue(errors, "blocker", "row_identity", "EN transcription row is not present in row review.", {
      core_item_id: row.core_item_id,
    });
  }
  for (const field of [
    "meaning_id",
    "meaning_note",
    "semantic_scene",
    "en_display",
    "example_EN",
    "transcription_EN",
    "example_transcription_EN",
  ]) {
    if (!row[field] || (typeof row[field] === "string" && !normalizeText(row[field]))) {
      addIssue(errors, "blocker", "en_source_row", `Missing ${field}.`, { core_item_id: row.core_item_id });
    }
  }
  if (row.source_language !== "EN" || row.source_variant !== "US English") {
    addIssue(errors, "blocker", "en_source_row", "EN source language/variant mismatch.", { core_item_id: row.core_item_id });
  }
  if (row.generation_ready !== false) {
    addIssue(errors, "blocker", "en_source_row", "generation_ready must remain false before delivery approval.", {
      core_item_id: row.core_item_id,
    });
  }
  if (!sentenceTerminators.test(normalizeText(row.example_EN))) {
    addIssue(errors, "blocker", "en_source_row", "English example lacks final sentence punctuation.", {
      core_item_id: row.core_item_id,
    });
  }
}

const matrixById = new Map(
  enRows.map((row) => [
    row.core_item_id,
    {
      EN: { display: normalizeText(row.en_display), example: normalizeText(row.example_EN) },
    },
  ])
);

for (const row of enGbRows) {
  const matrixRow = matrixById.get(row.core_item_id);
  if (!matrixRow) {
    addIssue(errors, "blocker", "en_gb_text_layer", "EN-GB row has unknown core_item_id.", { core_item_id: row.core_item_id });
    continue;
  }
  if ("transcription_EN-GB" in row || "example_transcription_EN-GB" in row) {
    addIssue(errors, "blocker", "en_gb_text_layer", "EN-GB transcription fields are forbidden in first release.", {
      core_item_id: row.core_item_id,
    });
  }
  matrixRow["EN-GB"] = {
    display: normalizeText(row["EN-GB"]),
    example: normalizeText(row["example_EN-GB"]),
  };
}

const batchLanguageCoverage = [];
for (const batch of contract.latest_translation_batches ?? []) {
  if (!batch.status?.startsWith("checked_ok_")) {
    addIssue(errors, "blocker", "translation_batches", "Translation batch status is not checked_ok.", {
      batch_id: batch.batch_id,
      status: batch.status,
    });
  }
  if (batch.rows !== expectedRows) {
    addIssue(errors, "blocker", "translation_batches", "Contract row count mismatch for translation batch.", {
      batch_id: batch.batch_id,
      rows: batch.rows,
      expected: expectedRows,
    });
  }
  if (batch.target_language_transcription_rows !== 0 || batch.postgres_changes !== false || batch.google_sheet_created !== false) {
    addIssue(errors, "blocker", "translation_batches", "Batch must have no target transcriptions, Postgres changes or Google Sheet.", {
      batch_id: batch.batch_id,
    });
  }

  const batchRows = await readJsonl(path.resolve(batch.path));
  if (batchRows.length !== expectedRows) {
    addIssue(errors, "blocker", "translation_batches", "Translation batch artifact row count mismatch.", {
      batch_id: batch.batch_id,
      actual: batchRows.length,
      expected: expectedRows,
    });
  }
  for (const language of batch.languages ?? []) batchLanguageCoverage.push(language);
  for (const row of batchRows) {
    const sourceRow = enRowsById.get(row.core_item_id);
    const matrixRow = matrixById.get(row.core_item_id);
    if (!sourceRow || !matrixRow) {
      addIssue(errors, "blocker", "translation_batches", "Translation row has unknown core_item_id.", {
        batch_id: batch.batch_id,
        core_item_id: row.core_item_id,
      });
      continue;
    }
    for (const language of batch.languages ?? []) {
      if (`transcription_${language}` in row || `example_transcription_${language}` in row) {
        addIssue(errors, "blocker", "translation_batches", "Target transcription field is forbidden.", {
          batch_id: batch.batch_id,
          language,
          core_item_id: row.core_item_id,
        });
      }
      const display = normalizeText(row[language]);
      const example = normalizeText(row[`example_${language}`]);
      if (!display || !example) {
        addIssue(errors, "blocker", "translation_batches", "Missing target display/example.", {
          batch_id: batch.batch_id,
          language,
          core_item_id: row.core_item_id,
        });
      }
      if (example && !sentenceTerminators.test(example)) {
        addIssue(errors, "blocker", "translation_batches", "Target example lacks final sentence punctuation.", {
          batch_id: batch.batch_id,
          language,
          core_item_id: row.core_item_id,
        });
      }
      matrixRow[language] = { display, example };
    }
  }
}

const targetLanguageCodes = languageCodes.filter((language) => language !== "EN" && language !== "EN-GB");
const coveredTargetLanguages = new Set(batchLanguageCoverage);
for (const language of targetLanguageCodes) {
  if (!coveredTargetLanguages.has(language)) {
    addIssue(errors, "blocker", "language_coverage", "Target language is not covered by translation batches.", { language });
  }
}

let filledCells = 0;
for (const [coreItemId, matrixRow] of matrixById.entries()) {
  for (const language of languageCodes) {
    const cell = matrixRow[language];
    if (!cell) {
      addIssue(errors, "blocker", "matrix_coverage", "Missing language cell in release matrix.", { core_item_id: coreItemId, language });
      continue;
    }
    if (cell.display) filledCells += 1;
    if (cell.example) filledCells += 1;
  }
}

const courseMetadata = await readJson(path.resolve(contract.latest_course_metadata.path));
if (courseMetadata.rows?.length !== languageCodes.length) {
  addIssue(errors, "blocker", "course_metadata", "Course Metadata language row count mismatch.", {
    actual: courseMetadata.rows?.length,
    expected: languageCodes.length,
  });
}
for (const [index, language] of languageOrder.entries()) {
  const row = courseMetadata.rows?.find((candidate) => candidate.spreadsheet_code === language.spreadsheetCode);
  if (!row) {
    addIssue(errors, "blocker", "course_metadata", "Missing Course Metadata language row.", {
      language: language.spreadsheetCode,
    });
    continue;
  }
  if (row.order !== index + 1 || row.db_code !== language.dbCode) {
    addIssue(errors, "blocker", "course_metadata", "Course Metadata order/db_code mismatch.", {
      language: language.spreadsheetCode,
    });
  }
  if (!sentenceTerminators.test(normalizeText(row.title)) || !sentenceTerminators.test(normalizeText(row.description))) {
    addIssue(errors, "blocker", "course_metadata", "Course Metadata title/description must end with sentence punctuation.", {
      language: language.spreadsheetCode,
    });
  }
}

const reuseReview = await readJson(path.resolve(contract.latest_duplicate_reuse_review.path));
if (reuseReview.rows !== expectedRows || reuseReview.counts?.new_meaning_candidate !== expectedRows) {
  addIssue(errors, "blocker", "duplicate_reuse_review", "Duplicate/reuse review does not cover all rows as new candidates.", {
    rows: reuseReview.rows,
    new_meaning_candidate: reuseReview.counts?.new_meaning_candidate,
    expected: expectedRows,
  });
}

const licenseReview = contract.latest_license_attribution_review;
if (licenseReview) {
  if (!(await exists(path.resolve(licenseReview.path)))) {
    addIssue(errors, "blocker", "license_attribution_review", "License attribution review artifact path does not exist.", {
      path: licenseReview.path,
    });
  } else {
    const licenseReviewArtifact = await readJson(path.resolve(licenseReview.path));
    if (
      licenseReviewArtifact.release_id !== releaseId ||
      licenseReviewArtifact.status !== "accepted_with_attribution_and_sharealike_packaging"
    ) {
      addIssue(errors, "blocker", "license_attribution_review", "License attribution review is not accepted for this release.", {
        status: licenseReviewArtifact.status,
      });
    }
  }
}

const allLanguageAudit = await readJson(path.resolve(contract.latest_all_language_native_style_audit.path));
if (
  allLanguageAudit.status !== "passed_no_findings" ||
  allLanguageAudit.counts?.blockers !== 0 ||
  allLanguageAudit.counts?.warnings !== 0
) {
  addIssue(errors, "blocker", "all_language_native_style_audit", "All-language audit is not clean.", {
    status: allLanguageAudit.status,
    blockers: allLanguageAudit.counts?.blockers,
    warnings: allLanguageAudit.counts?.warnings,
  });
}

const expectedCells = expectedRows * languageCodes.length * 2;
if (filledCells !== expectedCells) {
  addIssue(errors, "blocker", "matrix_coverage", "Filled display/example cell count mismatch.", {
    actual: filledCells,
    expected: expectedCells,
  });
}

if (
  (contract.qa_gates_before_generation ?? []).includes("license_attribution_review") &&
  licenseReview?.status !== "accepted_with_attribution_and_sharealike_packaging"
) {
  addIssue(warnings, "warning", "license_attribution_review", "License/share-alike and attribution decision is still required before final delivery approval.");
}
if (contract.latest_course_metadata?.contains_final_qa_evidence === false) {
  addIssue(warnings, "warning", "course_metadata", "Course Metadata is structurally checked but still marked as draft language QA before delivery.");
}

const report = {
  release_id: releaseId,
  report_id: reportId,
  generated_at: new Date().toISOString(),
  status:
    errors.length === 0 && googleDeliveryVerified
      ? "passed_source_assisted_readiness_google_sheet_delivered"
      : errors.length === 0
        ? "passed_source_assisted_readiness_not_delivery_approved"
        : "blocked",
  summary: {
    rows: expectedRows,
    language_columns: languageCodes.length,
    expected_display_example_cells: expectedCells,
    filled_display_example_cells: filledCells,
    translation_batches: contract.latest_translation_batches?.length ?? 0,
    target_languages_in_batches: coveredTargetLanguages.size,
    en_transcription_rows: enRows.filter((row) => normalizeText(row.transcription_EN)).length,
    en_example_transcription_rows: enRows.filter((row) => normalizeText(row.example_transcription_EN)).length,
    en_gb_transcription_rows: 0,
    target_language_transcription_rows: 0,
    blockers: errors.length,
    warnings: warnings.length,
  },
  authorization: {
    approved_for_generation: contract.approved_for_generation,
    approved_for_postgres_import: contract.approved_for_postgres_import,
    approved_for_google_sheet: contract.approved_for_google_sheet,
    postgres_changes: false,
    google_sheet_created: googleDeliveryVerified,
    delivery_approved: googleDeliveryVerified,
  },
  checked_artifacts: artifactChecks.map(([gate, artifactPath]) => ({ gate, path: artifactPath })),
  blockers: errors,
  warnings,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

const md = [
  `# English Core 3000 Source-Assisted Readiness v1`,
  ``,
  `Release: \`${releaseId}\``,
  ``,
  `Status: \`${report.status}\``,
  ``,
  `This is a read-only source-assisted readiness gate. It does not approve Postgres import. Google Sheet delivery may be true only when a verified delivery artifact is present.`,
  ``,
  `| Check | Result |`,
  `| --- | --- |`,
  `| Rows | ${report.summary.rows} |`,
  `| Language columns | ${report.summary.language_columns} |`,
  `| Filled display/example cells | ${report.summary.filled_display_example_cells}/${report.summary.expected_display_example_cells} |`,
  `| Translation batches | ${report.summary.translation_batches} |`,
  `| Target languages in batches | ${report.summary.target_languages_in_batches} |`,
  `| EN word transcription rows | ${report.summary.en_transcription_rows} |`,
  `| EN example transcription rows | ${report.summary.en_example_transcription_rows} |`,
  `| EN-GB transcription rows | ${report.summary.en_gb_transcription_rows} |`,
  `| Target-language transcription rows | ${report.summary.target_language_transcription_rows} |`,
  `| Blockers | ${report.summary.blockers} |`,
  `| Warnings | ${report.summary.warnings} |`,
  ``,
  `## Authorization`,
  ``,
  `- approved_for_generation: \`${contract.approved_for_generation}\``,
  `- approved_for_postgres_import: \`${contract.approved_for_postgres_import}\``,
  `- approved_for_google_sheet: \`${contract.approved_for_google_sheet}\``,
  `- postgres_changes: \`false\``,
  `- google_sheet_created: \`${googleDeliveryVerified}\``,
  ``,
  `## Warnings`,
  ``,
  ...(warnings.length
    ? warnings.map((warning) => `- ${warning.gate}: ${warning.message}`)
    : [`- None.`]),
  ``,
  `## Blockers`,
  ``,
  ...(errors.length ? errors.map((error) => `- ${error.gate}: ${error.message}`) : [`- None.`]),
  ``,
  `## Report Files`,
  ``,
  `- JSON: \`${relative(reportJsonPath)}\``,
  `- Markdown: \`${relative(reportMdPath)}\``,
  ``,
].join("\n");

await fs.writeFile(reportMdPath, md);

if (errors.length) {
  throw new Error(`English Core 3000 source-assisted readiness is blocked: blockers=${errors.length}. See ${relative(reportMdPath)}`);
}

console.log(
  `English Core 3000 source-assisted readiness OK for ${releaseId}: rows=${expectedRows}, languages=${languageCodes.length}, cells=${filledCells}/${expectedCells}, warnings=${warnings.length}, report=${relative(reportMdPath)}`
);
