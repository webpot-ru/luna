#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MANIFEST_PATH = "config/youtube-redundant-playlists-unlist-20260926.json";
const ROUTE_COUNTS = { "youtube-1": 26, "youtube-2": 12, "youtube-3": 18, "youtube-4": 5 };
const fail = (message) => { throw new Error(message); };
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const norm = (value) => String(value || "").normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
const sorted = (items) => [...items].sort();
const sameSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

export function validateManifest(manifest, { root = process.cwd() } = {}) {
  if (manifest.schemaVersion !== 1 || manifest.id !== "youtube-redundant-playlists-unlist-20260926"
    || manifest.sourceReadOnlyRunId !== "36171775738" || manifest.desiredPrivacyStatus !== "unlisted"
    || manifest.expectedCount !== 61 || manifest.maximumPlaylistUpdates !== 61
    || manifest.videoInsertCalls !== 0 || manifest.playlistDeleteCalls !== 0 || manifest.rows?.length !== 61) {
    fail("Unexpected immutable unlist manifest identity or scope.");
  }
  const routes = json(path.join(root, "config/youtube-api-project-routing.json")).projects;
  const channels = json(path.join(root, "config/youtube-channels.json")).channels;
  const registered = [
    ...json(path.join(root, "config/youtube-playlists.json")).playlists,
    ...json(path.join(root, "config/youtube-polyglot-playlists.json")).playlists,
  ];
  const registeredIds = new Set(registered.map((row) => row.youtube_playlist_id).filter(Boolean));
  const seen = new Set();
  const counts = Object.fromEntries(Object.keys(ROUTE_COUNTS).map((key) => [key, 0]));
  for (const row of manifest.rows) {
    if (!row.extraPlaylistId || !row.canonicalPlaylistId || row.extraPlaylistId === row.canonicalPlaylistId
      || !row.channelKey || !row.youtubeChannelId || !row.title || !Array.isArray(row.videoIds)) fail("Incomplete unlist row.");
    if (seen.has(row.extraPlaylistId)) fail(`Duplicate extra playlist ${row.extraPlaylistId}.`);
    seen.add(row.extraPlaylistId);
    if (!(row.route in counts)) fail(`Unsupported route for ${row.extraPlaylistId}.`);
    counts[row.route] += 1;
    const channel = channels.find((item) => item.key === row.channelKey);
    if (!channel || channel.channelId !== row.youtubeChannelId) fail(`Channel mismatch for ${row.extraPlaylistId}.`);
    const route = routes.find((item) => item.key === row.route);
    if (!route?.publicationReady || !route.supportChannelKeys?.includes(row.channelKey)) fail(`Active route mismatch for ${row.extraPlaylistId}.`);
    if (!registeredIds.has(row.canonicalPlaylistId) || registeredIds.has(row.extraPlaylistId)) fail(`Canonical/extra registry identity mismatch for ${row.extraPlaylistId}.`);
    const canonical = registered.find((item) => item.youtube_playlist_id === row.canonicalPlaylistId);
    if (canonical.youtube_channel_id !== row.youtubeChannelId || canonical.channelKey !== row.channelKey) fail(`Canonical owner mismatch for ${row.extraPlaylistId}.`);
    if (new Set(row.videoIds).size !== row.videoIds.length) fail(`Repeated source video in ${row.extraPlaylistId}.`);
  }
  if (Object.keys(ROUTE_COUNTS).some((route) => counts[route] !== ROUTE_COUNTS[route])) fail("Exact route counts changed.");
  return { rows: manifest.rows.length, counts, empty: manifest.rows.filter((row) => !row.videoIds.length).length };
}

export function validateLivePair(row, extra, canonical) {
  const blockers = [];
  if (extra?.id !== row.extraPlaylistId || canonical?.id !== row.canonicalPlaylistId) blockers.push("playlist_id_mismatch");
  if (extra?.snippet?.channelId !== row.youtubeChannelId || canonical?.snippet?.channelId !== row.youtubeChannelId) blockers.push("playlist_owner_mismatch");
  if (canonical?.status?.privacyStatus !== "public") blockers.push("canonical_not_public");
  if (!["public", "unlisted"].includes(extra?.status?.privacyStatus)) blockers.push("extra_privacy_unexpected");
  if (norm(extra?.snippet?.title) !== norm(row.title) || norm(canonical?.snippet?.title) !== norm(row.title)) blockers.push("title_drift");
  if (extra?.contentDetails?.itemCount !== extra?.videoIds?.length || canonical?.contentDetails?.itemCount !== canonical?.videoIds?.length) blockers.push("playlist_item_count_incomplete");
  if (!sameSet(extra?.videoIds || [], row.videoIds)) blockers.push("extra_membership_drift");
  const canonicalVideos = new Set(canonical?.videoIds || []);
  if ((extra?.videoIds || []).some((id) => !canonicalVideos.has(id))) blockers.push("unique_video_in_extra");
  if (blockers.length) fail(`${row.extraPlaylistId}: ${blockers.join(", ")}`);
  return { alreadyUnlisted: extra.status.privacyStatus === "unlisted", videoCount: row.videoIds.length };
}

