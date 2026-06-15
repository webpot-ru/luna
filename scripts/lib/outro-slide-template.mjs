import fs from "node:fs";
import path from "node:path";

const localizationPath = path.resolve("config/video-localization.json");
const localizationData = JSON.parse(fs.readFileSync(localizationPath, "utf8"));

export function getOutroText(supportLang) {
  const lang = String(supportLang).toUpperCase();
  const langData = localizationData[lang] || localizationData['EN'];
  return langData.outro_speech || "Want to remember these words forever? Go to flashcardsluna.com and practice this and thousands of other decks for free. Link in the description!";
}

export function generateOutroHtml(supportLang) {
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
        <span class="text-[40px] font-bold font-outfit tracking-wide">LunaCards</span>
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
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeSpeed.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeSpeed.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeMatch.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeMatch.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeSmart.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeSmart.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeMedia.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeMedia.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgePomo.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgePomo.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeMusic.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeMusic.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeChat.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeChat.split(' ').slice(1).join(' ')}</span>
        </div>
        <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
          <span class="text-[36px]">${badgeNotes.split(' ')[0]}</span>
          <span class="text-[26px] font-semibold text-slate-100">${badgeNotes.split(' ').slice(1).join(' ')}</span>
        </div>
      </div>

      <div class="mt-2 bg-blue-500 text-white rounded-2xl px-12 py-5 inline-flex items-center w-max font-bold text-[36px] shadow-lg shadow-blue-500/30 font-outfit">
        flashcardsluna.com
      </div>
    </div>

    <!-- Right Side: QR Code -->
    <div class="bg-white p-6 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=https://flashcardsluna.com&margin=10" class="w-[350px] h-[350px] rounded-xl" />
      <span class="text-slate-800 text-[24px] font-bold font-outfit tracking-wider">SCAN ME</span>
    </div>

  </div>

</body>
</html>`;
}
