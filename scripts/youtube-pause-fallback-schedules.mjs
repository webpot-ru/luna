#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
} from "./lib/youtube-playlists.mjs";

const DEFAULT_PUBLICATION_REGISTRY_PATH = "config/youtube-published-videos.json";
const DEFAULT_ARTIFACT_ROOT = "outputs/review/youtube-tomorrow-20260623";
const DEFAULT_REPORT_PATH = "outputs/tmp/youtube-fallback-schedule-pause-report.json";
const DEFAULT_LEDGER_PATH = "outputs/youtube-schedule-pause-ledger.jsonl";

function parseArgs(argv) {
  const options = {
    setId: "home_kitchen_cookware_pilot_01",
    artifactRoot: DEFAULT_ARTIFACT_ROOT,
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    report: DEFAULT_REPORT_PATH,
    ledger: DEFAULT_LEDGER_PATH,
    targetFile: "",
    exportTargetFile: "",
    support: "",
    videoId: "",
    limit: 0,
    holdPublishAt: "",
    apply: false,
    writeRegistry: false,
    confirmYoutubeWrite: "",
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--write-registry") options.writeRegistry = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--set-id=")) options.setId = arg.slice("--set-id=".length);
    else if (arg.startsWith("--artifact-root=")) options.artifactRoot = arg.slice("--artifact-root=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--report=")) options.report = arg.slice("--report=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else if (arg.startsWith("--target-file=")) options.targetFile = arg.slice("--target-file=".length);
    else if (arg.startsWith("--export-target-file=")) options.exportTargetFile = arg.slice("--export-target-file=".length);
    else if (arg.startsWith("--support=")) options.support = arg.slice("--support=".length).toUpperCase();
    else if (arg.startsWith("--video-id=")) options.videoId = arg.slice("--video-id=".length);
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length)) || 0;
    else if (arg.startsWith("--hold-publish-at=")) options.holdPublishAt = arg.slice("--hold-publish-at=".length);
    else if (arg.startsWith("--confirm-youtube-write=")) options.confirmYoutubeWrite = arg.slice("--confirm-youtube-write=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-pause-fallback-schedules.mjs [--apply --confirm-youtube-write=PAUSE_FALLBACK_SCHEDULES]",
    "",
    "Cancels scheduled public release for fallback-thumbnail videos only.",
    "Criteria: scheduled upload, privacy private, thumbnailSet=false, thumbnailUploadMode=first_frame_auto.",
    "",
    "Options:",
    "  --limit=N                 Process only the first N rows after sorting.",
    "  --support=DE              Filter by support language.",
    "  --video-id=<id>           Filter by YouTube video ID.",
    "  --target-file=<json>      Use an explicit non-secret target list instead of registry/artifacts.",
    "  --export-target-file=<json>  Write the selected non-secret target list and exit.",
    "  --hold-publish-at=<iso>   Instead of clearing publishAt, move the schedule to this future hold time.",
    "  --write-registry          Update existing local registry rows after readback.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function appendLedger(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
}

