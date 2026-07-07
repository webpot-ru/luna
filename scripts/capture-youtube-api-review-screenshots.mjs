#!/usr/bin/env node
import fs from "node:fs/promises";
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
    key: "youtube-api-disclosure",
    url: "https://flashcardsluna.com/en/youtube-api-disclosure",
    output: `project-1-youtube-api-disclosure-review-screenshot-${stamp}.png`,
    mode: "fullPage",
  },
  {
    key: "privacy",
    url: "https://flashcardsluna.com/en/privacy",
    output: `project-1-privacy-review-screenshot-${stamp}.png`,
    mode: "fullPage",
  },
  {
    key: "homepage-footer",
    url: "https://flashcardsluna.com/en",
    output: `project-1-homepage-footer-privacy-youtube-review-screenshot-${stamp}.png`,
    mode: "footerViewport",
  },
  {
    key: "terms",
    url: "https://flashcardsluna.com/en/terms",
    output: `project-1-terms-review-screenshot-${stamp}.png`,
    mode: "fullPage",
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 20000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

async function createCdpClient(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(JSON.stringify(payload.error)));
    else resolve(payload.result || {});
  });

  return {
    send(method, params = {}) {
      const messageId = ++id;
      ws.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
      });
    },
    close() {
      ws.close();
    },
  };
}

async function captureJob(job) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const userDataDir = `/private/tmp/fcl-cdp-shot-${job.key}-${Date.now()}`;
  const outputPath = path.join(outDir, job.output);
  const child = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1200",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ], {
    cwd: projectRoot,
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  let client;
  try {
    const pages = await waitForJson(`http://127.0.0.1:${port}/json`);
    const page = pages.find((entry) => entry.type === "page") || pages[0];
    client = await createCdpClient(page.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Page.navigate", { url: job.url });
    await delay(5000);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await client.send("Runtime.evaluate", {
        expression: `
          (() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const reject = buttons.find((button) => /reject optional/i.test(button.textContent || ''));
            if (reject) {
              reject.click();
              return true;
            }
            return false;
          })()
        `,
      });
      await delay(500);
    }
    await delay(3000);

    if (job.mode === "footerViewport") {
      await client.send("Runtime.evaluate", {
        expression: "window.scrollTo(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));",
      });
      await delay(1200);
      const result = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
      });
      await fs.writeFile(outputPath, Buffer.from(result.data, "base64"));
    } else {
      const metrics = await client.send("Page.getLayoutMetrics");
      const content = metrics.cssContentSize || metrics.contentSize;
      const width = Math.ceil(Math.min(1440, content.width || 1440));
      const height = Math.ceil(Math.min(16000, content.height || 1200));
      const result = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      });
      await fs.writeFile(outputPath, Buffer.from(result.data, "base64"));
    }

    const stat = await fs.stat(outputPath);
    if (stat.size < 10000) {
      throw new Error(`Screenshot looks too small: ${outputPath} (${stat.size} bytes)`);
    }
    return {
      key: job.key,
      url: job.url,
      mode: job.mode,
      png: path.relative(projectRoot, outputPath),
      bytes: stat.size,
      stderrTail: stderr.split("\n").slice(-6).join("\n"),
    };
  } finally {
    if (client) client.close();
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("close", resolve));
  }
}

await fs.mkdir(outDir, { recursive: true });
const results = [];
for (const job of jobs) {
  console.log(`capture ${job.key}: ${job.url}`);
  results.push(await captureJob(job));
}

const manifest = {
  generatedAt: new Date().toISOString(),
  note: "Review-ready Chrome DevTools Protocol PNG screenshots of live public FlashcardsLuna pages for the Google YouTube API quota/compliance form. These are visual screenshots, not text PDFs.",
  recommendedUploads: {
    privacyPolicyScreenshots: [
      `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-youtube-api-disclosure-review-screenshot-${stamp}.png`,
      `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-privacy-review-screenshot-${stamp}.png`,
    ],
    homepagePrivacyYoutubeBrandScreenshot: `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-homepage-footer-privacy-youtube-review-screenshot-${stamp}.png`,
    termsDocumentation: `outputs/youtube-api-quota-evidence/project-1-20260622/project-1-terms-review-screenshot-${stamp}.png`,
  },
  results,
};

const manifestPath = path.join(outDir, `review-ready-png-screenshots-manifest-${stamp}.json`);
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
