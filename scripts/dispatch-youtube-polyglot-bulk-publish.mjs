#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_OUTPUT = "outputs/youtube-polyglot-bulk-publish-dispatcher-report.json";
const POLYGLOT_WORKFLOW = "youtube-polyglot-video-publish.yml";
const POLYGLOT_PLAYLIST_REPAIR_WORKFLOW = "youtube-polyglot-playlist-insert-repair.yml";

function parseArgs(argv) {
  const options = {
    setId: "home_kitchen_cookware_pilot_01",
    supports: "ALL",
    supportSource: "channel-keys",
    excludeSupports: [],
    bundle: "global_europe_core",
    englishBundle: "global_europe_core",
    bundleOverrides: new Map(),
    maxParallel: 20,
    ref: process.env.GITHUB_REF_NAME || "main",
    childMode: "apply",
    limit: 0,
    privacy: "public",
    publishAt: "",
    createPlaylists: true,
    allowRepublish: false,
    generateThumbnails: true,
    confirmDispatch: "",
    confirmRender: "",
    confirmTts: "",
    confirmMetadataSpend: "",
    confirmThumbnailSpend: "",
    confirmYoutubeWrite: "",
    confirmPublic: "PUBLISH_PUBLIC",
    confirmPlaylistRepair: "",
    dispatchSpacingSeconds: 5,
    playlistRetryDelaySeconds: 180,
    watch: true,
    apply: false,
    output: DEFAULT_OUTPUT,
    workflow: POLYGLOT_WORKFLOW,
    repairWorkflow: POLYGLOT_PLAYLIST_REPAIR_WORKFLOW,
    routingConfig: "config/youtube-api-project-routing.json",
    planScript: "scripts/plan-polyglot-youtube-publish.mjs",
    planOutputDir: "outputs/youtube-polyglot-bulk-plan",
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
    else if (arg === "--exclude-supports" || arg.startsWith("--exclude-supports=")) options.excludeSupports = splitCodes(readValue());
    else if (arg === "--bundle" || arg.startsWith("--bundle=")) options.bundle = readValue();
    else if (arg === "--english-bundle" || arg.startsWith("--english-bundle=")) options.englishBundle = readValue();
    else if (arg === "--bundle-overrides" || arg.startsWith("--bundle-overrides=")) options.bundleOverrides = parseBundleOverrides(readValue());
    else if (arg === "--max-parallel" || arg.startsWith("--max-parallel=")) options.maxParallel = Number(readValue());
    else if (arg === "--ref" || arg.startsWith("--ref=")) options.ref = readValue();
    else if (arg === "--child-mode" || arg.startsWith("--child-mode=")) options.childMode = readValue();
    else if (arg === "--limit" || arg.startsWith("--limit=")) options.limit = Number(readValue());
    else if (arg === "--privacy" || arg.startsWith("--privacy=")) options.privacy = readValue();
    else if (arg === "--publish-at" || arg.startsWith("--publish-at=")) options.publishAt = readValue();
    else if (arg === "--confirm-dispatch" || arg.startsWith("--confirm-dispatch=")) options.confirmDispatch = readValue();
    else if (arg === "--confirm-render" || arg.startsWith("--confirm-render=")) options.confirmRender = readValue();
    else if (arg === "--confirm-tts" || arg.startsWith("--confirm-tts=")) options.confirmTts = readValue();
    else if (arg === "--confirm-metadata-spend" || arg.startsWith("--confirm-metadata-spend=")) options.confirmMetadataSpend = readValue();
    else if (arg === "--confirm-thumbnail-spend" || arg.startsWith("--confirm-thumbnail-spend=")) options.confirmThumbnailSpend = readValue();
    else if (arg === "--confirm-youtube-write" || arg.startsWith("--confirm-youtube-write=")) options.confirmYoutubeWrite = readValue();
    else if (arg === "--confirm-public" || arg.startsWith("--confirm-public=")) options.confirmPublic = readValue();
    else if (arg === "--confirm-playlist-repair" || arg.startsWith("--confirm-playlist-repair=")) options.confirmPlaylistRepair = readValue();
    else if (arg === "--dispatch-spacing-seconds" || arg.startsWith("--dispatch-spacing-seconds=")) options.dispatchSpacingSeconds = Number(readValue());
    else if (arg === "--playlist-retry-delay-seconds" || arg.startsWith("--playlist-retry-delay-seconds=")) options.playlistRetryDelaySeconds = Number(readValue());
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--workflow" || arg.startsWith("--workflow=")) options.workflow = readValue();
    else if (arg === "--repair-workflow" || arg.startsWith("--repair-workflow=")) options.repairWorkflow = readValue();
    else if (arg === "--routing-config" || arg.startsWith("--routing-config=")) options.routingConfig = readValue();
    else if (arg === "--plan-script" || arg.startsWith("--plan-script=")) options.planScript = readValue();
    else if (arg === "--plan-output-dir" || arg.startsWith("--plan-output-dir=")) options.planOutputDir = readValue();
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
    "  npm run dispatch:youtube-polyglot-bulk-publish -- --set home_kitchen_cookware_pilot_01 --dry-run",
    "  npm run dispatch:youtube-polyglot-bulk-publish -- --apply --confirm-dispatch=DISPATCH_YOUTUBE_POLYGLOT_BULK --confirm-render=RENDER_POLYGLOT_VIDEO --confirm-tts=GENERATE_TTS_AUDIO --confirm-metadata-spend=GENERATE_POLYGLOT_METADATA --confirm-youtube-write=APPLY_POLYGLOT_YOUTUBE_UPLOAD --confirm-public=PUBLISH_PUBLIC --confirm-thumbnail-spend=GENERATE_THUMBNAILS",
    "",
    "Plans one Polyglot video per support channel and optionally dispatches the",
    "separate youtube-polyglot-video-publish.yml workflow in bounded parallel batches.",
    "It never uploads videos directly. Playlist-classified transient failures can",
    "dispatch youtube-polyglot-playlist-insert-repair.yml after a delay without reuploading.",
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

function parseBundleOverrides(value) {
  const text = String(value || "").trim();
  const map = new Map();
  if (!text || text.toUpperCase() === "NONE") return map;
  for (const chunk of text.split(",")) {
    const [supportRaw, bundleRaw] = chunk.split("=");
    const support = normalizeCode(supportRaw);
    const bundle = String(bundleRaw || "").trim();
    if (!support || !bundle) throw new Error(`Invalid bundle override: ${chunk}`);
    map.set(support, bundle);
  }
  return map;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boolInput(value) {
  return value ? "true" : "false";
}

function ensureSafeOptions(options) {
  if (!options.setId) throw new Error("--set is required.");
  if (!Number.isInteger(options.maxParallel) || options.maxParallel < 1 || options.maxParallel > 20) {
    throw new Error("--max-parallel must be between 1 and 20.");
  }
  if (!["variants", "channel-keys"].includes(options.supportSource)) {
    throw new Error("--support-source must be variants or channel-keys.");
  }
  if (!["plan", "render_no_audio", "render_audio", "apply"].includes(options.childMode)) {
    throw new Error("--child-mode must be plan, render_no_audio, render_audio or apply.");
  }
  if (!Number.isInteger(options.limit) || options.limit < 0) {
    throw new Error("--limit must be a non-negative integer.");
  }
  if (options.apply && options.confirmDispatch !== "DISPATCH_YOUTUBE_POLYGLOT_BULK") {
    throw new Error("Live dispatch requires --confirm-dispatch=DISPATCH_YOUTUBE_POLYGLOT_BULK.");
  }
  if (options.apply && options.childMode !== "apply") {
    throw new Error("Live bulk upload dispatch requires --child-mode=apply.");
  }
  if (options.apply && options.limit !== 0) {
    throw new Error("Live Polyglot bulk upload requires --limit=0; do not upload preview videos.");
  }
  if (options.apply && options.confirmRender !== "RENDER_POLYGLOT_VIDEO") {
    throw new Error("Live Polyglot bulk dispatch requires --confirm-render=RENDER_POLYGLOT_VIDEO.");
  }
  if (options.apply && options.confirmTts !== "GENERATE_TTS_AUDIO") {
    throw new Error("Live Polyglot bulk dispatch may spend TTS usage; pass --confirm-tts=GENERATE_TTS_AUDIO.");
  }
  if (options.apply && options.confirmMetadataSpend !== "GENERATE_POLYGLOT_METADATA") {
    throw new Error("Live Polyglot bulk dispatch requires --confirm-metadata-spend=GENERATE_POLYGLOT_METADATA.");
  }
  if (options.apply && options.confirmYoutubeWrite !== "APPLY_POLYGLOT_YOUTUBE_UPLOAD") {
    throw new Error("Live Polyglot bulk dispatch requires --confirm-youtube-write=APPLY_POLYGLOT_YOUTUBE_UPLOAD.");
  }
  if (options.apply && options.privacy === "public" && options.confirmPublic !== "PUBLISH_PUBLIC") {
    throw new Error("Public Polyglot uploads require --confirm-public=PUBLISH_PUBLIC.");
  }
  if (options.apply && options.publishAt && options.privacy !== "private") {
    throw new Error("--publish-at requires --privacy=private.");
  }
  if (options.apply && options.publishAt && options.confirmPublic !== "PUBLISH_PUBLIC") {
    throw new Error("Scheduled uploads become public and require --confirm-public=PUBLISH_PUBLIC.");
  }
  if (options.apply && options.generateThumbnails && options.confirmThumbnailSpend !== "GENERATE_THUMBNAILS") {
    throw new Error("Thumbnail generation may spend VectorEngine credits; pass --confirm-thumbnail-spend=GENERATE_THUMBNAILS.");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadRouting(configPath) {
  const parsed = readJson(configPath);
  const projects = parsed.projects || [];
  const supportToRoute = new Map();
  for (const project of projects) {
    for (const support of project.supportVariants || []) supportToRoute.set(normalizeCode(support), project);
    for (const support of project.supportChannelKeys || []) supportToRoute.set(normalizeCode(support), project);
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

function bundleForSupport(support, options) {
  const normalized = normalizeCode(support);
  if (options.bundleOverrides.has(normalized)) return options.bundleOverrides.get(normalized);
  if (normalized === "EN" || normalized === "EN-GB") return options.englishBundle;
  return options.bundle;
}

async function gh(args, options = {}) {
  const { stdout, stderr } = await execFileAsync("gh", args, {
    maxBuffer: options.maxBuffer || 1024 * 1024 * 20,
    env: process.env,
  });
  return { stdout, stderr };
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
    /\bpolyglot\b/iu,
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

function classifyFailure(logText) {
  const text = String(logText || "");
  const errorHints = extractErrorHints(text);
  if (/quotaExceeded/iu.test(text)) {
    return { kind: "quota_exceeded", stopRoute: true, canRepairPlaylist: false, errorHints };
  }
  const playlistSignal = /playlistItems|playlists\.insert|playlistItems\.insert|playlistItems\.list|youtube-polyglot-playlist|needsPlaylistInsert/iu.test(text);
  const transientSignal = /RATE_LIMIT_EXCEEDED|SERVICE_UNAVAILABLE|ABORTED|fetch failed|ECONNRESET|HTTP 5\d\d/iu.test(text);
  if (playlistSignal && transientSignal) {
    return { kind: "playlist_transient", stopRoute: false, canRepairPlaylist: true, errorHints };
  }
  if (/uploadLimitExceeded/iu.test(text)) {
    return { kind: "upload_limit_exceeded", stopRoute: true, canRepairPlaylist: false, errorHints };
  }
  if (/thumbnail.*forbidden|domain=youtube\.thumbnail|reason=forbidden/iu.test(text)) {
    return { kind: "thumbnail_forbidden", stopRoute: false, canRepairPlaylist: false, errorHints };
  }
  if (/metadata_language_gate|English-template metadata|metadata.*wrong language/iu.test(text)) {
    return { kind: "metadata_language_gate", stopRoute: true, canRepairPlaylist: false, errorHints };
  }
  if (/truncated link|broken link|https:\/\/flashcardsluna\.com\/[a-z-]+\/courses\/kitc\.\.\./iu.test(text)) {
    return { kind: "metadata_url_gate", stopRoute: true, canRepairPlaylist: false, errorHints };
  }
  if (/channel.*mismatch|expected.*channelId|OAuth.*channel/iu.test(text)) {
    return { kind: "oauth_channel_mismatch", stopRoute: true, canRepairPlaylist: false, errorHints };
  }
  return { kind: "unknown_failure", stopRoute: false, canRepairPlaylist: false, errorHints };
}

function workflowFieldsForJob(job, options) {
  return {
    mode: options.childMode,
    set_id: options.setId,
    support: job.support,
    bundle: job.bundle,
    limit: String(options.limit),
    allow_republish: boolInput(options.allowRepublish),
    confirm_render: options.confirmRender,
    confirm_tts: options.confirmTts,
    privacy: options.privacy,
    publish_at: options.publishAt,
    create_playlists: boolInput(options.createPlaylists),
    generate_thumbnails: boolInput(options.generateThumbnails),
    confirm_metadata_spend: options.confirmMetadataSpend,
    confirm_thumbnail_spend: options.confirmThumbnailSpend,
    confirm_youtube_write: options.confirmYoutubeWrite,
    confirm_public: options.confirmPublic,
  };
}

function repairFieldsForJob(job, options) {
  return {
    mode: "apply",
    set_id: options.setId,
    support: job.support,
    polyglot_key: job.polyglotKey,
    youtube_environment: "auto",
    confirm_youtube_write: options.confirmPlaylistRepair,
  };
}

async function runRepairJob(job, options, result, state) {
  if (options.confirmPlaylistRepair !== "APPLY_YOUTUBE_PLAYLIST_INSERT") {
    result.playlistRepair = {
      dispatched: false,
      reason: "missing --confirm-playlist-repair=APPLY_YOUTUBE_PLAYLIST_INSERT",
    };
    return;
  }
  await sleep(options.playlistRetryDelaySeconds * 1000);
  const fields = repairFieldsForJob(job, options);
  try {
    const repairRun = await dispatchWorkflow(options.repairWorkflow, fields, options.ref, state);
    const watched = options.watch ? await watchRun(repairRun.databaseId) : { ok: null };
    const finalSummary = options.watch ? await getFinalRunSummary(repairRun.databaseId) : repairRun;
    result.playlistRepair = {
      dispatched: true,
      runId: repairRun.databaseId,
      url: repairRun.url,
      ok: watched.ok || finalSummary.conclusion === "success",
      actualStatus: finalSummary.status || repairRun.status || "",
      actualConclusion: finalSummary.conclusion || repairRun.conclusion || "",
      fields,
    };
  } catch (error) {
    result.playlistRepair = {
      dispatched: false,
      status: "repair_dispatch_error",
      error: String(error?.message || error),
      fields,
    };
  }
}

async function runJob(job, options, state) {
  const result = {
    support: job.support,
    route: job.route,
    environment: job.environment,
    bundle: job.bundle,
    polyglotKey: job.polyglotKey,
    targetLangs: job.targetLangs,
    status: "pending",
  };
  if (state.stoppedRoutes.has(job.route)) {
    result.status = "skipped_route_stopped";
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
        result.status = "success";
        if (!watched.ok) result.recoveredFromWatchError = true;
      } else {
        const log = await getRunLog(run.databaseId);
        const failure = classifyFailure(log);
        result.status = "failed";
        result.failure = failure;
        if (failure.stopRoute) state.stoppedRoutes.add(job.route);
        if (failure.canRepairPlaylist) await runRepairJob(job, options, result, state);
      }
    }
  } catch (error) {
    result.status = "dispatch_error";
    result.error = String(error?.message || error);
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
  };
  const workers = Array.from({ length: Math.min(options.maxParallel, pending.length) }, async () => {
    while (pending.length) {
      const job = pending.shift();
      const result = await runJob(job, options, state);
      results.push(result);
      if (options.dispatchSpacingSeconds > 0) await sleep(options.dispatchSpacingSeconds * 1000);
    }
  });
  await Promise.all(workers);
  return { results, stoppedRoutes: [...state.stoppedRoutes] };
}

async function runPlannerForSupport({ support, bundle, route, options }) {
  const output = path.join(options.planOutputDir, `${options.setId}-${support}-${bundle}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const args = [
    options.planScript,
    "--set",
    options.setId,
    "--support",
    support,
    "--bundle",
    bundle,
    "--require-offline-deck",
    `--output=${output}`,
  ];
  if (options.allowRepublish) args.push("--allow-republish");
  let plannerError = "";
  try {
    await execFileAsync(process.execPath, args, { maxBuffer: 1024 * 1024 * 20 });
  } catch (error) {
    plannerError = String(error?.stderr || error?.stdout || error?.message || error);
  }
  let report = null;
  if (fs.existsSync(output)) {
    report = JSON.parse(fs.readFileSync(output, "utf8"));
  }
  const blockers = report?.blockers || (plannerError ? [plannerError] : ["planner failed without output"]);
  const candidate = report?.candidate || {};
  return {
    support,
    route: route.key,
    environment: route.githubEnvironment,
    bundle,
    planOutput: output,
    plannerStatus: report?.summary?.status || "blocked",
    blockerCount: blockers.length,
    blockers,
    warningCount: (report?.warnings || []).length,
    warnings: report?.warnings || [],
    candidate,
    plannerError,
  };
}

async function buildPlan(options) {
  const routing = loadRouting(options.routingConfig);
  const supports = resolveSupports(options, routing);
  const supportReports = [];
  const jobs = [];
  for (const support of supports) {
    const route = routing.supportToRoute.get(support);
    if (!route) throw new Error(`No route for support=${support}`);
    const bundle = bundleForSupport(support, options);
    const report = await runPlannerForSupport({ support, bundle, route, options });
    supportReports.push({
      support,
      route: route.key,
      environment: route.githubEnvironment,
      bundle,
      status: report.blockerCount ? "blocked" : "ready",
      blockerCount: report.blockerCount,
      blockers: report.blockers,
      warningCount: report.warningCount,
      targetLangsCsv: report.candidate.targetLangsCsv || "",
      targetLangs: report.candidate.targetLangs || [],
      polyglotKey: report.candidate.polyglotKey || "",
      studyUrl: report.candidate.studyUrl || "",
      cardCount: report.candidate.deck?.cardCount || 0,
      planOutput: report.planOutput,
    });
    if (!report.blockerCount) {
      jobs.push({
        support,
        route: route.key,
        environment: route.githubEnvironment,
        bundle,
        polyglotKey: report.candidate.polyglotKey,
        targetLangs: report.candidate.targetLangs || [],
        targetLangsCsv: report.candidate.targetLangsCsv || "",
      });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "polyglot_apply_dispatch" : "polyglot_dry_run_plan",
    setId: options.setId,
    options: {
      supportSource: options.supportSource,
      bundle: options.bundle,
      englishBundle: options.englishBundle,
      bundleOverrides: Object.fromEntries(options.bundleOverrides),
      maxParallel: options.maxParallel,
      ref: options.ref,
      workflow: options.workflow,
      repairWorkflow: options.repairWorkflow,
      childMode: options.childMode,
      limit: options.limit,
      privacy: options.privacy,
      publishAt: options.publishAt,
      allowRepublish: options.allowRepublish,
      generateThumbnails: options.generateThumbnails,
      createPlaylists: options.createPlaylists,
    },
    summary: {
      supportCount: supports.length,
      readySupportCount: jobs.length,
      blockedSupportCount: supportReports.filter((row) => row.blockerCount).length,
      dispatchJobCount: jobs.length,
      maxParallel: options.maxParallel,
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
    report.summary.failedCount = execution.results.filter((row) => row.status === "failed" || row.status === "dispatch_error").length;
    report.summary.skippedRouteStoppedCount = execution.results.filter((row) => row.status === "skipped_route_stopped").length;
    report.summary.recoveredWatchErrorCount = execution.results.filter((row) => row.recoveredFromWatchError).length;
    report.summary.playlistRepairDispatchedCount = execution.results.filter((row) => row.playlistRepair?.dispatched).length;
    report.summary.playlistRepairSuccessCount = execution.results.filter((row) => row.playlistRepair?.ok).length;
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
