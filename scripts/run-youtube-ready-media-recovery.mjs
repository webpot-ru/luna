import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { prepareReadyMedia, readyMediaSha256, verifyReadyMediaScope } from "./lib/youtube-ready-media.mjs";
import { assignmentKey } from "./lib/youtube-publication-control.mjs";
import { serializeYoutubeDurableJson } from "./lib/youtube-durable-json.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
const spec = read(args.spec);
const registry = read("config/youtube-publication-campaigns.json");
const campaign = registry.campaigns.find(c => c.campaignId === args.campaign);
const source = registry.campaigns.find(c => c.campaignId === spec.sourceCampaignId);
verifyReadyMediaScope(spec, campaign, source);
for (const [file, hash] of Object.entries(spec.productionContracts || {})) {
  if (!/^(scripts|config)\/[^\s]+\.(mjs|json)$/.test(file) || file.split("/").includes("..")
    || !/^[a-f0-9]{64}$/.test(hash)) throw new Error("Unsafe production contract path/hash");
  if (readyMediaSha256(file) !== hash) throw new Error(`Ready media production contract changed: ${file}`);
}
if (!Object.keys(spec.productionContracts || {}).length) throw new Error("Missing ready media production contracts");
if (args.preflight === "true") {
  console.log(JSON.stringify({ exactReadyCount: spec.assets.length, sourceRunId: spec.sourceRunId }));
  process.exit(0);
}
if (args.confirm !== "UPLOAD_APPROVED_READY_MEDIA") throw new Error("Missing ready media apply confirmation");
const selected = campaign.assignments.filter(a => a.routeKey === args.route);
if (!selected.length) throw new Error("Ready media route empty");
const command = (script, argv) => execFileSync(process.execPath, [script, ...argv], { stdio: "inherit" });
const output = "outputs/ready-media";
fs.mkdirSync(output, { recursive: true });
// Validate all files in the lane before any YouTube call.
const prepared = selected.map(row => ({ row, metadata: prepareReadyMedia({ spec, campaign, source,
  artifactRoot: args.artifacts, asset: spec.assets.find(a => a.assignmentKey === row.assignmentKey) }) }));
const failures = [];
for (const { row, metadata } of prepared) {
  try {
  const metadataFile = path.join(output, `${row.supportLang}-${row.videoType}-youtube_metadata.json`);
  fs.writeFileSync(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`);
  const playlistsFile = path.join(output, "playlists.json");
  command("scripts/audit-youtube-playlists.mjs", [`--support=${row.supportLang}`, `--route-key=${row.routeKey}`, `--output=${playlistsFile}`, "--json"]);
  const discovery = read(playlistsFile);
  const owner = discovery.channels?.find(c => c.supportLang === row.supportLang && c.youtubeChannelId === row.youtubeChannelId);
  const playlist = owner?.playlists?.find(p => p.id === row.playlist.youtubePlaylistId);
  if (!discovery.complete || !owner?.complete || !playlist || playlist.privacyStatus !== "public"
    || playlist.youtubeChannelId !== row.youtubeChannelId) throw new Error("Ready media playlist not confirmed public/owned");
  command("scripts/audit-youtube-live-publications.mjs", [`--set=${campaign.setId}`, `--support=${row.supportLang}`, "--max-pages=100", "--include-video-status", "--output=outputs/youtube-live-publications-github.json", "--json"]);
  const controlFile = path.join(output, "control.json");
  command("scripts/check-youtube-publication-control.mjs", [`--set=${campaign.setId}`, `--support=${row.supportLang}`, "--video-types=ordinary,polyglot", "--live-audit=outputs/youtube-live-publications-github.json", `--output=${controlFile}`, "--strict"]);
  const polyglot = row.videoType === "polyglot";
  const publicationRegistry = polyglot ? "config/youtube-polyglot-published-videos.json" : "config/youtube-published-videos.json";
  const uploadArgs = [`--metadata=${metadataFile}`, `--video=${metadata.videoPath}`, "--privacy=private", `--publication-control-report=${controlFile}`, `--publication-registry=${publicationRegistry}`, "--apply", "--confirm-youtube-write"];
  if (polyglot) uploadArgs.push("--playlist-registry=config/youtube-polyglot-playlists.json", "--progress-registry=config/youtube-polyglot-progress.json");
  // Existing uploader owns the single videos.insert init, receipt/readback and
  // playlist membership. No direct HTTP write or upload retry is added here.
  command("scripts/youtube-publish-video.mjs", uploadArgs);
  const receipt = read(publicationRegistry).publications.find(p => p.campaignId === campaign.campaignId && assignmentKey(p) === row.assignmentKey);
  if (!receipt?.youtubeVideoId || receipt.postUploadError || !receipt.playlistItemId
    || receipt.youtubePlaylistId !== row.playlist.youtubePlaylistId) throw new Error("Ready media receipt incomplete; preserve artifacts, never retry");
  const calendar = read("config/youtube-publish-calendar.json");
  const reservation = calendar.reservations.find(r => r.campaignId === campaign.campaignId && assignmentKey(r) === row.assignmentKey);
  if (!reservation || reservation.publishAt !== row.publishAt) throw new Error("Ready media calendar receipt drift");
  Object.assign(reservation, { youtubeVideoId: receipt.youtubeVideoId, youtubePlaylistId: receipt.youtubePlaylistId,
    playlistItemId: receipt.playlistItemId, status: "campaign_upload_accepted" });
  fs.writeFileSync("config/youtube-publish-calendar.json", serializeYoutubeDurableJson("config/youtube-publish-calendar.json", calendar));
  } catch (error) {
    // Different immutable rows are independent, not retries. In particular an
    // ordinary init failure must not suppress the lane's separate Polyglot.
    failures.push(row.assignmentKey);
    console.error(`[Ready media] ${row.assignmentKey} failed: ${error.message}`);
  }
}
if (failures.length) throw new Error(`Ready media failed assignments (no retries): ${failures.join(", ")}`);
