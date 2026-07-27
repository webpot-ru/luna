#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { canonicalSupportCode, normalizeCode } from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    reports: [],
    sourceRuns: [],
    output: "config/youtube-publication-snapshot.json",
    markdown: "docs/youtube-publication-map.md",
    coverAssetConfig: "config/youtube-cover-assets.json",
    playlistRegistry: "config/youtube-playlists.json",
    allowIncomplete: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--report" || arg.startsWith("--report=")) options.reports.push(value());
    else if (arg === "--source-run" || arg.startsWith("--source-run=")) options.sourceRuns.push(value());
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--markdown" || arg.startsWith("--markdown=")) options.markdown = value();
    else if (arg === "--cover-asset-config" || arg.startsWith("--cover-asset-config=")) options.coverAssetConfig = value();
    else if (arg === "--playlist-registry" || arg.startsWith("--playlist-registry=")) options.playlistRegistry = value();
    else if (arg === "--allow-incomplete") options.allowIncomplete = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Required JSON file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

function reportSetId(report) {
  const setIds = new Set([
    ...(report.routes || []).map((route) => route.setId),
    ...(report.publications || []).map((row) => row.setId),
    ...(report.tails || []).map((row) => row.setId),
  ].filter(Boolean));
  if (setIds.size !== 1) throw new Error(`Expected exactly one setId per aggregate report, found: ${[...setIds].join(",") || "none"}`);
  return [...setIds][0];
}

function publicationState(row, nowMillis) {
  if (row.privacyStatus === "public") return "public";
  if (row.publishAt && Date.parse(row.publishAt) > nowMillis) return "scheduled";
  return "private_unscheduled";
}

function compactPublication(row, nowMillis) {
  const videoType = row.videoType === "polyglot" ? "polyglot" : "ordinary";
  return {
    videoType,
    setId: row.setId || "",
    supportLang: canonicalSupportCode(row.supportLang),
    targetLang: videoType === "ordinary" ? normalizeCode(row.targetLang) : "",
    targetLangs: videoType === "polyglot" ? (row.targetLangs || []).map(normalizeCode).filter(Boolean) : [],
    bundleKey: videoType === "polyglot" ? row.bundleKey || "" : "",
    contentScope: videoType === "polyglot" ? row.contentScope || "full" : "",
    youtubeVideoId: row.youtubeVideoId,
    youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
    state: publicationState(row, nowMillis),
    privacyStatus: row.privacyStatus || "",
    publishAt: row.publishAt || "",
    thumbnailSet: row.thumbnailSet ?? null,
    thumbnailUploadMode: row.thumbnailUploadMode || "",
    durableRegistryPresent: row.durableRegistryPresent === true,
    liveReadbackPresent: row.liveReadbackPresent === true,
    statusEvidence: row.liveReadbackPresent === true ? "videos.list" : "durable_registry_only",
  };
}

function compactUnclassifiedUpload(row, setId) {
  const status = row.youtubeStatus || {};
  const youtubeVideoId = String(row.youtubeVideoId || "");
  return {
    youtubeVideoId,
    youtubeVideoUrl: row.youtubeVideoUrl || (youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : ""),
    supportLang: canonicalSupportCode(row.supportLang),
    channelKey: row.channelKey || "",
    youtubeChannelId: row.youtubeChannelId || "",
    title: row.title || "",
    uploadedAt: row.uploadedAt || "",
    privacyStatus: status.privacyStatus || row.privacyStatus || "",
    publishAt: status.publishAt || row.publishAt || "",
    uploadStatus: status.uploadStatus || row.uploadStatus || "",
    potentialCurrentSet: row.potentialCurrentSet === true,
    potentialCurrentSetEvaluated: Object.hasOwn(row, "potentialCurrentSet"),
    reviewedNonProduct: row.reviewedNonProduct === true,
    reviewReason: row.reviewReason || "",
    auditWindowStart: row.auditWindowStart || "",
    sourceSetIds: [setId].filter(Boolean),
  };
}

