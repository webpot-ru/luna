#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
} from "./lib/youtube-playlists.mjs";

const DEFAULT_PLAN_PATH = "config/youtube-schedule-repair-plans/deck1-polyglot-calendar-conflicts-20260715.json";
const DEFAULT_REPORT_PATH = "outputs/youtube-schedule-repair-report.json";
const DEFAULT_LEDGER_PATH = "outputs/youtube-schedule-repair-ledger.jsonl";

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = {
    plan: DEFAULT_PLAN_PATH,
    report: DEFAULT_REPORT_PATH,
    ledger: DEFAULT_LEDGER_PATH,
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    apply: false,
    confirmYoutubeWrite: "",
  };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--plan=")) options.plan = arg.slice("--plan=".length);
    else if (arg.startsWith("--report=")) options.report = arg.slice("--report=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--confirm-youtube-write=")) options.confirmYoutubeWrite = arg.slice("--confirm-youtube-write=".length);
    else fail(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-repair-scheduled-publish-at.mjs [--plan=<path>]",
    "",
    "Dry-run is default. Apply performs only videos.update(status) for the exact plan targets.",
    "Live write requires: --apply --confirm-youtube-write=RESCHEDULE_YOUTUBE_VIDEOS",
  ].join("\n");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) fail(`Required file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendLedger(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function normalizeTimestamp(value, label) {
  const milliseconds = Date.parse(value || "");
  if (!Number.isFinite(milliseconds)) fail(`${label} must be an ISO timestamp; received ${value || "(empty)"}.`);
  return new Date(milliseconds).toISOString();
}

function sameTimestamp(left, right) {
  const leftMilliseconds = Date.parse(left || "");
  const rightMilliseconds = Date.parse(right || "");
  return Number.isFinite(leftMilliseconds)
    && Number.isFinite(rightMilliseconds)
    && Math.abs(leftMilliseconds - rightMilliseconds) <= 1000;
}

function normalizeTarget(target, index) {
  const prefix = `targets[${index}]`;
  const youtubeVideoId = String(target?.youtubeVideoId || "").trim();
  const supportLang = String(target?.supportLang || "").trim().toUpperCase();
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)) fail(`${prefix}.youtubeVideoId must be an 11-character YouTube video ID.`);
  if (!supportLang) fail(`${prefix}.supportLang is required.`);
  if (target?.expectedPrivacyStatus !== "private") fail(`${prefix}.expectedPrivacyStatus must be private.`);
  const expectedPublishAt = normalizeTimestamp(target?.expectedPublishAt, `${prefix}.expectedPublishAt`);
  const publishAt = normalizeTimestamp(target?.publishAt, `${prefix}.publishAt`);
  if (sameTimestamp(expectedPublishAt, publishAt)) fail(`${prefix} must move the video to a different publishAt.`);
  return { ...target, youtubeVideoId, supportLang, expectedPrivacyStatus: "private", expectedPublishAt, publishAt };
}

export function validateRepairPlan(rawPlan) {
  if (!rawPlan || rawPlan.schemaVersion !== 1) fail("Schedule repair plan must have schemaVersion=1.");
  if (!String(rawPlan.planId || "").trim()) fail("Schedule repair plan requires planId.");
  if (!String(rawPlan.setId || "").trim()) fail("Schedule repair plan requires setId.");
  if (!Array.isArray(rawPlan.targets) || rawPlan.targets.length === 0) fail("Schedule repair plan requires at least one target.");
  const targets = rawPlan.targets.map(normalizeTarget);
  const videoIds = new Set();
  const channelSlots = new Set();
  for (const target of targets) {
    if (videoIds.has(target.youtubeVideoId)) fail(`Duplicate target video ID: ${target.youtubeVideoId}.`);
    videoIds.add(target.youtubeVideoId);
    const slot = `${target.supportLang}|${target.publishAt}`;
    if (channelSlots.has(slot)) fail(`Two repair targets claim the same channel/time slot: ${slot}.`);
    channelSlots.add(slot);
  }
  return { ...rawPlan, planId: String(rawPlan.planId).trim(), setId: String(rawPlan.setId).trim(), targets };
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
  writeJson(tokenFile, {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  });
  return refreshed.access_token;
}

async function youtubeJson({ accessToken, method, pathName, query = {}, body }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${accessToken}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function singleItem(response, label) {
  const item = response?.items?.[0];
  if (!item) fail(`YouTube ${label} readback returned no items.`);
  return item;
}

async function readAuthorizedChannel({ accessToken, expectedChannelId }) {
  const item = singleItem(await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "channels",
    query: { part: "snippet", mine: "true", fields: "items(id,snippet(title,customUrl))" },
  }), "authorized channel");
  if (item.id !== expectedChannelId) fail(`OAuth token channel mismatch: expected ${expectedChannelId}, got ${item.id}.`);
  return item;
}

async function readVideo({ accessToken, videoId }) {
  return singleItem(await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "videos",
    query: {
      part: "snippet,status",
      id: videoId,
      fields: "items(id,snippet(channelId,title),status(privacyStatus,uploadStatus,publishAt,embeddable,license,publicStatsViewable,selfDeclaredMadeForKids,containsSyntheticMedia))",
    },
  }), "video");
}

export function scheduledStatusBody(currentStatus, publishAt) {
  const next = {
    privacyStatus: "private",
    publishAt,
    embeddable: currentStatus?.embeddable,
    license: currentStatus?.license,
    publicStatsViewable: currentStatus?.publicStatsViewable,
    selfDeclaredMadeForKids: currentStatus?.selfDeclaredMadeForKids ?? false,
    containsSyntheticMedia: currentStatus?.containsSyntheticMedia,
  };
  return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
}

async function updateSchedule({ accessToken, video, publishAt }) {
  return youtubeJson({
    accessToken,
    method: "PUT",
    pathName: "videos",
    query: { part: "status", fields: "id,status(privacyStatus,uploadStatus,publishAt)" },
    body: { id: video.id, status: scheduledStatusBody(video.status, publishAt) },
  });
}

function planRow({ plan, target, channel, apply }) {
  return {
    timestamp: new Date().toISOString(),
    action: "repair_scheduled_publish_at",
    planId: plan.planId,
    setId: plan.setId,
    videoType: target.videoType || "",
    contentScope: target.contentScope || "",
    youtubeVideoId: target.youtubeVideoId,
    supportLang: target.supportLang,
    channelKey: channel?.key || target.channelKey || "",
    expectedYoutubeChannelId: channel?.channelId || "",
    expectedPrivacyStatus: target.expectedPrivacyStatus,
    expectedPublishAt: target.expectedPublishAt,
    publishAt: target.publishAt,
    apply,
    estimatedQuotaUnits: apply ? 52 : 0,
  };
}

export async function runScheduleRepair({ plan, channelRegistry, clientFile, apply, confirmYoutubeWrite }) {
  if (apply && confirmYoutubeWrite !== "RESCHEDULE_YOUTUBE_VIDEOS") {
    fail("Live YouTube schedule repair requires --confirm-youtube-write=RESCHEDULE_YOUTUBE_VIDEOS.");
  }
  const results = [];
  const tokenCache = new Map();
  const authorizedChannels = new Map();
  let stopped = false;
  for (const target of plan.targets) {
    const channel = findChannelForSupport(channelRegistry.channels, target.supportLang);
    const base = planRow({ plan, target, channel, apply });
    try {
      if (stopped) {
        results.push({ ...base, status: "not_attempted_after_prior_failure" });
        continue;
      }
      if (!channel?.channelId) fail(`No configured YouTube channel for supportLang=${target.supportLang}.`);
      if (!apply) {
        results.push({ ...base, status: "dry_run" });
        continue;
      }
      if (Date.parse(target.publishAt) <= Date.now() + 10 * 60 * 1000) {
        fail(`Target publishAt is no longer safely in the future: ${target.publishAt}.`);
      }
      const tokenFile = tokenFileFor(channelRegistry, channel);
      if (!fs.existsSync(clientFile)) fail(`OAuth client not found: ${clientFile}`);
      if (!fs.existsSync(tokenFile)) fail(`OAuth token not found: ${tokenFile}`);
      let accessToken = tokenCache.get(tokenFile);
      if (!accessToken) {
        accessToken = await getAccessToken({ clientFile, tokenFile });
        tokenCache.set(tokenFile, accessToken);
      }
      if (!authorizedChannels.has(channel.key)) {
        authorizedChannels.set(channel.key, await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId }));
      }
      const before = await readVideo({ accessToken, videoId: target.youtubeVideoId });
      if (before.snippet?.channelId !== channel.channelId) {
        fail(`Video channel mismatch: expected ${channel.channelId}, got ${before.snippet?.channelId || "(missing)"}.`);
      }
      if (before.status?.privacyStatus !== "private") {
        fail(`Video privacy mismatch: expected private, got ${before.status?.privacyStatus || "(missing)"}.`);
      }
      if (sameTimestamp(before.status?.publishAt, target.publishAt)) {
        results.push({ ...base, status: "already_moved", authorizedChannel: authorizedChannels.get(channel.key), before, after: before });
        continue;
      }
      if (!sameTimestamp(before.status?.publishAt, target.expectedPublishAt)) {
        fail(`Video publishAt mismatch: expected ${target.expectedPublishAt}, got ${before.status?.publishAt || "(missing)"}.`);
      }
      const updateResponse = await updateSchedule({ accessToken, video: before, publishAt: target.publishAt });
      const after = await readVideo({ accessToken, videoId: target.youtubeVideoId });
      if (after.status?.privacyStatus !== "private" || !sameTimestamp(after.status?.publishAt, target.publishAt)) {
        fail(`Schedule readback mismatch: expected private at ${target.publishAt}, got ${after.status?.privacyStatus || "(missing)"} at ${after.status?.publishAt || "(missing)"}.`);
      }
      results.push({ ...base, status: "schedule_moved", authorizedChannel: authorizedChannels.get(channel.key), before, updateResponse, after });
    } catch (error) {
      results.push({ ...base, status: "failed", error: error.message });
      stopped = true;
    }
  }
  return results;
}

function summarize(results) {
  return {
    total: results.length,
    dryRun: results.filter(row => row.status === "dry_run").length,
    moved: results.filter(row => row.status === "schedule_moved").length,
    alreadyMoved: results.filter(row => row.status === "already_moved").length,
    failed: results.filter(row => row.status === "failed").length,
    notAttempted: results.filter(row => row.status === "not_attempted_after_prior_failure").length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const plan = validateRepairPlan(readJson(options.plan));
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply" : "dry_run",
    planPath: options.plan,
    planId: plan.planId,
    setId: plan.setId,
    youtubeWrites: options.apply ? "videos.update(status) only" : "none",
    prohibitedWork: ["render", "tts", "metadata", "thumbnail", "playlist", "upload", "delete"],
    results: [],
  };
  try {
    report.results = await runScheduleRepair({
      plan,
      channelRegistry,
      clientFile,
      apply: options.apply,
      confirmYoutubeWrite: options.confirmYoutubeWrite,
    });
    report.summary = summarize(report.results);
  } finally {
    for (const row of report.results) appendLedger(options.ledger, row);
    writeJson(options.report, report);
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.failed > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
