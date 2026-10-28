#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { verifyCampaignManifest } from "./lib/youtube-publication-campaign.mjs";
import { loadCanonicalSupportRouting, resolveCanonicalSupports } from "./lib/youtube-support-routing.mjs";
import { ordinaryCountOverrides } from "./lib/youtube-campaign-counts.mjs";
import { buildPartialRecovery } from "./create-youtube-partial-recovery-campaign.mjs";
import { readYoutubeDurableJson, serializeYoutubeDurableJson } from "./lib/youtube-durable-json.mjs";
import { recoveryRequest, selectRecoveryRows, verifyRecoveryRows } from "./lib/youtube-fast-lane-recovery.mjs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const enabled = (value) => value === true || value === "true";
export function authorizeFastLane(event, ref) {
  const i = event.inputs || {};
  assert.equal(ref, "refs/heads/main", "Fast lane runs only from reviewed main");
  assert.match(String(i.expected_assignment_count), /^[1-9][0-9]*$/, "An exact positive count is required");
  assert(Number.isSafeInteger(Number(i.expected_assignment_count)));
  assert.equal(i.audit_routes, "ALL");
  assert(!i.audit_supports, "Partial audit is not supported");
  const recovery = recoveryRequest(i);
  assert(Number(i.campaign_ordinary_per_channel) > 0 || Number(i.campaign_polyglot_per_channel) > 0, "Playlist discovery must be activated");
  for (const key of ["persist_snapshot", "campaign_allow_partial_ordinary_tail", "campaign_allow_partial_polyglot_tail", "campaign_allow_partial_route_quota_tail"]) assert(!enabled(i[key]), `${key} is not supported`);
  const apply = enabled(i.fast_apply);
  assert.equal(enabled(i.claim_campaign), apply, "Claim and approved apply must be enabled together");
  if (apply) {
    assert.equal(i.claim_target_branch, "main");
    assert.equal(i.claim_confirm, "CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN");
    assert.equal(i.fast_confirm_apply, "APPLY_YOUTUBE_PUBLICATION_CAMPAIGN");
    assert.equal(i.fast_confirm_metadata, "USE_OPENAI_METADATA");
  }
  return { inputs: i, apply, recovery };
}

export function verifyFastLaneEvidence({ event, ref, control, playlists, manifest, source = null, claimedCampaignId = "", now = Date.now() }) {
  const { inputs, recovery } = authorizeFastLane(event, ref);
  verifyCampaignManifest(manifest);
  assert.equal(manifest.setId, inputs.set_id);
  const supports = resolveCanonicalSupports({ requested: inputs.campaign_supports, routing: loadCanonicalSupportRouting() });
  if (recovery) {
    assert.equal(source?.setId, inputs.set_id);
    const selected = selectRecoveryRows({ source, request: recovery, expectedCount: inputs.expected_assignment_count, selectedSupports: supports, claimedCampaignId });
    verifyRecoveryRows({ source, selected, manifest, control, playlists });
    assert.deepEqual(manifest.inputs.supports.split(",").sort(), [...new Set(selected.map((r) => r.supportLang))].sort());
  } else {
    assert(!manifest.inputs.partialRecoveryOfCampaignId, "A regular batch cannot silently become recovery");
    assert.deepEqual(manifest.inputs.supports.split(",").sort(), [...supports].sort());
    assert.equal(manifest.inputs.ordinaryPerChannel, Number(inputs.campaign_ordinary_per_channel));
    assert.equal(manifest.inputs.polyglotPerChannel, Number(inputs.campaign_polyglot_per_channel));
    assert.deepEqual(manifest.inputs.ordinaryPerChannelOverrides || {}, ordinaryCountOverrides(inputs.campaign_ordinary_count_overrides || "", supports, Number(inputs.campaign_ordinary_per_channel)));
  }
  const c = control.summary || {};
  for (const key of ["healthy", "complete", "paginationComplete", "videoStatusReadbackComplete"]) assert.equal(c[key], true, `Control ${key}`);
  assert.equal(c.expectedRouteCount, 4); assert.equal(c.receivedRouteCount, 4);
  for (const key of ["blockerCount", "calendarAssignmentDuplicateCount", "calendarSlotCollisionCount", "unclassifiedRecentUploadCount", "liveVideoMissingDurableRegistryCount", "liveStatusNotReturnedCount", "liveScheduleMissingCalendarCount"]) assert.equal(c[key], 0, `Control ${key}`);
  assert.equal(control.blockers.length, 0);
  assert.equal(playlists.summary.complete, true);
  assert.equal(playlists.summary.supportCount, 51);
  assert.equal(playlists.summary.blockerCount, 0);
  assert.equal(playlists.summary.youtubeWrites, 0);
  for (const evidence of [control, playlists, manifest]) {
    const age = (now - Date.parse(evidence.generatedAt)) / 60000;
    assert(age >= -5 && age <= 180, "Evidence must be fresh (<=180min)");
  }
  const rows = manifest.assignments;
  assert.equal(rows.length, Number(inputs.expected_assignment_count), "Exact approved count changed");
  assert.equal(manifest.summary.assignmentCount, rows.length);
  assert.equal(manifest.summary.applyReady, true);
  assert.equal(manifest.summary.blockerCount, 0);
  assert.equal(manifest.summary.playlistCreateCount, 0, "Existing public playlists only");
  assert.equal(manifest.summary.productionDeferredAssignmentCount ?? (recovery ? 0 : undefined), 0);
  assert.equal(manifest.summary.routeQuotaDeferredAssignmentCount ?? (recovery ? 0 : undefined), 0);
  assert.equal(new Set(rows.map((r) => r.assignmentKey)).size, rows.length);
  assert.equal(new Set(rows.map((r) => r.slotKey)).size, rows.length);
  return manifest;
}

