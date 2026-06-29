#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  findActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const execFileAsync = promisify(execFile);

const DEFAULT_OUTPUT = "outputs/youtube-bulk-publish-dispatcher-report.json";
const VIDEO_WORKFLOW = "youtube-video-publish.yml";
const PLAYLIST_REPAIR_WORKFLOW = "youtube-playlist-insert-repair.yml";

function parseArgs(argv) {
  const options = {
    setId: "home_kitchen_cookware_pilot_01",
    supports: "ALL",
    supportSource: "variants",
    targets: null,
    excludeSupports: [],
    excludeTargets: [],
    targetsPerSupport: 4,
    maxParallel: 8,
    maxActivePerRoute: 1,
    ref: process.env.GITHUB_REF_NAME || "main",
    mode: "apply",
    publishMode: "scheduled",
    privacy: "public",
    scheduleStartDate: "",
    createPlaylists: true,
    allowRepublish: false,
    generateThumbnails: true,
    confirmThumbnailSpend: "",
    confirmYoutubeWrite: "",
    confirmPublic: "PUBLISH_PUBLIC",
    confirmDispatch: "",
    confirmPlaylistRepair: "",
    dispatchSpacingSeconds: 5,
    playlistRetryDelaySeconds: 180,
    watch: true,
    apply: false,
    output: DEFAULT_OUTPUT,
    workflow: VIDEO_WORKFLOW,
    repairWorkflow: PLAYLIST_REPAIR_WORKFLOW,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    routingConfig: "config/youtube-api-project-routing.json",
    dryRunReason: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };
    if (arg === "--set" || arg.startsWith("--set=")) options.setId = readValue();
    else if (arg === "--supports" || arg.startsWith("--supports=") || arg === "--support" || arg.startsWith("--support=")) options.supports = readValue();
    else if (arg === "--support-source" || arg.startsWith("--support-source=")) options.supportSource = readValue();
    else if (arg === "--targets" || arg.startsWith("--targets=") || arg === "--langs" || arg.startsWith("--langs=")) {
      const value = readValue();
      options.targets = value.toUpperCase() === "ALL" ? null : splitCodes(value);
    } else if (arg === "--exclude-supports" || arg.startsWith("--exclude-supports=")) options.excludeSupports = splitCodes(readValue());
    else if (arg === "--exclude-targets" || arg.startsWith("--exclude-targets=") || arg === "--exclude-langs" || arg.startsWith("--exclude-langs=")) options.excludeTargets = splitCodes(readValue());
    else if (arg === "--targets-per-support" || arg.startsWith("--targets-per-support=")) options.targetsPerSupport = Number(readValue());
    else if (arg === "--max-parallel" || arg.startsWith("--max-parallel=")) options.maxParallel = Number(readValue());
    else if (arg === "--max-active-per-route" || arg.startsWith("--max-active-per-route=")) options.maxActivePerRoute = Number(readValue());
    else if (arg === "--ref" || arg.startsWith("--ref=")) options.ref = readValue();
    else if (arg === "--mode" || arg.startsWith("--mode=")) options.mode = readValue();
    else if (arg === "--publish-mode" || arg.startsWith("--publish-mode=")) options.publishMode = readValue();
    else if (arg === "--privacy" || arg.startsWith("--privacy=")) options.privacy = readValue();
    else if (arg === "--schedule-start-date" || arg.startsWith("--schedule-start-date=")) options.scheduleStartDate = readValue();
    else if (arg === "--confirm-thumbnail-spend" || arg.startsWith("--confirm-thumbnail-spend=")) options.confirmThumbnailSpend = readValue();
    else if (arg === "--confirm-youtube-write" || arg.startsWith("--confirm-youtube-write=")) options.confirmYoutubeWrite = readValue();
    else if (arg === "--confirm-public" || arg.startsWith("--confirm-public=")) options.confirmPublic = readValue();
    else if (arg === "--confirm-dispatch" || arg.startsWith("--confirm-dispatch=")) options.confirmDispatch = readValue();
    else if (arg === "--confirm-playlist-repair" || arg.startsWith("--confirm-playlist-repair=")) options.confirmPlaylistRepair = readValue();
    else if (arg === "--dispatch-spacing-seconds" || arg.startsWith("--dispatch-spacing-seconds=")) options.dispatchSpacingSeconds = Number(readValue());
    else if (arg === "--playlist-retry-delay-seconds" || arg.startsWith("--playlist-retry-delay-seconds=")) options.playlistRetryDelaySeconds = Number(readValue());
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--workflow" || arg.startsWith("--workflow=")) options.workflow = readValue();
    else if (arg === "--repair-workflow" || arg.startsWith("--repair-workflow=")) options.repairWorkflow = readValue();
    else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) options.publicationRegistry = readValue();
    else if (arg === "--routing-config" || arg.startsWith("--routing-config=")) options.routingConfig = readValue();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--no-watch") options.watch = false;
    else if (arg === "--no-create-playlists") options.createPlaylists = false;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--no-generate-thumbnails") options.generateThumbnails = false;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  npm run dispatch:youtube-bulk-publish -- --set home_kitchen_cookware_pilot_01 --targets-per-support=4 --dry-run",
    "  npm run dispatch:youtube-bulk-publish -- --apply --confirm-dispatch=DISPATCH_YOUTUBE_BULK --confirm-youtube-write=APPLY_YOUTUBE_UPLOAD --confirm-thumbnail-spend=GENERATE_THUMBNAILS",
    "",
    "This dispatcher plans one ordinary YouTube publish workflow run per support language,",
    "with the next N eligible targets per support, and optionally dispatches/watches the",
    "existing youtube-video-publish.yml workflow in bounded parallel batches.",
    "",
    "It does not upload videos itself. Playlist-classified failures can dispatch the",
    "playlist-insert repair workflow after a delay only when --confirm-playlist-repair=APPLY_YOUTUBE_PLAYLIST_INSERT is provided.",
  ].join("\n");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function splitCodes(value) {
  const text = String(value || "").trim();
  if (!text || text.toUpperCase() === "NONE") return [];
  return text.split(",").map(normalizeCode).filter(Boolean);
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boolInput(value) {
  return value ? "true" : "false";
}

function ensureSafeOptions(options) {
  if (!options.setId) throw new Error("--set is required.");
  if (!Number.isInteger(options.targetsPerSupport) || options.targetsPerSupport < 1) {
    throw new Error("--targets-per-support must be a positive integer.");
  }
  if (!Number.isInteger(options.maxParallel) || options.maxParallel < 1 || options.maxParallel > 20) {
    throw new Error("--max-parallel must be between 1 and 20.");
  }
  if (!Number.isInteger(options.maxActivePerRoute) || options.maxActivePerRoute < 1 || options.maxActivePerRoute > 20) {
    throw new Error("--max-active-per-route must be between 1 and 20.");
  }
  if (!Number.isFinite(options.scheduleMinFutureMinutes) || options.scheduleMinFutureMinutes < 0) {
    throw new Error("--schedule-min-future-minutes must be a non-negative number.");
  }
  if (!["variants", "channel-keys"].includes(options.supportSource)) {
    throw new Error("--support-source must be variants or channel-keys.");
  }
  if (options.apply && options.confirmDispatch !== "DISPATCH_YOUTUBE_BULK") {
    throw new Error("Live dispatch requires --confirm-dispatch=DISPATCH_YOUTUBE_BULK.");
  }
  if (options.apply && options.mode === "apply" && options.confirmYoutubeWrite !== "APPLY_YOUTUBE_UPLOAD") {
    throw new Error("YouTube upload dispatch requires --confirm-youtube-write=APPLY_YOUTUBE_UPLOAD.");
  }
  if (options.apply && options.generateThumbnails && options.confirmThumbnailSpend !== "GENERATE_THUMBNAILS") {
    throw new Error("Thumbnail generation may spend VectorEngine credits; pass --confirm-thumbnail-spend=GENERATE_THUMBNAILS.");
  }
}

function loadRouting(configPath) {
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const projects = parsed.projects || [];
  const supportToRoute = new Map();
  for (const project of projects) {
    for (const support of project.supportVariants || []) {
      supportToRoute.set(normalizeCode(support), project);
    }
    for (const support of project.supportChannelKeys || []) {
      supportToRoute.set(normalizeCode(support), project);
    }
  }
  return { parsed, projects, supportToRoute };
}

function resolveSupports(options, routing) {
  let supports = [];
  const requested = String(options.supports || "ALL").trim();
  if (!requested || requested.toUpperCase() === "ALL") {
    const field = options.supportSource === "channel-keys" ? "supportChannelKeys" : "supportVariants";
    supports = routing.projects.flatMap((project) => project[field] || []);
  } else if (/^route:/iu.test(requested)) {
    const route = requested.slice("route:".length).trim();
    const project = routing.projects.find((item) => item.key === route || item.label === route);
    if (!project) throw new Error(`Unknown route selector: ${requested}`);
    const field = options.supportSource === "channel-keys" ? "supportChannelKeys" : "supportVariants";
    supports = project[field] || [];
  } else {
    supports = splitCodes(requested);
  }
  const excluded = new Set(options.excludeSupports.map(normalizeCode));
  return uniq(supports.map(normalizeCode)).filter((support) => !excluded.has(support)).sort();
}

async function resolveAllTargetLanguages(setId, supportLang) {
  const { resolveTargetLanguages } = await import("./lib/youtube-metadata.mjs");
  return resolveTargetLanguages(setId, supportLang);
}

async function selectTargets({ setId, support, targets, excludeTargets, registry, allowRepublish, count }) {
  const excludedTargets = new Set((excludeTargets || []).map(normalizeCode));
  const requested = targets ? uniq(targets.map(normalizeCode)).sort() : uniq(await resolveAllTargetLanguages(setId, support)).sort();
  const skipped = [];
  const eligible = [];
  for (const target of requested) {
    if (excludedTargets.has(target)) {
      skipped.push({ target, reason: "excluded_target_language" });
      continue;
    }
    const existing = findActivePublication(registry, { setId, supportLang: support, targetLang: target });
    if (existing && !allowRepublish) {
      skipped.push({
        target,
        reason: "existing_active_publication",
        youtubeVideoId: existing.youtubeVideoId || "",
        publicationStatus: existing.publicationStatus || "",
      });
      continue;
    }
    eligible.push(target);
  }
  return {
    requested,
    eligible,
    selected: eligible.slice(0, count),
    skipped,
  };
}

function workflowFieldsForJob(job, options) {
  return {
    mode: options.mode,
    set_id: options.setId,
    support: job.support,
    exclude_supports: "NONE",
    youtube_environment: "auto",
    langs: job.langs,
    exclude_langs: "NONE",
    concurrency: "2",
    metadata_concurrency: "4",
    thumbnail_concurrency: "2",
    worker_count: "1",
    worker_index: "0",
    privacy: options.privacy,
    publish_mode: options.publishMode,
    schedule_start_date: options.scheduleStartDate,
    create_playlists: boolInput(options.createPlaylists),
    allow_republish: boolInput(options.allowRepublish),
    generate_thumbnails: boolInput(options.generateThumbnails),
    confirm_thumbnail_spend: options.confirmThumbnailSpend,
    confirm_youtube_write: options.confirmYoutubeWrite,
    confirm_public: options.confirmPublic,
  };
}

function repairFieldsForTarget(job, target, options) {
  return {
    mode: "apply",
    set_id: options.setId,
    support: job.support,
    target,
    youtube_environment: "auto",
    confirm_youtube_write: options.confirmPlaylistRepair,
  };
}

async function gh(args, options = {}) {
  const { stdout, stderr } = await execFileAsync("gh", args, {
    maxBuffer: options.maxBuffer || 1024 * 1024 * 20,
    env: process.env,
  });
  return { stdout, stderr };
}

function compactDispatcherError(error) {
  return String(error?.stderr || error?.stdout || error?.message || error || "").replace(/\s+/g, " ").trim().slice(0, 1200);
}

function isGitHubApiRateLimitText(text) {
  return /api rate limit exceeded|secondary rate limit|abuse detection|you have exceeded a secondary rate limit/iu.test(String(text || ""));
}

async function withDispatchLock(state, callback) {
  if (!state) return callback();
  const previous = state.dispatchLock || Promise.resolve();
  let release;
  state.dispatchLock = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await callback();
  } finally {
    release();
  }
}

