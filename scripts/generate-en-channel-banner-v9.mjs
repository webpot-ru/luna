import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'outputs/youtube-channel-assets/en');
const avatarPath = path.join(outDir, 'flashcardsluna-site-avatar-512.png');

const uploadPath = path.join(outDir, 'lunacards-en-channel-banner-youtube-2560x1440-v9-wide-desktop.png');
const safeAreaPath = path.join(outDir, 'lunacards-en-channel-banner-safearea-preview-v9-wide-desktop.png');
const desktopPreviewPath = path.join(outDir, 'lunacards-en-channel-banner-desktop-preview-v9-wide-desktop.png');

const avatar = `data:image/png;base64,${await fs.readFile(avatarPath, 'base64')}`;

const courseCards = [
  ['Hola', 'Spanish A1', '#3f6ff5'],
  ['Bonjour', 'French', '#6d5dfc'],
  ['日本語', 'Japanese', '#2f80ed'],
  ['Deutsch', 'German', '#3554d1'],
  ['한국어', 'Korean', '#6c63ff'],
  ['中文', 'Chinese', '#2b74e8'],
  ['Русский', 'Russian', '#4c67f0'],
  ['Português', 'Portuguese', '#5779ff'],
  ['Türkçe', 'Turkish', '#3459e6'],
  ['العربية', 'Arabic', '#6d78ff'],
  ['History', 'Coming next', '#2f80ed'],
  ['Science', 'Coming next', '#6c63ff'],
  ['Math', 'Coming next', '#4768f2'],
  ['Business', 'Coming next', '#3655d9'],
];

