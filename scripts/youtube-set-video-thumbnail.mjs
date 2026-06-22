#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
  saveYoutubeChannels,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  loadPublicationRegistry,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_LEDGER_PATH = "outputs/youtube-thumbnail-ledger.jsonl";

function parseArgs(argv) {
  const options = {
    videoId: "",
    metadata: "",
    thumbnail: "",
    supportLang: "",
    targetLang: "",
    setId: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    ledger: DEFAULT_LEDGER_PATH,
    apply: false,
    confirmYoutubeWrite: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--video-id=")) options.videoId = arg.slice("--video-id=".length);
    else if (arg.startsWith("--metadata=")) options.metadata = arg.slice("--metadata=".length);
    else if (arg.startsWith("--thumbnail=")) options.thumbnail = arg.slice("--thumbnail=".length);
    else if (arg.startsWith("--support=")) options.supportLang = arg.slice("--support=".length);
    else if (arg.startsWith("--target=")) options.targetLang = arg.slice("--target=".length);
    else if (arg.startsWith("--set-id=")) options.setId = arg.slice("--set-id=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-set-video-thumbnail.mjs --video-id=<id> --metadata=<youtube_metadata.json> --thumbnail=<image>",
    "",
    "Dry-run is default. Live YouTube write requires:",
    "  --apply --confirm-youtube-write",
    "",
    "The script verifies OAuth channel identity and video channel ownership before calling thumbnails.set.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  fail(`Unsupported thumbnail extension: ${filePath}`);
}

function resolveExistingPath(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) fail(`${label} not found: ${filePath}`);
  return resolved;
}

function readJson(filePath, label) {
  return JSON.parse(fs.readFileSync(resolveExistingPath(filePath, label), "utf8"));
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

async function youtubeJson({ accessToken, method, pathName, query = {} }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function youtubeMediaUpload({ accessToken, pathName, query = {}, filePath }) {
  const body = fs.readFileSync(filePath);
  const url = new URL(pathName, "https://www.googleapis.com/upload/youtube/v3/");
  for (const [key, value] of Object.entries({ uploadType: "media", ...query })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": detectMimeType(filePath),
      "content-length": String(body.length),
    },
    body,
  });
  if (!response.ok) fail(`YouTube media upload ${url.pathname} failed (${response.status}): ${await response.text()}`);
  return response.json();
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

async function readVideo({ accessToken, videoId, expectedChannelId }) {
  const readback = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "videos",
    query: {
      part: "snippet,status",
      id: videoId,
      fields: "items(id,snippet(channelId,title,thumbnails),status(privacyStatus,uploadStatus,publishAt))",
    },
  });
  const item = singleYouTubeItem(readback, "video");
  if (item.id !== videoId) fail(`Video readback mismatch: expected ${videoId}, got ${item.id}.`);
  const actualChannelId = item.snippet?.channelId || "";
  if (actualChannelId !== expectedChannelId) {
    fail(`Video channel mismatch: expected ${expectedChannelId}, got ${actualChannelId || "(missing)"}.`);
  }
  return item;
}

function appendLedger(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
}

function findPublication(registry, { videoId, setId, supportLang, targetLang }) {
  const normalizedSupport = normalizeLanguageCode(supportLang);
  const normalizedTarget = normalizeLanguageCode(targetLang);
  return (registry.publications || []).find((row) => row.youtubeVideoId === videoId)
    || (registry.publications || []).find((row) => {
      return String(row.setId || "") === String(setId || "")
        && normalizeLanguageCode(row.supportLang) === normalizedSupport
        && normalizeLanguageCode(row.targetLang) === normalizedTarget;
    })
    || null;
}

function markChannelCustomThumbnailEnabled(channelRegistry, channelKey) {
  const channel = (channelRegistry.channels || []).find((item) => item.key === channelKey);
  if (!channel) return false;
  channel.customThumbnailUploadAllowed = true;
  channel.thumbnailFallbackMode = "custom_when_available";
  const supersededFragment = "thumbnails.set returned domain=youtube.thumbnail / reason=forbidden";
  channel.notes = Array.isArray(channel.notes) ? channel.notes : [];
  channel.notes = channel.notes.map((note) => (
    String(note).includes(supersededFragment)
      ? `${note} Superseded on 2026-06-22: thumbnails.set later succeeded after channel confirmation.`
      : note
  ));
  const successNote = "2026-06-22 YouTube API thumbnails.set succeeded after channel confirmation; custom thumbnail upload is enabled for future runs.";
  if (!channel.notes.includes(successNote)) channel.notes.push(successNote);
  return true;
}

function updatePublication({ registry, publication, metadata, video, thumbnailPath, thumbnailResult, now }) {
  if (!publication) return false;
  publication.thumbnailSet = true;
  publication.thumbnailUploadMode = "custom";
  publication.thumbnailSource = metadata.thumbnailSource || publication.thumbnailSource || "custom";
  publication.thumbnailLogoOverlay = Boolean(metadata.thumbnailLogoOverlay ?? publication.thumbnailLogoOverlay);
  publication.publicationStatus = publication.publishAt ? "scheduled_uploaded" : "published_uploaded";
  publication.lastReadbackAt = now;
  publication.lastThumbnailReadbackAt = now;
  publication.thumbnailUploadedAt = now;
  publication.thumbnailUploadEvidence = {
    source: "youtube.thumbnails.set",
    imageFileName: path.basename(thumbnailPath),
    responseItemCount: Array.isArray(thumbnailResult?.items) ? thumbnailResult.items.length : 0,
  };
  delete publication.thumbnailFallbackReason;
  delete publication.needsThumbnailPermission;
  delete publication.thumbnailSetError;
  publication.readback = {
    ...(publication.readback || {}),
    uploadStatus: video.status?.uploadStatus || publication.readback?.uploadStatus || "",
    privacyStatus: video.status?.privacyStatus || publication.privacyStatus || "",
    publishAt: video.status?.publishAt || publication.publishAt || "",
    channelId: video.snippet?.channelId || publication.youtubeChannelId || "",
    thumbnailStatus: "custom_set",
  };
  registry.publications = registry.publications || [];
  return true;
}