function videoIdFor(row) {
  return String(row.youtubeVideoId || row.videoId || "").trim();
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function rowStatus(row) {
  return String(row.publicationStatus || row.status || "").toLowerCase();
}

function isFallbackScheduledRow(row, setId) {
  if (String(row.setId || "") !== setId) return false;
  if (row.thumbnailSet !== false) return false;
  if (String(row.thumbnailUploadMode || "") !== "first_frame_auto") return false;
  if (!videoIdFor(row)) return false;
  if (!rowStatus(row).startsWith("scheduled_uploaded")) return false;
  if (String(row.privacyStatus || "") !== "private") return false;
  return Boolean(row.publishAt || row.scheduledPublishAt);
}

function publicationRegistryRows(filePath, setId) {
  const registry = readJson(filePath, { publications: [] });
  if (!Array.isArray(registry.publications)) fail(`Invalid publication registry: ${filePath}`);
  return registry.publications
    .map((row, index) => ({ ...row, source: "publication_registry", registryIndex: index }))
    .filter((row) => isFallbackScheduledRow(row, setId));
}

function artifactLedgerRows(root, setId) {
  if (!fs.existsSync(root)) return [];
  const rows = [];
  for (const runDir of fs.readdirSync(root).sort()) {
    const ledgerPath = path.join(root, runDir, "outputs", "youtube-publish-ledger.jsonl");
    if (!fs.existsSync(ledgerPath)) continue;
    const lines = fs.readFileSync(ledgerPath, "utf8").split(/\n/).filter(Boolean);
    for (const line of lines) {
      const row = JSON.parse(line);
      if (isFallbackScheduledRow(row, setId)) {
        rows.push({
          ...row,
          source: "artifact_ledger",
          artifactRunId: runDir,
        });
      }
    }
  }
  return rows;
}

function targetFileRows(filePath) {
  if (!filePath) return [];
  const data = readJson(filePath);
  const rows = Array.isArray(data) ? data : (data.targets || data.results || []);
  if (!Array.isArray(rows)) fail(`Invalid target file, expected array or targets/results array: ${filePath}`);
  return rows.map((row) => ({
    ...row,
    setId: row.setId || data.setId || "home_kitchen_cookware_pilot_01",
    source: row.source || "target_file",
    youtubeVideoId: row.youtubeVideoId || row.videoId,
    publishAt: row.publishAt || row.originalPublishAt || row.scheduledPublishAt,
    publicationStatus: row.publicationStatus || row.status || "scheduled_uploaded_thumbnail_auto",
    privacyStatus: row.privacyStatus || "private",
    thumbnailSet: row.thumbnailSet ?? false,
    thumbnailUploadMode: row.thumbnailUploadMode || "first_frame_auto",
  }));
}

function normalizeTarget(row) {
  return {
    source: row.source,
    artifactRunId: row.artifactRunId || "",
    registryIndex: Number.isInteger(row.registryIndex) ? row.registryIndex : null,
    setId: row.setId,
    supportLang: String(row.supportLang || "").toUpperCase(),
    targetLang: String(row.targetLang || "").toUpperCase(),
    channelKey: row.channelKey || "",
    youtubeVideoId: videoIdFor(row),
    youtubePlaylistId: row.youtubePlaylistId || "",
    playlistItemId: row.playlistItemId || "",
    publishAt: row.publishAt || row.scheduledPublishAt || "",
    publicationStatus: row.publicationStatus || row.status || "",
    thumbnailUploadMode: row.thumbnailUploadMode || "",
    thumbnailFallbackReason: row.thumbnailFallbackReason || "",
  };
}

function collectTargets(options) {
  const byVideoId = new Map();
  const supportFilter = new Set(splitCodes(options.support));
  const rows = options.targetFile
    ? targetFileRows(options.targetFile)
    : [
      ...publicationRegistryRows(options.publicationRegistry, options.setId),
      ...artifactLedgerRows(options.artifactRoot, options.setId),
    ];
  for (const row of rows) {
    const target = normalizeTarget(row);
    if (supportFilter.size && !supportFilter.has(target.supportLang)) continue;
    if (options.videoId && target.youtubeVideoId !== options.videoId) continue;
    const existing = byVideoId.get(target.youtubeVideoId);
    if (!existing || existing.source !== "publication_registry") {
      byVideoId.set(target.youtubeVideoId, target);
    }
  }
  const sorted = [...byVideoId.values()].sort((a, b) => (
    String(a.publishAt).localeCompare(String(b.publishAt))
    || a.supportLang.localeCompare(b.supportLang)
    || a.targetLang.localeCompare(b.targetLang)
    || a.youtubeVideoId.localeCompare(b.youtubeVideoId)
  ));
  return options.limit > 0 ? sorted.slice(0, options.limit) : sorted;
}

function loadOAuthClient(clientFile) {
  const json = readJson(clientFile);
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
  const token = readJson(tokenFile);
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
  writeJson(tokenFile, nextToken);
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
  if (!response.ok) {
    const text = await response.text();
    fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${text}`);
  }
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
      fields: "items(id,snippet(channelId,title),status(privacyStatus,uploadStatus,publishAt,embeddable,license,publicStatsViewable,selfDeclaredMadeForKids,containsSyntheticMedia))",
    },
  });
  return singleYouTubeItem(readback, "video");
}

function cancelledStatusBody(currentStatus, holdPublishAt = "") {
  const next = {
    privacyStatus: "private",
    ...(holdPublishAt ? { publishAt: holdPublishAt } : {}),
    embeddable: currentStatus.embeddable,
    license: currentStatus.license,
    publicStatsViewable: currentStatus.publicStatsViewable,
    selfDeclaredMadeForKids: currentStatus.selfDeclaredMadeForKids ?? false,
    containsSyntheticMedia: currentStatus.containsSyntheticMedia,
  };
  return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
}

async function cancelSchedule({ accessToken, video, holdPublishAt = "" }) {
  return youtubeJson({
    accessToken,
    method: "PUT",
    pathName: "videos",
    query: {
      part: "status",
      fields: "id,status(privacyStatus,uploadStatus,publishAt)",
    },
    body: {
      id: video.id,
      status: cancelledStatusBody(video.status || {}, holdPublishAt),
    },
  });
}

function isQuotaError(error) {
  return /quotaExceeded|youtube\.quota|quota/i.test(String(error?.message || error));
}

function summarize(results) {
  const summary = {
    total: results.length,
    dryRun: results.filter((r) => r.status === "dry_run").length,
    paused: results.filter((r) => r.status === "schedule_paused").length,
    alreadyPaused: results.filter((r) => r.status === "already_paused").length,
    held: results.filter((r) => r.status === "schedule_held").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
  summary.bySupport = {};
  for (const result of results) {
    const key = result.supportLang || "UNKNOWN";
    summary.bySupport[key] = summary.bySupport[key] || { total: 0, paused: 0, alreadyPaused: 0, held: 0, failed: 0 };
    summary.bySupport[key].total += 1;
    if (result.status === "schedule_paused") summary.bySupport[key].paused += 1;
    if (result.status === "already_paused") summary.bySupport[key].alreadyPaused += 1;
    if (result.status === "schedule_held") summary.bySupport[key].held += 1;
    if (result.status === "failed") summary.bySupport[key].failed += 1;
  }
  return summary;
}

function youtubeEnvironmentForSupport(supportLang) {
  const routingPath = path.resolve("config/youtube-api-project-routing.json");
  if (!fs.existsSync(routingPath)) return "";
  const routing = readJson(routingPath, { projects: [] });
  const support = String(supportLang || "").toUpperCase();
  for (const project of routing.projects || []) {
    const keys = (project.supportChannelKeys || []).map((item) => String(item).toUpperCase());
    const variants = (project.supportVariants || []).map((item) => String(item).toUpperCase());
    if (keys.includes(support) || variants.includes(support)) return project.githubEnvironment || "";
  }
  return "";
}

function exportTargetFile(filePath, options, targets) {
  if (process.env.PAUSE_FALLBACK_DEBUG) console.error(`[pause-debug] export start targets=${targets.length}`);
  const exportRows = targets.map((target) => ({
    setId: target.setId,
    supportLang: target.supportLang,
    targetLang: target.targetLang,
    youtubeVideoId: target.youtubeVideoId,
    originalPublishAt: target.publishAt,
    thumbnailUploadMode: target.thumbnailUploadMode,
    thumbnailFallbackReason: target.thumbnailFallbackReason,
    source: target.source,
    artifactRunId: target.artifactRunId || "",
  }));
  if (process.env.PAUSE_FALLBACK_DEBUG) console.error("[pause-debug] export rows built");
  const bySupport = {};
  for (const row of exportRows) {
    const key = row.supportLang || "UNKNOWN";
    bySupport[key] = (bySupport[key] || 0) + 1;
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    setId: options.setId,
    sourceArtifactRoot: options.artifactRoot,
    sourcePublicationRegistry: options.publicationRegistry,
    reason: "Pause scheduled publication for videos without custom thumbnail; YouTube auto thumbnail may choose an internal frame and Data API cannot select a first frame.",
    targetCount: exportRows.length,
    bySupport,
    targets: exportRows,
  };
  if (process.env.PAUSE_FALLBACK_DEBUG) console.error(`[pause-debug] writing ${filePath}`);
  writeJson(filePath, payload);
  if (process.env.PAUSE_FALLBACK_DEBUG) console.error("[pause-debug] write done");
  return { targetCount: exportRows.length, bySupport };
}

function updateRegistryRows({ registryPath, results }) {
  const registry = readJson(registryPath, { publications: [] });
  if (!Array.isArray(registry.publications)) fail(`Invalid publication registry: ${registryPath}`);
  const now = new Date().toISOString();
  let updated = 0;
  for (const result of results) {
    if (!["schedule_paused", "already_paused", "schedule_held"].includes(result.status)) continue;
    const entry = registry.publications.find((item) => item.youtubeVideoId === result.youtubeVideoId);
    if (!entry) continue;
    const originalPublishAt = entry.publishAt || entry.scheduledPublishAt || result.before?.status?.publishAt || result.originalPublishAt || "";
    entry.privacyStatus = "private";
    entry.publicationStatus = result.status === "schedule_held"
      ? "scheduled_hold_thumbnail_auto"
      : "scheduled_paused_thumbnail_auto";
    entry.schedulePausedAt = result.timestamp || now;
    entry.schedulePauseReason = "custom_thumbnail_unavailable_youtube_auto_thumbnail_not_first_frame_safe";
    if (originalPublishAt) entry.originalPublishAt = entry.originalPublishAt || originalPublishAt;
    entry.publishAt = result.holdPublishAt || "";
    entry.scheduledPublishAt = result.holdPublishAt || "";
    if (result.holdPublishAt) entry.holdPublishAt = result.holdPublishAt;
    entry.desiredPrivacyStatus = "public_after_thumbnail_fix";
    entry.needsVisibilityPromotion = true;
    entry.lastVisibilityReadbackAt = result.timestamp || now;
    entry.readback = {
      ...(entry.readback || {}),
      uploadStatus: result.after?.status?.uploadStatus || entry.readback?.uploadStatus || "",
      privacyStatus: result.after?.status?.privacyStatus || "private",
      publishAt: result.after?.status?.publishAt || "",
      thumbnailStatus: entry.readback?.thumbnailStatus || "auto_first_frame",
      schedulePause: {
        status: result.status,
        originalPublishAt,
        readbackAt: result.timestamp || now,
      },
    };
    updated += 1;
  }
  writeJson(registryPath, registry);
  return updated;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.apply && options.confirmYoutubeWrite !== "PAUSE_FALLBACK_SCHEDULES") {
    fail("Live YouTube writes require --confirm-youtube-write=PAUSE_FALLBACK_SCHEDULES.");
  }
  if (options.holdPublishAt) {
    const holdTime = Date.parse(options.holdPublishAt);
    if (!Number.isFinite(holdTime)) fail(`Invalid --hold-publish-at: ${options.holdPublishAt}`);
    if (holdTime <= Date.now() + 10 * 60 * 1000) fail(`--hold-publish-at must be safely in the future: ${options.holdPublishAt}`);
  }

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const targets = collectTargets(options);
  if (process.env.PAUSE_FALLBACK_DEBUG) console.error(`[pause-debug] collected targets=${targets.length}`);
  if (options.exportTargetFile) {
    const exportSummary = exportTargetFile(options.exportTargetFile, options, targets);
    console.log(JSON.stringify({
      status: "target_file_exported",
      path: options.exportTargetFile,
      ...exportSummary,
    }, null, 2));
    return;
  }
  const results = [];
  const tokenCache = new Map();
  const channelAuthCache = new Map();
  let aborted = false;

  for (const target of targets) {
    const timestamp = new Date().toISOString();
    const channel = findChannelForSupport(channelRegistry.channels, target.supportLang);
    const base = {
      timestamp,
      action: "pause_fallback_schedule",
      apply: options.apply,
      setId: target.setId,
      supportLang: target.supportLang,
      targetLang: target.targetLang,
      source: target.source,
      artifactRunId: target.artifactRunId,
      youtubeVideoId: target.youtubeVideoId,
      originalPublishAt: target.publishAt,
      thumbnailUploadMode: target.thumbnailUploadMode,
      thumbnailFallbackReason: target.thumbnailFallbackReason,
      estimatedQuotaUnits: options.apply ? 52 : 0,
      holdPublishAt: options.holdPublishAt,
    };

    try {
      if (!channel) fail(`No channel configured for supportLang=${target.supportLang}`);
      if (!channel.channelId) fail(`Channel ${channel.key} has no channelId.`);
      const tokenFile = tokenFileFor(channelRegistry, channel);
      const plan = {
        ...base,
        channelKey: channel.key,
        expectedYoutubeChannelId: channel.channelId,
        tokenFile,
      };

      if (!options.apply) {
        const row = { ...plan, status: "dry_run" };
        results.push(row);
        continue;
      }

      if (!fs.existsSync(clientFile)) fail(`OAuth client not found: ${clientFile}`);
      if (!fs.existsSync(tokenFile)) fail(`OAuth token not found: ${tokenFile}`);
      let accessToken = tokenCache.get(tokenFile);
      if (!accessToken) {
        accessToken = await getAccessToken({ clientFile, tokenFile });
        tokenCache.set(tokenFile, accessToken);
      }

      if (!channelAuthCache.has(channel.key)) {
        const authorizedChannel = await readAuthorizedChannel({
          accessToken,
          expectedChannelId: channel.channelId,
        });
        channelAuthCache.set(channel.key, authorizedChannel);
      }

      const before = await readVideo({ accessToken, videoId: target.youtubeVideoId });
      if (before.snippet?.channelId !== channel.channelId) {
        fail(`Video channel mismatch: expected ${channel.channelId}, got ${before.snippet?.channelId || "(missing)"}.`);
      }

      if (before.status?.privacyStatus === "private" && !before.status?.publishAt) {
        const row = { ...plan, status: "already_paused", authorizedChannel: channelAuthCache.get(channel.key), before, after: before };
        results.push(row);
        appendLedger(options.ledger, row);
        continue;
      }

      await cancelSchedule({ accessToken, video: before, holdPublishAt: options.holdPublishAt });
      const after = await readVideo({ accessToken, videoId: target.youtubeVideoId });
      if (after.status?.privacyStatus !== "private") {
        fail(`Pause readback privacy mismatch: expected private, got ${after.status?.privacyStatus || "(missing)"}.`);
      }
      if (options.holdPublishAt) {
        const expected = Date.parse(options.holdPublishAt);
        const actual = Date.parse(after.status?.publishAt || "");
        if (after.status?.publishAt && (!Number.isFinite(actual) || Math.abs(actual - expected) > 1000)) {
          fail(`Hold readback publishAt mismatch: expected ${options.holdPublishAt}, got ${after.status?.publishAt || "(missing)"}.`);
        }
      } else if (after.status?.publishAt) {
        fail(`Pause readback still has publishAt=${after.status.publishAt}.`);
      }
      const row = {
        ...plan,
        status: after.status?.publishAt ? "schedule_held" : "schedule_paused",
        authorizedChannel: channelAuthCache.get(channel.key),
        before,
        after,
      };
      results.push(row);
      appendLedger(options.ledger, row);
    } catch (error) {
      const row = { ...base, status: "failed", error: String(error?.message || error) };
      results.push(row);
      if (options.apply) appendLedger(options.ledger, row);
      aborted = true;
      if (isQuotaError(error)) {
        row.stopReason = "quota_error";
      }
      break;
    }
  }

  let registryUpdated = 0;
  if (options.apply && options.writeRegistry) {
    registryUpdated = updateRegistryRows({
      registryPath: options.publicationRegistry,
      results,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    setId: options.setId,
    apply: options.apply,
    writeRegistry: options.writeRegistry,
    artifactRoot: options.artifactRoot,
    publicationRegistry: options.publicationRegistry,
    reportPath: options.report,
    ledgerPath: options.ledger,
    selectedCount: targets.length,
    registryUpdated,
    aborted,
    summary: summarize(results),
    results,
  };
  writeJson(options.report, report);
  console.log(JSON.stringify({
    status: aborted ? "failed" : (options.apply ? "applied" : "dry_run"),
    report: options.report,
    summary: report.summary,
    registryUpdated,
  }, null, 2));
  if (aborted) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
