import assert from "node:assert/strict";

import { selectBlockingPartialRecoveryAdvisories } from "./youtube-partial-recovery-advisories.mjs";

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