function buildPlan(options, metadata, channel, publication, thumbnailPath) {
  return {
    videoId: options.videoId,
    setId: options.setId || metadata.setId || publication?.setId || "",
    supportLang: normalizeLanguageCode(options.supportLang || metadata.supportLang || publication?.supportLang || ""),
    targetLang: normalizeLanguageCode(options.targetLang || metadata.targetLang || publication?.targetLang || ""),
    title: metadata.title || publication?.title || "",
    thumbnailPath,
    thumbnailSizeBytes: fs.statSync(thumbnailPath).size,
    thumbnailSource: metadata.thumbnailSource || publication?.thumbnailSource || "",
    channelKey: channel.key,
    expectedYoutubeChannelId: channel.channelId,
    publicationFound: Boolean(publication),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.videoId) fail("--video-id is required.");
  if (!options.thumbnail) fail("--thumbnail is required.");

  const metadata = options.metadata ? readJson(options.metadata, "YouTube metadata") : {};
  const thumbnailPath = resolveExistingPath(options.thumbnail, "thumbnail");
  detectMimeType(thumbnailPath);

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const setId = options.setId || metadata.setId || "";
  const supportLang = normalizeLanguageCode(options.supportLang || metadata.supportLang || "");
  const targetLang = normalizeLanguageCode(options.targetLang || metadata.targetLang || "");
  if (!supportLang) fail("--support or metadata.supportLang is required.");
  const channel = findChannelForSupport(channelRegistry.channels, supportLang);
  if (!channel) fail(`No YouTube channel configured for support language ${supportLang}.`);
  const publication = findPublication(publicationRegistry, {
    videoId: options.videoId,
    setId,
    supportLang,
    targetLang,
  });
  const plan = buildPlan(options, metadata, channel, publication, thumbnailPath);

  if (!options.apply) {
    console.log("YouTube thumbnail dry-run");
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  if (!options.confirmYoutubeWrite) fail("Live YouTube thumbnail write requires --confirm-youtube-write.");

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  resolveExistingPath(clientFile, "OAuth client");
  resolveExistingPath(tokenFile, "OAuth token");

  const now = new Date().toISOString();
  const ledgerBase = {
    timestamp: now,
    action: "youtube_set_video_thumbnail",
    videoId: options.videoId,
    setId: plan.setId,
    supportLang: plan.supportLang,
    targetLang: plan.targetLang,
    channelKey: channel.key,
    expectedYoutubeChannelId: channel.channelId,
    thumbnailPath,
    thumbnailSource: plan.thumbnailSource,
    thumbnailSizeBytes: plan.thumbnailSizeBytes,
  };

  try {
    const accessToken = await getAccessToken({ clientFile, tokenFile });
    const authorizedChannel = await readAuthorizedChannel({
      accessToken,
      expectedChannelId: channel.channelId,
    });
    const videoBefore = await readVideo({
      accessToken,
      videoId: options.videoId,
      expectedChannelId: channel.channelId,
    });
    const thumbnailResult = await youtubeMediaUpload({
      accessToken,
      pathName: "thumbnails/set",
      query: { videoId: options.videoId },
      filePath: thumbnailPath,
    });
    const videoAfter = await readVideo({
      accessToken,
      videoId: options.videoId,
      expectedChannelId: channel.channelId,
    });

    markChannelCustomThumbnailEnabled(channelRegistry, channel.key);
    updatePublication({
      registry: publicationRegistry,
      publication,
      metadata,
      video: videoAfter,
      thumbnailPath,
      thumbnailResult,
      now,
    });
    saveYoutubeChannels(channelRegistry, options.channelConfig);
    savePublicationRegistry(publicationRegistry, options.publicationRegistry);

    const ledgerRow = {
      ...ledgerBase,
      status: "custom_thumbnail_set",
      authorizedChannel,
      videoBefore: {
        id: videoBefore.id,
        channelId: videoBefore.snippet?.channelId || "",
        privacyStatus: videoBefore.status?.privacyStatus || "",
        publishAt: videoBefore.status?.publishAt || "",
      },
      videoAfter: {
        id: videoAfter.id,
        channelId: videoAfter.snippet?.channelId || "",
        privacyStatus: videoAfter.status?.privacyStatus || "",
        publishAt: videoAfter.status?.publishAt || "",
      },
      thumbnailResultSummary: {
        kind: thumbnailResult?.kind || "",
        etag: thumbnailResult?.etag || "",
        itemCount: Array.isArray(thumbnailResult?.items) ? thumbnailResult.items.length : 0,
      },
      publicationRegistryUpdated: Boolean(publication),
    };
    appendLedger(options.ledger, ledgerRow);
    console.log(JSON.stringify(ledgerRow, null, 2));
  } catch (error) {
    const ledgerRow = {
      ...ledgerBase,
      status: "failed",
      error: error.message,
    };
    appendLedger(options.ledger, ledgerRow);
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
