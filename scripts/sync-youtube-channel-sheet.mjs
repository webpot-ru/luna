#!/usr/bin/env node
import { createSign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const DEFAULT_SPREADSHEET_ID = "1Uw5mO7Xy1asF-WlbRkphUCftaGDP6uVtu6xGgXD00_I";
const DEFAULT_SHEET_NAME = "YouTube каналы";
const DEFAULT_ASSIGNMENT_REPORT = path.join(
  projectRoot,
  "outputs",
  "youtube-channel-assets",
  "youtube-channel-language-assignment-20260620.json"
);
const DEFAULT_OAUTH_CLIENT_FILE = path.join(projectRoot, ".secrets", "google-oauth-client.json");
const DEFAULT_OAUTH_TOKEN_FILE = path.join(projectRoot, ".secrets", "google-oauth-token.json");
const DEFAULT_SCOPE = process.env.GOOGLE_DRIVE_SCOPE || "https://www.googleapis.com/auth/spreadsheets";
const START_ROW = 14;
const END_ROW = 52;
const COLUMN_COUNT = 16;

function parseArgs(argv) {
  const options = {
    apply: false,
    confirmGoogleSheetWrite: false,
    authMode: process.env.GOOGLE_DRIVE_AUTH_MODE || "auto",
    spreadsheetId: process.env.YOUTUBE_CHANNEL_SHEET_ID || DEFAULT_SPREADSHEET_ID,
    sheetName: process.env.YOUTUBE_CHANNEL_SHEET_NAME || DEFAULT_SHEET_NAME,
    assignmentReport: DEFAULT_ASSIGNMENT_REPORT,
    oauthClientFile: process.env.GOOGLE_OAUTH_CLIENT_FILE || DEFAULT_OAUTH_CLIENT_FILE,
    oauthTokenFile: process.env.GOOGLE_OAUTH_TOKEN_FILE || DEFAULT_OAUTH_TOKEN_FILE,
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--confirm-google-sheet-write") {
      options.confirmGoogleSheetWrite = true;
    } else if (arg.startsWith("--auth-mode=")) {
      options.authMode = arg.slice("--auth-mode=".length).trim();
    } else if (arg.startsWith("--spreadsheet-id=")) {
      options.spreadsheetId = arg.slice("--spreadsheet-id=".length).trim();
    } else if (arg.startsWith("--sheet-name=")) {
      options.sheetName = arg.slice("--sheet-name=".length).trim();
    } else if (arg.startsWith("--assignment-report=")) {
      options.assignmentReport = path.resolve(projectRoot, arg.slice("--assignment-report=".length).trim());
    } else if (arg.startsWith("--oauth-client-file=")) {
      options.oauthClientFile = path.resolve(projectRoot, arg.slice("--oauth-client-file=".length).trim());
    } else if (arg.startsWith("--oauth-token-file=")) {
      options.oauthTokenFile = path.resolve(projectRoot, arg.slice("--oauth-token-file=".length).trim());
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/sync-youtube-channel-sheet.mjs
  node scripts/sync-youtube-channel-sheet.mjs --apply --confirm-google-sheet-write

Default behavior is dry-run only. Apply mode updates '${DEFAULT_SHEET_NAME}'!A${START_ROW}:P${END_ROW}
from outputs/youtube-channel-assets/youtube-channel-language-assignment-20260620.json and then reads it back.

The script never writes local token paths, OAuth token contents, client secrets or contact-email secrets into the Sheet.`);
}

function fail(message) {
  throw new Error(message);
}

function base64url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function quoteSheetName(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`;
}

function normalizeCell(value) {
  return String(value ?? "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function buildSheetRows(report) {
  if (!Array.isArray(report.assignment)) fail("Assignment report is missing assignment[].");
  if (report.assignment.length !== 39) fail(`Expected 39 assignment rows, got ${report.assignment.length}.`);

  const rows = report.assignment.map((item, index) => {
    const priority = String(index + 13);
    const currentHandle = item.currentHandleDisplay || (item.currentHandle ? `@${item.currentHandle}` : "(no handle)");
    const targetHandle = `@${item.targetHandle}`;
    const handleStatus =
      currentHandle === "(no handle)"
        ? "target handle not verified; current channel has no public handle; manual Studio handle setup needed"
        : "target handle not verified; current handle API-readback 2026-06-20; manual Studio rename needed";
    const ready = item.oldContentRisk
      ? "assigned; token ready; API branding pending; old content/title review required"
      : "assigned; token ready; API branding pending; manual Studio fields pending";
    const checked = item.oldContentRisk
      ? `assigned from ${item.tokenKey}; API readback 2026-06-20; existing non-Luna channel/content risk; do public cleanup before launch`
      : `assigned from ${item.tokenKey}; API readback 2026-06-20; Studio branding not yet published`;

    return [
      priority,
      currentHandle,
      targetHandle,
      handleStatus,
      item.channelId,
      item.currentPublicUrl,
      item.market,
      String(item.code || "").toUpperCase(),
      item.siteCoursesUrl,
      item.finalChannelName,
      item.desiredDescription,
      item.shortDescription,
      item.bannerAsset,
      item.avatarAsset,
      ready,
      checked,
    ].map(normalizeCell);
  });

  validateRows(rows);
  return rows;
}

function validateRows(rows) {
  if (rows.length !== END_ROW - START_ROW + 1) fail(`Expected ${END_ROW - START_ROW + 1} rows, got ${rows.length}.`);
  const seenCodes = new Set();
  const seenChannelIds = new Set();
  for (const [index, row] of rows.entries()) {
    const sheetRow = START_ROW + index;
    if (row.length !== COLUMN_COUNT) fail(`Row ${sheetRow} has ${row.length} cells, expected ${COLUMN_COUNT}.`);
    const text = row.join(" ");
    if (/oauth|refresh_token|access_token|client_secret|\.local\/|\.secrets\//i.test(text)) {
      fail(`Row ${sheetRow} contains a secret-like local access string; refusing to write.`);
    }
    if (!/^UC[A-Za-z0-9_-]+$/.test(row[4])) fail(`Row ${sheetRow} has invalid channel id: ${row[4]}`);
    if (!row[7] || row[7] === "UNASSIGNED") fail(`Row ${sheetRow} still has an unassigned support code.`);
    if (seenCodes.has(row[7])) fail(`Duplicate support code in rows: ${row[7]}`);
    if (seenChannelIds.has(row[4])) fail(`Duplicate channel id in rows: ${row[4]}`);
    seenCodes.add(row[7]);
    seenChannelIds.add(row[4]);
  }
}

async function loadOAuthClient(clientFile) {
  const parsed = JSON.parse(await readFile(clientFile, "utf8"));
  const client = parsed.installed || parsed.web;
  if (!client?.client_id || !client?.client_secret) fail("OAuth client file is missing client_id/client_secret.");
  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function refreshOAuthToken({ client, token, tokenFile }) {
  if (!token.refresh_token) fail("OAuth token has no refresh_token. Re-authorize Google Drive/Sheets access first.");
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
  await writeFile(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, { mode: 0o600 });
  return nextToken.access_token;
}

async function getOAuthAccessToken({ oauthClientFile, oauthTokenFile }) {
  const client = await loadOAuthClient(oauthClientFile);
  const token = JSON.parse(await readFile(oauthTokenFile, "utf8"));
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  return refreshOAuthToken({ client, token, tokenFile: oauthTokenFile });
}

async function loadServiceAccount({ requireCredentials }) {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!rawJson && !credentialsPath) {
    if (requireCredentials) fail("Missing Google service-account credentials.");
    return null;
  }
  const parsed = rawJson ? JSON.parse(rawJson) : JSON.parse(await readFile(credentialsPath, "utf8"));
  if (parsed.type !== "service_account" || !parsed.client_email || !parsed.private_key) {
    fail("Google service-account credentials are incomplete.");
  }
  return parsed;
}

async function getServiceAccountAccessToken(serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(serviceAccount.private_key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64url(signature)}`,
    }),
  });
  if (!response.ok) fail(`Google token request failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  if (!data.access_token) fail("Google token response did not include access_token.");
  return data.access_token;
}

async function getAccessToken(options) {
  if (options.authMode === "oauth") return getOAuthAccessToken(options);
  if (options.authMode === "service-account") {
    return getServiceAccountAccessToken(await loadServiceAccount({ requireCredentials: true }), DEFAULT_SCOPE);
  }
  try {
    return await getOAuthAccessToken(options);
  } catch (error) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return getServiceAccountAccessToken(await loadServiceAccount({ requireCredentials: true }), DEFAULT_SCOPE);
    }
    throw error;
  }
}

async function sheetsUpdateValues({ accessToken, spreadsheetId, range, values }) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("valueInputOption", "USER_ENTERED");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values,
    }),
  });
  if (!response.ok) fail(`Google Sheets values.update failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function sheetsGetValues({ accessToken, spreadsheetId, range }) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) fail(`Google Sheets values.get failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.values ?? [];
}

