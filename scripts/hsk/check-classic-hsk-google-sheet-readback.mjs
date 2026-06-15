#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { SpreadsheetFile } from "@oai/artifact-tool";

const DEFAULT_RELEASE_ID = "hsk2_classic_level_1_150_v1";
const DEFAULT_SCOPE = process.env.GOOGLE_DRIVE_SCOPE || "https://www.googleapis.com/auth/drive.file";
const DEFAULT_OAUTH_CLIENT_FILE = ".secrets/google-oauth-client.json";
const DEFAULT_OAUTH_TOKEN_FILE = ".secrets/google-oauth-token.json";

const args = process.argv.slice(2);
const releaseId = args.find((arg) => !arg.startsWith("--")) || DEFAULT_RELEASE_ID;
const levelMatch = releaseId.match(/level_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const mainSheet = `HSK${hskLevel} Classic`;
const authMode = args.find((arg) => arg.startsWith("--auth-mode="))?.split("=")[1] ?? process.env.GOOGLE_DRIVE_AUTH_MODE ?? "auto";
const oauthClientFile =
  args.find((arg) => arg.startsWith("--oauth-client-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_CLIENT_FILE ??
  DEFAULT_OAUTH_CLIENT_FILE;
const oauthTokenFile =
  args.find((arg) => arg.startsWith("--oauth-token-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_TOKEN_FILE ??
  DEFAULT_OAUTH_TOKEN_FILE;
const execFileAsync = promisify(execFile);

if (!/^[a-z0-9_]+$/i.test(releaseId)) throw new Error(`Unsafe release id: ${releaseId}`);

function normalizedCell(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function quoteSheet(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`;
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        value += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
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
    throw new Error(`Unsupported --auth-mode=${authMode}; HSK readback currently uses OAuth.`);
  }
  return getOAuthAccessToken();
}

async function readSheetValues({ spreadsheetId, sheetName, rowCount, columnCount }) {
  const range = `${quoteSheet(sheetName)}!A1:ZZ${rowCount}`;
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

const manifestPath = path.join("outputs", "hsk", `${releaseId}_delivery.json`);
const workbookPath = path.join("outputs", "hsk", `${releaseId}.xlsx`);
const csvPath = path.join("outputs", "hsk", `${releaseId}.csv`);
const languagesPath = path.join("config", "language-order.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const localRows = parseCsv(await readFile(csvPath, "utf8"));
const rowCount = localRows.length;
if (rowCount < 2) throw new Error(`Expected CSV header and at least one data row, got ${rowCount}`);
if (localRows[0]?.includes("ZH")) throw new Error("HSK workbook must not include ZH as a target-language column.");
if (localRows[0]?.includes("example_ZH")) throw new Error("HSK workbook must not include example_ZH as a target-language column.");
const allLanguages = JSON.parse(await readFile(languagesPath, "utf8"));
const targetLanguages = allLanguages
  .map((language) => language.spreadsheetCode)
  .filter((code) => code !== "ZH");
const buyerFacingHeaders = [
  "ZH",
  "ZH transcription",
  ...targetLanguages,
  "ZH example",
  "ZH example transcription",
  ...targetLanguages.map((code) => `${code} example`),
];
const columnCount = buyerFacingHeaders.length;

async function readWorkbookSheetValues({ workbookPath: localWorkbookPath, sheetName, rowCount: rowsToRead, columnCount: colsToRead }) {
  const script = `
import json
import sys
from openpyxl import load_workbook
workbook_path, sheet_name, row_count, column_count = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
workbook = load_workbook(workbook_path, read_only=True, data_only=True)
sheet = workbook[sheet_name]
rows = []
for row_index in range(1, row_count + 1):
    row = []
    for column_index in range(1, column_count + 1):
        value = sheet.cell(row_index, column_index).value
        row.append("" if value is None else str(value))
    rows.append(row)
print(json.dumps(rows, ensure_ascii=False))
`;
  const { stdout } = await execFileAsync(
    "python3",
    ["-c", script, localWorkbookPath, sheetName, String(rowsToRead), String(colsToRead)],
    { maxBuffer: 1024 * 1024 * 150 }
  );
  const values = JSON.parse(stdout);
  return values.map((row) => row.map(normalizedCell));
}

const expectedRows = await readWorkbookSheetValues({
  workbookPath,
  sheetName: mainSheet,
  rowCount,
  columnCount,
});
if (JSON.stringify(expectedRows[0]) !== JSON.stringify(buyerFacingHeaders)) {
  throw new Error("HSK buyer-facing workbook headers do not match the LunaCards language/example/pinyin contract.");
}

const remoteRows = await readSheetValues({
  spreadsheetId: manifest.google_sheet_id,
  sheetName: mainSheet,
  rowCount,
  columnCount,
});

const blockers = [];
let checkedCells = 0;
for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    checkedCells += 1;
    const expected = normalizedCell(expectedRows[rowIndex]?.[columnIndex]);
    const actual = normalizedCell(remoteRows[rowIndex]?.[columnIndex]);
    if (expected !== actual) {
      blockers.push({
        row: rowIndex + 1,
        column: columnIndex + 1,
        header: expectedRows[0]?.[columnIndex] ?? "",
        expected,
        actual,
      });
      if (blockers.length >= 80) break;
    }
  }
  if (blockers.length >= 80) break;
}

const workbook = await SpreadsheetFile.importXlsx(await readFile(workbookPath));
const courseMetadataInspect = await workbook.inspect({
  kind: "table",
  range: "Course Metadata!A1:BB5",
  include: "values",
  tableMaxRows: 5,
  tableMaxCols: 60,
});
const courseMetadataRows = JSON.parse(courseMetadataInspect.ndjson).values ?? [];
const courseMetadataColumnCount = courseMetadataRows[0]?.length ?? 0;
if (courseMetadataRows.length !== 5 || courseMetadataColumnCount < 2) {
  blockers.push({
    sheet: "Course Metadata",
    row: 0,
    column: 0,
    header: "",
    expected: "5 metadata rows with language columns",
    actual: `${courseMetadataRows.length} rows, ${courseMetadataColumnCount} columns`,
  });
}
const remoteCourseMetadataRows = await readSheetValues({
  spreadsheetId: manifest.google_sheet_id,
  sheetName: "Course Metadata",
  rowCount: courseMetadataRows.length,
  columnCount: courseMetadataColumnCount,
});
for (let rowIndex = 0; rowIndex < courseMetadataRows.length; rowIndex += 1) {
  for (let columnIndex = 0; columnIndex < courseMetadataColumnCount; columnIndex += 1) {
    checkedCells += 1;
    const expected = normalizedCell(courseMetadataRows[rowIndex]?.[columnIndex]);
    const actual = normalizedCell(remoteCourseMetadataRows[rowIndex]?.[columnIndex]);
    if (expected !== actual) {
      blockers.push({
        sheet: "Course Metadata",
        row: rowIndex + 1,
        column: columnIndex + 1,
        header: courseMetadataRows[0]?.[columnIndex] ?? "",
        expected,
        actual,
      });
      if (blockers.length >= 80) break;
    }
  }
  if (blockers.length >= 80) break;
}

const currentWorkbookSha = await sha256File(workbookPath);
const nextManifest = {
  ...manifest,
  google_sheet_readback_status: blockers.length === 0 ? "verified" : "failed",
  google_sheet_readback_verified_at: new Date().toISOString(),
  google_sheet_readback_sample_count: checkedCells,
  google_sheet_readback_workbook_sha256: currentWorkbookSha,
  google_sheet_readback_errors: blockers,
  google_sheet_readback_method: "sheets_values_hsk_buyer_facing_main_full_plus_course_metadata",
};
await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

if (blockers.length > 0) {
  console.error(`HSK Google Sheet readback failed: ${blockers.length} mismatch(es).`);
  for (const blocker of blockers.slice(0, 20)) {
    console.error(
      `row=${blocker.row} col=${blocker.column} header=${blocker.header} expected=${JSON.stringify(
        blocker.expected
      )} actual=${JSON.stringify(blocker.actual)}`
    );
  }
  console.error(`delivery_manifest=${manifestPath}`);
  process.exit(1);
}

console.log(
  `HSK Google Sheet readback OK: release=${releaseId}, rows=${rowCount}, columns=${columnCount}, cells=${checkedCells}, method=sheets_values_hsk_buyer_facing_main_full_plus_course_metadata`
);
console.log(`delivery_manifest=${manifestPath}`);
