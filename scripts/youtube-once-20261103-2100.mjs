#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const POLICY = Object.freeze({
  repo: 'webpot-ru/luna', workflow: 'youtube-once-20261103-2100.yml',
  opens: '2026-11-03T14:00:00Z', closes: '2026-11-03T17:00:00Z',
  approvedAt: '2026-11-03T12:47:27Z', count: 191,
  setId: 'home_apartment_common_areas_a2',
  confirmation: 'START_APPROVED_20261103-2100_191',
  crons: ['0 14 3 11 *', '17,37,57 14-16 3 11 *'],
});
const OUT = 'outputs/youtube-once-20261103-2100';
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

export const SOURCE = Object.freeze({campaignId: "yt-home_apartment_common_areas_a2-2026-11-03-445b9d5789c9", manifestHash: "5db84f510a650ee43f5441707dfc5c75bf6e2d58894122c8155619ea903871de"});
export const RECOVERY_KEYS = Object.freeze(["ordinary|home_apartment_common_areas_a2|AZ|TE", "ordinary|home_apartment_common_areas_a2|AZ|TH", "ordinary|home_apartment_common_areas_a2|AZ|TL", "ordinary|home_apartment_common_areas_a2|AZ|TR", "ordinary|home_apartment_common_areas_a2|AZ|UZ", "ordinary|home_apartment_common_areas_a2|AZ|VI", "ordinary|home_apartment_common_areas_a2|AZ|ZH", "ordinary|home_apartment_common_areas_a2|BG|TE", "ordinary|home_apartment_common_areas_a2|BG|TH", "ordinary|home_apartment_common_areas_a2|BG|TL", "ordinary|home_apartment_common_areas_a2|BG|TR", "ordinary|home_apartment_common_areas_a2|BG|UZ", "ordinary|home_apartment_common_areas_a2|BG|VI", "ordinary|home_apartment_common_areas_a2|BG|ZH", "ordinary|home_apartment_common_areas_a2|CS|TE", "ordinary|home_apartment_common_areas_a2|CS|TH", "ordinary|home_apartment_common_areas_a2|CS|TL", "ordinary|home_apartment_common_areas_a2|CS|TR", "ordinary|home_apartment_common_areas_a2|CS|UZ", "ordinary|home_apartment_common_areas_a2|CS|VI", "ordinary|home_apartment_common_areas_a2|CS|ZH", "ordinary|home_apartment_common_areas_a2|ET|TE", "ordinary|home_apartment_common_areas_a2|ET|TH", "ordinary|home_apartment_common_areas_a2|ET|TL", "ordinary|home_apartment_common_areas_a2|ET|TR", "ordinary|home_apartment_common_areas_a2|ET|UZ", "ordinary|home_apartment_common_areas_a2|ET|VI", "ordinary|home_apartment_common_areas_a2|ET|ZH", "ordinary|home_apartment_common_areas_a2|FR|TE", "ordinary|home_apartment_common_areas_a2|FR|TH", "ordinary|home_apartment_common_areas_a2|FR|TL", "ordinary|home_apartment_common_areas_a2|FR|TR", "ordinary|home_apartment_common_areas_a2|FR|UZ", "ordinary|home_apartment_common_areas_a2|FR|VI", "ordinary|home_apartment_common_areas_a2|FR|ZH", "ordinary|home_apartment_common_areas_a2|ID|TE", "ordinary|home_apartment_common_areas_a2|ID|TH", "ordinary|home_apartment_common_areas_a2|ID|TL", "ordinary|home_apartment_common_areas_a2|ID|TR", "ordinary|home_apartment_common_areas_a2|ID|UZ", "ordinary|home_apartment_common_areas_a2|ID|VI", "ordinary|home_apartment_common_areas_a2|ID|ZH", "ordinary|home_apartment_common_areas_a2|IS|TE", "ordinary|home_apartment_common_areas_a2|IS|TH", "ordinary|home_apartment_common_areas_a2|IS|TL", "ordinary|home_apartment_common_areas_a2|IS|TR", "ordinary|home_apartment_common_areas_a2|IS|UZ", "ordinary|home_apartment_common_areas_a2|IS|VI", "ordinary|home_apartment_common_areas_a2|IS|ZH", "ordinary|home_apartment_common_areas_a2|KK|TE", "ordinary|home_apartment_common_areas_a2|KK|TH", "ordinary|home_apartment_common_areas_a2|KK|TL", "ordinary|home_apartment_common_areas_a2|KK|TR", "ordinary|home_apartment_common_areas_a2|KK|UZ", "ordinary|home_apartment_common_areas_a2|KK|VI", "ordinary|home_apartment_common_areas_a2|KK|ZH", "ordinary|home_apartment_common_areas_a2|KM|TE", "ordinary|home_apartment_common_areas_a2|KM|TH", "ordinary|home_apartment_common_areas_a2|KM|TL", "ordinary|home_apartment_common_areas_a2|KM|TR", "ordinary|home_apartment_common_areas_a2|KM|UZ", "ordinary|home_apartment_common_areas_a2|KM|VI", "ordinary|home_apartment_common_areas_a2|KM|ZH", "ordinary|home_apartment_common_areas_a2|KN|TE", "ordinary|home_apartment_common_areas_a2|KN|TH", "ordinary|home_apartment_common_areas_a2|KN|TL", "ordinary|home_apartment_common_areas_a2|KN|TR", "ordinary|home_apartment_common_areas_a2|KN|UZ", "ordinary|home_apartment_common_areas_a2|KN|VI", "ordinary|home_apartment_common_areas_a2|KN|ZH", "ordinary|home_apartment_common_areas_a2|KO|TE", "ordinary|home_apartment_common_areas_a2|KO|TH", "ordinary|home_apartment_common_areas_a2|KO|TL", "ordinary|home_apartment_common_areas_a2|KO|TR", "ordinary|home_apartment_common_areas_a2|KO|UZ", "ordinary|home_apartment_common_areas_a2|KO|VI", "ordinary|home_apartment_common_areas_a2|KO|ZH", "ordinary|home_apartment_common_areas_a2|LO|TE", "ordinary|home_apartment_common_areas_a2|LO|TH", "ordinary|home_apartment_common_areas_a2|LO|TL", "ordinary|home_apartment_common_areas_a2|LO|TR", "ordinary|home_apartment_common_areas_a2|LO|UZ", "ordinary|home_apartment_common_areas_a2|LO|VI", "ordinary|home_apartment_common_areas_a2|LO|ZH", "ordinary|home_apartment_common_areas_a2|LT|TE", "ordinary|home_apartment_common_areas_a2|LT|TH", "ordinary|home_apartment_common_areas_a2|LT|TL", "ordinary|home_apartment_common_areas_a2|LT|TR", "ordinary|home_apartment_common_areas_a2|LT|UZ", "ordinary|home_apartment_common_areas_a2|LT|VI", "ordinary|home_apartment_common_areas_a2|LT|ZH", "ordinary|home_apartment_common_areas_a2|LV|TE", "ordinary|home_apartment_common_areas_a2|LV|TH", "ordinary|home_apartment_common_areas_a2|LV|TL", "ordinary|home_apartment_common_areas_a2|LV|TR", "ordinary|home_apartment_common_areas_a2|LV|UZ", "ordinary|home_apartment_common_areas_a2|LV|VI", "ordinary|home_apartment_common_areas_a2|LV|ZH", "ordinary|home_apartment_common_areas_a2|ML|TE", "ordinary|home_apartment_common_areas_a2|ML|TH", "ordinary|home_apartment_common_areas_a2|ML|TL", "ordinary|home_apartment_common_areas_a2|ML|TR", "ordinary|home_apartment_common_areas_a2|ML|UZ", "ordinary|home_apartment_common_areas_a2|ML|VI", "ordinary|home_apartment_common_areas_a2|ML|ZH", "ordinary|home_apartment_common_areas_a2|MS|TE", "ordinary|home_apartment_common_areas_a2|MS|TH", "ordinary|home_apartment_common_areas_a2|MS|TL", "ordinary|home_apartment_common_areas_a2|MS|TR", "ordinary|home_apartment_common_areas_a2|MS|UZ", "ordinary|home_apartment_common_areas_a2|MS|VI", "ordinary|home_apartment_common_areas_a2|MS|ZH", "ordinary|home_apartment_common_areas_a2|NL|TE", "ordinary|home_apartment_common_areas_a2|NL|TH", "ordinary|home_apartment_common_areas_a2|NL|TL", "ordinary|home_apartment_common_areas_a2|NL|TR", "ordinary|home_apartment_common_areas_a2|NL|UZ", "ordinary|home_apartment_common_areas_a2|NL|VI", "ordinary|home_apartment_common_areas_a2|NL|ZH", "ordinary|home_apartment_common_areas_a2|NO|TE", "ordinary|home_apartment_common_areas_a2|NO|TH", "ordinary|home_apartment_common_areas_a2|NO|TL", "ordinary|home_apartment_common_areas_a2|NO|TR", "ordinary|home_apartment_common_areas_a2|NO|UZ", "ordinary|home_apartment_common_areas_a2|NO|VI", "ordinary|home_apartment_common_areas_a2|NO|ZH", "ordinary|home_apartment_common_areas_a2|PL|TE", "ordinary|home_apartment_common_areas_a2|PL|TH", "ordinary|home_apartment_common_areas_a2|PL|TL", "ordinary|home_apartment_common_areas_a2|PL|TR", "ordinary|home_apartment_common_areas_a2|PL|UZ", "ordinary|home_apartment_common_areas_a2|PL|VI", "ordinary|home_apartment_common_areas_a2|PL|ZH", "ordinary|home_apartment_common_areas_a2|RO|TE", "ordinary|home_apartment_common_areas_a2|RO|TH", "ordinary|home_apartment_common_areas_a2|RO|TL", "ordinary|home_apartment_common_areas_a2|RO|TR", "ordinary|home_apartment_common_areas_a2|RO|UZ", "ordinary|home_apartment_common_areas_a2|RO|VI", "ordinary|home_apartment_common_areas_a2|RO|ZH", "ordinary|home_apartment_common_areas_a2|SK|TE", "ordinary|home_apartment_common_areas_a2|SK|TH", "ordinary|home_apartment_common_areas_a2|SK|TL", "ordinary|home_apartment_common_areas_a2|SK|TR", "ordinary|home_apartment_common_areas_a2|SK|UZ", "ordinary|home_apartment_common_areas_a2|SK|VI", "ordinary|home_apartment_common_areas_a2|SK|ZH", "ordinary|home_apartment_common_areas_a2|SL|TE", "ordinary|home_apartment_common_areas_a2|SL|TH", "ordinary|home_apartment_common_areas_a2|SL|TL", "ordinary|home_apartment_common_areas_a2|SL|TR", "ordinary|home_apartment_common_areas_a2|SL|UZ", "ordinary|home_apartment_common_areas_a2|SL|VI", "ordinary|home_apartment_common_areas_a2|SL|ZH", "ordinary|home_apartment_common_areas_a2|SR|SW", "ordinary|home_apartment_common_areas_a2|SR|TA", "ordinary|home_apartment_common_areas_a2|SR|TE", "ordinary|home_apartment_common_areas_a2|SR|TH", "ordinary|home_apartment_common_areas_a2|SR|TL", "ordinary|home_apartment_common_areas_a2|SR|TR", "ordinary|home_apartment_common_areas_a2|SR|UZ", "ordinary|home_apartment_common_areas_a2|SR|VI", "ordinary|home_apartment_common_areas_a2|SR|ZH", "ordinary|home_apartment_common_areas_a2|SV|TE", "ordinary|home_apartment_common_areas_a2|SV|TH", "ordinary|home_apartment_common_areas_a2|SV|TL", "ordinary|home_apartment_common_areas_a2|SV|TR", "ordinary|home_apartment_common_areas_a2|SV|UZ", "ordinary|home_apartment_common_areas_a2|SV|VI", "ordinary|home_apartment_common_areas_a2|SV|ZH", "ordinary|home_apartment_common_areas_a2|TA|TE", "ordinary|home_apartment_common_areas_a2|TA|TH", "ordinary|home_apartment_common_areas_a2|TA|TL", "ordinary|home_apartment_common_areas_a2|TA|TR", "ordinary|home_apartment_common_areas_a2|TA|UZ", "ordinary|home_apartment_common_areas_a2|TA|VI", "ordinary|home_apartment_common_areas_a2|TA|ZH", "ordinary|home_apartment_common_areas_a2|TE|TA", "ordinary|home_apartment_common_areas_a2|TE|TH", "ordinary|home_apartment_common_areas_a2|TE|TL", "ordinary|home_apartment_common_areas_a2|TE|TR", "ordinary|home_apartment_common_areas_a2|TE|UZ", "ordinary|home_apartment_common_areas_a2|TE|VI", "ordinary|home_apartment_common_areas_a2|TE|ZH", "ordinary|home_apartment_common_areas_a2|TL|TA", "ordinary|home_apartment_common_areas_a2|TL|TE", "ordinary|home_apartment_common_areas_a2|TL|TH", "ordinary|home_apartment_common_areas_a2|TL|TR", "ordinary|home_apartment_common_areas_a2|TL|UZ", "ordinary|home_apartment_common_areas_a2|TL|VI", "ordinary|home_apartment_common_areas_a2|TL|ZH"]);
export const SUPPORTS = Object.freeze(["AZ", "BG", "CS", "ET", "FR", "ID", "IS", "KK", "KM", "KN", "KO", "LO", "LT", "LV", "ML", "MS", "NL", "NO", "PL", "RO", "SK", "SL", "SR", "SV", "TA", "TE", "TL"]);
export function buildInputs(sourcePlan) {
  assert.equal(sourcePlan.setId, POLICY.setId);
  assert.equal(sourcePlan.campaignId, SOURCE.campaignId);
  assert.equal(sourcePlan.manifestHash, SOURCE.manifestHash);
  assert.equal(sourcePlan.assignments.length,290);
  assert.equal(RECOVERY_KEYS.length,191);
  assert.equal(new Set(RECOVERY_KEYS).size,191);
  assert(RECOVERY_KEYS.every(k => sourcePlan.assignments.some(a => a.assignmentKey===k && a.videoType==='ordinary')));
  assert.equal(SUPPORTS.length,27);
  assert(SUPPORTS.includes('SR'));
  return {
    set_id: POLICY.setId, targets: '', max_pages: '100', persist_snapshot: 'false',
    audit_routes: 'ALL', audit_supports: '', campaign_supports: SUPPORTS.join(','),
    campaign_ordinary_per_channel: '1', campaign_polyglot_per_channel: '0',
    campaign_ordinary_count_overrides: '',
    campaign_allow_partial_ordinary_tail: 'false', campaign_allow_partial_polyglot_tail: 'false',
    campaign_allow_partial_route_quota_tail: 'false', campaign_schedule_start_date: '2026-11-03',
    claim_campaign: 'true', claim_target_branch: 'main', claim_confirm: 'CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN',
    fast_apply: 'true', expected_assignment_count: String(POLICY.count),
    fast_confirm_apply: 'APPLY_YOUTUBE_PUBLICATION_CAMPAIGN', fast_confirm_metadata: 'USE_OPENAI_METADATA',
    recovery_source_campaign_id: SOURCE.campaignId, recovery_source_manifest_hash: SOURCE.manifestHash,
    recovery_assignment_keys: JSON.stringify(RECOVERY_KEYS), reuse_control_run_id: '',
  };
}

export function authorize({ now, eventName, event, ref, attempt }) {
  assert.equal(ref, 'refs/heads/main');
  assert.equal(String(attempt), '1', 'A rerun is not new production authority');
  assert(now >= Date.parse(POLICY.opens) && now < Date.parse(POLICY.closes), 'Outside the approved November3 Bangkok date/window');
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
  const inputs = buildInputs(read(`config/youtube-publication-campaign-plans/${SOURCE.campaignId}.json`));
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch' && (event.inputs?.action || 'preview') === 'preview') {
    return summary('Preview only: November3 21:00Bangkok /14:00UTC; EXACT191 source-only missing ordinary keys; 26channels7 and SR9; 99sourceaccepted excluded; no Polyglots. No new wave. No API inventory, dispatch, claim, provider or YouTube write.');
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
  summary(`One approved191 fast lane: [${child.id}](${child.html_url}). Fresh control must pass before claim/upload; existing accepted IDs remain excluded.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { summary(`STOP: ${error.message}. No automatic retry.`); process.exitCode = 1; }
}
