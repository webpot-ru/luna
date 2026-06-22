#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  findChannelForSupport,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  normalizeLanguageCode,
  savePlaylistRegistry,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  loadPublicationRegistry,
  publicationMatches,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

function parseArgs(argv) {
  const options = {
    setId: "",
    supportLang: "",
    targetLang: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    ledger: "outputs/youtube-playlist-insert-repair-ledger.jsonl",
    apply: false,
    confirmYoutubeWrite: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--set-id=")) options.setId = arg.slice("--set-id=".length);
    else if (arg.startsWith("--set=")) options.setId = arg.slice("--set=".length);
    else if (arg.startsWith("--support=")) options.supportLang = normalizeLanguageCode(arg.slice("--support=".length));
    else if (arg.startsWith("--target=")) options.targetLang = normalizeLanguageCode(arg.slice("--target=".length));
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
    "  node scripts/youtube-repair-playlist-insert.mjs --set-id=<set> --support=<IT> --target=<AZ>",
    "",
    "Dry-run is default. Live write requires:",
    "  --apply --confirm-youtube-write",
    "",
    "This repairs an existing uploaded video row by calling playlistItems.insert only.",
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

function firstItem(response, label) {
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
  const item = firstItem(readback, "authorized channel");
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
      fields: "items(id,snippet(channelId,title),status(privacyStatus,uploadStatus,publishAt))",
    },
  });
  return firstItem(readback, "video");
}

async function readPlaylist({ accessToken, playlistId }) {
  const readback = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "playlists",
    query: {
      part: "snippet,status",
      id: playlistId,
      fields: "items(id,snippet(channelId,title),status(privacyStatus))",
    },
  });
  return firstItem(readback, "playlist");
}

async function findPlaylistItem({ accessToken, playlistId, videoId }) {
  let pageToken = "";
  do {
    const readback = await youtubeJson({
      accessToken,
      method: "GET",
      pathName: "playlistItems",
      query: {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,items(id,snippet(playlistId,resourceId(videoId)),contentDetails(videoId))",
      },
    });
    const match = (readback?.items || []).find((item) => (
      item.contentDetails?.videoId === videoId
      || item.snippet?.resourceId?.videoId === videoId
    ));
    if (match) return match;
    pageToken = readback?.nextPageToken || "";
  } while (pageToken);
  return null;
}

async function insertPlaylistItem({ accessToken, playlistId, videoId }) {
  return youtubeJson({
    accessToken,
    method: "POST",
    pathName: "playlistItems",
    query: {
      part: "snippet,contentDetails",
      fields: "id,snippet(playlistId,resourceId/videoId),contentDetails(videoId)",
    },
    body: {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    },
  });
}

function appendLedger(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
}

function githubRunUrl() {
  const runId = process.env.GITHUB_RUN_ID || "";
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const repository = process.env.GITHUB_REPOSITORY || "";
  return runId && repository ? `${serverUrl}/${repository}/actions/runs/${runId}` : "";
}

function findPublicationRow(registry, query) {
  const matches = (registry.publications || []).filter((row) => publicationMatches(row, query));
  const pending = matches.filter((row) => row.youtubeVideoId && (row.needsPlaylistInsert || !row.playlistItemId));
  if (pending.length > 1) {
    fail(`Multiple pending publication rows found for ${query.setId}/${query.supportLang}/${query.targetLang}. Refuse ambiguous repair.`);
  }
  if (pending.length === 1) return pending[0];
  if (matches.length === 1) return matches[0];
  if (!matches.length) fail(`No publication row found for ${query.setId}/${query.supportLang}/${query.targetLang}.`);
  fail(`Multiple publication rows found for ${query.setId}/${query.supportLang}/${query.targetLang}; none is clearly pending.`);
}

