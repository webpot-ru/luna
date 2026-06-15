#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(scriptDir, "..", "..");
const DEFAULT_SCOPE = process.env.GOOGLE_DRIVE_SCOPE || "https://www.googleapis.com/auth/drive.file";
const DEFAULT_OAUTH_CLIENT_FILE = path.join(ROOT, ".secrets", "google-oauth-client.json");
const DEFAULT_OAUTH_TOKEN_FILE = path.join(ROOT, ".secrets", "google-oauth-token.json");
const DEFAULT_RELEASE_ID = "spanish_a1_core_part_001_300_v1";
let CURRENT_RELEASE_ID = DEFAULT_RELEASE_ID;
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
  },
  spain_spanish: {
    workbookEdition: "spain_spanish",
    primarySpanishVariant: "ES",
    omittedMainSheetSourceVariants: ["ES-419"],
    filenameLabel: "Spain_Spanish",
  },
};
const REQUESTED_EDITION = args.get("edition") ?? "latin_american_spanish";
const EDITION = EDITIONS[REQUESTED_EDITION];
if (!EDITION) fail(`Unsupported Spanish A1 workbook edition: ${REQUESTED_EDITION}`);
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

function normalizeCell(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function fail(message) {
  throw new Error(message);
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function quoteSheet(sheetName) {
  return `'${String(sheetName).replace(/'/gu, "''")}'`;
}

function editionLanguageOrder(languageOrder) {
  const byCode = new Map(languageOrder.map((language) => [language.spreadsheetCode, language]));
  if (!byCode.has(PRIMARY_SPANISH_VARIANT)) {
    fail(`Missing required Spanish A1 workbook language code: ${PRIMARY_SPANISH_VARIANT}`);
  }
  return [
    byCode.get(PRIMARY_SPANISH_VARIANT),
    ...languageOrder.filter((language) => ![PRIMARY_SPANISH_VARIANT, ...OMITTED_MAIN_SHEET_SOURCE_VARIANTS].includes(language.spreadsheetCode)),
  ];
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

async function loadOAuthClient(clientFile) {
  const parsed = await readJson(clientFile);
  const client = parsed.installed || parsed.web;
  if (!client?.client_id || !client?.client_secret) fail("OAuth client file is missing client_id/client_secret.");
  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function refreshOAuthToken({ client, token, tokenFile }) {
  if (!token.refresh_token) fail("OAuth token has no refresh_token. Run upload-spreadsheet --authorize again.");
  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });
  if (!response.ok) fail(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  await fs.writeFile(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, { mode: 0o600 });
  return nextToken.access_token;
}

async function getOAuthAccessToken({ clientFile, tokenFile }) {
  const client = await loadOAuthClient(clientFile);
  const token = await readJson(tokenFile);
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  return refreshOAuthToken({ client, token, tokenFile });
}

async function sheetsGetValues({ accessToken, spreadsheetId, range }) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) fail(`Google Sheets values.get failed for ${range} (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.values ?? [];
}

function isSelected(row) {
  return normalizeCell(row.selection_decision ?? row.qa_status) === "selected";
}

function isUsefulArticle(value) {
  const article = normalizeCell(value);
  return article && article !== "not_applicable";
}

function sourceLearnerDisplay(row, code) {
  const display = normalizeCell(code === "ES-419" ? row.display_ES_419 : row.display_ES);
  const article = normalizeCell(code === "ES-419" ? row.article_ES_419 : row.article_ES);
  if (normalizeCell(row.part_of_speech) !== "noun" || !isUsefulArticle(article)) return display;
  if (display.toLowerCase().startsWith(`${article.toLowerCase()} `)) return display;
  return `${article} ${display}`;
}

async function buildExpectedMatrix({ contract, languageOrder }) {
  const candidatePoolPath = path.join(
    ROOT,
    "outputs/spanish-a1-core/candidate-pools",
    `${CURRENT_RELEASE_ID}_candidate_pool.jsonl`
  );
  const supportDir = path.join(ROOT, "outputs/spanish-a1-core/support-translations");
  const candidateRows = (await readJsonl(candidatePoolPath))
    .filter(isSelected)
    .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
  const expectedRows = Number(contract.default_release.expected_row_count);
  if (candidateRows.length !== expectedRows) {
    fail(`Expected ${expectedRows} selected candidate rows, got ${candidateRows.length}`);
  }

  const workbookLanguageOrder = editionLanguageOrder(languageOrder);
  const languageCodes = workbookLanguageOrder.map((language) => language.spreadsheetCode);
  const supportCodes = languageCodes.filter((code) => code !== PRIMARY_SPANISH_VARIANT);
  const supportMap = new Map();
  for (const code of supportCodes) {
    const filePath = path.join(supportDir, `${CURRENT_RELEASE_ID}_support_translation_batch_${codeSlug(code)}_v1.jsonl`);
    const rows = await readJsonl(filePath);
    if (rows.length !== candidateRows.length) {
      fail(`${rel(filePath)} has ${rows.length} rows, expected ${candidateRows.length}`);
    }
    for (const [index, row] of rows.entries()) {
      const sourceRow = candidateRows[index];
      if (normalizeCell(row.row_id) !== normalizeCell(sourceRow.row_id)) {
        fail(`${rel(filePath)} row ${index + 1} row_id mismatch`);
      }
      supportMap.set(`${sourceRow.row_id}:${code}`, {
        display: normalizeCell(row.display_translation ?? row.display),
        example: normalizeCell(row.example_translation ?? row.example),
      });
    }
  }

  const headers = [
    ...languageCodes,
    ...languageCodes.map((code) => `${code} example`),
    `${PRIMARY_SPANISH_VARIANT} transcription`,
    `${PRIMARY_SPANISH_VARIANT} example transcription`,
  ];

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

  return [
    headers,
    ...candidateRows.map((row) => [
      ...languageCodes.map((code) => normalizeCell(displayFor(row, code))),
      ...languageCodes.map((code) => normalizeCell(exampleFor(row, code))),
      normalizeCell(transcribeSpanishText(sourceLearnerDisplay(row, PRIMARY_SPANISH_VARIANT), PRIMARY_SPANISH_VARIANT)),
      normalizeCell(transcribeSpanishText(PRIMARY_SPANISH_VARIANT === "ES-419" ? row.example_ES_419 : row.example_ES, PRIMARY_SPANISH_VARIANT)),
    ]),
  ];
}

function normalizeRemoteMatrix(values, rows, cols) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => normalizeCell(values[rowIndex]?.[colIndex]))
  );
}

function compareMatrices(expected, actual, maxErrors = 100) {
  const mismatches = [];
  for (let row = 0; row < expected.length; row += 1) {
    for (let col = 0; col < expected[row].length; col += 1) {
      if (expected[row][col] !== actual[row]?.[col]) {
        mismatches.push({
          row: row + 1,
          col: colName(col),
          expected: expected[row][col],
          google_sheet: actual[row]?.[col] ?? "",
        });
        if (mismatches.length >= maxErrors) return mismatches;
      }
    }
  }
  return mismatches;
}

function validateCourseMetadata(courseMetadata, languageCodes) {
  const rows = courseMetadata.rows ?? {};
  const blockers = [];
  if (courseMetadata.release_id !== CURRENT_RELEASE_ID) {
    blockers.push(`Course Metadata source release_id ${courseMetadata.release_id} !== ${CURRENT_RELEASE_ID}`);
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
      if (!normalizeCell(row[field])) blockers.push(`Course Metadata source ${code}.${field} is blank`);
    }
    for (const [field, max] of Object.entries(COURSE_METADATA_LIMITS)) {
      const value = normalizeCell(row[field]);
      if ([...value].length > max) {
        blockers.push(`Course Metadata source ${code}.${field} length ${[...value].length} > ${max}`);
      }
      if (DISALLOWED_COURSE_METADATA_LABEL_PATTERNS.some((pattern) => pattern.test(value))) {
        blockers.push(`Course Metadata source ${code}.${field} contains cramped edition abbreviation`);
      }
    }
    const description = normalizeCell(row.description);
    const levelSignal = normalizeCell(row.level_signal);
    if (levelSignal && !description.includes(levelSignal)) {
      blockers.push(`Course Metadata source ${code}.description does not include localized level_signal`);
    }
    const editionMarker = normalizeCell(row.edition_marker ?? courseMetadata.variant_label ?? "LatAm");
    for (const field of ["title", "description", "category"]) {
      if (!normalizeCell(row[field]).includes(editionMarker)) {
        blockers.push(`Course Metadata source ${code}.${field} missing ${editionMarker} edition marker`);
      }
    }
    if (!["EN", "EN-GB"].includes(code) && english) {
      const sameAsEnglish = ["title", "description", "module", "category"].every(
        (field) => normalizeCell(row[field]) === normalizeCell(english[field])
      );
      if (sameAsEnglish) blockers.push(`Course Metadata source ${code} is English fallback`);
    }
  }
  return { rows, blockers };
}

function expectedCourseMetadataMatrix(courseMetadataRows, languageCodes) {
  return [
    ["", ...languageCodes],
    ["Title", ...languageCodes.map((code) => normalizeCell(courseMetadataRows[code]?.title))],
    ["Description", ...languageCodes.map((code) => normalizeCell(courseMetadataRows[code]?.description))],
    ["Module", ...languageCodes.map((code) => normalizeCell(courseMetadataRows[code]?.module))],
    ["Category", ...languageCodes.map((code) => normalizeCell(courseMetadataRows[code]?.category))],
  ];
}

async function main() {
  const contractPath = path.resolve(ROOT, args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
  const languageOrderPath = path.resolve(ROOT, args.get("language-order") ?? "config/language-order.json");
  const courseMetadataArg = args.get("course-metadata") ?? null;
  const [contract, languageOrder] = await Promise.all([
    readJson(contractPath),
    readJson(languageOrderPath),
  ]);
  CURRENT_RELEASE_ID = args.get("release") ?? contract.default_release?.release_id ?? DEFAULT_RELEASE_ID;
  const deliveryManifestPath = path.resolve(
    ROOT,
    args.get("delivery-manifest") ??
      `outputs/spanish-a1-core/final/FlashcardsLuna_Spanish_A1_Core_Part_${String(contract.release_part?.part_number ?? 1).padStart(3, "0")}_${EDITION.filenameLabel}_delivery.json`
  );
  const oauthClientFile = path.resolve(args.get("oauth-client-file") ?? process.env.GOOGLE_OAUTH_CLIENT_FILE ?? DEFAULT_OAUTH_CLIENT_FILE);
  const oauthTokenFile = path.resolve(args.get("oauth-token-file") ?? process.env.GOOGLE_OAUTH_TOKEN_FILE ?? DEFAULT_OAUTH_TOKEN_FILE);
  const reportStamp = args.get("date") ?? todayStamp();
  const reportJsonPath = path.resolve(
    ROOT,
    args.get("report-json") ?? `outputs/spanish-a1-core/qa/${CURRENT_RELEASE_ID}_google_sheet_readback_${reportStamp}.json`
  );
  const reportMdPath = reportJsonPath.replace(/\.json$/iu, ".md");

  const deliveryManifest = await readJson(deliveryManifestPath);
  const workbookManifestPath = args.get("workbook-manifest") ??
    deliveryManifest.workbook_manifest_path ??
    (deliveryManifest.workbook_path ? String(deliveryManifest.workbook_path).replace(/\.xlsx$/iu, "_manifest.json") : null);
  let workbookManifest = null;
  if (workbookManifestPath) {
    try {
      workbookManifest = await readJson(path.resolve(ROOT, workbookManifestPath));
    } catch {
      workbookManifest = null;
    }
  }
  const courseMetadataPath = path.resolve(
    ROOT,
    courseMetadataArg ??
      workbookManifest?.course_metadata_source ??
      contract.latest_final_workbooks?.[WORKBOOK_EDITION]?.course_metadata_source ??
      "config/spanish-a1-core-course-metadata.json"
  );
  const courseMetadataSource = await readJson(courseMetadataPath);
  const spreadsheetId = args.get("sheet-id") ?? deliveryManifest.google_sheet_id;
  if (!spreadsheetId) fail("Missing Google Sheet id. Pass --sheet-id or provide delivery manifest with google_sheet_id.");

  const workbookLanguageOrder = editionLanguageOrder(languageOrder);
  const expectedMatrix = await buildExpectedMatrix({ contract, languageOrder });
  const expectedRows = Number(contract.default_release.expected_row_count);
  const expectedRowsWithHeader = expectedRows + 1;
  const expectedCols = expectedMatrix[0].length;
  const languageCodes = workbookLanguageOrder.map((language) => language.spreadsheetCode);
  const supportCodes = languageCodes.filter((code) => code !== PRIMARY_SPANISH_VARIANT);
  const { rows: courseMetadataRows, blockers: courseMetadataSourceBlockers } = validateCourseMetadata(
    courseMetadataSource,
    languageCodes
  );
  const expectedCourseMetadata = expectedCourseMetadataMatrix(courseMetadataRows, languageCodes);
  const sheet = contract.workbook.main_sheet_name;
  const range = `${quoteSheet(sheet)}!A1:${colName(expectedCols - 1)}${expectedRowsWithHeader}`;
  const courseMetadataRange = `${quoteSheet("Course Metadata")}!A1:${colName(languageCodes.length)}5`;

  const accessToken = await getOAuthAccessToken({ clientFile: oauthClientFile, tokenFile: oauthTokenFile, scope: DEFAULT_SCOPE });
  const [remoteValues, remoteCourseMetadataValues] = await Promise.all([
    sheetsGetValues({ accessToken, spreadsheetId, range }),
    sheetsGetValues({ accessToken, spreadsheetId, range: courseMetadataRange }),
  ]);
  const googleMatrix = normalizeRemoteMatrix(remoteValues, expectedRowsWithHeader, expectedCols);
  const googleCourseMetadataMatrix = normalizeRemoteMatrix(remoteCourseMetadataValues, 5, languageCodes.length + 1);
  const mismatches = compareMatrices(expectedMatrix, googleMatrix);
  const courseMetadataMismatches = compareMatrices(expectedCourseMetadata, googleCourseMetadataMatrix);

  const headers = googleMatrix[0] ?? [];
  const filledCounts = {};
  for (const code of languageCodes) {
    const displayIndex = headers.indexOf(code);
    const exampleIndex = headers.indexOf(`${code} example`);
    filledCounts[code] = {
      display: displayIndex < 0 ? 0 : googleMatrix.slice(1).filter((row) => normalizeCell(row[displayIndex])).length,
      example: exampleIndex < 0 ? 0 : googleMatrix.slice(1).filter((row) => normalizeCell(row[exampleIndex])).length,
    };
  }

  const blockers = [];
  if (remoteValues.length !== expectedRowsWithHeader) {
    blockers.push(`google main rows ${remoteValues.length} !== ${expectedRowsWithHeader}`);
  }
  if ((remoteValues[0] ?? []).length !== expectedCols) {
    blockers.push(`google main cols ${(remoteValues[0] ?? []).length} !== ${expectedCols}`);
  }
  if (mismatches.length) blockers.push(`google sheet differs from expected source/support matrix in ${mismatches.length} reported cell(s)`);
  blockers.push(...courseMetadataSourceBlockers);
  if (remoteCourseMetadataValues.length !== 5 || (remoteCourseMetadataValues[0] ?? []).length !== languageCodes.length + 1) {
    blockers.push(`google Course Metadata shape ${(remoteCourseMetadataValues.length)}x${(remoteCourseMetadataValues[0] ?? []).length} !== 5x${languageCodes.length + 1}`);
  }
  if (courseMetadataMismatches.length) {
    blockers.push(`google Course Metadata differs from localized source in ${courseMetadataMismatches.length} reported cell(s)`);
  }
  for (const code of languageCodes) {
    const counts = filledCounts[code];
    if (counts.display !== expectedRows) blockers.push(`${code} display filled ${counts.display} !== ${expectedRows}`);
    if (counts.example !== expectedRows) blockers.push(`${code} example filled ${counts.example} !== ${expectedRows}`);
  }

  const summary = {
    release_id: CURRENT_RELEASE_ID,
    status: blockers.length ? "blocked" : "pass",
    google_sheet_id: spreadsheetId,
    google_sheet_url: deliveryManifest.google_sheet_url ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    google_sheet_title: deliveryManifest.google_sheet_title ?? null,
    main_sheet: sheet,
    main_rows: Math.max(0, remoteValues.length - 1),
    main_cols: remoteValues[0]?.length ?? 0,
    language_columns: languageCodes.length,
    support_language_batches: supportCodes.length,
    support_rows: expectedRows * supportCodes.length,
    compared_cells: expectedRowsWithHeader * expectedCols + expectedCourseMetadata.length * expectedCourseMetadata[0].length,
    main_sheet_compared_cells: expectedRowsWithHeader * expectedCols,
    course_metadata_compared_cells: expectedCourseMetadata.length * expectedCourseMetadata[0].length,
    mismatch_count: mismatches.length,
    course_metadata_mismatch_count: courseMetadataMismatches.length,
    blockers: blockers.length,
    checked_at: new Date().toISOString(),
  };
  const report = {
    summary,
    blockers,
    mismatches,
    course_metadata_mismatches: courseMetadataMismatches,
    filled_counts: filledCounts,
    course_metadata_source: rel(courseMetadataPath),
    course_metadata_source_version: courseMetadataSource.version ?? null,
  };

  await writeJson(reportJsonPath, report);
  await fs.writeFile(
    reportMdPath,
    [
      `# Spanish A1 Google Sheet Readback - ${CURRENT_RELEASE_ID}`,
      "",
      `- Status: ${summary.status}`,
      `- Google Sheet: ${summary.google_sheet_url}`,
      `- Rows: ${summary.main_rows}/${expectedRows}`,
      `- Columns: ${summary.main_cols}/${expectedCols}`,
      `- Compared cells: ${summary.compared_cells}`,
      `- Mismatches: ${summary.mismatch_count}`,
      `- Blockers: ${summary.blockers}`,
      "",
      "## Blockers",
      "",
      ...(blockers.length ? blockers.map((blocker) => `- ${blocker}`) : ["None."]),
      "",
    ].join("\n"),
    "utf8"
  );

  const nextDeliveryManifest = {
    ...deliveryManifest,
    google_sheet_readback_status: summary.status,
    google_sheet_readback_verified_at: summary.checked_at,
    google_sheet_readback_sample_count: summary.compared_cells,
    google_sheet_readback_workbook_sha256: deliveryManifest.google_sheet_uploaded_workbook_sha256 ?? null,
    google_sheet_readback_errors: blockers,
    google_sheet_readback_report: rel(reportJsonPath),
  };
  await writeJson(deliveryManifestPath, nextDeliveryManifest);

  console.log(JSON.stringify({ ...summary, report_json: rel(reportJsonPath), report_md: rel(reportMdPath) }, null, 2));
  if (blockers.length) process.exitCode = 1;
}

await main();
