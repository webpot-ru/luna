#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { buildToolSourceBatchContext } from "./lib/tool-source-adapters.mjs";

const args = process.argv.slice(2);
const verifyHashes = args.includes("--verify-hashes");
const strictCache = args.includes("--strict-cache");

function isToolSource(source) {
  return source.kind === "tool_adapter" || source.kind === "deferred_tool_adapter";
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

function addIssue(target, source, code, detail) {
  target.push({
    source_id: source?.id ?? null,
    code,
    detail,
  });
}

const manifest = await loadReferenceSourcesManifest();
const blockers = [];
const warnings = [];
const seenIds = new Set();
const cacheRows = [];

for (const source of manifest.sources ?? []) {
  if (!source.id) {
    addIssue(blockers, source, "manifest_missing_id", "Manifest source is missing id.");
    continue;
  }
  if (seenIds.has(source.id)) {
    addIssue(blockers, source, "manifest_duplicate_id", `Duplicate source id: ${source.id}`);
  }
  seenIds.add(source.id);

  if (!source.license_note) addIssue(blockers, source, "manifest_missing_license_note", "Missing license_note.");
  if (!Array.isArray(source.primary_lunacards_use) || source.primary_lunacards_use.length === 0) {
    addIssue(blockers, source, "manifest_missing_primary_use", "Missing primary_lunacards_use.");
  }

  if (isToolSource(source)) {
    if (!source.kind) addIssue(blockers, source, "manifest_missing_tool_kind", "Tool source is missing kind.");
    cacheRows.push({
      source_id: source.id,
      kind: source.kind,
      local_path: null,
      cache_status: source.kind === "deferred_tool_adapter" ? "deferred_tool" : "tool_adapter",
    });
    continue;
  }

  if (!source.local_path) {
    addIssue(blockers, source, "manifest_missing_local_path", "Non-tool source is missing local_path.");
    continue;
  }
  if (!source.sha256) addIssue(blockers, source, "manifest_missing_sha256", "Non-tool source is missing sha256.");
  if (source.bytes === undefined || source.bytes === null) {
    addIssue(blockers, source, "manifest_missing_bytes", "Non-tool source is missing bytes.");
  }

  const localPath = path.resolve(source.local_path);
  try {
    const info = await stat(localPath);
    const row = {
      source_id: source.id,
      kind: source.kind ?? "raw_file",
      local_path: source.local_path,
      cache_status: "present",
      bytes_manifest: source.bytes,
      bytes_actual: info.size,
    };
    if (source.bytes !== undefined && Number(source.bytes) !== Number(info.size)) {
      const issue = {
        source_id: source.id,
        code: "cache_size_mismatch",
        detail: `Size mismatch manifest=${source.bytes} actual=${info.size}`,
      };
      (strictCache ? blockers : warnings).push(issue);
      row.cache_status = "size_mismatch";
    }
    if (verifyHashes && source.sha256) {
      const actualSha256 = await sha256File(localPath);
      row.sha256_actual = actualSha256;
      if (actualSha256 !== source.sha256) {
        const issue = {
          source_id: source.id,
          code: "cache_sha256_mismatch",
          detail: `SHA-256 mismatch manifest=${source.sha256} actual=${actualSha256}`,
        };
        (strictCache ? blockers : warnings).push(issue);
        row.cache_status = "sha256_mismatch";
      }
    }
    cacheRows.push(row);
  } catch (error) {
    const issue = {
      source_id: source.id,
      code: "cache_missing_local_source",
      detail: `${source.local_path}: ${error.message}`,
    };
    (strictCache ? blockers : warnings).push(issue);
    cacheRows.push({
      source_id: source.id,
      kind: source.kind ?? "raw_file",
      local_path: source.local_path,
      cache_status: "missing",
    });
  }
}

const toolContext = await buildToolSourceBatchContext();
for (const warning of toolContext.warnings) {
  warnings.push({
    source_id: warning.source_id,
    code: warning.code,
    detail: warning.detail,
  });
}

const summary = {
  manifest_version: manifest.manifest_version ?? null,
  source_count: manifest.sources?.length ?? 0,
  raw_sources: cacheRows.filter((row) => row.local_path).length,
  raw_present: cacheRows.filter((row) => row.local_path && row.cache_status === "present").length,
  raw_missing_or_mismatch: cacheRows.filter(
    (row) => row.local_path && row.cache_status !== "present"
  ).length,
  tool_sources: cacheRows.filter((row) => !row.local_path && row.kind === "tool_adapter").length,
  deferred_tool_sources: cacheRows.filter((row) => row.kind === "deferred_tool_adapter").length,
  optional_tool_warnings: toolContext.warnings.length,
  blockers: blockers.length,
  warnings: warnings.length,
  verify_hashes: verifyHashes,
  strict_cache: strictCache,
};

if (blockers.length > 0) {
  console.error(`Reference sources cache check failed: ${blockers.length} blocker(s), ${warnings.length} warning(s).`);
  for (const blocker of blockers.slice(0, 120)) {
    console.error(`${blocker.source_id ?? "manifest"}: ${blocker.code}; ${blocker.detail}`);
  }
  const hidden = blockers.length - 120;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.error(`Reference sources cache warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 80)) {
    console.error(`${warning.source_id ?? "manifest"}: ${warning.code}; ${warning.detail}`);
  }
  const hidden = warnings.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`Reference sources cache OK: ${JSON.stringify(summary)}`);
