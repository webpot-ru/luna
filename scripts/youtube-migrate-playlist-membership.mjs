#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MANIFEST_PATH = "config/youtube-playlist-membership-migration-deck1-20260925.json";
const ROUTES = new Set(["youtube-1", "youtube-3", "youtube-4"]);
const fail = (message) => { throw new Error(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ACCEPTED_FROM_SOURCE_RUN = new Set(["kagAu_6Ry9E", "0kgDTI2hTdg", "r6qSzH_CXy4"]);

export function validateManifest(manifest, { root = process.cwd() } = {}) {
  if (manifest.schemaVersion !== 1 || manifest.id !== "deck1-canonical-playlist-membership-20260925" || manifest.rows?.length !== 20) fail("Unexpected migration manifest identity/count.");
  if (manifest.recovery?.sourceApplyRunId !== "36135383035" || manifest.recovery?.readOnlyControlRunId !== "36157849874" || manifest.recovery?.maximumNewPlaylistInserts !== 17 || !same([...manifest.recovery.alreadyAcceptedVideoIds].sort(), [...ACCEPTED_FROM_SOURCE_RUN].sort())) fail("Unexpected exact recovery-17 evidence/scope.");
  const ordinary = readJson(path.join(root, "config/youtube-published-videos.json")).publications;
  const polyglot = readJson(path.join(root, "config/youtube-polyglot-published-videos.json")).publications;
  const ordinaryLists = readJson(path.join(root, "config/youtube-playlists.json")).playlists;
  const polyglotLists = readJson(path.join(root, "config/youtube-polyglot-playlists.json")).playlists;
  const channels = readJson(path.join(root, "config/youtube-channels.json")).channels;
  const routing = readJson(path.join(root, "config/youtube-api-project-routing.json")).projects;
  const seen = new Set();
  for (const item of manifest.rows) {
    if (seen.has(item.youtubeVideoId)) fail(`Duplicate migration video ${item.youtubeVideoId}.`);
    seen.add(item.youtubeVideoId);
    if (!ROUTES.has(item.route) || !item.title || !item.youtubeVideoId || !item.destinationPlaylistKey) fail(`Incomplete migration row ${item.youtubeVideoId}.`);
    if (!item.sourcePlaylistIds?.length || item.sourcePlaylistIds.includes(item.destinationPlaylistId)) fail(`Invalid source playlist for ${item.youtubeVideoId}.`);
    const isPolyglot = item.destinationPlaylistKey.startsWith("POLYGLOT__");
    const videoRows = (isPolyglot ? polyglot : ordinary).filter((row) => row.youtubeVideoId === item.youtubeVideoId);
    if (videoRows.length !== 1) fail(`Expected one durable video row for ${item.youtubeVideoId}; found ${videoRows.length}.`);
    const videoRow = videoRows[0];
    if (videoRow.setId !== item.setId || videoRow.supportLang !== item.supportLang || videoRow.targetLang !== item.targetLang || (videoRow.youtubeChannelId && videoRow.youtubeChannelId !== item.youtubeChannelId) || (videoRow.title && videoRow.title !== item.title)) fail(`Durable video identity mismatch for ${item.youtubeVideoId}.`);
    if (isPolyglot && !same(videoRow.targetLangs, item.targetLangs)) fail(`Polyglot target mismatch for ${item.youtubeVideoId}.`);
    if (videoRow.playlist_key && videoRow.playlist_key !== item.destinationPlaylistKey) fail(`Durable playlist key mismatch for ${item.youtubeVideoId}.`);
    if (item.durableVideoPlaylistKey !== (videoRow.playlist_key || "") && !(videoRow.youtubePlaylistId === item.destinationPlaylistId && videoRow.playlist_key === item.destinationPlaylistKey && videoRow.playlistItemId)) fail(`Manifest playlist-key evidence drift for ${item.youtubeVideoId}.`);
    if (videoRow.youtubePlaylistId && !item.sourcePlaylistIds.includes(videoRow.youtubePlaylistId) && videoRow.youtubePlaylistId !== item.destinationPlaylistId) fail(`Unexpected durable playlist for ${item.youtubeVideoId}.`);
    const listRows = (isPolyglot ? polyglotLists : ordinaryLists).filter((row) => row.playlist_key === item.destinationPlaylistKey);
    if (listRows.length !== 1) fail(`Expected one canonical playlist registry row for ${item.youtubeVideoId}.`);
    const list = listRows[0];
    if (list.youtube_playlist_id !== item.destinationPlaylistId || list.youtube_channel_id !== item.youtubeChannelId || list.supportLang !== item.supportLang || list.channelKey !== item.channelKey) fail(`Canonical playlist identity mismatch for ${item.youtubeVideoId}.`);
    if (isPolyglot ? !same(list.targetLangs, item.targetLangs) : list.targetLang !== item.targetLang) fail(`Canonical playlist target mismatch for ${item.youtubeVideoId}.`);
    const channel = channels.find((row) => row.key === item.channelKey);
    if (!channel || channel.channelId !== item.youtubeChannelId || !channel.supportLangs.includes(item.supportLang)) fail(`Channel identity mismatch for ${item.youtubeVideoId}.`);
    const route = routing.find((row) => row.key === item.route);
    if (!route?.publicationReady || !(route.supportVariants || []).includes(item.supportLang)) fail(`Active route mismatch for ${item.youtubeVideoId}.`);
  }
  return { rows: manifest.rows.length, ordinary: manifest.rows.filter((r) => !r.destinationPlaylistKey.startsWith("POLYGLOT__")).length, polyglot: manifest.rows.filter((r) => r.destinationPlaylistKey.startsWith("POLYGLOT__")).length };
}

function parseArgs(argv) {
  const args = { manifest: MANIFEST_PATH, route: "", apply: false, confirm: "", receipts: "" };
  for (const arg of argv) {
    if (arg.startsWith("--manifest=")) args.manifest = arg.slice(11);
    else if (arg.startsWith("--route=")) args.route = arg.slice(8);
    else if (arg.startsWith("--receipts=")) args.receipts = arg.slice(11);
    else if (arg.startsWith("--confirm=")) args.confirm = arg.slice(10);
    else if (arg === "--apply") args.apply = true;
    else fail(`Unknown argument ${arg}.`);
  }
  return args;
}

async function api(token, method, endpoint, query = {}, body) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [key, value] of Object.entries(query)) if (value) url.searchParams.set(key, String(value));
  const response = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.text();
  if (!response.ok) fail(`YouTube ${method} ${endpoint} failed (${response.status}). Stop; a write may be ambiguous. ${result.slice(0, 500)}`);
  return result ? JSON.parse(result) : {};
}

