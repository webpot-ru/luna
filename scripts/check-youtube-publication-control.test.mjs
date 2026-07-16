#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildPublicationControlReport,
  effectiveScheduleStartDate,
  resolvePolyglotBundleTargets,
} from "./lib/youtube-publication-control.mjs";

const now = new Date("2026-07-13T00:00:00Z");
assert.equal(effectiveScheduleStartDate({ automaticStartDate: "2026-07-14", requestedStartDate: "2026-07-22", fillEarliest: true }), "2026-07-14");
assert.equal(effectiveScheduleStartDate({ automaticStartDate: "2026-07-14", requestedStartDate: "2026-07-22", fillEarliest: false }), "2026-07-22");
const romanceBundle = { targetLangs: ["ES", "FR", "IT", "PT"], fallbackLangs: ["RO"] };
assert.deepEqual(resolvePolyglotBundleTargets(romanceBundle, "ES-419").targetLangs, ["FR", "IT", "PT", "RO"]);
assert.deepEqual(resolvePolyglotBundleTargets(romanceBundle, "PT-BR").targetLangs, ["ES", "FR", "IT", "RO"]);
const base = {
  setId: "deck-2",
  supports: ["EN"],
  desiredTargetsBySupport: { EN: ["DE", "FR"] },
  now,
};
const canonical = {
  setId: "deck-2", supportLang: "EN", targetLang: "DE", channelKey: "en",
  youtubeVideoId: "canonical", publicationStatus: "scheduled_uploaded", privacyStatus: "private",
  publishAt: "2026-07-14T12:00:00Z",
};
const reservation = {
  setId: "deck-2", supportLang: "EN", targetLang: "DE", channelKey: "en",
  youtubeVideoId: "canonical", status: "reserved", publishAt: "2026-07-14T12:00:00Z", localDate: "2026-07-14",
};
const healthy = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [reservation] },
  liveAudit: { supportReports: [{ supportLang: "EN", channelKey: "en", matchedPublications: [{ ...canonical, youtubeStatus: { privacyStatus: "private", publishAt: canonical.publishAt } }] }] },
});
assert.equal(healthy.summary.healthy, true);
assert.deepEqual(healthy.tails.map((row) => row.targetLang), ["FR"]);

const liveDuplicate = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [reservation] },
  liveAudit: { supportReports: [{ supportLang: "EN", channelKey: "en", matchedPublications: [canonical, { ...canonical, youtubeVideoId: "duplicate" }] }] },
});
assert.ok(liveDuplicate.blockers.some((item) => item.type === "duplicate_live_assignment"));

const repeatedSameVideoReadback = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [reservation] },
  liveAudit: { supportReports: [{ supportLang: "EN", channelKey: "en", matchedPublications: [canonical, { ...canonical }] }] },
});
assert.equal(repeatedSameVideoReadback.summary.liveDuplicateGroupCount, 0);
assert.ok(!repeatedSameVideoReadback.blockers.some((item) => item.type === "duplicate_live_assignment"));

const liveMissingDurableRegistry = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [reservation] },
  liveAudit: { supportReports: [{ supportLang: "EN", channelKey: "en", matchedPublications: [{
    ...canonical,
    targetLang: "FR",
    youtubeVideoId: "live-only",
    youtubeStatus: { privacyStatus: "public", publishAt: "", uploadStatus: "processed" },
  }] }] },
});
assert.ok(liveMissingDurableRegistry.blockers.some((item) => item.type === "live_video_missing_durable_registry"));
assert.equal(liveMissingDurableRegistry.publications.find((row) => row.youtubeVideoId === "live-only")?.durableRegistryPresent, false);

