#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assignmentKey as semanticAssignmentKey,
  duplicateVideoGroups,
} from "./lib/youtube-publication-control.mjs";

const DEFAULT_CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const DEFAULT_COURSE_LINKS_PATH = "config/video-public-course-links.json";
const DEFAULT_OUTPUT_PATH = "outputs/youtube-live-publications.json";
const DEFAULT_PUBLICATION_REGISTRY_PATH = "config/youtube-published-videos.json";
const DEFAULT_POLYGLOT_PUBLICATION_REGISTRY_PATH = "config/youtube-polyglot-published-videos.json";
const DEFAULT_MAX_UPLOAD_PLAYLIST_PAGES = 10;
const DEFAULT_AUDIT_EXCLUSIONS_PATH = "config/youtube-live-audit-exclusions.json";

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    polyglotPublicationRegistry: DEFAULT_POLYGLOT_PUBLICATION_REGISTRY_PATH,
    courseLinks: DEFAULT_COURSE_LINKS_PATH,
    output: DEFAULT_OUTPUT_PATH,
    maxPages: DEFAULT_MAX_UPLOAD_PLAYLIST_PAGES,
    includeVideoStatus: false,
    auditExclusions: DEFAULT_AUDIT_EXCLUSIONS_PATH,
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
    } else if (arg === "--polyglot-publication-registry" || arg.startsWith("--polyglot-publication-registry=")) {
      options.polyglotPublicationRegistry = readValue();
    } else if (arg === "--course-links" || arg.startsWith("--course-links=")) {
      options.courseLinks = readValue();
    } else if (arg === "--output" || arg.startsWith("--output=")) {
      options.output = readValue();
    } else if (arg === "--max-pages" || arg.startsWith("--max-pages=")) {
      options.maxPages = Number(readValue());
    } else if (arg === "--audit-exclusions" || arg.startsWith("--audit-exclusions=")) {
      options.auditExclusions = readValue();
    } else if (arg === "--include-video-status") {
      options.includeVideoStatus = true;
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
    "Use --include-video-status to add videos.list privacyStatus/publishAt readback for matched videos.",
    "This command performs YouTube Data API read calls only. It does not upload, update, hide or delete videos.",
  ].join("\n");
}

function fail(message) {
  console.error(message);
  process.exit(1);
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

function findActivePublicationByVideoId(registry, { setId, youtubeVideoId }) {
  return (registry.publications || [])
    .filter((row) => !setId || String(row?.setId || "") === String(setId))
    .filter((row) => String(row?.youtubeVideoId || "") === String(youtubeVideoId || ""))
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
  let pagesRead = 0;
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
    pagesRead += 1;
    items.push(...(response.items || []));
    pageToken = response.nextPageToken || "";
    if (!pageToken) break;
  }
  return {
    items,
    pagesRead,
    paginationComplete: !pageToken,
    nextPageTokenPresent: Boolean(pageToken),
  };
}

async function readVideoStatuses({ accessToken, videoIds }) {
  const statuses = new Map();
  for (let index = 0; index < videoIds.length; index += 50) {
    const ids = videoIds.slice(index, index + 50).filter(Boolean);
    if (!ids.length) continue;
    const response = await youtubeJson({
      accessToken,
      pathName: "videos",
      query: {
        part: "status",
        id: ids.join(","),
        fields: "items(id,status(privacyStatus,publishAt,uploadStatus))",
      },
    });
    for (const item of response.items || []) {
      statuses.set(item.id, {
        privacyStatus: item.status?.privacyStatus || "",
        publishAt: item.status?.publishAt || "",
        uploadStatus: item.status?.uploadStatus || "",
      });
    }
  }
  return statuses;
}

function courseSlugForSet(courseLinks, setId) {
  return String(courseLinks.publishedCourseSlugBySetId?.[setId] || "").trim();
}

function courseSetBySlug(courseLinks) {
  return new Map(Object.entries(courseLinks.publishedCourseSlugBySetId || {})
    .map(([setId, slug]) => [String(slug || "").trim(), setId])
    .filter(([slug]) => slug));
}

function normalizeUrlCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/[)\].,;:!?]+$/g, "");
}

