#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { psqlExec, psqlJson, sqlJson, sqlNullableString, sqlString } from "../lib/qa-utils.mjs";
import { isSpanishA1Ipa, transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const RULE_VERSION = "spanish-a1-db-import-v1";
const SOURCE_DIR = path.join(ROOT, "outputs/spanish-a1-core");
const QA_DIR = path.join(SOURCE_DIR, "qa");
const MIGRATION_PATH = path.join(ROOT, "db/migrations/032_spanish_a1_release_items.sql");
const CONTRACT_PATH = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const CONTRACT = await readJson(CONTRACT_PATH);
const RELEASE_ID = args.get("release") ?? CONTRACT.default_release?.release_id ?? "spanish_a1_core_part_001_300_v1";
const COURSE_ID = CONTRACT.default_release?.course_id ?? "spanish_a1_core";
const EXPECTED_SOURCE_ROWS = Number(CONTRACT.default_release?.expected_row_count ?? 300);
const CANDIDATE_POOL_PATH = path.join(
  SOURCE_DIR,
  "candidate-pools",
  `${RELEASE_ID}_candidate_pool.jsonl`
);
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const SUPPORT_DIRS = [
  path.join(SOURCE_DIR, "support-translations"),
  path.join(SOURCE_DIR, "support-generation"),
];
const INSERT_CHUNK_SIZE = 1500;

const dryRun = args.has("dry-run");
const sourceOnly = args.has("source-only");
const runDate = args.get("date") ?? new Date().toISOString().slice(0, 10).replaceAll("-", "");
const reportPath = path.join(QA_DIR, `${RELEASE_ID}_db_import_${runDate}.json`);

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

function readJsonl(text, filePath) {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

function parseTsv(text) {
  const lines = text.split(/\r?\n/u).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function selectionDecision(row) {
  return normalizeText(row.selection_decision ?? row.qa_status ?? row.source_status).toLowerCase();
}

function isSelected(row) {
  return selectionDecision(row) === "selected" || normalizeText(row.qa_status).toLowerCase() === "selected";
}

function supportLanguages(languages) {
  return languages.filter((language) => !["ES", "ES-419"].includes(language.spreadsheetCode));
}

function canonicalSourceRow(row) {
  const canonical = {
    release_id: normalizeText(row.release_id),
    course_id: normalizeText(row.course_id),
    cefr_level: normalizeText(row.cefr_level),
    row_id: normalizeText(row.row_id),
    spanish_item_id: normalizeText(row.spanish_item_id),
    meaning_id: normalizeText(row.meaning_id),
    selection_order: Number(row.selection_order),
    source_language: normalizeText(row.source_language),
    source_variant: normalizeText(row.source_variant),
    source_lemma: normalizeText(row.source_lemma),
    display_es: normalizeText(row.display_ES),
    display_es_419: normalizeText(row.display_ES_419),
    part_of_speech: normalizeText(row.part_of_speech),
    gender: normalizeText(row.gender),
    article_es: normalizeText(row.article_ES),
    article_es_419: normalizeText(row.article_ES_419),
    number_policy: normalizeText(row.number_policy),
    verb_infinitive: normalizeText(row.verb_infinitive),
    verb_group: normalizeText(row.verb_group),
    meaning_note: normalizeText(row.meaning_note),
    semantic_scene: normalizeText(row.semantic_scene),
    topic_domain: normalizeText(row.topic_domain),
    example_es: normalizeText(row.example_ES),
    example_es_419: normalizeText(row.example_ES_419),
    transcription_es: normalizeText(row.transcription_ES),
    transcription_es_419: normalizeText(row.transcription_ES_419),
    source_status: normalizeText(row.source_status),
    qa_status: normalizeText(row.qa_status),
    qa_notes: normalizeText(row.qa_notes),
    source_row: row,
    source_paths: {
      candidate_pool: path.relative(ROOT, CANDIDATE_POOL_PATH),
      contract: path.relative(ROOT, CONTRACT_PATH),
    },
  };
  return { ...canonical, content_hash: sha256(stableStringify(canonical)) };
}

function supportValue(row, keys) {
  for (const key of keys) {
    const value = normalizeText(row[key]);
    if (value) return value;
  }
  return "";
}

function canonicalSupportRow(row, languageBySpreadsheetCode, filePath) {
  const spreadsheetCode = supportValue(row, ["spreadsheet_code", "language_code", "target_language_code"]);
  const language = languageBySpreadsheetCode.get(spreadsheetCode);
  const dbCode = supportValue(row, ["db_code", "db_language_code"]) || language?.dbCode || "";
  const sourceBatchId =
    supportValue(row, ["source_batch_id", "batch_id"]) ||
    path.basename(filePath).replace(/\.(jsonl|tsv)$/iu, "");
  const canonical = {
    release_id: supportValue(row, ["release_id"]) || RELEASE_ID,
    row_id: supportValue(row, ["row_id"]),
    spreadsheet_code: spreadsheetCode,
    db_code: dbCode,
    language_name: supportValue(row, ["language_name"]) || language?.language || "",
    display_translation: supportValue(row, ["display_translation", "word_translation", "display", "translation"]),
    example_translation: supportValue(row, ["example_translation", "example", "support_example"]),
    translation_status:
      supportValue(row, ["translation_status", "support_translation_status"]) || "support_generation_ready",
    example_status: supportValue(row, ["example_status", "support_example_status"]) || "support_example_ready",
    generation_source: supportValue(row, ["generation_source", "source_kind"]) || "spanish_a1_support_generation",
    source_batch_id: sourceBatchId,
    source_paths: {
      support_file: path.relative(ROOT, filePath),
    },
    support_row: row,
  };
  return { ...canonical, content_hash: sha256(stableStringify(canonical)) };
}

function sourceValuesSql(rows) {
  return rows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${sqlString(row.course_id)},
        ${sqlString(row.cefr_level)},
        ${sqlString(row.row_id)},
        ${sqlString(row.spanish_item_id)},
        ${sqlString(row.meaning_id)},
        ${row.selection_order},
        ${sqlString(row.source_language)},
        ${sqlString(row.source_variant)},
        ${sqlString(row.source_lemma)},
        ${sqlString(row.display_es)},
        ${sqlString(row.display_es_419)},
        ${sqlString(row.part_of_speech)},
        ${sqlString(row.gender)},
        ${sqlString(row.article_es)},
        ${sqlString(row.article_es_419)},
        ${sqlString(row.number_policy)},
        ${sqlString(row.verb_infinitive)},
        ${sqlString(row.verb_group)},
        ${sqlString(row.meaning_note)},
        ${sqlString(row.semantic_scene)},
        ${sqlString(row.topic_domain)},
        ${sqlString(row.example_es)},
        ${sqlString(row.example_es_419)},
        ${sqlString(row.transcription_es)},
        ${sqlString(row.transcription_es_419)},
        ${sqlString(row.source_status)},
        ${sqlString(row.qa_status)},
        ${sqlNullableString(row.qa_notes)},
        ${sqlJson(row.source_row)},
        ${sqlJson(row.source_paths)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

function supportValuesSql(rows) {
  return rows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${sqlString(row.row_id)},
        ${sqlString(row.spreadsheet_code)},
        ${sqlString(row.db_code)},
        ${sqlString(row.language_name)},
        ${sqlString(row.display_translation)},
        ${sqlString(row.example_translation)},
        ${sqlString(row.translation_status)},
        ${sqlString(row.example_status)},
        ${sqlString(row.generation_source)},
        ${sqlString(row.source_batch_id)},
        ${sqlJson(row.source_paths)},
        ${sqlJson(row.support_row)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

async function listSupportFiles() {
  if (args.has("support-file")) {
    return args
      .get("support-file")
      .split(",")
      .map((filePath) => path.resolve(filePath.trim()))
      .filter(Boolean);
  }
  const files = [];
  for (const supportDir of SUPPORT_DIRS) {
    if (!(await pathExists(supportDir))) continue;
    const entries = await fs.readdir(supportDir);
    files.push(
      ...entries
        .filter((fileName) => {
          if (!fileName.startsWith(`${RELEASE_ID}_support_translation_batch_`)) return false;
          if (!/\.(jsonl|tsv)$/iu.test(fileName)) return false;
          return !fileName.includes("summary");
        })
        .map((fileName) => path.join(supportDir, fileName))
    );
  }
  return files.sort();
}

async function readSupportRows(languageBySpreadsheetCode) {
  const files = await listSupportFiles();
  const rows = [];
  for (const filePath of files) {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = filePath.endsWith(".tsv") ? parseTsv(text) : readJsonl(text, filePath);
    for (const row of parsed) {
      rows.push(canonicalSupportRow(row, languageBySpreadsheetCode, filePath));
    }
  }
  return { files, rows };
}

function validateSourceRows(rows) {
  const blockers = [];
  if (rows.length !== EXPECTED_SOURCE_ROWS) {
    blockers.push({ type: "wrong_source_row_count", expected: EXPECTED_SOURCE_ROWS, actual: rows.length });
  }
  const rowIds = new Set();
  const orders = new Set();
  for (const row of rows) {
    for (const field of [
      "release_id",
      "course_id",
      "cefr_level",
      "row_id",
      "spanish_item_id",
      "meaning_id",
      "source_language",
      "display_es",
      "display_es_419",
      "part_of_speech",
      "meaning_note",
      "semantic_scene",
      "example_es",
      "example_es_419",
      "transcription_es",
      "transcription_es_419",
    ]) {
      if (!normalizeText(row[field])) blockers.push({ type: "missing_source_field", row_id: row.row_id, field });
    }
    if (row.release_id !== RELEASE_ID) blockers.push({ type: "wrong_release_id", row_id: row.row_id, actual: row.release_id });
    if (row.course_id !== COURSE_ID) blockers.push({ type: "wrong_course_id", row_id: row.row_id, actual: row.course_id });
    if (row.source_language !== "ES") blockers.push({ type: "wrong_source_language", row_id: row.row_id, actual: row.source_language });
    if (row.transcription_es !== transcribeSpanishText(row.display_es, "ES")) {
      blockers.push({ type: "es_transcription_mismatch", row_id: row.row_id });
    }
    if (row.transcription_es_419 !== transcribeSpanishText(row.display_es_419, "ES-419")) {
      blockers.push({ type: "es419_transcription_mismatch", row_id: row.row_id });
    }
    if (!isSpanishA1Ipa(row.transcription_es) || !isSpanishA1Ipa(row.transcription_es_419)) {
      blockers.push({ type: "spanish_transcription_not_slash_wrapped_ipa", row_id: row.row_id });
    }
    if (!/[.!?]$/u.test(row.example_es)) blockers.push({ type: "example_es_missing_terminal_punctuation", row_id: row.row_id });
    if (!/[.!?]$/u.test(row.example_es_419)) blockers.push({ type: "example_es419_missing_terminal_punctuation", row_id: row.row_id });
    if (rowIds.has(row.row_id)) blockers.push({ type: "duplicate_row_id", row_id: row.row_id });
    if (orders.has(row.selection_order)) blockers.push({ type: "duplicate_selection_order", selection_order: row.selection_order });
    rowIds.add(row.row_id);
    orders.add(row.selection_order);
  }
  return blockers;
}

function validateSupportRows({ supportRows, sourceRows, languages }) {
  const blockers = [];
  const sourceRowIds = new Set(sourceRows.map((row) => row.row_id));
  const languageCodes = new Set(languages.map((language) => language.spreadsheetCode));
  const expectedSupportRows = sourceRows.length * languages.length;
  if (supportRows.length !== expectedSupportRows) {
    blockers.push({ type: "wrong_support_row_count", expected: expectedSupportRows, actual: supportRows.length });
  }

  const seen = new Set();
  for (const row of supportRows) {
    const key = `${row.row_id}:${row.spreadsheet_code}`;
    if (seen.has(key)) blockers.push({ type: "duplicate_support_row", key });
    seen.add(key);
    if (row.release_id !== RELEASE_ID) blockers.push({ type: "support_wrong_release_id", key, actual: row.release_id });
    if (!sourceRowIds.has(row.row_id)) blockers.push({ type: "support_unknown_row_id", key });
    if (!languageCodes.has(row.spreadsheet_code)) blockers.push({ type: "support_unknown_language", key, language: row.spreadsheet_code });
    if (["ES", "ES-419"].includes(row.spreadsheet_code)) blockers.push({ type: "support_includes_source_language", key });
    for (const field of [
      "db_code",
      "language_name",
      "display_translation",
      "example_translation",
      "translation_status",
      "example_status",
      "generation_source",
      "source_batch_id",
    ]) {
      if (!normalizeText(row[field])) blockers.push({ type: "support_missing_field", key, field });
    }
  }
  for (const sourceRow of sourceRows) {
    for (const language of languages) {
      const key = `${sourceRow.row_id}:${language.spreadsheetCode}`;
      if (!seen.has(key)) blockers.push({ type: "missing_support_row", key });
    }
  }
  return blockers;
}

async function upsertSourceRows(rows) {
  await psqlExec(`
    insert into spanish_a1_source_items (
      release_id, course_id, cefr_level, row_id, spanish_item_id, meaning_id, selection_order,
      source_language, source_variant, source_lemma, display_es, display_es_419, part_of_speech,
      gender, article_es, article_es_419, number_policy, verb_infinitive, verb_group,
      meaning_note, semantic_scene, topic_domain, example_es, example_es_419,
      transcription_es, transcription_es_419, source_status, qa_status, qa_notes,
      source_row, source_paths, content_hash
    )
    values
    ${sourceValuesSql(rows)}
    on conflict (release_id, row_id) do update set
      course_id = excluded.course_id,
      cefr_level = excluded.cefr_level,
      spanish_item_id = excluded.spanish_item_id,
      meaning_id = excluded.meaning_id,
      selection_order = excluded.selection_order,
      source_language = excluded.source_language,
      source_variant = excluded.source_variant,
      source_lemma = excluded.source_lemma,
      display_es = excluded.display_es,
      display_es_419 = excluded.display_es_419,
      part_of_speech = excluded.part_of_speech,
      gender = excluded.gender,
      article_es = excluded.article_es,
      article_es_419 = excluded.article_es_419,
      number_policy = excluded.number_policy,
      verb_infinitive = excluded.verb_infinitive,
      verb_group = excluded.verb_group,
      meaning_note = excluded.meaning_note,
      semantic_scene = excluded.semantic_scene,
      topic_domain = excluded.topic_domain,
      example_es = excluded.example_es,
      example_es_419 = excluded.example_es_419,
      transcription_es = excluded.transcription_es,
      transcription_es_419 = excluded.transcription_es_419,
      source_status = excluded.source_status,
      qa_status = excluded.qa_status,
      qa_notes = excluded.qa_notes,
      source_row = excluded.source_row,
      source_paths = excluded.source_paths,
      content_hash = excluded.content_hash,
      import_status = 'active',
      updated_at = now()
    where spanish_a1_source_items.content_hash <> excluded.content_hash
      or spanish_a1_source_items.selection_order <> excluded.selection_order;
  `);
}

async function upsertSupportRows(rows) {
  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE);
    await psqlExec(`
      insert into spanish_a1_support_items (
        release_id, row_id, spreadsheet_code, db_code, language_name,
        display_translation, example_translation, translation_status, example_status,
        generation_source, source_batch_id, source_paths, support_row, content_hash
      )
      values
      ${supportValuesSql(chunk)}
      on conflict (release_id, row_id, spreadsheet_code) do update set
        db_code = excluded.db_code,
        language_name = excluded.language_name,
        display_translation = excluded.display_translation,
        example_translation = excluded.example_translation,
        translation_status = excluded.translation_status,
        example_status = excluded.example_status,
        generation_source = excluded.generation_source,
        source_batch_id = excluded.source_batch_id,
        source_paths = excluded.source_paths,
        support_row = excluded.support_row,
        content_hash = excluded.content_hash,
        import_status = 'active',
        updated_at = now()
      where spanish_a1_support_items.content_hash <> excluded.content_hash;
    `);
  }
}

async function fetchSourceExisting() {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by selection_order), '[]'::json)
    from (
      select release_id, row_id, spanish_item_id, meaning_id, selection_order,
        display_es, display_es_419, example_es, example_es_419, content_hash
      from spanish_a1_source_items
      where release_id = ${sqlString(RELEASE_ID)}
    ) t;
  `);
}

async function fetchSupportExisting() {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by row_id, spreadsheet_code), '[]'::json)
    from (
      select release_id, row_id, spreadsheet_code, display_translation, example_translation, content_hash
      from spanish_a1_support_items
      where release_id = ${sqlString(RELEASE_ID)}
    ) t;
  `, 1024 * 1024 * 100);
}

async function ordinaryTableLeakCount() {
  const rows = await psqlJson(`
    select json_build_array(
      (select count(*) from content_sets where set_id = ${sqlString(RELEASE_ID)} or set_id like 'spanish_a1_%'),
      (select count(*) from meaning_set_memberships where set_id = ${sqlString(RELEASE_ID)} or set_id like 'spanish_a1_%'),
      (select count(*) from meaning_examples where set_id = ${sqlString(RELEASE_ID)} or set_id like 'spanish_a1_%'),
      (select count(*) from meaning_units where meaning_id like 'spanish_a1::%')
    );
  `);
  return rows.reduce((sum, count) => sum + Number(count ?? 0), 0);
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

async function insertImportRun(report) {
  const importId = `${RELEASE_ID}:${runDate}:${sourceOnly ? "source_only" : "final"}`;
  await psqlExec(`
    insert into spanish_a1_db_import_runs (
      import_id, release_id, rule_version, status, dry_run, source_only,
      source_rows, support_rows, expected_support_rows, ordinary_table_leak_count,
      readback_mismatch_count, report_path, report
    )
    values (
      ${sqlString(importId)},
      ${sqlString(RELEASE_ID)},
      ${sqlString(RULE_VERSION)},
      ${sqlString(report.status)},
      ${dryRun ? "true" : "false"},
      ${sourceOnly ? "true" : "false"},
      ${report.source_rows},
      ${report.support_rows},
      ${report.expected_support_rows},
      ${report.db.ordinary_table_leak_count},
      ${report.db.readback_mismatch_count},
      ${sqlString(path.relative(ROOT, reportPath))},
      ${sqlJson(report)}
    )
    on conflict (import_id) do update set
      status = excluded.status,
      dry_run = excluded.dry_run,
      source_only = excluded.source_only,
      source_rows = excluded.source_rows,
      support_rows = excluded.support_rows,
      expected_support_rows = excluded.expected_support_rows,
      ordinary_table_leak_count = excluded.ordinary_table_leak_count,
      readback_mismatch_count = excluded.readback_mismatch_count,
      report_path = excluded.report_path,
      report = excluded.report,
      created_at = now();
  `);
}

async function main() {
  await fs.mkdir(QA_DIR, { recursive: true });
  const [contract, candidateText, allLanguages] = await Promise.all([
    readJson(CONTRACT_PATH),
    fs.readFile(CANDIDATE_POOL_PATH, "utf8"),
    readJson(LANGUAGES_PATH),
  ]);

  const targetLanguages = supportLanguages(allLanguages);
  const languageBySpreadsheetCode = new Map(targetLanguages.map((language) => [language.spreadsheetCode, language]));
  const selectedRows = readJsonl(candidateText, CANDIDATE_POOL_PATH)
    .filter(isSelected)
    .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
  const sourceRows = selectedRows.map(canonicalSourceRow);
  const { files: supportFiles, rows: supportRows } = sourceOnly
    ? { files: [], rows: [] }
    : await readSupportRows(languageBySpreadsheetCode);

  const blockers = [];
  const warnings = [];
  if (!String(contract.contract_id ?? "").startsWith("spanish_a1_core_release_contract_v1")) {
    blockers.push({ type: "wrong_contract_id", actual: contract.contract_id });
  }
  if (contract.default_release?.release_id !== RELEASE_ID) {
    blockers.push({ type: "wrong_contract_release", actual: contract.default_release?.release_id });
  }
  if (targetLanguages.length !== 52) {
    blockers.push({ type: "wrong_support_language_count", expected: 52, actual: targetLanguages.length });
  }
  blockers.push(...validateSourceRows(sourceRows));
  if (sourceOnly) {
    warnings.push({
      type: "source_only_import",
      message: "Only Spanish source rows will be stored. Final support-language storage remains blocked until final support batches exist.",
    });
  } else {
    if (!supportFiles.length) {
      blockers.push({
        type: "missing_support_files",
        support_dirs: SUPPORT_DIRS.map((supportDir) => path.relative(ROOT, supportDir)),
      });
    }
    blockers.push(...validateSupportRows({ supportRows, sourceRows, languages: targetLanguages }));
  }

  let db = {
    applied_migration: false,
    dry_run: dryRun,
    source_only: sourceOnly,
    source: { inserted: 0, updated: 0, unchanged: 0, readback_mismatches: [] },
    support: { inserted: 0, updated: 0, unchanged: 0, readback_mismatches: [] },
    ordinary_table_leak_count: 0,
    readback_mismatch_count: 0,
  };

  if (!blockers.length && !dryRun) {
    await psqlExec(await fs.readFile(MIGRATION_PATH, "utf8"));
    db.applied_migration = true;
    const sourceBefore = await fetchSourceExisting();
    const supportBefore = await fetchSupportExisting();
    await upsertSourceRows(sourceRows);
    if (!sourceOnly) await upsertSupportRows(supportRows);
    const sourceAfter = await fetchSourceExisting();
    const supportAfter = await fetchSupportExisting();
    const sourceDiff = summarizeDiff({
      importRows: sourceRows,
      beforeRows: sourceBefore,
      afterRows: sourceAfter,
      keyForRow: (row) => `${row.release_id}:${row.row_id}`,
      fields: [
        "spanish_item_id",
        "meaning_id",
        "selection_order",
        "display_es",
        "display_es_419",
        "example_es",
        "example_es_419",
        "content_hash",
      ],
    });
    const supportDiff = summarizeDiff({
      importRows: supportRows,
      beforeRows: supportBefore,
      afterRows: supportAfter,
      keyForRow: (row) => `${row.release_id}:${row.row_id}:${row.spreadsheet_code}`,
      fields: ["display_translation", "example_translation", "content_hash"],
    });
    db = {
      ...db,
      source: {
        inserted: sourceDiff.inserted.length,
        updated: sourceDiff.updated.length,
        unchanged: sourceDiff.unchanged.length,
        readback_mismatches: sourceDiff.readbackMismatches,
      },
      support: {
        inserted: supportDiff.inserted.length,
        updated: supportDiff.updated.length,
        unchanged: supportDiff.unchanged.length,
        readback_mismatches: supportDiff.readbackMismatches,
      },
    };
    db.ordinary_table_leak_count = await ordinaryTableLeakCount();
    db.readback_mismatch_count =
      sourceDiff.readbackMismatches.length + supportDiff.readbackMismatches.length;
    if (db.ordinary_table_leak_count > 0) blockers.push({ type: "ordinary_table_leak", count: db.ordinary_table_leak_count });
    for (const mismatch of [...sourceDiff.readbackMismatches, ...supportDiff.readbackMismatches]) {
      blockers.push({ type: "db_readback_mismatch", ...mismatch });
    }
  }

  const report = {
    rule_version: RULE_VERSION,
    generated_at: new Date().toISOString(),
    release_id: RELEASE_ID,
    dry_run: dryRun,
    source_only: sourceOnly,
    status: blockers.length ? "blocked" : sourceOnly ? "source_only" : "ok",
    source_rows: sourceRows.length,
    support_language_count: targetLanguages.length,
    support_rows: supportRows.length,
    expected_support_rows: sourceRows.length * targetLanguages.length,
    support_files: supportFiles.map((filePath) => path.relative(ROOT, filePath)),
    db,
    blockers,
    warnings,
  };

  if (!blockers.length && !dryRun) {
    await insertImportRun(report);
  }
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        status: report.status,
        report: path.relative(ROOT, reportPath),
        dry_run: report.dry_run,
        source_only: report.source_only,
        source_rows: report.source_rows,
        support_rows: report.support_rows,
        expected_support_rows: report.expected_support_rows,
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
