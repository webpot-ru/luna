#!/usr/bin/env node
import assert from "node:assert/strict";
import { recoveryRequest, selectRecoveryRows, verifyRecoveryRows } from "./youtube-fast-lane-recovery.mjs";

const sourceId = "yt-fixture-2026-10-28-source", hash = "a".repeat(64);
const accepted = { videoType: "ordinary", setId: "fixture", supportLang: "EN", targetLang: "DE", assignmentKey: "ordinary|fixture|EN|DE",
  youtubeVideoId: "already-uploaded", status: "upload_accepted_reconciliation_required" };
const ordinary = { videoType: "ordinary", setId: "fixture", supportLang: "EN", targetLang: "JA", assignmentKey: "ordinary|fixture|EN|JA",
  status: "claimed", youtubeChannelId: "owner", routeKey: "youtube-1", youtubeEnvironment: "youtube-api-branding",
  thumbnail: { mode: "first_frame_auto", ready: true }, playlist: { youtubePlaylistId: "owned-public" }, productionReadiness: { voiceId: "same-voice" } };
const poly = { ...ordinary, videoType: "polyglot", targetLang: "PL,CS", targetLangs: ["PL", "CS"], targetLangsHash: "fixturehash", bundleKey: "slavic_core",
  contentScope: "short_unverified", cardLimit: 0, maxDurationSeconds: 895, assignmentKey: "polyglot|fixture|EN|slavic_core|fixturehash|short_unverified" };
const source = { campaignId: sourceId, manifestHash: hash, status: "reconciliation_required", finalizedAt: "2026-10-28T00:00:00Z", finalizeSummary: {},
  assignments: [accepted, ordinary, poly], assignmentKeys: [accepted.assignmentKey, ordinary.assignmentKey, poly.assignmentKey] };
const request = recoveryRequest({ recovery_source_campaign_id: sourceId, recovery_source_manifest_hash: hash });
assert.equal(recoveryRequest({}), null);
for (const i of [{ recovery_source_manifest_hash: hash }, { recovery_source_campaign_id: sourceId },
  { recovery_source_campaign_id: "../escape", recovery_source_manifest_hash: hash },
  { recovery_source_campaign_id: sourceId, recovery_source_manifest_hash: hash, recovery_assignment_keys: JSON.stringify([ordinary.assignmentKey, ordinary.assignmentKey]) }]) assert.throws(() => recoveryRequest(i));
const args = { source, request, expectedCount: 2, selectedSupports: ["EN"] };
const selected = selectRecoveryRows(args);
assert.deepEqual(selected.map((r) => r.assignmentKey), [ordinary.assignmentKey, poly.assignmentKey]);
assert.throws(() => selectRecoveryRows({ ...args, expectedCount: 3 }));
assert.throws(() => selectRecoveryRows({ ...args, selectedSupports: ["JA"] }));
assert.throws(() => selectRecoveryRows({ ...args, request: { ...request, manifestHash: "b".repeat(64) } }));
assert.throws(() => selectRecoveryRows({ ...args, source: { ...source, finalizedAt: "" } }));
assert.throws(() => selectRecoveryRows({ ...args, request: { ...request, keys: [accepted.assignmentKey] }, expectedCount: 1 }));
const subset = selectRecoveryRows({ ...args, request: { ...request, keys: [poly.assignmentKey] }, expectedCount: 1 });
assert.deepEqual(subset.map((r) => r.assignmentKey), [poly.assignmentKey]);
const claimed = structuredClone(source);
for (const r of claimed.assignments.filter((r) => !r.youtubeVideoId)) { r.status = "superseded_partial_recovery"; r.supersededByCampaignId = "new-recovery"; }
claimed.assignmentKeys = [accepted.assignmentKey];
assert.equal(selectRecoveryRows({ ...args, source: claimed, claimedCampaignId: "new-recovery" }).length, 2);
assert.throws(() => selectRecoveryRows({ ...args, source: claimed, claimedCampaignId: "foreign-claim" }));
const fixture = () => ({ source: structuredClone(source), selected: structuredClone(selected),
  manifest: { inputs: { partialRecoveryOfCampaignId: sourceId, assignmentKeys: [ordinary.assignmentKey, poly.assignmentKey] },
    evidence: { partialRecoveryCampaign: { manifestHash: hash } }, assignments: structuredClone(selected) },
  control: { publications: [{ ...accepted }] },
  playlists: { channels: [{ supportLang: "EN", youtubeChannelId: "owner", complete: true,
    playlists: [{ id: "owned-public", privacyStatus: "public", youtubeChannelId: "owner", itemMembershipComplete: true, itemPaginationComplete: true }] }] } });
verifyRecoveryRows(fixture());
const fails = (mutate) => { const f = fixture(); mutate(f); assert.throws(() => verifyRecoveryRows(f)); };
fails((f) => { f.control.publications = []; }); // Even a thumbnail-failed accepted video must stay accounted for.
fails((f) => { f.control.publications.push({ ...ordinary, youtubeVideoId: "already-live" }); });
fails((f) => { f.control.publications.push({ ...poly, contentScope: "full", assignmentKey: "different-full-key", youtubeVideoId: "full-live" }); });
fails((f) => { f.manifest.assignments.push({ ...ordinary, targetLang: "ES", assignmentKey: "ordinary|fixture|EN|ES" }); });
fails((f) => { f.manifest.assignments[1].contentScope = "full"; });
fails((f) => { f.manifest.assignments[1].maxDurationSeconds = 900; });
fails((f) => { f.manifest.assignments[0].productionReadiness.voiceId = "other-voice"; });
fails((f) => { f.manifest.assignments[0].thumbnail.mode = "custom"; });
fails((f) => { f.playlists.channels[0].playlists[0].privacyStatus = "private"; });
fails((f) => { f.playlists.channels[0].playlists[0].youtubeChannelId = "foreign-owner"; });
fails((f) => { f.playlists.channels[0].playlists[0].itemMembershipComplete = false; });
console.log("PASS: exact all-missing/subset, accepted-ID exclusion including thumbnail failures, live ordinary/full-short collisions, lineage, cover/voice/route/scope and owned public playlists");