function args(argv) {
  const result = { route: "", mode: "plan", report: "", receipts: "", confirm: "" };
  for (const arg of argv) {
    if (arg.startsWith("--route=")) result.route = arg.slice(8);
    else if (arg.startsWith("--mode=")) result.mode = arg.slice(7);
    else if (arg.startsWith("--report=")) result.report = arg.slice(9);
    else if (arg.startsWith("--receipts=")) result.receipts = arg.slice(11);
    else if (arg.startsWith("--confirm=")) result.confirm = arg.slice(10);
    else fail(`Unknown argument ${arg}.`);
  }
  return result;
}

async function api(token, method, endpoint, query = {}, body) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [key, value] of Object.entries(query)) if (value !== "" && value !== undefined) url.searchParams.set(key, String(value));
  const response = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  if (!response.ok) fail(`YouTube ${method} ${endpoint} failed (${response.status}); stop without repeating write. ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function accessToken(channel) {
  const clientJson = json(".local/youtube-oauth/google-oauth-client.json");
  const client = clientJson.installed || clientJson.web || clientJson;
  const tokenPath = channel.oauthTokenFile || `.local/youtube-oauth/tokens/${channel.key}.json`;
  const saved = json(tokenPath);
  if (saved.access_token && Number(saved.expires_at || 0) > Date.now() + 60_000) return saved.access_token;
  if (!saved.refresh_token) fail(`OAuth refresh token missing for ${channel.key}.`);
  const response = await fetch(client.token_uri || "https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret, refresh_token: saved.refresh_token, grant_type: "refresh_token" }) });
  if (!response.ok) fail(`OAuth refresh failed for ${channel.key} (${response.status}).`);
  const fresh = await response.json();
  const next = { ...saved, ...fresh, refresh_token: fresh.refresh_token || saved.refresh_token, expires_at: Date.now() + (Number(fresh.expires_in || 3600) - 60) * 1000 };
  fs.writeFileSync(tokenPath, `${JSON.stringify(next, null, 2)}\n`);
  return next.access_token;
}

async function one(token, endpoint, query, label) {
  const result = await api(token, "GET", endpoint, query);
  if (result.items?.length !== 1) fail(`Expected one ${label}, got ${result.items?.length || 0}.`);
  return result.items[0];
}

async function readPlaylist(token, playlistId) {
  return one(token, "playlists", { part: "snippet,status,contentDetails", id: playlistId,
    fields: "items(id,snippet(channelId,title,description,defaultLanguage),status(privacyStatus,podcastStatus),contentDetails(itemCount))" }, `playlist ${playlistId}`);
}

async function videoIds(token, playlistId) {
  let pageToken = "";
  const seenTokens = new Set();
  const ids = [];
  let totalResults = null;
  do {
    if (seenTokens.has(pageToken)) fail(`Playlist pagination cycle for ${playlistId}.`);
    seenTokens.add(pageToken);
    const response = await api(token, "GET", "playlistItems", { part: "contentDetails", playlistId, maxResults: 50, pageToken,
      fields: "nextPageToken,pageInfo(totalResults),items(contentDetails(videoId))" });
    if (!Number.isInteger(response.pageInfo?.totalResults)) fail(`Playlist item count unavailable for ${playlistId}.`);
    if (totalResults !== null && totalResults !== response.pageInfo.totalResults) fail(`Playlist item count changed during pagination for ${playlistId}.`);
    totalResults = response.pageInfo.totalResults;
    for (const item of response.items || []) {
      if (!item.contentDetails?.videoId) fail(`Unknown playlist item in ${playlistId}.`);
      ids.push(item.contentDetails.videoId);
    }
    pageToken = response.nextPageToken || "";
  } while (pageToken);
  if (new Set(ids).size !== ids.length) fail(`Repeated video ID in playlist ${playlistId}.`);
  if (ids.length !== totalResults) fail(`Incomplete playlist item pagination for ${playlistId}: ${ids.length}/${totalResults}.`);
  return ids;
}

async function livePair(token, row) {
  const [extra, canonical] = await Promise.all([readPlaylist(token, row.extraPlaylistId), readPlaylist(token, row.canonicalPlaylistId)]);
  const [extraIds, canonicalIds] = await Promise.all([videoIds(token, row.extraPlaylistId), videoIds(token, row.canonicalPlaylistId)]);
  extra.videoIds = extraIds;
  canonical.videoIds = canonicalIds;
  validateLivePair(row, extra, canonical);
  return { extra, canonical };
}

async function waitForPrivacy(token, row, before, { attempts = 18, delayMs = 10_000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const after = await readPlaylist(token, row.extraPlaylistId);
    if (after.status?.privacyStatus === "unlisted") {
      if (after.snippet?.title !== before.snippet?.title || after.snippet?.description !== before.snippet?.description
        || (after.snippet?.defaultLanguage || "") !== (before.snippet?.defaultLanguage || "")
        || (after.status?.podcastStatus || "") !== (before.status?.podcastStatus || "")) {
        fail(`Metadata changed unexpectedly for ${row.extraPlaylistId}; no further writes on this route.`);
      }
      return after;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  fail(`Unlisted readback missing for ${row.extraPlaylistId}; do not retry the PUT.`);
}

async function main() {
  const options = args(process.argv.slice(2));
  const manifest = json(MANIFEST_PATH);
  const plan = validateManifest(manifest);
  if (!options.route) { if (options.mode !== "plan") fail("Route required."); console.log(JSON.stringify({ status: "plan_ok", ...plan })); return; }
  if (!(options.route in ROUTE_COUNTS)) fail(`Unknown route ${options.route}.`);
  const rows = manifest.rows.filter((row) => row.route === options.route);
  if (options.mode === "plan") { console.log(JSON.stringify({ status: "route_plan_ok", route: options.route, rows: rows.length })); return; }
  if (!["preflight", "apply"].includes(options.mode)) fail(`Unknown mode ${options.mode}.`);
  if (options.mode === "apply" && (options.confirm !== "UNLIST_EXACT_REDUNDANT_PLAYLISTS_61" || !options.receipts)) fail("Apply requires exact confirmation and receipts path.");
  if (options.mode === "preflight" && !options.report) fail("Preflight report path required.");
  const routing = json("config/youtube-api-project-routing.json").projects.find((item) => item.key === options.route);
  if (process.env.EFFECTIVE_YOUTUBE_ENVIRONMENT !== routing.githubEnvironment) fail(`OAuth environment mismatch for ${options.route}.`);
  const channels = json("config/youtube-channels.json").channels;
  const tokens = new Map();
  const before = new Map();
  // Check all identities and memberships for this route before its first PUT.
  for (const row of rows) {
    if (!tokens.has(row.channelKey)) {
      const channel = channels.find((item) => item.key === row.channelKey);
      const token = await accessToken(channel);
      const mine = await one(token, "channels", { part: "snippet", mine: "true", fields: "items(id,snippet(title))" }, `authorized channel ${row.channelKey}`);
      if (mine.id !== row.youtubeChannelId) fail(`OAuth channel mismatch for ${row.channelKey}.`);
      tokens.set(row.channelKey, token);
    }
    before.set(row.extraPlaylistId, await livePair(tokens.get(row.channelKey), row));
  }
  if (options.mode === "preflight") {
    fs.mkdirSync(path.dirname(options.report), { recursive: true });
    fs.writeFileSync(options.report, `${JSON.stringify({ manifestId: manifest.id, route: options.route,
      checked: rows.length, public: rows.filter((row) => before.get(row.extraPlaylistId).extra.status.privacyStatus === "public").length,
      alreadyUnlisted: rows.filter((row) => before.get(row.extraPlaylistId).extra.status.privacyStatus === "unlisted").length,
      checkedAt: new Date().toISOString(), youtubeWrites: 0 }, null, 2)}\n`);
    console.log(JSON.stringify({ status: "preflight_ok", route: options.route, rows: rows.length }));
    return;
  }
  fs.mkdirSync(path.dirname(options.receipts), { recursive: true });
  for (const row of rows) {
    const token = tokens.get(row.channelKey);
    const current = await livePair(token, row);
    const alreadyUnlisted = current.extra.status.privacyStatus === "unlisted";
    if (!alreadyUnlisted) {
      // part=status changes only status; snippet.title is included to satisfy the API contract.
      // No retry after this PUT, because a lost response may mean the write succeeded.
      await api(token, "PUT", "playlists", { part: "status", fields: "id,status(privacyStatus,podcastStatus)" }, {
        id: row.extraPlaylistId,
        snippet: { title: current.extra.snippet.title },
        status: { privacyStatus: "unlisted", ...(current.extra.status?.podcastStatus ? { podcastStatus: current.extra.status.podcastStatus } : {}) },
      });
    }
    const after = await waitForPrivacy(token, row, current.extra);
    const receipt = { manifestId: manifest.id, route: options.route, extraPlaylistId: row.extraPlaylistId,
      canonicalPlaylistId: row.canonicalPlaylistId, channelKey: row.channelKey,
      previousPrivacyStatus: alreadyUnlisted ? "unlisted" : "public", privacyStatus: after.status.privacyStatus,
      videoIds: row.videoIds, alreadyUnlisted, verifiedAt: new Date().toISOString(), githubRunId: process.env.GITHUB_RUN_ID || "" };
    fs.appendFileSync(options.receipts, `${JSON.stringify(receipt)}\n`);
    console.log(JSON.stringify({ playlistId: row.extraPlaylistId, status: alreadyUnlisted ? "already_unlisted_verified" : "unlisted_verified" }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(`::error::${error.message}`); process.exitCode = 1; });
