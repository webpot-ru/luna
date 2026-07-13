#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  loadPublicationRegistry,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

function parseArgs(argv) {
  const options = {
    supportLang: "",
    route: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    publishCalendar: "config/youtube-publish-calendar.json",
    targetFile: "",
    reportFile: "outputs/youtube-duplicate-deletion-report.json",
    apply: false,
    confirmYoutubeWrite: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--support=")) options.supportLang = arg.slice("--support=".length).toUpperCase();
    else if (arg.startsWith("--route=")) options.route = arg.slice("--route=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--publish-calendar=")) options.publishCalendar = arg.slice("--publish-calendar=".length);
    else if (arg.startsWith("--target-file=")) options.targetFile = arg.slice("--target-file=".length);
    else if (arg.startsWith("--report-file=")) options.reportFile = arg.slice("--report-file=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-delete-duplicate-videos.mjs --target-file=<json> --route=youtube-2",
    "",
    "Dry-run is default. Live deletion requires:",
    "  --apply --confirm-youtube-write",
  ].join("\n");
}

function loadExactTargets(targetFile) {
  if (!targetFile || !fs.existsSync(targetFile)) {
    throw new Error(`Exact deletion target file not found: ${targetFile || "<empty>"}`);
  }
  const payload = JSON.parse(fs.readFileSync(targetFile, "utf8"));
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.targets) || payload.targets.length === 0) {
    throw new Error("Exact deletion target file must use schemaVersion=1 with a non-empty targets array.");
  }
  if (Number(payload.expectedTargetCount || 0) !== payload.targets.length) {
    throw new Error(`Target count mismatch: expected ${payload.expectedTargetCount}, found ${payload.targets.length}.`);
  }

  const required = ["setId", "videoType", "supportLang", "targetLang", "keepVideoId", "deleteVideoId", "route"];
  const deleteIds = new Set();
  const keepIds = new Set();
  const assignmentKeys = new Set();
  for (const [index, target] of payload.targets.entries()) {
    for (const field of required) {
      if (!String(target[field] || "").trim()) throw new Error(`Target ${index + 1} is missing ${field}.`);
    }
    if (!/^youtube-[1-4]$/.test(target.route)) throw new Error(`Target ${index + 1} has invalid route ${target.route}.`);
    if (!/^[A-Za-z0-9_-]{11}$/.test(target.keepVideoId) || !/^[A-Za-z0-9_-]{11}$/.test(target.deleteVideoId)) {
      throw new Error(`Target ${index + 1} has an invalid YouTube video id.`);
    }
    if (target.keepVideoId === target.deleteVideoId) throw new Error(`Target ${index + 1} keeps and deletes the same video.`);
    if (deleteIds.has(target.deleteVideoId)) throw new Error(`Duplicate deleteVideoId: ${target.deleteVideoId}`);
    const key = [target.setId, target.videoType, normalizeLanguageCode(target.supportLang), target.targetLang].join("|");
    if (assignmentKeys.has(key)) throw new Error(`Duplicate assignment in target file: ${key}`);
    assignmentKeys.add(key);
    deleteIds.add(target.deleteVideoId);
    keepIds.add(target.keepVideoId);
  }
  for (const id of deleteIds) {
    if (keepIds.has(id)) throw new Error(`Video ${id} appears in both KEEP and DELETE columns.`);
  }
  return payload;
}

function bundleKeyForTargetLang(targetLang) {
  return new Map([
    ["EN,ES,FR,DE", "global_europe_core"],
    ["ES,FR,IT,PT", "romance_core"],
    ["ZH,JA,KO", "east_asia_core"],
    ["RU,PL,CS,SK", "slavic_core"],
  ]).get(targetLang) || "";
}

function routeForChannel(routing, channel) {
  return routing.projects.find(project => (project.supportChannelKeys || []).includes(channel?.key))?.key || "";
}

async function readVideos(accessToken, ids) {
  const url = new URL("videos", "https://www.googleapis.com/youtube/v3/");
  url.searchParams.set("part", "id,snippet,status,statistics");
  url.searchParams.set("id", ids.join(","));
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`YouTube API preflight failed (${response.status}): ${await response.text()}`);
  return (await response.json()).items || [];
}

