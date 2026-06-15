#!/usr/bin/env node
import { createHash, createSign } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile } from "@oai/artifact-tool";
import { assertSafeSetId, psqlJson, sqlString } from "./lib/qa-utils.mjs";
import { languageOrder } from "./lib/language-order.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outputDir = path.join(projectRoot, "outputs", "google-sheets");
const DEFAULT_SCOPE = process.env.GOOGLE_DRIVE_SCOPE || "https://www.googleapis.com/auth/drive.file";
const DEFAULT_OAUTH_CLIENT_FILE = path.join(projectRoot, ".secrets", "google-oauth-client.json");
const DEFAULT_OAUTH_TOKEN_FILE = path.join(projectRoot, ".secrets", "google-oauth-token.json");

const args = process.argv.slice(2);
const setId = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const sampleSize = Number(args.find((arg) => arg.startsWith("--sample-size="))?.split("=")[1] ?? 24);
const readbackMode = args.find((arg) => arg.startsWith("--readback-mode="))?.split("=")[1] ?? "auto";
const authMode = args.find((arg) => arg.startsWith("--auth-mode="))?.split("=")[1] ?? process.env.GOOGLE_DRIVE_AUTH_MODE ?? "auto";
const oauthClientFile =
  args.find((arg) => arg.startsWith("--oauth-client-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_CLIENT_FILE ??
  DEFAULT_OAUTH_CLIENT_FILE;
const oauthTokenFile =
  args.find((arg) => arg.startsWith("--oauth-token-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_TOKEN_FILE ??
  DEFAULT_OAUTH_TOKEN_FILE;

if (!setId) {
  throw new Error(
    "Usage: node scripts/check-google-sheet-readback.mjs <set_id> [--dry-run] [--sample-size=N] [--readback-mode=auto|sheets|drive-export]"
  );
}
assertSafeSetId(setId);
if (!new Set(["auto", "sheets", "drive-export"]).has(readbackMode)) {
  throw new Error(`Unsupported --readback-mode=${readbackMode}. Expected auto, sheets, or drive-export.`);
}

function fail(message) {
  throw new Error(message);
}

function base64url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

function normalizedCell(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function getCell(values, rowIndex, colIndex) {
  return normalizedCell(values[rowIndex]?.[colIndex]);
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function loadDeliveryManifest() {
  const manifests = [];
  for (const file of (await readdir(outputDir)).filter((name) => name.endsWith("_final_delivery.json"))) {
    const manifestPath = path.join(outputDir, file);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (manifest.set_id === setId) manifests.push({ manifestPath, manifest });
  }
  if (manifests.length !== 1) {
    fail(`Expected exactly one final delivery manifest for ${setId}, got ${manifests.length}`);
  }
  return manifests[0];
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
  await writeFile(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, { mode: 0o600 });
  return nextToken.access_token;
}

async function getOAuthAccessToken() {
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

async function getAccessToken() {
  if (authMode === "oauth") return getOAuthAccessToken();
  if (authMode === "service-account") {
    return getServiceAccountAccessToken(await loadServiceAccount({ requireCredentials: true }), DEFAULT_SCOPE);
  }
  try {
    return await getOAuthAccessToken();
  } catch (error) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return getServiceAccountAccessToken(await loadServiceAccount({ requireCredentials: true }), DEFAULT_SCOPE);
    }
    throw error;
  }
}

async function sheetsGetValues({ accessToken, spreadsheetId, range }) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Google Sheets values.get failed for ${range} (${response.status}): ${text}`);
    error.status = response.status;
    error.responseText = text;
    throw error;
  }
  const data = await response.json();
  return data.values ?? [];
}

function isSheetsApiDisabledError(error) {
  return (
    error?.status === 403 &&
    /sheets\.googleapis\.com|SERVICE_DISABLED|Google Sheets API has not been used|it is disabled/i.test(
      String(error.responseText ?? error.message ?? "")
    )
  );
}

async function driveExportWorkbook({ accessToken, fileId }) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`);
  url.searchParams.set("mimeType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) fail(`Google Drive export failed for ${fileId} (${response.status}): ${await response.text()}`);
  return SpreadsheetFile.importXlsx(Buffer.from(await response.arrayBuffer()));
}

function parseInspectTableValues(inspectResult, range) {
  for (const line of String(inspectResult.ndjson ?? "").split("\n")) {
    if (!line.trim()) continue;
    const payload = JSON.parse(line);
    if (payload.kind === "table" && Array.isArray(payload.values)) return payload.values;
  }
  fail(`Drive export readback did not return table values for ${range}`);
}

async function workbookGetValues({ workbook, range, rows, cols }) {
  const inspectResult = await workbook.inspect({
    kind: "table",
    range,
    include: "values",
    tableMaxRows: rows,
    tableMaxCols: cols,
  });
  return parseInspectTableValues(inspectResult, range);
}

function buildReadbackClient({ accessToken, spreadsheetId, initialMode }) {
  let method = initialMode === "drive-export" ? "drive_export_xlsx" : "sheets_values";
  let exportedWorkbook = null;

  async function getExportedWorkbook() {
    if (!exportedWorkbook) exportedWorkbook = await driveExportWorkbook({ accessToken, fileId: spreadsheetId });
    return exportedWorkbook;
  }

  return {
    get method() {
      return method;
    },
    async getValues({ range, rows, cols }) {
      if (method === "drive_export_xlsx") {
        return workbookGetValues({ workbook: await getExportedWorkbook(), range, rows, cols });
      }

      try {
        return await sheetsGetValues({ accessToken, spreadsheetId, range });
      } catch (error) {
        if (initialMode === "auto" && isSheetsApiDisabledError(error)) {
          method = "drive_export_xlsx";
          return workbookGetValues({ workbook: await getExportedWorkbook(), range, rows, cols });
        }
        throw error;
      }
    },
  };
}

async function fetchExpectedRows() {
  return psqlJson(`
with active_items as (
  select
    msm.display_order,
    msm.meaning_id,
    mu.english_with_article,
    mu.canonical_english
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
),
context_examples as (
  select example_id, meaning_id, canonical_example_en
  from meaning_examples
  where set_id = ${sqlString(setId)}
    and example_role = 'context'
),
language_entries as (
  select
    le.meaning_id,
    le.language_code,
    le.native_word,
    coalesce(le.word_with_article_or_marker, le.native_word) as word,
    le.transcription
  from meaning_language_entries le
  where le.meaning_id in (select meaning_id from active_items)
),
example_translations as (
  select
    ce.example_id,
    ce.meaning_id,
    et.language_code,
    et.example_text
  from context_examples ce
  join meaning_example_translations et on et.example_id = ce.example_id
)
select coalesce(json_agg(row_to_json(result_rows)), '[]'::json)
from (
  select
    ai.display_order,
    ai.meaning_id,
    ai.english_with_article,
    ai.canonical_english,
    ce.example_id as context_example_id,
    ce.canonical_example_en,
    coalesce(jsonb_object_agg(le.language_code, le.word) filter (where le.language_code is not null), '{}'::jsonb) as words,
    coalesce(jsonb_object_agg(et.language_code, et.example_text) filter (where et.language_code is not null), '{}'::jsonb) as examples,
    coalesce(jsonb_object_agg(le.language_code, le.transcription) filter (where le.language_code is not null), '{}'::jsonb) as transcriptions
  from active_items ai
  left join context_examples ce on ce.meaning_id = ai.meaning_id
  left join language_entries le on le.meaning_id = ai.meaning_id
  left join example_translations et on et.example_id = ce.example_id
  group by
    ai.display_order,
    ai.meaning_id,
    ai.english_with_article,
    ai.canonical_english,
    ce.example_id,
    ce.canonical_example_en
  order by ai.display_order
) result_rows;
`);
}

function expectedValue(row, block, dbCode) {
  if (dbCode === "EN" && block === "word") return row.english_with_article ?? "";
  if (dbCode === "EN" && block === "example") return row.canonical_example_en ?? "";
  if (block === "word") return row.words?.[dbCode] ?? "";
  if (block === "example") return row.examples?.[dbCode] ?? "";
  return row.transcriptions?.[dbCode] ?? "";
}

function sampleIndexes(rowCount, maxSamples) {
  const indexes = new Set([0, Math.floor(rowCount / 2), rowCount - 1].filter((index) => index >= 0 && index < rowCount));
  for (let index = 0; index < rowCount && indexes.size < maxSamples; index += Math.max(1, Math.floor(rowCount / maxSamples))) {
    indexes.add(index);
  }
  return [...indexes].sort((a, b) => a - b).slice(0, maxSamples);
}

const { manifestPath, manifest } = await loadDeliveryManifest();
const workbookPath = manifest.workbook_path ? path.resolve(manifest.workbook_path) : "";
if (!workbookPath) fail(`Manifest ${manifestPath} missing workbook_path.`);
const currentWorkbookSha = await sha256File(workbookPath);
const blockers = [];

if (manifest.export_mode !== "final") blockers.push(`manifest export_mode=${manifest.export_mode}, expected final`);
if (!manifest.google_sheet_id) blockers.push("manifest missing google_sheet_id");
if (!manifest.main_sheet) blockers.push("manifest missing main_sheet");
if (manifest.workbook_sha256 !== currentWorkbookSha) blockers.push("manifest workbook_sha256 does not match current workbook file");

if (blockers.length === 0) {
  const accessToken = await getAccessToken();
  const readbackClient = buildReadbackClient({
    accessToken,
    spreadsheetId: manifest.google_sheet_id,
    initialMode: readbackMode,
  });
  const expectedRows = await fetchExpectedRows();
  const codes = languageOrder.map(([spreadsheetCode]) => spreadsheetCode);
  const expectedHeaders = [
    ...codes,
    ...codes.map((code) => `${code} example`),
    ...codes.map((code) => `${code} transcription`),
  ];
  const lastMainCol = colName(languageOrder.length * 3 - 1);
  const mainValues = await readbackClient.getValues({
    range: `${quoteSheet(manifest.main_sheet)}!A1:${lastMainCol}${expectedRows.length + 1}`,
    rows: expectedRows.length + 1,
    cols: languageOrder.length * 3,
  });

  if (mainValues.length !== expectedRows.length + 1) {
    blockers.push(`main sheet row count ${mainValues.length - 1}, expected ${expectedRows.length}`);
  }
  for (const [index, header] of expectedHeaders.entries()) {
    if (getCell(mainValues, 0, index) !== header) {
      blockers.push(`main header mismatch at ${colName(index)}1: got "${getCell(mainValues, 0, index)}", expected "${header}"`);
    }
  }

  const cardMetadata = await readbackClient.getValues({
    range: "'Card Metadata'!A1:E1000",
    rows: 1000,
    cols: 5,
  });
  const cardKeyIndex = cardMetadata[0]?.indexOf("card_key") ?? -1;
  if (cardKeyIndex === -1) {
    blockers.push("Card Metadata missing card_key header");
  } else {
    for (const [rowIndex, row] of expectedRows.entries()) {
      const expectedCardKey = `${setId}::${row.meaning_id}`;
      if (getCell(cardMetadata, rowIndex + 1, cardKeyIndex) !== expectedCardKey) {
        blockers.push(`Card Metadata row ${rowIndex + 2} card_key mismatch: got "${getCell(cardMetadata, rowIndex + 1, cardKeyIndex)}", expected "${expectedCardKey}"`);
        break;
      }
    }
  }

  const languageValues = await readbackClient.getValues({
    range: "'_languages'!A1:E60",
    rows: 60,
    cols: 5,
  });
  const languageRows = languageValues.slice(1);
  if (languageRows.length !== languageOrder.length) blockers.push(`_languages row count ${languageRows.length}, expected ${languageOrder.length}`);
  for (const [index, [spreadsheetCode, dbCode]] of languageOrder.entries()) {
    if (getCell(languageRows, index, 1) !== spreadsheetCode || getCell(languageRows, index, 2) !== dbCode) {
      blockers.push(
        `_languages row ${index + 2} mismatch: got ${getCell(languageRows, index, 1)}/${getCell(languageRows, index, 2)}, expected ${spreadsheetCode}/${dbCode}`
      );
      break;
    }
  }

  const preferredLanguages = ["EN", "FR", "RU", "ZH", "SV", "PT-BR", "EN-GB"];
  const sampleLanguages = preferredLanguages
    .map((code) => languageOrder.findIndex(([, dbCode]) => dbCode === code))
    .filter((index) => index >= 0);
  const rowSamples = sampleIndexes(expectedRows.length, Math.max(3, Math.min(sampleSize, expectedRows.length)));
  let checkedSamples = 0;
  for (const rowIndex of rowSamples) {
    const expectedRow = expectedRows[rowIndex];
    for (const langIndex of sampleLanguages) {
      const [, dbCode] = languageOrder[langIndex];
      for (const [blockName, blockOffset] of [
        ["word", 0],
        ["example", languageOrder.length],
        ["transcription", languageOrder.length * 2],
      ]) {
        const colIndex = blockOffset + langIndex;
        const got = getCell(mainValues, rowIndex + 1, colIndex);
        const expected = normalizedCell(expectedValue(expectedRow, blockName, dbCode));
        checkedSamples += 1;
        if (got !== expected) {
          blockers.push(
            `${manifest.main_sheet}!${colName(colIndex)}${rowIndex + 2} mismatch (${expectedRow.meaning_id}/${dbCode}/${blockName}): got "${got}", expected "${expected}"`
          );
        }
      }
    }
  }

  if (!dryRun) {
    const nextManifest = {
      ...manifest,
      google_sheet_readback_status: blockers.length === 0 ? "verified" : "failed",
      google_sheet_readback_verified_at: new Date().toISOString(),
      google_sheet_readback_sample_count: checkedSamples,
      google_sheet_readback_workbook_sha256: currentWorkbookSha,
      google_sheet_readback_method: readbackClient.method,
      google_sheet_readback_errors: blockers,
    };
    await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  }
}

if (blockers.length > 0) {
  console.error(`Google Sheet readback failed for ${setId}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 80)) console.error(blocker);
  const hidden = blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`Google Sheet readback OK for ${setId}: manifest=${manifestPath}`);
