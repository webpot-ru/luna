import { getFlagEmoji, getLanguageNameInLang } from "./card-slide-template.mjs";
import { BRAND_NAME } from "./brand.mjs";

export function generateSlideHtml(options) {
  const {
    deckName = 'Vocabulary Lesson',
    currentIndex = 1,
    totalCards = 5,
    targetLang = 'ES',
    targetWord = '',
    targetTranscription = '',
    supportWord = '',
    supportLang = 'RU',
    state = 'full', // 'word-only', 'word-and-translation', 'quiz-question', 'quiz-answer', 'flip'
    quizTimer = null,
    rotateY = 0
  } = options;

  const flag = getFlagEmoji(targetLang);

  const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/[\/\[\]()]/g, '');
  const showTranscription = targetTranscription && cleanStr(targetWord) !== cleanStr(targetTranscription);

  let levelLabel = 'Уровень A1';
  if (supportLang === 'EN' || supportLang === 'EN-GB') {
    levelLabel = 'Level A1';
  } else if (supportLang === 'ES' || supportLang === 'ES-419') {
    levelLabel = 'Nivel A1';
  }
  const localizedLangName = getLanguageNameInLang(targetLang, supportLang);
  const langLabel = supportLang === 'RU'
    ? `${localizedLangName} язык · ${levelLabel}`
    : `${localizedLangName} · ${levelLabel}`;

  const progressPercent = ((currentIndex / totalCards) * 100).toFixed(1);
  const isQuiz = state === 'quiz-question' || state === 'quiz-answer';

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
      background: radial-gradient(circle at center, #f5f8fa 0%, #e8f0f5 100%);
      width: 1080px;
      height: 1920px;
      overflow: hidden;
    }
    .font-outfit {
      font-family: 'Outfit', sans-serif;
    }
    .luna-card {
      background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
      box-shadow: 0 35px 70px -15px rgba(14, 34, 78, 0.12), 0 0 50px rgba(74, 144, 226, 0.06);
    }
    .timer-animation {
      animation: pulse 1s infinite alternate;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(1.1); opacity: 1; }
    }

    /* 3D Flip Card styles */
    .card-container {
      perspective: 1800px;
    }
    .card-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transform: rotateY(${rotateY}deg);
    }
    .card-face {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      box-sizing: border-box;
    }
    .card-front {
      z-index: 2;
      transform: rotateY(0deg);
    }
    .card-back {
      transform: rotateY(180deg);
    }
  </style>