function extractFlashcardsLunaUrls(text) {
  const urls = [];
  const regex = /https?:\/\/(?:www\.)?flashcardsluna\.com\/[^\s<>"'\])]+/gi;
  let match;
  while ((match = regex.exec(String(text || "")))) {
    urls.push(normalizeUrlCandidate(match[0]));
  }
  return urls;
}

function isMultiTargetLang(targetLang) {
  return String(targetLang || "").includes(",");
}

function isSingleLanguageCode(targetLang) {
  return /^[A-Z]{2,3}(?:-[A-Z0-9]{2,4})?$/u.test(normalizeCode(targetLang));
}

function resolveSupportLangFromUrl({ urlSupportLang, fallbackSupportLang, channelSupportLangs }) {
  const fallback = normalizeCode(fallbackSupportLang);
  const candidates = [...new Set((channelSupportLangs || []).map(normalizeCode).filter(Boolean))];
  if (candidates.length === 1) {
    return {
      supportLang: candidates[0],
      supportLangResolution: "single_channel_support",
      candidateSupportLangs: candidates,
      supportLangAmbiguous: false,
    };
  }

  const normalizedUrlSupport = normalizeCode(urlSupportLang);
  if (normalizedUrlSupport && candidates.includes(normalizedUrlSupport)) {
    const collapsedRegionalVariants = candidates.filter((candidate) => candidate.startsWith(`${normalizedUrlSupport}-`));
    if (!collapsedRegionalVariants.length) {
      return {
        supportLang: normalizedUrlSupport,
        supportLangResolution: "url_path",
        candidateSupportLangs: candidates,
        supportLangAmbiguous: false,
      };
    }
  }

  return {
    supportLang: normalizedUrlSupport || fallback,
    supportLangResolution: "ambiguous_shared_channel",
    candidateSupportLangs: candidates.length ? candidates : [fallback].filter(Boolean),
    supportLangAmbiguous: true,
  };
}

function inferPublicationFromDescription({ supportLang, channelSupportLangs, courseSetLookup, item }) {
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
    const urlSupportLang = normalizeCode(pathParts[0] || "");
    const urlCourseSlug = pathParts[pathParts.indexOf("courses") + 1] || "";
    const targetLang = parsed.searchParams.get("langs") || parsed.searchParams.get("lang") || "";
    const inferredSetId = courseSetLookup.get(urlCourseSlug) || "";
    if (!inferredSetId || !targetLang) continue;
    const supportResolution = resolveSupportLangFromUrl({
      urlSupportLang,
      fallbackSupportLang: supportLang,
      channelSupportLangs,
    });
    const normalizedTargetLang = normalizeCode(targetLang);
    const multiTarget = isMultiTargetLang(normalizedTargetLang);
    const invalidTarget = !multiTarget && !isSingleLanguageCode(normalizedTargetLang);
    return {
      setId: inferredSetId,
      supportLang: supportResolution.supportLang,
      targetLang: normalizedTargetLang,
      title,
      youtubeVideoId: videoId,
      youtubeVideoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
      publicationStatus: "live_youtube_upload_detected",
      uploadedAt: item.snippet?.publishedAt || item.contentDetails?.videoPublishedAt || "",
      lastReadbackAt: new Date().toISOString(),
      readbackSource: "youtube_uploads_playlist",
      liveReadbackOnly: true,
      urlSupportLang,
      supportLangResolution: supportResolution.supportLangResolution,
      supportLangAmbiguous: supportResolution.supportLangAmbiguous,
      candidateSupportLangs: supportResolution.candidateSupportLangs,
      canPersistLiveReadback: !supportResolution.supportLangAmbiguous && !multiTarget && !invalidTarget,
      excludedFromPublicationRegistryReason: supportResolution.supportLangAmbiguous
        ? "ambiguous_shared_channel_support_variant"
        : multiTarget
          ? "multi_target_langs_polyglot_or_bundle_url"
          : invalidTarget
            ? "invalid_target_lang_from_url"
            : "",
    };
  }
  return null;
}

function publicationFromRegistryItem(existing, item) {
  const youtubeVideoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || existing.youtubeVideoId || "";
  return {
    ...existing,
    youtubeVideoId,
    youtubeVideoUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    title: item.snippet?.title || existing.title || "",
    uploadedAt: item.snippet?.publishedAt || item.contentDetails?.videoPublishedAt || existing.uploadedAt || "",
    supportLangResolution: "local_registry_video_id",
    supportLangAmbiguous: false,
    canPersistLiveReadback: true,
    excludedFromPublicationRegistryReason: "",
    inLocalPublicationRegistry: true,
    localRegistryVideoId: youtubeVideoId,
  };
}