export function assertUnusedClaimParent(runs, head) {
  assert(!runs.some((r) => r.head_sha === head), "A parent already exists for this claim; do not retry");
  assert(!runs.some((r) => r.status !== "completed"), "Another publication parent is active");
}

function main() {
  const [mode, artifactRoot] = process.argv.slice(2);
  const event = read(process.env.GITHUB_EVENT_PATH);
  const ref = process.env.GITHUB_REF;
  const { inputs, apply, recovery } = authorizeFastLane(event, ref);
  if (mode === "authorize") return console.log("Explicit scope authorization: PASS");
  if (mode === "is-recovery") { process.exitCode = recovery ? 0 : 1; return; }
  assert(["plan-recovery", "claim", "verify", "dispatch"].includes(mode), "Expected authorize, plan-recovery, claim, verify or dispatch");
  let registry;
  let source;
  if (recovery) {
    registry = readYoutubeDurableJson("config/youtube-publication-campaigns.json");
    source = registry.campaigns.find((c) => c.campaignId === recovery.campaignId);
    const sourcePlan = read(`config/youtube-publication-campaign-plans/${recovery.campaignId}.json`);
    verifyCampaignManifest(sourcePlan);
    assert.equal(sourcePlan.manifestHash, recovery.manifestHash);
    assert.equal(sourcePlan.setId, inputs.set_id);
  }
  const recover = (reports, now) => {
    assert(recovery, "Source campaign required for recovery");
    const supports = resolveCanonicalSupports({ requested: inputs.campaign_supports, routing: loadCanonicalSupportRouting() });
    const selected = selectRecoveryRows({ source, request: recovery, expectedCount: inputs.expected_assignment_count, selectedSupports: supports });
    return buildPartialRecovery({ registry, calendar: read("config/youtube-publish-calendar.json"), channels: read("config/youtube-channels.json"),
      routing: loadCanonicalSupportRouting(), policy: read("config/youtube-publish-schedule-policy.json"),
      controlReports: reports, campaignId: source.campaignId, assignmentKeys: selected.map((r) => r.assignmentKey),
      now, minFutureMinutes: 90, maxEvidenceAgeMinutes: 180 });
  };
  if (mode === "plan-recovery") {
    const reports = [];
    const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^youtube-publication-control-youtube-[1-4]\.json$/.test(e.name)) reports.push(read(p));
    } };
    walk(process.argv[4] || ".control-artifacts");
    assert.equal(reports.length, 4, "Recovery requires exactly four complete route reports");
    const result = recover(reports, new Date());
    verifyFastLaneEvidence({ event, ref, source, control: read(path.join(artifactRoot, "youtube-publication-control-all-routes.json")),
      playlists: read(path.join(artifactRoot, "youtube-playlist-discovery-snapshot.json")), manifest: result.manifest });
    fs.writeFileSync(path.join(artifactRoot, "youtube-fast-lane-route-reports.json"), JSON.stringify(reports));
    fs.writeFileSync(path.join(artifactRoot, "youtube-publication-campaign-plan.json"), `${JSON.stringify(result.manifest, null, 2)}\n`);
    return console.log(`Exact source-only recovery preview: ${result.manifest.assignments.length}; no claim/provider/YouTube write`);
  }
  const manifest = verifyFastLaneEvidence({ event, ref,
    source, claimedCampaignId: mode === "dispatch" ? read(path.join(artifactRoot, "youtube-publication-campaign-plan.json")).campaignId : "",
    control: read(path.join(artifactRoot, "youtube-publication-control-all-routes.json")),
    playlists: read(path.join(artifactRoot, "youtube-playlist-discovery-snapshot.json")),
    manifest: read(path.join(artifactRoot, "youtube-publication-campaign-plan.json")),
  });
  if (mode === "verify") return console.log(`Exact fresh ${manifest.assignments.length} plan: PASS`);
  assert(apply, "Preview cannot dispatch");
  if (mode === "claim") {
    if (!recovery) return execFileSync(process.execPath, ["scripts/claim-youtube-publication-campaign.mjs", "--manifest=outputs/youtube-publication-campaign-plan.json", "--apply", "--confirm=CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN", "--json"], { stdio: "inherit" });
    const result = recover(read(path.join(artifactRoot, "youtube-fast-lane-route-reports.json")), new Date(manifest.generatedAt));
    // Rebuild the exact original plan; real-clock freshness was checked above. Never refresh timestamps.
    assert.deepEqual(result.manifest, manifest, "Recovery changed between preview and claim");
    const files = {
      "config/youtube-publication-campaigns.json": result.nextRegistry,
      "config/youtube-publish-calendar.json": result.nextCalendar,
      [`config/youtube-publication-campaign-plans/${manifest.campaignId}.json`]: manifest,
    };
    // Serialize all bytes before any write, including the existing ledger size guard.
    const writes = Object.entries(files).map(([p, value]) => [p, serializeYoutubeDurableJson(p, value)]);
    for (const [p, text] of writes) { const temp = `${p}.tmp-${process.pid}`; fs.writeFileSync(temp, text); fs.renameSync(temp, p); }
    return console.log(`Claimed exact source-only recovery ${manifest.campaignId}`);
  }
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 160 * 1024 * 1024 }).trim();
  const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const repo = process.env.GITHUB_REPOSITORY;
  assert.match(repo || "", /^[\w.-]+\/[\w.-]+$/);
  const head = git("rev-parse", "HEAD");
  assert.equal(git("rev-parse", "HEAD^"), process.env.GITHUB_SHA, "Claim must be the only new main commit");
  const manifestPath = `config/youtube-publication-campaign-plans/${manifest.campaignId}.json`;
  const files = git("diff", "--name-only", "HEAD^", "HEAD").split("\n").sort();
  assert.deepEqual(files, [manifestPath, "config/youtube-publication-campaigns.json", "config/youtube-publish-calendar.json"].sort());
  assert.deepEqual(read(manifestPath), manifest);
  assert.equal(gh("api", `repos/${repo}/commits/main`, "--jq", ".sha").trim(), head, "Main moved after claim");
  // One paginated inventory, never a watch or polling loop. A failed prior parent also consumes this claim's attempt.
  const pages = JSON.parse(gh("api", "--paginate", "--slurp", `repos/${repo}/actions/workflows/youtube-publication-campaign.yml/runs?per_page=100`));
  const runs = pages.flatMap((p) => p.workflow_runs);
  assertUnusedClaimParent(runs, head);
  execFileSync(process.execPath, ["scripts/prepare-youtube-publication-campaign-run.mjs", `--campaign-id=${manifest.campaignId}`, `--manifest-hash=${manifest.manifestHash}`, "--output=outputs/youtube-fast-lane-preflight.json"], { stdio: "inherit" });
  const dispatchInputs = { mode: "apply", set_id: manifest.setId, supports: manifest.inputs.supports,
    ordinary_per_channel: String(manifest.inputs.ordinaryPerChannel), polyglot_per_channel: String(manifest.inputs.polyglotPerChannel),
    campaign_id: manifest.campaignId, campaign_manifest_hash: manifest.manifestHash,
    confirm_campaign_apply: inputs.fast_confirm_apply, confirm_openai_metadata: inputs.fast_confirm_metadata,
    playlist_preflight_mode: "owned_complete" };
  const receiptPath = "outputs/youtube-fast-lane-dispatch.json";
  const receipt = { campaignId: manifest.campaignId, manifestHash: manifest.manifestHash, head,
    requestedAt: new Date().toISOString(), status: "attempt_started_no_retry", inputs: dispatchInputs };
  fs.mkdirSync("outputs", { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(gh("api", `repos/${repo}/commits/main`, "--jq", ".sha").trim(), head, "Main moved before dispatch");
  // Exactly ONE dispatch request. An ambiguous failure stops, keeping the receipt for reconciliation.
  execFileSync("gh", ["api", "--method", "POST", `repos/${repo}/actions/workflows/youtube-publication-campaign.yml/dispatches`, "--input", "-"], {
    input: JSON.stringify({ ref: "main", inputs: dispatchInputs }), encoding: "utf8", stdio: ["pipe", "inherit", "inherit"],
  });
  receipt.status = "dispatch_request_accepted_not_upload_proof";
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`One standard parent dispatch requested for ${manifest.campaignId}. No watch, retry or recovery.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
