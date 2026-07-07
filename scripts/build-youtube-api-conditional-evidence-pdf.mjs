#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const evidenceDir = path.join(
  projectRoot,
  "outputs/youtube-api-quota-evidence/project-1-20260622/conditional-ui-screenshots-20260623",
);
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const stamp = "20260623";

const pages = [
  {
    title: "Google Auth Platform - Audience / In production",
    file: "01b-google-auth-audience-production-authuser1.png",
    note: "Shows the OAuth app publishing status as In production and user type External for the Google Cloud project used for YouTube publishing.",
  },
  {
    title: "Google Auth Platform - OAuth clients",
    file: "03b-google-auth-oauth-clients-authuser1.png",
    note: "Shows OAuth 2.0 web clients for the project. Client secrets are not shown.",
  },
  {
    title: "Google Auth Platform - Data Access / Scopes",
    file: "02b-google-auth-data-access-scopes-authuser1.png",
    note: "Shows the Data Access / scopes page for the OAuth project.",
  },
  {
    title: "GitHub Actions - YouTube Video Publish workflow",
    file: "04-github-actions-youtube-video-publish-workflow.png",
    note: "Shows the internal owner-managed GitHub Actions workflow used to publish and schedule FlashcardsLuna YouTube videos.",
  },
  {
    title: "Public YouTube video/player example",
    file: "05b-youtube-public-video-player-live-example.png",
    note: "Shows a live public FlashcardsLuna educational YouTube video page and player.",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function waitForFile(filePath, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const stat = await fsp.stat(filePath);
      if (stat.size > 10_000) return stat;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

await fsp.mkdir(evidenceDir, { recursive: true });
for (const page of pages) {
  const source = path.join(evidenceDir, page.file);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing screenshot: ${source}`);
  }
}

const htmlPath = path.join(evidenceDir, `project-1-conditional-ui-screenshots-evidence-${stamp}.html`);
const pdfPath = path.join(evidenceDir, `project-1-conditional-ui-screenshots-evidence-${stamp}.pdf`);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FlashcardsLuna YouTube API Conditional UI Evidence</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; background: #ffffff; }
    .page { break-after: page; page-break-after: always; }
    h1 { margin: 0 0 6mm; font-size: 20px; }
    .note { margin: 0 0 6mm; font-size: 12px; color: #374151; }
    img { display: block; max-width: 100%; max-height: 155mm; object-fit: contain; border: 1px solid #d1d5db; }
    .meta { margin-top: 3mm; font-size: 10px; color: #6b7280; }
  </style>
</head>
<body>
${pages.map((page) => {
  const src = pathToFileURL(path.join(evidenceDir, page.file)).href;
  return `<section class="page">
    <h1>${escapeHtml(page.title)}</h1>
    <p class="note">${escapeHtml(page.note)}</p>
    <img src="${src}" alt="${escapeHtml(page.title)}" />
    <p class="meta">Generated ${stamp}; source screenshot: ${escapeHtml(page.file)}</p>
  </section>`;
}).join("\n")}
</body>
</html>
`;

await fsp.writeFile(htmlPath, html, "utf8");

const child = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-component-update",
  `--user-data-dir=/private/tmp/fcl-conditional-evidence-pdf-${Date.now()}`,
  `--print-to-pdf=${pdfPath}`,
  pathToFileURL(htmlPath).href,
], {
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

const stat = await waitForFile(pdfPath);
child.kill("SIGTERM");
await new Promise((resolve) => child.once("close", resolve));

const manifest = {
  generatedAt: new Date().toISOString(),
  note: "PDF made from real UI PNG screenshots for the conditional supporting-documents field in the YouTube API quota/compliance form.",
  html: path.relative(projectRoot, htmlPath),
  pdf: path.relative(projectRoot, pdfPath),
  bytes: stat.size,
  pages,
  stderrTail: stderr.split("\n").slice(-8).join("\n"),
};
const manifestPath = path.join(evidenceDir, `project-1-conditional-ui-screenshots-evidence-${stamp}.json`);
await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
