#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const DEFAULT_COURSE_LINKS_PATH = "config/video-public-course-links.json";
const DEFAULT_OUTPUT_PATH = "outputs/youtube-live-publications.json";
const DEFAULT_PUBLICATION_REGISTRY_PATH = "config/youtube-published-videos.json";
const DEFAULT_MAX_UPLOAD_PLAYLIST_PAGES = 10;

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    courseLinks: DEFAULT_COURSE_LINKS_PATH,
    output: DEFAULT_OUTPUT_PATH,
    maxPages: DEFAULT_MAX_UPLOAD_PLAYLIST_PAGES,
    allowSupportErrors: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--set" || arg.startsWith("--set=")) options.setId = readValue();
    else if (arg === "--support" || arg.startsWith("--support=")) {
      options.supports = readValue().split(",").map(normalizeCode).filter(Boolean);
    } else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) {
      options.channelConfig = readValue();
    } else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) {
      options.publicationRegistry = readValue();
    } else if (arg === "--course-links" || arg.startsWith("--course-links=")) {
      options.courseLinks = readValue();
    } else if (arg === "--output" || arg.startsWith("--output=")) {
      options.output = readValue();
    } else if (arg === "--max-pages" || arg.startsWith("--max-pages=")) {
      options.maxPages = Number(readValue());
    } else if (arg === "--allow-support-errors") {
      options.allowSupportErrors = true;
    } else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/audit-youtube-live-publications.mjs --set <set_id> --support DA[,EN] --output <file>",
    "",
    "Reads the authenticated YouTube upload playlist for each support channel and emits a temporary",
    "publication-registry-compatible blocklist. This prevents duplicate uploads when a previous",
    "YouTube upload exists live but was not persisted into config/youtube-published-videos.json.",
    `Default scan depth is ${DEFAULT_MAX_UPLOAD_PLAYLIST_PAGES} upload-playlist pages (up to ${DEFAULT_MAX_UPLOAD_PLAYLIST_PAGES * 50} recent videos per channel); override with --max-pages when needed.`,
    "",
    "This command performs YouTube Data API read calls only. It does not upload, update, hide or delete videos.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label} at ${filePath}: ${error.message}`);
  }
}

function loadYoutubeChannels(filePath = DEFAULT_CHANNEL_CONFIG_PATH) {
  const parsed = readJson(filePath, "YouTube channel config");
  if (!Array.isArray(parsed.channels)) parsed.channels = [];
  return parsed;
}

function loadPublicationRegistry(filePath = DEFAULT_PUBLICATION_REGISTRY_PATH) {
  if (!fs.existsSync(filePath)) return { schemaVersion: 1, publications: [] };
  const parsed = readJson(filePath, "YouTube publication registry");
  if (!Array.isArray(parsed.publications)) parsed.publications = [];
  return parsed;
}

function findChannelForSupport(channels, supportLang) {
  const normalized = normalizeCode(supportLang);
  return (channels || []).find((channel) => (channel.supportLangs || []).map(normalizeCode).includes(normalized)) || null;
}

function publicationMatches(row, { setId, supportLang, targetLang }) {
  return String(row?.setId || "") === String(setId || "")
    && normalizeCode(row?.supportLang) === normalizeCode(supportLang)
    && normalizeCode(row?.targetLang) === normalizeCode(targetLang);
}

function isActivePublication(row) {
  if (!row?.youtubeVideoId) return false;
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  if (status.includes("failed")) return false;
  if (status.includes("deleted")) return false;
  if (status.includes("superseded")) return false;
  return true;
}

