import assert from 'node:assert/strict';
import fs from 'node:fs';
import { workerCheckoutPatterns, requireWorkerDisk } from './prepare-youtube-worker-checkout.mjs';
const row = { status: 'approved', setId: 'deck14', supports: ['VI'], path: 'data/youtube-cover-assets/deck14/manifest.json' };
const registry = { manifests: [row, { ...row, setId: 'deck13', path: 'data/youtube-cover-assets/deck13/manifest.json' }, { ...row, status: 'draft', path: 'data/youtube-cover-assets/unapproved/manifest.json' }] };
assert.deepEqual(workerCheckoutPatterns({ registry, setId: 'deck14', support: 'VI' }), ['/data/decks/deck14.json', '/data/youtube-cover-assets/deck14/']);
assert.deepEqual(workerCheckoutPatterns({ registry, setId: 'deck14', support: 'vi' }), ['/data/decks/deck14.json', '/data/youtube-cover-assets/deck14/']);
assert.deepEqual(workerCheckoutPatterns({ registry, setId: 'deck14', support: 'ML' }), ['/data/decks/deck14.json']);
for (const bad of ['../deck', 'ALL', 'deck*']) assert.throws(() => workerCheckoutPatterns({ registry, setId: bad, support: 'VI' }));
for (const bad of ['ALL', 'VI,TH', '../VI']) assert.throws(() => workerCheckoutPatterns({ registry, setId: 'deck14', support: bad }));
for (const bad of ['/tmp/manifest.json', 'data/youtube-cover-assets/../secrets/manifest.json', 'data/youtube-cover-assets/*/manifest.json', 'config/manifest.json']) assert.throws(() => workerCheckoutPatterns({ registry: { manifests: [{ ...row, path: bad }] }, setId: 'deck14', support: 'VI' }));
assert.doesNotThrow(() => requireWorkerDisk(8 * 1024 ** 3));
assert.throws(() => requireWorkerDisk(8 * 1024 ** 3 - 1));
assert.throws(() => requireWorkerDisk(NaN));
const dir = new URL('../.github/workflows/', import.meta.url);
for (const name of ['youtube-video-publish.yml','youtube-polyglot-video-publish.yml']) {
 const s = fs.readFileSync(new URL(name, dir), 'utf8');
 assert(s.indexOf('prepare-youtube-worker-checkout.mjs') < s.indexOf('uses: actions/setup-node@v4'));
 assert(s.includes('!/data/youtube-cover-assets/'));
 assert(s.includes('--no-install-recommends ffmpeg'));
 assert(s.includes('allow_republish'));
}
console.log('PASS exact deck/support assets; unrelated/draft excluded; unsafe paths rejected; disk gate before provider stages; worker workflow wiring');

// Exercise real non-cone Git patterns from an empty working tree: no tracked
// files are removed by this fixture, and the directory is retained for review.
const { execFileSync } = await import('node:child_process');
const path = await import('node:path');
const fixture = fs.mkdtempSync(path.resolve('scratch/worker-sparse-fixture-'));
const git = (args, input) => execFileSync('git', args, { cwd: fixture, input, encoding: 'utf8' }).trim();
git(['init', '--initial-branch=main']);
const records = { 'package.json': '{}', 'data/decks/deck14.json': '{}', 'data/decks/deck13.json': '{}', 'data/youtube-cover-assets/deck14/manifest.json': '{}', 'data/youtube-cover-assets/deck14/video.jpg': 'approved-image', 'data/youtube-cover-assets/deck13/manifest.json': '{}', 'data/youtube-cover-assets/deck13/video.jpg': 'unrelated-image', 'data/youtube-playlist-covers/other.jpg': 'unrelated-playlist' };
for (const [file, bytes] of Object.entries(records)) {
 const blob = git(['hash-object', '-w', '--stdin'], bytes);
 git(['update-index','--add','--cacheinfo','100644',blob,file]);
}
const tree = git(['write-tree']);
const commit = git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit-tree',tree,'-m','Sparse fixture']);
git(['update-ref','refs/heads/main',commit]);
git(['sparse-checkout','set','--no-cone','--stdin'], '/*\n!/data/decks/\n!/data/youtube-cover-assets/\n!/data/youtube-playlist-covers/\n');
git(['sparse-checkout','add','--stdin'], workerCheckoutPatterns({registry,setId:'deck14',support:'VI'}).join('\n')+'\n');
for (const f of ['data/decks/deck14.json','data/youtube-cover-assets/deck14/manifest.json','data/youtube-cover-assets/deck14/video.jpg']) assert(fs.existsSync(path.join(fixture,f)), f+' must be hydrated');
for (const f of ['data/decks/deck13.json','data/youtube-cover-assets/deck13/video.jpg','data/youtube-playlist-covers/other.jpg']) assert(!fs.existsSync(path.join(fixture,f)), f+' must stay absent');
assert.equal(git(['ls-files','--error-unmatch','data/youtube-cover-assets/deck14/video.jpg']), 'data/youtube-cover-assets/deck14/video.jpg');
assert.equal(fs.readFileSync(path.join(fixture,'data/youtube-cover-assets/deck14/video.jpg'),'utf8'), 'approved-image');
console.log('PASS real Git sparse hydration, approved bytes unchanged/tracked, other decks absent');
