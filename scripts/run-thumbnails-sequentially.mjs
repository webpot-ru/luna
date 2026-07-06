import cp from "node:child_process";
import fs from "node:fs";

const CHANNELS = [
  { support: "VI", env: "youtube-api-youtube-2", force: true },
  { support: "TH", env: "youtube-api-youtube-2", force: true },
  { support: "EN", env: "youtube-api-branding", force: true },
  { support: "ES", env: "youtube-api-branding", force: true },
  { support: "PT", env: "youtube-api-branding", force: true },
  { support: "JA", env: "youtube-api-branding", force: true },
  { support: "TR", env: "youtube-api-branding", force: true }
];

function exec(cmd, args) {
  try {
    return cp.execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch (e) {
    console.error(`Command failed: ${cmd} ${args.join(" ")}`);
    console.error(e.stderr || e.message);
    throw e;
  }
}

function getLatestRun(support) {
  const output = exec("gh", ["run", "list", "--workflow=YouTube Thumbnail Batch Set", "--limit=15", "--json=databaseId,status,conclusion,event,triggeredEvent,createdAt"]);
  const runs = JSON.parse(output);
  // Find a recent workflow run (triggered in the last 15 minutes) for this branch
  // Note: we can't easily see inputs in gh run list json, but we can look for runs that are active or very recent.
  return runs[0] || null;
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function monitorRun(runId) {
  console.log(`Monitoring run ${runId}...`);
  while (true) {
    const output = exec("gh", ["run", "view", String(runId), "--json=status,conclusion"]);
    const run = JSON.parse(output);
    console.log(`Run status: ${run.status}, conclusion: ${run.conclusion}`);
    if (run.status === "completed") {
      return run.conclusion;
    }
    await waitMs(15000);
  }
}

async function main() {
  const results = [];
  console.log("Starting sequential thumbnail upload for all 7 channels...");

  for (const chan of CHANNELS) {
    console.log(`\n========================================`);
    console.log(`Processing support channel: ${chan.support}`);
    console.log(`========================================`);

    // Pull latest changes before planning/triggering
    console.log("Pulling latest repository state...");
    exec("git", ["pull", "origin", "codex/norwegian-course-url-repair-48"]);

    // If VI is already running, we can adopt the existing run
    if (chan.support === "VI") {
      // Find the currently active run
      const output = exec("gh", ["run", "list", "--workflow=YouTube Thumbnail Batch Set", "--limit=5", "--json=databaseId,status"]);
      const runs = JSON.parse(output);
      const activeRun = runs.find(r => r.status === "in_progress" || r.status === "queued");
      if (activeRun) {
        console.log(`Found active run ${activeRun.databaseId} for VI. Adopting it...`);
        const conclusion = await monitorRun(activeRun.databaseId);
        results.push({ support: chan.support, runId: activeRun.databaseId, conclusion });
        continue;
      }
    }

    console.log(`Triggering GHA run for ${chan.support}...`);
    exec("gh", [
      "workflow", "run", "YouTube Thumbnail Batch Set",
      "--ref", "codex/norwegian-course-url-repair-48",
      "--field", "mode=apply",
      "--field", "manifest_path=outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-ordinary-target-language-large-pair-folders-20260704/manifest.json",
      "--field", "set_id=home_kitchen_cookware_pilot_01",
      "--field", `support=${chan.support}`,
      "--field", `force_reupload=${chan.force}`,
      "--field", `youtube_environment=${chan.env}`,
      "--field", "confirm_youtube_write=APPLY_YOUTUBE_THUMBNAIL_BATCH"
    ]);

    // Wait for the run to register on GitHub
    await waitMs(10000);

    const runListOutput = exec("gh", ["run", "list", "--workflow=YouTube Thumbnail Batch Set", "--limit=1", "--json=databaseId"]);
    const runs = JSON.parse(runListOutput);
    const runId = runs[0]?.databaseId;
    if (!runId) {
      throw new Error(`Failed to find triggered run ID for channel ${chan.support}`);
    }

    console.log(`Triggered run ID: ${runId}`);
    const conclusion = await monitorRun(runId);
    results.push({ support: chan.support, runId, conclusion });

    if (conclusion !== "success") {
      console.error(`Run for ${chan.support} finished with conclusion: ${conclusion}. Aborting pipeline to investigate.`);
      break;
    }
  }

  console.log("\n========================================");
  console.log("Thumbnail Sequential Pipeline Report");
  console.log("========================================");
  console.log(JSON.stringify(results, null, 2));

  // Write final report markdown file
  const reportPath = "outputs/review/thumbnails-pipeline-report.md";
  const reportContent = [
    "# YouTube Thumbnail Sequential Pipeline Report",
    `Date: ${new Date().toISOString()}`,
    "",
    "| Support Channel | Run ID | Conclusion | Link |",
    "| --- | --- | --- | --- |",
    ...results.map(r => `| **${r.support}** | ${r.runId} | ${r.conclusion === "success" ? "✅ Success" : "❌ " + r.conclusion} | [View on GitHub](https://github.com/webpot-ru/luna/actions/runs/${r.runId}) |`),
    ""
  ].join("\n");

  fs.writeFileSync(reportPath, reportContent, "utf8");
  console.log(`Saved markdown report to ${reportPath}`);
}

main().catch(console.error);
