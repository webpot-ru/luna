#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outDir = path.join(projectRoot, "outputs/youtube-api-quota-evidence/project-1-20260622");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const stamp = "20260623";

const jobs = [
  {
    key: "privacy",
    url: "https://flashcardsluna.com/en/privacy",
    output: `project-1-privacy-live-browser-screenshot-${stamp}.png`,
    width: 1440,
    height: 9000,
  },
  {
    key: "youtube-api-disclosure",
    url: "https://flashcardsluna.com/en/youtube-api-disclosure",
    output: `project-1-youtube-api-disclosure-live-browser-screenshot-${stamp}.png`,
    width: 1440,
    height: 9000,
  },
  {
    key: "homepage",
    url: "https://flashcardsluna.com/en",
    output: `project-1-homepage-live-browser-screenshot-${stamp}.png`,
    width: 1440,
    height: 10000,
  },
  {
    key: "terms",
    url: "https://flashcardsluna.com/en/terms",
    output: `project-1-terms-live-browser-screenshot-${stamp}.png`,
    width: 1440,
    height: 9000,
  },
];

async function waitForFile(filePath, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const stat = await fsp.stat(filePath);
      if (stat.size > 10_000) return stat;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for screenshot: ${filePath}`);
}

async function capture(job) {
  const outputPath = path.join(outDir, job.output);
  const userDataDir = `/private/tmp/fcl-chrome-shot-${job.key}-${Date.now()}`;
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${job.width},${job.height}`,
    `--user-data-dir=${userDataDir}`,
    `--screenshot=${outputPath}`,
    job.url,
  ];
  console.log(`capture ${job.key}: ${job.url}`);
  const child = spawn(chromePath, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  const stat = await waitForFile(outputPath);
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("close", resolve));
  return {
    key: job.key,
    url: job.url,
    png: path.relative(projectRoot, outputPath),
    bytes: stat.size,
    stderrTail: stderr.split("\n").slice(-6).join("\n"),
  };
}

await fsp.mkdir(outDir, { recursive: true });
const results = [];
for (const job of jobs) {
  results.push(await capture(job));
}

const manifestPath = path.join(outDir, `live-browser-png-screenshots-manifest-${stamp}.json`);
const manifest = {
  generatedAt: new Date().toISOString(),
  note: "Real Chrome headless PNG screenshots of live public FlashcardsLuna pages for the Google YouTube API quota/compliance form.",
  recommendedUploads: {
    privacyPolicyScreenshots: [
      `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-privacy-live-browser-screenshot-${stamp}.png`,
      `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-youtube-api-disclosure-live-browser-screenshot-${stamp}.png`,
    ],
    homepagePrivacyYoutubeBrandScreenshot: `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-homepage-live-browser-screenshot-${stamp}.png`,
    termsDocumentation: `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-terms-live-browser-screenshot-${stamp}.png`,
  },
  results,
};
await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
