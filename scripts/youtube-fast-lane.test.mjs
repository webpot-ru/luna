#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { authorizeFastLane, verifyFastLaneEvidence, assertUnusedClaimParent, assertSameRecoveryManifest } from "./youtube-fast-lane.mjs";
import { buildFastLaneWorkflow } from "./build-youtube-fast-lane-workflow.mjs";

const ref = "refs/heads/main";
const now = Date.parse("2026-10-29T00:00:00Z");
const inputs = { set_id: "fixture", campaign_supports: "EN", audit_routes: "ALL", expected_assignment_count: "1",
  campaign_ordinary_per_channel: "1", campaign_polyglot_per_channel: "0" };
const event = { inputs };
const fixture = () => ({ event: structuredClone(event), ref, now,
  control: { generatedAt: new Date(now).toISOString(), blockers: [], summary: {
    healthy: true, complete: true, paginationComplete: true, videoStatusReadbackComplete: true,
    expectedRouteCount: 4, receivedRouteCount: 4, blockerCount: 0, calendarAssignmentDuplicateCount: 0,
    calendarSlotCollisionCount: 0, unclassifiedRecentUploadCount: 0, liveVideoMissingDurableRegistryCount: 0,
    liveStatusNotReturnedCount: 0, liveScheduleMissingCalendarCount: 0 } },
  playlists: { generatedAt: new Date(now).toISOString(), summary: { complete: true, supportCount: 51, blockerCount: 0, youtubeWrites: 0 } },
  manifest: { generatedAt: new Date(now).toISOString(), setId: "fixture", campaignId: "fixture-1",
    inputs: { supports: "EN", ordinaryPerChannel: 1, polyglotPerChannel: 0 },
    summary: { assignmentCount: 1, applyReady: true, blockerCount: 0, playlistCreateCount: 0,
      productionDeferredAssignmentCount: 0, routeQuotaDeferredAssignmentCount: 0 },
    assignments: [{ assignmentKey: "fixture|EN|JA", slotKey: "fixture-slot" }] } });
const normalized = (v) => Array.isArray(v) ? v.map(normalized) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, normalized(v[k])])) : v;
function sign(f) {
  delete f.manifest.manifestHash;
  f.manifest.manifestHash = crypto.createHash("sha256").update(JSON.stringify(normalized(f.manifest))).digest("hex");
  return f;
}
assert.equal(authorizeFastLane(event, ref).apply, false);
const approved = structuredClone(event);
Object.assign(approved.inputs, { fast_apply: "true", claim_campaign: "true", claim_target_branch: "main",
  claim_confirm: "CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN", fast_confirm_apply: "APPLY_YOUTUBE_PUBLICATION_CAMPAIGN", fast_confirm_metadata: "USE_OPENAI_METADATA" });