function mergeUnclassifiedUploads(decks) {
  const classifiedVideoIds = new Set(decks.flatMap((deck) => deck.publications.map((row) => row.youtubeVideoId)).filter(Boolean));
  const byVideoId = new Map();
  for (const row of decks.flatMap((deck) => deck.unclassifiedUploads || [])) {
    if (!row.youtubeVideoId || classifiedVideoIds.has(row.youtubeVideoId)) continue;
    const existing = byVideoId.get(row.youtubeVideoId);
    if (!existing) {
      byVideoId.set(row.youtubeVideoId, row);
      continue;
    }
    byVideoId.set(row.youtubeVideoId, {
      ...existing,
      ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== "" && value !== null && value !== undefined)),
      potentialCurrentSet: existing.potentialCurrentSet || row.potentialCurrentSet,
      potentialCurrentSetEvaluated: existing.potentialCurrentSetEvaluated || row.potentialCurrentSetEvaluated,
      reviewedNonProduct: existing.reviewedNonProduct || row.reviewedNonProduct,
      sourceSetIds: [...new Set([...(existing.sourceSetIds || []), ...(row.sourceSetIds || [])])].sort(),
    });
  }
  return [...byVideoId.values()].sort((a, b) => [a.supportLang, a.uploadedAt, a.youtubeVideoId].join("|").localeCompare(
    [b.supportLang, b.uploadedAt, b.youtubeVideoId].join("|"),
  ));
}

function reconcileDurableRowsObservedInUploads(publications, unclassifiedUploads, nowMillis) {
  const observedById = new Map(unclassifiedUploads.map((row) => [row.youtubeVideoId, row]));
  return publications.map((row) => {
    if (row.liveReadbackPresent || !row.durableRegistryPresent) return row;
    const observed = observedById.get(row.youtubeVideoId);
    if (!observed || observed.uploadStatus === "not_returned") return row;
    const statusReturned = Boolean(observed.uploadStatus);
    const privacyStatus = statusReturned ? observed.privacyStatus : row.privacyStatus;
    const publishAt = statusReturned ? observed.publishAt : row.publishAt;
    return {
      ...row,
      liveReadbackPresent: true,
      state: statusReturned ? publicationState({ privacyStatus, publishAt }, nowMillis) : "status_unknown",
      privacyStatus,
      publishAt,
      statusEvidence: statusReturned ? "videos.list_unclassified_registry_match" : "uploads_playlist_registry_match",
      liveIdentityResolution: "durable_registry_video_id_observed_in_uploads_playlist",
    };
  });
}

function duplicateGroups(report, publicationsById) {
  const groups = new Map();
  for (const blocker of report.blockers || []) {
    if (!["duplicate_live_assignment", "duplicate_registry_assignment"].includes(blocker.type)) continue;
    const videoIds = [...new Set(blocker.videoIds || [])].sort();
    if (videoIds.length < 2) continue;
    const groupKey = `${blocker.key || ""}|${videoIds.join(",")}`;
    const current = groups.get(groupKey) || {
      key: blocker.key || "",
      setId: blocker.setId || "",
      supportLang: canonicalSupportCode(blocker.supportLang),
      targetLang: normalizeCode(blocker.targetLang),
      videoIds,
      videoUrls: videoIds.map((id) => `https://www.youtube.com/watch?v=${id}`),
      titles: [],
      evidenceTypes: [],
    };
    current.titles = [...new Set([...current.titles, ...(blocker.titles || [])])];
    current.evidenceTypes = [...new Set([...current.evidenceTypes, blocker.type])].sort();
    groups.set(groupKey, current);
  }
  return [...groups.values()].map((group) => {
    const durableIds = group.videoIds.filter((id) => publicationsById.get(id)?.durableRegistryPresent === true);
    const recommendedKeepVideoId = durableIds.length === 1 ? durableIds[0] : "";
    return {
      ...group,
      recommendedKeepVideoId,
      candidateDeleteVideoIds: recommendedKeepVideoId ? group.videoIds.filter((id) => id !== recommendedKeepVideoId) : [],
      recommendationBasis: recommendedKeepVideoId ? "only_candidate_present_in_durable_registry" : "manual_review_required",
      requiresExplicitDeleteApproval: true,
    };
  }).sort((a, b) => [a.supportLang, a.key].join("|").localeCompare([b.supportLang, b.key].join("|")));
}

function minMax(values) {
  const ordered = values.filter(Boolean).sort();
  return { first: ordered[0] || "", last: ordered.at(-1) || "" };
}

function gitTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) return { available: false, files: new Set() };
  return {
    available: true,
    files: new Set(result.stdout.split("\0").filter(Boolean).map((value) => value.split(path.sep).join("/"))),
  };
}

