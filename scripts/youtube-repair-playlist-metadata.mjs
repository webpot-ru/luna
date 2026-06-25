#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  findChannelForSupport,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  normalizeLanguageCode,
  savePlaylistRegistry,
} from "./lib/youtube-playlists.mjs";

const DEFAULT_OUTPUT_DIR = "outputs/youtube-playlist-metadata-repair";
const PLAYLIST_LIST_FIELDS = "items(id,snippet(channelId,title,description),status(privacyStatus))";
const PLAYLIST_RESOURCE_FIELDS = "id,snippet(channelId,title,description),status(privacyStatus)";

function parseArgs(argv) {
  const options = {
    setId: "",
    route: "",
    supports: [],
    excludeSupports: ["HY"],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    routingConfig: "config/youtube-api-project-routing.json",
    outputDir: "",
    localRoot: "",
    oauthRoot: "",
    geminiBackend: "vectorengine",
    model: "",
    maxUpdates: 20,
    generateReplacements: false,
    apply: false,
    confirmAiSpend: false,
    confirmYoutubeWrite: false,
  };

  for (const arg of argv) {
    if (arg === "--generate-replacements") options.generateReplacements = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-ai-spend") options.confirmAiSpend = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--set=") || arg.startsWith("--set-id=")) {
      options.setId = arg.includes("--set-id=") ? arg.slice("--set-id=".length) : arg.slice("--set=".length);
    } else if (arg.startsWith("--route=")) options.route = arg.slice("--route=".length);
    else if (arg.startsWith("--supports=") || arg.startsWith("--support=")) {
      const value = arg.includes("--supports=") ? arg.slice("--supports=".length) : arg.slice("--support=".length);
      options.supports = splitCodes(value);
    } else if (arg.startsWith("--exclude-supports=") || arg.startsWith("--exclude-support=")) {
      const value = arg.includes("--exclude-supports=")
        ? arg.slice("--exclude-supports=".length)
        : arg.slice("--exclude-support=".length);
      options.excludeSupports = splitCodes(value);
    } else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--playlist-registry=")) options.playlistRegistry = arg.slice("--playlist-registry=".length);
    else if (arg.startsWith("--routing-config=")) options.routingConfig = arg.slice("--routing-config=".length);
    else if (arg.startsWith("--output-dir=")) options.outputDir = arg.slice("--output-dir=".length);
    else if (arg.startsWith("--local-root=")) options.localRoot = arg.slice("--local-root=".length);
    else if (arg.startsWith("--oauth-root=")) options.oauthRoot = arg.slice("--oauth-root=".length);
    else if (arg.startsWith("--gemini-backend=")) options.geminiBackend = arg.slice("--gemini-backend=".length);
    else if (arg.startsWith("--model=")) options.model = arg.slice("--model=".length);
    else if (arg.startsWith("--max-updates=")) options.maxUpdates = Number(arg.slice("--max-updates=".length));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-repair-playlist-metadata.mjs --route=youtube-4",
    "",
    "Audit is default and does not use AI or YouTube writes.",
    "",
    "Generate replacement playlist text:",
    "  --set=<set_id> --generate-replacements --confirm-ai-spend",
    "",
    "Apply live playlist updates:",
    "  --set=<set_id> --generate-replacements --confirm-ai-spend --apply --confirm-youtube-write",
    "",
    "Defaults:",
    "  --exclude-supports=HY",
    "  --max-updates=20",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function isEnglishSupport(code) {
  return ["EN", "EN-GB"].includes(normalizeLanguageCode(code));
}

const ENGLISH_FALLBACK_PATTERNS = [
  { id: "a1-flashcards-title", pattern: /\b[A-Z][A-Za-z -]+ A1(?::\s*)?(?:Everyday\s+)?Flashcards\b/u },
  { id: "videos-for-native-speakers", pattern: /\bvideos\s+for\s+native\s+[A-Z0-9 -]+\s+speakers\s+learning\b/iu },
  { id: "flashcards-pronunciation-repeat-pauses", pattern: /\bflashcards,\s+pronunciation,\s+repeat\s+pauses\b/iu },
  { id: "playlist-key-marker", pattern: /\bPlaylist\s+key:/iu },
];

function findEnglishFallbackMarkers(value) {
  const text = cleanText(value);
  return ENGLISH_FALLBACK_PATTERNS
    .filter((item) => item.pattern.test(text))
    .map((item) => item.id);
}

