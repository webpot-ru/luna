#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  findActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";
import { shardItems } from "./lib/work-shards.mjs";

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    targets: null,
    excludeSupports: [],
    excludeTargets: [],
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    additionalPublicationRegistries: [],
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
    } else if (arg === "--exclude-supports" || arg.startsWith("--exclude-supports=") || arg === "--exclude-support" || arg.startsWith("--exclude-support=")) {
      const value = readValue();
      options.excludeSupports = value.toUpperCase() === "NONE" || value.trim() === ""
        ? []
        : value.split(",").map(normalizeCode).filter(Boolean);
    } else if ((arg === "--targets" || arg === "--langs") || arg.startsWith("--targets=") || arg.startsWith("--langs=")) {
      const value = readValue();
      options.targets = value.toUpperCase() === "ALL"
        ? null
        : value.split(",").map(normalizeCode).filter(Boolean);
    } else if (arg === "--exclude-targets" || arg.startsWith("--exclude-targets=") || arg === "--exclude-langs" || arg.startsWith("--exclude-langs=")) {
      const value = readValue();
      options.excludeTargets = value.toUpperCase() === "NONE" || value.trim() === ""
        ? []
        : value.split(",").map(normalizeCode).filter(Boolean);
    } else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) {
      options.publicationRegistry = readValue();
    } else if (arg === "--additional-publication-registry" || arg.startsWith("--additional-publication-registry=")) {
      options.additionalPublicationRegistries.push(readValue());
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
    "  --exclude-supports <codes> Exclude support languages from this plan, e.g. HY while Armenian TTS is blocked.",
    "  --exclude-targets <codes>  Exclude target languages from this plan, e.g. HY while Armenian TTS is blocked.",
    "  --additional-publication-registry <file>",
    "                          Extra registry/blocklist JSON, for example live YouTube readback evidence.",
    "  --shard-count <n>       Report deterministic shard selection for the eligible target list.",
    "  --shard-index <n>       0-based deterministic shard index.",
    "  --output <file>         Write the full preflight report.",
    "  --json                  Print compact summary.",
  ].join("\n");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

async function resolveAllTargetLanguages(setId, supportLang) {
  const { resolveTargetLanguages } = await import("./lib/youtube-metadata.mjs");
  return resolveTargetLanguages(setId, supportLang);
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

function mergePublicationRegistries(primaryRegistry, additionalRegistryPaths = []) {
  const merged = {
    ...primaryRegistry,
    publications: [...(primaryRegistry.publications || [])],
  };
  for (const registryPath of additionalRegistryPaths) {
    if (!registryPath) continue;
    if (!fs.existsSync(registryPath)) {
      throw new Error(`Additional publication registry not found: ${registryPath}`);
    }
    const additional = loadPublicationRegistry(registryPath);
    merged.publications.push(...(additional.publications || []));
  }
  return merged;
}

function excludedSupportPlan({ setId, supportLang }) {
  return {
    setId,
    supportLang: normalizeCode(supportLang),
    requestedTargets: [],
    eligibleTargets: [],
    eligibleTargetsCsv: "",
    shardSelectedTargets: [],
    shardSelectedTargetsCsv: "",
    skippedTargets: [],
    skippedSupportReason: "excluded_support_language",
    counts: {
      allTargets: 0,
      requestedTargets: 0,
      eligibleTargets: 0,
      skippedTargets: 0,
      shardSelectedTargets: 0,
    },
  };
}

async function supportPlan({ setId, supportLang, requestedTargets, excludeTargets, publicationRegistry, allowRepublish, shardCount, shardIndex }) {
  const excludedTargets = new Set(normalizeTargetList(excludeTargets));
  const allTargets = requestedTargets
    ? normalizeTargetList(requestedTargets)
    : normalizeTargetList(await resolveAllTargetLanguages(setId, supportLang));
  const requested = allTargets;
  const skippedTargets = [];
  const eligibleTargets = [];

  for (const targetLang of requested) {
    if (excludedTargets.has(targetLang)) {
      skippedTargets.push({
        targetLang,
        reason: "excluded_target_language",
      });
      continue;
    }
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

  const publicationRegistry = mergePublicationRegistries(
    loadPublicationRegistry(options.publicationRegistry),
    options.additionalPublicationRegistries,
  );
  const requestedTargets = options.targets ? normalizeTargetList(options.targets) : null;
  const supports = normalizeTargetList(options.supports);
  const excludedSupports = new Set(normalizeTargetList(options.excludeSupports));
  const supportReports = [];
  for (const supportLang of supports) {
    if (excludedSupports.has(supportLang)) {
      supportReports.push(excludedSupportPlan({ setId: options.setId, supportLang }));
      continue;
    }
    supportReports.push(await supportPlan({
      setId: options.setId,
      supportLang,
      requestedTargets,
      excludeTargets: options.excludeTargets,
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
    additionalPublicationRegistries: options.additionalPublicationRegistries,
    allowRepublish: options.allowRepublish,
    excludedSupports: normalizeTargetList(options.excludeSupports),
    excludedTargets: normalizeTargetList(options.excludeTargets),
    shardCount: options.shardCount,
    shardIndex: options.shardIndex,
    supports: supportReports,
    summary: {
      supportCount: supportReports.length,
      requestedTargetCount: supportReports.reduce((sum, row) => sum + row.counts.requestedTargets, 0),
      eligibleTargetCount: supportReports.reduce((sum, row) => sum + row.counts.eligibleTargets, 0),
      shardSelectedTargetCount: supportReports.reduce((sum, row) => sum + row.counts.shardSelectedTargets, 0),
      skippedExcludedSupportCount: supportReports.filter((row) => row.skippedSupportReason === "excluded_support_language").length,
      skippedExistingPublicationCount: supportReports.reduce((sum, row) => sum + row.skippedTargets.filter((item) => item.reason === "existing_active_publication").length, 0),
      skippedExcludedTargetCount: supportReports.reduce((sum, row) => sum + row.skippedTargets.filter((item) => item.reason === "excluded_target_language").length, 0),
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
