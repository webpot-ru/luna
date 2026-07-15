#!/usr/bin/env node
import assert from "node:assert/strict";
import { scheduledStatusBody, validateRepairPlan } from "./youtube-repair-scheduled-publish-at.mjs";

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

console.log("youtube-repair-scheduled-publish-at tests passed");