const polyglotScopedControl = buildPublicationControlReport({
  ...base,
  videoTypes: ["polyglot"],
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [reservation] },
  liveAudit: { supportReports: [{ supportLang: "EN", channelKey: "en", matchedPublications: [{
    ...canonical,
    targetLang: "FR",
    youtubeVideoId: "same-campaign-ordinary-not-finalized",
    youtubeStatus: { privacyStatus: "private", publishAt: "2026-07-15T12:00:00Z", uploadStatus: "processed" },
  }] }] },
});
assert.equal(polyglotScopedControl.summary.liveVideoMissingDurableRegistryCount, 0);
assert.equal(polyglotScopedControl.summary.ordinaryTailCount, 0);
assert.deepEqual(polyglotScopedControl.videoTypes, ["polyglot"]);

const registryDuplicate = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical, { ...canonical, youtubeVideoId: "duplicate" }] },
  calendar: { reservations: [reservation] },
});
assert.ok(registryDuplicate.blockers.some((item) => item.type === "duplicate_registry_assignment"));

const proposedOrdinaryConflict = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [{ ...canonical, supportLang: "EN-GB" }] },
  calendar: { reservations: [reservation] },
  proposedOrdinaryAssignments: [{ setId: "deck-2", supportLang: "EN", targetLang: "DE" }],
});
assert.ok(proposedOrdinaryConflict.blockers.some((item) => item.type === "proposed_ordinary_assignment_already_active"));

const cancelledHistoricalDuplicate = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical, { ...canonical, youtubeVideoId: "cancelled", publicationStatus: "canceled_before_upload" }] },
  calendar: { reservations: [reservation] },
});
assert.equal(cancelledHistoricalDuplicate.summary.registryDuplicateGroupCount, 0);

const slotCollision = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [reservation, { ...reservation, targetLang: "FR", youtubeVideoId: "fr-video" }] },
});
assert.ok(slotCollision.blockers.some((item) => item.type === "calendar_slot_collision"));

const missingCalendar = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [] },
  liveAudit: { supportReports: [{ supportLang: "EN", channelKey: "en", matchedPublications: [{ ...canonical, youtubeStatus: { privacyStatus: "private", publishAt: canonical.publishAt } }] }] },
});
assert.ok(missingCalendar.blockers.some((item) => item.type === "live_schedule_missing_calendar"));

const polyglotKey = "polyglot:deck-2:EN:global_europe_core:abc123";
const polyglotCoverage = buildPublicationControlReport({
  ...base,
  polyglotRegistry: { publications: [{
    setId: "deck-2",
    supportLang: "EN-GB",
    videoType: "polyglot",
    bundleKey: "global_europe_core",
    polyglotKey,
    targetLangs: ["ES", "FR", "DE", "IT"],
    youtubeVideoId: "poly-video",
    publicationStatus: "published_uploaded",
  }] },
  desiredPolyglotAssignmentsBySupport: { EN: [
    { bundleKey: "global_europe_core", targetLangs: ["ES", "FR", "DE", "IT"], polyglotKey },
    { bundleKey: "slavic_core", targetLangs: ["RU", "PL", "CS", "SK"], polyglotKey: "polyglot:deck-2:EN:slavic_core:def456" },
  ] },
  proposedPolyglotAssignments: [{
    setId: "deck-2",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE", "IT"],
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:abc123",
  }],
});
assert.equal(polyglotCoverage.summary.polyglotTailCount, 1);
assert.equal(polyglotCoverage.tails.find((row) => row.videoType === "polyglot")?.bundleKey, "slavic_core");
assert.ok(polyglotCoverage.blockers.some((item) => item.type === "proposed_polyglot_assignment_already_active"));

