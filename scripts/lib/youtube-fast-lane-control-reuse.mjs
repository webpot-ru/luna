import assert from "node:assert/strict";

const WRAPPER_PATHS = new Set([
  ".github/workflows/youtube-publication-fast-lane.yml",
  "scripts/build-youtube-fast-lane-workflow.mjs", "scripts/youtube-fast-lane.mjs", "scripts/youtube-fast-lane.test.mjs",
  "scripts/lib/youtube-fast-lane-recovery.mjs", "scripts/lib/youtube-fast-lane-recovery.test.mjs",
  "scripts/lib/youtube-fast-lane-control-reuse.mjs", "scripts/lib/youtube-fast-lane-control-reuse.test.mjs",
]);

export function assertReusableControl({ run, jobs, artifacts, changedPaths, parentRuns, setId, control, playlists, now = Date.now() }) {
  assert.equal(run.status, "completed", "Source control must be terminal");
  assert(["success", "failure"].includes(run.conclusion), "Cancelled/incomplete source controls cannot be reused");
  assert.equal(run.head_branch, "main", "Reuse only a reviewed main run");
  assert(Number.isFinite(Date.parse(run.created_at)), "Source creation time is missing");
  assert.match(run.head_sha || "", /^[a-f0-9]{40}$/);
  assert([".github/workflows/youtube-publication-control.yml", ".github/workflows/youtube-publication-fast-lane.yml"].includes(String(run.path).split("@")[0]), "Unsupported source workflow");
  const audit = jobs.filter((j) => j.name.startsWith("audit-route ("));
  assert.equal(audit.length, 4, "Source must contain exactly four audit jobs");
  assert(audit.every((j) => j.conclusion === "success"), "Source route audit failed");
  assert(jobs.some((j) => j.name === "aggregate" && j.conclusion === "success") || jobs.some((j) => j.name === "reuse-control" && j.conclusion === "success"), "Source aggregate did not succeed");
  assert(jobs.every((j) => j.name !== "dispatch-approved-parent" || j.conclusion === "skipped"), "Source already requested a publication parent");
  for (const p of changedPaths) assert(WRAPPER_PATHS.has(p) || p.startsWith("docs/"), `Audit inputs/core code changed since source control: ${p}`);
  assert(artifacts.length >= 5 && new Set(artifacts.map((a) => a.id)).size === artifacts.length, "Artifact pagination/identities incomplete");
  assert(artifacts.every((a) => !a.expired && a.name.startsWith(`youtube-publication-control-${setId}-`)), "Expired or unexpected source artifacts");
  assert(!parentRuns.some((r) => r.status !== "completed"), "A publication parent is active; control cannot be reused");
  assert(parentRuns.every((r) => Number.isFinite(Date.parse(r.created_at))), "Parent inventory timestamps are incomplete");
  assert(!parentRuns.some((r) => Date.parse(r.created_at) >= Date.parse(run.created_at)), "A publication parent was created after source audit began");
  assert.equal(control.summary?.complete, true); assert.equal(control.summary?.healthy, true);
  assert.equal(control.summary?.expectedRouteCount, 4); assert.equal(control.summary?.receivedRouteCount, 4);
  assert.equal(control.summary?.paginationComplete, true); assert.equal(control.summary?.videoStatusReadbackComplete, true);
  assert.equal(control.summary?.blockerCount, 0);
  assert.equal(playlists.summary?.complete, true); assert.equal(playlists.summary?.supportCount, 51);
  assert.equal(playlists.summary?.blockerCount, 0);
  assert.equal(control.setId || setId, setId);
  for (const item of [control, playlists]) {
    const age = (now - Date.parse(item.generatedAt)) / 60000;
    assert(age >= -5 && age <= 180, "Existing control is stale; a new explicitly selected audit is required");
  }
}