</head>
<body class="flex flex-col justify-between p-16 relative">
  <!-- Top bar (Deck Name & Progress) -->
  <div class="w-full flex flex-col gap-4 mt-8 px-4">
    <div class="flex justify-between items-end">
      <div class="flex items-center gap-3">
        <span class="w-4 h-4 rounded-full ${isQuiz ? 'bg-amber-500' : 'bg-blue-500'}"></span>
        <h2 class="text-[34px] font-semibold text-slate-500 font-outfit tracking-wide">
          ${isQuiz ? (supportLang === 'RU' ? 'Мини-тест' : supportLang === 'ES' || supportLang === 'ES-419' ? 'Mini-test' : 'Mini-Test') : deckName}
        </h2>
      </div>
      <span class="text-[32px] font-bold text-slate-400 font-mono">
        ${isQuiz ? (supportLang === 'RU' ? `Вопрос ${currentIndex}/${totalCards}` : supportLang === 'ES' || supportLang === 'ES-419' ? `Pregunta ${currentIndex}/${totalCards}` : `Question ${currentIndex}/${totalCards}`) : `${currentIndex} / ${totalCards}`}
      </span>
    </div>
    <!-- Progress bar -->
    <div class="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden mt-2">
      <div class="h-full ${isQuiz ? 'bg-amber-500' : 'bg-blue-500'} rounded-full" style="width: ${progressPercent}%;"></div>
    </div>
  </div>

  <!-- Center Card Area -->
  <div class="my-auto flex justify-center items-center">
    ${state === 'flip' ? `
      <!-- 3D Flip Card Container -->
      <div class="card-container w-[920px] h-[1260px]">
        <div class="card-inner">

          <!-- Front Side (Word only) -->
          <div class="card-face card-front luna-card border border-[#cbdff2] rounded-[48px] p-16 flex flex-col justify-between" style="${rotateY > 90 ? 'display: none !important;' : ''}">
            <div class="flex justify-center items-center mt-12">
              <span class="text-8xl">${flag}</span>
            </div>

            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-4">
                <div class="flex items-center justify-center">
                  <h1 class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">${targetWord}</h1>
                </div>
                ${showTranscription ? `
                  <div class="text-[36px] text-slate-400/80 font-normal mt-2 text-center">${targetTranscription}</div>
                ` : ''}
              </div>
            </div>

            <div class="w-full text-center text-slate-400/80 text-[26px] tracking-wide font-semibold mb-6">
              ${langLabel}
            </div>
          </div>

          <!-- Back Side (Word + Translation) -->
          <div class="card-face card-back luna-card border border-[#cbdff2] rounded-[48px] p-16 flex flex-col justify-between" style="${rotateY <= 90 ? 'display: none !important;' : ''}">
            <div class="flex flex-col items-center gap-6 mt-12">
              <span class="text-8xl">${flag}</span>
              <div class="px-6 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-[26px] font-outfit tracking-wide">
                ${targetWord}
              </div>
            </div>

            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-4">
                <div class="flex items-center justify-center">
                  <h1 class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">${supportWord}</h1>
                </div>
              </div>
            </div>

            <div class="w-full text-center text-slate-400/80 text-[26px] tracking-wide font-semibold mb-6">
              ${langLabel}
            </div>
          </div>

        </div>
      </div>
    ` : `
      <!-- Static Card (Original States / Quiz) -->
      <div class="w-[920px] h-[1260px] luna-card border border-[#cbdff2] rounded-[48px] p-16 flex flex-col justify-between relative">

        <!-- Card Top Area -->
        <div class="flex flex-col items-center gap-6 mt-12 relative w-full">
          ${state === 'word-and-translation' || state === 'quiz-answer' ? `
            <span class="text-8xl">${flag}</span>
            <div class="px-6 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-[26px] font-outfit tracking-wide mt-2">
              ${targetWord}
            </div>
          ` : `
            <span class="text-8xl">${flag}</span>
          `}

          <!-- Timer Badge (Quiz Question) -->
          ${state === 'quiz-question' && quizTimer ? `
            <div class="absolute right-4 top-0 flex items-center justify-center w-16 h-16 rounded-full border-3 border-amber-400 bg-amber-50 text-[28px] font-extrabold text-amber-500 timer-animation font-mono shadow-md">
              ${quizTimer}
            </div>
          ` : ''}

          <!-- Success Badge (Quiz Answer) -->
          ${state === 'quiz-answer' ? `
            <div class="absolute right-4 top-0 flex items-center justify-center w-16 h-16 rounded-full border-3 border-emerald-400 bg-emerald-50 text-emerald-500 shadow-md">
              <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="4.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          ` : ''}
        </div>

        <!-- Card Central Content -->
        <div class="flex flex-col gap-8 my-auto">

          ${state === 'quiz-question' ? `
            <!-- Quiz Question: Centered placeholder and translation below -->
            <div class="flex justify-center items-center my-6 h-[140px]">
              <div class="h-[120px] w-[300px] border-3 border-dashed border-blue-300 bg-blue-50/30 rounded-3xl flex items-center justify-center text-blue-400 font-black text-[48px] font-outfit">
                ?
              </div>
            </div>
            <div class="w-full flex justify-center">
              <div class="w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
            </div>
            <div class="flex items-center justify-center h-[90px]">
              <h2 class="text-[44px] font-bold text-slate-500 font-outfit tracking-tight text-center leading-tight">${supportWord}</h2>
            </div>
          ` : (state === 'quiz-answer' ? `
            <!-- Quiz Answer: Centered Target word and translation below -->
            <div class="flex flex-col items-center justify-center my-6 h-[140px] gap-3">
              <h1 class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-none">${targetWord}</h1>
              ${showTranscription ? `
                <div class="text-[36px] text-slate-400/80 font-normal text-center mt-2 leading-none">${targetTranscription}</div>
              ` : ''}
            </div>
            <div class="w-full flex justify-center">
              <div class="w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
            </div>
            <div class="flex items-center justify-center h-[90px]">
              <h2 class="text-[44px] font-bold text-slate-500 font-outfit tracking-tight text-center leading-tight">${supportWord}</h2>
            </div>
          ` : (state === 'word-and-translation' ? `
            <!-- Flipped Card: Translation is large in the center -->
            <div class="flex items-center justify-center">
              <h1 class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">${supportWord}</h1>
            </div>
          ` : `
            <!-- Word Only -->
            <div class="flex flex-col items-center justify-center gap-4">
              <h1 class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">${targetWord}</h1>
              ${showTranscription ? `
                <div class="text-[36px] text-slate-400/80 font-normal text-center mt-2">${targetTranscription}</div>
              ` : ''}
            </div>
          `))}

        </div>

        <!-- Card Bottom Indicator -->
        <div class="w-full text-center text-slate-400/80 text-[26px] tracking-wide font-semibold mb-6">
          ${langLabel}
        </div>
      </div>
    `}
  </div>

  <!-- Branding Footer (Visible on all slides) -->
  <div class="w-full text-center pb-8 flex flex-col gap-1">
    <span class="text-slate-400/40 text-[28px] font-bold font-outfit tracking-wider">flashcardsluna.com</span>
  </div>
</body>
</html>`;
}

