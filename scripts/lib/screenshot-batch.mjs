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
    await page.goto(`file://${rendererPath}`);
    
    // Give browser brief time to initialize Tailwind / Fonts
    await page.waitForTimeout(200);

    for (let i = 0; i < taskChunk.length; i++) {
      const task = taskChunk[i];
      
      // Update DOM dynamically in client page
      await page.evaluate((t) => {
        window.renderTask(t);
      }, task);
      
      // Wait for all images to load (flags)
      await page.evaluate(async () => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const promises = imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });
        await Promise.all(promises);
      });
      
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
