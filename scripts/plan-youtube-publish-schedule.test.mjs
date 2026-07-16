#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-schedule-test-"));
const ordinaryDir = path.join(root, "ordinary");
const polyglotDir = path.join(root, "polyglot");
fs.mkdirSync(ordinaryDir, { recursive: true });
fs.mkdirSync(polyglotDir, { recursive: true });

const ordinaryMetadata = path.join(ordinaryDir, "youtube_metadata.json");
const polyglotMetadata = path.join(polyglotDir, "youtube_metadata.json");
const policyPath = path.join(root, "policy.json");
const calendarPath = path.join(root, "calendar.json");
const ordinaryRegistryPath = path.join(root, "ordinary-registry.json");
const polyglotRegistryPath = path.join(root, "polyglot-registry.json");
const reportPath = path.join(root, "report.json");
const polyglotKey = "polyglot:test-deck:EN:global_europe_core:testhash";
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const dayAfterTomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
const thirdDay = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

fs.writeFileSync(ordinaryMetadata, `${JSON.stringify({
  setId: "test-deck",
  supportLang: "EN",
  targetLang: "DE",
  title: "Ordinary test",
}, null, 2)}\n`);
fs.writeFileSync(polyglotMetadata, `${JSON.stringify({
  videoType: "polyglot",
  polyglotKey,
  setId: "test-deck",
  supportLang: "EN",
  bundleKey: "global_europe_core",
  bundleLabel: "Global Europe Core",
  contentScope: "full",
  targetLangs: ["ES", "FR", "DE"],
  targetLangsCsv: "ES,FR,DE",
  targetLangsHash: "testhash",
  title: "Polyglot test",
}, null, 2)}\n`);
fs.writeFileSync(policyPath, `${JSON.stringify({
  default: {
    timezone: "Etc/UTC",
    dailySlotsLocal: ["08:00", "09:00"],
    maxVideosPerDay: 2,
    defaultStartDelayDays: 1,
    fillEarliestAvailable: true,
  },
}, null, 2)}\n`);
fs.writeFileSync(calendarPath, `${JSON.stringify({
  schemaVersion: 1,
  reservations: [
    { setId: "existing-a", supportLang: "EN", targetLang: "FR", channelKey: "en", publishAt: `${tomorrow}T08:00:00.000Z`, localDate: tomorrow, status: "reserved" },
    { setId: "existing-b", supportLang: "EN", targetLang: "IT", channelKey: "en", publishAt: `${thirdDay}T08:00:00.000Z`, localDate: thirdDay, status: "reserved" },
  ],
}, null, 2)}\n`);
fs.writeFileSync(ordinaryRegistryPath, '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(polyglotRegistryPath, '{"schemaVersion":1,"publications":[]}\n');

function runPlanner(inputs, output = reportPath, targetPlan = "") {
  const result = spawnSync(process.execPath, [
    "scripts/plan-youtube-publish-schedule.mjs",
    ...inputs,
    "--channel-config=config/youtube-channels.json",
    `--policy=${policyPath}`,
    `--calendar=${calendarPath}`,
    `--publication-registry=${ordinaryRegistryPath}`,
    `--polyglot-publication-registry=${polyglotRegistryPath}`,
    ...(targetPlan ? [`--target-plan=${targetPlan}`] : []),
    "--start-date=2099-01-01",
    "--fill-earliest",
    "--write-metadata",
    "--write-calendar",
    `--output=${output}`,
    "--json",
  ], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(fs.readFileSync(output, "utf8"));
}

const report = runPlanner([ordinaryMetadata, polyglotMetadata]);
assert.equal(report.summary.scheduledCount, 2);
assert.equal(new Set(report.rows.map((row) => row.publishAt)).size, 2, "same-channel videos must not share a publish slot");
assert.ok(report.rows.every((row) => row.startDateAdjustedToEarliest), "later requested date must not create a calendar gap");
assert.ok(report.rows.some((row) => row.localDate === dayAfterTomorrow), "a completely empty day must be filled before extra slots on occupied days");

const calendar = JSON.parse(fs.readFileSync(calendarPath, "utf8"));
assert.equal(calendar.reservations.length, 4);
const polyglotReservation = calendar.reservations.find((row) => row.polyglotKey === polyglotKey);
assert.equal(polyglotReservation?.videoType, "polyglot");
assert.deepEqual(polyglotReservation?.targetLangs, ["ES", "FR", "DE"]);

const writtenPolyglotMetadata = JSON.parse(fs.readFileSync(polyglotMetadata, "utf8"));
assert.equal(writtenPolyglotMetadata.privacyStatus, "private");
assert.ok(writtenPolyglotMetadata.publishAt);

fs.writeFileSync(calendarPath, '{"schemaVersion":1,"reservations":[]}\n');
fs.writeFileSync(polyglotRegistryPath, `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    videoType: "polyglot",
    polyglotKey,
    setId: "test-deck",
    supportLang: "EN",
    youtubeVideoId: "already-live",
    publicationStatus: "scheduled_uploaded",
  }],
}, null, 2)}\n`);
const blockedReport = runPlanner([polyglotMetadata], path.join(root, "blocked-report.json"));
assert.equal(blockedReport.summary.scheduledCount, 0);
assert.equal(blockedReport.rows[0].status, "skipped");
assert.match(blockedReport.rows[0].blockers.join(" "), /existing active publication/);

fs.writeFileSync(polyglotRegistryPath, `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    videoType: "polyglot",
    polyglotKey: "polyglot:test-deck:EN:global_europe_core:differenthash",
    setId: "test-deck",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    contentScope: "full",
    targetLangs: ["ES", "FR", "IT"],
    youtubeVideoId: "same-bundle-live",
    publicationStatus: "published_uploaded",
  }],
}, null, 2)}\n`);
const sameBundleBlocked = runPlanner([polyglotMetadata], path.join(root, "same-bundle-blocked-report.json"));
assert.equal(sameBundleBlocked.rows[0].status, "skipped");
assert.match(sameBundleBlocked.rows[0].blockers.join(" "), /existing active publication/);

fs.writeFileSync(polyglotRegistryPath, `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    videoType: "polyglot",
    polyglotKey: "polyglot:test-deck:EN:global_europe_core:testhash:short_unverified",
    setId: "test-deck",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    contentScope: "short_unverified",
    targetLangs: ["ES", "FR", "DE"],
    youtubeVideoId: "short-live",
    publicationStatus: "published_uploaded",
  }],
}, null, 2)}\n`);
const shortBlocksFull = runPlanner([polyglotMetadata], path.join(root, "short-blocks-full-report.json"));
assert.equal(shortBlocksFull.summary.scheduledCount, 0);
assert.equal(shortBlocksFull.rows[0].status, "skipped");
assert.match(shortBlocksFull.rows[0].blockers.join(" "), /existing active publication/);
fs.writeFileSync(calendarPath, '{"schemaVersion":1,"reservations":[]}\n');

fs.writeFileSync(polyglotRegistryPath, `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    videoType: "polyglot",
    polyglotKey: "polyglot:test-deck:EN-GB:global_europe_core:testhash",
    setId: "test-deck",
    supportLang: "EN-GB",
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE"],
    targetLangsHash: "testhash",
    youtubeVideoId: "legacy-poly-live",
    publicationStatus: "published_uploaded",
  }],
}, null, 2)}\n`);
const legacyPolyBlocked = runPlanner([polyglotMetadata], path.join(root, "legacy-poly-blocked-report.json"));
assert.equal(legacyPolyBlocked.rows[0].status, "skipped");
assert.match(legacyPolyBlocked.rows[0].blockers.join(" "), /existing active publication/);

fs.writeFileSync(polyglotRegistryPath, '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(ordinaryRegistryPath, `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    setId: "test-deck",
    supportLang: "EN-GB",
    targetLang: "DE",
    youtubeVideoId: "legacy-ordinary-live",
    publicationStatus: "published_uploaded",
  }],
}, null, 2)}\n`);
const legacyOrdinaryBlocked = runPlanner([ordinaryMetadata], path.join(root, "legacy-ordinary-blocked-report.json"));
assert.equal(legacyOrdinaryBlocked.rows[0].status, "skipped");
assert.match(legacyOrdinaryBlocked.rows[0].blockers.join(" "), /existing active publication/);

const targetPlanPath = path.join(root, "target-plan.json");
fs.writeFileSync(ordinaryRegistryPath, '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(calendarPath, `${JSON.stringify({
  schemaVersion: 1,
  reservations: [
    { setId: "existing-a", supportLang: "EN", targetLang: "FR", channelKey: "en", publishAt: `${tomorrow}T08:00:00.000Z`, localDate: tomorrow, status: "reserved" },
    { setId: "existing-b", supportLang: "EN", targetLang: "IT", channelKey: "en", publishAt: `${thirdDay}T08:00:00.000Z`, localDate: thirdDay, status: "reserved" },
  ],
}, null, 2)}\n`);
fs.writeFileSync(targetPlanPath, `${JSON.stringify({
  setId: "test-deck",
  supports: [{ setId: "test-deck", supportLang: "EN", eligibleTargets: ["FR", "DE"] }],
}, null, 2)}\n`);
const ordinalCannotSkipGap = runPlanner(
  [ordinaryMetadata],
  path.join(root, "ordinal-cannot-skip-gap-report.json"),
  targetPlanPath,
);
assert.equal(ordinalCannotSkipGap.rows[0].targetPlanSlotOrdinal, 1);
assert.equal(ordinalCannotSkipGap.rows[0].localDate, dayAfterTomorrow);

fs.writeFileSync(ordinaryRegistryPath, '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(calendarPath, `${JSON.stringify({
  schemaVersion: 1,
  reservations: [
    {
      setId: "superseded",
      supportLang: "EN",
      targetLang: "FR",
      channelKey: "en",
      publishAt: `${tomorrow}T08:00:00.000Z`,
      localDate: tomorrow,
      status: "reserved",
      supersededAt: new Date().toISOString(),
    },
  ],
}, null, 2)}\n`);
const tombstoneDoesNotOccupySlot = runPlanner([ordinaryMetadata], path.join(root, "tombstone-slot-report.json"));
assert.equal(tombstoneDoesNotOccupySlot.summary.scheduledCount, 1);
assert.equal(tombstoneDoesNotOccupySlot.rows[0].publishAt, `${tomorrow}T08:00:00.000Z`);

console.log("youtube publish schedule tests passed");
