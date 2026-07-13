#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  isActivePublication,
  loadPublicationRegistry,
  publicationMatches,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const MAX_YOUTUBE_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const DEFAULT_OUTPUT_DIR = "outputs/review";

function parseArgs(argv) {
  const options = {
    manifest: "",
    setId: "",
    supports: [],
    targets: [],
    output: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    failOnBlockers: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--manifest" || arg.startsWith("--manifest=")) options.manifest = readValue();
    else if (arg === "--set-id" || arg.startsWith("--set-id=")) options.setId = readValue();
    else if (arg === "--support" || arg.startsWith("--support=")) options.supports = splitCodes(readValue());
    else if (arg === "--targets" || arg.startsWith("--targets=") || arg === "--target" || arg.startsWith("--target=")) options.targets = splitCodes(readValue());
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = readValue();
    else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) options.publicationRegistry = readValue();
    else if (arg === "--fail-on-blockers") options.failOnBlockers = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-youtube-thumbnail-batch-from-manifest.mjs --manifest <manifest.json> [--set-id <set>] [--support JA,PT] [--targets HY,KM] [--output <report.json>]",
    "",
    "Plans thumbnail-only updates from a prepared local cover manifest.",
    "Dry-run only: this script never calls YouTube and never modifies config state.",
  ].join("\n");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);
}

function supportLangFromCover(cover) {
  const explicitSupport = normalizeCode(cover.supportLang || cover.support || cover.support_lang);
  if (explicitSupport) return explicitSupport;

  const channelSupports = [
    ...ensureArray(cover.channelSupportLangs),
    ...ensureArray(cover.channel_support_langs),
  ].map(normalizeCode).filter(Boolean);
  for (const canonical of ["EN", "ES-419", "PT-BR"]) {
    if (channelSupports.includes(canonical)) return canonical;
  }

  return normalizeCode(cover.viewerSupportLang || cover.viewer_support_lang || channelSupports[0]);
}

function targetLangFromCover(cover) {
  const target = normalizeCode(cover.targetLang || cover.target || cover.target_lang);
  if (target) return target;
  const targetLangsCsv = cover.targetLangsCsv || cover.target_langs_csv || "";
  if (targetLangsCsv) return splitCodes(targetLangsCsv).join(",");
  const targetLangs = ensureArray(cover.targetLangs || cover.target_langs).map(normalizeCode).filter(Boolean);
  return targetLangs.join(",");
}

function readJson(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function findChannelForSupport(channelRegistry, supportLang) {
  const support = normalizeCode(supportLang);
  return ensureArray(channelRegistry.channels).find((channel) => {
    const supports = ensureArray(channel.supportLangs).length ? channel.supportLangs : [channel.supportLang || channel.key];
    return supports.map(normalizeCode).includes(support);
  }) || null;
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (
      marker === 0xc0
      || marker === 0xc1
      || marker === 0xc2
      || marker === 0xc3
      || marker === 0xc5
      || marker === 0xc6
      || marker === 0xc7
      || marker === 0xc9
      || marker === 0xca
      || marker === 0xcb
      || marker === 0xcd
      || marker === 0xce
      || marker === 0xcf
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
        format: "jpeg",
      };
    }
    if (!length || length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function imageInfo(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    sizeBytes: buffer.length,
    dimensions: jpegDimensions(buffer),
    jpgMagic: buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8,
  };
}

function resolveCoverPath(cover, manifestDir) {
  const candidates = [
    cover.relativePath ? path.resolve(cover.relativePath) : "",
    cover.path && !path.isAbsolute(cover.path) ? path.resolve(cover.path) : "",
    cover.path && path.isAbsolute(cover.path) ? cover.path : "",
    cover.relativePath ? path.resolve(manifestDir, cover.relativePath) : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0] || "";
}

function resolveRouteEnvironment(supportLang) {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/resolve-youtube-api-environment.mjs",
      `--support=${normalizeCode(supportLang)}`,
      "--environment=auto",
      "--json",
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(output).githubEnvironment || "";
}

function currentThumbnailState(publication) {
  return {
    thumbnailSet: publication?.thumbnailSet ?? null,
    thumbnailUploadMode: publication?.thumbnailUploadMode || "",
    thumbnailSource: publication?.thumbnailSource || "",
    thumbnailUploadedAt: publication?.thumbnailUploadedAt || "",
    lastThumbnailReadbackAt: publication?.lastThumbnailReadbackAt || "",
    needsThumbnailPermission: publication?.needsThumbnailPermission ?? false,
    thumbnailSetError: publication?.thumbnailSetError || "",
  };
}

function sameCodeList(left, right) {
  const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map(normalizeCode).filter(Boolean).sort().join(",");
    return String(value || "")
      .split(",")
      .map(normalizeCode)
      .filter(Boolean)
      .sort()
      .join(",");
  };
  return normalizeList(left) === normalizeList(right);
}

