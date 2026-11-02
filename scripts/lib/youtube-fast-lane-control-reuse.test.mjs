#!/usr/bin/env node
import assert from "node:assert/strict";
import { assertReusableControl } from "./youtube-fast-lane-control-reuse.mjs";
import { loadCanonicalSupportRouting } from "./youtube-support-routing.mjs";
const routing = loadCanonicalSupportRouting();
const playlistChannels = () => [...routing.supportToChannel].map(([supportLang,c]) => ({supportLang, youtubeChannelId:c.channelId, routeKey:routing.supportToRoute.get(supportLang).key, complete:true}));
const now = Date.parse("2026-10-29T00:00:00Z");
const fixture = () => ({ now, setId: "fixture", run: { status: "completed", conclusion: "success", head_branch: "main", head_sha: "a".repeat(40), path: ".github/workflows/youtube-publication-control.yml", created_at: new Date(now - 60 * 60000).toISOString() },
  jobs: [...[1, 2, 3, 4].map((i) => ({ name: `audit-route (youtube-${i})`, conclusion: "success" })), { name: "aggregate", conclusion: "success" }],
  artifacts: [1, 2, 3, 4, 5].map((id) => ({ id, name: `youtube-publication-control-fixture-${id}`, expired: false })),
  changedPaths: ["scripts/youtube-fast-lane.mjs", "docs/youtube-publication-campaigns.md"], parentRuns: [],
  control: { generatedAt: new Date(now - 30 * 60000).toISOString(), summary: { healthy: true, complete: true, expectedRouteCount: 4, receivedRouteCount: 4, paginationComplete: true, videoStatusReadbackComplete: true, blockerCount: 0 } },
  playlists: { generatedAt: new Date(now - 30 * 60000).toISOString(), summary: { complete: true, supportCount: 51, blockerCount: 0, youtubeWrites: 0 }, channels: playlistChannels() } });
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
const failedPlan=fixture();failedPlan.run.conclusion="failure";
failedPlan.jobs.find(j=>j.name==='aggregate').conclusion='failure';
failedPlan.jobs.find(j=>j.name==='aggregate').steps=[{name:'Build one no-spend immutable campaign plan from the same live evidence',conclusion:'failure'}];
failedPlan.jobs.push({name:'claim-campaign',conclusion:'skipped'},{name:'dispatch-approved-parent',conclusion:'skipped'});
assert.throws(()=>assertReusableControl(failedPlan));
failedPlan.verifiedSourcePlan=true;assertReusableControl(failedPlan);
for(const mutate of [f=>{f.jobs.find(j=>j.name==='claim-campaign').conclusion='success';},f=>{f.jobs.find(j=>j.name==='aggregate').steps[0].name='Some other failing step';},f=>{f.jobs.find(j=>j.name==='aggregate').steps.push({name:'another',conclusion:'failure'});},f=>{f.jobs[0].conclusion='failure';}]) {const f=structuredClone(failedPlan);mutate(f);assert.throws(()=>assertReusableControl(f));}
const subset=fixture();subset.selectedSupports=['SR'];subset.playlists.channels=subset.playlists.channels.filter(c=>c.supportLang==='SR');subset.playlists.summary.supportCount=1;assertReusableControl(subset);
subset.selectedSupports=['EN'];assert.throws(()=>assertReusableControl(subset));
console.log("PASS: existing control reuse requires fresh complete original evidence, unchanged data/core, full artifacts and no subsequent publication parent");
