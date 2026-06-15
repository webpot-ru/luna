#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { SpreadsheetFile } from "@oai/artifact-tool";

const DEFAULT_SCOPE = process.env.GOOGLE_DRIVE_SCOPE || "https://www.googleapis.com/auth/drive.file";
const DEFAULT_OAUTH_CLIENT_FILE = ".secrets/google-oauth-client.json";
const DEFAULT_OAUTH_TOKEN_FILE = ".secrets/google-oauth-token.json";

const args = process.argv.slice(2);
const manifestPaths = args.filter((arg) => !arg.startsWith("--"));
const authMode = args.find((arg) => arg.startsWith("--auth-mode="))?.split("=")[1] ?? process.env.GOOGLE_DRIVE_AUTH_MODE ?? "auto";
const oauthClientFile =
  args.find((arg) => arg.startsWith("--oauth-client-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_CLIENT_FILE ??
  DEFAULT_OAUTH_CLIENT_FILE;
const oauthTokenFile =
  args.find((arg) => arg.startsWith("--oauth-token-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_TOKEN_FILE ??
  DEFAULT_OAUTH_TOKEN_FILE;

if (manifestPaths.length === 0) {
  throw new Error("Usage: node scripts/oxford/check-oxford-edition-google-sheet-readback.mjs <delivery_manifest.json> [...]");
}

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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
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
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
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
    throw new Error(`Unsupported --auth-mode=${authMode}; Oxford readback currently uses OAuth.`);
  }
  return getOAuthAccessToken();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, { attempts = 4, timeoutMs = 45_000 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok || attempt === attempts) return response;
      lastError = new Error(`HTTP ${response.status}: ${await response.text()}`);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await sleep(1500 * attempt);
  }
  throw lastError ?? new Error("fetch failed");
}

async function driveExportWorkbook({ accessToken, fileId }) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`);
  url.searchParams.set("mimeType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Google Drive export failed for ${fileId} (${response.status}): ${await response.text()}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      clearTimeout(timeout);
      return SpreadsheetFile.importXlsx(buffer);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === 4) throw error;
      await sleep(2000 * attempt);
    }
  }
  throw lastError ?? new Error(`Google Drive export failed for ${fileId}`);
}

async function loadLocalWorkbook(workbookPath) {
  return SpreadsheetFile.importXlsx(await readFile(workbookPath));
}

function parseValues(inspectResult, range) {
  for (const line of String(inspectResult.ndjson ?? "").split("\n")) {
    if (!line.trim()) continue;
    const payload = JSON.parse(line);
    if (payload.kind === "table" && Array.isArray(payload.values)) return payload.values;
  }
  throw new Error(`Workbook inspect did not return table values for ${range}`);
}

async function getValues({ workbook, range, rows, cols }) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values",
    tableMaxRows: rows,
    tableMaxCols: cols,
  });
  const values = parseValues(result, range);
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => normalizedCell(values[rowIndex]?.[colIndex]))
  );
}

function explicitDataRowsForManifest(manifest) {
  for (const key of ["workbook_data_rows", "data_rows", "rows_per_edition", "edition_rows"]) {
    const value = Number(manifest[key]);
    if (Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

async function inferDataRowsFromLocalWorkbook(localWorkbook, mainSheet) {
  const rows = await getValues({
    workbook: localWorkbook,
    range: `${quoteSheet(mainSheet)}!A1:A2000`,
    rows: 2000,
    cols: 1,
  });
  let lastNonEmptyRow = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    if (normalizedCell(rows[rowIndex]?.[0])) lastNonEmptyRow = rowIndex + 1;
  }
  return lastNonEmptyRow > 1 ? lastNonEmptyRow - 1 : null;
}

async function dataRowsForManifest(manifest, localWorkbook, mainSheet) {
  const explicitRows = explicitDataRowsForManifest(manifest);
  if (explicitRows) return explicitRows;

  const workbookRows = await inferDataRowsFromLocalWorkbook(localWorkbook, mainSheet);
  if (workbookRows) return workbookRows;

  const name = String(manifest.workbook_file || manifest.workbook_path || "");
  const match = name.match(/Part_(\d+)/u);
  if (!match) return 150;
  const partNumber = Number(match[1]);
  const level = name.match(/(?:Core|Advanced_Extension)_([A-Z]\d)_Part_/u)?.[1] ?? "A1";
  return level === "A1" && partNumber === 1 ? 150 : 300;
}

function mainSheetForManifest(manifest) {
  const name = String(manifest.workbook_file || manifest.workbook_path || "");
  const level = name.match(/(?:Core|Advanced_Extension)_([A-Z]\d)_Part_/u)?.[1] ?? "A1";
  return name.includes("British_English") ? `Oxford ${level} UK` : `Oxford ${level} US`;
}

function rangesForMainSheet(mainSheet, dataRows) {
  const rowsWithHeader = dataRows + 1;
  return [
    { name: mainSheet, range: `${quoteSheet(mainSheet)}!A1:${colName(111)}${rowsWithHeader}`, rows: rowsWithHeader, cols: 112 },
    { name: "Course Metadata", range: "'Course Metadata'!A1:BC5", rows: 5, cols: 55 },
    { name: "Deck Metadata", range: "'Deck Metadata'!A1:C42", rows: 42, cols: 3 },
    { name: "Card Metadata", range: `'Card Metadata'!A1:AB${rowsWithHeader}`, rows: rowsWithHeader, cols: 28 },
    { name: "_README", range: "'_README'!A1:B24", rows: 24, cols: 2 },
    { name: "_qa_status", range: "'_qa_status'!A1:J66", rows: 66, cols: 10 },
    { name: "_languages", range: "'_languages'!A1:E55", rows: 55, cols: 5 },
  ];
}

async function compareRange({ localWorkbook, remoteWorkbook, spec, blockers }) {
  const [localRows, remoteRows] = await Promise.all([
    getValues({ workbook: localWorkbook, range: spec.range, rows: spec.rows, cols: spec.cols }),
    getValues({ workbook: remoteWorkbook, range: spec.range, rows: spec.rows, cols: spec.cols }),
  ]);
  let checked = 0;
  for (let rowIndex = 0; rowIndex < spec.rows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < spec.cols; colIndex += 1) {
      checked += 1;
      if (localRows[rowIndex][colIndex] !== remoteRows[rowIndex][colIndex]) {
        blockers.push({
          sheet: spec.name,
          cell: `${colName(colIndex)}${rowIndex + 1}`,
          expected: localRows[rowIndex][colIndex],
          actual: remoteRows[rowIndex][colIndex],
        });
        if (blockers.length >= 80) return checked;
      }
    }
  }
  return checked;
}

async function verifyManifest(manifestPath) {
  const manifest = await readJson(manifestPath);
  const workbookPath = manifest.workbook_path;
  if (!workbookPath) throw new Error(`Manifest ${manifestPath} missing workbook_path.`);
  if (!manifest.google_sheet_id) throw new Error(`Manifest ${manifestPath} missing google_sheet_id.`);
  if (manifest.google_sheet_mime_type !== "application/vnd.google-apps.spreadsheet") {
    throw new Error(`Manifest ${manifestPath} is not a native Google Sheets upload.`);
  }

  const mainSheet = mainSheetForManifest(manifest);
  const accessToken = await getAccessToken();
  const [localWorkbook, remoteWorkbook] = await Promise.all([
    loadLocalWorkbook(workbookPath),
    driveExportWorkbook({ accessToken, fileId: manifest.google_sheet_id }),
  ]);

  const blockers = [];
  let checkedCells = 0;
  const dataRows = await dataRowsForManifest(manifest, localWorkbook, mainSheet);
  for (const spec of rangesForMainSheet(mainSheet, dataRows)) {
    if (blockers.length >= 80) break;
    checkedCells += await compareRange({ localWorkbook, remoteWorkbook, spec, blockers });
  }

  const currentWorkbookSha = await sha256File(workbookPath);
  const nextManifest = {
    ...manifest,
    google_sheet_readback_status: blockers.length === 0 ? "verified" : "failed",
    google_sheet_readback_verified_at: new Date().toISOString(),
    google_sheet_readback_sample_count: checkedCells,
    google_sheet_readback_workbook_sha256: currentWorkbookSha,
    google_sheet_readback_errors: blockers,
    google_sheet_readback_method: "drive_export_xlsx_full_oxford_edition_workbook_values",
  };
  await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

  if (blockers.length) {
    throw new Error(
      `Oxford Google Sheet readback failed for ${manifest.google_sheet_title}: ${blockers.length} mismatch(es). ` +
        JSON.stringify(blockers.slice(0, 5))
    );
  }

  return { manifestPath, title: manifest.google_sheet_title, checkedCells };
}

const results = [];
for (const manifestPath of manifestPaths) results.push(await verifyManifest(manifestPath));

for (const result of results) {
  console.log(
    `Oxford Google Sheet readback OK: title="${result.title}", cells=${result.checkedCells}, manifest=${result.manifestPath}`
  );
}