function buildPlaylistCoverReadiness(assetConfigPath, playlistRegistryPath) {
  const assetConfig = readOptionalJson(assetConfigPath, { playlistManifests: [] });
  const playlistRegistry = readOptionalJson(playlistRegistryPath, { playlists: [] });
  const playlistByKey = new Map((playlistRegistry.playlists || []).map((row) => [row.playlist_key || row.key, row]));
  const tracked = gitTrackedFiles();
  const byKey = new Map();

  for (const descriptor of assetConfig.playlistManifests || []) {
    if (descriptor.status && descriptor.status !== "approved") continue;
    const manifest = readJson(descriptor.path);
    for (const row of manifest.records || []) {
      const playlistKey = row.playlistKey || row.playlist_key || "";
      if (!playlistKey) continue;
      const registryRow = playlistByKey.get(playlistKey) || {};
      const manifestPlaylistId = row.playlistId || row.youtube_playlist_id || "";
      const registryPlaylistId = registryRow.youtube_playlist_id || registryRow.playlistId || "";
      const playlistIdConflict = Boolean(manifestPlaylistId && registryPlaylistId && manifestPlaylistId !== registryPlaylistId);
      const playlistId = registryPlaylistId || manifestPlaylistId;
      const coverPath = String(row.coverPath || row.render?.path || "").split(path.sep).join("/");
      const absoluteCoverPath = coverPath ? (path.isAbsolute(coverPath) ? coverPath : path.resolve(process.cwd(), coverPath)) : "";
      const repoRelativeCoverPath = absoluteCoverPath && absoluteCoverPath.startsWith(`${process.cwd()}${path.sep}`)
        ? path.relative(process.cwd(), absoluteCoverPath).split(path.sep).join("/")
        : "";
      byKey.set(playlistKey, {
        playlistKey,
        supportLang: canonicalSupportCode(row.supportLang || registryRow.supportLang),
        targetLang: normalizeCode(row.targetLang || registryRow.targetLang),
        playlistId,
        manifestPlaylistId,
        registryPlaylistId,
        playlistIdConflict,
        coverPath,
        filePresent: Boolean(absoluteCoverPath && fs.existsSync(absoluteCoverPath)),
        gitTracked: Boolean(repoRelativeCoverPath && tracked.files.has(repoRelativeCoverPath)),
        uploadEligible: Boolean(playlistId) && !playlistIdConflict,
        needsPlaylistDiscovery: !playlistId,
        uploaded: registryRow.playlistImage?.status === "uploaded",
        sourceManifest: descriptor.path || "",
      });
    }
  }

  const records = [...byKey.values()].sort((a, b) => a.playlistKey.localeCompare(b.playlistKey));
  const supportCodes = [...new Set(records.map((row) => row.supportLang).filter(Boolean))].sort();
  const summarize = (rows) => ({
    preparedCount: rows.length,
    filePresentCount: rows.filter((row) => row.filePresent).length,
    gitTrackedCount: rows.filter((row) => row.gitTracked).length,
    uploadEligibleCount: rows.filter((row) => row.uploadEligible).length,
    needsPlaylistDiscoveryCount: rows.filter((row) => row.needsPlaylistDiscovery).length,
    playlistIdConflictCount: rows.filter((row) => row.playlistIdConflict).length,
    uploadedCount: rows.filter((row) => row.uploaded).length,
  });
  return {
    gitTrackingReadbackAvailable: tracked.available,
    ...summarize(records),
    bySupport: supportCodes.map((supportLang) => ({
      supportLang,
      ...summarize(records.filter((row) => row.supportLang === supportLang)),
    })),
    plannedWithoutPlaylistId: records.filter((row) => row.needsPlaylistDiscovery),
    playlistIdConflicts: records.filter((row) => row.playlistIdConflict),
    records,
  };
}