function compareReadback(expectedRows, actualRows) {
  if (actualRows.length !== expectedRows.length) {
    fail(`Readback row count mismatch: expected ${expectedRows.length}, got ${actualRows.length}.`);
  }
  for (let rowIndex = 0; rowIndex < expectedRows.length; rowIndex += 1) {
    const expected = expectedRows[rowIndex];
    const actual = actualRows[rowIndex] || [];
    for (let colIndex = 0; colIndex < expected.length; colIndex += 1) {
      const left = normalizeCell(expected[colIndex]);
      const right = normalizeCell(actual[colIndex]);
      if (left !== right) {
        const row = START_ROW + rowIndex;
        const col = String.fromCharCode(65 + colIndex);
        fail(`Readback mismatch at ${col}${row}: expected ${JSON.stringify(left)}, got ${JSON.stringify(right)}.`);
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = await readJson(options.assignmentReport);
  const rows = buildSheetRows(report);
  const range = `${quoteSheetName(options.sheetName)}!A${START_ROW}:P${END_ROW}`;

  console.log(`sheet=${options.spreadsheetId}`);
  console.log(`range=${range}`);
  console.log(`rows=${rows.length}`);
  console.log(`first=${rows[0][7]} ${rows[0][1]} -> ${rows[0][2]}`);
  console.log(`last=${rows.at(-1)[7]} ${rows.at(-1)[1]} -> ${rows.at(-1)[2]}`);

  if (!options.apply) {
    console.log("dry_run=true");
    console.log("next=rerun with --apply --confirm-google-sheet-write to update Google Sheets");
    return;
  }
  if (!options.confirmGoogleSheetWrite) {
    fail("Refusing external Google Sheet write without --confirm-google-sheet-write.");
  }

  const accessToken = await getAccessToken(options);
  const update = await sheetsUpdateValues({ accessToken, spreadsheetId: options.spreadsheetId, range, values: rows });
  const readback = await sheetsGetValues({ accessToken, spreadsheetId: options.spreadsheetId, range });
  compareReadback(rows, readback);

  console.log(`updatedRange=${update.updatedRange}`);
  console.log(`updatedCells=${update.updatedCells}`);
  console.log("readback=pass");
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
