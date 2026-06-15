#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { validateActionExampleSurface } from "../lib/action-example-surface.mjs";
import { validateCjkExampleSpacing } from "../lib/cjk-example-spacing.mjs";
import { validateExampleCasing } from "../lib/example-casing.mjs";
import { validateExampleNaturalness } from "../lib/example-naturalness.mjs";
import { validateSoutheastAsianExampleSpacing } from "../lib/southeast-asian-example-spacing.mjs";
import { validateTargetExampleLexicalAnchor } from "../lib/target-example-lexical-anchor.mjs";
import { validateTargetExamplePedagogicalQuality } from "../lib/target-example-pedagogical-quality.mjs";
import { validateThaiExampleSpacing } from "../lib/thai-example-spacing.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportId = "support_example_quality_audit_v1";
const scriptVersion = "2026-05-17.v1";
const defaultContractPath = "config/oxford-vocabulary-release-contract-v0.json";
const defaultOutputDir = "outputs/oxford-vocabulary/qa";
const englishVariants = new Set(["EN", "EN-GB"]);
const validatorLanguageCode = new Map([["NO", "NB"]]);
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
const weakOrTargetedLanguages = new Set([
  "ZH",
  "JA",
  "KO",
  "TH",
  "HI",
  "BN",
  "TL",
  "MY",
  "KM",
  "LO",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
  "UZ",
  "KK",
  "AZ",
  "KA",
  "HY",
  "SW",
  "PT-BR",
  "ES-419",
]);
const sentenceEndPattern = /[.!?。！？।။។։]$/u;

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function relative(filePath) {
  return path.relative(projectRoot, path.resolve(projectRoot, filePath));
}

