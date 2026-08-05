# Playlist image missing-only wave 2 (2026-08-05)

This package contains the next five exact missing playlist-image rows for each of the twelve channels currently enabled for playlist-image uploads.

- 60 rows total: 5 per enabled channel.
- Only `auditState=absent` rows from the complete eight-route readback are included.
- Wave 1 playlist keys are excluded; this package never replaces an installed image.
- `auditEvidenceType` is `youtube_playlist_images_readback` for every row.
- The GitHub workflow must be dispatched per route with `mode=apply`, `limit_per_channel=5`, and `confirm_youtube_write=APPLY_YOUTUBE_PLAYLIST_IMAGES`.

The uploader performs a live `playlistImages.list` check immediately before each write. A later repair/readback run may record an already-created image without sending it again.