async function dispatchWorkflow(workflow, fields, ref, state) {
  return withDispatchLock(state, async () => {
    const args = ["workflow", "run", workflow, "--ref", ref];
    for (const [key, value] of Object.entries(fields)) {
      args.push("-f", `${key}=${value ?? ""}`);
    }
    const startedAt = new Date();
    await gh(args);
    await sleep(2500);
    const run = await findNewestWorkflowRun(workflow, startedAt, state?.claimedRunIds);
    state?.claimedRunIds?.add(run.databaseId);
    return run;
  });
}

async function findNewestWorkflowRun(workflow, startedAt, claimedRunIds = new Set()) {
  const { stdout } = await gh([
    "run",
    "list",
    "--workflow",
    workflow,
    "--event",
    "workflow_dispatch",
    "--limit",
    "20",
    "--json",
    "databaseId,status,conclusion,createdAt,url,headBranch,displayTitle",
  ]);
  const runs = JSON.parse(stdout || "[]");
  const minTime = startedAt.getTime() - 15000;
  const match = runs
    .filter((run) => Date.parse(run.createdAt) >= minTime)
    .filter((run) => !claimedRunIds.has(run.databaseId))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!match) throw new Error(`Could not locate newly dispatched run for ${workflow}.`);
  return match;
}

