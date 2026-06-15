#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DEFAULT_DRIVE_FOLDER_ID = "1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const DEFAULT_OAUTH_CLIENT_FILE = path.join(projectRoot, ".secrets", "google-oauth-client.json");
const DEFAULT_OAUTH_TOKEN_FILE = path.join(projectRoot, ".secrets", "google-oauth-token.json");

function parseArgs(argv) {
  const options = {
    dryRun: false,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID,
    oauthClientFile: process.env.GOOGLE_OAUTH_CLIENT_FILE || DEFAULT_OAUTH_CLIENT_FILE,
    oauthTokenFile: process.env.GOOGLE_OAUTH_TOKEN_FILE || DEFAULT_OAUTH_TOKEN_FILE,
    scope: process.env.GOOGLE_DRIVE_SCOPE || DEFAULT_SCOPE,
    manifest: "",
    titlePrefix: "",
  };
  const files = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("--folder-id=")) {
      options.folderId = arg.slice("--folder-id=".length).trim();
    } else if (arg.startsWith("--oauth-client-file=")) {
      options.oauthClientFile = arg.slice("--oauth-client-file=".length).trim();
    } else if (arg.startsWith("--oauth-token-file=")) {
      options.oauthTokenFile = arg.slice("--oauth-token-file=".length).trim();
    } else if (arg.startsWith("--scope=")) {
      options.scope = arg.slice("--scope=".length).trim();
    } else if (arg.startsWith("--manifest=")) {
      options.manifest = arg.slice("--manifest=".length).trim();
    } else if (arg.startsWith("--title-prefix=")) {
      options.titlePrefix = arg.slice("--title-prefix=".length).trim();
    } else {
      files.push(arg);
    }
  }

  return { options, files };
}

