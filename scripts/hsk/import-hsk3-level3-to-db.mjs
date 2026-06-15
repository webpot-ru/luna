#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { psqlExec, psqlJson, sqlJson, sqlNullableString, sqlString } from "../lib/qa-utils.mjs";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_3_500_v1";
const EXPECTED_ROWS = 500;
const EXPECTED_HSK_LEVEL = 3;
const dryRun = process.argv.includes("--dry-run");
const outputDir = path.join(ROOT, "outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const migrationPaths = [
  path.join(ROOT, "db/migrations/030_hsk3_release_items.sql"),
  path.join(ROOT, "db/migrations/031_hsk3_manual_target_source_kind.sql"),
];
const jsonlPath = path.join(outputDir, `${RELEASE_ID}.jsonl`);
const sourcePath = path.join(outputDir, "source/hsk3_level_3_500_v1.source.json");
const languagesPath = path.join(ROOT, "config/language-order.json");
const workbookGatePath = path.join(qaDir, `${RELEASE_ID}_workbook_gate_20260604.json`);
const manualGatePath = path.join(qaDir, `${RELEASE_ID}_manual_target_translation_gate_20260604.json`);
const chineseExamplesPath = path.join(qaDir, `${RELEASE_ID}_chinese_examples_build_20260604.json`);
const sampleAuditPath = path.join(qaDir, `${RELEASE_ID}_sample_10_per_language_quality_20260604.json`);
const reportPath = path.join(qaDir, `${RELEASE_ID}_db_import_20260604.json`);
const insertChunkSize = 1500;

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

function readJsonl(text) {
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

function hasHan(value) {
  return /\p{Script=Han}/u.test(String(value ?? ""));
}

function hasToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(String(value ?? ""));
}

function sourceKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function canonicalSourceRow({ row, sourceEntry }) {
  const canonical = {
    release_id: row.release_id,
    hsk_version: row.hsk_version,
    hsk_level: Number(row.hsk_level),
    hsk_order: Number(row.hsk_order),
    hsk_key: normalizeText(row.hsk_key) || sourceKey(row),
    source_word: normalizeText(row.source_word),
    simplified: normalizeText(row.simplified),
    pinyin: normalizeText(row.pinyin),
    source_pos: normalizeText(row.source_pos),
    example_zh: normalizeText(row.example_zh),
    example_pinyin: normalizeText(row.example_pinyin),
    example_en: normalizeText(row.example_EN),
    en_gloss: normalizeText(row.EN),
    classic_reuse_class: normalizeText(row.classic_reuse_class),
    classic_reuse_notes: normalizeText(row.classic_reuse_notes),
    source_snapshot: sourceEntry ?? {},
    release_row: row,
    source_paths: {
      jsonl: path.relative(ROOT, jsonlPath),
      source: path.relative(ROOT, sourcePath),
    },
  };
  return { ...canonical, content_hash: sha256(stableStringify(canonical)) };
}

function sourceKindFor({ language, row, wordValue, exampleValue }) {
  if (["EN", "EN-GB"].includes(language.spreadsheetCode)) return "english_pivot";
  if (row.translation_status === "classic_reuse_target_ready") return "classic_reuse_target";
  if (row.translation_status === "hsk3_manual_target_ready") return "hsk3_manual_target";
  if (wordValue || exampleValue) return "hsk3_manual_target";
  return "pending_hsk3_manual";
}

function canonicalTranslationRow({ row, sourceRow, language }) {
  const wordValue = normalizeText(row[language.spreadsheetCode]);
  const exampleValue = normalizeText(row[`example_${language.spreadsheetCode}`]);
  const sourceKind = sourceKindFor({ language, row, wordValue, exampleValue });
  const canonical = {
    release_id: row.release_id,
    hsk_order: Number(row.hsk_order),
    hsk_key: normalizeText(row.hsk_key) || sourceKey(row),
    spreadsheet_code: language.spreadsheetCode,
    db_code: language.dbCode,
    language_name: language.language,
    word_translation: wordValue || null,
    example_translation: exampleValue || null,
    translation_status: normalizeText(row.translation_status),
    example_status: normalizeText(row.example_status),
    source_kind: sourceKind,
    source_payload: {
      qa_notes: row.qa_notes ?? "",
      classic_reuse_class: row.classic_reuse_class ?? "",
    },
    release_row_hash: sourceRow.content_hash,
  };
  return { ...canonical, content_hash: sha256(stableStringify(canonical)) };
}

