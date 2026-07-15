#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  findActivePolyglotCalendarReservation,
  isOwnedPolyglotCampaignClaim,
} from "./plan-polyglot-youtube-publish.mjs";

const campaignId = "campaign";
const campaignManifestHash = "manifest";
const candidate = {
  videoType: "polyglot",
  polyglotKey: "polyglot:deck:DE:global_europe_core:a7af54ecd0b2",
  setId: "deck",
  supportLang: "DE",
  bundleKey: "global_europe_core",
  contentScope: "full",
  targetLangs: ["EN", "ES", "FR", "IT"],
  targetLangsHash: "a7af54ecd0b2",
};
const claimedReservation = {
  ...candidate,
  polyglotKey: `${candidate.polyglotKey}:full`,
  campaignId,
  campaignManifestHash,
  channelKey: "de",
  publishAt: "2026-07-15T06:30:00.000Z",
  status: "campaign_claimed",
};

const found = findActivePolyglotCalendarReservation({ reservations: [claimedReservation] }, candidate);
assert.equal(found, claimedReservation, "campaign reservation with explicit :full scope must match the legacy planner key");
assert.equal(isOwnedPolyglotCampaignClaim({
  reservation: found,
  candidate,
  campaignId,
  campaignManifestHash,
}), true);

assert.equal(isOwnedPolyglotCampaignClaim({
  reservation: found,
  candidate,
  campaignId: "another-campaign",
  campaignManifestHash,
}), false, "another campaign must not own the reservation");
assert.equal(isOwnedPolyglotCampaignClaim({
  reservation: found,
  candidate,
  campaignId,
  campaignManifestHash: "another-manifest",
}), false, "another manifest must not own the reservation");

const targetDriftReservation = {
  ...claimedReservation,
  targetLangs: ["EN", "ES", "FR", "NL"],
  targetLangsHash: "different",
  polyglotKey: "polyglot:deck:DE:global_europe_core:different:full",
};
const driftFound = findActivePolyglotCalendarReservation({ reservations: [targetDriftReservation] }, candidate);
assert.equal(driftFound, targetDriftReservation, "same bundle slot must stay visible when targets drift");
assert.equal(isOwnedPolyglotCampaignClaim({
  reservation: driftFound,
  candidate,
  campaignId,
  campaignManifestHash,
}), false, "target drift must block campaign ownership");

const shortScopeReservation = {
  ...claimedReservation,
  contentScope: "short",
  polyglotKey: "polyglot:deck:DE:global_europe_core:a7af54ecd0b2:short",
};
assert.equal(
  findActivePolyglotCalendarReservation({ reservations: [shortScopeReservation] }, candidate),
  null,
  "a different content scope must not satisfy the full-video claim",
);

const workerWorkflow = fs.readFileSync(".github/workflows/youtube-polyglot-video-publish.yml", "utf8");
assert.match(
  workerWorkflow,
  /LIMIT: \$\{\{ steps\.polyglot_plan\.outputs\.effective_card_limit \|\| inputs\.limit \}\}/u,
  "the renderer must receive the planner's effective card limit",
);
assert.match(
  workerWorkflow,
  /Plan Polyglot candidate[\s\S]*?LIMIT: \$\{\{ inputs\.limit \}\}/u,
  "the Polyglot planner must receive the requested card limit before it computes an effective limit",
);
assert.match(
  workerWorkflow,
  /GITHUB_EVENT_NAME: \$\{\{ github\.event_name \}\}[\s\S]*?Direct apply is disabled/u,
  "manual Polyglot apply must be blocked so only the campaign workflow can create a bulk wave",
);
assert.match(
  workerWorkflow,
  /CONTENT_SCOPE: \$\{\{ steps\.polyglot_plan\.outputs\.effective_content_scope \|\| inputs\.content_scope \}\}/u,
  "the renderer must receive the planner's effective content scope",
);

const campaignWorkflow = fs.readFileSync(".github/workflows/youtube-publication-campaign.yml", "utf8");
assert.match(campaignWorkflow, /limit: \$\{\{ matrix\.card_limit \}\}/u);
assert.match(campaignWorkflow, /content_scope: \$\{\{ matrix\.content_scope \}\}/u);
assert.match(campaignWorkflow, /max_duration_seconds: \$\{\{ matrix\.max_duration_seconds \}\}/u);

console.log("youtube Polyglot campaign claim tests passed");
