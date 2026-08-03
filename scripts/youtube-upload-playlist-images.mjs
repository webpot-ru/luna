#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  normalizeLanguageCode,
  savePlaylistRegistry,
} from "./lib/youtube-playlists.mjs";

const DEFAULT_MANIFEST = "outputs/design-prototypes/youtube-playlist-covers-upload-eligible-20260709-coretext/manifest.json";
const DEFAULT_OUTPUT_DIR = "outputs/youtube-playlist-image-upload";
const DEFAULT_POLYGLOT_PLAYLIST_REGISTRY = "config/youtube-polyglot-playlists.json";

function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    polyglotPlaylistRegistry: DEFAULT_POLYGLOT_PLAYLIST_REGISTRY,
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    supports: [],
    playlistKeys: [],
    limitPerChannel: 0,
    outputDir: DEFAULT_OUTPUT_DIR,
    oauthRoot: "",
    apply: false,
    confirmYoutubeWrite: false,
    replaceExisting: false,
    skipUploaded: false,
    readbackAttempts: 8,
  };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--replace-existing") options.replaceExisting = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--manifest=")) options.manifest = arg.slice("--manifest=".length);
    else if (arg.startsWith("--playlist-registry=")) options.playlistRegistry = arg.slice("--playlist-registry=".length);
    else if (arg.startsWith("--polyglot-playlist-registry=")) options.polyglotPlaylistRegistry = arg.slice("--polyglot-playlist-registry=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--supports=")) {
      options.supports = arg.slice("--supports=".length).split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    } else if (arg.startsWith("--playlist-keys=")) {
      options.playlistKeys = arg.slice("--playlist-keys=".length).split(",").map((value) => value.trim()).filter(Boolean);
    } else if (arg.startsWith("--limit-per-channel=")) {
      options.limitPerChannel = Number(arg.slice("--limit-per-channel=".length));
    } else if (arg.startsWith("--readback-attempts=")) {
      options.readbackAttempts = Number(arg.slice("--readback-attempts=".length));
    } else if (arg.startsWith("--output-dir=")) options.outputDir = arg.slice("--output-dir=".length);
    else if (arg.startsWith("--oauth-root=")) options.oauthRoot = arg.slice("--oauth-root=".length);
    else if (arg === "--skip-uploaded") options.skipUploaded = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-upload-playlist-images.mjs --supports=my,sr --limit-per-channel=1",
    "",
    "Dry-run is default. Live writes require:",
    "  --apply --confirm-youtube-write",
    "Existing playlist images are never replaced unless --replace-existing is explicit and the manifest carries installed-image readback evidence.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`Missing ${label}: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function resolveExternalPath(filePath, { root = "", label }) {
  const candidates = [];
  if (path.isAbsolute(filePath)) candidates.push(filePath);
  else {
    if (root) candidates.push(path.resolve(root, filePath));
    candidates.push(path.resolve(filePath));
  }
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) fail(`Missing ${label}: ${filePath}`);
  return found;
}

function loadOAuthClient(clientFile) {
  const json = readJson(clientFile, "OAuth client");
  const client = json.installed || json.web || json;
  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

function tokenFileFor(channelRegistry, channel) {
  const defaults = channelRegistry.defaults || {};
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  return path.join(defaults.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

async function getAccessToken({ clientFile, tokenFile }) {
  const client = loadOAuthClient(clientFile);
  const token = readJson(tokenFile, "OAuth token");
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) fail(`OAuth token file has no refresh_token: ${tokenFile}`);

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
  if (!response.ok) fail(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  fs.writeFileSync(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, "utf8");
  return nextToken.access_token;
}

function parseYouTubeJson(text, label) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} returned non-JSON response: ${text.slice(0, 500)}`);
  }
}

async function youtubeJson({ accessToken, method, pathName, query = {}, body }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = response.status === 204 ? "" : await response.text();
  if (!response.ok) fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${text}`);
  return parseYouTubeJson(text, `YouTube API ${method} ${url.pathname}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  fail(`Unsupported playlist image extension: ${filePath}`);
}

function assertImageShape(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > 2 * 1024 * 1024) fail(`Playlist image exceeds 2 MB: ${filePath}`);
}

async function youtubeMultipartImageUpload({ accessToken, method, query = {}, resource, filePath }) {
  const media = fs.readFileSync(filePath);
  const boundary = `playlist-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata = Buffer.from(
    [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(resource),
      `--${boundary}`,
      `Content-Type: ${detectMimeType(filePath)}`,
      "",
      "",
    ].join("\r\n"),
    "utf8",
  );
  const close = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([metadata, media, close]);
  const url = new URL("playlistImages", "https://www.googleapis.com/upload/youtube/v3/");
  for (const [key, value] of Object.entries({ uploadType: "multipart", part: "snippet", ...query })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    body,
  });
  const text = response.status === 204 ? "" : await response.text();
  if (!response.ok) fail(`YouTube playlistImages media upload failed (${response.status}): ${text}`);
  return parseYouTubeJson(text, `YouTube playlistImages ${method}`);
}

