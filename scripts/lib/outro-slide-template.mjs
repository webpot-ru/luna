export function getOutroText(supportLang) {
  const lang = String(supportLang).toUpperCase();
  if (lang === 'RU') {
    return "Хочешь запомнить эти слова навсегда? Переходи на флэшкардс луна точка ком и тренируй эту и тысячи других колод абсолютно бесплатно. Ссылка в описании!";
  } else if (lang === 'ES' || lang === 'ES-419') {
    return "¿Quieres recordar estas palabras para siempre? Ve a flashcardsluna.com y practica este y miles de otros mazos gratis. ¡Enlace en la descripción!";
  } else if (lang === 'TR') {
    return "Bu kelimeleri sonsuza dek hatırlamak ister misiniz? flashcardsluna.com adresine gidin ve bu ve diğer binlerce desteyi ücretsiz olarak çalışın. Bağlantı açıklamada!";
  } else if (lang === 'PT' || lang === 'PT-BR') {
    return "Quer lembrar estas palavras para sempre? Vá para flashcardsluna.com e pratique este e milhares de outros baralhos gratuitamente. Link na descrição!";
  } else if (lang === 'KO') {
    return "이 단어들을 영원히 기억하고 싶으신가요? flashcardsluna.com을 방문하여 이 카드 세트와 수천 개의 다른 세트들을 무료로 연습해 보세요. 링크는 설명란에 있습니다!";
  } else if (lang === 'JA') {
    return "これらの単語を一生忘れないようにしたいですか？flashcardsluna.comにアクセスして、このデッキや他の何千ものデッキを無料で練習しましょう。リンクは概要欄にあります！";
  } else if (lang === 'HI') {
    return "क्या आप इन शब्दों को हमेशा के लिए याद रखना चाहते हैं? flashcardsluna.com पर जाएं और इस और हजारों अन्य डेक का मुफ्त में अभ्यास करें। लिंक विवरण में है!";
  } else if (lang === 'UZ') {
    return "Bu so'zlarni abadiy eslab qolishni xohlaysizmi? flashcardsluna.com saytiga o'tishingiz va ushbu va boshqa minglab kartochkalar to'plamini mutlaqo bepul mashq qilishingiz mumkin. Havola tavsifda!";
  } else if (lang === 'AZ') {
    return "Bu sözləri həmişəlik yadda saxlamaq istəyirsiniz? flashcardsluna.com saytına daxil olun və bu və digər minlərlə dəsti tamamilə pulsuz məşq edin. Keçid təsvirdədir!";
  } else if (lang === 'KK') {
    return "Бұл сөздерді мәңгі есте сақтағыңыз келе ме? flashcardsluna.com сайтына өтіп, осы және басқа да мыңдаған жинақтарды мүлдем тегін жаттықтырыңыз. Сілтеме сипаттамада!";
  } else if (lang === 'KA') {
    return "გსურთ ამ სიტყვების სამუდამოდ დამახსოვრება? გადადით flashcardsluna.com-ზე და ივარჯიშეთ ამ და ათასობით სხვა კოლექციაზე სრულიად უფასოდ. ბმული აღწერაშია!";
  } else if (lang === 'HY') {
    return "Ցանկանու՞մ եք հավերժ հիշել այս բառերը։ Անցեք flashcardsluna.com կայք և մարզեք այս և հազարավոր այլ հավաքածուներ բոլորովին անվճար։ Հղումը նկարագրության մեջ է։";
  }
  // Default fallback English
  return "Want to remember these words forever? Go to flashcardsluna.com and practice this and thousands of other decks for free. Link in the description!";
}

