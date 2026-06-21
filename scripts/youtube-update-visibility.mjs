#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  findChannelForSupport,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  savePlaylistRegistry,
} from "./lib/youtube-playlists.mjs";

const DEFAULT_PUBLICATION_REGISTRY_PATH = "config/youtube-published-videos.json";

function parseArgs(argv) {
  const options = {
    videoId: "",
    supportLang: "",
    playlistId: "",
    privacyStatus: "public",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    ledger: "outputs/youtube-visibility-ledger.jsonl",
    apply: false,
    confirmYoutubeWrite: false,
    confirmPublic: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--confirm-public") options.confirmPublic = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--video-id=")) options.videoId = arg.slice("--video-id=".length);
    else if (arg.startsWith("--support=")) options.supportLang = arg.slice("--support=".length).toUpperCase();
    else if (arg.startsWith("--playlist-id=")) options.playlistId = arg.slice("--playlist-id=".length);
    else if (arg.startsWith("--privacy=")) options.privacyStatus = arg.slice("--privacy=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--playlist-registry=")) options.playlistRegistry = arg.slice("--playlist-registry=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-update-visibility.mjs --video-id=<id> --support=<RU> [--playlist-id=<id>] --privacy=public",
    "",
    "Dry-run is default. Live write requires:",
    "  --apply --confirm-youtube-write",
    "",
    "Options:",
    "  --privacy=private|unlisted|public",
    "  --confirm-public          Required if privacy=public.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function resolveExistingPath(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) fail(`${label} not found: ${filePath}`);
  return resolved;
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
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${await response.text()}`);
  if (response.status === 204) return null;
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

async function readVideo({ accessToken, videoId }) {
  const readback = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "videos",
    query: {
      part: "snippet,status",
      id: videoId,
      fields: "items(id,snippet(channelId,title),status(privacyStatus,uploadStatus,embeddable,license,publicStatsViewable,selfDeclaredMadeForKids,containsSyntheticMedia))",
    },
  });
  return singleYouTubeItem(readback, "video");
}

async function readPlaylist({ accessToken, playlistId }) {
  if (!playlistId) return null;
  const readback = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "playlists",
    query: {
      part: "snippet,status",
      id: playlistId,
      fields: "items(id,snippet(channelId,title,description),status(privacyStatus,podcastStatus))",
    },
  });
  return singleYouTubeItem(readback, "playlist");
}

function mutableVideoStatus(currentStatus, privacyStatus) {
  const next = {
    privacyStatus,
    embeddable: currentStatus.embeddable,
    license: currentStatus.license,
    publicStatsViewable: currentStatus.publicStatsViewable,
    selfDeclaredMadeForKids: currentStatus.selfDeclaredMadeForKids ?? false,
    containsSyntheticMedia: currentStatus.containsSyntheticMedia,
  };
  return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
}

async function updateVideoPrivacy({ accessToken, video, privacyStatus }) {
  return youtubeJson({
    accessToken,
    method: "PUT",
    pathName: "videos",
    query: {
      part: "status",
      fields: "id,status(privacyStatus,uploadStatus)",
    },
    body: {
      id: video.id,
      status: mutableVideoStatus(video.status || {}, privacyStatus),
    },
  });
}

async function updatePlaylistPrivacy({ accessToken, playlist, privacyStatus }) {
  if (!playlist) return null;
  return youtubeJson({
    accessToken,
    method: "PUT",
    pathName: "playlists",
    query: {
      part: "snippet,status",
      fields: "id,snippet(channelId,title),status(privacyStatus)",
    },
    body: {
      id: playlist.id,
      snippet: {
        title: playlist.snippet?.title || "FlashcardsLuna playlist",
        description: playlist.snippet?.description || "",
      },
      status: {
        privacyStatus,
        ...(playlist.status?.podcastStatus ? { podcastStatus: playlist.status.podcastStatus } : {}),
      },
    },
  });
}

function appendLedger(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
}

function loadPublicationRegistry(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      sourceOfTruth: "docs/video-lessons-registry.md#current-published--readback-rows",
      publications: [],
    };
  }
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.publications)) fail(`Invalid publication registry: ${filePath}`);
  return registry;
}

function savePublicationRegistry(filePath, registry) {
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function updatePublicationRegistry({ filePath, videoId, privacyStatus, playlistId, readback }) {
  const registry = loadPublicationRegistry(filePath);
  const entry = registry.publications.find((item) => item.youtubeVideoId === videoId);
  if (entry) {
    entry.privacyStatus = privacyStatus;
    entry.publicationStatus = privacyStatus === "public" ? "public" : "uploaded";
    entry.youtubePlaylistId = playlistId || entry.youtubePlaylistId || "";
    entry.lastVisibilityReadbackAt = new Date().toISOString();
    entry.readback = {
      ...(entry.readback || {}),
      visibility: readback,
    };
  }
  savePublicationRegistry(filePath, registry);
}

function updatePlaylistRegistry({ filePath, playlistId, privacyStatus }) {
  if (!playlistId || !fs.existsSync(filePath)) return;
  const registry = loadPlaylistRegistry(filePath);
  const entry = registry.playlists.find((item) => item.youtube_playlist_id === playlistId);
  if (entry) {
    entry.status = privacyStatus === "public" ? "created_public" : `created_${privacyStatus}`;
    entry.lastReadbackAt = new Date().toISOString();
    savePlaylistRegistry(registry, filePath);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.videoId || !options.supportLang) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  if (!["private", "unlisted", "public"].includes(options.privacyStatus)) fail(`Invalid privacy: ${options.privacyStatus}`);
  if (options.apply && options.privacyStatus === "public" && !options.confirmPublic) fail("privacy=public requires --confirm-public.");

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const channel = findChannelForSupport(channelRegistry.channels, options.supportLang);
  if (!channel) fail(`No channel configured for supportLang=${options.supportLang}`);
  if (!channel.channelId) fail(`Channel ${channel.key} has no channelId.`);

  const plan = {
    action: "youtube_update_visibility",
    videoId: options.videoId,
    playlistId: options.playlistId,
    supportLang: options.supportLang,
    channelKey: channel.key,
    expectedYoutubeChannelId: channel.channelId,
    privacyStatus: options.privacyStatus,
    apply: options.apply,
    estimatedQuotaUnits: 50 + (options.playlistId ? 50 : 0),
  };

  if (!options.apply) {
    console.log(JSON.stringify({ status: "dry_run", plan }, null, 2));
    return;
  }
  if (!options.confirmYoutubeWrite) fail("Live visibility update requires --confirm-youtube-write.");

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  resolveExistingPath(clientFile, "OAuth client");
  resolveExistingPath(tokenFile, "OAuth token");

  const ledgerBase = {
    timestamp: new Date().toISOString(),
    ...plan,
  };

  try {
    const accessToken = await getAccessToken({ clientFile, tokenFile });
    const authorizedChannel = await readAuthorizedChannel({
      accessToken,
      expectedChannelId: channel.channelId,
    });
    const beforeVideo = await readVideo({ accessToken, videoId: options.videoId });
    if (beforeVideo.snippet?.channelId !== channel.channelId) {
      fail(`Video channel mismatch: expected ${channel.channelId}, got ${beforeVideo.snippet?.channelId || "(missing)"}.`);
    }
    const beforePlaylist = await readPlaylist({ accessToken, playlistId: options.playlistId });
    if (beforePlaylist && beforePlaylist.snippet?.channelId !== channel.channelId) {
      fail(`Playlist channel mismatch: expected ${channel.channelId}, got ${beforePlaylist.snippet?.channelId || "(missing)"}.`);
    }

    const updatedVideo = await updateVideoPrivacy({
      accessToken,
      video: beforeVideo,
      privacyStatus: options.privacyStatus,
    });
    const updatedPlaylist = await updatePlaylistPrivacy({
      accessToken,
      playlist: beforePlaylist,
      privacyStatus: options.privacyStatus,
    });
    const afterVideo = await readVideo({ accessToken, videoId: options.videoId });
    const afterPlaylist = await readPlaylist({ accessToken, playlistId: options.playlistId });
    if (afterVideo.status?.privacyStatus !== options.privacyStatus) {
      fail(`Video privacy readback mismatch: expected ${options.privacyStatus}, got ${afterVideo.status?.privacyStatus || "(missing)"}.`);
    }
    if (afterPlaylist && afterPlaylist.status?.privacyStatus !== options.privacyStatus) {
      fail(`Playlist privacy readback mismatch: expected ${options.privacyStatus}, got ${afterPlaylist.status?.privacyStatus || "(missing)"}.`);
    }

    const row = {
      ...ledgerBase,
      status: "visibility_updated",
      authorizedChannel,
      before: {
        video: beforeVideo,
        playlist: beforePlaylist,
      },
      updateResponse: {
        video: updatedVideo,
        playlist: updatedPlaylist,
      },
      readback: {
        video: afterVideo,
        playlist: afterPlaylist,
      },
    };
    appendLedger(options.ledger, row);
    updatePublicationRegistry({
      filePath: options.publicationRegistry,
      videoId: options.videoId,
      privacyStatus: options.privacyStatus,
      playlistId: options.playlistId,
      readback: row.readback,
    });
    updatePlaylistRegistry({
      filePath: options.playlistRegistry,
      playlistId: options.playlistId,
      privacyStatus: options.privacyStatus,
    });
    console.log(JSON.stringify(row, null, 2));
  } catch (error) {
    appendLedger(options.ledger, {
      ...ledgerBase,
      status: "failed",
      error: error.message,
    });
    throw error;
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
