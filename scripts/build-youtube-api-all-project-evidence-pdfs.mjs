#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const baseDir = path.join(
  projectRoot,
  "outputs/youtube-api-quota-evidence/all-projects-conditional-ui-screenshots-20260623",
);
const sharedDir = path.join(
  projectRoot,
  "outputs/youtube-api-quota-evidence/project-1-20260622/conditional-ui-screenshots-20260623",
);
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const stamp = "20260623";

const routes = [
  {
    route: "youtube-1",
    label: "youtube 1",
    projectId: "flashcardsluna",
    projectName: "FlashcardsLuna 1",
    clientPrefix: "130628727588",
  },
  {
    route: "youtube-2",
    label: "youtube 2",
    projectId: "flashcardmate",
    projectName: "FlashCardMate 2",
    clientPrefix: "327715936948",
  },
  {
    route: "youtube-3",
    label: "youtube 3",
    projectId: "flashcardluna",
    projectName: "flashcardluna 3",
    clientPrefix: "1076963270652",
  },
  {
    route: "youtube-4",
    label: "youtube 4",
    projectId: "gen-lang-client-0944728861",
    projectName: "Flashcardsluna 4",
    clientPrefix: "215536805171",
  },
];

const sharedEvidence = [
  {
    title: "GitHub Actions - YouTube Video Publish workflow",
    path: path.join(sharedDir, "04-github-actions-youtube-video-publish-workflow.png"),
    note: "Shows the internal owner-managed GitHub Actions workflow used to publish and schedule FlashcardsLuna YouTube videos. Secret values are not shown.",
  },
  {
    title: "Public YouTube video/player example",
    path: path.join(sharedDir, "05b-youtube-public-video-player-live-example.png"),
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

async function printHtmlToPdf(htmlPath, pdfPath) {
  const child = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    `--user-data-dir=/private/tmp/fcl-all-project-evidence-pdf-${Date.now()}`,
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
  return { bytes: stat.size, stderrTail: stderr.split("\n").slice(-8).join("\n") };
}

function pageHtml(page) {
  return `<section class="page">
    <h1>${escapeHtml(page.title)}</h1>
    <p class="note">${escapeHtml(page.note)}</p>
    <img src="${pathToFileURL(page.path).href}" alt="${escapeHtml(page.title)}" />
    <p class="meta">Source screenshot: ${escapeHtml(path.basename(page.path))}</p>
  </section>`;
}

const built = [];
for (const route of routes) {
  const routeDir = path.join(baseDir, route.route);
  await fsp.mkdir(routeDir, { recursive: true });
  const routePages = [
    {
      title: `${route.projectName} - Google Auth Platform Audience`,
      path: path.join(routeDir, "01-google-auth-audience.png"),
      note: `Project route ${route.label}; project_id=${route.projectId}; OAuth client prefix=${route.clientPrefix}. Shows publishing status and user type.`,
    },
    {
      title: `${route.projectName} - OAuth clients`,
      path: path.join(routeDir, "02-google-auth-oauth-clients.png"),
      note: `Shows OAuth 2.0 client list for ${route.label}. Client secret values are not shown.`,
    },
    {
      title: `${route.projectName} - Data Access / Scopes`,
      path: path.join(routeDir, "03-google-auth-data-access.png"),
      note: `Shows Data Access / scopes page for ${route.label}.`,
    },
    ...sharedEvidence,
  ];

  for (const page of routePages) {
    if (!fs.existsSync(page.path)) throw new Error(`Missing screenshot: ${page.path}`);
  }

  const htmlPath = path.join(routeDir, `${route.route}-conditional-ui-screenshots-evidence-${stamp}.html`);
  const pdfPath = path.join(routeDir, `${route.route}-conditional-ui-screenshots-evidence-${stamp}.pdf`);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(route.label)} conditional UI screenshots evidence</title>
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
${routePages.map(pageHtml).join("\n")}
</body>
</html>
`;
  await fsp.writeFile(htmlPath, html, "utf8");
  const result = await printHtmlToPdf(htmlPath, pdfPath);
  const manifest = {
    generatedAt: new Date().toISOString(),
    route,
    note: "PDF made from real UI screenshots for the conditional supporting-documents field in the YouTube API quota/compliance form.",
    html: path.relative(projectRoot, htmlPath),
    pdf: path.relative(projectRoot, pdfPath),
    bytes: result.bytes,
    pages: routePages.map((page) => ({
      title: page.title,
      file: path.relative(routeDir, page.path),
      note: page.note,
    })),
    stderrTail: result.stderrTail,
  };
  const manifestPath = path.join(routeDir, `${route.route}-conditional-ui-screenshots-evidence-${stamp}.json`);
  await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  built.push({ route: route.route, projectId: route.projectId, pdf: manifest.pdf, bytes: result.bytes });
}

const indexPath = path.join(baseDir, `all-projects-conditional-ui-screenshots-evidence-${stamp}.json`);
await fsp.writeFile(indexPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), built }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ built, index: path.relative(projectRoot, indexPath) }, null, 2));
