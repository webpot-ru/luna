#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  buildPlaylistAssignment,
  customThumbnailUploadAllowed,
  findChannelForSupport,
  findPlaylistEntry,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  saveYoutubeChannels,
  savePlaylistRegistry,
  upsertPlannedPlaylist,
} from "./lib/youtube-playlists.mjs";
import {
  buildPolyglotPlaylistAssignment,
  findPolyglotPlaylistEntry,
  loadPolyglotPlaylistRegistry,
  savePolyglotPlaylistRegistry,
  upsertPlannedPolyglotPlaylist,
} from "./lib/polyglot-youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  activePublicationBlocker,
  findActivePublication,
  isActivePublication,
  loadPublicationRegistry,
  savePublicationRegistry,
  upsertPublication,
} from "./lib/youtube-publication-registry.mjs";

function parseArgs(argv) {
  const options = {
    metadata: "",
    video: "",
    thumbnail: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    ledger: "outputs/youtube-publish-ledger.jsonl",
    apply: false,
    confirmYoutubeWrite: false,
    createPlaylist: false,
    allowRepublish: false,
    privacyStatus: "",
    publishAt: "",
    confirmPublic: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--create-playlist") options.createPlaylist = true;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--confirm-public") options.confirmPublic = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--metadata=")) options.metadata = arg.slice("--metadata=".length);
    else if (arg.startsWith("--video=")) options.video = arg.slice("--video=".length);
    else if (arg.startsWith("--thumbnail=")) options.thumbnail = arg.slice("--thumbnail=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--playlist-registry=")) options.playlistRegistry = arg.slice("--playlist-registry=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--progress-registry=")) options.progressRegistry = arg.slice("--progress-registry=".length);
    else if (arg.startsWith("--calendar=")) options.calendar = arg.slice("--calendar=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else if (arg.startsWith("--privacy=")) options.privacyStatus = arg.slice("--privacy=".length);
    else if (arg.startsWith("--publish-at=")) options.publishAt = arg.slice("--publish-at=".length);
    else if (!options.metadata) options.metadata = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-publish-video.mjs --metadata=<youtube_metadata.json> [--video=<mp4>] [--thumbnail=<image>]",
    "",
    "Dry-run is default. Live write requires:",
    "  --apply --confirm-youtube-write",
    "",
    "Options:",
    "  --create-playlist         Create the playlist if registry has no youtube_playlist_id.",
    "  --allow-republish         Allow uploading a set/support/target already present in config/youtube-published-videos.json.",
    "  --privacy=private|unlisted|public",
    "  --publish-at=<ISO>        Schedule publish time. Requires privacy=private.",
    "  --confirm-public          Required if privacy=public.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function envInteger(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response) {
  const value = response.headers.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : 0;
}

function normalizeYouTubePath(pathName) {
  return String(pathName || "").replace(/^\/+/u, "").split("?")[0];
}

function isPlaylistWriteRequest(method, pathName) {
  const verb = String(method || "").toUpperCase();
  const name = normalizeYouTubePath(pathName);
  return ["POST", "PUT", "PATCH"].includes(verb) && ["playlists", "playlistItems"].includes(name);
}

async function delayBeforePlaylistWrite({ method, pathName }) {
  if (!isPlaylistWriteRequest(method, pathName)) return;
  const baseMs = envInteger("YOUTUBE_PLAYLIST_WRITE_DELAY_MS", 2500, { min: 0, max: 120000 });
  const jitterMs = envInteger("YOUTUBE_PLAYLIST_WRITE_JITTER_MS", 5000, { min: 0, max: 120000 });
  const delayMs = baseMs + (jitterMs ? Math.floor(Math.random() * jitterMs) : 0);
  if (delayMs > 0) {
    console.warn(`YouTube playlist write throttle: waiting ${delayMs}ms before ${String(method).toUpperCase()} ${normalizeYouTubePath(pathName)}.`);
    await sleep(delayMs);
  }
}

function isRetryableYouTubeJsonError(status, text) {
  if ([500, 502, 503, 504].includes(status)) return true;
  if (status === 429) return true;
  const lower = String(text || "").toLowerCase();
  if (status === 409 && (
    lower.includes("service_unavailable")
    || lower.includes("\"status\": \"aborted\"")
    || lower.includes("operation was aborted")
    || lower.includes("youtube.coreerrordomain")
  )) return true;
  return [400, 403].includes(status) && (
    lower.includes("rate_limit_exceeded")
    || lower.includes("ratelimitexceeded")
    || lower.includes("userratelimitexceeded")
  );
}

function compactErrorMessage(error) {
  return String(error?.message || error || "").replace(/\s+/g, " ").trim().slice(0, 1200);
}

function isRecoverablePlaylistWriteError(error) {
  const message = compactErrorMessage(error).toLowerCase();
  return (
    (message.includes("/youtube/v3/playlists") || message.includes("/youtube/v3/playlistitems"))
    && (
      message.includes("quotaexceeded")
      || message.includes("quota exceeded")
      || message.includes("rate_limit_exceeded")
      || message.includes("ratelimitexceeded")
      || message.includes("user_ratelimitexceeded")
      || message.includes("userratelimitexceeded")
      || message.includes("rate limit")
      || message.includes("resource_exhausted")
      || message.includes("videonotfound")
      || message.includes("video not found")
    )
  );
}

