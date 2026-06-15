#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptVersion = "2026-06-02.v1";
const defaultOutputDir = "outputs/oxford-vocabulary/qa";
const defaultLanguages = ["AZ", "SW", "KK", "KM", "MY", "NE"];
const dictionarySources = new Set([
  "kalebu_kamusi_sw",
  "kalebu-kamusi-sw",
  "seanghay_lexicon_kh",
  "seanghay-lexicon-kh-parquet",
  "myanmar_open_wordnet",
  "myanmar-open-wordnet-013-tab",
  "nepali_brihat_sabdakosh",
  "nepali-brihat-sabdakosh-json-gz",
]);
const exampleSources = new Set([
  "localdoc_az_en_size_balanced",
  "localdoc-azerbaijani-english-parallel-size-balanced",
  "kk_en_corpora_zenodo",
  "kk_en_corpora_zenodo_v1",
  "kk-en-corpora-zenodo-v1",
]);
const hardScriptRequirements = new Map([
  ["KK", /[\u0400-\u04FF]/u],
  ["MY", /[\u1000-\u109F]/u],
  ["KM", /[\u1780-\u17FF]/u],
  ["NE", /[\u0900-\u097F]/u],
]);

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

function tokens(value) {
  return normalizeComparable(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function contentTokens(value) {
  return tokens(value).filter((token) => token.length >= 3 || /[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Devanagari}]/u.test(token));
}

function sourceKey(item) {
  return normalizeComparable(item.source_id ?? item.source ?? "");
}

function sourceAllowed(item, allowed) {
  const allowedKeys = new Set(
    [...allowed].flatMap((key) => [
      key,
      key.replace(/-/gu, "_"),
      key.replace(/_/gu, "-"),
      normalizeComparable(key),
    ])
  );
  const keys = new Set([
    sourceKey(item),
    normalizeComparable(item.source),
    normalizeComparable(item.source_id),
    String(item.source ?? ""),
    String(item.source_id ?? ""),
  ]);
  for (const key of keys) {
    if (allowedKeys.has(key) || allowedKeys.has(key.replace(/-/gu, "_")) || allowedKeys.has(key.replace(/_/gu, "-"))) return true;
  }
  return false;
}

function relative(filePath) {
  return path.relative(projectRoot, path.resolve(projectRoot, filePath));
}

function safeToken(value) {
  return normalizeText(value).replace(/[^\p{Letter}\p{Number}]+/gu, "_").replace(/^_+|_+$/gu, "").toLowerCase();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.join(projectRoot, filePath), "utf8"));
}

