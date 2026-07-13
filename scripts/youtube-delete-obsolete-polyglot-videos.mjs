#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { findChannelForSupport, loadYoutubeChannels, normalizeLanguageCode } from "./lib/youtube-playlists.mjs";

function parseArgs(argv) {
  const options = {
    targetFile: "",
    route: "",
    channelConfig: "config/youtube-channels.json",
    routingConfig: "config/youtube-api-project-routing.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    publishCalendar: "config/youtube-publish-calendar.json",
    reportFile: "outputs/youtube-obsolete-polyglot-deletion-report.json",
    apply: false,
    confirmYoutubeWrite: false,
  };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg.startsWith("--target-file=")) options.targetFile = arg.slice("--target-file=".length);
    else if (arg.startsWith("--route=")) options.route = arg.slice("--route=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--routing-config=")) options.routingConfig = arg.slice("--routing-config=".length);
    else if (arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = arg.slice("--polyglot-registry=".length);
    else if (arg.startsWith("--publish-calendar=")) options.publishCalendar = arg.slice("--publish-calendar=".length);
    else if (arg.startsWith("--report-file=")) options.reportFile = arg.slice("--report-file=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error(`Required file not found: ${filePath || "<empty>"}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeTargets(values) {
  return (values || []).map(normalizeLanguageCode).filter(Boolean).sort();
}

function isActive(row) {
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  return row.youtubeVideoId && !status.includes("deleted") && !status.includes("superseded") && !status.includes("failed");
}

function loadTargets(filePath) {
  const plan = readJson(filePath);
  if (plan.schemaVersion !== 1 || plan.mode !== "read_only_replacement_plan" || !Array.isArray(plan.items) || !plan.items.length) {
    throw new Error("Replacement plan must use schemaVersion=1, mode=read_only_replacement_plan and a non-empty items array.");
  }
  const ids = new Set();
  for (const [index, item] of plan.items.entries()) {
    for (const field of ["route", "supportLang", "bundleKey", "contentScope", "occupiedVideoId"]) {
      if (!String(item[field] || "").trim()) throw new Error(`Item ${index + 1} is missing ${field}.`);
    }
    if (!/^youtube-[1-4]$/.test(item.route)) throw new Error(`Item ${index + 1} has invalid route ${item.route}.`);
    if (!/^[A-Za-z0-9_-]{11}$/.test(item.occupiedVideoId)) throw new Error(`Item ${index + 1} has invalid occupiedVideoId.`);
    if (!Array.isArray(item.currentTargetLangs) || !item.currentTargetLangs.length || !Array.isArray(item.replacementTargetLangs) || !item.replacementTargetLangs.length) {
      throw new Error(`Item ${index + 1} must contain currentTargetLangs and replacementTargetLangs.`);
    }
    if (ids.has(item.occupiedVideoId)) throw new Error(`Duplicate occupiedVideoId ${item.occupiedVideoId}.`);
    ids.add(item.occupiedVideoId);
  }
  return plan;
}

function routeForChannel(routing, channel) {
  return (routing.projects || []).find(project => (project.supportChannelKeys || []).includes(channel.key))?.key || "";
}

function validateCandidate({ item, setId, channels, routing, registry }) {
  const supportLang = normalizeLanguageCode(item.supportLang);
  const channel = findChannelForSupport(channels, supportLang);
  if (!channel) throw new Error(`No configured channel for ${supportLang}.`);
  const route = routeForChannel(routing, channel);
  if (route !== item.route) throw new Error(`Route mismatch for ${supportLang}: plan=${item.route}, config=${route || "missing"}.`);
  const rows = (registry.publications || []).filter(row => row.youtubeVideoId === item.occupiedVideoId && isActive(row));
  if (rows.length !== 1) throw new Error(`Expected one active registry row for ${item.occupiedVideoId}; found ${rows.length}.`);
  const row = rows[0];
  if (row.setId !== setId || normalizeLanguageCode(row.supportLang) !== supportLang || row.bundleKey !== item.bundleKey || (row.contentScope || "full") !== item.contentScope) {
    throw new Error(`Registry identity mismatch for ${item.occupiedVideoId}.`);
  }
  if (JSON.stringify(normalizeTargets(row.targetLangs?.length ? row.targetLangs : String(row.targetLang || "").split(","))) !== JSON.stringify(normalizeTargets(item.currentTargetLangs))) {
    throw new Error(`Current target set mismatch for ${item.occupiedVideoId}.`);
  }
  return { item, row, channel, route, supportLang };
}

function loadOAuthClient(filePath) {
  const json = readJson(filePath);
  const client = json.installed || json.web || json;
  return { clientId: client.client_id, clientSecret: client.client_secret, tokenUri: client.token_uri || "https://oauth2.googleapis.com/token" };
}

function tokenFileFor(registry, channel) {
  return channel.oauthTokenFile || path.join(registry.defaults?.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

async function getAccessToken(clientFile, tokenFile) {
  const client = loadOAuthClient(clientFile);
  const token = readJson(tokenFile);
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) throw new Error(`OAuth token has no refresh_token: ${tokenFile}`);
  const body = new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret, grant_type: "refresh_token", refresh_token: token.refresh_token });
  const response = await fetch(client.tokenUri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
  const refreshed = await response.json();
  fs.writeFileSync(tokenFile, `${JSON.stringify({ ...token, ...refreshed, refresh_token: refreshed.refresh_token || token.refresh_token, expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000 }, null, 2)}\n`);
  return refreshed.access_token;
}

async function readVideo(accessToken, videoId) {
  const url = new URL("videos", "https://www.googleapis.com/youtube/v3/");
  url.searchParams.set("part", "id,snippet,status");
  url.searchParams.set("id", videoId);
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`YouTube API preflight failed (${response.status}): ${await response.text()}`);
  return (await response.json()).items?.[0] || null;
}

