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
  isActivePublication,
  loadPublicationRegistry,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_OUTPUT_DIR = "outputs/youtube-metadata-language-repair";

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    route: "",
    videoIds: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    routingConfig: "config/youtube-api-project-routing.json",
    outputDir: "",
    localRoot: "",
    oauthRoot: "",
    geminiBackend: "vectorengine",
    model: "",
    maxUpdates: Infinity,
    apply: false,
    generateReplacements: false,
    confirmYoutubeWrite: false,
    confirmAiSpend: false,
    skipReadback: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--generate-replacements") options.generateReplacements = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--confirm-ai-spend") options.confirmAiSpend = true;
    else if (arg === "--skip-readback") options.skipReadback = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--set=")) options.setId = arg.slice("--set=".length);
    else if (arg.startsWith("--supports=") || arg.startsWith("--support=")) {
      const value = arg.includes("--supports=") ? arg.slice("--supports=".length) : arg.slice("--support=".length);
      options.supports = splitCodes(value);
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
    "  node scripts/youtube-repair-metadata-language.mjs [--set=<set_id>] [--supports=MS,NE] [--route=youtube-4]",
    "",
    "Dry-run is default: reads live YouTube snippets for uploaded videos in the publication registry and reports",
    "non-English support-channel metadata that still looks like the old English fallback template.",
    "",
    "Live repair requires:",
    "  --apply --confirm-youtube-write --confirm-ai-spend",
    "",
    "Options:",
    "  --generate-replacements    Generate replacement youtube_metadata.json files without updating YouTube.",
    "  --max-updates=<n>           Bound live videos.update calls.",
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

function isEnglishSupport(code) {
  return ["EN", "EN-GB"].includes(normalizeLanguageCode(code));
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

const ENGLISH_TEMPLATE_PATTERNS = [
  { id: "a1-vocabulary-title", pattern: /\b[A-Z][A-Za-z -]+ A1 (?:[A-Za-z -]+\s+)?Vocabulary\b/u },
  { id: "english-vocabulary-with-pronunciation", pattern: /\b[A-Z][A-Za-z -]+ (?:A1\s+)?[A-Za-z -]*Vocabulary\s+with\s+Pronunciation\b/u },
  { id: "generic-a1-vocabulary", pattern: /\bA1\s+[A-Za-z -]*Vocabulary\b/u },
  { id: "words-with-pronunciation", pattern: /\b\d{1,3}\s+(?:[A-Z][A-Za-z -]+\s+)?(?:Kitchenware\s+)?Words?\s+with\s+Pronunciation\b/iu },
  { id: "kitchen-words-title", pattern: /\bKitchen(?:ware)? Words?\s+with\s+Pronunciation\b/iu },
  { id: "learn-essential-words", pattern: /\bLearn\s+\d{1,3}\s+essential\s+[A-Z][A-Za-z -]+\s+vocabulary\s+words\b/iu },
  { id: "short-video-lesson", pattern: /\bThis\s+short\s+video\s+lesson\s+helps\s+you\b/iu },
  { id: "listen-repeat-test", pattern: /\bListen\s+to\s+each\s+[A-Z][A-Za-z -]+\s+word,\s+repeat\s+during\s+the\s+pauses\b/iu },
  { id: "test-memory-ending", pattern: /\btest\s+your\s+memory\s+with\s+a\s+quick\s+mini-test\b/iu },
  { id: "daily-practice", pattern: /\bFor\s+daily\s+practice,\s+you\s+can\s+review\s+these\s+words\b/iu },
  { id: "subscribe-english-template", pattern: /\bSubscribe\s+to\s+FlashcardsLuna\s+for\s+more\s+short\s+vocabulary\s+lessons\b/iu },
  { id: "beginner-learn-english-template", pattern: /\b(?:learn|study|practice)\s+[A-Z][A-Za-z -]+\s+(?:for\s+beginners|vocabulary|pronunciation)\b/iu },
];

const ENGLISH_TAG_PATTERNS = [
  /\blearn\s+[a-z]/iu,
  /\b[a-z]+\s+vocabulary\b/iu,
  /\b[a-z]+\s+pronunciation\b/iu,
  /\b[a-z]+\s+for beginners\b/iu,
  /\bkitchen(?:ware)?\s+words\b/iu,
  /\bbasic\s+[a-z]+\s+words\b/iu,
  /\bword list\b/iu,
];

function findEnglishTemplateMatches(value) {
  const text = cleanText(value);
  return ENGLISH_TEMPLATE_PATTERNS
    .filter((item) => item.pattern.test(text))
    .map((item) => item.id);
}

function countEnglishTags(tags) {
  return tags.filter((tag) => ENGLISH_TAG_PATTERNS.some((pattern) => pattern.test(cleanText(tag)))).length;
}

function languageFindings(record) {
  const supportLang = normalizeLanguageCode(record.supportLang);
  if (!supportLang || isEnglishSupport(supportLang)) {
    return { status: "pass", blockers: [], warnings: [], evidence: {} };
  }

  const blockers = [];
  const warnings = [];
  const evidence = {};
  const titleMatches = findEnglishTemplateMatches(record.title);
  const descriptionMatches = findEnglishTemplateMatches(record.description);
  const englishTagCount = countEnglishTags(asArray(record.tags));
  const hashtagMatches = findEnglishTemplateMatches(asArray(record.hashtags).join(" "));

  if (titleMatches.length) {
    blockers.push(`non-English support ${supportLang} has English-template title markers: ${titleMatches.join(",")}`);
    evidence.titleMatches = titleMatches;
  }
  if (descriptionMatches.length) {
    blockers.push(`non-English support ${supportLang} has English-template description markers: ${descriptionMatches.join(",")}`);
    evidence.descriptionMatches = descriptionMatches;
  }
  if (englishTagCount >= 4) {
    blockers.push(`non-English support ${supportLang} has ${englishTagCount} English-template tags`);
    evidence.englishTagCount = englishTagCount;
  } else if (englishTagCount > 0) {
    warnings.push(`non-English support ${supportLang} has ${englishTagCount} English-looking tags`);
    evidence.englishTagCount = englishTagCount;
  }
  if (hashtagMatches.length) {
    warnings.push(`non-English support ${supportLang} has English-looking hashtag text: ${hashtagMatches.join(",")}`);
    evidence.hashtagMatches = hashtagMatches;
  }

  return { status: blockers.length ? "fail" : "pass", blockers, warnings, evidence };
}

function normalizeUploadHashtag(value) {
  const text = String(value || "").trim().replace(/\s+/gu, "");
  if (!text) return "";
  return text.startsWith("#") ? text : `#${text}`;
}

function buildUploadDescription(metadata) {
  const description = String(metadata.description || "").trim();
  const hashtags = Array.isArray(metadata.hashtags)
    ? metadata.hashtags.map(normalizeUploadHashtag).filter(Boolean).slice(0, 3)
    : [];
  const missing = hashtags.filter((tag) => !description.toLocaleLowerCase().includes(tag.toLocaleLowerCase()));
  if (!missing.length) return description;
  return `${description}\n\n${missing.join(" ")}`.trim();
}

function utf8ByteLength(value) {
  return Buffer.byteLength(String(value || ""), "utf8");
}

function truncateUtf8AtWord(value, maxChars, maxBytes) {
  const text = cleanText(value);
  let result = "";
  for (const char of text) {
    const next = `${result}${char}`;
    if (next.length > maxChars || utf8ByteLength(next) > maxBytes - 3) break;
    result = next;
  }
  if (result === text) return result;
  const lastSpace = result.lastIndexOf(" ");
  const trimmed = (lastSpace > 20 ? result.slice(0, lastSpace) : result).trim();
  return `${trimmed || result.trim()}…`;
}

function capUploadTags(tags, maxBytes = 360) {
  const result = [];
  let total = 0;
  for (const tag of asArray(tags)) {
    const clean = truncateUtf8AtWord(String(tag || "").replace(/^#/u, ""), 45, 80);
    if (!clean) continue;
    const nextTotal = total + utf8ByteLength(clean) + (result.length ? 1 : 0);
    if (nextTotal > maxBytes) continue;
    result.push(clean);
    total = nextTotal;
  }
  return result;
}

function isInvalidMetadataError(error) {
  return /request metadata is invalid/iu.test(cleanText(error?.message || String(error || "")));
}

function buildSnippetPayload({ video, metadata, includeTags = true, includeLanguageFields = true }) {
  const description = buildUploadDescription(metadata).slice(0, 4800);
  return {
    id: video.id,
    snippet: {
      title: truncateUtf8AtWord(metadata.title || video.snippet?.title || "FlashcardsLuna", 100, 100),
      description,
      ...(includeTags ? { tags: capUploadTags(metadata.tags) } : { tags: [] }),
      categoryId: String(metadata.categoryId || video.snippet?.categoryId || "27"),
      ...(includeLanguageFields && video.snippet?.defaultLanguage ? { defaultLanguage: video.snippet.defaultLanguage } : {}),
      ...(includeLanguageFields && video.snippet?.defaultAudioLanguage ? { defaultAudioLanguage: video.snippet.defaultAudioLanguage } : {}),
    },
  };
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
      console.error(`[METADATA_REPAIR_AUDIT] oauthRefresh route=${route || "unknown"} token=${path.basename(tokenFile)} client=${path.basename(clientFile)}`);
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

async function updateVideoSnippet({ accessToken, video, metadata }) {
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
      body: buildSnippetPayload({ video, metadata, includeTags: true, includeLanguageFields: true }),
    });
  } catch (error) {
    if (!isInvalidMetadataError(error)) throw error;
    try {
      return await youtubeJson({
        ...base,
        body: buildSnippetPayload({ video, metadata, includeTags: true, includeLanguageFields: false }),
      });
    } catch (retryError) {
      if (!isInvalidMetadataError(retryError)) throw retryError;
      return youtubeJson({
        ...base,
        body: buildSnippetPayload({ video, metadata, includeTags: false, includeLanguageFields: false }),
      });
    }
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

function summarize(results) {
  const summary = {
    checked: results.length,
    liveLanguageFailures: 0,
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
      failures: 0,
      updated: 0,
      errors: 0,
    };
    summary.bySupport[supportLang].checked += 1;

    if (result.liveLanguageStatus === "fail") {
      summary.liveLanguageFailures += 1;
      summary.bySupport[supportLang].failures += 1;
    }
    if (result.replacementPath) summary.replacementGenerated += 1;
    if (result.updated) summary.updated += 1;
    if (result.readbackLanguageStatus === "pass") summary.readbackPassed += 1;
    if (result.error) {
      summary.errors += 1;
      summary.bySupport[supportLang].errors += 1;
    }
    if (result.updated) summary.bySupport[supportLang].updated += 1;
    if (result.quotaStopped) summary.quotaStopped = true;
  }
  summary.bySupport = Object.fromEntries(Object.entries(summary.bySupport).sort(([a], [b]) => a.localeCompare(b)));
  return summary;
}

function isQuotaError(error) {
  const text = JSON.stringify(error?.youtubeError || {}) + " " + String(error?.message || "");
  return /quotaExceeded|youtube\.quota/iu.test(text);
}

function saveReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function recordResult(reportPath, report, result) {
  report.results.push(result);
  report.summary = summarize(report.results);
  saveReport(reportPath, report);
}

function repairDirFor(outputDir, row) {
  return path.join(
    outputDir,
    `${normalizeLanguageCode(row.supportLang).toLowerCase()}_${normalizeLanguageCode(row.targetLang).toLowerCase()}_${row.youtubeVideoId}`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.apply && (!options.confirmYoutubeWrite || !options.confirmAiSpend)) {
    fail("Live repair requires --apply --confirm-youtube-write --confirm-ai-spend.");
  }
  if ((options.apply || options.generateReplacements) && !options.confirmAiSpend) {
    fail("Metadata replacement generation uses AI quota; pass --confirm-ai-spend.");
  }

  loadLocalEnv(options.localRoot);

  const outputDir = path.resolve(options.outputDir || path.join(DEFAULT_OUTPUT_DIR, new Date().toISOString().replace(/[:.]/gu, "-")));
  const reportPath = path.join(outputDir, "youtube-metadata-language-repair-report.json");
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const routeBySupport = loadRoutingMap(options.routingConfig);
  const supportsFilter = new Set(options.supports);
  const videoFilter = new Set(options.videoIds);
  const oauthRoot = options.oauthRoot || options.localRoot || "";
  const defaultClientFile = resolveExternalPath(channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json", {
    root: oauthRoot,
    label: "OAuth client",
  });
  const clientFiles = discoverOAuthClientFiles(oauthRoot, defaultClientFile);
  if (!clientFiles.length) fail(`No OAuth client files found under ${oauthRoot || process.cwd()}.`);
  const rows = (publicationRegistry.publications || [])
    .filter(isActivePublication)
    .filter((row) => row.youtubeVideoId)
    .filter((row) => !options.setId || row.setId === options.setId)
    .filter((row) => !supportsFilter.size || supportsFilter.has(normalizeLanguageCode(row.supportLang)))
    .filter((row) => !videoFilter.size || videoFilter.has(row.youtubeVideoId))
    .filter((row) => routeMatches(routeBySupport, row.supportLang, options.route))
    .sort((a, b) => `${normalizeLanguageCode(a.supportLang)} ${normalizeLanguageCode(a.targetLang)} ${a.youtubeVideoId}`
      .localeCompare(`${normalizeLanguageCode(b.supportLang)} ${normalizeLanguageCode(b.targetLang)} ${b.youtubeVideoId}`));

  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply" : (options.generateReplacements ? "generate_replacements" : "audit"),
    setId: options.setId || "",
    supports: [...supportsFilter],
    route: options.route,
    outputDir,
    registryPath: options.publicationRegistry,
    checkedCandidateCount: rows.length,
    results: [],
    summary: {},
  };
  saveReport(reportPath, report);

  const { generateYouTubeMetadata } = await import("./lib/youtube-metadata.mjs");
  let updates = 0;
  let stopForQuota = false;

  for (const supportLang of [...new Set(rows.map((row) => normalizeLanguageCode(row.supportLang)))]) {
    if (stopForQuota) break;
    const channel = findChannelForSupport(channelRegistry.channels, supportLang);
    if (!channel) fail(`No channel configured for supportLang=${supportLang}`);
    const tokenFile = resolveExternalPath(tokenFileFor(channelRegistry, channel), {
      root: oauthRoot,
      label: `OAuth token for ${supportLang}`,
    });
    const route = routeBySupport.get(supportLang) || "";
    const supportRows = rows.filter((row) => normalizeLanguageCode(row.supportLang) === supportLang);
    console.error(`[METADATA_REPAIR_AUDIT] support=${supportLang} route=${route || "unknown"} rows=${supportRows.length}`);
    let accessToken = "";
    try {
      console.error(`[METADATA_REPAIR_AUDIT] support=${supportLang} oauthToken=refresh/read`);
      accessToken = await getAccessToken({ clientFiles, tokenFile, route });
      console.error(`[METADATA_REPAIR_AUDIT] support=${supportLang} channel=readback`);
      await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
      console.error(`[METADATA_REPAIR_AUDIT] support=${supportLang} channel=ok`);
    } catch (error) {
      const message = cleanText(error.message || String(error));
      for (const row of supportRows) {
        recordResult(reportPath, report, {
          setId: row.setId,
          supportLang: normalizeLanguageCode(row.supportLang),
          targetLang: normalizeLanguageCode(row.targetLang),
          youtubeVideoId: row.youtubeVideoId,
          youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
          channelKey: row.channelKey || channel.key,
          route,
          liveLanguageStatus: "",
          liveBlockers: [],
          liveWarnings: [],
          replacementPath: "",
          replacementLanguageStatus: "",
          replacementBlockers: [],
          updated: false,
          readbackLanguageStatus: "",
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
      console.error(`[METADATA_REPAIR_AUDIT] support=${supportLang} batchStart=${index} batchSize=${batchRows.length}`);
      const liveItems = await readVideos({ accessToken, ids: batchRows.map((row) => row.youtubeVideoId) });
      const liveById = new Map(liveItems.map((item) => [item.id, item]));

      for (const row of batchRows) {
        const result = {
          setId: row.setId,
          supportLang: normalizeLanguageCode(row.supportLang),
          targetLang: normalizeLanguageCode(row.targetLang),
          youtubeVideoId: row.youtubeVideoId,
          youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
          channelKey: row.channelKey || channel.key,
          route: routeBySupport.get(normalizeLanguageCode(row.supportLang)) || "",
          liveLanguageStatus: "",
          liveBlockers: [],
          liveWarnings: [],
          replacementPath: "",
          replacementLanguageStatus: "",
          replacementBlockers: [],
          updated: false,
          readbackLanguageStatus: "",
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
          const liveMetadata = {
            supportLang: row.supportLang,
            targetLang: row.targetLang,
            title: video.snippet?.title || "",
            description: video.snippet?.description || "",
            tags: video.snippet?.tags || [],
            hashtags: [],
          };
          const liveFindings = languageFindings(liveMetadata);
          result.liveLanguageStatus = liveFindings.status;
          result.liveBlockers = liveFindings.blockers;
          result.liveWarnings = liveFindings.warnings;
          result.liveEvidence = liveFindings.evidence;

          if (liveFindings.status !== "fail") {
            recordResult(reportPath, report, result);
            continue;
          }
          if (!options.apply && !options.generateReplacements) {
            recordResult(reportPath, report, result);
            continue;
          }
          if (updates >= options.maxUpdates) {
            result.error = `max updates reached: ${options.maxUpdates}`;
            recordResult(reportPath, report, result);
            stopForQuota = true;
            break;
          }

          const replacement = await generateYouTubeMetadata({
            setId: row.setId,
            supportLang: row.supportLang,
            targetLang: row.targetLang,
            withGemini: true,
            geminiBackend: options.geminiBackend,
            model: options.model || undefined,
            privacyStatus: video.status?.privacyStatus || row.privacyStatus || "private",
          });
          const replacementFindings = languageFindings(replacement);
          result.replacementLanguageStatus = replacementFindings.status;
          result.replacementBlockers = replacementFindings.blockers;
          const outDir = repairDirFor(outputDir, row);
          fs.mkdirSync(outDir, { recursive: true });
          const replacementPath = path.join(outDir, "youtube_metadata.json");
          fs.writeFileSync(replacementPath, `${JSON.stringify({
            ...replacement,
            youtubeVideoId: row.youtubeVideoId,
            youtubeVideoUrl: result.youtubeVideoUrl,
            previousTitle: video.snippet?.title || "",
            repairGeneratedAt: new Date().toISOString(),
            repairReason: "non_english_support_metadata_had_english_template_markers",
          }, null, 2)}\n`, "utf8");
          result.replacementPath = path.relative(process.cwd(), replacementPath);

          if (replacementFindings.status === "fail") {
            result.error = "replacement metadata still failed language gate";
            recordResult(reportPath, report, result);
            continue;
          }

          if (options.apply) {
            await updateVideoSnippet({ accessToken, video, metadata: replacement });
            updates += 1;
            result.updated = true;
            const registryRow = (publicationRegistry.publications || []).find((item) => item.youtubeVideoId === row.youtubeVideoId);
            if (registryRow) {
              registryRow.title = replacement.title;
              registryRow.metadataLanguageRepair = {
                repairedAt: new Date().toISOString(),
                reason: "english_fallback_template",
                previousTitle: video.snippet?.title || "",
                replacementPath: result.replacementPath,
                source: replacement.source || "",
                model: replacement.model || "",
              };
              registryRow.metadataSource = replacement.source || registryRow.metadataSource || "";
              registryRow.metadataModel = replacement.model || registryRow.metadataModel || "";
              registryRow.lastMetadataRepairAt = registryRow.metadataLanguageRepair.repairedAt;
              registryRow.lastReadbackAt = registryRow.metadataLanguageRepair.repairedAt;
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
                  fields: "items(id,snippet(channelId,title,description,tags,categoryId),status(privacyStatus,publishAt))",
                },
              }), "updated video");
              const readbackFindings = languageFindings({
                supportLang: row.supportLang,
                targetLang: row.targetLang,
                title: readback.snippet?.title || "",
                description: readback.snippet?.description || "",
                tags: readback.snippet?.tags || [],
              });
              result.readbackLanguageStatus = readbackFindings.status;
              result.readbackBlockers = readbackFindings.blockers;
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
    status: report.summary.errors || report.summary.liveLanguageFailures ? "completed_with_findings" : "ok",
    reportPath,
    summary: report.summary,
  }, null, 2));

  if (!options.apply && report.summary.liveLanguageFailures) process.exit(1);
  if (options.apply && report.summary.errors) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