async function watchRun(runId) {
  try {
    await gh(["run", "watch", String(runId), "--exit-status"], { maxBuffer: 1024 * 1024 * 10 });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
    };
  }
}

async function getRunSummary(runId) {
  const { stdout } = await gh([
    "run",
    "view",
    String(runId),
    "--json",
    "databaseId,status,conclusion,url,createdAt,updatedAt",
  ]);
  return JSON.parse(stdout || "{}");
}

async function getFinalRunSummary(runId, attempts = 6) {
  let lastSummary = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastSummary = await getRunSummary(runId);
    if (lastSummary.status === "completed" || lastSummary.conclusion) return lastSummary;
    await sleep(5000);
  }
  return lastSummary || {};
}

async function getRunLog(runId) {
  try {
    const { stdout } = await gh(["run", "view", String(runId), "--log"], { maxBuffer: 1024 * 1024 * 80 });
    return stdout;
  } catch (error) {
    return String(error?.stdout || error?.message || error || "");
  }
}

function extractErrorHints(logText) {
  const text = String(logText || "");
  const lines = text.split(/\r?\n/u);
  const patterns = [
    /::error::/iu,
    /\bError:/u,
    /\bquotaExceeded\b/iu,
    /\buploadLimitExceeded\b/iu,
    /\bforbidden\b/iu,
    /\bRATE_LIMIT_EXCEEDED\b/iu,
    /\bSERVICE_UNAVAILABLE\b/iu,
    /\bABORTED\b/iu,
    /\bplaylistItems\b/iu,
    /\bvideoNotFound\b/iu,
    /\bAPI rate limit exceeded\b/iu,
    /\bsecondary rate limit\b/iu,
    /\bNo eligible\b/iu,
    /\beligibleTargetCount\b/iu,
    /\bmetadata_language_gate\b/iu,
    /\bchannel.*mismatch\b/iu,
  ];
  const seen = new Set();
  const hints = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !patterns.some((pattern) => pattern.test(trimmed))) continue;
    const compact = trimmed.length > 500 ? `${trimmed.slice(0, 497)}...` : trimmed;
    if (seen.has(compact)) continue;
    seen.add(compact);
    hints.push(compact);
    if (hints.length >= 20) break;
  }
  return hints;
}

