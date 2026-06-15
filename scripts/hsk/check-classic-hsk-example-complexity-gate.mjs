#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { readRows } from "../lib/qa-utils.mjs";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const levelMatch = releaseId.match(/level_(\d+)_/u);
const rowCountMatch = releaseId.match(/level_\d+_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const expectedRows = rowCountMatch ? Number(rowCountMatch[1]) : null;

const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const csvPath = path.join(outputDir, `${releaseId}.csv`);
const examplesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-examples.json`);

const thresholdsByLevel = {
  1: { maxHan: 10, maxInternalPunctuation: 1 },
  2: { maxHan: 11, maxInternalPunctuation: 1 },
  3: { maxHan: 14, maxInternalPunctuation: 2 },
  4: { maxHan: 22, maxInternalPunctuation: 3 },
  5: { maxHan: 16, maxInternalPunctuation: 2 },
  6: { maxHan: 26, maxInternalPunctuation: 3 },
};

const hanPattern = /\p{Script=Han}/u;
const latinPattern = /\p{Script=Latin}/u;
const digitPattern = /\p{Number}/u;
const placeholderPatterns = [
  /^我今天学习“.+”这个词。$/u,
  /^这个词是“.+”。$/u,
  /["“”][A-Za-zXx]["“”]/u,
  /\bX\b/u,
];

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function lookupCurated(curated, row) {
  return curated[rowKey(row)] ?? curated[row.simplified];
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, 240);
}

function issue(type, severity, row, message, extra = {}) {
  return {
    type,
    severity,
    hsk_order: row ? Number(row.hsk_order) : "",
    hsk_key: row ? rowKey(row) : "",
    simplified: row?.simplified ?? "",
    message,
    ...extra,
  };
}

function countHan(value) {
  return Array.from(String(value ?? "")).filter((char) => hanPattern.test(char)).length;
}

function internalPunctuationCount(value) {
  const text = String(value ?? "").trim().replace(/[。！？!?]+$/u, "");
  return Array.from(text.matchAll(/[，、；：,;:！？!?]/gu)).length;
}

function requiredSourceParts(simplified) {
  if (String(simplified).includes("…")) {
    return String(simplified)
      .split("…")
      .map((part) => part.replace(/[、/／]/gu, "").trim())
      .filter(Boolean);
  }
  return String(simplified)
    .split(/[、/／]|或/gu)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isPlaceholderExample(value) {
  const text = String(value ?? "").trim();
  return placeholderPatterns.some((pattern) => pattern.test(text));
}

async function main() {
  const [rows, examplesText] = await Promise.all([
    readRows(csvPath),
    fs.readFile(examplesPath, "utf8"),
  ]);
  const examples = JSON.parse(examplesText);
  const thresholds = thresholdsByLevel[hskLevel] ?? thresholdsByLevel[6];

  const blockers = [];
  const warnings = [];
  let anchorMatches = 0;
  let maxHanObserved = 0;
  let maxInternalPunctuationObserved = 0;

  if (expectedRows !== null && rows.length !== expectedRows) {
    blockers.push(issue("row_count_mismatch", "blocker", null, `Expected ${expectedRows} rows, got ${rows.length}`));
  }

  for (const row of rows) {
    const example = lookupCurated(examples, row);
    if (!example) {
      blockers.push(issue("missing_example_row", "blocker", row, "Missing curated example row for complexity gate"));
      continue;
    }
    if (row.example_zh !== example.example_zh) {
      blockers.push(issue("example_zh_mismatch", "blocker", row, "Workbook example_zh does not match examples file", {
        expected: compact(example.example_zh),
        actual: compact(row.example_zh),
      }));
    }

    const exampleZh = row.example_zh;
    if (!exampleZh || !hanPattern.test(exampleZh)) {
      blockers.push(issue("bad_example_zh_shape", "blocker", row, "Chinese example must contain Han characters", { value: compact(exampleZh) }));
      continue;
    }
    if (latinPattern.test(exampleZh) || digitPattern.test(exampleZh)) {
      blockers.push(issue("non_chinese_artifact_in_example_zh", "blocker", row, "Chinese example contains Latin letters or digits", { value: compact(exampleZh) }));
    }
    if (isPlaceholderExample(exampleZh)) {
      blockers.push(issue("placeholder_chinese_example", "blocker", row, "Chinese example still looks like a structural placeholder", { value: compact(exampleZh) }));
    }

    const hanCount = countHan(exampleZh);
    const punctuationCount = internalPunctuationCount(exampleZh);
    maxHanObserved = Math.max(maxHanObserved, hanCount);
    maxInternalPunctuationObserved = Math.max(maxInternalPunctuationObserved, punctuationCount);

    if (hanCount > thresholds.maxHan) {
      blockers.push(issue("example_too_long_for_hsk_level", "blocker", row, "Chinese example is longer than the level-specific learner threshold", {
        han_count: hanCount,
        max_han: thresholds.maxHan,
        value: compact(exampleZh),
      }));
    }
    if (punctuationCount > thresholds.maxInternalPunctuation) {
      blockers.push(issue("example_too_clause_heavy_for_hsk_level", "blocker", row, "Chinese example has too many internal punctuation/clause breaks for the level", {
        internal_punctuation_count: punctuationCount,
        max_internal_punctuation: thresholds.maxInternalPunctuation,
        value: compact(exampleZh),
      }));
    }

    const requiredParts = requiredSourceParts(row.simplified);
    const missingParts = requiredParts.filter((part) => !exampleZh.includes(part));
    if (missingParts.length) {
      blockers.push(issue("example_missing_exact_source_item", "blocker", row, "Chinese example does not contain all required source-item parts", {
        required: requiredParts,
        missing: missingParts,
        value: compact(exampleZh),
      }));
    } else {
      anchorMatches += 1;
    }
  }

  const report = {
    release_id: releaseId,
    hsk_level: hskLevel,
    generated_at: new Date().toISOString(),
    rows_checked: rows.length,
    expected_rows: expectedRows,
    thresholds,
    anchor_match_rows: anchorMatches,
    max_han_observed: maxHanObserved,
    max_internal_punctuation_observed: maxInternalPunctuationObserved,
    blockers: blockers.length,
    warnings: warnings.length,
    blocker_type_counts: countByType(blockers),
    warning_type_counts: countByType(warnings),
    blocker_samples: blockers.slice(0, 250),
    warning_samples: warnings.slice(0, 250),
    notes: [
      "This is an HSK-only example complexity gate. It keeps Chinese examples short, anchored to the source item and free of Latin/digit/placeholder artifacts.",
      "The thresholds are level-specific and are intended as learner-facing guardrails, not as a broad stylistic rewrite rule.",
      "It reads HSK release CSV and HSK examples only, writes HSK QA reports only, and does not mutate ordinary deck, Oxford, Polyglot, database or Google Sheet state.",
    ],
  };

  await fs.mkdir(qaDir, { recursive: true });
  const reportPath = path.join(qaDir, `${releaseId}_example_complexity_gate_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows_checked: rows.length,
        anchor_match_rows: anchorMatches,
        max_han_observed: maxHanObserved,
        max_internal_punctuation_observed: maxInternalPunctuationObserved,
        blockers: blockers.length,
        warnings: warnings.length,
        report: path.relative(process.cwd(), reportPath),
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
}

function countByType(items) {
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
  return counts;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