function channelSummaries(publications, tails, duplicates) {
  const supports = new Set([
    ...publications.map((row) => row.supportLang),
    ...tails.map((row) => canonicalSupportCode(row.supportLang)),
    ...duplicates.map((row) => row.supportLang),
  ].filter(Boolean));
  return [...supports].sort().map((supportLang) => {
    const rows = publications.filter((row) => row.supportLang === supportLang);
    const liveRows = rows.filter((row) => row.liveReadbackPresent);
    const scheduled = liveRows.filter((row) => row.state === "scheduled");
    const scheduleRange = minMax(scheduled.map((row) => row.publishAt));
    const channelTails = tails.filter((row) => canonicalSupportCode(row.supportLang) === supportLang);
    const liveDuplicates = duplicates.filter((row) => row.supportLang === supportLang && row.evidenceTypes.includes("duplicate_live_assignment"));
    const registryOnlyDuplicates = duplicates.filter((row) => row.supportLang === supportLang
      && row.evidenceTypes.includes("duplicate_registry_assignment")
      && !row.evidenceTypes.includes("duplicate_live_assignment"));
    return {
      supportLang,
      liveVideoCount: liveRows.length,
      durableOnlyCount: rows.filter((row) => row.durableRegistryPresent && !row.liveReadbackPresent).length,
      ordinaryCount: liveRows.filter((row) => row.videoType === "ordinary").length,
      polyglotCount: liveRows.filter((row) => row.videoType === "polyglot").length,
      publicCount: liveRows.filter((row) => row.state === "public").length,
      scheduledCount: scheduled.length,
      privateUnscheduledCount: liveRows.filter((row) => row.state === "private_unscheduled").length,
      statusUnknownCount: liveRows.filter((row) => row.state === "status_unknown").length,
      ordinaryTailCount: channelTails.filter((row) => row.videoType !== "polyglot").length,
      polyglotTailCount: channelTails.filter((row) => row.videoType === "polyglot").length,
      liveDuplicateGroupCount: liveDuplicates.length,
      registryOnlyDuplicateGroupCount: registryOnlyDuplicates.length,
      nextPublishAt: scheduleRange.first,
      lastScheduledPublishAt: scheduleRange.last,
    };
  });
}

function routeEvidence(report) {
  return (report.routes || []).map((route) => ({
    artifact: path.basename(route.file || ""),
    routeKey: path.basename(route.file || "").match(/youtube-publication-control-(youtube-\d+)\.json$/u)?.[1] || "",
    supports: (route.supports || []).map(canonicalSupportCode).filter(Boolean),
    supportCount: (route.supports || []).length,
    generatedAt: route.generatedAt || "",
    liveAuditGeneratedAt: route.evidence?.liveAuditGeneratedAt || "",
    videoStatusReadback: route.evidence?.videoStatusReadback === true,
    paginationComplete: route.evidence?.paginationComplete === true,
  }));
}

