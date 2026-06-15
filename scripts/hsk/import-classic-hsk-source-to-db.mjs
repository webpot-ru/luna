#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { psqlExec, psqlJson, sqlJson, sqlNullableString, sqlString } from "../lib/qa-utils.mjs";

const defaultReleaseIds = [
  "hsk2_classic_level_1_150_v1",
  "hsk2_classic_level_2_150_v1",
  "hsk2_classic_level_3_300_v1",
  "hsk2_classic_level_4_600_v1",
];

const releaseIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");
const selectedReleaseIds = releaseIds.length ? releaseIds : defaultReleaseIds;
const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const migrationPath = path.resolve("db/migrations/025_hsk_classic_source_items.sql");
const ruleVersion = "classic-hsk-db-source-import-v1";

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function reportStem(releaseIdsForReport) {
  if (
    releaseIdsForReport.length === 4 &&
    releaseIdsForReport.every((releaseId, index) => releaseId === defaultReleaseIds[index])
  ) {
    return "hsk2_classic_levels_1_4";
  }
  if (releaseIdsForReport.length === 1) return releaseIdsForReport[0];
  return `hsk2_classic_${releaseIdsForReport.length}_releases`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function parseReleaseId(releaseId) {
  const match = releaseId.match(/^hsk2_classic_level_(\d+)_(\d+)_v\d+$/u);
  if (!match) throw new Error(`Unsupported HSK release_id: ${releaseId}`);
  return { hskLevel: Number(match[1]), expectedRows: Number(match[2]) };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function sourceKey(sourceEntry, row) {
  return (
    sourceEntry?.hsk_canonical_source?.hsk_key ??
    sourceEntry?.hsk_key ??
    row.hsk_key ??
    rowKey(row)
  );
}

function hasPinyinToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(String(value ?? ""));
}

function hasHan(value) {
  return /\p{Script=Han}/u.test(String(value ?? ""));
}

function hasLatinLetter(value) {
  return /\p{Script=Latin}/u.test(String(value ?? ""));
}

function requiredString(row, field, blockers) {
  const value = normalizeText(row[field]);
  if (!value) blockers.push({ type: "missing_required_field", order: row.hsk_order, simplified: row.simplified, field });
  return value;
}

function canonicalImportRow({ row, sourceEntry, sourcePath, jsonlPath }) {
  const canonical = {
    release_id: row.release_id,
    hsk_version: row.hsk_version,
    hsk_level: Number(row.hsk_level),
    hsk_order: Number(row.hsk_order),
    hsk_key: sourceKey(sourceEntry, row),
    simplified: normalizeText(row.simplified),
    traditional: normalizeText(row.traditional),
    pinyin: normalizeText(row.pinyin),
    example_zh: normalizeText(row.example_zh),
    example_pinyin: normalizeText(row.example_pinyin),
    example_en: normalizeText(row.example_EN),
    en_gloss: normalizeText(row.EN),
    source_en_meaning: normalizeText(row.source_en_meaning),
    source_pos: normalizeText(row.source_pos),
    source_classifiers: normalizeText(row.source_classifiers),
    source_frequency: Number.isFinite(Number(row.source_frequency)) ? Number(row.source_frequency) : null,
    hsk_source: sourceEntry ?? {},
    release_row: row,
    source_paths: {
      jsonl: path.relative(process.cwd(), jsonlPath),
      source: path.relative(process.cwd(), sourcePath),
    },
  };
  return { ...canonical, content_hash: sha256(stableStringify(canonical)) };
}

async function loadRelease(releaseId) {
  const { hskLevel, expectedRows } = parseReleaseId(releaseId);
  const jsonlPath = path.join(outputDir, `${releaseId}.jsonl`);
  const sourcePath = path.join(outputDir, "source", `${releaseId}.source.json`);
  const blockers = [];
  const warnings = [];

  if (!(await pathExists(jsonlPath))) {
    blockers.push({ type: "missing_jsonl", release_id: releaseId, path: path.relative(process.cwd(), jsonlPath) });
    return { releaseId, hskLevel, expectedRows, rows: [], importRows: [], blockers, warnings, jsonlPath, sourcePath };
  }
  if (!(await pathExists(sourcePath))) {
    blockers.push({ type: "missing_source_snapshot", release_id: releaseId, path: path.relative(process.cwd(), sourcePath) });
    return { releaseId, hskLevel, expectedRows, rows: [], importRows: [], blockers, warnings, jsonlPath, sourcePath };
  }

  const [rows, sourceEntries] = await Promise.all([
    readJsonl(jsonlPath),
    fs.readFile(sourcePath, "utf8").then(JSON.parse),
  ]);

  if (!Array.isArray(sourceEntries)) {
    blockers.push({ type: "invalid_source_snapshot", release_id: releaseId, message: "source snapshot must be an array" });
  }
  if (rows.length !== expectedRows) {
    blockers.push({ type: "wrong_row_count", release_id: releaseId, expected: expectedRows, actual: rows.length });
  }
  if (Array.isArray(sourceEntries) && sourceEntries.length !== expectedRows) {
    blockers.push({
      type: "wrong_source_row_count",
      release_id: releaseId,
      expected: expectedRows,
      actual: sourceEntries.length,
    });
  }

  const orders = new Set();
  const keys = new Set();
  const importRows = [];

  for (const [index, row] of rows.entries()) {
    const sourceEntry = Array.isArray(sourceEntries) ? sourceEntries[index] : null;
    const simplified = requiredString(row, "simplified", blockers);
    requiredString(row, "traditional", blockers);
    const pinyin = requiredString(row, "pinyin", blockers);
    const exampleZh = requiredString(row, "example_zh", blockers);
    const examplePinyin = requiredString(row, "example_pinyin", blockers);
    requiredString(row, "EN", blockers);
    requiredString(row, "example_EN", blockers);

    if (row.release_id !== releaseId) {
      blockers.push({ type: "release_id_mismatch", release_id: releaseId, order: row.hsk_order, actual: row.release_id });
    }
    if (Number(row.hsk_level) !== hskLevel) {
      blockers.push({ type: "hsk_level_mismatch", release_id: releaseId, order: row.hsk_order, actual: row.hsk_level });
    }
    if (Number(row.hsk_order) !== index + 1) {
      blockers.push({ type: "hsk_order_mismatch", release_id: releaseId, expected: index + 1, actual: row.hsk_order });
    }
    if (orders.has(Number(row.hsk_order))) {
      blockers.push({ type: "duplicate_hsk_order", release_id: releaseId, order: row.hsk_order });
    }
    orders.add(Number(row.hsk_order));

    if (!hasHan(simplified)) {
      blockers.push({ type: "simplified_not_han", release_id: releaseId, order: row.hsk_order, simplified });
    }
    if (!hasHan(exampleZh)) {
      blockers.push({ type: "example_zh_not_han", release_id: releaseId, order: row.hsk_order, simplified, example_zh: exampleZh });
    }
    if (hasPinyinToneNumber(pinyin)) {
      blockers.push({ type: "word_pinyin_tone_number", release_id: releaseId, order: row.hsk_order, simplified, pinyin });
    }
    if (hasPinyinToneNumber(examplePinyin)) {
      blockers.push({
        type: "example_pinyin_tone_number",
        release_id: releaseId,
        order: row.hsk_order,
        simplified,
        example_pinyin: examplePinyin,
      });
    }
    if (!hasLatinLetter(pinyin) || hasHan(pinyin)) {
      blockers.push({ type: "word_pinyin_shape", release_id: releaseId, order: row.hsk_order, simplified, pinyin });
    }
    if (!hasLatinLetter(examplePinyin) || hasHan(examplePinyin)) {
      blockers.push({ type: "example_pinyin_shape", release_id: releaseId, order: row.hsk_order, simplified, example_pinyin: examplePinyin });
    }

    if (sourceEntry?.simplified && sourceEntry.simplified !== simplified) {
      blockers.push({
        type: "source_snapshot_order_mismatch",
        release_id: releaseId,
        order: row.hsk_order,
        row_simplified: simplified,
        source_simplified: sourceEntry.simplified,
      });
    }

    const importRow = canonicalImportRow({ row, sourceEntry, sourcePath, jsonlPath });
    if (keys.has(importRow.hsk_key)) {
      blockers.push({ type: "duplicate_hsk_key", release_id: releaseId, order: row.hsk_order, hsk_key: importRow.hsk_key });
    }
    keys.add(importRow.hsk_key);
    importRows.push(importRow);
  }

  return { releaseId, hskLevel, expectedRows, rows, importRows, blockers, warnings, jsonlPath, sourcePath };
}

function valuesSql(importRows) {
  return importRows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${sqlString(row.hsk_version)},
        ${row.hsk_level},
        ${row.hsk_order},
        ${sqlString(row.hsk_key)},
        ${sqlString(row.simplified)},
        ${sqlString(row.traditional)},
        ${sqlString(row.pinyin)},
        ${sqlString(row.example_zh)},
        ${sqlString(row.example_pinyin)},
        ${sqlString(row.example_en)},
        ${sqlString(row.en_gloss)},
        ${sqlNullableString(row.source_en_meaning)},
        ${sqlNullableString(row.source_pos)},
        ${sqlNullableString(row.source_classifiers)},
        ${row.source_frequency == null ? "null" : row.source_frequency},
        ${sqlJson(row.hsk_source)},
        ${sqlJson(row.release_row)},
        ${sqlJson(row.source_paths)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

async function ensureMigrationApplied() {
  await psqlExec(await fs.readFile(migrationPath, "utf8"));
}

async function fetchExisting(releaseIdsForQuery) {
  const releaseList = releaseIdsForQuery.map(sqlString).join(", ");
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by release_id, hsk_order), '[]'::json)
    from (
      select release_id, hsk_order, hsk_key, simplified, pinyin, example_zh, example_pinyin, example_en, content_hash
      from hsk_classic_source_items
      where release_id in (${releaseList})
    ) t;
  `);
}

async function upsertImportRows(importRows) {
  if (!importRows.length) return;
  await psqlExec(`
    insert into hsk_classic_source_items (
      release_id,
      hsk_version,
      hsk_level,
      hsk_order,
      hsk_key,
      simplified,
      traditional,
      pinyin,
      example_zh,
      example_pinyin,
      example_en,
      en_gloss,
      source_en_meaning,
      source_pos,
      source_classifiers,
      source_frequency,
      hsk_source,
      release_row,
      source_paths,
      content_hash
    )
    values
    ${valuesSql(importRows)}
    on conflict (release_id, hsk_order) do update set
      hsk_version = excluded.hsk_version,
      hsk_level = excluded.hsk_level,
      hsk_key = excluded.hsk_key,
      simplified = excluded.simplified,
      traditional = excluded.traditional,
      pinyin = excluded.pinyin,
      example_zh = excluded.example_zh,
      example_pinyin = excluded.example_pinyin,
      example_en = excluded.example_en,
      en_gloss = excluded.en_gloss,
      source_en_meaning = excluded.source_en_meaning,
      source_pos = excluded.source_pos,
      source_classifiers = excluded.source_classifiers,
      source_frequency = excluded.source_frequency,
      hsk_source = excluded.hsk_source,
      release_row = excluded.release_row,
      source_paths = excluded.source_paths,
      content_hash = excluded.content_hash,
      import_status = 'active',
      updated_at = now()
    where hsk_classic_source_items.content_hash <> excluded.content_hash
      or hsk_classic_source_items.hsk_key <> excluded.hsk_key;
  `);
}

function summarizeDiff({ importRows, beforeRows, afterRows }) {
  const before = new Map(beforeRows.map((row) => [`${row.release_id}:${row.hsk_order}`, row]));
  const after = new Map(afterRows.map((row) => [`${row.release_id}:${row.hsk_order}`, row]));
  const inserted = [];
  const updated = [];
  const unchanged = [];
  const readbackMismatches = [];

  for (const row of importRows) {
    const key = `${row.release_id}:${row.hsk_order}`;
    const beforeRow = before.get(key);
    const afterRow = after.get(key);
    if (!beforeRow) inserted.push(key);
    else if (beforeRow.content_hash !== row.content_hash || beforeRow.hsk_key !== row.hsk_key) updated.push(key);
    else unchanged.push(key);

    for (const field of ["hsk_key", "simplified", "pinyin", "example_zh", "example_pinyin", "example_en", "content_hash"]) {
      if ((afterRow?.[field] ?? null) !== row[field]) {
        readbackMismatches.push({
          key,
          field,
          expected: row[field],
          actual: afterRow?.[field] ?? null,
        });
      }
    }
  }

  return { inserted, updated, unchanged, readbackMismatches };
}

async function main() {
  await fs.mkdir(qaDir, { recursive: true });

  const releases = [];
  for (const releaseId of selectedReleaseIds) releases.push(await loadRelease(releaseId));

  const blockers = releases.flatMap((release) => release.blockers);
  const warnings = releases.flatMap((release) => release.warnings);
  const importRows = releases.flatMap((release) => release.importRows);
  const expectedTotalRows = releases.reduce((sum, release) => sum + release.expectedRows, 0);
  let db = {
    applied_migration: false,
    dry_run: dryRun,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    readback_mismatches: [],
  };

  if (!blockers.length && !dryRun) {
    await ensureMigrationApplied();
    db.applied_migration = true;
    const beforeRows = await fetchExisting(selectedReleaseIds);
    await upsertImportRows(importRows);
    const afterRows = await fetchExisting(selectedReleaseIds);
    const diff = summarizeDiff({ importRows, beforeRows, afterRows });
    db = {
      ...db,
      inserted: diff.inserted.length,
      updated: diff.updated.length,
      unchanged: diff.unchanged.length,
      readback_mismatches: diff.readbackMismatches,
    };
    for (const mismatch of diff.readbackMismatches) blockers.push({ type: "db_readback_mismatch", ...mismatch });
  }

  const summaryByRelease = Object.fromEntries(
    releases.map((release) => [
      release.releaseId,
      {
        hsk_level: release.hskLevel,
        expected_rows: release.expectedRows,
        input_rows: release.rows.length,
        import_rows: release.importRows.length,
        blockers: release.blockers.length,
        warnings: release.warnings.length,
        jsonl: path.relative(process.cwd(), release.jsonlPath),
        source: path.relative(process.cwd(), release.sourcePath),
        content_hash: sha256(stableStringify(release.importRows.map((row) => row.content_hash))),
      },
    ])
  );

  const report = {
    rule_version: ruleVersion,
    generated_at: new Date().toISOString(),
    release_ids: selectedReleaseIds,
    expected_total_rows: expectedTotalRows,
    import_total_rows: importRows.length,
    dry_run: dryRun,
    status: blockers.length ? "blocked" : "ok",
    db,
    summary_by_release: summaryByRelease,
    blockers,
    warnings,
  };

  const reportPath = path.join(qaDir, `${reportStem(selectedReleaseIds)}_db_source_import_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        status: report.status,
        report: path.relative(process.cwd(), reportPath),
        releases: selectedReleaseIds.length,
        expected_total_rows: expectedTotalRows,
        import_total_rows: importRows.length,
        dry_run: dryRun,
        db,
        blockers: blockers.length,
        warnings: warnings.length,
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
