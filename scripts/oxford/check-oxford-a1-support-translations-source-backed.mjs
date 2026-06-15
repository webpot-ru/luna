#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  buildToolSourceBatchContext,
  buildToolSourceCandidatesForRow,
} from "../lib/tool-source-adapters.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportId = "support_translation_source_backed_audit_v1";
const scriptVersion = "2026-05-17.v2";
const defaultContractPath = "config/oxford-vocabulary-release-contract-v0.json";
const defaultOutputDir = "outputs/oxford-vocabulary/qa";
const supportLanguageExclusions = new Set(["EN", "EN-GB"]);
const lookupLanguageCode = new Map([["NO", "NB"]]);
const reportLanguageCode = new Map([["NB", "NO"]]);
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
const articlePrefixes = new Map([
  ["ES", ["el", "la", "los", "las", "un", "una", "unos", "unas"]],
  ["ES-419", ["el", "la", "los", "las", "un", "una", "unos", "unas"]],
  ["FR", ["le", "la", "les", "un", "une", "des", "l"]],
  ["DE", ["der", "die", "das", "den", "dem", "ein", "eine", "einen", "einem"]],
  ["IT", ["il", "lo", "la", "gli", "le", "un", "uno", "una", "l"]],
  ["PT", ["o", "a", "os", "as", "um", "uma", "uns", "umas"]],
  ["PT-BR", ["o", "a", "os", "as", "um", "uma", "uns", "umas"]],
  ["NL", ["de", "het", "een"]],
  ["SV", ["en", "ett"]],
  ["NO", ["en", "ei", "et"]],
  ["NB", ["en", "ei", "et"]],
  ["DA", ["en", "et"]],
  ["RO", ["un", "o", "niște"]],
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
const indexedSourceFiles = [
  {
    adapter: "panlex_meaning",
    path: "reference-sources/cache/bulk-source-indexes/panlex_meanings_candidates.jsonl",
    role: "english_to_target_translation_candidate",
  },
  {
    adapter: "weak_dictionary",
    path: "reference-sources/cache/bulk-source-indexes/weak_dictionary_candidates.jsonl",
    role: "weak_language_dictionary_candidate",
  },
  {
    adapter: "panlex",
    path: "reference-sources/cache/bulk-source-indexes/panlex_candidates.jsonl",
    role: "native_vocabulary_display_sanity",
  },
  {
    adapter: "wikidata",
    path: "reference-sources/cache/bulk-source-indexes/wikidata_lexemes.jsonl",
    role: "lexeme_display_sanity",
  },
  {
    adapter: "concept",
    path: "reference-sources/cache/bulk-source-indexes/concept_candidates.jsonl",
    role: "concept_label_sanity",
  },
];

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
    .replace(/['’`]/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function splitAlternatives(value) {
  return normalizeText(value)
    .split(/\s*;\s*/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dearticle(languageCode, value) {
  const comparable = normalizeComparable(value);
  if (!comparable) return "";
  const prefixes = articlePrefixes.get(languageCode) ?? [];
  for (const prefix of prefixes) {
    if (comparable === prefix) return comparable;
    if (comparable.startsWith(`${prefix} `)) return comparable.slice(prefix.length + 1).trim();
  }
  return comparable;
}

function comparableVariants(languageCode, value) {
  const variants = new Set();
  for (const part of splitAlternatives(value)) {
    const comparable = normalizeComparable(part);
    if (comparable) variants.add(comparable);
    const dearticled = dearticle(languageCode, part);
    if (dearticled) variants.add(dearticled);
  }
  const full = normalizeComparable(value);
  if (full) variants.add(full);
  return variants;
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

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sourceHash(paths, contents) {
  const hash = createHash("sha256");
  for (const item of paths) hash.update(item).update("\n");
  for (const item of contents) hash.update(item).update("\n");
  return hash.digest("hex");
}

function addCandidate(candidateMap, key, candidate, maxPerCell) {
  const rows = candidateMap.rowKeys.get(key);
  if (!rows) return;
  for (const row of rows) {
    const rowKey = `${row.meaning_id}::${row.language_code}`;
    if (!candidateMap.candidatesByCell.has(rowKey)) candidateMap.candidatesByCell.set(rowKey, []);
    const list = candidateMap.candidatesByCell.get(rowKey);
    if (list.length >= maxPerCell) continue;
    const dedupeKey = `${candidate.adapter}::${candidate.value}::${candidate.source_id}`;
    if (list.some((item) => `${item.adapter}::${item.value}::${item.source_id}` === dedupeKey)) continue;
    list.push(candidate);
  }
}

function buildIndexedCandidateLookup(auditRows) {
  const rowKeys = new Map();
  const addRowKey = (key, row) => {
    if (!key.endsWith("::")) {
      if (!rowKeys.has(key)) rowKeys.set(key, []);
      rowKeys.get(key).push(row);
    }
  };
  for (const row of auditRows) {
    for (const englishKey of comparableVariants(row.language_code, row.canonical_english)) {
      addRowKey(`english::${row.language_code}::${englishKey}`, row);
    }
    for (const nativeKey of comparableVariants(row.language_code, row.native_word)) {
      addRowKey(`native::${row.language_code}::${nativeKey}`, row);
    }
  }
  return { rowKeys, candidatesByCell: new Map() };
}

async function scanIndexedSources(auditRows, options = {}) {
  const startedAt = performance.now();
  const maxPerCell = Number(options.maxPerCell ?? 20);
  const lookup = buildIndexedCandidateLookup(auditRows);
  const sourceStats = [];
  const scanCounters = {
    files_present: 0,
    lines_scanned: 0,
    english_key_hits: 0,
    native_key_hits: 0,
    candidates_added: 0,
  };
  for (const sourceFile of indexedSourceFiles) {
    const absolute = path.join(projectRoot, sourceFile.path);
    if (!(await pathExists(absolute))) {
      sourceStats.push({ ...sourceFile, present: false });
      continue;
    }
    const info = await stat(absolute);
    scanCounters.files_present += 1;
    let lines = 0;
    const input = readline.createInterface({
      input: createReadStream(absolute, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    for await (const line of input) {
      if (!line.trim()) continue;
      lines += 1;
      scanCounters.lines_scanned += 1;
      let item = null;
      try {
        item = JSON.parse(line);
      } catch {
        continue;
      }
      const languageCode = item.language_code;
      if (!languageCode) continue;
      const value = normalizeText(item.value ?? item.concept_gloss ?? item.target_text ?? item.text ?? "");
      if (!value) continue;
      const sourceKey = normalizeComparable(item.source_key ?? item.source_text ?? item.concept_gloss ?? "");
      const tokenKey = normalizeComparable(item.token_key ?? value);
      const candidate = {
        adapter: item.source ?? sourceFile.adapter,
        value,
        confidence: item.confidence ?? "source_partial",
        source_id: item.source_id ?? "",
        source_ids: [item.source_id].filter(Boolean),
        note: `${sourceFile.role}; candidate evidence only.`,
      };
      if (sourceKey) {
        const before = lookup.candidatesByCell.size;
        addCandidate(lookup, `english::${languageCode}::${sourceKey}`, candidate, maxPerCell);
        const after = lookup.candidatesByCell.size;
        if (after >= before) scanCounters.english_key_hits += Number(lookup.rowKeys.has(`english::${languageCode}::${sourceKey}`));
      }
      if (tokenKey) {
        const before = lookup.candidatesByCell.size;
        addCandidate(lookup, `native::${languageCode}::${tokenKey}`, candidate, maxPerCell);
        const after = lookup.candidatesByCell.size;
        if (after >= before) scanCounters.native_key_hits += Number(lookup.rowKeys.has(`native::${languageCode}::${tokenKey}`));
      }
    }
    sourceStats.push({ ...sourceFile, present: true, bytes: info.size, lines_scanned: lines });
  }
  scanCounters.candidates_added = [...lookup.candidatesByCell.values()].reduce((sum, rows) => sum + rows.length, 0);
  return {
    candidatesByCell: lookup.candidatesByCell,
    sourceStats,
    scanCounters,
    runtime_ms: Number((performance.now() - startedAt).toFixed(3)),
  };
}

function topCandidates(candidates, currentVariants) {
  return candidates.slice(0, 8).map((candidate) => {
    const value = normalizeText(candidate.value);
    const variants = comparableVariants(candidate.language_code ?? candidate.languageCode ?? "", value);
    const currentMatch = [...variants].some((variant) => currentVariants.has(variant));
    return {
      adapter: candidate.adapter,
      value,
      confidence: candidate.confidence ?? "source_partial",
      source_ids: candidate.source_ids ?? (candidate.source_id ? [candidate.source_id] : []),
      current_match: currentMatch,
      note: candidate.note ?? candidate.reason ?? "",
    };
  });
}

function hardScriptBlocker(languageCode, value) {
  const pattern = hardScriptRequirements.get(languageCode);
  if (!pattern) return null;
  if (!normalizeText(value)) return "missing_display";
  return pattern.test(value) ? null : "display_missing_required_script";
}

function maybeEnglishFallback(languageCode, display, english) {
  if (hardScriptRequirements.has(languageCode)) return false;
  const displayComparable = normalizeComparable(display);
  const englishComparable = normalizeComparable(english);
  if (!displayComparable || !englishComparable) return false;
  return displayComparable === englishComparable;
}

function summarizeByLanguage(cells) {
  const byLanguage = new Map();
  for (const cell of cells) {
    if (!byLanguage.has(cell.language_code)) {
      byLanguage.set(cell.language_code, {
        language_code: cell.language_code,
        rows: 0,
        source_candidate_rows: 0,
        source_exact_or_normalized_match_rows: 0,
        source_partial_only_rows: 0,
        no_source_candidate_rows: 0,
        blockers: 0,
        warnings: 0,
      });
    }
    const summary = byLanguage.get(cell.language_code);
    summary.rows += 1;
    if (cell.source_candidate_count > 0) summary.source_candidate_rows += 1;
    if (cell.source_match_count > 0) summary.source_exact_or_normalized_match_rows += 1;
    if (cell.source_candidate_count > 0 && cell.source_match_count === 0) summary.source_partial_only_rows += 1;
    if (cell.source_candidate_count === 0) summary.no_source_candidate_rows += 1;
    if (cell.status === "blocker") summary.blockers += 1;
    summary.warnings += cell.warning_codes.length;
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
  const fullAdapters = hasFlag("full-adapters");
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
  const auditRows = [];
  const batchPaths = [];
  const batchContents = [];
  for (const batch of contract.latest_support_translation_batches ?? []) {
    batchPaths.push(batch.path);
    batchContents.push(await readFile(batch.path, "utf8"));
    const rows = await readJsonl(batch.path);
    for (const row of rows) {
      const reviewRow = rowReviewByRowId.get(row.row_id) ?? row;
      for (const supportLanguage of batch.languages ?? []) {
        if (supportLanguageExclusions.has(supportLanguage)) continue;
        if (languageFilter.size && !languageFilter.has(supportLanguage)) continue;
        const lookupCode = lookupLanguageCode.get(supportLanguage) ?? supportLanguage;
        const display = normalizeText(row[supportLanguage]);
        auditRows.push({
          set_id: releaseId,
          line: auditRows.length + 2,
          row_id: row.row_id,
          core_item_id: row.core_item_id,
          meaning_id: row.meaning_id,
          language_code: lookupCode,
          report_language_code: supportLanguage,
          canonical_english: normalizeText(reviewRow.reviewed_display_headword ?? row.reviewed_display_headword),
          source_headword: normalizeText(row.source_headword),
          meaning_note: normalizeText(row.meaning_note),
          semantic_scene: reviewRow.semantic_scene ?? null,
          part_of_speech: normalizeText(reviewRow.reviewed_part_of_speech ?? row.reviewed_part_of_speech),
          native_word: display,
          display_word: display,
          word_with_article_or_marker: display,
          example_text: normalizeText(row[`example_${supportLanguage}`]),
        });
      }
    }
  }
  if (limit > 0) auditRows.length = Math.min(auditRows.length, limit);

  const toolContext = fullAdapters
    ? await buildToolSourceBatchContext({
        rows: auditRows,
        features: {
          epitran: false,
          unimorph: false,
          dakshina: false,
          mtSanity: false,
        },
      })
    : null;
  const indexedScan = await scanIndexedSources(auditRows, {
    maxPerCell: Number(argValue("max-candidates-per-cell", "20")),
  });

  const cells = [];
  const blockers = [];
  const warnings = [];

  for (const row of auditRows) {
    const reportCode = reportLanguageCode.get(row.language_code) ?? row.report_language_code ?? row.language_code;
    const currentVariants = comparableVariants(reportCode, row.native_word);
    const toolResult = fullAdapters
      ? await buildToolSourceCandidatesForRow(row, toolContext)
      : { candidates: [], findings: [] };
    const sourceCandidates = [
      ...toolResult.candidates.filter((candidate) => candidate.field === "native_word"),
      ...(indexedScan.candidatesByCell.get(`${row.meaning_id}::${row.language_code}`) ?? []),
    ];
    const candidates = sourceCandidates.map((candidate) => ({
      ...candidate,
      language_code: reportCode,
      source_id: candidate.source_id,
      source_ids: candidate.source_ids ?? (candidate.source_id ? [candidate.source_id] : []),
    }));
    const matches = candidates.filter((candidate) => {
      const variants = comparableVariants(reportCode, candidate.value);
      return [...variants].some((variant) => currentVariants.has(variant));
    });
    const warningCodes = [];
    const blockerCodes = [];
    const scriptIssue = hardScriptBlocker(reportCode, row.native_word);
    if (scriptIssue) blockerCodes.push(scriptIssue);
    if (maybeEnglishFallback(reportCode, row.native_word, row.canonical_english)) {
      warningCodes.push("exact_english_surface_needs_loan_review");
    }
    if (candidates.length === 0) warningCodes.push("no_source_candidate");
    if (candidates.length > 0 && matches.length === 0) warningCodes.push("source_candidates_without_current_match");
    if (weakOrTargetedLanguages.has(reportCode) && candidates.length === 0) warningCodes.push("weak_language_no_source_candidate");

    const status = blockerCodes.length ? "blocker" : "pass";
    const cell = {
      status,
      row_id: row.row_id,
      meaning_id: row.meaning_id,
      language_code: reportCode,
      lookup_language_code: row.language_code,
      canonical_english: row.canonical_english,
      source_headword: row.source_headword,
      display: row.native_word,
      meaning_note: row.meaning_note,
      source_candidate_count: candidates.length,
      source_match_count: matches.length,
      source_candidate_adapters: [...new Set(candidates.map((candidate) => candidate.adapter).filter(Boolean))].sort(),
      matched_candidate_sample: topCandidates(matches, currentVariants),
      candidate_sample: topCandidates(candidates, currentVariants),
      warning_codes: [...new Set(warningCodes)].sort(),
      blocker_codes: [...new Set(blockerCodes)].sort(),
    };
    cells.push(cell);
    for (const code of cell.blocker_codes) {
      blockers.push({
        code,
        row_id: cell.row_id,
        meaning_id: cell.meaning_id,
        language_code: cell.language_code,
        display: cell.display,
        canonical_english: cell.canonical_english,
      });
    }
    for (const code of cell.warning_codes) {
      warnings.push({
        code,
        row_id: cell.row_id,
        meaning_id: cell.meaning_id,
        language_code: cell.language_code,
        display: cell.display,
        canonical_english: cell.canonical_english,
        source_candidate_count: cell.source_candidate_count,
        source_match_count: cell.source_match_count,
        candidate_sample: cell.candidate_sample.slice(0, 3),
      });
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
      fullAdapters
        ? "Oxford A1 support-language display translations checked against local indexed source candidates and full local source adapters. Sources are candidate evidence, not automatic truth or native-speaker approval."
        : "Oxford A1 support-language display translations checked against local indexed source candidates. Sources are candidate evidence, not automatic truth or native-speaker approval.",
    source_hash: sourceHash(batchPaths, batchContents),
    rows_checked: auditRows.length,
    support_languages_checked: new Set(cells.map((cell) => cell.language_code)).size,
    display_cells_checked: cells.length,
    source_candidate_rows: cells.filter((cell) => cell.source_candidate_count > 0).length,
    source_exact_or_normalized_match_rows: cells.filter((cell) => cell.source_match_count > 0).length,
    source_partial_only_rows: cells.filter((cell) => cell.source_candidate_count > 0 && cell.source_match_count === 0).length,
    no_source_candidate_rows: cells.filter((cell) => cell.source_candidate_count === 0).length,
    blocker_count: blockers.length,
    warning_count: warnings.length,
    warning_code_counts: warnings.reduce((acc, warning) => {
      acc[warning.code] = (acc[warning.code] ?? 0) + 1;
      return acc;
    }, {}),
    indexed_source_stats: indexedScan.sourceStats,
    indexed_scan_counters: indexedScan.scanCounters,
    indexed_scan_runtime_ms: indexedScan.runtime_ms,
    full_adapters_enabled: fullAdapters,
    tool_context_availability: toolContext?.availability ?? null,
    tool_context_warnings: toolContext?.warnings ?? [],
    summary_by_language: byLanguage,
    blocker_sample: blockers.slice(0, 80),
    warning_sample: warnings.slice(0, 160),
    cells,
    inputs: {
      contract_path: relative(contractPath),
      row_review_path: contract.latest_row_review.path,
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
    "canonical_english",
    "display",
    "source_candidate_count",
    "source_match_count",
    "warning_codes",
    "blocker_codes",
    "adapters",
  ];
  const csvRows = [
    csvHeader.join(","),
    ...cells.map((cell) =>
      [
        cell.status,
        cell.language_code,
        cell.row_id,
        cell.meaning_id,
        cell.canonical_english,
        cell.display,
        String(cell.source_candidate_count),
        String(cell.source_match_count),
        cell.warning_codes.join("|"),
        cell.blocker_codes.join("|"),
        cell.source_candidate_adapters.join("|"),
      ]
        .map((value) => `"${String(value).replace(/"/gu, '""')}"`)
        .join(",")
    ),
  ];
  await mkdir(path.dirname(reportCsvPath), { recursive: true });
  await writeFile(reportCsvPath, `${csvRows.join("\n")}\n`);

  const md = [
    `# Oxford A1 Support Translation Source-Backed Audit: ${releaseId}`,
    "",
    `- Report id: \`${outputReportId}\``,
    `- Status: \`${status}\``,
    `- Generated at: \`${generatedAt}\``,
    `- Scope: ${report.audit_scope}`,
    `- Display cells checked: ${report.display_cells_checked}`,
    `- Support languages checked: ${report.support_languages_checked}`,
    `- Source candidate rows: ${report.source_candidate_rows}`,
    `- Exact/normalized current matches: ${report.source_exact_or_normalized_match_rows}`,
    `- Source candidates without current match: ${report.source_partial_only_rows}`,
    `- No source candidate rows: ${report.no_source_candidate_rows}`,
    `- Blockers: ${report.blocker_count}`,
    `- Warnings: ${report.warning_count}`,
    `- Runtime: ${report.runtime_ms} ms`,
    "",
    "## Summary By Language",
    "",
    "| Language | Rows | Source candidates | Current matches | Partial only | No source | Blockers | Warnings |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...byLanguage.map(
      (row) =>
        `| ${row.language_code} | ${row.rows} | ${row.source_candidate_rows} | ${row.source_exact_or_normalized_match_rows} | ${row.source_partial_only_rows} | ${row.no_source_candidate_rows} | ${row.blockers} | ${row.warnings} |`
    ),
    "",
    "## Warning Codes",
    "",
    ...Object.entries(report.warning_code_counts)
      .sort((left, right) => right[1] - left[1])
      .map(([code, count]) => `- \`${code}\`: ${count}`),
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
    contract.latest_support_translation_source_backed_audit = {
      report_id: reportId,
      script_path: relative(fileURLToPath(import.meta.url)),
      path: relative(reportJsonPath),
      csv_path: relative(reportCsvPath),
      markdown_path: relative(reportMdPath),
      status,
      generated_at: generatedAt,
      display_cells_checked: report.display_cells_checked,
      support_languages_checked: report.support_languages_checked,
      source_candidate_rows: report.source_candidate_rows,
      source_exact_or_normalized_match_rows: report.source_exact_or_normalized_match_rows,
      source_partial_only_rows: report.source_partial_only_rows,
      no_source_candidate_rows: report.no_source_candidate_rows,
      blocker_count: report.blocker_count,
      warning_count: report.warning_count,
      audit_scope: report.audit_scope,
      source_hash: report.source_hash,
      does_not_replace: "native-speaker certification or full final linguistic audit",
    };
    if (!hasFlag("no-contract-update")) await writeJson(contractPath, contract);
  } else if (!hasFlag("no-contract-update")) {
    console.warn("Filtered source-backed audit run did not update the full-release contract pointer.");
  }

  console.log(
    `Oxford support translation source-backed audit status=${status} cells=${report.display_cells_checked} languages=${report.support_languages_checked} candidates=${report.source_candidate_rows} matches=${report.source_exact_or_normalized_match_rows} blockers=${report.blocker_count} warnings=${report.warning_count} report=${relative(reportJsonPath)}`
  );
  if (status !== "pass") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
