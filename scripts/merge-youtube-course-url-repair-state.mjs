#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  loadPublicationRegistry,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";
import { normalizeLanguageCode } from "./lib/youtube-playlists.mjs";

function parseArgs(argv) {
  const options = {
    artifactDir: "",
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    summary: "",
  };
  for (const arg of argv) {
    if (arg.startsWith("--artifact-dir=")) options.artifactDir = arg.slice("--artifact-dir=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--summary=")) options.summary = arg.slice("--summary=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.artifactDir) throw new Error("--artifact-dir is required.");
  return options;
}

function candidateArtifactRegistryPaths(artifactDir) {
  return [
    path.join(artifactDir, "config/youtube-published-videos.json"),
    path.join(artifactDir, "youtube-published-videos.json"),
  ];
}

function findArtifactRegistryPath(artifactDir) {
  return candidateArtifactRegistryPaths(artifactDir).find((candidate) => fs.existsSync(candidate)) || "";
}

function keyFor(row) {
  return [
    row?.setId || "",
    normalizeLanguageCode(row?.supportLang),
    normalizeLanguageCode(row?.targetLang),
    row?.youtubeVideoId || "",
  ].join("|");
}

function writeSummary(filePath, summary) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function mergeCourseUrlRepair({ currentRegistry, artifactRegistry }) {
  const currentByVideoId = new Map();
  for (const row of currentRegistry.publications || []) {
    if (row.youtubeVideoId) currentByVideoId.set(row.youtubeVideoId, row);
  }

  const summary = {
    artifactRepairRows: 0,
    updated: 0,
    skippedNoRepair: 0,
    skippedMissingCurrentRow: 0,
    skippedIdentityMismatch: 0,
    skippedUntrustedSource: 0,
    results: [],
  };

  for (const artifactRow of artifactRegistry.publications || []) {
    const repair = artifactRow.courseUrlRepair;
    if (!repair?.repairedAt) {
      summary.skippedNoRepair += 1;
      continue;
    }
    summary.artifactRepairRows += 1;
    if (repair.source !== "scripts/youtube-repair-course-url.mjs") {
      summary.skippedUntrustedSource += 1;
      summary.results.push({
        youtubeVideoId: artifactRow.youtubeVideoId || "",
        status: "skipped_untrusted_source",
        source: repair.source || "",
      });
      continue;
    }

    const currentRow = currentByVideoId.get(artifactRow.youtubeVideoId);
    if (!currentRow) {
      summary.skippedMissingCurrentRow += 1;
      summary.results.push({
        youtubeVideoId: artifactRow.youtubeVideoId || "",
        status: "skipped_missing_current_row",
      });
      continue;
    }
    if (keyFor(currentRow) !== keyFor(artifactRow)) {
      summary.skippedIdentityMismatch += 1;
      summary.results.push({
        youtubeVideoId: artifactRow.youtubeVideoId || "",
        status: "skipped_identity_mismatch",
        currentKey: keyFor(currentRow),
        artifactKey: keyFor(artifactRow),
      });
      continue;
    }

    currentRow.courseUrlRepair = repair;
    if (artifactRow.lastMetadataRepairAt) currentRow.lastMetadataRepairAt = artifactRow.lastMetadataRepairAt;
    if (artifactRow.lastReadbackAt) currentRow.lastReadbackAt = artifactRow.lastReadbackAt;
    summary.updated += 1;
    summary.results.push({
      youtubeVideoId: artifactRow.youtubeVideoId,
      supportLang: normalizeLanguageCode(artifactRow.supportLang),
      targetLang: normalizeLanguageCode(artifactRow.targetLang),
      status: "updated",
      repairedAt: repair.repairedAt,
      readbackStatus: repair.readbackStatus || "",
    });
  }

  return summary;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const artifactRegistryPath = findArtifactRegistryPath(options.artifactDir);
  if (!artifactRegistryPath) {
    throw new Error(`No youtube-published-videos.json artifact found under ${options.artifactDir}`);
  }

  const currentRegistry = loadPublicationRegistry(options.publicationRegistry);
  const artifactRegistry = loadPublicationRegistry(artifactRegistryPath);
  const summary = {
    generatedAt: new Date().toISOString(),
    artifactDir: options.artifactDir,
    artifactRegistryPath,
    publicationRegistry: options.publicationRegistry,
    ...mergeCourseUrlRepair({ currentRegistry, artifactRegistry }),
  };

  savePublicationRegistry(currentRegistry, options.publicationRegistry);
  writeSummary(options.summary, summary);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.skippedIdentityMismatch || summary.skippedUntrustedSource) process.exit(1);
}

main();
