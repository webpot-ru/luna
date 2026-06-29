import fs from "node:fs";
import path from "node:path";
import { getQrCodeImageUrl } from "./video-public-url.mjs";
import { getOutroIconDataUris, outroIconNames } from "./video-outro-icons.mjs";
import { BRAND_NAME } from "./brand.mjs";

const localizationPath = path.resolve("config/video-localization.json");
const localizationData = JSON.parse(fs.readFileSync(localizationPath, "utf8"));
const defaultOutroUrl = "https://flashcardsluna.com/en/courses";
const defaultOutroQrImageUrl = "";
const outroIconDataUris = getOutroIconDataUris();

export const flagCountryMap = {
  'EN': 'us',
  'EN-GB': 'gb',
  'ES': 'es',
  'ES-419': 'mx',
  'RU': 'ru',
  'DE': 'de',
  'FR': 'fr',
  'IT': 'it',
  'PT': 'pt',
  'PT-BR': 'br',
  'JA': 'jp',
  'KO': 'kr',
  'ZH': 'cn',
  'VI': 'vn',
  'TH': 'th',
  'TR': 'tr',
  'NL': 'nl',
  'SV': 'se',
  'NO': 'no',
  'NB': 'no',
  'DA': 'dk',
  'FI': 'fi',
  'PL': 'pl',
  'CS': 'cz',
  'SK': 'sk',
  'HU': 'hu',
  'RO': 'ro',
  'BG': 'bg',
  'HR': 'hr',
  'SR': 'rs',
  'SL': 'si',
  'LT': 'lt',
  'LV': 'lv',
  'ET': 'ee',
  'IS': 'is',
  'HI': 'in',
  'BN': 'bd',
  'TL': 'ph',
  'MY': 'mm',
  'KM': 'kh',
  'LO': 'la',
  'NE': 'np',
  'SI': 'lk',
  'TA': 'in',
  'TE': 'in',
  'KN': 'in',
  'ML': 'in',
  'UZ': 'uz',
  'KK': 'kz',
  'AZ': 'az',
  'KA': 'ge',
  'HY': 'am',
  'SW': 'ke'
};

export function getFlagEmoji(langCode) {
  const countryCode = flagCountryMap[String(langCode).toUpperCase()];
  if (countryCode) {
    return `<img src="https://flagcdn.com/h80/${countryCode}.png" class="h-[48px] w-auto inline-block align-middle rounded-sm shadow-sm" alt="${langCode}" />`;
  }
  return '🌐';
}

export function getLargeFlagEmoji(langCode) {
  const countryCode = flagCountryMap[String(langCode).toUpperCase()];
  if (countryCode) {
    return `<img src="https://flagcdn.com/h240/${countryCode}.png" class="h-[140px] w-auto inline-block align-middle rounded-xl shadow-md" alt="${langCode}" />`;
  }
  return '🌐';
}

