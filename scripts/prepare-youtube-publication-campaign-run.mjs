#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assignmentKey, calendarAssignmentKey } from "./lib/youtube-publication-control.mjs";
import { longVideoUploadAllowed, resolveYoutubeVideoProductionReadiness } from "./lib/youtube-video-production-readiness.mjs";

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    channels: "config/youtube-channels.json",
    output: "outputs/youtube-publication-campaign-run-preflight.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--manifest-hash" || arg.startsWith("--manifest-hash=")) options.manifestHash = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
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

function historicalGitBlobSha256({ blobId }) {
  if (!blobId) return "";
  const result = spawnSync("git", ["cat-file", "blob", blobId], {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 || !result.stdout?.length) return "";
  return crypto.createHash("sha256").update(result.stdout).digest("hex");
}

function historicalGitBlobIsValid({ commit, blobId, path: filePath }) {
  if (!blobId) return false;
  const probe = spawnSync("git", ["cat-file", "-e", `${blobId}^{blob}`], { stdio: "ignore" });
  if (probe.status !== 0) return false;
  if (!commit) return true;
  if (!filePath) return false;
  const resolved = spawnSync("git", ["rev-parse", `${commit}:${filePath}`], { encoding: "utf8" });
  return resolved.status === 0 && resolved.stdout.trim() === blobId;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/prepare-youtube-publication-campaign-run.mjs --campaign-id=<id> --manifest-hash=<sha256> [--channels=config/youtube-channels.json]");
    return;
  }
  if (!options.campaignId || !options.manifestHash) throw new Error("--campaign-id and --manifest-hash are required");
  const registry = JSON.parse(fs.readFileSync(options.registry, "utf8"));
  const calendar = JSON.parse(fs.readFileSync(options.calendar, "utf8"));
  const channelRegistry = JSON.parse(fs.readFileSync(options.channels, "utf8"));
  const routingConfig = JSON.parse(fs.readFileSync("config/youtube-api-project-routing.json", "utf8"));
  const routesByKey = new Map((routingConfig.projects || []).map((route) => [route.key, route]));
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  if (!campaign) throw new Error(`Claimed campaign not found: ${options.campaignId}`);
  if (campaign.manifestHash !== options.manifestHash) throw new Error("Campaign manifest hash does not match durable registry");
  if (campaign.status !== "claimed") throw new Error(`Campaign status must be claimed before first dispatch, got ${campaign.status}`);
  const blockers = [];
  const offlineDeckFingerprint = campaign.evidence?.sourceFingerprints?.offlineDeck || {};
  const historicalDeckSource = campaign.evidence?.deckSource?.historicalGitBlob || {};
  const historicalDeckSourceValid = historicalGitBlobIsValid(historicalDeckSource);
  const historicalDeckBlobSha256 = historicalDeckSourceValid ? historicalGitBlobSha256(historicalDeckSource) : "";
  const offlineDeckSha256 = offlineDeckFingerprint.sha256 || historicalDeckBlobSha256;
  if (campaign.evidence?.deckSource?.mode === "historical_git_blob") {
    if (!historicalDeckSourceValid) {
      blockers.push("campaign historical Git deck source is incomplete");
    }
    if (!offlineDeckSha256) blockers.push("campaign historical Git deck checksum is unavailable");
    if (offlineDeckFingerprint.sha256 && historicalDeckBlobSha256 && offlineDeckFingerprint.sha256 !== historicalDeckBlobSha256) {
      blockers.push("campaign historical Git deck checksum does not match the exact blob");
    }
  } else if (!offlineDeckFingerprint.exists || !offlineDeckFingerprint.sha256) {
    blockers.push("campaign is missing the immutable offline deck fingerprint");
  }
  if (campaign.manifestPath) {
    if (!fs.existsSync(campaign.manifestPath)) blockers.push(`durable campaign manifest is missing: ${campaign.manifestPath}`);
    else if (!isGitTracked(campaign.manifestPath)) blockers.push(`durable campaign manifest is not Git-tracked: ${campaign.manifestPath}`);
  }
  const claimsByAssignment = new Map((calendar.reservations || [])
    .filter((row) => row.campaignId === campaign.campaignId)
    .map((row) => [calendarAssignmentKey(row), row]));
  for (const row of campaign.assignments || []) {
    const route = routesByKey.get(row.routeKey);
    const activeRouteForSupport = (routingConfig.projects || []).find((candidate) => (
      (candidate.supportVariants || []).includes(row.supportLang)
    ));
    if (!route) {
      blockers.push(`${row.assignmentKey}: route ${row.routeKey || "(missing)"} is not configured`);
    } else {
      if (route.publicationReady !== true) {
        blockers.push(`${row.assignmentKey}: route ${route.key} is publication-blocked (${route.publicationBlockedReason || "publicationReady is false"})`);
      }
      if (row.youtubeEnvironment !== route.githubEnvironment) {
        blockers.push(`${row.assignmentKey}: campaign route/environment is stale (${row.routeKey}/${row.youtubeEnvironment || "(missing)"}); expected ${route.key}/${route.githubEnvironment}; create a fresh rollover campaign`);
      }
      if (activeRouteForSupport && activeRouteForSupport.key !== route.key) {
        blockers.push(`${row.assignmentKey}: campaign route ${route.key} is stale for ${row.supportLang}; active route is ${activeRouteForSupport.key}; create a fresh rollover campaign`);
      }
    }
    const channel = (channelRegistry.channels || []).find((candidate) => (candidate.supportLangs || []).includes(row.supportLang));
    if (!channel) {
      blockers.push(`${row.assignmentKey}: channel production configuration is missing for ${row.supportLang}`);
    } else {
      const productionReadiness = resolveYoutubeVideoProductionReadiness(channelRegistry, channel, row.supportLang);
      if (!productionReadiness.ready) {
        blockers.push(`${row.assignmentKey}: video production readiness is blocked (${productionReadiness.reason})`);
      }
      if (row.videoType === "polyglot" && (row.contentScope || "full") === "full" && !longVideoUploadAllowed(channelRegistry, channel)) {
        blockers.push(`${row.assignmentKey}: full Polyglot requires longVideoUploadAllowed=true; plan short_unverified before claim`);
      }
      if (row.videoType === "polyglot" && row.contentScope === "short_unverified") {
        const maxDurationSeconds = Number(row.maxDurationSeconds || 895);
        if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0 || maxDurationSeconds > 895) {
          blockers.push(`${row.assignmentKey}: short_unverified requires maxDurationSeconds within 1..895`);
        }
      }
    }
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
  // `partialRecoveryOfCampaignId` is the durable identity of pre-flag partial
  // recovery manifests. Keep those immutable manifests dispatchable while new
  // manifests additionally record the explicit partial-tail flag.
  const allowPartialOrdinaryTail = campaign.inputs?.allowPartialOrdinaryTail === true
    || typeof campaign.inputs?.partialRecoveryOfCampaignId === "string";
  const allowPartialPolyglotTail = campaign.inputs?.allowPartialPolyglotTail === true;
  const polyglotExpected = Number(campaign.inputs?.polyglotPerChannel || 0);
  const ordinaryMatrix = [...ordinaryBySupport.entries()].map(([support, rows]) => {
    if (allowPartialOrdinaryTail) {
      if (rows.length < 1 || rows.length > ordinaryExpected) {
        blockers.push(`${support}: ordinary rows ${rows.length} must be within 1..${ordinaryExpected} for a partial tail campaign`);
      }
    } else if (rows.length !== ordinaryExpected) blockers.push(`${support}: ordinary rows ${rows.length} != ${ordinaryExpected}`);
    return {
      support,
      langs: rows.map((row) => row.targetLang).join(","),
      youtube_environment: rows[0]?.youtubeEnvironment || "",
      route_key: rows[0]?.routeKey || "",
      schedule_start_date: /^\d{4}-\d{2}-\d{2}$/.test(campaign.inputs?.startDate || "") ? campaign.inputs.startDate : "",
    };
  }).sort((a, b) => a.support.localeCompare(b.support));
  const polyglotMatrix = [...polyglotBySupport.entries()].map(([support, rows]) => {
    if (allowPartialPolyglotTail) {
      if (rows.length < 1 || rows.length > polyglotExpected) {
        blockers.push(`${support}: Polyglot rows ${rows.length} must be within 1..${polyglotExpected} for a partial tail campaign`);
      }
    } else if (rows.length !== polyglotExpected) blockers.push(`${support}: Polyglot rows ${rows.length} != ${polyglotExpected}`);
    return {
      support,
      // One physical channel owns its full Polyglot sequence. The route wrapper
      // limits concurrent support channels to five while this worker runs the
      // exact bundle rows serially for that one support.
      polyglot_rows: JSON.stringify(rows.map((row) => ({
        bundle: row.bundleKey || "",
        content_scope: row.contentScope || "full",
        card_limit: String(row.cardLimit || 0),
        max_duration_seconds: String(row.maxDurationSeconds || 895),
      }))),
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
  const openAiCampaignTokenLimit = 2_000_000;
  const metadataRows = [...metadataByRoute.values()]
    .sort((a, b) => a.route_key.localeCompare(b.route_key));
  const metadataAssignmentCount = metadataRows
    .reduce((total, row) => total + row.assignment_count, 0);
  const provisionalMetadataRows = metadataRows.map((row) => {
    const exactBudget = openAiCampaignTokenLimit * row.assignment_count / metadataAssignmentCount;
    return {
      ...row,
      openai_token_budget: Math.floor(exactBudget),
      openai_token_budget_fraction: exactBudget - Math.floor(exactBudget),
    };
  });
  let tokenBudgetRemainder = openAiCampaignTokenLimit
    - provisionalMetadataRows.reduce((total, row) => total + row.openai_token_budget, 0);
  const remainderOrder = [...provisionalMetadataRows]
    .sort((left, right) =>
      right.openai_token_budget_fraction - left.openai_token_budget_fraction
      || left.route_key.localeCompare(right.route_key));
  for (const row of remainderOrder) {
    if (tokenBudgetRemainder <= 0) break;
    row.openai_token_budget += 1;
    tokenBudgetRemainder -= 1;
  }
  const metadataMatrix = provisionalMetadataRows.map(({
    openai_token_budget_fraction: _fraction,
    ...row
  }) => row);
  if (metadataMatrix.some((row) => !row.route_key || !row.youtube_environment)) blockers.push("metadata route matrix contains an empty route/environment");
  if (ordinaryMatrix.some((row) => !row.route_key)) blockers.push("ordinary worker matrix contains an empty route key");
  if (polyglotMatrix.some((row) => !row.route_key)) blockers.push("Polyglot worker matrix contains an empty route key");
  const supportCount = Number(campaign.inputs?.supportCount || 0);
  const ordinarySupportCount = Number(campaign.inputs?.ordinarySupportCount
    ?? (allowPartialOrdinaryTail ? ordinaryBySupport.size : supportCount));
  const polyglotSupportCount = Number(campaign.inputs?.polyglotSupportCount
    ?? (allowPartialPolyglotTail ? polyglotBySupport.size : supportCount));
  if (ordinaryExpected > 0 && ordinaryMatrix.length !== ordinarySupportCount) {
    blockers.push(`ordinary support matrix count ${ordinaryMatrix.length} does not match campaign`);
  }
  if (polyglotExpected > 0 && polyglotMatrix.length !== polyglotSupportCount) {
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
      openAiCampaignTokenLimit,
      openAiAllocatedTokenBudget: metadataMatrix.reduce((total, row) => total + row.openai_token_budget, 0),
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
    fs.appendFileSync(options.githubOutput, `offline_deck_sha256=${offlineDeckSha256}\n`);
    fs.appendFileSync(options.githubOutput, `offline_deck_git_commit=${historicalDeckSource.commit || ""}\n`);
    fs.appendFileSync(options.githubOutput, `offline_deck_git_blob=${historicalDeckSource.blobId || ""}\n`);
    fs.appendFileSync(options.githubOutput, `ordinary_matrix=${JSON.stringify({ include: ordinaryMatrix })}\n`);
    fs.appendFileSync(options.githubOutput, `polyglot_matrix=${JSON.stringify({ include: polyglotMatrix })}\n`);
    fs.appendFileSync(options.githubOutput, `metadata_matrix=${JSON.stringify({ include: metadataMatrix })}\n`);
    fs.appendFileSync(options.githubOutput, `ordinary_worker_count=${ordinaryMatrix.length}\n`);
    fs.appendFileSync(options.githubOutput, `polyglot_worker_count=${polyglotMatrix.length}\n`);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
