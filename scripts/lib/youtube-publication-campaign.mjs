import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  assignmentKey,
  calendarAssignmentKey,
  canonicalSupportCode,
  effectiveScheduleStartDate,
  isPolyglotRow,
  normalizeCode,
  polyglotContentScope,
  polyglotProductSlotKey,
} from "./youtube-publication-control.mjs";
import {
  assertCanonicalSupportCount,
  loadCanonicalSupportRouting,
  resolveCanonicalSupports,
} from "./youtube-support-routing.mjs";
import {
  channelPolicy,
  findFreeSlot,
  isActiveCalendarReservation,
  slotKey,
  ymdInZone,
} from "../plan-youtube-publish-schedule.mjs";
import {
  buildPlaylistAssignment,
  longVideoUploadAllowed,
  findPlaylistEntry,
} from "./youtube-playlists.mjs";
import {
  buildPolyglotPlaylistAssignment,
  findPolyglotPlaylistEntry,
} from "./polyglot-youtube-playlists.mjs";
import {
  findDiscoveryChannel,
  resolvePlaylistDiscovery,
  validateResolvedPlaylistIdentities,
} from "./youtube-playlist-discovery.mjs";

const ACTIVE_CAMPAIGN_STATUSES = new Set([
  "claimed",
  "dispatching",
  "dispatched",
  "running",
  "upload_accepted",
  "reconciliation_required",
]);
const SHORT_UNVERIFIED_MAX_DURATION_SECONDS = 895;
const DEFAULT_SHORT_UNVERIFIED_CARD_LIMIT = 0;

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== null) return structuredClone(fallback);
    throw new Error(`Required JSON file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizedJson(value) {
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalizedJson(value[key])]));
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Text(JSON.stringify(normalizedJson(value)));
}

function fileFingerprint(filePath, { optional = false } = {}) {
  if (!fs.existsSync(filePath)) {
    if (optional) return { path: filePath, exists: false, sha256: "" };
    throw new Error(`Fingerprint source not found: ${filePath}`);
  }
  return {
    path: filePath,
    exists: true,
    sha256: crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"),
  };
}

function isGitTracked(filePath) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", filePath], {
    encoding: "utf8",
    stdio: "ignore",
  }).status === 0;
}

function historicalGitBlobSource(filePath, explicitBlobId = "") {
  const absolute = path.resolve(filePath);
  const relative = path.relative(process.cwd(), absolute).split(path.sep).join("/");
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) {
    return { available: false, matchesLocalFile: false, commit: "", blobId: "", localBlobId: "" };
  }
  if (explicitBlobId) {
    const probe = spawnSync("git", ["cat-file", "-e", `${explicitBlobId}^{blob}`], { stdio: "ignore" });
    if (probe.status !== 0) throw new Error(`Explicit historical deck blob is unavailable: ${explicitBlobId}`);
    const local = fs.existsSync(absolute)
      ? spawnSync("git", ["hash-object", "--", relative], { encoding: "utf8" })
      : { status: 1, stdout: "" };
    const localBlobId = local.status === 0 ? local.stdout.trim() : "";
    return {
      available: true,
      matchesLocalFile: Boolean(localBlobId && explicitBlobId === localBlobId),
      commit: "",
      blobId: explicitBlobId,
      localBlobId,
      path: relative,
      source: "explicit_verified_blob",
    };
  }
  const history = spawnSync("git", ["log", "--all", "--format=%H", "--", relative], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (history.status !== 0) return { available: false, matchesLocalFile: false, commit: "", blobId: "", localBlobId: "" };
  const commits = history.stdout.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
  let commit = "";
  let blobId = "";
  for (const candidate of commits) {
    const probe = spawnSync("git", ["cat-file", "-e", `${candidate}:${relative}`], { stdio: "ignore" });
    if (probe.status !== 0) continue;
    const resolved = spawnSync("git", ["rev-parse", `${candidate}:${relative}`], { encoding: "utf8" });
    if (resolved.status !== 0) continue;
    commit = candidate;
    blobId = resolved.stdout.trim();
    break;
  }
  const local = fs.existsSync(absolute)
    ? spawnSync("git", ["hash-object", "--", relative], { encoding: "utf8" })
    : { status: 1, stdout: "" };
  const localBlobId = local.status === 0 ? local.stdout.trim() : "";
  return {
    available: Boolean(commit && blobId),
    matchesLocalFile: Boolean(blobId && localBlobId && blobId === localBlobId),
    commit,
    blobId,
    localBlobId,
    path: relative,
  };
}

function deckCardCount({ offlineDeckPath, historicalDeckSource }) {
  let source = "";
  if (fs.existsSync(offlineDeckPath)) source = fs.readFileSync(offlineDeckPath, "utf8");
  else if (historicalDeckSource?.available && historicalDeckSource?.blobId) {
    const result = spawnSync("git", ["show", historicalDeckSource.blobId], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status === 0) source = result.stdout;
  }
  if (!source) return null;
  try {
    const cards = JSON.parse(source).cards;
    const counts = new Set(Object.values(cards || {})
      .flatMap((bySupport) => Object.values(bySupport || {}))
      .filter(Array.isArray)
      .map((rows) => rows.length));
    return counts.size === 1 ? [...counts][0] : null;
  } catch {
    return null;
  }
}

function targetHash(targetLangs) {
  return sha256Text(targetLangs.map(normalizeCode).filter(Boolean).join(",")).slice(0, 12);
}

function activeCampaigns(registry = {}) {
  return (registry.campaigns || []).filter((campaign) => ACTIVE_CAMPAIGN_STATUSES.has(String(campaign.status || "").toLowerCase()));
}

function campaignClaimSets(registry = {}) {
  const assignments = new Set();
  const slots = new Set();
  const polyglotProducts = new Set();
  for (const campaign of activeCampaigns(registry)) {
    for (const key of campaign.assignmentKeys || []) assignments.add(key);
    for (const key of campaign.slotKeys || []) slots.add(key);
    for (const assignment of campaign.assignments || []) {
      if (isPolyglotRow(assignment)) polyglotProducts.add(polyglotProductSlotKey(assignment));
    }
    for (const key of campaign.assignmentKeys || []) {
      const parts = String(key || "").split("|");
      if (parts[0] === "polyglot" && parts.length >= 4) {
        polyglotProducts.add(["polyglot-product-slot", parts[1], canonicalSupportCode(parts[2]), parts[3]].join("|"));
      }
    }
  }
  return { assignments, slots, polyglotProducts };
}

function loadApprovedCovers(coverRegistryPath) {
  const registry = readJson(coverRegistryPath, { manifests: [], policy: {} });
  const activeStatus = registry.policy?.activeStatus || "approved";
  const covers = [];
  const manifestReadiness = [];
  for (const row of registry.manifests || []) {
    if (row.status !== activeStatus || !row.path) continue;
    const exists = fs.existsSync(row.path);
    const tracked = exists && isGitTracked(row.path);
    manifestReadiness.push({
      id: row.id || "",
      path: row.path,
      exists,
      tracked,
      setId: row.setId || "",
      setIds: row.setIds || [],
      videoType: row.videoType || "",
      videoTypes: row.videoTypes || [],
      supports: row.supports || [],
    });
    if (!exists) continue;
    const manifest = readJson(row.path);
    for (const cover of manifest.covers || []) covers.push({ ...cover, manifestPath: row.path });
  }
  return { registry, covers, manifestReadiness };
}

function manifestAppliesToCandidate(manifest = {}, candidate = {}) {
  const setIds = [manifest.setId, ...(manifest.setIds || [])].filter(Boolean);
  if (setIds.length && !setIds.includes(candidate.setId)) return false;
  const videoTypes = [manifest.videoType, ...(manifest.videoTypes || [])].filter(Boolean);
  if (videoTypes.length && !videoTypes.includes(candidate.videoType)) return false;
  const supports = (manifest.supports || []).map(canonicalSupportCode).filter(Boolean);
  return !supports.length || supports.includes(candidate.supportLang);
}

function coverSupportCodes(cover = {}) {
  return [
    cover.supportLang,
    cover.viewerSupportLang,
    ...(Array.isArray(cover.channelSupportLangs) ? cover.channelSupportLangs : []),
  ].map(canonicalSupportCode).filter(Boolean);
}

function sameTargetList(left = [], right = []) {
  const normalizeList = (value) => (Array.isArray(value) ? value : String(value || "").split(","))
    .map(normalizeCode).filter(Boolean).sort().join(",");
  return normalizeList(left) === normalizeList(right);
}

function coverPath(cover = {}) {
  return [cover.relativePath, cover.path].find((candidate) => candidate && fs.existsSync(candidate)) || "";
}

function findApprovedCover(covers, candidate) {
  return covers.find((cover) => {
    if (cover.uploadEligible === false) return false;
    if (cover.status && cover.status !== "approved") return false;
    if (cover.setId && cover.setId !== candidate.setId) return false;
    if (cover.assignmentKey && cover.assignmentKey !== candidate.assignmentKey) return false;
    if (!coverSupportCodes(cover).includes(candidate.supportLang)) return false;
    if (candidate.videoType === "polyglot") {
      if (cover.videoType && cover.videoType !== "polyglot") return false;
      if (cover.bundleKey && cover.bundleKey !== candidate.bundleKey) return false;
      return sameTargetList(cover.targetLangsCsv || cover.targetLangs, candidate.targetLangs);
    }
    if (cover.videoType && cover.videoType !== "ordinary") return false;
    return normalizeCode(cover.targetLang) === candidate.targetLang;
  }) || null;
}

function resolveCoverReadiness({ candidate, channel, covers }) {
  if (channel.customThumbnailUploadAllowed === false) {
    return { mode: "first_frame_auto", ready: true, reason: "custom_thumbnail_disabled_for_channel" };
  }
  if (channel.customThumbnailUploadAllowed !== true) {
    return { mode: "first_frame_auto", ready: true, reason: "custom_thumbnail_capability_unknown" };
  }
  const cover = findApprovedCover(covers, candidate);
  const resolvedPath = cover ? coverPath(cover) : "";
  const tracked = Boolean(resolvedPath && isGitTracked(resolvedPath));
  const fileBytes = resolvedPath ? fs.readFileSync(resolvedPath) : null;
  const sha256 = fileBytes ? crypto.createHash("sha256").update(fileBytes).digest("hex") : "";
  const jpeg = Boolean(fileBytes?.length >= 3 && fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff);
  const reason = !cover ? "approved_cover_not_found"
    : (!resolvedPath ? "approved_cover_file_missing"
      : (!tracked ? "approved_cover_not_git_tracked"
        : (!jpeg ? "approved_cover_not_jpeg"
          : (cover.sha256 && cover.sha256 !== sha256 ? "approved_cover_checksum_mismatch" : ""))));
  return {
    mode: "custom",
    ready: !reason,
    reason,
    path: resolvedPath,
    manifestPath: cover?.manifestPath || "",
    sha256,
  };
}

function exactDeck(snapshot, setId) {
  const deck = (snapshot.decks || []).find((row) => row.setId === setId);
  if (!deck) throw new Error(`Publication snapshot does not contain set=${setId}`);
  return deck;
}

function snapshotBlockers(deck, snapshotGeneratedAt, now, maxAgeMinutes) {
  const blockers = [];
  const summary = deck.summary || {};
  const requiredTrue = ["complete", "paginationComplete", "videoStatusReadbackComplete"];
  for (const key of requiredTrue) if (summary[key] !== true) blockers.push(`snapshot.${key} must be true`);
  const zeroFields = [
    "blockerCount",
    "liveDuplicateGroupCount",
    "registryOnlyDuplicateGroupCount",
    "calendarAssignmentDuplicateCount",
    "calendarSlotCollisionCount",
    "liveVideoMissingDurableRegistryCount",
    "liveScheduleMissingCalendarCount",
  ];
  for (const key of zeroFields) if (Number(summary[key] || 0) !== 0) blockers.push(`snapshot.${key} must be 0, got ${summary[key]}`);
  const generatedMillis = Date.parse(snapshotGeneratedAt || "");
  const ageMinutes = Number.isFinite(generatedMillis) ? (now.getTime() - generatedMillis) / 60_000 : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(ageMinutes) || ageMinutes < -5 || ageMinutes > maxAgeMinutes) {
    blockers.push(`snapshot is not fresh enough for apply: age=${Number.isFinite(ageMinutes) ? ageMinutes.toFixed(1) : "unknown"}m, max=${maxAgeMinutes}m`);
  }
  return { blockers, ageMinutes };
}

function playlistDiscoveryBlockers(snapshot, now, maxAgeMinutes, requiredSupports = []) {
  const blockers = [];
  const expectedSupports = [...new Set(requiredSupports.map((support) => canonicalSupportCode(support)).filter(Boolean))].sort();
  if (snapshot?.complete !== true || snapshot?.summary?.complete !== true) blockers.push("playlist discovery snapshot must be complete");
  if (Number(snapshot?.summary?.blockerCount || 0) !== 0) blockers.push(`playlist discovery snapshot blockerCount must be 0, got ${snapshot?.summary?.blockerCount}`);
  if (Number(snapshot?.summary?.supportCount || 0) !== expectedSupports.length) {
    blockers.push(`playlist discovery snapshot supportCount must be ${expectedSupports.length}, got ${snapshot?.summary?.supportCount}`);
  }
  const actualSupports = [...new Set((snapshot?.channels || []).map((row) => canonicalSupportCode(row.supportLang)).filter(Boolean))].sort();
  const missingSupports = expectedSupports.filter((support) => !actualSupports.includes(support));
  const unexpectedSupports = actualSupports.filter((support) => !expectedSupports.includes(support));
  if (missingSupports.length) blockers.push(`playlist discovery is missing selected supports: ${missingSupports.join(",")}`);
  if (unexpectedSupports.length) blockers.push(`playlist discovery has unexpected supports: ${unexpectedSupports.join(",")}`);
  const generatedMillis = Date.parse(snapshot?.generatedAt || "");
  const ageMinutes = Number.isFinite(generatedMillis) ? (now.getTime() - generatedMillis) / 60_000 : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(ageMinutes) || ageMinutes < -5 || ageMinutes > maxAgeMinutes) {
    blockers.push(`playlist discovery snapshot is not fresh enough for apply: age=${Number.isFinite(ageMinutes) ? ageMinutes.toFixed(1) : "unknown"}m, max=${maxAgeMinutes}m`);
  }
  return { blockers, ageMinutes };
}

function resolveCandidatePlaylist({ candidate, ordinaryRegistry, polyglotRegistry, playlistDiscovery }) {
  const assignment = candidate.videoType === "polyglot"
    ? buildPolyglotPlaylistAssignment(candidate)
    : buildPlaylistAssignment(candidate);
  const registryEntry = candidate.videoType === "polyglot"
    ? findPolyglotPlaylistEntry(polyglotRegistry, assignment.key)
    : findPlaylistEntry(ordinaryRegistry, assignment.key);
  const discoveryChannel = findDiscoveryChannel(playlistDiscovery, candidate.supportLang);
  const discovery = resolvePlaylistDiscovery({
    assignment,
    registryEntry,
    discoveryChannel,
    requirePublic: true,
  });
  return {
    ...discovery,
    title: assignment.title,
    description: assignment.description,
    registryEntryPresent: Boolean(registryEntry),
    discoveryGeneratedAt: playlistDiscovery.generatedAt || "",
  };
}

function analyticsCheckpoints(publishAt, hours) {
  const base = Date.parse(publishAt);
  return hours.map((value) => ({ hoursAfterPublish: value, dueAt: new Date(base + value * 3_600_000).toISOString() }));
}

function buildCandidate({ tail, channel, route, channelRegistry }) {
  if (tail.videoType === "polyglot") {
    const targetLangs = (tail.targetLangs || []).map(normalizeCode).filter(Boolean);
    const targetLangsHash = targetHash(targetLangs);
    const requestedContentScope = tail.contentScope || "full";
    const longVideoAllowed = longVideoUploadAllowed(channelRegistry, channel);
    const useShortUnverified = requestedContentScope === "full" && !longVideoAllowed;
    const shortCardLimit = Number(channelRegistry?.defaults?.shortUnverifiedPolyglotCardLimit ?? DEFAULT_SHORT_UNVERIFIED_CARD_LIMIT);
    const candidate = {
      videoType: "polyglot",
      setId: tail.setId,
      supportLang: canonicalSupportCode(tail.supportLang),
      targetLang: targetLangs.join(","),
      targetLangs,
      targetLangsCsv: targetLangs.join(","),
      targetLangsHash,
      bundleKey: tail.bundleKey,
      requestedContentScope,
      contentScope: useShortUnverified ? "short_unverified" : requestedContentScope,
      cardLimit: useShortUnverified ? shortCardLimit : 0,
      maxDurationSeconds: useShortUnverified ? SHORT_UNVERIFIED_MAX_DURATION_SECONDS : 0,
      longVideoUploadAllowed: longVideoAllowed,
      autoFallbackReason: useShortUnverified ? "long_video_upload_not_confirmed" : "",
      channelKey: channel.key,
      youtubeChannelId: channel.channelId,
      youtubeEnvironment: route.githubEnvironment || route.environment || "",
      routeKey: route.key,
    };
    candidate.polyglotKey = ["polyglot", candidate.setId, candidate.supportLang, candidate.bundleKey, targetLangsHash, candidate.contentScope].join(":");
    candidate.assignmentKey = assignmentKey(candidate);
    candidate.calendarAssignmentKey = calendarAssignmentKey(candidate);
    return candidate;
  }
  const candidate = {
    videoType: "ordinary",
    setId: tail.setId,
    supportLang: canonicalSupportCode(tail.supportLang),
    targetLang: normalizeCode(tail.targetLang),
    channelKey: channel.key,
    youtubeChannelId: channel.channelId,
    youtubeEnvironment: route.githubEnvironment || route.environment || "",
    routeKey: route.key,
  };
  candidate.assignmentKey = assignmentKey(candidate);
  candidate.calendarAssignmentKey = calendarAssignmentKey(candidate);
  return candidate;
}

function activePublicationMatchesCandidate(publication, candidate) {
  if (publication?.videoType !== candidate.videoType || publication?.setId !== candidate.setId) return false;
  if (canonicalSupportCode(publication.supportLang) !== candidate.supportLang) return false;
  if (!publication.youtubeVideoId || publication.liveReadbackPresent === false) return false;
  if (/deleted|failed|cancelled/iu.test(String(publication.state || publication.privacyStatus || ""))) return false;
  if (candidate.videoType !== "polyglot") return normalizeCode(publication.targetLang) === candidate.targetLang;
  if (publication.bundleKey && publication.bundleKey !== candidate.bundleKey) return false;
  if (publication.bundleKey) return polyglotProductSlotKey(publication) === polyglotProductSlotKey(candidate);
  return sameTargetList(publication.targetLangs, candidate.targetLangs);
}

function crossScopePublicationMatchesCandidate(publication, candidate) {
  return activePublicationMatchesCandidate(publication, candidate)
    && isPolyglotRow(publication)
    && polyglotContentScope(publication) !== candidate.contentScope;
}

function validateWave(assignments, expectedSupportCount, ordinaryPerChannel, polyglotPerChannel) {
  const blockers = [];
  const expectedOrdinary = expectedSupportCount * ordinaryPerChannel;
  const expectedPolyglot = expectedSupportCount * polyglotPerChannel;
  const ordinaryCount = assignments.filter((row) => row.videoType === "ordinary").length;
  const polyglotCount = assignments.filter((row) => row.videoType === "polyglot").length;
  if (ordinaryCount !== expectedOrdinary) blockers.push(`ordinary assignment count ${ordinaryCount} != ${expectedOrdinary}`);
  if (polyglotCount !== expectedPolyglot) blockers.push(`Polyglot assignment count ${polyglotCount} != ${expectedPolyglot}`);
  const assignmentKeys = assignments.map((row) => row.assignmentKey);
  const slotKeys = assignments.map((row) => row.slotKey);
  if (new Set(assignmentKeys).size !== assignmentKeys.length) blockers.push("campaign contains duplicate assignment keys");
  if (new Set(slotKeys).size !== slotKeys.length) blockers.push("campaign contains duplicate channel publish slots");
  return blockers;
}

function zeroUploadReplacementBlockers(campaign, campaignId) {
  if (!campaign) return [`replacement campaign not found: ${campaignId}`];
  const blockers = [];
  if (campaign.status !== "reconciliation_required") {
    blockers.push(`replacement campaign must be reconciliation_required, got ${campaign.status || "missing"}`);
  }
  const summary = campaign.finalizeSummary || {};
  for (const key of ["completedCount", "observedCount", "artifactCount", "receiptErrorCount"]) {
    if (Number(summary[key] || 0) !== 0) blockers.push(`replacement campaign ${key} must be zero`);
  }
  const assignments = campaign.assignments || [];
  if (!assignments.length) blockers.push("replacement campaign has no assignments");
  if (assignments.some((row) => row.status !== "claimed")) {
    blockers.push("replacement campaign assignments must all remain claimed");
  }
  if (assignments.some((row) => row.youtubeVideoId || row.youtubeVideoUrl)) {
    blockers.push("replacement campaign already contains a YouTube video receipt");
  }
  return blockers;
}

export function buildPublicationCampaign(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const setId = options.setId;
  if (!setId) throw new Error("setId is required");
  const ordinaryPerChannel = Number(options.ordinaryPerChannel ?? 5);
  const polyglotPerChannel = Number(options.polyglotPerChannel ?? 1);
  const maxSnapshotAgeMinutes = Number(options.maxSnapshotAgeMinutes ?? 30);
  const minFutureMinutes = Number(options.minFutureMinutes ?? 90);
  if (!Number.isInteger(ordinaryPerChannel) || ordinaryPerChannel < 0) throw new Error("ordinaryPerChannel must be a non-negative integer");
  if (!Number.isInteger(polyglotPerChannel) || polyglotPerChannel < 0) throw new Error("polyglotPerChannel must be a non-negative integer");

  const paths = {
    snapshot: options.snapshotPath || "config/youtube-publication-snapshot.json",
    calendar: options.calendarPath || "config/youtube-publish-calendar.json",
    campaignRegistry: options.campaignRegistryPath || "config/youtube-publication-campaigns.json",
    policy: options.policyPath || "config/youtube-publish-schedule-policy.json",
    routing: options.routingPath || "config/youtube-api-project-routing.json",
    channels: options.channelsPath || "config/youtube-channels.json",
    covers: options.coverRegistryPath || "config/youtube-cover-assets.json",
    deckSources: options.deckSourcesPath || "data/deck-sources.json",
    offlineDeck: options.offlineDeckPath || `data/decks/${setId}.json`,
    ordinaryPlaylists: options.ordinaryPlaylistRegistryPath || "config/youtube-playlists.json",
    polyglotPlaylists: options.polyglotPlaylistRegistryPath || "config/youtube-polyglot-playlists.json",
    playlistDiscovery: options.playlistDiscoveryPath || "config/youtube-playlist-discovery-snapshot.json",
  };
  const snapshot = readJson(paths.snapshot);
  const deck = exactDeck(snapshot, setId);
  const calendar = readJson(paths.calendar, { schemaVersion: 1, reservations: [] });
  const campaignRegistry = readJson(paths.campaignRegistry, { schemaVersion: 1, campaigns: [] });
  const replacementCampaignId = String(options.replacementCampaignId || "").trim();
  const replacementCampaign = replacementCampaignId
    ? (campaignRegistry.campaigns || []).find((row) => row.campaignId === replacementCampaignId)
    : null;
  const replacementBlockers = replacementCampaignId
    ? zeroUploadReplacementBlockers(replacementCampaign, replacementCampaignId)
    : [];
  const planningCalendar = replacementCampaign
    ? {
        ...calendar,
        reservations: (calendar.reservations || []).map((row) => row.campaignId === replacementCampaignId
          ? { ...row, status: "superseded_zero_upload_recovery_preview" }
          : row),
      }
    : calendar;
  const planningCampaignRegistry = replacementCampaign
    ? {
        ...campaignRegistry,
        campaigns: (campaignRegistry.campaigns || []).map((row) => row.campaignId === replacementCampaignId
          ? { ...row, status: "superseded_zero_upload_recovery_preview" }
          : row),
      }
    : campaignRegistry;
  const policy = readJson(paths.policy);
  const ordinaryPlaylistRegistry = readJson(paths.ordinaryPlaylists, { schemaVersion: 1, playlists: [] });
  const polyglotPlaylistRegistry = readJson(paths.polyglotPlaylists, { schemaVersion: 1, playlists: [] });
  const playlistDiscoveryExists = fs.existsSync(paths.playlistDiscovery);
  const playlistDiscovery = readJson(paths.playlistDiscovery, {
    schemaVersion: 1,
    generatedAt: "",
    complete: false,
    summary: { complete: false, blockerCount: 1, supportCount: 0 },
    channels: [],
  });
  const routing = loadCanonicalSupportRouting({ routingPath: paths.routing, channelsPath: paths.channels });
  assertCanonicalSupportCount(routing, 51);
  const supports = resolveCanonicalSupports({ requested: options.supports || "ALL", routing });
  const coverInventory = loadApprovedCovers(paths.covers);
  const deckSources = readJson(paths.deckSources, {});
  const driveFileId = String(deckSources[setId] || "").trim();
  const offlineDeckExists = fs.existsSync(paths.offlineDeck);
  const offlineDeckTracked = offlineDeckExists && isGitTracked(paths.offlineDeck);
  const driveDeckConfigured = Boolean(driveFileId && driveFileId !== "YOUR_GOOGLE_DRIVE_FILE_ID_HERE");
  const historicalDeckSource = !offlineDeckTracked
    ? historicalGitBlobSource(paths.offlineDeck, options.historicalDeckBlob)
    : { available: false, matchesLocalFile: false, commit: "", blobId: "", localBlobId: "" };
  const claims = campaignClaimSets(planningCampaignRegistry);
  const cardCount = deckCardCount({ offlineDeckPath: paths.offlineDeck, historicalDeckSource });
  const freshness = snapshotBlockers(deck, snapshot.generatedAt, now, maxSnapshotAgeMinutes);
  const blockers = [...freshness.blockers, ...replacementBlockers];
  const warnings = [];
  if (!playlistDiscoveryExists) blockers.push(`route-authenticated playlist discovery snapshot is missing: ${paths.playlistDiscovery}`);
  const playlistFreshness = playlistDiscoveryExists
    ? playlistDiscoveryBlockers(playlistDiscovery, now, maxSnapshotAgeMinutes, supports)
    : { blockers: [], ageMinutes: Number.POSITIVE_INFINITY };
  blockers.push(...playlistFreshness.blockers);
  const playlistDiscoveryReady = playlistDiscoveryExists && playlistFreshness.blockers.length === 0;
  if (!offlineDeckExists && !historicalDeckSource.available) {
    blockers.push(`${setId}: immutable campaign planning requires a local offline deck fingerprint at ${paths.offlineDeck}`);
  } else if (!offlineDeckTracked && !driveDeckConfigured && !historicalDeckSource.available) {
    blockers.push(`${setId}: offline deck is not Git-tracked and no verified Drive source is configured`);
  }

  const tailsBySupport = new Map();
  for (const support of supports) {
    tailsBySupport.set(support, {
      ordinary: (deck.tails || []).filter((row) => row.videoType === "ordinary" && canonicalSupportCode(row.supportLang) === support),
      polyglot: (deck.tails || []).filter((row) => row.videoType === "polyglot" && canonicalSupportCode(row.supportLang) === support && (row.contentScope || "full") === "full"),
    });
  }

  const selected = [];
  for (const support of supports) {
    const channel = routing.supportToChannel.get(support);
    const route = routing.supportToRoute.get(support);
    const tails = tailsBySupport.get(support);
    const ordinary = tails.ordinary
      .map((tail) => buildCandidate({ tail, channel, route, channelRegistry: routing.channelRegistry }))
      .filter((candidate) => !claims.assignments.has(candidate.assignmentKey))
      .slice(0, ordinaryPerChannel);
    const polyglotCandidates = tails.polyglot
      .map((tail) => buildCandidate({ tail, channel, route, channelRegistry: routing.channelRegistry }));
    const polyglot = polyglotCandidates
      .filter((candidate) => !claims.assignments.has(candidate.assignmentKey))
      .filter((candidate) => !claims.polyglotProducts.has(polyglotProductSlotKey(candidate)))
      .filter((candidate) => !deck.publications.some((publication) => activePublicationMatchesCandidate(publication, candidate)))
      .slice(0, polyglotPerChannel);
    for (const candidate of polyglot) {
      const conflicting = deck.publications.find((publication) => crossScopePublicationMatchesCandidate(publication, candidate));
      if (conflicting) {
        blockers.push(`${support}: ${candidate.bundleKey} ${candidate.contentScope} is blocked by active ${polyglotContentScope(conflicting)} Polyglot video ${conflicting.youtubeVideoId || "without durable ID"}`);
      }
    }
    if (ordinary.length !== ordinaryPerChannel) blockers.push(`${support}: only ${ordinary.length}/${ordinaryPerChannel} unclaimed ordinary tails available`);
    if (polyglot.length !== polyglotPerChannel) blockers.push(`${support}: only ${polyglot.length}/${polyglotPerChannel} unclaimed full Polyglot tails available`);
    selected.push(...ordinary, ...polyglot);
  }

  const baseOccupiedSlotKeys = new Set((planningCalendar.reservations || []).filter(isActiveCalendarReservation).map(slotKey));
  for (const key of claims.slots) baseOccupiedSlotKeys.add(key);
  const plannedSlotKeys = new Set();
  const minPublishMillis = now.getTime() + minFutureMinutes * 60_000;
  const requestedStartDate = options.startDate || "";
  const assignments = [];
  for (const candidate of selected) {
    const channel = routing.supportToChannel.get(candidate.supportLang);
    const perChannelPolicy = channelPolicy(policy, channel.key);
    const firstSafeLocalDate = ymdInZone(new Date(minPublishMillis), perChannelPolicy.timeZone);
    const baseDate = effectiveScheduleStartDate({
      automaticStartDate: firstSafeLocalDate,
      requestedStartDate,
      fillEarliest: perChannelPolicy.fillEarliestAvailable,
    });
    const slot = findFreeSlot({
      channelKey: channel.key,
      perChannelPolicy,
      baseDate,
      baseOccupiedSlotKeys,
      plannedSlotKeys,
      preferredFreeOrdinal: null,
      minPublishMillis,
      fillDayGaps: perChannelPolicy.fillEarliestAvailable,
    });
    const candidateSlotKey = slotKey({ channelKey: channel.key, publishAt: slot.publishAt });
    plannedSlotKeys.add(candidateSlotKey);
    const cover = resolveCoverReadiness({ candidate, channel, covers: coverInventory.covers });
    if (!cover.ready) blockers.push(`${candidate.assignmentKey}: ${cover.reason}`);
    const playlist = playlistDiscoveryReady
      ? resolveCandidatePlaylist({
        candidate,
        ordinaryRegistry: ordinaryPlaylistRegistry,
        polyglotRegistry: polyglotPlaylistRegistry,
        playlistDiscovery,
      })
      : {
        ready: false,
        state: "blocked",
        playlistKey: "",
        youtubePlaylistId: "",
        createAllowed: false,
        blockers: ["global playlist discovery preflight is not ready"],
        warnings: [],
        discoveryGeneratedAt: playlistDiscovery.generatedAt || "",
      };
    if (playlistDiscoveryReady) {
      for (const blocker of playlist.blockers || []) blockers.push(`${candidate.assignmentKey}: ${blocker}`);
      for (const warning of playlist.warnings || []) warnings.push(`${candidate.assignmentKey}: ${warning}`);
    }
    assignments.push({
      ...candidate,
      publishAt: slot.publishAt,
      requestedStartDate: requestedStartDate || "auto",
      effectiveStartDate: baseDate,
      timeZone: slot.timeZone,
      localDate: slot.localDate,
      localTime: slot.localTime,
      localSlotIndex: slot.localSlotIndex,
      slotKey: candidateSlotKey,
      analyticsCheckpointsAt: analyticsCheckpoints(slot.publishAt, perChannelPolicy.performanceCheckpointsHours),
      thumbnail: cover,
      playlist,
    });
  }

  blockers.push(...validateWave(assignments, supports.length, ordinaryPerChannel, polyglotPerChannel));
  blockers.push(...validateResolvedPlaylistIdentities(assignments));
  const routeCounts = Object.fromEntries(routing.projects.map((route) => [route.key, assignments.filter((row) => row.routeKey === route.key).length]));
  const metadataRouteBatchCount = Object.values(routeCounts)
    .reduce((total, count) => total + Math.ceil(count / 5), 0);
  const metadataVectorEngineMaximumAttempts = Object.values(routeCounts)
    .reduce((total, count) => total + Math.floor(count / 5) * 3 + Math.ceil((count % 5) / 2), 0);
  const ordinaryTtsRequestsPerSupportMaximum = cardCount === null
    ? null
    : cardCount * (ordinaryPerChannel + 1) + ordinaryPerChannel + 1;
  const ordinaryTtsRequestsMaximum = ordinaryTtsRequestsPerSupportMaximum === null
    ? null
    : ordinaryTtsRequestsPerSupportMaximum * supports.length;
  const polyglotTtsRequestsMaximum = cardCount === null
    ? null
    : assignments.filter((row) => row.videoType === "polyglot")
      .reduce((total, row) => total + 2 + cardCount * (row.targetLangs.length + 1), 0);
  const customThumbnailCount = assignments.filter((row) => row.thumbnail.mode === "custom").length;
  const unavailableDeclaredCoverManifests = coverInventory.manifestReadiness
    .filter((manifest) => !manifest.exists || !manifest.tracked)
    .filter((manifest) => assignments.some((assignment) => (
      assignment.thumbnail.mode === "custom" && manifestAppliesToCandidate(manifest, assignment)
    )));
  for (const manifest of unavailableDeclaredCoverManifests) {
    blockers.push(`declared approved cover manifest is unavailable for this campaign: ${manifest.id || manifest.path} (${!manifest.exists ? "missing" : "not_git_tracked"})`);
  }
  const playlistCreateCount = assignments.filter((row) => row.playlist.state === "verified_absent" && row.playlist.createAllowed).length;
  const playlistCreateCountMaximum = playlistDiscoveryReady ? playlistCreateCount : assignments.length;
  const existingPlaylistCount = assignments.filter((row) => row.playlist.state === "resolved_existing" && row.playlist.youtubePlaylistId).length;
  const estimatedVideoUploadCalls = assignments.length;
  const estimatedPlaylistItemInsertUnits = assignments.length * 50;
  const estimatedPlaylistCreateUnitsMaximum = playlistCreateCountMaximum * 50;
  const estimatedThumbnailSetUnits = customThumbnailCount * 50;
  const estimatedGeneralQuotaUnitsMaximum =
    estimatedPlaylistItemInsertUnits + estimatedPlaylistCreateUnitsMaximum + estimatedThumbnailSetUnits;
  const byRoute = Object.fromEntries(routing.projects.map((route) => {
    const rows = assignments.filter((row) => row.routeKey === route.key);
    const customCount = rows.filter((row) => row.thumbnail.mode === "custom").length;
    const routePlaylistCreateCount = playlistDiscoveryReady
      ? rows.filter((row) => row.playlist.state === "verified_absent" && row.playlist.createAllowed).length
      : rows.length;
    const generalMaximum = rows.length * 50 + routePlaylistCreateCount * 50 + customCount * 50;
    return [route.key, {
      estimatedVideoUploadCalls: rows.length,
      estimatedPlaylistItemInsertUnits: rows.length * 50,
      estimatedPlaylistCreateUnitsMaximum: routePlaylistCreateCount * 50,
      estimatedThumbnailSetUnits: customCount * 50,
      estimatedGeneralQuotaUnitsMaximum: generalMaximum,
      estimatedQuotaUnitsMaximum: rows.length + generalMaximum,
    }];
  }));
  for (const [routeKey, usage] of Object.entries(byRoute)) {
    if (usage.estimatedVideoUploadCalls > 100) {
      blockers.push(`${routeKey}: ${usage.estimatedVideoUploadCalls} video uploads exceed the default 100-call videos.insert bucket`);
    }
    if (usage.estimatedGeneralQuotaUnitsMaximum > 10_000) {
      blockers.push(`${routeKey}: estimated general quota maximum ${usage.estimatedGeneralQuotaUnitsMaximum} exceeds the default 10000-unit pool`);
    }
  }
  const sourceFingerprints = Object.fromEntries(Object.entries(paths).map(([key, filePath]) => [
    key,
    fileFingerprint(filePath, { optional: key === "campaignRegistry" || key === "offlineDeck" || key === "playlistDiscovery" }),
  ]));
  const core = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    mode: "read_only_no_spend_plan",
    setId,
    inputs: {
      supports: supports.join(","),
      supportCount: supports.length,
      ordinaryPerChannel,
      polyglotPerChannel,
      startDate: requestedStartDate || "auto",
      minFutureMinutes,
      maxSnapshotAgeMinutes,
      ...(replacementCampaignId ? { replacementCampaignId } : {}),
    },
    evidence: {
      snapshotGeneratedAt: snapshot.generatedAt,
      snapshotAgeMinutes: freshness.ageMinutes,
      playlistDiscoveryGeneratedAt: playlistDiscovery.generatedAt || "",
      playlistDiscoveryAgeMinutes: playlistFreshness.ageMinutes,
      deckSource: {
        mode: offlineDeckTracked
          ? "git_offline_json"
          : (driveDeckConfigured
            ? "verified_drive_with_local_fingerprint"
            : (historicalDeckSource.available ? "historical_git_blob" : "local_untracked")),
        driveFileIdConfigured: driveDeckConfigured,
        offlineDeckExists,
        offlineDeckTracked,
        historicalGitBlob: historicalDeckSource,
      },
      ...(replacementCampaignId ? {
        replacementCampaign: {
          campaignId: replacementCampaignId,
          manifestHash: replacementCampaign?.manifestHash || "",
          status: replacementCampaign?.status || "missing",
          assignmentCount: replacementCampaign?.assignments?.length || 0,
          finalizeSummary: replacementCampaign?.finalizeSummary || null,
        },
      } : {}),
      sourceFingerprints,
    },
    summary: {
      applyReady: blockers.length === 0,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      supportCount: supports.length,
      ordinaryCount: assignments.filter((row) => row.videoType === "ordinary").length,
      polyglotCount: assignments.filter((row) => row.videoType === "polyglot").length,
      fullPolyglotCount: assignments.filter((row) => row.videoType === "polyglot" && row.contentScope === "full").length,
      shortUnverifiedPolyglotCount: assignments.filter((row) => row.videoType === "polyglot" && row.contentScope === "short_unverified").length,
      assignmentCount: assignments.length,
      firstPublishAt: assignments.map((row) => row.publishAt).sort()[0] || "",
      lastPublishAt: assignments.map((row) => row.publishAt).sort().at(-1) || "",
      customThumbnailCount,
      automaticThumbnailCount: assignments.length - customThumbnailCount,
      existingPlaylistCount,
      playlistCreateCount,
      playlistCreateCountMaximum,
      routeCounts,
    },
    estimatedUsage: {
      estimatedVideoUploadCalls,
      estimatedPlaylistItemInsertUnits,
      estimatedPlaylistCreateUnitsMaximum,
      estimatedThumbnailSetUnits,
      estimatedGeneralQuotaUnitsMaximum,
      estimatedQuotaUnitsMaximum: estimatedVideoUploadCalls + estimatedGeneralQuotaUnitsMaximum,
      byRoute,
      directGeminiRequestsCurrentWorkerLayout:
        supports.length * (Math.ceil(ordinaryPerChannel / 5) + polyglotPerChannel),
      directGeminiRequestsCampaignRouteBatchSize5: metadataRouteBatchCount,
      directGeminiRequestsCampaignWideBatchSize5: Math.ceil(assignments.length / 5),
      metadataProviderOrder: ["openai_gpt_5_4", "direct_gemini_key_1", "direct_gemini_key_2", "vectorengine_confirmed"],
      metadataBatchSize: 5,
      metadataLogicalBatchCount: metadataRouteBatchCount,
      metadataMaximumOpenAiAttempts: metadataRouteBatchCount,
      metadataMaximumDirectGeminiAttempts: metadataRouteBatchCount * 2,
      metadataMaximumVectorEngineAttempts: metadataVectorEngineMaximumAttempts,
      metadataMaximumProviderAttempts: metadataRouteBatchCount * 3 + metadataVectorEngineMaximumAttempts,
      renderJobCount: assignments.length,
      ttsSynthesisRequestEstimate: cardCount === null ? {
        mode: "unavailable_without_uniform_immutable_deck_card_count",
      } : {
        mode: "cache_aware_upper_bound",
        cardCount,
        ordinaryRequestsPerSupportMaximum: ordinaryTtsRequestsPerSupportMaximum,
        ordinaryRequestsMaximum: ordinaryTtsRequestsMaximum,
        polyglotRequestsMaximum: polyglotTtsRequestsMaximum,
        totalRequestsMaximum: ordinaryTtsRequestsMaximum + polyglotTtsRequestsMaximum,
        note: "Short Polyglot card count is duration-measured at render time; this is an upper bound because audio is prepared before final prefix selection.",
      },
      providerCallsDuringPlan: 0,
      youtubeWritesDuringPlan: 0,
    },
    blockers,
    warnings,
    assignments,
  };
  const identityHash = sha256Json({ setId, inputs: core.inputs, evidence: core.evidence, assignments });
  const campaignId = `yt-${setId}-${(requestedStartDate || now.toISOString().slice(0, 10))}-${identityHash.slice(0, 12)}`;
  const manifest = { ...core, campaignId };
  manifest.manifestHash = sha256Json(manifest);
  return manifest;
}

export function verifyCampaignManifest(manifest) {
  const expected = manifest.manifestHash;
  const withoutHash = { ...manifest };
  delete withoutHash.manifestHash;
  const actual = sha256Json(withoutHash);
  if (!expected || expected !== actual) throw new Error(`Campaign manifest hash mismatch: expected=${expected || "missing"} actual=${actual}`);
  return actual;
}

export function verifyManifestSourceFingerprints(manifest) {
  const mismatches = [];
  for (const [key, fingerprint] of Object.entries(manifest.evidence?.sourceFingerprints || {})) {
    const current = fileFingerprint(fingerprint.path, {
      optional: !fingerprint.exists || key === "campaignRegistry" || key === "offlineDeck",
    });
    if (current.exists !== fingerprint.exists || current.sha256 !== fingerprint.sha256) {
      mismatches.push({ key, planned: fingerprint, current });
    }
  }
  return mismatches;
}

export function isCampaignStatusActive(status) {
  return ACTIVE_CAMPAIGN_STATUSES.has(String(status || "").toLowerCase());
}

export { fileFingerprint, sha256Json };
