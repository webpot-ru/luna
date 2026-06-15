#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { psqlExec, psqlJson, sqlJson, sqlNullableString, sqlString } from "../lib/qa-utils.mjs";

const ruleVersion = "oxford-vocabulary-db-isolation-import-v1";
const defaultContractPath = "config/oxford-vocabulary-release-contract-v0.json";
const migrationPath = "db/migrations/027_oxford_vocabulary_isolation.sql";
const qaDir = "outputs/oxford-vocabulary/qa";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const contractArg = args.find((arg) => arg.startsWith("--contract="));
const contractPath = contractArg ? contractArg.slice("--contract=".length) : defaultContractPath;
const releaseArg = args.find((arg) => !arg.startsWith("--"));

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function timestampId() {
  return new Date().toISOString().replace(/[-:.]/gu, "").replace(/Z$/u, "Z");
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function requiredString(row, field, blockers, context) {
  const value = normalizeText(row?.[field]);
  if (!value) blockers.push({ type: "missing_required_field", field, ...context });
  return value;
}

function hashRow(row) {
  return sha256(stableStringify(row));
}

function keyedBy(rows, field, blockers, context) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeText(row[field]);
    if (!key) {
      blockers.push({ type: "missing_key", field, ...context });
      continue;
    }
    if (map.has(key)) blockers.push({ type: "duplicate_key", field, key, ...context });
    map.set(key, row);
  }
  return map;
}

