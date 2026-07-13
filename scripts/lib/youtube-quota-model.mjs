const VIDEO_UPLOAD_CALL_COST = 1;
const PLAYLIST_WRITE_COST = 50;
const THUMBNAIL_SET_COST = 50;

function estimateYoutubeUploadQuota({ hasThumbnail, hasExistingPlaylist, allowPlaylistCreate }) {
  const estimatedVideoUploadCalls = 1;
  const playlistUnits = hasExistingPlaylist ? PLAYLIST_WRITE_COST : (allowPlaylistCreate ? PLAYLIST_WRITE_COST * 2 : 0);
  const estimatedGeneralQuotaUnits = playlistUnits + (hasThumbnail ? THUMBNAIL_SET_COST : 0);
  return {
    estimatedQuotaUnits: VIDEO_UPLOAD_CALL_COST + estimatedGeneralQuotaUnits,
    estimatedVideoUploadCalls,
    estimatedGeneralQuotaUnits,
  };
}

export { PLAYLIST_WRITE_COST, THUMBNAIL_SET_COST, VIDEO_UPLOAD_CALL_COST, estimateYoutubeUploadQuota };
