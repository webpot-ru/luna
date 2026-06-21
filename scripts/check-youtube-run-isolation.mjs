#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { normalizeShardOptions } from "./lib/work-shards.mjs";

function parseArgs(argv) {
  const options = {
    inputs: [],
    shardCount: 1,
    shardIndex: 0,
    output: "",
    allowEmpty: false,
    json: false,
  };
  for (const arg of argv) {
    if (arg === "--allow-empty") options.allowEmpty = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--shard-count=")) options.shardCount = Number(arg.slice("--shard-count=".length));
    else if (arg.startsWith("--shard-index=")) options.shardIndex = Number(arg.slice("--shard-index=".length));
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else options.inputs.push(arg);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/check-youtube-run-isolation.mjs <metadata-dir> --shard-count=<n> --shard-index=<n>",
    "",
    "Checks that generated youtube_metadata.json rows are unique and belong to this deterministic shard.",
  ].join("\n");
}

function collectFiles(inputs, predicate) {
  const files = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectFiles([full], predicate));
        else if (entry.isFile() && predicate(full)) files.push(full);
      }
    } else if (stat.isFile() && predicate(resolved)) {
      files.push(resolved);
    }
  }
  return [...new Set(files)].sort();
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function keyFor(row) {
  return [
    row.setId,
    normalizeCode(row.supportLang),
    normalizeCode(row.targetLang),
  ].join("|");
}

function supportKey(setId, supportLang) {
  return `${setId}|${normalizeCode(supportLang)}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  const shard = normalizeShardOptions(options);
  const metadataFiles = collectFiles(options.inputs, (file) => {
    const basename = path.basename(file);
    return basename === "youtube_metadata.json" || basename.endsWith("_youtube_metadata.json");
  });
  const manifestFiles = collectFiles(options.inputs, (file) => /_metadata_shard_\d+_of_\d+\.json$/.test(path.basename(file)));
  const blockers = [];
  const warnings = [];

  if (!metadataFiles.length && !options.allowEmpty) blockers.push("no youtube_metadata.json files found");
  if (!manifestFiles.length && shard.shardCount > 1) blockers.push("no metadata shard manifest found for sharded run");

  const manifestsBySupport = new Map();
  for (const manifestFile of manifestFiles) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (Number(manifest.shardCount) !== shard.shardCount || Number(manifest.shardIndex) !== shard.shardIndex) {
      blockers.push(`shard manifest mismatch: ${manifestFile}`);
    }
    manifestsBySupport.set(supportKey(manifest.setId, manifest.supportLang), {
      manifestFile,
      manifest,
      selectedTargets: new Set((manifest.selectedTargets || []).map(normalizeCode)),
      skippedTargets: new Set((manifest.skippedTargets || []).map(normalizeCode)),
    });
  }

  const rows = [];
  const seen = new Map();
  for (const metadataFile of metadataFiles) {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const row = {
      metadataFile,
      setId: metadata.setId || "",
      supportLang: normalizeCode(metadata.supportLang),
      targetLang: normalizeCode(metadata.targetLang),
      title: metadata.title || "",
    };
    rows.push(row);
    const key = keyFor(row);
    if (seen.has(key)) blockers.push(`duplicate metadata key ${key}: ${seen.get(key)} and ${metadataFile}`);
    seen.set(key, metadataFile);

    if (shard.shardCount > 1) {
      const manifestEntry = manifestsBySupport.get(supportKey(row.setId, row.supportLang));
      if (!manifestEntry) {
        blockers.push(`no shard manifest for ${row.setId}/${row.supportLang}`);
      } else if (!manifestEntry.selectedTargets.has(row.targetLang)) {
        blockers.push(`metadata ${key} is not assigned to shard ${shard.shardIndex}/${shard.shardCount}`);
      } else if (manifestEntry.skippedTargets.has(row.targetLang)) {
        blockers.push(`metadata ${key} appears in skippedTargets for this shard`);
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: blockers.length ? "blocked" : "pass",
    shardCount: shard.shardCount,
    shardIndex: shard.shardIndex,
    summary: {
      metadataCount: rows.length,
      manifestCount: manifestFiles.length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
    },
    blockers,
    warnings,
    rows,
    manifestFiles,
  };

  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else console.log(JSON.stringify(report, null, 2));
  if (blockers.length) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
