#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const DEFAULT_RELEASE_ID = "english_core_3000_a1_a2_part_001_150_v1";
const DEFAULT_SCOPE = process.env.GOOGLE_DRIVE_SCOPE || "https://www.googleapis.com/auth/drive.file";
const DEFAULT_OAUTH_CLIENT_FILE = ".secrets/google-oauth-client.json";
const DEFAULT_OAUTH_TOKEN_FILE = ".secrets/google-oauth-token.json";

const args = process.argv.slice(2);
const releaseId = args.find((arg) => !arg.startsWith("--")) || DEFAULT_RELEASE_ID;
const authMode = args.find((arg) => arg.startsWith("--auth-mode="))?.split("=")[1] ?? process.env.GOOGLE_DRIVE_AUTH_MODE ?? "auto";
const oauthClientFile =
  args.find((arg) => arg.startsWith("--oauth-client-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_CLIENT_FILE ??
  DEFAULT_OAUTH_CLIENT_FILE;
const oauthTokenFile =
  args.find((arg) => arg.startsWith("--oauth-token-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_TOKEN_FILE ??
  DEFAULT_OAUTH_TOKEN_FILE;

if (!/^[a-z0-9_]+$/i.test(releaseId)) throw new Error(`Unsafe release id: ${releaseId}`);

function normalizedCell(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function quoteSheet(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`;
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

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function loadOAuthClient(clientFile) {
  const parsed = JSON.parse(await readFile(clientFile, "utf8"));
  const client = parsed.installed || parsed.web;
  if (!client?.client_id || !client?.client_secret) {
    throw new Error("OAuth client file is missing client_id/client_secret.");
  }
  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function getOAuthAccessToken() {
  const client = await loadOAuthClient(oauthClientFile);
  const token = JSON.parse(await readFile(oauthTokenFile, "utf8"));
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) {
    return token.access_token;
  }
  if (!token.refresh_token) throw new Error("OAuth token has no refresh_token. Run upload-spreadsheet --authorize again.");
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
  if (!response.ok) throw new Error(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  await writeFile(oauthTokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, { mode: 0o600 });
  return nextToken.access_token;
}

async function getAccessToken() {
  if (authMode !== "auto" && authMode !== "oauth") {
    throw new Error(`Unsupported --auth-mode=${authMode}; English Core readback currently uses OAuth.`);
  }
  return getOAuthAccessToken();
}

async function readSheetValues({ spreadsheetId, sheetName, rowCount, columnCount, endColumn }) {
  const range = `${quoteSheet(sheetName)}!A1:${endColumn}${rowCount}`;
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`,
    { headers: { authorization: `Bearer ${await getAccessToken()}` } }
  );
  if (!response.ok) throw new Error(`Google Sheets readback failed (${response.status}): ${await response.text()}`);
  const values = (await response.json()).values ?? [];
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) => normalizedCell(values[rowIndex]?.[columnIndex]))
  );
}

function compareMatrix({ blockers, sheetName, localRows, remoteRows, maxBlockers = 80 }) {
  let checked = 0;
  for (let rowIndex = 0; rowIndex < localRows.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < localRows[rowIndex].length; columnIndex += 1) {
      checked += 1;
      const expected = normalizedCell(localRows[rowIndex]?.[columnIndex]);
      const actual = normalizedCell(remoteRows[rowIndex]?.[columnIndex]);
      if (expected !== actual) {
        blockers.push({
          sheet: sheetName,
          row: rowIndex + 1,
          column: columnIndex + 1,
          header: localRows[0]?.[columnIndex] ?? "",
          expected,
          actual,
        });
        if (blockers.length >= maxBlockers) return checked;
      }
    }
  }
  return checked;
}

const contract = JSON.parse(await readFile("config/english-core-3000-source-contract-v0.json", "utf8"));
const manifestPath =
  contract.latest_workbook_export?.delivery_manifest_path ??
  "outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final_delivery.json";
const workbookPath = contract.latest_workbook_export?.path;
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!workbookPath) throw new Error("Contract missing latest_workbook_export.path.");
if (manifest.google_sheet_id === undefined) throw new Error(`Manifest ${manifestPath} missing google_sheet_id.`);
if (manifest.google_sheet_verified_in_folder !== true) throw new Error("Google Sheet has not been verified in target folder.");

const mainSheetName = contract.delivery_contract.main_sheet_name;
const mainRows = contract.course.target_selected_rows + 1;
const mainCols = contract.latest_workbook_export.headers;
const metadataRows = 3;
const metadataCols = contract.course.first_release_language_column_count + 1;

