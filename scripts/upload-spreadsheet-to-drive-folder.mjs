#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, createSign } from "node:crypto";
import http from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive.file";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const DEFAULT_DRIVE_FOLDER_ID = "1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei";
const DEFAULT_OAUTH_CLIENT_FILE = path.join(projectRoot, ".secrets", "google-oauth-client.json");
const DEFAULT_OAUTH_TOKEN_FILE = path.join(projectRoot, ".secrets", "google-oauth-token.json");

function parseArgs(argv) {
  const options = {
    authorize: false,
    authMode: process.env.GOOGLE_DRIVE_AUTH_MODE || "auto",
    dryRun: false,
    convert: true,
    noBrowser: false,
    scope: process.env.GOOGLE_DRIVE_SCOPE || DEFAULT_SCOPE,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID,
    oauthClientFile: process.env.GOOGLE_OAUTH_CLIENT_FILE || DEFAULT_OAUTH_CLIENT_FILE,
    oauthTokenFile: process.env.GOOGLE_OAUTH_TOKEN_FILE || DEFAULT_OAUTH_TOKEN_FILE,
    title: "",
    fileId: "",
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--authorize") {
      options.authorize = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-browser") {
      options.noBrowser = true;
    } else if (arg === "--no-convert") {
      options.convert = false;
    } else if (arg.startsWith("--auth-mode=")) {
      options.authMode = arg.slice("--auth-mode=".length).trim();
    } else if (arg.startsWith("--folder-id=")) {
      options.folderId = arg.slice("--folder-id=".length).trim();
    } else if (arg.startsWith("--file-id=")) {
      options.fileId = arg.slice("--file-id=".length).trim();
    } else if (arg.startsWith("--update-file-id=")) {
      options.fileId = arg.slice("--update-file-id=".length).trim();
    } else if (arg.startsWith("--oauth-client-file=")) {
      options.oauthClientFile = arg.slice("--oauth-client-file=".length).trim();
    } else if (arg.startsWith("--oauth-token-file=")) {
      options.oauthTokenFile = arg.slice("--oauth-token-file=".length).trim();
    } else if (arg.startsWith("--title=")) {
      options.title = arg.slice("--title=".length).trim();
    } else if (arg.startsWith("--scope=")) {
      options.scope = arg.slice("--scope=".length).trim();
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function printHelp() {
  console.log(`Usage:
  node scripts/upload-spreadsheet-to-drive-folder.mjs <workbook.xlsx> --folder-id=<drive_folder_id> --title=<google_sheet_title>
  node scripts/upload-spreadsheet-to-drive-folder.mjs <workbook.xlsx> --file-id=<existing_google_sheet_id> --title=<google_sheet_title>
  node scripts/upload-spreadsheet-to-drive-folder.mjs --authorize --oauth-client-file=<client_secret.json>

Environment:
  GOOGLE_DRIVE_FOLDER_ID           Target Drive folder id. Defaults to the FlashcardsLuna words folder.
  GOOGLE_OAUTH_CLIENT_FILE         Preferred: Desktop OAuth client JSON file. Defaults to .secrets/google-oauth-client.json.
  GOOGLE_OAUTH_TOKEN_FILE          Local token cache. Defaults to .secrets/google-oauth-token.json.
  GOOGLE_DRIVE_AUTH_MODE           auto | oauth | service-account. Defaults to auto.
  GOOGLE_APPLICATION_CREDENTIALS   Fallback: service-account JSON key.
  GOOGLE_SERVICE_ACCOUNT_JSON      Fallback: raw service-account JSON string.
  GOOGLE_DRIVE_SCOPE               Optional OAuth scope. Defaults to ${DEFAULT_SCOPE}.

Notes:
  - Default mode converts the .xlsx into a native Google Sheets file.
  - Use --file-id to update an existing Google Sheet instead of creating a duplicate.
  - For a normal user's My Drive folder, use OAuth Desktop client mode.
  - Service-account mode is only a fallback for Shared Drive / explicitly shared setups.
  - Use --dry-run to validate local inputs without network or credentials.
  - Use --no-convert only if a raw .xlsx file should be uploaded instead of a native Sheet.`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function base64url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function assertFolderId(folderId) {
  if (!folderId) fail("Missing Drive folder id. Use --folder-id or GOOGLE_DRIVE_FOLDER_ID.");
  if (!/^[A-Za-z0-9_-]+$/.test(folderId)) {
    fail(`Drive folder id looks invalid: ${folderId}`);
  }
}

async function loadServiceAccount({ requireCredentials }) {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!rawJson && !credentialsPath) {
    if (requireCredentials) {
      fail(
        "Missing Google service-account credentials. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON."
      );
    }
    return null;
  }

  let parsed;
  try {
    parsed = rawJson ? JSON.parse(rawJson) : JSON.parse(await readFile(credentialsPath, "utf8"));
  } catch (error) {
    fail(`Cannot parse Google service-account credentials: ${error.message}`);
  }

  if (parsed.type !== "service_account") fail("Google credentials must be a service_account key.");
  if (!parsed.client_email) fail("Google service-account key is missing client_email.");
  if (!parsed.private_key) fail("Google service-account key is missing private_key.");

  return parsed;
}

async function getServiceAccountAccessToken(serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(serviceAccount.private_key);
  const assertion = `${signingInput}.${base64url(signature)}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google OAuth token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) fail("Google OAuth response did not include access_token.");
  return data.access_token;
}

async function loadOAuthClient(clientFile) {
  if (!clientFile) fail("Missing OAuth client file. Use --oauth-client-file or GOOGLE_OAUTH_CLIENT_FILE.");

  let parsed;
  try {
    parsed = JSON.parse(await readFile(clientFile, "utf8"));
  } catch (error) {
    fail(`Cannot parse OAuth client file: ${error.message}`);
  }

  const client = parsed.installed || parsed.web;
  if (!client) fail("OAuth client file must contain an installed or web client.");
  if (!client.client_id) fail("OAuth client file is missing client_id.");
  if (!client.client_secret) fail("OAuth client file is missing client_secret.");

  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    authUri: client.auth_uri || "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

function openBrowser(url) {
  try {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const command = isWin ? "cmd" : isMac ? "open" : "xdg-open";
    const args = isWin ? ["/c", "start", '""', url] : [url];
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      shell: isWin,
    });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function startOAuthListener({ state }) {
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      if (requestUrl.pathname !== "/oauth2callback") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const returnedState = requestUrl.searchParams.get("state");
      const error = requestUrl.searchParams.get("error");
      const code = requestUrl.searchParams.get("code");

      if (returnedState !== state) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("OAuth state mismatch. You can close this tab.");
        server.close();
        rejectCode(new Error("OAuth state mismatch."));
        return;
      }

      if (error) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end(`OAuth error: ${error}. You can close this tab.`);
        server.close();
        rejectCode(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("OAuth callback did not include a code. You can close this tab.");
        server.close();
        rejectCode(new Error("OAuth callback did not include a code."));
        return;
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end("<html><body><h1>LunaCards authorized.</h1><p>You can close this tab.</p></body></html>");
      server.close();
      resolveCode(code);
    });

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();
  return { port: address.port, codePromise };
}

async function exchangeOAuthCode({ client, code, redirectUri }) {
  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`OAuth code exchange failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function refreshOAuthToken({ client, token, tokenFile }) {
  if (!token.refresh_token) {
    fail(`OAuth token has no refresh_token. Run --authorize again and allow offline access.`);
  }

  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });

  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`OAuth token refresh failed (${response.status}): ${text}`);
  }

  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  await saveOAuthToken(tokenFile, nextToken);
  return nextToken.access_token;
}