function sourceValuesSql(rows) {
  return rows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${sqlString(row.course_id)},
        ${sqlString(row.row_id)},
        ${sqlString(row.core_item_id)},
        ${sqlString(row.meaning_id)},
        ${sqlString(row.source_candidate_id)},
        ${sqlString(row.source_language)},
        ${sqlString(row.source_variant)},
        ${sqlString(row.source_headword)},
        ${sqlString(row.reviewed_display_headword)},
        ${sqlString(row.reviewed_part_of_speech)},
        ${sqlString(row.level_min)},
        ${sqlString(row.level_max)},
        ${sqlString(row.benchmark_membership)},
        ${sqlString(row.source_status)},
        ${sqlString(row.review_status)},
        ${sqlNullableString(row.learner_value_status)},
        ${sqlString(row.meaning_note)},
        ${sqlString(row.semantic_scene)},
        ${sqlJson(row.candidate_row)},
        ${sqlJson(row.row_review)},
        ${sqlJson(row.source_snapshot)},
        ${sqlJson(row.source_paths)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

function editionValuesSql(rows) {
  return rows
    .map(
      (row) => `(
        ${sqlString(row.release_id)},
        ${sqlString(row.row_id)},
        ${sqlString(row.edition_id)},
        ${sqlString(row.deck_id)},
        ${sqlString(row.deck_title)},
        ${sqlString(row.source_variant)},
        ${sqlString(row.primary_language_code)},
        ${sqlString(row.display_headword)},
        ${sqlString(row.example_text)},
        ${sqlString(row.word_transcription)},
        ${sqlString(row.example_transcription)},
        ${sqlString(row.pronunciation_status)},
        ${sqlString(row.pronunciation_source)},
        ${sqlNullableString(row.edition_note)},
        ${sqlString(row.edition_status)},
        ${sqlJson(row.edition_row)},
        ${sqlJson(row.pronunciation_row)},
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
        ${sqlString(row.word_translation)},
        ${sqlString(row.example_translation)},
        ${sqlString(row.translation_status)},
        ${sqlString(row.example_status)},
        ${sqlString(row.source_batch_id)},
        ${sqlJson(row.source_paths)},
        ${sqlJson(row.support_row)},
        ${sqlString(row.content_hash)}
      )`
    )
    .join(",\n");
}

async function ensureMigrationApplied() {
  await psqlExec(await fs.readFile(migrationPath, "utf8"));
}

async function fetchExisting(tableName, keyColumns, releaseId) {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by ${keyColumns.join(", ")}), '[]'::json)
    from (
      select ${keyColumns.join(", ")}, content_hash
      from ${tableName}
      where release_id = ${sqlString(releaseId)}
    ) t;
  `);
}

async function upsertSourceRows(rows) {
  if (!rows.length) return;
  await psqlExec(`
    insert into oxford_vocabulary_source_items (
      release_id, course_id, row_id, core_item_id, meaning_id, source_candidate_id,
      source_language, source_variant, source_headword, reviewed_display_headword,
      reviewed_part_of_speech, level_min, level_max, benchmark_membership,
      source_status, review_status, learner_value_status, meaning_note, semantic_scene,
      candidate_row, row_review, source_snapshot, source_paths, content_hash
    )
    values
    ${sourceValuesSql(rows)}
    on conflict (release_id, row_id) do update set
      course_id = excluded.course_id,
      core_item_id = excluded.core_item_id,
      meaning_id = excluded.meaning_id,
      source_candidate_id = excluded.source_candidate_id,
      source_language = excluded.source_language,
      source_variant = excluded.source_variant,
      source_headword = excluded.source_headword,
      reviewed_display_headword = excluded.reviewed_display_headword,
      reviewed_part_of_speech = excluded.reviewed_part_of_speech,
      level_min = excluded.level_min,
      level_max = excluded.level_max,
      benchmark_membership = excluded.benchmark_membership,
      source_status = excluded.source_status,
      review_status = excluded.review_status,
      learner_value_status = excluded.learner_value_status,
      meaning_note = excluded.meaning_note,
      semantic_scene = excluded.semantic_scene,
      candidate_row = excluded.candidate_row,
      row_review = excluded.row_review,
      source_snapshot = excluded.source_snapshot,
      source_paths = excluded.source_paths,
      content_hash = excluded.content_hash,
      import_status = 'active',
      updated_at = now()
    where oxford_vocabulary_source_items.content_hash <> excluded.content_hash;
  `);
}

async function upsertEditionRows(rows) {
  if (!rows.length) return;
  await psqlExec(`
    insert into oxford_vocabulary_edition_items (
      release_id, row_id, edition_id, deck_id, deck_title, source_variant,
      primary_language_code, display_headword, example_text, word_transcription,
      example_transcription, pronunciation_status, pronunciation_source,
      edition_note, edition_status, edition_row, pronunciation_row, source_paths, content_hash
    )
    values
    ${editionValuesSql(rows)}
    on conflict (release_id, row_id, edition_id) do update set
      deck_id = excluded.deck_id,
      deck_title = excluded.deck_title,
      source_variant = excluded.source_variant,
      primary_language_code = excluded.primary_language_code,
      display_headword = excluded.display_headword,
      example_text = excluded.example_text,
      word_transcription = excluded.word_transcription,
      example_transcription = excluded.example_transcription,
      pronunciation_status = excluded.pronunciation_status,
      pronunciation_source = excluded.pronunciation_source,
      edition_note = excluded.edition_note,
      edition_status = excluded.edition_status,
      edition_row = excluded.edition_row,
      pronunciation_row = excluded.pronunciation_row,
      source_paths = excluded.source_paths,
      content_hash = excluded.content_hash,
      import_status = 'active',
      updated_at = now()
    where oxford_vocabulary_edition_items.content_hash <> excluded.content_hash;
  `);
}

async function upsertSupportRows(rows) {
  if (!rows.length) return;
  await psqlExec(`
    insert into oxford_vocabulary_support_items (
      release_id, row_id, spreadsheet_code, db_code, language_name,
      word_translation, example_translation, translation_status, example_status,
      source_batch_id, source_paths, support_row, content_hash
    )
    values
    ${supportValuesSql(rows)}
    on conflict (release_id, row_id, spreadsheet_code) do update set
      db_code = excluded.db_code,
      language_name = excluded.language_name,
      word_translation = excluded.word_translation,
      example_translation = excluded.example_translation,
      translation_status = excluded.translation_status,
      example_status = excluded.example_status,
      source_batch_id = excluded.source_batch_id,
      source_paths = excluded.source_paths,
      support_row = excluded.support_row,
      content_hash = excluded.content_hash,
      import_status = 'active',
      updated_at = now()
    where oxford_vocabulary_support_items.content_hash <> excluded.content_hash;
  `);
}

function summarizeDbDiff(importRows, beforeRows, afterRows, keyColumns) {
  const keyFor = (row) => keyColumns.map((column) => row[column]).join("::");
  const before = new Map(beforeRows.map((row) => [keyFor(row), row.content_hash]));
  const after = new Map(afterRows.map((row) => [keyFor(row), row.content_hash]));
  const inserted = [];
  const updated = [];
  const unchanged = [];
  const readbackMismatches = [];

  for (const row of importRows) {
    const key = keyFor(row);
    const beforeHash = before.get(key);
    const afterHash = after.get(key);
    if (!beforeHash) inserted.push(key);
    else if (beforeHash !== row.content_hash) updated.push(key);
    else unchanged.push(key);
    if (afterHash !== row.content_hash) {
      readbackMismatches.push({ key, expected_hash: row.content_hash, actual_hash: afterHash ?? null });
    }
  }
  return { inserted, updated, unchanged, readback_mismatches: readbackMismatches };
}

async function fetchOrdinaryLeaks() {
  return psqlJson(`
    select json_build_object(
      'content_sets', (select count(*)::int from content_sets where set_id like 'oxford_%' or set_name ilike '%Oxford%'),
      'meaning_units', (select count(*)::int from meaning_units where meaning_id like 'oxford%' or default_domain ilike 'Oxford%'),
      'meaning_set_memberships', (select count(*)::int from meaning_set_memberships where set_id like 'oxford_%' or meaning_id like 'oxford%'),
      'meaning_examples', (select count(*)::int from meaning_examples where coalesce(set_id, '') like 'oxford_%' or meaning_id like 'oxford%'),
      'meaning_language_entries', (select count(*)::int from meaning_language_entries where meaning_id like 'oxford%'),
      'meaning_example_translations', (
        select count(*)::int
        from meaning_example_translations met
        join meaning_examples me on me.example_id = met.example_id
        where coalesce(me.set_id, '') like 'oxford_%' or me.meaning_id like 'oxford%'
      ),
      'generation_batches', (select count(*)::int from generation_batches where batch_id like 'oxford_%' or scope_description ilike '%Oxford%'),
      'generation_batch_items', (select count(*)::int from generation_batch_items where target_key like 'oxford%'),
      'qa_reviews', (select count(*)::int from qa_reviews where target_key like 'oxford%'),
      'exports', (select count(*)::int from exports where coalesce(set_id, '') like 'oxford_%' or export_name ilike '%Oxford%'),
      'export_items', (select count(*)::int from export_items where content_key like 'oxford%')
    );
  `);
}

async function fetchOxfordForeignKeys() {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by child_table, parent_table, constraint_name), '[]'::json)
    from (
      select
        conname as constraint_name,
        conrelid::regclass::text as child_table,
        confrelid::regclass::text as parent_table
      from pg_constraint
      where contype = 'f'
        and (
          conrelid::regclass::text like 'oxford_vocabulary_%'
          or confrelid::regclass::text like 'oxford_vocabulary_%'
        )
    ) t;
  `);
}