function findActivePublication(registry, query) {
  return (registry.publications || [])
    .filter((row) => publicationMatches(row, query))
    .filter(isActivePublication)
    .sort((a, b) => String(b.lastReadbackAt || b.uploadedAt || "").localeCompare(String(a.lastReadbackAt || a.uploadedAt || "")))[0] || null;
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

function tokenFileFor(channelRegistry, channel) {
  const defaults = channelRegistry.defaults || {};
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  return path.join(defaults.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

async function getAccessToken({ clientFile, tokenFile }) {
  const client = loadOAuthClient(clientFile);
  const token = readJson(tokenFile, "OAuth token");
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
  fs.writeFileSync(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, "utf8");
  return nextToken.access_token;
}

async function youtubeJson({ accessToken, pathName, query = {} }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  if (!response.ok) fail(`YouTube API GET ${url.pathname} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

async function readAuthorizedChannel({ accessToken, expectedChannelId }) {
  const readback = await youtubeJson({
    accessToken,
    pathName: "channels",
    query: {
      part: "snippet,contentDetails",
      mine: "true",
      fields: "items(id,snippet(title,customUrl),contentDetails(relatedPlaylists(uploads)))",
    },
  });
  const item = readback?.items?.[0];
  if (!item) fail("YouTube authorized channel readback returned no items.");
  if (item.id !== expectedChannelId) {
    fail(`OAuth token channel mismatch: expected ${expectedChannelId}, got ${item.id}.`);
  }
  return item;
}

async function readUploadPlaylistItems({ accessToken, uploadsPlaylistId, maxPages }) {
  const items = [];
  let pageToken = "";
  for (let page = 0; page < maxPages; page += 1) {
    const response = await youtubeJson({
      accessToken,
      pathName: "playlistItems",
      query: {
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,items(snippet(publishedAt,title,description,resourceId(videoId)),contentDetails(videoId,videoPublishedAt))",
      },
    });
    items.push(...(response.items || []));
    pageToken = response.nextPageToken || "";
    if (!pageToken) break;
  }
  return items;
}

function courseSlugForSet(courseLinks, setId) {
  return String(courseLinks.publishedCourseSlugBySetId?.[setId] || "").trim();
}

function normalizeUrlCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/[)\].,;:!?]+$/g, "");
}

function extractFlashcardsLunaUrls(text) {
  const urls = [];
  const regex = /https?:\/\/(?:www\.)?flashcardsluna\.com\/[^\s<>"']+/gi;
  let match;
  while ((match = regex.exec(String(text || "")))) {
    urls.push(normalizeUrlCandidate(match[0]));
  }
  return urls;
}

function inferPublicationFromDescription({ setId, supportLang, courseSlug, item }) {
  const title = item.snippet?.title || "";
  const description = item.snippet?.description || "";
  const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "";
  for (const urlText of extractFlashcardsLunaUrls(description)) {
    let parsed;
    try {
      parsed = new URL(urlText);
    } catch {
      continue;
    }
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const urlCourseSlug = pathParts[pathParts.indexOf("courses") + 1] || "";
    const targetLang = parsed.searchParams.get("langs") || parsed.searchParams.get("lang") || "";
    if (urlCourseSlug !== courseSlug || !targetLang) continue;
    return {
      setId,
      supportLang,
      targetLang: normalizeCode(targetLang),
      title,
      youtubeVideoId: videoId,
      youtubeVideoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
      publicationStatus: "live_youtube_upload_detected",
      uploadedAt: item.snippet?.publishedAt || item.contentDetails?.videoPublishedAt || "",
      lastReadbackAt: new Date().toISOString(),
      readbackSource: "youtube_uploads_playlist",
      liveReadbackOnly: true,
    };
  }
  return null;
}

function duplicateGroups(publications) {
  const byPair = new Map();
  for (const row of publications) {
    const key = [row.setId, normalizeCode(row.supportLang), normalizeCode(row.targetLang)].join("|");
    const rows = byPair.get(key) || [];
    rows.push(row);
    byPair.set(key, rows);
  }
  return [...byPair.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      setId: rows[0].setId,
      supportLang: normalizeCode(rows[0].supportLang),
      targetLang: normalizeCode(rows[0].targetLang),
      videoIds: rows.map((row) => row.youtubeVideoId).filter(Boolean),
      titles: rows.map((row) => row.title).filter(Boolean),
    }));
}

async function auditSupport({ options, channelRegistry, publicationRegistry, courseSlug, supportLang }) {
  const channel = findChannelForSupport(channelRegistry.channels, supportLang);
  if (!channel) fail(`No YouTube channel configured for support=${supportLang}`);
  if (!channel.channelId) fail(`Configured channel for support=${supportLang} has no channelId`);

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  const accessToken = await getAccessToken({ clientFile, tokenFile });
  const authorizedChannel = await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
  const uploadsPlaylistId = authorizedChannel.contentDetails?.relatedPlaylists?.uploads || "";
  if (!uploadsPlaylistId) fail(`YouTube channel ${channel.channelId} did not expose an uploads playlist.`);

  const items = await readUploadPlaylistItems({
    accessToken,
    uploadsPlaylistId,
    maxPages: options.maxPages,
  });
  const matchedPublications = [];
  const unmatchedVideos = [];
  for (const item of items) {
    const inferred = inferPublicationFromDescription({
      setId: options.setId,
      supportLang,
      courseSlug,
      item,
    });
    if (inferred) {
      const existing = findActivePublication(publicationRegistry, inferred);
      matchedPublications.push({
        ...inferred,
        inLocalPublicationRegistry: Boolean(existing),
        localRegistryVideoId: existing?.youtubeVideoId || "",
      });
    } else {
      unmatchedVideos.push({
        youtubeVideoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "",
        title: item.snippet?.title || "",
        uploadedAt: item.snippet?.publishedAt || item.contentDetails?.videoPublishedAt || "",
      });
    }
  }

  return {
    supportLang,
    channelKey: channel.key,
    youtubeChannelId: channel.channelId,
    uploadsPlaylistId,
    scannedUploadItems: items.length,
    matchedPublications,
    unmatchedVideos,
    missingFromLocalRegistry: matchedPublications.filter((row) => !row.inLocalPublicationRegistry),
    duplicateGroups: duplicateGroups(matchedPublications),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.setId || !options.supports.length) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  if (!Number.isFinite(options.maxPages) || options.maxPages < 1) fail("--max-pages must be a positive number");

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const courseLinks = readJson(options.courseLinks, "video public course links");
  const courseSlug = courseSlugForSet(courseLinks, options.setId);
  if (!courseSlug) fail(`No published course slug configured for set=${options.setId}`);

  const supports = [...new Set(options.supports.map(normalizeCode).filter(Boolean))];
  const supportReports = [];
  const supportErrors = [];
  for (const supportLang of supports) {
    try {
      supportReports.push(await auditSupport({
        options,
        channelRegistry,
        publicationRegistry,
        courseSlug,
        supportLang,
      }));
    } catch (error) {
      supportErrors.push({
        supportLang,
        errorMessage: error?.message || String(error),
        quotaExceeded: /quotaExceeded|youtube\.quota|exceeded your .*quota/iu.test(error?.message || String(error)),
      });
    }
  }

  const publications = supportReports.flatMap((report) => report.matchedPublications);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_live_publication_audit",
    sourceOfTruth: "YouTube Data API uploads playlist readback; read-only blocklist for generation preflight",
    setId: options.setId,
    courseSlug,
    supports,
    scannedUploadItems: supportReports.reduce((sum, item) => sum + item.scannedUploadItems, 0),
    matchedPublicationCount: publications.length,
    missingFromLocalRegistryCount: supportReports.reduce((sum, item) => sum + item.missingFromLocalRegistry.length, 0),
    duplicateGroups: duplicateGroups(publications),
    supportErrorCount: supportErrors.length,
    supportErrors,
    supportReports,
    publications,
  };

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (options.json) {
    console.log(JSON.stringify({
      setId: report.setId,
      supports: report.supports,
      scannedUploadItems: report.scannedUploadItems,
      matchedPublicationCount: report.matchedPublicationCount,
      missingFromLocalRegistryCount: report.missingFromLocalRegistryCount,
      duplicateGroupCount: report.duplicateGroups.length,
      supportErrorCount: report.supportErrorCount,
      supportErrors: report.supportErrors,
      output: options.output,
    }, null, 2));
  } else {
    console.log(`YouTube live publication audit wrote ${options.output}`);
    console.log(`matchedPublicationCount=${report.matchedPublicationCount}`);
    console.log(`missingFromLocalRegistryCount=${report.missingFromLocalRegistryCount}`);
    console.log(`duplicateGroupCount=${report.duplicateGroups.length}`);
    console.log(`supportErrorCount=${report.supportErrorCount}`);
  }

  if (supportErrors.length > 0 && !options.allowSupportErrors) {
    console.error(`YouTube live publication audit had ${supportErrors.length} support error(s); report still written to ${options.output}`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
