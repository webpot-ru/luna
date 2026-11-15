import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyExactReplacement } from "./verify-youtube-exact-thumbnail-replacement.mjs";
const bytes = Buffer.from("test image bytes");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const covers = Array.from({ length: 1640 }, (_, i) => ({
  youtubeVideoId: String(i).padStart(11, "0"), supportLang: i < 816 ? "AZ" : "KK",
  expectedYoutubeChannelId: i < 816 ? "UC9nlXd20M3EoVj5eaNhCXcA" : "UCbTIdOTFdk0bVaytyx5v13Q",
  relativePath: "data/youtube-cover-assets/az-kk-all16-confirmed-20261115/test.jpg", sha256,
}));
const manifest = { policy: { explicitOwnerApprovedReplacement: true }, scope: {
  action: "thumbnails.set_existing_video_ids_only", videoUploads: 0,
  exactVideoIdsSha256: crypto.createHash("sha256").update(covers.map(c => c.youtubeVideoId).sort().join("\n")).digest("hex"),
}, covers };
assert.equal(verifyExactReplacement(manifest, ["AZ"], () => bytes).selected, 816);
assert.equal(verifyExactReplacement(manifest, ["KK"], () => bytes).selected, 824);
assert.throws(() => verifyExactReplacement(manifest, ["HY"], () => bytes), /Only AZ\/KK/);
assert.throws(() => verifyExactReplacement({ ...manifest, policy: {} }, ["AZ"], () => bytes), /approval missing/);
const duplicate = structuredClone(manifest); duplicate.covers[1].youtubeVideoId = duplicate.covers[0].youtubeVideoId;
assert.throws(() => verifyExactReplacement(duplicate, ["AZ"], () => bytes), /Duplicate/);
const owner = structuredClone(manifest); owner.covers[0].expectedYoutubeChannelId = "wrong";
assert.throws(() => verifyExactReplacement(owner, ["AZ"], () => bytes));
const ids = structuredClone(manifest); ids.covers[0].youtubeVideoId = "XXXXXXXXXXX";
assert.throws(() => verifyExactReplacement(ids, ["AZ"], () => bytes), /ID set changed/);
assert.throws(() => verifyExactReplacement(manifest, ["AZ"], () => Buffer.from("changed image")), /checksum changed/);
const escaped = structuredClone(manifest); escaped.covers[0].relativePath = "data/youtube-cover-assets/az-kk-all16-confirmed-20261115/../../other.jpg";
assert.throws(() => verifyExactReplacement(escaped, ["AZ"], () => bytes), /Unsafe asset path/);
console.log("Exact thumbnail replacement guards:9 checks passed; no API calls");
