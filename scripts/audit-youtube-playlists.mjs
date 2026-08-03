#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";

function parseArgs(argv) {
  const options = {
    supports: [],
    routeKey: "",
    channelConfig: "config/youtube-channels.json",
    output: "outputs/youtube-playlist-discovery.json",
    maxPlaylistPages: 20,
    // Owned playlists can legitimately contain many thousands of entries. Keep
    // the read-only identity audit complete for those playlists while still
    // failing closed if an unexpectedly large playlist exceeds the safety cap.
    maxItemPages: 1000,
    allowEmpty: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--support" || arg.startsWith("--support=")) options.supports = value().split(",").map(normalizeLanguageCode).filter(Boolean);
    else if (arg === "--route-key" || arg.startsWith("--route-key=")) options.routeKey = value();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--max-playlist-pages" || arg.startsWith("--max-playlist-pages=")) options.maxPlaylistPages = Number(value());
    else if (arg === "--max-item-pages" || arg.startsWith("--max-item-pages=")) options.maxItemPages = Number(value());
    else if (arg === "--allow-empty") options.allowEmpty = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label} at ${filePath}: ${error.message}`);
  }
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
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  return path.join(channelRegistry.defaults?.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

async function getAccessToken({ clientFile, tokenFile }) {
  const client = loadOAuthClient(clientFile);
  const token = readJson(tokenFile, "OAuth token");
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) throw new Error(`OAuth token file has no refresh_token: ${tokenFile}`);
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
  if (!response.ok) throw new Error(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
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

async function youtubeJson({ accessToken, pathName, query = {} }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`YouTube API GET ${url.pathname} failed (${response.status}): ${text}`);
    error.statusCode = response.status;
    error.youtubePath = url.pathname;
    throw error;
  }
  return text ? JSON.parse(text) : {};
}

async function readAuthorizedChannel({ accessToken, expectedChannelId }) {
  const response = await youtubeJson({
    accessToken,
    pathName: "channels",
    query: { part: "snippet", mine: "true", fields: "items(id,snippet(title,customUrl))" },
  });
  const channel = response.items?.[0];
  if (!channel) throw new Error("YouTube authorized channel readback returned no items");
  if (channel.id !== expectedChannelId) throw new Error(`OAuth token channel mismatch: expected ${expectedChannelId}, got ${channel.id}`);
  return channel;
}

async function readPlaylistItems({ accessToken, playlistId, maxPages }) {
  const videoIds = [];
  let pageToken = "";
  let pagesRead = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await youtubeJson({
      accessToken,
      pathName: "playlistItems",
      query: {
        part: "contentDetails",
        playlistId,
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,items(contentDetails(videoId))",
      },
    });
    pagesRead += 1;
    videoIds.push(...(response.items || []).map((row) => row.contentDetails?.videoId).filter(Boolean));
    pageToken = response.nextPageToken || "";
    if (!pageToken) break;
  }
  return {
    videoIds: [...new Set(videoIds)],
    pagesRead,
    paginationComplete: !pageToken,
  };
}

export async function readOwnedPlaylists({ accessToken, expectedChannelId, maxPlaylistPages, maxItemPages }) {
  const playlists = [];
  let pageToken = "";
  let playlistPagesRead = 0;
  for (let page = 0; page < maxPlaylistPages; page += 1) {
    const response = await youtubeJson({
      accessToken,
      pathName: "playlists",
      query: {
        part: "snippet,status",
        mine: "true",
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,items(id,snippet(title,description,channelId),status(privacyStatus))",
      },
    });
    playlistPagesRead += 1;
    playlists.push(...(response.items || []).map((row) => ({
      id: row.id,
      title: row.snippet?.title || "",
      description: row.snippet?.description || "",
      youtubeChannelId: row.snippet?.channelId || "",
      privacyStatus: row.status?.privacyStatus || "",
    })));
    pageToken = response.nextPageToken || "";
    if (!pageToken) break;
  }
  if (pageToken) throw new Error(`Playlist pagination exceeded maxPlaylistPages=${maxPlaylistPages}`);
  const discoveredPlaylists = [];
  const disappearedPlaylistIds = [];
  for (const playlist of playlists) {
    if (playlist.youtubeChannelId && playlist.youtubeChannelId !== expectedChannelId) {
      throw new Error(`Playlist ${playlist.id} belongs to unexpected channel ${playlist.youtubeChannelId}`);
    }
    let items;
    try {
      items = await readPlaylistItems({ accessToken, playlistId: playlist.id, maxPages: maxItemPages });
    } catch (error) {
      // `playlists.list(mine=true)` and `playlistItems.list` are not one
      // transaction. A playlist removed between those two read-only calls is
      // no longer a live playlist; keep the fact visible, but do not fail
      // unrelated channel discovery or silently retain its stale identity.
      if (error?.statusCode === 404 && error?.youtubePath === "/youtube/v3/playlistItems") {
        disappearedPlaylistIds.push(playlist.id);
        continue;
      }
      throw error;
    }
    if (!items.paginationComplete) throw new Error(`Playlist item pagination exceeded maxItemPages=${maxItemPages} for ${playlist.id}`);
    playlist.videoIds = items.videoIds;
    playlist.itemPagesRead = items.pagesRead;
    playlist.itemPaginationComplete = true;
    discoveredPlaylists.push(playlist);
  }
  return {
    playlists: discoveredPlaylists,
    disappearedPlaylistIds,
    playlistPagesRead,
    itemPagesRead: discoveredPlaylists.reduce((total, row) => total + Number(row.itemPagesRead || 0), 0),
    paginationComplete: true,
  };
}

export async function auditYoutubePlaylists(options) {
  if (!options.supports?.length && !options.allowEmpty) throw new Error("--support is required unless --allow-empty is set");
  if (!options.routeKey) throw new Error("--route-key is required");
  if (!Number.isInteger(options.maxPlaylistPages) || options.maxPlaylistPages < 1) throw new Error("--max-playlist-pages must be a positive integer");
  if (!Number.isInteger(options.maxItemPages) || options.maxItemPages < 1) throw new Error("--max-item-pages must be a positive integer");
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const channels = [];
  for (const supportLang of options.supports) {
    const channel = findChannelForSupport(channelRegistry.channels, supportLang);
    if (!channel?.channelId) throw new Error(`No configured YouTube channel for support=${supportLang}`);
    const tokenFile = tokenFileFor(channelRegistry, channel);
    const accessToken = await getAccessToken({ clientFile, tokenFile });
    const authorized = await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
    const inventory = await readOwnedPlaylists({
      accessToken,
      expectedChannelId: channel.channelId,
      maxPlaylistPages: options.maxPlaylistPages,
      maxItemPages: options.maxItemPages,
    });
    channels.push({
      supportLang,
      channelKey: channel.key,
      youtubeChannelId: channel.channelId,
      authorizedChannelTitle: authorized.snippet?.title || "",
      complete: inventory.paginationComplete,
      playlistPagesRead: inventory.playlistPagesRead,
      itemPagesRead: inventory.itemPagesRead,
      disappearedPlaylistIds: inventory.disappearedPlaylistIds,
      playlists: inventory.playlists,
    });
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_playlist_discovery_read_only",
    routeKey: options.routeKey,
    complete: channels.length === options.supports.length && channels.every((row) => row.complete),
    summary: {
      supportCount: channels.length,
      playlistCount: channels.reduce((total, row) => total + row.playlists.length, 0),
      playlistPagesRead: channels.reduce((total, row) => total + row.playlistPagesRead, 0),
      itemPagesRead: channels.reduce((total, row) => total + row.itemPagesRead, 0),
      disappearedPlaylistCount: channels.reduce((total, row) => total + (row.disappearedPlaylistIds || []).length, 0),
      youtubeReadCalls: channels.length + channels.reduce((total, row) => total + row.playlistPagesRead + row.itemPagesRead, 0),
      youtubeWrites: 0,
    },
    channels,
  };
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/audit-youtube-playlists.mjs --support=EN,RU --route-key=youtube-1 --output=outputs/youtube-playlist-discovery-youtube-1.json");
    return;
  }
  const report = await auditYoutubePlaylists(options);
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(options.json ? report : { routeKey: report.routeKey, complete: report.complete, ...report.summary, output: options.output }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
