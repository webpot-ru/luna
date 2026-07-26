#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
  /campaign_owned_apply: \{ required: true, type: boolean \}[\s\S]*?CAMPAIGN_OWNED_APPLY: \$\{\{ inputs\.campaign_owned_apply \}\}[\s\S]*?\[ "\$CAMPAIGN_OWNED_APPLY" != "true" \][\s\S]*?Direct apply is disabled/u,
  "manual Polyglot apply must be blocked unless the reusable worker receives the internal campaign-owned flag",
);
assert.doesNotMatch(
  workerWorkflow.split(/^  workflow_dispatch:/mu)[1],
  /campaign_owned_apply:/u,
  "manual Polyglot dispatch must not expose the internal campaign-owned flag",
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
assert.match(
  campaignWorkflow,
  /uses: \.\/\.github\/workflows\/youtube-polyglot-video-publish\.yml[\s\S]*?campaign_owned_apply: true/u,
  "the claimed campaign must explicitly authorize its Polyglot reusable worker",
);

const directPlanOutput = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "youtube-polyglot-plan-")), "plan.json");
spawnSync(process.execPath, [
  "scripts/plan-polyglot-youtube-publish.mjs",
  "--set=home_kitchen_cooking_actions_a1_a2",
  "--support=LO",
  "--bundle=romance_core",
  "--content-scope=full",
  "--max-duration-seconds=895",
  `--output=${directPlanOutput}`,
], { cwd: process.cwd(), encoding: "utf8" });
const directPlan = JSON.parse(fs.readFileSync(directPlanOutput, "utf8"));
assert.equal(directPlan.candidate.contentScope, "short_unverified", "a channel without confirmed long-video capability must be planned as a short product before render");
assert.equal(directPlan.candidate.maxDurationSeconds, 895, "automatic short product must retain the <=14:55 duration gate");
assert.equal(directPlan.candidate.cardLimit, 0, "automatic short product uses dynamic measured card selection");
assert.equal(directPlan.candidate.autoFallbackContentScope, "short_unverified", "planner must record the pre-render full-to-short conversion");
assert.equal(directPlan.candidate.autoFallbackReason, "long_video_upload_not_confirmed");

const hyPlanOutput = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "youtube-polyglot-plan-hy-")), "plan.json");
const hyPlanRun = spawnSync(process.execPath, [
  "scripts/plan-polyglot-youtube-publish.mjs",
  "--set=home_kitchen_cooking_actions_a1_a2",
  "--support=HY",
  "--bundle=romance_core",
  "--content-scope=full",
  `--output=${hyPlanOutput}`,
], { cwd: process.cwd(), encoding: "utf8" });
assert.notEqual(hyPlanRun.status, 0, "HY must be blocked by the no-spend production readiness gate");
const hyPlan = JSON.parse(fs.readFileSync(hyPlanOutput, "utf8"));
assert.equal(hyPlan.candidate.productionReadiness.ready, false);
assert.match(hyPlan.blockers.join("\n"), /ai33_tts_endpoint_not_verified_for_github/u);

console.log("youtube Polyglot campaign claim tests passed");
