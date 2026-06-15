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

  let runId = process.argv[2];
  if (!runId) {
    console.log("No run ID specified. Fetching latest run ID...");
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
    const latestRun = runsData.workflow_runs?.[0];
    if (!latestRun) {
      console.error("No workflow runs found.");
      process.exit(1);
    }
    runId = latestRun.id.toString();
    console.log(`Latest run ID: ${runId} (${latestRun.name})`);
  }

  // 1. Get jobs to find job ID
  const jobsUrl = `https://api.github.com/repos/webpot-ru/luna/actions/runs/${runId}/jobs`;
  const jobsRes = await fetch(jobsUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LunaCards-Agent"
    }
  });
  
  const jobsData = await jobsRes.json();
  const jobId = jobsData.jobs?.[0]?.id;
  if (!jobId) {
    console.error("No jobs found for run.");
    process.exit(1);
  }
  
  console.log(`Downloading logs for Job ID ${jobId}...`);
  const logsUrl = `https://api.github.com/repos/webpot-ru/luna/actions/jobs/${jobId}/logs`;
  const logsRes = await fetch(logsUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": "LunaCards-Agent"
    }
  });

  if (logsRes.ok) {
    const text = await logsRes.text();
    fs.writeFileSync("outputs/job-log.txt", text);
    console.log("✅ Logs downloaded to outputs/job-log.txt");
  } else {
    console.error(`❌ Failed to download logs: ${logsRes.status} ${logsRes.statusText}`);
  }
}

main().catch(console.error);
