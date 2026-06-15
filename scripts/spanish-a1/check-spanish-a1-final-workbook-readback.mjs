#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile } from "@oai/artifact-tool";

import { isSpanishA1Ipa, transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);
const EDITIONS = {
  latin_american_spanish: {
    workbookEdition: "latin_american_spanish",
    primarySpanishVariant: "ES-419",
    omittedMainSheetSourceVariants: ["ES"],
    filenameLabel: "Latin_American_Spanish",
    layout: "buyer_facing_clean_v3_separate_spanish_edition",
  },
  spain_spanish: {
    workbookEdition: "spain_spanish",
    primarySpanishVariant: "ES",
    omittedMainSheetSourceVariants: ["ES-419"],
    filenameLabel: "Spain_Spanish",
    layout: "buyer_facing_clean_v3_separate_spanish_edition",
  },
};
const REQUESTED_EDITION = args.get("edition") ?? "latin_american_spanish";
const EDITION = EDITIONS[REQUESTED_EDITION];
if (!EDITION) throw new Error(`Unsupported Spanish A1 workbook edition: ${REQUESTED_EDITION}`);
const WORKBOOK_EDITION = EDITION.workbookEdition;
const PRIMARY_SPANISH_VARIANT = EDITION.primarySpanishVariant;
const OMITTED_MAIN_SHEET_SOURCE_VARIANTS = EDITION.omittedMainSheetSourceVariants;
const COURSE_METADATA_LIMITS = {
  title: 60,
  description: 110,
  module: 40,
  category: 60,
};
const DISALLOWED_COURSE_METADATA_LABEL_PATTERNS = [
  /Исп\./u,
  /Лат\. Ам\./u,
  /Latin Amer\./u,
  /latinoam\./iu,
  /TBN/u,
  /Hiszp\./u,
  /Šp\./u,
  /Шп\./u,
  /Lat\.-am\./iu,
  /Lat\. Am\./iu,
  /Am\. Latin/u,
  /Am\. Łac\./u,
  /Лат\.-амер\./u,
  /Латын Ам\./u,
  /Lot\. Am\./u,
  /Latın Am\./u,
  /Latin Am\./u,
  /Kihisp\./u,
  /ესპ\./u,
  /Իսպ\./u,
  /ლათ\. ამ\./u,
  /Լատ\. Ամ\./u,
];

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const languageOrderPath = path.resolve(args.get("language-order") ?? "config/language-order.json");
const courseMetadataArg = args.get("course-metadata") ?? null;
const candidatePoolArg = args.get("candidate-pool") ?? null;

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function colName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function editionLanguageOrder(languageOrder) {
  const byCode = new Map(languageOrder.map((language) => [language.spreadsheetCode, language]));
  if (!byCode.has(PRIMARY_SPANISH_VARIANT)) {
    throw new Error(`Missing required Spanish A1 workbook language code: ${PRIMARY_SPANISH_VARIANT}`);
  }
  return [
    byCode.get(PRIMARY_SPANISH_VARIANT),
    ...languageOrder.filter((language) => ![PRIMARY_SPANISH_VARIANT, ...OMITTED_MAIN_SHEET_SOURCE_VARIANTS].includes(language.spreadsheetCode)),
  ];
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${rel(filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

async function inspectTable(workbook, range, rows, cols) {
  return JSON.parse(
    (
      await workbook.inspect({
        kind: "table",
        range,
        include: "values",
        tableMaxRows: rows,
        tableMaxCols: cols,
      })
    ).ndjson
  );
}

async function valuesForHeader(workbook, sheet, headers, header, expectedRows) {
  const index = headers.indexOf(header);
  if (index < 0) throw new Error(`Missing header: ${header}`);
  const table = await inspectTable(
    workbook,
    `${sheet}!${colName(index)}1:${colName(index)}${expectedRows + 1}`,
    expectedRows + 1,
    1
  );
  return (table.values ?? []).map((row) => row[0] ?? "");
}

async function readHeaderRow(workbook, sheet, expectedColumns) {
  const headers = [];
  for (let start = 0; start < expectedColumns; start += 20) {
    const end = Math.min(expectedColumns - 1, start + 19);
    const chunk = await inspectTable(workbook, `${sheet}!${colName(start)}1:${colName(end)}1`, 1, end - start + 1);
    headers.push(...(chunk.values?.[0] ?? []));
  }
  return headers.map(normalizeText);
}

function normalizeMatrix(values, rows, cols) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => normalizeText(values[rowIndex]?.[colIndex]))
  );
}