function statusWithPlaylistState(baseStatus, { youtubePlaylistId, playlistItemId }) {
  if (!youtubePlaylistId) return `${baseStatus}_playlist_create_pending`;
  if (!playlistItemId) return `${baseStatus}_playlist_insert_pending`;
  return baseStatus;
}

function youtubeJsonRetryDelayMs({ attempt, response }) {
  const retryAfter = retryAfterMs(response);
  if (retryAfter > 0) return Math.min(retryAfter, envInteger("YOUTUBE_API_RETRY_MAX_MS", 90000, { min: 1000 }));
  const baseMs = envInteger("YOUTUBE_API_RETRY_BASE_MS", 3000, { min: 100, max: 120000 });
  const maxMs = envInteger("YOUTUBE_API_RETRY_MAX_MS", 90000, { min: 1000 });
  const jitterMs = envInteger("YOUTUBE_API_RETRY_JITTER_MS", 2500, { min: 0, max: 120000 });
  const exponential = baseMs * (2 ** Math.max(0, attempt - 1));
  const jitter = jitterMs ? Math.floor(Math.random() * jitterMs) : 0;
  return Math.min(maxMs, exponential + jitter);
}

function parseYouTubeJson(text, label) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} returned non-JSON response: ${String(text).slice(0, 500)}`);
  }
}

function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov") return "video/quicktime";
  return "video/mp4";
}

function normalizeUploadHashtag(value) {
  const text = String(value || "").trim().replace(/\s+/gu, "");
  if (!text) return "";
  return text.startsWith("#") ? text : `#${text}`;
}

function buildUploadDescription(metadata) {
  const description = String(metadata.description || "").trim();
  const hashtags = Array.isArray(metadata.hashtags)
    ? metadata.hashtags.map(normalizeUploadHashtag).filter(Boolean).slice(0, 3)
    : [];
  const missing = hashtags.filter((tag) => !description.toLocaleLowerCase().includes(tag.toLocaleLowerCase()));
  if (!missing.length) return description;
  return `${description}\n\n${missing.join(" ")}`.trim();
}

function polishedMetadataIssue(metadata) {
  const source = String(metadata.source || "").trim();
  if (!source) return "metadata source missing; live publish requires AI-polished or human-curated metadata";
  if (source.toLowerCase().startsWith("template")) {
    return `metadata source ${source} is plan-only; live publish requires AI-polished or human-curated metadata`;
  }
  return "";
}

function resolveExistingPath(filePath, label) {
  if (!filePath) return "";
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) fail(`${label} not found: ${filePath}`);
  return resolved;
}

function defaultVideoPath(metadataFile, metadata) {
  const dir = path.dirname(metadataFile);
  const preferred = path.join(dir, `lesson_${String(metadata.targetLang || "").toLowerCase()}_${String(metadata.supportLang || "").toLowerCase()}.mp4`);
  if (fs.existsSync(preferred)) return preferred;
  const video = fs.readdirSync(dir)
    .filter((name) => [".mp4", ".mov", ".m4v", ".webm"].includes(path.extname(name).toLowerCase()))
    .sort()[0];
  return video ? path.join(dir, video) : "";
}

function defaultThumbnailPath(metadataFile, metadata) {
  const explicit = metadata.thumbnailPath || metadata.thumbnail || metadata.thumbnailFile;
  if (explicit && typeof explicit === "string" && fs.existsSync(explicit)) return path.resolve(explicit);
  const dir = path.dirname(metadataFile);
  const image = fs.readdirSync(dir)
    .filter((name) => [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(name).toLowerCase()))
    .filter((name) => /thumb|thumbnail|cover/i.test(name))
    .sort()[0];
  return image ? path.join(dir, image) : "";
}

function isPolyglotMetadata(metadata = {}) {
  return metadata.videoType === "polyglot" || String(metadata.polyglotKey || "").startsWith("polyglot:");
}

function loadUploadPlaylistRegistry(filePath, metadata) {
  return isPolyglotMetadata(metadata)
    ? loadPolyglotPlaylistRegistry(filePath)
    : loadPlaylistRegistry(filePath);
}

function buildUploadPlaylistAssignment(metadata) {
  return isPolyglotMetadata(metadata)
    ? buildPolyglotPlaylistAssignment(metadata)
    : buildPlaylistAssignment(metadata);
}

function findUploadPlaylistEntry(registry, assignment, metadata) {
  return isPolyglotMetadata(metadata)
    ? findPolyglotPlaylistEntry(registry, assignment.key)
    : findPlaylistEntry(registry, assignment.key);
}

function upsertPlannedUploadPlaylist(registry, assignment, channel, metadata) {
  return isPolyglotMetadata(metadata)
    ? upsertPlannedPolyglotPlaylist(registry, assignment, channel)
    : upsertPlannedPlaylist(registry, assignment, channel);
}

function saveUploadPlaylistRegistry(registry, filePath, metadata) {
  if (isPolyglotMetadata(metadata)) savePolyglotPlaylistRegistry(registry, filePath);
  else savePlaylistRegistry(registry, filePath);
}