function updateDurableState({ publicationRegistry, publishCalendar, candidate, liveById, deletedAt }) {
  const { keep, del, channel, route } = candidate;
  const keepLive = liveById.get(keep.youtubeVideoId);
  const deleteLive = liveById.get(del[0].youtubeVideoId);
  let keepRow = publicationRegistry.publications.find(row => row.youtubeVideoId === keep.youtubeVideoId);
  if (!keepRow) {
    keepRow = {
      schemaVersion: 1,
      setId: keep.setId,
      videoType: keep.videoType,
      supportLang: keep.supportLang,
      targetLang: keep.targetLang,
      targetLangs: keep.videoType === "polyglot" ? keep.targetLang.split(",") : [],
      bundleKey: keep.videoType === "polyglot" ? bundleKeyForTargetLang(keep.targetLang) : "",
      polyglotKey: keep.videoType === "polyglot" ? bundleKeyForTargetLang(keep.targetLang) : "",
      contentScope: keep.videoType === "polyglot" ? "full" : "",
      youtubeVideoId: keep.youtubeVideoId,
      youtubeVideoUrl: `https://www.youtube.com/watch?v=${keep.youtubeVideoId}`,
      title: keepLive?.snippet?.title || "",
      channelKey: channel.key,
      youtubeChannelId: channel.channelId,
      privacyStatus: keepLive?.status?.privacyStatus || "",
      publishAt: keepLive?.status?.publishAt || "",
      publicationStatus: keepLive?.status?.privacyStatus === "private" ? "scheduled_uploaded" : "live_youtube_upload_detected",
      source: "exact_duplicate_delete_reconciliation",
      reconciledAt: deletedAt,
    };
    publicationRegistry.publications.push(keepRow);
  }

  let deleteRow = publicationRegistry.publications.find(row => row.youtubeVideoId === del[0].youtubeVideoId);
  if (!deleteRow) {
    deleteRow = {
      schemaVersion: 1,
      setId: del[0].setId,
      videoType: del[0].videoType,
      supportLang: del[0].supportLang,
      targetLang: del[0].targetLang,
      targetLangs: del[0].videoType === "polyglot" ? del[0].targetLang.split(",") : [],
      bundleKey: del[0].videoType === "polyglot" ? bundleKeyForTargetLang(del[0].targetLang) : "",
      polyglotKey: del[0].videoType === "polyglot" ? bundleKeyForTargetLang(del[0].targetLang) : "",
      contentScope: del[0].videoType === "polyglot" ? "full" : "",
      youtubeVideoId: del[0].youtubeVideoId,
      youtubeVideoUrl: `https://www.youtube.com/watch?v=${del[0].youtubeVideoId}`,
      title: deleteLive?.snippet?.title || "",
      channelKey: channel.key,
      youtubeChannelId: channel.channelId,
      route,
    };
    publicationRegistry.publications.push(deleteRow);
  }
  deleteRow.publicationStatus = "deleted_duplicate";
  deleteRow.deletedAt = deletedAt;
  deleteRow.duplicateOfVideoId = keep.youtubeVideoId;
  deleteRow.source = "exact_duplicate_delete_reconciliation";

  for (const reservation of publishCalendar.reservations || []) {
    if (reservation.youtubeVideoId !== del[0].youtubeVideoId) continue;
    reservation.youtubeVideoId = keep.youtubeVideoId;
    reservation.status = "reserved";
    reservation.duplicateVideoIdDeleted = del[0].youtubeVideoId;
    reservation.updatedAt = deletedAt;
    reservation.source = "exact_duplicate_delete_reconciliation";
  }
}