async function readJsonl(filePath) {
  return (await readFile(path.join(projectRoot, filePath), "utf8"))
    .split(/\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function contractPathsFromArgs() {
  const explicit = argValue("contracts", "");
  if (explicit) return explicit.split(",").map((item) => item.trim()).filter(Boolean);
  const entries = await readdir(path.join(projectRoot, "config"));
  return entries
    .filter((name) => /oxford.*contract.*v0\.json$/u.test(name))
    .map((name) => path.join("config", name))
    .sort();
}

function addIndex(map, key, row) {
  if (!key) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(row);
}

function addSample(list, sample, limit = 5) {
  const key = JSON.stringify(sample);
  if (list.some((item) => JSON.stringify(item) === key)) return;
  if (list.length < limit) list.push(sample);
}

function overlapCount(left, right) {
  let count = 0;
  for (const token of left) if (right.has(token)) count += 1;
  return count;
}

async function loadAuditCells(contractPaths, languageFilter) {
  const cells = [];
  const supportPaths = new Set();
  const contractInputs = [];
  for (const contractPath of contractPaths) {
    const contract = await readJson(contractPath);
    const releaseId = contract.latest_source_snapshot?.release_id;
    if (!releaseId) continue;
    const rowReviewPath = contract.latest_row_review?.path;
    const rowReviews = rowReviewPath ? await readJsonl(rowReviewPath) : [];
    const rowReviewById = new Map(rowReviews.map((row) => [row.row_id, row]));
    for (const batch of contract.latest_support_translation_batches ?? []) {
      const batchLanguages = (batch.languages ?? []).filter((language) => languageFilter.has(language));
      if (!batchLanguages.length) continue;
      supportPaths.add(batch.path);
      const rows = await readJsonl(batch.path);
      for (const row of rows) {
        const reviewRow = rowReviewById.get(row.row_id) ?? row;
        for (const languageCode of batchLanguages) {
          const display = normalizeText(row[languageCode]);
          const example = normalizeText(row[`example_${languageCode}`]);
          const english = normalizeText(reviewRow.reviewed_display_headword ?? row.reviewed_display_headword ?? row.source_headword);
          const englishExample = normalizeText(row.example_EN ?? reviewRow.example_EN ?? "");
          const cell = {
            key: `${releaseId}::${row.row_id}::${languageCode}`,
            release_id: releaseId,
            row_id: row.row_id,
            meaning_id: row.meaning_id,
            language_code: languageCode,
            source_headword: normalizeText(row.source_headword),
            canonical_english: english,
            meaning_note: normalizeText(row.meaning_note ?? reviewRow.meaning_note),
            display,
            example,
            example_EN: englishExample,
            english_tokens: new Set([...contentTokens(english), ...contentTokens(row.source_headword)]),
            display_tokens: new Set(contentTokens(display)),
            example_tokens: new Set(contentTokens(example)),
            source_signals: {
              dictionary_candidates: 0,
              dictionary_current_matches: 0,
              example_collocation_candidates: 0,
              example_target_overlap: 0,
              sources: new Set(),
              samples: [],
            },
            issues: [],
          };
          cells.push(cell);
        }
      }
    }
    contractInputs.push({
      contract_path: contractPath,
      release_id: releaseId,
      row_review_path: rowReviewPath ?? null,
      support_batches: (contract.latest_support_translation_batches ?? [])
        .filter((batch) => (batch.languages ?? []).some((language) => languageFilter.has(language)))
        .map((batch) => ({ path: batch.path, languages: (batch.languages ?? []).filter((language) => languageFilter.has(language)) })),
    });
  }
  return { cells, supportPaths: [...supportPaths].sort(), contractInputs };
}

function buildLookup(cells) {
  const byLanguage = new Map();
  const byEnglishKey = new Map();
  const byNativeKey = new Map();
  const byEnglishToken = new Map();
  const byNativeToken = new Map();
  for (const cell of cells) {
    if (!byLanguage.has(cell.language_code)) byLanguage.set(cell.language_code, []);
    byLanguage.get(cell.language_code).push(cell);
    for (const key of [cell.canonical_english, cell.source_headword].map(normalizeComparable).filter(Boolean)) {
      addIndex(byEnglishKey, `${cell.language_code}::${key}`, cell);
    }
    for (const key of [cell.display].map(normalizeComparable).filter(Boolean)) {
      addIndex(byNativeKey, `${cell.language_code}::${key}`, cell);
    }
    for (const token of cell.english_tokens) addIndex(byEnglishToken, `${cell.language_code}::${token}`, cell);
    for (const token of cell.display_tokens) addIndex(byNativeToken, `${cell.language_code}::${token}`, cell);
  }
  return { byLanguage, byEnglishKey, byNativeKey, byEnglishToken, byNativeToken };
}

function matchedByTokens(tokenIndex, languageCode, itemTokens) {
  const matched = new Set();
  for (const token of itemTokens) {
    const rows = tokenIndex.get(`${languageCode}::${token}`);
    if (!rows) continue;
    for (const row of rows) matched.add(row);
  }
  return matched;
}

function attachDictionaryCandidate(item, lookup, counters) {
  const languageCode = item.language_code;
  const value = normalizeText(item.value ?? item.target_text ?? item.concept_gloss ?? "");
  const sourceText = normalizeText(item.source_text ?? item.source_key ?? "");
  const sourceComparable = normalizeComparable(item.source_key ?? item.source_text ?? "");
  const valueComparable = normalizeComparable(value);
  const exactEnglishRows = lookup.byEnglishKey.get(`${languageCode}::${sourceComparable}`) ?? new Set();
  const exactNativeRows = lookup.byNativeKey.get(`${languageCode}::${valueComparable}`) ?? new Set();
  const englishTokenRows = matchedByTokens(lookup.byEnglishToken, languageCode, new Set(contentTokens(sourceText)));
  const nativeTokenRows = matchedByTokens(lookup.byNativeToken, languageCode, new Set(contentTokens(value)));
  const rows = new Set([...exactEnglishRows, ...exactNativeRows]);
  for (const row of englishTokenRows) if (nativeTokenRows.has(row)) rows.add(row);
  for (const row of nativeTokenRows) {
    if (!sourceComparable || row.language_code === "SW" || row.language_code === "MY" || row.language_code === "NE") rows.add(row);
  }
  for (const row of rows) {
    row.source_signals.dictionary_candidates += 1;
    row.source_signals.sources.add(item.source_id ?? item.source ?? "");
    const valueTokens = new Set(contentTokens(value));
    const currentMatch = normalizeComparable(row.display) === valueComparable || overlapCount(row.display_tokens, valueTokens) > 0;
    if (currentMatch) row.source_signals.dictionary_current_matches += 1;
    addSample(row.source_signals.samples, {
      type: "dictionary",
      source: item.source ?? "",
      source_id: item.source_id ?? "",
      source_text: sourceText,
      value,
      current_match: currentMatch,
    });
    counters.dictionary_candidates_attached += 1;
  }
}

function attachExampleCandidate(item, lookup, counters) {
  const languageCode = item.language_code;
  const sourceText = normalizeText(item.source_text ?? item.source_key ?? "");
  const targetText = normalizeText(item.target_text ?? item.value ?? "");
  const englishRows = matchedByTokens(lookup.byEnglishToken, languageCode, new Set(contentTokens(sourceText)));
  const nativeRows = matchedByTokens(lookup.byNativeToken, languageCode, new Set(contentTokens(targetText)));
  for (const row of englishRows) {
    if (!nativeRows.has(row)) continue;
    row.source_signals.example_collocation_candidates += 1;
    row.source_signals.sources.add(item.source_id ?? item.source ?? "");
    const targetTokens = new Set(contentTokens(targetText));
    const targetOverlap = overlapCount(row.example_tokens, targetTokens) > 0;
    if (targetOverlap) row.source_signals.example_target_overlap += 1;
    addSample(row.source_signals.samples, {
      type: "example_collocation",
      source: item.source ?? "",
      source_id: item.source_id ?? "",
      source_text: sourceText,
      target_text: targetText,
      target_example_overlap: targetOverlap,
    });
    counters.example_candidates_attached += 1;
  }
}

async function scanSourceFile(filePath, lookup, languageFilter, counters, type) {
  const absolute = path.join(projectRoot, filePath);
  const info = await stat(absolute);
  const input = readline.createInterface({
    input: createReadStream(absolute, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let lines = 0;
  let selectedLines = 0;
  for await (const line of input) {
    if (!line.trim()) continue;
    lines += 1;
    let item = null;
    try {
      item = JSON.parse(line);
    } catch {
      counters.parse_errors += 1;
      continue;
    }
    if (!languageFilter.has(item.language_code)) continue;
    const allowed = type === "dictionary" ? sourceAllowed(item, dictionarySources) : sourceAllowed(item, exampleSources);
    if (!allowed) continue;
    selectedLines += 1;
    counters.source_line_counts[item.source_id ?? item.source ?? "unknown"] =
      (counters.source_line_counts[item.source_id ?? item.source ?? "unknown"] ?? 0) + 1;
    if (type === "dictionary") attachDictionaryCandidate(item, lookup, counters);
    else attachExampleCandidate(item, lookup, counters);
  }
  return { path: filePath, type, bytes: info.size, lines_scanned: lines, selected_source_lines: selectedLines };
}

function validateCells(cells) {
  for (const cell of cells) {
    if (!cell.display) cell.issues.push({ severity: "blocker", code: "missing_display" });
    if (!cell.example) cell.issues.push({ severity: "blocker", code: "missing_example" });
    const hardScript = hardScriptRequirements.get(cell.language_code);
    if (hardScript && cell.display && !hardScript.test(cell.display)) {
      cell.issues.push({ severity: "blocker", code: "display_missing_required_script" });
    }
    if (hardScript && cell.example && !hardScript.test(cell.example)) {
      cell.issues.push({ severity: "blocker", code: "example_missing_required_script" });
    }
    if (normalizeComparable(cell.display) === normalizeComparable(cell.canonical_english)) {
      cell.issues.push({ severity: "warning", code: "display_exact_english_fallback_review" });
    }
    if (normalizeComparable(cell.example) === normalizeComparable(cell.example_EN)) {
      cell.issues.push({ severity: "warning", code: "example_exact_english_fallback_review" });
    }
    if (["SW", "KM", "MY", "NE"].includes(cell.language_code) && cell.source_signals.dictionary_candidates === 0) {
      cell.issues.push({ severity: "warning", code: "new_dictionary_source_no_candidate" });
    }
    if (["SW", "KM", "MY", "NE"].includes(cell.language_code) && cell.source_signals.dictionary_candidates > 0 && cell.source_signals.dictionary_current_matches === 0) {
      cell.issues.push({ severity: "warning", code: "new_dictionary_candidate_without_current_match" });
    }
    if (["AZ", "KK"].includes(cell.language_code) && cell.source_signals.example_collocation_candidates === 0) {
      cell.issues.push({ severity: "warning", code: "new_example_source_no_collocation_candidate" });
    }
  }
}

function summarize(cells) {
  const byLanguage = new Map();
  const byRelease = new Map();
  const warningCodeCounts = {};
  const blockerCodeCounts = {};
  for (const cell of cells) {
    for (const issue of cell.issues) {
      const target = issue.severity === "blocker" ? blockerCodeCounts : warningCodeCounts;
      target[issue.code] = (target[issue.code] ?? 0) + 1;
    }
    for (const [map, key] of [
      [byLanguage, cell.language_code],
      [byRelease, cell.release_id],
    ]) {
      if (!map.has(key)) {
        map.set(key, {
          key,
          rows: 0,
          dictionary_candidate_rows: 0,
          dictionary_current_match_rows: 0,
          example_collocation_candidate_rows: 0,
          example_target_overlap_rows: 0,
          blockers: 0,
          warnings: 0,
        });
      }
      const row = map.get(key);
      row.rows += 1;
      if (cell.source_signals.dictionary_candidates > 0) row.dictionary_candidate_rows += 1;
      if (cell.source_signals.dictionary_current_matches > 0) row.dictionary_current_match_rows += 1;
      if (cell.source_signals.example_collocation_candidates > 0) row.example_collocation_candidate_rows += 1;
      if (cell.source_signals.example_target_overlap > 0) row.example_target_overlap_rows += 1;
      row.blockers += cell.issues.filter((issue) => issue.severity === "blocker").length;
      row.warnings += cell.issues.filter((issue) => issue.severity === "warning").length;
    }
  }
  return {
    by_language: [...byLanguage.values()].sort((a, b) => a.key.localeCompare(b.key)),
    by_release: [...byRelease.values()].sort((a, b) => a.key.localeCompare(b.key)),
    warning_code_counts: warningCodeCounts,
    blocker_code_counts: blockerCodeCounts,
  };
}

function hashInputs(paths, cells) {
  const hash = createHash("sha256");
  for (const item of paths) hash.update(item).update("\n");
  for (const cell of cells) {
    hash.update(cell.key).update("\0").update(cell.display).update("\0").update(cell.example).update("\n");
  }
  return hash.digest("hex");
}

async function main() {
  const languageFilter = new Set(
    argValue("languages", defaultLanguages.join(","))
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  );
  const contractPaths = await contractPathsFromArgs();
  const outputDir = argValue("output-dir", defaultOutputDir);
  const reportId = `new_weak_sources_retro_audit_${[...languageFilter].sort().map(safeToken).join("_")}_v1`;
  const generatedAt = new Date().toISOString();
  const reportJsonPath = path.join(projectRoot, outputDir, `${reportId}.json`);
  const reportCsvPath = path.join(projectRoot, outputDir, `${reportId}.csv`);
  const reportMdPath = path.join(projectRoot, outputDir, `${reportId}.md`);
  const { cells, supportPaths, contractInputs } = await loadAuditCells(contractPaths, languageFilter);
  const lookup = buildLookup(cells);
  const counters = {
    parse_errors: 0,
    dictionary_candidates_attached: 0,
    example_candidates_attached: 0,
    source_line_counts: {},
  };
  const sourceFiles = [];
  sourceFiles.push(
    await scanSourceFile("reference-sources/cache/bulk-source-indexes/weak_dictionary_candidates.jsonl", lookup, languageFilter, counters, "dictionary")
  );
  sourceFiles.push(
    await scanSourceFile("reference-sources/cache/bulk-source-indexes/weak_example_collocations.jsonl", lookup, languageFilter, counters, "example")
  );
  validateCells(cells);
  const summary = summarize(cells);
  const blockers = cells.flatMap((cell) =>
    cell.issues
      .filter((issue) => issue.severity === "blocker")
      .map((issue) => ({
        code: issue.code,
        release_id: cell.release_id,
        row_id: cell.row_id,
        meaning_id: cell.meaning_id,
        language_code: cell.language_code,
        canonical_english: cell.canonical_english,
        display: cell.display,
        example: cell.example,
      }))
  );
  const warnings = cells.flatMap((cell) =>
    cell.issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => ({
        code: issue.code,
        release_id: cell.release_id,
        row_id: cell.row_id,
        meaning_id: cell.meaning_id,
        language_code: cell.language_code,
        canonical_english: cell.canonical_english,
        display: cell.display,
        dictionary_candidates: cell.source_signals.dictionary_candidates,
        dictionary_current_matches: cell.source_signals.dictionary_current_matches,
        example_collocation_candidates: cell.source_signals.example_collocation_candidates,
        example_target_overlap: cell.source_signals.example_target_overlap,
        sample: cell.source_signals.samples.slice(0, 2),
      }))
  );
  const reportCells = cells.map((cell) => ({
    release_id: cell.release_id,
    row_id: cell.row_id,
    meaning_id: cell.meaning_id,
    language_code: cell.language_code,
    canonical_english: cell.canonical_english,
    display: cell.display,
    example: cell.example,
    dictionary_candidates: cell.source_signals.dictionary_candidates,
    dictionary_current_matches: cell.source_signals.dictionary_current_matches,
    example_collocation_candidates: cell.source_signals.example_collocation_candidates,
    example_target_overlap: cell.source_signals.example_target_overlap,
    source_ids: [...cell.source_signals.sources].filter(Boolean).sort(),
    issues: cell.issues,
    samples: cell.source_signals.samples,
  }));
  const status = blockers.length ? "blocker" : "pass";
  const report = {
    report_id: reportId,
    script_version: scriptVersion,
    generated_at: generatedAt,
    status,
    scope:
      "Report-only retro-audit for newly activated source_partial indexes against completed Oxford support-language rows. It does not mutate contracts, Google Sheets, workbooks, Postgres or source packages. Missing source candidates are coverage warnings, not release blockers.",
    languages_checked: [...languageFilter].sort(),
    contracts_checked: contractInputs.length,
    support_paths_checked: supportPaths.length,
    cells_checked: reportCells.length,
    blocker_count: blockers.length,
    warning_count: warnings.length,
    source_files: sourceFiles,
    scan_counters: counters,
    input_hash: hashInputs([...contractPaths, ...supportPaths], cells),
    summary,
    blocker_sample: blockers.slice(0, 100),
    warning_sample: warnings.slice(0, 200),
    cells: reportCells,
    inputs: {
      contracts: contractInputs,
      support_paths: supportPaths,
    },
  };
  await writeJson(reportJsonPath, report);
  const csvRows = [
    [
      "release_id",
      "language_code",
      "row_id",
      "meaning_id",
      "canonical_english",
      "display",
      "dictionary_candidates",
      "dictionary_current_matches",
      "example_collocation_candidates",
      "example_target_overlap",
      "issue_codes",
      "source_ids",
    ],
    ...reportCells.map((cell) => [
      cell.release_id,
      cell.language_code,
      cell.row_id,
      cell.meaning_id,
      cell.canonical_english,
      cell.display,
      String(cell.dictionary_candidates),
      String(cell.dictionary_current_matches),
      String(cell.example_collocation_candidates),
      String(cell.example_target_overlap),
      cell.issues.map((issue) => `${issue.severity}:${issue.code}`).join("|"),
      cell.source_ids.join("|"),
    ]),
  ];
  await writeFile(
    reportCsvPath,
    `${csvRows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/gu, '""')}"`).join(",")).join("\n")}\n`
  );
  const md = [
    "# Oxford New Weak Sources Retro-Audit",
    "",
    `- Report id: \`${reportId}\``,
    `- Status: \`${status}\``,
    `- Generated at: \`${generatedAt}\``,
    `- Scope: ${report.scope}`,
    `- Contracts checked: ${report.contracts_checked}`,
    `- Languages checked: ${report.languages_checked.join(", ")}`,
    `- Cells checked: ${report.cells_checked}`,
    `- Blockers: ${report.blocker_count}`,
    `- Warnings: ${report.warning_count}`,
    "",
    "## Summary By Language",
    "",
    "| Language | Rows | Dictionary candidate rows | Dictionary current matches | Example/collocation candidate rows | Example target overlaps | Blockers | Warnings |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...summary.by_language.map(
      (row) =>
        `| ${row.key} | ${row.rows} | ${row.dictionary_candidate_rows} | ${row.dictionary_current_match_rows} | ${row.example_collocation_candidate_rows} | ${row.example_target_overlap_rows} | ${row.blockers} | ${row.warnings} |`
    ),
    "",
    "## Warning Codes",
    "",
    ...Object.entries(summary.warning_code_counts)
      .sort((left, right) => right[1] - left[1])
      .map(([code, count]) => `- \`${code}\`: ${count}`),
    "",
    "## Source Lines",
    "",
    ...Object.entries(counters.source_line_counts)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([source, count]) => `- \`${source}\`: ${count}`),
    "",
    "## Report Files",
    "",
    `- JSON: \`${relative(reportJsonPath)}\``,
    `- CSV: \`${relative(reportCsvPath)}\``,
    `- Markdown: \`${relative(reportMdPath)}\``,
    "",
  ];
  await writeFile(reportMdPath, md.join("\n"));
  console.log(
    `Oxford new weak source retro-audit status=${status} contracts=${report.contracts_checked} cells=${report.cells_checked} blockers=${report.blocker_count} warnings=${report.warning_count} report=${relative(reportJsonPath)}`
  );
  if (status !== "pass" && !hasFlag("report-only-exit-zero")) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
