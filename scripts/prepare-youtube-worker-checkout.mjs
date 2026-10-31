#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function workerCheckoutPatterns({ registry, setId, support }) {
  assert(/^[a-z0-9_]+$/.test(setId || ''), 'One canonical set is required');
  support = String(support || '').trim().replace(/_/g, '-').toUpperCase();
  assert(/^[A-Z]{2}(?:-[A-Z0-9]+)?$/.test(support), 'One canonical support is required');
  const selected = (registry.manifests || []).filter(m =>
    m.status === (registry.policy?.activeStatus || 'approved') && m.setId === setId &&
    (!m.supports?.length || m.supports.includes(support)));
  const patterns = new Set([`/data/decks/${setId}.json`]);
  for (const m of selected) {
    const file = String(m.path || '');
    assert(file && !path.posix.isAbsolute(file) && !file.includes('\\') &&
      file.split('/').every(s => s && s !== '.' && s !== '..') &&
      !/[\s*?\[\]{}!]/u.test(file), 'Unsafe cover manifest path');
    assert(file.startsWith('data/youtube-cover-assets/') || file.startsWith('outputs/design-prototypes/'),
      'Cover manifest must use an approved asset root');
    assert(file.endsWith('/manifest.json'), 'Cover registry path must name manifest.json');
    patterns.add(`/${path.posix.dirname(file)}/`);
  }
  return [...patterns].sort();
}

export function requireWorkerDisk(availableBytes, minimumBytes = 8 * 1024 ** 3) {
  assert(Number.isFinite(availableBytes) && availableBytes >= minimumBytes,
    `Insufficient worker disk before providers/upload: ${(availableBytes / 1024 ** 3).toFixed(2)}GiB free; ${(minimumBytes / 1024 ** 3).toFixed(0)}GiB required`);
}

function main() {
  const registry = JSON.parse(fs.readFileSync('config/youtube-cover-assets.json', 'utf8'));
  const patterns = workerCheckoutPatterns({ registry, setId: process.env.SET_ID, support: process.env.SUPPORT });
  // Adding only positive patterns expands the fresh sparse checkout. No cleanup,
  // registry mutation, provider or YouTube request is performed here.
  execFileSync('git', ['sparse-checkout', 'add', '--stdin'], {
    input: patterns.join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'],
  });
  const disk = fs.statfsSync('.');
  const available = Number(disk.bavail) * Number(disk.bsize);
  requireWorkerDisk(available);
  console.log(JSON.stringify({ setId: process.env.SET_ID, support: process.env.SUPPORT,
    includedPatterns: patterns, freeGiB: Number((available / 1024 ** 3).toFixed(2)),
    minimumFreeGiB: 8, providerCalls: 0, youtubeWrites: 0 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
