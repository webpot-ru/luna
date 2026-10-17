import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";

async function main() {
  const listPath = process.argv[2];
  if (!listPath) {
    console.error("Usage: node screenshot-batch.mjs <list_json_path>");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const { rendererPath, tasks } = payload;

  console.log(`[Batch Screenshot] Starting batch screenshot for ${tasks.length} tasks...`);
  const startTime = Date.now();

  const numWorkers = Math.min(4, os.cpus().length || 1);
  console.log(`[Batch Screenshot] Spawning ${numWorkers} parallel worker pages...`);

  const browser = await chromium.launch();

  // Partition tasks among workers
  const chunks = Array.from({ length: numWorkers }, () => []);
  for (let i = 0; i < tasks.length; i++) {
    chunks[i % numWorkers].push(tasks[i]);
  }

  const runWorker = async (workerId, taskChunk) => {
    if (taskChunk.length === 0) return;
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Load renderer template once
    // Preserve the load gate (including styles/fonts), but allow a busy runner
    // more than Playwright's default 30 seconds. Never capture a partial page.
    await page.goto(`file://${rendererPath}`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => typeof window.renderTask === "function", null, { timeout: 30000 });
    
    // Give browser brief time to initialize Tailwind / Fonts
    await page.waitForTimeout(200);

    for (let i = 0; i < taskChunk.length; i++) {
      const task = taskChunk[i];
      
      // Update DOM dynamically in client page
      await page.evaluate(async (t) => {
        window.renderTask(t);
        await Promise.race([
          document.fonts.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Renderer fonts not ready")), 30000)),
        ]);
      }, task);
      
      // Capture screenshot
      await page.screenshot({ path: task.pngPath, type: 'jpeg', quality: 98 });
    }
    await page.close();
  };

  await Promise.all(
    chunks.map((chunk, index) => runWorker(index, chunk))
  );

  await browser.close();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Batch Screenshot] Completed in ${elapsed}s.`);
}

main().catch((err) => {
  console.error("Batch screenshot failed:", err);
  process.exit(1);
});
