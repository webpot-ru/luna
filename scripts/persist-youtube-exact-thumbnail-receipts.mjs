import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EXACT_MANIFEST, verifyExactReplacement } from "./verify-youtube-exact-thumbnail-replacement.mjs";

const active = row => !/failed|deleted|superseded|cancel/iu.test(row.publicationStatus || row.status || "");
export function reconcileExactThumbnailReceipts({ registries, manifest, receipts, runId }) {
  assert.match(String(runId), /^[1-9][0-9]*$/);
  const next = structuredClone(registries);
  const approved = new Map(manifest.covers.map(c => [c.youtubeVideoId, c]));
  const successful = receipts.filter(r => r.status === "custom_thumbnail_set");
  assert.equal(new Set(successful.map(r => r.videoId)).size, successful.length, "Duplicate successful receipt");
  for (const r of successful) {
    const c = approved.get(r.videoId);
    assert(c, "Unapproved video ID in receipt");
    assert.equal(r.action, "youtube_set_video_thumbnail");
    assert.equal(r.supportLang, c.supportLang);
    assert.equal(r.setId, c.setId);
    assert.equal(r.authorizedChannel.id, c.expectedYoutubeChannelId);
    for (const video of [r.videoBefore, r.videoAfter]) {
      assert.equal(video.id, r.videoId);
      assert.equal(video.channelId, c.expectedYoutubeChannelId);
    }
    assert(r.thumbnailPath.endsWith("/" + c.relativePath), "Receipt image path mismatch");
    assert.equal(r.thumbnailSizeBytes, c.sizeBytes);
    assert(r.thumbnailResultSummary.itemCount > 0, "No accepted API thumbnail response");
    assert(Number.isFinite(Date.parse(r.timestamp)), "Invalid receipt timestamp");
    const matches = next.flatMap(reg => reg.publications || []).filter(p => p.youtubeVideoId === r.videoId && active(p));
    assert.equal(matches.length, 1, "Receipt needs one existing active publication");
    const row = matches[0];
    for (const key of ["setId", "supportLang", "targetLang"]) assert.equal(row[key] || "", c[key] || "", "Publication identity changed: " + key);
    const previousTime = Date.parse(row.thumbnailUploadedAt || "") || 0;
    assert(previousTime <= Date.parse(r.timestamp), "A newer thumbnail operation exists");
    row.thumbnailSet = true;
    row.thumbnailUploadMode = "custom";
    row.thumbnailSource = "custom";
    row.thumbnailUploadedAt = r.timestamp;
    row.lastThumbnailReadbackAt = r.timestamp;
    row.thumbnailUploadEvidence = {
      source: "youtube.thumbnails.set", workflowRunId: String(runId),
      approvedImagePath: c.relativePath, approvedImageSha256: c.sha256,
      responseItemCount: r.thumbnailResultSummary.itemCount,
    };
    delete row.thumbnailFallbackReason;
    delete row.thumbnailSetError;
    delete row.needsThumbnailPermission;
    row.readback = { ...(row.readback || {}), thumbnailStatus: "custom_set" };
  }
  return { registries: next, accepted: successful.length, videoIds: successful.map(r => r.videoId) };
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).filter(x => x.includes("=")).map(x => x.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
  const manifest = JSON.parse(fs.readFileSync(EXACT_MANIFEST));
  verifyExactReplacement(manifest, ["AZ", "KK"]);
  const ledger = path.join(args["artifact-dir"], "outputs/youtube-thumbnail-ledger.jsonl");
  const receipts = fs.existsSync(ledger) ? fs.readFileSync(ledger, "utf8").split(/\r?\n/u).filter(Boolean).map(JSON.parse) : [];
  const files = ["config/youtube-published-videos.json", "config/youtube-polyglot-published-videos.json"];
  const current = files.map(f => JSON.parse(fs.readFileSync(f)));
  const result = reconcileExactThumbnailReceipts({ registries: current, manifest, receipts, runId: args["run-id"] });
  const changes = files.flatMap((file, i) => {
    const text = JSON.stringify(result.registries[i], null, 2) + "\n";
    assert(Buffer.byteLength(text) <= 95 * 1024 * 1024, "Durable registry exceeds95MiB");
    assert(!fs.lstatSync(file).isSymbolicLink(), "Do not overwrite linked source evidence");
    return text === fs.readFileSync(file, "utf8") ? [] : [{ file, text }];
  });
  if (process.argv.includes("--apply")) for (const { file, text } of changes) fs.writeFileSync(file, text);
  console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "dry_run", acceptedReceipts: result.accepted, changedFiles: changes.length, youtubeWrites: 0 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