export function generateOutroHtml(supportLang) {
  const lang = String(supportLang).toUpperCase();
  let title = "Learn these words forever";
  let subtitle = "Practice decks for free on our website";
  
  let badgeSpeed = "⚡️ Custom Tempo";
  let badgeMatch = "🎮 Matching Game";
  let badgeSmart = "🧠 Smart Algorithm";
  let badgeMedia = "🖼️ Images & Audio";
  let badgePomo = "⏱️ Pomodoro Timer";
  let badgeMusic = "🎵 Background Music";
  let badgeChat = "💬 Study Chat";
  let badgeNotes = "📝 Personal Notes";

  if (lang === 'RU') {
    title = "Выучи эти слова навсегда";
    subtitle = "Тренируй колоды бесплатно на сайте";
    badgeSpeed = "⚡️ Свой темп";
    badgeMatch = "🎮 Игра «Найди пару»";
    badgeSmart = "🧠 Умный алгоритм";
    badgeMedia = "🖼️ Картинки и звук";
    badgePomo = "⏱️ Таймер Помодоро";
    badgeMusic = "🎵 Фоновая музыка";
    badgeChat = "💬 Чат и друзья";
    badgeNotes = "📝 Свои заметки";
  } else if (lang === 'ES' || lang === 'ES-419') {
    title = "Aprende estas palabras para siempre";
    subtitle = "Practica mazos gratis en nuestro sitio web";
    badgeSpeed = "⚡️ Ritmo propio";
    badgeMatch = "🎮 Juego Match";
    badgeSmart = "🧠 Algoritmo inteligente";
    badgeMedia = "🖼️ Imágenes y audio";
    badgePomo = "⏱️ Temporizador Pomodoro";
    badgeMusic = "🎵 Música de fondo";
    badgeChat = "💬 Chat y amigos";
    badgeNotes = "📝 Notas de estudio";
  } else if (lang === 'TR') {
    title = "Bu kelimeleri sonsuza dek öğrenin";
    subtitle = "Sitemizde desteleri ücretsiz olarak çalışın";
    badgeSpeed = "⚡️ Kendi Temponuz";
    badgeMatch = "🎮 Eşleştirme Oyunu";
    badgeSmart = "🧠 Akıllı Algoritma";
    badgeMedia = "🖼️ Resimler ve Ses";
    badgePomo = "⏱️ Pomodoro Sayacı";
    badgeMusic = "🎵 Arka Plan Müzikleri";
    badgeChat = "💬 Çalışma Sohbeti";
    badgeNotes = "📝 Kişisel Notlar";
  } else if (lang === 'PT' || lang === 'PT-BR') {
    title = "Aprenda estas palavras para sempre";
    subtitle = "Pratique baralhos grátis em nosso site";
    badgeSpeed = "⚡️ Ritmo Próprio";
    badgeMatch = "🎮 Jogo da Memória";
    badgeSmart = "🧠 Algoritmo Inteligente";
    badgeMedia = "🖼️ Imagens e Áudio";
    badgePomo = "⏱️ Timer Pomodoro";
    badgeMusic = "🎵 Música de Fundo";
    badgeChat = "💬 Chat de Estudos";
    badgeNotes = "📝 Notas Pessoais";
  } else if (lang === 'KO') {
    title = "이 단어들을 영원히 기억하세요";
    subtitle = "웹사이트에서 무료로 카드 세트를 연습하세요";
    badgeSpeed = "⚡️ 맞춤형 학습 템포";
    badgeMatch = "🎮 짝맞추기 게임";
    badgeSmart = "🧠 스마트 암기 알고리즘";
    badgeMedia = "🖼️ 이미지 및 오디오 지원";
    badgePomo = "⏱️ 뽀모도로 타이머";
    badgeMusic = "🎵 백그라운드 음악";
    badgeChat = "💬 학습 채팅방";
    badgeNotes = "📝 나만의 학습 메모";
  } else if (lang === 'JA') {
    title = "これらの単語を一生忘れない";
    subtitle = "ウェブサイトで無料デッキを練習する";
    badgeSpeed = "⚡️ 自分のペース";
    badgeMatch = "🎮 神経衰弱ゲーム";
    badgeSmart = "🧠 記憶アルゴリズム";
    badgeMedia = "🖼️ 画像と音声に対応";
    badgePomo = "⏱️ ポモドーロタイマー";
    badgeMusic = "🎵 BGM音楽";
    badgeChat = "💬 勉強用チャット";
    badgeNotes = "📝 個人メモ機能";
  } else if (lang === 'HI') {
    title = "इन शब्दों को हमेशा के लिए याद रखें";
    subtitle = "हमारी वेबसाइट पर मुफ़्त में डेक का अभ्यास करें";
    badgeSpeed = "⚡️ खुद की गति";
    badgeMatch = "🎮 मैच खेलें";
    badgeSmart = "🧠 स्मार्ट एल्गोरिदम";
    badgeMedia = "🖼️ चित्र और ध्वनि";
    badgePomo = "⏱️ पोमोडोरो टाइमर";
    badgeMusic = "🎵 पृष्ठभूमि संगीत";
    badgeChat = "💬 अध्ययन चैट";
    badgeNotes = "📝 व्यक्तिगत नोट्स";
  } else if (lang === 'UZ') {
    title = "Bu so'zlarni abadiy eslab qoling";
    subtitle = "Saytimizda kartochkalar to'plamini bepul mashq qiling";
    badgeSpeed = "⚡️ O'z tempingiz";
    badgeMatch = "🎮 Juftini top o'yini";
    badgeSmart = "🧠 Aqlli algoritm";
    badgeMedia = "🖼️ Rasm va ovoz";
    badgePomo = "⏱️ Pomodoro taymeri";
    badgeMusic = "🎵 Fon musiqasi";
    badgeChat = "💬 O'quv chati";
    badgeNotes = "📝 Shaxsiy eslatmalar";
  } else if (lang === 'AZ') {
    title = "Bu sözləri həmişəlik öyrənin";
    subtitle = "Saytımızda dəstləri pulsuz məşq edin";
    badgeSpeed = "⚡️ Öz tempiniz";
    badgeMatch = "🎮 Uyğunluq oyunu";
    badgeSmart = "🧠 Ağıllı alqoritm";
    badgeMedia = "🖼️ Şəkillər və səs";
    badgePomo = "⏱️ Pomodoro taymeri";
    badgeMusic = "🎵 Fon musiqisi";
    badgeChat = "💬 Dərs söhbəti";
    badgeNotes = "📝 Şəxsi qeydlər";
  } else if (lang === 'KK') {
    title = "Бұл сөздерді мәңгілікке үйреніңіз";
    subtitle = "Біздің сайтта жинақтарды тегін жаттықтырыңыз";
    badgeSpeed = "⚡️ Өз қарқыныңыз";
    badgeMatch = "🎮 «Жұбын тап» ойыны";
    badgeSmart = "🧠 Ақылды алгоритм";
    badgeMedia = "🖼️ Суреттер мен дыбыс";
    badgePomo = "⏱️ Помодоро таймері";
    badgeMusic = "🎵 Фондық музыка";
    badgeChat = "💬 Оқу чаты";
    badgeNotes = "📝 Жеке жазбалар";
  } else if (lang === 'KA') {
    title = "ისწავლეთ ეს სიტყვები სამუდამოდ";
    subtitle = "ივარჯიშეთ კოლექციებზე უფასოდ ჩვენს საიტზე";
    badgeSpeed = "⚡️ საკუთარი ტემპი";
    badgeMatch = "🎮 თამაში «იპოვე წყვილი»";
    badgeSmart = "🧠 ჭკვიანი ალგორითმი";
    badgeMedia = "🖼️ სურათები და ხმა";
    badgePomo = "⏱️ პომოდოროს ტაიმერი";
    badgeMusic = "🎵 ფონური მუსიკა";
    badgeChat = "💬 სასწავლო ჩატი";
    badgeNotes = "📝 პირადი შენიშვნები";
  } else if (lang === 'HY') {
    title = "Սովորեք այս բառերը հավերժ";
    subtitle = "Մարզեք հավաքածուները անվճար մեր կայքում";
    badgeSpeed = "⚡️ Ձեր տեմպով";
    badgeMatch = "🎮 «Գտիր զույգը» խաղ";
    badgeSmart = "🧠 Խելացի ալգորիթմ";
    badgeMedia = "🖼️ Պատկերներ և ձայն";
    badgePomo = "⏱️ Պոմոդորոյի ժամաչափ";
    badgeMusic = "🎵 Ֆոնային երաժշտություն";
    badgeChat = "💬 Ուսումնական չատ";
    badgeNotes = "📝 Անձնական նշումներ";
  }

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