function statusAfterRepair(row) {
  const hasSchedule = Boolean(row.publishAt || row.scheduledPublishAt);
  if (row.thumbnailSet === false && row.thumbnailUploadMode === "first_frame_auto") {
    return hasSchedule ? "scheduled_uploaded_thumbnail_auto" : "uploaded_public_thumbnail_auto";
  }
  if (row.thumbnailSet === false && row.needsThumbnailPermission) {
    return hasSchedule ? "scheduled_uploaded_thumbnail_forbidden" : "uploaded_public_thumbnail_forbidden";
  }
  return hasSchedule ? "scheduled_uploaded" : (row.privacyStatus === "public" ? "published_uploaded" : "uploaded");
}

function normalizeTimestamp(value) {
  if (!value) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : String(value);
}

function assertExpectedState({ row, channel, video, playlist }) {
  if (!row.youtubeVideoId) fail("Publication row has no youtubeVideoId.");
  if (!row.youtubePlaylistId) fail("Publication row has no youtubePlaylistId.");
  if (row.youtubeChannelId && row.youtubeChannelId !== channel.channelId) {
    fail(`Publication row channel mismatch: expected ${channel.channelId}, registry has ${row.youtubeChannelId}.`);
  }
  if (video.snippet?.channelId !== channel.channelId) {
    fail(`Video channel mismatch: expected ${channel.channelId}, got ${video.snippet?.channelId || "(missing)"}.`);
  }
  if (playlist.snippet?.channelId !== channel.channelId) {
    fail(`Playlist channel mismatch: expected ${channel.channelId}, got ${playlist.snippet?.channelId || "(missing)"}.`);
  }
  if (row.privacyStatus && video.status?.privacyStatus !== row.privacyStatus) {
    fail(`Video privacy mismatch: expected ${row.privacyStatus}, got ${video.status?.privacyStatus || "(missing)"}.`);
  }
  const expectedPublishAt = normalizeTimestamp(row.publishAt || row.scheduledPublishAt);
  const actualPublishAt = normalizeTimestamp(video.status?.publishAt);
  if (expectedPublishAt && actualPublishAt && expectedPublishAt !== actualPublishAt) {
    fail(`Video publishAt mismatch: expected ${expectedPublishAt}, got ${actualPublishAt}.`);
  }
}

function updatePlaylistRegistry({ registry, playlistId, playlist, now }) {
  const entry = (registry.playlists || []).find((item) => item.youtube_playlist_id === playlistId);
  if (!entry) return false;
  entry.youtube_channel_id = playlist.snippet?.channelId || entry.youtube_channel_id || "";
  entry.status = playlist.status?.privacyStatus ? `created_${playlist.status.privacyStatus}` : entry.status;
  entry.lastReadbackAt = now;
  return true;
}

