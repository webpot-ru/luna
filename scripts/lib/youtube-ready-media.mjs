import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { assignmentKey } from "./youtube-publication-control.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
export const readyMediaSha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export function readyMediaPath(root, relative) {
  assert(typeof relative === "string" && relative && !path.isAbsolute(relative)
    && !relative.includes("\\") && !relative.split("/").includes(".."), "Unsafe ready media path");
  const resolved = path.resolve(root, relative);
  assert(resolved.startsWith(`${path.resolve(root)}${path.sep}`), "Ready media path escaped root");
  if (fs.existsSync(resolved)) assert(fs.realpathSync(resolved).startsWith(`${fs.realpathSync(root)}${path.sep}`), "Ready media symlink escaped root");
  return resolved;
}

export function verifyReadyMediaScope(spec, campaign, source, mediaSource = source) {
  assert(spec.schemaVersion === 1 && /^\d+$/.test(String(spec.sourceRunId)) && /^[a-f0-9]{40}$/.test(spec.sourceHeadSha), "Invalid ready media source");
  assert(source?.campaignId === spec.sourceCampaignId && source.manifestHash === spec.sourceManifestHash, "Ready media source campaign/hash mismatch");
  const chained = Boolean(spec.mediaSourceCampaignId);
  if (chained) {
    assert(mediaSource?.campaignId === spec.mediaSourceCampaignId
      && mediaSource.manifestHash === spec.mediaSourceManifestHash
      && source.inputs?.partialRecoveryOfCampaignId === mediaSource.campaignId
      && source.setId === mediaSource.setId, "Ready media lineage mismatch");
    assert(source.evidence?.sourceFingerprints?.offlineDeck?.sha256 === mediaSource.evidence?.sourceFingerprints?.offlineDeck?.sha256, "Ready media lineage deck hash changed");
  } else assert(!spec.mediaSourceManifestHash && mediaSource === source, "Unexpected ready media lineage");
  assert(campaign.status === "claimed" && campaign.setId === source.setId
    && campaign.inputs?.partialRecoveryOfCampaignId === source.campaignId, "Ready media requires a claimed exact partial recovery");
  assert(spec.assets.length > 0 && spec.assets.length <= 4 && spec.assets.length === campaign.assignments.length, "Ready media exact scope count mismatch");
  assert(new Set(spec.assets.map(a => a.assignmentKey)).size === spec.assets.length, "Duplicate ready media assignment");
  for (const asset of spec.assets) {
    const row = campaign.assignments.find(a => a.assignmentKey === asset.assignmentKey);
    const old = source.assignments.find(a => a.assignmentKey === asset.assignmentKey);
    assert(row && old && !row.youtubeVideoId && !old.youtubeVideoId
      && row.status === "claimed" && old.status === "superseded_partial_recovery"
      && old.supersededByCampaignId === campaign.campaignId, "Ready media source assignment is accepted, missing or not owned");
    const original = chained ? mediaSource.assignments.find(a => a.assignmentKey === asset.assignmentKey) : old;
    assert(original && !original.youtubeVideoId && (!chained || (original.status === "superseded_partial_recovery"
      && original.supersededByCampaignId === source.campaignId)), "Ready media lineage assignment not owned or already accepted");
    for (const key of ["videoType", "setId", "supportLang", "targetLang", "bundleKey", "contentScope", "targetLangsHash", "maxDurationSeconds", "youtubeChannelId", "channelKey"]) {
      assert(JSON.stringify(row[key] ?? "") === JSON.stringify(old[key] ?? ""), `Ready media contract changed: ${key}`);
      assert(JSON.stringify(old[key] ?? "") === JSON.stringify(original[key] ?? ""), `Ready media lineage contract changed: ${key}`);
    }
    assert(row.productionReadiness?.voiceId === old.productionReadiness?.voiceId, "Ready media voice changed");
    assert(old.productionReadiness?.voiceId === original.productionReadiness?.voiceId
      && old.playlist?.youtubePlaylistId === original.playlist?.youtubePlaylistId, "Ready media lineage voice/playlist changed");
    assert(row.thumbnail?.mode === "first_frame_auto" && row.playlist?.ready === true
      && row.playlist.state === "resolved_existing" && row.playlist.createAllowed === false
      && row.playlist.youtubePlaylistId === old.playlist.youtubePlaylistId, "Ready media requires existing playlist and automatic thumbnail");
    assert(Number.isSafeInteger(asset.artifactId) && asset.artifactId > 0
      && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset.artifactName), "Unsafe ready media artifact");
    assert(/^outputs\/video-generator\/.+\.mp4$/.test(asset.videoPath)
      && /^outputs\/video-generator\/.+\/youtube_metadata\.json$/.test(asset.metadataPath)
      && /^[a-f0-9]{64}$/.test(asset.videoSha256) && /^[a-f0-9]{64}$/.test(asset.metadataSha256)
      && Number.isFinite(asset.durationSeconds) && asset.durationSeconds > 0, "Invalid ready media files/checksums");
    readyMediaPath(process.cwd(), asset.videoPath);
    readyMediaPath(process.cwd(), asset.metadataPath);
  }
  assert(campaign.evidence?.sourceFingerprints?.offlineDeck?.sha256 === source.evidence?.sourceFingerprints?.offlineDeck?.sha256, "Ready media deck hash changed");
}

