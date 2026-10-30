#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const POLICY = Object.freeze({
  repo: 'webpot-ru/luna', workflow: 'youtube-once-20261031.yml',
  opens: '2026-10-31T03:00:00Z', closes: '2026-10-31T17:00:00Z',
  approvedAt: '2026-10-30T06:01:25Z', count: 600, setId: 'home_apartment_common_areas_a2',
  confirmation: 'START_APPROVED_20261031_600',
});
const OUT = 'outputs/youtube-once-20261031';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const api = route => JSON.parse(gh('api', `repos/${POLICY.repo}/${route}`));
const runs = workflow => JSON.parse(gh('api', '--paginate', '--slurp',
  `repos/${POLICY.repo}/actions/workflows/${workflow}/runs?per_page=100`)).flatMap(p => p.workflow_runs);
const summary = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`);
};
export const receiptText = receipt => `${JSON.stringify(receipt, null, 2)}\n`;
const save = receipt => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/receipt.json`, receiptText(receipt));
};

export function buildInputs(firstPlan) {
  assert.equal(firstPlan.setId, POLICY.setId);
  assert.equal(firstPlan.assignments.length, 585);
  assert.equal(firstPlan.inputs.ordinaryPerChannel, 14);
  assert.equal(firstPlan.inputs.polyglotPerChannel, 1);
  const prior = firstPlan.inputs.ordinaryPerChannelOverrides;
  assert.equal(Object.keys(prior).length, 36);
  assert(Object.values(prior).every(v => v === 9));
  assert.equal(prior.SR, 9);
  const supports = firstPlan.inputs.supports.split(',');
  assert.equal(new Set(supports).size, 51);
  assert(Object.keys(prior).every(s => supports.includes(s)));
  assert.equal(supports.filter(s => !Object.hasOwn(prior, s)).length, 15);
  return {
    set_id: POLICY.setId, targets: '', max_pages: '100', persist_snapshot: 'false',
    audit_routes: 'ALL', audit_supports: '', campaign_supports: 'ALL',
    campaign_ordinary_per_channel: '15', campaign_polyglot_per_channel: '1',
    campaign_ordinary_count_overrides: Object.keys(prior).sort().map(s => `${s}:9`).join(','),
    campaign_allow_partial_ordinary_tail: 'false', campaign_allow_partial_polyglot_tail: 'false',
    campaign_allow_partial_route_quota_tail: 'false', campaign_schedule_start_date: '2026-10-31',
    claim_campaign: 'true', claim_target_branch: 'main', claim_confirm: 'CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN',
    fast_apply: 'true', expected_assignment_count: String(POLICY.count),
    fast_confirm_apply: 'APPLY_YOUTUBE_PUBLICATION_CAMPAIGN', fast_confirm_metadata: 'USE_OPENAI_METADATA',
    recovery_source_campaign_id: '', recovery_source_manifest_hash: '', recovery_assignment_keys: '', reuse_control_run_id: '',
  };
}

export function authorize({ now, eventName, event, ref, attempt, priorRuns = [], runId }) {
  assert.equal(ref, 'refs/heads/main');
  assert.equal(String(attempt), '1', 'Job reruns are not new production authority');
  assert(now >= Date.parse(POLICY.opens) && now < Date.parse(POLICY.closes), 'Outside October31 Bangkok approved start date');
  if (eventName === 'schedule') assert.equal(event.schedule, '0 3 31 10 *');
  else {
    assert.equal(eventName, 'workflow_dispatch');
    assert.equal(event.inputs?.action, 'start');
    assert.equal(event.inputs?.confirm, POLICY.confirmation);
  }
  assert(!priorRuns.some(r => String(r.id) !== String(runId) &&
    Date.parse(r.created_at) >= Date.parse(POLICY.opens)),
  'An earlier coordinator exists: reconcile its receipt before another start');
}

export function selectChild(rows, receipt) {
  const selected = rows.filter(r => r.event === 'workflow_dispatch' && r.head_branch === 'main' &&
    r.head_sha === receipt.head && Date.parse(r.created_at) >= Date.parse(receipt.requestedAt) - 1000);
  assert.equal(selected.length, 1, 'Dispatch response/child ID is ambiguous: do not retry');
  return selected[0];
}

function main() {
  const env = process.env;
  assert.equal(env.GITHUB_REPOSITORY, POLICY.repo);
  const event = env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH) ? read(env.GITHUB_EVENT_PATH) : {};
  const inputs = buildInputs(read('config/youtube-publication-campaign-plans/yt-home_apartment_common_areas_a2-2026-10-28-62247f3a208f.json'));
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch' && (event.inputs?.action || 'preview') === 'preview') {
    return summary('Preview only: October31 10:00Asia/Bangkok; 600 = 15channels(15+1) + 36channels(9+1), including SR9+1. No dispatch, claim, render, paid generation or YouTube write.');
  }
  const guard = { now: Date.now(), eventName: env.GITHUB_EVENT_NAME, event, ref: env.GITHUB_REF,
    attempt: env.GITHUB_RUN_ATTEMPT, runId: env.GITHUB_RUN_ID };
  authorize(guard);
  authorize({ ...guard, now: Date.now(), priorRuns: runs(POLICY.workflow) });
  assert(!runs('youtube-publication-fast-lane.yml').some(r => r.status !== 'completed'), 'Another fast lane is active');
  assert(!runs('youtube-publication-campaign.yml').some(r =>
    r.status !== 'completed' || Date.parse(r.created_at) >= Date.parse(POLICY.approvedAt)),
  'A later/active publication requires reconciliation before this approved wave');
  const head = api('commits/main').sha;
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), head,
    'Main changed since checkout; do not dispatch stale code');
  const receipt = { coordinatorRunId: Number(env.GITHUB_RUN_ID), setId: POLICY.setId,
    expectedCount: POLICY.count, head, requestedAt: new Date().toISOString(),
    status: 'attempt_started_no_retry', inputs };
  save(receipt);
  execFileSync('gh', ['api', '--method', 'POST',
    `repos/${POLICY.repo}/actions/workflows/youtube-publication-fast-lane.yml/dispatches`, '--input', '-'], {
    input: JSON.stringify({ ref: 'main', inputs }), stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8',
  });
  receipt.status = 'dispatch_request_accepted_not_upload_proof';
  save(receipt);
  const child = selectChild(runs('youtube-publication-fast-lane.yml'), receipt);
  receipt.childRunId = child.id;
  receipt.childUrl = child.html_url;
  save(receipt);
  summary(`Started one approved600 fast lane: [${child.id}](${child.html_url}). Fresh control must pass before claim/upload. Existing videos excluded; this is not acceptance proof.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) {
    summary(`STOP: ${error.message}. No automatic retry or accepted-video replay.`);
    process.exitCode = 1;
  }
}
