#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  isCampaignStatusActive,
  verifyCampaignManifest,
  verifyManifestSourceFingerprints,
} from "./lib/youtube-publication-campaign.mjs";
import { calendarAssignmentKey, canonicalSupportCode, isPolyglotRow, polyglotProductSlotKey } from "./lib/youtube-publication-control.mjs";
import { isActiveCalendarReservation, slotKey } from "./plan-youtube-publish-schedule.mjs";

const CONFIRM = "CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN";

function parseArgs(argv) {
  const options = {
    campaignRegistry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    plansDir: "config/youtube-publication-campaign-plans",
    maxPlanAgeMinutes: 30,
    apply: false,
    confirm: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--manifest" || arg.startsWith("--manifest=")) options.manifest = value();
    else if (arg === "--campaign-registry" || arg.startsWith("--campaign-registry=")) options.campaignRegistry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--plans-dir" || arg.startsWith("--plans-dir=")) options.plansDir = value();
    else if (arg === "--max-plan-age-minutes" || arg.startsWith("--max-plan-age-minutes=")) options.maxPlanAgeMinutes = Number(value());
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, fallback) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : structuredClone(fallback);
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/claim-youtube-publication-campaign.mjs --manifest=<plan.json> [--apply --confirm=${CONFIRM}]`);
    return;
  }
  if (!options.manifest) throw new Error("--manifest is required");
  if (options.apply && options.confirm !== CONFIRM) throw new Error(`--apply requires --confirm=${CONFIRM}`);
  const manifest = readJson(options.manifest);
  verifyCampaignManifest(manifest);
  const durableManifestPath = path.join(options.plansDir, `${manifest.campaignId}.json`);
  if (manifest.summary?.applyReady !== true || (manifest.blockers || []).length) {
    throw new Error(`Campaign manifest is not apply-ready; blockers=${manifest.blockers?.length || 0}`);
  }
  const generatedAt = Date.parse(manifest.generatedAt || "");
  const planAgeMinutes = Number.isFinite(generatedAt) ? (Date.now() - generatedAt) / 60_000 : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(planAgeMinutes) || planAgeMinutes < -5 || planAgeMinutes > options.maxPlanAgeMinutes) {
    throw new Error(`Campaign plan is stale: age=${Number.isFinite(planAgeMinutes) ? planAgeMinutes.toFixed(1) : "unknown"}m, max=${options.maxPlanAgeMinutes}m`);
  }
  const registry = readJson(options.campaignRegistry, { schemaVersion: 1, sourceOfTruth: "docs/youtube-publication-campaigns.md", campaigns: [] });
  const existingSame = (registry.campaigns || []).find((row) => row.campaignId === manifest.campaignId);
  if (existingSame) {
    if (existingSame.manifestHash !== manifest.manifestHash) throw new Error(`campaignId collision with different manifest hash: ${manifest.campaignId}`);
    if (options.apply && !fs.existsSync(existingSame.manifestPath || durableManifestPath)) {
      throw new Error(`Claimed campaign is missing its durable immutable manifest: ${existingSame.manifestPath || durableManifestPath}`);
    }
    const report = { mode: options.apply ? "apply" : "dry_run", status: "already_claimed", campaignId: manifest.campaignId, changed: false };
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const calendar = readJson(options.calendar, { schemaVersion: 1, reservations: [] });
  const activeCalendarRows = (calendar.reservations || []).filter(isActiveCalendarReservation);
  const isExactOwnedCalendarRow = (row) => (
    row.campaignId === manifest.campaignId && row.campaignManifestHash === manifest.manifestHash
  );
  const ownedCalendarRows = activeCalendarRows.filter(isExactOwnedCalendarRow);
  const ownedByAssignment = new Map(ownedCalendarRows.map((row) => [calendarAssignmentKey(row), row]));
  let exactOwnedClaimRecovery = false;
  if (ownedCalendarRows.length) {
    const exactOwnedClaims = (manifest.assignments || []).every((row) => {
      const owned = ownedByAssignment.get(row.calendarAssignmentKey);
      return owned && slotKey(owned) === row.slotKey && owned.publishAt === row.publishAt;
    });
    exactOwnedClaimRecovery = exactOwnedClaims && ownedCalendarRows.length === manifest.assignments.length;
    if (!exactOwnedClaimRecovery) {
      throw new Error(`Partial or mismatched calendar claim exists for ${manifest.campaignId}; refusing implicit recovery`);
    }
  }
  const fingerprintMismatches = verifyManifestSourceFingerprints(manifest)
    .filter((row) => !(exactOwnedClaimRecovery && row.key === "calendar"));
  if (fingerprintMismatches.length) {
    throw new Error(`Campaign source changed after plan: ${fingerprintMismatches.map((row) => row.key).join(", ")}`);
  }

  const activeCampaigns = (registry.campaigns || []).filter((row) => isCampaignStatusActive(row.status));
  const activeAssignmentKeys = new Set(activeCampaigns.flatMap((row) => row.assignmentKeys || []));
  const activePolyglotProductSlots = new Set();
  for (const campaign of activeCampaigns) {
    for (const assignment of campaign.assignments || []) {
      if (isPolyglotRow(assignment)) activePolyglotProductSlots.add(polyglotProductSlotKey(assignment));
    }
    for (const key of campaign.assignmentKeys || []) {
      const parts = String(key || "").split("|");
      if (parts[0] === "polyglot" && parts.length >= 4) {
        activePolyglotProductSlots.add(["polyglot-product-slot", parts[1], canonicalSupportCode(parts[2]), parts[3]].join("|"));
      }
    }
  }
  const activeSlotKeys = new Set([
    ...activeCampaigns.flatMap((row) => row.slotKeys || []),
    ...activeCalendarRows.filter((row) => !isExactOwnedCalendarRow(row)).map(slotKey),
  ]);
  const existingCalendarAssignmentKeys = new Set(activeCalendarRows
    .filter((row) => !isExactOwnedCalendarRow(row))
    .map(calendarAssignmentKey));
  const assignmentConflicts = (manifest.assignments || []).filter((row) => activeAssignmentKeys.has(row.assignmentKey));
  const polyglotProductConflicts = (manifest.assignments || []).filter((row) => (
    isPolyglotRow(row) && activePolyglotProductSlots.has(polyglotProductSlotKey(row))
  ));
  const slotConflicts = (manifest.assignments || []).filter((row) => activeSlotKeys.has(row.slotKey));
  const calendarAssignmentConflicts = (manifest.assignments || []).filter((row) => existingCalendarAssignmentKeys.has(row.calendarAssignmentKey));
  if (assignmentConflicts.length || polyglotProductConflicts.length || slotConflicts.length || calendarAssignmentConflicts.length) {
    throw new Error(`Campaign claim conflicts: assignments=${assignmentConflicts.length}, polyglotProducts=${polyglotProductConflicts.length}, slots=${slotConflicts.length}, calendarAssignments=${calendarAssignmentConflicts.length}`);
  }

  const claimedAt = new Date().toISOString();
  const campaign = {
    schemaVersion: 1,
    campaignId: manifest.campaignId,
    manifestHash: manifest.manifestHash,
    setId: manifest.setId,
    status: "claimed",
    claimedAt,
    generatedAt: manifest.generatedAt,
    manifestPath: durableManifestPath,
    inputs: manifest.inputs,
    summary: manifest.summary,
    evidence: manifest.evidence,
    assignmentKeys: manifest.assignments.map((row) => row.assignmentKey),
    slotKeys: manifest.assignments.map((row) => row.slotKey),
    assignments: manifest.assignments.map((row) => ({
      assignmentKey: row.assignmentKey,
      calendarAssignmentKey: row.calendarAssignmentKey,
      videoType: row.videoType,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang,
      targetLangs: row.targetLangs || [],
      targetLangsHash: row.targetLangsHash || "",
      bundleKey: row.bundleKey || "",
      requestedContentScope: row.requestedContentScope || "",
      contentScope: row.contentScope || "",
      cardLimit: Number(row.cardLimit || 0),
      maxDurationSeconds: Number(row.maxDurationSeconds || 0),
      longVideoUploadAllowed: row.longVideoUploadAllowed === true,
      polyglotKey: row.polyglotKey || "",
      autoFallbackReason: row.autoFallbackReason || "",
      productionReadiness: row.productionReadiness || null,
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
    })),
  };
  const nextRegistry = structuredClone(registry);
  nextRegistry.campaigns ||= [];
  nextRegistry.campaigns.push(campaign);
  const nextCalendar = structuredClone(calendar);
  nextCalendar.reservations ||= [];
  for (const row of manifest.assignments) {
    if (ownedByAssignment.has(row.calendarAssignmentKey)) continue;
    nextCalendar.reservations.push({
      schemaVersion: 1,
      campaignId: manifest.campaignId,
      campaignManifestHash: manifest.manifestHash,
      status: "campaign_claimed",
      source: "youtube-publication-campaign",
      videoType: row.videoType,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang,
      targetLangs: row.targetLangs || [],
      targetLangsCsv: row.targetLangsCsv || "",
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
      analyticsCheckpointsAt: row.analyticsCheckpointsAt || [],
      createdAt: claimedAt,
      updatedAt: claimedAt,
    });
  }
  nextCalendar.reservations.sort((left, right) => `${left.channelKey}|${left.publishAt}|${left.setId}`.localeCompare(`${right.channelKey}|${right.publishAt}|${right.setId}`));

  if (options.apply) {
    writeJsonAtomic(durableManifestPath, manifest);
    writeJsonAtomic(options.calendar, nextCalendar);
    writeJsonAtomic(options.campaignRegistry, nextRegistry);
  }
  const report = {
    mode: options.apply ? "apply" : "dry_run",
    status: options.apply ? "claimed" : "claim_ready",
    changed: options.apply,
    campaignId: manifest.campaignId,
    assignmentCount: manifest.assignments.length,
    reservationCount: manifest.assignments.length,
    calendarPath: options.calendar,
    campaignRegistryPath: options.campaignRegistry,
    durableManifestPath,
  };
  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