function findActivePolyglotPublication(registry, polyglotKey) {
  if (!polyglotKey) return null;
  return (registry.publications || [])
    .filter((row) => row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:"))
    .filter((row) => row.polyglotKey === polyglotKey)
    .filter(isActivePublication)
    .sort((a, b) => String(b.lastReadbackAt || b.uploadedAt || "").localeCompare(String(a.lastReadbackAt || a.uploadedAt || "")))[0] || null;
}

function findActiveUploadPublication(registry, metadata) {
  return isPolyglotMetadata(metadata)
    ? findActivePolyglotPublication(registry, metadata.polyglotKey)
    : findActivePublication(registry, metadata);
}

function activeUploadPublicationBlocker(row, metadata) {
  if (!isPolyglotMetadata(metadata)) return activePublicationBlocker(row);
  return [
    "already published in config/youtube-polyglot-published-videos.json",
    `polyglotKey=${row.polyglotKey || metadata.polyglotKey || "unknown"}`,
    `video=${row.youtubeVideoId}`,
    `status=${row.publicationStatus || row.privacyStatus || "unknown"}`,
    `run=${row.githubRunId || "unknown"}`,
    "use visibility/repair workflow or pass --allow-republish for an intentional duplicate/reupload",
  ].join("; ");
}

function loadOAuthClient(clientFile) {
  const json = JSON.parse(fs.readFileSync(clientFile, "utf8"));
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
  const token = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
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

async function youtubeJson({ accessToken, method, pathName, query = {}, body }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const attempts = envInteger("YOUTUBE_API_RETRY_ATTEMPTS", 6, { min: 1, max: 12 });
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await delayBeforePlaylistWrite({ method, pathName });
    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = response.status === 204 ? "" : await response.text();
    if (response.ok) return parseYouTubeJson(text, `YouTube API ${method} ${url.pathname}`);
    if (attempt < attempts && isRetryableYouTubeJsonError(response.status, text)) {
      const delayMs = youtubeJsonRetryDelayMs({ attempt, response });
      console.warn(`YouTube API ${method} ${url.pathname} retryable failure (${response.status}) on attempt ${attempt}/${attempts}; retrying in ${delayMs}ms.`);
      await sleep(delayMs);
      continue;
    }
    fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${text}`);
  }
  fail(`YouTube API ${method} ${url.pathname} failed after ${attempts} attempts.`);
}

async function youtubeMediaUpload({ accessToken, method = "POST", pathName, query = {}, filePath }) {
  const body = fs.readFileSync(filePath);
  const url = new URL(pathName, "https://www.googleapis.com/upload/youtube/v3/");
  for (const [key, value] of Object.entries({ uploadType: "media", ...query })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": detectMimeType(filePath),
      "content-length": String(body.length),
    },
    body,
  });
  if (!response.ok) fail(`YouTube media upload ${url.pathname} failed (${response.status}): ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

function isRecoverableThumbnailPermissionError(error) {
  const message = String(error?.message || "");
  return message.includes("/upload/youtube/v3/thumbnails/set")
    && message.includes("youtube.thumbnail")
    && message.includes("forbidden")
    && message.includes("custom video thumbnails");
}

function thumbnailPermissionWarning() {
  return "youtube.thumbnail/forbidden: The authenticated user doesn't have permissions to upload and set custom video thumbnails.";
}

function markChannelCustomThumbnailDisabled(channelRegistry, channelKey, channelConfigPath) {
  const channel = (channelRegistry.channels || []).find((item) => item.key === channelKey);
  if (!channel || channel.customThumbnailUploadAllowed === false) return false;
  channel.customThumbnailUploadAllowed = false;
  channel.thumbnailFallbackMode = "first_frame_auto";
  const note = "YouTube API thumbnails.set returned domain=youtube.thumbnail / reason=forbidden; automation uses first-frame auto-thumbnail fallback until advanced features/custom thumbnails are enabled in Studio.";
  channel.notes = Array.isArray(channel.notes) ? channel.notes : [];
  if (!channel.notes.includes(note)) channel.notes.push(note);
  saveYoutubeChannels(channelRegistry, channelConfigPath);
  return true;
}

function baseUploadStatus(publishAt) {
  return publishAt ? "scheduled_uploaded" : "published_uploaded";
}

function uploadStatusWithThumbnailMode({ publishAt, thumbnailSet, thumbnailSetError, thumbnailUploadMode }) {
  const base = baseUploadStatus(publishAt);
  if (thumbnailSet) return base;
  if (thumbnailSetError) return `${base}_thumbnail_forbidden`;
  if (thumbnailUploadMode === "first_frame_auto") return `${base}_thumbnail_auto`;
  return base;
}

async function uploadVideoResumable({ accessToken, videoPath, metadata, privacyStatus, publishAt }) {
  const stat = fs.statSync(videoPath);
  const initUrl = new URL("videos", "https://www.googleapis.com/upload/youtube/v3/");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");
  initUrl.searchParams.set("fields", "id,snippet(title),status(privacyStatus,uploadStatus,publishAt)");

  const resource = {
    snippet: {
      title: metadata.title,
      description: buildUploadDescription(metadata),
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      categoryId: String(metadata.categoryId || "27"),
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };
  if (publishAt) resource.status.publishAt = publishAt;

  const init = await fetch(initUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": detectMimeType(videoPath),
      "x-upload-content-length": String(stat.size),
    },
    body: JSON.stringify(resource),
  });
  if (!init.ok) fail(`YouTube videos.insert init failed (${init.status}): ${await init.text()}`);
  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) fail("YouTube videos.insert did not return a resumable upload URL.");

  const media = fs.readFileSync(videoPath);
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": detectMimeType(videoPath),
      "content-length": String(media.length),
    },
    body: media,
  });
  if (!upload.ok) fail(`YouTube video media upload failed (${upload.status}): ${await upload.text()}`);
  return upload.json();
}

