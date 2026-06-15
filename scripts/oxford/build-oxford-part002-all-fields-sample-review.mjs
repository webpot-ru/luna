#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportId = "all_fields_sample_review_v1";
const scriptVersion = "2026-05-20.v2";
const defaultContractPath = "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json";
const defaultOutputDir = "outputs/oxford-vocabulary/qa";
const scriptPath = relative(fileURLToPath(import.meta.url));
const sentenceEndPattern = /[.!?。！？؟।॥။։។៕]$/u;
const englishCodes = new Set(["EN", "EN-GB"]);
const hardScriptRequirements = new Map([
  ["ZH", /[\u3400-\u9FFF]/u],
  ["JA", /[\u3040-\u30FF\u3400-\u9FFF]/u],
  ["KO", /[\uAC00-\uD7AF]/u],
  ["TH", /[\u0E00-\u0E7F]/u],
  ["HI", /[\u0900-\u097F]/u],
  ["NE", /[\u0900-\u097F]/u],
  ["BN", /[\u0980-\u09FF]/u],
  ["MY", /[\u1000-\u109F]/u],
  ["KM", /[\u1780-\u17FF]/u],
  ["LO", /[\u0E80-\u0EFF]/u],
  ["SI", /[\u0D80-\u0DFF]/u],
  ["TA", /[\u0B80-\u0BFF]/u],
  ["TE", /[\u0C00-\u0C7F]/u],
  ["KN", /[\u0C80-\u0CFF]/u],
  ["ML", /[\u0D00-\u0D7F]/u],
  ["KA", /[\u10A0-\u10FF]/u],
  ["HY", /[\u0530-\u058F]/u],
  ["RU", /[\u0400-\u04FF]/u],
  ["BG", /[\u0400-\u04FF]/u],
  ["SR", /[\u0400-\u04FF]/u],
  ["KK", /[\u0400-\u04FF]/u],
]);
const requiredRowFields = [
  "release_id",
  "course_id",
  "row_id",
  "core_item_id",
  "meaning_id",
  "source_headword",
  "reviewed_part_of_speech",
  "meaning_note",
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function relative(filePath) {
  return path.relative(projectRoot, path.resolve(projectRoot, filePath));
}

function safeCsv(value) {
  return `"${String(value ?? "").replace(/"/gu, '""')}"`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  return (await readFile(filePath, "utf8"))
    .split(/\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function pushBlocker(blockers, code, message, detail = {}) {
  blockers.push({ code, message, ...detail });
}

function pushWarning(warnings, code, message, detail = {}) {
  warnings.push({ code, message, ...detail });
}

function byRowId(rows) {
  return new Map(rows.map((row) => [row.row_id, row]));
}

function supportKey(rowId, languageCode) {
  return `${rowId}::${languageCode}`;
}

function compareField(blockers, field, expected, actual, detail) {
  if (normalizeText(expected) !== normalizeText(actual)) {
    pushBlocker(blockers, "cross_artifact_mismatch", `${field} mismatch across artifacts.`, {
      field,
      expected,
      actual,
      ...detail,
    });
  }
}

function validateScript(blockers, languageCode, field, value, detail) {
  const requirement = hardScriptRequirements.get(languageCode);
  if (!requirement) return;
  if (!requirement.test(normalizeText(value))) {
    pushBlocker(blockers, "missing_required_script", `${field} does not contain expected script for ${languageCode}.`, {
      field,
      language_code: languageCode,
      value,
      ...detail,
    });
  }
}

function checkedFieldCountForRecord(record) {
  return Object.keys(record.checked_fields).length;
}

const contractPath = argValue("contract", defaultContractPath);
const outputDir = argValue("output-dir", defaultOutputDir);
const sampleSize = Number(argValue("sample-size", "10"));
const contract = await readJson(contractPath);
const releaseId = contract.latest_source_snapshot?.release_id;
if (!releaseId) {
  throw new Error(`Missing latest_source_snapshot.release_id in ${contractPath}.`);
}

const languageRows = await readJson(path.join(projectRoot, "config/language-order.json"));
const languageCodes = languageRows.map((row) => row.spreadsheetCode);
const languageNames = new Map(languageRows.map((row) => [row.spreadsheetCode, row.language]));
languageNames.set("EN-GB", "British English");
const supportLanguageCodes = languageCodes.filter((code) => !englishCodes.has(code));

const rowReviewRows = await readJsonl(path.join(projectRoot, contract.latest_row_review.path));
const sampleRows = rowReviewRows.slice(0, sampleSize);
const sampleRowIds = new Set(sampleRows.map((row) => row.row_id));
const rowReviewById = byRowId(rowReviewRows);
const englishExampleRows = await readJsonl(path.join(projectRoot, contract.latest_english_examples.path));
const englishExampleById = byRowId(englishExampleRows);
const editionRows = await readJsonl(path.join(projectRoot, contract.latest_edition_layer.path));
const editionById = byRowId(editionRows);

const enUsPronunciation = (contract.latest_edition_pronunciations ?? []).find((item) => item.source_variant === "EN-US");
const enGbPronunciation = (contract.latest_edition_pronunciations ?? []).find((item) => item.source_variant === "EN-GB");
if (!enUsPronunciation || !enGbPronunciation) {
  throw new Error("Contract must contain both EN-US and EN-GB pronunciation artifacts.");
}
const enUsById = byRowId(await readJsonl(path.join(projectRoot, enUsPronunciation.path)));
const enGbById = byRowId(await readJsonl(path.join(projectRoot, enGbPronunciation.path)));

const sourceAuditPath = contract.latest_support_translation_source_backed_audit?.path;
const exampleAuditPath = contract.latest_support_example_quality_audit?.path;
const sourceAuditCells = sourceAuditPath ? (await readJson(path.join(projectRoot, sourceAuditPath))).cells ?? [] : [];
const exampleAuditCells = exampleAuditPath ? (await readJson(path.join(projectRoot, exampleAuditPath))).cells ?? [] : [];
const sourceAuditByCell = new Map(sourceAuditCells.map((cell) => [supportKey(cell.row_id, cell.language_code), cell]));
const exampleAuditByCell = new Map(exampleAuditCells.map((cell) => [supportKey(cell.row_id, cell.language_code), cell]));

const supportRowsByLanguage = new Map();
const supportBatchByLanguage = new Map();
for (const batch of contract.latest_support_translation_batches ?? []) {
  const rows = await readJsonl(path.join(projectRoot, batch.path));
  const rowsById = byRowId(rows);
  for (const languageCode of batch.languages ?? []) {
    supportRowsByLanguage.set(languageCode, rowsById);
    supportBatchByLanguage.set(languageCode, batch);
  }
}

const records = [];
const blockers = [];
const warnings = [];
const metadataBlockers = [];
const generatedAt = new Date().toISOString();

for (const sampleRow of sampleRows) {
  const rowId = sampleRow.row_id;
  const metadataIssues = [];
  for (const field of requiredRowFields) {
    if (!normalizeText(sampleRow[field])) {
      metadataIssues.push({ code: "missing_row_review_field", field });
    }
  }
  if (!sampleRow.semantic_scene || normalizeText(sampleRow.semantic_scene.status) !== "reviewed") {
    metadataIssues.push({ code: "semantic_scene_not_reviewed", field: "semantic_scene.status" });
  }
  if (metadataIssues.length) {
    metadataBlockers.push({ row_id: rowId, source_headword: sampleRow.source_headword, issues: metadataIssues });
  }

  const englishExample = englishExampleById.get(rowId);
  const editionRow = editionById.get(rowId);
  const enUsRow = enUsById.get(rowId);
  const enGbRow = enGbById.get(rowId);
  if (!englishExample) metadataBlockers.push({ row_id: rowId, reason: "missing_english_example_row" });
  if (!editionRow) metadataBlockers.push({ row_id: rowId, reason: "missing_edition_layer_row" });
  if (!enUsRow) metadataBlockers.push({ row_id: rowId, reason: "missing_en_us_pronunciation_row" });
  if (!enGbRow) metadataBlockers.push({ row_id: rowId, reason: "missing_en_gb_pronunciation_row" });

  for (const languageCode of languageCodes) {
    const languageBlockers = [];
    const languageWarnings = [];
    const checkedFields = {};
    const displaySource =
      languageCode === "EN"
        ? editionRow?.display_headword_EN_US
        : languageCode === "EN-GB"
          ? editionRow?.display_headword_EN_GB
          : supportRowsByLanguage.get(languageCode)?.get(rowId)?.[languageCode];
    const exampleSource =
      languageCode === "EN"
        ? editionRow?.example_EN_US
        : languageCode === "EN-GB"
          ? editionRow?.example_EN_GB
          : supportRowsByLanguage.get(languageCode)?.get(rowId)?.[`example_${languageCode}`];
    const supportRow = englishCodes.has(languageCode) ? null : supportRowsByLanguage.get(languageCode)?.get(rowId);
    const pronunciationRow = languageCode === "EN" ? enUsRow : languageCode === "EN-GB" ? enGbRow : null;

    for (const field of requiredRowFields) {
      checkedFields[`metadata.${field}`] = normalizeText(sampleRow[field]) ? "present" : "missing";
      if (!normalizeText(sampleRow[field])) {
        pushBlocker(languageBlockers, "missing_metadata_field", `${field} is missing.`, { field });
      }
    }
    checkedFields["metadata.semantic_scene.status"] = normalizeText(sampleRow.semantic_scene?.status);
    if (normalizeText(sampleRow.semantic_scene?.status) !== "reviewed") {
      pushBlocker(languageBlockers, "semantic_scene_not_reviewed", "semantic scene is not reviewed.");
    }

    checkedFields.display = normalizeText(displaySource);
    checkedFields.example = normalizeText(exampleSource);
    if (!normalizeText(displaySource)) {
      pushBlocker(languageBlockers, "missing_display", "display field is empty.", { language_code: languageCode });
    }
    if (!normalizeText(exampleSource)) {
      pushBlocker(languageBlockers, "missing_example", "example field is empty.", { language_code: languageCode });
    } else if (!sentenceEndPattern.test(normalizeText(exampleSource))) {
      pushBlocker(languageBlockers, "example_missing_sentence_punctuation", "example lacks sentence punctuation.", {
        language_code: languageCode,
        example: exampleSource,
      });
    }

    if (languageCode === "EN") {
      checkedFields.transcription = normalizeText(pronunciationRow?.transcription_EN);
      checkedFields.example_transcription = normalizeText(pronunciationRow?.example_transcription_EN);
      checkedFields.transcription_status = normalizeText(pronunciationRow?.transcription_status);
      checkedFields.example_transcription_status = normalizeText(pronunciationRow?.example_transcription_status);
      checkedFields.pronunciation_source_ids = (pronunciationRow?.source_ids ?? []).join("|");
      checkedFields.does_not_use_oxford_pronunciation = String(pronunciationRow?.does_not_use_oxford_pronunciation === true);
      compareField(languageBlockers, "EN display", editionRow?.display_headword_EN_US, pronunciationRow?.reviewed_display_headword, {
        row_id: rowId,
        language_code: languageCode,
      });
      compareField(languageBlockers, "EN example", editionRow?.example_EN_US, pronunciationRow?.example_EN, {
        row_id: rowId,
        language_code: languageCode,
      });
      if (!normalizeText(pronunciationRow?.transcription_EN) || !normalizeText(pronunciationRow?.example_transcription_EN)) {
        pushBlocker(languageBlockers, "missing_english_transcription", "EN transcription fields are required.");
      }
      if (!normalizeText(pronunciationRow?.transcription_status).startsWith("source_backed_")) {
        pushBlocker(languageBlockers, "english_transcription_not_source_backed", "EN transcription is not source-backed.");
      }
      if (pronunciationRow?.does_not_use_oxford_pronunciation !== true) {
        pushBlocker(languageBlockers, "oxford_pronunciation_usage_not_excluded", "EN pronunciation must not use Oxford pronunciation.");
      }
    } else if (languageCode === "EN-GB") {
      checkedFields.transcription = normalizeText(pronunciationRow?.transcription_EN_GB);
      checkedFields.example_transcription = normalizeText(pronunciationRow?.example_transcription_EN_GB);
      checkedFields.transcription_status = normalizeText(pronunciationRow?.transcription_status);
      checkedFields.example_transcription_status = normalizeText(pronunciationRow?.example_transcription_status);
      checkedFields.pronunciation_source_ids = (pronunciationRow?.source_ids ?? []).join("|");
      checkedFields.does_not_use_oxford_pronunciation = String(pronunciationRow?.does_not_use_oxford_pronunciation === true);
      compareField(languageBlockers, "EN-GB display", editionRow?.display_headword_EN_GB, pronunciationRow?.reviewed_display_headword, {
        row_id: rowId,
        language_code: languageCode,
      });
      compareField(languageBlockers, "EN-GB example", editionRow?.example_EN_GB, pronunciationRow?.example_EN_GB, {
        row_id: rowId,
        language_code: languageCode,
      });
      if (!normalizeText(pronunciationRow?.transcription_EN_GB) || !normalizeText(pronunciationRow?.example_transcription_EN_GB)) {
        pushBlocker(languageBlockers, "missing_english_transcription", "EN-GB transcription fields are required.");
      }
      if (!normalizeText(pronunciationRow?.transcription_status).startsWith("source_backed_")) {
        pushBlocker(languageBlockers, "english_transcription_not_source_backed", "EN-GB transcription is not source-backed.");
      }
      if (pronunciationRow?.does_not_use_oxford_pronunciation !== true) {
        pushBlocker(languageBlockers, "oxford_pronunciation_usage_not_excluded", "EN-GB pronunciation must not use Oxford pronunciation.");
      }
    } else {
      const batch = supportBatchByLanguage.get(languageCode);
      const supportTranslationStatus = supportRow?.support_translation_status ?? supportRow?.translation_status;
      const supportExampleStatus = supportRow?.support_example_status ?? supportRow?.example_translation_status;
      checkedFields.support_batch_id = batch?.batch_id ?? "";
      checkedFields.support_batch_path = batch?.path ?? "";
      checkedFields.support_translation_status = normalizeText(supportTranslationStatus);
      checkedFields.support_example_status = normalizeText(supportExampleStatus);
      checkedFields.target_language_transcriptions = "absent_expected_by_policy";
      if (!supportRow) {
        pushBlocker(languageBlockers, "missing_support_row", "support row is missing.", { language_code: languageCode });
      } else {
        checkedFields["support.meaning_id"] = normalizeText(supportRow.meaning_id);
        checkedFields["support.source_headword"] = normalizeText(supportRow.source_headword);
        checkedFields["support.reviewed_part_of_speech"] = normalizeText(supportRow.reviewed_part_of_speech);
        checkedFields["support.meaning_note"] =
          "meaning_note" in supportRow ? normalizeText(supportRow.meaning_note) : "not_duplicated_uses_canonical_row_review";
        compareField(languageBlockers, "support meaning_id", sampleRow.meaning_id, supportRow.meaning_id, {
          row_id: rowId,
          language_code: languageCode,
        });
        compareField(languageBlockers, "support source_headword", sampleRow.source_headword, supportRow.source_headword, {
          row_id: rowId,
          language_code: languageCode,
        });
        compareField(languageBlockers, "support part_of_speech", sampleRow.reviewed_part_of_speech, supportRow.reviewed_part_of_speech, {
          row_id: rowId,
          language_code: languageCode,
        });
        if ("meaning_note" in supportRow) {
          compareField(languageBlockers, "support meaning_note", sampleRow.meaning_note, supportRow.meaning_note, {
            row_id: rowId,
            language_code: languageCode,
          });
        }
        if (!normalizeText(supportTranslationStatus)) {
          pushBlocker(languageBlockers, "missing_support_translation_status", "support translation status is empty.");
        }
        if (!normalizeText(supportExampleStatus)) {
          pushBlocker(languageBlockers, "missing_support_example_status", "support example status is empty.");
        }
        if (`transcription_${languageCode}` in supportRow || `example_transcription_${languageCode}` in supportRow) {
          pushBlocker(languageBlockers, "forbidden_target_language_transcription", "target-language transcription fields must be absent.");
        }
        validateScript(languageBlockers, languageCode, "display", displaySource, { row_id: rowId });
        validateScript(languageBlockers, languageCode, "example", exampleSource, { row_id: rowId });
      }
      const sourceAuditCell = sourceAuditByCell.get(supportKey(rowId, languageCode));
      const exampleAuditCell = exampleAuditByCell.get(supportKey(rowId, languageCode));
      checkedFields.source_backed_audit_status = sourceAuditCell?.status ?? "";
      checkedFields.source_backed_audit_warnings = (sourceAuditCell?.warning_codes ?? []).join("|");
      checkedFields.example_quality_audit_status = exampleAuditCell?.status ?? "";
      checkedFields.example_quality_audit_warnings = (exampleAuditCell?.warning_codes ?? []).join("|");
      if (!sourceAuditCell) {
        pushBlocker(languageBlockers, "missing_source_backed_audit_cell", "source-backed audit cell is missing.");
      } else if (sourceAuditCell.status === "blocker" || (sourceAuditCell.blocker_codes ?? []).length) {
        pushBlocker(languageBlockers, "source_backed_audit_cell_blocked", "source-backed audit cell has blockers.", {
          blocker_codes: sourceAuditCell.blocker_codes ?? [],
        });
      }
      if (!exampleAuditCell) {
        pushBlocker(languageBlockers, "missing_example_quality_audit_cell", "example-quality audit cell is missing.");
      } else if (exampleAuditCell.status === "blocker" || (exampleAuditCell.blocker_codes ?? []).length) {
        pushBlocker(languageBlockers, "example_quality_audit_cell_blocked", "example-quality audit cell has blockers.", {
          blocker_codes: exampleAuditCell.blocker_codes ?? [],
        });
      }
      for (const code of sourceAuditCell?.warning_codes ?? []) {
        pushWarning(languageWarnings, `source_backed:${code}`, "Source-backed audit warning signal.", { code });
      }
      for (const code of exampleAuditCell?.warning_codes ?? []) {
        pushWarning(languageWarnings, `example_quality:${code}`, "Example-quality audit warning signal.", { code });
      }
    }

    const record = {
      status: languageBlockers.length ? "blocker" : "pass",
      language_code: languageCode,
      language: languageNames.get(languageCode) ?? languageCode,
      row_id: rowId,
      source_headword: sampleRow.source_headword,
      meaning_id: sampleRow.meaning_id,
      part_of_speech: sampleRow.reviewed_part_of_speech,
      level_min: sampleRow.level_min,
      level_max: sampleRow.level_max,
      meaning_note: sampleRow.meaning_note,
      display: normalizeText(displaySource),
      example: normalizeText(exampleSource),
      checked_fields: checkedFields,
      checked_field_count: 0,
      blocker_codes: [...new Set(languageBlockers.map((item) => item.code))].sort(),
      warning_codes: [...new Set(languageWarnings.map((item) => item.code))].sort(),
      blockers: languageBlockers,
      warnings: languageWarnings,
    };
    record.checked_field_count = checkedFieldCountForRecord(record);
    records.push(record);
    blockers.push(...languageBlockers.map((item) => ({ ...item, row_id: rowId, language_code: languageCode })));
    warnings.push(...languageWarnings.map((item) => ({ ...item, row_id: rowId, language_code: languageCode })));
  }
}

for (const item of metadataBlockers) {
  blockers.push({ code: "metadata_sample_blocker", message: "Sample metadata blocker.", ...item });
}

const byLanguage = languageCodes.map((languageCode) => {
  const languageRecords = records.filter((record) => record.language_code === languageCode);
  return {
    language_code: languageCode,
    language: languageNames.get(languageCode) ?? languageCode,
    sampled_rows: languageRecords.length,
    checked_fields: languageRecords.reduce((sum, record) => sum + record.checked_field_count, 0),
    blockers: languageRecords.reduce((sum, record) => sum + record.blockers.length, 0),
    warning_signals: languageRecords.reduce((sum, record) => sum + record.warnings.length, 0),
  };
});

const status = blockers.length ? "blocker" : "pass";
const reportPath = path.join(outputDir, `${releaseId}_${reportId}.json`);
const csvPath = path.join(outputDir, `${releaseId}_${reportId}.csv`);
const mdPath = path.join(outputDir, `${releaseId}_${reportId}.md`);
const report = {
  release_id: releaseId,
  report_id: reportId,
  script_version: scriptVersion,
  generated_at: generatedAt,
  status,
  review_scope:
    "Source-package all-fields sample review: 10 sampled rows x 54 language variants. Checks canonical row metadata, English US/GB display/example/transcription evidence, support-language display/example fields, support QA cell status and target-language transcription absence. Support-batch duplicate metadata is compared when present; canonical row metadata lives in row-review. Final workbook/Google Sheet fields are outside this source-package check until the release has explicit final delivery approval.",
  source_package_only: true,
  sample_size_per_language: sampleSize,
  languages_reviewed: languageCodes.length,
  support_languages_reviewed: supportLanguageCodes.length,
  language_row_records_checked: records.length,
  checked_field_count: records.reduce((sum, record) => sum + record.checked_field_count, 0),
  sample_row_ids: [...sampleRowIds],
  sample_source_headwords: sampleRows.map((row) => row.source_headword),
  blocker_count: blockers.length,
  warning_signal_count: warnings.length,
  summary_by_language: byLanguage,
  blocker_sample: blockers.slice(0, 80),
  warning_signal_sample: warnings.slice(0, 120),
  records,
  inputs: {
    contract_path: relative(contractPath),
    row_review_path: contract.latest_row_review.path,
    english_examples_path: contract.latest_english_examples.path,
    edition_layer_path: contract.latest_edition_layer.path,
    en_us_pronunciation_path: enUsPronunciation.path,
    en_gb_pronunciation_path: enGbPronunciation.path,
    source_backed_audit_path: sourceAuditPath,
    example_quality_audit_path: exampleAuditPath,
    support_translation_batches: (contract.latest_support_translation_batches ?? []).map((batch) => ({
      batch_id: batch.batch_id,
      path: batch.path,
      languages: batch.languages,
    })),
  },
};

await writeJson(reportPath, report);
const csvHeader = [
  "status",
  "language_code",
  "language",
  "row_id",
  "source_headword",
  "part_of_speech",
  "display",
  "example",
  "checked_field_count",
  "blocker_codes",
  "warning_codes",
];
const csvRows = [
  csvHeader.join(","),
  ...records.map((record) =>
    [
      record.status,
      record.language_code,
      record.language,
      record.row_id,
      record.source_headword,
      record.part_of_speech,
      record.display,
      record.example,
      record.checked_field_count,
      record.blocker_codes.join("|"),
      record.warning_codes.join("|"),
    ]
      .map(safeCsv)
      .join(",")
  ),
];
await mkdir(path.dirname(csvPath), { recursive: true });
await writeFile(csvPath, `${csvRows.join("\n")}\n`, "utf8");

const md = [
  `# Oxford All-Fields Sample Review: ${releaseId}`,
  "",
  `- Report id: \`${reportId}\``,
  `- Status: \`${status}\``,
  `- Generated at: \`${generatedAt}\``,
  `- Scope: ${report.review_scope}`,
  `- Sample: ${sampleSize} rows per language variant`,
  `- Languages reviewed: ${languageCodes.length} (${supportLanguageCodes.length} support + EN + EN-GB)`,
  `- Language-row records checked: ${records.length}`,
  `- Checked fields: ${report.checked_field_count}`,
  `- Blockers: ${blockers.length}`,
  `- Warning signals: ${warnings.length}`,
  "",
  "## Sample Words",
  "",
  "| # | Source headword | POS | Meaning note |",
  "| --- | --- | --- | --- |",
  ...sampleRows.map((row, index) => `| ${index + 1} | \`${row.source_headword}\` | ${row.reviewed_part_of_speech} | ${row.meaning_note} |`),
  "",
  "## Summary By Language",
  "",
  "| Language | Rows | Checked fields | Blockers | Warning signals |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...byLanguage.map(
    (row) =>
      `| ${row.language_code} | ${row.sampled_rows} | ${row.checked_fields} | ${row.blockers} | ${row.warning_signals} |`
  ),
  "",
  "## Blockers",
  "",
  ...(blockers.length
    ? blockers.slice(0, 50).map((item) => `- \`${item.code}\` ${item.language_code ?? ""} ${item.row_id ?? ""}: ${item.message ?? item.reason ?? ""}`)
    : ["- none"]),
  "",
  "## Report Files",
  "",
  `- JSON: \`${relative(reportPath)}\``,
  `- CSV: \`${relative(csvPath)}\``,
  `- Markdown: \`${relative(mdPath)}\``,
  "",
];
await writeFile(mdPath, md.join("\n"), "utf8");

contract.latest_all_fields_sample_review = {
  report_id: reportId,
  script_path: scriptPath,
  script_version: scriptVersion,
  path: relative(reportPath),
  csv_path: relative(csvPath),
  markdown_path: relative(mdPath),
  status,
  generated_at: generatedAt,
  source_package_only: true,
  sample_size_per_language: sampleSize,
  languages_reviewed: languageCodes.length,
  support_languages_reviewed: supportLanguageCodes.length,
  language_row_records_checked: records.length,
  checked_field_count: report.checked_field_count,
  blocker_count: blockers.length,
  warning_signal_count: warnings.length,
  does_not_replace: "native-speaker certification, final workbook readback or final linguistic audit",
};
await writeJson(contractPath, contract);

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      report_id: reportId,
      status,
      sample_size_per_language: sampleSize,
      languages_reviewed: languageCodes.length,
      language_row_records_checked: records.length,
      checked_field_count: report.checked_field_count,
      blockers: blockers.length,
      warning_signals: warnings.length,
      report: relative(reportPath),
      contract_updated: contractPath,
    },
    null,
    2
  )
);

if (status !== "pass") process.exit(1);