async function saveOAuthToken(tokenFile, token) {
  await mkdir(path.dirname(tokenFile), { recursive: true });
  await writeFile(tokenFile, `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 });
}

async function authorizeOAuth({ clientFile, tokenFile, scope, noBrowser }) {
  const client = await loadOAuthClient(clientFile);
  const state = Math.random().toString(36).slice(2);
  const { port, codePromise } = await startOAuthListener({ state });
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const authUrl = new URL(client.authUri);
  authUrl.searchParams.set("client_id", client.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  console.log("Open this URL to authorize LunaCards Drive upload:");
  console.log(authUrl.toString());

  if (!noBrowser) {
    const opened = openBrowser(authUrl.toString());
    if (!opened) console.log("Browser did not open automatically; paste the URL manually.");
  }

  const code = await codePromise;
  const token = await exchangeOAuthCode({ client, code, redirectUri });
  const storedToken = {
    ...token,
    expires_at: Date.now() + (Number(token.expires_in || 3600) - 60) * 1000,
  };
  await saveOAuthToken(tokenFile, storedToken);

  console.log("OAuth authorization completed");
  console.log(`token_file=${tokenFile}`);
}

async function getOAuthAccessToken({ clientFile, tokenFile, scope }) {
  const client = await loadOAuthClient(clientFile);

  let token;
  try {
    token = JSON.parse(await readFile(tokenFile, "utf8"));
  } catch {
    fail(`OAuth token file is missing. Run: node scripts/upload-spreadsheet-to-drive-folder.mjs --authorize --oauth-client-file="${clientFile}"`);
  }

  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) {
    return token.access_token;
  }

  return refreshOAuthToken({ client, token, tokenFile });
}

async function getAccessToken(options) {
  if (options.authMode === "oauth") {
    return getOAuthAccessToken({
      clientFile: options.oauthClientFile,
      tokenFile: options.oauthTokenFile,
      scope: options.scope,
    });
  }

  if (options.authMode === "service-account") {
    const serviceAccount = await loadServiceAccount({ requireCredentials: true });
    return getServiceAccountAccessToken(serviceAccount, options.scope);
  }

  if (options.oauthClientFile) {
    return getOAuthAccessToken({
      clientFile: options.oauthClientFile,
      tokenFile: options.oauthTokenFile,
      scope: options.scope,
    });
  }

  const serviceAccount = await loadServiceAccount({ requireCredentials: true });
  return getServiceAccountAccessToken(serviceAccount, options.scope);
}

function assertGoogleFileId(fileId) {
  if (!fileId) return;
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
    fail(`Google file id looks invalid: ${fileId}`);
  }
}

async function uploadWorkbook({ accessToken, workbookPath, title, folderId, convert, fileId }) {
  const fileBuffer = await readFile(workbookPath);
  const boundary = `lunacards_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = {
    name: title,
    mimeType: convert ? GOOGLE_SHEET_MIME : XLSX_MIME,
  };
  if (!fileId) metadata.parents = [folderId];

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\ncontent-type: ${XLSX_MIME}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadUrl = new URL(
    fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}`
      : "https://www.googleapis.com/upload/drive/v3/files"
  );
  uploadUrl.searchParams.set("uploadType", "multipart");
  uploadUrl.searchParams.set("supportsAllDrives", "true");
  uploadUrl.searchParams.set("fields", "id,name,mimeType,parents,webViewLink");
  if (fileId) uploadUrl.searchParams.set("addParents", folderId);

  const response = await fetch(uploadUrl, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive ${fileId ? "update" : "upload"} failed (${response.status}): ${text}`);
  }

  return response.json();
}