function validateCourseMetadata(courseMetadata, languageCodes, releaseId) {
  const rows = courseMetadata.rows ?? {};
  const blockers = [];
  if (courseMetadata.release_id !== releaseId) {
    blockers.push(`Course Metadata source release_id ${courseMetadata.release_id} !== ${releaseId}`);
  }
  if (courseMetadata.workbook_edition !== WORKBOOK_EDITION) {
    blockers.push(`Course Metadata source workbook_edition ${courseMetadata.workbook_edition} !== ${WORKBOOK_EDITION}`);
  }
  if (courseMetadata.primary_spanish_variant !== PRIMARY_SPANISH_VARIANT) {
    blockers.push(`Course Metadata source primary_spanish_variant ${courseMetadata.primary_spanish_variant} !== ${PRIMARY_SPANISH_VARIANT}`);
  }
  const expected = new Set(languageCodes);
  const actual = new Set(Object.keys(rows));
  const missing = languageCodes.filter((code) => !actual.has(code));
  if (missing.length) blockers.push(`Course Metadata source missing languages: ${missing.join(", ")}`);

  const requiredFields = [...Object.keys(COURSE_METADATA_LIMITS), "level_signal"];
  const english = rows.EN;
  for (const code of languageCodes) {
    const row = rows[code] ?? {};
    for (const field of requiredFields) {
      if (!normalizeText(row[field])) blockers.push(`Course Metadata source ${code}.${field} is blank`);
    }
    for (const [field, max] of Object.entries(COURSE_METADATA_LIMITS)) {
      const value = normalizeText(row[field]);
      if ([...value].length > max) {
        blockers.push(`Course Metadata source ${code}.${field} length ${[...value].length} > ${max}`);
      }
      if (DISALLOWED_COURSE_METADATA_LABEL_PATTERNS.some((pattern) => pattern.test(value))) {
        blockers.push(`Course Metadata source ${code}.${field} contains cramped edition abbreviation`);
      }
    }
    const description = normalizeText(row.description);
    const levelSignal = normalizeText(row.level_signal);
    if (levelSignal && !description.includes(levelSignal)) {
      blockers.push(`Course Metadata source ${code}.description does not include localized level_signal`);
    }
    const editionMarker = normalizeText(row.edition_marker ?? courseMetadata.variant_label ?? "LatAm");
    for (const field of ["title", "description", "category"]) {
      if (!normalizeText(row[field]).includes(editionMarker)) {
        blockers.push(`Course Metadata source ${code}.${field} missing ${editionMarker} edition marker`);
      }
    }
    if (!["EN", "EN-GB"].includes(code) && english) {
      const sameAsEnglish = ["title", "description", "module", "category"].every(
        (field) => normalizeText(row[field]) === normalizeText(english[field])
      );
      if (sameAsEnglish) blockers.push(`Course Metadata source ${code} is English fallback`);
    }
  }
  return { rows, blockers };
}

function isUsefulArticle(value) {
  const article = normalizeText(value);
  return article && article !== "not_applicable";
}

function sourceLearnerDisplay(row, code) {
  const display = normalizeText(code === "ES-419" ? row.display_ES_419 : row.display_ES);
  const article = normalizeText(code === "ES-419" ? row.article_ES_419 : row.article_ES);
  if (normalizeText(row.part_of_speech) !== "noun" || !isUsefulArticle(article)) return display;
  if (display.toLowerCase().startsWith(`${article.toLowerCase()} `)) return display;
  return `${article} ${display}`;
}

function expectedCourseMetadataMatrix(courseMetadataRows, languageCodes) {
  return [
    ["", ...languageCodes],
    ["Title", ...languageCodes.map((code) => normalizeText(courseMetadataRows[code]?.title))],
    ["Description", ...languageCodes.map((code) => normalizeText(courseMetadataRows[code]?.description))],
    ["Module", ...languageCodes.map((code) => normalizeText(courseMetadataRows[code]?.module))],
    ["Category", ...languageCodes.map((code) => normalizeText(courseMetadataRows[code]?.category))],
  ];
}

