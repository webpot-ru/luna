#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { POLICY, assertStart, batchInputs, assertChild, assertBatchFinal } from './youtube-once-20261030.mjs';
import { authorizeFastLane } from './youtube-fast-lane.mjs';

const start = { now: Date.parse(POLICY.opens), eventName: 'schedule', ref: 'refs/heads/main', attempt: '1', priorRuns: [], runId: 100 };
assert.doesNotThrow(() => assertStart(start));
for (const change of [
  { now: start.now - 1 }, { now: Date.parse(POLICY.closes) },
  { now: Date.parse('2027-10-30T00:05:00Z') }, { attempt: '2' },
  { eventName: 'workflow_dispatch' }, { ref: 'refs/heads/test' },
  { priorRuns: [{ id: 99, event: 'schedule', created_at: POLICY.opens, conclusion: 'failure' }] },
  { priorRuns: [{ id: 99, event: 'schedule', created_at: POLICY.opens, conclusion: 'cancelled' }] },
]) assert.throws(() => assertStart({ ...start, ...change }));
assert.doesNotThrow(() => assertStart({ ...start, priorRuns: [{ id: 100, event: 'schedule', created_at: POLICY.opens }] }));

const first = JSON.parse(fs.readFileSync('config/youtube-publication-campaign-plans/yt-home_apartment_common_areas_a2-2026-10-28-62247f3a208f.json'));
const inputs = batchInputs(first);
assert.doesNotThrow(() => authorizeFastLane({ inputs }, 'refs/heads/main'));
assert.equal(inputs.expected_assignment_count, '585');
assert.equal(inputs.reuse_control_run_id, '');
assert.equal(inputs.recovery_source_campaign_id, '');
assert.equal(inputs.campaign_ordinary_count_overrides.split(',').length, 36);
assert(inputs.campaign_ordinary_count_overrides.split(',').includes('SR:9'));
assert.equal(15 * 14 + 36 * 9 + 51, POLICY.count);
const drift = structuredClone(first); drift.inputs.ordinaryPerChannelOverrides.SR = 14;
assert.throws(() => batchInputs(drift));

const child = { id: 123, path: '.github/workflows/youtube-publication-fast-lane.yml', head_branch: 'main',
  event: 'workflow_dispatch', repository: { full_name: POLICY.repo }, status: 'completed' };
assert.doesNotThrow(() => assertChild(child, 123, 'youtube-publication-fast-lane.yml'));
for (const change of [{ id: 124 }, { head_branch: 'fork' }, { event: 'pull_request' },
  { status: 'in_progress' }, { repository: { full_name: 'other/luna' } }, { path: '.github/workflows/other.yml' }]) {
  assert.throws(() => assertChild({ ...child, ...change }, 123, 'youtube-publication-fast-lane.yml'));
}

const final = { assignments: Array.from({ length: 585 }, (_, n) => ({ youtubeVideoId: `id${n}` })),
  finalizeSummary: { expectedCount: 585, observedCount: 585, missingCount: 0, duplicateAssignmentCount: 0,
    duplicateVideoIdCount: 0, unexpectedPublicationCount: 0, receiptErrorCount: 0 } };
assert.doesNotThrow(() => assertBatchFinal(final));
for (const field of ['missingCount', 'duplicateAssignmentCount', 'duplicateVideoIdCount', 'unexpectedPublicationCount', 'receiptErrorCount']) {
  const f = structuredClone(final); f.finalizeSummary[field] = 1; assert.throws(() => assertBatchFinal(f));
}
const duplicate = structuredClone(final); duplicate.assignments[1].youtubeVideoId = 'id0';
assert.throws(() => assertBatchFinal(duplicate));

// Manual invocation is a network-free preview even with production credentials available.
const output = execFileSync(process.execPath, ['scripts/youtube-once-20261030.mjs'], {
  env: { ...process.env, GITHUB_REPOSITORY: POLICY.repo, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_STEP_SUMMARY: '' }, encoding: 'utf8',
});
assert.match(output, /Preview only/);
const workflow = fs.readFileSync('.github/workflows/youtube-once-20261030.yml', 'utf8');
assert.match(workflow, /cron: '5 0 30 10 \*'/);
assert.match(workflow, /types: \[completed\]/);
assert.match(workflow, /cancel-in-progress: false/);
assert(!workflow.includes('secrets: inherit'));
console.log('PASS one-time date/rerun gates, child provenance, exact prior585 grouping, unchanged fast-lane authorization, finalizer counts and preview.');