function earliestAuditWindowStart(publicationRegistry, { setId, channelSupportLangs, matchedPublications = [] }) {
  const channelSupports = new Set((channelSupportLangs || []).map(normalizeCode));
  const dates = [
    ...(publicationRegistry.publications || [])
      .filter(isActivePublication)
      .filter((row) => String(row.setId || "") === String(setId || ""))
      .filter((row) => channelSupports.has(normalizeCode(row.supportLang)))
      .flatMap((row) => [row.uploadedAt, row.createdAt, row.lastReadbackAt].filter(Boolean)),
    ...matchedPublications.flatMap((row) => [row.uploadedAt].filter(Boolean)),
  ].filter((value) => Number.isFinite(Date.parse(value))).sort();
  return dates[0] || "";
}

function markPotentialCurrentSetUnmatched(row, { auditWindowStart, exclusionByVideoId }) {
  const exclusion = exclusionByVideoId.get(row.youtubeVideoId);
  row.auditWindowStart = auditWindowStart || "";
  row.reviewedNonProduct = Boolean(exclusion);
  row.reviewReason = exclusion?.reason || "";
  const statusReturned = String(row.youtubeStatus?.uploadStatus || "").toLowerCase() !== "not_returned";
  row.potentialCurrentSet = Boolean(
    !exclusion
    && statusReturned
    && auditWindowStart
    && Number.isFinite(Date.parse(row.uploadedAt || ""))
    && Date.parse(row.uploadedAt) >= Date.parse(auditWindowStart),
  );
  return row;
}

function validateAuditExclusions(exclusions = {}) {
  const entries = exclusions.entries || [];
  if (!Array.isArray(entries)) throw new Error("YouTube live-audit exclusions entries must be an array");
  const seen = new Set();
  for (const [index, row] of entries.entries()) {
    const prefix = `YouTube live-audit exclusion entries[${index}]`;
    if (row?.status !== "reviewed_non_product") throw new Error(`${prefix} must use status=reviewed_non_product`);
    if (!String(row.youtubeVideoId || "").trim()) throw new Error(`${prefix} requires youtubeVideoId`);
    if (!String(row.reason || "").trim()) throw new Error(`${prefix} requires a review reason`);
    if (seen.has(row.youtubeVideoId)) throw new Error(`${prefix} duplicates youtubeVideoId=${row.youtubeVideoId}`);
    seen.add(row.youtubeVideoId);
  }
  return new Map(entries.map((row) => [row.youtubeVideoId, row]));
}

function duplicateGroups(publications) {
  return duplicateVideoGroups(publications, semanticAssignmentKey);
}

function markDuplicateAssignmentRowsNonPersistable(rows) {
  const groups = duplicateGroups(rows);
  if (!groups.length) return;
  const duplicateKeys = new Set(groups.map((group) => group.key));
  for (const row of rows) {
    const key = semanticAssignmentKey(row);
    if (!duplicateKeys.has(key)) continue;
    if (row.supportLangResolution === "local_registry_video_id") continue;
    row.canPersistLiveReadback = false;
    row.excludedFromPublicationRegistryReason = row.localRegistryVideoId
      ? "duplicate_live_video_for_registered_assignment"
      : "duplicate_live_assignment_requires_review";
  }
}