const shortDoesNotSatisfyFull = buildPublicationControlReport({
  ...base,
  polyglotRegistry: { publications: [{
    setId: "deck-2",
    supportLang: "EN",
    videoType: "polyglot",
    bundleKey: "global_europe_core",
    contentScope: "short_unverified",
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:abc123:short_unverified",
    targetLangs: ["ES", "FR", "DE", "IT"],
    youtubeVideoId: "short-poly-video",
    publicationStatus: "published_uploaded",
  }] },
  desiredPolyglotAssignmentsBySupport: { EN: [{
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE", "IT"],
    polyglotKey,
  }] },
  proposedPolyglotAssignments: [{
    setId: "deck-2",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE", "IT"],
    polyglotKey,
  }],
});
assert.equal(shortDoesNotSatisfyFull.summary.polyglotTailCount, 1);
assert.equal(shortDoesNotSatisfyFull.summary.proposedAssignmentConflictCount, 1);
assert.equal(shortDoesNotSatisfyFull.summary.proposedPolyglotCrossScopeConflictCount, 1);
assert.ok(shortDoesNotSatisfyFull.blockers.some((item) => item.type === "proposed_polyglot_cross_scope_conflict"));

const changedBundleContent = buildPublicationControlReport({
  ...base,
  polyglotRegistry: { publications: [{
    setId: "deck-2",
    supportLang: "EN",
    videoType: "polyglot",
    bundleKey: "global_europe_core",
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:oldhash",
    targetLangs: ["ES", "FR", "DE", "IT"],
    youtubeVideoId: "old-poly-video",
    publicationStatus: "published_uploaded",
  }] },
  desiredPolyglotAssignmentsBySupport: { EN: [{
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE", "NL"],
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:newhash",
  }] },
});
assert.equal(changedBundleContent.summary.polyglotTailCount, 0);
assert.ok(changedBundleContent.blockers.some((item) => item.type === "polyglot_bundle_target_mismatch"));

const duplicatePolyglotSlot = buildPublicationControlReport({
  ...base,
  polyglotRegistry: { publications: [{
    setId: "deck-2", supportLang: "EN", videoType: "polyglot", bundleKey: "global_europe_core",
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:first", targetLangs: ["ES", "FR", "DE", "IT"],
    youtubeVideoId: "poly-first", publicationStatus: "published_uploaded",
  }, {
    setId: "deck-2", supportLang: "EN", videoType: "polyglot", bundleKey: "global_europe_core",
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:second", targetLangs: ["ES", "FR", "DE", "NL"],
    youtubeVideoId: "poly-second", publicationStatus: "published_uploaded",
  }] },
});
assert.ok(duplicatePolyglotSlot.blockers.some((item) => item.type === "duplicate_registry_assignment"));

const legacyPolyglotOrderConflict = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [{
    setId: "deck-2",
    supportLang: "EN-GB",
    targetLang: "DE,ES,FR,IT",
    youtubeVideoId: "legacy-poly-video",
    publicationStatus: "published_uploaded",
  }] },
  proposedPolyglotAssignments: [{
    setId: "deck-2",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE", "IT"],
    polyglotKey: "polyglot:deck-2:EN:global_europe_core:newhash",
  }],
});
assert.ok(legacyPolyglotOrderConflict.blockers.some((item) => item.type === "proposed_polyglot_assignment_already_active"));

const leadingCalendarGap = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  calendar: { reservations: [{ ...reservation, publishAt: "2026-07-16T12:00:00Z", localDate: "2026-07-16" }] },
  gapStartDateByChannel: { en: "2026-07-14" },
});
assert.deepEqual(leadingCalendarGap.calendarDayGaps[0]?.missingDates, ["2026-07-14", "2026-07-15"]);

const incompletePagination = buildPublicationControlReport({
  ...base,
  liveAudit: { paginationComplete: false, truncatedSupportCount: 1, supportReports: [{ supportLang: "EN", paginationComplete: false, matchedPublications: [] }] },
  requireCompleteLiveAudit: true,
});
assert.ok(incompletePagination.blockers.some((item) => item.type === "live_audit_pagination_incomplete"));

