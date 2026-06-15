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

  const setId = process.argv[2] || "home_kitchen_cookware_pilot_01";
  const support = process.argv[3] || "UZ,AZ,KK,KA,HY";
  const concurrency = process.argv[4] || "2";
  const workflowName = process.argv[5] || "build-videos.yml";

  console.log(`Triggering workflow '${workflowName}' for set '${setId}', support languages '${support}' with concurrency ${concurrency}...`);

  const url = `https://api.github.com/repos/webpot-ru/luna/actions/workflows/${workflowName}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LunaCards-Agent"
    },
    body: JSON.stringify({
      ref: "main",
      inputs: workflowName.includes("matrix")
        ? { set_id: setId, concurrency: concurrency }
        : { set_id: setId, support: support, concurrency: concurrency }
    })
  });

  if (response.ok) {
    console.log("✅ Workflow triggered successfully!");
  } else {
    const errorText = await response.text();
    console.error(`❌ Failed to trigger workflow: ${response.status} ${response.statusText}\n${errorText}`);
    process.exit(1);
  }
}

main().catch(console.error);
