#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { sha256Json, verifyCampaignManifest } from "./lib/youtube-publication-campaign.mjs";
import {
  assignmentKey,
  calendarAssignmentKey,
  polyglotProductSlotKey,
} from "./lib/youtube-publication-control.mjs";
import {
  channelPolicy,
  findFreeSlot,
  isActiveCalendarReservation,
  slotKey,
  ymdInZone,
} from "./plan-youtube-publish-schedule.mjs";

const CONFIRM = "CREATE_PARTIAL_YOUTUBE_RECOVERY_CAMPAIGN";
const SHORT_MAX_SECONDS = 895;

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    channels: "config/youtube-channels.json",
    policy: "config/youtube-publish-schedule-policy.json",
    plansDir: "config/youtube-publication-campaign-plans",
    minFutureMinutes: 90,
    maxEvidenceAgeMinutes: 30,
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value();
    else if (arg === "--assignment-keys-file" || arg.startsWith("--assignment-keys-file=")) options.assignmentKeysFile = value();
    else if (arg === "--polyglot-scope-upgrades-file" || arg.startsWith("--polyglot-scope-upgrades-file=")) options.polyglotScopeUpgradesFile = value();
    else if (arg === "--polyglot-scope-downgrades-file" || arg.startsWith("--polyglot-scope-downgrades-file=")) options.polyglotScopeDowngradesFile = value();
    else if (arg === "--control-reports" || arg.startsWith("--control-reports=")) options.controlReports = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
    else if (arg === "--policy" || arg.startsWith("--policy=")) options.policy = value();
    else if (arg === "--plans-dir" || arg.startsWith("--plans-dir=")) options.plansDir = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--generated-at" || arg.startsWith("--generated-at=")) options.generatedAt = value();
    else if (arg === "--min-future-minutes" || arg.startsWith("--min-future-minutes=")) options.minFutureMinutes = Number(value());
    else if (arg === "--max-evidence-age-minutes" || arg.startsWith("--max-evidence-age-minutes=")) options.maxEvidenceAgeMinutes = Number(value());
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalSupports(csv) {
  return [...new Set(String(csv || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))].sort();
}

function channelForSupport(channels, support) {
  return (channels.channels || []).find((row) => (row.supportLangs || []).includes(support));
}

function validateRouteReport(report, expectedSetId, selectedRows, now, maxAgeMinutes) {
  assert(report.setId === expectedSetId, `control report set mismatch: ${report.setId}`);
  const selectedSupports = new Set(selectedRows.map((row) => row.supportLang));
  const scopedBlockers = (report.blockers || []).filter((blocker) => !blocker.supportLang || selectedSupports.has(blocker.supportLang));
  assert(scopedBlockers.length === 0, `control report has selected-support or global blockers: ${scopedBlockers.map((blocker) => blocker.type || "unknown").join(",")}`);
  assert(report.summary?.liveAuditPaginationComplete === true, "control report pagination is incomplete");
  assert(report.evidence?.videoStatusReadback === true, "control report video status readback is incomplete");
  const generatedAt = Date.parse(report.generatedAt || report.evidence?.liveAuditGeneratedAt || "");
  const ageMinutes = Number.isFinite(generatedAt) ? (now.getTime() - generatedAt) / 60_000 : Number.POSITIVE_INFINITY;
  assert(ageMinutes >= -5 && ageMinutes <= maxAgeMinutes, `control report is stale: ${ageMinutes.toFixed(1)}m`);
  for (const row of selectedRows) {
    if (row.videoType === "ordinary") {
      const collision = (report.publications || []).find((publication) =>
        publication.youtubeVideoId
        && assignmentKey(publication) === row.assignmentKey);
      assert(!collision, `${row.supportLang} -> ${row.targetLang}: ordinary assignment already exists live as ${collision?.youtubeVideoId}`);
      const tail = (report.tails || []).find((candidate) =>
        candidate.videoType === "ordinary"
        && candidate.supportLang === row.supportLang
        && candidate.targetLang === row.targetLang);
      assert(tail, `${row.supportLang} -> ${row.targetLang}: expected ordinary tail is absent from control report`);
      continue;
    }
    const collision = (report.publications || []).find((publication) =>
      publication.youtubeVideoId
      && polyglotProductSlotKey(publication) === polyglotProductSlotKey(row));
    assert(!collision, `${row.supportLang}: Polyglot product slot already exists live as ${collision?.youtubeVideoId}`);
    const tail = (report.tails || []).find((candidate) =>
      candidate.videoType === "polyglot"
      && candidate.supportLang === row.supportLang
      && candidate.bundleKey === row.bundleKey
      && (candidate.contentScope || "full") === "full");
    assert(tail, `${row.supportLang}: expected full Polyglot tail is absent from control report`);
  }
  return {
    generatedAt: new Date(generatedAt).toISOString(),
    ageMinutes,
    selectedBlockerCount: scopedBlockers.length,
    ignoredUnrelatedBlockerCount: (report.blockers || []).length - scopedBlockers.length,
  };
}

