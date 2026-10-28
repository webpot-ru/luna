#!/usr/bin/env node
import assert from "node:assert/strict";
import { assertReusableControl } from "./youtube-fast-lane-control-reuse.mjs";
const now = Date.parse("2026-10-29T00:00:00Z");
const fixture = () => ({ now, setId: "fixture", run: { status: "completed", conclusion: "success", head_branch: "main", head_sha: "a".repeat(40), path: ".github/workflows/youtube-publication-control.yml", created_at: new Date(now - 60 * 60000).toISOString() },
  jobs: [...[1, 2, 3, 4].map((i) => ({ name: `audit-route (youtube-${i})`, conclusion: "success" })), { name: "aggregate", conclusion: "success" }],
  artifacts: [1, 2, 3, 4, 5].map((id) => ({ id, name: `youtube-publication-control-fixture-${id}`, expired: false })),
  changedPaths: ["scripts/youtube-fast-lane.mjs", "docs/youtube-publication-campaigns.md"], parentRuns: [],
  control: { generatedAt: new Date(now - 30 * 60000).toISOString(), summary: { healthy: true, complete: true, expectedRouteCount: 4, receivedRouteCount: 4, paginationComplete: true, videoStatusReadbackComplete: true, blockerCount: 0 } },
  playlists: { generatedAt: new Date(now - 30 * 60000).toISOString(), summary: { complete: true, supportCount: 51, blockerCount: 0 } } });
assertReusableControl(fixture());
const stoppedBeforeDispatch = fixture(); stoppedBeforeDispatch.run.conclusion = "failure"; stoppedBeforeDispatch.jobs.push({ name: "dispatch-approved-parent", conclusion: "skipped" });
assertReusableControl(stoppedBeforeDispatch);
const fails = (mutate) => { const f = fixture(); mutate(f); assert.throws(() => assertReusableControl(f)); };
fails((f) => { f.run.status = "in_progress"; });
fails((f) => { f.run.conclusion = "cancelled"; });
fails((f) => { f.run.head_branch = "unreviewed"; });
fails((f) => { f.run.path = ".github/workflows/other.yml"; });
fails((f) => { f.jobs[0].conclusion = "failure"; });
fails((f) => { f.jobs.pop(); });
fails((f) => { f.artifacts.pop(); });
fails((f) => { f.artifacts[0].expired = true; });
fails((f) => { f.artifacts[0].name = "youtube-publication-control-other-set-1"; });
fails((f) => { f.control.generatedAt = new Date(now - 181 * 60000).toISOString(); });
fails((f) => { f.playlists.generatedAt = new Date(now - 181 * 60000).toISOString(); });
fails((f) => { f.control.summary.videoStatusReadbackComplete = false; });
fails((f) => { f.control.summary.blockerCount = 1; });
fails((f) => { f.jobs.push({ name: "dispatch-approved-parent", conclusion: "success" }); });
fails((f) => { f.parentRuns.push({ status: "in_progress", created_at: new Date(now - 90 * 60000).toISOString() }); });
fails((f) => { f.parentRuns.push({ status: "completed", created_at: new Date(now - 10 * 60000).toISOString() }); });
for (const p of ["config/youtube-publication-campaigns.json", "config/youtube-publish-calendar.json", "config/youtube-channels.json", "data/decks/fixture.json", "data/youtube-cover-assets/fixture.jpg", "scripts/audit-youtube-live-publications.mjs", "scripts/create-youtube-partial-recovery-campaign.mjs", ".github/workflows/youtube-publication-campaign.yml"]) {
  fails((f) => { f.changedPaths.push(p); });
}
console.log("PASS: existing control reuse requires fresh complete original evidence, unchanged data/core, full artifacts and no subsequent publication parent");
