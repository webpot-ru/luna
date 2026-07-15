#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  readScheduleUntilExpected,
  scheduledStatusBody,
  validateRepairPlan,
} from "./youtube-repair-scheduled-publish-at.mjs";

const plan = validateRepairPlan({
  schemaVersion: 1,
  planId: "test-plan",
  setId: "set",
  targets: [{
    youtubeVideoId: "Rpo-HU3C7gY",
    supportLang: "es-419",
    expectedPrivacyStatus: "private",
    expectedPublishAt: "2026-07-16T21:30:00Z",
    publishAt: "2026-07-17T21:30:00Z",
  }],
});
assert.equal(plan.targets[0].supportLang, "ES-419");
assert.equal(plan.targets[0].publishAt, "2026-07-17T21:30:00.000Z");

assert.throws(() => validateRepairPlan({
  schemaVersion: 1,
  planId: "duplicate",
  setId: "set",
  targets: [
    {
      youtubeVideoId: "Rpo-HU3C7gY",
      supportLang: "ES-419",
      expectedPrivacyStatus: "private",
      expectedPublishAt: "2026-07-16T21:30:00Z",
      publishAt: "2026-07-17T21:30:00Z",
    },
    {
      youtubeVideoId: "kd1j2DAi30s",
      supportLang: "ES-419",
      expectedPrivacyStatus: "private",
      expectedPublishAt: "2026-07-15T19:30:00Z",
      publishAt: "2026-07-17T21:30:00Z",
    },
  ],
}), /same channel\/time slot/);

assert.deepEqual(scheduledStatusBody({
  embeddable: true,
  selfDeclaredMadeForKids: false,
  containsSyntheticMedia: true,
}, "2026-07-17T21:30:00.000Z"), {
  privacyStatus: "private",
  publishAt: "2026-07-17T21:30:00.000Z",
  embeddable: true,
  selfDeclaredMadeForKids: false,
  containsSyntheticMedia: true,
});

const expectedPublishAt = "2026-07-17T21:30:00.000Z";
const stale = { status: { privacyStatus: "private", publishAt: "2026-07-16T21:30:00.000Z" } };
const moved = { status: { privacyStatus: "private", publishAt: expectedPublishAt } };
const observedDelays = [];
const reads = [stale, stale, moved];
const propagation = await readScheduleUntilExpected({
  read: async () => reads.shift(),
  publishAt: expectedPublishAt,
  firstDelayMs: 15_000,
  retryDelayMs: 10_000,
  wait: async (milliseconds) => observedDelays.push(milliseconds),
});
assert.equal(propagation.matched, true);
assert.equal(propagation.attempts, 3);
assert.deepEqual(propagation.delays, [15_000, 10_000, 10_000]);
assert.deepEqual(observedDelays, [15_000, 10_000, 10_000]);
assert.equal(propagation.after, moved);

const mismatchReads = [stale, stale];
const mismatch = await readScheduleUntilExpected({
  read: async () => mismatchReads.shift() || stale,
  publishAt: expectedPublishAt,
  attempts: 2,
  firstDelayMs: 0,
  retryDelayMs: 0,
  wait: async () => assert.fail("zero-delay readback must not wait"),
});
assert.equal(mismatch.matched, false);
assert.equal(mismatch.attempts, 2);
assert.equal(mismatch.after, stale);

console.log("youtube-repair-scheduled-publish-at tests passed");
