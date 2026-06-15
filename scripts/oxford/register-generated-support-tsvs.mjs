#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_RELEASE_ID = 'oxford_3000_core_b1_part_003_100_v1';
const DEFAULT_CONTRACT_PATH = 'config/oxford_3000_core_b1_part_003_100_v1_contract_v0.json';
const ARTICLE_DISPLAY_LANGUAGES = new Set([
  'ES',
  'FR',
  'DE',
  'IT',
  'PT',
  'NL',
  'SV',
  'NO',
  'DA',
  'RO',
  'ES-419',
  'PT-BR',
]);

function parseArgs(argv) {
  const args = { contract: DEFAULT_CONTRACT_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--contract') args.contract = argv[++i];
    else if (arg === '--languages') args.languages = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.languages) {
    throw new Error('Usage: register-generated-support-tsvs.mjs [--contract config/..._contract_v0.json] --languages ES,FR,...');
  }
  return args;
}

function batchIdFor(code) {
  const slug = code.toLowerCase().replace(/-/g, '_');
  return ARTICLE_DISPLAY_LANGUAGES.has(code) ? `${slug}_article_display_v1` : `${slug}_v1`;
}

const args = parseArgs(process.argv.slice(2));
const contract = JSON.parse(readFileSync(args.contract, 'utf8'));
const releaseId = contract.latest_source_snapshot?.release_id ?? contract.release_id ?? DEFAULT_RELEASE_ID;
const languages = args.languages
  .split(',')
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

const results = [];
for (const language of languages) {
  const batchId = batchIdFor(language);
  const tsvPath = path.join(
    'config',
    `${releaseId}_support_translation_batch_${batchId}.tsv`,
  );
  const commandArgs = [
    'scripts/oxford/build-oxford-support-translation-batch-from-tsv.mjs',
    '--contract',
    args.contract,
    '--translations',
    tsvPath,
    '--language',
    language,
    '--batch-id',
    batchId,
  ];
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.stdout.trim()) process.stdout.write(`${result.stdout.trim()}\n`);
  if (result.stderr.trim()) process.stderr.write(`${result.stderr.trim()}\n`);
  if (result.status !== 0) {
    throw new Error(`Builder failed for ${language} (${batchId}) with exit ${result.status}`);
  }
  results.push({ language, batchId, tsvPath });
}

process.stdout.write(
  `${JSON.stringify(
    {
      release_id: releaseId,
      script_version: '2026-05-31.v1',
      contract: args.contract,
      registered: results,
    },
    null,
    2,
  )}\n`,
);