async function youtubeResumableImageUpload({ accessToken, method, resource, filePath }) {
  const media = fs.readFileSync(filePath);
  const mimeType = detectMimeType(filePath);
  const metadataText = JSON.stringify(resource);
  const initiationUrl = new URL("playlistImages", "https://www.googleapis.com/resumable/upload/youtube/v3/");
  initiationUrl.searchParams.set("uploadType", "resumable");
  initiationUrl.searchParams.set("part", "snippet");

  const initiationResponse = await fetch(initiationUrl, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "content-length": String(Buffer.byteLength(metadataText)),
      "x-upload-content-type": mimeType,
      "x-upload-content-length": String(media.length),
    },
    body: metadataText,
  });
  const initiationText = initiationResponse.status === 204 ? "" : await initiationResponse.text();
  if (!initiationResponse.ok) {
    fail(`YouTube playlistImages resumable initiation failed (${initiationResponse.status}): ${initiationText}`);
  }
  const uploadLocation = initiationResponse.headers.get("location");
  if (!uploadLocation) fail("YouTube playlistImages resumable initiation returned no upload location.");

  const uploadResponse = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": mimeType,
      "content-length": String(media.length),
    },
    body: media,
  });
  const uploadText = uploadResponse.status === 204 ? "" : await uploadResponse.text();
  if (!uploadResponse.ok) {
    fail(`YouTube playlistImages resumable media upload failed (${uploadResponse.status}): ${uploadText}`);
  }
  return parseYouTubeJson(uploadText, `YouTube playlistImages ${method} resumable`);
}

async function readAuthorizedChannel({ accessToken, expectedChannelId }) {
  const data = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "channels",
    query: {
      part: "snippet",
      mine: "true",
      fields: "items(id,snippet(title,customUrl))",
    },
  });
  const item = data?.items?.[0];
  if (!item) fail("YouTube authorized channel readback returned no items.");
  if (item.id !== expectedChannelId) fail(`OAuth token channel mismatch: expected ${expectedChannelId}, got ${item.id}.`);
  return item;
}

async function readPlaylist({ accessToken, playlistId }) {
  const data = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "playlists",
    query: {
      part: "snippet,status",
      id: playlistId,
      fields: "items(id,snippet(channelId,title),status(privacyStatus))",
    },
  });
  const item = data?.items?.[0];
  if (!item) fail(`YouTube playlist readback returned no items for ${playlistId}.`);
  return item;
}

async function listPlaylistImages({ accessToken, playlistId }) {
  return youtubeJson({
    accessToken,
    method: "GET",
    pathName: "playlistImages",
    query: {
      part: "snippet",
      parent: playlistId,
      fields: "items(id,snippet(playlistId,type,width,height))",
    },
  });
}

async function readPlaylistImageWithRetry({ accessToken, playlistId, imageId, attempts = 8, delayMs = 2500 }) {
  let lastReadback = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastReadback = await listPlaylistImages({ accessToken, playlistId });
    const image = (lastReadback.items || []).find((item) => (imageId ? item.id === imageId : samePlaylistImage(item, playlistId)));
    if (image) return { image, attemptsUsed: attempt };
    if (attempt < attempts) await sleep(delayMs);
  }
  return { image: null, attemptsUsed: attempts, lastReadback };
}