export function prepareReadyMedia({ spec, campaign, source, mediaSource = source, artifactRoot, asset, probe, now = Date.now() }) {
  const row = campaign.assignments.find(a => a.assignmentKey === asset.assignmentKey);
  assert(row, "Ready media assignment absent");
  const root = readyMediaPath(artifactRoot, asset.artifactName);
  const metadataPath = readyMediaPath(root, asset.metadataPath);
  const videoPath = readyMediaPath(root, asset.videoPath);
  assert(readyMediaSha256(metadataPath) === asset.metadataSha256 && readyMediaSha256(videoPath) === asset.videoSha256, "Ready media file checksum mismatch");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  assert(mediaSource.campaignId === (spec.mediaSourceCampaignId || spec.sourceCampaignId)
    && mediaSource.manifestHash === (spec.mediaSourceManifestHash || spec.sourceManifestHash), "Ready media metadata provenance mismatch");
  assert(assignmentKey(metadata) === row.assignmentKey && metadata.campaignId === mediaSource.campaignId
    && metadata.campaignManifestHash === mediaSource.manifestHash, "Ready media metadata identity mismatch");
  assert(metadata.youtubePlaylistId === row.playlist.youtubePlaylistId, "Ready media playlist identity changed");
  const mediaBound = row.videoType === "polyglot"
    ? typeof metadata.videoPath === "string" && (metadata.videoPath === asset.videoPath || metadata.videoPath.endsWith(`/${asset.videoPath}`))
    : path.posix.dirname(asset.videoPath) === path.posix.dirname(asset.metadataPath)
      && path.posix.basename(asset.videoPath) === `lesson_${row.targetLang.toLowerCase()}_${row.supportLang.toLowerCase()}.mp4`;
  assert(mediaBound, "Ready media metadata/video binding mismatch");
  const media = probe || JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_type,width,height", "-of", "json", videoPath], { encoding: "utf8" }));
  const seconds = Number(media.format?.duration);
  assert(Number.isFinite(seconds) && seconds > 0 && Math.abs(seconds - asset.durationSeconds) < 0.1
    && media.streams?.some(s => s.codec_type === "audio") && media.streams.some(s => s.codec_type === "video"), "Ready media duration or streams invalid");
  const videoStream = media.streams.find(s => s.codec_type === "video");
  assert(videoStream.width > videoStream.height && Math.abs(videoStream.width / videoStream.height - 16 / 9) < 0.01, "Ready media must remain horizontal 16:9");
  assert(row.videoType !== "polyglot" || (row.contentScope === "short_unverified" && row.maxDurationSeconds === 895 && seconds <= 895), "Ready media Polyglot scope/duration invalid");
  assert(row.videoType !== "ordinary" || row.longVideoUploadAllowed || seconds <= 895, "Ready media ordinary duration invalid");
  assert(Date.parse(row.publishAt) >= now + 90 * 60_000, "Ready media schedule no longer safely future");
  // Copy already approved copy verbatim. Only bind the existing media to the
  // new immutable campaign, calendar and local file location.
  return { ...metadata, videoPath, campaignId: campaign.campaignId, campaignManifestHash: campaign.manifestHash,
    channelKey: row.channelKey, youtube_channel_id: row.youtubeChannelId,
    campaignPlaylist: row.playlist, youtubePlaylistId: row.playlist.youtubePlaylistId,
    publishAt: row.publishAt, scheduledPublishAt: row.publishAt, privacyStatus: "private",
    publishSchedule: { ...(metadata.publishSchedule || {}), publishAt: row.publishAt, campaignId: campaign.campaignId, campaignManifestHash: campaign.manifestHash },
    thumbnailUploadMode: "first_frame_auto", thumbnailSource: "youtube-auto-first-frame",
    readyMediaSource: { runId: spec.sourceRunId, artifactId: asset.artifactId, videoSha256: asset.videoSha256, metadataSha256: asset.metadataSha256 } };
}
