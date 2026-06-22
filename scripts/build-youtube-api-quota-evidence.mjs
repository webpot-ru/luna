#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const today = new Date().toISOString().slice(0, 10);
const outDir = path.join(projectRoot, "outputs/youtube-api-quota-evidence/project-1-20260622");

const refs = {
  publicSite: "https://flashcardsluna.com",
  privacyUrl: "https://flashcardsluna.com/privacy",
  termsUrl: "https://flashcardsluna.com/terms",
  googlePrivacy: "https://policies.google.com/privacy",
  googleConnections: "https://myaccount.google.com/connections",
  youtubeApiTerms: "https://developers.google.com/youtube/terms/api-services-terms-of-service",
  youtubeApiPolicies: "https://developers.google.com/youtube/terms/developer-policies",
  repo: "https://github.com/webpot-ru/luna",
  mainChannel: "https://www.youtube.com/@flashcardsluna",
  ruChannel: "https://www.youtube.com/@LunaCardsRU",
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function pageShell({ title, subtitle, status, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #5b667c;
      --line: #d9e2ef;
      --paper: #ffffff;
      --soft: #f5f8fc;
      --blue: #2563eb;
      --green: #0f766e;
      --red: #b42318;
      --yellow: #a15c00;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef3f8;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.45;
    }
    .page {
      width: 1120px;
      min-height: 1440px;
      margin: 0 auto;
      padding: 54px 62px 72px;
      background: var(--paper);
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      padding-bottom: 28px;
      border-bottom: 2px solid var(--line);
    }
    .brand {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #1d4ed8, #10b981);
      position: relative;
    }
    .logo::after {
      content: "";
      position: absolute;
      inset: 9px 10px 9px 13px;
      background: white;
      clip-path: polygon(0 0, 100% 50%, 0 100%);
    }
    h1 {
      margin: 26px 0 8px;
      font-size: 36px;
      line-height: 1.08;
      letter-spacing: 0;
    }
    h2 {
      margin: 34px 0 14px;
      font-size: 22px;
      letter-spacing: 0;
    }
    h3 {
      margin: 22px 0 8px;
      font-size: 17px;
      letter-spacing: 0;
    }
    p { margin: 8px 0 12px; }
    ul { margin: 8px 0 16px 22px; padding: 0; }
    li { margin: 5px 0; }
    .meta {
      text-align: right;
      color: var(--muted);
      font-size: 13px;
      max-width: 370px;
    }
    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 6px;
      background: #e7f0ff;
      color: #174ea6;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status {
      margin-top: 18px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-left: 5px solid ${status === "ready" ? "var(--green)" : status === "warning" ? "var(--yellow)" : "var(--blue)"};
      background: var(--soft);
      border-radius: 8px;
      font-size: 15px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin: 16px 0;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px 18px;
      background: #fbfdff;
    }
    .callout {
      border: 1px solid #fde68a;
      border-left: 5px solid var(--yellow);
      border-radius: 8px;
      padding: 13px 16px;
      background: #fffbeb;
    }
    .ok {
      border-left-color: var(--green);
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .danger {
      border-left-color: var(--red);
      background: #fff1f2;
      border-color: #fecdd3;
    }
    code, .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    a { color: var(--blue); word-break: break-word; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 20px;
      font-size: 14px;
    }
    th, td {
      text-align: left;
      vertical-align: top;
      border: 1px solid var(--line);
      padding: 9px 10px;
    }
    th { background: #f2f6fb; }
    footer {
      margin-top: 42px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    .youtube {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #b91c1c;
      font-weight: 800;
    }
    .yt-icon {
      width: 30px;
      height: 21px;
      border-radius: 6px;
      background: #ff0000;
      display: inline-block;
      position: relative;
    }
    .yt-icon::after {
      content: "";
      position: absolute;
      left: 12px;
      top: 5px;
      border-left: 8px solid white;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
    }
    @media print {
      body { background: white; }
      .page { width: auto; min-height: auto; margin: 0; padding: 36px 42px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div class="brand">
        <div class="brand-mark"><span class="logo"></span>FlashcardsLuna</div>
        <div class="badge">YouTube API quota evidence</div>
      </div>
      <div class="meta">
        <div>${esc(subtitle)}</div>
        <div>Prepared: ${esc(today)}</div>
        <div>Project: YouTube Data API quota extension / Project 1</div>
      </div>
    </header>
    <h1>${esc(title)}</h1>
    ${status ? `<div class="status">${status}</div>` : ""}
    ${body}
    <footer>
      This file contains non-secret supporting evidence for the YouTube API Services Audit and Quota Extension form. It must not include OAuth tokens, client secrets, refresh tokens, GitHub secrets, cookies, private keys, or private user data.
    </footer>
  </main>
</body>
</html>`;
}

const privacyHtml = pageShell({
  title: "Privacy Policy Evidence: YouTube Data API Use",
  subtitle: refs.privacyUrl,
  status: `<strong>Status:</strong> upload-ready evidence draft. The same content should be published at <a href="${refs.privacyUrl}">${refs.privacyUrl}</a> before final submission, because the live privacy page currently needs readback confirmation.`,
  body: `
    <div class="callout danger">
      <strong>Submit blocker:</strong> this document is suitable as supporting evidence, but Google also asks for a public privacy policy URL. Before submitting, verify that the public page at <span class="mono">${refs.privacyUrl}</span> renders equivalent text, including the YouTube/Google sections below.
    </div>

    <h2>What FlashcardsLuna Collects</h2>
    <p>FlashcardsLuna creates and publishes educational flashcard and language-learning content. Public learners can browse the website without signing in. The YouTube API workflow is an internal owner-operated publishing tool used by FlashcardsLuna administrators and GitHub Actions runners.</p>
    <ul>
      <li>We do not collect Google passwords, YouTube passwords, OAuth refresh tokens from public users, or payment information through the YouTube API workflow.</li>
      <li>We do not download, scrape, sell, or republish third-party YouTube content.</li>
      <li>We use YouTube API access only for owner-managed YouTube Brand Channels that have been explicitly authorized by the channel owner.</li>
    </ul>

    <h2>YouTube Data API Access</h2>
    <p>The internal API client uses OAuth authorization for owner-managed channels. The current project scope is <span class="mono">https://www.googleapis.com/auth/youtube.force-ssl</span>. It is used for these operational actions only:</p>
    <div class="grid">
      <div class="card">
        <h3>Publishing</h3>
        <ul>
          <li>Upload FlashcardsLuna-owned/generated lesson videos.</li>
          <li>Set video title, description, tags, category and language metadata.</li>
          <li>Schedule private uploads with future <span class="mono">publishAt</span> so YouTube publishes them later.</li>
          <li>Set custom thumbnails generated for the same lesson.</li>
        </ul>
      </div>
      <div class="card">
        <h3>Channel and Playlist Management</h3>
        <ul>
          <li>Create or reuse owner-managed playlists.</li>
          <li>Add uploaded videos to the correct playlist.</li>
          <li>Read back video, playlist and channel IDs to prevent duplicate uploads and wrong-channel publication.</li>
          <li>Update approved channel description, banner and watermark assets for owner-managed channels.</li>
        </ul>
      </div>
    </div>

    <h2>Google Privacy Policy and YouTube API Policies</h2>
    <p>Use of YouTube API Services is also governed by Google and YouTube API policies. Users can review Google privacy practices and account controls through these links:</p>
    <table>
      <tr><th>Policy / control</th><th>URL</th></tr>
      <tr><td>Google Privacy Policy</td><td><a href="${refs.googlePrivacy}">${refs.googlePrivacy}</a></td></tr>
      <tr><td>YouTube API Services Terms of Service</td><td><a href="${refs.youtubeApiTerms}">${refs.youtubeApiTerms}</a></td></tr>
      <tr><td>YouTube API Services Developer Policies</td><td><a href="${refs.youtubeApiPolicies}">${refs.youtubeApiPolicies}</a></td></tr>
      <tr><td>Google Account third-party connections / revoke access</td><td><a href="${refs.googleConnections}">${refs.googleConnections}</a></td></tr>
    </table>

    <h2>Data Deletion and Access Revocation</h2>
    <ul>
      <li>Channel owners can revoke the OAuth access granted to the FlashcardsLuna API client from Google Account connections: <a href="${refs.googleConnections}">${refs.googleConnections}</a>.</li>
      <li>After revocation, the publishing workflow cannot write to that channel until it is re-authorized.</li>
      <li>Operational run logs and non-secret registries store only publication evidence such as channel ID, video ID, playlist ID, status, timestamps and quota/readback errors.</li>
      <li>Requests to remove local operational publication records can be sent through the FlashcardsLuna contact channel that appears on the public website or YouTube profile.</li>
      <li>OAuth tokens, if used by automation, are stored as private local/GitHub secrets and are not published, printed, committed, or included in evidence uploads.</li>
    </ul>

    <h2>Retention and Security</h2>
    <ul>
      <li>Publication metadata is retained as long as needed to avoid duplicate uploads, track scheduled publication status and audit quota usage.</li>
      <li>Private OAuth credentials and tokens are excluded from the public repository and from this evidence package.</li>
      <li>The API workflow is not available to public site visitors.</li>
    </ul>
  `,
});

const homepageHtml = pageShell({
  title: "Homepage Evidence: Privacy Link and YouTube Branding",
  subtitle: refs.publicSite,
  status: `<strong>Status:</strong> supporting evidence draft. Use alongside a live homepage screenshot after the site footer/public homepage visibly shows the privacy link and YouTube channel/brand link.`,
  body: `
    <div class="callout">
      <strong>Important:</strong> Google asks for a screenshot of the homepage that shows where the Privacy Policy link is located and where the YouTube brand is visible. This evidence page documents the intended compliant homepage/footer placement. Before submission, capture a live screenshot from <span class="mono">${refs.publicSite}</span> if the live page visibly includes these items.
    </div>

    <h2>Required homepage placement</h2>
    <div class="card">
      <h3>FlashcardsLuna public footer should show:</h3>
      <ul>
        <li>Privacy Policy: <a href="${refs.privacyUrl}">${refs.privacyUrl}</a></li>
        <li>Terms of Service: <a href="${refs.termsUrl}">${refs.termsUrl}</a></li>
        <li><span class="youtube"><span class="yt-icon"></span>YouTube</span> channel link: <a href="${refs.mainChannel}">${refs.mainChannel}</a></li>
        <li>Optional secondary owner-managed channel example: <a href="${refs.ruChannel}">${refs.ruChannel}</a></li>
      </ul>
    </div>

    <h2>API client disclosure</h2>
    <p>The public homepage may describe FlashcardsLuna as a flashcard learning platform. It does not need to expose the internal GitHub Actions uploader, but the Privacy Policy and Terms pages should disclose that owner-managed YouTube channels are published through YouTube API Services.</p>

    <h2>Example public footer layout for reviewer screenshot</h2>
    <table>
      <tr><th>Footer item</th><th>Visible text</th><th>Destination</th></tr>
      <tr><td>Privacy Policy</td><td>Privacy</td><td>${refs.privacyUrl}</td></tr>
      <tr><td>Terms of Service</td><td>Terms</td><td>${refs.termsUrl}</td></tr>
      <tr><td>YouTube brand/channel</td><td>YouTube / FlashcardsLuna on YouTube</td><td>${refs.mainChannel}</td></tr>
      <tr><td>Contact / support</td><td>Contact</td><td>Public site or YouTube profile contact surface</td></tr>
    </table>

    <h2>Non-secret project identity evidence</h2>
    <ul>
      <li>Public site: <a href="${refs.publicSite}">${refs.publicSite}</a></li>
      <li>Public repository: <a href="${refs.repo}">${refs.repo}</a></li>
      <li>Public YouTube channel example: <a href="${refs.mainChannel}">${refs.mainChannel}</a></li>
    </ul>
  `,
});

const termsHtml = pageShell({
  title: "Terms of Service Evidence",
  subtitle: refs.termsUrl,
  status: `<strong>Status:</strong> upload-ready evidence draft. The same terms should be available at <a href="${refs.termsUrl}">${refs.termsUrl}</a> before final submission.`,
  body: `
    <div class="callout">
      <strong>Purpose:</strong> this document summarizes the Terms of Service disclosures relevant to the YouTube API quota extension review. It does not include secrets or private account data.
    </div>

    <h2>FlashcardsLuna Terms Summary</h2>
    <ul>
      <li>FlashcardsLuna provides educational flashcard and language-learning materials.</li>
      <li>Video lessons, thumbnails, playlists, channel descriptions and learning metadata are created or curated by FlashcardsLuna for owner-managed YouTube channels.</li>
      <li>Users must not misuse the site, copy automated content at scale, attempt to access private workflows, or interfere with publication systems.</li>
      <li>The public website does not give users direct access to the internal YouTube API client.</li>
    </ul>

    <h2>YouTube API Services Terms</h2>
    <p>FlashcardsLuna's internal publishing workflow must follow YouTube API Services terms and policies:</p>
    <table>
      <tr><th>Document</th><th>URL</th></tr>
      <tr><td>YouTube API Services Terms of Service</td><td><a href="${refs.youtubeApiTerms}">${refs.youtubeApiTerms}</a></td></tr>
      <tr><td>YouTube API Services Developer Policies</td><td><a href="${refs.youtubeApiPolicies}">${refs.youtubeApiPolicies}</a></td></tr>
      <tr><td>Google Privacy Policy</td><td><a href="${refs.googlePrivacy}">${refs.googlePrivacy}</a></td></tr>
    </table>

    <h2>Content and Ownership</h2>
    <ul>
      <li>FlashcardsLuna uploads its own generated educational videos and metadata to owner-managed channels.</li>
      <li>The workflow does not upload third-party videos as if they were FlashcardsLuna content.</li>
      <li>The workflow does not post comments, scrape YouTube, or distribute YouTube API access to public users.</li>
    </ul>

    <h2>Changes, Contact and Removal Requests</h2>
    <ul>
      <li>Terms and policy pages may be updated as the publishing workflow changes.</li>
      <li>Channel owners can revoke OAuth access through Google Account connections.</li>
      <li>Requests about publication records, privacy or deletion can be sent through the public site/contact surface or YouTube channel contact surface.</li>
    </ul>
  `,
});

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function renderPage(browser, name, html) {
  const htmlPath = path.join(outDir, `${name}.html`);
  const pngPath = path.join(outDir, `${name}.png`);
  const pdfPath = path.join(outDir, `${name}.pdf`);
  await fs.writeFile(htmlPath, html, "utf8");
  const page = await browser.newPage({ viewport: { width: 1120, height: 1440 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.pdf({
    path: pdfPath,
    width: "1120px",
    printBackground: true,
    margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
  });
  await page.close();
  return {
    html: path.relative(projectRoot, htmlPath),
    png: path.relative(projectRoot, pngPath),
    pdf: path.relative(projectRoot, pdfPath),
  };
}

async function captureLive(browser, name, url) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 });
  const pngPath = path.join(outDir, `${name}.png`);
  const pdfPath = path.join(outDir, `${name}.pdf`);
  let status = null;
  let title = "";
  let textSample = "";
  let ok = false;
  let error = "";
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    status = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    title = await page.title();
    textSample = (await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")).replace(/\s+/gu, " ").slice(0, 600);
    await page.screenshot({ path: pngPath, fullPage: true });
    await page.pdf({ path: pdfPath, printBackground: true, format: "A4" });
    ok = Boolean(status && status >= 200 && status < 400);
  } catch (e) {
    error = e?.message || String(e);
  } finally {
    await page.close().catch(() => {});
  }
  return {
    url,
    status,
    ok,
    title,
    textSample,
    error,
    png: ok || !error ? path.relative(projectRoot, pngPath) : "",
    pdf: ok || !error ? path.relative(projectRoot, pdfPath) : "",
  };
}

if (!process.argv.includes("--allow-playwright")) {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("python3", ["scripts/build-youtube-api-quota-evidence.py"], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

await fs.mkdir(outDir, { recursive: true });
const browser = await launchBrowser();
const rendered = {
  privacyEvidence: await renderPage(browser, "project-1-privacy-policy-youtube-api-evidence", privacyHtml),
  homepageEvidence: await renderPage(browser, "project-1-homepage-privacy-youtube-brand-evidence", homepageHtml),
  termsEvidence: await renderPage(browser, "project-1-terms-of-service-evidence", termsHtml),
};
const live = {
  homepage: await captureLive(browser, "live-homepage-readback", refs.publicSite),
  privacy: await captureLive(browser, "live-privacy-readback", refs.privacyUrl),
  terms: await captureLive(browser, "live-terms-readback", refs.termsUrl),
};
await browser.close();

const manifest = {
  generatedAt: new Date().toISOString(),
  purpose: "YouTube API Services Audit and Quota Extension Form supporting evidence for Project 1.",
  uploadRecommendation: {
    privacyPolicyScreenshot: rendered.privacyEvidence.pdf,
    homepagePrivacyYoutubeBrandScreenshot: rendered.homepageEvidence.pdf,
    termsDocumentation: rendered.termsEvidence.pdf,
  },
  blockerBeforeSubmit: [
    "Publish or fix the public privacy policy page at https://flashcardsluna.com/privacy so it renders the YouTube API / Google Privacy / data deletion sections.",
    "If the form requires a true live homepage screenshot, update the public homepage/footer so the privacy link and YouTube channel/brand link are both visible, then capture and upload the live screenshot instead of the draft evidence page.",
  ],
  rendered,
  live,
  officialReferences: refs,
};

const manifestPath = path.join(outDir, "manifest.json");
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const checklist = `# YouTube API Quota Evidence Upload Checklist

Generated: ${manifest.generatedAt}

## Upload These Files To Project 1 Fields

1. Privacy policy screenshot:
   - ${rendered.privacyEvidence.pdf}
   - Optional PNG: ${rendered.privacyEvidence.png}

2. Homepage screenshot showing Privacy Policy link and YouTube brand:
   - ${rendered.homepageEvidence.pdf}
   - Optional PNG: ${rendered.homepageEvidence.png}
   - Stronger final evidence should be a live screenshot after the public homepage/footer visibly includes both Privacy and YouTube links.

3. Terms of service documentation:
   - ${rendered.termsEvidence.pdf}
   - Optional PNG: ${rendered.termsEvidence.png}

## Do Not Upload

- OAuth token JSON
- Google OAuth client-secret JSON
- .local files
- GitHub secrets
- refresh tokens
- cookies
- private keys
- private user data

## Submit Blocker

The privacy policy URL in the Google form is \`${refs.privacyUrl}\`. Before submitting, this public page should render equivalent policy text. If it is empty or missing YouTube API / Google Privacy / data deletion sections, fix the site first.

## Manifest

- ${path.relative(projectRoot, manifestPath)}
`;

await fs.writeFile(path.join(outDir, "UPLOAD-CHECKLIST.md"), checklist, "utf8");
console.log(JSON.stringify(manifest, null, 2));