export function getLanguageNameInLang(targetLang, supportLang) {
  const translations = {
    'RU': {
      'EN': 'Английский',
      'ES': 'Испанский',
      'FR': 'Французский',
      'DE': 'Немецкий',
      'IT': 'Итальянский',
      'PT': 'Португальский',
      'RU': 'Русский',
      'ZH': 'Китайский',
      'JA': 'Японский',
      'KO': 'Корейский',
      'VI': 'Вьетнамский',
      'TH': 'Тайский',
      'MS': 'Малайский',
      'ID': 'Индонезийский',
      'PL': 'Польский',
      'NL': 'Нидерландский',
      'SV': 'Шведский',
      'NO': 'Норвежский',
      'NB': 'Норвежский',
      'DA': 'Датский',
      'FI': 'Финский',
      'CS': 'Чешский',
      'SK': 'Словацкий',
      'HU': 'Венгерский',
      'RO': 'Румынский',
      'BG': 'Болгарский',
      'HR': 'Хорватский',
      'SR': 'Сербский',
      'SL': 'Словенский',
      'LT': 'Литовский',
      'LV': 'Латышский',
      'ET': 'Эстонский',
      'IS': 'Исландский',
      'HI': 'Хинди',
      'BN': 'Бенгальский',
      'TL': 'Филиппинский',
      'MY': 'Бирманский',
      'KM': 'Кхмерский',
      'LO': 'Лаосский',
      'NE': 'Непальский',
      'SI': 'Сингальский',
      'TA': 'Тамильский',
      'TE': 'Телугу',
      'KN': 'Каннада',
      'ML': 'Малаялам',
      'UZ': 'Узбекский',
      'KK': 'Казахский',
      'AZ': 'Азербайджанский',
      'KA': 'Грузинский',
      'HY': 'Армянский',
      'TR': 'Турецкий',
      'SW': 'Суахили',
      'PT-BR': 'Португальский (Бразилия)',
      'ES-419': 'Испанский (Латинская Америка)',
      'EN-GB': 'Английский (Великобритания)'
    },
    'EN': {
      'EN': 'English',
      'ES': 'Spanish',
      'FR': 'French',
      'DE': 'German',
      'IT': 'Italian',
      'PT': 'Portuguese',
      'RU': 'Russian',
      'ZH': 'Chinese',
      'JA': 'Japanese',
      'KO': 'Korean',
      'VI': 'Vietnamese',
      'TH': 'Thai',
      'MS': 'Malay',
      'ID': 'Indonesian',
      'PL': 'Polish',
      'NL': 'Dutch',
      'SV': 'Swedish',
      'NO': 'Norwegian',
      'NB': 'Norwegian',
      'DA': 'Danish',
      'FI': 'Finnish',
      'CS': 'Czech',
      'SK': 'Slovak',
      'HU': 'Hungarian',
      'RO': 'Romanian',
      'BG': 'Bulgarian',
      'HR': 'Croatian',
      'SR': 'Serbian',
      'SL': 'Slovenian',
      'LT': 'Lithuanian',
      'LV': 'Latvian',
      'ET': 'Estonian',
      'IS': 'Icelandic',
      'HI': 'Hindi',
      'BN': 'Bengali',
      'TL': 'Filipino',
      'MY': 'Burmese',
      'KM': 'Khmer',
      'LO': 'Lao',
      'NE': 'Nepali',
      'SI': 'Sinhalese',
      'TA': 'Tamil',
      'TE': 'Telugu',
      'KN': 'Kannada',
      'ML': 'Malayalam',
      'UZ': 'Uzbek',
      'KK': 'Kazakh',
      'AZ': 'Azerbaijani',
      'KA': 'Georgian',
      'HY': 'Armenian',
      'TR': 'Turkish',
      'SW': 'Swahili',
      'PT-BR': 'Portuguese (Brazil)',
      'ES-419': 'Spanish (Latin America)',
      'EN-GB': 'English (UK)'
    }
  };
  return translations[String(supportLang).toUpperCase()]?.[String(targetLang).toUpperCase()] || String(targetLang);
}