assert.equal(authorizeFastLane(approved, ref).apply, true);
for (const key of ["claim_confirm", "fast_confirm_apply", "fast_confirm_metadata", "claim_target_branch"]) {
  const bad = structuredClone(approved); delete bad.inputs[key]; assert.throws(() => authorizeFastLane(bad, ref));
}
assert.throws(() => authorizeFastLane(approved, "refs/heads/other"));
assert.throws(() => authorizeFastLane({ inputs: { ...inputs, claim_campaign: "true" } }, ref));
for (const key of ["persist_snapshot", "campaign_allow_partial_ordinary_tail", "campaign_allow_partial_polyglot_tail", "campaign_allow_partial_route_quota_tail"]) {
  assert.throws(() => authorizeFastLane({ inputs: { ...inputs, [key]: "true" } }, ref));
}
verifyFastLaneEvidence(sign(fixture()));
const fails = (mutate) => { const f = fixture(); mutate(f); assert.throws(() => verifyFastLaneEvidence(sign(f))); };
fails((f) => { f.event.inputs.expected_assignment_count = "2"; });
fails((f) => { f.control.summary.paginationComplete = false; });
fails((f) => { f.control.summary.videoStatusReadbackComplete = false; });
fails((f) => { f.control.summary.unclassifiedRecentUploadCount = 1; });
fails((f) => { f.control.summary.calendarAssignmentDuplicateCount = 1; });
fails((f) => { f.control.generatedAt = new Date(now - 181 * 60000).toISOString(); });
fails((f) => { f.playlists.generatedAt = new Date(now - 181 * 60000).toISOString(); });
fails((f) => { f.manifest.summary.playlistCreateCount = 1; });
fails((f) => { f.manifest.inputs.supports = "JA"; });
fails((f) => { f.manifest.inputs.ordinaryPerChannel = 2; });
fails((f) => { f.manifest.summary.productionDeferredAssignmentCount = 1; });
fails((f) => { f.event.inputs.expected_assignment_count = "2"; f.manifest.summary.assignmentCount = 2; f.manifest.assignments.push({ ...f.manifest.assignments[0] }); });
const corrupt = sign(fixture()); corrupt.manifest.setId = "tampered"; assert.throws(() => verifyFastLaneEvidence(corrupt));
const roundTrip = fixture();
roundTrip.manifest.assignments[0].youtubeVideoId = undefined;
roundTrip.manifest.assignments[0].youtubeVideoUrl = undefined;
sign(roundTrip);
const stored = JSON.parse(JSON.stringify(roundTrip.manifest));
assertSameRecoveryManifest(roundTrip.manifest, stored);
for (const value of [null, "", "accepted-id-must-never-be-ignored"]) {
  const changed = structuredClone(roundTrip); changed.manifest.assignments[0].youtubeVideoId = value; sign(changed);
  assert.throws(() => assertSameRecoveryManifest(changed.manifest, stored));
}
const changedSlot = structuredClone(roundTrip); changedSlot.manifest.assignments[0].slotKey = "other-slot"; sign(changedSlot);
assert.throws(() => assertSameRecoveryManifest(changedSlot.manifest, stored));
assert.throws(() => assertSameRecoveryManifest({ ...roundTrip.manifest, manifestHash: "tampered" }, stored));
assertUnusedClaimParent([{ head_sha: "old", status: "completed" }], "new");
for (const conclusion of ["success", "failure", "cancelled"]) assert.throws(() => assertUnusedClaimParent([{ head_sha: "new", status: "completed", conclusion }], "new"));
assert.throws(() => assertUnusedClaimParent([{ head_sha: "old", status: "queued" }], "new"));

const old = fs.readFileSync(".github/workflows/youtube-publication-control.yml", "utf8");
const generated = buildFastLaneWorkflow(old);
assert.equal(fs.readFileSync(".github/workflows/youtube-publication-fast-lane.yml", "utf8"), generated);
assert(generated.indexOf("Check exact approved scope before any claim write") < generated.indexOf("      - name: Claim the exact fresh no-spend plan"));
assert(generated.includes("needs: [aggregate, reuse-control]"));
assert(generated.includes("!cancelled() && github.event.inputs.claim_campaign == 'true'"));
assert(generated.includes("  dispatch-approved-parent:\n    needs: claim-campaign"));
assert(generated.includes("if: ${{ github.event.inputs.reuse_control_run_id == '' }}"));
assert(generated.includes("node scripts/youtube-fast-lane.mjs import-control outputs"));
assert(generated.includes("node scripts/youtube-fast-lane.mjs plan-imported outputs .control-artifacts"));
assert(generated.includes("      actions: write"));
assert(generated.includes("node scripts/youtube-fast-lane.mjs claim .claim-artifact"));
assert(generated.includes("node scripts/youtube-fast-lane.mjs plan-recovery outputs .control-artifacts"));
assert(generated.includes("outputs/youtube-fast-lane-route-reports.json"));
assert(!/\bcron:|workflow_run:|gh run watch/.test(generated));
assert.throws(() => buildFastLaneWorkflow("unknown controller"));
console.log("PASS: preview/explicit approval, exact scope, freshness, duplicate prevention, completed failed-attempt guard, original-controller parity; no external calls");
