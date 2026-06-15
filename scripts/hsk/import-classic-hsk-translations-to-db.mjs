#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { psqlExec, psqlJson, sqlJson, sqlString } from "../lib/qa-utils.mjs";

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
const translationsDir = path.resolve("config");
const sourceMigrationPath = path.resolve("db/migrations/025_hsk_classic_source_items.sql");
const translationMigrationPath = path.resolve("db/migrations/026_hsk_classic_translation_items.sql");
const languagesPath = path.resolve("config/language-order.json");
const ruleVersion = "classic-hsk-db-translation-import-v1";
const insertChunkSize = 1500;

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

function parseTsvLine(line) {
  return line.split("\t").map((value) => value.trim());
}

async function loadTranslationPackSources(hskLevel, targetColumns) {
  const targetSet = new Set(targetColumns.flatMap((code) => [code, `example_${code}`]));
  const pattern = new RegExp(`^hsk-classic-hsk${hskLevel}-translations-.+\\.tsv$`, "iu");
  const sourceFilesByColumn = {};
  let files = [];
  try {
    files = (await fs.readdir(translationsDir)).filter((file) => pattern.test(file)).sort();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  for (const file of files) {
    const lines = (await fs.readFile(path.join(translationsDir, file), "utf8"))
      .split(/\r?\n/u)
      .filter((line) => line.trim() && !line.trim().startsWith("#"));
    if (!lines.length) continue;
    const headers = parseTsvLine(lines[0]);
    if (headers[0] !== "simplified") throw new Error(`${file} must start with simplified`);
    for (const header of headers.slice(1)) {
      if (!targetSet.has(header)) throw new Error(`${file} has unknown HSK translation column: ${header}`);
      sourceFilesByColumn[header] ??= new Set();
      sourceFilesByColumn[header].add(file);
    }
  }

  return {
    files,
    sourceFilesByColumn: Object.fromEntries(
      Object.entries(sourceFilesByColumn).map(([column, sourceFiles]) => [
        column,
        Array.from(sourceFiles).sort(),
      ])
    ),
  };
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

function hasHan(value) {
  return /\p{Script=Han}/u.test(String(value ?? ""));
}

function rowHskKey(row, sourceRow) {
  return sourceRow?.hsk_key ?? row.hsk_key ?? `${row.hsk_order}:${row.simplified}`;
}

async function fetchSourceRows(releaseId) {
  const rows = await psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by hsk_order), '[]'::json)
    from (
      select release_id, hsk_order, hsk_key, content_hash
      from hsk_classic_source_items
      where release_id = ${sqlString(releaseId)}
    ) t;
  `);
  return new Map(rows.map((row) => [Number(row.hsk_order), row]));
}

function canonicalTranslationRow({ row, sourceRow, language, sourceFilesByColumn }) {
  const wordColumn = language.spreadsheetCode;
  const exampleColumn = `example_${language.spreadsheetCode}`;
  const sourcePack = [
    ...(sourceFilesByColumn[wordColumn] ?? []),
    ...(sourceFilesByColumn[exampleColumn] ?? []),
  ];

  const canonical = {
    release_id: row.release_id,
    hsk_order: Number(row.hsk_order),
    hsk_key: rowHskKey(row, sourceRow),
    spreadsheet_code: language.spreadsheetCode,
    db_code: language.dbCode,
    language_name: language.language,
    word_translation: normalizeText(row[wordColumn]),
    example_translation: normalizeText(row[exampleColumn]),
    translation_status: normalizeText(row.translation_status),
    example_status: normalizeText(row.example_status),
    source_pack: [...new Set(sourcePack)].sort(),
    release_row_hash: sourceRow?.content_hash ?? "",
  };
  return { ...canonical, content_hash: sha256(stableStringify(canonical)) };
}

async function loadRelease({ releaseId, languages }) {
  const { hskLevel, expectedRows } = parseReleaseId(releaseId);
  const jsonlPath = path.join(outputDir, `${releaseId}.jsonl`);
  const blockers = [];
  const warnings = [];
  if (!(await pathExists(jsonlPath))) {
    blockers.push({ type: "missing_jsonl", release_id: releaseId, path: path.relative(process.cwd(), jsonlPath) });
    return { releaseId, hskLevel, expectedRows, rows: [], importRows: [], blockers, warnings, jsonlPath };
  }

  const [rows, sourceRows, packSources] = await Promise.all([
    readJsonl(jsonlPath),
    fetchSourceRows(releaseId),
    loadTranslationPackSources(hskLevel, languages.map((language) => language.spreadsheetCode)),
  ]);

  if (rows.length !== expectedRows) {
    blockers.push({ type: "wrong_row_count", release_id: releaseId, expected: expectedRows, actual: rows.length });
  }
  if (sourceRows.size !== expectedRows) {
    blockers.push({
      type: "missing_hsk_source_db_rows",
      release_id: releaseId,
      expected: expectedRows,
      actual: sourceRows.size,
    });
  }

  const importRows = [];
  for (const [index, row] of rows.entries()) {
    const order = Number(row.hsk_order);
    const sourceRow = sourceRows.get(order);
    if (order !== index + 1) {
      blockers.push({ type: "hsk_order_mismatch", release_id: releaseId, expected: index + 1, actual: row.hsk_order });
    }
    if (row.release_id !== releaseId) {
      blockers.push({ type: "release_id_mismatch", release_id: releaseId, order, actual: row.release_id });
    }
    if (!sourceRow) {
      blockers.push({ type: "missing_hsk_source_db_row", release_id: releaseId, order });
      continue;
    }

    for (const language of languages) {
      const wordColumn = language.spreadsheetCode;
      const exampleColumn = `example_${language.spreadsheetCode}`;
      if (!(wordColumn in row)) {
        blockers.push({ type: "missing_word_column", release_id: releaseId, order, language: wordColumn });
        continue;
      }
      if (!(exampleColumn in row)) {
        blockers.push({ type: "missing_example_column", release_id: releaseId, order, language: wordColumn });
        continue;
      }
      const wordTranslation = normalizeText(row[wordColumn]);
      const exampleTranslation = normalizeText(row[exampleColumn]);
      if (!wordTranslation) {
        blockers.push({ type: "empty_word_translation", release_id: releaseId, order, language: wordColumn });
      }
      if (!exampleTranslation) {
        blockers.push({ type: "empty_example_translation", release_id: releaseId, order, language: wordColumn });
      }
      if (wordColumn !== "JA" && wordColumn !== "KO" && hasHan(wordTranslation)) {
        blockers.push({ type: "han_leak_word_translation", release_id: releaseId, order, language: wordColumn });
      }
      if (wordColumn !== "JA" && wordColumn !== "KO" && hasHan(exampleTranslation)) {
        blockers.push({ type: "han_leak_example_translation", release_id: releaseId, order, language: wordColumn });
      }
      importRows.push(canonicalTranslationRow({ row, sourceRow, language, sourceFilesByColumn: packSources.sourceFilesByColumn }));
    }
  }

  return {
    releaseId,
    hskLevel,
    expectedRows,
    rows,
    importRows,
    blockers,
    warnings,
    jsonlPath,
    translationPackFiles: packSources.files,
  };
}

function valuesSql(importRows) {
  return importRows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${row.hsk_order},
        ${sqlString(row.hsk_key)},
        ${sqlString(row.spreadsheet_code)},
        ${sqlString(row.db_code)},
        ${sqlString(row.language_name)},
        ${sqlString(row.word_translation)},
        ${sqlString(row.example_translation)},
        ${sqlString(row.translation_status)},
        ${sqlString(row.example_status)},
        ${sqlJson(row.source_pack)},
        ${sqlString(row.release_row_hash)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

async function ensureMigrationsApplied() {
  await psqlExec(await fs.readFile(sourceMigrationPath, "utf8"));
  await psqlExec(await fs.readFile(translationMigrationPath, "utf8"));
}

async function fetchExisting(releaseIdsForQuery) {
  const releaseList = releaseIdsForQuery.map(sqlString).join(", ");
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by release_id, hsk_order, spreadsheet_code), '[]'::json)
    from (
      select release_id, hsk_order, spreadsheet_code, word_translation, example_translation, content_hash
      from hsk_classic_translation_items
      where release_id in (${releaseList})
    ) t;
  `, 1024 * 1024 * 100);
}