function sourceValuesSql(rows) {
  return rows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${sqlString(row.hsk_version)},
        ${row.hsk_level},
        ${row.hsk_order},
        ${sqlString(row.hsk_key)},
        ${sqlString(row.source_word)},
        ${sqlString(row.simplified)},
        ${sqlString(row.pinyin)},
        ${sqlNullableString(row.source_pos)},
        ${sqlString(row.example_zh)},
        ${sqlString(row.example_pinyin)},
        ${sqlString(row.example_en)},
        ${sqlString(row.en_gloss)},
        ${sqlString(row.classic_reuse_class)},
        ${sqlNullableString(row.classic_reuse_notes)},
        ${sqlJson(row.source_snapshot)},
        ${sqlJson(row.release_row)},
        ${sqlJson(row.source_paths)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

function translationValuesSql(rows) {
  return rows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${row.hsk_order},
        ${sqlString(row.hsk_key)},
        ${sqlString(row.spreadsheet_code)},
        ${sqlString(row.db_code)},
        ${sqlString(row.language_name)},
        ${sqlNullableString(row.word_translation)},
        ${sqlNullableString(row.example_translation)},
        ${sqlString(row.translation_status)},
        ${sqlString(row.example_status)},
        ${sqlString(row.source_kind)},
        ${sqlJson(row.source_payload)},
        ${sqlString(row.release_row_hash)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

async function fetchSourceExisting() {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by hsk_order), '[]'::json)
    from (
      select release_id, hsk_order, hsk_key, simplified, pinyin, example_zh, example_pinyin, example_en, content_hash
      from hsk3_source_items
      where release_id = ${sqlString(RELEASE_ID)}
    ) t;
  `);
}

async function fetchTranslationExisting() {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by hsk_order, spreadsheet_code), '[]'::json)
    from (
      select release_id, hsk_order, spreadsheet_code, word_translation, example_translation, source_kind, content_hash
      from hsk3_translation_items
      where release_id = ${sqlString(RELEASE_ID)}
    ) t;
  `, 1024 * 1024 * 100);
}

async function upsertSourceRows(rows) {
  await psqlExec(`
    insert into hsk3_source_items (
      release_id, hsk_version, hsk_level, hsk_order, hsk_key, source_word, simplified, pinyin, source_pos,
      example_zh, example_pinyin, example_en, en_gloss, classic_reuse_class, classic_reuse_notes,
      source_snapshot, release_row, source_paths, content_hash
    )
    values
    ${sourceValuesSql(rows)}
    on conflict (release_id, hsk_order) do update set
      hsk_version = excluded.hsk_version,
      hsk_level = excluded.hsk_level,
      hsk_key = excluded.hsk_key,
      source_word = excluded.source_word,
      simplified = excluded.simplified,
      pinyin = excluded.pinyin,
      source_pos = excluded.source_pos,
      example_zh = excluded.example_zh,
      example_pinyin = excluded.example_pinyin,
      example_en = excluded.example_en,
      en_gloss = excluded.en_gloss,
      classic_reuse_class = excluded.classic_reuse_class,
      classic_reuse_notes = excluded.classic_reuse_notes,
      source_snapshot = excluded.source_snapshot,
      release_row = excluded.release_row,
      source_paths = excluded.source_paths,
      content_hash = excluded.content_hash,
      import_status = 'active',
      updated_at = now()
    where hsk3_source_items.content_hash <> excluded.content_hash
      or hsk3_source_items.hsk_key <> excluded.hsk_key;
  `);
}

async function upsertTranslationRows(rows) {
  for (let index = 0; index < rows.length; index += insertChunkSize) {
    const chunk = rows.slice(index, index + insertChunkSize);
    await psqlExec(`
      insert into hsk3_translation_items (
        release_id, hsk_order, hsk_key, spreadsheet_code, db_code, language_name,
        word_translation, example_translation, translation_status, example_status,
        source_kind, source_payload, release_row_hash, content_hash
      )
      values
      ${translationValuesSql(chunk)}
      on conflict (release_id, hsk_order, spreadsheet_code) do update set
        hsk_key = excluded.hsk_key,
        db_code = excluded.db_code,
        language_name = excluded.language_name,
        word_translation = excluded.word_translation,
        example_translation = excluded.example_translation,
        translation_status = excluded.translation_status,
        example_status = excluded.example_status,
        source_kind = excluded.source_kind,
        source_payload = excluded.source_payload,
        release_row_hash = excluded.release_row_hash,
        content_hash = excluded.content_hash,
        import_status = 'active',
        updated_at = now()
      where hsk3_translation_items.content_hash <> excluded.content_hash
        or hsk3_translation_items.hsk_key <> excluded.hsk_key;
    `);
  }
}

function summarizeDiff({ importRows, beforeRows, afterRows, keyForRow, fields }) {
  const before = new Map(beforeRows.map((row) => [keyForRow(row), row]));
  const after = new Map(afterRows.map((row) => [keyForRow(row), row]));
  const inserted = [];
  const updated = [];
  const unchanged = [];
  const readbackMismatches = [];
  for (const row of importRows) {
    const key = keyForRow(row);
    const beforeRow = before.get(key);
    const afterRow = after.get(key);
    if (!beforeRow) inserted.push(key);
    else if (beforeRow.content_hash !== row.content_hash) updated.push(key);
    else unchanged.push(key);
    for (const field of fields) {
      if ((afterRow?.[field] ?? null) !== (row[field] ?? null)) {
        readbackMismatches.push({ key, field, expected: row[field] ?? null, actual: afterRow?.[field] ?? null });
      }
    }
  }
  return { inserted, updated, unchanged, readbackMismatches };
}

function validateRows({ rows, sourceEntries, languages }) {
  const blockers = [];
  const warnings = [];
  if (rows.length !== EXPECTED_ROWS) blockers.push({ type: "wrong_row_count", expected: EXPECTED_ROWS, actual: rows.length });
  if (!Array.isArray(sourceEntries) || sourceEntries.length !== EXPECTED_ROWS) {
    blockers.push({ type: "wrong_source_snapshot_count", expected: EXPECTED_ROWS, actual: sourceEntries?.length ?? null });
  }
  if (languages.length !== 53) blockers.push({ type: "wrong_target_language_count", expected: 53, actual: languages.length });

  for (const [index, row] of rows.entries()) {
    const sourceEntry = sourceEntries[index] ?? {};
    const order = Number(row.hsk_order);
    if (row.release_id !== RELEASE_ID) blockers.push({ type: "release_id_mismatch", order, actual: row.release_id });
    if (Number(row.hsk_level) !== EXPECTED_HSK_LEVEL) {
      blockers.push({ type: "hsk_level_mismatch", order, actual: row.hsk_level });
    }
    if (Number(sourceEntry.hsk_level) !== EXPECTED_HSK_LEVEL) {
      blockers.push({ type: "source_hsk_level_mismatch", order, actual: sourceEntry.hsk_level });
    }
    if (Number(sourceEntry.hsk_order) !== order) {
      blockers.push({ type: "source_order_mismatch", order, source_order: sourceEntry.hsk_order });
    }
    if (normalizeText(sourceEntry.hsk_key) && normalizeText(sourceEntry.hsk_key) !== normalizeText(row.hsk_key)) {
      blockers.push({ type: "hsk_key_mismatch", order, row_hsk_key: row.hsk_key, source_hsk_key: sourceEntry.hsk_key });
    }
    if (row.hsk_version !== "HSK 3.0") blockers.push({ type: "hsk_version_mismatch", order, actual: row.hsk_version });
    for (const field of ["source_word", "simplified", "pinyin", "example_zh", "example_pinyin", "EN", "example_EN"]) {
      if (!normalizeText(row[field])) blockers.push({ type: "missing_required_field", order, field });
    }
    if (!hasHan(row.simplified)) blockers.push({ type: "simplified_not_han", order, simplified: row.simplified });
    if (!hasHan(row.example_zh)) blockers.push({ type: "example_zh_not_han", order, simplified: row.simplified });
    if (hasToneNumber(row.pinyin)) blockers.push({ type: "pinyin_tone_number", order, simplified: row.simplified, pinyin: row.pinyin });
    if (hasToneNumber(row.example_pinyin)) {
      blockers.push({ type: "example_pinyin_tone_number", order, simplified: row.simplified, example_pinyin: row.example_pinyin });
    }
    if (normalizeText(sourceEntry.simplified) !== normalizeText(row.simplified)) {
      blockers.push({
        type: "source_snapshot_order_mismatch",
        order,
        row_simplified: row.simplified,
        source_simplified: sourceEntry.simplified,
      });
    }
    if (normalizeText(sourceEntry.pinyin) !== normalizeText(row.pinyin)) {
      blockers.push({
        type: "source_snapshot_pinyin_mismatch",
        order,
        row_pinyin: row.pinyin,
        source_pinyin: sourceEntry.pinyin,
      });
    }

    for (const language of languages) {
      const code = language.spreadsheetCode;
      if (!(code in row)) blockers.push({ type: "missing_language_column", order, code });
      if (!(`example_${code}` in row)) blockers.push({ type: "missing_example_language_column", order, code });
      const word = normalizeText(row[code]);
      const example = normalizeText(row[`example_${code}`]);
      const sourceKind = sourceKindFor({ language, row, wordValue: word, exampleValue: example });
      if (sourceKind === "pending_hsk3_manual") {
        if (word || example) warnings.push({ type: "pending_row_has_partial_values", order, code, word_present: Boolean(word), example_present: Boolean(example) });
      } else {
        if (!word) blockers.push({ type: "ready_row_missing_word_translation", order, code });
        if (!example) blockers.push({ type: "ready_row_missing_example_translation", order, code });
      }
    }
  }
  return { blockers, warnings };
}

function validateRequiredGate({ name, gate, expected }) {
  const blockers = [];
  if (gate.status !== "ok") blockers.push({ type: "required_gate_not_ok", gate: name, status: gate.status });
  if (gate.blockers?.length) blockers.push({ type: "required_gate_has_blockers", gate: name, blockers: gate.blockers.length });
  for (const [field, expectedValue] of Object.entries(expected ?? {})) {
    if (gate[field] !== expectedValue) {
      blockers.push({ type: "required_gate_field_mismatch", gate: name, field, expected: expectedValue, actual: gate[field] });
    }
  }
  return blockers;
}

function validateChineseExamplesBuild(gate) {
  const blockers = [];
  if (gate.blockers?.length) {
    blockers.push({ type: "required_gate_has_blockers", gate: "chinese_examples_build", blockers: gate.blockers.length });
  }
  if (gate.examples !== EXPECTED_ROWS) {
    blockers.push({ type: "chinese_examples_count_mismatch", expected: EXPECTED_ROWS, actual: gate.examples });
  }
  if (gate.glosses !== EXPECTED_ROWS) {
    blockers.push({ type: "chinese_gloss_count_mismatch", expected: EXPECTED_ROWS, actual: gate.glosses });
  }
  return blockers;
}

async function main() {
  await fs.mkdir(qaDir, { recursive: true });
  const [jsonlText, sourceEntries, allLanguages, workbookGate, manualGate, chineseExamples, sampleAudit] = await Promise.all([
    fs.readFile(jsonlPath, "utf8"),
    fs.readFile(sourcePath, "utf8").then(JSON.parse),
    fs.readFile(languagesPath, "utf8").then(JSON.parse),
    fs.readFile(workbookGatePath, "utf8").then(JSON.parse),
    fs.readFile(manualGatePath, "utf8").then(JSON.parse),
    fs.readFile(chineseExamplesPath, "utf8").then(JSON.parse),
    fs.readFile(sampleAuditPath, "utf8").then(JSON.parse),
  ]);
  const rows = readJsonl(jsonlText);
  const languages = hskTargetLanguages(allLanguages);
  const blockers = [];
  const warnings = [];

  blockers.push(
    ...validateRequiredGate({
      name: "workbook_gate",
      gate: workbookGate,
      expected: { readiness: "complete_53_languages_filled", rows_checked: EXPECTED_ROWS, target_language_count: 53 },
    }),
    ...validateRequiredGate({ name: "manual_target_gate", gate: manualGate, expected: { require_complete: true } }),
    ...validateChineseExamplesBuild(chineseExamples),
    ...validateRequiredGate({ name: "sample_quality_audit", gate: sampleAudit, expected: {} })
  );
  if (manualGate.counts?.manual_word_cells !== 10302 || manualGate.counts?.manual_example_cells !== 10302) {
    blockers.push({
      type: "manual_gate_cell_count_mismatch",
      expected_word_cells: 10302,
      actual_word_cells: manualGate.counts?.manual_word_cells,
      expected_example_cells: 10302,
      actual_example_cells: manualGate.counts?.manual_example_cells,
    });
  }
  if (sampleAudit.sample_policy?.target_language_sample_rows !== 530) {
    blockers.push({
      type: "sample_audit_scope_mismatch",
      expected_sample_rows: 530,
      actual_sample_rows: sampleAudit.sample_policy?.target_language_sample_rows,
    });
  }

  const validation = validateRows({ rows, sourceEntries, languages });
  blockers.push(...validation.blockers);
  warnings.push(...validation.warnings);

  const sourceRows = rows.map((row, index) => canonicalSourceRow({ row, sourceEntry: sourceEntries[index] }));
  const sourceByOrder = new Map(sourceRows.map((row) => [row.hsk_order, row]));
  const translationRows = rows.flatMap((row) =>
    languages.map((language) => canonicalTranslationRow({ row, sourceRow: sourceByOrder.get(Number(row.hsk_order)), language }))
  );

  let db = {
    applied_migrations: [],
    dry_run: dryRun,
    source: { inserted: 0, updated: 0, unchanged: 0, readback_mismatches: [] },
    translations: { inserted: 0, updated: 0, unchanged: 0, readback_mismatches: [] },
  };

  if (!blockers.length && !dryRun) {
    for (const migrationPath of migrationPaths) {
      await psqlExec(await fs.readFile(migrationPath, "utf8"));
      db.applied_migrations.push(path.relative(ROOT, migrationPath));
    }
    const sourceBefore = await fetchSourceExisting();
    const translationBefore = await fetchTranslationExisting();
    await upsertSourceRows(sourceRows);
    await upsertTranslationRows(translationRows);
    const sourceAfter = await fetchSourceExisting();
    const translationAfter = await fetchTranslationExisting();
    const sourceDiff = summarizeDiff({
      importRows: sourceRows,
      beforeRows: sourceBefore,
      afterRows: sourceAfter,
      keyForRow: (row) => `${row.release_id}:${row.hsk_order}`,
      fields: ["hsk_key", "simplified", "pinyin", "example_zh", "example_pinyin", "example_en", "content_hash"],
    });
    const translationDiff = summarizeDiff({
      importRows: translationRows,
      beforeRows: translationBefore,
      afterRows: translationAfter,
      keyForRow: (row) => `${row.release_id}:${row.hsk_order}:${row.spreadsheet_code}`,
      fields: ["word_translation", "example_translation", "source_kind", "content_hash"],
    });
    db = {
      ...db,
      source: {
        inserted: sourceDiff.inserted.length,
        updated: sourceDiff.updated.length,
        unchanged: sourceDiff.unchanged.length,
        readback_mismatches: sourceDiff.readbackMismatches,
      },
      translations: {
        inserted: translationDiff.inserted.length,
        updated: translationDiff.updated.length,
        unchanged: translationDiff.unchanged.length,
        readback_mismatches: translationDiff.readbackMismatches,
      },
    };
    for (const mismatch of [...sourceDiff.readbackMismatches, ...translationDiff.readbackMismatches]) {
      blockers.push({ type: "db_readback_mismatch", ...mismatch });
    }
  }

  const sourceKindCounts = translationRows.reduce((acc, row) => {
    acc[row.source_kind] = (acc[row.source_kind] ?? 0) + 1;
    return acc;
  }, {});
  const report = {
    rule_version: "hsk3-level3-db-import-v1",
    generated_at: new Date().toISOString(),
    release_id: RELEASE_ID,
    dry_run: dryRun,
    status: blockers.length ? "blocked" : "ok",
    expected_source_rows: EXPECTED_ROWS,
    import_source_rows: sourceRows.length,
    target_language_count: languages.length,
    import_translation_rows: translationRows.length,
    source_kind_counts: sourceKindCounts,
    gates: {
      workbook_gate: workbookGate.status,
      workbook_readiness: workbookGate.readiness,
      manual_target_gate: manualGate.status,
      chinese_examples_build: chineseExamples.blockers?.length ? "blocked" : "ok",
      sample_quality_audit: sampleAudit.status,
    },
    db,
    blockers,
    warnings,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        status: report.status,
        report: path.relative(ROOT, reportPath),
        dry_run: dryRun,
        source_rows: report.import_source_rows,
        translation_rows: report.import_translation_rows,
        source_kind_counts: sourceKindCounts,
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