const languageOrder = await readJson("config/language-order.json");
const languageCodes = languageOrder.map((language) => language.spreadsheetCode);
const sourceRows = await readJsonl(contract.latest_en_transcription_review.path);
const enGbRows = await readJsonl(contract.latest_en_gb_text_layer.path);
const merged = new Map(
  sourceRows.map((row) => [
    row.core_item_id,
    {
      ...row,
      EN: normalizedCell(row.en_display),
      example_EN: normalizedCell(row.example_EN),
      qa_status: "source_assisted_ready",
      qa_notes: "AI/source-assisted QA passed; not external native-speaker approved.",
    },
  ])
);
for (const row of enGbRows) {
  const target = merged.get(row.core_item_id);
  if (!target) throw new Error(`Unknown EN-GB core_item_id ${row.core_item_id}`);
  target["EN-GB"] = normalizedCell(row["EN-GB"]);
  target["example_EN-GB"] = normalizedCell(row["example_EN-GB"]);
}
for (const batch of contract.latest_translation_batches) {
  for (const row of await readJsonl(batch.path)) {
    const target = merged.get(row.core_item_id);
    if (!target) throw new Error(`Unknown batch core_item_id ${row.core_item_id} in ${batch.batch_id}`);
    for (const language of batch.languages) {
      target[language] = normalizedCell(row[language]);
      target[`example_${language}`] = normalizedCell(row[`example_${language}`]);
    }
  }
}
const headers = [
  ...contract.workbook_columns.fixed_columns,
  ...languageCodes,
  ...languageCodes.map((code) => `example_${code}`),
  ...contract.workbook_columns.status_columns,
  ...contract.workbook_columns.english_only_transcription_columns,
];
const localMainRows = [
  headers,
  ...[...merged.values()]
    .sort((a, b) => String(a.row_id).localeCompare(String(b.row_id)))
    .map((row) =>
      headers.map((header) => {
        if (header === "semantic_scene") return JSON.stringify(row.semantic_scene ?? {});
        return normalizedCell(row[header]);
      })
    ),
];
const courseMetadata = await readJson(contract.latest_course_metadata.path);
const metadataCodes = courseMetadata.rows.map((row) => row.spreadsheet_code);
const metadataByCode = new Map(courseMetadata.rows.map((row) => [row.spreadsheet_code, row]));
const localMetadataRows = [
  ["", ...metadataCodes],
  ["Title", ...metadataCodes.map((code) => metadataByCode.get(code)?.title ?? "")],
  ["Description", ...metadataCodes.map((code) => metadataByCode.get(code)?.description ?? "")],
];

const remoteMainRows = await readSheetValues({
  spreadsheetId: manifest.google_sheet_id,
  sheetName: mainSheetName,
  rowCount: mainRows,
  columnCount: mainCols,
  endColumn: "DZ",
});
const remoteMetadataRows = await readSheetValues({
  spreadsheetId: manifest.google_sheet_id,
  sheetName: "Course Metadata",
  rowCount: metadataRows,
  columnCount: metadataCols,
  endColumn: "BC",
});

const blockers = [];
let checkedCells = 0;
checkedCells += compareMatrix({ blockers, sheetName: mainSheetName, localRows: localMainRows, remoteRows: remoteMainRows });
if (blockers.length < 80) {
  checkedCells += compareMatrix({
    blockers,
    sheetName: "Course Metadata",
    localRows: localMetadataRows,
    remoteRows: remoteMetadataRows,
  });
}

const currentWorkbookSha = await sha256File(workbookPath);
const nextManifest = {
  ...manifest,
  google_sheet_readback_status: blockers.length === 0 ? "verified" : "failed",
  google_sheet_readback_verified_at: new Date().toISOString(),
  google_sheet_readback_sample_count: checkedCells,
  google_sheet_readback_workbook_sha256: currentWorkbookSha,
  google_sheet_readback_errors: blockers,
  google_sheet_readback_method: "sheets_values_english_core_main_full_plus_course_metadata",
};
await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

if (blockers.length > 0) {
  console.error(`English Core Google Sheet readback failed: ${blockers.length} mismatch(es).`);
  for (const blocker of blockers.slice(0, 20)) {
    console.error(
      `sheet=${blocker.sheet} row=${blocker.row} col=${blocker.column} header=${blocker.header} expected=${JSON.stringify(
        blocker.expected
      )} actual=${JSON.stringify(blocker.actual)}`
    );
  }
  console.error(`delivery_manifest=${manifestPath}`);
  process.exit(1);
}

console.log(
  `English Core Google Sheet readback OK: release=${releaseId}, main_rows=${mainRows}, main_columns=${mainCols}, cells=${checkedCells}, method=sheets_values_english_core_main_full_plus_course_metadata`
);
console.log(`delivery_manifest=${manifestPath}`);
