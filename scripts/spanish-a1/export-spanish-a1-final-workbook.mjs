#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

import { transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

let RELEASE_ID = args.get("release") ?? null;
const CONTRACT_PATH = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const LANGUAGE_ORDER_PATH = path.join(ROOT, "config/language-order.json");
const COURSE_METADATA_PATH = path.resolve(args.get("course-metadata") ?? "config/spanish-a1-core-course-metadata.json");
const SUPPORT_DIR = path.join(ROOT, "outputs/spanish-a1-core/support-translations");
const OUTPUT_DIR = path.join(ROOT, "outputs/spanish-a1-core/final");
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
const EDITIONS = {
  latin_american_spanish: {
    workbookEdition: "latin_american_spanish",
    primarySpanishVariant: "ES-419",
    omittedMainSheetSourceVariants: ["ES"],
    filenameLabel: "Latin_American_Spanish",
    titleLabel: "Latin American Spanish",
    languageOrderPolicy: "latin_american_spanish_edition",
    languageOrderDescription:
      "latin_american_spanish_edition: ES-419 first, ES omitted from buyer-facing main sheet, then remaining non-Spanish support languages from config/language-order.json",
    articlePolicy: "ES-419 noun cells include learner-facing el/la articles.",
  },
  spain_spanish: {
    workbookEdition: "spain_spanish",
    primarySpanishVariant: "ES",
    omittedMainSheetSourceVariants: ["ES-419"],
    filenameLabel: "Spain_Spanish",
    titleLabel: "Spanish (Spain)",
    languageOrderPolicy: "spain_spanish_edition",
    languageOrderDescription:
      "spain_spanish_edition: ES first, ES-419 omitted from buyer-facing main sheet, then remaining non-Spanish support languages from config/language-order.json",
    articlePolicy: "ES noun cells include learner-facing el/la articles.",
  },
};
const REQUESTED_EDITION = args.get("edition") ?? "latin_american_spanish";
const EDITION = EDITIONS[REQUESTED_EDITION];
if (!EDITION) {
  throw new Error(`Unsupported Spanish A1 workbook edition: ${REQUESTED_EDITION}`);
}
const WORKBOOK_EDITION = EDITION.workbookEdition;
const PRIMARY_SPANISH_VARIANT = EDITION.primarySpanishVariant;
const OMITTED_MAIN_SHEET_SOURCE_VARIANTS = EDITION.omittedMainSheetSourceVariants;
let CANDIDATE_POOL_PATH;
let WORKBOOK_PATH;
let MANIFEST_PATH;

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
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

function rangeFor(row, col, rows, cols) {
  const start = `${colName(col)}${row}`;
  const end = `${colName(col + cols - 1)}${row + rows - 1}`;
  return `${start}:${end}`;
}

function setValues(sheet, startRow, startCol, values) {
  if (!values.length) return;
  const width = Math.max(...values.map((row) => row.length));
  const padded = values.map((row) => [...row, ...Array(width - row.length).fill("")]);
  sheet.getRange(rangeFor(startRow, startCol, padded.length, width)).values = padded;
}

function addSheet(workbook, name, rows) {
  const sheet = workbook.worksheets.add(name);
  setValues(sheet, 1, 0, rows);
  return sheet;
}

function styleSimpleTable(sheet, rows, cols, options = {}) {
  const usedRange = sheet.getRange(rangeFor(1, 0, rows, cols));
  usedRange.format.wrapText = true;
  usedRange.format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  usedRange.format.rowHeightPx = options.rowHeightPx ?? 34;

  const headerRange = sheet.getRange(rangeFor(1, 0, 1, cols));
  headerRange.format.font = { bold: true, color: "#111827" };
  headerRange.format.fill = "#F3F4F6";

  const labelRange = sheet.getRange(rangeFor(1, 0, rows, 1));
  labelRange.format.font = { bold: true, color: "#111827" };
  labelRange.format.fill = "#F8FAFC";

  sheet.getRangeByIndexes(0, 0, rows, 1).format.columnWidthPx = options.firstColumnWidthPx ?? 170;
  for (let col = 1; col < cols; col += 1) {
    sheet.getRangeByIndexes(0, col, rows, 1).format.columnWidthPx = options.defaultColumnWidthPx ?? 240;
  }
  sheet.freezePanes.freezeRows(1);
  sheet.freezePanes.freezeColumns(1);
}

function asSheetRows(records, headers) {
  return [headers, ...records.map((record) => headers.map((header) => record[header] ?? ""))];
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
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

function isSelected(row) {
  return normalizeText(row.selection_decision ?? row.qa_status) === "selected";
}

function supportFilePath(languageCode) {
  return path.join(SUPPORT_DIR, `${RELEASE_ID}_support_translation_batch_${codeSlug(languageCode)}_v1.jsonl`);
}

function supportValue(row, keys) {
  for (const key of keys) {
    const value = normalizeText(row[key]);
    if (value) return value;
  }
  return "";
}

function validateCourseMetadata(courseMetadata, languageCodes) {
  if (courseMetadata.release_id !== RELEASE_ID) {
    throw new Error(`Course metadata release_id ${courseMetadata.release_id} !== ${RELEASE_ID}`);
  }
  if (courseMetadata.workbook_edition !== WORKBOOK_EDITION) {
    throw new Error(`Course metadata workbook_edition ${courseMetadata.workbook_edition} !== ${WORKBOOK_EDITION}`);
  }
  if (courseMetadata.primary_spanish_variant !== PRIMARY_SPANISH_VARIANT) {
    throw new Error(`Course metadata primary_spanish_variant ${courseMetadata.primary_spanish_variant} !== ${PRIMARY_SPANISH_VARIANT}`);
  }
  const rows = courseMetadata.rows ?? {};
  const actual = new Set(Object.keys(rows));
  const missing = languageCodes.filter((code) => !actual.has(code));
  if (missing.length) {
    throw new Error(`Course metadata language coverage mismatch missing=${missing.join(",")}`);
  }

  const requiredFields = [...Object.keys(COURSE_METADATA_LIMITS), "level_signal"];
  const english = rows.EN;
  const violations = [];
  for (const code of languageCodes) {
    const row = rows[code] ?? {};
    for (const field of requiredFields) {
      if (!normalizeText(row[field])) violations.push(`${code}.${field} blank`);
    }
    for (const [field, max] of Object.entries(COURSE_METADATA_LIMITS)) {
      const value = normalizeText(row[field]);
      if ([...value].length > max) violations.push(`${code}.${field} length ${[...value].length} > ${max}`);
      if (DISALLOWED_COURSE_METADATA_LABEL_PATTERNS.some((pattern) => pattern.test(value))) {
        violations.push(`${code}.${field} contains cramped edition abbreviation`);
      }
    }
    const description = normalizeText(row.description);
    const levelSignal = normalizeText(row.level_signal);
    if (levelSignal && !description.includes(levelSignal)) {
      violations.push(`${code}.description does not contain localized level_signal`);
    }
    const editionMarker = normalizeText(row.edition_marker ?? courseMetadata.variant_label ?? "LatAm");
    for (const field of ["title", "description", "category"]) {
      if (!normalizeText(row[field]).includes(editionMarker)) {
        violations.push(`${code}.${field} missing ${editionMarker} edition marker`);
      }
    }
    if (!["EN", "EN-GB"].includes(code) && english) {
      const sameAsEnglish = ["title", "description", "module", "category"].every(
        (field) => normalizeText(row[field]) === normalizeText(english[field])
      );
      if (sameAsEnglish) violations.push(`${code} Course Metadata is English fallback`);
    }
  }
  if (violations.length) {
    throw new Error(`Course metadata validation failed: ${violations.slice(0, 20).join("; ")}`);
  }
  return rows;
}

async function readSupportMap(sourceRows, supportLanguages) {
  const sourceRowIds = sourceRows.map((row) => row.row_id);
  const map = new Map();
  const files = [];
  for (const language of supportLanguages) {
    const filePath = supportFilePath(language.spreadsheetCode);
    const rows = await readJsonl(filePath);
    files.push(filePath);
    if (rows.length !== sourceRows.length) {
      throw new Error(`${rel(filePath)} has ${rows.length} rows, expected ${sourceRows.length}`);
    }
    for (const [index, row] of rows.entries()) {
      const rowId = normalizeText(row.row_id);
      if (rowId !== sourceRowIds[index]) {
        throw new Error(`${rel(filePath)} row ${index + 1} row_id=${rowId}, expected ${sourceRowIds[index]}`);
      }
      const code = supportValue(row, ["language_code", "spreadsheet_code"]);
      if (code !== language.spreadsheetCode) {
        throw new Error(`${rel(filePath)} row ${index + 1} language=${code}, expected ${language.spreadsheetCode}`);
      }
      const display = supportValue(row, ["display_translation", "display"]);
      const example = supportValue(row, ["example_translation", "example"]);
      if (!display || !example) {
        throw new Error(`${rel(filePath)} row ${index + 1} has blank display/example`);
      }
      map.set(`${rowId}:${language.spreadsheetCode}`, { display, example });
    }
  }
  return { map, files };
}

const [contract, languageOrder, courseMetadata] = await Promise.all([
  readJson(CONTRACT_PATH),
  readJson(LANGUAGE_ORDER_PATH),
  readJson(COURSE_METADATA_PATH),
]);

if (!String(contract.contract_id ?? "").startsWith("spanish_a1_core_release_contract_v1")) {
  throw new Error(`Unexpected contract_id: ${contract.contract_id}`);
}
RELEASE_ID = RELEASE_ID ?? contract.default_release.release_id;
CANDIDATE_POOL_PATH = path.resolve(
  args.get("candidate-pool") ??
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools", `${RELEASE_ID}_candidate_pool.jsonl`)
);
const partLabel = String(contract.release_part?.part_number ?? 1).padStart(3, "0");
WORKBOOK_PATH = path.resolve(
  args.get("workbook") ?? path.join(OUTPUT_DIR, `FlashcardsLuna_Spanish_A1_Core_Part_${partLabel}_${EDITION.filenameLabel}.xlsx`)
);
MANIFEST_PATH = path.resolve(args.get("manifest") ?? WORKBOOK_PATH.replace(/\.xlsx$/iu, "_manifest.json"));

const candidateRows = await readJsonl(CANDIDATE_POOL_PATH);
if (contract.default_release?.release_id !== RELEASE_ID) {
  throw new Error(`Unexpected release id in contract: ${contract.default_release?.release_id} !== ${RELEASE_ID}`);
}

const rows = candidateRows.filter(isSelected).sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
if (rows.length !== Number(contract.default_release.expected_row_count)) {
  throw new Error(`Expected ${contract.default_release.expected_row_count} selected rows, got ${rows.length}`);
}

const workbookLanguageOrder = editionLanguageOrder(languageOrder);
const languageCodes = workbookLanguageOrder.map((language) => language.spreadsheetCode);
const supportLanguages = workbookLanguageOrder.filter((language) => language.spreadsheetCode !== PRIMARY_SPANISH_VARIANT);
const { map: supportMap, files: supportFiles } = await readSupportMap(rows, supportLanguages);

const fixedColumns = contract.row_identity.required_source_fields;
const translationColumns = languageCodes;
const exampleColumns = languageCodes.map((code) => `${code} example`);
const primaryTranscriptionColumns = [`${PRIMARY_SPANISH_VARIANT} transcription`, `${PRIMARY_SPANISH_VARIANT} example transcription`];
const headers = [...translationColumns, ...exampleColumns, ...primaryTranscriptionColumns];
const courseMetadataRows = validateCourseMetadata(courseMetadata, languageCodes);

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

function displayFor(row, code) {
  if (code === "ES") return sourceLearnerDisplay(row, "ES");
  if (code === "ES-419") return sourceLearnerDisplay(row, "ES-419");
  return supportMap.get(`${row.row_id}:${code}`)?.display ?? "";
}

function exampleFor(row, code) {
  if (code === "ES") return row.example_ES;
  if (code === "ES-419") return row.example_ES_419;
  return supportMap.get(`${row.row_id}:${code}`)?.example ?? "";
}

function transcriptionFor(row, code) {
  if (code === "ES") return transcribeSpanishText(sourceLearnerDisplay(row, "ES"), "ES");
  if (code === "ES-419") return transcribeSpanishText(sourceLearnerDisplay(row, "ES-419"), "ES-419");
  return "";
}

function exampleTranscriptionFor(row, code) {
  if (code === "ES") return transcribeSpanishText(row.example_ES, "ES");
  if (code === "ES-419") return transcribeSpanishText(row.example_ES_419, "ES-419");
  return "";
}

const mainRows = rows.map((row) => [
  ...translationColumns.map((code) => displayFor(row, code)),
  ...translationColumns.map((code) => exampleFor(row, code)),
  transcriptionFor(row, PRIMARY_SPANISH_VARIANT),
  exampleTranscriptionFor(row, PRIMARY_SPANISH_VARIANT),
]);

const workbook = Workbook.create();
const mainSheetName = contract.workbook.main_sheet_name;
addSheet(workbook, mainSheetName, [headers, ...mainRows]);

const metadataCodes = languageCodes;
const courseMetadataSheet = addSheet(workbook, "Course Metadata", [
  ["", ...metadataCodes],
  ["Title", ...metadataCodes.map((code) => courseMetadataRows[code].title)],
  ["Description", ...metadataCodes.map((code) => courseMetadataRows[code].description)],
  ["Module", ...metadataCodes.map((code) => courseMetadataRows[code].module)],
  ["Category", ...metadataCodes.map((code) => courseMetadataRows[code].category)],
]);
styleSimpleTable(courseMetadataSheet, 5, metadataCodes.length + 1, {
  firstColumnWidthPx: 160,
  defaultColumnWidthPx: 260,
  rowHeightPx: 40,
});

const deckMetadataSheet = addSheet(workbook, "Deck Metadata", [
  ["field", "value", "notes"],
  ["course_id", contract.default_release.course_id, "Stable internal course id."],
  ["release_id", RELEASE_ID, "Stable release id."],
  ["content_type", "vocabulary", "Course vocabulary release."],
  ["course", contract.course.product_safe_working_title, "Product-safe working title."],
  ["workbook_edition", WORKBOOK_EDITION, "Buyer-facing edition."],
  ["edition_label", EDITION.titleLabel, "Reader-facing Spanish edition label."],
  ["title_en", courseMetadataRows.EN.title, "English Course Metadata title."],
  ["description_en", courseMetadataRows.EN.description, "English Course Metadata description."],
  ["module_en", courseMetadataRows.EN.module, "English module label."],
  ["category_en", courseMetadataRows.EN.category, "English category label."],
  ["title_ru", courseMetadataRows.RU.title, "Russian Course Metadata title for quick review."],
  ["description_ru", courseMetadataRows.RU.description, "Russian Course Metadata description for quick review."],
  ["module_ru", courseMetadataRows.RU.module, "Russian module label for quick review."],
  ["category_ru", courseMetadataRows.RU.category, "Russian category label for quick review."],
  ["primary_spanish_variant", PRIMARY_SPANISH_VARIANT, "Only this Spanish source variant is shown in the main sheet."],
  ["omitted_main_sheet_source_variants", OMITTED_MAIN_SHEET_SOURCE_VARIANTS.join(", "), "Kept in Card Metadata/source data, not shown as buyer-facing columns."],
  ["source_language", contract.course.source_language_code, "Primary source language."],
  ["source_variant", contract.course.source_variant, "Primary source variant."],
  ["regional_variant", `${contract.course.regional_variant_code} ${contract.course.regional_variant_label}`, "Regional Spanish variant layer."],
  ["cefr_level", contract.default_release.cefr_level, "Target CEFR level."],
  ["actual_item_count", String(rows.length), "Rows in the main card sheet."],
  ["language_variant_count", String(languageCodes.length), "Active LunaCards language variants in this export."],
  ["support_language_rows", String(rows.length * supportLanguages.length), "Rows generated for non-source support languages."],
  ["main_sheet", mainSheetName, "User-facing card sheet."],
  ["column_contract", "translations -> examples -> primary Spanish transcription -> primary Spanish example transcription", "Support-language transcriptions are not included in this v1 course release."],
  ["source_field_location", "Card Metadata", "Technical source fields are kept out of the user-facing main sheet."],
  ["spanish_article_policy", EDITION.articlePolicy, "source_lemma remains article-free in Card Metadata."],
  ["primary_spanish_transcription_policy", "spanish_a1_broad_learner_ipa_v1", "Course-specific broad learner IPA for the displayed Spanish edition."],
  ["final_workbook", "true", "Workbook exported as final delivery artifact."],
  ["ordinary_deck_sort", "not_applicable", "This course release is outside ordinary Deck Master Plan sort order."],
  ["ordinary_postgres_import", "disabled", "Do not import to ordinary deck tables without explicit approval."],
  ["isolated_postgres_storage", "spanish_a1_*", "Dedicated Spanish A1 tables only."],
]);
styleSimpleTable(deckMetadataSheet, 33, 3, {
  firstColumnWidthPx: 380,
  defaultColumnWidthPx: 560,
  rowHeightPx: 40,
});

addSheet(
  workbook,
  "Card Metadata",
  [
    [
      "main_sheet_row",
      "selection_order",
      ...fixedColumns,
      "learner_display_ES",
      "learner_display_ES_419",
      "selection_decision",
    ],
    ...rows.map((row, index) => [
      String(index + 2),
      row.selection_order ?? "",
      ...fixedColumns.map((column) => row[column] ?? ""),
      sourceLearnerDisplay(row, "ES"),
      sourceLearnerDisplay(row, "ES-419"),
      row.selection_decision ?? "",
    ]),
  ]
);

const readmeSheet = addSheet(workbook, "README", [
  ["Field", "Value"],
  ["Workbook type", "Spanish A1 final workbook"],
  ["Workbook edition", EDITION.titleLabel],
  ["Final workbook", "true"],
  ["Google Sheet delivery", "tracked in delivery manifest and Google readback report"],
  ["Postgres import", "isolated spanish_a1_* tables only after final readback"],
  ["Support-language status", "All non-source support language display/example cells generated."],
  ["Benchmark posture", "PCIC/DELE/SIELE are benchmark-only and are not copied as row source data."],
  ["Primary Spanish transcription", "Course-specific broad learner IPA for the studied Spanish edition."],
  ["Support-language transcription", contract.field_rules.support_language_transcription],
]);
styleSimpleTable(readmeSheet, 10, 2, {
  firstColumnWidthPx: 260,
  defaultColumnWidthPx: 520,
  rowHeightPx: 34,
});

addSheet(workbook, "Languages", asSheetRows(workbookLanguageOrder, ["spreadsheetCode", "dbCode", "language", "transcriptionFormat"]));

addSheet(workbook, "Source Contract", [
  ["Field", "Value"],
  ["contract_id", contract.contract_id],
  ["status", contract.status],
  ["approved_for_generation", String(contract.approved_for_generation)],
  ["postgres_import", String(contract.workbook.postgres_import)],
  ["ordinary_deck_sort", String(contract.workbook.ordinary_deck_sort)],
  ["target_language_order_source", contract.course.target_language_order_source],
  ["target_language_column_count", String(contract.course.target_language_column_count)],
  ["buyer_facing_language_column_count", String(languageCodes.length)],
  ["buyer_facing_language_order_policy", EDITION.languageOrderPolicy],
  ["candidate_pool", rel(CANDIDATE_POOL_PATH)],
  ["support_dir", rel(SUPPORT_DIR)],
]);

addSheet(
  workbook,
  "Benchmark Audit",
  [
    ["id", "name", "role", "url"],
    ...contract.source_policy.benchmark_only_sources.map((source) => [
      source.id,
      source.name,
      source.role,
      source.url,
    ]),
    ["no-copy", "Blocked source uses", contract.source_policy.blocked_without_permission_or_review.join("; "), ""],
  ]
);

addSheet(
  workbook,
  "Candidate Pool",
  asSheetRows(rows, [
    "selection_order",
    "row_id",
    "spanish_item_id",
    "meaning_id",
    "display_ES",
    "display_ES_419",
    "part_of_speech",
    "gender",
    "article_ES",
    "article_ES_419",
    "meaning_note",
    "semantic_scene",
    "topic_domain",
    "source_status",
    "qa_status",
  ])
);

const sourceAssistedQaSheet = addSheet(workbook, "Source Assisted QA", [
  ["Gate", "Status"],
  ["source_contract_gate", "passed_by_release_gate"],
  ["benchmark_no_copy_gate", "passed_by_release_gate"],
  ["candidate_pool_gate", "passed_by_release_gate"],
  ["spanish_source_candidate_gate", "source_lookup_advisory_review_pass_source_partial"],
  ["support_generation_plan_gate", "passed"],
  ["support_translation_memory_reuse_map_gate", "passed"],
  ["support_language_source_preflight", "pending_final_gate_run"],
  ["final_workbook_contract_gate", "exported_by_script"],
  ["google_sheet_readback_gate", "tracked_after_native_upload"],
]);
styleSimpleTable(sourceAssistedQaSheet, 10, 2, {
  firstColumnWidthPx: 320,
  defaultColumnWidthPx: 360,
  rowHeightPx: 34,
});

const regionalRows = rows
  .filter((row) => row.display_ES !== row.display_ES_419 || row.example_ES !== row.example_ES_419 || row.article_ES !== row.article_ES_419)
  .map((row) => ({
    selection_order: row.selection_order,
    display_ES: row.display_ES,
    display_ES_419: row.display_ES_419,
    example_ES: row.example_ES,
    example_ES_419: row.example_ES_419,
    article_ES: row.article_ES,
    article_ES_419: row.article_ES_419,
    qa_status: "regional_variant_reviewed_source_layer",
  }));
addSheet(
  workbook,
  "Regional Variant QA",
  asSheetRows(regionalRows, [
    "selection_order",
    "display_ES",
    "display_ES_419",
    "example_ES",
    "example_ES_419",
    "article_ES",
    "article_ES_419",
    "qa_status",
  ])
);

const translationQaSheet = addSheet(workbook, "Translation QA", [
  ["Field", "Value"],
  ["Support languages generated", "true"],
  ["Support language batches", String(supportFiles.length)],
  ["Support display cells", String(rows.length * supportLanguages.length)],
  ["Support example cells", String(rows.length * supportLanguages.length)],
  ["Primary Spanish transcription", "visible broad learner IPA display/example transcription columns"],
  ["Support-language transcription", contract.field_rules.support_language_transcription],
  ["Sample audit", "required after export/readback"],
]);
styleSimpleTable(translationQaSheet, 8, 2, {
  firstColumnWidthPx: 280,
  defaultColumnWidthPx: 520,
  rowHeightPx: 34,
});

addSheet(
  workbook,
  "Sources",
  [
    ["source_id", "role", "confidence", "local_path"],
    ...contract.source_policy.local_candidate_sources.map((source) => [
      source.source_id,
      source.role,
      source.confidence,
      source.local_path,
    ]),
    ...contract.source_policy.external_frequency_references.map((source) => [
      source.id,
      source.role,
      "external_reference_only",
      source.url,
    ]),
  ]
);

addSheet(
  workbook,
  "Support Batches",
  [
    ["language_code", "file"],
    ...supportLanguages.map((language) => [
      language.spreadsheetCode,
      rel(supportFilePath(language.spreadsheetCode)),
    ]),
  ]
);

const lastMainColumn = colName(headers.length - 1);
const previewRows = Math.min(mainRows.length + 1, 8);
const mainInspect = await workbook.inspect({
  kind: "table",
  range: `${mainSheetName}!A1:${lastMainColumn}${previewRows}`,
  include: "values",
  tableMaxRows: previewRows,
  tableMaxCols: Math.min(headers.length, 24),
});
console.log(mainInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(WORKBOOK_PATH);
const workbookBytes = await fs.readFile(WORKBOOK_PATH);
const workbookSha256 = createHash("sha256").update(workbookBytes).digest("hex");
const manifest = {
  release_id: RELEASE_ID,
  workbook_type: "final",
  workbook_edition: WORKBOOK_EDITION,
  primary_spanish_variant: PRIMARY_SPANISH_VARIANT,
  omitted_main_sheet_source_variants: OMITTED_MAIN_SHEET_SOURCE_VARIANTS,
  workbook_layout: "buyer_facing_clean_v3_separate_spanish_edition",
  workbook_path: rel(WORKBOOK_PATH),
  workbook_file: path.basename(WORKBOOK_PATH),
  workbook_sha256: workbookSha256,
  generated_at: new Date().toISOString(),
  rows: rows.length,
  language_columns: languageCodes.length,
  language_column_order: languageCodes,
  language_column_order_policy: EDITION.languageOrderDescription,
  main_sheet_columns: headers.length,
  support_language_batches: supportFiles.length,
  support_rows: rows.length * supportLanguages.length,
  main_sheet: mainSheetName,
  service_sheets: Array.from(new Set([...contract.workbook.service_sheets, "Deck Metadata", "Card Metadata", "Support Batches"])),
  spanish_noun_articles_in_main_sheet: true,
  primary_spanish_transcription_columns: primaryTranscriptionColumns,
  primary_spanish_example_transcription_in_main_sheet: true,
  source_fields_in_main_sheet: false,
  support_languages_generated: true,
  primary_spanish_transcription_policy: "spanish_a1_broad_learner_ipa_v1",
  primary_spanish_transcription_generator: "scripts/spanish-a1/lib/spanish-pronunciation.mjs",
  google_sheet_created: false,
  postgres_changes: false,
  candidate_pool: rel(CANDIDATE_POOL_PATH),
  course_metadata_source: rel(COURSE_METADATA_PATH),
  course_metadata_version: courseMetadata.version,
  course_metadata_localized: true,
  support_files: supportFiles.map(rel),
};
await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `Spanish A1 final workbook exported: ${rel(WORKBOOK_PATH)} rows=${rows.length} languages=${languageCodes.length} support_batches=${supportFiles.length} sha256=${workbookSha256}`
);