function buildDeck(report, sourceRuns, nowMillis) {
  const setId = reportSetId(report);
  if (report.summary?.complete !== true) throw new Error(`Incomplete all-route report for ${setId}`);
  const routes = routeEvidence(report);
  const auditTimes = routes.map((route) => route.liveAuditGeneratedAt || route.generatedAt).filter(Boolean);
  const auditRange = minMax(auditTimes);
  const auditCompletedMillis = Date.parse(auditRange.last || "");
  const stateAtMillis = Number.isFinite(auditCompletedMillis) ? auditCompletedMillis : nowMillis;
  const auditMillisBySupport = new Map();
  for (const route of routes) {
    const routeMillis = Date.parse(route.liveAuditGeneratedAt || route.generatedAt || "");
    if (!Number.isFinite(routeMillis)) continue;
    for (const supportLang of route.supports) auditMillisBySupport.set(supportLang, routeMillis);
  }
  const unclassifiedUploads = (report.unclassifiedUploads || [])
    .filter((row) => row.youtubeVideoId)
    .map((row) => compactUnclassifiedUpload(row, setId));
  const publications = reconcileDurableRowsObservedInUploads((report.publications || []).filter((row) => row.youtubeVideoId).map((row) => compactPublication(
    row,
    auditMillisBySupport.get(canonicalSupportCode(row.supportLang)) ?? stateAtMillis,
  )), unclassifiedUploads, stateAtMillis);
  const publicationsById = new Map(publications.map((row) => [row.youtubeVideoId, row]));
  const duplicates = duplicateGroups(report, publicationsById);
  const livePublications = publications.filter((row) => row.liveReadbackPresent);
  const liveDuplicateGroups = duplicates.filter((row) => row.evidenceTypes.includes("duplicate_live_assignment"));
  const registryOnlyDuplicateGroups = duplicates.filter((row) => row.evidenceTypes.includes("duplicate_registry_assignment")
    && !row.evidenceTypes.includes("duplicate_live_assignment"));
  const tails = (report.tails || []).map((row) => ({
    videoType: row.videoType === "polyglot" ? "polyglot" : "ordinary",
    setId: row.setId || setId,
    supportLang: canonicalSupportCode(row.supportLang),
    targetLang: row.videoType === "polyglot" ? "" : normalizeCode(row.targetLang),
    bundleKey: row.videoType === "polyglot" ? row.bundleKey || "" : "",
    contentScope: row.videoType === "polyglot" ? row.contentScope || "full" : "",
    targetLangs: row.videoType === "polyglot" ? (row.targetLangs || []).map(normalizeCode).filter(Boolean) : [],
  }));
  const {
    unclassifiedUploadCount: _routeUnclassifiedUploadCount,
    unclassifiedRecentUploadCount: _routeUnclassifiedRecentUploadCount,
    ...reportSummary
  } = report.summary || {};
  return {
    setId,
    auditStartedAt: auditRange.first,
    auditCompletedAt: auditRange.last,
    aggregateGeneratedAt: report.generatedAt || "",
    evidence: {
      routeCount: report.summary?.receivedRouteCount || routes.length,
      expectedRouteCount: report.summary?.expectedRouteCount || routes.length,
      routeScope: report.routeScope || {
        mode: "all_routes",
        expectedRouteKeys: routes.map((route) => route.routeKey).filter(Boolean).sort(),
        receivedRouteKeys: routes.map((route) => route.routeKey).filter(Boolean).sort(),
      },
      videoStatusReadbackComplete: report.summary?.videoStatusReadbackComplete === true || routes.every((route) => route.videoStatusReadback),
      paginationComplete: report.summary?.paginationComplete === true || routes.every((route) => route.paginationComplete),
      strictApplyEvidence: (report.summary?.videoStatusReadbackComplete === true || routes.every((route) => route.videoStatusReadback))
        && (report.summary?.paginationComplete === true || routes.every((route) => route.paginationComplete)),
      routes,
      githubRuns: sourceRuns.filter((run) => run.setId === setId),
    },
    summary: {
      ...reportSummary,
      duplicateGroupCount: duplicates.length,
      registryAndLiveUnionCount: publications.length,
      liveVideoCount: livePublications.length,
      livePublicCount: livePublications.filter((row) => row.state === "public").length,
      liveScheduledCount: livePublications.filter((row) => row.state === "scheduled").length,
      livePrivateUnscheduledCount: livePublications.filter((row) => row.state === "private_unscheduled").length,
      liveStatusUnknownCount: livePublications.filter((row) => row.state === "status_unknown").length,
      durableOnlyVideoCount: publications.filter((row) => row.durableRegistryPresent && !row.liveReadbackPresent).length,
      liveDuplicateGroupCount: liveDuplicateGroups.length,
      registryOnlyDuplicateGroupCount: registryOnlyDuplicateGroups.length,
    },
    channels: channelSummaries(publications, tails, duplicates),
    duplicateGroups: duplicates,
    tails,
    calendarDayGaps: report.calendarDayGaps || [],
    unclassifiedUploads,
    publications: publications.sort((a, b) => [a.supportLang, a.state, a.publishAt, a.videoType, a.targetLang, a.bundleKey, a.youtubeVideoId].join("|").localeCompare(
      [b.supportLang, b.state, b.publishAt, b.videoType, b.targetLang, b.bundleKey, b.youtubeVideoId].join("|"),
    )),
  };
}

