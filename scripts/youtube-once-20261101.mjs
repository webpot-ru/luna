#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const POLICY = Object.freeze({
  repo: 'webpot-ru/luna', workflow: 'youtube-once-20261101.yml',
  opens: '2026-11-01T10:00:00Z', closes: '2026-11-01T17:00:00Z',
  approvedAt: '2026-10-31T13:14:55Z', count: 522,
  setId: 'home_apartment_common_areas_a2',
  confirmation: 'START_APPROVED_20261101_522',
  crons: ['0 10 1 11 *', '17,37,57 10-16 1 11 *'],
});
const OUT = 'outputs/youtube-once-20261101';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 ** 2 });
const api = route => JSON.parse(gh('api', `repos/${POLICY.repo}/${route}`));
const runs = workflow => {
  const pages = JSON.parse(gh('api', '--paginate', '--slurp', `repos/${POLICY.repo}/actions/workflows/${workflow}/runs?per_page=100`));
  const rows = pages.flatMap(p => p.workflow_runs);
  assert.equal(rows.length, pages[0].total_count, 'Incomplete run pagination');
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, 'Duplicate run inventory');
  return rows;
};
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
  const nine = new Set([...Object.keys(prior), 'EN', 'ES-419', 'PT-BR']);
  assert.equal(nine.size, 39);
  assert([...nine].every(s => supports.includes(s)));
  assert.equal(supports.filter(s => !nine.has(s)).length, 12);
  assert.equal(12 * 11 + 39 * 10, POLICY.count);
  return {
    set_id: POLICY.setId, targets: '', max_pages: '100', persist_snapshot: 'false',
    audit_routes: 'ALL', audit_supports: '', campaign_supports: 'ALL',
    campaign_ordinary_per_channel: '10', campaign_polyglot_per_channel: '1',
    campaign_ordinary_count_overrides: [...nine].sort().map(s => `${s}:9`).join(','),
    campaign_allow_partial_ordinary_tail: 'false', campaign_allow_partial_polyglot_tail: 'false',
    campaign_allow_partial_route_quota_tail: 'false', campaign_schedule_start_date: '2026-11-01',
    claim_campaign: 'true', claim_target_branch: 'main', claim_confirm: 'CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN',
    fast_apply: 'true', expected_assignment_count: String(POLICY.count),
    fast_confirm_apply: 'APPLY_YOUTUBE_PUBLICATION_CAMPAIGN', fast_confirm_metadata: 'USE_OPENAI_METADATA',
    recovery_source_campaign_id: '', recovery_source_manifest_hash: '', recovery_assignment_keys: '', reuse_control_run_id: '',
  };
}

export function authorize({ now, eventName, event, ref, attempt }) {
  assert.equal(ref, 'refs/heads/main');
  assert.equal(String(attempt), '1', 'A rerun is not new production authority');
  assert(now >= Date.parse(POLICY.opens) && now < Date.parse(POLICY.closes), 'Outside the approved November1 Bangkok date/window');
  if (eventName === 'schedule') assert(POLICY.crons.includes(event.schedule), 'Unapproved cron');
  else {
    assert.equal(eventName, 'workflow_dispatch');
    assert.equal(event.inputs?.action, 'start');
    assert.equal(event.inputs?.confirm, POLICY.confirmation);
  }
}

export function earlierAttempts(rows, runId) {
  const current = rows.filter(r => String(r.id) === String(runId));
  assert.equal(current.length, 1, 'Current coordinator is missing from complete inventory');
  // Later pending fallback runs must not block the oldest coordinator.
  assert(rows.every(r => Number.isFinite(Date.parse(r.created_at))), 'Unknown run creation time');
  const currentTime = Date.parse(current[0].created_at);
  assert(currentTime >= Date.parse(POLICY.opens), 'A pre-opening coordinator cannot start production later');
  return rows.filter(r => {
    const time = Date.parse(r.created_at);
    return time >= Date.parse(POLICY.opens) && (time < currentTime ||
      (time === currentTime && BigInt(r.id) < BigInt(runId)));
  });
}

export function selectChild(rows, receipt) {
  const found = rows.filter(r => r.event === 'workflow_dispatch' && r.head_branch === 'main' &&
    r.head_sha === receipt.head && Date.parse(r.created_at) >= Date.parse(receipt.requestedAt) - 1000);
  assert.equal(found.length, 1, 'Ambiguous dispatch/child ID: do not retry');
  return found[0];
}

function main() {
  const env = process.env;
  assert.equal(env.GITHUB_REPOSITORY, POLICY.repo);
  const event = env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH) ? read(env.GITHUB_EVENT_PATH) : {};
  const inputs = buildInputs(read('config/youtube-publication-campaign-plans/yt-home_apartment_common_areas_a2-2026-10-28-62247f3a208f.json'));
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch' && (event.inputs?.action || 'preview') === 'preview') {
    return summary('Preview only: November1 17:00Bangkok /10:00UTC; 522=471ordinary+51Polyglots; 12channels10+1,39channels9+1 includingSR. No API inventory, dispatch, claim, provider or YouTube write.');
  }
  const now = Date.now();
  if (now < Date.parse(POLICY.opens) || now >= Date.parse(POLICY.closes)) {
    save({ status: 'outside_approved_date_no_attempt', runId: env.GITHUB_RUN_ID });
    return summary('Outside the single approved date/window; no production attempt.');
  }
  authorize({ now, eventName: env.GITHUB_EVENT_NAME, event, ref: env.GITHUB_REF, attempt: env.GITHUB_RUN_ATTEMPT });
  const previous = earlierAttempts(runs(POLICY.workflow), env.GITHUB_RUN_ID);
  if (previous.length) {
    save({ status: 'no_op_earlier_attempt_exists', runId: env.GITHUB_RUN_ID, priorRunIds: previous.map(r => r.id) });
    return summary('An earlier coordinator already exists. This fallback does not retry it, even after failure, cancellation or a missing receipt.');
  }
  assert(!runs('youtube-publication-fast-lane.yml').some(r => r.status !== 'completed'), 'Another fast lane is active');
  assert(!runs('youtube-publication-campaign.yml').some(r => r.status !== 'completed' || Date.parse(r.created_at) >= Date.parse(POLICY.approvedAt)), 'An intervening publication requires reconciliation');
  const head = api('commits/main').sha;
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), head, 'Main changed since checkout');
  const receipt = { coordinatorRunId: Number(env.GITHUB_RUN_ID), expectedCount: POLICY.count,
    head, requestedAt: new Date().toISOString(), status: 'attempt_started_no_retry', inputs };
  save(receipt);
  execFileSync('gh', ['api', '--method', 'POST', `repos/${POLICY.repo}/actions/workflows/youtube-publication-fast-lane.yml/dispatches`, '--input', '-'], {
    input: JSON.stringify({ ref: 'main', inputs }), stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8',
  });
  receipt.status = 'dispatch_request_accepted_not_upload_proof'; save(receipt);
  const child = selectChild(runs('youtube-publication-fast-lane.yml'), receipt);
  receipt.childRunId = child.id; receipt.childUrl = child.html_url; save(receipt);
  summary(`One approved522 fast lane: [${child.id}](${child.html_url}). Fresh control must pass before claim/upload; existing accepted IDs remain excluded.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { summary(`STOP: ${error.message}. No automatic retry.`); process.exitCode = 1; }
}
