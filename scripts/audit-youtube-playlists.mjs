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
    playlistIds: [],
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
    else if (arg === "--playlist-ids" || arg.startsWith("--playlist-ids=")) options.playlistIds = value().split(",").map((id) => id.trim()).filter(Boolean);
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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
    const text = await response.text();
    if (response.ok) return text ? JSON.parse(text) : {};
    // Only read-only transient backend responses are retried. Keep the same
    // page token so no failed page is skipped or treated as an empty result.
    if ([500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      continue;
    }
    const identity = query.playlistId ? ` playlistId=${query.playlistId}` : "";
    const error = new Error(`YouTube API GET ${url.pathname}${identity} failed (${response.status}) after ${attempt} attempts: ${text}`);
    error.statusCode = response.status;
    error.youtubePath = url.pathname;
    throw error;
  }
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
  const playlistItemIds = new Set();
  let pageToken = "";
  let pagesRead = 0;
  let itemRowsRead = 0;
  let totalResults = null;
  let totalResultsStable = true;
  let totalResultsReportedForEveryPage = true;
  let terminalRepeatedTokenRecovered = false;
  let terminalEmptyPageRecovered = false;
  let itemMembershipComplete = true;
  const seenPageTokens = new Set();
  for (let page = 0; page < maxPages; page += 1) {
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        throw new Error(`Playlist item pagination token repeated for ${playlistId}; refusing an API pagination loop`);
      }
      seenPageTokens.add(pageToken);
    }
    const response = await youtubeJson({
      accessToken,
      pathName: "playlistItems",
      query: {
        part: "contentDetails",
        playlistId,
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,pageInfo(totalResults),items(id,contentDetails(videoId))",
      },
    });
    pagesRead += 1;
    if (Number.isInteger(response.pageInfo?.totalResults)) {
      if (totalResults !== null && totalResults !== response.pageInfo.totalResults) totalResultsStable = false;
      totalResults = response.pageInfo.totalResults;
    } else {
      totalResultsReportedForEveryPage = false;
    }
    const items = response.items || [];
    itemRowsRead += items.length;
    for (const item of items) {
      if (item.id) playlistItemIds.add(item.id);
      if (item.contentDetails?.videoId) videoIds.push(item.contentDetails.videoId);
    }
    const nextPageToken = response.nextPageToken || "";
    const repeatedToken = nextPageToken && (nextPageToken === pageToken || seenPageTokens.has(nextPageToken));
    if (repeatedToken) {
      const completeByItemCount = totalResultsStable
        && totalResultsReportedForEveryPage
        && Number.isInteger(totalResults)
        && totalResults >= 0
        && itemRowsRead === totalResults
        && playlistItemIds.size === totalResults;
      if (!completeByItemCount) {
        // Some public playlists declare an item that the endpoint does not
        // return (for example, a deleted or inaccessible member), then return
        // an empty page that repeats its own cursor. The owned playlist itself
        // remains identity-readable, but its visible member set cannot prove absence.
        const emptyTerminalRepeat = nextPageToken === pageToken && items.length === 0 && itemRowsRead > 0;
        if (!emptyTerminalRepeat) {
          throw new Error(`Playlist item pagination token repeated for ${playlistId}; refusing an API pagination loop`);
        }
        terminalEmptyPageRecovered = true;
        itemMembershipComplete = false;
        pageToken = "";
        break;
      }
      terminalRepeatedTokenRecovered = true;
      pageToken = "";
      break;
    }
    pageToken = nextPageToken;
    if (!pageToken) break;
  }
  return {
    videoIds: [...new Set(videoIds)],
    pagesRead,
    itemRowsRead,
    uniquePlaylistItemCount: playlistItemIds.size,
    totalResults,
    terminalRepeatedTokenRecovered,
    terminalEmptyPageRecovered,
    itemMembershipComplete,
    paginationComplete: !pageToken,
  };
}