function singleYouTubeItem(response, label) {
  const item = response?.items?.[0];
  if (!item) fail(`YouTube ${label} readback returned no items.`);
  return item;
}

async function readAuthorizedChannel({ accessToken, expectedChannelId }) {
  const readback = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "channels",
    query: {
      part: "snippet",
      mine: "true",
      fields: "items(id,snippet(title,customUrl))",
    },
  });
  const item = singleYouTubeItem(readback, "authorized channel");
  if (item.id !== expectedChannelId) {
    fail(`OAuth token channel mismatch: expected ${expectedChannelId}, got ${item.id}.`);
  }
  return item;
}

function assertUploadedVideoChannel({ videoReadback, expectedChannelId, videoId }) {
  const item = singleYouTubeItem(videoReadback, "uploaded video");
  if (item.id !== videoId) {
    fail(`Uploaded video readback mismatch: expected video ${videoId}, got ${item.id}.`);
  }
  const actualChannelId = item.snippet?.channelId || "";
  if (actualChannelId !== expectedChannelId) {
    fail(`Uploaded video channel mismatch: expected ${expectedChannelId}, got ${actualChannelId || "(missing)"}.`);
  }
  return item;
}

async function readUploadedVideoWithRetry({ accessToken, expectedChannelId, videoId }) {
  const attempts = envInteger("YOUTUBE_VIDEO_READBACK_ATTEMPTS", 5, { min: 1, max: 12 });
  const baseMs = envInteger("YOUTUBE_VIDEO_READBACK_BASE_MS", 5000, { min: 100, max: 120000 });
  const maxMs = envInteger("YOUTUBE_VIDEO_READBACK_MAX_MS", 60000, { min: 1000, max: 300000 });
  let videoReadback = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    videoReadback = await youtubeJson({
      accessToken,
      method: "GET",
      pathName: "videos",
      query: {
        part: "snippet,status",
        id: videoId,
        fields: "items(id,snippet(channelId,title),status(privacyStatus,uploadStatus,publishAt))",
      },
    });
    const item = videoReadback?.items?.[0];
    if (item) {
      const uploadedVideo = assertUploadedVideoChannel({
        videoReadback,
        expectedChannelId,
        videoId,
      });
      return { videoReadback, uploadedVideo };
    }
    if (attempt < attempts) {
      const delayMs = Math.min(maxMs, baseMs * attempt);
      console.warn(`YouTube uploaded video readback returned no items for ${videoId} on attempt ${attempt}/${attempts}; retrying in ${delayMs}ms.`);
      await sleep(delayMs);
    }
  }
  const uploadedVideo = assertUploadedVideoChannel({
    videoReadback,
    expectedChannelId,
    videoId,
  });
  return { videoReadback, uploadedVideo };
}

function appendLedger(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
}

function loadPolyglotProgressRegistry(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { schemaVersion: 1, items: [] };
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.items)) registry.items = [];
  return registry;
}

function savePolyglotProgressRegistry(registry, filePath) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function buildPolyglotProgressItem(publication) {
  return {
    videoType: "polyglot",
    polyglotKey: publication.polyglotKey,
    setId: publication.setId,
    supportLang: publication.supportLang,
    bundleKey: publication.bundleKey,
    bundleLabel: publication.bundleLabel,
    contentScope: publication.contentScope,
    wordLimit: publication.wordLimit,
    videoDurationSeconds: publication.videoDurationSeconds,
    maxDurationSeconds: publication.maxDurationSeconds,
    targetLangs: publication.targetLangs,
    targetLangsCsv: publication.targetLangsCsv,
    targetLangsHash: publication.targetLangsHash,
    status: publication.publicationStatus,
    youtubeVideoId: publication.youtubeVideoId,
    youtubeVideoUrl: publication.youtubeVideoUrl,
    youtubePlaylistId: publication.youtubePlaylistId,
    playlistItemId: publication.playlistItemId,
    channelKey: publication.channelKey,
    privacyStatus: publication.privacyStatus,
    publishAt: publication.publishAt,
    updatedAt: publication.lastReadbackAt || publication.uploadedAt || new Date().toISOString(),
    githubRunId: publication.githubRunId,
    githubRunUrl: publication.githubRunUrl,
    createdAt: publication.uploadedAt || publication.lastReadbackAt || new Date().toISOString(),
  };
}

function upsertPolyglotProgress(registry, item) {
  if (!item?.polyglotKey) return { created: false, updated: false };
  registry.items = registry.items || [];
  const index = registry.items.findIndex((row) => row.polyglotKey === item.polyglotKey);
  if (index >= 0) {
    registry.items[index] = {
      ...registry.items[index],
      ...item,
      createdAt: registry.items[index].createdAt || item.createdAt,
    };
    return { created: false, updated: true };
  }
  registry.items.push(item);
  registry.items.sort((a, b) => String(a.polyglotKey || "").localeCompare(String(b.polyglotKey || "")));
  return { created: true, updated: false };
}

