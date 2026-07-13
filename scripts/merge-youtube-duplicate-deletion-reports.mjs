#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    reports: [],
    targetFile: "config/youtube-duplicate-delete-plans/2026-07-13-decks-1-2-32.json",
    registryFile: "config/youtube-published-videos.json",
    calendarFile: "config/youtube-publish-calendar.json",
    apply: false,
  };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg.startsWith("--report=")) options.reports.push(arg.slice("--report=".length));
    else if (arg.startsWith("--target-file=")) options.targetFile = arg.slice("--target-file=".length);
    else if (arg.startsWith("--registry=")) options.registryFile = arg.slice("--registry=".length);
    else if (arg.startsWith("--calendar=")) options.calendarFile = arg.slice("--calendar=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Required file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function artifactConfigFile(reportFile, name) {
  return path.resolve(path.dirname(reportFile), "..", "config", name);
}

function replacePublication(publications, replacement) {
  const remaining = publications.filter(row => row.youtubeVideoId !== replacement.youtubeVideoId);
  publications.splice(0, publications.length, ...remaining, replacement);
}

function canonicalArtifactRow(rows, expected, videoId, deleted) {
  const candidates = rows.filter(row => row.youtubeVideoId === videoId);
  const selected = deleted
    ? candidates.find(row => String(row.publicationStatus || row.status || "").includes("deleted"))
    : candidates.find(row => !String(row.publicationStatus || row.status || "").includes("deleted"));
  if (!selected) throw new Error(`Artifact has no ${deleted ? "deleted" : "active"} durable row for ${videoId}.`);
  return {
    ...selected,
    setId: expected.setId,
    videoType: expected.videoType,
    supportLang: expected.supportLang,
    targetLang: expected.targetLang,
    targetLangs: expected.videoType === "polyglot" ? expected.targetLang.split(",") : [],
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.reports.length !== 4) throw new Error(`Exactly four route reports are required; received ${options.reports.length}.`);

  const targetPlan = readJson(options.targetFile);
  const expectedByDeleteId = new Map(targetPlan.targets.map(target => [target.deleteVideoId, target]));
  if (expectedByDeleteId.size !== targetPlan.expectedTargetCount) throw new Error("Target manifest count is inconsistent.");

  const registry = readJson(options.registryFile);
  const calendar = readJson(options.calendarFile);
  const seenRoutes = new Set();
  const seenDeleteIds = new Set();
  let calendarUpdates = 0;

  for (const reportFile of options.reports) {
    const report = readJson(reportFile);
    if (!/^youtube-[1-4]$/.test(report.route) || seenRoutes.has(report.route)) throw new Error(`Invalid or repeated route report: ${report.route}`);
    if (!Array.isArray(report.errors) || report.errors.length > 0) throw new Error(`Route ${report.route} contains deletion errors.`);
    seenRoutes.add(report.route);

    const artifactRegistry = readJson(artifactConfigFile(reportFile, "youtube-published-videos.json"));
    const artifactCalendar = readJson(artifactConfigFile(reportFile, "youtube-publish-calendar.json"));

    for (const deleted of report.deleted || []) {
      const expected = expectedByDeleteId.get(deleted.deleteVideoId);
      if (!expected) throw new Error(`Report contains unapproved DELETE id ${deleted.deleteVideoId}.`);
      if (expected.route !== report.route || expected.keepVideoId !== deleted.keepVideoId) {
        throw new Error(`KEEP/route mismatch for ${deleted.deleteVideoId}.`);
      }
      if (seenDeleteIds.has(deleted.deleteVideoId)) throw new Error(`DELETE id repeated across reports: ${deleted.deleteVideoId}.`);
      seenDeleteIds.add(deleted.deleteVideoId);

      replacePublication(
        registry.publications,
        canonicalArtifactRow(artifactRegistry.publications, expected, deleted.keepVideoId, false),
      );
      replacePublication(
        registry.publications,
        canonicalArtifactRow(artifactRegistry.publications, expected, deleted.deleteVideoId, true),
      );

      const reconciled = artifactCalendar.reservations.filter(row => row.duplicateVideoIdDeleted === deleted.deleteVideoId);
      if (reconciled.length > 1) throw new Error(`Artifact ${report.route} has multiple reconciled calendar rows for ${deleted.deleteVideoId}.`);
      if (reconciled.length === 1) {
        const replacement = reconciled[0];
        const index = calendar.reservations.findIndex(row =>
          row.youtubeVideoId === deleted.deleteVideoId ||
          (row.youtubeVideoId === deleted.keepVideoId && row.publishAt === replacement.publishAt)
        );
        if (index >= 0) calendar.reservations[index] = replacement;
        else calendar.reservations.push(replacement);
        calendarUpdates++;
      }
    }
  }

  const missing = [...expectedByDeleteId.keys()].filter(id => !seenDeleteIds.has(id));
  if (missing.length) throw new Error(`Deletion reports are incomplete: ${missing.join(",")}`);

  const activeDeleted = registry.publications.filter(row =>
    seenDeleteIds.has(row.youtubeVideoId) && !String(row.publicationStatus || row.status || "").includes("deleted")
  );
  if (activeDeleted.length) throw new Error(`Deleted videos remain active in durable registry: ${activeDeleted.map(row => row.youtubeVideoId).join(",")}`);

  if (options.apply) {
    fs.writeFileSync(options.registryFile, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    fs.writeFileSync(options.calendarFile, `${JSON.stringify(calendar, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    mode: options.apply ? "apply" : "dry-run",
    routes: [...seenRoutes].sort(),
    mergedDeletionCount: seenDeleteIds.size,
    calendarUpdates,
    registryPublicationCount: registry.publications.length,
    calendarReservationCount: calendar.reservations.length,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Duplicate deletion merge failed: ${error.message}`);
  process.exit(1);
}
