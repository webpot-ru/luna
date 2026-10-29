#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readYoutubeDurableJson } from './lib/youtube-durable-json.mjs';

export const POLICY = Object.freeze({
  repo: 'webpot-ru/luna', workflow: 'youtube-once-20261030.yml',
  opens: '2026-10-30T00:05:00Z', closes: '2026-10-30T02:05:00Z',
  approvedAt: '2026-10-29T02:38:15Z',
  setId: 'home_apartment_common_areas_a2', count: 585,
  srIds: ['_ksC50YFLdQ', 'v5j866U2V6E'],
  manifest: 'config/youtube-thumbnail-repairs/deck13-zh-sr-20261026.json',
});
const OUT = 'outputs/youtube-once-20261030';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const api = p => JSON.parse(gh('api', `repos/${POLICY.repo}/${p}`));
const pages = p => JSON.parse(gh('api', '--paginate', '--slurp', `repos/${POLICY.repo}/${p}`));
const runs = workflow => pages(`actions/workflows/${workflow}/runs?per_page=100`).flatMap(p => p.workflow_runs);
const artifacts = id => {
  const ps = pages(`actions/runs/${id}/artifacts?per_page=100`);
  const rows = ps.flatMap(p => p.artifacts);
  assert.equal(rows.length, ps[0].total_count, 'Incomplete artifact pagination');
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length);
  return rows;
};
const save = value => fs.writeFileSync(path.join(OUT, 'receipt.json'), `${JSON.stringify(value, null, 2)}\n`);
const summary = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`);
};

export function assertStart({ now, eventName, ref, attempt, priorRuns, runId }) {
  assert.equal(eventName, 'schedule', 'Manual invocation is preview-only');
  assert.equal(ref, 'refs/heads/main');
  assert.equal(String(attempt), '1', 'Reruns cannot consume another attempt');
  assert(now >= Date.parse(POLICY.opens) && now < Date.parse(POLICY.closes), 'Outside the approved one-time window');
  assert(!priorRuns.some(r => String(r.id) !== String(runId) && r.event === 'schedule' &&
    Date.parse(r.created_at) >= Date.parse(POLICY.opens) && Date.parse(r.created_at) < Date.parse(POLICY.closes)),
  'Another scheduled coordinator already consumed this date');
}

export function batchInputs(firstPlan) {
  assert.equal(firstPlan.setId, POLICY.setId);
  assert.equal(firstPlan.assignments.length, 585);
  assert.equal(firstPlan.inputs.ordinaryPerChannel, 14);
  assert.equal(firstPlan.inputs.polyglotPerChannel, 1);
  const overrides = firstPlan.inputs.ordinaryPerChannelOverrides;
  assert.equal(Object.keys(overrides).length, 36);
  assert(Object.values(overrides).every(n => n === 9));
  assert.equal(overrides.SR, 9, 'Preserve the actual prior grouping, not the thumbnail allowlist');
  return {
    set_id: POLICY.setId, targets: '', max_pages: '100', persist_snapshot: 'false',
    audit_routes: 'ALL', audit_supports: '', campaign_supports: 'ALL',
    campaign_ordinary_per_channel: '14', campaign_polyglot_per_channel: '1',
    campaign_ordinary_count_overrides: Object.entries(overrides).sort().map(([k, v]) => `${k}:${v}`).join(','),
    campaign_allow_partial_ordinary_tail: 'false', campaign_allow_partial_polyglot_tail: 'false',
    campaign_allow_partial_route_quota_tail: 'false', campaign_schedule_start_date: '2026-10-30',
    claim_campaign: 'true', claim_target_branch: 'main', claim_confirm: 'CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN',
    fast_apply: 'true', expected_assignment_count: '585',
    fast_confirm_apply: 'APPLY_YOUTUBE_PUBLICATION_CAMPAIGN', fast_confirm_metadata: 'USE_OPENAI_METADATA',
    recovery_source_campaign_id: '', recovery_source_manifest_hash: '', recovery_assignment_keys: '', reuse_control_run_id: '',
  };
}

export function assertChild(run, expectedId, workflow) {
  assert.equal(String(run.id), String(expectedId));
  assert.equal(run.path, `.github/workflows/${workflow}`);
  assert.equal(run.head_branch, 'main');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.repository.full_name, POLICY.repo);
  assert.equal(run.status, 'completed');
}

export function assertBatchFinal(campaign) {
  const accepted = campaign.assignments.filter(a => a.youtubeVideoId);
  assert.equal(campaign.assignments.length, POLICY.count);
  assert.equal(new Set(accepted.map(a => a.youtubeVideoId)).size, accepted.length);
  assert.equal(accepted.length, POLICY.count);
  const summary = campaign.finalizeSummary;
  assert.equal(summary.expectedCount, POLICY.count);
  assert.equal(summary.observedCount, POLICY.count);
  assert.equal(summary.missingCount, 0);
  for (const key of ['duplicateAssignmentCount', 'duplicateVideoIdCount', 'unexpectedPublicationCount', 'receiptErrorCount']) {
    assert.equal(summary[key], 0, `Finalizer ${key}`);
  }
}

function registries() {
  return ['config/youtube-published-videos.json', 'config/youtube-polyglot-published-videos.json']
    .flatMap(p => read(p).publications);
}
function baseline() {
  return registries().filter(r => ['home_structure_exterior_a1_a2', POLICY.setId].includes(r.setId) && r.youtubeVideoId)
    .map(r => ({ id: r.youtubeVideoId, setId: r.setId, supportLang: r.supportLang, targetLang: r.targetLang || '', bundleKey: r.bundleKey || '' }));
}
function preserveAccepted(before) {
  const current = baseline();
  for (const row of before) assert(current.some(r => JSON.stringify(r) === JSON.stringify(row)), `Prior accepted identity changed: ${row.id}`);
}
function download(id, name, dest) {
  const matches = artifacts(id).filter(a => a.name === name && !a.expired);
  assert.equal(matches.length, 1, `Missing or ambiguous artifact ${name}`);
  gh('run', 'download', String(id), '--repo', POLICY.repo, '--name', name, '--dir', dest);
}
function receipts(selfRuns) {
  const result = [];
  for (const r of selfRuns.filter(r => r.status === 'completed' && Date.parse(r.created_at) >= Date.parse(POLICY.opens))) {
    const name = `youtube-20261030-receipt-${r.id}`;
    if (!artifacts(r.id).some(a => a.name === name && !a.expired)) continue;
    const dest = `${OUT}/coordinators/${r.id}`;
    download(r.id, name, dest);
    const p = `${dest}/receipt.json`;
    if (fs.existsSync(p)) result.push(read(p));
  }
  return result;
}
function dispatch(workflow, inputs, receipt) {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), receipt.head,
    'Main changed after coordinator checkout; stop instead of dispatching stale code');
  receipt.workflow = workflow;
  receipt.inputs = inputs;
  receipt.requestedAt = new Date().toISOString();
  receipt.status = 'attempt_started_no_retry';
  save(receipt); // Any ambiguous POST consumes the attempt; do not retry.
  execFileSync('gh', ['api', '--method', 'POST', `repos/${POLICY.repo}/actions/workflows/${workflow}/dispatches`, '--input', '-'], {
    input: JSON.stringify({ ref: 'main', inputs }), stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8',
  });
  receipt.status = 'request_accepted';
  save(receipt);
  // One bounded inventory, never watch, sleep or a polling retry.
  const found = runs(workflow).filter(r => r.event === 'workflow_dispatch' && r.head_branch === 'main' &&
    r.head_sha === receipt.head && Date.parse(r.created_at) >= Date.parse(receipt.requestedAt) - 1000);
  assert.equal(found.length, 1, 'Dispatch accepted but child ID is ambiguous: reconcile, never repeat');
  receipt.childRunId = found[0].id;
  receipt.childUrl = found[0].html_url;
  save(receipt);
  summary(`One ${receipt.stage} attempt: [${receipt.childRunId}](${receipt.childUrl}). Dispatch is not completion proof.`);
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const env = process.env;
  assert.equal(env.GITHUB_REPOSITORY, POLICY.repo);
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    batchInputs(read('config/youtube-publication-campaign-plans/yt-home_apartment_common_areas_a2-2026-10-28-62247f3a208f.json'));
    return summary('Preview only: fixed 2026-10-30 07:05 Bangkok; next585 standard fresh plan + exact two SR thumbnails. No dispatch or writes.');
  }
  if (env.GITHUB_EVENT_NAME === 'schedule') {
    // Date/attempt/ref gate precedes even the first API inventory.
    assertStart({ now: Date.now(), eventName: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF,
      attempt: env.GITHUB_RUN_ATTEMPT, priorRuns: [], runId: env.GITHUB_RUN_ID });
    const selfRuns = runs(POLICY.workflow);
    assertStart({ now: Date.now(), eventName: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF,
      attempt: env.GITHUB_RUN_ATTEMPT, priorRuns: selfRuns, runId: env.GITHUB_RUN_ID });
    assert(!runs('youtube-publication-campaign.yml').some(r => Date.parse(r.created_at) >= Date.parse(POLICY.approvedAt)),
      'A later publication attempt requires reconciliation before this new wave');
    assert(!runs('youtube-publication-fast-lane.yml').some(r => !['completed'].includes(r.status)), 'Another fast lane is active');
    const receipt = { stage: 'batch', anchorRunId: Number(env.GITHUB_RUN_ID), head: api('commits/main').sha, baseline: baseline() };
    return dispatch('youtube-publication-fast-lane.yml', batchInputs(read(
      'config/youtube-publication-campaign-plans/yt-home_apartment_common_areas_a2-2026-10-28-62247f3a208f.json')), receipt);
  }
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_run');
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1', 'No coordinator reruns');
  const source = read(env.GITHUB_EVENT_PATH).workflow_run;
  if (!source.created_at.startsWith('2026-10-30') || Date.parse(source.created_at) < Date.parse(POLICY.opens)) return summary('Unrelated date; no action.');
  const selfRuns = runs(POLICY.workflow);
  const known = receipts(selfRuns);
  const anchors = known.filter(r => r.stage === 'batch' && r.childRunId);
  if (!anchors.length) return summary('No bound scheduled receipt; no action.');
  assert.equal(anchors.length, 1, 'Ambiguous scheduled lineage');
  const anchor = anchors[0];
  preserveAccepted(anchor.baseline);
  if (source.id === anchor.childRunId) {
    assertChild(source, anchor.childRunId, 'youtube-publication-fast-lane.yml');
    assert.equal(source.head_sha, anchor.head);
    assert(!known.some(r => r.stage === 'sr'), 'SR attempt already consumed');
    assert.notEqual(source.conclusion, 'cancelled', 'Cancellation stops scheduled follow-up');
    summary(`Fresh batch coordinator completed: ${source.conclusion}. No automatic batch retry.`);
    const sr = POLICY.srIds.map(id => registries().find(r => r.youtubeVideoId === id));
    assert(sr.every(Boolean));
    if (sr.every(r => r.thumbnailSet === true)) return summary('Both SR thumbnails already installed; no write.');
    assert(sr.every(r => r.thumbnailSet === false), 'Mixed/unknown SR state: reconcile instead of replaying');
    assert(!runs('youtube-thumbnail-batch-set.yml').some(r => Date.parse(r.created_at) >= Date.parse(POLICY.opens)),
      'Another thumbnail attempt exists for this date; reconcile before writing');
    execFileSync(process.execPath, ['scripts/plan-youtube-thumbnail-batch-from-manifest.mjs',
      `--manifest=${POLICY.manifest}`, '--set-id=home_structure_exterior_a1_a2', '--support=SR',
      '--require-missing-state', '--require-exact-video-id', '--require-git-tracked', '--fail-on-blockers', `--output=${OUT}/sr-preflight.json`], { stdio: 'inherit' });
    const plan = read(`${OUT}/sr-preflight.json`);
    assert.deepEqual(plan.readyRows.map(r => r.youtubeVideoId).sort(), [...POLICY.srIds].sort());
    const receipt = { stage: 'sr', anchorRunId: anchor.anchorRunId, head: api('commits/main').sha };
    return dispatch('youtube-thumbnail-batch-set.yml', { mode: 'apply', manifest_path: POLICY.manifest,
      set_id: 'home_structure_exterior_a1_a2', support: 'SR', youtube_environment: 'youtube-api-youtube-3',
      force_reupload: 'false', exact_missing_only: 'true', confirm_youtube_write: 'APPLY_YOUTUBE_THUMBNAIL_BATCH' }, receipt);
  }
  const srReceipt = known.find(r => r.stage === 'sr' && r.childRunId === source.id);
  if (srReceipt) {
    assertChild(source, srReceipt.childRunId, 'youtube-thumbnail-batch-set.yml');
    download(source.id, `youtube-thumbnail-batch-apply-${source.id}`, `${OUT}/sr-final`);
    const lp = `${OUT}/sr-final/outputs/youtube-thumbnail-ledger.jsonl`;
    const ledger = fs.existsSync(lp) ? fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
    const results = POLICY.srIds.map(id => ({ id, durable: registries().find(r => r.youtubeVideoId === id)?.thumbnailSet === true,
      receipt: ledger.some(r => r.videoId === id && r.status === 'custom_thumbnail_set' && r.videoAfter?.id === id) }));
    save({ stage: 'sr-result', anchorRunId: anchor.anchorRunId, sourceRunId: source.id, conclusion: source.conclusion, results });
    summary(`SR thumbnail result: ${JSON.stringify(results)}. No retries; existing videos unchanged.`);
    assert.equal(source.conclusion, 'success');
    assert(results.every(r => r.durable && r.receipt), 'One or both thumbnails remain unconfirmed');
    return;
  }
  if (source.path === '.github/workflows/youtube-publication-campaign.yml') {
    assertChild(source, source.id, 'youtube-publication-campaign.yml');
    const dest = `${OUT}/fast-proof`;
    download(anchor.childRunId, `youtube-fast-lane-dispatch-${anchor.childRunId}`, dest);
    const proof = read(`${dest}/youtube-fast-lane-dispatch.json`);
    if (source.head_sha !== proof.head) return summary('Unrelated publication parent; no action.');
    assert.equal(proof.status, 'dispatch_request_accepted_not_upload_proof');
    download(source.id, `youtube-publication-campaign-final-${source.id}`, `${OUT}/batch-final`);
    const artifact = readYoutubeDurableJson(`${OUT}/batch-final/config/youtube-publication-campaigns.json`)
      .campaigns.find(c => c.campaignId === proof.campaignId);
    const durable = readYoutubeDurableJson('config/youtube-publication-campaigns.json')
      .campaigns.find(c => c.campaignId === proof.campaignId);
    assert(artifact && durable);
    assert.equal(artifact.manifestHash, proof.manifestHash);
    assert.deepEqual(durable.assignments, artifact.assignments);
    assert.deepEqual(durable.finalizeSummary, artifact.finalizeSummary);
    const accepted = durable.assignments.filter(a => a.youtubeVideoId);
    assert.equal(new Set(accepted.map(a => a.youtubeVideoId)).size, accepted.length);
    save({ stage: 'batch-result', anchorRunId: anchor.anchorRunId, sourceRunId: source.id,
      campaignId: proof.campaignId, conclusion: source.conclusion, summary: durable.finalizeSummary });
    summary(`Batch ${proof.campaignId}: ${JSON.stringify(durable.finalizeSummary)}. Accepted/scheduled, not proof all videos are public. No retry.`);
    assertBatchFinal(durable);
    return;
  }
  summary('Unrelated child; no action.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { summary(`STOP: ${error.message}. No automatic retry.`); process.exitCode = 1; }
}
