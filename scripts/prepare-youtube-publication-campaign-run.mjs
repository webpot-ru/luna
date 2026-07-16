#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assignmentKey, calendarAssignmentKey } from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    output: "outputs/youtube-publication-campaign-run-preflight.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--manifest-hash" || arg.startsWith("--manifest-hash=")) options.manifestHash = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--github-output" || arg.startsWith("--github-output=")) options.githubOutput = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function isGitTracked(filePath) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", filePath], { stdio: "ignore" }).status === 0;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/prepare-youtube-publication-campaign-run.mjs --campaign-id=<id> --manifest-hash=<sha256>");
    return;
  }
  if (!options.campaignId || !options.manifestHash) throw new Error("--campaign-id and --manifest-hash are required");
  const registry = JSON.parse(fs.readFileSync(options.registry, "utf8"));
  const calendar = JSON.parse(fs.readFileSync(options.calendar, "utf8"));
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  if (!campaign) throw new Error(`Claimed campaign not found: ${options.campaignId}`);
  if (campaign.manifestHash !== options.manifestHash) throw new Error("Campaign manifest hash does not match durable registry");
  if (campaign.status !== "claimed") throw new Error(`Campaign status must be claimed before first dispatch, got ${campaign.status}`);
  const blockers = [];
  const offlineDeckFingerprint = campaign.evidence?.sourceFingerprints?.offlineDeck || {};
  const historicalDeckSource = campaign.evidence?.deckSource?.historicalGitBlob || {};
  if (!offlineDeckFingerprint.exists || !offlineDeckFingerprint.sha256) {
    blockers.push("campaign is missing the immutable offline deck fingerprint");
  }
  if (campaign.evidence?.deckSource?.mode === "historical_git_blob"
    && (!historicalDeckSource.commit || !historicalDeckSource.blobId || historicalDeckSource.matchesLocalFile !== true)) {
    blockers.push("campaign historical Git deck source is incomplete");
  }
  if (campaign.manifestPath) {
    if (!fs.existsSync(campaign.manifestPath)) blockers.push(`durable campaign manifest is missing: ${campaign.manifestPath}`);
    else if (!isGitTracked(campaign.manifestPath)) blockers.push(`durable campaign manifest is not Git-tracked: ${campaign.manifestPath}`);
  }
  const claimsByAssignment = new Map((calendar.reservations || [])
    .filter((row) => row.campaignId === campaign.campaignId)
    .map((row) => [calendarAssignmentKey(row), row]));
  for (const row of campaign.assignments || []) {
    const claim = claimsByAssignment.get(row.calendarAssignmentKey);
    if (!claim) blockers.push(`${row.assignmentKey}: durable calendar claim missing`);
    else if (claim.campaignManifestHash !== campaign.manifestHash || claim.publishAt !== row.publishAt) blockers.push(`${row.assignmentKey}: calendar claim identity/time mismatch`);
    if (row.thumbnail?.mode === "custom") {
      if (!row.thumbnail.path || !fs.existsSync(row.thumbnail.path)) blockers.push(`${row.assignmentKey}: custom thumbnail file missing`);
      else if (!isGitTracked(row.thumbnail.path)) blockers.push(`${row.assignmentKey}: custom thumbnail is not Git-tracked`);
      else if (row.thumbnail.sha256 && sha256(row.thumbnail.path) !== row.thumbnail.sha256) blockers.push(`${row.assignmentKey}: custom thumbnail checksum mismatch`);
    }
    if (!row.playlist?.ready || !["resolved_existing", "verified_absent"].includes(row.playlist?.state)) {
      blockers.push(`${row.assignmentKey}: playlist discovery identity is not apply-ready`);
    }
    if (row.playlist?.state === "resolved_existing" && !row.playlist?.youtubePlaylistId) {
      blockers.push(`${row.assignmentKey}: resolved existing playlist is missing youtubePlaylistId`);
    }
    if (row.playlist?.state === "verified_absent" && row.playlist?.createAllowed !== true) {
      blockers.push(`${row.assignmentKey}: verified-absent playlist is not explicitly create-allowed`);
    }
  }
  const ordinaryBySupport = new Map();
  const polyglotBySupport = new Map();
  for (const row of campaign.assignments || []) {
    if (assignmentKey(row) !== row.assignmentKey) blockers.push(`${row.assignmentKey}: assignment identity is not canonical`);
    const target = row.videoType === "ordinary" ? ordinaryBySupport : polyglotBySupport;
    const values = target.get(row.supportLang) || [];
    values.push(row);
    target.set(row.supportLang, values);
  }
  const ordinaryExpected = Number(campaign.inputs?.ordinaryPerChannel || 0);
  const polyglotExpected = Number(campaign.inputs?.polyglotPerChannel || 0);
  const ordinaryMatrix = [...ordinaryBySupport.entries()].map(([support, rows]) => {
    if (rows.length !== ordinaryExpected) blockers.push(`${support}: ordinary rows ${rows.length} != ${ordinaryExpected}`);
    return {
      support,
      langs: rows.map((row) => row.targetLang).join(","),
      youtube_environment: rows[0]?.youtubeEnvironment || "",
      route_key: rows[0]?.routeKey || "",
      schedule_start_date: /^\d{4}-\d{2}-\d{2}$/.test(campaign.inputs?.startDate || "") ? campaign.inputs.startDate : "",
    };
  }).sort((a, b) => a.support.localeCompare(b.support));
  const polyglotMatrix = [...polyglotBySupport.entries()].map(([support, rows]) => {
    if (rows.length !== polyglotExpected) blockers.push(`${support}: Polyglot rows ${rows.length} != ${polyglotExpected}`);
    if (rows.length !== 1) blockers.push(`${support}: reusable Polyglot worker currently requires exactly one bundle per campaign`);
    return {
      support,
      bundle: rows[0]?.bundleKey || "",
      content_scope: rows[0]?.contentScope || "full",
      card_limit: String(rows[0]?.cardLimit || 0),
      max_duration_seconds: String(rows[0]?.maxDurationSeconds || 895),
      route_key: rows[0]?.routeKey || "",
      schedule_start_date: /^\d{4}-\d{2}-\d{2}$/.test(campaign.inputs?.startDate || "") ? campaign.inputs.startDate : "",
    };
  }).sort((a, b) => a.support.localeCompare(b.support));
  const metadataByRoute = new Map();
  for (const row of campaign.assignments || []) {
    const key = row.routeKey || "";
    const existing = metadataByRoute.get(key) || {
      route_key: key,
      youtube_environment: row.youtubeEnvironment || "",
      assignment_count: 0,
    };
    if (existing.youtube_environment !== (row.youtubeEnvironment || "")) {
      blockers.push(`${key}: multiple YouTube environments in one metadata route`);
    }
    existing.assignment_count += 1;
    metadataByRoute.set(key, existing);
  }
  const metadataMatrix = [...metadataByRoute.values()].sort((a, b) => a.route_key.localeCompare(b.route_key));
  if (metadataMatrix.some((row) => !row.route_key || !row.youtube_environment)) blockers.push("metadata route matrix contains an empty route/environment");
  if (ordinaryMatrix.some((row) => !row.route_key)) blockers.push("ordinary worker matrix contains an empty route key");
  if (polyglotMatrix.some((row) => !row.route_key)) blockers.push("Polyglot worker matrix contains an empty route key");
  const supportCount = Number(campaign.inputs?.supportCount || 0);
  if (ordinaryExpected > 0 && ordinaryMatrix.length !== supportCount) {
    blockers.push(`ordinary support matrix count ${ordinaryMatrix.length} does not match campaign`);
  }
  if (polyglotExpected > 0 && polyglotMatrix.length !== supportCount) {
    blockers.push(`Polyglot support matrix count ${polyglotMatrix.length} does not match campaign`);
  }
  if (blockers.length) throw new Error(`Campaign dispatch preflight blocked:\n${blockers.join("\n")}`);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    campaignId: campaign.campaignId,
    manifestHash: campaign.manifestHash,
    setId: campaign.setId,
    status: "dispatch_ready",
    summary: {
      assignmentCount: campaign.assignments.length,
      ordinaryWorkerCount: ordinaryMatrix.length,
      polyglotWorkerCount: polyglotMatrix.length,
      metadataRouteCount: metadataMatrix.length,
      blockerCount: 0,
    },
    ordinaryMatrix,
    polyglotMatrix,
    metadataMatrix,
  };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (options.githubOutput) {
    fs.appendFileSync(options.githubOutput, `set_id=${campaign.setId}\n`);
    fs.appendFileSync(options.githubOutput, `offline_deck_sha256=${offlineDeckFingerprint.sha256 || ""}\n`);
    fs.appendFileSync(options.githubOutput, `offline_deck_git_commit=${historicalDeckSource.commit || ""}\n`);
    fs.appendFileSync(options.githubOutput, `ordinary_matrix=${JSON.stringify({ include: ordinaryMatrix })}\n`);
    fs.appendFileSync(options.githubOutput, `polyglot_matrix=${JSON.stringify({ include: polyglotMatrix })}\n`);
    fs.appendFileSync(options.githubOutput, `metadata_matrix=${JSON.stringify({ include: metadataMatrix })}\n`);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
