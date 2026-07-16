#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHANNELS = "config/youtube-channels.json";
const DEFAULT_ORDINARY = "config/youtube-playlists.json";
const DEFAULT_POLYGLOT = "config/youtube-polyglot-playlists.json";
const DEFAULT_ROUTING = "config/youtube-api-project-routing.json";
const DEFAULT_OUTPUT = "outputs/review/youtube-playlist-images-audit.json";

function parseArgs(argv) {
  const options = {
    channels: DEFAULT_CHANNELS,
    ordinaryRegistry: DEFAULT_ORDINARY,
    polyglotRegistry: DEFAULT_POLYGLOT,
    routing: DEFAULT_ROUTING,
    output: DEFAULT_OUTPUT,
    supports: [],
    playlistIds: [],
    oauthRoot: "",
    inventoryOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => (arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index]);
    if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
    else if (arg === "--ordinary-registry" || arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--routing" || arg.startsWith("--routing=")) options.routing = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value().split(",").map(normalizeCode).filter(Boolean);
    else if (arg === "--playlist-ids" || arg.startsWith("--playlist-ids=")) options.playlistIds = value().split(",").map((id) => id.trim()).filter(Boolean);
    else if (arg === "--oauth-root" || arg.startsWith("--oauth-root=")) options.oauthRoot = value();
    else if (arg === "--inventory-only") options.inventoryOnly = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolvePath(filePath, root = "") {
  const candidates = path.isAbsolute(filePath)
    ? [filePath]
    : [root ? path.resolve(root, filePath) : "", path.resolve(filePath)].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`File not found: ${filePath}`);
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

function tokenFileFor(registry, channel) {
  return channel.oauthTokenFile
    || path.join(registry.defaults?.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

async function accessTokenFor(clientFile, tokenFile) {
  const client = loadOAuthClient(clientFile);
  const token = readJson(tokenFile, "OAuth token");
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) throw new Error(`OAuth token has no refresh_token: ${tokenFile}`);
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
  if (!response.ok) throw new Error(`OAuth refresh failed (${response.status}): ${await response.text()}`);
  const refreshed = await response.json();
  return refreshed.access_token;
}

async function youtubeJson({ accessToken, pathName, query }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`YouTube API GET ${url.pathname} failed (${response.status}): ${text}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }
  return text ? JSON.parse(text) : {};
}

function routesByChannelKey(routing) {
  const routes = new Map();
  for (const project of routing.projects || []) {
    for (const key of project.supportChannelKeys || []) routes.set(String(key).toLowerCase(), project.key || "");
  }
  return routes;
}

function playlistRows(registry, registryPath, videoType) {
  return (registry.playlists || []).map((row) => ({
    registryPath,
    videoType,
    playlistKey: row.playlist_key || row.key || "",
    channelKey: String(row.channelKey || "").toLowerCase(),
    supportLang: normalizeCode(row.supportLang),
    playlistId: row.youtube_playlist_id || "",
    youtubeChannelId: row.youtube_channel_id || "",
    title: row.title || "",
    durablePlaylistImage: row.playlistImage || null,
  }));
}

function summarize(rows) {
  const summary = {
    physicalPlaylists: rows.length,
    installed: 0,
    absent: 0,
    unproven: 0,
    noPlaylistId: 0,
    errors: 0,
    playlistImagesListCalls: 0,
    channelIdentityCalls: 0,
    durableInstalled: 0,
    youtubeWrites: 0,
    plannedPlaylistImagesListCalls: 0,
    plannedChannelIdentityCalls: 0,
    plannedQuotaUnits: 0,
    byChannel: {},
  };
  for (const row of rows) {
    const channel = summary.byChannel[row.channelKey] ||= {
      channelKey: row.channelKey,
      route: row.route,
      total: 0,
      installed: 0,
      absent: 0,
      unproven: 0,
      noPlaylistId: 0,
      errors: 0,
      durableInstalled: 0,
    };
    channel.total += 1;
    if (row.durablePlaylistImage?.status === "uploaded") summary.durableInstalled += 1, channel.durableInstalled += 1;
    if (row.state === "installed") summary.installed += 1, channel.installed += 1;
    else if (row.state === "absent") summary.absent += 1, channel.absent += 1;
    else if (row.state === "no_playlist_id") summary.noPlaylistId += 1, channel.noPlaylistId += 1;
    else if (row.state === "error") summary.errors += 1, channel.errors += 1;
    else summary.unproven += 1, channel.unproven += 1;
    summary.playlistImagesListCalls += row.playlistImagesListCalled ? 1 : 0;
  }
  summary.channelIdentityCalls = new Set(rows.filter((row) => row.channelIdentityRead).map((row) => row.channelKey)).size;
  summary.estimatedQuotaUnits = summary.playlistImagesListCalls + summary.channelIdentityCalls;
  summary.plannedPlaylistImagesListCalls = rows.filter((row) => Boolean(row.playlistId)).length;
  summary.plannedChannelIdentityCalls = new Set(rows.filter((row) => row.playlistId).map((row) => row.channelKey)).size;
  summary.plannedQuotaUnits = summary.plannedPlaylistImagesListCalls + summary.plannedChannelIdentityCalls;
  summary.byChannel = Object.values(summary.byChannel).sort((a, b) => a.channelKey.localeCompare(b.channelKey));
  return summary;
}

function saveReport(options, rows, startedAt, completedAt = "") {
  const report = {
    schemaVersion: 1,
    generatedAt: startedAt,
    completedAt,
    mode: "read_only_playlist_images_audit",
    filters: { supports: options.supports, playlistIds: options.playlistIds },
    policy: { youtubeWrites: 0, retries: 0, endpoint: options.inventoryOnly ? "none" : "playlistImages.list" },
    summary: summarize(rows),
    rows,
  };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/audit-youtube-playlist-images.mjs --supports=EN,RU [--playlist-ids=<id,...>] [--output path]");
    return;
  }
  if (!options.supports.length) throw new Error("--supports is required");

  const startedAt = new Date().toISOString();
  const channelRegistry = readJson(options.channels, "channel registry");
  const routes = routesByChannelKey(readJson(options.routing, "YouTube routing registry"));
  const supportSet = new Set(options.supports);
  const channels = (channelRegistry.channels || []).filter((channel) => (
    (channel.supportLangs || []).some((support) => supportSet.has(normalizeCode(support)))
  ));
  const selectedKeys = new Set(channels.map((channel) => channel.key));
  const sourceRows = [
    ...playlistRows(readJson(options.ordinaryRegistry, "ordinary playlist registry"), options.ordinaryRegistry, "ordinary"),
    ...playlistRows(readJson(options.polyglotRegistry, "Polyglot playlist registry"), options.polyglotRegistry, "polyglot"),
  ].filter((row) => selectedKeys.has(row.channelKey))
    .filter((row) => !options.playlistIds.length || options.playlistIds.includes(row.playlistId));
  if (options.playlistIds.length && sourceRows.length === 0) throw new Error("--playlist-ids did not resolve to a playlist owned by --supports");

  const byPhysicalKey = new Map();
  for (const row of sourceRows) {
    const key = row.playlistId ? `${row.channelKey}:${row.playlistId}` : `${row.channelKey}:no-id:${row.registryPath}:${row.playlistKey}`;
    const existing = byPhysicalKey.get(key);
    if (existing) {
      existing.registryRows.push({ registryPath: row.registryPath, playlistKey: row.playlistKey, videoType: row.videoType });
      if (!existing.durablePlaylistImage && row.durablePlaylistImage) existing.durablePlaylistImage = row.durablePlaylistImage;
    } else {
      byPhysicalKey.set(key, {
        ...row,
        route: routes.get(row.channelKey) || "",
        registryRows: [{ registryPath: row.registryPath, playlistKey: row.playlistKey, videoType: row.videoType }],
        state: row.playlistId ? "unproven" : "no_playlist_id",
        playlistImagesListCalled: false,
        channelIdentityRead: false,
      });
    }
  }
  const rows = [...byPhysicalKey.values()].sort((a, b) => `${a.channelKey}:${a.playlistId}:${a.playlistKey}`.localeCompare(`${b.channelKey}:${b.playlistId}:${b.playlistKey}`));
  saveReport(options, rows, startedAt);

  if (options.inventoryOnly) {
    const report = saveReport(options, rows, startedAt, new Date().toISOString());
    console.log(JSON.stringify({ output: options.output, summary: report.summary }, null, 2));
    return;
  }

  const clientFile = resolvePath(channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json", options.oauthRoot);
  for (const channel of channels.sort((a, b) => a.key.localeCompare(b.key))) {
    const channelRows = rows.filter((row) => row.channelKey === channel.key && row.playlistId);
    if (!channelRows.length) continue;
    try {
      const tokenFile = resolvePath(tokenFileFor(channelRegistry, channel), options.oauthRoot);
      const accessToken = await accessTokenFor(clientFile, tokenFile);
      const identity = await youtubeJson({
        accessToken,
        pathName: "channels",
        query: { part: "id", mine: "true", fields: "items(id)" },
      });
      if (identity.items?.[0]?.id !== channel.channelId) {
        throw new Error(`OAuth channel mismatch for ${channel.key}: expected ${channel.channelId}, got ${identity.items?.[0]?.id || "(missing)"}`);
      }
      for (const row of channelRows) row.channelIdentityRead = true;

      for (const row of channelRows) {
        try {
          row.playlistImagesListCalled = true;
          const data = await youtubeJson({
            accessToken,
            pathName: "playlistImages",
            query: {
              part: "snippet",
              parent: row.playlistId,
              fields: "items(id,snippet(playlistId,type,width,height))",
            },
          });
          row.playlistImages = (data.items || []).map((item) => ({ id: item.id, ...item.snippet }));
          row.state = row.playlistImages.length ? "installed" : "absent";
          row.readbackAt = new Date().toISOString();
        } catch (error) {
          row.state = "error";
          row.error = error.message;
          saveReport(options, rows, startedAt);
          throw error;
        }
        saveReport(options, rows, startedAt);
      }
    } catch (error) {
      for (const row of channelRows.filter((item) => item.state === "unproven")) {
        row.state = "error";
        row.error = error.message;
      }
      saveReport(options, rows, startedAt);
      throw error;
    }
  }

  const report = saveReport(options, rows, startedAt, new Date().toISOString());
  if (report.summary.errors > 0) {
    throw new Error(`Playlist image audit is incomplete: ${report.summary.errors} row(s) failed`);
  }
  console.log(JSON.stringify({ output: options.output, summary: report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
