export const flagMap = {
  'EN': '🇺🇸',
  'EN-GB': '🇬🇧',
  'ES': '🇪🇸',
  'ES-419': '🇲🇽',
  'RU': '🇷🇺',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'IT': '🇮🇹',
  'PT': '🇵🇹',
  'PT-BR': '🇧🇷',
  'JA': '🇯🇵',
  'KO': '🇰🇷',
  'ZH': '🇨🇳',
  'VI': '🇻🇳',
  'TH': '🇹🇭',
  'TR': '🇹🇷',
  'NL': '🇳🇱',
  'SV': '🇸🇪',
  'NO': '🇳🇴',
  'NB': '🇳🇴',
  'DA': '🇩🇰',
  'FI': '🇫🇮',
  'PL': '🇵🇱',
  'CS': '🇨🇿',
  'SK': '🇸🇰',
  'HU': '🇭🇺',
  'RO': '🇷🇴',
  'BG': '🇧🇬',
  'HR': '🇭🇷',
  'SR': '🇷🇸',
  'SL': '🇸🇮',
  'LT': '🇱🇹',
  'LV': '🇱🇻',
  'ET': '🇪🇪',
  'IS': '🇮🇸',
  'HI': '🇮🇳',
  'BN': '🇧🇩',
  'TL': '🇵🇭',
  'MY': '🇲🇲',
  'KM': '🇰🇭',
  'LO': '🇱🇦',
  'NE': '🇳🇵',
  'SI': '🇱🇰',
  'TA': '🇮🇳',
  'TE': '🇮🇳',
  'KN': '🇮🇳',
  'ML': '🇮🇳',
  'UZ': '🇺🇿',
  'KK': '🇰🇿',
  'AZ': '🇦🇿',
  'KA': '🇬🇪',
  'HY': '🇦🇲',
  'SW': '🇰🇪'
};

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
    },
    'ES': {
      'EN': 'Inglés',
      'ES': 'Español',
      'FR': 'Francés',
      'DE': 'Alemán',
      'IT': 'Italiano',
      'PT': 'Portugués',
      'RU': 'Ruso',
      'ZH': 'Chino',
      'JA': 'Japonés',
      'KO': 'Coreano',
      'VI': 'Vietnamita',
      'TH': 'Tailandés',
      'MS': 'Malayo',
      'ID': 'Indonesio',
      'PL': 'Polaco',
      'NL': 'Neerlandés',
      'SV': 'Sueco',
      'NO': 'Noruego',
      'NB': 'Noruego',
      'DA': 'Danés',
      'FI': 'Finlandés',
      'CS': 'Checo',
      'SK': 'Eslovaco',
      'HU': 'Húngaro',
      'RO': 'Rumano',
      'BG': 'Búlgaro',
      'HR': 'Croata',
      'SR': 'Serbio',
      'SL': 'Esloveno',
      'LT': 'Lituano',
      'LV': 'Letón',
      'ET': 'Estonio',
      'IS': 'Islandés',
      'HI': 'Hindi',
      'BN': 'Bengalí',
      'TL': 'Filipino',
      'MY': 'Birmano',
      'KM': 'Jemer',
      'LO': 'Laosiano',
      'NE': 'Nepalí',
      'SI': 'Cingalés',
      'TA': 'Tamil',
      'TE': 'Telugu',
      'KN': 'Kannada',
      'ML': 'Malayalam',
      'UZ': 'Uzbeko',
      'KK': 'Kazajo',
      'AZ': 'Azeriyano',
      'KA': 'Georgiano',
      'HY': 'Armenio',
      'TR': 'Turco',
      'SW': 'Suajili',
      'PT-BR': 'Portugués (Brasil)',
      'ES-419': 'Español (Latinoamérica)',
      'EN-GB': 'Inglés (Reino Unido)'
    },
    'UZ': {
      'EN': 'Ingliz',
      'ES': 'Ispan',
      'RU': 'Rus',
      'FR': 'Fransuz',
      'DE': 'Nemis',
      'IT': 'Italyan',
      'ZH': 'Xitoy',
      'JA': 'Yapon',
      'KO': 'Koreys',
      'TR': 'Turk',
      'UZ': 'O\'zbek'
    },
    'AZ': {
      'EN': 'İngilis',
      'ES': 'İspan',
      'RU': 'Rus',
      'FR': 'Fransız',
      'DE': 'Alman',
      'IT': 'İtalyan',
      'ZH': 'Çin',
      'JA': 'Yapon',
      'KO': 'Koreya',
      'TR': 'Türk',
      'AZ': 'Azərbaycan'
    },
    'KK': {
      'EN': 'Ағылшын',
      'ES': 'Испан',
      'RU': 'Орыс',
      'FR': 'Француз',
      'DE': 'Неміс',
      'IT': 'Итальян',
      'ZH': 'Қытай',
      'JA': 'Жапон',
      'KO': 'Корей',
      'TR': 'Түрік',
      'KK': 'Қазақ'
    },
    'KA': {
      'EN': 'ინგლისური',
      'ES': 'ესპანური',
      'RU': 'რუსული',
      'FR': 'ფრანგული',
      'DE': 'გერმანული',
      'IT': 'იტალიური',
      'ZH': 'ჩინური',
      'JA': 'იაპონური',
      'KO': 'კორეული',
      'TR': 'თურქული',
      'KA': 'ქართული'
    },
    'HY': {
      'EN': 'Անգլերեն',
      'ES': 'Իսպաներեն',
      'RU': 'Ռուսերեն',
      'FR': 'Ֆրանսերեն',
      'DE': 'Գերմաներեն',
      'IT': 'Իտալերեն',
      'ZH': 'Չինարեն',
      'JA': 'Ճապոներեն',
      'KO': 'Կորեերեն',
      'TR': 'Թուրքերեն',
      'HY': 'Հայերեն'
    }
  };

  const target = String(targetLang).toUpperCase();
  const support = String(supportLang).toUpperCase();
  const supportMap = translations[support];
  if (supportMap && supportMap[target]) {
    return supportMap[target];
  }
  const enMap = translations['EN'];
  return enMap[target] || target;
}