async function fetchOxfordCounts(releaseId) {
  return psqlJson(`
    select json_build_object(
      'source_rows', (select count(*)::int from oxford_vocabulary_source_items where release_id = ${sqlString(releaseId)}),
      'edition_rows', (select count(*)::int from oxford_vocabulary_edition_items where release_id = ${sqlString(releaseId)}),
      'support_rows', (select count(*)::int from oxford_vocabulary_support_items where release_id = ${sqlString(releaseId)}),
      'us_edition_rows', (select count(*)::int from oxford_vocabulary_edition_items where release_id = ${sqlString(releaseId)} and edition_id = 'us_english'),
      'british_edition_rows', (select count(*)::int from oxford_vocabulary_edition_items where release_id = ${sqlString(releaseId)} and edition_id = 'british_english'),
      'support_language_count', (select count(distinct spreadsheet_code)::int from oxford_vocabulary_support_items where release_id = ${sqlString(releaseId)})
    );
  `);
}

async function insertImportRun({ importId, releaseId, reportPath, report }) {
  await psqlExec(`
    insert into oxford_vocabulary_db_import_runs (
      import_id, release_id, rule_version, status, dry_run, source_rows,
      edition_rows, support_rows, ordinary_table_leak_count,
      readback_mismatch_count, report_path, report
    )
    values (
      ${sqlString(importId)},
      ${sqlString(releaseId)},
      ${sqlString(ruleVersion)},
      ${sqlString(report.status)},
      ${report.dry_run ? "true" : "false"},
      ${report.expected.source_rows},
      ${report.expected.edition_rows},
      ${report.expected.support_rows},
      ${report.db.ordinary_table_leak_count},
      ${report.db.readback_mismatches.length},
      ${sqlString(reportPath)},
      ${sqlJson(report)}
    )
    on conflict (import_id) do nothing;
  `);
}