async function readPublicPlaylistFeed({ playlist, expectedChannelId }) {
  const itemCount = Number(playlist.itemCount);
  // The public Atom feed exposes at most the recent items. It can prove a
  // complete member set only for a small playlist with an authenticated count.
  if (playlist.privacyStatus !== "public" || !Number.isInteger(itemCount)
      || itemCount < 0 || itemCount > 15) return null;
  const url = new URL("https://www.youtube.com/feeds/videos.xml");
  url.searchParams.set("playlist_id", playlist.id);
  const response = await fetch(url);
  if (!response.ok) return null;
  const xml = await response.text();
  const feedPlaylistId = xml.match(/<yt:playlistId>([^<]+)<\/yt:playlistId>/u)?.[1];
  const feedChannelId = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/u)?.[1];
  const videoIds = [...xml.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/gu)].map((match) => match[1]);
  if (feedPlaylistId !== playlist.id || feedChannelId !== expectedChannelId
      || videoIds.length !== itemCount || new Set(videoIds).size !== itemCount) return null;
  return {
    videoIds,
    pagesRead: 0,
    itemRowsRead: itemCount,
    uniquePlaylistItemCount: itemCount,
    totalResults: itemCount,
    itemMembershipComplete: true,
    paginationComplete: true,
    membershipSource: "verified_public_feed_after_api_404",
  };
}