const statusNotReturned = buildPublicationControlReport({
  ...base,
  liveAudit: {
    paginationComplete: true,
    supportReports: [{
      supportLang: "EN",
      matchedPublications: [{
        setId: "deck-2",
        supportLang: "EN",
        targetLang: "DE",
        youtubeVideoId: "missing-status",
        youtubeStatus: { uploadStatus: "not_returned", privacyStatus: "", publishAt: "" },
      }],
    }],
  },
  requireCompleteLiveAudit: true,
});
assert.equal(statusNotReturned.summary.liveStatusNotReturnedCount, 1);
assert.ok(statusNotReturned.blockers.some((item) => item.type === "live_video_status_not_returned"));

const deletedTombstone = buildPublicationControlReport({
  ...base,
  ordinaryRegistry: { publications: [canonical] },
  liveAudit: {
    paginationComplete: true,
    supportReports: [{
      supportLang: "EN",
      matchedPublications: [{
        ...canonical,
        title: "Deleted video",
        youtubeDeletedTombstone: true,
        youtubeStatus: { uploadStatus: "not_returned", privacyStatus: "", publishAt: "" },
      }],
    }],
  },
  requireCompleteLiveAudit: true,
});
assert.equal(deletedTombstone.summary.youtubeDeletedTombstoneCount, 1);
assert.equal(deletedTombstone.summary.liveStatusNotReturnedCount, 0);
assert.equal(deletedTombstone.blockers.some((item) => item.type === "live_video_status_not_returned"), false);
assert.deepEqual(deletedTombstone.tails.map((row) => row.targetLang), ["DE", "FR"]);

