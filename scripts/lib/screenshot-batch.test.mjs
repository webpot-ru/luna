import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { renderScreenshotBatch } from "./screenshot-batch.mjs";

// Keep real browser evidence inside the project; do not install a browser.
const reviewRoot = path.resolve("scratch/screenshot-batch-regression");
fs.mkdirSync(reviewRoot, { recursive: true });
const directory = fs.mkdtempSync(path.join(reviewRoot, "run-"));
const launchOptions = process.env.SCREENSHOT_TEST_BROWSER_CHANNEL
  ? { channel: process.env.SCREENSHOT_TEST_BROWSER_CHANNEL }
  : {};

function fixture(name, fontReady) {
  const file = path.join(directory, `${name}.html`);
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; background: #f4f8fd; color: #0e224e; font: 64px sans-serif; }
  </style><script>
    window.fontsSettled = false;
    window.pendingFontTimers = new Set();
    const originalSetTimeout = window.setTimeout.bind(window);
    const originalClearTimeout = window.clearTimeout.bind(window);
    window.setTimeout = (fn, ms) => {
      const id = originalSetTimeout(() => { pendingFontTimers.delete(id); fn(); }, ms);
      pendingFontTimers.add(id); return id;
    };
    window.clearTimeout = (id) => { pendingFontTimers.delete(id); originalClearTimeout(id); };
    Object.defineProperty(document.fonts, "ready", { get: () => ${fontReady} });
    window.renderTask = task => { document.body.textContent = task.options.text; };
  </script>`);
  return file;
}

test("delayed fonts settle before capture; all timeout stages use the same bounded budget", async () => {
  // This exceeds the old 30s font deadline while remaining within the 120s
  // production budget. Cache the promise as the real FontFaceSet does.
  const rendererPath = fixture("delayed", "(window.fontPromise ||= new Promise(resolve => setTimeout(() => { window.fontsSettled = true; resolve(); }, 31000)))");
  const pngPath = path.join(directory, "hy-ko-lo-lt.jpg");
  let browser;
  let captureCount = 0;
  await renderScreenshotBatch({ rendererPath, tasks: [{ pngPath, options: { text: "Հայերեն · 한국어 · ພາສາລາວ · lietuvių" } }] }, {
    workerCount: 1,
    launchBrowser: async () => {
      browser = await chromium.launch(launchOptions);
      const newPage = browser.newPage.bind(browser);
      browser.newPage = async () => {
        const page = await newPage();
        const screenshot = page.screenshot.bind(page);
        page.screenshot = async options => {
          assert.equal(options.timeout, 120000);
          assert.equal(await page.evaluate(() => window.fontsSettled), true);
          assert.equal(await page.evaluate(() => window.pendingFontTimers.size), 0);
          captureCount++;
          return screenshot(options);
        };
        return page;
      };
      return browser;
    },
  });
  assert.equal(captureCount, 1);
  assert.equal(browser.isConnected(), false);
  const jpeg = fs.readFileSync(pngPath);
  assert.equal(jpeg[0], 0xff);
  assert.equal(jpeg[1], 0xd8);
});

test("unready fonts fail closed without a screenshot and close page and browser", async () => {
  const rendererPath = fixture("never-ready", "new Promise(() => {})");
  const pngPath = path.join(directory, "must-not-exist.jpg");
  let browser, page;
  await assert.rejects(renderScreenshotBatch({ rendererPath, tasks: [{ pngPath, options: { text: "HY" } }] }, {
    timeoutMs: 1000,
    workerCount: 1,
    launchBrowser: async () => {
      browser = await chromium.launch(launchOptions);
      const newPage = browser.newPage.bind(browser);
      browser.newPage = async () => (page = await newPage());
      return browser;
    },
  }), /Renderer fonts not ready/);
  assert.equal(fs.existsSync(pngPath), false);
  assert.equal(page.isClosed(), true);
  assert.equal(browser.isConnected(), false);
});

test("a screenshot failure closes all concurrent workers without retry", async () => {
  const rendererPath = fixture("capture-failure", "Promise.resolve()");
  let browser;
  const pages = [];
  let attempts = 0;
  await assert.rejects(renderScreenshotBatch({ rendererPath, tasks: [1, 2].map(n => ({ pngPath: path.join(directory, `failed-${n}.jpg`), options: { text: String(n) } })) }, {
    workerCount: 2,
    launchBrowser: async () => {
      browser = await chromium.launch(launchOptions);
      const newPage = browser.newPage.bind(browser);
      browser.newPage = async () => {
        const page = await newPage();
        pages.push(page);
        page.screenshot = async () => { attempts++; throw new Error("Injected screenshot timeout"); };
        return page;
      };
      return browser;
    },
  }), /Injected screenshot timeout/);
  assert.ok(attempts >= 1 && attempts <= 2);
  assert.ok(pages.every(page => page.isClosed()));
  assert.equal(browser.isConnected(), false);
});

test("invalid worker count is rejected before Chromium starts", async () => {
  await assert.rejects(renderScreenshotBatch({ tasks: [] }, {
    workerCount: 0,
    launchBrowser: async () => { throw new Error("must not launch"); },
  }), /workers must be 1..4/);
});

console.log(`Browser regression artifacts: ${directory}`);
