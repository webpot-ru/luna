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

  // 1. Get latest run info
  const runsUrl = "https://api.github.com/repos/webpot-ru/luna/actions/runs?per_page=1";
  const runsRes = await fetch(runsUrl, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LunaCards-Agent"
    }
  });

  const runsData = await runsRes.json();
  const run = runsData.workflow_runs?.[0];
  if (!run) {
    console.error("No workflow runs found.");
    process.exit(1);
  }

  const runId = run.id;

  // 2. Get jobs
  const jobsUrl = `https://api.github.com/repos/webpot-ru/luna/actions/runs/${runId}/jobs`;
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
    console.error("No jobs found for run.");
    process.exit(1);
  }

  console.log(`\n=======================================================`);
  console.log(`📊 Active Steps for Run #${runId}:`);
  console.log(`=======================================================`);
  for (const step of job.steps || []) {
    console.log(`- ${step.name}: ${step.status} (${step.conclusion || "In Progress"})`);
  }

  // 3. Download live logs
  console.log(`\n=======================================================`);
  console.log(`📋 Latest Live Log Output:`);
  console.log(`=======================================================`);
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
  console.log(`=======================================================\n`);
}

main().catch(console.error);