function samePlaylistImage(item, playlistId) {
  return item?.snippet?.playlistId === playlistId || item?.snippet?.parent === playlistId || item?.id;
}

function findRegistryEntry(registry, playlistKey) {
  return registry.playlists.find((row) => row.playlist_key === playlistKey || row.key === playlistKey);
}

function channelByKey(channelRegistry, channelKey) {
  return (channelRegistry.channels || []).find((channel) => channel.key === channelKey);
}

function selectCandidates({ manifest, supports, playlistKeys, limitPerChannel, playlistRegistry, playlistRegistries = new Map(), skipUploaded }) {
  const supportSet = new Set(supports);
  const keySet = new Set(playlistKeys);
  let rows = (manifest.records || [])
    .filter((row) => row.playlistKey && row.coverPath)
    .filter((row) => !row.uploadBlocker || row.uploadBlocker === "missing_youtube_playlist_id")
    .map((row) => {
      const registryPath = row.registryPath || DEFAULT_PLAYLIST_REGISTRY_PATH;
      const registry = playlistRegistries.get(registryPath) || playlistRegistry;
      const entry = findRegistryEntry(registry, row.playlistKey);
      const manifestPlaylistId = String(row.playlistId || "");
      const registryPlaylistId = String(entry?.youtube_playlist_id || "");
      if (manifestPlaylistId && registryPlaylistId && manifestPlaylistId !== registryPlaylistId) {
        fail(`Playlist id mismatch for ${row.playlistKey}: manifest=${manifestPlaylistId} registry=${registryPlaylistId}`);
      }
      return {
        ...row,
        registryPath,
        manifestPlaylistId,
        playlistId: registryPlaylistId || manifestPlaylistId,
        playlistIdSource: registryPlaylistId ? "durable_registry" : "manifest",
      };
    })
    .filter((row) => row.playlistId);
  if (supportSet.size) rows = rows.filter((row) => supportSet.has(String(row.channelKey || "").toLowerCase()));
  if (keySet.size) rows = rows.filter((row) => keySet.has(row.playlistKey));
  if (skipUploaded) {
    rows = rows.filter((row) => {
      const registry = playlistRegistries.get(row.registryPath) || playlistRegistry;
      const entry = findRegistryEntry(registry, row.playlistKey);
      return entry?.playlistImage?.status !== "uploaded";
    });
  }
  rows.sort((a, b) => `${a.channelKey}:${a.playlistKey}`.localeCompare(`${b.channelKey}:${b.playlistKey}`));
  if (!limitPerChannel) return rows;
  const counts = new Map();
  const limited = [];
  for (const row of rows) {
    const key = String(row.channelKey || "").toLowerCase();
    const count = counts.get(key) || 0;
    if (count >= limitPerChannel) continue;
    counts.set(key, count + 1);
    limited.push(row);
  }
  return limited;
}

function candidateRegistryRows(candidate, playlistRegistries) {
  const references = Array.isArray(candidate.registryRows) && candidate.registryRows.length
    ? candidate.registryRows
    : [{ registryPath: candidate.registryPath || DEFAULT_PLAYLIST_REGISTRY_PATH, playlistKey: candidate.playlistKey }];
  return references.map((reference) => {
    const registryPath = reference.registryPath || candidate.registryPath || DEFAULT_PLAYLIST_REGISTRY_PATH;
    const registry = playlistRegistries.get(registryPath);
    if (!registry) fail(`Unsupported playlist registry path: ${registryPath}`);
    const entry = findRegistryEntry(registry, reference.playlistKey || candidate.playlistKey);
    if (!entry) fail(`No playlist registry entry for ${reference.playlistKey || candidate.playlistKey} in ${registryPath}`);
    if (entry.youtube_playlist_id !== candidate.playlistId) {
      fail(`Playlist id mismatch for ${reference.playlistKey || candidate.playlistKey}: expected ${candidate.playlistId}, got ${entry.youtube_playlist_id || "(missing)"}`);
    }
    return { registryPath, registry, entry, playlistKey: reference.playlistKey || candidate.playlistKey };
  });
}

