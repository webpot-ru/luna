#!/usr/bin/env node
import assert from "node:assert/strict";

import { estimateYoutubeUploadQuota } from "./youtube-quota-model.mjs";

assert.deepEqual(estimateYoutubeUploadQuota({ hasThumbnail: false, hasExistingPlaylist: true, allowPlaylistCreate: true }), {
  estimatedQuotaUnits: 51,
  estimatedVideoUploadCalls: 1,
  estimatedGeneralQuotaUnits: 50,
});
assert.deepEqual(estimateYoutubeUploadQuota({ hasThumbnail: true, hasExistingPlaylist: false, allowPlaylistCreate: true }), {
  estimatedQuotaUnits: 151,
  estimatedVideoUploadCalls: 1,
  estimatedGeneralQuotaUnits: 150,
});
assert.deepEqual(estimateYoutubeUploadQuota({ hasThumbnail: false, hasExistingPlaylist: false, allowPlaylistCreate: false }), {
  estimatedQuotaUnits: 1,
  estimatedVideoUploadCalls: 1,
  estimatedGeneralQuotaUnits: 0,
});

console.log("youtube granular quota model tests passed");