export function generateUnifiedPolyglotRendererHtml() {
  const localizationJson = JSON.stringify(localizationData);
  const outroIconJson = JSON.stringify(outroIconDataUris);
  const outroIconNameJson = JSON.stringify(outroIconNames);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700;800&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .font-outfit {
      font-family: 'Outfit', sans-serif;
    }
    .luna-card {
      background:
        radial-gradient(circle at 50% 4%, rgba(74, 144, 226, 0.085) 0%, rgba(74, 144, 226, 0) 38%),
        linear-gradient(135deg, #ffffff 0%, #f9fbff 58%, #f4f8fd 100%);
      box-shadow: 0 28px 60px -16px rgba(14, 34, 78, 0.14), 0 0 42px rgba(74, 144, 226, 0.055);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.065);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .intro-panel {
      width: 1480px;
      min-height: 710px;
      padding: 72px 88px;
      border-radius: 40px;
      background:
        radial-gradient(circle at 50% 10%, rgba(103, 173, 255, 0.12) 0%, rgba(103, 173, 255, 0) 42%),
        rgba(255, 255, 255, 0.065);
    }
    .intro-brand {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      color: #7ab6ff;
      padding: 12px 20px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .intro-title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 22px;
    }
    .intro-deck-title {
      color: #93c5fd;
      font-size: 64px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      line-height: 1.14;
      padding-bottom: 4px;
    }
    .intro-subtitle-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: max-content;
      max-width: 100%;
      margin: 0 auto;
      padding: 12px 28px;
      border-radius: 999px;
      background: rgba(147, 197, 253, 0.11);
      border: 1px solid rgba(147, 197, 253, 0.16);
      color: rgba(219, 234, 254, 0.88);
      font-size: 30px;
      font-weight: 700;
    }
    .polyglot-card-title {
      font-size: 88px;
      line-height: 1.15;
      font-weight: 800;
      color: #0e224e;
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0;
    }
    .polyglot-card-transcription {
      font-size: 40px;
      color: #64748b;
      font-weight: 400;
      margin-top: 8px;
    }
    .polyglot-chip {
      padding: 10px 24px;
      border-radius: 999px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      color: #1e40af;
      font-size: 26px;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      box-shadow: 0 6px 16px rgba(30, 64, 175, 0.05);
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .polyglot-study-frame {
      width: 100%;
      height: 100%;
      padding: 78px 104px 74px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 34px;
      background: radial-gradient(circle at 50% 22%, #ffffff 0%, #f7fbff 42%, #edf5fb 100%);
    }
    .polyglot-header-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 32px;
      padding: 0 2px;
    }
    .polyglot-header-title-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .polyglot-header-dot {
      width: 13px;
      height: 13px;
      border-radius: 999px;
      background: #3b82f6;
      box-shadow: 0 0 0 9px rgba(59, 130, 246, 0.12);
      flex: 0 0 13px;
    }
    .polyglot-header-title {
      color: #64748b;
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      line-height: 1.12;
      font-weight: 800;
      letter-spacing: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 1420px;
    }
    .polyglot-progress-text {
      color: #94a3b8;
      font-family: 'Outfit', sans-serif;
      font-size: 32px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0;
      flex: 0 0 auto;
    }
    .polyglot-progress-track {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(203, 213, 225, 0.62);
      overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.05);
      margin-top: 19px;
    }
    .polyglot-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: #3b82f6;
      box-shadow: 0 0 18px rgba(59, 130, 246, 0.24);
    }
    .polyglot-study-stack {
      width: 1280px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
      flex: 1;
      justify-content: flex-start;
    }
    .support-anchor-card,
    .target-study-card {
      position: relative;
      background:
        radial-gradient(circle at 55% 6%, rgba(147, 197, 253, 0.16) 0%, rgba(147, 197, 253, 0) 40%),
        linear-gradient(135deg, #ffffff 0%, #f8fbff 58%, #eef6ff 100%);
      border: 1px solid #cfe0f3;
      box-shadow: 0 22px 54px rgba(30, 64, 175, 0.08);
    }
    .support-anchor-card {
      height: 172px;
      border-radius: 26px;
      display: grid;
      grid-template-columns: 1fr 1.3fr 1fr;
      align-items: center;
      padding: 0 42px;
    }
    .target-study-card {
      height: 520px;
      border-radius: 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 76px 58px;
    }
    .language-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: max-content;
      max-width: 100%;
      min-height: 48px;
      padding: 8px 20px;
      border-radius: 999px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      color: #1d4ed8;
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0;
      box-shadow: 0 10px 24px rgba(30, 64, 175, 0.05);
      white-space: nowrap;
    }
    .language-pill img {
      height: 27px !important;
      width: auto !important;
      border-radius: 4px;
      box-shadow: none;
    }
    .support-language-pill {
      justify-self: start;
    }
    .support-anchor-word {
      color: #64748b;
      font-family: 'Outfit', sans-serif;
      font-size: 46px;
      line-height: 1.05;
      font-weight: 800;
      letter-spacing: 0;
      text-align: center;
      justify-self: center;
      max-width: 100%;
    }
    .target-language-pill {
      position: absolute;
      top: 58px;
      left: 50%;
      transform: translateX(-50%);
    }
    .target-study-word {
      color: #0e224e;
      font-family: 'Outfit', sans-serif;
      font-size: 68px;
      line-height: 1.08;
      font-weight: 800;
      letter-spacing: 0;
      text-align: center;
      max-width: 100%;
    }
    .target-study-transcription {
      color: #94a3b8;
      font-size: 31px;
      line-height: 1.18;
      font-style: italic;
      font-weight: 500;
      text-align: center;
      margin-top: 18px;
      max-width: 100%;
    }
    .target-prompt-language {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      color: #0e224e;
      font-family: 'Outfit', sans-serif;
      font-size: 54px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0;
    }
    .target-prompt-language img {
      height: 68px !important;
      width: auto !important;
      border-radius: 10px;
      box-shadow: 0 10px 20px rgba(30, 64, 175, 0.12);
    }
    .outro-feature-card {
      min-height: 94px;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.075);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .outro-icon-well {
      width: 62px;
      height: 62px;
      flex: 0 0 62px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: rgba(74, 144, 226, 0.09);
      border: 1px solid rgba(184, 217, 255, 0.12);
    }
    .outro-icon {
      width: 54px;
      height: 54px;
      object-fit: contain;
    }
    .outro-feature-text {
      color: #f8fbff;
      font-size: 24px;
      line-height: 1.2;
      font-weight: 700;
    }
    .outro-url-pill {
      margin-top: 4px;
      display: inline-flex;
      align-items: center;
      width: max-content;
      border-radius: 18px;
      padding: 16px 36px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 30px;
      font-weight: 800;
      box-shadow: 0 18px 36px rgba(37, 99, 235, 0.24);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .outro-qr-card {
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      padding: 28px;
      border-radius: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      box-shadow: 0 28px 58px rgba(0, 0, 0, 0.26);
      border: 1px solid rgba(184, 217, 255, 0.5);
    }
    .outro-qr-image {
      width: 350px;
      height: 350px;
      border-radius: 18px;
    }
    .outro-qr-label {
      color: #172033;
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0;
    }
  </style>
</head>
<body class="overflow-hidden w-[1920px] h-[1080px] m-0 p-0">

  <!-- Polyglot Card Layout Container -->
  <div id="card-layout" class="hidden polyglot-study-frame">
    <div>
      <div class="polyglot-header-row">
        <div class="polyglot-header-title-wrap">
          <span class="polyglot-header-dot"></span>
          <h2 id="card-header-title" class="polyglot-header-title">Vocabulary Lesson · Polyglot</h2>
        </div>
        <span id="card-progress-text" class="polyglot-progress-text">1 / 30</span>
      </div>
      <div class="polyglot-progress-track">
        <div id="card-progress-bar" class="polyglot-progress-fill" style="width: 0%;"></div>
      </div>
    </div>

    <div id="polyglot-study-stack" class="polyglot-study-stack">
      <div id="support-card" class="support-anchor-card">
        <div id="support-language-pill" class="language-pill support-language-pill">
          <span id="support-flag">🌐</span>
          <span id="support-language-label">Support</span>
        </div>
        <div id="support-word" class="support-anchor-word">word</div>
        <div></div>
      </div>

      <div id="target-card" class="target-study-card">
        <div id="target-language-pill" class="language-pill target-language-pill">
          <span id="target-flag">🌐</span>
          <span id="target-language-label">English</span>
        </div>
        <div id="target-word" class="target-study-word">target word</div>
        <div id="target-transcription" class="target-study-transcription">[transcription]</div>
      </div>
    </div>
  </div>

  <!-- Intro Layout Container -->
  <div id="intro-layout" class="hidden flex-col justify-center items-center w-full h-full box-border">
    <div class="glass-card intro-panel flex flex-col items-center justify-center gap-11">
      
      <!-- Top Branding -->
      <div class="intro-brand">
        <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        <span class="text-[40px] font-bold font-outfit tracking-wide">${BRAND_NAME}</span>
      </div>
      
      <!-- Main Content -->
      <div class="text-center flex flex-col gap-6">
        <!-- Flags Row -->
        <div class="flex justify-center items-center gap-4 text-5xl" id="intro-flags-row">
          <!-- Dynamically populated target flags -->
        </div>
        
        <!-- Polyglot Title -->
        <h1 id="intro-title" class="text-[54px] font-bold font-outfit text-white">Polyglot lesson</h1>
        <!-- Deck Title -->
        <h2 id="intro-deck-title" class="intro-deck-title">Deck Title</h2>
        <!-- Subtitle/Details -->
        <p id="intro-subtitle" class="intro-subtitle-pill">5 Languages · 50 cards</p>
      </div>

      <!-- Divider -->
      <div class="w-2/3 h-[1px] bg-white/10"></div>

      <!-- Description / How-to -->
      <div class="intro-description-panel text-center">
        <p id="intro-description" class="text-[29px] text-slate-200 leading-relaxed font-medium">
          Learn vocabulary in multiple languages at once!
        </p>
      </div>
      
    </div>
  </div>

  <!-- Outro Layout Container -->
  <div id="outro-layout" class="hidden flex-col justify-center items-center w-full h-full box-border">
    <div class="glass-card rounded-[40px] p-16 flex items-center gap-24 w-[1500px]">
      
      <!-- Left Side -->
      <div class="flex flex-col gap-8 flex-1 text-white">
        <div class="flex items-center gap-4 text-blue-400">
          <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span class="text-[40px] font-bold font-outfit tracking-wide">${BRAND_NAME}</span>
        </div>
        
        <div>
          <h1 id="outro-title" class="text-[64px] font-bold font-outfit leading-tight text-white mb-2">Learn these words forever</h1>
          <p id="outro-subtitle" class="text-[32px] text-blue-200 leading-relaxed max-w-2xl">Build your own language mix on FlashcardsLuna</p>
        </div>

        <!-- Badges Grid (8 features) -->
        <div class="grid grid-cols-2 gap-4 max-w-2xl text-slate-100">
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-0" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-0" class="outro-feature-text">Custom Tempo</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-1" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-1" class="outro-feature-text">Matching Game</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-2" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-2" class="outro-feature-text">Smart Algorithm</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-3" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-3" class="outro-feature-text">Images & Audio</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-4" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-4" class="outro-feature-text">Pomodoro Timer</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-5" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-5" class="outro-feature-text">Background Music</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-6" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-6" class="outro-feature-text">Study Chat</span>
          </div>
          <div class="outro-feature-card">
            <div class="outro-icon-well"><img id="outro-badge-icon-7" class="outro-icon" alt="" /></div>
            <span id="outro-badge-text-7" class="outro-feature-text">Personal Notes</span>
          </div>
        </div>

        <div id="outro-display-url" class="outro-url-pill">
          flashcardsluna.com/en/courses
        </div>
      </div>

      <!-- Right Side: QR Code -->
      <div class="outro-qr-card">
        <img id="outro-qr-image" src="${defaultOutroQrImageUrl}" class="outro-qr-image" />
        <span id="outro-qr-label" class="outro-qr-label">Scan me</span>
      </div>

    </div>
  </div>

  <script>
    const localizationData = ${localizationJson};
    const outroIconData = ${outroIconJson};
    const outroIconNames = ${outroIconNameJson};

    window.renderTask = (task) => {
      const { type, options } = task;
      
      if (type === 'outro') {
        document.getElementById('card-layout').style.display = 'none';
        document.getElementById('intro-layout').style.display = 'none';
        document.getElementById('outro-layout').style.display = 'flex';
        document.body.className = "flex flex-col justify-center items-center overflow-hidden w-[1920px] h-[1080px] m-0 p-0 text-white";
        document.body.style.background = 'linear-gradient(135deg, #0e224e 0%, #1a3673 100%)';
        
        document.getElementById('outro-title').textContent = options.title;
        document.getElementById('outro-subtitle').textContent = options.subtitle;
        document.getElementById('outro-qr-label').textContent = options.qrScanLabel || 'Scan me';
        document.getElementById('outro-qr-image').src = options.outroQrImageSrc || '${defaultOutroQrImageUrl}';
        document.getElementById('outro-display-url').textContent = options.outroDisplayUrl || 'flashcardsluna.com/en/courses';
        
        if (options.badges) {
          for (let i = 0; i < 8; i++) {
            const badge = options.badges[i];
            if (badge) {
              const iconName = badge.iconName || outroIconNames[i];
              document.getElementById(\`outro-badge-icon-\${i}\`).src = badge.iconSrc || outroIconData[iconName] || outroIconData[outroIconNames[i]];
              document.getElementById(\`outro-badge-text-\${i}\`).textContent = badge.text;
            }
          }
        }
      } else if (type === 'intro') {
        document.getElementById('card-layout').style.display = 'none';
        document.getElementById('outro-layout').style.display = 'none';
        document.getElementById('intro-layout').style.display = 'flex';
        document.body.className = "flex flex-col justify-center items-center overflow-hidden w-[1920px] h-[1080px] m-0 p-0 text-white";
        document.body.style.background = 'linear-gradient(135deg, #0e224e 0%, #1a3673 100%)';
        
        const flagsRow = document.getElementById('intro-flags-row');
        flagsRow.innerHTML = (options.flags || []).join(' ');
        
        document.getElementById('intro-title').textContent = options.introTitle || 'Polyglot lesson';
        document.getElementById('intro-deck-title').textContent = options.deckTitle;
        document.getElementById('intro-subtitle').textContent = options.subtitle;
        document.getElementById('intro-description').innerHTML = options.description;
      } else {
        document.getElementById('outro-layout').style.display = 'none';
        document.getElementById('intro-layout').style.display = 'none';
        document.getElementById('card-layout').style.display = 'flex';
        document.body.className = "overflow-hidden w-[1920px] h-[1080px] m-0 p-0 text-slate-800 box-border";
        document.body.style.background = 'radial-gradient(circle at center, #f5f8fa 0%, #e8f0f5 100%)';

        const {
          deckName,
          currentIndex,
          totalCards,
          activeWord,
          activeTranscription,
          activeFlag,
          langLabel,
          showTranscription,
          progressPercent,
          isQuestion,
          supportWord,
          supportFlag,
          supportLabel
        } = options;

        document.getElementById('card-header-title').textContent = deckName;
        document.getElementById('card-progress-text').textContent = \`\${currentIndex} / \${totalCards}\`;
        document.getElementById('card-progress-bar').style.width = \`\${progressPercent}%\`;

        document.getElementById('support-flag').innerHTML = supportFlag || activeFlag;
        document.getElementById('support-language-label').textContent = supportLabel || langLabel;
        document.getElementById('support-word').textContent = supportWord || activeWord || '';

        const targetCard = document.getElementById('target-card');
        const targetPill = document.getElementById('target-language-pill');
        const targetFlagEl = document.getElementById('target-flag');
        const targetLabelEl = document.getElementById('target-language-label');
        const targetWordEl = document.getElementById('target-word');
        const targetTranscriptionEl = document.getElementById('target-transcription');

        targetFlagEl.innerHTML = activeFlag;
        targetLabelEl.textContent = langLabel;
        
        if (isQuestion) {
          targetCard.style.visibility = 'visible';
          targetPill.style.display = 'none';
          targetWordEl.innerHTML = \`<span class="target-prompt-language">\${activeFlag}<span>\${langLabel}</span></span>\`;
          targetTranscriptionEl.style.display = 'none';
        } else {
          targetCard.style.visibility = 'visible';
          targetPill.style.display = 'inline-flex';
          targetWordEl.textContent = activeWord;
          if (showTranscription && activeTranscription) {
            targetTranscriptionEl.textContent = activeTranscription;
            targetTranscriptionEl.style.display = 'block';
          } else {
            targetTranscriptionEl.style.display = 'none';
          }
        }
      }
    };
  </script>
</body>
</html>`;
}
