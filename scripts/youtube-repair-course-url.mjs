#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  isActivePublication,
  loadPublicationRegistry,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";
import {
  getPublicCourseUrl,
  getPublicStudyLanguageCode,
} from "./lib/video-public-url.mjs";

const DEFAULT_OUTPUT_DIR = "outputs/youtube-course-url-repair";
const DEFAULT_CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const DEFAULT_ROUTING_CONFIG = "config/youtube-api-project-routing.json";
const DEFAULT_TARGET = "NB";

function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function loadYoutubeChannels(filePath = DEFAULT_CHANNEL_CONFIG_PATH) {
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.channels)) throw new Error(`Invalid YouTube channel config: ${filePath}`);
  return registry;
}

function findChannelForSupport(channels, supportLang) {
  const code = normalizeLanguageCode(supportLang);
  return channels.find((channel) => (channel.supportLangs || []).map(normalizeLanguageCode).includes(code));
}

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    targets: [DEFAULT_TARGET],
    route: "",
    videoIds: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    routingConfig: DEFAULT_ROUTING_CONFIG,
    outputDir: "",
    localRoot: "",
    oauthRoot: "",
    maxUpdates: Infinity,
    liveAudit: false,
    apply: false,
    confirmYoutubeWrite: false,
    skipReadback: false,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--live-audit") options.liveAudit = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--skip-readback") options.skipReadback = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--set=")) options.setId = arg.slice("--set=".length);
    else if (arg.startsWith("--supports=") || arg.startsWith("--support=")) {
      const value = arg.includes("--supports=") ? arg.slice("--supports=".length) : arg.slice("--support=".length);
      options.supports = splitCodes(value);
    } else if (arg.startsWith("--targets=") || arg.startsWith("--target=")) {
      const value = arg.includes("--targets=") ? arg.slice("--targets=".length) : arg.slice("--target=".length);
      options.targets = splitCodes(value);
    } else if (arg.startsWith("--route=")) options.route = arg.slice("--route=".length);
    else if (arg.startsWith("--video-ids=") || arg.startsWith("--video-id=")) {
      const value = arg.includes("--video-ids=") ? arg.slice("--video-ids=".length) : arg.slice("--video-id=".length);
      options.videoIds = String(value).split(",").map((item) => item.trim()).filter(Boolean);
    } else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--routing-config=")) options.routingConfig = arg.slice("--routing-config=".length);
    else if (arg.startsWith("--output-dir=")) options.outputDir = arg.slice("--output-dir=".length);
    else if (arg.startsWith("--local-root=")) options.localRoot = arg.slice("--local-root=".length);
    else if (arg.startsWith("--oauth-root=")) options.oauthRoot = arg.slice("--oauth-root=".length);
    else if (arg.startsWith("--max-updates=")) options.maxUpdates = Number(arg.slice("--max-updates=".length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-repair-course-url.mjs [--set=<set_id>] [--target=NB] [--supports=RU,EN] [--route=youtube-1]",
    "",
    "Default mode is registry-only planning: no YouTube API calls and no writes.",
    "Use --live-audit to read live YouTube snippets and detect descriptions that still contain the legacy URL.",
    "Use --apply --confirm-youtube-write to replace only the exact legacy URL in live descriptions.",
    "",
    "Current default repair target:",
    "  NB public study links must use ?langs=no instead of the legacy ?langs=nb.",
    "",
    "Options:",
    "  --video-ids=<ids>           Limit to specific YouTube video ids.",
    "  --max-updates=<n>           Bound live videos.update calls.",
    "  --skip-readback             Skip post-update videos.list verification.",
    "  --local-root=<path>         Load .env.local and .local/access-imports/youtube2026new.env.local from another checkout.",
    "  --oauth-root=<path>         Resolve relative OAuth client/token files from another checkout.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeLanguageCode(item))
    .filter(Boolean);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function legacyStudyLanguageCode(languageCode) {
  return normalizeLanguageCode(languageCode).toLowerCase();
}

function withStudyLanguageCode(courseUrl, studyCode) {
  const parsed = new URL(courseUrl);
  parsed.searchParams.set("langs", studyCode);
  return parsed.toString();
}

function extractFlashcardsStudyUrls(text) {
  const matches = String(text || "").match(/https:\/\/flashcardsluna\.com\/[^\s<>"')\]]+/gu) || [];
  return matches
    .map((raw) => raw.replace(/[.,;:!?]+$/u, ""))
    .filter((url) => {
      try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        return parsed.hostname === "flashcardsluna.com"
          && parts.at(-2) === "study"
          && parts.at(-1) === "standard";
      } catch {
        return false;
      }
    });
}

function analyzeDescription({ description, expectedUrl, legacyUrl, legacyCode }) {
  const studyUrls = extractFlashcardsStudyUrls(description);
  const exactLegacyPresent = String(description || "").includes(legacyUrl);
  const expectedPresent = String(description || "").includes(expectedUrl);
  const legacyCodeUrls = studyUrls.filter((url) => {
    try {
      const parsed = new URL(url);
      return String(parsed.searchParams.get("langs") || "").trim().toLowerCase() === legacyCode;
    } catch {
      return false;
    }
  });

  if (exactLegacyPresent) {
    return {
      status: "needs_update",
      exactLegacyPresent,
      expectedPresent,
      legacyCodeUrls,
      blockers: [],
      warnings: [],
    };
  }
  if (legacyCodeUrls.length) {
    return {
      status: "needs_manual_review",
      exactLegacyPresent,
      expectedPresent,
      legacyCodeUrls,
      blockers: ["description contains a legacy study URL, but it does not exactly match the deterministic replacement URL"],
      warnings: [],
    };
  }
  if (expectedPresent) {
    return {
      status: "already_ok",
      exactLegacyPresent,
      expectedPresent,
      legacyCodeUrls,
      blockers: [],
      warnings: [],
    };
  }
  return {
    status: "missing_course_url",
    exactLegacyPresent,
    expectedPresent,
    legacyCodeUrls,
    blockers: ["description has neither the expected public course URL nor the exact legacy URL"],
    warnings: [],
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  let timeout = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`HTTP request timed out after ${timeoutMs}ms: ${url}`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      fetch(url, {
        ...options,
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`HTTP request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function bodyWithTimeout(response, reader, label, timeoutMs = 45000) {
  let timeout = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`HTTP response body timed out after ${timeoutMs}ms: ${label}`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([reader.call(response), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/gu, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadLocalEnv(localRoot) {
  const roots = [process.cwd(), localRoot].filter(Boolean);
  for (const root of roots) {
    loadEnvFile(path.resolve(root, ".env.local"));
    loadEnvFile(path.resolve(root, ".env.vectorengine.local"));
    loadEnvFile(path.resolve(root, ".local/access-imports/youtube2026new.env.local"));
  }
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

function resolveExternalPath(filePath, { root = "", label }) {
  if (!filePath) fail(`${label} path is empty.`);
  const candidates = [
    path.resolve(filePath),
    root ? path.resolve(root, filePath) : "",
  ].filter(Boolean);
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) fail(`${label} not found: ${filePath}${root ? ` (also tried ${root})` : ""}`);
  return resolved;
}

function tokenFileFor(channelRegistry, channel) {
  const defaults = channelRegistry.defaults || {};
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  return path.join(defaults.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

function discoverOAuthClientFiles(oauthRoot, defaultClientFile) {
  const candidates = [];
  const add = (filePath) => {
    if (!filePath) return;
    const resolved = path.resolve(filePath);
    if (fs.existsSync(resolved) && !candidates.includes(resolved)) candidates.push(resolved);
  };
  const addFromRoot = (relativePath) => {
    if (!oauthRoot) return;
    add(path.resolve(oauthRoot, relativePath));
  };
  add(defaultClientFile);
  addFromRoot(".local/youtube-oauth/google-oauth-client.json");
  if (oauthRoot && fs.existsSync(oauthRoot)) {
    for (const name of fs.readdirSync(oauthRoot)) {
      if (/^client_secret_.*\.json$/u.test(name)) add(path.resolve(oauthRoot, name));
    }
  }
  return candidates;
}

function preferredClientFiles(clientFiles, route) {
  const routePrefixes = {
    "youtube-1": "130628727588",
    "youtube-2": "327715936948",
    "youtube-3": "1076963270652",
    "youtube-4": "215536805171",
  };
  const prefix = routePrefixes[route] || "";
  if (!prefix) return clientFiles;
  return [
    ...clientFiles.filter((file) => path.basename(file).includes(prefix)),
    ...clientFiles.filter((file) => !path.basename(file).includes(prefix)),
  ];
}

async function refreshAccessToken({ clientFile, token, tokenFile }) {
  const client = loadOAuthClient(clientFile);
  if (!token.refresh_token) fail(`OAuth token file has no refresh_token: ${tokenFile}`);

  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });
  const response = await fetchWithTimeout(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const errorText = await bodyWithTimeout(response, response.text, client.tokenUri);
    fail(`OAuth token refresh failed (${response.status}) for client ${path.basename(clientFile)}: ${errorText}`);
  }
  const refreshed = await bodyWithTimeout(response, response.json, client.tokenUri);
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  fs.writeFileSync(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, "utf8");
  return nextToken.access_token;
}

async function getAccessToken({ clientFiles, tokenFile, route }) {
  const token = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) fail(`OAuth token file has no refresh_token: ${tokenFile}`);
  const errors = [];
  for (const clientFile of preferredClientFiles(clientFiles, route)) {
    try {
      console.error(`[COURSE_URL_REPAIR] oauthRefresh route=${route || "unknown"} token=${path.basename(tokenFile)} client=${path.basename(clientFile)}`);
      return await refreshAccessToken({ clientFile, token, tokenFile });
    } catch (error) {
      errors.push(error.message);
    }
  }
  fail(`OAuth token refresh failed for ${path.basename(tokenFile)} on ${route || "unknown route"}: ${errors.join(" | ")}`);
}

async function youtubeJson({ accessToken, method, pathName, query = {}, body }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetchWithTimeout(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await bodyWithTimeout(response, response.text, url.toString());
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || text || response.statusText;
    const error = new Error(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${message}`);
    error.status = response.status;
    error.youtubeError = data;
    throw error;
  }
  return data;
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

async function readVideos({ accessToken, ids }) {
  const response = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "videos",
    query: {
      part: "snippet,status",
      id: ids.join(","),
      fields: "items(id,snippet(channelId,title,description,tags,categoryId,defaultLanguage,defaultAudioLanguage),status(privacyStatus,uploadStatus,publishAt,selfDeclaredMadeForKids))",
    },
  });
  return response?.items || [];
}

function buildSnippetPayload({ video, description, includeLanguageFields = true }) {
  return {
    id: video.id,
    snippet: {
      title: String(video.snippet?.title || "FlashcardsLuna").slice(0, 100),
      description: String(description || "").slice(0, 5000),
      ...(Array.isArray(video.snippet?.tags) ? { tags: video.snippet.tags } : {}),
      categoryId: String(video.snippet?.categoryId || "27"),
      ...(includeLanguageFields && video.snippet?.defaultLanguage ? { defaultLanguage: video.snippet.defaultLanguage } : {}),
      ...(includeLanguageFields && video.snippet?.defaultAudioLanguage ? { defaultAudioLanguage: video.snippet.defaultAudioLanguage } : {}),
    },
  };
}

function isInvalidMetadataError(error) {
  return /request metadata is invalid/iu.test(cleanText(error?.message || String(error || "")));
}

async function updateVideoDescription({ accessToken, video, description }) {
  const base = {
    accessToken,
    method: "PUT",
    pathName: "videos",
    query: {
      part: "snippet",
      fields: "id,snippet(channelId,title,description,tags,categoryId)",
    },
  };
  try {
    return await youtubeJson({
      ...base,
      body: buildSnippetPayload({ video, description, includeLanguageFields: true }),
    });
  } catch (error) {
    if (!isInvalidMetadataError(error)) throw error;
    return youtubeJson({
      ...base,
      body: buildSnippetPayload({ video, description, includeLanguageFields: false }),
    });
  }
}

function loadRoutingMap(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const routing = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const routeBySupport = new Map();
  for (const project of routing.projects || []) {
    for (const support of project.supportVariants || []) {
      routeBySupport.set(normalizeLanguageCode(support), project.key);
    }
  }
  return routeBySupport;
}

function routeMatches(routeBySupport, supportLang, requestedRoute) {
  if (!requestedRoute) return true;
  const route = routeBySupport.get(normalizeLanguageCode(supportLang));
  return route === requestedRoute;
}

function isQuotaError(error) {
  const text = JSON.stringify(error?.youtubeError || {}) + " " + String(error?.message || "");
  return /quotaExceeded|youtube\.quota/iu.test(text);
}

function saveReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function summarize(results) {
  const summary = {
    plannedCandidates: results.length,
    liveChecked: 0,
    needsUpdate: 0,
    alreadyOk: 0,
    needsManualReview: 0,
    missingCourseUrl: 0,
    updated: 0,
    readbackPassed: 0,
    errors: 0,
    quotaStopped: false,
    byRoute: {},
    bySupport: {},
  };

  for (const result of results) {
    const support = result.supportLang || "(unknown)";
    const route = result.route || "(unknown)";
    summary.bySupport[support] ||= { plannedCandidates: 0, liveChecked: 0, needsUpdate: 0, updated: 0, errors: 0 };
    summary.byRoute[route] ||= { plannedCandidates: 0, liveChecked: 0, needsUpdate: 0, updated: 0, errors: 0 };
    summary.bySupport[support].plannedCandidates += 1;
    summary.byRoute[route].plannedCandidates += 1;

    if (result.liveStatus) {
      summary.liveChecked += 1;
      summary.bySupport[support].liveChecked += 1;
      summary.byRoute[route].liveChecked += 1;
    }
    if (result.liveStatus === "needs_update") {
      summary.needsUpdate += 1;
      summary.bySupport[support].needsUpdate += 1;
      summary.byRoute[route].needsUpdate += 1;
    }
    if (result.liveStatus === "already_ok") summary.alreadyOk += 1;
    if (result.liveStatus === "needs_manual_review") summary.needsManualReview += 1;
    if (result.liveStatus === "missing_course_url") summary.missingCourseUrl += 1;
    if (result.updated) {
      summary.updated += 1;
      summary.bySupport[support].updated += 1;
      summary.byRoute[route].updated += 1;
    }
    if (result.readbackStatus === "pass") summary.readbackPassed += 1;
    if (result.error) {
      summary.errors += 1;
      summary.bySupport[support].errors += 1;
      summary.byRoute[route].errors += 1;
    }
    if (result.quotaStopped) summary.quotaStopped = true;
  }

  summary.bySupport = Object.fromEntries(Object.entries(summary.bySupport).sort(([a], [b]) => a.localeCompare(b)));
  summary.byRoute = Object.fromEntries(Object.entries(summary.byRoute).sort(([a], [b]) => a.localeCompare(b)));
  return summary;
}

function recordResult(reportPath, report, result) {
  report.results.push(result);
  report.summary = summarize(report.results);
  saveReport(reportPath, report);
}

function buildCandidate(row, routeBySupport) {
  const targetLang = normalizeLanguageCode(row.targetLang);
  const expectedStudyCode = getPublicStudyLanguageCode(targetLang);
  const legacyCode = legacyStudyLanguageCode(targetLang);
  const expectedUrl = getPublicCourseUrl({
    setId: row.setId,
    supportLang: row.supportLang,
    targetLang,
  });
  const legacyUrl = withStudyLanguageCode(expectedUrl, legacyCode);
  return {
    setId: row.setId,
    supportLang: normalizeLanguageCode(row.supportLang),
    targetLang,
    youtubeVideoId: row.youtubeVideoId,
    youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
    channelKey: row.channelKey || "",
    route: routeBySupport.get(normalizeLanguageCode(row.supportLang)) || "",
    publicationStatus: row.publicationStatus || row.status || "",
    privacyStatus: row.privacyStatus || "",
    publishAt: row.publishAt || row.scheduledPublishAt || "",
    expectedStudyCode,
    legacyStudyCode: legacyCode,
    expectedUrl,
    legacyUrl,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.apply && !options.confirmYoutubeWrite) {
    fail("Live YouTube repair requires --apply --confirm-youtube-write.");
  }
  if (options.maxUpdates !== Infinity && (!Number.isFinite(options.maxUpdates) || options.maxUpdates < 0)) {
    fail("--max-updates must be a non-negative number.");
  }

  const outputDir = path.resolve(options.outputDir || path.join(DEFAULT_OUTPUT_DIR, new Date().toISOString().replace(/[:.]/gu, "-")));
  const reportPath = path.join(outputDir, "youtube-course-url-repair-report.json");
  const routeBySupport = loadRoutingMap(options.routingConfig);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const supportsFilter = new Set(options.supports);
  const targetsFilter = new Set(options.targets.length ? options.targets : [DEFAULT_TARGET]);
  const videoFilter = new Set(options.videoIds);

  const rows = (publicationRegistry.publications || [])
    .filter(isActivePublication)
    .filter((row) => row.youtubeVideoId)
    .filter((row) => !options.setId || row.setId === options.setId)
    .filter((row) => !supportsFilter.size || supportsFilter.has(normalizeLanguageCode(row.supportLang)))
    .filter((row) => !targetsFilter.size || targetsFilter.has(normalizeLanguageCode(row.targetLang)))
    .filter((row) => !videoFilter.size || videoFilter.has(row.youtubeVideoId))
    .filter((row) => routeMatches(routeBySupport, row.supportLang, options.route))
    .map((row) => buildCandidate(row, routeBySupport))
    .filter((candidate) => candidate.expectedStudyCode && candidate.legacyStudyCode)
    .filter((candidate) => candidate.expectedStudyCode !== candidate.legacyStudyCode)
    .sort((a, b) => `${a.route} ${a.supportLang} ${a.targetLang} ${a.youtubeVideoId}`
      .localeCompare(`${b.route} ${b.supportLang} ${b.targetLang} ${b.youtubeVideoId}`));

  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply" : (options.liveAudit ? "live_audit" : "plan"),
    reason: "norwegian_nb_public_study_url_alias",
    setId: options.setId || "",
    supports: [...supportsFilter],
    targets: [...targetsFilter],
    route: options.route,
    outputDir,
    registryPath: options.publicationRegistry,
    checkedCandidateCount: rows.length,
    results: [],
    summary: {},
  };
  saveReport(reportPath, report);

  if (!options.liveAudit && !options.apply) {
    for (const candidate of rows) {
      recordResult(reportPath, report, {
        ...candidate,
        liveStatus: "",
        updated: false,
        readbackStatus: "",
        error: "",
      });
    }
    report.completedAt = new Date().toISOString();
    report.summary = summarize(report.results);
    saveReport(reportPath, report);
    console.log(JSON.stringify({
      status: "planned",
      reportPath,
      summary: report.summary,
    }, null, 2));
    return;
  }

  loadLocalEnv(options.localRoot);
  const oauthRoot = options.oauthRoot || options.localRoot || "";
  const defaultClientFile = resolveExternalPath(channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json", {
    root: oauthRoot,
    label: "OAuth client",
  });
  const clientFiles = discoverOAuthClientFiles(oauthRoot, defaultClientFile);
  if (!clientFiles.length) fail(`No OAuth client files found under ${oauthRoot || process.cwd()}.`);

  let updates = 0;
  let stopForQuota = false;

  for (const supportLang of [...new Set(rows.map((row) => row.supportLang))]) {
    if (stopForQuota) break;
    const channel = findChannelForSupport(channelRegistry.channels, supportLang);
    if (!channel) fail(`No channel configured for supportLang=${supportLang}`);
    const tokenFile = resolveExternalPath(tokenFileFor(channelRegistry, channel), {
      root: oauthRoot,
      label: `OAuth token for ${supportLang}`,
    });
    const route = routeBySupport.get(supportLang) || "";
    const supportRows = rows.filter((row) => row.supportLang === supportLang);
    console.error(`[COURSE_URL_REPAIR] support=${supportLang} route=${route || "unknown"} rows=${supportRows.length}`);

    let accessToken = "";
    try {
      accessToken = await getAccessToken({ clientFiles, tokenFile, route });
      await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
    } catch (error) {
      const message = cleanText(error.message || String(error));
      for (const row of supportRows) {
        recordResult(reportPath, report, {
          ...row,
          channelKey: row.channelKey || channel.key,
          liveStatus: "",
          updated: false,
          readbackStatus: "",
          error: message,
          quotaStopped: isQuotaError(error),
        });
      }
      if (isQuotaError(error)) {
        stopForQuota = true;
        break;
      }
      continue;
    }

    for (let index = 0; index < supportRows.length; index += 50) {
      if (stopForQuota) break;
      const batchRows = supportRows.slice(index, index + 50);
      const liveItems = await readVideos({ accessToken, ids: batchRows.map((row) => row.youtubeVideoId) });
      const liveById = new Map(liveItems.map((item) => [item.id, item]));

      for (const row of batchRows) {
        const result = {
          ...row,
          channelKey: row.channelKey || channel.key,
          liveStatus: "",
          exactLegacyPresent: false,
          expectedPresent: false,
          legacyCodeUrls: [],
          blockers: [],
          warnings: [],
          updated: false,
          readbackStatus: "",
          error: "",
        };
        try {
          const video = liveById.get(row.youtubeVideoId);
          if (!video) {
            result.error = "videos.list returned no item for video id";
            recordResult(reportPath, report, result);
            continue;
          }
          if (video.snippet?.channelId !== channel.channelId) {
            result.error = `live video channel mismatch: expected ${channel.channelId}, got ${video.snippet?.channelId || "(missing)"}`;
            recordResult(reportPath, report, result);
            continue;
          }

          const description = String(video.snippet?.description || "");
          const findings = analyzeDescription({
            description,
            expectedUrl: row.expectedUrl,
            legacyUrl: row.legacyUrl,
            legacyCode: row.legacyStudyCode,
          });
          result.liveStatus = findings.status;
          result.exactLegacyPresent = findings.exactLegacyPresent;
          result.expectedPresent = findings.expectedPresent;
          result.legacyCodeUrls = findings.legacyCodeUrls;
          result.blockers = findings.blockers;
          result.warnings = findings.warnings;

          if (!options.apply || findings.status !== "needs_update") {
            recordResult(reportPath, report, result);
            continue;
          }
          if (updates >= options.maxUpdates) {
            result.error = `max updates reached: ${options.maxUpdates}`;
            recordResult(reportPath, report, result);
            continue;
          }

          const nextDescription = description.replaceAll(row.legacyUrl, row.expectedUrl);
          await updateVideoDescription({ accessToken, video, description: nextDescription });
          updates += 1;
          result.updated = true;

          const repairedAt = new Date().toISOString();
          const registryRow = (publicationRegistry.publications || []).find((item) => item.youtubeVideoId === row.youtubeVideoId);
          if (registryRow) {
            registryRow.courseUrlRepair = {
              repairedAt,
              reason: "norwegian_nb_public_study_url_alias",
              previousUrl: row.legacyUrl,
              replacementUrl: row.expectedUrl,
              source: "scripts/youtube-repair-course-url.mjs",
            };
            registryRow.lastMetadataRepairAt = repairedAt;
            registryRow.lastReadbackAt = repairedAt;
          }
          savePublicationRegistry(publicationRegistry, options.publicationRegistry);

          if (!options.skipReadback) {
            const readback = singleYouTubeItem(await youtubeJson({
              accessToken,
              method: "GET",
              pathName: "videos",
              query: {
                part: "snippet,status",
                id: row.youtubeVideoId,
                fields: "items(id,snippet(channelId,description),status(privacyStatus,publishAt))",
              },
            }), "updated video");
            const readbackFindings = analyzeDescription({
              description: readback.snippet?.description || "",
              expectedUrl: row.expectedUrl,
              legacyUrl: row.legacyUrl,
              legacyCode: row.legacyStudyCode,
            });
            result.readbackStatus = readbackFindings.status === "already_ok" ? "pass" : "fail";
            result.readbackLiveStatus = readbackFindings.status;
            if (registryRow?.courseUrlRepair) {
              registryRow.courseUrlRepair.readbackStatus = result.readbackStatus;
              registryRow.courseUrlRepair.readbackAt = new Date().toISOString();
              savePublicationRegistry(publicationRegistry, options.publicationRegistry);
            }
          }
        } catch (error) {
          result.error = cleanText(error.message || String(error));
          if (isQuotaError(error)) {
            result.quotaStopped = true;
            stopForQuota = true;
          }
        }
        recordResult(reportPath, report, result);
        if (stopForQuota) break;
      }
    }
  }

  report.completedAt = new Date().toISOString();
  report.summary = summarize(report.results);
  saveReport(reportPath, report);
  console.log(JSON.stringify({
    status: report.summary.errors || report.summary.needsUpdate || report.summary.needsManualReview || report.summary.missingCourseUrl
      ? "completed_with_findings"
      : "ok",
    reportPath,
    summary: report.summary,
  }, null, 2));

  if (options.apply && report.summary.errors) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