function persistPolyglotProgressFromPublication(options, metadata, publication) {
  if (!isPolyglotMetadata(metadata) || !options.progressRegistry) return;
  const registry = loadPolyglotProgressRegistry(options.progressRegistry);
  upsertPolyglotProgress(registry, buildPolyglotProgressItem(publication));
  savePolyglotProgressRegistry(registry, options.progressRegistry);
}

function githubRunUrl() {
  const runId = process.env.GITHUB_RUN_ID || "";
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const repository = process.env.GITHUB_REPOSITORY || "";
  return runId && repository ? `${serverUrl}/${repository}/actions/runs/${runId}` : "";
}

function buildPublicationRecord({ metadata, ledgerRow, uploadedVideo, channel, thumbnailSet, thumbnailSetError = "" }) {
  const videoId = ledgerRow.youtubeVideoId;
  const playlistId = ledgerRow.youtubePlaylistId;
  const runId = process.env.GITHUB_RUN_ID || "";
  const publishAt = ledgerRow.publishAt || "";
  const isPolyglot = isPolyglotMetadata(metadata);
  const targetLangs = Array.isArray(metadata.targetLangs)
    ? metadata.targetLangs
    : String(metadata.targetLangsCsv || "").split(",").map((item) => item.trim()).filter(Boolean);
  const targetLangsCsv = metadata.targetLangsCsv || targetLangs.join(",");
  const readback = {
    uploadStatus: uploadedVideo.status?.uploadStatus || "",
    privacyStatus: uploadedVideo.status?.privacyStatus || ledgerRow.privacyStatus,
    publishAt: uploadedVideo.status?.publishAt || publishAt,
  };
  if (thumbnailSet) readback.thumbnailStatus = "custom_set";
  else if (thumbnailSetError) readback.thumbnailStatus = "forbidden_auto_first_frame";
  else if (ledgerRow.thumbnailUploadMode === "first_frame_auto") readback.thumbnailStatus = "auto_first_frame";
  if (ledgerRow.needsPlaylistCreate) readback.playlistReadback = "create_pending";
  if (ledgerRow.needsPlaylistInsert) readback.playlistItemReadback = "pending";
  if (ledgerRow.postUploadError) readback.postUploadError = ledgerRow.postUploadError;
  return {
    ...(isPolyglot ? {
      videoType: "polyglot",
      polyglotKey: metadata.polyglotKey,
      bundleKey: metadata.bundleKey,
      bundleLabel: metadata.bundleLabel,
      contentScope: metadata.contentScope || "full",
      wordLimit: metadata.wordLimit || 0,
      videoDurationSeconds: metadata.videoDurationSeconds || 0,
      maxDurationSeconds: metadata.maxDurationSeconds || 0,
      targetLangs,
      targetLangsCsv,
      targetLangsHash: metadata.targetLangsHash || metadata.targetsHash || "",
    } : {}),
    setId: metadata.setId,
    supportLang: metadata.supportLang,
    targetLang: isPolyglot ? targetLangsCsv : metadata.targetLang,
    playlist_key: ledgerRow.playlist_key,
    title: uploadedVideo.snippet?.title || metadata.title,
    youtubeVideoId: videoId,
    youtubeVideoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
    youtubePlaylistId: playlistId,
    youtubePlaylistUrl: playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : "",
    playlistItemId: ledgerRow.playlistItemId,
    channelKey: ledgerRow.channelKey,
    youtubeChannelId: ledgerRow.uploadedVideoChannelId || ledgerRow.expectedYoutubeChannelId,
    channelHandle: channel.snippet?.customUrl || "",
    privacyStatus: ledgerRow.privacyStatus,
    publicationStatus: ledgerRow.status,
    publishAt,
    scheduledPublishAt: publishAt,
    desiredPrivacyStatus: publishAt ? "public" : ledgerRow.privacyStatus,
    needsVisibilityPromotion: false,
    thumbnailSet,
    thumbnailLogoOverlay: Boolean(ledgerRow.thumbnailLogoOverlay),
    thumbnailUploadMode: thumbnailSet ? "custom" : (ledgerRow.thumbnailUploadMode || "first_frame_auto"),
    thumbnailSource: thumbnailSet ? (metadata.thumbnailSource || "") : (ledgerRow.thumbnailSource || "youtube-auto-first-frame"),
    ...(ledgerRow.thumbnailFallbackReason ? { thumbnailFallbackReason: ledgerRow.thumbnailFallbackReason } : {}),
    ...(ledgerRow.needsPlaylistCreate ? { needsPlaylistCreate: true } : {}),
    ...(ledgerRow.needsPlaylistInsert ? { needsPlaylistInsert: true } : {}),
    ...(ledgerRow.playlistCreateDeferredError ? { playlistCreateDeferredError: ledgerRow.playlistCreateDeferredError } : {}),
    ...(ledgerRow.playlistInsertDeferredError ? { playlistInsertDeferredError: ledgerRow.playlistInsertDeferredError } : {}),
    ...(ledgerRow.postUploadError ? { postUploadError: ledgerRow.postUploadError } : {}),
    ...(thumbnailSetError ? {
      needsThumbnailPermission: true,
      thumbnailSetError,
    } : {}),
    metadataSource: metadata.source || "",
    metadataModel: metadata.model || metadata.geminiModel || "",
    githubRunId: runId,
    githubRunUrl: githubRunUrl(),
    uploadedAt: ledgerRow.timestamp,
    lastReadbackAt: ledgerRow.timestamp,
    readback,
  };
}