function safeFileToken(value) {
  return normalizeText(value).replace(/[^\p{Letter}\p{Number}]+/gu, "_").replace(/^_+|_+$/gu, "").toLowerCase();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  return (await readFile(filePath, "utf8"))
    .split(/\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function sourceHash(paths, contents) {
  const hash = createHash("sha256");
  for (const item of paths) hash.update(item).update("\n");
  for (const item of contents) hash.update(item).update("\n");
  return hash.digest("hex");
}

function issue(code, severity, message, detail = {}) {
  return { code, severity, message, ...detail };
}

function scriptIssue(languageCode, value) {
  const pattern = hardScriptRequirements.get(languageCode);
  if (!pattern) return null;
  if (!normalizeText(value)) return "missing_example";
  return pattern.test(value) ? null : "example_missing_required_script";
}

function exactEnglishFallback(row) {
  const example = normalizeComparable(row.example_text);
  const english = normalizeComparable(row.canonical_example_en);
  return Boolean(example && english && example === english);
}

function knownOxfordSupportExampleIssues(row) {
  const issues = [];
  if (row.language_code === "SW" && /\blake\s+hunisaidia\b/iu.test(row.example_text)) {
    issues.push(
      issue(
        "swahili_agreement_suspicious",
        "warning",
        "SW example has suspicious agreement around 'lake hunisaidia'; keep as warning until repaired or source-reviewed."
      )
    );
  }
  return issues;
}

function downgradeKnownValidatorFalsePositive(row, message) {
  if (
    row.validator_language_code === "HY" &&
    message.includes("literal 'X է location/state է'") &&
    !/\sէ\s+.+\sէ(?:[։.]|$)/u.test(row.example_text)
  ) {
    return "hy_auxiliary_false_positive";
  }
  if (
    row.validator_language_code === "KO" &&
    message.includes("attach topic/subject particles") &&
    /\s이\s+\p{Script=Hangul}/u.test(row.example_text)
  ) {
    return "ko_demonstrative_i_false_positive";
  }
  return "";
}

function deterministicIssues(row) {
  const issues = [];
  if (!normalizeText(row.example_text)) {
    issues.push(issue("missing_example", "blocker", "Support example is empty."));
  } else if (!sentenceEndPattern.test(normalizeText(row.example_text))) {
    issues.push(issue("missing_sentence_punctuation", "blocker", "Support example lacks sentence punctuation."));
  }

  const requiredScriptIssue = scriptIssue(row.report_language_code, row.example_text);
  if (requiredScriptIssue && requiredScriptIssue !== "missing_example") {
    issues.push(issue(requiredScriptIssue, "blocker", "Support example does not contain the expected script."));
  }
  if (exactEnglishFallback(row)) {
    issues.push(issue("exact_english_example_fallback", "warning", "Support example exactly matches the English example."));
  }

  const validatorRow = { ...row, language_code: row.validator_language_code };
  for (const message of validateExampleCasing(validatorRow)) {
    issues.push(issue("example_casing", "blocker", message));
  }
  for (const finding of validateCjkExampleSpacing(validatorRow)) {
    issues.push(issue("cjk_example_spacing", "blocker", finding.issue, { snippet: finding.snippet }));
  }
  for (const finding of validateThaiExampleSpacing(validatorRow)) {
    issues.push(issue("thai_example_spacing", "blocker", finding.issue, { snippet: finding.snippet }));
  }
  for (const finding of validateSoutheastAsianExampleSpacing(validatorRow)) {
    issues.push(issue("southeast_asian_example_spacing", "blocker", finding.issue, { snippet: finding.snippet }));
  }
  for (const finding of validateActionExampleSurface(validatorRow)) {
    issues.push(issue("action_example_surface", "blocker", finding.issue));
  }
  for (const message of validateExampleNaturalness(validatorRow)) {
    const falsePositiveCode = downgradeKnownValidatorFalsePositive(row, message);
    if (falsePositiveCode) {
      issues.push(issue(falsePositiveCode, "warning", message));
    } else {
      issues.push(issue("example_naturalness_shape", "blocker", message));
    }
  }
  for (const finding of validateTargetExamplePedagogicalQuality(validatorRow)) {
    issues.push(issue("target_example_pedagogical_quality", finding.severity, finding.issue));
  }
  for (const finding of validateTargetExampleLexicalAnchor(validatorRow)) {
    issues.push(
      issue(
        "target_example_lexical_anchor",
        "warning",
        finding.issue,
        { source_severity: finding.severity }
      )
    );
  }
  issues.push(...knownOxfordSupportExampleIssues(row));

  if (weakOrTargetedLanguages.has(row.report_language_code)) {
    issues.push(issue("weak_language_example_review_signal", "warning", "Weak-source language example should stay visible for future sampled review."));
  }
  return issues;
}

function summarizeByLanguage(cells) {
  const byLanguage = new Map();
  for (const cell of cells) {
    if (!byLanguage.has(cell.language_code)) {
      byLanguage.set(cell.language_code, {
        language_code: cell.language_code,
        rows: 0,
        blockers: 0,
        warnings: 0,
        lexical_anchor_warnings: 0,
        weak_language_review_signals: 0,
      });
    }
    const summary = byLanguage.get(cell.language_code);
    summary.rows += 1;
    summary.blockers += cell.blocker_codes.length;
    summary.warnings += cell.warning_codes.length;
    if (cell.warning_codes.includes("target_example_lexical_anchor")) summary.lexical_anchor_warnings += 1;
    if (cell.warning_codes.includes("weak_language_example_review_signal")) summary.weak_language_review_signals += 1;
  }
  return [...byLanguage.values()].sort((left, right) => left.language_code.localeCompare(right.language_code));
}

async function main() {
  const startedAt = performance.now();
  const contractPath = argValue("contract", defaultContractPath);
  const outputDir = argValue("output-dir", defaultOutputDir);
  const languageFilter = new Set(
    argValue("languages", "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const limit = Number(argValue("limit", "0"));
  const contract = await readJson(contractPath);
  const releaseId = contract.latest_source_snapshot.release_id;
  const generatedAt = new Date().toISOString();
  const filteredRun = languageFilter.size > 0 || limit > 0;
  const reportNameParts = [];
  if (languageFilter.size) reportNameParts.push(`languages_${[...languageFilter].sort().map(safeFileToken).join("_")}`);
  if (limit > 0) reportNameParts.push(`limit_${limit}`);
  const outputReportId = filteredRun ? `${reportId}_${reportNameParts.join("_")}` : reportId;
  const reportJsonPath = path.join(outputDir, `${releaseId}_${outputReportId}.json`);
  const reportMdPath = path.join(outputDir, `${releaseId}_${outputReportId}.md`);
  const reportCsvPath = path.join(outputDir, `${releaseId}_${outputReportId}.csv`);

  const rowReviewRows = await readJsonl(contract.latest_row_review.path);
  const rowReviewByRowId = new Map(rowReviewRows.map((row) => [row.row_id, row]));
  const englishExampleRows = await readJsonl(contract.latest_english_examples.path);
  const englishExampleByRowId = new Map(englishExampleRows.map((row) => [row.row_id, row]));
  const auditRows = [];
  const batchPaths = [];
  const batchContents = [];

  for (const batch of contract.latest_support_translation_batches ?? []) {
    batchPaths.push(batch.path);
    batchContents.push(await readFile(batch.path, "utf8"));
    const rows = await readJsonl(batch.path);
    for (const row of rows) {
      const reviewRow = rowReviewByRowId.get(row.row_id) ?? row;
      const englishExample = englishExampleByRowId.get(row.row_id) ?? {};
      for (const languageCode of batch.languages ?? []) {
        if (englishVariants.has(languageCode)) continue;
        if (languageFilter.size && !languageFilter.has(languageCode)) continue;
        const validatorCode = validatorLanguageCode.get(languageCode) ?? languageCode;
        auditRows.push({
          set_id: releaseId,
          row_id: row.row_id,
          core_item_id: row.core_item_id,
          meaning_id: row.meaning_id,
          language_code: languageCode,
          report_language_code: languageCode,
          validator_language_code: validatorCode,
          source_headword: normalizeText(row.source_headword),
          canonical_english: normalizeText(reviewRow.reviewed_display_headword ?? row.reviewed_display_headword),
          canonical_example_en: normalizeText(englishExample.example_EN ?? row.example_EN),
          meaning_note: normalizeText(row.meaning_note),
          semantic_scene: reviewRow.semantic_scene ?? null,
          part_of_speech: normalizeText(reviewRow.reviewed_part_of_speech ?? row.reviewed_part_of_speech),
          display_word: normalizeText(row[languageCode]),
          native_word: normalizeText(row[languageCode]),
          word_with_article_or_marker: normalizeText(row[languageCode]),
          example_text: normalizeText(row[`example_${languageCode}`]),
        });
      }
    }
  }
  if (limit > 0) auditRows.length = Math.min(auditRows.length, limit);

  const cells = [];
  const blockers = [];
  const warnings = [];
  for (const row of auditRows) {
    const issues = deterministicIssues(row);
    const blockerCodes = [...new Set(issues.filter((item) => item.severity === "blocker" || item.severity === "fail").map((item) => item.code))].sort();
    const warningCodes = [...new Set(issues.filter((item) => item.severity !== "blocker" && item.severity !== "fail").map((item) => item.code))].sort();
    const cell = {
      status: blockerCodes.length ? "blocker" : "pass",
      row_id: row.row_id,
      meaning_id: row.meaning_id,
      language_code: row.report_language_code,
      source_headword: row.source_headword,
      canonical_example_en: row.canonical_example_en,
      display: row.display_word,
      example: row.example_text,
      warning_codes: warningCodes,
      blocker_codes: blockerCodes,
      issue_sample: issues.slice(0, 8),
    };
    cells.push(cell);
    for (const issueItem of issues) {
      const target = {
        code: issueItem.code,
        row_id: cell.row_id,
        meaning_id: cell.meaning_id,
        language_code: cell.language_code,
        source_headword: cell.source_headword,
        display: cell.display,
        example: cell.example,
        message: issueItem.message,
      };
      if (issueItem.severity === "blocker" || issueItem.severity === "fail") blockers.push(target);
      else warnings.push(target);
    }
  }

  const byLanguage = summarizeByLanguage(cells);
  const status = blockers.length === 0 ? "pass" : "blocker";
  const report = {
    release_id: releaseId,
    report_id: outputReportId,
    script_version: scriptVersion,
    generated_at: generatedAt,
    status,
    audit_scope:
      "Oxford A1 support-language examples checked with deterministic shape, script, casing, spacing, known naturalness, pedagogical and lexical-anchor gates. This is not native-speaker certification.",
    source_hash: sourceHash(batchPaths, [...batchContents, await readFile(contract.latest_english_examples.path, "utf8")]),
    rows_checked: auditRows.length,
    support_languages_checked: new Set(cells.map((cell) => cell.language_code)).size,
    example_cells_checked: cells.length,
    blocker_count: blockers.length,
    warning_count: warnings.length,
    blocker_code_counts: blockers.reduce((acc, item) => {
      acc[item.code] = (acc[item.code] ?? 0) + 1;
      return acc;
    }, {}),
    warning_code_counts: warnings.reduce((acc, item) => {
      acc[item.code] = (acc[item.code] ?? 0) + 1;
      return acc;
    }, {}),
    summary_by_language: byLanguage,
    blocker_sample: blockers.slice(0, 120),
    warning_sample: warnings.slice(0, 160),
    cells,
    inputs: {
      contract_path: relative(contractPath),
      row_review_path: contract.latest_row_review.path,
      english_examples_path: contract.latest_english_examples.path,
      support_translation_batches: (contract.latest_support_translation_batches ?? []).map((batch) => ({
        batch_id: batch.batch_id,
        path: batch.path,
        languages: batch.languages,
      })),
    },
    runtime_ms: Number((performance.now() - startedAt).toFixed(3)),
  };

  await writeJson(reportJsonPath, report);
  const csvHeader = [
    "status",
    "language_code",
    "row_id",
    "meaning_id",
    "source_headword",
    "display",
    "example",
    "warning_codes",
    "blocker_codes",
  ];
  const csvRows = [
    csvHeader.join(","),
    ...cells.map((cell) =>
      [
        cell.status,
        cell.language_code,
        cell.row_id,
        cell.meaning_id,
        cell.source_headword,
        cell.display,
        cell.example,
        cell.warning_codes.join("|"),
        cell.blocker_codes.join("|"),
      ]
        .map((value) => `"${String(value).replace(/"/gu, '""')}"`)
        .join(",")
    ),
  ];
  await mkdir(path.dirname(reportCsvPath), { recursive: true });
  await writeFile(reportCsvPath, `${csvRows.join("\n")}\n`);

  const md = [
    `# Oxford A1 Support Example Quality Audit: ${releaseId}`,
    "",
    `- Report id: \`${outputReportId}\``,
    `- Status: \`${status}\``,
    `- Generated at: \`${generatedAt}\``,
    `- Scope: ${report.audit_scope}`,
    `- Example cells checked: ${report.example_cells_checked}`,
    `- Support languages checked: ${report.support_languages_checked}`,
    `- Blockers: ${report.blocker_count}`,
    `- Warnings: ${report.warning_count}`,
    `- Runtime: ${report.runtime_ms} ms`,
    "",
    "## Summary By Language",
    "",
    "| Language | Rows | Blockers | Warnings | Lexical-anchor warnings | Weak-language signals |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...byLanguage.map(
      (row) =>
        `| ${row.language_code} | ${row.rows} | ${row.blockers} | ${row.warnings} | ${row.lexical_anchor_warnings} | ${row.weak_language_review_signals} |`
    ),
    "",
    "## Blocker Codes",
    "",
    ...(
      Object.entries(report.blocker_code_counts).length
        ? Object.entries(report.blocker_code_counts)
            .sort((left, right) => right[1] - left[1])
            .map(([code, count]) => `- \`${code}\`: ${count}`)
        : ["- None."]
    ),
    "",
    "## Warning Codes",
    "",
    ...(
      Object.entries(report.warning_code_counts).length
        ? Object.entries(report.warning_code_counts)
            .sort((left, right) => right[1] - left[1])
            .map(([code, count]) => `- \`${code}\`: ${count}`)
        : ["- None."]
    ),
    "",
    "## Report Files",
    "",
    `- JSON: \`${relative(reportJsonPath)}\``,
    `- CSV: \`${relative(reportCsvPath)}\``,
    `- Markdown: \`${relative(reportMdPath)}\``,
    "",
  ];
  await writeFile(reportMdPath, md.join("\n"));

  if (!filteredRun) {
    contract.latest_support_example_quality_audit = {
      report_id: reportId,
      script_path: relative(fileURLToPath(import.meta.url)),
      path: relative(reportJsonPath),
      csv_path: relative(reportCsvPath),
      markdown_path: relative(reportMdPath),
      status,
      generated_at: generatedAt,
      example_cells_checked: report.example_cells_checked,
      support_languages_checked: report.support_languages_checked,
      blocker_count: report.blocker_count,
      warning_count: report.warning_count,
      audit_scope: report.audit_scope,
      source_hash: report.source_hash,
      does_not_replace: "native-speaker certification or full final linguistic audit",
    };
    if (!hasFlag("no-contract-update")) await writeJson(contractPath, contract);
  } else if (!hasFlag("no-contract-update")) {
    console.warn("Filtered support-example audit run did not update the full-release contract pointer.");
  }

  console.log(
    `Oxford support example quality audit status=${status} cells=${report.example_cells_checked} languages=${report.support_languages_checked} blockers=${report.blocker_count} warnings=${report.warning_count} report=${relative(reportJsonPath)}`
  );
  if (status !== "pass") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