async function deleteVideo(accessToken, videoId) {
  const url = new URL("videos", "https://www.googleapis.com/youtube/v3/");
  url.searchParams.set("id", videoId);
  const response = await fetch(url, { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`YouTube API DELETE failed (${response.status}): ${await response.text()}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.targetFile || !/^youtube-[1-4]$/.test(options.route)) throw new Error("--target-file and one explicit --route=youtube-N are required.");
  if (options.apply && !options.confirmYoutubeWrite) throw new Error("Live deletion requires --apply --confirm-youtube-write.");
  const plan = loadTargets(options.targetFile);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const routing = readJson(options.routingConfig);
  const registry = readJson(options.polyglotRegistry);
  const calendar = readJson(options.publishCalendar);
  const candidates = plan.items.filter(item => item.route === options.route).map(item => validateCandidate({ item, setId: plan.setId, channels: channelRegistry.channels, routing, registry }));
  if (!candidates.length) throw new Error(`Replacement plan has no items for ${options.route}.`);

  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), mode: options.apply ? "apply" : "dry_run", route: options.route, targetFile: options.targetFile, expectedDeleteCount: candidates.length, preflight: [], deleted: [], errors: [] };
  if (!options.apply) {
    report.preflight = candidates.map(candidate => ({ supportLang: candidate.supportLang, videoId: candidate.item.occupiedVideoId, channelId: candidate.channel.channelId, registryIdentity: "matched" }));
  } else {
    const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
    const tokens = new Map();
    for (const candidate of candidates) {
      let accessToken = tokens.get(candidate.channel.key);
      if (!accessToken) {
        accessToken = await getAccessToken(clientFile, tokenFileFor(channelRegistry, candidate.channel));
        tokens.set(candidate.channel.key, accessToken);
      }
      const live = await readVideo(accessToken, candidate.item.occupiedVideoId);
      if (!live || live.snippet?.channelId !== candidate.channel.channelId) throw new Error(`Live preflight channel/video mismatch for ${candidate.item.occupiedVideoId}.`);
      report.preflight.push({ supportLang: candidate.supportLang, videoId: live.id, channelId: live.snippet.channelId, privacyStatus: live.status?.privacyStatus || "", uploadStatus: live.status?.uploadStatus || "" });
    }
    for (const candidate of candidates) {
      const accessToken = tokens.get(candidate.channel.key);
      try {
        await deleteVideo(accessToken, candidate.item.occupiedVideoId);
        const deletedAt = new Date().toISOString();
        candidate.row.publicationStatus = "deleted_obsolete_replacement";
        candidate.row.deletedAt = deletedAt;
        candidate.row.source = "exact_obsolete_polyglot_replacement_delete";
        calendar.reservations = (calendar.reservations || []).filter(row => row.youtubeVideoId !== candidate.item.occupiedVideoId);
        report.deleted.push({ supportLang: candidate.supportLang, videoId: candidate.item.occupiedVideoId, deletedAt });
      } catch (error) {
        report.errors.push({ supportLang: candidate.supportLang, videoId: candidate.item.occupiedVideoId, error: error.message });
        break;
      }
    }
    fs.writeFileSync(options.polyglotRegistry, `${JSON.stringify(registry, null, 2)}\n`);
    fs.writeFileSync(options.publishCalendar, `${JSON.stringify(calendar, null, 2)}\n`);
  }
  fs.mkdirSync(path.dirname(options.reportFile), { recursive: true });
  fs.writeFileSync(options.reportFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ mode: report.mode, route: report.route, expectedDeleteCount: report.expectedDeleteCount, preflightCount: report.preflight.length, deletedCount: report.deleted.length, errorCount: report.errors.length }, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main().catch(error => { console.error(error.stack || error.message); process.exit(1); });

export { isActive, loadTargets, main, normalizeTargets, parseArgs, validateCandidate };
