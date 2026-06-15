#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OAUTH_CLIENT_FILE = ".secrets/google-oauth-client.json";
const DEFAULT_OAUTH_TOKEN_FILE = ".secrets/google-oauth-token.json";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pythonVerifier = path.join(scriptDir, "check_oxford_edition_google_sheet_readback_openpyxl.py");
const args = process.argv.slice(2);
const manifestPaths = args.filter((arg) => !arg.startsWith("--"));
const oauthClientFile =
  args.find((arg) => arg.startsWith("--oauth-client-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_CLIENT_FILE ??
  DEFAULT_OAUTH_CLIENT_FILE;
const oauthTokenFile =
  args.find((arg) => arg.startsWith("--oauth-token-file="))?.split("=")[1] ??
  process.env.GOOGLE_OAUTH_TOKEN_FILE ??
  DEFAULT_OAUTH_TOKEN_FILE;

if (manifestPaths.length === 0) {
  throw new Error(
    "Usage: node scripts/oxford/check-oxford-edition-google-sheet-readback-openpyxl.mjs <delivery_manifest.json> [...]"
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function driveExportXlsx({ accessToken, fileId }) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`);
  url.searchParams.set("mimeType", XLSX_MIME);
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Google Drive export failed (${response.status}): ${await response.text()}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      clearTimeout(timeout);
      return buffer;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === 4) throw error;
      await sleep(2000 * attempt);
    }
  }
  throw lastError ?? new Error(`Google Drive export failed for ${fileId}`);
}

function remoteExportPathFor(manifestPath, manifest) {
  const workbookFile = String(manifest.workbook_file || path.basename(manifest.workbook_path || manifestPath));
  return path.join(
    "outputs",
    "oxford-vocabulary",
    "final",
    workbookFile.replace(/\.xlsx$/u, "_google_sheet_readback_export.xlsx")
  );
}

async function verifyManifest(manifestPath, accessToken) {
  const manifest = await readJson(manifestPath);
  if (!manifest.workbook_path) throw new Error(`Manifest ${manifestPath} missing workbook_path.`);
  if (!manifest.google_sheet_id) throw new Error(`Manifest ${manifestPath} missing google_sheet_id.`);
  if (manifest.google_sheet_mime_type !== "application/vnd.google-apps.spreadsheet") {
    throw new Error(`Manifest ${manifestPath} is not a native Google Sheets upload.`);
  }

  const remotePath = remoteExportPathFor(manifestPath, manifest);
  await mkdir(path.dirname(remotePath), { recursive: true });
  await writeFile(remotePath, await driveExportXlsx({ accessToken, fileId: manifest.google_sheet_id }));

  const result = spawnSync(
    "python3",
    [pythonVerifier, "--manifest", manifestPath, "--remote-workbook", remotePath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Openpyxl Oxford Google Sheet readback failed for ${manifestPath}`);
  }
}

const accessToken = await getOAuthAccessToken();
for (const manifestPath of manifestPaths) await verifyManifest(manifestPath, accessToken);