function validateForeignKeys(foreignKeys) {
  const allowed = new Set([
    "oxford_vocabulary_edition_items->oxford_vocabulary_source_items",
    "oxford_vocabulary_support_items->oxford_vocabulary_source_items",
    "oxford_vocabulary_support_items->languages",
  ]);
  return foreignKeys.filter((item) => !allowed.has(`${item.child_table}->${item.parent_table}`));
}

async function main() {
  await fs.mkdir(qaDir, { recursive: true });

  const contract = await readJson(contractPath);
  const snapshot = contract.latest_source_snapshot;
  const releaseId = releaseArg || snapshot.release_id;
  const importId = `oxford_vocabulary_db_import_${releaseId}_${timestampId()}`;
  const reportPath = path.join(qaDir, `${releaseId}_db_isolation_import_${todayStamp()}.json`);
  const blockers = [];
  const warnings = [];

  if (releaseId !== snapshot.release_id) {
    blockers.push({ type: "unsupported_release", release_id: releaseId, expected: snapshot.release_id });
  }

  const languageRows = await readJson("config/language-order.json");
  const languageBySpreadsheetCode = new Map(languageRows.map((row) => [row.spreadsheetCode, row]));
  const languageCodes = languageRows.map((row) => row.spreadsheetCode);
  const supportCodes = languageCodes.filter((code) => !["EN", "EN-GB"].includes(code));

  const [
    candidateRows,
    rowReviewRows,
    editionLayerRows,
    sourceManifest,
  ] = await Promise.all([
    readJsonl(snapshot.candidate_pool_path),
    readJsonl(contract.latest_row_review.path),
    readJsonl(contract.latest_edition_layer.path),
    readJson(snapshot.manifest_path),
  ]);

  const pronunciationArtifacts = Object.fromEntries(
    await Promise.all(
      contract.latest_edition_pronunciations.map(async (artifact) => [
        artifact.source_variant,
        {
          artifact,
          rows: await readJsonl(artifact.path),
        },
      ])
    )
  );

  const candidateByRow = keyedBy(candidateRows, "row_id", blockers, { artifact: snapshot.candidate_pool_path });
  const reviewByRow = keyedBy(rowReviewRows, "row_id", blockers, { artifact: contract.latest_row_review.path });
  const layerByRow = keyedBy(editionLayerRows, "row_id", blockers, { artifact: contract.latest_edition_layer.path });
  const pronByVariant = Object.fromEntries(
    Object.entries(pronunciationArtifacts).map(([variant, artifact]) => [
      variant,
      keyedBy(artifact.rows, "row_id", blockers, { artifact: artifact.artifact.path }),
    ])
  );

  if (candidateRows.length !== 150) blockers.push({ type: "candidate_row_count", expected: 150, actual: candidateRows.length });
  if (rowReviewRows.length !== candidateRows.length) {
    blockers.push({ type: "row_review_count", expected: candidateRows.length, actual: rowReviewRows.length });
  }
  if (editionLayerRows.length !== candidateRows.length) {
    blockers.push({ type: "edition_layer_count", expected: candidateRows.length, actual: editionLayerRows.length });
  }

  const sourceRows = [];
  for (const candidate of candidateRows) {
    const rowId = normalizeText(candidate.row_id);
    const review = reviewByRow.get(rowId);
    const layer = layerByRow.get(rowId);
    if (!review) blockers.push({ type: "missing_row_review", row_id: rowId });
    if (!layer) blockers.push({ type: "missing_edition_layer", row_id: rowId });
    if (!review || !layer) continue;

    const canonical = {
      release_id: requiredString(review, "release_id", blockers, { row_id: rowId }),
      course_id: requiredString(review, "course_id", blockers, { row_id: rowId }),
      row_id: rowId,
      core_item_id: requiredString(review, "core_item_id", blockers, { row_id: rowId }),
      meaning_id: requiredString(review, "meaning_id", blockers, { row_id: rowId }),
      source_candidate_id: requiredString(review, "source_candidate_id", blockers, { row_id: rowId }),
      source_language: requiredString(review, "source_language", blockers, { row_id: rowId }),
      source_variant: requiredString(review, "source_variant", blockers, { row_id: rowId }),
      source_headword: requiredString(review, "source_headword", blockers, { row_id: rowId }),
      reviewed_display_headword: requiredString(review, "reviewed_display_headword", blockers, { row_id: rowId }),
      reviewed_part_of_speech: requiredString(review, "reviewed_part_of_speech", blockers, { row_id: rowId }),
      level_min: requiredString(review, "level_min", blockers, { row_id: rowId }),
      level_max: requiredString(review, "level_max", blockers, { row_id: rowId }),
      benchmark_membership: requiredString(review, "benchmark_membership", blockers, { row_id: rowId }),
      source_status: requiredString(candidate, "source_status", blockers, { row_id: rowId }),
      review_status: requiredString(review, "review_status", blockers, { row_id: rowId }),
      learner_value_status: normalizeText(review.learner_value_status),
      meaning_note: requiredString(review, "meaning_note", blockers, { row_id: rowId }),
      semantic_scene: requiredString(review, "semantic_scene", blockers, { row_id: rowId }),
      candidate_row: candidate,
      row_review: review,
      source_snapshot: {
        manifest: sourceManifest,
        edition_layer_status: layer.edition_layer_status,
      },
      source_paths: {
        candidate_pool: snapshot.candidate_pool_path,
        row_review: contract.latest_row_review.path,
        edition_layer: contract.latest_edition_layer.path,
        source_manifest: snapshot.manifest_path,
      },
    };
    if (canonical.release_id !== releaseId) blockers.push({ type: "source_release_mismatch", row_id: rowId, actual: canonical.release_id });
    sourceRows.push({ ...canonical, content_hash: hashRow(canonical) });
  }

  const editionRows = [];
  for (const edition of contract.latest_edition_exports.editions) {
    const editionId = edition.edition_id;
    const isUs = editionId === "us_english";
    const variant = edition.source_variant;
    const pronByRow = pronByVariant[variant];
    if (!pronByRow) {
      blockers.push({ type: "missing_pronunciation_variant", edition_id: editionId, source_variant: variant });
      continue;
    }
    for (const source of sourceRows) {
      const layer = layerByRow.get(source.row_id);
      const pron = pronByRow.get(source.row_id);
      if (!pron) {
        blockers.push({ type: "missing_pronunciation_row", edition_id: editionId, row_id: source.row_id });
        continue;
      }
      const displayField = isUs ? "display_headword_EN_US" : "display_headword_EN_GB";
      const exampleField = isUs ? "example_EN_US" : "example_EN_GB";
      const noteField = isUs ? "edition_note_EN_US" : "edition_note_EN_GB";
      const statusField = isUs ? "edition_status_EN_US" : "edition_status_EN_GB";
      const canonical = {
        release_id: source.release_id,
        row_id: source.row_id,
        edition_id: editionId,
        deck_id: edition.deck_id,
        deck_title: edition.deck_title,
        source_variant: variant,
        primary_language_code: edition.primary_language_code,
        display_headword: requiredString(layer, displayField, blockers, { row_id: source.row_id, edition_id: editionId }),
        example_text: requiredString(layer, exampleField, blockers, { row_id: source.row_id, edition_id: editionId }),
        word_transcription: requiredString(pron, "transcription", blockers, { row_id: source.row_id, edition_id: editionId }),
        example_transcription: requiredString(pron, "example_transcription", blockers, { row_id: source.row_id, edition_id: editionId }),
        pronunciation_status: requiredString(pron, "transcription_status", blockers, { row_id: source.row_id, edition_id: editionId }),
        pronunciation_source: requiredString(pron, "pronunciation_source", blockers, { row_id: source.row_id, edition_id: editionId }),
        edition_note: normalizeText(layer[noteField]),
        edition_status: requiredString(layer, statusField, blockers, { row_id: source.row_id, edition_id: editionId }),
        edition_row: layer,
        pronunciation_row: pron,
        source_paths: {
          edition_layer: contract.latest_edition_layer.path,
          pronunciation: pronunciationArtifacts[variant].artifact.path,
          workbook: edition.path,
        },
      };
      editionRows.push({ ...canonical, content_hash: hashRow(canonical) });
    }
  }

  const supportRows = [];
  const seenSupportKeys = new Set();
  for (const batch of contract.latest_support_translation_batches) {
    const rows = await readJsonl(batch.path);
    if (rows.length !== candidateRows.length) {
      blockers.push({ type: "support_batch_row_count", batch_id: batch.batch_id, expected: candidateRows.length, actual: rows.length });
    }
    for (const row of rows) {
      const rowId = normalizeText(row.row_id);
      if (!candidateByRow.has(rowId)) blockers.push({ type: "unknown_support_row_id", batch_id: batch.batch_id, row_id: rowId });
      for (const code of batch.languages) {
        const language = languageBySpreadsheetCode.get(code);
        if (!language) {
          blockers.push({ type: "unknown_language_code", batch_id: batch.batch_id, spreadsheet_code: code });
          continue;
        }
        const key = `${rowId}::${code}`;
        if (seenSupportKeys.has(key)) blockers.push({ type: "duplicate_support_cell", key, batch_id: batch.batch_id });
        seenSupportKeys.add(key);
        const canonical = {
          release_id: requiredString(row, "release_id", blockers, { row_id: rowId, batch_id: batch.batch_id }),
          row_id: rowId,
          spreadsheet_code: code,
          db_code: language.dbCode,
          language_name: language.language,
          word_translation: requiredString(row, code, blockers, { row_id: rowId, batch_id: batch.batch_id }),
          example_translation: requiredString(row, `example_${code}`, blockers, { row_id: rowId, batch_id: batch.batch_id }),
          translation_status: requiredString(row, "support_translation_status", blockers, { row_id: rowId, batch_id: batch.batch_id }),
          example_status: requiredString(row, "support_example_status", blockers, { row_id: rowId, batch_id: batch.batch_id }),
          source_batch_id: batch.batch_id,
          source_paths: {
            support_translation_batch: batch.path,
            summary: batch.summary_path,
          },
          support_row: row,
        };
        supportRows.push({ ...canonical, content_hash: hashRow(canonical) });
      }
    }
  }

  const missingSupport = [];
  for (const source of sourceRows) {
    for (const code of supportCodes) {
      if (!seenSupportKeys.has(`${source.row_id}::${code}`)) missingSupport.push(`${source.row_id}::${code}`);
    }
  }
  if (missingSupport.length) {
    blockers.push({ type: "missing_support_cells", count: missingSupport.length, sample: missingSupport.slice(0, 10) });
  }

  if (editionRows.length !== sourceRows.length * 2) {
    blockers.push({ type: "edition_row_count", expected: sourceRows.length * 2, actual: editionRows.length });
  }
  if (supportRows.length !== sourceRows.length * supportCodes.length) {
    blockers.push({ type: "support_row_count", expected: sourceRows.length * supportCodes.length, actual: supportRows.length });
  }

  let db = {
    applied_migration: false,
    dry_run: dryRun,
    source: { inserted: 0, updated: 0, unchanged: 0 },
    edition: { inserted: 0, updated: 0, unchanged: 0 },
    support: { inserted: 0, updated: 0, unchanged: 0 },
    readback_mismatches: [],
    ordinary_table_leaks: {},
    ordinary_table_leak_count: 0,
    foreign_keys: [],
    foreign_key_blockers: [],
    stored_counts: {},
  };

  if (!blockers.length && !dryRun) {
    await ensureMigrationApplied();
    db.applied_migration = true;

    const beforeSource = await fetchExisting("oxford_vocabulary_source_items", ["release_id", "row_id"], releaseId);
    const beforeEdition = await fetchExisting("oxford_vocabulary_edition_items", ["release_id", "row_id", "edition_id"], releaseId);
    const beforeSupport = await fetchExisting("oxford_vocabulary_support_items", ["release_id", "row_id", "spreadsheet_code"], releaseId);

    await upsertSourceRows(sourceRows);
    await upsertEditionRows(editionRows);
    await upsertSupportRows(supportRows);

    const afterSource = await fetchExisting("oxford_vocabulary_source_items", ["release_id", "row_id"], releaseId);
    const afterEdition = await fetchExisting("oxford_vocabulary_edition_items", ["release_id", "row_id", "edition_id"], releaseId);
    const afterSupport = await fetchExisting("oxford_vocabulary_support_items", ["release_id", "row_id", "spreadsheet_code"], releaseId);

    const sourceDiff = summarizeDbDiff(sourceRows, beforeSource, afterSource, ["release_id", "row_id"]);
    const editionDiff = summarizeDbDiff(editionRows, beforeEdition, afterEdition, ["release_id", "row_id", "edition_id"]);
    const supportDiff = summarizeDbDiff(supportRows, beforeSupport, afterSupport, ["release_id", "row_id", "spreadsheet_code"]);

    db.source = {
      inserted: sourceDiff.inserted.length,
      updated: sourceDiff.updated.length,
      unchanged: sourceDiff.unchanged.length,
    };
    db.edition = {
      inserted: editionDiff.inserted.length,
      updated: editionDiff.updated.length,
      unchanged: editionDiff.unchanged.length,
    };
    db.support = {
      inserted: supportDiff.inserted.length,
      updated: supportDiff.updated.length,
      unchanged: supportDiff.unchanged.length,
    };
    db.readback_mismatches = [
      ...sourceDiff.readback_mismatches.map((item) => ({ table: "oxford_vocabulary_source_items", ...item })),
      ...editionDiff.readback_mismatches.map((item) => ({ table: "oxford_vocabulary_edition_items", ...item })),
      ...supportDiff.readback_mismatches.map((item) => ({ table: "oxford_vocabulary_support_items", ...item })),
    ];
    db.ordinary_table_leaks = await fetchOrdinaryLeaks();
    db.ordinary_table_leak_count = Object.values(db.ordinary_table_leaks).reduce((sum, count) => sum + Number(count ?? 0), 0);
    db.foreign_keys = await fetchOxfordForeignKeys();
    db.foreign_key_blockers = validateForeignKeys(db.foreign_keys);
    db.stored_counts = await fetchOxfordCounts(releaseId);

    if (db.readback_mismatches.length) blockers.push({ type: "db_readback_mismatch", count: db.readback_mismatches.length });
    if (db.ordinary_table_leak_count) blockers.push({ type: "ordinary_table_leak", leaks: db.ordinary_table_leaks });
    if (db.foreign_key_blockers.length) blockers.push({ type: "forbidden_foreign_keys", foreign_keys: db.foreign_key_blockers });
    if (
      db.stored_counts.source_rows !== sourceRows.length
      || db.stored_counts.edition_rows !== editionRows.length
      || db.stored_counts.support_rows !== supportRows.length
      || db.stored_counts.us_edition_rows !== sourceRows.length
      || db.stored_counts.british_edition_rows !== sourceRows.length
      || db.stored_counts.support_language_count !== supportCodes.length
    ) {
      blockers.push({ type: "stored_count_mismatch", expected: {
        source_rows: sourceRows.length,
        edition_rows: editionRows.length,
        support_rows: supportRows.length,
        per_edition_rows: sourceRows.length,
        support_language_count: supportCodes.length,
      }, actual: db.stored_counts });
    }
  }

  const report = {
    rule_version: ruleVersion,
    generated_at: new Date().toISOString(),
    release_id: releaseId,
    dry_run: dryRun,
    status: blockers.length ? "blocked" : "ok",
    isolation_principle: "Oxford source-package rows are stored only in oxford_vocabulary_* tables; ordinary LunaCards deck-card tables must remain empty for oxford_* rows.",
    expected: {
      source_rows: sourceRows.length,
      edition_rows: editionRows.length,
      support_rows: supportRows.length,
      support_languages: supportCodes.length,
      ordinary_table_leak_count: 0,
    },
    db,
    artifacts: {
      contract: contractPath,
      migration: migrationPath,
      candidate_pool: snapshot.candidate_pool_path,
      row_review: contract.latest_row_review.path,
      edition_layer: contract.latest_edition_layer.path,
      support_batches: contract.latest_support_translation_batches.map((batch) => batch.path),
      edition_pronunciations: contract.latest_edition_pronunciations.map((artifact) => artifact.path),
    },
    blockers,
    warnings,
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!dryRun && db.applied_migration) {
    await insertImportRun({ importId, releaseId, reportPath, report });
  }

  console.log(JSON.stringify({
    status: report.status,
    report: reportPath,
    release_id: releaseId,
    dry_run: dryRun,
    source_rows: sourceRows.length,
    edition_rows: editionRows.length,
    support_rows: supportRows.length,
    ordinary_table_leak_count: db.ordinary_table_leak_count,
    readback_mismatches: db.readback_mismatches.length,
    foreign_key_blockers: db.foreign_key_blockers.length,
    db,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