function coverVideoType(cover) {
  return String(cover.videoType || cover.video_type || "").trim().toLowerCase() === "polyglot"
    ? "polyglot"
    : "ordinary";
}

function coverSetId(cover, manifestSetId = "") {
  return String(cover.setId || cover.set_id || manifestSetId || "").trim();
}

function publicationMatchesCover(publication, { cover, setId, supportLang, targetLang }) {
  const videoType = coverVideoType(cover);
  if (videoType === "polyglot") {
    if (publication.videoType !== "polyglot") return false;
    if (String(publication.setId || "") !== String(setId || "")) return false;
    if (normalizeCode(publication.supportLang) !== normalizeCode(supportLang)) return false;
    if (cover.youtubeVideoId && publication.youtubeVideoId === cover.youtubeVideoId) return true;
    if (cover.polyglotKey && publication.polyglotKey === cover.polyglotKey) return true;
    if (
      cover.bundleKey
      && publication.bundleKey === cover.bundleKey
      && cover.targetLangsHash
      && publication.targetLangsHash === cover.targetLangsHash
    ) {
      return true;
    }
    if (
      cover.bundleKey
      && publication.bundleKey === cover.bundleKey
      && sameCodeList(publication.targetLangsCsv || publication.targetLang || publication.targetLangs, targetLang)
    ) {
      return true;
    }
    return false;
  }

  return publicationMatches(publication, { setId, supportLang, targetLang })
    && (!publication.videoType || publication.videoType === "ordinary");
}

function compactPublication(publication) {
  if (!publication) return null;
  return {
    youtubeVideoId: publication.youtubeVideoId || "",
    youtubeVideoUrl: publication.youtubeVideoUrl || "",
    publicationStatus: publication.publicationStatus || publication.status || "",
    privacyStatus: publication.privacyStatus || "",
    publishAt: publication.publishAt || publication.scheduledPublishAt || "",
    githubRunId: publication.githubRunId || publication.sourceRunId || "",
    currentThumbnailState: currentThumbnailState(publication),
  };
}