function dryRun(plan) {
  console.log("YouTube publish dry-run");
  console.log(`metadata=${plan.metadataFile}`);
  console.log(`metadataSource=${plan.metadataSource || "(missing)"}`);
  console.log(`video=${plan.videoPath || "MISSING"}`);
  console.log(`thumbnail=${plan.thumbnailPath || "none"}`);
  console.log(`channel=${plan.channelKey} ${plan.youtube_channel_id}`);
  console.log(`playlist=${plan.playlist_key} ${plan.youtube_playlist_id || "(missing id)"}`);
  console.log(`privacy=${plan.privacyStatus}`);
  if (plan.publishAt) console.log(`publishAt=${plan.publishAt}`);
  console.log(`estimatedQuotaUnits=${plan.estimatedQuotaUnits}`);
  if (plan.blockers.length) console.log(`blockers=${plan.blockers.join("; ")}`);
  if (plan.warnings.length) console.log(`warnings=${plan.warnings.join("; ")}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.metadata) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const metadataFile = resolveExistingPath(options.metadata, "metadata");
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const playlistRegistry = loadUploadPlaylistRegistry(options.playlistRegistry, metadata);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const channel = findChannelForSupport(channelRegistry.channels, metadata.supportLang);
  if (!channel) fail(`No channel configured for supportLang=${metadata.supportLang}`);
  if (!channel.channelId) fail(`Channel ${channel.key} has no channelId.`);

  const assignment = buildUploadPlaylistAssignment(metadata);
  let playlistEntry = findUploadPlaylistEntry(playlistRegistry, assignment, metadata);
  const videoPath = resolveExistingPath(options.video || defaultVideoPath(metadataFile, metadata), "video");
  const thumbnailCandidate = options.thumbnail || defaultThumbnailPath(metadataFile, metadata);
  const thumbnailPath = thumbnailCandidate ? resolveExistingPath(thumbnailCandidate, "thumbnail") : "";
  const canUploadCustomThumbnail = customThumbnailUploadAllowed(channelRegistry, channel);
  const requestedAutoThumbnail = metadata.thumbnailUploadMode === "first_frame_auto"
    || metadata.thumbnailSource === "youtube-auto-first-frame";
  const thumbnailUploadMode = (!canUploadCustomThumbnail || requestedAutoThumbnail || !thumbnailPath)
    ? "first_frame_auto"
    : "custom";
  const thumbnailFallbackReason = !canUploadCustomThumbnail
    ? "channel_custom_thumbnail_upload_not_available"
    : (requestedAutoThumbnail
      ? (metadata.thumbnailFallbackReason || "metadata_requested_first_frame_auto")
      : (!thumbnailPath ? "custom_thumbnail_not_found" : ""));
  const thumbnailUploadPath = thumbnailUploadMode === "custom" ? thumbnailPath : "";
  const privacyStatus = options.privacyStatus || metadata.privacyStatus || "public";
  const publishAt = options.publishAt || metadata.publishAt || metadata.scheduledPublishAt || "";
  if (!["private", "unlisted", "public"].includes(privacyStatus)) fail(`Invalid privacy: ${privacyStatus}`);
  if (options.apply && privacyStatus === "public" && !options.confirmPublic) fail("privacy=public requires --confirm-public.");
  if (publishAt) {
    const publishTime = Date.parse(publishAt);
    if (privacyStatus !== "private") fail("Scheduled publishAt requires privacy=private.");
    if (!Number.isFinite(publishTime)) fail(`Invalid publishAt timestamp: ${publishAt}`);
    if (publishTime <= Date.now() + 5 * 60 * 1000) fail(`publishAt must be at least 5 minutes in the future: ${publishAt}`);
  }

  const metadataIssue = polishedMetadataIssue(metadata);
  const existingPublication = findActiveUploadPublication(publicationRegistry, metadata);
  const blockers = [
    ...(metadataIssue ? [metadataIssue] : []),
    ...(existingPublication && !options.allowRepublish ? [activeUploadPublicationBlocker(existingPublication, metadata)] : []),
    ...(publishAt && playlistEntry?.status && String(playlistEntry.status).toLowerCase().includes("unlisted")
      ? ["scheduled public release needs a public playlist; promote existing unlisted playlist before upload or create a new public playlist"]
      : []),
    ...(playlistEntry?.youtube_playlist_id || options.createPlaylist
      ? []
      : ["playlist has no youtube_playlist_id; pass --create-playlist or fill config/youtube-playlists.json"])
  ];

  const plan = {
    metadataFile,
    metadataSource: metadata.source || "",
    videoPath,
    thumbnailPath,
    thumbnailUploadPath,
    thumbnailUploadMode,
    thumbnailFallbackReason,
    customThumbnailUploadAllowed: canUploadCustomThumbnail,
    channelKey: channel.key,
    youtube_channel_id: channel.channelId,
    existingPublication: existingPublication ? {
      youtubeVideoId: existingPublication.youtubeVideoId,
      youtubeVideoUrl: existingPublication.youtubeVideoUrl || "",
      publicationStatus: existingPublication.publicationStatus || "",
      privacyStatus: existingPublication.privacyStatus || "",
      githubRunId: existingPublication.githubRunId || "",
      lastReadbackAt: existingPublication.lastReadbackAt || "",
    } : null,
    playlist_key: assignment.key,
    youtube_playlist_id: playlistEntry?.youtube_playlist_id || "",
    privacyStatus,
    publishAt,
    estimatedQuotaUnits: 1600 + (thumbnailUploadPath ? 50 : 0) + (playlistEntry?.youtube_playlist_id ? 50 : (options.createPlaylist ? 100 : 0)),
    blockers,
    warnings: thumbnailUploadMode === "custom" ? [] : [`custom thumbnail upload skipped; ${thumbnailFallbackReason || "YouTube auto first-frame fallback will be used"}`],
  };

  if (!options.apply) {
    dryRun(plan);
    return;
  }
  if (!options.confirmYoutubeWrite) fail("Live publish requires --confirm-youtube-write.");
  if (plan.blockers.length) fail(plan.blockers.join("; "));

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  resolveExistingPath(clientFile, "OAuth client");
  resolveExistingPath(tokenFile, "OAuth token");

  const ledgerBase = {
    timestamp: new Date().toISOString(),
    action: "youtube_publish_video",
    metadataFile,
    videoPath,
    thumbnailPath,
    thumbnailUploadPath,
    thumbnailUploadMode,
    thumbnailFallbackReason,
    thumbnailLogoOverlay: Boolean(metadata.thumbnailLogoOverlay),
    thumbnailSource: thumbnailUploadMode === "custom" ? (metadata.thumbnailSource || "") : "youtube-auto-first-frame",
    channelKey: channel.key,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang,
    setId: metadata.setId,
    playlist_key: assignment.key,
    expectedYoutubeChannelId: channel.channelId,
    privacyStatus,
    publishAt,
  };

  let uploadedVideoId = "";
  let youtubePlaylistId = playlistEntry?.youtube_playlist_id || "";
  let playlistItemId = "";
  let authorizedChannel = null;
  let uploadedVideo = null;
  let videoReadback = null;
  let accessToken = "";
  let playlistCreateDeferredError = "";
  let playlistInsertDeferredError = "";

  try {
    accessToken = await getAccessToken({ clientFile, tokenFile });
    authorizedChannel = await readAuthorizedChannel({
      accessToken,
      expectedChannelId: channel.channelId,
    });

    if (!playlistEntry) {
      const result = upsertPlannedUploadPlaylist(playlistRegistry, assignment, channel, metadata);
      playlistEntry = result.entry;
    }
    if (!playlistEntry.youtube_playlist_id) {
      const playlistPrivacyStatus = (privacyStatus === "public" || publishAt) ? "public" : "unlisted";
      try {
        const playlist = await youtubeJson({
          accessToken,
          method: "POST",
          pathName: "playlists",
          query: { part: "snippet,status", fields: "id,snippet(title),status(privacyStatus)" },
          body: {
            snippet: {
              title: playlistEntry.title || assignment.title,
              description: playlistEntry.description || assignment.description,
            },
            status: { privacyStatus: playlistPrivacyStatus },
          },
        });
        playlistEntry.youtube_playlist_id = playlist.id;
        playlistEntry.status = `created_${playlistPrivacyStatus}`;
        playlistEntry.lastReadbackAt = new Date().toISOString();
        delete playlistEntry.needsPlaylistCreate;
        delete playlistEntry.playlistCreateDeferredError;
        saveUploadPlaylistRegistry(playlistRegistry, options.playlistRegistry, metadata);
      } catch (error) {
        if (!publishAt || !isRecoverablePlaylistWriteError(error)) throw error;
        playlistCreateDeferredError = compactErrorMessage(error);
        playlistEntry.status = "create_pending_youtube_rate_or_quota";
        playlistEntry.needsPlaylistCreate = true;
        playlistEntry.playlistCreateDeferredAt = new Date().toISOString();
        playlistEntry.playlistCreateDeferredError = playlistCreateDeferredError;
        saveUploadPlaylistRegistry(playlistRegistry, options.playlistRegistry, metadata);
        console.warn(`::warning::Deferred playlist creation for ${assignment.key}; video upload will continue and playlist repair must run later.`);
      }
    }
    youtubePlaylistId = playlistEntry.youtube_playlist_id || "";

    const uploaded = await uploadVideoResumable({ accessToken, videoPath, metadata, privacyStatus, publishAt });
    const videoId = uploaded.id;
    uploadedVideoId = videoId;

    const uploadedVideoReadback = await readUploadedVideoWithRetry({
      accessToken,
      expectedChannelId: channel.channelId,
      videoId,
    });
    videoReadback = uploadedVideoReadback.videoReadback;
    uploadedVideo = uploadedVideoReadback.uploadedVideo;

    if (youtubePlaylistId) {
      try {
        const playlistItem = await youtubeJson({
          accessToken,
          method: "POST",
          pathName: "playlistItems",
          query: { part: "snippet,contentDetails", fields: "id,snippet(playlistId,resourceId),contentDetails(videoId)" },
          body: {
            snippet: {
              playlistId: youtubePlaylistId,
              resourceId: {
                kind: "youtube#video",
                videoId,
              },
            },
          },
        });
        playlistItemId = playlistItem.id;
      } catch (error) {
        if (!publishAt || !isRecoverablePlaylistWriteError(error)) throw error;
        playlistInsertDeferredError = compactErrorMessage(error);
        console.warn(`::warning::Deferred playlist item insert for ${assignment.key}; repair workflow must insert video ${videoId} later.`);
      }
    }

    let thumbnailResult = null;
    let thumbnailSetError = "";
    if (thumbnailUploadPath) {
      try {
        thumbnailResult = await youtubeMediaUpload({
          accessToken,
          pathName: "thumbnails/set",
          query: { videoId },
          filePath: thumbnailUploadPath,
        });
      } catch (error) {
        if (!isRecoverableThumbnailPermissionError(error)) throw error;
        thumbnailSetError = thumbnailPermissionWarning();
        if (markChannelCustomThumbnailDisabled(channelRegistry, channel.key, options.channelConfig)) {
          console.warn(`::warning::Marked channel ${channel.key} customThumbnailUploadAllowed=false after thumbnails.set forbidden.`);
        }
        console.warn(`::warning::${thumbnailSetError}`);
      }
    }

    const uploadStatus = uploadStatusWithThumbnailMode({
      publishAt,
      thumbnailSet: Boolean(thumbnailResult),
      thumbnailSetError,
      thumbnailUploadMode: thumbnailSetError ? "first_frame_auto" : thumbnailUploadMode,
    });
    const ledgerRow = {
      ...ledgerBase,
      status: statusWithPlaylistState(uploadStatus, { youtubePlaylistId, playlistItemId }),
      youtubeVideoId: videoId,
      youtubePlaylistId,
      playlistItemId,
      thumbnailSet: Boolean(thumbnailResult),
      thumbnailUploadMode: thumbnailResult ? "custom" : "first_frame_auto",
      thumbnailSource: thumbnailResult ? (metadata.thumbnailSource || "") : "youtube-auto-first-frame",
      thumbnailFallbackReason: thumbnailResult ? "" : (thumbnailSetError ? "youtube_thumbnail_permission_forbidden" : thumbnailFallbackReason),
      thumbnailLogoOverlay: Boolean(metadata.thumbnailLogoOverlay),
      ...(thumbnailSetError ? {
        needsThumbnailPermission: true,
        thumbnailSetError,
      } : {}),
      ...(!youtubePlaylistId ? {
        needsPlaylistCreate: true,
        needsPlaylistInsert: true,
        playlistCreateDeferredError,
      } : {}),
      ...(youtubePlaylistId && !playlistItemId ? {
        needsPlaylistInsert: true,
        playlistInsertDeferredError,
      } : {}),
      authorizedChannel,
      uploadedVideoChannelId: uploadedVideo.snippet?.channelId || "",
      readback: videoReadback,
    };
    appendLedger(options.ledger, ledgerRow);
    const publication = buildPublicationRecord({
      metadata,
      ledgerRow,
      uploadedVideo,
      channel: authorizedChannel,
      thumbnailSet: Boolean(thumbnailResult),
      thumbnailSetError,
    });
    upsertPublication(publicationRegistry, publication);
    savePublicationRegistry(publicationRegistry, options.publicationRegistry);
    persistPolyglotProgressFromPublication(options, metadata, publication);
    console.log(JSON.stringify(ledgerRow, null, 2));
  } catch (error) {
    const failureRow = {
      ...ledgerBase,
      status: "failed",
      youtubeVideoId: uploadedVideoId,
      youtubePlaylistId,
      playlistItemId,
      authorizedChannel,
      error: error.message,
    };
    appendLedger(options.ledger, failureRow);
    if (uploadedVideoId) {
      const fallbackUploadedVideo = uploadedVideo || {
        snippet: {
          title: metadata.title,
          channelId: channel.channelId,
        },
        status: {
          privacyStatus,
          publishAt,
          uploadStatus: "unknown",
        },
      };
      const partialBaseStatus = playlistItemId
        ? (publishAt ? "scheduled_uploaded_post_upload_partial" : "published_uploaded_post_upload_partial")
        : (publishAt ? "scheduled_uploaded" : "uploaded_public");
      const partialLedgerRow = {
        ...ledgerBase,
        status: statusWithPlaylistState(partialBaseStatus, { youtubePlaylistId, playlistItemId }),
        youtubeVideoId: uploadedVideoId,
        youtubePlaylistId,
        playlistItemId,
        thumbnailSet: false,
        authorizedChannel,
        uploadedVideoChannelId: fallbackUploadedVideo.snippet?.channelId || channel.channelId,
        readback: videoReadback,
        needsPlaylistCreate: !youtubePlaylistId,
        needsPlaylistInsert: !playlistItemId,
        ...(playlistCreateDeferredError ? { playlistCreateDeferredError } : {}),
        ...(playlistInsertDeferredError ? { playlistInsertDeferredError } : {}),
        postUploadError: error.message,
      };
      appendLedger(options.ledger, partialLedgerRow);
      const partialPublication = buildPublicationRecord({
        metadata,
        ledgerRow: partialLedgerRow,
        uploadedVideo: fallbackUploadedVideo,
        channel: authorizedChannel || { snippet: { customUrl: "" } },
        thumbnailSet: false,
      });
      upsertPublication(publicationRegistry, partialPublication);
      savePublicationRegistry(publicationRegistry, options.publicationRegistry);
      persistPolyglotProgressFromPublication(options, metadata, partialPublication);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