function campaignAssignment(row) {
  return {
    assignmentKey: row.assignmentKey,
    calendarAssignmentKey: row.calendarAssignmentKey,
    videoType: row.videoType,
    setId: row.setId,
    supportLang: row.supportLang,
    targetLang: row.targetLang || "",
    targetLangs: row.targetLangs || [],
    targetLangsHash: row.targetLangsHash || "",
    bundleKey: row.bundleKey || "",
    contentScope: row.contentScope || "",
    polyglotKey: row.polyglotKey || "",
    channelKey: row.channelKey,
    youtubeChannelId: row.youtubeChannelId,
    routeKey: row.routeKey,
    youtubeEnvironment: row.youtubeEnvironment,
    publishAt: row.publishAt,
    localDate: row.localDate,
    localTime: row.localTime,
    timeZone: row.timeZone,
    slotKey: row.slotKey,
    thumbnail: row.thumbnail,
    playlist: row.playlist,
    status: "claimed",
  };
}

export function buildPartialRecovery({ registry, calendar, channels, policy, controlReports, campaignId, supports, assignmentKeys = [], polyglotScopeUpgrades = {}, polyglotScopeDowngrades = {}, now = new Date(), minFutureMinutes = 90, maxEvidenceAgeMinutes = 30 }) {
  const oldCampaign = (registry.campaigns || []).find((row) => row.campaignId === campaignId);
  assert(oldCampaign, `campaign not found: ${campaignId}`);
  const scopeChangeRequested = Object.keys(polyglotScopeUpgrades || {}).length > 0 || Object.keys(polyglotScopeDowngrades || {}).length > 0;
  const unlaunchedClaimedScopeChange = oldCampaign.status === "claimed" && scopeChangeRequested;
  assert(oldCampaign.status === "reconciliation_required" || unlaunchedClaimedScopeChange, `campaign must be reconciliation_required, or an unlaunched claimed campaign with an explicit scope change, got ${oldCampaign.status}`);
  if (unlaunchedClaimedScopeChange) {
    assert(!oldCampaign.finalizedAt && !oldCampaign.finalizeSummary && !oldCampaign.githubRunId && !oldCampaign.dispatchRunId, `${campaignId}: claimed scope change requires no campaign dispatch/finalizer evidence`);
    assert((oldCampaign.assignments || []).every((row) => row.status === "claimed" && !row.youtubeVideoId && !row.youtubeVideoUrl), `${campaignId}: claimed scope change requires every source assignment to remain unaccepted`);
  }
  const requestedKeys = [...new Set(assignmentKeys.map(String).map((value) => value.trim()).filter(Boolean))].sort();
  let selectedOldRows;
  if (requestedKeys.length > 0) {
    selectedOldRows = requestedKeys.map((key) => {
      const matches = (oldCampaign.assignments || []).filter((row) => row.assignmentKey === key);
      assert(matches.length === 1, `${key}: expected exactly one source assignment, got ${matches.length}`);
      const row = matches[0];
      assert(!row.youtubeVideoId, `${key}: source assignment already has YouTube video ${row.youtubeVideoId}`);
      assert(!String(row.status || "").includes("superseded"), `${key}: source assignment is already superseded`);
      assert((oldCampaign.assignmentKeys || []).includes(key), `${key}: source assignment is no longer actively claimed`);
      return row;
    });
  } else {
    const legacySupports = canonicalSupports(supports);
    assert(legacySupports.length > 0, "--supports is empty and no assignment keys were provided");
    selectedOldRows = legacySupports.map((support) => {
      const matches = (oldCampaign.assignments || []).filter((row) =>
        row.supportLang === support
        && row.videoType === "polyglot"
        && !row.youtubeVideoId
        && !String(row.status || "").includes("superseded"));
      assert(matches.length === 1, `${support}: expected exactly one missing Polyglot assignment, got ${matches.length}`);
      assert((oldCampaign.assignmentKeys || []).includes(matches[0].assignmentKey), `${support}: original assignment is no longer actively claimed by the source campaign`);
      return matches[0];
    });
  }
  const selectedSupports = [...new Set(selectedOldRows.map((row) => row.supportLang))].sort();
  const scopeUpgrades = Object.fromEntries(Object.entries(polyglotScopeUpgrades || {}).map(([key, value]) => [String(key).trim(), String(value).trim()]));
  const scopeDowngrades = Object.fromEntries(Object.entries(polyglotScopeDowngrades || {}).map(([key, value]) => [String(key).trim(), String(value).trim()]));
  const selectedOldKeySet = new Set(selectedOldRows.map((row) => row.assignmentKey));
  for (const [key, scope] of Object.entries(scopeUpgrades)) {
    assert(selectedOldKeySet.has(key), `${key}: scope upgrade is not an explicitly selected source assignment`);
    const row = selectedOldRows.find((candidate) => candidate.assignmentKey === key);
    assert(row.videoType === "polyglot", `${key}: only Polyglot assignments can receive a scope upgrade`);
    assert((row.contentScope || "full") === "short_unverified", `${key}: only short_unverified assignments can upgrade to full`);
    assert(scope === "full", `${key}: supported Polyglot scope upgrade is short_unverified -> full`);
  }
  for (const [key, scope] of Object.entries(scopeDowngrades)) {
    assert(selectedOldKeySet.has(key), `${key}: scope downgrade is not an explicitly selected source assignment`);
    const row = selectedOldRows.find((candidate) => candidate.assignmentKey === key);
    assert(row.videoType === "polyglot", `${key}: only Polyglot assignments can receive a scope downgrade`);
    assert((row.contentScope || "full") === "full", `${key}: only full assignments can downgrade to short_unverified`);
    assert(row.status === "claimed", `${key}: full -> short_unverified requires an unaccepted claimed source assignment`);
    assert(!row.youtubeVideoId && !row.youtubeVideoUrl, `${key}: full -> short_unverified requires no accepted YouTube video`);
    assert(scope === "short_unverified", `${key}: supported Polyglot scope downgrade is full -> short_unverified`);
  }
  const routeReports = new Map();
  for (const report of controlReports) {
    const routes = [...new Set(selectedOldRows.filter((row) => (report.supports || []).includes(row.supportLang)).map((row) => row.routeKey))];
    for (const route of routes) routeReports.set(route, report);
  }
  const evidence = [];
  for (const routeKey of [...new Set(selectedOldRows.map((row) => row.routeKey))]) {
    const rows = selectedOldRows.filter((row) => row.routeKey === routeKey);
    const report = routeReports.get(routeKey);
    assert(report, `${routeKey}: matching control report is missing`);
    evidence.push({ routeKey, ...validateRouteReport(report, oldCampaign.setId, rows, now, maxEvidenceAgeMinutes) });
  }

  const selectedOldKeys = new Set(selectedOldRows.map((row) => row.assignmentKey));
  const selectedOldCalendarKeys = new Set(selectedOldRows.map((row) => row.calendarAssignmentKey));
  const selectedOldSlotKeys = new Set(selectedOldRows.map((row) => row.slotKey));
  const ownedClaims = (calendar.reservations || []).filter((row) => row.campaignId === campaignId && isActiveCalendarReservation(row));
  for (const row of selectedOldRows) {
    const claim = ownedClaims.find((candidate) => calendarAssignmentKey(candidate) === row.calendarAssignmentKey);
    assert(claim && claim.publishAt === row.publishAt, `${row.supportLang}: original calendar claim is missing or mismatched`);
  }

  const occupied = new Set((calendar.reservations || [])
    .filter(isActiveCalendarReservation)
    .filter((row) => !(row.campaignId === campaignId && selectedOldCalendarKeys.has(calendarAssignmentKey(row))))
    .map(slotKey));
  const plannedSlots = new Set();
  const minPublishMillis = now.getTime() + minFutureMinutes * 60_000;
  const assignments = [];
  for (const oldRow of selectedOldRows.sort((a, b) =>
    a.supportLang.localeCompare(b.supportLang)
    || a.videoType.localeCompare(b.videoType)
    || String(a.targetLang || a.bundleKey).localeCompare(String(b.targetLang || b.bundleKey)))) {
    const channel = channelForSupport(channels, oldRow.supportLang);
    assert(channel, `${oldRow.supportLang}: channel config is missing`);
    const longAllowed = channel.longVideoUploadAllowed === true;
    const contentScope = oldRow.videoType === "polyglot"
      ? (scopeUpgrades[oldRow.assignmentKey] || scopeDowngrades[oldRow.assignmentKey] || oldRow.contentScope || "full")
      : "";
    const customThumbnailAllowed = channel.customThumbnailUploadAllowed === true;
    const carryForwardCustomThumbnail = customThumbnailAllowed
      && oldRow.thumbnail?.mode === "custom"
      && oldRow.thumbnail?.ready === true
      && oldRow.thumbnail?.path
      && oldRow.thumbnail?.manifestPath
      && oldRow.thumbnail?.sha256;
    if (customThumbnailAllowed) {
      assert(carryForwardCustomThumbnail, `${oldRow.supportLang}: partial recovery requires the exact approved source-campaign custom cover`);
    }
    const row = {
      ...oldRow,
      contentScope,
      cardLimit: oldRow.videoType === "polyglot" ? 0 : oldRow.cardLimit,
      maxDurationSeconds: oldRow.videoType === "polyglot"
        ? (contentScope === "short_unverified" || !longAllowed ? SHORT_MAX_SECONDS : 0)
        : oldRow.maxDurationSeconds,
      longVideoUploadAllowed: oldRow.videoType === "polyglot" ? longAllowed : oldRow.longVideoUploadAllowed,
      thumbnail: carryForwardCustomThumbnail
        ? structuredClone(oldRow.thumbnail)
        : { mode: "first_frame_auto", ready: true, reason: "custom_thumbnail_disabled_for_channel" },
      youtubeVideoId: undefined,
      youtubeVideoUrl: undefined,
      status: "planned",
    };
    row.polyglotKey = row.videoType === "polyglot"
      ? ["polyglot", row.setId, row.supportLang, row.bundleKey, row.targetLangsHash, contentScope].join(":")
      : "";
    row.assignmentKey = assignmentKey(row);
    row.calendarAssignmentKey = calendarAssignmentKey(row);
    const perChannelPolicy = channelPolicy(policy, channel.key);
    const startDate = ymdInZone(new Date(minPublishMillis), perChannelPolicy.timeZone);
    const slot = findFreeSlot({
      channelKey: channel.key,
      perChannelPolicy,
      baseDate: startDate,
      baseOccupiedSlotKeys: occupied,
      plannedSlotKeys: plannedSlots,
      preferredFreeOrdinal: null,
      minPublishMillis,
      fillDayGaps: perChannelPolicy.fillEarliestAvailable,
    });
    row.publishAt = slot.publishAt;
    row.timeZone = slot.timeZone;
    row.localDate = slot.localDate;
    row.localTime = slot.localTime;
    row.localSlotIndex = slot.localSlotIndex;
    row.slotKey = slotKey({ channelKey: channel.key, publishAt: slot.publishAt });
    plannedSlots.add(row.slotKey);
    assignments.push(row);
  }

  const generatedAt = now.toISOString();
  const routeCounts = Object.fromEntries(["youtube-1", "youtube-2", "youtube-3", "youtube-4"].map((route) => [route, assignments.filter((row) => row.routeKey === route).length]));
  const customThumbnailCount = assignments.filter((row) => row.thumbnail?.mode === "custom").length;
  const playlistCreateCount = assignments.filter((row) => row.playlist?.state === "verified_absent").length;
  const ordinaryCount = assignments.filter((row) => row.videoType === "ordinary").length;
  const polyglotCount = assignments.filter((row) => row.videoType === "polyglot").length;
  const ordinaryCountsBySupport = selectedSupports.map((support) => assignments.filter((row) => row.supportLang === support && row.videoType === "ordinary").length);
  const estimatedUsage = {
    estimatedVideoUploadCalls: assignments.length,
    estimatedPlaylistItemInsertUnits: assignments.length * 50,
    estimatedPlaylistCreateUnitsMaximum: playlistCreateCount * 50,
    estimatedThumbnailSetUnits: customThumbnailCount * 50,
  };
  estimatedUsage.estimatedGeneralQuotaUnitsMaximum = estimatedUsage.estimatedPlaylistItemInsertUnits + estimatedUsage.estimatedPlaylistCreateUnitsMaximum + estimatedUsage.estimatedThumbnailSetUnits;
  estimatedUsage.byRoute = Object.fromEntries(Object.keys(routeCounts).map((route) => {
    const rows = assignments.filter((row) => row.routeKey === route);
    const creates = rows.filter((row) => row.playlist?.state === "verified_absent").length;
    const thumbnails = rows.filter((row) => row.thumbnail?.mode === "custom").length;
    return [route, {
      estimatedVideoUploadCalls: rows.length,
      estimatedGeneralQuotaUnitsMaximum: rows.length * 50 + creates * 50 + thumbnails * 50,
    }];
  }));
  const core = {
    schemaVersion: 1,
    generatedAt,
    mode: "partial_recovery_no_spend_plan",
    setId: oldCampaign.setId,
    inputs: {
      supports: selectedSupports.join(","),
      supportCount: selectedSupports.length,
      ordinarySupportCount: new Set(assignments.filter((row) => row.videoType === "ordinary").map((row) => row.supportLang)).size,
      polyglotSupportCount: new Set(assignments.filter((row) => row.videoType === "polyglot").map((row) => row.supportLang)).size,
      ordinaryPerChannel: Math.max(0, ...ordinaryCountsBySupport),
      // A partial recovery may contain different numbers of ordinary rows per
      // support language. The dispatch preflight must preserve that exact tail
      // instead of treating the largest per-support count as a full-wave rule.
      allowPartialOrdinaryTail: true,
      polyglotPerChannel: polyglotCount > 0 ? 1 : 0,
      assignmentKeys: assignments.map((row) => row.assignmentKey),
      startDate: "auto",
      minFutureMinutes,
      maxSnapshotAgeMinutes: maxEvidenceAgeMinutes,
      partialRecoveryOfCampaignId: campaignId,
      polyglotScopeUpgrades: Object.entries(scopeUpgrades).map(([sourceAssignmentKey, contentScope]) => ({ sourceAssignmentKey, contentScope })),
      polyglotScopeDowngrades: Object.entries(scopeDowngrades).map(([sourceAssignmentKey, contentScope]) => ({ sourceAssignmentKey, contentScope })),
    },
    evidence: {
      partialRecoveryCampaign: { campaignId, manifestHash: oldCampaign.manifestHash, status: oldCampaign.status, scopeUpgrades, scopeDowngrades },
      routeControlReports: evidence,
      sourceFingerprints: oldCampaign.evidence?.sourceFingerprints || {},
      deckSource: oldCampaign.evidence?.deckSource || {},
    },
    summary: {
      applyReady: true,
      blockerCount: 0,
      warningCount: assignments.filter((row) => row.contentScope === "short_unverified").length,
      supportCount: selectedSupports.length,
      ordinaryCount,
      polyglotCount,
      assignmentCount: assignments.length,
      firstPublishAt: assignments.map((row) => row.publishAt).sort()[0],
      lastPublishAt: assignments.map((row) => row.publishAt).sort().at(-1),
      customThumbnailCount,
      automaticThumbnailCount: assignments.length - customThumbnailCount,
      existingPlaylistCount: assignments.length - playlistCreateCount,
      playlistCreateCount,
      playlistCreateCountMaximum: playlistCreateCount,
      routeCounts,
    },
    estimatedUsage,
    blockers: [],
    warnings: assignments.filter((row) => row.contentScope === "short_unverified").map((row) => `${row.supportLang}: short_unverified <=895s`),
    assignments,
  };
  const identityHash = sha256Json({ setId: core.setId, inputs: core.inputs, evidence: core.evidence.routeControlReports, assignments });
  const manifest = { ...core, campaignId: `yt-${core.setId}-${generatedAt.slice(0, 10)}-${identityHash.slice(0, 12)}` };
  manifest.manifestHash = sha256Json(manifest);
  verifyCampaignManifest(manifest);

  const changedAt = now.toISOString();
  const nextRegistry = structuredClone(registry);
  const nextOldCampaign = nextRegistry.campaigns.find((row) => row.campaignId === campaignId);
  nextOldCampaign.assignmentKeys = (nextOldCampaign.assignmentKeys || []).filter((key) => !selectedOldKeys.has(key));
  nextOldCampaign.slotKeys = (nextOldCampaign.slotKeys || []).filter((key) => !selectedOldSlotKeys.has(key));
  nextOldCampaign.partialRecoveryCampaignIds = [...new Set([...(nextOldCampaign.partialRecoveryCampaignIds || []), manifest.campaignId])];
  for (const row of nextOldCampaign.assignments || []) {
    if (!selectedOldKeys.has(row.assignmentKey)) continue;
    row.status = "superseded_partial_recovery";
    row.supersededAt = changedAt;
    row.supersededByCampaignId = manifest.campaignId;
  }
  nextRegistry.campaigns.push({
    schemaVersion: 1,
    campaignId: manifest.campaignId,
    manifestHash: manifest.manifestHash,
    setId: manifest.setId,
    status: "claimed",
    claimedAt: changedAt,
    generatedAt: manifest.generatedAt,
    manifestPath: path.join("config/youtube-publication-campaign-plans", `${manifest.campaignId}.json`),
    recoveryOfCampaignId: campaignId,
    inputs: manifest.inputs,
    summary: manifest.summary,
    evidence: manifest.evidence,
    assignmentKeys: manifest.assignments.map((row) => row.assignmentKey),
    slotKeys: manifest.assignments.map((row) => row.slotKey),
    assignments: manifest.assignments.map(campaignAssignment),
  });

  const nextCalendar = structuredClone(calendar);
  for (const row of nextCalendar.reservations || []) {
    if (row.campaignId !== campaignId || !selectedOldCalendarKeys.has(calendarAssignmentKey(row)) || !isActiveCalendarReservation(row)) continue;
    row.status = "superseded_partial_recovery";
    row.supersededAt = changedAt;
    row.supersededByCampaignId = manifest.campaignId;
    row.updatedAt = changedAt;
  }
  for (const row of manifest.assignments) {
    nextCalendar.reservations.push({
      schemaVersion: 1,
      campaignId: manifest.campaignId,
      campaignManifestHash: manifest.manifestHash,
      status: "campaign_claimed",
      source: "youtube-publication-campaign-partial-recovery",
      videoType: row.videoType,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang || "",
      targetLangs: row.targetLangs || [],
      targetLangsHash: row.targetLangsHash || "",
      bundleKey: row.bundleKey || "",
      contentScope: row.contentScope || "",
      polyglotKey: row.polyglotKey || "",
      channelKey: row.channelKey,
      youtubeChannelId: row.youtubeChannelId,
      publishAt: row.publishAt,
      timeZone: row.timeZone,
      localDate: row.localDate,
      localTime: row.localTime,
      localSlotIndex: row.localSlotIndex,
      createdAt: changedAt,
      updatedAt: changedAt,
    });
  }
  return { manifest, nextRegistry, nextCalendar };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/create-youtube-partial-recovery-campaign.mjs --campaign-id=<id> (--supports=JA,RU | --assignment-keys-file=<keys.json>) --control-reports=<a.json,b.json> [--polyglot-scope-upgrades-file=<json>] [--polyglot-scope-downgrades-file=<json>] [--generated-at=<ISO>] [--apply --confirm=${CONFIRM}]`);
    return;
  }
  assert(options.campaignId && (options.supports || options.assignmentKeysFile) && options.controlReports, "--campaign-id, --control-reports and either --supports or --assignment-keys-file are required");
  if (options.apply) assert(options.confirm === CONFIRM, `--apply requires --confirm=${CONFIRM}`);
  const now = options.generatedAt ? new Date(options.generatedAt) : new Date();
  assert(Number.isFinite(now.getTime()), `invalid --generated-at: ${options.generatedAt}`);
  const polyglotScopeUpgrades = options.polyglotScopeUpgradesFile ? readJson(options.polyglotScopeUpgradesFile) : {};
  assert(polyglotScopeUpgrades && typeof polyglotScopeUpgrades === "object" && !Array.isArray(polyglotScopeUpgrades), "--polyglot-scope-upgrades-file must contain an object keyed by source assignmentKey");
  const polyglotScopeDowngrades = options.polyglotScopeDowngradesFile ? readJson(options.polyglotScopeDowngradesFile) : {};
  assert(polyglotScopeDowngrades && typeof polyglotScopeDowngrades === "object" && !Array.isArray(polyglotScopeDowngrades), "--polyglot-scope-downgrades-file must contain an object keyed by source assignmentKey");
  const result = buildPartialRecovery({
    registry: readJson(options.registry),
    calendar: readJson(options.calendar),
    channels: readJson(options.channels),
    policy: readJson(options.policy),
    controlReports: String(options.controlReports).split(",").map(readJson),
    campaignId: options.campaignId,
    supports: options.supports,
    assignmentKeys: options.assignmentKeysFile
      ? (Array.isArray(readJson(options.assignmentKeysFile)) ? readJson(options.assignmentKeysFile) : readJson(options.assignmentKeysFile).assignmentKeys)
      : [],
    polyglotScopeUpgrades,
    polyglotScopeDowngrades,
    now,
    minFutureMinutes: options.minFutureMinutes,
    maxEvidenceAgeMinutes: options.maxEvidenceAgeMinutes,
  });
  const output = options.output || `outputs/youtube-partial-recovery-${result.manifest.campaignId}.json`;
  writeJsonAtomic(output, result.manifest);
  if (options.apply) {
    writeJsonAtomic(options.registry, result.nextRegistry);
    writeJsonAtomic(options.calendar, result.nextCalendar);
    writeJsonAtomic(path.join(options.plansDir, `${result.manifest.campaignId}.json`), result.manifest);
  }
  console.log(JSON.stringify({
    mode: options.apply ? "apply" : "dry_run",
    campaignId: result.manifest.campaignId,
    manifestHash: result.manifest.manifestHash,
    summary: result.manifest.summary,
    estimatedUsage: result.manifest.estimatedUsage,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try { main(); } catch (error) { console.error(error.stack || error.message); process.exit(1); }
}
