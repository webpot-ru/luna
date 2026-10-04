import assert from "node:assert/strict";

export function assertIncompleteUploadPair({ keep, remove, title }) {
  assert.ok(keep?.id && remove?.id && keep.id !== remove.id, "Exact KEEP/DELETE pair is required");
  assert.equal(keep.snippet?.title, title, "KEEP title changed");
  assert.equal(remove.snippet?.title, title, "DELETE title changed");
  assert.equal(keep.status?.uploadStatus, "processed", "KEEP must be processed");
  assert.ok(keep.contentDetails?.duration && keep.contentDetails.duration !== "PT0S", "KEEP must have a non-zero duration");
  assert.equal(remove.status?.privacyStatus, "private", "DELETE must remain private");
  assert.equal(remove.status?.uploadStatus, "uploaded", "DELETE must be an unfinished upload, not processed/failed/unknown");
  assert.ok(!remove.contentDetails?.duration || remove.contentDetails.duration === "PT0S", "DELETE has non-zero media duration");
  assert.ok(!remove.fileDetails?.fileSize || Number(remove.fileDetails.fileSize) === 0, "DELETE has uploaded file bytes");
  assert.equal((remove.fileDetails?.videoStreams || []).length, 0, "DELETE has video streams");
  assert.notEqual(remove.processingDetails?.processingStatus, "succeeded", "DELETE processing already succeeded");
  assert.equal(Number(remove.statistics?.viewCount || 0), 0, "DELETE must have no views");
  return { keepVideoId: keep.id, deleteVideoId: remove.id, keepUploadStatus: keep.status.uploadStatus,
    keepDuration: keep.contentDetails.duration, deleteUploadStatus: remove.status.uploadStatus,
    deleteDuration: remove.contentDetails?.duration || null, deleteFileSize: remove.fileDetails?.fileSize || null,
    deleteProcessingStatus: remove.processingDetails?.processingStatus || null, verifiedIncomplete: true };
}
