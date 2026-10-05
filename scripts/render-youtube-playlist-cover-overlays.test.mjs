import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseArgs, horizontalOverlaySvg, overlaySvg, renderPlaylistCover, fitHorizontalText } from './render-youtube-playlist-cover-overlays.mjs';

assert.equal(parseArgs([]).layout, 'square');
assert.equal(parseArgs(['--layout=horizontal']).layout, 'horizontal');
assert.throws(() => parseArgs(['--layout=wrong']), /layout/);
const row = { title: 'Japanese A1: Everyday Flashcards', supportLang: 'EN', videoType: 'ordinary' };
assert.match(overlaySvg(row), /width="1024" height="1024"/);
assert.match(horizontalOverlaySvg(row), /width="1280" height="720"/);
assert.match(horizontalOverlaySvg(row), /Japanese A1/);
const longTitle = horizontalOverlaySvg({ ...row, title: 'Japanese A1 Vocabulary Lessons' });
assert(!longTitle.includes('>Japanese A1 Vocabulary Lessons</tspan>'), 'Long English title must wrap within the text area');
assert.match(longTitle, /<tspan x="64" dy="[^\"]+">[^<]*Lessons<\/tspan>/);
assert.match(longTitle, /font-size="64"/);
assert.match(longTitle, />Vocabulary<\/tspan>/);
assert.match(longTitle, /<text x="122" y="535"/);
assert.throws(() => fitHorizontalText('W'.repeat(200), 490, [53, 43, 36, 20], 3), /cannot fit/);
const all = JSON.parse(fs.readFileSync('data/youtube-playlist-covers/shared-horizontal-approved-20261005/manifest.json')).records;
for (const record of all) horizontalOverlaySvg(record);
const poly = horizontalOverlaySvg({ ...row, title: 'Polyglot: Chinese, Japanese, Korean', videoType: 'polyglot' });
assert.match(poly, /Polyglot/);
assert.match(poly, /font-size="80"/);
assert.match(poly, /font-size="46"/);
assert(!poly.includes('4 languages'), 'Do not invent four languages for a three-language bundle');
assert.match(horizontalOverlaySvg({ ...row, title: 'A & B: <safe>' }), /A &amp; B/);
const root = fs.mkdtempSync('outputs/review/playlist-layout-test-');
for (const layout of ['square', 'horizontal']) {
  const file = path.join(root, `${layout}.jpg`);
  await renderPlaylistCover(row, { layout, base: 'assets/youtube-cover-templates/playlist-universal-approved-base.jpg' }, file);
  const m = await sharp(file).metadata();
  assert.equal(m.width, layout === 'square' ? 1024 : 1280);
  assert.equal(m.height, layout === 'square' ? 1024 : 720);
  assert(fs.statSync(file).size < 2_000_000);
}
console.log('Playlist horizontal/square layout regression tests passed.');