function printHelp() {
  console.log(`Usage:
  node scripts/upload-drive-file-to-folder.mjs <file> [<file> ...] --folder-id=<drive_folder_id> --manifest=<manifest.json>

Environment:
  GOOGLE_DRIVE_FOLDER_ID           Target Drive folder id. Defaults to the FlashcardsLuna words folder.
  GOOGLE_OAUTH_CLIENT_FILE         OAuth client JSON file. Defaults to .secrets/google-oauth-client.json.
  GOOGLE_OAUTH_TOKEN_FILE          Local token cache. Defaults to .secrets/google-oauth-token.json.
  GOOGLE_DRIVE_SCOPE               Optional OAuth scope. Defaults to ${DEFAULT_SCOPE}.

Notes:
  - Uploads raw source files only; it does not convert CSV to Google Sheets or Markdown to Google Docs.
  - Existing non-trashed files with the same name in the target folder are updated instead of duplicated.
  - The optional manifest records source hashes and verified Drive URLs.`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function assertFolderId(folderId) {
  if (!folderId) fail("Missing Drive folder id. Use --folder-id or GOOGLE_DRIVE_FOLDER_ID.");
  if (!/^[A-Za-z0-9_-]+$/.test(folderId)) fail(`Drive folder id looks invalid: ${folderId}`);
}

async function loadOAuthClient(clientFile) {
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
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function saveOAuthToken(tokenFile, token) {
  await mkdir(path.dirname(tokenFile), { recursive: true });
  await writeFile(tokenFile, `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 });
}

async function refreshOAuthToken({ client, token, tokenFile }) {
  if (!token.refresh_token) {
    fail("OAuth token has no refresh_token. Run scripts/upload-spreadsheet-to-drive-folder.mjs --authorize first.");
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

async function getOAuthAccessToken({ clientFile, tokenFile }) {
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

function detectMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".csv") return "text/csv";
  if (extension === ".json") return "application/json";
  if (extension === ".jsonl") return "application/jsonl";
  if (extension === ".md" || extension === ".markdown") return "text/markdown";
  if (extension === ".txt") return "text/plain";
  if (extension === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

function escapeDriveQueryLiteral(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findExistingFile({ accessToken, folderId, name }) {
  const query = `'${escapeDriveQueryLiteral(folderId)}' in parents and name = '${escapeDriveQueryLiteral(name)}' and trashed = false`;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  url.searchParams.set("fields", "files(id,name,mimeType,parents,webViewLink,modifiedTime)");
  url.searchParams.set("pageSize", "10");

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive search failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const files = Array.isArray(data.files) ? data.files : [];
  return files[0] || null;
}

async function uploadFile({ accessToken, filePath, folderId, title, mimeType, existingFileId }) {
  const fileBuffer = await readFile(filePath);
  const boundary = `lunacards_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = { name: title, mimeType };
  if (!existingFileId) metadata.parents = [folderId];

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const url = new URL(
    existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}`
      : "https://www.googleapis.com/upload/drive/v3/files"
  );
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("fields", "id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime");

  const response = await fetch(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive ${existingFileId ? "update" : "upload"} failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function verifyDriveFile({ accessToken, fileId, folderId, title }) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("fields", "id,name,mimeType,parents,webViewLink,webContentLink,size,md5Checksum,modifiedTime");

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    fail(`Google Drive verification failed (${response.status}): ${text}`);
  }

  const file = await response.json();
  if (file.name !== title) fail(`Google Drive verification failed: expected "${title}", got "${file.name}"`);
  if (!Array.isArray(file.parents) || !file.parents.includes(folderId)) {
    fail(`Google Drive verification failed: uploaded file is not in folder ${folderId}`);
  }
  return file;
}

async function buildSourceRecord(filePath, titlePrefix) {
  const resolvedPath = path.resolve(filePath);
  const fileStat = await stat(resolvedPath);
  if (!fileStat.isFile()) fail(`Not a file: ${filePath}`);
  const fileBuffer = await readFile(resolvedPath);
  const basename = path.basename(resolvedPath);
  return {
    source_path: path.relative(projectRoot, resolvedPath),
    title: `${titlePrefix}${basename}`,
    mime_type: detectMimeType(resolvedPath),
    size_bytes: fileStat.size,
    sha256: createHash("sha256").update(fileBuffer).digest("hex"),
  };
}

async function main() {
  const { options, files } = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  assertFolderId(options.folderId);
  if (files.length === 0) fail("At least one source file is required.");

  const sourceRecords = [];
  for (const file of files) {
    sourceRecords.push(await buildSourceRecord(file, options.titlePrefix));
  }

  if (options.dryRun) {
    console.log(JSON.stringify({ dry_run: true, folder_id: options.folderId, files: sourceRecords }, null, 2));
    return;
  }

  const accessToken = await getOAuthAccessToken({
    clientFile: options.oauthClientFile,
    tokenFile: options.oauthTokenFile,
  });

  const uploadedFiles = [];
  for (const sourceRecord of sourceRecords) {
    const existing = await findExistingFile({
      accessToken,
      folderId: options.folderId,
      name: sourceRecord.title,
    });
    const result = await uploadFile({
      accessToken,
      filePath: path.join(projectRoot, sourceRecord.source_path),
      folderId: options.folderId,
      title: sourceRecord.title,
      mimeType: sourceRecord.mime_type,
      existingFileId: existing?.id,
    });
    const verifiedFile = await verifyDriveFile({
      accessToken,
      fileId: result.id,
      folderId: options.folderId,
      title: sourceRecord.title,
    });
    uploadedFiles.push({
      ...sourceRecord,
      drive_action: existing ? "updated_existing" : "created_new",
      drive_file_id: verifiedFile.id,
      drive_file_name: verifiedFile.name,
      drive_mime_type: verifiedFile.mimeType,
      drive_size_bytes: verifiedFile.size ? Number(verifiedFile.size) : null,
      drive_md5_checksum: verifiedFile.md5Checksum || null,
      drive_url: verifiedFile.webViewLink,
      drive_download_url: verifiedFile.webContentLink || null,
      drive_modified_time: verifiedFile.modifiedTime || null,
      verified_in_folder: true,
    });
  }

  const manifest = {
    manifest_id: "drive_raw_file_upload_v1",
    generated_at: new Date().toISOString(),
    script_path: "scripts/upload-drive-file-to-folder.mjs",
    folder_id: options.folderId,
    upload_mode: "raw_source_file_no_google_workspace_conversion",
    file_count: uploadedFiles.length,
    files: uploadedFiles,
  };

  if (options.manifest) {
    const manifestPath = path.resolve(options.manifest);
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`manifest=${path.relative(projectRoot, manifestPath)}`);
  }

  for (const uploadedFile of uploadedFiles) {
    console.log(`${uploadedFile.drive_action} ${uploadedFile.source_path} -> ${uploadedFile.drive_url}`);
  }
}

main().catch((error) => fail(error.stack || error.message));
