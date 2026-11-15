import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const EXACT_MANIFEST = "config/youtube-thumbnail-repairs/az-kk-all16-existing-20261115.json";
const counts = { AZ: 816, KK: 824 };
const digest = value => crypto.createHash("sha256").update(value).digest("hex");

export function verifyExactReplacement(manifest, supports, readFile = fs.readFileSync) {
  assert.equal(manifest.policy?.explicitOwnerApprovedReplacement, true, "Explicit replacement approval missing");
  assert.equal(manifest.scope?.action, "thumbnails.set_existing_video_ids_only");
  assert.equal(manifest.scope?.videoUploads, 0);
  assert.equal(manifest.covers?.length, 1640);
  assert(supports.length > 0 && supports.every(s => Object.hasOwn(counts, s)), "Only AZ/KK may be selected");
  const ids = manifest.covers.map(c => c.youtubeVideoId);
  assert.equal(new Set(ids).size, 1640, "Duplicate video ID");
  assert(ids.every(id => /^[A-Za-z0-9_-]{11}$/.test(id)), "Invalid exact video ID");
  assert.equal(digest([...ids].sort().join("\n")), manifest.scope.exactVideoIdsSha256, "Exact ID set changed");
  for (const support of Object.keys(counts)) {
    assert.equal(manifest.covers.filter(c => c.supportLang === support).length, counts[support]);
  }
  const hashes = new Map();
  for (const c of manifest.covers) {
    assert(Object.hasOwn(counts, c.supportLang), "Unexpected support");
    assert.equal(c.expectedYoutubeChannelId, c.supportLang === "AZ" ? "UC9nlXd20M3EoVj5eaNhCXcA" : "UCbTIdOTFdk0bVaytyx5v13Q");
    assert(c.relativePath.startsWith("data/youtube-cover-assets/az-kk-all16-confirmed-20261115/"));
    const absolute = path.resolve(c.relativePath);
    assert(absolute.startsWith(path.resolve("data/youtube-cover-assets/az-kk-all16-confirmed-20261115") + path.sep), "Unsafe asset path");
    if (!hashes.has(absolute)) hashes.set(absolute, digest(readFile(absolute)));
    assert.equal(hashes.get(absolute), c.sha256, "Approved JPG checksum changed");
  }
  return { selected: manifest.covers.filter(c => supports.includes(c.supportLang)).length, total: 1640, videoUploads: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
  assert.equal(args.manifest, EXACT_MANIFEST, "Only the approved exact manifest may be applied");
  console.log(JSON.stringify(verifyExactReplacement(JSON.parse(fs.readFileSync(args.manifest)), String(args.support || "").split(",").filter(Boolean))));
}