function loadOAuthClient(clientFile) {
  if (!fs.existsSync(clientFile)) {
    throw new Error(`OAuth client file not found: ${clientFile}`);
  }
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
  if (!fs.existsSync(tokenFile)) {
    throw new Error(`OAuth token file not found: ${tokenFile}`);
  }
  const token = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
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

async function deleteVideo(accessToken, videoId) {
  const url = new URL(`videos?id=${videoId}`, "https://www.googleapis.com/youtube/v3/");
  const response = await fetch(url, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) {
    console.log(`Video ${videoId} already deleted / not found on YouTube (404).`);
    return true;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YouTube API DELETE failed (${response.status}): ${text}`);
  }
  return true;
}

function assignmentKey(row = {}) {
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
  ].join("|");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (options.apply && !options.confirmYoutubeWrite) {
    console.error("Error: --apply requires --confirm-youtube-write");
    process.exit(1);
  }
  if (options.apply && !options.targetFile) {
    throw new Error("Live deletion requires --target-file. Unscoped registry-wide deletion is disabled.");
  }

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const publishCalendar = JSON.parse(fs.readFileSync(options.publishCalendar, "utf8"));
  const routing = JSON.parse(fs.readFileSync("config/youtube-api-project-routing.json", "utf8"));

  const active = publicationRegistry.publications.filter(r => {
    const s = (r.publicationStatus || r.status || '').toLowerCase();
    return r.youtubeVideoId && !s.includes('superseded') && !s.includes('deleted') && !s.includes('failed');
  });

  // Find duplicates
  const byKey = new Map();
  for (const row of active) {
    const key = assignmentKey(row);
    const rows = byKey.get(key) || [];
    rows.push(row);
    byKey.set(key, rows);
  }

  const candidates = [];

  if (options.targetFile) {
    const exactPlan = loadExactTargets(options.targetFile);
    if (!options.route || !/^youtube-[1-4]$/.test(options.route)) {
      throw new Error("Exact target mode requires one explicit --route=youtube-N.");
    }
    for (const target of exactPlan.targets.filter(row => row.route === options.route)) {
      if (target.videoType === "polyglot" && !bundleKeyForTargetLang(target.targetLang)) {
        throw new Error(`Unknown Polyglot bundle target set: ${target.targetLang}`);
      }
      const channel = findChannelForSupport(channelRegistry.channels, target.supportLang);
      if (!channel) throw new Error(`No configured channel for support ${target.supportLang}.`);
      const actualRoute = routeForChannel(routing, channel);
      if (actualRoute !== target.route) {
        throw new Error(`Route mismatch for ${target.supportLang}: plan=${target.route}, config=${actualRoute || "missing"}.`);
      }
      candidates.push({
        key: [target.setId, target.videoType, target.supportLang, target.targetLang].join("|"),
        channel,
        route: actualRoute,
        keep: { ...target, youtubeVideoId: target.keepVideoId },
        del: [{ ...target, youtubeVideoId: target.deleteVideoId }],
      });
    }
  } else {
    const dupes = [...byKey.entries()].filter(([, rows]) => rows.length > 1);

    for (const [key, rows] of dupes) {
    const sorted = rows.slice().sort((a, b) => {
      const aLive = (a.publicationStatus||'').includes('live_youtube_upload_detected') ? 1 : 0;
      const bLive = (b.publicationStatus||'').includes('live_youtube_upload_detected') ? 1 : 0;
      if (aLive !== bLive) return aLive - bLive;
      const aHasDate = (a.publishAt || a.scheduledPublishAt) ? 0 : 1;
      const bHasDate = (b.publishAt || b.scheduledPublishAt) ? 0 : 1;
      if (aHasDate !== bHasDate) return aHasDate - bHasDate;
      return String(b.uploadedAt || b.lastReadbackAt || '').localeCompare(String(a.uploadedAt || a.lastReadbackAt || ''));
    });

    const [keep, ...del] = sorted;
    
    // Find channel and route
    const channel = findChannelForSupport(channelRegistry.channels, keep.supportLang);
      const route = routeForChannel(routing, channel);

    // Apply filters
    if (options.supportLang && normalizeLanguageCode(keep.supportLang) !== options.supportLang) continue;
    if (options.route && route !== options.route) continue;

      candidates.push({
      key,
      channel,
      route,
      keep,
      del,
      });
    }
  }

  console.log(`Found ${candidates.length} duplicate groups to process (with ${candidates.reduce((sum, c) => sum + c.del.length, 0)} videos to delete).`);
  if (options.targetFile && candidates.length === 0) throw new Error(`Exact target file has no rows for ${options.route}.`);

  if (!options.apply) {
    console.log("\nDRY-RUN MODE (No deletions will be performed). Run with --apply --confirm-youtube-write to perform deletions.");
    for (const c of candidates) {
      console.log(`Group: ${c.key} (Route: ${c.route}, Channel: ${c.channel?.key || 'unknown'})`);
      console.log(`  KEEP: ${c.keep.youtubeVideoId} | Title: ${c.keep.title}`);
      for (const d of c.del) {
        console.log(`  DELETE: ${d.youtubeVideoId} | Title: ${d.title} | Status: ${d.publicationStatus}`);
      }
    }
    return;
  }

  // Deletion logic
  console.log("\nSTARTING LIVE DELETION PREFLIGHT...");
  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const accessTokens = new Map();
  const liveById = new Map();
  const byChannel = new Map();
  for (const candidate of candidates) {
    const rows = byChannel.get(candidate.channel.key) || [];
    rows.push(candidate);
    byChannel.set(candidate.channel.key, rows);
  }
  for (const channelCandidates of byChannel.values()) {
    const channel = channelCandidates[0].channel;
    const tokenFile = tokenFileFor(channelRegistry, channel);
    const accessToken = await getAccessToken({ clientFile, tokenFile });
    accessTokens.set(channel.key, accessToken);
    const ids = channelCandidates.flatMap(candidate => [candidate.keep.youtubeVideoId, candidate.del[0].youtubeVideoId]);
    const items = await readVideos(accessToken, ids);
    for (const item of items) liveById.set(item.id, item);
    for (const candidate of channelCandidates) {
      const keepLive = liveById.get(candidate.keep.youtubeVideoId);
      const deleteLive = liveById.get(candidate.del[0].youtubeVideoId);
      if (!keepLive || !deleteLive) throw new Error(`Preflight did not return both videos for ${candidate.key}.`);
      if (keepLive.snippet?.channelId !== channel.channelId || deleteLive.snippet?.channelId !== channel.channelId) {
        throw new Error(`Channel mismatch during preflight for ${candidate.key}.`);
      }
      const keepViews = Number(keepLive.statistics?.viewCount || 0);
      const deleteViews = Number(deleteLive.statistics?.viewCount || 0);
      if (deleteViews > keepViews) {
        throw new Error(`Popularity changed for ${candidate.key}: DELETE has ${deleteViews} views, KEEP has ${keepViews}.`);
      }
      console.log(`PREFLIGHT OK ${candidate.key}: KEEP ${candidate.keep.youtubeVideoId} (${keepViews}), DELETE ${candidate.del[0].youtubeVideoId} (${deleteViews}).`);
    }
  }
  console.log("ALL PREFLIGHT CHECKS PASSED. STARTING LIVE DELETIONS...");
  let processedCount = 0;
  let errorCount = 0;
  let stopped = false;
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), route: options.route, targetFile: options.targetFile, deleted: [], errors: [] };

  for (const c of candidates) {
    if (!c.channel) {
      console.error(`Skipping group ${c.key} because channel config is missing.`);
      errorCount++;
      continue;
    }

    const accessToken = accessTokens.get(c.channel.key);

    for (const d of c.del) {
      console.log(`Deleting video ${d.youtubeVideoId} for ${c.key}...`);
      try {
        await deleteVideo(accessToken, d.youtubeVideoId);
        
        const deletedAt = new Date().toISOString();
        updateDurableState({ publicationRegistry, publishCalendar, candidate: c, liveById, deletedAt });
        report.deleted.push({ key: c.key, keepVideoId: c.keep.youtubeVideoId, deleteVideoId: d.youtubeVideoId, deletedAt });
        processedCount++;
      } catch (e) {
        console.error(`Failed to delete video ${d.youtubeVideoId}: ${e.message}`);
        report.errors.push({ key: c.key, keepVideoId: c.keep.youtubeVideoId, deleteVideoId: d.youtubeVideoId, error: e.message });
        errorCount++;
        stopped = true;
        break;
      }
    }
    if (stopped) break;
  }

  fs.mkdirSync(path.dirname(options.reportFile), { recursive: true });
  fs.writeFileSync(options.reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  // Save updated registry
  if (processedCount > 0) {
    savePublicationRegistry(publicationRegistry, options.publicationRegistry);
    fs.writeFileSync(options.publishCalendar, `${JSON.stringify(publishCalendar, null, 2)}\n`, "utf8");
    console.log(`Saved updated publication registry to ${options.publicationRegistry}`);
  }

  console.log(`Deletion summary: successfully processed ${processedCount} videos, encountered ${errorCount} errors.`);
  if (errorCount > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error("Critical error:", err);
  process.exit(1);
});
