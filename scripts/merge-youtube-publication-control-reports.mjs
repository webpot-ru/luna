#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    input: ".control-artifacts",
    output: "outputs/youtube-publication-control-all-routes.json",
    markdown: "outputs/youtube-publication-control-all-routes.md",
    expectedRoutes: 4,
    sourceRuns: [],
  };
  for (const arg of argv) {
    if (arg.startsWith("--input=")) options.input = arg.slice("--input=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg.startsWith("--markdown=")) options.markdown = arg.slice("--markdown=".length);
    else if (arg.startsWith("--expected-routes=")) options.expectedRoutes = Number(arg.slice("--expected-routes=".length));
    else if (arg.startsWith("--source-run=")) options.sourceRuns.push(arg.slice("--source-run=".length));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function parseSourceRun(value) {
  const [setId, route, runId] = String(value || "").split(":");
  if (!setId || !route || !/^\d+$/u.test(runId || "")) {
    throw new Error(`Invalid --source-run, expected setId:route:runId: ${value}`);
  }
  return {
    setId,
    route,
    githubRunId: runId,
    githubRunUrl: `https://github.com/webpot-ru/luna/actions/runs/${runId}`,
  };
}

function findReports(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/youtube-publication-control-youtube-[1-4]\.json$/u.test(entry.name)) files.push(full);
    }
  };
  visit(root);
  return files.sort();
}

function uniqueRows(rows, keyFor) {
  return [...new Map(rows.map((row) => [keyFor(row), row])).values()];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = findReports(options.input);
  const routes = files.map((file) => ({ file, report: JSON.parse(fs.readFileSync(file, "utf8")) }));
  const tails = uniqueRows(routes.flatMap(({ report }) => report.tails || []), (row) => row.videoType === "polyglot"
    ? `polyglot|${row.polyglotKey}`
    : `ordinary|${row.setId}|${row.supportLang}|${row.targetLang}`);
  const publications = uniqueRows(routes.flatMap(({ report }) => report.publications || []), (row) => row.youtubeVideoId);
  const unclassifiedUploads = uniqueRows(routes.flatMap(({ report }) => report.unclassifiedUploads || []), (row) => row.youtubeVideoId);
  const blockers = routes.flatMap(({ file, report }) => (report.blockers || []).map((row) => ({ routeArtifact: file, ...row })));
  const calendarDayGaps = routes.flatMap(({ file, report }) => (report.calendarDayGaps || []).map((row) => ({ routeArtifact: file, ...row })));
  const sourceRuns = options.sourceRuns.map(parseSourceRun);
  const summary = {
    complete: routes.length === options.expectedRoutes,
    expectedRouteCount: options.expectedRoutes,
    receivedRouteCount: routes.length,
    healthy: routes.length === options.expectedRoutes && blockers.length === 0,
    blockerCount: blockers.length,
    tailCount: tails.length,
    ordinaryTailCount: tails.filter((row) => row.videoType !== "polyglot").length,
    polyglotTailCount: tails.filter((row) => row.videoType === "polyglot").length,
    activeVideoCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.activeVideoCount || 0), 0),
    publicCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.publicCount || 0), 0),
    scheduledCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.scheduledCount || 0), 0),
    privateUnscheduledCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.privateUnscheduledCount || 0), 0),
    liveScheduleMissingCalendarCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.liveScheduleMissingCalendarCount || 0), 0),
    calendarAssignmentDuplicateCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.calendarAssignmentDuplicateCount || 0), 0),
    calendarSlotCollisionCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.calendarSlotCollisionCount || 0), 0),
    liveVideoMissingDurableRegistryCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.liveVideoMissingDurableRegistryCount || 0), 0),
    liveStatusNotReturnedCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.liveStatusNotReturnedCount || 0), 0),
    unclassifiedUploadCount: unclassifiedUploads.length,
    unclassifiedRecentUploadCount: routes.reduce((sum, item) => sum + Number(item.report.summary?.unclassifiedRecentUploadCount || 0), 0),
    calendarDayGapCount: calendarDayGaps.reduce((sum, item) => sum + (item.missingDates?.length || 0), 0),
    videoStatusReadbackComplete: routes.every((item) => item.report.evidence?.videoStatusReadback === true),
    paginationComplete: routes.every((item) => item.report.evidence?.paginationComplete === true),
  };
  const aggregate = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_publication_control_all_routes",
    summary,
    routes: routes.map(({ file, report }) => ({
      file,
      setId: report.setId,
      supports: report.supports,
      generatedAt: report.generatedAt || "",
      evidence: report.evidence || {},
      summary: report.summary,
    })),
    sourceRuns,
    blockers,
    publications,
    unclassifiedUploads,
    tails,
    calendarDayGaps,
  };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
  const lines = [
    "# YouTube Publication Control",
    "",
    `Generated: ${aggregate.generatedAt}`,
    "",
    `- Routes: ${summary.receivedRouteCount}/${summary.expectedRouteCount}`,
    `- Healthy: ${summary.healthy}`,
    `- Active videos: ${summary.activeVideoCount}`,
    `- Public: ${summary.publicCount}`,
    `- Scheduled: ${summary.scheduledCount}`,
    `- Private unscheduled: ${summary.privateUnscheduledCount}`,
    `- videos.list status readback complete: ${summary.videoStatusReadbackComplete}`,
    `- Explicit pagination complete: ${summary.paginationComplete}`,
    `- Tails: ${summary.tailCount} (ordinary ${summary.ordinaryTailCount}, Polyglot ${summary.polyglotTailCount})`,
    `- Blockers: ${summary.blockerCount}`,
    `- Scheduled live videos missing calendar: ${summary.liveScheduleMissingCalendarCount}`,
    `- Calendar assignment duplicates: ${summary.calendarAssignmentDuplicateCount}`,
    `- Calendar slot collisions: ${summary.calendarSlotCollisionCount}`,
    `- Live videos missing durable registry: ${summary.liveVideoMissingDurableRegistryCount}`,
    `- Live video statuses not returned: ${summary.liveStatusNotReturnedCount}`,
    `- Unclassified uploads: ${summary.unclassifiedUploadCount} (recent blockers ${summary.unclassifiedRecentUploadCount})`,
    `- Calendar day gaps: ${summary.calendarDayGapCount}`,
    "",
    "## Tails",
    "",
    ...(tails.length ? tails.map((row) => row.videoType === "polyglot"
      ? `- ${row.supportLang} -> Polyglot ${row.bundleKey} (${row.contentScope || "full"}) [${(row.targetLangs || []).join(",")}]`
      : `- ${row.supportLang} -> ${row.targetLang}`) : ["- none"]),
    "",
    "## Publications",
    "",
    ...(publications.length ? publications.map((row) => {
      const target = row.videoType === "polyglot"
        ? `Polyglot ${row.bundleKey} (${row.contentScope || "full"}) [${(row.targetLangs || []).join(",")}]`
        : row.targetLang;
      const state = row.privacyStatus === "public" ? "public" : (row.publishAt ? `scheduled ${row.publishAt}` : "private-unscheduled");
      const thumbnail = row.thumbnailSet === true ? "custom" : (row.thumbnailUploadMode || "unknown");
      return `- ${row.supportLang} -> ${target} | ${state} | thumbnail=${thumbnail} | ${row.youtubeVideoUrl}`;
    }) : ["- none"]),
    "",
    "## Blockers",
    "",
    ...(blockers.length ? blockers.map((row) => `- ${row.type}: ${row.key || row.youtubeVideoId || "see JSON"}`) : ["- none"]),
    "",
  ];
  fs.writeFileSync(options.markdown, `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main();