function classifySuccessfulRun(logText) {
  const text = String(logText || "");
  if (
    /"eligibleTargetCount"\s*:\s*0/iu.test(text) ||
    /eligibleTargetCount:\s*0/iu.test(text) ||
    /"shardSelectedTargetCount"\s*:\s*0/iu.test(text) ||
    /shardSelectedTargetCount:\s*0/iu.test(text) ||
    /No eligible target/iu.test(text)
  ) {
    return {
      status: "skipped_no_eligible",
      noUploadReason: "ordinary_preflight_no_eligible_targets",
    };
  }
  return {
    status: "success",
  };
}

function classifyFailure(logText) {
  const text = String(logText || "");
  const errorHints = extractErrorHints(text);
  if (isGitHubApiRateLimitText(text)) {
    return {
      kind: "github_api_rate_limited",
      stopRoute: false,
      stopAll: true,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  if (/quotaExceeded/iu.test(text)) {
    return {
      kind: "quota_exceeded",
      stopRoute: true,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  const playlistSignal = /playlistItems|playlists\.insert|playlistItems\.insert|playlistItems\.list|youtube-playlist|needsPlaylistInsert/iu.test(text);
  const transientSignal = /RATE_LIMIT_EXCEEDED|SERVICE_UNAVAILABLE|ABORTED|fetch failed|ECONNRESET|HTTP 5\d\d|videoNotFound/iu.test(text);
  if (playlistSignal && transientSignal) {
    return {
      kind: "playlist_transient",
      stopRoute: false,
      canRepairPlaylist: true,
      errorHints,
    };
  }
  if (/uploadLimitExceeded/iu.test(text)) {
    return {
      kind: "upload_limit_exceeded",
      stopRoute: true,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  if (/thumbnail.*forbidden|domain=youtube\.thumbnail|reason=forbidden/iu.test(text)) {
    return {
      kind: "thumbnail_forbidden",
      stopRoute: false,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  if (/metadata_language_gate|English-template metadata|metadata.*wrong language/iu.test(text)) {
    return {
      kind: "metadata_language_gate",
      stopRoute: true,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  if (/truncated link|broken link|https:\/\/flashcardsluna\.com\/[a-z-]+\/courses\/kitc\.\.\./iu.test(text)) {
    return {
      kind: "metadata_url_gate",
      stopRoute: true,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  if (/channel.*mismatch|expected.*channelId|OAuth.*channel/iu.test(text)) {
    return {
      kind: "oauth_channel_mismatch",
      stopRoute: true,
      canRepairPlaylist: false,
      errorHints,
    };
  }
  return {
    kind: "unknown_failure",
    stopRoute: false,
    canRepairPlaylist: false,
    errorHints,
  };
}

async function runRepairTargets(job, options, result, state) {
  if (options.confirmPlaylistRepair !== "APPLY_YOUTUBE_PLAYLIST_INSERT") {
    result.playlistRepair = {
      dispatched: false,
      reason: "missing --confirm-playlist-repair=APPLY_YOUTUBE_PLAYLIST_INSERT",
    };
    return;
  }
  await sleep(options.playlistRetryDelaySeconds * 1000);
  const repairs = [];
  for (const target of job.targets) {
    const fields = repairFieldsForTarget(job, target, options);
    try {
      const repairRun = await dispatchWorkflow(options.repairWorkflow, fields, options.ref, state);
      const watched = options.watch ? await watchRun(repairRun.databaseId) : { ok: null };
      const finalSummary = options.watch ? await getFinalRunSummary(repairRun.databaseId) : repairRun;
      repairs.push({
        target,
        runId: repairRun.databaseId,
        url: repairRun.url,
        ok: watched.ok || finalSummary.conclusion === "success",
        actualStatus: finalSummary.status || repairRun.status || "",
        actualConclusion: finalSummary.conclusion || repairRun.conclusion || "",
        fields,
      });
    } catch (error) {
      repairs.push({
        target,
        status: "repair_dispatch_error",
        error: String(error?.message || error),
        fields,
      });
    }
  }
  result.playlistRepair = {
    dispatched: true,
    repairs,
  };
}

async function runJob(job, options, state) {
  const result = {
    support: job.support,
    route: job.route,
    environment: job.environment,
    targets: job.targets,
    langs: job.langs,
    status: "pending",
  };
  if (state.stoppedRoutes.has(job.route)) {
    result.status = "skipped_route_stopped";
    return result;
  }
  if (state.stopAll) {
    result.status = "skipped_dispatcher_stopped";
    result.stopAllReason = state.stopAllReason || "";
    return result;
  }
  const fields = workflowFieldsForJob(job, options);
  result.fields = fields;
  try {
    const run = await dispatchWorkflow(options.workflow, fields, options.ref, state);
    result.runId = run.databaseId;
    result.url = run.url;
    result.status = "dispatched";
    if (options.watch) {
      const watched = await watchRun(run.databaseId);
      result.watchOk = watched.ok;
      if (!watched.ok) result.watchError = watched.error;
      const finalSummary = await getFinalRunSummary(run.databaseId);
      const conclusion = finalSummary.conclusion || (watched.ok ? "success" : "");
      result.actualStatus = finalSummary.status || "";
      result.actualConclusion = conclusion;
      if (conclusion === "success") {
        const log = await getRunLog(run.databaseId);
        const success = classifySuccessfulRun(log);
        result.status = success.status;
        if (success.noUploadReason) result.noUploadReason = success.noUploadReason;
        if (!watched.ok) result.recoveredFromWatchError = true;
      } else {
        const log = await getRunLog(run.databaseId);
        const failure = classifyFailure(log);
        result.status = "failed";
        result.failure = failure;
        if (failure.stopRoute) state.stoppedRoutes.add(job.route);
        if (failure.stopAll) {
          state.stopAll = true;
          state.stopAllReason = failure.kind;
        }
        if (failure.canRepairPlaylist) {
          await runRepairTargets(job, options, result, state);
        }
      }
    }
  } catch (error) {
    const errorText = compactDispatcherError(error);
    result.error = errorText;
    if (isGitHubApiRateLimitText(errorText)) {
      result.status = "github_api_rate_limited";
      result.failure = {
        kind: "github_api_rate_limited",
        stopRoute: false,
        stopAll: true,
        canRepairPlaylist: false,
        errorHints: [errorText].filter(Boolean),
      };
      state.stopAll = true;
      state.stopAllReason = "github_api_rate_limited";
    } else {
      result.status = "dispatch_error";
    }
  }
  return result;
}

async function runPool(jobs, options) {
  const pending = [...jobs];
  const results = [];
  const state = {
    stoppedRoutes: new Set(),
    claimedRunIds: new Set(),
    dispatchLock: Promise.resolve(),
    stopAll: false,
    stopAllReason: "",
  };
  const active = new Set();
  const routeActive = new Map();
  const decrementRoute = (route) => {
    const next = Math.max(0, (routeActive.get(route) || 0) - 1);
    if (next) routeActive.set(route, next);
    else routeActive.delete(route);
  };
  const markSkipped = () => {
    while (pending.length) {
      const job = pending.shift();
      results.push({
        support: job.support,
        route: job.route,
        environment: job.environment,
        targets: job.targets,
        langs: job.langs,
        status: state.stopAll ? "skipped_dispatcher_stopped" : "skipped_route_stopped",
        stopAllReason: state.stopAllReason || "",
      });
    }
  };

  while (pending.length || active.size) {
    let launched = false;
    while (!state.stopAll && active.size < Math.min(options.maxParallel, jobs.length)) {
      const index = pending.findIndex((job) => (
        !state.stoppedRoutes.has(job.route)
        && (routeActive.get(job.route) || 0) < options.maxActivePerRoute
      ));
      if (index === -1) break;
      const [job] = pending.splice(index, 1);
      routeActive.set(job.route, (routeActive.get(job.route) || 0) + 1);
      const task = (async () => {
        const result = await runJob(job, options, state);
        results.push(result);
        if (options.dispatchSpacingSeconds > 0) {
          await sleep(options.dispatchSpacingSeconds * 1000);
        }
      })().finally(() => {
        decrementRoute(job.route);
        active.delete(task);
      });
      active.add(task);
      launched = true;
    }

    if (state.stopAll) break;
    if (!active.size) break;
    if (!launched) await Promise.race(active);
  }

  await Promise.all(active);
  if (pending.length) markSkipped();
  return {
    results,
    stoppedRoutes: [...state.stoppedRoutes],
    stopAll: state.stopAll,
    stopAllReason: state.stopAllReason,
  };
}

async function buildPlan(options) {
  const routing = loadRouting(options.routingConfig);
  const registry = loadPublicationRegistry(options.publicationRegistry);
  const supports = resolveSupports(options, routing);
  const jobs = [];
  const supportReports = [];
  for (const support of supports) {
    const route = routing.supportToRoute.get(support);
    if (!route) throw new Error(`No route for support=${support}`);
    const selection = await selectTargets({
      setId: options.setId,
      support,
      targets: options.targets,
      excludeTargets: options.excludeTargets,
      registry,
      allowRepublish: options.allowRepublish,
      count: options.targetsPerSupport,
    });
    const report = {
      support,
      route: route.key,
      environment: route.githubEnvironment,
      selectedTargets: selection.selected,
      selectedTargetsCsv: selection.selected.join(","),
      eligibleTargetCount: selection.eligible.length,
      skippedTargetCount: selection.skipped.length,
      skippedExistingPublicationCount: selection.skipped.filter((item) => item.reason === "existing_active_publication").length,
    };
    supportReports.push(report);
    if (selection.selected.length) {
      jobs.push({
        support,
        route: route.key,
        environment: route.githubEnvironment,
        targets: selection.selected,
        langs: selection.selected.join(","),
      });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply_dispatch" : "dry_run_plan",
    setId: options.setId,
    options: {
      supportSource: options.supportSource,
      targetsPerSupport: options.targetsPerSupport,
      maxParallel: options.maxParallel,
      maxActivePerRoute: options.maxActivePerRoute,
      ref: options.ref,
      workflow: options.workflow,
      repairWorkflow: options.repairWorkflow,
      publishMode: options.publishMode,
      allowRepublish: options.allowRepublish,
      generateThumbnails: options.generateThumbnails,
    },
    summary: {
      supportCount: supports.length,
      dispatchJobCount: jobs.length,
      selectedTargetCount: jobs.reduce((sum, job) => sum + job.targets.length, 0),
      skippedSupportCount: supports.length - jobs.length,
      maxParallel: options.maxParallel,
      maxActivePerRoute: options.maxActivePerRoute,
    },
    supports: supportReports,
    jobs,
  };
}

function writeReport(output, report) {
  const outPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  ensureSafeOptions(options);
  const report = await buildPlan(options);
  if (options.apply && report.jobs.length) {
    const execution = await runPool(report.jobs, options);
    report.execution = execution;
    report.summary.successCount = execution.results.filter((row) => row.status === "success").length;
    report.summary.skippedNoEligibleCount = execution.results.filter((row) => row.status === "skipped_no_eligible").length;
    report.summary.failedCount = execution.results.filter((row) => ["failed", "dispatch_error", "github_api_rate_limited"].includes(row.status)).length;
    report.summary.skippedRouteStoppedCount = execution.results.filter((row) => row.status === "skipped_route_stopped").length;
    report.summary.skippedDispatcherStoppedCount = execution.results.filter((row) => row.status === "skipped_dispatcher_stopped").length;
    report.summary.githubRateLimitedCount = execution.results.filter((row) => row.status === "github_api_rate_limited" || row.failure?.kind === "github_api_rate_limited").length;
    report.summary.recoveredWatchErrorCount = execution.results.filter((row) => row.recoveredFromWatchError).length;
    report.summary.playlistRepairDispatchedCount = execution.results.filter((row) => row.playlistRepair?.dispatched).length;
  } else if (options.apply) {
    report.execution = { results: [], stoppedRoutes: [] };
  }
  writeReport(options.output, report);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report: ${options.output}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