function isSheetsApiDisabledResponse(status, text) {
  return (
    status === 403 &&
    /sheets\.googleapis\.com|SERVICE_DISABLED|Google Sheets API has not been used|it is disabled/i.test(String(text))
  );
}

async function assertExistingSheetIsReadbackCapable({ accessToken, fileId }) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "spreadsheetId,properties(title)");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (response.ok) return;

  const text = await response.text();
  if (isSheetsApiDisabledResponse(response.status, text)) {
    fail(
      [
        "Google Sheets API is disabled for the current OAuth project.",
        "Refusing to update an existing native Google Sheet through Drive media upload because that path cannot be read back safely and may corrupt the sheet contents.",
        "Enable Google Sheets API for the OAuth project, then rerun the upload/readback step.",
        text,
      ].join("\n")
    );
  }
  fail(`Google Sheets preflight failed for ${fileId} (${response.status}): ${text}`);
}

async function verifyDriveFile({ accessToken, fileId, title, folderId }) {
  const fileUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  fileUrl.searchParams.set("supportsAllDrives", "true");
  fileUrl.searchParams.set("fields", "id,name,mimeType,parents,webViewLink");

  const response = await fetch(fileUrl, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive verification failed (${response.status}): ${text}`);
  }

  const file = await response.json();
  if (file.name !== title) {
    fail(`Google Drive verification failed: expected title "${title}", got "${file.name}"`);
  }
  if (!Array.isArray(file.parents) || !file.parents.includes(folderId)) {
    fail(`Google Drive verification failed: uploaded file is not in folder ${folderId}`);
  }

  return file;
}

function deliveryManifestPath(workbookPath) {
  return workbookPath.replace(/\.xlsx$/i, "_delivery.json");
}

async function updateDeliveryManifest({ workbookPath, title, folderId, verifiedFile, uploadMode }) {
  const manifestPath = deliveryManifestPath(workbookPath);
  const workbookSha256 = createHash("sha256").update(await readFile(workbookPath)).digest("hex");
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    manifest = {
      workbook_path: workbookPath,
      workbook_file: path.basename(workbookPath),
    };
  }

  const nextManifest = {
    ...manifest,
    drive_folder_id: folderId,
    google_sheet_id: verifiedFile.id,
    google_sheet_url: verifiedFile.webViewLink,
    google_sheet_title: title,
    google_sheet_mime_type: verifiedFile.mimeType,
    google_sheet_uploaded_at: new Date().toISOString(),
    google_sheet_verified_in_folder: true,
    google_sheet_matches_current_workbook: true,
    google_sheet_uploaded_workbook_sha256: workbookSha256,
    google_sheet_upload_status: "uploaded",
    google_sheet_upload_mode: uploadMode,
    google_sheet_readback_status: "needs_readback_after_upload",
    google_sheet_readback_verified_at: null,
    google_sheet_readback_sample_count: null,
    google_sheet_readback_workbook_sha256: null,
    google_sheet_readback_errors: [],
  };

  await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

async function main() {
  const { options, positional } = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  options.oauthTokenFile = path.resolve(options.oauthTokenFile);
  if (options.oauthClientFile) options.oauthClientFile = path.resolve(options.oauthClientFile);

  if (options.authorize) {
    if (positional.length !== 0) fail("--authorize does not accept a workbook path.");
    await authorizeOAuth({
      clientFile: options.oauthClientFile,
      tokenFile: options.oauthTokenFile,
      scope: options.scope,
      noBrowser: options.noBrowser,
    });
    return;
  }

  if (positional.length !== 1) {
    printHelp();
    fail("Expected exactly one workbook path.");
  }

  const workbookPath = path.resolve(positional[0]);
  const workbookName = path.basename(workbookPath);
  const title = options.title || workbookName.replace(/\.xlsx$/i, "");

  assertFolderId(options.folderId);
  assertGoogleFileId(options.fileId);

  if (!/\.xlsx$/i.test(workbookPath)) {
    fail(`Expected an .xlsx workbook, got: ${workbookPath}`);
  }

  try {
    const info = await stat(workbookPath);
    if (!info.isFile()) fail(`Workbook path is not a file: ${workbookPath}`);
    if (info.size === 0) fail(`Workbook file is empty: ${workbookPath}`);
  } catch (error) {
    fail(`Cannot read workbook: ${error.message}`);
  }

  if (options.dryRun) {
    console.log("Drive upload dry run");
    console.log(`workbook=${workbookPath}`);
    console.log(`title=${title}`);
    console.log(`folder_id=${options.folderId}`);
    console.log(`target_mime=${options.convert ? GOOGLE_SHEET_MIME : XLSX_MIME}`);
    console.log(`file_id=${options.fileId || "create_new"}`);
    console.log(`scope=${options.scope}`);
    console.log(`auth_mode=${options.authMode}`);
    console.log(`oauth_client_file=${options.oauthClientFile || "not set"}`);
    console.log(`oauth_token_file=${options.oauthTokenFile}`);
    console.log("status=ok");
    return;
  }

  const accessToken = await getAccessToken(options);
  if (options.fileId && options.convert) {
    await assertExistingSheetIsReadbackCapable({
      accessToken,
      fileId: options.fileId,
    });
  }
  const result = await uploadWorkbook({
    accessToken,
    workbookPath,
    title,
    folderId: options.folderId,
    convert: options.convert,
    fileId: options.fileId,
  });
  const verifiedFile = await verifyDriveFile({
    accessToken,
    fileId: result.id,
    title,
    folderId: options.folderId,
  });
  const manifestPath = await updateDeliveryManifest({
    workbookPath,
    title,
    folderId: options.folderId,
    verifiedFile,
    uploadMode: options.fileId ? "update_existing" : "create_new",
  });

  console.log(options.fileId ? "Drive update completed" : "Drive upload completed");
  console.log(JSON.stringify(verifiedFile, null, 2));
  console.log(`delivery_manifest=${manifestPath}`);
}

main().catch((error) => fail(error.stack || error.message));
