import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/youtube-publication-state-recovery.yml", "utf8");
assert.match(workflow, /RECOVER_YOUTUBE_STATE_WITHOUT_UPLOAD/);
assert.match(workflow, /r\.status!=="completed"/);
assert.match(workflow, /c\.manifestHash!==process\.env\.MANIFEST_HASH/);
assert.match(workflow, /git rev-parse origin\/main/);
assert.match(workflow, /"completedCount","observedCount","missingCount","artifactCount"/);
assert.match(workflow, /duplicateAssignments.*duplicateVideoIds.*unexpectedPublications.*receiptErrors/);
assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$TARGET_BRANCH"/);
assert.doesNotMatch(workflow, /secrets\.|YOUTUBE_OAUTH|OPENAI_API_KEY|workflow run|videos\.insert|edge-tts|build-all-deck-videos|uses:.*youtube.*publish/i);
assert.doesNotMatch(workflow, /pattern: youtube-/);
assert.match(workflow, /gh api --paginate --slurp/);
assert.match(workflow, /actions\/artifacts\/\$artifact_id\/zip/);
assert.match(workflow, /select-youtube-receipt-artifacts\.mjs/);
assert.match(workflow, /unsafe archive path/);
const writers = ["claim", "finalize", "rearm", "reconcile"];
for (const prefix of writers) {
  const source = fs.readFileSync(`scripts/${prefix}-youtube-publication-campaign${prefix === "reconcile" ? "-receipts" : ""}.mjs`, "utf8");
  assert.match(source, /serializeYoutubeDurableJson/);
}
console.log("receipt-only state recovery workflow tests passed");
