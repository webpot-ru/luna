import assert from "node:assert/strict";

import {
  classifyPartialRecoveryAssignments,
  selectBlockingPartialRecoveryAdvisories,
} from "./youtube-partial-recovery-advisories.mjs";

const classified = classifyPartialRecoveryAssignments([
  { assignmentKey: "accepted", status: "upload_accepted", youtubeVideoId: "video-1" },
  { assignmentKey: "thumbnail-repair", status: "upload_accepted_reconciliation_required", youtubeVideoId: "video-2" },
  { assignmentKey: "missing", status: "claimed" },
  { assignmentKey: "unsafe", status: "upload_accepted_reconciliation_required" },
]);
assert.deepEqual(classified.accepted.map((row) => row.assignmentKey), ["accepted", "thumbnail-repair"]);
assert.deepEqual(classified.acceptedWithPostUploadError.map((row) => row.assignmentKey), ["thumbnail-repair"]);
assert.deepEqual(classified.missing.map((row) => row.assignmentKey), ["missing"]);
assert.deepEqual(classified.unsupported.map((row) => row.assignmentKey), ["unsafe"]);

const deferredFull = {
  type: "polyglot_full_tail_deferred_by_active_short_unverified",
  supportLang: "NL",
  bundleKey: "global_europe_core",
  expectedContentScope: "full",
};

assert.deepEqual(selectBlockingPartialRecoveryAdvisories([deferredFull], [{
  videoType: "ordinary",
  supportLang: "NL",
  targetLang: "LV",
}]), []);

assert.deepEqual(selectBlockingPartialRecoveryAdvisories([deferredFull], [{
  videoType: "polyglot",
  supportLang: "NL",
  bundleKey: "global_europe_core",
  contentScope: "short_unverified",
}]), []);

assert.deepEqual(selectBlockingPartialRecoveryAdvisories([deferredFull], [{
  videoType: "polyglot",
  supportLang: "NL",
  bundleKey: "global_europe_core",
  contentScope: "full",
}]), [deferredFull]);

const selectedSupportWarning = { type: "unknown_selected_support_warning", supportLang: "NL" };
assert.deepEqual(selectBlockingPartialRecoveryAdvisories([selectedSupportWarning], [{
  videoType: "ordinary",
  supportLang: "NL",
  targetLang: "LV",
}]), [selectedSupportWarning]);

assert.deepEqual(selectBlockingPartialRecoveryAdvisories([
  { ...selectedSupportWarning, supportLang: "DA" },
], [{ videoType: "ordinary", supportLang: "NL", targetLang: "LV" }]), []);

console.log("youtube partial recovery advisory tests passed");
