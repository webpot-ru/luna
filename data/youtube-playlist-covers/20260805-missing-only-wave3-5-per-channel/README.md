# Playlist image missing-only wave 3 (2026-08-05)

This package continues the exact missing-only playlist-image lane after waves 1 and 2.

- 43 rows: up to the next five remaining absent rows per enabled channel.
- Small channel tails are included in full (for example TH/VI/SR/MY/NE/SW).
- Wave 1 and wave 2 playlist keys are excluded; existing images are never replaced.
- Every row carries `youtube_playlist_images_readback` evidence and a durable playlist ID.
- Dispatch one route at a time with `mode=apply`, `limit_per_channel=5`, and `confirm_youtube_write=APPLY_YOUTUBE_PLAYLIST_IMAGES`.

The uploader performs a live `playlistImages.list` check immediately before each write. Repair/readback runs record an already-created image without sending it again.