export async function readOwnedPlaylists({ accessToken, expectedChannelId, maxPlaylistPages, maxItemPages, playlistIds = [] }) {
  const selectedPlaylistIds = [...new Set((playlistIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const playlists = [];
  let pageToken = "";
  let playlistPagesRead = 0;
  for (let page = 0; page < maxPlaylistPages; page += 1) {
    const response = await youtubeJson({
      accessToken,
      pathName: "playlists",
      query: {
        part: "snippet,status,contentDetails",
        mine: "true",
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,items(id,snippet(title,description,channelId),status(privacyStatus),contentDetails(itemCount))",
      },
    });
    playlistPagesRead += 1;
    playlists.push(...(response.items || []).map((row) => ({
      id: row.id,
      title: row.snippet?.title || "",
      description: row.snippet?.description || "",
      youtubeChannelId: row.snippet?.channelId || "",
      privacyStatus: row.status?.privacyStatus || "",
      itemCount: row.contentDetails?.itemCount,
    })));
    pageToken = response.nextPageToken || "";
    if (!pageToken) break;
  }
  if (pageToken) throw new Error(`Playlist pagination exceeded maxPlaylistPages=${maxPlaylistPages}`);
  if (selectedPlaylistIds.length) {
    const discoveredIds = new Set(playlists.map((playlist) => playlist.id));
    const missingIds = selectedPlaylistIds.filter((id) => !discoveredIds.has(id));
    if (missingIds.length) throw new Error(`Selected playlist ID(s) were not found in complete owned playlist discovery: ${missingIds.join(",")}`);
  }
  const playlistsToRead = selectedPlaylistIds.length
    ? playlists.filter((playlist) => selectedPlaylistIds.includes(playlist.id))
    : playlists;
  const discoveredPlaylists = [];
  const disappearedPlaylistIds = [];
  for (const playlist of playlistsToRead) {
    if (playlist.youtubeChannelId && playlist.youtubeChannelId !== expectedChannelId) {
      throw new Error(`Playlist ${playlist.id} belongs to unexpected channel ${playlist.youtubeChannelId}`);
    }
    let items;
    try {
      items = await readPlaylistItems({ accessToken, playlistId: playlist.id, maxPages: maxItemPages });
    } catch (error) {
      // An owned public playlist can return 404 from playlistItems.list while
      // its public feed still lists every member. Recover identity only when
      // the authenticated item count and feed ID/owner/member set agree.
      // Otherwise retain the unavailable ID as a blocker for callers.
      if (error?.statusCode === 404 && error?.youtubePath === "/youtube/v3/playlistItems") {
        items = await readPublicPlaylistFeed({ playlist, expectedChannelId }).catch(() => null);
        if (!items) {
          disappearedPlaylistIds.push(playlist.id);
          continue;
        }
      } else {
        throw error;
      }
    }
    if (!items.paginationComplete) throw new Error(`Playlist item pagination exceeded maxItemPages=${maxItemPages} for ${playlist.id}`);
    playlist.videoIds = items.videoIds;
    playlist.itemPagesRead = items.pagesRead;
    playlist.itemRowsRead = items.itemRowsRead;
    playlist.uniquePlaylistItemCount = items.uniquePlaylistItemCount;
    playlist.itemTotalResults = items.totalResults;
    playlist.terminalRepeatedTokenRecovered = items.terminalRepeatedTokenRecovered;
    playlist.terminalEmptyPageRecovered = items.terminalEmptyPageRecovered;
    playlist.itemMembershipComplete = items.itemMembershipComplete;
    playlist.itemPaginationComplete = items.itemMembershipComplete;
    if (items.membershipSource) playlist.membershipSource = items.membershipSource;
    discoveredPlaylists.push(playlist);
  }
  return {
    playlists: discoveredPlaylists,
    scope: selectedPlaylistIds.length ? "selected_playlists" : "owned_playlists",
    selectedPlaylistIds,
    disappearedPlaylistIds,
    playlistPagesRead,
    itemPagesRead: discoveredPlaylists.reduce((total, row) => total + Number(row.itemPagesRead || 0), 0),
    terminalRepeatedTokenRecoveryCount: discoveredPlaylists.filter((row) => row.terminalRepeatedTokenRecovered).length,
    terminalEmptyPageRecoveryCount: discoveredPlaylists.filter((row) => row.terminalEmptyPageRecovered).length,
    itemMembershipIncompletePlaylistCount: discoveredPlaylists.filter((row) => row.itemMembershipComplete === false).length,
    paginationComplete: true,
  };
}

export async function auditYoutubePlaylists(options) {
  if (!options.supports?.length && !options.allowEmpty) throw new Error("--support is required unless --allow-empty is set");
  if (!options.routeKey) throw new Error("--route-key is required");
  if (!Number.isInteger(options.maxPlaylistPages) || options.maxPlaylistPages < 1) throw new Error("--max-playlist-pages must be a positive integer");
  if (!Number.isInteger(options.maxItemPages) || options.maxItemPages < 1) throw new Error("--max-item-pages must be a positive integer");
  if (new Set(options.playlistIds).size !== options.playlistIds.length) throw new Error("--playlist-ids must not contain duplicates");
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
      playlistIds: options.playlistIds,
    });
    channels.push({
      supportLang,
      channelKey: channel.key,
      youtubeChannelId: channel.channelId,
      authorizedChannelTitle: authorized.snippet?.title || "",
      scope: inventory.scope,
      selectedPlaylistIds: inventory.selectedPlaylistIds,
      complete: inventory.paginationComplete,
      playlistPagesRead: inventory.playlistPagesRead,
      itemPagesRead: inventory.itemPagesRead,
      terminalRepeatedTokenRecoveryCount: inventory.terminalRepeatedTokenRecoveryCount,
      terminalEmptyPageRecoveryCount: inventory.terminalEmptyPageRecoveryCount,
      itemMembershipIncompletePlaylistCount: inventory.itemMembershipIncompletePlaylistCount,
      disappearedPlaylistIds: inventory.disappearedPlaylistIds,
      playlists: inventory.playlists,
    });
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_playlist_discovery_read_only",
    scope: options.playlistIds.length ? "selected_playlists" : "owned_playlists",
    selectedPlaylistIds: options.playlistIds,
    routeKey: options.routeKey,
    complete: channels.length === options.supports.length && channels.every((row) => row.complete),
    summary: {
      supportCount: channels.length,
      playlistCount: channels.reduce((total, row) => total + row.playlists.length, 0),
      playlistPagesRead: channels.reduce((total, row) => total + row.playlistPagesRead, 0),
      itemPagesRead: channels.reduce((total, row) => total + row.itemPagesRead, 0),
      terminalRepeatedTokenRecoveryCount: channels.reduce((total, row) => total + row.terminalRepeatedTokenRecoveryCount, 0),
      terminalEmptyPageRecoveryCount: channels.reduce((total, row) => total + row.terminalEmptyPageRecoveryCount, 0),
      itemMembershipIncompletePlaylistCount: channels.reduce((total, row) => total + row.itemMembershipIncompletePlaylistCount, 0),
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
    console.log("node scripts/audit-youtube-playlists.mjs --support=EN,RU --route-key=youtube-1 [--playlist-ids=PL...,...] --output=outputs/youtube-playlist-discovery-youtube-1.json");
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
