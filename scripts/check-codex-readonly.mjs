#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const skipSlow = args.has('--skip-slow') || args.has('--required-only');

const checks = [
  {
    id: 'codex-workflow',
    label: 'Codex workflow safety',
    command: [process.execPath, 'scripts/check-codex-workflow-safety.mjs'],
    timeoutMs: 90_000,
    required: true,
  },
  {
    id: 'video-public-url',
    label: 'Video public URL mapping',
    command: [process.execPath, 'scripts/check-video-public-url.mjs'],
    timeoutMs: 60_000,
    required: true,
  },
  {
    id: 'youtube-channel-branding-plan',
    label: 'YouTube channel branding dry-run plan',
    command: [process.execPath, 'scripts/youtube-channel-branding.mjs', '--dry-run'],
    timeoutMs: 90_000,
    required: true,
  },
  {
    id: 'youtube-channel-token-plan',
    label: 'YouTube channel token checklist',
    command: [process.execPath, 'scripts/plan-youtube-channel-tokens.mjs'],
    timeoutMs: 90_000,
    required: true,
  },
  {
    id: 'video-localization',
    label: 'Video localization technical gate',
    command: [process.execPath, 'scripts/check-video-localization.mjs'],
    timeoutMs: 120_000,
    required: false,
    skip: skipSlow,
  },
];

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function outputTail(result, maxLines = 24) {
  const text = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  if (!text) return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

function runCheck(check) {
  if (check.skip) {
    return {
      ...check,
      skipped: true,
      status: 0,
      timedOut: false,
      durationMs: 0,
      stdout: '',
      stderr: '',
    };
  }

  const start = Date.now();
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: check.timeoutMs,
    windowsHide: true,
  });
  const durationMs = Date.now() - start;
  const timedOut = result.error?.code === 'ETIMEDOUT';

  return {
    ...check,
    skipped: false,
    status: timedOut ? null : result.status,
    timedOut,
    durationMs,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
    signal: result.signal,
  };
}

function statusLabel(result) {
  if (result.skipped) return 'SKIP';
  if (result.timedOut) return result.required || strictMode ? 'FAIL' : 'WARN';
  if (result.status === 0) return 'PASS';
  return result.required || strictMode ? 'FAIL' : 'WARN';
}

const results = checks.map(runCheck);

console.log('Codex read-only check summary:');
for (const result of results) {
  const optionalLabel = result.required ? 'required' : 'optional';
  const timeoutLabel = result.skipped ? 'skipped' : `timeout ${formatDuration(result.timeoutMs)}`;
  const durationLabel = result.skipped ? '' : `, ran ${formatDuration(result.durationMs)}`;
  console.log(`- ${statusLabel(result)} ${result.id} (${optionalLabel}, ${timeoutLabel}${durationLabel})`);
}

for (const result of results) {
  const failed = result.timedOut || result.status !== 0;
  if (result.skipped || !failed) continue;

  const label = statusLabel(result);
  const timeoutNote = result.timedOut ? `timed out after ${formatDuration(result.timeoutMs)}` : `exit ${result.status}`;
  console.log(`\n${label} detail for ${result.id}: ${timeoutNote}`);
  const tail = outputTail(result);
  if (tail) console.log(tail);
}

const blockingProblems = results.filter((result) => {
  if (result.skipped) return false;
  const failed = result.timedOut || result.status !== 0;
  if (!failed) return false;
  return result.required || strictMode;
});

if (blockingProblems.length > 0) {
  console.error(`\nCodex read-only checks failed: ${blockingProblems.map((item) => item.id).join(', ')}`);
  process.exit(1);
}

const warnings = results.filter((result) => {
  if (result.skipped || result.required) return false;
  return result.timedOut || result.status !== 0;
});

if (warnings.length > 0) {
  console.warn(`\nCodex read-only checks completed with non-blocking warnings: ${warnings.map((item) => item.id).join(', ')}`);
  console.warn('Run the warned checks directly before touching the matching workflow, or use --strict to make optional warnings blocking.');
} else {
  console.log('\nCodex read-only checks passed.');
}