function markdownFor(snapshot) {
  const lines = [
    "# Карта публикаций YouTube",
    "",
    `Сформировано: ${snapshot.generatedAt}`,
    "",
    "Source of truth: live YouTube API readback через выбранные GitHub OAuth routes плюс durable registry/calendar comparison. Полный per-video список и точные URL находятся в `config/youtube-publication-snapshot.json`.",
    "",
    "> Этот документ не разрешает удаление, повторную загрузку или публикацию. Любой YouTube write требует отдельного preflight и подтверждения.",
    "",
    "## Сводка",
    "",
    "| Deck | API routes | Live видео | Public | Scheduled | Private без будущей даты | Статус не прочитан | Durable-only | Хвосты ordinary | Хвосты Polyglot full | Live дубли | Registry-only дубли | Calendar blockers | Strict evidence |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const deck of snapshot.decks) {
    lines.push(`| \`${deck.setId}\` | ${deck.evidence.routeCount}/${deck.evidence.expectedRouteCount} | ${deck.summary.liveVideoCount} | ${deck.summary.livePublicCount} | ${deck.summary.liveScheduledCount} | ${deck.summary.livePrivateUnscheduledCount} | ${deck.summary.liveStatusUnknownCount} | ${deck.summary.durableOnlyVideoCount} | ${deck.summary.ordinaryTailCount} | ${deck.summary.polyglotTailCount} | ${deck.summary.liveDuplicateGroupCount} | ${deck.summary.registryOnlyDuplicateGroupCount} | ${deck.summary.liveScheduleMissingCalendarCount || 0} | ${deck.evidence.strictApplyEvidence ? "yes" : "no"} |`);
  }
  const playlistCovers = snapshot.coverReadiness.playlist;
  lines.push(
    "",
    "## Обложки плейлистов",
    "",
    `- Подготовлено: ${playlistCovers.preparedCount}; файлы существуют: ${playlistCovers.filePresentCount}; отслеживаются Git: ${playlistCovers.gitTrackedCount}.`,
    `- Имеют durable playlist ID и могут войти в будущий upload plan: ${playlistCovers.uploadEligibleCount}; сначала требуют read-only playlist discovery: ${playlistCovers.needsPlaylistDiscoveryCount}.`,
    `- Уже подтверждены durable readback как загруженные: ${playlistCovers.uploadedCount}; конфликтов manifest/registry playlist ID: ${playlistCovers.playlistIdConflictCount}.`,
    "- Наличие файла не разрешает YouTube write: apply требует отдельного подтверждения, точного Git-tracked JPG, playlist ID и свежего route OAuth readback.",
    "",
    "| Support | Подготовлено | С playlist ID | Нужен discovery | Git-tracked | Uploaded | ID conflicts |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...playlistCovers.bySupport.map((row) => `| ${row.supportLang} | ${row.preparedCount} | ${row.uploadEligibleCount} | ${row.needsPlaylistDiscoveryCount} | ${row.gitTrackedCount} | ${row.uploadedCount} | ${row.playlistIdConflictCount} |`),
  );
  if (playlistCovers.plannedWithoutPlaylistId.length) {
    const plannedBySupport = new Map();
    for (const row of playlistCovers.plannedWithoutPlaylistId) {
      const targets = plannedBySupport.get(row.supportLang) || [];
      targets.push(row.targetLang);
      plannedBySupport.set(row.supportLang, targets);
    }
    lines.push("", `Без playlist ID: ${[...plannedBySupport.entries()].sort().map(([support, targets]) => `${support}=[${targets.sort().join(", ")}]`).join("; ")}.`);
  }
  for (const deck of snapshot.decks) {
    lines.push("", `## ${deck.setId}`, "", `Live API window: ${deck.auditStartedAt || "unknown"} .. ${deck.auditCompletedAt || "unknown"}.`);
    if (!deck.evidence.strictApplyEvidence) {
      lines.push("", "> Текущий снимок годится для инвентаризации, но не для apply: старый audit artifact не доказал явным полем полную пагинацию. Новый workflow блокирует apply без `paginationComplete=true`.");
    }
    if (deck.evidence.githubRuns.length) {
      lines.push("", "GitHub runs:", "", ...deck.evidence.githubRuns.map((run) => `- ${run.route}: [${run.githubRunId}](${run.githubRunUrl})`));
    }
    lines.push(
      "",
      "### Каналы",
      "",
      "| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
      ...deck.channels.map((channel) => `| ${channel.supportLang} | ${channel.liveVideoCount} | ${channel.publicCount} | ${channel.scheduledCount} | ${channel.privateUnscheduledCount} | ${channel.statusUnknownCount} | ${channel.durableOnlyCount} | ${channel.ordinaryTailCount} | ${channel.polyglotTailCount} | ${channel.liveDuplicateGroupCount} | ${channel.registryOnlyDuplicateGroupCount} | ${channel.nextPublishAt || "-"} | ${channel.lastScheduledPublishAt || "-"} |`),
      "",
      "### Дубли",
      "",
    );
    if (!deck.duplicateGroups.length) lines.push("- Не обнаружены.");
    for (const duplicate of deck.duplicateGroups) {
      const keep = duplicate.recommendedKeepVideoId ? `; предварительно оставить ${duplicate.recommendedKeepVideoId} (единственный durable row)` : "; требуется ручной выбор canonical video";
      lines.push(`- ${duplicate.supportLang} | ${duplicate.key || duplicate.targetLang || "unknown"} | evidence=${duplicate.evidenceTypes.join("+")}: ${duplicate.videoUrls.join(" , ")}${keep}. Удаление не выполнено.`);
    }
    lines.push("", "### Хвосты", "");
    if (!deck.tails.length) lines.push("- Нет.");
    const tailsBySupport = new Map();
    for (const tail of deck.tails) {
      const row = tailsBySupport.get(tail.supportLang) || { ordinary: [], polyglot: [] };
      if (tail.videoType === "polyglot") row.polyglot.push(tail.bundleKey || tail.targetLangs.join(","));
      else row.ordinary.push(tail.targetLang);
      tailsBySupport.set(tail.supportLang, row);
    }
    for (const [supportLang, tails] of [...tailsBySupport.entries()].sort()) {
      lines.push(`- ${supportLang}: ordinary ${tails.ordinary.length}${tails.ordinary.length ? ` [${tails.ordinary.join(", ")}]` : ""}; Polyglot full ${tails.polyglot.length}${tails.polyglot.length ? ` [${tails.polyglot.join(", ")}]` : ""}.`);
    }
  }
  lines.push(
    "",
    "## Нераспознанные загрузки",
    "",
    `- Всего в uploads-плейлистах, но без подтвержденной продуктовой identity: ${snapshot.totals.unclassifiedUploadCount}.`,
    `- Свежих неразобранных блокеров apply: ${snapshot.totals.unclassifiedRecentEvaluationComplete ? snapshot.totals.unclassifiedRecentUploadCount : "не определено старым artifact; нужен новый strict audit"}.`,
    `- videos.list не вернул статус: ${snapshot.totals.unclassifiedStatusReadbackComplete ? snapshot.totals.unclassifiedStatusNotReturnedCount : "не определено старым artifact; status для unmatched ID не читался"}.`,
    "- Полный точный список, ID, URL и статус находятся в верхнеуровневом `unclassifiedUploads` файла `config/youtube-publication-snapshot.json`.",
  );
  const unclassifiedBySupport = new Map();
  for (const row of snapshot.unclassifiedUploads) {
    unclassifiedBySupport.set(row.supportLang || "UNKNOWN", (unclassifiedBySupport.get(row.supportLang || "UNKNOWN") || 0) + 1);
  }
  if (unclassifiedBySupport.size) {
    lines.push("", `По каналам: ${[...unclassifiedBySupport.entries()].sort().map(([support, count]) => `${support}=${count}`).join(", ")}.`);
  }
  const recentUnclassified = snapshot.unclassifiedUploads.filter((row) => row.potentialCurrentSetEvaluated
    && row.potentialCurrentSet
    && !row.reviewedNonProduct
    && row.uploadStatus !== "not_returned");
  if (recentUnclassified.length) {
    lines.push("", "Свежие блокеры:", "", ...recentUnclassified.map((row) => `- ${row.supportLang} | ${row.youtubeVideoUrl} | ${row.title || "без названия"}`));
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.reports.length) {
    console.log("Usage: node scripts/build-youtube-publication-snapshot.mjs --report=<all-routes.json> [--report=<deck2.json>] [--source-run=setId:route:runId]");
    process.exit(options.help ? 0 : 1);
  }
  const reports = options.reports.map(readJson);
  if (!options.allowIncomplete) {
    const incomplete = reports.filter((report) => report.summary?.complete !== true);
    if (incomplete.length) throw new Error("Refusing to persist an incomplete all-route publication snapshot");
  }
  const now = new Date();
  const sourceRuns = [
    ...reports.flatMap((report) => report.sourceRuns || []),
    ...options.sourceRuns.map(parseSourceRun),
  ];
  const uniqueSourceRuns = [...new Map(sourceRuns.map((run) => [`${run.setId}|${run.route}|${run.githubRunId}`, run])).values()];
  const decks = reports.map((report) => buildDeck(report, uniqueSourceRuns, now.getTime())).sort((a, b) => a.setId.localeCompare(b.setId));
  const playlistCoverReadiness = buildPlaylistCoverReadiness(options.coverAssetConfig, options.playlistRegistry);
  const unclassifiedUploads = mergeUnclassifiedUploads(decks);
  for (const deck of decks) delete deck.unclassifiedUploads;
  const unclassifiedRecentUploads = unclassifiedUploads.filter((row) => row.potentialCurrentSet
    && !row.reviewedNonProduct
    && row.uploadStatus !== "not_returned");
  const unclassifiedRecentEvaluationComplete = unclassifiedUploads.every((row) => row.potentialCurrentSetEvaluated);
  const unclassifiedStatusReadbackComplete = unclassifiedUploads.every((row) => Boolean(row.uploadStatus));
  const snapshot = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    sourceOfTruth: "GitHub-hosted read-only YouTube Data API uploads-playlist and videos.list readback reconciled with durable publication registries and calendar.",
    policy: {
      youtubeWrites: 0,
      renderTtsImageMetadataCalls: 0,
      duplicateDeletionRequiresExplicitApproval: true,
      applyRequiresFreshStrictEvidenceMinutes: 30,
    },
    totals: {
      deckCount: decks.length,
      scannedUploadVideoCount: decks.reduce((sum, deck) => sum + deck.summary.liveVideoCount, 0) + unclassifiedUploads.length,
      classifiedProductVideoCount: decks.reduce((sum, deck) => sum + deck.summary.liveVideoCount, 0),
      liveVideoCount: decks.reduce((sum, deck) => sum + deck.summary.liveVideoCount, 0),
      livePublicCount: decks.reduce((sum, deck) => sum + deck.summary.livePublicCount, 0),
      liveScheduledCount: decks.reduce((sum, deck) => sum + deck.summary.liveScheduledCount, 0),
      livePrivateUnscheduledCount: decks.reduce((sum, deck) => sum + deck.summary.livePrivateUnscheduledCount, 0),
      liveStatusUnknownCount: decks.reduce((sum, deck) => sum + deck.summary.liveStatusUnknownCount, 0),
      durableOnlyVideoCount: decks.reduce((sum, deck) => sum + deck.summary.durableOnlyVideoCount, 0),
      tailCount: decks.reduce((sum, deck) => sum + deck.summary.tailCount, 0),
      liveDuplicateGroupCount: decks.reduce((sum, deck) => sum + deck.summary.liveDuplicateGroupCount, 0),
      registryOnlyDuplicateGroupCount: decks.reduce((sum, deck) => sum + deck.summary.registryOnlyDuplicateGroupCount, 0),
      liveScheduleMissingCalendarCount: decks.reduce((sum, deck) => sum + Number(deck.summary.liveScheduleMissingCalendarCount || 0), 0),
      unclassifiedUploadCount: unclassifiedUploads.length,
      unclassifiedRecentEvaluationComplete,
      unclassifiedRecentUploadCount: unclassifiedRecentEvaluationComplete ? unclassifiedRecentUploads.length : null,
      unclassifiedStatusReadbackComplete,
      unclassifiedStatusNotReturnedCount: unclassifiedStatusReadbackComplete
        ? unclassifiedUploads.filter((row) => row.uploadStatus === "not_returned").length
        : null,
      preparedPlaylistCoverCount: playlistCoverReadiness.preparedCount,
      uploadEligiblePlaylistCoverCount: playlistCoverReadiness.uploadEligibleCount,
      plannedPlaylistCoverCount: playlistCoverReadiness.needsPlaylistDiscoveryCount,
      gitTrackedPlaylistCoverCount: playlistCoverReadiness.gitTrackedCount,
      uploadedPlaylistCoverCount: playlistCoverReadiness.uploadedCount,
    },
    coverReadiness: {
      playlist: playlistCoverReadiness,
    },
    unclassifiedUploads,
    decks,
  };
  writeJson(options.output, snapshot);
  fs.mkdirSync(path.dirname(options.markdown), { recursive: true });
  fs.writeFileSync(options.markdown, markdownFor(snapshot), "utf8");
  console.log(JSON.stringify({ output: options.output, markdown: options.markdown, totals: snapshot.totals }, null, 2));
}

main();