async function auditSupport({ options, channelRegistry, publicationRegistry, courseSetLookup, exclusionByVideoId, supportLang }) {
  const channel = findChannelForSupport(channelRegistry.channels, supportLang);
  if (!channel) fail(`No YouTube channel configured for support=${supportLang}`);
  if (!channel.channelId) fail(`Configured channel for support=${supportLang} has no channelId`);

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  const accessToken = await getAccessToken({ clientFile, tokenFile });
  const authorizedChannel = await readAuthorizedChannel({ accessToken, expectedChannelId: channel.channelId });
  const uploadsPlaylistId = authorizedChannel.contentDetails?.relatedPlaylists?.uploads || "";
  if (!uploadsPlaylistId) fail(`YouTube channel ${channel.channelId} did not expose an uploads playlist.`);

  const uploadReadback = await readUploadPlaylistItems({
    accessToken,
    uploadsPlaylistId,
    maxPages: options.maxPages,
  });
  const items = uploadReadback.items;
  const statuses = options.includeVideoStatus
    ? await readVideoStatuses({
      accessToken,
      videoIds: items.map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || ""),
    })
    : new Map();
  const matchedPublications = [];
  const knownOtherPublications = [];
  const unmatchedVideos = [];
  const channelSupportLangs = (channel.supportLangs || [supportLang]).map(normalizeCode).filter(Boolean);
  for (const item of items) {
    const youtubeVideoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "";
    const existingAnySet = findActivePublicationByVideoId(publicationRegistry, { youtubeVideoId });
    if (existingAnySet) {
      const known = publicationFromRegistryItem(existingAnySet, item);
      if (options.includeVideoStatus) {
        known.youtubeStatus = statuses.get(youtubeVideoId) || { privacyStatus: "", publishAt: "", uploadStatus: "not_returned" };
      }
      if (String(known.setId || "") === String(options.setId)) matchedPublications.push(known);
      else knownOtherPublications.push(known);
      continue;
    }
    const inferred = inferPublicationFromDescription({
      supportLang,
      channelSupportLangs,
      courseSetLookup,
      item,
    });
    if (inferred) {
      const existingByVideoId = findActivePublicationByVideoId(publicationRegistry, {
        setId: inferred.setId,
        youtubeVideoId: inferred.youtubeVideoId,
      });
      const existing = existingByVideoId || findActivePublication(publicationRegistry, inferred);
      if (existingByVideoId) {
        inferred.supportLang = normalizeCode(existingByVideoId.supportLang);
        inferred.targetLang = normalizeCode(existingByVideoId.targetLang);
        for (const field of ["videoType", "polyglotKey", "bundleKey", "contentScope", "targetLangs", "targetLangsCsv", "targetLangsHash", "channelKey"]) {
          if (existingByVideoId[field] !== undefined && existingByVideoId[field] !== null && existingByVideoId[field] !== "") {
            inferred[field] = existingByVideoId[field];
          }
        }
        inferred.supportLangResolution = "local_registry_video_id";
        inferred.supportLangAmbiguous = false;
        inferred.canPersistLiveReadback = true;
        inferred.excludedFromPublicationRegistryReason = "";
      } else if (existing?.youtubeVideoId && existing.youtubeVideoId !== inferred.youtubeVideoId) {
        inferred.canPersistLiveReadback = false;
        inferred.excludedFromPublicationRegistryReason = "duplicate_live_video_for_registered_assignment";
      }
      const matched = {
        ...inferred,
        inLocalPublicationRegistry: Boolean(existing),
        localRegistryVideoId: existing?.youtubeVideoId || "",
      };
      if (options.includeVideoStatus) {
        matched.youtubeStatus = statuses.get(youtubeVideoId) || { privacyStatus: "", publishAt: "", uploadStatus: "not_returned" };
      }
      if (String(matched.setId || "") === String(options.setId)) matchedPublications.push(matched);
      else knownOtherPublications.push(matched);
    } else {
      unmatchedVideos.push({
        youtubeVideoId,
        youtubeVideoUrl: youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : "",
        supportLang: normalizeCode(supportLang),
        channelKey: channel.key,
        youtubeChannelId: channel.channelId,
        title: item.snippet?.title || "",
        uploadedAt: item.snippet?.publishedAt || item.contentDetails?.videoPublishedAt || "",
        youtubeStatus: options.includeVideoStatus
          ? (statuses.get(youtubeVideoId) || { privacyStatus: "", publishAt: "", uploadStatus: "not_returned" })
          : null,
      });
    }
  }
  markDuplicateAssignmentRowsNonPersistable(matchedPublications);
  const auditWindowStart = earliestAuditWindowStart(publicationRegistry, {
    setId: options.setId,
    channelSupportLangs,
    matchedPublications,
  });
  for (const row of unmatchedVideos) {
    markPotentialCurrentSetUnmatched(row, { auditWindowStart, exclusionByVideoId });
  }

  return {
    supportLang,
    channelKey: channel.key,
    youtubeChannelId: channel.channelId,
    uploadsPlaylistId,
    pagesRead: uploadReadback.pagesRead,
    paginationComplete: uploadReadback.paginationComplete,
    nextPageTokenPresent: uploadReadback.nextPageTokenPresent,
    scannedUploadItems: items.length,
    matchedPublications,
    knownOtherPublicationCount: knownOtherPublications.length,
    unmatchedVideos,
    potentialCurrentSetUnmatchedCount: unmatchedVideos.filter((row) => row.potentialCurrentSet).length,
    missingFromLocalRegistry: matchedPublications.filter((row) => !row.inLocalPublicationRegistry),
    persistableMissingFromLocalRegistry: matchedPublications.filter((row) => row.canPersistLiveReadback !== false && !row.inLocalPublicationRegistry),
    nonPersistableMatchedPublications: matchedPublications.filter((row) => row.canPersistLiveReadback === false),
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
  const ordinaryPublicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const polyglotPublicationRegistry = loadPublicationRegistry(options.polyglotPublicationRegistry);
  const publicationRegistry = {
    schemaVersion: 1,
    publications: [
      ...(ordinaryPublicationRegistry.publications || []),
      ...(polyglotPublicationRegistry.publications || []),
    ],
  };
  const courseLinks = readJson(options.courseLinks, "video public course links");
  const courseSlug = courseSlugForSet(courseLinks, options.setId);
  if (!courseSlug) fail(`No published course slug configured for set=${options.setId}`);
  const courseSetLookup = courseSetBySlug(courseLinks);
  const exclusions = fs.existsSync(options.auditExclusions)
    ? readJson(options.auditExclusions, "YouTube live-audit exclusions")
    : { entries: [] };
  const exclusionByVideoId = validateAuditExclusions(exclusions);

  const supports = [...new Set(options.supports.map(normalizeCode).filter(Boolean))];
  const supportReports = [];
  for (const supportLang of supports) {
    supportReports.push(await auditSupport({
      options,
      channelRegistry,
      publicationRegistry,
      courseSetLookup,
      exclusionByVideoId,
      supportLang,
    }));
  }

  const allPublications = supportReports.flatMap((report) => report.matchedPublications);
  const publications = allPublications.filter((row) => row.canPersistLiveReadback !== false);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_live_publication_audit",
    sourceOfTruth: "YouTube Data API uploads playlist readback; read-only blocklist for generation preflight",
    setId: options.setId,
    courseSlug,
    supports,
    scannedUploadItems: supportReports.reduce((sum, item) => sum + item.scannedUploadItems, 0),
    matchedPublicationCount: allPublications.length,
    persistablePublicationCount: publications.length,
    missingFromLocalRegistryCount: publications.filter((row) => !row.inLocalPublicationRegistry).length,
    nonPersistableMatchedPublicationCount: allPublications.length - publications.length,
    unclassifiedUploadCount: supportReports.reduce((sum, item) => sum + item.unmatchedVideos.length, 0),
    unclassifiedRecentUploadCount: supportReports.reduce((sum, item) => sum + item.potentialCurrentSetUnmatchedCount, 0),
    allMissingFromLocalRegistryCount: allPublications.filter((row) => !row.inLocalPublicationRegistry).length,
    duplicateGroups: duplicateGroups(publications),
    allDuplicateGroups: duplicateGroups(allPublications),
    videoStatusReadback: options.includeVideoStatus,
    scheduledVideoCount: allPublications.filter((row) => row.youtubeStatus?.publishAt).length,
    paginationComplete: supportReports.every((item) => item.paginationComplete === true),
    truncatedSupportCount: supportReports.filter((item) => item.paginationComplete !== true).length,
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
      unclassifiedUploadCount: report.unclassifiedUploadCount,
      unclassifiedRecentUploadCount: report.unclassifiedRecentUploadCount,
      duplicateGroupCount: report.duplicateGroups.length,
      paginationComplete: report.paginationComplete,
      truncatedSupportCount: report.truncatedSupportCount,
      output: options.output,
    }, null, 2));
  } else {
    console.log(`YouTube live publication audit wrote ${options.output}`);
    console.log(`matchedPublicationCount=${report.matchedPublicationCount}`);
    console.log(`missingFromLocalRegistryCount=${report.missingFromLocalRegistryCount}`);
    console.log(`duplicateGroupCount=${report.duplicateGroups.length}`);
    console.log(`paginationComplete=${report.paginationComplete}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    fail(error?.stack || error?.message || String(error));
  });
}

export {
  courseSetBySlug,
  earliestAuditWindowStart,
  inferPublicationFromDescription,
  markPotentialCurrentSetUnmatched,
  publicationFromRegistryItem,
  validateAuditExclusions,
};
