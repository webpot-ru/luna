#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { POLICY, buildInputs, authorize, selectChild, receiptText } from './youtube-once-20261031.mjs';
const { authorizeFastLane } = await import(pathToFileURL(path.resolve('scripts/youtube-fast-lane.mjs')));
const original = JSON.parse(fs.readFileSync('config/youtube-publication-campaign-plans/yt-home_apartment_common_areas_a2-2026-10-28-62247f3a208f.json'));
const before = JSON.stringify(original);
const inputs = buildInputs(original);
assert.equal(JSON.stringify(original), before);
assert.equal(inputs.expected_assignment_count, '636');
assert.equal(inputs.campaign_ordinary_per_channel, '15');
assert.equal(inputs.campaign_polyglot_per_channel, '1');
assert.equal(inputs.campaign_ordinary_count_overrides.split(',').length, 36);
assert(inputs.campaign_ordinary_count_overrides.split(',').includes('SR:10'));
assert.equal(15 * 16 + 36 * 11, POLICY.count);
assert.equal(inputs.recovery_source_campaign_id, '');
assert.equal(inputs.reuse_control_run_id, '');
assert.equal(inputs.campaign_allow_partial_route_quota_tail, 'false');
assert.doesNotThrow(() => authorizeFastLane({ inputs }, 'refs/heads/main'));
const start = { now: Date.parse(POLICY.opens), eventName: 'schedule', event: { schedule: '0 3 31 10 *' },
  ref: 'refs/heads/main', attempt: '1', runId: 100, priorRuns: [] };
assert.equal(new Date(start.now).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false }), '31/10/2026, 10:00:00');
assert.doesNotThrow(() => authorize(start));
assert.doesNotThrow(() => authorize({ ...start, now: Date.parse('2026-10-31T07:15:00Z') }));
for (const patch of [{ now: start.now - 1 }, { now: Date.parse(POLICY.closes) },
  { now: Date.parse('2027-10-31T03:00:00Z') }, { attempt: '2' }, { ref: 'refs/heads/test' },
  { event: { schedule: '0 3 30 10 *' } },
  { eventName: 'workflow_dispatch', event: { inputs: { action: 'start', confirm: '' } } },
  { priorRuns: [{ id: 99, created_at: POLICY.opens, status: 'completed', conclusion: 'failure' }] },
  { priorRuns: [{ id: 99, created_at: POLICY.opens, status: 'completed', conclusion: 'cancelled' }] },
  { priorRuns: [{ id: 99, created_at: POLICY.opens, status: 'in_progress' }] }]) {
  assert.throws(() => authorize({ ...start, ...patch }));
}
assert.doesNotThrow(() => authorize({ ...start, eventName: 'workflow_dispatch',
  event: { inputs: { action: 'start', confirm: POLICY.confirmation } } }));
assert.doesNotThrow(() => authorize({ ...start, priorRuns: [{ id: 100, created_at: POLICY.opens }] }));
const receipt = { head: 'approved', requestedAt: POLICY.opens };
assert.deepEqual(JSON.parse(receiptText(receipt)), receipt);
assert.equal(receiptText(receipt).charCodeAt(receiptText(receipt).length - 1), 10);
const child = { id: 123, event: 'workflow_dispatch', head_branch: 'main', head_sha: 'approved', created_at: POLICY.opens };
assert.equal(selectChild([child], receipt).id, 123);
assert.throws(() => selectChild([], receipt));
assert.throws(() => selectChild([child, { ...child, id: 124 }], receipt));
assert.throws(() => selectChild([{ ...child, head_sha: 'other' }], receipt));
const workflow = fs.readFileSync(process.env.SCHEDULE_WORKFLOW_PATH || '.github/workflows/youtube-once-20261031.yml', 'utf8');
assert.match(workflow, /cron: '0 3 31 10 \*'/);
assert.match(workflow, /default: preview/);
assert.match(workflow, /cancel-in-progress: false/);
assert(!workflow.includes('workflow_run:'), 'No dependence on the missing continuation from October30');
const scriptPath = new URL('./youtube-once-20261031.mjs', import.meta.url);
const output = execFileSync(process.execPath, [scriptPath.pathname], {
  env: { ...process.env, GITHUB_REPOSITORY: POLICY.repo, GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_EVENT_PATH: '', GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8',
});
assert.match(output, /Preview only/);
assert.match(output, /636/);
console.log('PASS636 group math/SR10/unchanged source, fast-lane authorization, Bangkok date, multi-hour delay, no early/next-year/rerun/duplicate, child proof, valid JSON receipt and no-write preview.');
