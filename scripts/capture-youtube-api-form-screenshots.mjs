#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outDir = path.join(projectRoot, "outputs/youtube-api-quota-evidence/project-1-20260622");
const stamp = "20260623";

const pages = {
  privacy: "https://flashcardsluna.com/en/privacy",
  cookiePolicy: "https://flashcardsluna.com/en/cookie-policy",
  privacyChoices: "https://flashcardsluna.com/en/privacy-choices",
  youtubeDisclosure: "https://flashcardsluna.com/en/youtube-api-disclosure",
  terms: "https://flashcardsluna.com/en/terms",
  homepage: "https://flashcardsluna.com/en",
};

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function openPage(browser, url) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  return { page, status: response?.status() ?? null };
}

async function captureFullPage(browser, key, url, requiredText = []) {
  const { page, status } = await openPage(browser, url);
  const title = await page.title();
  const bodyText = await page.locator("body").innerText({ timeout: 8000 });
  const missing = requiredText.filter((needle) => !bodyText.toLowerCase().includes(needle.toLowerCase()));
  const pngPath = path.join(outDir, `project-1-${key}-live-screenshot-${stamp}.png`);
  const pdfPath = path.join(outDir, `project-1-${key}-live-screenshot-${stamp}.pdf`);
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await page.close();
  return {
    key,
    url,
    status,
    title,
    textLength: bodyText.length,
    missing,
    png: path.relative(projectRoot, pngPath),
    pdf: path.relative(projectRoot, pdfPath),
  };
}

async function captureHomepageEvidence(browser) {
  const { page, status } = await openPage(browser, pages.homepage);
  const title = await page.title();
  const bodyText = await page.locator("body").innerText({ timeout: 8000 });
  const footer = page.locator("footer");
  await footer.waitFor({ state: "visible", timeout: 10000 });
  const footerText = await footer.innerText({ timeout: 5000 });

  const fullPng = path.join(outDir, `project-1-homepage-full-live-screenshot-${stamp}.png`);
  const footerPng = path.join(outDir, `project-1-homepage-footer-privacy-youtube-live-screenshot-${stamp}.png`);
  const pdfPath = path.join(outDir, `project-1-homepage-footer-privacy-youtube-live-screenshot-${stamp}.pdf`);
  await page.screenshot({ path: fullPng, fullPage: true });
  await footer.screenshot({ path: footerPng });
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await page.close();

  return {
    key: "homepage",
    url: pages.homepage,
    status,
    title,
    textLength: bodyText.length,
    footerText,
    hasPrivacyInFooter: /privacy/i.test(footerText),
    hasYoutubeInPage: /youtube/i.test(bodyText),
    hasYoutubeInFooter: /youtube/i.test(footerText),
    fullPng: path.relative(projectRoot, fullPng),
    footerPng: path.relative(projectRoot, footerPng),
    pdf: path.relative(projectRoot, pdfPath),
  };
}

async function buildScreenshotPdf(browser, name, screenshotPaths, title) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
  const imageHtml = screenshotPaths
    .map((filePath, index) => {
      const absolute = path.join(projectRoot, filePath);
      const src = `file://${absolute}`;
      return `
        <section class="shot">
          <h2>${index + 1}. ${path.basename(filePath)}</h2>
          <img src="${src}" alt="">
        </section>`;
    })
    .join("\n");
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { margin: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
          .cover { padding: 28px 32px 14px; border-bottom: 1px solid #d1d5db; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0; font-size: 13px; color: #4b5563; }
          .shot { break-before: page; padding: 16px 20px 24px; }
          .shot:first-of-type { break-before: auto; }
          h2 { margin: 0 0 10px; font-size: 14px; color: #374151; }
          img { width: 100%; height: auto; border: 1px solid #d1d5db; display: block; }
        </style>
      </head>
      <body>
        <div class="cover">
          <h1>${title}</h1>
          <p>Browser screenshots captured from live public FlashcardsLuna pages on 2026-06-23.</p>
        </div>
        ${imageHtml}
      </body>
    </html>`, { waitUntil: "load" });
  const pdfPath = path.join(outDir, name);
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await page.close();
  return path.relative(projectRoot, pdfPath);
}

await fs.mkdir(outDir, { recursive: true });
const browser = await launchBrowser();

const privacy = await captureFullPage(browser, "privacy-policy", pages.privacy, [
  "YouTube API Disclosure",
  "support@flashcardsluna.com",
  "deletion",
]);
const youtubeDisclosure = await captureFullPage(browser, "youtube-api-disclosure", pages.youtubeDisclosure, [
  "Google Privacy Policy",
  "YouTube API Services Terms",
  "revoked",
  "delete",
  "support@flashcardsluna.com",
]);
const privacyChoices = await captureFullPage(browser, "privacy-choices", pages.privacyChoices, [
  "Do Not Sell or Share",
  "support@flashcardsluna.com",
]);
const terms = await captureFullPage(browser, "terms-of-service", pages.terms, [
  "Terms of Service",
  "YouTube API Disclosure",
  "support@flashcardsluna.com",
]);
const homepage = await captureHomepageEvidence(browser);

const privacyCombinedPdf = await buildScreenshotPdf(
  browser,
  `project-1-privacy-youtube-api-live-screenshots-combined-${stamp}.pdf`,
  [privacy.png, youtubeDisclosure.png, privacyChoices.png],
  "FlashcardsLuna Privacy and YouTube API Screenshots"
);
const termsCombinedPdf = await buildScreenshotPdf(
  browser,
  `project-1-terms-live-screenshots-combined-${stamp}.pdf`,
  [terms.png],
  "FlashcardsLuna Terms of Service Screenshot"
);

await browser.close();

const manifest = {
  generatedAt: new Date().toISOString(),
  note: "These are real browser screenshots from live public FlashcardsLuna URLs, created for the Google YouTube API quota/compliance form.",
  recommendedUploads: {
    privacyPolicyScreenshots: privacyCombinedPdf,
    homepagePrivacyYoutubeBrandScreenshot: homepage.footerPng,
    termsDocumentation: termsCombinedPdf,
  },
  captures: {
    privacy,
    youtubeDisclosure,
    privacyChoices,
    terms,
    homepage,
  },
  warning:
    "If homepage.hasYoutubeInFooter is false, the homepage footer screenshot may show the Privacy link but not YouTube branding in the same cropped footer image. Use the full homepage screenshot or update the site footer if Google strictly requires both in one viewport.",
};

const manifestPath = path.join(outDir, `live-screenshot-evidence-manifest-${stamp}.json`);
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
