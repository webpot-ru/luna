#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const hookMode = args.has('--hook');
const pretoolMode = args.has('--pretool');
const strictMode = args.has('--strict');

function runGit(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return '';
  }
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function parseStatus(output) {
  const parts = output.split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < parts.length; index += 1) {
    const entry = parts[index];
    if (entry.length < 4) continue;
    const status = entry.slice(0, 2);
    const filePath = normalizePath(entry.slice(3));
    if (filePath) paths.push(filePath);
    if (status.includes('R') || status.includes('C')) {
      index += 1;
      if (parts[index]) paths.push(normalizePath(parts[index]));
    }
  }
  return [...new Set(paths)];
}

function pathMatchesAny(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

function checkPretool() {
  const input = readStdin();
  const strings = [];
  if (input.trim()) {
    try {
      collectStrings(JSON.parse(input), strings);
    } catch {
      strings.push(input);
    }
  }

  const commandText = strings.join('\n');
  if (!commandText.trim()) return { errors: [], warnings: [] };

  const errors = [];
  const dangerousCommands = [
    /\brm\s+(-[^\n]*\s+)?[^|\n;&]+/,
    /\bgit\s+reset\s+--hard\b/,
    /\bgit\s+clean\b/,
    /\bgit\s+checkout\s+--\b/,
    /\bgit\s+restore\s+--source\b/,
    /\bfind\b[^\n]*\s-delete\b/,
    /\brsync\b[^\n]*\s--delete\b/,
    /\btruncate\b/,
  ];
  const secretReaders = [
    /\b(cat|sed|awk|grep|egrep|fgrep|rg|less|more|head|tail)\b[^\n]*(\.env|\.local|\.secrets|client_secret)/,
  ];

  if (dangerousCommands.some((pattern) => pattern.test(commandText))) {
    errors.push('Blocked destructive shell command by project Codex hook. Use the documented safe workflow instead.');
  }
  if (secretReaders.some((pattern) => pattern.test(commandText))) {
    errors.push('Blocked command that appears to read or print local secrets. Do not expose .env/.local/.secrets/client_secret contents.');
  }

  return { errors, warnings: [] };
}

function checkWorkflow() {
  const statusOutput = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const changedPaths = parseStatus(statusOutput);
  const errors = [];
  const warnings = [];
  const recommendedChecks = new Set();

  const secretPathPatterns = [
    /^\.env($|\.)/,
    /^\.env.*\.local$/,
    /^\.local(\/|$)/,
    /^\.secrets(\/|$)/,
    /^client_secret.*\.json$/i,
    /(^|\/)(google-oauth-client|google-oauth-token).*\.json$/i,
    /(^|\/)(oauth|token|credential|credentials|secret)[^/]*\.json$/i,
  ];

  const visibleSecretPaths = changedPaths.filter((filePath) => pathMatchesAny(filePath, secretPathPatterns));
  if (visibleSecretPaths.length > 0) {
    errors.push(`Git-visible local secret paths detected: ${visibleSecretPaths.join(', ')}`);
  }

  const worktreeIncludePath = '.worktreeinclude';
  if (changedPaths.includes(worktreeIncludePath)) {
    try {
      const worktreeInclude = readFileSync(worktreeIncludePath, 'utf8');
      const forbiddenEntries = worktreeInclude
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .filter((line) => /(^|\/)(\.env|\.local|\.secrets|client_secret|token|oauth|credential|secret)/i.test(line));
      if (forbiddenEntries.length > 0) {
        errors.push(`.worktreeinclude must not copy secret-bearing paths: ${forbiddenEntries.join(', ')}`);
      }
    } catch {
      warnings.push('.worktreeinclude is changed but could not be read for safety validation.');
    }
  }

  const docsPaths = new Set([
    'AGENTS.md',
    'docs/README.md',
    'docs/PROJECT_STATE.md',
    'docs/project-workflow.md',
    'docs/codex-operations.md',
    'docs/video-lessons-strategy.md',
    'docs/video-lessons-registry.md',
    'docs/multi-device-management.md',
    'docs/decision-log.md',
  ]);
  const docsChanged = changedPaths.some((filePath) => docsPaths.has(filePath));

  const youtubeWorkflowPatterns = [
    /^config\/youtube-/,
    /^scripts\/youtube-/,
    /^scripts\/plan-youtube-channel-tokens\.mjs$/,
    /^scripts\/generate-youtube-metadata\.mjs$/,
    /^scripts\/check-youtube-metadata\.mjs$/,
    /^\.github\/workflows\/build-.*\.ya?ml$/,
  ];
  const videoWorkflowPatterns = [
    /^config\/video-/,
    /^scripts\/generate-video-localization\.mjs$/,
    /^scripts\/check-video-localization\.mjs$/,
    /^scripts\/build-.*video.*\.mjs$/,
    /^scripts\/lib\/video-/,
    /^scripts\/lib\/card-slide-template\.mjs$/,
  ];
  const channelAssetPatterns = [
    /^scripts\/.*channel.*banner.*\.(mjs|py)$/,
    /^scripts\/refit-.*channel.*\.(mjs|py)$/,
    /^scripts\/compose-vectorengine-channel-banner\.py$/,
  ];
  const codexOpsPatterns = [
    /^\.codex\//,
    /^scripts\/check-codex-workflow-safety\.mjs$/,
    /^scripts\/check-codex-readonly\.mjs$/,
    /^docs\/codex-operations\.md$/,
  ];

  const youtubeChanged = changedPaths.some((filePath) => pathMatchesAny(filePath, youtubeWorkflowPatterns));
  const videoChanged = changedPaths.some((filePath) => pathMatchesAny(filePath, videoWorkflowPatterns));
  const channelAssetChanged = changedPaths.some((filePath) => pathMatchesAny(filePath, channelAssetPatterns));
  const codexOpsChanged = changedPaths.some((filePath) => pathMatchesAny(filePath, codexOpsPatterns));

  if ((youtubeChanged || videoChanged || channelAssetChanged || codexOpsChanged) && !docsChanged) {
    warnings.push('Workflow-sensitive files changed without a matching docs/source-of-truth update.');
  }

  if (videoChanged) {
    recommendedChecks.add('npm run check:video-localization');
    recommendedChecks.add('npm run check:video-public-url');
  }
  if (youtubeChanged) {
    recommendedChecks.add('npm run plan:youtube-channel-branding');
    recommendedChecks.add('npm run plan:youtube-channel-tokens');
  }
  if (channelAssetChanged) {
    recommendedChecks.add('Run local banner/contact-sheet QA for changed channel-art generator output.');
  }
  if (codexOpsChanged) {
    recommendedChecks.add('npm run check:codex-readonly -- --skip-slow');
  }

  return {
    changedPaths,
    errors,
    warnings,
    recommendedChecks: [...recommendedChecks],
  };
}

function printReport(report) {
  if (report.errors.length === 0 && report.warnings.length === 0 && report.recommendedChecks.length === 0) {
    if (!hookMode) {
      console.log('Codex workflow safety check passed.');
      console.log(`Git-visible changed paths checked: ${report.changedPaths.length}`);
    }
    return;
  }

  if (report.errors.length > 0) {
    console.error('Codex workflow safety errors:');
    for (const error of report.errors) console.error(`- ${error}`);
  }
  if (report.warnings.length > 0) {
    console.warn('Codex workflow safety warnings:');
    for (const warning of report.warnings) console.warn(`- ${warning}`);
  }
  if (report.recommendedChecks.length > 0 && !hookMode) {
    console.log('Recommended follow-up checks:');
    for (const check of report.recommendedChecks) console.log(`- ${check}`);
  }
}

if (pretoolMode) {
  const report = checkPretool();
  if (report.errors.length > 0) {
    for (const error of report.errors) console.error(error);
    process.exit(2);
  }
  process.exit(0);
}

const report = checkWorkflow();
printReport(report);

if (report.errors.length > 0 || (strictMode && report.warnings.length > 0)) {
  process.exit(1);
}

process.exit(0);