export function generateUnifiedRendererHtml() {
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
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .font-outfit {
      font-family: 'Outfit', sans-serif;
    }
    .luna-card {
      background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
      box-shadow: 0 35px 70px -15px rgba(14, 34, 78, 0.12), 0 0 50px rgba(74, 144, 226, 0.06);
    }
    .timer-animation {
      animation: pulse 1s infinite alternate;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(1.1); opacity: 1; }
    }

    /* 3D Flip Card styles */
    .card-container {
      perspective: 1800px;
    }
    .card-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: none;
    }
    .card-face {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      box-sizing: border-box;
    }
    .card-front {
      z-index: 2;
      transform: rotateY(0deg);
    }
    .card-back {
      transform: rotateY(180deg);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.3);
    }
    .shorts-flag img {
      height: 88px;
      width: auto;
      display: inline-block;
      border-radius: 8px;
      box-shadow: 0 12px 24px rgba(14, 34, 78, 0.12);
    }
  </style>
</head>
<body class="overflow-hidden w-[1080px] h-[1920px] m-0 p-0">

  <!-- Card Layout Container -->
  <div id="card-layout" class="hidden flex-col justify-between p-16 relative w-full h-full box-border">
    <!-- Top bar (Deck Name & Progress) -->
    <div class="w-full flex flex-col gap-4 mt-8 px-4">
      <div class="flex justify-between items-end">
        <div class="flex items-center gap-3">
          <span id="card-indicator" class="w-4 h-4 rounded-full bg-blue-500"></span>
          <h2 id="card-header-title" class="text-[34px] font-semibold text-slate-500 font-outfit tracking-wide">Vocabulary Lesson</h2>
        </div>
        <span id="card-progress-text" class="text-[32px] font-bold text-slate-400 font-mono">1 / 5</span>
      </div>
      <!-- Progress bar -->
      <div class="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden mt-2">
        <div id="card-progress-bar" class="h-full bg-blue-500 rounded-full" style="width: 0%;"></div>
      </div>
    </div>

    <!-- Center Card Area -->
    <div class="my-auto flex justify-center items-center">
      <!-- 3D Flip Card Container -->
      <div id="flip-container" class="hidden card-container w-[920px] h-[1260px]">
        <div id="card-inner" class="card-inner">

          <!-- Front Side (Word only) -->
          <div class="card-face card-front luna-card border border-[#cbdff2] rounded-[48px] p-16 flex flex-col justify-between">
            <div class="flex justify-center items-center mt-12">
              <span id="flip-front-flag" class="shorts-flag text-8xl">🌐</span>
            </div>

            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-4">
                <div class="flex items-center justify-center">
                  <h1 id="flip-front-word" class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">word</h1>
                </div>
                <div id="flip-front-transc" class="text-[36px] text-slate-400/80 font-normal text-center mt-2">transcription</div>
              </div>
            </div>

            <div id="flip-front-label" class="w-full text-center text-slate-400/80 text-[26px] tracking-wide font-semibold mb-6">Language · Level A1</div>
          </div>

          <!-- Back Side (Word + Translation) -->
          <div class="card-face card-back luna-card border border-[#cbdff2] rounded-[48px] p-16 flex flex-col justify-between">
            <div class="flex flex-col items-center gap-6 mt-12">
              <span id="flip-back-flag" class="shorts-flag text-8xl">🌐</span>
              <div id="flip-back-tag" class="px-6 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-[26px] font-outfit tracking-wide">word</div>
            </div>

            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-4">
                <div class="flex items-center justify-center">
                  <h1 id="flip-back-word" class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">translation</h1>
                </div>
              </div>
            </div>

            <div id="flip-back-label" class="w-full text-center text-slate-400/80 text-[26px] tracking-wide font-semibold mb-6">Language · Level A1</div>
          </div>

        </div>
      </div>

      <!-- Static Card -->
      <div id="static-container" class="hidden w-[920px] h-[1260px] luna-card border border-[#cbdff2] rounded-[48px] p-16 flex flex-col justify-between relative">
        <!-- Card Top Area -->
        <div class="flex flex-col items-center gap-6 mt-12 relative w-full">
          <div id="static-tag-wrapper" class="flex flex-col items-center gap-4 hidden opacity-0">
            <span id="static-flag" class="shorts-flag text-8xl">🌐</span>
            <div id="static-tag-word" class="px-6 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-[26px] font-outfit tracking-wide mt-2">word</div>
          </div>

          <div id="static-timer-badge" class="absolute right-4 top-0 flex items-center justify-center w-16 h-16 rounded-full border-3 border-amber-400 bg-amber-50 text-[28px] font-extrabold text-amber-500 timer-animation font-mono shadow-md hidden">
            <span id="static-timer-text">3</span>
          </div>

          <div id="static-success-badge" class="absolute right-4 top-0 flex items-center justify-center w-16 h-16 rounded-full border-3 border-emerald-400 bg-emerald-50 text-emerald-500 shadow-md hidden">
            <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="4.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>

        <!-- Card Central Content -->
        <div class="flex flex-col gap-8 my-auto">
          <!-- Quiz Question placeholder -->
          <div id="static-quiz-question-wrapper" class="flex justify-center items-center my-6 h-[140px] hidden">
            <div class="h-[120px] w-[300px] border-3 border-dashed border-blue-300 bg-blue-50/30 rounded-3xl flex items-center justify-center text-blue-400 font-black text-[48px] font-outfit">?</div>
          </div>
          <div id="static-divider" class="w-full flex justify-center hidden">
            <div class="w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
          </div>
          <div id="static-lower-text-wrapper" class="flex items-center justify-center h-[90px] hidden">
            <h2 id="static-lower-text" class="text-[44px] font-bold text-slate-500 font-outfit tracking-tight text-center leading-tight">translation</h2>
          </div>

          <div id="static-main-text-wrapper" class="flex flex-col items-center justify-center gap-4">
            <h1 id="static-main-text-word" class="text-[80px] font-extrabold text-[#0e224e] font-outfit tracking-tight text-center leading-tight">word</h1>
            <div id="static-main-text-transc" class="text-[36px] text-slate-400/80 font-normal text-center mt-2">transcription</div>
          </div>
        </div>

        <!-- Card Bottom Indicator -->
        <div id="static-label" class="w-full text-center text-slate-400/80 text-[26px] tracking-wide font-semibold mb-6">Language · Level A1</div>
      </div>
    </div>

    <!-- Branding Footer -->
    <div class="w-full text-center pb-8 flex flex-col gap-1">
      <span class="text-slate-400/40 text-[28px] font-bold font-outfit tracking-wider">flashcardsluna.com</span>
    </div>
  </div>

  <!-- Outro Layout Container (Retention-first Vertical Outro) -->
  <div id="outro-layout" class="hidden flex-col justify-center items-center w-full h-full box-border p-12">
    <div class="glass-card rounded-[48px] p-12 flex flex-col items-center justify-between w-[920px] h-[1720px] text-white">

      <!-- Brand Logo Header -->
      <div class="flex items-center gap-4 text-blue-400 mt-8">
        <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        <span class="text-[52px] font-black font-outfit tracking-wider text-white">${BRAND_NAME}</span>
      </div>

      <!-- Main Message Area -->
      <div class="text-center px-4">
        <h1 id="outro-title" class="text-[56px] font-black font-outfit leading-tight text-white mb-4">Learn these words forever</h1>
        <p id="outro-subtitle" class="text-[30px] text-blue-200 leading-relaxed font-medium">Practice decks for free on our website</p>
      </div>

      <!-- Feature Grid (Top 4 Features Stacked) -->
      <div class="flex flex-col gap-4 w-full px-6 max-w-xl">
        <div class="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 shadow-md">
          <span id="outro-badge-icon-0" class="text-[44px]">⚡️</span>
          <span id="outro-badge-text-0" class="text-[28px] font-bold text-slate-100">Custom Tempo</span>
        </div>
        <div class="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 shadow-md">
          <span id="outro-badge-icon-1" class="text-[44px]">🎮</span>
          <span id="outro-badge-text-1" class="text-[28px] font-bold text-slate-100">Matching Game</span>
        </div>
        <div class="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 shadow-md">
          <span id="outro-badge-icon-2" class="text-[44px]">🧠</span>
          <span id="outro-badge-text-2" class="text-[28px] font-bold text-slate-100">Smart Algorithm</span>
        </div>
        <div class="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 shadow-md">
          <span id="outro-badge-icon-3" class="text-[44px]">📝</span>
          <span id="outro-badge-text-3" class="text-[28px] font-bold text-slate-100">Personal Notes</span>
        </div>
      </div>

      <!-- CTA Button & Link in Bio Notice -->
      <div class="flex flex-col items-center gap-5 mb-12 w-full">
        <div id="outro-display-url" class="bg-blue-500 text-white rounded-2xl px-12 py-5 text-center font-bold text-[36px] shadow-xl shadow-blue-500/20 font-outfit w-max">
          flashcardsluna.com
        </div>
        <p id="outro-link-notice" class="text-[26px] text-amber-400 font-semibold text-center tracking-wide leading-relaxed mt-2 animate-bounce">
          👇 Ссылка на курс в профиле канала!
        </p>
      </div>

    </div>
  </div>

  <script>
    window.renderTask = (task) => {
      const { type, options } = task;

      if (type === 'outro') {
        document.getElementById('card-layout').style.display = 'none';
        document.getElementById('outro-layout').style.display = 'flex';
        document.body.className = "flex flex-col justify-center items-center overflow-hidden w-[1080px] h-[1920px] m-0 p-0 text-white";
        document.body.style.background = 'linear-gradient(135deg, #0e224e 0%, #1a3673 100%)';

        document.getElementById('outro-title').textContent = options.title;
        document.getElementById('outro-subtitle').textContent = options.subtitle;
        document.getElementById('outro-display-url').textContent = options.outroDisplayUrl || 'flashcardsluna.com';

        const noticeEl = document.getElementById('outro-link-notice');
        noticeEl.textContent = options.notice || '👇 Clickable link in the channel profile!';

        if (options.badges) {
          for (let i = 0; i < 4; i++) {
            const badge = options.badges[i];
            if (badge) {
              document.getElementById(\`outro-badge-icon-\${i}\`).textContent = badge.icon;
              document.getElementById(\`outro-badge-text-\${i}\`).textContent = badge.text;
            }
          }
        }
      } else {
        document.getElementById('outro-layout').style.display = 'none';
        document.getElementById('card-layout').style.display = 'flex';
        document.body.className = "flex flex-col justify-between p-16 relative overflow-hidden w-[1080px] h-[1920px] m-0 text-slate-800 box-border";
        document.body.style.background = 'radial-gradient(circle at center, #f5f8fa 0%, #e8f0f5 100%)';

        const {
          deckName,
          currentIndex,
          totalCards,
          targetWord,
          targetTranscription,
          supportWord,
          supportLang,
          state,
          quizTimer,
          rotateY,
          flag,
          langLabel,
          quizTitle,
          quizQuestionLabel,
          showTranscription,
          progressPercent
        } = options;

        const isQuiz = state === 'quiz-question' || state === 'quiz-answer';

        const ind = document.getElementById('card-indicator');
        if (isQuiz) {
          ind.classList.remove('bg-blue-500');
          ind.classList.add('bg-amber-500');
        } else {
          ind.classList.remove('bg-amber-500');
          ind.classList.add('bg-blue-500');
        }

        let headerTitle = deckName;
        if (isQuiz) {
          headerTitle = quizTitle || 'Mini-Test';
        }
        document.getElementById('card-header-title').textContent = headerTitle;

        let progressText = \`\${currentIndex} / \${totalCards}\`;
        if (isQuiz) {
          progressText = quizQuestionLabel || \`Question \${currentIndex}/\${totalCards}\`;
        }
        document.getElementById('card-progress-text').textContent = progressText;

        const pBar = document.getElementById('card-progress-bar');
        pBar.style.width = \`\${progressPercent}%\`;
        if (isQuiz) {
          pBar.classList.remove('bg-blue-500');
          pBar.classList.add('bg-amber-500');
        } else {
          pBar.classList.remove('bg-amber-500');
          pBar.classList.add('bg-blue-500');
        }

        if (state === 'flip') {
          document.getElementById('flip-container').style.display = 'block';
          document.getElementById('static-container').style.display = 'none';

          document.getElementById('card-inner').style.transform = \`rotateY(\${rotateY}deg)\`;

          const frontFace = document.querySelector('.card-front');
          const backFace = document.querySelector('.card-back');
          if (rotateY <= 90) {
            frontFace.style.display = 'flex';
            backFace.style.display = 'none';
          } else {
            frontFace.style.display = 'none';
            backFace.style.display = 'flex';
          }

          document.getElementById('flip-front-flag').innerHTML = flag;
          document.getElementById('flip-front-word').textContent = targetWord;
          const fTransc = document.getElementById('flip-front-transc');
          if (showTranscription) {
            fTransc.textContent = targetTranscription;
            fTransc.style.display = 'block';
          } else {
            fTransc.style.display = 'none';
          }
          document.getElementById('flip-front-label').textContent = langLabel;

          document.getElementById('flip-back-flag').innerHTML = flag;
          document.getElementById('flip-back-tag').textContent = targetWord;
          document.getElementById('flip-back-word').textContent = supportWord;
          document.getElementById('flip-back-label').textContent = langLabel;
        } else {
          document.getElementById('flip-container').style.display = 'none';
          document.getElementById('static-container').style.display = 'flex';

          document.getElementById('static-flag').innerHTML = flag;

          const tagW = document.getElementById('static-tag-wrapper');
          if (state === 'word-and-translation' || state === 'quiz-answer') {
            tagW.style.display = 'flex';
            tagW.classList.remove('hidden', 'opacity-0');
            document.getElementById('static-tag-word').textContent = targetWord;
          } else {
            tagW.style.display = 'none';
            tagW.classList.add('hidden', 'opacity-0');
          }

          const timerB = document.getElementById('static-timer-badge');
          if (state === 'quiz-question' && quizTimer) {
            timerB.style.display = 'flex';
            timerB.classList.remove('hidden');
            document.getElementById('static-timer-text').textContent = quizTimer;
          } else {
            timerB.style.display = 'none';
            timerB.classList.add('hidden');
          }

          const succB = document.getElementById('static-success-badge');
          if (state === 'quiz-answer') {
            succB.style.display = 'flex';
            succB.classList.remove('hidden');
          } else {
            succB.style.display = 'none';
            succB.classList.add('hidden');
          }

          const qQWrapper = document.getElementById('static-quiz-question-wrapper');
          const divider = document.getElementById('static-divider');
          const lowerTWrapper = document.getElementById('static-lower-text-wrapper');
          const mainTWrapper = document.getElementById('static-main-text-wrapper');

          if (state === 'quiz-question') {
            qQWrapper.style.display = 'flex';
            qQWrapper.classList.remove('hidden');
            divider.style.display = 'block';
            divider.classList.remove('hidden');
            lowerTWrapper.style.display = 'flex';
            lowerTWrapper.classList.remove('hidden');
            mainTWrapper.style.display = 'none';
            mainTWrapper.classList.add('hidden');
            document.getElementById('static-lower-text').textContent = supportWord;
          } else if (state === 'quiz-answer') {
            qQWrapper.style.display = 'none';
            qQWrapper.classList.add('hidden');
            divider.style.display = 'block';
            divider.classList.remove('hidden');
            lowerTWrapper.style.display = 'flex';
            lowerTWrapper.classList.remove('hidden');
            mainTWrapper.style.display = 'flex';
            mainTWrapper.classList.remove('hidden');
            document.getElementById('static-main-text-word').textContent = targetWord;

            const mTransc = document.getElementById('static-main-text-transc');
            if (showTranscription) {
              mTransc.textContent = targetTranscription;
              mTransc.style.display = 'block';
              mTransc.classList.remove('hidden');
            } else {
              mTransc.style.display = 'none';
              mTransc.classList.add('hidden');
            }
            document.getElementById('static-lower-text').textContent = supportWord;
          } else if (state === 'word-and-translation') {
            qQWrapper.style.display = 'none';
            qQWrapper.classList.add('hidden');
            divider.style.display = 'none';
            divider.classList.add('hidden');
            lowerTWrapper.style.display = 'none';
            lowerTWrapper.classList.add('hidden');
            mainTWrapper.style.display = 'flex';
            mainTWrapper.classList.remove('hidden');
            document.getElementById('static-main-text-word').textContent = supportWord;
            document.getElementById('static-main-text-transc').style.display = 'none';
          } else {
            // Word only
            qQWrapper.style.display = 'none';
            qQWrapper.classList.add('hidden');
            divider.style.display = 'none';
            divider.classList.add('hidden');
            lowerTWrapper.style.display = 'none';
            lowerTWrapper.classList.add('hidden');
            mainTWrapper.style.display = 'flex';
            mainTWrapper.classList.remove('hidden');
            document.getElementById('static-main-text-word').textContent = targetWord;

            const mTransc = document.getElementById('static-main-text-transc');
            if (showTranscription) {
              mTransc.textContent = targetTranscription;
              mTransc.style.display = 'block';
              mTransc.classList.remove('hidden');
            } else {
              mTransc.style.display = 'none';
              mTransc.classList.add('hidden');
            }
          }
          document.getElementById('static-label').textContent = langLabel;
        }
      }
    };
  </script>
</body>
</html>`;
}
