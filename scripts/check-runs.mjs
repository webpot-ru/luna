import fs from "node:fs";
import path from "node:path";

const GITHUB_TOKEN_FILE = path.resolve(".secrets/github-token.txt");

async function main() {
  let token = process.env.GITHUB_TOKEN;
  if (!token && fs.existsSync(GITHUB_TOKEN_FILE)) {
    token = fs.readFileSync(GITHUB_TOKEN_FILE, "utf8").trim();
  }

  if (!token) {
    console.error("Error: GitHub token not found.");
    process.exit(1);
  }

  // 1. Get latest runs
  const runsUrl = "https://api.github.com/repos/webpot-ru/luna/actions/runs?per_page=5";
  const runsRes = await fetch(runsUrl, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LunaCards-Agent"
    }
  });

  const runsData = await runsRes.json();
  const runs = runsData.workflow_runs || [];
  if (runs.length === 0) {
    console.error("No workflow runs found.");
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log("📊 Recent Workflow Runs Overview:");
  console.log("=======================================================");
  for (const run of runs) {
    const durationStr = run.run_started_at ? `(Started: ${run.run_started_at})` : "";
    console.log(`Run #${run.id} | ${run.name} | Status: ${run.status} | Conclusion: ${run.conclusion || "Pending"} | Event: ${run.event} ${durationStr}`);
  }

  // Find active runs, or default to the most recent run
  const activeRuns = runs.filter(r => r.status === "in_progress" || r.status === "queued");
  const runsToDetail = activeRuns.length > 0 ? activeRuns : [runs[0]];

  for (const run of runsToDetail) {
    console.log(`\n=======================================================`);
    console.log(`🔍 Detailing Run #${run.id} (${run.status === "in_progress" ? "ACTIVE" : run.status}):`);
    console.log(`=======================================================`);

    // 2. Get jobs for this run
    const jobsUrl = `https://api.github.com/repos/webpot-ru/luna/actions/runs/${run.id}/jobs`;
    const jobsResponse = await fetch(jobsUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LunaCards-Agent"
      }
    });

    const jobsData = await jobsResponse.json();
    const job = jobsData.jobs?.[0];
    if (!job) {
      console.log(`No jobs found yet for Run #${run.id}.`);
      continue;
    }

    console.log(`📊 Steps:`);
    for (const step of job.steps || []) {
      console.log(`- ${step.name}: ${step.status} (${step.conclusion || "In Progress"})`);
    }

    // 3. Download live logs
    console.log(`📋 Latest Live Log Output:`);
    const logsUrl = `https://api.github.com/repos/webpot-ru/luna/actions/jobs/${job.id}/logs`;
    const logsResponse = await fetch(logsUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "LunaCards-Agent"
      }
    });

    if (logsResponse.ok) {
      const logsText = await logsResponse.text();
      const lines = logsText.split("\n");
      // Show last 35 lines
      console.log(lines.slice(-35).join("\n"));
    } else {
      console.log(`(Live logs not ready yet: status ${logsResponse.status})`);
    }
  }
  console.log(`=======================================================\n`);
}

main().catch(console.error);
