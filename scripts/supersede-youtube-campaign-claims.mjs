#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { assignmentKey, calendarAssignmentKey, isActiveReservation } from "./lib/youtube-publication-control.mjs";

const CONFIRM = "SUPERSEDE_ZERO_UPLOAD_YOUTUBE_CAMPAIGN_CLAIMS";

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    progress: "config/youtube-polyglot-progress.json",
    snapshot: "",
    output: "outputs/youtube-campaign-claim-supersession.json",
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value();
    else if (arg === "--bundle" || arg.startsWith("--bundle=")) options.bundle = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--progress" || arg.startsWith("--progress=")) options.progress = value();
    else if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshot = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function supports(csv) {
  return [...new Set(String(csv || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))].sort();
}

function publications(data) {
  return data.publications || data.items || data.progress || data.videos || [];
}

function liveFullBySupport(snapshot, selected, bundle) {
  const rows = (snapshot.decks || []).flatMap((deck) => deck.publications || [])
    .filter((row) => selected.includes(row.supportLang)
      && row.videoType === "polyglot"
      && row.bundleKey === bundle
      && row.contentScope === "full"
      && row.youtubeVideoId
      && row.liveReadbackPresent === true);
  const map = new Map(rows.map((row) => [row.supportLang, row]));
  if (map.size !== selected.length) throw new Error("exact live full evidence is incomplete");
  return map;
}

export function buildClaimSupersession({ registry, calendar, polyglotRegistry, progress, snapshot, campaignId, selectedSupports, bundle, now = new Date().toISOString() }) {
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === campaignId);
  if (!campaign || campaign.status !== "reconciliation_required") throw new Error("source campaign must exist and be reconciliation_required");
  const liveFull = liveFullBySupport(snapshot, selectedSupports, bundle);
  const selected = selectedSupports.map((support) => {
    const matches = (campaign.assignments || []).filter((row) => row.supportLang === support
      && row.videoType === "polyglot"
      && row.bundleKey === bundle
      && row.contentScope === "short_unverified"
      && !row.youtubeVideoId
      && !String(row.status || "").includes("superseded"));
    if (matches.length !== 1) throw new Error(`${support}: expected one active zero-upload short claim, got ${matches.length}`);
    return matches[0];
  });
  const keys = new Set(selected.map((row) => row.assignmentKey));
  const calendarKeys = new Set(selected.map((row) => row.calendarAssignmentKey));
  const slots = new Set(selected.map((row) => row.slotKey));
  const activeCalendarRows = (calendar.reservations || []).filter((row) => row.campaignId === campaignId && isActiveReservation(row));
  for (const row of selected) {
    const claim = activeCalendarRows.filter((candidate) => calendarAssignmentKey(candidate) === row.calendarAssignmentKey);
    if (claim.length !== 1 || claim[0].youtubeVideoId) throw new Error(`${row.supportLang}: calendar claim is not exactly one zero-upload reservation`);
  }
  const ledgers = [polyglotRegistry, progress].flatMap(publications);
  const durableAssignmentKey = (row) => row.assignmentKey || assignmentKey(row);
  const receiptRows = ledgers.filter((row) => keys.has(durableAssignmentKey(row)) && row.youtubeVideoId);
  if (receiptRows.length) throw new Error(`selected claims have durable YouTube receipts: ${receiptRows.map((row) => row.youtubeVideoId).join(",")}`);
  const reportRows = selected.map((row) => ({
    supportLang: row.supportLang,
    assignmentKey: row.assignmentKey,
    calendarAssignmentKey: row.calendarAssignmentKey,
    claimedSlot: row.slotKey,
    shortYoutubeVideoId: row.youtubeVideoId || "",
    durableReceiptCount: ledgers.filter((candidate) => durableAssignmentKey(candidate) === row.assignmentKey && candidate.youtubeVideoId).length,
    durableArtifactReferences: [row.artifactPath, row.receiptPath, row.githubRunId].filter(Boolean),
    liveFullYoutubeVideoId: liveFull.get(row.supportLang).youtubeVideoId,
    liveFullPublishAt: liveFull.get(row.supportLang).publishAt,
  }));
  if (reportRows.some((row) => row.shortYoutubeVideoId || row.durableReceiptCount || row.durableArtifactReferences.length)) {
    throw new Error("selected claims are not proven zero-upload");
  }
  const nextRegistry = structuredClone(registry);
  const nextCampaign = nextRegistry.campaigns.find((row) => row.campaignId === campaignId);
  nextCampaign.assignmentKeys = (nextCampaign.assignmentKeys || []).filter((key) => !keys.has(key));
  nextCampaign.slotKeys = (nextCampaign.slotKeys || []).filter((key) => !slots.has(key));
  for (const row of nextCampaign.assignments || []) {
    if (!keys.has(row.assignmentKey)) continue;
    const live = liveFull.get(row.supportLang);
    Object.assign(row, { status: "superseded_live_full_product_conflict", supersededAt: now, supersededByYoutubeVideoId: live.youtubeVideoId, supersededReason: "confirmed_live_full_product_has_priority" });
  }
  const nextCalendar = structuredClone(calendar);
  for (const row of nextCalendar.reservations || []) {
    if (row.campaignId !== campaignId || !calendarKeys.has(calendarAssignmentKey(row)) || !isActiveReservation(row)) continue;
    const live = liveFull.get(row.supportLang);
    Object.assign(row, { status: "superseded_live_full_product_conflict", supersededAt: now, supersededByYoutubeVideoId: live.youtubeVideoId, supersededReason: "confirmed_live_full_product_has_priority", updatedAt: now });
  }
  return {
    report: {
      schemaVersion: 1,
      generatedAt: now,
      mode: "dry-run",
      campaignId,
      bundleKey: bundle,
      selectedCount: reportRows.length,
      proof: { zeroYoutubeIds: true, zeroDurableReceipts: true, zeroDurableArtifactReferences: true, liveFullPriority: true },
      rows: reportRows,
      sourceFingerprints: { registry: sha256(registry), calendar: sha256(calendar), polyglotRegistry: sha256(polyglotRegistry), progress: sha256(progress), snapshot: sha256(snapshot) },
    },
    nextRegistry,
    nextCalendar,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/supersede-youtube-campaign-claims.mjs --campaign-id=<id> --supports=BG,HR --bundle=global_europe_core --snapshot=<snapshot.json> [--apply --confirm=${CONFIRM}]`);
    return;
  }
  if (!options.campaignId || !options.supports || !options.bundle || !options.snapshot) throw new Error("--campaign-id, --supports, --bundle and --snapshot are required");
  if (options.apply && options.confirm !== CONFIRM) throw new Error(`--apply requires --confirm=${CONFIRM}`);
  const result = buildClaimSupersession({
    registry: readJson(options.registry),
    calendar: readJson(options.calendar),
    polyglotRegistry: readJson(options.polyglotRegistry),
    progress: readJson(options.progress),
    snapshot: readJson(options.snapshot),
    campaignId: options.campaignId,
    selectedSupports: supports(options.supports),
    bundle: options.bundle,
  });
  result.report.mode = options.apply ? "apply_local_zero_upload_claim_supersession" : "dry-run";
  if (options.apply) {
    writeJson(options.registry, result.nextRegistry);
    writeJson(options.calendar, result.nextCalendar);
  }
  writeJson(options.output, result.report);
  console.log(JSON.stringify(result.report, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
