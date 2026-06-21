#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { resolveTargetLanguages } from "./lib/youtube-metadata.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  findActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";
import { shardItems } from "./lib/work-shards.mjs";
import { normalizeLanguageCode } from "./lib/youtube-playlists.mjs";

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    targets: null,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    allowRepublish: false,
    shardCount: 1,
    shardIndex: 0,
    output: "",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--set" || arg.startsWith("--set=")) options.setId = readValue();
    else if (arg === "--support" || arg.startsWith("--support=")) {
      options.supports = readValue().split(",").map(normalizeCode).filter(Boolean);
    } else if ((arg === "--targets" || arg === "--langs") || arg.startsWith("--targets=") || arg.startsWith("--langs=")) {
      const value = readValue();
      options.targets = value.toUpperCase() === "ALL"
        ? null
        : value.split(",").map(normalizeCode).filter(Boolean);
    } else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) {
      options.publicationRegistry = readValue();
    } else if (arg === "--shard-count" || arg.startsWith("--shard-count=")) {
      options.shardCount = Number(readValue());
    } else if (arg === "--shard-index" || arg.startsWith("--shard-index=")) {
      options.shardIndex = Number(readValue());
    } else if (arg === "--output" || arg.startsWith("--output=")) {
      options.output = readValue();
    } else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-youtube-generation-targets.mjs --set <set_id> --support RU[,EN] [--targets ES,IT]",
    "",
    "Plans target languages before expensive video/metadata/thumbnail generation.",
    "Already active publications in config/youtube-published-videos.json are excluded unless --allow-republish is passed.",
    "",
    "Options:",
    "  --shard-count <n>       Report deterministic shard selection for the eligible target list.",
    "  --shard-index <n>       0-based deterministic shard index.",
    "  --output <file>         Write the full preflight report.",
    "  --json                  Print compact summary.",
  ].join("\n");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function normalizeTargetList(values) {
  return [...new Set((values || []).map(normalizeCode).filter(Boolean))].sort();
}

function compactExistingPublication(row) {
  if (!row) return null;
  return {
    youtubeVideoId: row.youtubeVideoId || "",
    youtubeVideoUrl: row.youtubeVideoUrl || "",
    publicationStatus: row.publicationStatus || row.status || "",
    privacyStatus: row.privacyStatus || "",
    publishAt: row.publishAt || row.scheduledPublishAt || "",
    uploadedAt: row.uploadedAt || "",
    githubRunId: row.githubRunId || "",
  };
}

async function supportPlan({ setId, supportLang, requestedTargets, publicationRegistry, allowRepublish, shardCount, shardIndex }) {
  const allTargets = requestedTargets
    ? normalizeTargetList(requestedTargets)
    : normalizeTargetList(await resolveTargetLanguages(setId, supportLang));
  const requested = allTargets;
  const skippedTargets = [];
  const eligibleTargets = [];

  for (const targetLang of requested) {
    const existingPublication = findActivePublication(publicationRegistry, {
      setId,
      supportLang,
      targetLang,
    });
    if (existingPublication && !allowRepublish) {
      skippedTargets.push({
        targetLang,
        reason: "existing_active_publication",
        existingPublication: compactExistingPublication(existingPublication),
      });
      continue;
    }
    eligibleTargets.push(targetLang);
  }

  const shard = shardItems(eligibleTargets, { shardCount, shardIndex });
  return {
    setId,
    supportLang: normalizeCode(supportLang),
    requestedTargets: requested,
    eligibleTargets,
    eligibleTargetsCsv: eligibleTargets.join(","),
    shardSelectedTargets: shard.selectedItems,
    shardSelectedTargetsCsv: shard.selectedItems.join(","),
    skippedTargets,
    counts: {
      allTargets: allTargets.length,
      requestedTargets: requested.length,
      eligibleTargets: eligibleTargets.length,
      skippedTargets: skippedTargets.length,
      shardSelectedTargets: shard.selectedItems.length,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.setId || options.supports.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const requestedTargets = options.targets ? normalizeTargetList(options.targets) : null;
  const supports = normalizeTargetList(options.supports);
  const supportReports = [];
  for (const supportLang of supports) {
    supportReports.push(await supportPlan({
      setId: options.setId,
      supportLang,
      requestedTargets,
      publicationRegistry,
      allowRepublish: options.allowRepublish,
      shardCount: options.shardCount,
      shardIndex: options.shardIndex,
    }));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "generation_target_preflight",
    setId: options.setId,
    publicationRegistry: options.publicationRegistry,
    allowRepublish: options.allowRepublish,
    shardCount: options.shardCount,
    shardIndex: options.shardIndex,
    supports: supportReports,
    summary: {
      supportCount: supportReports.length,
      requestedTargetCount: supportReports.reduce((sum, row) => sum + row.counts.requestedTargets, 0),
      eligibleTargetCount: supportReports.reduce((sum, row) => sum + row.counts.eligibleTargets, 0),
      shardSelectedTargetCount: supportReports.reduce((sum, row) => sum + row.counts.shardSelectedTargets, 0),
      skippedExistingPublicationCount: supportReports.reduce((sum, row) => sum + row.skippedTargets.filter((item) => item.reason === "existing_active_publication").length, 0),
      hasEligibleTargets: supportReports.some((row) => row.eligibleTargets.length > 0),
      hasShardTargets: supportReports.some((row) => row.shardSelectedTargets.length > 0),
    },
  };

  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
