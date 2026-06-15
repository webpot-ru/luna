#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OAUTH_TOKEN_FILE = path.resolve(".secrets/google-oauth-token.json");
const GITHUB_TOKEN_FILE = path.resolve(".secrets/github-token.txt");

function fail(message) {
  console.error(`\n❌ ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  const setId = process.argv[2];
  if (!setId) {
    console.log(`\nUsage: node scripts/sync-and-publish.mjs <set_id>`);
    console.log(`Example: node scripts/sync-and-publish.mjs home_kitchen_cookware_pilot_01\n`);
    process.exit(1);
  }

  console.log(`=======================================================`);
  console.log(`🚀 Starting sync and publish for deck: ${setId}`);
  console.log(`=======================================================\n`);

  // 1. Preflight checks
  if (!fs.existsSync(OAUTH_TOKEN_FILE)) {
    fail(`Google OAuth token not found at ${OAUTH_TOKEN_FILE}. Run authentication setup first.`);
  }

  // 2. Step 1: Sync from Google Sheets to local Postgres database (refreshing token first)
  console.log(`[1/4] Syncing "${setId}" target languages from Google Sheets to Postgres...`);
  try {
    console.log(`Refreshing Google Sheets OAuth token...`);
    execSync(`node scripts/refresh-token.mjs`, { stdio: "inherit" });
    execSync(`node scripts/sync-sheets-to-db.mjs ${setId}`, { stdio: "inherit" });
    console.log(`✅ Sheets synced to local database successfully.\n`);
  } catch (err) {
    fail(`Failed to sync sheets to database: ${err.message}`);
  }

  // 3. Step 2: Export from Postgres and upload JSON to Google Drive
  console.log(`[2/4] Exporting cards data and uploading JSON to Google Drive...`);
  try {
    execSync(`node scripts/export-and-upload-deck.mjs ${setId}`, { stdio: "inherit" });
    console.log(`✅ Exported and uploaded JSON to Google Drive.\n`);
  } catch (err) {
    fail(`Failed to export and upload deck: ${err.message}`);
  }

  // 4. Step 3: Stage changes in Git
  console.log(`[3/4] Staging changes in Git...`);
  try {
    execSync("git add data/deck-sources.json", { stdio: "inherit" });
  } catch (err) {
    fail(`Failed to stage files: ${err.message}`);
  }

  // Check if there are changes to commit
  let hasChanges = false;
  try {
    execSync("git diff --cached --quiet");
  } catch (err) {
    // If exit code is non-zero, there are changes
    hasChanges = true;
  }

  if (!hasChanges) {
    console.log(`ℹ️ No changes detected in data/deck-sources.json. Skipping Git commit and push.`);
    console.log(`🎉 Deck data on Google Drive is updated. GitHub Actions build is not triggered because no config changed.`);
    return;
  }

  // 5. Step 4: Commit and Push to GitHub
  console.log(`[4/4] Committing and pushing config update to GitHub...`);
  try {
    execSync(`git commit -m "auto-update deck source for ${setId}"`, { stdio: "inherit" });
    console.log(`✅ Committed update locally.`);
  } catch (err) {
    fail(`Failed to commit changes: ${err.message}`);
  }

  // Read GitHub token
  let token = process.env.GITHUB_TOKEN;
  if (!token && fs.existsSync(GITHUB_TOKEN_FILE)) {
    token = fs.readFileSync(GITHUB_TOKEN_FILE, "utf8").trim();
  }

  try {
    if (token) {
      console.log(`Pushing to GitHub using Personal Access Token...`);
      execSync(`git -c credential.helper= push https://${token}@github.com/webpot-ru/luna.git main`, { stdio: "inherit" });
    } else {
      console.log(`Pushing to GitHub using default credential helper...`);
      execSync("git push origin main", { stdio: "inherit" });
    }
    console.log(`\n🎉 Push successful! GitHub Actions will now compile your videos in the cloud.`);
  } catch (err) {
    fail(`Failed to push to GitHub: ${err.message}`);
  }
}

main().catch(console.error);
