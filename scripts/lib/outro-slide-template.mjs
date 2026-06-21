import fs from "node:fs";
import path from "node:path";
import { getPublicCourseDisplayUrl, getPublicCourseUrl, getQrCodeImageUrl } from "./video-public-url.mjs";
import { getOutroIconDataUris, outroIconNames } from "./video-outro-icons.mjs";
import { BRAND_NAME } from "./brand.mjs";

const localizationPath = path.resolve("config/video-localization.json");
const localizationData = JSON.parse(fs.readFileSync(localizationPath, "utf8"));
const outroIconDataUris = getOutroIconDataUris();

export function getOutroText(supportLang) {
  const lang = String(supportLang).toUpperCase();
  const langData = localizationData[lang] || localizationData['EN'];
  return langData.outro_speech || "Want to remember these words forever? Go to flashcardsluna.com and practice this and thousands of other decks for free. Link in the description!";
}

export function generateOutroHtml(supportLang, options = {}) {
  const lang = String(supportLang).toUpperCase();
  const langData = localizationData[lang] || localizationData['EN'];
  
  let title = langData.outro_title || "Learn these words forever";
  let subtitle = langData.outro_subtitle || "Practice decks for free on our website";
  
  let badgeSpeed = langData.badge_speed || "⚡️ Custom Tempo";
  let badgeMatch = langData.badge_match || "🎮 Matching Game";
  let badgeSmart = langData.badge_smart || "🧠 Smart Algorithm";
  let badgeMedia = langData.badge_media || "🖼️ Images & Audio";
  let badgePomo = langData.badge_pomo || "⏱️ Pomodoro Timer";
  let badgeMusic = langData.badge_music || "🎵 Background Music";
  let badgeChat = langData.badge_chat || "💬 Study Chat";
  let badgeNotes = langData.badge_notes || "📝 Personal Notes";
  let qrScanLabel = langData.qr_scan_label || "Scan me";
  const outroUrl = options.outroUrl || getPublicCourseUrl({ setId: options.setId, supportLang, targetLang: options.targetLang });
  const outroDisplayUrl = options.outroDisplayUrl || getPublicCourseDisplayUrl(outroUrl);
  const qrImageUrl = getQrCodeImageUrl(outroUrl);
  const badgeValues = [
    { iconName: outroIconNames[0], text: badgeSpeed.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[1], text: badgeMatch.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[2], text: badgeSmart.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[3], text: badgeMedia.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[4], text: badgePomo.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[5], text: badgeMusic.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[6], text: badgeChat.split(' ').slice(1).join(' ') },
    { iconName: outroIconNames[7], text: badgeNotes.split(' ').slice(1).join(' ') }
  ];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #0e224e 0%, #1a3673 100%);
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .font-outfit {
      font-family: 'Outfit', sans-serif;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
<body>
  
  <div class="glass-card rounded-[40px] p-16 flex items-center gap-24 w-[1500px]">
    
    <!-- Left Side: Text, Badges and CTA -->
    <div class="flex flex-col gap-8 flex-1">
      <div class="flex items-center gap-4 text-blue-400">
        <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        <span class="text-[40px] font-bold font-outfit tracking-wide">${BRAND_NAME}</span>
      </div>
      
      <div>
        <h1 class="text-[64px] font-bold font-outfit leading-tight text-white mb-2">
          ${title}
        </h1>
        <p class="text-[32px] text-blue-200 leading-relaxed max-w-2xl">
          ${subtitle}
        </p>
      </div>

      <!-- Feature Badges Grid (8 features) -->
      <div class="grid grid-cols-2 gap-4 max-w-2xl">
        ${badgeValues.map((badge) => `
          <div class="outro-feature-card">
            <div class="outro-icon-well">
              <img src="${outroIconDataUris[badge.iconName]}" class="outro-icon" alt="" />
            </div>
            <span class="outro-feature-text">${badge.text}</span>
          </div>
        `).join('')}
      </div>

      <div class="outro-url-pill">
        ${outroDisplayUrl}
      </div>
    </div>

    <!-- Right Side: QR Code -->
    <div class="outro-qr-card">
      <img src="${qrImageUrl}" class="outro-qr-image" />
      <span class="outro-qr-label">${qrScanLabel}</span>
    </div>

  </div>

</body>
</html>`;
}