function cardMarkup([title, label, color], index) {
  const delay = (index % 5) * 0.08;
  return `
    <div class="lesson-card" style="--accent:${color}; --delay:${delay}s">
      <div class="card-visual">
        <span>${title}</span>
      </div>
      <div class="card-lines">
        <i></i><b></b>
      </div>
      <div class="card-chip">${label}</div>
    </div>
  `;
}

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 2560px; height: 1440px; overflow: hidden; }
      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 11% 50%, rgba(70, 112, 245, 0.16), transparent 25%),
          radial-gradient(circle at 88% 50%, rgba(111, 92, 255, 0.16), transparent 27%),
          linear-gradient(180deg, #f8fbff 0%, #eff5f9 100%);
        color: #06134a;
      }
      .canvas {
        position: relative;
        width: 2560px;
        height: 1440px;
      }
      .desktop-band {
        position: absolute;
        left: 0;
        top: 508px;
        width: 2560px;
        height: 423px;
        overflow: hidden;
        background:
          linear-gradient(90deg, rgba(244, 247, 249, 0.62), rgba(255,255,255,0.98) 31%, rgba(255,255,255,0.98) 69%, rgba(244,247,249,0.62)),
          linear-gradient(180deg, #fbfdff, #eef5fa);
      }
      .desktop-band::before {
        content: "";
        position: absolute;
        inset: 8px 54px;
        border: 1px solid rgba(117, 145, 177, 0.18);
        border-radius: 34px;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.8), 0 24px 80px rgba(36, 54, 101, 0.10);
      }
      .desktop-band::after {
        content: "";
        position: absolute;
        left: 442px;
        top: -92px;
        width: 1676px;
        height: 610px;
        border-radius: 64px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247, 250, 255, 0.86));
        border: 1px solid rgba(103, 132, 178, 0.16);
        box-shadow: 0 30px 100px rgba(34, 61, 110, 0.13);
      }
      .card-field {
        position: absolute;
        top: 28px;
        display: grid;
        grid-template-columns: repeat(5, 132px);
        grid-auto-rows: 158px;
        gap: 16px;
        z-index: 2;
      }
      .card-field.left { left: 72px; }
      .card-field.right { right: 72px; }
      .lesson-card {
        position: relative;
        width: 132px;
        height: 158px;
        border-radius: 18px;
        padding: 11px;
        background: rgba(255,255,255,0.94);
        border: 1px solid rgba(133, 157, 191, 0.16);
        box-shadow: 0 14px 34px rgba(29, 54, 104, 0.12);
      }
      .lesson-card:nth-child(2n) { transform: translateY(10px); }
      .lesson-card:nth-child(3n) { transform: translateY(-8px); }
      .card-visual {
        height: 74px;
        border-radius: 14px;
        background:
          radial-gradient(circle at 28% 24%, rgba(255,255,255,0.92), transparent 31%),
          linear-gradient(135deg, color-mix(in srgb, var(--accent), white 80%), #eff5ff);
        display: grid;
        place-items: center;
        color: #06134a;
        font-weight: 800;
        font-size: 21px;
        line-height: 1;
        text-align: center;
        letter-spacing: 0;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.78);
      }
      .card-visual span {
        max-width: 104px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card-lines { padding-top: 11px; }
      .card-lines i,
      .card-lines b {
        display: block;
        height: 8px;
        border-radius: 999px;
        background: #e6edf7;
      }
      .card-lines i { width: 86px; }
      .card-lines b { width: 58px; margin-top: 8px; }
      .card-chip {
        position: absolute;
        left: 11px;
        bottom: 10px;
        max-width: 110px;
        padding: 5px 9px;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        font-size: 11px;
        font-weight: 750;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero {
        position: absolute;
        left: 760px;
        top: 24px;
        width: 1040px;
        height: 374px;
        z-index: 5;
        display: grid;
        place-items: center;
        text-align: center;
      }
      .hero img {
        width: 88px;
        height: 88px;
        object-fit: contain;
        margin-bottom: 4px;
        filter: drop-shadow(0 12px 20px rgba(51, 86, 171, 0.18));
      }
      .brand {
        font-size: 86px;
        line-height: 0.94;
        font-weight: 880;
        color: #071655;
        letter-spacing: 0;
      }
      .divider {
        display: flex;
        align-items: center;
        gap: 14px;
        justify-content: center;
        margin: 14px 0 10px;
      }
      .divider i {
        width: 192px;
        height: 2px;
        border-radius: 99px;
        background: linear-gradient(90deg, transparent, #cfdcf5 40%, #cfdcf5 60%, transparent);
      }
      .spark {
        width: 16px;
        height: 16px;
        transform: rotate(45deg);
        border-radius: 3px;
        background: linear-gradient(135deg, #5d80ff, #d8e0ff);
      }
      .sub {
        margin: 0;
        font-size: 34px;
        line-height: 1.05;
        font-weight: 820;
        letter-spacing: 0;
        color: #071655;
      }
      .sub strong {
        display: block;
        margin-top: 5px;
        color: #4a70f4;
        font-size: 30px;
      }
      .url-pill {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        margin-top: 14px;
        padding: 10px 23px;
        border-radius: 999px;
        color: white;
        background: linear-gradient(135deg, #3f6ff5, #5d7cff);
        box-shadow: 0 16px 32px rgba(63,111,245,0.28);
        font-size: 19px;
        font-weight: 760;
      }
      .url-pill span:first-child {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 99px;
        border: 2px solid rgba(255,255,255,0.78);
      }
      .floating-note,
      .floating-card {
        position: absolute;
        z-index: 4;
        border-radius: 24px;
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(125, 151, 190, 0.18);
        box-shadow: 0 18px 48px rgba(34, 61, 110, 0.14);
      }
      .floating-note {
        left: 536px;
        bottom: -36px;
        width: 250px;
        height: 120px;
        transform: rotate(-6deg);
      }
      .floating-note::before {
        content: "";
        position: absolute;
        left: 48px;
        top: 38px;
        width: 52px;
        height: 52px;
        border-radius: 99px;
        background: #eef3ff;
      }
      .floating-note::after {
        content: "";
        position: absolute;
        left: 102px;
        top: 48px;
        width: 92px;
        height: 10px;
        border-radius: 99px;
        background: #dfe9f8;
        box-shadow: 0 22px 0 #eaf0f8;
      }
      .floating-card {
        right: 520px;
        bottom: -42px;
        width: 184px;
        height: 154px;
        transform: rotate(5deg);
        background: linear-gradient(145deg, #dde4ff, #f7f9ff);
      }
      .floating-card::before {
        content: "";
        position: absolute;
        left: 62px;
        top: 37px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #ffffff;
      }
      .floating-card::after {
        content: "";
        position: absolute;
        left: 84px;
        top: 28px;
        width: 55px;
        height: 64px;
        border-radius: 50%;
        background: #d8e0ff;
      }
      .mini-tabs {
        position: absolute;
        left: 142px;
        bottom: 28px;
        z-index: 3;
        display: flex;
        gap: 14px;
      }
      .mini-tabs.right { left: auto; right: 142px; }
      .mini-tabs span {
        padding: 9px 18px;
        border-radius: 999px;
        background: rgba(63,111,245,0.10);
        color: #315ee8;
        font-size: 16px;
        font-weight: 760;
      }
      .safe-outline,
      .desktop-outline {
        position: absolute;
        pointer-events: none;
        display: none;
      }
    </style>
  </head>
  <body>
    <main class="canvas">
      <section class="desktop-band">
        <div class="card-field left">
          ${courseCards.slice(0, 10).map(cardMarkup).join('')}
        </div>
        <div class="card-field right">
          ${courseCards.slice(4, 14).map(cardMarkup).join('')}
        </div>
        <div class="mini-tabs">
          <span>50+ languages</span>
          <span>A1-C1</span>
          <span>Listen</span>
        </div>
        <div class="mini-tabs right">
          <span>Repeat</span>
          <span>Quiz</span>
          <span>Study online</span>
        </div>
        <div class="floating-note"></div>
        <div class="floating-card"></div>
        <div class="hero">
          <div>
            <img src="${avatar}" alt="">
            <div class="brand">LunaCards</div>
            <div class="divider"><i></i><span class="spark"></span><i></i></div>
            <p class="sub">Learn with Flashcards<strong>Languages and more</strong></p>
            <div class="url-pill"><span>⌾</span><span>flashcardsluna.com</span></div>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.screenshot({ path: uploadPath, clip: { x: 0, y: 0, width: 2560, height: 1440 } });
await page.screenshot({ path: safeAreaPath, clip: { x: 507, y: 508, width: 1546, height: 423 } });
await page.screenshot({ path: desktopPreviewPath, clip: { x: 0, y: 508, width: 2560, height: 423 } });
await browser.close();

console.log(JSON.stringify({
  uploadPath,
  safeAreaPath,
  desktopPreviewPath,
}, null, 2));