export function getLanguageName(langCode) {
  return getLanguageNameInLang(langCode, 'RU');
}

export function generateSlideHtml(options) {
  const {
    deckName = 'Vocabulary Lesson',
    currentIndex = 1,
    totalCards = 30,
    targetLang = 'ES',
    targetWord = '',
    targetTranscription = '',
    targetExample = '',
    supportWord = '',
    supportLang = 'RU',
    state = 'full', // 'word-only', 'word-and-translation', 'quiz-question', 'quiz-answer', 'flip'
    quizTimer = null,
    rotateY = 0
  } = options;

  const flag = getFlagEmoji(targetLang);
  
  const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/[\/\[\]()]/g, '');
  const showTranscription = targetTranscription && cleanStr(targetWord) !== cleanStr(targetTranscription);
  
  // Localized levels and language label
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

  // Render variables based on state
  const isWordVisible = state === 'word-only' || state === 'quiz-answer';
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
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }
    .font-outfit {
      font-family: 'Outfit', sans-serif;
    }
    .luna-card {
      background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
      box-shadow: 0 25px 50px -12px rgba(14, 34, 78, 0.08), 0 0 40px rgba(74, 144, 226, 0.04);
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
      perspective: 1500px;
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
  <div class="w-full flex flex-col gap-4">
    <div class="flex justify-between items-end px-4">
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full ${isQuiz ? 'bg-amber-500' : 'bg-blue-500'}"></span>
        <h2 class="text-[32px] font-medium text-slate-500 font-outfit tracking-wide">
          ${isQuiz ? (supportLang === 'RU' ? 'Мини-тест · Переведите слово' : supportLang === 'ES' || supportLang === 'ES-419' ? 'Mini-test · Traduce la palabra' : 'Mini-Test · Translate the word') : deckName}
        </h2>
      </div>
      <span class="text-[28px] font-semibold text-slate-400 font-mono">
        ${isQuiz ? (supportLang === 'RU' ? `Вопрос ${currentIndex} из ${totalCards}` : supportLang === 'ES' || supportLang === 'ES-419' ? `Pregunta ${currentIndex} de ${totalCards}` : `Question ${currentIndex} of ${totalCards}`) : `${currentIndex} / ${totalCards}`}
      </span>
    </div>
    <!-- Progress bar -->
    <div class="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
      <div class="h-full ${isQuiz ? 'bg-amber-500' : 'bg-blue-500'} rounded-full" style="width: ${progressPercent}%;"></div>
    </div>
  </div>

  <!-- Center Card Area -->
  <div class="my-auto flex justify-center items-center">
    ${state === 'flip' ? `
      <!-- 3D Flip Card Container -->
      <div class="card-container w-[1300px] h-[660px]">
        <div class="card-inner">
          
          <!-- Front Side (Word only) -->
          <div class="card-face card-front luna-card border border-[#cbdff2] rounded-[36px] p-16 flex flex-col justify-between">
            <div class="flex justify-center items-center mt-4">
              <span class="text-5xl">${flag}</span>
            </div>
            
            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center justify-center">
                  <h1 class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">${targetWord}</h1>
                </div>
                ${showTranscription ? `
                  <div class="text-[28px] text-slate-400/80 font-normal mt-1">${targetTranscription}</div>
                ` : ''}
              </div>
            </div>

            <div class="w-full text-center text-slate-400/80 text-[22px] tracking-wide font-medium">
              ${langLabel}
            </div>
          </div>

          <!-- Back Side (Word + Translation) -->
          <div class="card-face card-back luna-card border border-[#cbdff2] rounded-[36px] p-16 flex flex-col justify-between">
            <div class="flex justify-center items-center gap-4 mt-4">
              <span class="text-5xl">${flag}</span>
              <div class="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-[20px] font-outfit tracking-wide ml-2">
                ${targetWord}
              </div>
            </div>
            
            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center justify-center">
                  <h1 class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">${supportWord}</h1>
                </div>
              </div>
            </div>

            <div class="w-full text-center text-slate-400/80 text-[22px] tracking-wide font-medium">
              ${langLabel}
            </div>
          </div>

        </div>
      </div>
    ` : `
      <!-- Static Card (Original States / Quiz) -->
      <div class="w-[1300px] h-[660px] luna-card border border-[#cbdff2] rounded-[36px] p-16 flex flex-col justify-between relative">
        
        <!-- Card Top Area -->
        <div class="flex justify-center items-center relative w-full mt-4">
          ${state === 'word-and-translation' || state === 'quiz-answer' ? `
            <div class="flex items-center gap-4">
              <span class="text-5xl">${flag}</span>
              <div class="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-[20px] font-outfit tracking-wide">
                ${targetWord}
              </div>
            </div>
          ` : `
            <span class="text-5xl">${flag}</span>
          `}

          <!-- Timer Badge (Top Right Corner) during quiz question -->
          ${state === 'quiz-question' && quizTimer ? `
            <div class="absolute right-0 top-0 flex items-center justify-center w-14 h-14 rounded-full border-2 border-amber-400 bg-amber-50 text-[24px] font-bold text-amber-500 timer-animation font-mono shadow-sm">
              ${quizTimer}
            </div>
          ` : ''}

          <!-- Success Badge (Top Right Corner) during quiz answer -->
          ${state === 'quiz-answer' ? `
            <div class="absolute right-0 top-0 flex items-center justify-center w-14 h-14 rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-500 shadow-sm">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          ` : ''}
        </div>

        <!-- Card Central Content (Word & Example) -->
        <div class="flex flex-col gap-8 my-auto">
          
          ${state === 'quiz-question' ? `
            <!-- Quiz Question: Centered placeholder and translation below -->
            <div class="flex justify-center items-center my-4 h-[116px]">
              <div class="h-[96px] w-[350px] border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-[36px] font-outfit">
                ?
              </div>
            </div>
            <div class="w-full flex justify-center">
              <div class="w-1/3 h-[1.5px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
            </div>
            <div class="flex items-center justify-center h-[72px]">
              <h2 class="text-[36px] font-semibold text-slate-500 font-outfit tracking-tight">${supportWord}</h2>
            </div>
          ` : (state === 'quiz-answer' ? `
            <!-- Quiz Answer: Centered Target word and translation below -->
            <div class="flex flex-col items-center justify-center my-4 h-[116px] gap-2">
              <h1 class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight leading-none">${targetWord}</h1>
              ${showTranscription ? `
                <div class="text-[28px] text-slate-400/80 font-normal mt-2 leading-none">${targetTranscription}</div>
              ` : ''}
            </div>
            <div class="w-full flex justify-center">
              <div class="w-1/3 h-[1.5px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
            </div>
            <div class="flex items-center justify-center h-[72px]">
              <h2 class="text-[36px] font-semibold text-slate-500 font-outfit tracking-tight">${supportWord}</h2>
            </div>
          ` : (state === 'word-and-translation' ? `
            <!-- Flipped Card: Translation is large in the center -->
            <div class="flex items-center justify-center">
              <h1 class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">${supportWord}</h1>
            </div>
          ` : `
            <!-- Word Only (State 1) -->
            <div class="flex flex-col items-center justify-center gap-3">
              <h1 class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">${targetWord}</h1>
              ${showTranscription ? `
                  <div class="text-[28px] text-slate-400/80 font-normal mt-1">${targetTranscription}</div>
                ` : ''}
              </div>
            `))}

          </div>

          <!-- Card Bottom Indicator -->
          <div class="w-full text-center text-slate-400/80 text-[22px] tracking-wide font-medium">
            ${langLabel}
          </div>
        </div>
      `}
    </div>

    <!-- Centered Branding Footer (Clean video design, no interactive buttons) -->
    <div class="w-full text-center pb-4">
      <span class="text-slate-400/50 text-[24px] font-medium font-outfit tracking-wider">flashcardsluna.com</span>
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
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .font-outfit {
      font-family: 'Outfit', sans-serif;
    }
    .luna-card {
      background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
      box-shadow: 0 25px 50px -12px rgba(14, 34, 78, 0.08), 0 0 40px rgba(74, 144, 226, 0.04);
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
      perspective: 1500px;
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
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
  </style>
</head>
<body class="overflow-hidden w-[1920px] h-[1080px] m-0 p-0">

  <!-- Card Layout Container -->
  <div id="card-layout" class="hidden flex-col justify-between p-16 relative w-full h-full box-border">
    <!-- Top bar (Deck Name & Progress) -->
    <div class="w-full flex flex-col gap-4">
      <div class="flex justify-between items-end px-4">
        <div class="flex items-center gap-3">
          <span id="card-indicator" class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <h2 id="card-header-title" class="text-[32px] font-medium text-slate-500 font-outfit tracking-wide">Vocabulary Lesson</h2>
        </div>
        <span id="card-progress-text" class="text-[28px] font-semibold text-slate-400 font-mono">1 / 30</span>
      </div>
      <!-- Progress bar -->
      <div class="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
        <div id="card-progress-bar" class="h-full bg-blue-500 rounded-full" style="width: 0%;"></div>
      </div>
    </div>

    <!-- Center Card Area -->
    <div class="my-auto flex justify-center items-center">
      <!-- 3D Flip Card Container -->
      <div id="flip-container" class="hidden card-container w-[1300px] h-[660px]">
        <div id="card-inner" class="card-inner">
          
          <!-- Front Side (Word only) -->
          <div class="card-face card-front luna-card border border-[#cbdff2] rounded-[36px] p-16 flex flex-col justify-between">
            <div class="flex justify-center items-center mt-4">
              <span id="flip-front-flag" class="text-5xl">🌐</span>
            </div>
            
            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center justify-center">
                  <h1 id="flip-front-word" class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">word</h1>
                </div>
                <div id="flip-front-transc" class="text-[28px] text-slate-400/80 font-normal mt-1">transcription</div>
              </div>
            </div>

            <div id="flip-front-label" class="w-full text-center text-slate-400/80 text-[22px] tracking-wide font-medium">Language · Level A1</div>
          </div>

          <!-- Back Side (Word + Translation) -->
          <div class="card-face card-back luna-card border border-[#cbdff2] rounded-[36px] p-16 flex flex-col justify-between">
            <div class="flex justify-center items-center gap-4 mt-4">
              <span id="flip-back-flag" class="text-5xl">🌐</span>
              <div id="flip-back-tag" class="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-[20px] font-outfit tracking-wide ml-2">word</div>
            </div>
            
            <div class="flex flex-col gap-8 my-auto">
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center justify-center">
                  <h1 id="flip-back-word" class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">translation</h1>
                </div>
              </div>
            </div>

            <div id="flip-back-label" class="w-full text-center text-slate-400/80 text-[22px] tracking-wide font-medium">Language · Level A1</div>
          </div>

        </div>
      </div>

      <!-- Static Card -->
      <div id="static-container" class="hidden w-[1300px] h-[660px] luna-card border border-[#cbdff2] rounded-[36px] p-16 flex flex-col justify-between relative">
        <!-- Card Top Area -->
        <div class="flex justify-center items-center relative w-full mt-4">
          <div id="static-tag-wrapper" class="flex items-center gap-4 hidden opacity-0">
            <span id="static-flag" class="text-5xl">🌐</span>
            <div id="static-tag-word" class="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-[20px] font-outfit tracking-wide">word</div>
          </div>

          <div id="static-timer-badge" class="absolute right-0 top-0 flex items-center justify-center w-14 h-14 rounded-full border-2 border-amber-400 bg-amber-50 text-[24px] font-bold text-amber-500 timer-animation font-mono shadow-sm hidden">
            <span id="static-timer-text">3</span>
          </div>

          <div id="static-success-badge" class="absolute right-0 top-0 flex items-center justify-center w-14 h-14 rounded-full border-2 border-emerald-400 bg-emerald-50 text-emerald-500 shadow-sm hidden">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>

        <!-- Card Central Content -->
        <div class="flex flex-col gap-8 my-auto">
          <!-- Quiz Question placeholder -->
          <div id="static-quiz-question-wrapper" class="flex justify-center items-center my-4 h-[116px] hidden">
            <div class="h-[96px] w-[350px] border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-[36px] font-outfit">?</div>
          </div>
          <div id="static-divider" class="w-full flex justify-center hidden">
            <div class="w-1/3 h-[1.5px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
          </div>
          <div id="static-lower-text-wrapper" class="flex items-center justify-center h-[72px] hidden">
            <h2 id="static-lower-text" class="text-[36px] font-semibold text-slate-500 font-outfit tracking-tight">translation</h2>
          </div>

          <div id="static-main-text-wrapper" class="flex flex-col items-center justify-center gap-3">
            <h1 id="static-main-text-word" class="text-[64px] font-bold text-[#0e224e] font-outfit tracking-tight">word</h1>
            <div id="static-main-text-transc" class="text-[28px] text-slate-400/80 font-normal mt-1">transcription</div>
          </div>
        </div>

        <!-- Card Bottom Indicator -->
        <div id="static-label" class="w-full text-center text-slate-400/80 text-[22px] tracking-wide font-medium">Language · Level A1</div>
      </div>
    </div>

    <!-- Centered Branding Footer -->
    <div class="w-full text-center pb-4">
      <span class="text-slate-400/50 text-[24px] font-medium font-outfit tracking-wider">flashcardsluna.com</span>
    </div>
  </div>

  <!-- Intro Layout Container -->
  <div id="intro-layout" class="hidden flex-col justify-center items-center w-full h-full box-border">
    <div class="glass-card rounded-[40px] p-16 flex flex-col items-center justify-center gap-12 w-[1400px]">
      
      <!-- Top Branding -->
      <div class="flex items-center gap-4 text-blue-400">
        <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        <span class="text-[40px] font-bold font-outfit tracking-wide">LunaCards</span>
      </div>
      
      <!-- Main Content -->
      <div class="text-center flex flex-col gap-6">
        <!-- Flag & Target Lang Title -->
        <div class="flex items-center justify-center gap-6">
          <span id="intro-flag" class="text-[64px] inline-block"></span>
          <h1 id="intro-title" class="text-[64px] font-bold font-outfit text-white">Target Language</h1>
        </div>
        
        <!-- Deck Title -->
        <h2 id="intro-deck-title" class="text-[52px] font-bold font-outfit text-blue-300">Deck Title</h2>
        
        <!-- Subtitle/Details -->
        <p id="intro-subtitle" class="text-[32px] text-blue-200/80 font-medium">Level A1 · 50 cards</p>
      </div>

      <!-- Divider -->
      <div class="w-2/3 h-[1px] bg-white/10"></div>

      <!-- Description / How-to -->
      <div class="text-center max-w-4xl">
        <p id="intro-description" class="text-[28px] text-slate-300 leading-relaxed">
          Listen carefully to the native pronunciation and repeat the words in pauses.
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
          <span class="text-[40px] font-bold font-outfit tracking-wide">LunaCards</span>
        </div>
        
        <div>
          <h1 id="outro-title" class="text-[64px] font-bold font-outfit leading-tight text-white mb-2">Learn these words forever</h1>
          <p id="outro-subtitle" class="text-[32px] text-blue-200 leading-relaxed max-w-2xl">Practice decks for free on our website</p>
        </div>

        <!-- Badges Grid (8 features) -->
        <div class="grid grid-cols-2 gap-4 max-w-2xl text-slate-100">
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-0" class="text-[36px]">⚡️</span>
            <span id="outro-badge-text-0" class="text-[26px] font-semibold">Custom Tempo</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-1" class="text-[36px]">🎮</span>
            <span id="outro-badge-text-1" class="text-[26px] font-semibold">Matching Game</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-2" class="text-[36px]">🧠</span>
            <span id="outro-badge-text-2" class="text-[26px] font-semibold">Smart Algorithm</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-3" class="text-[36px]">🖼️</span>
            <span id="outro-badge-text-3" class="text-[26px] font-semibold">Images & Audio</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-4" class="text-[36px]">⏱️</span>
            <span id="outro-badge-text-4" class="text-[26px] font-semibold">Pomodoro Timer</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-5" class="text-[36px]">🎵</span>
            <span id="outro-badge-text-5" class="text-[26px] font-semibold">Background Music</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-6" class="text-[36px]">💬</span>
            <span id="outro-badge-text-6" class="text-[26px] font-semibold">Study Chat</span>
          </div>
          <div class="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-sm">
            <span id="outro-badge-icon-7" class="text-[36px]">📝</span>
            <span id="outro-badge-text-7" class="text-[26px] font-semibold">Personal Notes</span>
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
  </div>

  <script>
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
        
        if (options.badges) {
          for (let i = 0; i < 8; i++) {
            const badge = options.badges[i];
            if (badge) {
              document.getElementById(\`outro-badge-icon-\${i}\`).textContent = badge.icon;
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
        
        document.getElementById('intro-flag').innerHTML = options.flag;
        document.getElementById('intro-title').textContent = options.title;
        document.getElementById('intro-deck-title').textContent = options.deckTitle;
        document.getElementById('intro-subtitle').textContent = options.subtitle;
        document.getElementById('intro-description').innerHTML = options.description;
      } else {
        document.getElementById('outro-layout').style.display = 'none';
        document.getElementById('intro-layout').style.display = 'none';
        document.getElementById('card-layout').style.display = 'flex';
        document.body.className = "flex flex-col justify-between p-16 relative overflow-hidden w-[1920px] h-[1080px] m-0 text-slate-800 box-border";
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
          showTranscription,
          progressPercent
        } = options;

        const isQuiz = state === 'quiz-question' || state === 'quiz-answer';
        
        // Progress indicator color
        const ind = document.getElementById('card-indicator');
        if (isQuiz) {
          ind.classList.remove('bg-blue-500');
          ind.classList.add('bg-amber-500');
        } else {
          ind.classList.remove('bg-amber-500');
          ind.classList.add('bg-blue-500');
        }
        
        // Header title text
        let headerTitle = deckName;
        if (isQuiz) {
          if (supportLang === 'RU') headerTitle = 'Мини-тест · Переведите слово';
          else if (supportLang === 'ES' || supportLang === 'ES-419') headerTitle = 'Mini-test · Traduce la palabra';
          else headerTitle = 'Mini-Test · Translate the word';
        }
        document.getElementById('card-header-title').textContent = headerTitle;

        // Progress label text
        let progressText = \`\${currentIndex} / \${totalCards}\`;
        if (isQuiz) {
          if (supportLang === 'RU') progressText = \`Вопрос \${currentIndex} из \${totalCards}\`;
          else if (supportLang === 'ES' || supportLang === 'ES-419') progressText = \`Pregunta \${currentIndex} de \${totalCards}\`;
          else progressText = \`Question \${currentIndex} of \${totalCards}\`;
        }
        document.getElementById('card-progress-text').textContent = progressText;

        // Progress bar width & color
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

          // Front side elements
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

          // Back side elements
          document.getElementById('flip-back-flag').innerHTML = flag;
          document.getElementById('flip-back-tag').textContent = targetWord;
          document.getElementById('flip-back-word').textContent = supportWord;
          document.getElementById('flip-back-label').textContent = langLabel;
        } else {
          document.getElementById('flip-container').style.display = 'none';
          document.getElementById('static-container').style.display = 'flex';

          document.getElementById('static-flag').innerHTML = flag;
          
          // Tag wrapper
          const tagW = document.getElementById('static-tag-wrapper');
          if (state === 'word-and-translation' || state === 'quiz-answer') {
            tagW.style.display = 'flex';
            tagW.classList.remove('hidden', 'opacity-0');
            document.getElementById('static-tag-word').textContent = targetWord;
          } else {
            tagW.style.display = 'none';
            tagW.classList.add('hidden', 'opacity-0');
          }

          // Timer badge
          const timerB = document.getElementById('static-timer-badge');
          if (state === 'quiz-question' && quizTimer) {
            timerB.style.display = 'flex';
            timerB.classList.remove('hidden');
            document.getElementById('static-timer-text').textContent = quizTimer;
          } else {
            timerB.style.display = 'none';
            timerB.classList.add('hidden');
          }

          // Success badge
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
            
            const mTransc = document.getElementById('static-main-text-transc');
            mTransc.style.display = 'none';
            mTransc.classList.add('hidden');
          } else {
            // word-only
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