function buildPlan({ options, row, channel }) {
  const alreadyComplete = Boolean(row.playlistItemId) && !row.needsPlaylistInsert;
  return {
    action: "youtube_repair_playlist_insert",
    setId: options.setId,
    supportLang: options.supportLang,
    targetLang: options.targetLang,
    channelKey: channel.key,
    expectedYoutubeChannelId: channel.channelId,
    youtubeVideoId: row.youtubeVideoId || "",
    youtubePlaylistId: row.youtubePlaylistId || "",
    existingPlaylistItemId: row.playlistItemId || "",
    publicationStatus: row.publicationStatus || "",
    needsPlaylistInsert: Boolean(row.needsPlaylistInsert || !row.playlistItemId),
    alreadyComplete,
    apply: options.apply,
    estimatedQuotaUnits: alreadyComplete ? 0 : 54,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.setId || !options.supportLang || !options.targetLang) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  if (options.apply && !options.confirmYoutubeWrite) fail("Live playlist repair requires --confirm-youtube-write.");

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const channel = findChannelForSupport(channelRegistry.channels, options.supportLang);
  if (!channel) fail(`No channel configured for supportLang=${options.supportLang}`);
  if (!channel.channelId) fail(`Channel ${channel.key} has no channelId.`);

  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const playlistRegistry = loadPlaylistRegistry(options.playlistRegistry);
  const row = findPublicationRow(publicationRegistry, {
    setId: options.setId,
    supportLang: options.supportLang,
    targetLang: options.targetLang,
  });
  const plan = buildPlan({ options, row, channel });

  if (!options.apply) {
    console.log(JSON.stringify({ status: "dry_run", plan }, null, 2));
    return;
  }

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  resolveExistingPath(clientFile, "OAuth client");
  resolveExistingPath(tokenFile, "OAuth token");

  const now = new Date().toISOString();
  const ledgerBase = {
    timestamp: now,
    ...plan,
  };

  try {
    const accessToken = await getAccessToken({ clientFile, tokenFile });
    const authorizedChannel = await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
    const beforeVideo = await readVideo({ accessToken, videoId: row.youtubeVideoId });
    const beforePlaylist = await readPlaylist({ accessToken, playlistId: row.youtubePlaylistId });
    assertExpectedState({ row, channel, video: beforeVideo, playlist: beforePlaylist });

    const existingItem = await findPlaylistItem({
      accessToken,
      playlistId: row.youtubePlaylistId,
      videoId: row.youtubeVideoId,
    });
    const insertedItem = existingItem || await insertPlaylistItem({
      accessToken,
      playlistId: row.youtubePlaylistId,
      videoId: row.youtubeVideoId,
    });
    const verifiedItem = await findPlaylistItem({
      accessToken,
      playlistId: row.youtubePlaylistId,
      videoId: row.youtubeVideoId,
    });
    if (!verifiedItem?.id) {
      fail(`Playlist item verification failed for video ${row.youtubeVideoId} in playlist ${row.youtubePlaylistId}.`);
    }

    row.playlistItemId = verifiedItem.id;
    row.publicationStatus = statusAfterRepair(row);
    row.lastReadbackAt = now;
    row.playlistInsertRepairedAt = now;
    row.playlistInsertRepairStatus = existingItem ? "already_present_verified" : "inserted";
    row.playlistInsertRepairGithubRunId = process.env.GITHUB_RUN_ID || "";
    row.playlistInsertRepairGithubRunUrl = githubRunUrl();
    row.playlistInsertRepairNote = "Previous playlistItems.insert failure was repaired without reuploading the video.";
    delete row.needsPlaylistInsert;
    delete row.postUploadError;
    row.readback = {
      ...(row.readback || {}),
      uploadStatus: beforeVideo.status?.uploadStatus || row.readback?.uploadStatus || "",
      privacyStatus: beforeVideo.status?.privacyStatus || row.privacyStatus || "",
      publishAt: beforeVideo.status?.publishAt || row.publishAt || "",
      playlistItemReadback: existingItem ? "already_present_verified" : "inserted",
      playlistId: beforePlaylist.id,
      playlistPrivacyStatus: beforePlaylist.status?.privacyStatus || "",
      playlistItemId: verifiedItem.id,
      playlistInsertRepairedAt: now,
    };
    delete row.readback.postUploadError;

    const playlistRegistryUpdated = updatePlaylistRegistry({
      registry: playlistRegistry,
      playlistId: row.youtubePlaylistId,
      playlist: beforePlaylist,
      now,
    });

    savePublicationRegistry(publicationRegistry, options.publicationRegistry);
    if (playlistRegistryUpdated) savePlaylistRegistry(playlistRegistry, options.playlistRegistry);

    const ledgerRow = {
      ...ledgerBase,
      status: existingItem ? "playlist_item_already_present_registry_updated" : "playlist_item_inserted",
      playlistItemId: verifiedItem.id,
      authorizedChannel,
      before: {
        video: beforeVideo,
        playlist: beforePlaylist,
        existingPlaylistItem: existingItem,
      },
      insertResponse: existingItem ? null : insertedItem,
      readback: {
        playlistItem: verifiedItem,
      },
      registryUpdated: true,
      playlistRegistryUpdated,
    };
    appendLedger(options.ledger, ledgerRow);
    console.log(JSON.stringify(ledgerRow, null, 2));
  } catch (error) {
    appendLedger(options.ledger, {
      ...ledgerBase,
      status: "failed",
      error: error.message,
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
