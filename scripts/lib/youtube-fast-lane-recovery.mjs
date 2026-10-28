import assert from "node:assert/strict";
import { assignmentKey, polyglotProductSlotKey } from "./youtube-publication-control.mjs";

export function recoveryRequest(inputs) {
  const campaignId = String(inputs.recovery_source_campaign_id || "").trim();
  const manifestHash = String(inputs.recovery_source_manifest_hash || "").trim();
  const rawKeys = String(inputs.recovery_assignment_keys || "").trim();
  if (!campaignId) {
    assert(!manifestHash && !rawKeys, "Recovery hash/keys require a source campaign");
    return null;
  }
  assert.match(campaignId, /^yt-[a-zA-Z0-9_-]+$/, "Invalid recovery source campaign ID");
  assert.match(manifestHash, /^[a-f0-9]{64}$/, "Recovery requires the exact source manifest hash");
  let keys = null; // Empty input means ALL still-active missing source rows, never new rows.
  if (rawKeys) {
    keys = JSON.parse(rawKeys);
    assert(Array.isArray(keys) && keys.length > 0 && keys.every((k) => typeof k === "string" && k.trim() === k && k), "Recovery keys must be a nonempty JSON string array");
    assert.equal(new Set(keys).size, keys.length, "Duplicate approved recovery keys");
  }
  return { campaignId, manifestHash, keys };
}

export function selectRecoveryRows({ source, request, expectedCount, selectedSupports, claimedCampaignId = "" }) {
  assert(source, "Recovery source campaign not found");
  assert.equal(source.campaignId, request.campaignId);
  assert.equal(source.manifestHash, request.manifestHash, "Source manifest hash changed");
  assert.equal(source.status, "reconciliation_required", "Recovery source must have a terminal reconciliation result");
  assert(source.finalizedAt && source.finalizeSummary, "Source terminal finalizer proof is missing");
  const active = new Set(source.assignmentKeys);
  const requested = request.keys || source.assignments.filter((r) => !r.youtubeVideoId && (claimedCampaignId
    ? r.status === "superseded_partial_recovery" && r.supersededByCampaignId === claimedCampaignId
    : active.has(r.assignmentKey) && !String(r.status).includes("superseded"))).map((r) => r.assignmentKey);
  assert.equal(requested.length, Number(expectedCount), "Remaining source count differs from explicit approval");
  const rows = requested.map((key) => {
    const matches = source.assignments.filter((r) => r.assignmentKey === key);
    assert.equal(matches.length, 1, `Missing or ambiguous source key: ${key}`);
    const row = matches[0];
    assert(!row.youtubeVideoId && !row.videoId && !row.youtubeVideoUrl, `Accepted source row cannot be recovered: ${key}`);
    const owned = claimedCampaignId && row.status === "superseded_partial_recovery" && row.supersededByCampaignId === claimedCampaignId;
    assert(owned || (active.has(key) && !String(row.status).includes("superseded")), `Source row already superseded or released: ${key}`);
    assert(selectedSupports.includes(row.supportLang), `Source support outside approved selector: ${row.supportLang}`);
    return row;
  });
  return rows;
}

export function verifyRecoveryRows({ source, selected, manifest, control, playlists }) {
  const live = control.publications || [];
  const byId = new Map(live.filter((r) => r.youtubeVideoId).map((r) => [r.youtubeVideoId, r]));
  for (const accepted of source.assignments.filter((r) => r.youtubeVideoId)) {
    const found = byId.get(accepted.youtubeVideoId);
    assert(found, `Accepted source ID absent from fresh readback: ${accepted.youtubeVideoId}`);
    assert.equal(assignmentKey(found), accepted.assignmentKey, "Accepted source ID changed assignment identity");
  }
  assert.equal(manifest.inputs.partialRecoveryOfCampaignId, source.campaignId);
  assert.equal(manifest.evidence.partialRecoveryCampaign.manifestHash, source.manifestHash);
  assert.deepEqual(manifest.inputs.assignmentKeys.slice().sort(), selected.map((r) => r.assignmentKey).sort());
  assert.deepEqual(manifest.assignments.map((r) => r.assignmentKey).sort(), selected.map((r) => r.assignmentKey).sort());
  for (const row of manifest.assignments) {
    const previous = selected.find((r) => r.assignmentKey === row.assignmentKey);
    for (const key of ["videoType", "setId", "supportLang", "targetLang", "targetLangs", "targetLangsHash", "bundleKey", "contentScope", "cardLimit", "youtubeChannelId", "routeKey", "youtubeEnvironment"]) {
      assert.deepEqual(row[key], previous[key], `Recovery identity/scope/route changed: ${row.assignmentKey}/${key}`);
    }
    if (row.contentScope === "short_unverified") assert.equal(row.maxDurationSeconds, previous.maxDurationSeconds);
    for (const key of ["mode", "path", "sha256", "manifestPath"]) assert.equal(row.thumbnail?.[key], previous.thumbnail?.[key], "Recovery must keep the approved cover contract");
    assert.deepEqual(row.productionReadiness, previous.productionReadiness, "Recovery must keep the voice/readiness contract");
    assert(!live.some((r) => r.youtubeVideoId && (row.videoType === "polyglot"
      ? polyglotProductSlotKey(r) === polyglotProductSlotKey(row) : assignmentKey(r) === row.assignmentKey)), `Recovery row already exists live: ${row.assignmentKey}`);
    const channel = playlists.channels.find((c) => c.supportLang === row.supportLang && c.youtubeChannelId === row.youtubeChannelId);
    assert(channel?.complete, "Fresh owned playlist channel evidence is incomplete");
    const playlist = channel.playlists.find((p) => p.id === row.playlist.youtubePlaylistId);
    assert(playlist?.privacyStatus === "public" && playlist.youtubeChannelId === row.youtubeChannelId, "Recovery playlist must be existing, public and owned");
    assert(playlist.itemMembershipComplete && playlist.itemPaginationComplete, "Recovery playlist item pagination is incomplete");
  }
}
