#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PUBLICATION_REGISTRY_PATH, loadPublicationRegistry } from "./lib/youtube-publication-registry.mjs";

const DEFAULT_POLICY_PATH = "config/youtube-publish-schedule-policy.json";

function parseArgs(argv) {
  const options = {
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    policy: DEFAULT_POLICY_PATH,
    output: "",
    asOf: new Date().toISOString(),
    dueOnly: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--due-only") options.dueOnly = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--policy=")) options.policy = arg.slice("--policy=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg.startsWith("--as-of=")) options.asOf = arg.slice("--as-of=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-youtube-analytics-readback.mjs",
    "",
    "Options:",
    "  --due-only                    Include only checkpoints due at --as-of.",
    "  --as-of=<ISO>                 Evaluation timestamp. Defaults to now.",
    "  --publication-registry=<file>  Defaults to config/youtube-published-videos.json.",
    "  --policy=<file>               Defaults to config/youtube-publish-schedule-policy.json.",
    "  --output=<file>               Defaults to outputs/youtube-analytics-readback-plan-<timestamp>.json.",
    "  --json                        Print compact JSON summary.",
  ].join("\n");
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function activePublication(row) {
  if (!row?.youtubeVideoId) return false;
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  return !status.includes("failed") && !status.includes("deleted") && !status.includes("superseded");
}

function publishMoment(row) {
  return row.scheduledPublishAt || row.publishAt || row.publishedAt || row.uploadedAt || "";
}

function checkpointKey(row, hours) {
  return [
    row.setId,
    row.supportLang,
    row.targetLang,
    row.youtubeVideoId,
    `${hours}h`,
  ].join("|");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const policy = fs.existsSync(options.policy)
    ? JSON.parse(fs.readFileSync(options.policy, "utf8"))
    : { default: { performanceCheckpointsHours: [24, 72, 168, 720] } };
  const checkpoints = policy.default?.performanceCheckpointsHours || [24, 72, 168, 720];
  const registry = loadPublicationRegistry(options.publicationRegistry);
  const asOfMillis = Date.parse(options.asOf);
  if (!Number.isFinite(asOfMillis)) throw new Error(`Invalid --as-of timestamp: ${options.asOf}`);

  const rows = [];
  for (const publication of registry.publications || []) {
    if (!activePublication(publication)) continue;
    const publishedAt = publishMoment(publication);
    if (!publishedAt || !Number.isFinite(Date.parse(publishedAt))) {
      rows.push({
        status: "missing_publish_time",
        key: checkpointKey(publication, "unknown"),
        setId: publication.setId,
        supportLang: publication.supportLang,
        targetLang: publication.targetLang,
        youtubeVideoId: publication.youtubeVideoId,
        youtubeVideoUrl: publication.youtubeVideoUrl || "",
        publishedAt,
        checkpointHours: null,
        dueAt: "",
      });
      continue;
    }

    const publishedMillis = Date.parse(publishedAt);
    for (const hours of checkpoints) {
      const dueAt = new Date(publishedMillis + Number(hours) * 60 * 60 * 1000).toISOString();
      const due = Date.parse(dueAt) <= asOfMillis;
      const row = {
        status: due ? "due" : "pending",
        key: checkpointKey(publication, hours),
        setId: publication.setId,
        supportLang: publication.supportLang,
        targetLang: publication.targetLang,
        youtubeVideoId: publication.youtubeVideoId,
        youtubeVideoUrl: publication.youtubeVideoUrl || "",
        youtubePlaylistId: publication.youtubePlaylistId || "",
        channelKey: publication.channelKey || "",
        youtubeChannelId: publication.youtubeChannelId || "",
        publicationStatus: publication.publicationStatus || publication.status || "",
        privacyStatus: publication.privacyStatus || "",
        publishedAt,
        checkpointHours: Number(hours),
        dueAt,
        recommendedMetrics: [
          "views",
          "estimatedMinutesWatched",
          "averageViewDuration",
          "averageViewPercentage",
          "likes",
          "comments",
          "shares",
          "subscribersGained"
        ],
      };
      if (!options.dueOnly || due) rows.push(row);
    }
  }

  const outputPath = options.output || path.join("outputs", `youtube-analytics-readback-plan-${timestampSlug()}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    asOf: options.asOf,
    mode: "analytics_readback_plan",
    publicationRegistry: options.publicationRegistry,
    policy: options.policy,
    summary: {
      activePublicationCount: (registry.publications || []).filter(activePublication).length,
      checkpointCount: rows.length,
      dueCount: rows.filter((row) => row.status === "due").length,
      pendingCount: rows.filter((row) => row.status === "pending").length,
      missingPublishTimeCount: rows.filter((row) => row.status === "missing_publish_time").length,
      dueOnly: options.dueOnly,
    },
    rows,
    outputPath,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else {
    console.log("YouTube analytics readback plan");
    console.log(`Active publications: ${report.summary.activePublicationCount}`);
    console.log(`Checkpoints: ${report.summary.checkpointCount}`);
    console.log(`Due: ${report.summary.dueCount}`);
    console.log(`Pending: ${report.summary.pendingCount}`);
    console.log(`Missing publish time: ${report.summary.missingPublishTimeCount}`);
    console.log(`Report: ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