const unclassifiedRecentUpload = buildPublicationControlReport({
  ...base,
  liveAudit: {
    paginationComplete: true,
    supportReports: [{
      supportLang: "EN",
      channelKey: "en",
      matchedPublications: [],
      unmatchedVideos: [{
        supportLang: "EN",
        channelKey: "en",
        youtubeVideoId: "unclassified-live",
        title: "Edited legacy title",
        uploadedAt: "2026-07-13T00:00:00Z",
        potentialCurrentSet: true,
        youtubeStatus: { uploadStatus: "uploaded", privacyStatus: "private", publishAt: "" },
      }],
    }],
  },
  requireCompleteLiveAudit: true,
});
assert.equal(unclassifiedRecentUpload.summary.unclassifiedUploadCount, 1);
assert.equal(unclassifiedRecentUpload.summary.unclassifiedRecentUploadCount, 1);
assert.ok(unclassifiedRecentUpload.blockers.some((item) => item.type === "unclassified_recent_channel_upload"));

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-publication-control-test-"));
const emptyRegistry = path.join(root, "registry.json");
const emptyCalendar = path.join(root, "calendar.json");
const liveAuditPath = path.join(root, "live-audit.json");
const outputPath = path.join(root, "control.json");
fs.writeFileSync(emptyRegistry, '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(emptyCalendar, '{"schemaVersion":1,"reservations":[]}\n');
fs.writeFileSync(liveAuditPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  setId: "test-deck",
  videoStatusReadback: true,
  paginationComplete: true,
  truncatedSupportCount: 0,
  supports: ["EN"],
  supportReports: [{ supportLang: "EN", channelKey: "en", paginationComplete: true, matchedPublications: [] }],
}, null, 2)}\n`);
const strictCli = spawnSync(process.execPath, [
  "scripts/check-youtube-publication-control.mjs",
  "--set=test-deck",
  "--support=EN",
  "--video-types=ordinary",
  "--targets=DE",
  `--ordinary-registry=${emptyRegistry}`,
  `--polyglot-registry=${emptyRegistry}`,
  `--calendar=${emptyCalendar}`,
  `--live-audit=${liveAuditPath}`,
  `--output=${outputPath}`,
  "--strict",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(strictCli.status, 0, strictCli.stderr || strictCli.stdout);
const strictReport = JSON.parse(fs.readFileSync(outputPath, "utf8"));
assert.equal(strictReport.evidence.strict, true);
assert.equal(strictReport.evidence.videoStatusReadback, true);
assert.deepEqual(strictReport.videoTypes, ["ordinary"]);
assert.equal(strictReport.summary.polyglotTailCount, 0);

const defaultTargetsOutputPath = path.join(root, "control-default-targets.json");
const defaultTargetsCli = spawnSync(process.execPath, [
  "scripts/check-youtube-publication-control.mjs",
  "--set=test-deck",
  "--support=EN",
  `--ordinary-registry=${emptyRegistry}`,
  `--polyglot-registry=${emptyRegistry}`,
  `--calendar=${emptyCalendar}`,
  `--live-audit=${liveAuditPath}`,
  `--output=${defaultTargetsOutputPath}`,
  "--strict",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(defaultTargetsCli.status, 0, defaultTargetsCli.stderr || defaultTargetsCli.stdout);
assert.doesNotMatch(defaultTargetsCli.stderr, /psql|127\.0\.0\.1|55433/u);
const defaultTargetsReport = JSON.parse(fs.readFileSync(defaultTargetsOutputPath, "utf8"));
assert.equal(defaultTargetsReport.productPolicy.ordinaryTargetSource, "config/language-order.json");
assert.equal(defaultTargetsReport.summary.ordinaryTailCount, 52);
assert.ok(!defaultTargetsReport.tails.some((row) => ["EN", "EN-GB"].includes(row.targetLang)));

const auditWorkflow = fs.readFileSync(".github/workflows/youtube-publication-control.yml", "utf8");
assert.match(auditWorkflow, /Drift is recorded in the/u);
assert.doesNotMatch(
  auditWorkflow,
  /CONTROL_ARGS=.*?"--strict"/u,
  "the read-only audit must retain complete evidence when it detects state drift",
);

const ordinaryWorkerWorkflow = fs.readFileSync(".github/workflows/youtube-video-publish.yml", "utf8");
assert.match(
  ordinaryWorkerWorkflow,
  /Gate live publications, durable registry and calendar[\s\S]*?CONTROL_ARGS=\([^\n]*?"--video-types=ordinary"[^\n]*?"--strict"\)/u,
  "ordinary apply must build strict publication-control evidence before render",
);
assert.match(
  ordinaryWorkerWorkflow,
  /Refresh live publication control immediately before upload[\s\S]*?CONTROL_ARGS=\([^\n]*?"--video-types=ordinary"[^\n]*?"--strict"\)/u,
  "ordinary apply must refresh strict publication-control evidence immediately before upload",
);
assert.equal(
  (ordinaryWorkerWorkflow.match(/CONTROL_ARGS\+=\("--targets=\$LANGS_INPUT" "--block-existing-targets"\)/gu) || []).length,
  2,
  "ordinary apply must bind both strict reports to the exact worker targets, including campaign-owned workers",
);
assert.doesNotMatch(
  ordinaryWorkerWorkflow,
  /\[ -n "\$LANGS_INPUT" \] && \[ -z "\$\{\{ inputs\.campaign_id \}\}" \]/u,
  "campaign-owned ordinary workers must not bypass candidate-level duplicate blocking",
);

const polyglotWorkerWorkflow = fs.readFileSync(".github/workflows/youtube-polyglot-video-publish.yml", "utf8");
assert.match(
  polyglotWorkerWorkflow,
  /Audit and gate live Polyglot publication state[\s\S]*?CONTROL_ARGS=\([^\n]*?"--video-types=polyglot"[^\n]*?"--strict"\)/u,
  "Polyglot apply must build strict publication-control evidence before render",
);
assert.match(
  polyglotWorkerWorkflow,
  /Refresh live Polyglot publication control immediately before upload[\s\S]*?CONTROL_ARGS=\([^\n]*?"--video-types=polyglot"[^\n]*?"--strict"\)/u,
  "Polyglot apply must refresh strict publication-control evidence immediately before upload",
);

console.log("youtube publication control tests passed");
