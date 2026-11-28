import fs from "node:fs";
import path from "node:path";
import { getQrCodeImageUrl } from "./video-public-url.mjs";
import { getOutroIconDataUris, outroIconNames } from "./video-outro-icons.mjs";
import { getBrandLogoDataUri, getDeckArtDataUri } from "./video-deck-art.mjs";
import { BRAND_NAME } from "./brand.mjs";

const localizationPath = path.resolve("config/video-localization.json");
const defaultOutroUrl = "https://flashcardsluna.com/en/courses";

let localizationDataCache = null;
let defaultOutroQrImageUrlCache = "";
let outroIconDataUrisCache = null;

function getLocalizationData() {
  localizationDataCache ||= JSON.parse(fs.readFileSync(localizationPath, "utf8"));
  return localizationDataCache;
}

function getDefaultOutroQrImageUrl() {
  defaultOutroQrImageUrlCache ||= getQrCodeImageUrl(defaultOutroUrl);
  return defaultOutroQrImageUrlCache;
}

function getOutroIconDataUriMap() {
  outroIconDataUrisCache ||= getOutroIconDataUris();
  return outroIconDataUrisCache;
}

export function generateUnifiedRendererHtmlV2(rendererOptions = {}) {
  const localizationJson = JSON.stringify(getLocalizationData());
  const defaultOutroQrImageUrl = getDefaultOutroQrImageUrl();
  const outroIconJson = JSON.stringify(getOutroIconDataUriMap());
  const outroIconNameJson = JSON.stringify(outroIconNames);
  const logoDataUri = rendererOptions.logoDataUri ?? getBrandLogoDataUri();
  const deckArtDataUri = rendererOptions.deckArtDataUri ?? getDeckArtDataUri(rendererOptions.setId);
  const brandName = BRAND_NAME || "LunaCards";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK JP", "Noto Sans CJK KR", "Hiragino Sans", "Sinhala Sangam MN", "Kohinoor Devanagari", Arial, sans-serif;
      background: #F8FAFC;
      color: #111827;
      -webkit-font-smoothing: antialiased;
    }

    .screen {
      width: 1920px;
      height: 1080px;
      display: none;
      flex-direction: column;
      justify-content: space-between;
      padding: 36px 52px 30px;
      background: #F8FAFC;
    }
    .screen.active { display: flex; }

    /* Top beacon header */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 80px;
      padding: 0 28px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 18px;
      flex-shrink: 0;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }
    .brand-logo {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      object-fit: cover;
      border: 1px solid #E2E8F0;
      flex-shrink: 0;
    }
    .brand-logo-fallback {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pair-pill {
      display: inline-flex;
      align-items: center;
      padding: 9px 20px;
      border-radius: 10px;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .level-pill {
      padding: 9px 18px;
      border-radius: 10px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      font-size: 24px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .level-pill.quiz {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #B45309;
    }
    .topic-title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-shrink: 0;
    }
    .progress-label {
      font-size: 24px;
      font-weight: 800;
      color: #1F2937;
      min-width: 110px;
      text-align: right;
    }
    .progress-track {
      width: 240px;
      height: 14px;
      background: #E5E7EB;
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #10B981;
      border-radius: 999px;
    }
    .progress-fill.quiz {
      background: #F59E0B;
    }

    /* Bottom constant brand bar */
    .brandbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 74px;
      padding: 0 28px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      flex-shrink: 0;
    }
    .brandbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .brandbar-url {
      font-size: 26px;
      font-weight: 800;
      color: #2563EB;
      flex-shrink: 0;
    }
    .brandbar-dot {
      color: #9CA3AF;
      font-size: 24px;
      flex-shrink: 0;
    }
    .brandbar-copy {
      font-size: 22px;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .brandbar-badges {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 10px 18px;
      border-radius: 999px;
      font-size: 20px;
      font-weight: 800;
    }
    .status-badge.web {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
    }
    .status-badge.soon {
      background: #F3F4F6;
      border: 1px solid #D1D5DB;
      color: #374151;
    }
    .dot-green {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #10B981;
      flex-shrink: 0;
    }

    /* Main study grid */
    .study-grid {
      display: grid;
      grid-template-columns: 1fr 480px;
      gap: 30px;
      height: 814px;
      min-height: 0;
      margin: 22px 0;
    }
    .word-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 28px;
      padding: 46px 56px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-tag-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .lang-chip {
      display: inline-flex;
      align-items: center;
      padding: 11px 22px;
      border-radius: 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1D4ED8;
      font-size: 24px;
      font-weight: 800;
    }
    .lang-chip.quiz-chip {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #B45309;
    }
    .speaking-pill {
      display: inline-flex;
      align-items: center;
      padding: 11px 22px;
      border-radius: 999px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      font-size: 22px;
      font-weight: 800;
    }
    .speaking-pill.amber {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #B45309;
    }

    .card-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 34px;
      padding: 16px 0;
      min-height: 0;
    }

    /* 3D Flip wrapper (used only when state === 'flip') */
    .flip-stage {
      perspective: 1600px;
      width: 100%;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flip-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
    }
    .flip-face {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 26px;
    }
    .flip-back {
      transform: rotateY(180deg);
    }

    .word-main {
      font-size: 118px;
      font-weight: 800;
      line-height: 1.12;
      color: #111827;
      overflow-wrap: break-word;
    }
    .word-main.medium { font-size: 88px; }
    .word-main.compact { font-size: 68px; }

    .word-transc {
      margin-top: 14px;
      font-size: 44px;
      font-weight: 700;
      color: #2563EB;
      line-height: 1.25;
      overflow-wrap: break-word;
    }

    .repeat-pill-bar {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      padding: 18px 28px;
      border-radius: 16px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      width: fit-content;
      font-size: 26px;
      font-weight: 800;
      color: #1F2937;
    }

    .reveal-block {
      border-top: 2px solid #E5E7EB;
      padding-top: 32px;
      display: flex;
      align-items: center;
      gap: 22px;
    }
    .translation-bar {
      width: 10px;
      min-height: 76px;
      align-self: stretch;
      border-radius: 6px;
      background: #10B981;
      flex-shrink: 0;
    }
    .translation-word {
      font-size: 76px;
      font-weight: 800;
      color: #111827;
      line-height: 1.16;
      overflow-wrap: break-word;
    }
    .translation-word.medium { font-size: 62px; }
    .translation-word.compact { font-size: 48px; }

    .quiz-prompt-box {
      padding: 36px 40px;
      border-radius: 24px;
      background: #FFFBEB;
      border: 2px dashed #F59E0B;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .quiz-q-text {
      font-size: 38px;
      font-weight: 800;
      color: #B45309;
      line-height: 1.25;
    }
    .quiz-timer-circle {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: #F59E0B;
      color: #FFFFFF;
      font-size: 48px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* Right thematic panel + ultra-short 3-bullet scanner */
    .side-panel {
      display: flex;
      flex-direction: column;
      gap: 18px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .art-frame {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 28px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .art-bg-box {
      flex: 1;
      min-height: 0;
      border-radius: 20px;
      overflow: hidden;
      background-color: #FBF9F5;
      border: 1px solid #E2E8F0;
      background-repeat: no-repeat;
      background-size: 285% auto;
      background-position: 98% center;
    }
    .art-fallback {
      flex: 1;
      min-height: 0;
      border-radius: 20px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      text-align: center;
    }
    .art-caption {
      flex-shrink: 0;
      padding: 2px 6px 0;
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .scanner-box {
      flex-shrink: 0;
      background: #EFF6FF;
      border: 2px solid #93C5FD;
      border-radius: 22px;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .scanner-title {
      font-size: 25px;
      font-weight: 800;
      color: #1D4ED8;
    }
    .scanner-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .scanner-item {
      display: flex;
      align-items: center;
      gap: 11px;
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      line-height: 1.25;
    }

    /* INTRO layout */
    .intro-grid {
      display: grid;
      grid-template-columns: 1.18fr 0.82fr;
      gap: 32px;
      height: 910px;
      min-height: 0;
      margin: 4px 0 20px;
    }
    .intro-left {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 32px;
      padding: 50px 54px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .intro-kicker {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .intro-h1 {
      font-size: 88px;
      font-weight: 800;
      line-height: 1.08;
      color: #111827;
      margin-top: 26px;
      overflow-wrap: break-word;
    }
    .intro-h1.compact { font-size: 68px; }
    .intro-subtitle {
      margin-top: 18px;
      font-size: 32px;
      font-weight: 700;
      color: #2563EB;
      line-height: 1.3;
    }
    .intro-desc {
      margin-top: 18px;
      font-size: 28px;
      font-weight: 500;
      line-height: 1.4;
      color: #374151;
    }
    .intro-right {
      height: 100%;
      min-height: 0;
      overflow: hidden;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 32px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .intro-art-bar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px 2px;
    }

    /* MIDROLL & OUTRO layout */
    .promo-grid {
      display: grid;
      grid-template-columns: 1.24fr 0.76fr;
      gap: 32px;
      height: 814px;
      min-height: 0;
      margin: 22px 0;
    }
    .promo-left {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 32px;
      padding: 46px 52px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .promo-eyebrow {
      display: inline-flex;
      align-items: center;
      padding: 10px 22px;
      border-radius: 999px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1D4ED8;
      font-size: 22px;
      font-weight: 800;
      width: fit-content;
    }
    .promo-h2 {
      margin-top: 20px;
      font-size: 60px;
      font-weight: 800;
      line-height: 1.12;
      color: #111827;
    }
    .promo-sub {
      margin-top: 14px;
      font-size: 27px;
      font-weight: 500;
      line-height: 1.38;
      color: #374151;
    }
    .feature-list {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 18px 22px;
      border-radius: 18px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
    }
    .feature-num {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #10B981;
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .feature-text-title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      line-height: 1.25;
    }
    .outro-badges-grid {
      margin-top: 22px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .outro-badge-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: 16px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
    }
    .outro-badge-icon {
      width: 44px;
      height: 44px;
      padding: 6px;
      border-radius: 12px;
      background: #1E3A8A;
      object-fit: contain;
      flex-shrink: 0;
    }
    .outro-badge-text {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    .promo-right {
      background: #FFFFFF;
      border: 2px solid #2563EB;
      border-radius: 32px;
      padding: 36px 34px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }
    .qr-card {
      padding: 16px;
      border-radius: 22px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
    }
    .qr-img {
      width: 296px;
      height: 296px;
      display: block;
    }
    .promo-url-pill {
      padding: 14px 28px;
      border-radius: 14px;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 28px;
      font-weight: 800;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .store-stack {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .store-row {
      padding: 13px 18px;
      border-radius: 14px;
      font-size: 21px;
      font-weight: 800;
    }
    .store-row.live {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
    }
    .store-row.coming {
      background: #F3F4F6;
      border: 1px solid #D1D5DB;
      color: #374151;
    }
  </style>
</head>
<body>

  <!-- 1. INTRO SCREEN -->
  <div id="screen-intro" class="screen">
    <div class="intro-grid">
      <div class="intro-left">
        <div>
          <div class="intro-kicker">
            <img id="intro-logo" class="brand-logo" src="${logoDataUri}" alt="" />
            <span id="intro-pair-pill" class="pair-pill">LunaCards</span>
            <span id="intro-level-pill" class="level-pill">A1</span>
          </div>
          <h1 id="intro-deck-title" class="intro-h1">Topic</h1>
          <div id="intro-subtitle" class="intro-subtitle"></div>
          <p id="intro-description" class="intro-desc"></p>
        </div>
        <div class="scanner-box">
          <div class="scanner-title">flashcardsluna.com</div>
          <div class="scanner-list">
            <div class="scanner-item"><span class="dot-green"></span><span id="intro-b1"></span></div>
            <div class="scanner-item"><span class="dot-green"></span><span id="intro-b2"></span></div>
            <div class="scanner-item"><span class="dot-green"></span><span id="intro-b3"></span></div>
          </div>
        </div>
      </div>

      <div class="intro-right">
        <div id="intro-art-box" class="art-bg-box"></div>
        <div id="intro-art-fallback" class="art-fallback" style="display:none;">
          <img class="brand-logo" style="width:96px;height:96px;border-radius:24px;" src="${logoDataUri}" alt="" />
          <div style="font-size:34px;font-weight:800;color:#111827;">${brandName}</div>
          <div style="font-size:24px;font-weight:700;color:#2563EB;">flashcardsluna.com</div>
        </div>
        <div class="intro-art-bar">
          <span id="intro-lang-title" style="font-size:24px;font-weight:800;color:#111827;"></span>
          <span style="font-size:22px;font-weight:800;color:#2563EB;">flashcardsluna.com</span>
        </div>
      </div>
    </div>

    <div class="brandbar">
      <div class="brandbar-left">
        <span class="brandbar-url">flashcardsluna.com</span>
        <span class="brandbar-dot">•</span>
        <span id="intro-footer-copy" class="brandbar-copy"></span>
      </div>
      <div class="brandbar-badges">
        <span class="status-badge web"><span class="dot-green"></span><span id="intro-badge-web"></span></span>
        <span id="intro-badge-soon" class="status-badge soon"></span>
      </div>
    </div>
  </div>

  <!-- 2. CARD / QUIZ SCREEN -->
  <div id="screen-card" class="screen">
    <div class="topbar">
      <div class="topbar-left">
        <img id="card-logo" class="brand-logo" src="${logoDataUri}" alt="" />
        <span id="card-pair-pill" class="pair-pill">EN → RU</span>
        <span id="card-level-pill" class="level-pill">A1</span>
        <span id="card-header-title" class="topic-title"></span>
      </div>
      <div class="topbar-right">
        <span id="card-progress-text" class="progress-label">1 / 34</span>
        <div class="progress-track">
          <div id="card-progress-bar" class="progress-fill" style="width: 10%"></div>
        </div>
      </div>
    </div>

    <div class="study-grid">
      <div class="word-card">
        <div class="card-tag-row">
          <span id="card-lang-chip" class="lang-chip"></span>
          <span id="card-state-pill" class="speaking-pill"></span>
        </div>

        <!-- Static card states -->
        <div id="static-container" class="card-center">
          <div>
            <div id="static-main-word" class="word-main"></div>
            <div id="static-main-transc" class="word-transc"></div>
          </div>

          <div id="static-repeat-bar" class="repeat-pill-bar" style="display:none;">
            <span class="dot-green"></span>
            <span id="static-repeat-label"></span>
          </div>

          <div id="static-quiz-box" class="quiz-prompt-box" style="display:none;">
            <div id="static-quiz-prompt" class="quiz-q-text"></div>
            <div id="static-quiz-timer" class="quiz-timer-circle">3</div>
          </div>

          <div id="static-reveal-block" class="reveal-block" style="display:none;">
            <div class="translation-bar"></div>
            <div id="static-translation" class="translation-word"></div>
          </div>
        </div>

        <!-- 3D Flip container (for transitionMode === 'flip') -->
        <div id="flip-container" class="flip-stage" style="display:none;">
          <div id="card-inner" class="flip-inner">
            <div class="flip-face">
              <div>
                <div id="flip-front-word" class="word-main"></div>
                <div id="flip-front-transc" class="word-transc"></div>
              </div>
              <div class="repeat-pill-bar">
                <span class="dot-green"></span>
                <span id="flip-repeat-label"></span>
              </div>
            </div>
            <div class="flip-face flip-back">
              <div>
                <div id="flip-back-target" class="word-main"></div>
                <div id="flip-back-transc" class="word-transc"></div>
              </div>
              <div class="reveal-block">
                <div class="translation-bar"></div>
                <div id="flip-back-word" class="translation-word"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="art-frame">
          <div id="card-art-box" class="art-bg-box"></div>
          <div id="card-art-fallback" class="art-fallback" style="display:none;">
            <img class="brand-logo" style="width:76px;height:76px;border-radius:18px;" src="${logoDataUri}" alt="" />
            <div style="font-size:28px;font-weight:800;color:#111827;">${brandName}</div>
          </div>
          <div id="card-side-topic" class="art-caption"></div>
        </div>

        <div class="scanner-box">
          <div class="scanner-title">flashcardsluna.com</div>
          <div class="scanner-list">
            <div class="scanner-item"><span class="dot-green"></span><span id="card-b1"></span></div>
            <div class="scanner-item"><span class="dot-green"></span><span id="card-b2"></span></div>
            <div class="scanner-item"><span class="dot-green"></span><span id="card-b3"></span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="brandbar">
      <div class="brandbar-left">
        <span class="brandbar-url">flashcardsluna.com</span>
        <span class="brandbar-dot">•</span>
        <span id="card-footer-copy" class="brandbar-copy"></span>
      </div>
      <div class="brandbar-badges">
        <span class="status-badge web"><span class="dot-green"></span><span id="card-badge-web"></span></span>
        <span id="card-badge-soon" class="status-badge soon"></span>
      </div>
    </div>
  </div>

  <!-- 3. MIDROLL & OUTRO SCREEN -->
  <div id="screen-promo" class="screen">
    <div class="topbar">
      <div class="topbar-left">
        <img id="promo-logo" class="brand-logo" src="${logoDataUri}" alt="" />
        <span class="pair-pill">${brandName}</span>
        <span id="promo-top-title" class="topic-title">flashcardsluna.com</span>
      </div>
      <div class="topbar-right">
        <span id="promo-top-badge" class="level-pill"></span>
      </div>
    </div>

    <div class="promo-grid">
      <div class="promo-left">
        <div>
          <span class="promo-eyebrow">flashcardsluna.com</span>
          <h2 id="promo-heading" class="promo-h2"></h2>
          <p id="promo-sub" class="promo-sub"></p>

          <div id="promo-3-list" class="feature-list">
            <div class="feature-item">
              <div class="feature-num">1</div>
              <div id="promo-f1" class="feature-text-title"></div>
            </div>
            <div class="feature-item">
              <div class="feature-num">2</div>
              <div id="promo-f2" class="feature-text-title"></div>
            </div>
            <div class="feature-item">
              <div class="feature-num">3</div>
              <div id="promo-f3" class="feature-text-title"></div>
            </div>
          </div>

          <div id="promo-badges-grid" class="outro-badges-grid" style="display:none;"></div>
        </div>
      </div>

      <div class="promo-right">
        <div id="promo-qr-label" style="font-size:26px;font-weight:800;color:#111827;"></div>
        <div class="qr-card">
          <img id="promo-qr-image" class="qr-img" src="${defaultOutroQrImageUrl}" alt="" />
        </div>
        <div id="promo-url-pill" class="promo-url-pill">flashcardsluna.com</div>
        <div class="store-stack">
          <div id="promo-store-web" class="store-row live"></div>
          <div id="promo-store-soon" class="store-row coming"></div>
        </div>
      </div>
    </div>

    <div class="brandbar">
      <div class="brandbar-left">
        <span class="brandbar-url">flashcardsluna.com</span>
        <span class="brandbar-dot">•</span>
        <span id="promo-footer-copy" class="brandbar-copy"></span>
      </div>
    </div>
  </div>

  <script>
    const localizationData = ${localizationJson};
    const defaultOutroQrImageUrl = ${JSON.stringify(defaultOutroQrImageUrl)};
    const outroIconDataUris = ${outroIconJson};
    const outroIconNames = ${outroIconNameJson};
    const defaultDeckArtDataUri = ${JSON.stringify(deckArtDataUri)};
    const hasLogo = ${JSON.stringify(Boolean(logoDataUri))};

    if (!hasLogo) {
      ['intro-logo', 'card-logo', 'promo-logo'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }

    function applyArt(boxId, fallbackId, artUri) {
      const box = document.getElementById(boxId);
      const fb = document.getElementById(fallbackId);
      if (artUri) {
        box.style.display = 'block';
        box.style.backgroundImage = 'url("' + artUri + '")';
        fb.style.display = 'none';
      } else {
        box.style.display = 'none';
        fb.style.display = 'flex';
      }
    }

    function setAdaptiveClass(el, text, medLen, compLen, baseClass) {
      const len = String(text || '').length;
      el.className = baseClass + (len > compLen ? ' compact' : len > medLen ? ' medium' : '');
    }

    function getLangCopy(supportLang) {
      const code = String(supportLang || 'EN').toUpperCase();
      return localizationData[code] || localizationData['EN'] || {};
    }

    window.renderTask = function(task) {
      const { type, options = {} } = task;
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      const langData = getLangCopy(options.supportLang);
      const artUri = options.deckArtDataUri || defaultDeckArtDataUri;

      const b1 = langData.sidebar_bullet_1 || 'Pictures & examples';
      const b2 = langData.sidebar_bullet_2 || 'More decks & languages';
      const b3 = langData.sidebar_bullet_3 || 'Your own pace';
      const webLive = langData.badge_web_live || 'Web · Live now';
      const appsSoon = langData.badge_apps_soon || 'iOS / Android · Soon';
      const repeatLabel = langData.repeat_aloud_label || 'Repeat aloud';
      const footerCopy = langData.outro_subtitle || 'Practice decks for free on our website';

      if (type === 'intro') {
        document.getElementById('screen-intro').classList.add('active');
        const pairPill = document.getElementById('intro-pair-pill');
        pairPill.textContent = options.pairLabel || (options.targetLang && options.supportLang
          ? String(options.targetLang).toUpperCase() + ' → ' + String(options.supportLang).toUpperCase()
          : '${brandName}');
        const levelPill = document.getElementById('intro-level-pill');
        levelPill.textContent = options.levelLabel || 'A1';
        levelPill.style.display = options.levelLabel ? 'inline-flex' : 'none';

        const h1 = document.getElementById('intro-deck-title');
        h1.textContent = options.deckTitle || options.title || '';
        setAdaptiveClass(h1, h1.textContent, 24, 34, 'intro-h1');

        document.getElementById('intro-subtitle').textContent = options.subtitle || '';
        document.getElementById('intro-description').innerHTML = options.description || '';
        document.getElementById('intro-lang-title').textContent = options.title || '';
        document.getElementById('intro-b1').textContent = b1;
        document.getElementById('intro-b2').textContent = b2;
        document.getElementById('intro-b3').textContent = b3;
        document.getElementById('intro-footer-copy').textContent = footerCopy;
        document.getElementById('intro-badge-web').textContent = webLive;
        document.getElementById('intro-badge-soon').textContent = appsSoon;
        applyArt('intro-art-box', 'intro-art-fallback', artUri);
        return;
      }

      if (type === 'midroll' || type === 'outro') {
        document.getElementById('screen-promo').classList.add('active');
        const isMidroll = type === 'midroll';

        document.getElementById('promo-top-title').textContent = options.deckTitle || 'flashcardsluna.com';
        const topBadge = document.getElementById('promo-top-badge');
        topBadge.textContent = isMidroll
          ? (options.nextBadge || langData.midroll_next_badge || 'Next: Mini-Test')
          : (options.topBadge || 'flashcardsluna.com');
        topBadge.className = isMidroll ? 'level-pill quiz' : 'level-pill';

        document.getElementById('promo-heading').textContent = options.title || langData.outro_title || 'Learn these words forever';
        document.getElementById('promo-sub').textContent = options.subtitle || footerCopy;

        const list3 = document.getElementById('promo-3-list');
        const badgesGrid = document.getElementById('promo-badges-grid');
        if (!isMidroll && Array.isArray(options.badges) && options.badges.length > 0) {
          list3.style.display = 'none';
          badgesGrid.style.display = 'grid';
          badgesGrid.innerHTML = options.badges.slice(0, 6).map((b, idx) => {
            const iconKey = b.iconName || outroIconNames[idx];
            const iconSrc = outroIconDataUris[iconKey] || '';
            const iconHtml = iconSrc ? '<img class="outro-badge-icon" src="' + iconSrc + '" alt="" />' : '';
            return '<div class="outro-badge-card">' + iconHtml + '<span class="outro-badge-text">' + (b.text || '') + '</span></div>';
          }).join('');
        } else {
          list3.style.display = 'flex';
          badgesGrid.style.display = 'none';
          document.getElementById('promo-f1').textContent = b1;
          document.getElementById('promo-f2').textContent = b2;
          document.getElementById('promo-f3').textContent = b3;
        }

        document.getElementById('promo-qr-label').textContent = options.qrScanLabel || langData.qr_scan_label || 'Scan me';
        document.getElementById('promo-qr-image').src = options.outroQrImageSrc || defaultOutroQrImageUrl;
        document.getElementById('promo-url-pill').textContent = options.outroDisplayUrl || 'flashcardsluna.com';
        document.getElementById('promo-store-web').textContent = webLive;
        document.getElementById('promo-store-soon').textContent = appsSoon;
        document.getElementById('promo-footer-copy').textContent = footerCopy;
        return;
      }

      // Default: 'card' (study + quiz + flip)
      document.getElementById('screen-card').classList.add('active');
      const {
        deckName = '',
        currentIndex = 1,
        totalCards = 1,
        targetWord = '',
        targetTranscription = '',
        supportWord = '',
        supportLang = 'EN',
        targetLang = '',
        state = 'word-only',
        quizTimer = null,
        rotateY = 0,
        langLabel = '',
        levelLabel = 'A1',
        showTranscription = false,
        progressPercent = 0,
      } = options;

      const isQuiz = state === 'quiz-question' || state === 'quiz-answer';
      const pairPill = document.getElementById('card-pair-pill');
      pairPill.textContent = options.pairLabel || (targetLang
        ? String(targetLang).toUpperCase() + ' → ' + String(supportLang).toUpperCase()
        : (langLabel || '${brandName}'));

      const levelPill = document.getElementById('card-level-pill');
      levelPill.textContent = isQuiz ? (langData.quiz_title ? langData.quiz_title.split('·')[0].trim() : 'Mini-Test') : levelLabel;
      levelPill.className = isQuiz ? 'level-pill quiz' : 'level-pill';

      document.getElementById('card-header-title').textContent = isQuiz
        ? (langData.quiz_title || 'Mini-Test · Translate the word')
        : deckName;

      let progressText = currentIndex + ' / ' + totalCards;
      if (isQuiz) {
        const qTpl = langData.quiz_question_label_template || 'Question {current} of {total}';
        progressText = qTpl.replace('{current}', currentIndex).replace('{total}', totalCards);
      }
      document.getElementById('card-progress-text').textContent = progressText;
      const pBar = document.getElementById('card-progress-bar');
      pBar.style.width = Math.max(4, Math.min(100, Number(progressPercent) || 0)) + '%';
      pBar.className = isQuiz ? 'progress-fill quiz' : 'progress-fill';

      document.getElementById('card-side-topic').textContent = deckName || (langLabel || '${brandName}');
      document.getElementById('card-b1').textContent = b1;
      document.getElementById('card-b2').textContent = b2;
      document.getElementById('card-b3').textContent = b3;
      document.getElementById('card-footer-copy').textContent = footerCopy;
      document.getElementById('card-badge-web').textContent = webLive;
      document.getElementById('card-badge-soon').textContent = appsSoon;
      applyArt('card-art-box', 'card-art-fallback', artUri);

      const langChip = document.getElementById('card-lang-chip');
      const statePill = document.getElementById('card-state-pill');
      langChip.textContent = langLabel || (targetLang ? String(targetLang).toUpperCase() : '');
      langChip.className = isQuiz ? 'lang-chip quiz-chip' : 'lang-chip';

      const staticEl = document.getElementById('static-container');
      const flipEl = document.getElementById('flip-container');

      if (state === 'flip') {
        staticEl.style.display = 'none';
        flipEl.style.display = 'flex';
        document.getElementById('card-inner').style.transform = 'rotateY(' + rotateY + 'deg)';
        statePill.textContent = rotateY >= 90 ? '✓' : repeatLabel;
        statePill.className = 'speaking-pill';

        const ffWord = document.getElementById('flip-front-word');
        ffWord.textContent = targetWord;
        setAdaptiveClass(ffWord, targetWord, 14, 22, 'word-main');
        const ffTr = document.getElementById('flip-front-transc');
        ffTr.textContent = showTranscription ? targetTranscription : '';
        ffTr.style.display = showTranscription && targetTranscription ? 'block' : 'none';
        document.getElementById('flip-repeat-label').textContent = repeatLabel;

        const fbTarget = document.getElementById('flip-back-target');
        fbTarget.textContent = targetWord;
        setAdaptiveClass(fbTarget, targetWord, 14, 22, 'word-main');
        const fbTr = document.getElementById('flip-back-transc');
        fbTr.textContent = showTranscription ? targetTranscription : '';
        fbTr.style.display = showTranscription && targetTranscription ? 'block' : 'none';
        const fbWord = document.getElementById('flip-back-word');
        fbWord.textContent = supportWord;
        setAdaptiveClass(fbWord, supportWord, 18, 28, 'translation-word');
        return;
      }

      flipEl.style.display = 'none';
      staticEl.style.display = 'flex';

      const mainWord = document.getElementById('static-main-word');
      const mainTransc = document.getElementById('static-main-transc');
      const repeatBar = document.getElementById('static-repeat-bar');
      const quizBox = document.getElementById('static-quiz-box');
      const revealBlock = document.getElementById('static-reveal-block');

      repeatBar.style.display = 'none';
      quizBox.style.display = 'none';
      revealBlock.style.display = 'none';
      statePill.style.display = 'inline-flex';

      if (state === 'quiz-question') {
        statePill.textContent = quizTimer ? String(quizTimer) + 's' : '?';
        statePill.className = 'speaking-pill amber';
        mainWord.textContent = supportWord;
        setAdaptiveClass(mainWord, supportWord, 14, 22, 'word-main');
        mainTransc.style.display = 'none';
        quizBox.style.display = 'flex';
        document.getElementById('static-quiz-prompt').textContent = langData.quiz_title || 'Mini-Test · Translate the word';
        document.getElementById('static-quiz-timer').textContent = quizTimer != null ? String(quizTimer) : '?';
      } else if (state === 'quiz-answer') {
        statePill.textContent = '✓';
        statePill.className = 'speaking-pill';
        mainWord.textContent = targetWord;
        setAdaptiveClass(mainWord, targetWord, 14, 22, 'word-main');
        mainTransc.textContent = showTranscription ? targetTranscription : '';
        mainTransc.style.display = showTranscription && targetTranscription ? 'block' : 'none';
        revealBlock.style.display = 'flex';
        const trEl = document.getElementById('static-translation');
        trEl.textContent = supportWord;
        setAdaptiveClass(trEl, supportWord, 18, 28, 'translation-word');
      } else if (state === 'word-and-translation') {
        statePill.textContent = '✓';
        statePill.className = 'speaking-pill';
        mainWord.textContent = targetWord;
        setAdaptiveClass(mainWord, targetWord, 14, 22, 'word-main');
        mainTransc.textContent = showTranscription ? targetTranscription : '';
        mainTransc.style.display = showTranscription && targetTranscription ? 'block' : 'none';
        revealBlock.style.display = 'flex';
        const trEl = document.getElementById('static-translation');
        trEl.textContent = supportWord;
        setAdaptiveClass(trEl, supportWord, 18, 28, 'translation-word');
      } else {
        // word-only
        statePill.style.display = 'none';
        mainWord.textContent = targetWord;
        setAdaptiveClass(mainWord, targetWord, 14, 22, 'word-main');
        mainTransc.textContent = showTranscription ? targetTranscription : '';
        mainTransc.style.display = showTranscription && targetTranscription ? 'block' : 'none';
        repeatBar.style.display = 'inline-flex';
        document.getElementById('static-repeat-label').textContent = repeatLabel;
      }
    };
  </script>
</body>
</html>`;
}