async function accessToken(channel) {
  const clientPath = ".local/youtube-oauth/google-oauth-client.json";
  const tokenPath = channel.oauthTokenFile || `.local/youtube-oauth/tokens/${channel.key}.json`;
  const clientJson = readJson(clientPath);
  const client = clientJson.installed || clientJson.web || clientJson;
  const saved = readJson(tokenPath);
  if (saved.access_token && Number(saved.expires_at || 0) > Date.now() + 60_000) return saved.access_token;
  if (!saved.refresh_token) fail(`OAuth refresh token missing for channel ${channel.key}.`);
  const response = await fetch(client.token_uri || "https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret, refresh_token: saved.refresh_token, grant_type: "refresh_token" }) });
  if (!response.ok) fail(`OAuth refresh failed for channel ${channel.key} (${response.status}).`);
  const refreshed = await response.json();
  const next = { ...saved, ...refreshed, refresh_token: refreshed.refresh_token || saved.refresh_token, expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000 };
  fs.writeFileSync(tokenPath, `${JSON.stringify(next, null, 2)}\n`);
  return next.access_token;
}

async function one(token, endpoint, query, label) {
  const result = await api(token, "GET", endpoint, query);
  if (result.items?.length !== 1) fail(`Expected exactly one ${label}; found ${result.items?.length || 0}.`);
  return result.items[0];
}

async function membership(token, playlistId, videoId) {
  let pageToken = "";
  const tokens = new Set();
  const matches = [];
  do {
    if (tokens.has(pageToken)) fail(`Playlist pagination cycle for ${playlistId}.`);
    tokens.add(pageToken);
    const result = await api(token, "GET", "playlistItems", { part: "contentDetails,snippet", playlistId, maxResults: 50, pageToken, fields: "nextPageToken,items(id,snippet(playlistId,resourceId(videoId)),contentDetails(videoId))" });
    matches.push(...(result.items || []).filter((item) => item.contentDetails?.videoId === videoId || item.snippet?.resourceId?.videoId === videoId));
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  if (matches.length > 1) fail(`Video ${videoId} already appears multiple times in playlist ${playlistId}.`);
  return matches[0] || null;
}

export async function waitForMembership(read, { attempts = 18, delayMs = 10_000, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const item = await read();
    if (item?.id) return item;
    if (attempt < attempts) await pause(delayMs);
  }
  return null;
}

async function preflightRow(item, token) {
  const video = await one(token, "videos", { part: "snippet,status", id: item.youtubeVideoId, fields: "items(id,snippet(channelId,title),status(privacyStatus,uploadStatus))" }, "video");
  if (video.id !== item.youtubeVideoId || video.snippet?.channelId !== item.youtubeChannelId || video.snippet?.title !== item.title || video.status?.privacyStatus !== "public" || video.status?.uploadStatus !== "processed") fail(`Live video identity/status mismatch for ${item.youtubeVideoId}.`);
  const destination = await one(token, "playlists", { part: "snippet,status", id: item.destinationPlaylistId, fields: "items(id,snippet(channelId,title),status(privacyStatus))" }, "destination playlist");
  if (destination.id !== item.destinationPlaylistId || destination.snippet?.channelId !== item.youtubeChannelId || destination.status?.privacyStatus !== "public") fail(`Destination playlist not owned/public for ${item.youtubeVideoId}.`);
  let sourceFound = false;
  for (const sourceId of item.sourcePlaylistIds) {
    const source = await one(token, "playlists", { part: "snippet", id: sourceId, fields: "items(id,snippet(channelId))" }, "source playlist");
    if (source.snippet?.channelId !== item.youtubeChannelId) fail(`Source playlist owner mismatch for ${item.youtubeVideoId}.`);
    if (await membership(token, sourceId, item.youtubeVideoId)) sourceFound = true;
  }
  if (!sourceFound) fail(`Video ${item.youtubeVideoId} absent from all listed source playlists.`);
  return await membership(token, item.destinationPlaylistId, item.youtubeVideoId);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readJson(args.manifest);
  const counts = validateManifest(manifest);
  if (!args.route) { if (args.apply) fail("Apply requires --route."); console.log(JSON.stringify({ status: "local_plan_ok", ...counts })); return; }
  if (!ROUTES.has(args.route)) fail(`Unsupported route ${args.route}.`);
  const rows = manifest.rows.filter((row) => row.route === args.route);
  if (!args.apply) { console.log(JSON.stringify({ status: "local_route_plan_ok", route: args.route, rows: rows.length })); return; }
  if (args.confirm !== "APPLY_EXACT_PLAYLIST_MEMBERSHIP_RECOVERY_17" || !args.receipts) fail("Exact recovery-17 confirmation and receipts path required.");
  const routing = readJson("config/youtube-api-project-routing.json").projects.find((row) => row.key === args.route);
  if (process.env.EFFECTIVE_YOUTUBE_ENVIRONMENT !== routing.githubEnvironment) fail(`OAuth environment mismatch for ${args.route}.`);
  const channels = readJson("config/youtube-channels.json").channels;
  const tokens = new Map();
  const before = new Map();
  // Complete this route's authenticated preflight before its first YouTube write.
  for (const item of rows) {
    if (!tokens.has(item.channelKey)) {
      const channel = channels.find((row) => row.key === item.channelKey);
      const token = await accessToken(channel);
      const mine = await one(token, "channels", { part: "snippet", mine: "true", fields: "items(id,snippet(title))" }, "authorized channel");
      if (mine.id !== item.youtubeChannelId) fail(`OAuth channel mismatch for ${item.channelKey}.`);
      tokens.set(item.channelKey, token);
    }
    before.set(item.youtubeVideoId, await preflightRow(item, tokens.get(item.channelKey)));
  }
  for (const item of rows) if (ACCEPTED_FROM_SOURCE_RUN.has(item.youtubeVideoId) && !before.get(item.youtubeVideoId)) fail(`Previously accepted video ${item.youtubeVideoId} is no longer in its canonical playlist; refuse any write on this route.`);
  fs.mkdirSync(path.dirname(args.receipts), { recursive: true });
  for (const item of rows) {
    const token = tokens.get(item.channelKey);
    const current = await membership(token, item.destinationPlaylistId, item.youtubeVideoId);
    let inserted = false;
    if (ACCEPTED_FROM_SOURCE_RUN.has(item.youtubeVideoId) && !current) fail(`Previously accepted membership vanished for ${item.youtubeVideoId}; no repeat insert.`);
    if (!current) {
      // Intentionally no retry after this POST: a lost response could mean success.
      await api(token, "POST", "playlistItems", { part: "snippet", fields: "id,snippet(playlistId,resourceId(videoId))" }, { snippet: { playlistId: item.destinationPlaylistId, resourceId: { kind: "youtube#video", videoId: item.youtubeVideoId } } });
      inserted = true;
    }
    // YouTube may accept playlistItems.insert before listing the new membership.
    // Poll GET only; never repeat the POST after an ambiguous result.
    const verified = await waitForMembership(() => membership(token, item.destinationPlaylistId, item.youtubeVideoId));
    if (!verified?.id) fail(`Playlist insertion readback missing for ${item.youtubeVideoId}; stop without retry.`);
    const receipt = { migrationId: manifest.id, route: args.route, youtubeVideoId: item.youtubeVideoId, destinationPlaylistId: item.destinationPlaylistId, destinationPlaylistKey: item.destinationPlaylistKey, playlistItemId: verified.id, inserted, alreadyPresentBeforePreflight: Boolean(before.get(item.youtubeVideoId)), verifiedAt: new Date().toISOString(), githubRunId: process.env.GITHUB_RUN_ID || "" };
    fs.appendFileSync(args.receipts, `${JSON.stringify(receipt)}\n`);
    console.log(JSON.stringify({ videoId: item.youtubeVideoId, status: inserted ? "inserted_verified" : "already_present_verified" }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(`::error::${error.message}`); process.exitCode = 1; });