function playlistFindings(entry) {
  const supportLang = normalizeLanguageCode(entry.supportLang);
  if (!supportLang || isEnglishSupport(supportLang)) {
    return { status: "pass", blockers: [], evidence: {} };
  }
  const titleMarkers = findEnglishFallbackMarkers(entry.title);
  const descriptionMarkers = findEnglishFallbackMarkers(entry.description);
  const blockers = [];
  const evidence = {};
  if (!cleanText(entry.title)) blockers.push("missing playlist title");
  if (!cleanText(entry.description)) blockers.push("missing playlist description");
  if (titleMarkers.length) {
    blockers.push(`English fallback title markers: ${titleMarkers.join(",")}`);
    evidence.titleMarkers = titleMarkers;
  }
  if (descriptionMarkers.length) {
    blockers.push(`English fallback description markers: ${descriptionMarkers.join(",")}`);
    evidence.descriptionMarkers = descriptionMarkers;
  }
  return { status: blockers.length ? "fail" : "pass", blockers, evidence };
}

function replacementFindings(metadata) {
  const title = cleanText(metadata.playlistTitle);
  const description = cleanText(metadata.playlistDescription);
  const blockers = [];
  if (!title) blockers.push("replacement missing playlistTitle");
  if (!description) blockers.push("replacement missing playlistDescription");
  if (title.length > 150) blockers.push(`replacement playlistTitle too long: ${title.length}`);
  if (Buffer.byteLength(description, "utf8") > 5000) {
    blockers.push(`replacement playlistDescription too large: ${Buffer.byteLength(description, "utf8")} bytes`);
  }
  const fallbackCheck = playlistFindings({
    supportLang: metadata.supportLang,
    title,
    description,
  });
  blockers.push(...fallbackCheck.blockers);
  return { status: blockers.length ? "fail" : "pass", blockers };
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
      fetch(url, { ...options, signal: controller.signal }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`HTTP request timed out after ${timeoutMs}ms: ${url}`);
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

function loadOAuthClient(clientFile) {
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

function discoverOAuthClientFiles(oauthRoot, defaultClientFile) {
  const candidates = [];
  const add = (filePath) => {
    if (!filePath) return;
    const resolved = path.resolve(filePath);
    if (fs.existsSync(resolved) && !candidates.includes(resolved)) candidates.push(resolved);
  };
  add(defaultClientFile);
  if (oauthRoot) add(path.resolve(oauthRoot, ".local/youtube-oauth/google-oauth-client.json"));
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
  const errors = [];
  for (const clientFile of preferredClientFiles(clientFiles, route)) {
    try {
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

function firstItem(response, label) {
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
  const item = firstItem(readback, "authorized channel");
  if (item.id !== expectedChannelId) {
    fail(`OAuth token channel mismatch: expected ${expectedChannelId}, got ${item.id}.`);
  }
  return item;
}

async function readPlaylist({ accessToken, playlistId }) {
  return firstItem(await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "playlists",
    query: {
      part: "snippet,status",
      id: playlistId,
      fields: PLAYLIST_LIST_FIELDS,
    },
  }), "playlist");
}

async function updatePlaylist({ accessToken, playlist, title, description }) {
  const response = await youtubeJson({
    accessToken,
    method: "PUT",
    pathName: "playlists",
    query: {
      part: "snippet,status",
      fields: PLAYLIST_RESOURCE_FIELDS,
    },
    body: {
      id: playlist.id,
      snippet: {
        title,
        description,
      },
      status: {
        privacyStatus: playlist.status?.privacyStatus || "public",
      },
    },
  });
  if (!response?.id) fail("YouTube updated playlist response did not include a playlist id.");
  return response;
}

function playlistReadbackBlockers({ readback, supportLang, title, description }) {
  const findings = playlistFindings({
    supportLang,
    title: readback.snippet?.title || "",
    description: readback.snippet?.description || "",
  });
  const blockers = [...findings.blockers];
  if (readback.snippet?.title !== title) blockers.push("readback title did not match replacement");
  if (readback.snippet?.description !== description) blockers.push("readback description did not match replacement");
  return { findings, blockers };
}

async function readUpdatedPlaylistWithRetry({
  accessToken,
  playlistId,
  supportLang,
  title,
  description,
  attempts = 6,
  delayMs = 10_000,
}) {
  let lastReadback = null;
  let lastFindings = null;
  let lastBlockers = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const readback = await readPlaylist({ accessToken, playlistId });
    const { findings, blockers } = playlistReadbackBlockers({
      readback,
      supportLang,
      title,
      description,
    });
    lastReadback = readback;
    lastFindings = findings;
    lastBlockers = blockers;
    if (!blockers.length) {
      return { readback, findings, blockers, attemptsUsed: attempt };
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  return {
    readback: lastReadback,
    findings: lastFindings,
    blockers: lastBlockers,
    attemptsUsed: attempts,
  };
}

function loadRouting(filePath) {
  const routeBySupport = new Map();
  const routeEnvironment = new Map();
  if (!fs.existsSync(filePath)) return { routeBySupport, routeEnvironment };
  const routing = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const project of routing.projects || []) {
    routeEnvironment.set(project.key, project.githubEnvironment || "");
    for (const support of project.supportVariants || []) {
      routeBySupport.set(normalizeLanguageCode(support), project.key);
    }
  }
  return { routeBySupport, routeEnvironment };
}

function routeMatches(routeBySupport, supportLang, route) {
  if (!route) return true;
  return routeBySupport.get(normalizeLanguageCode(supportLang)) === route;
}

function isQuotaError(error) {
  const text = JSON.stringify(error?.youtubeError || {}) + " " + String(error?.message || "");
  return /quotaExceeded|youtube\.quota/iu.test(text);
}

function summarize(results, candidateCount) {
  const summary = {
    candidateCount,
    selectedForProcessing: results.length,
    failingBeforeRepair: 0,
    replacementGenerated: 0,
    updated: 0,
    readbackPassed: 0,
    errors: 0,
    quotaStopped: false,
    bySupport: {},
  };
  for (const result of results) {
    const supportLang = result.supportLang || "(unknown)";
    summary.bySupport[supportLang] = summary.bySupport[supportLang] || {
      checked: 0,
      failingBeforeRepair: 0,
      generated: 0,
      updated: 0,
      errors: 0,
    };
    summary.bySupport[supportLang].checked += 1;
    if (result.beforeStatus === "fail") {
      summary.failingBeforeRepair += 1;
      summary.bySupport[supportLang].failingBeforeRepair += 1;
    }
    if (result.replacementPath) {
      summary.replacementGenerated += 1;
      summary.bySupport[supportLang].generated += 1;
    }
    if (result.updated) {
      summary.updated += 1;
      summary.bySupport[supportLang].updated += 1;
    }
    if (result.readbackStatus === "pass") summary.readbackPassed += 1;
    if (result.error) {
      summary.errors += 1;
      summary.bySupport[supportLang].errors += 1;
    }
    if (result.quotaStopped) summary.quotaStopped = true;
  }
  summary.bySupport = Object.fromEntries(Object.entries(summary.bySupport).sort(([a], [b]) => a.localeCompare(b)));
  return summary;
}

function saveReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function repairDirFor(outputDir, entry) {
  return path.join(
    outputDir,
    `${normalizeLanguageCode(entry.supportLang).toLowerCase()}_${normalizeLanguageCode(entry.targetLang).toLowerCase()}_${entry.youtube_playlist_id}`,
  );
}

function outputRecordFor(entry, before) {
  return {
    playlistKey: entry.playlist_key || entry.key || "",
    supportLang: normalizeLanguageCode(entry.supportLang),
    targetLang: normalizeLanguageCode(entry.targetLang),
    courseFamily: entry.courseFamily || "",
    levelOrTrack: entry.levelOrTrack || "",
    channelKey: entry.channelKey || "",
    youtubeChannelId: entry.youtube_channel_id || "",
    youtubePlaylistId: entry.youtube_playlist_id || "",
    beforeTitle: entry.title || "",
    beforeDescription: entry.description || "",
    beforeStatus: before.status,
    beforeBlockers: before.blockers,
    beforeEvidence: before.evidence,
    replacementPath: "",
    replacementStatus: "",
    replacementBlockers: [],
    updated: false,
    readbackStatus: "",
    readbackAttempts: 0,
    readbackBlockers: [],
    error: "",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if ((options.generateReplacements || options.apply) && !options.setId) {
    fail("--set is required when generating replacement playlist metadata.");
  }
  if ((options.generateReplacements || options.apply) && !options.confirmAiSpend) {
    fail("Playlist metadata generation spends AI quota; pass --confirm-ai-spend.");
  }
  if (options.apply && !options.confirmYoutubeWrite) {
    fail("Live playlist update requires --confirm-youtube-write.");
  }
  if (!Number.isFinite(options.maxUpdates) || options.maxUpdates < 1) {
    fail("--max-updates must be a positive number.");
  }

  loadLocalEnv(options.localRoot);
  const outputDir = path.resolve(options.outputDir || path.join(DEFAULT_OUTPUT_DIR, new Date().toISOString().replace(/[:.]/gu, "-")));
  const reportPath = path.join(outputDir, "youtube-playlist-metadata-repair-report.json");
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const playlistRegistry = loadPlaylistRegistry(options.playlistRegistry);
  const { routeBySupport, routeEnvironment } = loadRouting(options.routingConfig);
  const supportFilter = new Set(options.supports);
  const excludeFilter = new Set(options.excludeSupports);

  const candidates = (playlistRegistry.playlists || [])
    .filter((entry) => entry.youtube_playlist_id)
    .filter((entry) => !supportFilter.size || supportFilter.has(normalizeLanguageCode(entry.supportLang)))
    .filter((entry) => !excludeFilter.has(normalizeLanguageCode(entry.supportLang)))
    .filter((entry) => routeMatches(routeBySupport, entry.supportLang, options.route))
    .map((entry) => ({ entry, before: playlistFindings(entry) }))
    .filter(({ before }) => before.status === "fail")
    .sort((a, b) => `${normalizeLanguageCode(a.entry.supportLang)} ${normalizeLanguageCode(a.entry.targetLang)} ${a.entry.youtube_playlist_id}`
      .localeCompare(`${normalizeLanguageCode(b.entry.supportLang)} ${normalizeLanguageCode(b.entry.targetLang)} ${b.entry.youtube_playlist_id}`));

  const mode = options.apply ? "apply" : (options.generateReplacements ? "generate_replacements" : "audit");
  const selected = options.generateReplacements || options.apply
    ? candidates.slice(0, options.maxUpdates)
    : candidates;
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    setId: options.setId || "",
    route: options.route || "",
    routeEnvironment: options.route ? (routeEnvironment.get(options.route) || "") : "",
    supports: [...supportFilter],
    excludeSupports: [...excludeFilter],
    maxUpdates: options.maxUpdates,
    outputDir,
    playlistRegistryPath: options.playlistRegistry,
    candidateCount: candidates.length,
    truncatedForProcessing: selected.length < candidates.length && (options.generateReplacements || options.apply),
    results: selected.map(({ entry, before }) => outputRecordFor(entry, before)),
    summary: {},
  };
  report.summary = summarize(report.results, candidates.length);
  saveReport(reportPath, report);

  if (!options.generateReplacements && !options.apply) {
    console.log(JSON.stringify({
      status: candidates.length ? "completed_with_findings" : "ok",
      reportPath,
      summary: report.summary,
    }, null, 2));
    return;
  }

  const { generateYouTubeMetadata } = await import("./lib/youtube-metadata.mjs");
  const oauthRoot = options.oauthRoot || options.localRoot || "";
  let clientFiles = [];
  if (options.apply) {
    const defaultClientFile = resolveExternalPath(channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json", {
      root: oauthRoot,
      label: "OAuth client",
    });
    clientFiles = discoverOAuthClientFiles(oauthRoot, defaultClientFile);
    if (!clientFiles.length) fail(`No OAuth client files found under ${oauthRoot || process.cwd()}.`);
  }

  const accessTokenBySupport = new Map();
  let stopForQuota = false;
  for (let index = 0; index < selected.length; index += 1) {
    if (stopForQuota) break;
    const { entry } = selected[index];
    const result = report.results[index];
    const supportLang = normalizeLanguageCode(entry.supportLang);
    const targetLang = normalizeLanguageCode(entry.targetLang);
    try {
      const metadata = await generateYouTubeMetadata({
        setId: options.setId,
        supportLang,
        targetLang,
        withGemini: true,
        geminiBackend: options.geminiBackend,
        model: options.model || undefined,
        privacyStatus: "public",
      });
      const findings = replacementFindings({
        ...metadata,
        supportLang,
        targetLang,
      });
      result.replacementStatus = findings.status;
      result.replacementBlockers = findings.blockers;
      const outDir = repairDirFor(outputDir, entry);
      fs.mkdirSync(outDir, { recursive: true });
      const replacementPath = path.join(outDir, "playlist_metadata.json");
      const replacement = {
        playlistKey: entry.playlist_key || entry.key || "",
        youtubePlaylistId: entry.youtube_playlist_id,
        supportLang,
        targetLang,
        previousTitle: entry.title || "",
        previousDescription: entry.description || "",
        playlistTitle: cleanText(metadata.playlistTitle),
        playlistDescription: cleanText(metadata.playlistDescription),
        source: metadata.source || "",
        model: metadata.model || "",
        generatedAt: new Date().toISOString(),
        repairReason: "existing_playlist_had_english_fallback_template",
      };
      fs.writeFileSync(replacementPath, `${JSON.stringify(replacement, null, 2)}\n`, "utf8");
      result.replacementPath = path.relative(process.cwd(), replacementPath);

      if (findings.status === "fail") {
        result.error = "replacement playlist metadata failed language gate";
        continue;
      }

      if (!options.apply) continue;

      const channel = findChannelForSupport(channelRegistry.channels, supportLang);
      if (!channel) fail(`No channel configured for supportLang=${supportLang}`);
      const route = routeBySupport.get(supportLang) || "";
      let accessToken = accessTokenBySupport.get(supportLang);
      if (!accessToken) {
        const tokenFile = resolveExternalPath(tokenFileFor(channelRegistry, channel), {
          root: oauthRoot,
          label: `OAuth token for ${supportLang}`,
        });
        accessToken = await getAccessToken({ clientFiles, tokenFile, route });
        await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
        accessTokenBySupport.set(supportLang, accessToken);
      }
      const livePlaylist = await readPlaylist({ accessToken, playlistId: entry.youtube_playlist_id });
      if (livePlaylist.snippet?.channelId !== channel.channelId) {
        fail(`playlist channel mismatch for ${entry.youtube_playlist_id}: expected ${channel.channelId}, got ${livePlaylist.snippet?.channelId || "(missing)"}`);
      }
      await updatePlaylist({
        accessToken,
        playlist: livePlaylist,
        title: replacement.playlistTitle,
        description: replacement.playlistDescription,
      });
      result.updated = true;

      const readbackResult = await readUpdatedPlaylistWithRetry({
        accessToken,
        playlistId: entry.youtube_playlist_id,
        supportLang,
        title: replacement.playlistTitle,
        description: replacement.playlistDescription,
      });
      result.readbackAttempts = readbackResult.attemptsUsed;
      result.readbackStatus = readbackResult.blockers.length ? "fail" : readbackResult.findings.status;
      result.readbackBlockers = readbackResult.blockers;
      if (result.readbackBlockers.length) {
        result.readbackStatus = "fail";
        result.error = "playlist readback failed after update";
      } else {
        const repairedAt = new Date().toISOString();
        entry.title = replacement.playlistTitle;
        entry.description = replacement.playlistDescription;
        entry.titleReviewStatus = "ai_generated_playlist_metadata_repair";
        entry.playlistMetadataRepair = {
          repairedAt,
          reason: "english_fallback_template",
          route,
          previousTitle: replacement.previousTitle,
          previousDescription: replacement.previousDescription,
          replacementPath: result.replacementPath,
          source: replacement.source,
          model: replacement.model,
        };
        entry.lastReadbackAt = repairedAt;
        entry.status = entry.status || "created_public";
        savePlaylistRegistry(playlistRegistry, options.playlistRegistry);
      }
    } catch (error) {
      result.error = cleanText(error.message || String(error));
      if (isQuotaError(error)) {
        result.quotaStopped = true;
        stopForQuota = true;
      }
    } finally {
      report.summary = summarize(report.results, candidates.length);
      saveReport(reportPath, report);
    }
  }

  report.completedAt = new Date().toISOString();
  report.summary = summarize(report.results, candidates.length);
  saveReport(reportPath, report);
  console.log(JSON.stringify({
    status: report.summary.errors ? "completed_with_errors" : "ok",
    reportPath,
    summary: report.summary,
  }, null, 2));
  if (report.summary.errors) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