function saveCandidateRegistries(registryRows) {
  const saved = new Set();
  for (const row of registryRows) {
    if (saved.has(row.registryPath)) continue;
    savePlaylistRegistry(row.registry, row.registryPath);
    saved.add(row.registryPath);
  }
}

function isGitTracked(filePath) {
  const absolute = path.resolve(filePath);
  const relative = path.relative(process.cwd(), absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", relative], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "ignore",
  }).status === 0;
}

function summarize(results) {
  const channelIdentityUnits = new Set(results.map((result) => result.channelKey).filter(Boolean)).size;
  const summary = {
    total: results.length,
    planned: 0,
    uploaded: 0,
    inserted: 0,
    updated: 0,
    acceptedReadbackPending: 0,
    failed: 0,
    quotaUnitsEstimated: channelIdentityUnits,
    channelIdentityUnits,
  };
  for (const result of results) {
    if (result.status === "planned") summary.planned += 1;
    if (result.status === "uploaded") {
      summary.uploaded += 1;
      summary.quotaUnitsEstimated += result.method === "existing_readback" ? 2 : 53;
      if (result.method === "insert") summary.inserted += 1;
      if (result.method === "update") summary.updated += 1;
    }
    if (result.status === "accepted_readback_pending") {
      summary.acceptedReadbackPending += 1;
      summary.quotaUnitsEstimated += 53;
    }
    if (result.status === "failed") summary.failed += 1;
  }
  if (!summary.uploaded) summary.quotaUnitsEstimated = summary.total * 53 + channelIdentityUnits;
  return summary;
}

function saveReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.apply && !options.confirmYoutubeWrite) fail("Apply mode requires --confirm-youtube-write.");
  if (!Number.isInteger(options.readbackAttempts) || options.readbackAttempts < 1 || options.readbackAttempts > 8) {
    fail("--readback-attempts must be an integer between 1 and 8.");
  }

  const manifest = readJson(options.manifest, "playlist image manifest");
  const replacementManifest = manifest.exactReplacementOnly === true
    && manifest.mode === "replace_existing_playlist_images";
  if (options.apply && manifest.auditComplete !== true && !(options.replaceExisting && replacementManifest)) {
    fail("Apply requires an auditComplete exact missing-only manifest or an exact replacement manifest.");
  }
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const playlistRegistry = loadPlaylistRegistry(options.playlistRegistry);
  const polyglotPlaylistRegistry = loadPlaylistRegistry(options.polyglotPlaylistRegistry);
  const playlistRegistries = new Map([
    [options.playlistRegistry, playlistRegistry],
    [options.polyglotPlaylistRegistry, polyglotPlaylistRegistry],
  ]);
  const candidates = selectCandidates({
    manifest,
    supports: options.supports,
    playlistKeys: options.playlistKeys,
    limitPerChannel: options.limitPerChannel,
    playlistRegistry,
    playlistRegistries,
    skipUploaded: options.skipUploaded,
  });
  if (!candidates.length) fail("No upload-eligible playlist image candidates matched the filters.");

  const nowSlug = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(options.outputDir, `playlist-image-upload-${options.apply ? "apply" : "plan"}-${nowSlug}.json`);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply" : "plan",
    manifest: options.manifest,
    filters: {
      supports: options.supports,
      playlistKeys: options.playlistKeys,
      limitPerChannel: options.limitPerChannel,
      skipUploaded: options.skipUploaded,
      replaceExisting: options.replaceExisting,
      readbackAttempts: options.readbackAttempts,
    },
    results: [],
    summary: {},
  };

  const accessTokenByChannelKey = new Map();
  const clientFile = options.apply
    ? resolveExternalPath(channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json", {
      root: options.oauthRoot,
      label: "OAuth client",
    })
    : "";

  for (const candidate of candidates) {
    const result = {
      channelKey: candidate.channelKey,
      playlistKey: candidate.playlistKey,
      playlistId: candidate.playlistId,
      title: candidate.title || "",
      coverPath: candidate.coverPath,
      playlistUrl: `https://www.youtube.com/playlist?list=${candidate.playlistId}`,
      status: options.apply ? "pending" : "planned",
    };
    report.results.push(result);
    try {
      const replacementCandidate = options.replaceExisting && candidate.replacementMode === "replace_existing";
      if (options.replaceExisting && !replacementCandidate) {
        fail(`--replace-existing requires replacementMode=replace_existing for ${candidate.playlistKey}`);
      }
      const userAuthorizedReapply = candidate.userAuthorizedReapply === true
        && candidate.reapplyReason === "operator_live_observation_missing";
      if (options.apply && replacementCandidate && (
        candidate.exactMissingOnly !== false
        || candidate.auditState !== "installed"
        || !candidate.playlistImageId
        || !candidate.auditReport
        || !candidate.auditReportSha256
        || candidate.auditEvidenceType !== "youtube_playlist_images_readback"
        || candidate.capabilityEvidence !== "existing_playlist_image_readback"
      )) {
        fail(`Replacement requires installed-image readback evidence for ${candidate.playlistKey}`);
      }
      if (options.apply && !replacementCandidate && (
        candidate.exactMissingOnly !== true
        || candidate.auditState !== "absent"
        || !candidate.auditReport
        || !candidate.auditReportSha256
        || (!userAuthorizedReapply && candidate.auditEvidenceType !== "youtube_playlist_images_readback")
      )) {
        fail(`Apply requires exact missing-only YouTube readback evidence or an explicit user-authorized reapply for ${candidate.playlistKey}`);
      }
      if (options.apply) {
        const auditPath = path.resolve(candidate.auditReport);
        if (!fs.existsSync(auditPath) || sha256(auditPath) !== candidate.auditReportSha256) {
          fail(`Audit evidence hash mismatch for ${candidate.playlistKey}`);
        }
        result.auditReport = candidate.auditReport;
        result.auditReportSha256 = candidate.auditReportSha256;
      }
      const channel = channelByKey(channelRegistry, candidate.channelKey);
      if (!channel) fail(`No channel configured for channelKey=${candidate.channelKey}`);
      const canReplaceFromLiveEvidence = replacementCandidate
        && candidate.auditState === "installed"
        && candidate.capabilityEvidence === "existing_playlist_image_readback";
      if (channel.playlistImageUploadAllowed !== true && !canReplaceFromLiveEvidence) {
        fail(`Channel ${candidate.channelKey} is not marked playlistImageUploadAllowed=true`);
      }
      const registryRows = candidateRegistryRows(candidate, playlistRegistries);
      result.registryRows = registryRows.map((row) => ({ registryPath: row.registryPath, playlistKey: row.playlistKey }));
      for (const registryRow of registryRows) {
        if (registryRow.entry.youtube_channel_id && registryRow.entry.youtube_channel_id !== channel.channelId) {
          fail(`Registry channel mismatch for ${registryRow.playlistKey}: expected ${channel.channelId}, got ${registryRow.entry.youtube_channel_id}`);
        }
      }
      const coverPath = path.resolve(candidate.coverPath);
      if (!fs.existsSync(coverPath)) fail(`Missing cover image: ${candidate.coverPath}`);
      assertImageShape(coverPath);
      result.coverGitTracked = isGitTracked(coverPath);
      if (options.apply && !result.coverGitTracked) {
        fail(`Refusing untracked playlist cover in apply mode: ${candidate.coverPath}`);
      }
      result.youtubeChannelId = channel.channelId;

      if (!options.apply) continue;

      let accessToken = accessTokenByChannelKey.get(channel.key);
      if (!accessToken) {
        const tokenFile = resolveExternalPath(tokenFileFor(channelRegistry, channel), {
          root: options.oauthRoot,
          label: `OAuth token for ${channel.key}`,
        });
        accessToken = await getAccessToken({ clientFile, tokenFile });
        const authorized = await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
        result.authorizedChannelTitle = authorized.snippet?.title || "";
        accessTokenByChannelKey.set(channel.key, accessToken);
      }

      const playlist = await readPlaylist({ accessToken, playlistId: candidate.playlistId });
      if (playlist.snippet?.channelId !== channel.channelId) {
        fail(`Playlist channel mismatch: expected ${channel.channelId}, got ${playlist.snippet?.channelId || "(missing)"}`);
      }
      const existing = await listPlaylistImages({ accessToken, playlistId: candidate.playlistId });
      const currentImage = (existing.items || []).find((item) => samePlaylistImage(item, candidate.playlistId));
      if (replacementCandidate && (!currentImage?.id || currentImage.id !== candidate.playlistImageId)) {
        fail(`Replacement readback drift for ${candidate.playlistKey}: expected image ${candidate.playlistImageId}, got ${currentImage?.id || "(absent)"}`);
      }
      if (currentImage?.id && !replacementCandidate) {
        const readbackAt = new Date().toISOString();
        for (const registryRow of registryRows) {
          registryRow.entry.playlistImage = {
            status: "uploaded",
            uploadedAt: readbackAt,
            imageId: currentImage.id,
            method: "existing_readback",
            sourceManifest: options.manifest,
            sourceCoverPath: candidate.coverPath,
            sourceCoverGitTracked: result.coverGitTracked,
            playlistImagesEndpoint: "playlistImages",
          };
          registryRow.entry.lastReadbackAt = readbackAt;
        }
        saveCandidateRegistries(registryRows);
        result.status = "uploaded";
        result.method = "existing_readback";
        result.playlistImageId = currentImage.id;
        result.readback = currentImage;
        result.uploadedAt = readbackAt;
        continue;
      }
      const method = currentImage?.id ? "update" : "insert";
      const resource = {
        snippet: {
          playlistId: candidate.playlistId,
          type: "hero",
        },
      };
      const uploaded = method === "update"
        ? await youtubeResumableImageUpload({
          accessToken,
          method: "PUT",
          resource,
          filePath: coverPath,
        })
        : await youtubeMultipartImageUpload({
          accessToken,
          method: "POST",
          resource,
          filePath: coverPath,
        });
      const imageId = uploaded?.id || currentImage?.id || "";
      result.responseImageId = imageId;
      const readbackResult = await readPlaylistImageWithRetry({
        accessToken,
        playlistId: candidate.playlistId,
        imageId,
        attempts: options.readbackAttempts,
      });
      const readbackImage = readbackResult.image;
      if (!readbackImage) {
        result.status = "accepted_readback_pending";
        result.method = method;
        result.playlistImageId = imageId;
        result.acceptedAt = new Date().toISOString();
        result.readbackAttempts = readbackResult.attemptsUsed;
        result.readbackPending = true;
        continue;
      }

      const uploadedAt = new Date().toISOString();
      for (const registryRow of registryRows) {
        registryRow.entry.playlistImage = {
          status: "uploaded",
          uploadedAt,
          imageId: readbackImage.id || imageId,
          method,
          sourceManifest: options.manifest,
          sourceCoverPath: candidate.coverPath,
          sourceCoverGitTracked: result.coverGitTracked,
          playlistImagesEndpoint: "playlistImages",
          ...(replacementCandidate ? { replacementMode: "replace_existing", sourceAuditReport: candidate.auditReport, sourceAuditReportSha256: candidate.auditReportSha256 } : {}),
        };
        registryRow.entry.lastReadbackAt = uploadedAt;
      }
      saveCandidateRegistries(registryRows);

      result.status = "uploaded";
      result.method = method;
      result.replacementMode = replacementCandidate ? "replace_existing" : undefined;
      result.playlistImageId = readbackImage.id || imageId;
      result.readback = readbackImage;
      result.readbackAttempts = readbackResult.attemptsUsed;
      result.uploadedAt = uploadedAt;
    } catch (error) {
      result.status = "failed";
      result.error = error.message || String(error);
      report.summary = summarize(report.results);
      saveReport(reportPath, report);
      throw error;
    } finally {
      report.summary = summarize(report.results);
      saveReport(reportPath, report);
    }
  }

  report.completedAt = new Date().toISOString();
  report.summary = summarize(report.results);
  saveReport(reportPath, report);
  console.log(JSON.stringify({ status: report.summary.failed ? "completed_with_errors" : "ok", reportPath, summary: report.summary }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

export { isGitTracked, selectCandidates };
