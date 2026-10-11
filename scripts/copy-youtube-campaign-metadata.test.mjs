import assert from "node:assert/strict";
import fs from "node:fs";
import { selectCampaignMetadataAssignments } from "./copy-youtube-campaign-metadata.mjs";

const rows = [
  { videoType: "polyglot", supportLang: "LV", bundleKey: "east_asia_core", contentScope: "short_unverified" },
  { videoType: "polyglot", supportLang: "LV", bundleKey: "global_europe_core", contentScope: "short_unverified" },
  { videoType: "polyglot", supportLang: "TR", bundleKey: "east_asia_core", contentScope: "full" },
  { videoType: "ordinary", supportLang: "LV", targetLang: "ES" },
];
const options = { videoType: "polyglot", support: "LV", contentScope: "short_unverified" };
for (const bundle of ["east_asia_core", "global_europe_core"]) {
  assert.deepEqual(selectCampaignMetadataAssignments(rows, { ...options, bundle }), rows.filter((row) => row.supportLang === "LV" && row.bundleKey === bundle));
}
assert.throws(() => selectCampaignMetadataAssignments(rows, { ...options, bundle: "missing" }), /got 0/);
assert.throws(() => selectCampaignMetadataAssignments([...rows, rows[0]], { ...options, bundle: "east_asia_core" }), /got 2/);
assert.throws(() => selectCampaignMetadataAssignments(rows, options), /both bundle and content scope/);
assert.throws(() => selectCampaignMetadataAssignments(rows, { ...options, videoType: "ordinary", bundle: "east_asia_core" }), /only supported for Polyglot/);
assert.equal(selectCampaignMetadataAssignments(rows, { videoType: "ordinary", support: "LV" }).length, 1);
assert.equal(selectCampaignMetadataAssignments(rows, { videoType: "polyglot", support: "LV" }).length, 2);
const workflow = fs.readFileSync(".github/workflows/youtube-polyglot-video-publish.yml", "utf8");
assert.match(workflow, /--video-type=polyglot[\s\S]*?--bundle="\$BUNDLE"[\s\S]*?--content-scope="\$CONTENT_SCOPE"/);
console.log("Exact Polyglot metadata copy tests passed");