function blockerSummary(rows) {
  const counts = {};
  for (const row of rows) {
    for (const reason of row.blockers) counts[reason] = (counts[reason] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function bySupportSummary(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.supportLang;
    if (!map.has(key)) {
      map.set(key, {
        supportLang: key,
        channelKey: row.channelKey || "",
        routeEnvironment: row.routeEnvironment || "",
        total: 0,
        ready: 0,
        blocked: 0,
        targets: [],
      });
    }
    const item = map.get(key);
    item.total += 1;
    if (row.status === "ready") item.ready += 1;
    else item.blocked += 1;
    item.targets.push(row.targetLang);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      targets: [...new Set(item.targets)].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.supportLang.localeCompare(b.supportLang));
}

function planCover({ cover, manifestDir, manifestSetId, options, channelRegistry, publicationRegistry, routeCache }) {
  const supportLang = supportLangFromCover(cover);
  const targetLang = targetLangFromCover(cover);
  const setId = coverSetId(cover, manifestSetId) || options.setId || "";
  const blockers = [];

  if (!setId) blockers.push("missing_set_id");
  if (!supportLang) blockers.push("missing_support_lang");
  if (!targetLang && coverVideoType(cover) !== "polyglot") blockers.push("missing_target_lang");

  const channel = supportLang ? findChannelForSupport(channelRegistry, supportLang) : null;
  if (!channel) blockers.push("no_channel_config");
  else if (channel.customThumbnailUploadAllowed !== true) blockers.push("custom_thumbnail_not_confirmed");

  let routeEnvironment = "";
  if (supportLang) {
    if (!routeCache.has(supportLang)) {
      try {
        routeCache.set(supportLang, { ok: true, value: resolveRouteEnvironment(supportLang) });
      } catch (error) {
        routeCache.set(supportLang, { ok: false, value: error.message });
      }
    }
    const route = routeCache.get(supportLang);
    if (route.ok) routeEnvironment = route.value;
    else blockers.push("route_resolution_failed");
  }

  const matchingPublications = ensureArray(publicationRegistry.publications)
    .filter((publication) => publicationMatchesCover(publication, { cover, setId, supportLang, targetLang }))
    .filter(isActivePublication)
    .filter(Boolean);
  if (matchingPublications.length === 0) blockers.push("no_active_publication");
  if (matchingPublications.length > 1) blockers.push("multiple_active_publications");
  const publication = matchingPublications.length === 1 ? matchingPublications[0] : null;
  if (publication && !publication.youtubeVideoId) blockers.push("missing_video_id");

  const coverPath = resolveCoverPath(cover, manifestDir);
  let coverRelativePath = cover.relativePath || (coverPath ? path.relative(process.cwd(), coverPath) : "");
  let sizeBytes = 0;
  let dimensions = null;
  if (!coverPath || !fs.existsSync(coverPath)) {
    blockers.push("missing_cover");
  } else {
    coverRelativePath = path.relative(process.cwd(), coverPath);
    const ext = path.extname(coverPath).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg") blockers.push("not_jpg");
    try {
      const info = imageInfo(coverPath);
      sizeBytes = info.sizeBytes;
      dimensions = info.dimensions;
      if (!info.jpgMagic) blockers.push("not_jpg");
      if (sizeBytes > MAX_YOUTUBE_THUMBNAIL_BYTES) blockers.push("over_2mb");
      if (!dimensions) blockers.push("dimensions_unreadable");
      else if (dimensions.width !== 1280 || dimensions.height !== 720) blockers.push("wrong_dimensions");
    } catch {
      blockers.push("cover_read_failed");
    }
  }

  const status = blockers.length ? "blocked" : "ready";
  return {
    status,
    blockers,
    setId,
    videoType: coverVideoType(cover),
    supportLang,
    targetLang,
    polyglotKey: cover.polyglotKey || "",
    bundleKey: cover.bundleKey || "",
    targetLangsCsv: cover.targetLangsCsv || ensureArray(cover.targetLangs).map(normalizeCode).join(","),
    channelKey: channel?.key || "",
    expectedYoutubeChannelId: channel?.channelId || "",
    customThumbnailUploadAllowed: channel?.customThumbnailUploadAllowed === true,
    routeEnvironment,
    youtubeVideoId: publication?.youtubeVideoId || "",
    youtubeVideoUrl: publication?.youtubeVideoUrl || "",
    publication: compactPublication(publication),
    matchingActivePublicationCount: matchingPublications.length,
    matchingActivePublicationVideoIds: matchingPublications.map((publication) => publication.youtubeVideoId || "").filter(Boolean),
    coverPath,
    coverRelativePath,
    coverFileName: coverPath ? path.basename(coverPath) : "",
    coverSizeBytes: sizeBytes,
    coverDimensions: dimensions,
    previousThumbnailUploadMode: cover.previousThumbnailUploadMode ?? publication?.thumbnailUploadMode ?? null,
    previousThumbnailSet: cover.previousThumbnailSet ?? publication?.thumbnailSet ?? null,
    currentThumbnailState: currentThumbnailState(publication),
  };
}

function defaultOutputPath(manifest) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeRunId = String(manifest.runId || "manifest").replace(/[^a-z0-9._-]+/gi, "-");
  return path.join(DEFAULT_OUTPUT_DIR, `youtube-thumbnail-batch-dry-run-${safeRunId}-${stamp}.json`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.manifest) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const manifestPath = path.resolve(options.manifest);
  const manifest = readJson(manifestPath, "Thumbnail manifest");
  const manifestDir = path.dirname(manifestPath);
  const channelRegistry = readJson(options.channelConfig, "YouTube channel config");
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const manifestSetId = manifest.scope?.setId || "";
  const supportFilter = new Set(options.supports);
  const targetFilter = new Set(options.targets);
  const routeCache = new Map();

  const manifestRows = ensureArray(manifest.covers)
    .filter((cover) => {
      const setId = coverSetId(cover, manifestSetId);
      const support = supportLangFromCover(cover);
      const target = targetLangFromCover(cover);
      if (options.setId && setId !== options.setId) return false;
      if (supportFilter.size && !supportFilter.has(support)) return false;
      if (targetFilter.size && !targetFilter.has(target)) return false;
      return true;
    });

  const rows = manifestRows.map((cover) => planCover({
    cover,
    manifestDir,
    manifestSetId,
    options,
    channelRegistry,
    publicationRegistry,
    routeCache,
  }));

  const readyRows = rows.filter((row) => row.status === "ready");
  const blockedRows = rows.filter((row) => row.status !== "ready");
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    action: "youtube_thumbnail_batch_set_from_manifest",
    manifestPath,
    publicationRegistryPath: path.resolve(options.publicationRegistry),
    manifestRunId: manifest.runId || "",
    setId: options.setId || manifestSetId || "",
    filters: {
      supports: options.supports,
      targets: options.targets,
    },
    summary: {
      totalRows: rows.length,
      readyRows: readyRows.length,
      blockedRows: blockedRows.length,
      status: blockedRows.length ? (readyRows.length ? "partial" : "blocked") : "ready",
      bySupport: bySupportSummary(rows),
      blockedReasons: blockerSummary(blockedRows),
    },
    readyRows,
    blockedRows,
    rows,
  };

  const output = path.resolve(options.output || defaultOutputPath(manifest));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    reportPath: path.relative(process.cwd(), output),
    totalRows: report.summary.totalRows,
    readyRows: report.summary.readyRows,
    blockedRows: report.summary.blockedRows,
    bySupport: report.summary.bySupport,
    blockedReasons: report.summary.blockedReasons,
  }, null, 2));

  if (options.failOnBlockers && blockedRows.length) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