async function upsertImportRows(importRows) {
  for (let index = 0; index < importRows.length; index += insertChunkSize) {
    const chunk = importRows.slice(index, index + insertChunkSize);
    await psqlExec(`
      insert into hsk_classic_translation_items (
        release_id,
        hsk_order,
        hsk_key,
        spreadsheet_code,
        db_code,
        language_name,
        word_translation,
        example_translation,
        translation_status,
        example_status,
        source_pack,
        release_row_hash,
        content_hash
      )
      values
      ${valuesSql(chunk)}
      on conflict (release_id, hsk_order, spreadsheet_code) do update set
        hsk_key = excluded.hsk_key,
        db_code = excluded.db_code,
        language_name = excluded.language_name,
        word_translation = excluded.word_translation,
        example_translation = excluded.example_translation,
        translation_status = excluded.translation_status,
        example_status = excluded.example_status,
        source_pack = excluded.source_pack,
        release_row_hash = excluded.release_row_hash,
        content_hash = excluded.content_hash,
        import_status = 'active',
        updated_at = now()
      where hsk_classic_translation_items.content_hash <> excluded.content_hash
        or hsk_classic_translation_items.hsk_key <> excluded.hsk_key;
    `);
  }
}

function summarizeDiff({ importRows, beforeRows, afterRows }) {
  const before = new Map(beforeRows.map((row) => [`${row.release_id}:${row.hsk_order}:${row.spreadsheet_code}`, row]));
  const after = new Map(afterRows.map((row) => [`${row.release_id}:${row.hsk_order}:${row.spreadsheet_code}`, row]));
  const inserted = [];
  const updated = [];
  const unchanged = [];
  const readbackMismatches = [];

  for (const row of importRows) {
    const key = `${row.release_id}:${row.hsk_order}:${row.spreadsheet_code}`;
    const beforeRow = before.get(key);
    const afterRow = after.get(key);
    if (!beforeRow) inserted.push(key);
    else if (beforeRow.content_hash !== row.content_hash) updated.push(key);
    else unchanged.push(key);

    for (const field of ["word_translation", "example_translation", "content_hash"]) {
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
  const languages = hskTargetLanguages(JSON.parse(await fs.readFile(languagesPath, "utf8")));
  const blockers = [];
  const warnings = [];
  if (languages.length !== 53) {
    blockers.push({ type: "wrong_hsk_target_language_count", expected: 53, actual: languages.length });
  }

  const releases = [];
  if (!blockers.length) {
    for (const releaseId of selectedReleaseIds) releases.push(await loadRelease({ releaseId, languages }));
  }
  blockers.push(...releases.flatMap((release) => release.blockers));
  warnings.push(...releases.flatMap((release) => release.warnings));

  const importRows = releases.flatMap((release) => release.importRows);
  const expectedTotalRows = releases.reduce((sum, release) => sum + release.expectedRows * languages.length, 0);
  let db = {
    applied_migrations: false,
    dry_run: dryRun,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    readback_mismatches: [],
  };

  if (!blockers.length && !dryRun) {
    await ensureMigrationsApplied();
    db.applied_migrations = true;
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
        expected_source_rows: release.expectedRows,
        target_languages: languages.length,
        expected_translation_rows: release.expectedRows * languages.length,
        input_rows: release.rows.length,
        import_rows: release.importRows.length,
        blockers: release.blockers.length,
        warnings: release.warnings.length,
        jsonl: path.relative(process.cwd(), release.jsonlPath),
        translation_pack_files: release.translationPackFiles,
        content_hash: sha256(stableStringify(release.importRows.map((row) => row.content_hash))),
      },
    ])
  );

  const report = {
    rule_version: ruleVersion,
    generated_at: new Date().toISOString(),
    release_ids: selectedReleaseIds,
    target_language_count: languages.length,
    expected_total_rows: expectedTotalRows,
    import_total_rows: importRows.length,
    dry_run: dryRun,
    status: blockers.length ? "blocked" : "ok",
    db,
    summary_by_release: summaryByRelease,
    blockers,
    warnings,
  };

  const reportPath = path.join(qaDir, `${reportStem(selectedReleaseIds)}_db_translation_import_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        status: report.status,
        report: path.relative(process.cwd(), reportPath),
        releases: selectedReleaseIds.length,
        target_language_count: languages.length,
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
