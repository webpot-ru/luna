import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import { pathToFileURL } from "node:url";

export async function renderScreenshotBatch(payload, {
  launchBrowser = () => chromium.launch(),
  timeoutMs = 120000,
  workerCount = Math.min(4, os.availableParallelism()),
} = {}) {
  const { rendererPath, tasks } = payload;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("Screenshot timeout must be positive");
  if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > 4) throw new Error("Screenshot workers must be 1..4");

  console.log(`[Batch Screenshot] Starting batch screenshot for ${tasks.length} tasks...`);
  const startTime = Date.now();

  const numWorkers = Math.min(workerCount, tasks.length);
  console.log(`[Batch Screenshot] Spawning ${numWorkers} parallel worker pages...`);

  if (!tasks.length) return;
  const browser = await launchBrowser();

  // Partition tasks among workers
  const chunks = Array.from({ length: numWorkers }, () => []);
  for (let i = 0; i < tasks.length; i++) {
    chunks[i % numWorkers].push(tasks[i]);
  }

  const runWorker = async (workerId, taskChunk) => {
    if (taskChunk.length === 0) return;

    const page = await browser.newPage();
    try {
      page.setDefaultTimeout(timeoutMs);
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Load renderer template once
      // Preserve the load gate (including styles/fonts), but allow a busy runner
      // more than Playwright's default 30 seconds. Never capture a partial page.
      await page.goto(pathToFileURL(rendererPath).href, { waitUntil: "load", timeout: timeoutMs });
      await page.waitForFunction(() => typeof window.renderTask === "function", null, { timeout: timeoutMs });

      // Give browser brief time to initialize Tailwind / Fonts
      await page.waitForTimeout(200);

      for (let i = 0; i < taskChunk.length; i++) {
        const task = taskChunk[i];

        // Update DOM dynamically in client page
        await page.evaluate(async ({ task, timeoutMs }) => {
          window.renderTask(task);
          let timer;
          try {
            await Promise.race([
              document.fonts.ready,
              new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Renderer fonts not ready")), timeoutMs); }),
            ]);
          } finally {
            clearTimeout(timer);
          }
        }, { task, timeoutMs });

        // Capture screenshot
        await page.screenshot({ path: task.pngPath, type: 'jpeg', quality: 98, timeout: timeoutMs });
      }
    } finally {
      await page.close();
    }
  };

  try {
    await Promise.all(chunks.map((chunk, index) => runWorker(index, chunk)));
  } finally {
    await browser.close();
  }
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Batch Screenshot] Completed in ${elapsed}s.`);
}

async function main() {
  const listPath = process.argv[2];
  if (!listPath) throw new Error("Usage: node screenshot-batch.mjs <list_json_path>");
  await renderScreenshotBatch(JSON.parse(fs.readFileSync(listPath, "utf8")));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("Batch screenshot failed:", err);
    process.exitCode = 1;
  });
}