function compareMatrices(expected, actual, maxErrors = 50) {
  const mismatches = [];
  for (let row = 0; row < expected.length; row += 1) {
    for (let col = 0; col < expected[row].length; col += 1) {
      if (expected[row][col] !== actual[row]?.[col]) {
        mismatches.push({
          row: row + 1,
          col: colName(col),
          expected: expected[row][col],
          actual: actual[row]?.[col] ?? "",
        });
        if (mismatches.length >= maxErrors) return mismatches;
      }
    }
  }
  return mismatches;
}

async function main() {
  const [contract, languageOrder] = await Promise.all([
    readJson(contractPath),
    readJson(languageOrderPath),
  ]);
  const releaseId = args.get("release") ?? contract.default_release.release_id;
  const candidatePoolPath = path.resolve(
    candidatePoolArg ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
  );
  const candidateRows = await readJsonl(candidatePoolPath);
  const workbookPath = path.resolve(
    args.get("workbook") ??
      `outputs/spanish-a1-core/final/FlashcardsLuna_Spanish_A1_Core_Part_${String(contract.release_part?.part_number ?? 1).padStart(3, "0")}_${EDITION.filenameLabel}.xlsx`
  );
  const manifestPath = path.resolve(args.get("manifest") ?? workbookPath.replace(/\.xlsx$/iu, "_manifest.json"));
  const reportStamp = args.get("date") ?? todayStamp();
  const reportJsonPath = path.resolve(
    args.get("report-json") ??
      `outputs/spanish-a1-core/qa/${releaseId}_final_workbook_readback_${reportStamp}.json`
  );
  const reportMdPath = reportJsonPath.replace(/\.json$/iu, ".md");

  const [manifest, workbookBytes] = await Promise.all([readJson(manifestPath), fs.readFile(workbookPath)]);
  const courseMetadataPath = path.resolve(
    courseMetadataArg ??
      manifest.course_metadata_source ??
      contract.latest_final_workbooks?.[WORKBOOK_EDITION]?.course_metadata_source ??
      "config/spanish-a1-core-course-metadata.json"
  );
  const courseMetadataSource = await readJson(courseMetadataPath);
  const workbookSha256 = createHash("sha256").update(workbookBytes).digest("hex");
  const workbook = await SpreadsheetFile.importXlsx(workbookBytes);
  const sheet = contract.workbook.main_sheet_name;
  const expectedRows = Number(contract.default_release.expected_row_count);
  const workbookLanguageOrder = editionLanguageOrder(languageOrder);
  const languageCodes = workbookLanguageOrder.map((language) => language.spreadsheetCode);
  const supportCodes = languageCodes.filter((code) => code !== PRIMARY_SPANISH_VARIANT);
  const { rows: courseMetadataRows, blockers: courseMetadataSourceBlockers } = validateCourseMetadata(
    courseMetadataSource,
    languageCodes,
    releaseId
  );
  const expectedTranscriptionHeaders = [`${PRIMARY_SPANISH_VARIANT} transcription`, `${PRIMARY_SPANISH_VARIANT} example transcription`];
  const expectedColumns = languageCodes.length * 2 + expectedTranscriptionHeaders.length;
  const headers = await readHeaderRow(workbook, sheet, expectedColumns);
  const firstLanguageValues = await valuesForHeader(workbook, sheet, headers, languageCodes[0], expectedRows);

  const filledCounts = {};
  for (const code of languageCodes) {
    const displayValues = (await valuesForHeader(workbook, sheet, headers, code, expectedRows)).slice(1);
    const exampleValues = (await valuesForHeader(workbook, sheet, headers, `${code} example`, expectedRows)).slice(1);
    filledCounts[code] = {
      display: displayValues.filter((value) => normalizeText(value)).length,
      example: exampleValues.filter((value) => normalizeText(value)).length,
    };
  }

  const metadataRows = Object.fromEntries(
    ((await inspectTable(workbook, "Deck Metadata!A1:C30", 30, 3)).values ?? [])
      .slice(1)
      .map((row) => [normalizeText(row[0]), normalizeText(row[1])])
  );
  const courseMetadataValues =
    (await inspectTable(workbook, `Course Metadata!A1:${colName(languageCodes.length)}5`, 5, languageCodes.length + 1)).values ?? [];
  const expectedCourseMetadata = expectedCourseMetadataMatrix(courseMetadataRows, languageCodes);
  const actualCourseMetadata = normalizeMatrix(courseMetadataValues, 5, languageCodes.length + 1);
  const courseMetadataMismatches = compareMatrices(expectedCourseMetadata, actualCourseMetadata);
  const translationQaRows = Object.fromEntries(
    ((await inspectTable(workbook, "Translation QA!A1:B12", 12, 2)).values ?? [])
      .slice(1)
      .map((row) => [normalizeText(row[0]), normalizeText(row[1])])
  );
  const supportBatchRows = (await inspectTable(workbook, "Support Batches!A1:B60", 60, 2)).values ?? [];
  const supportBatchEntries = supportBatchRows
    .slice(1)
    .filter((row) => normalizeText(row[0]));
  const cardMetadataHeader =
    (await inspectTable(workbook, "Card Metadata!A1:AG1", 1, 33)).values?.[0]?.map(normalizeText) ?? [];
  const cardMetadataMainRows =
    (await inspectTable(workbook, `Card Metadata!A1:A${expectedRows + 1}`, expectedRows + 1, 1)).values ?? [];

  const blockers = [];
  const mainRows = firstLanguageValues.slice(1).filter((value) => normalizeText(value)).length;
  if (mainRows !== expectedRows) blockers.push(`main_rows ${mainRows} !== ${expectedRows}`);
  if (headers.length !== expectedColumns) blockers.push(`main_cols ${headers.length} !== ${expectedColumns}`);
  const expectedHeaders = [...languageCodes, ...languageCodes.map((code) => `${code} example`), ...expectedTranscriptionHeaders];
  if (headers.join("\u0000") !== expectedHeaders.join("\u0000")) {
    blockers.push("main sheet headers do not match buyer-facing language/example contract");
  }
  if (workbookSha256 !== manifest.workbook_sha256) blockers.push("workbook sha256 does not match manifest");
  if (manifest.release_id !== releaseId) blockers.push(`manifest release_id ${manifest.release_id} !== ${releaseId}`);
  if (Number(manifest.rows ?? 0) !== expectedRows) blockers.push(`manifest rows ${manifest.rows} !== ${expectedRows}`);
  if (Number(manifest.language_columns ?? 0) !== languageCodes.length) {
    blockers.push(`manifest language_columns ${manifest.language_columns} !== ${languageCodes.length}`);
  }
  if (Array.isArray(manifest.language_column_order) && manifest.language_column_order.join("\u0000") !== languageCodes.join("\u0000")) {
    blockers.push(`manifest language_column_order does not match ${WORKBOOK_EDITION} workbook order`);
  }
  if (manifest.workbook_edition !== WORKBOOK_EDITION) blockers.push(`manifest workbook_edition ${manifest.workbook_edition} !== ${WORKBOOK_EDITION}`);
  if (manifest.primary_spanish_variant !== PRIMARY_SPANISH_VARIANT) {
    blockers.push(`manifest primary_spanish_variant ${manifest.primary_spanish_variant} !== ${PRIMARY_SPANISH_VARIANT}`);
  }
  if (Number(manifest.support_language_batches ?? 0) !== supportCodes.length) {
    blockers.push(`manifest support_language_batches ${manifest.support_language_batches} !== ${supportCodes.length}`);
  }
  if (Number(manifest.support_rows ?? 0) !== expectedRows * supportCodes.length) {
    blockers.push(`manifest support_rows ${manifest.support_rows} !== ${expectedRows * supportCodes.length}`);
  }
  if (Number(manifest.main_sheet_columns ?? 0) !== expectedColumns) {
    blockers.push(`manifest main_sheet_columns ${manifest.main_sheet_columns} !== ${expectedColumns}`);
  }
  if (manifest.workbook_layout !== EDITION.layout) blockers.push(`manifest workbook_layout is not ${EDITION.layout}`);
  if ((manifest.primary_spanish_transcription_columns ?? []).join("\u0000") !== expectedTranscriptionHeaders.join("\u0000")) {
    blockers.push("manifest primary_spanish_transcription_columns do not match expected headers");
  }
  if (manifest.primary_spanish_example_transcription_in_main_sheet !== true) {
    blockers.push("manifest primary_spanish_example_transcription_in_main_sheet flag is not true");
  }
  if (manifest.spanish_noun_articles_in_main_sheet !== true) {
    blockers.push("manifest spanish_noun_articles_in_main_sheet flag is not true");
  }
  if (metadataRows["final_workbook"] !== "true") blockers.push("Deck Metadata final_workbook flag is not true");
  if (metadataRows["source_field_location"] !== "Card Metadata") {
    blockers.push("Deck Metadata source_field_location is not Card Metadata");
  }
  if (manifest.course_metadata_source !== rel(courseMetadataPath)) {
    blockers.push(`manifest course_metadata_source ${manifest.course_metadata_source} !== ${rel(courseMetadataPath)}`);
  }
  if (manifest.course_metadata_localized !== true) {
    blockers.push("manifest course_metadata_localized flag is not true");
  }
  blockers.push(...courseMetadataSourceBlockers);
  if (courseMetadataValues.length !== 5 || (courseMetadataValues[0] ?? []).length !== languageCodes.length + 1) {
    blockers.push("Course Metadata is not in 54-language polyglot shape");
  }
  if (courseMetadataMismatches.length) {
    blockers.push(`Course Metadata differs from localized source in ${courseMetadataMismatches.length} reported cell(s)`);
  }
  if (cardMetadataHeader.length !== 33 || cardMetadataHeader[0] !== "main_sheet_row") {
    blockers.push("Card Metadata header does not match expected source-field contract");
  }
  const cardMetadataRows = cardMetadataMainRows.slice(1).filter((row) => normalizeText(row[0])).length;
  if (cardMetadataRows !== expectedRows) {
    blockers.push(`Card Metadata rows ${cardMetadataRows} !== ${expectedRows}`);
  }
  if (translationQaRows["Support languages generated"] !== "true") {
    blockers.push("Translation QA support languages generated flag is not true");
  }
  if (Number(translationQaRows["Support language batches"] ?? 0) !== supportCodes.length) {
    blockers.push(`Translation QA support language batches ${translationQaRows["Support language batches"]} !== ${supportCodes.length}`);
  }
  if (supportBatchEntries.length !== supportCodes.length) {
    blockers.push(`Support Batches sheet has ${supportBatchEntries.length} entries, expected ${supportCodes.length}`);
  }

  for (const code of languageCodes) {
    const counts = filledCounts[code];
    if (!counts) {
      blockers.push(`missing counts for ${code}`);
      continue;
    }
    if (counts.display !== expectedRows) blockers.push(`${code} display filled ${counts.display} !== ${expectedRows}`);
    if (counts.example !== expectedRows) blockers.push(`${code} example filled ${counts.example} !== ${expectedRows}`);
  }
  const selectedRows = candidateRows
    .filter((row) => normalizeText(row.selection_decision ?? row.qa_status) === "selected")
    .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
  const primaryDisplayValues = (await valuesForHeader(workbook, sheet, headers, PRIMARY_SPANISH_VARIANT, expectedRows)).slice(1);
  const primaryTranscriptionValues = (await valuesForHeader(workbook, sheet, headers, `${PRIMARY_SPANISH_VARIANT} transcription`, expectedRows)).slice(1);
  const primaryExampleValues = (await valuesForHeader(workbook, sheet, headers, `${PRIMARY_SPANISH_VARIANT} example`, expectedRows)).slice(1);
  const primaryExampleTranscriptionValues = (await valuesForHeader(workbook, sheet, headers, `${PRIMARY_SPANISH_VARIANT} example transcription`, expectedRows)).slice(1);
  for (const [index, row] of selectedRows.entries()) {
    if (normalizeText(row.part_of_speech) !== "noun") continue;
    const articleEs419 = normalizeText(PRIMARY_SPANISH_VARIANT === "ES-419" ? row.article_ES_419 : row.article_ES);
    if (
      articleEs419 &&
      articleEs419 !== "not_applicable" &&
      normalizeText(primaryDisplayValues[index]) !== normalizeText(sourceLearnerDisplay(row, PRIMARY_SPANISH_VARIANT))
    ) {
      blockers.push(`${PRIMARY_SPANISH_VARIANT} noun row ${index + 2} learner display does not match article-aware source display`);
      break;
    }
  }
  for (const [index, row] of selectedRows.entries()) {
    const expectedTranscription = normalizeText(
      transcribeSpanishText(sourceLearnerDisplay(row, PRIMARY_SPANISH_VARIANT), PRIMARY_SPANISH_VARIANT)
    );
    const expectedExampleTranscription = normalizeText(
      transcribeSpanishText(PRIMARY_SPANISH_VARIANT === "ES-419" ? row.example_ES_419 : row.example_ES, PRIMARY_SPANISH_VARIANT)
    );
    if (normalizeText(primaryTranscriptionValues[index]) !== expectedTranscription) {
      blockers.push(`${PRIMARY_SPANISH_VARIANT} transcription row ${index + 2} does not match broad learner IPA source transcription`);
      break;
    }
    if (normalizeText(primaryExampleTranscriptionValues[index]) !== expectedExampleTranscription) {
      blockers.push(`${PRIMARY_SPANISH_VARIANT} example transcription row ${index + 2} does not match broad learner IPA source example transcription`);
      break;
    }
    if (!isSpanishA1Ipa(primaryTranscriptionValues[index]) || !isSpanishA1Ipa(primaryExampleTranscriptionValues[index])) {
      blockers.push(`${PRIMARY_SPANISH_VARIANT} transcription row ${index + 2} is not slash-wrapped broad learner IPA`);
      break;
    }
    if (!normalizeText(primaryExampleValues[index])) {
      blockers.push(`${PRIMARY_SPANISH_VARIANT} example row ${index + 2} is blank`);
      break;
    }
  }

  const summary = {
    release_id: releaseId,
    status: blockers.length ? "blocked" : "pass",
    workbook: rel(workbookPath),
    manifest: rel(manifestPath),
    workbook_sha256: workbookSha256,
    main_rows: mainRows,
    main_cols: headers.length,
    language_columns: languageCodes.length,
    main_sheet_columns: headers.length,
    workbook_edition: WORKBOOK_EDITION,
    primary_spanish_variant: PRIMARY_SPANISH_VARIANT,
    primary_spanish_transcription_columns: expectedTranscriptionHeaders,
    support_language_batches: supportCodes.length,
    support_rows: expectedRows * supportCodes.length,
    course_metadata_compared_cells: expectedCourseMetadata.length * expectedCourseMetadata[0].length,
    blockers: blockers.length,
    checked_at: new Date().toISOString(),
  };
  const report = {
    summary,
    blockers,
    filled_counts: filledCounts,
    workbook_metadata: {
      course_metadata_rows: courseMetadataValues.length,
      course_metadata_source: rel(courseMetadataPath),
      course_metadata_source_version: courseMetadataSource.version ?? null,
      course_metadata_mismatches: courseMetadataMismatches,
      card_metadata_rows: cardMetadataRows,
      deck_metadata: metadataRows,
      translation_qa: translationQaRows,
    },
  };

  await fs.mkdir(path.dirname(reportJsonPath), { recursive: true });
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(
    reportMdPath,
    [
      `# Spanish A1 Final Workbook Readback - ${releaseId}`,
      "",
      `- Status: ${summary.status}`,
      `- Workbook: \`${summary.workbook}\``,
      `- Rows: ${summary.main_rows}/${expectedRows}`,
      `- Columns: ${summary.main_cols}/${expectedColumns}`,
      `- Languages: ${summary.language_columns}`,
      `- Support batches: ${summary.support_language_batches}`,
      `- Support rows: ${summary.support_rows}`,
      `- Blockers: ${summary.blockers}`,
      "",
      blockers.length ? "## Blockers" : "## Blockers",
      "",
      ...(blockers.length ? blockers.map((blocker) => `- ${blocker}`) : ["None."]),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(JSON.stringify({ ...summary, report_json: rel(reportJsonPath), report_md: rel(reportMdPath) }, null, 2));
  if (blockers.length) process.exitCode = 1;
}

await main();
