#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { 
  fetchDeckCards, 
  fetchDeckMetadata,
  fetchDeckTitle, 
  getVoiceForLanguage, 
  getTtsAudio, 
  getAudioDuration,
  generateSilentAudio
} from "./lib/video-generator.mjs";
import { 
  generateUnifiedRendererHtml, 
  getFlagEmoji, 
  getLanguageNameInLang 
} from "./lib/card-slide-template.mjs";
import { getOutroText } from "./lib/outro-slide-template.mjs";
import { getPublicCourseDisplayUrl, getPublicCourseUrl, getQrCodeImageUrl } from "./lib/video-public-url.mjs";
import { outroIconNames } from "./lib/video-outro-icons.mjs";

const localizationPath = path.resolve("config/video-localization.json");
const localizationData = JSON.parse(fs.readFileSync(localizationPath, "utf8"));

const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/[\/\[\]()]/g, '');
const stripSentenceTerminator = (s) => String(s || '').trim().replace(/[.!?。！？։။။।]+$/u, '').trim();

function buildIntroMetadataSubtitle(metadata, cardsLength, wordsLabel, fallbackLevelLabel) {
  const title = String(metadata?.title || '').trim();
  const description = String(metadata?.description || '').trim();
  let descriptionWithoutTitle = description;

  if (title && description.startsWith(title)) {
    descriptionWithoutTitle = description.slice(title.length).trim();
  }

  descriptionWithoutTitle = stripSentenceTerminator(descriptionWithoutTitle.replace(/^[.!?。！？։။။।]+/u, '').trim());
  const levelText = descriptionWithoutTitle || stripSentenceTerminator(metadata?.levelSignal) || fallbackLevelLabel;
  return `${levelText} · ${cardsLength} ${wordsLabel}`;
}

function getIntroWordsLabel(count, supportLang, defaultWordsLabel) {
  const supportUpper = String(supportLang).toUpperCase();
  if (supportUpper === "RU") {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "слово";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "слова";
    return "слов";
  }
  return defaultWordsLabel;
}

function extractLevel(setId) {
  const match = setId.match(/_(a[12]|b[12]|c[12])(_(a[12]|b[12]|c[12]))?$/i);
  if (match) {
    return match[0].substring(1).toUpperCase().replace('_', '-');
  }
  return 'A1';
}

function getLanguageLabel(targetLang, supportLang, levelCode = 'A1') {
  const supportUpper = String(supportLang).toUpperCase();
  const langData = localizationData[supportUpper] || localizationData['EN'];
  const prefix = langData.level_prefix || 'Level';
  const levelLabel = `${prefix} ${levelCode}`;
  const localizedLangName = getLanguageNameInLang(targetLang, supportLang);
  const titleTemplate = langData.intro_title_template || "{target_lang}";
  const formattedTitle = titleTemplate.replace("{target_lang}", localizedLangName);
  return `${formattedTitle} · ${levelLabel}`;
}

function buildCardOptions({
  deckTitle,
  currentIndex,
  totalCards,
  targetLang,
  supportLang,
  card,
  state,
  quizTimer = null,
  rotateY = 0
}) {
  const targetWord = card.target_display;
  const targetTranscription = card.target_transcription;
  const supportWord = card.support_display;
  const showTranscription = targetTranscription && cleanStr(targetWord) !== cleanStr(targetTranscription);
  const flag = getFlagEmoji(targetLang);
  const levelCode = extractLevel(setId);
  const langLabel = getLanguageLabel(targetLang, supportLang, levelCode);
  const progressPercent = ((currentIndex / totalCards) * 100).toFixed(1);

  return {
    deckName: deckTitle,
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
  };
}

const args = process.argv.slice(2);
let setId = "";
let targetLang = "";
let supportLang = "RU";
let voiceTarget = "";
let voiceSupport = "";
let quizLimit = 5;
let noQuiz = false;
let transitionMode = "static";

// Parse args
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--set" && args[i + 1]) {
    setId = args[i + 1];
    i++;
  } else if (args[i] === "--target" && args[i + 1]) {
    targetLang = args[i + 1].toUpperCase();
    i++;
  } else if (args[i] === "--support" && args[i + 1]) {
    supportLang = args[i + 1].toUpperCase();
    i++;
  } else if (args[i] === "--voice-target" && args[i + 1]) {
    voiceTarget = args[i + 1];
    i++;
  } else if (args[i] === "--voice-support" && args[i + 1]) {
    voiceSupport = args[i + 1];
    i++;
  } else if (args[i] === "--quiz-limit" && args[i + 1]) {
    quizLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--no-quiz") {
    noQuiz = true;
  } else if (args[i] === "--transition" && args[i + 1]) {
    transitionMode = args[i + 1].toLowerCase();
    i++;
  }
}

if (!setId || !targetLang) {
  console.error("Usage: node scripts/build-deck-video.mjs --set <set_id> --target <target_lang> [--support <support_lang>] [--voice-target <voice>] [--voice-support <voice>] [--quiz-limit <N>] [--no-quiz] [--transition <static|flip>]");
  process.exit(1);
}

if (transitionMode !== "static" && transitionMode !== "flip") {
  console.error("Error: --transition must be 'static' or 'flip'");
  process.exit(1);
}

// Default voices
if (!voiceTarget) voiceTarget = getVoiceForLanguage(targetLang);
if (!voiceSupport) voiceSupport = getVoiceForLanguage(supportLang);

async function main() {
  console.log(`=== LunaCards Video Generator ===`);
  console.log(`Set ID: ${setId}`);
  console.log(`Target Language: ${targetLang} (Voice: ${voiceTarget})`);
  console.log(`Support Language: ${supportLang} (Voice: ${voiceSupport})`);
  console.log(`Quiz Limit: ${noQuiz ? 'Disabled' : quizLimit}`);
  console.log(`Transition Mode: ${transitionMode}`);
  console.log(`=================================`);

  // 1. Fetch cards data
  console.log("Connecting to Postgres and fetching cards...");
  const cards = await fetchDeckCards(setId, targetLang, supportLang);
  if (cards.length === 0) {
    console.error(`Error: No cards found for set_id=${setId} and target_lang=${targetLang}`);
    process.exit(1);
  }
  console.log(`Fetched ${cards.length} cards from database.`);

  // Fetch localized Course Metadata for the intro slide.
  const deckMetadata = await fetchDeckMetadata(setId, supportLang);
  const deckTitle = deckMetadata.title || await fetchDeckTitle(setId, supportLang);
  console.log(`Deck Title: "${deckTitle}"`);

  // 2. Setup folders
  const outputDir = path.resolve(`outputs/video-generator/${setId}_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}`);
  const cacheDir = path.resolve("outputs/video-generator/cache");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  
  // Make voice cache subfolders
  const voiceTargetCache = path.join(cacheDir, voiceTarget);
  const voiceSupportCache = path.join(cacheDir, voiceSupport);
  fs.mkdirSync(voiceTargetCache, { recursive: true });
  fs.mkdirSync(voiceSupportCache, { recursive: true });

  const segments = [];
  const tempWavFiles = [];

  // Helper to convert MP3 to WAV
  const mp3ToWav = (mp3Path, wavPath) => {
    const normCmd = `ffmpeg -y -i "${mp3Path}" -ar 48000 -ac 2 "${wavPath}"`;
    execSync(normCmd, { stdio: "ignore" });
    return wavPath;
  };

  // 3. Generate silent audio helpers
  const silent1sPath = path.join(outputDir, "silent-1s.wav");
  const silent2sPath = path.join(outputDir, "silent-2s.wav");
  const silent3sPath = path.join(outputDir, "silent-3s.wav");
  const silent004sPath = path.join(outputDir, "silent-0.04s.wav");
  generateSilentAudio(1.0, silent1sPath);
  generateSilentAudio(2.0, silent2sPath);
  generateSilentAudio(3.0, silent3sPath);
  generateSilentAudio(0.04, silent004sPath);

  // Helper function to queue segment
  const queueSegment = (taskType, taskOptions, audioPath, durationOverride, segmentName, pauseDuration = 0) => {
    const duration = durationOverride || getAudioDuration(audioPath);
    segments.push({
      taskType,
      taskOptions,
      audioPath,
      duration,
      segmentName,
      pauseDuration
    });
  };

  let targetName = getLanguageNameInLang(targetLang, supportLang);
  const supportUpper = String(supportLang).toUpperCase();
  if (supportUpper === 'RU' || supportUpper === 'ES' || supportUpper === 'ES-419') {
    targetName = targetName.toLowerCase();
  }
  
  let cleanDeckTitle = stripSentenceTerminator(deckTitle);
  
  const langData = localizationData[supportUpper] || localizationData['EN'];
  const introSpeechTemplate = langData.intro_speech_template || "Learning {target_lang}. Lesson topic: {deck_title}.";
  const introAudioText = introSpeechTemplate
    .replace("{target_lang}", targetName)
    .replace("{deck_title}", cleanDeckTitle);

  // 3.5 Pre-fetch all TTS Audios in parallel batches
  console.log("\n--- Pre-fetching all TTS Audios in parallel batches ---");
  const ttsTasks = [];

  // Add intro voiceover text
  ttsTasks.push({
    text: introAudioText,
    voiceId: voiceSupport,
    langCode: supportLang,
    cacheDir: voiceSupportCache
  });
  
  for (const card of cards) {
    if (card.target_display) {
      ttsTasks.push({
        text: card.target_display,
        voiceId: voiceTarget,
        langCode: targetLang,
        cacheDir: voiceTargetCache
      });
    }
    if (card.support_display) {
      ttsTasks.push({
        text: card.support_display,
        voiceId: voiceSupport,
        langCode: supportLang,
        cacheDir: voiceSupportCache
      });
    }
  }
  
  const outroTextForPrefetch = getOutroText(supportLang);
  if (outroTextForPrefetch) {
    ttsTasks.push({
      text: outroTextForPrefetch,
      voiceId: voiceSupport,
      langCode: supportLang,
      cacheDir: voiceSupportCache
    });
  }

  // Deduplicate tasks by unique voiceId + text
  const uniqueTtsTasksMap = new Map();
  for (const task of ttsTasks) {
    const key = `${task.voiceId}_${task.text}`;
    uniqueTtsTasksMap.set(key, task);
  }
  const uniqueTtsTasks = Array.from(uniqueTtsTasksMap.values());
  console.log(`Found ${uniqueTtsTasks.length} unique TTS audio clips to pre-fetch.`);

  // Process unique tasks in batches of size 8
  const CONCURRENCY_LIMIT = 8;
  for (let i = 0; i < uniqueTtsTasks.length; i += CONCURRENCY_LIMIT) {
    const batch = uniqueTtsTasks.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(batch.map(async (task) => {
      try {
        await getTtsAudio(task);
      } catch (err) {
        console.warn(`  -> Warning: Failed to pre-fetch audio for "${task.text}": ${err.message}`);
      }
    }));
    const currentProgress = Math.min(i + CONCURRENCY_LIMIT, uniqueTtsTasks.length);
    console.log(`  -> Progress: ${currentProgress}/${uniqueTtsTasks.length} audios processed.`);
  }

  // 3.9 Intro Phase
  console.log("\n--- Starting Intro Phase Video Compilation ---");
  const audioIntro = await getTtsAudio({
    text: introAudioText,
    voiceId: voiceSupport,
    langCode: supportLang,
    cacheDir: voiceSupportCache
  });
  
  const wavIntro = path.join(outputDir, "temp-audio-intro.wav");
  mp3ToWav(audioIntro, wavIntro);
  tempWavFiles.push(wavIntro);

  console.log(`  -> Queue state: Intro`);
  const introDesc = langData.intro_desc || `Listen carefully to the native pronunciation and repeat the words in pauses.<br>An interactive mini-test awaits you at the end!`;
  const levelCode = extractLevel(setId);
  const prefix = langData.level_prefix || 'Level';
  const wordsLabel = langData.words_label || "words";
  const introWordsLabel = getIntroWordsLabel(cards.length, supportLang, wordsLabel);
  const introSubtitleText = buildIntroMetadataSubtitle(
    deckMetadata,
    cards.length,
    introWordsLabel,
    `${prefix} ${levelCode}`
  );

  const audioDurIntro = getAudioDuration(wavIntro);
  const totalVisualDurIntro = Math.round((audioDurIntro + 2.0) * 25) / 25; // add 2.0s freeze
  const pauseDurIntro = totalVisualDurIntro - audioDurIntro;

  const titleTemplate = langData.intro_title_template || "{target_lang}";
  const introTitle = titleTemplate.replace("{target_lang}", targetName);

  const introOptions = {
    flag: getFlagEmoji(targetLang),
    title: introTitle,
    deckTitle: cleanDeckTitle,
    subtitle: introSubtitleText,
    description: introDesc
  };

  queueSegment('intro', introOptions, wavIntro, totalVisualDurIntro, `intro-slide`, pauseDurIntro);

  // 4. Learning Phase: Loop over all cards
  console.log("\n--- Starting Learning Phase Video Compilation ---");
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const cardNum = index + 1;
    const cardIdStr = String(cardNum).padStart(2, "0");
    console.log(`[Card ${cardNum}/${cards.length}] Word: "${card.target_display}"`);

    // A. Generate/Get TTS Audios
    let audioTargetWord = null;
    let audioSupportWord = null;

    try {
      audioTargetWord = await getTtsAudio({
        text: card.target_display,
        voiceId: voiceTarget,
        langCode: targetLang,
        cacheDir: voiceTargetCache
      });

      audioSupportWord = await getTtsAudio({
        text: card.support_display,
        voiceId: voiceSupport,
        langCode: supportLang,
        cacheDir: voiceSupportCache
      });
    } catch (err) {
      console.error(`[Card ${cardNum}] TTS Generation failed: ${err.message}. Skipping card.`);
      continue;
    }

    // Convert MP3 to WAV immediately to get sample-accurate duration measurements
    const wavTargetWord = path.join(outputDir, `temp-audio-target-${cardIdStr}.wav`);
    const wavSupportWord = path.join(outputDir, `temp-audio-support-${cardIdStr}.wav`);
    mp3ToWav(audioTargetWord, wavTargetWord);
    mp3ToWav(audioSupportWord, wavSupportWord);
    tempWavFiles.push(wavTargetWord, wavSupportWord);

    if (transitionMode === "flip") {
      // 3D Flip Transition Mode
      console.log(`  -> Queue states: Flip Transition (Front -> 3D Flip -> Back)`);
      
      // Front face static card
      const optionsFront = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'flip',
        rotateY: 0
      });
      // Visual duration is Target Audio + 2.0s rounded to nearest multiple of 0.04s (25 fps)
      const audioDur1 = getAudioDuration(wavTargetWord);
      const totalFrontVisualDur = Math.round((audioDur1 + 2.0) * 25) / 25;
      // Audio pause duration is (totalFrontVisualDur + 0.44s transition) - audioDur1
      const pauseDur1 = (totalFrontVisualDur + 0.44) - audioDur1;
      queueSegment('card', optionsFront, wavTargetWord, totalFrontVisualDur, `card-${cardIdStr}-front`, pauseDur1);

      // Intermediate flip frames (11 frames total: 0 to 180 deg)
      const angles = [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180];
      for (let step = 0; step < angles.length; step++) {
        const angle = angles[step];
        const segName = `card-${cardIdStr}-tr-${step}`;

        if (angle === 0) {
          // Reuse front image
          segments.push({
            taskType: 'card',
            taskOptions: null,
            audioPath: null,
            duration: 0.04,
            segmentName: segName,
            pauseDuration: 0,
            isReusedPng: true,
            pngPath: path.join(outputDir, `temp-card-${cardIdStr}-front.png`),
            skipAudio: true
          });
        } else if (angle === 180) {
          // Reuse back image
          segments.push({
            taskType: 'card',
            taskOptions: null,
            audioPath: null,
            duration: 0.04,
            segmentName: segName,
            pauseDuration: 0,
            isReusedPng: true,
            pngPath: path.join(outputDir, `temp-card-${cardIdStr}-back.png`),
            skipAudio: true
          });
        } else {
          const optionsAngle = buildCardOptions({
            deckTitle,
            currentIndex: cardNum,
            totalCards: cards.length,
            targetLang,
            supportLang,
            card,
            state: 'flip',
            rotateY: angle
          });
          segments.push({
            taskType: 'card',
            taskOptions: optionsAngle,
            audioPath: null,
            duration: 0.04,
            segmentName: segName,
            pauseDuration: 0,
            skipAudio: true
          });
        }
      }

      // Back face static card
      const optionsBack = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'flip',
        rotateY: 180
      });
      // Visual duration is Support Audio + 2.5s rounded to nearest multiple of 0.04s (25 fps)
      const audioDur2 = getAudioDuration(wavSupportWord);
      const totalBackVisualDur = Math.round((audioDur2 + 2.5) * 25) / 25;
      const pauseDur2 = totalBackVisualDur - audioDur2;
      queueSegment('card', optionsBack, wavSupportWord, totalBackVisualDur, `card-${cardIdStr}-back`, pauseDur2);

    } else {
      // Original static mode logic
      // B. Mux State 1: Word Only
      console.log(`  -> Queue state: Word Only`);
      const optionsWordOnly = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'word-only'
      });
      const audioDur1 = getAudioDuration(wavTargetWord);
      const totalVisualDur1 = Math.round((audioDur1 + 2.0) * 25) / 25;
      const pauseDur1 = totalVisualDur1 - audioDur1;
      queueSegment('card', optionsWordOnly, wavTargetWord, totalVisualDur1, `card-${cardIdStr}-1`, pauseDur1);

      // C. Mux State 2: Word + Translation
      console.log(`  -> Queue state: Word + Translation`);
      const optionsWordTranslation = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'word-and-translation'
      });
      const audioDur2 = getAudioDuration(wavSupportWord);
      const totalVisualDur2 = Math.round((audioDur2 + 2.5) * 25) / 25;
      const pauseDur2 = totalVisualDur2 - audioDur2;
      queueSegment('card', optionsWordTranslation, wavSupportWord, totalVisualDur2, `card-${cardIdStr}-2`, pauseDur2);
    }
  }

  // 5. Quiz Phase (Mini-Test)
  if (!noQuiz && cards.length > 0) {
    console.log("\n--- Starting Quiz Phase Video Compilation ---");
    // Pick at most N random cards for the quiz
    const quizCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, quizLimit);
    console.log(`Selected ${quizCards.length} cards for the interactive mini-test.`);

    for (let index = 0; index < quizCards.length; index++) {
      const card = quizCards[index];
      const quizNum = index + 1;
      const quizIdStr = String(quizNum).padStart(2, "0");
      console.log(`[Quiz ${quizNum}/${quizCards.length}] Word: "${card.support_display}"`);

      // Find cached audio for target word
      const textHash = crypto.createHash("sha256").update(`${voiceTarget}_${card.target_display}`).digest("hex");
      const audioTargetWord = path.join(voiceTargetCache, `${textHash}.mp3`);

      if (!fs.existsSync(audioTargetWord)) {
        console.warn(`[Quiz ${quizNum}] Missing target audio cache. Skipping card.`);
        continue;
      }

      // Convert MP3 to WAV immediately for sample-accurate duration measurements
      const wavQuizTargetWord = path.join(outputDir, `temp-audio-quiz-${quizIdStr}.wav`);
      mp3ToWav(audioTargetWord, wavQuizTargetWord);
      tempWavFiles.push(wavQuizTargetWord);

      // A. Mux Quiz Question (3-2-1 timer)
      console.log(`  -> Question Timer 3`);
      const optionsQ3 = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-question',
        quizTimer: 3
      });
      queueSegment('card', optionsQ3, silent1sPath, 1.0, `quiz-${quizIdStr}-q3`, 0);

      console.log(`  -> Question Timer 2`);
      const optionsQ2 = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-question',
        quizTimer: 2
      });
      queueSegment('card', optionsQ2, silent1sPath, 1.0, `quiz-${quizIdStr}-q2`, 0);

      console.log(`  -> Question Timer 1`);
      const optionsQ1 = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-question',
        quizTimer: 1
      });
      queueSegment('card', optionsQ1, silent1sPath, 1.0, `quiz-${quizIdStr}-q1`, 0);

      // B. Mux Quiz Answer (reveals word and plays target audio)
      console.log(`  -> Answer Reveal`);
      const optionsAns = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-answer'
      });
      // Extend reveal slide with 2.5 seconds silence padding at the end, rounded to 0.04s multiple
      const audioDur = getAudioDuration(wavQuizTargetWord);
      const totalVisualDur = Math.round((audioDur + 2.5) * 25) / 25;
      const pauseDur = totalVisualDur - audioDur;
      queueSegment('card', optionsAns, wavQuizTargetWord, totalVisualDur, `quiz-${quizIdStr}-ans`, pauseDur);
    }
  }

  // 6. Outro Phase (Ad)
  console.log("\n--- Starting Outro Phase Video Compilation ---");
  const outroText = getOutroText(supportLang);
  const audioOutro = await getTtsAudio({
    text: outroText,
    voiceId: voiceSupport,
    langCode: supportLang,
    cacheDir: voiceSupportCache
  });
  
  const wavOutro = path.join(outputDir, "temp-audio-outro.wav");
  mp3ToWav(audioOutro, wavOutro);
  tempWavFiles.push(wavOutro);

  console.log(`  -> Queue state: Outro (CTA)`);
  const outroTitle = langData.outro_title || "Learn these words forever";
  const outroSubtitle = langData.outro_subtitle || "Practice decks for free on our website";
  const qrScanLabel = langData.qr_scan_label || "Scan me";
  const outroUrl = getPublicCourseUrl({ setId, supportLang });
  const outroDisplayUrl = getPublicCourseDisplayUrl(outroUrl);
  const outroQrImageSrc = getQrCodeImageUrl(outroUrl);
  console.log(`  -> Outro QR URL: ${outroUrl}`);
  const cleanBadgeText = (val, defaultText) => {
    if (!val) return defaultText;
    const parts = val.trim().split(/\s+/);
    if (parts.length > 1) {
      return parts.slice(1).join(' ');
    }
    return val;
  };

  const outroBadges = [
    { iconName: outroIconNames[0], text: cleanBadgeText(langData.badge_speed, "Custom Tempo") },
    { iconName: outroIconNames[1], text: cleanBadgeText(langData.badge_match, "Matching Game") },
    { iconName: outroIconNames[2], text: cleanBadgeText(langData.badge_smart, "Smart Algorithm") },
    { iconName: outroIconNames[3], text: cleanBadgeText(langData.badge_media, "Images & Audio") },
    { iconName: outroIconNames[4], text: cleanBadgeText(langData.badge_pomo, "Pomodoro Timer") },
    { iconName: outroIconNames[5], text: cleanBadgeText(langData.badge_music, "Background Music") },
    { iconName: outroIconNames[6], text: cleanBadgeText(langData.badge_chat, "Study Chat") },
    { iconName: outroIconNames[7], text: cleanBadgeText(langData.badge_notes, "Personal Notes") }
  ];
  const outroOptions = {
    title: outroTitle,
    subtitle: outroSubtitle,
    qrScanLabel,
    outroUrl,
    outroDisplayUrl,
    outroQrImageSrc,
    badges: outroBadges
  };

  // Pause for 2.5s after audio ends to let the user scan the QR, rounded to 0.04s multiple
  const audioDurOutro = getAudioDuration(wavOutro);
  const totalVisualDurOutro = Math.round((audioDurOutro + 2.5) * 25) / 25;
  const pauseDurOutro = totalVisualDurOutro - audioDurOutro;
  queueSegment('outro', outroOptions, wavOutro, totalVisualDurOutro, `outro-ad`, pauseDurOutro);

  if (segments.length === 0) {
    console.error("Error: No segments queued. Aborting.");
    process.exit(1);
  }

  // 7. Write the unified HTML renderer and prepare screenshot task list
  console.log(`\nWriting unified HTML renderer and preparing task list...`);
  const rendererPath = path.join(outputDir, "temp-renderer.html");
  fs.writeFileSync(rendererPath, generateUnifiedRendererHtml(), "utf8");

  const screenshotTasks = [];
  for (const seg of segments) {
    if (seg.isReusedPng) {
      continue;
    }
    const pngPath = path.join(outputDir, `temp-${seg.segmentName}.png`);
    screenshotTasks.push({
      pngPath,
      type: seg.taskType,
      options: seg.taskOptions
    });
    seg.pngPath = pngPath;
  }

  const tasksJsonPath = path.join(outputDir, "screenshot-tasks.json");
  const tasksPayload = {
    rendererPath,
    tasks: screenshotTasks
  };
  fs.writeFileSync(tasksJsonPath, JSON.stringify(tasksPayload, null, 2), "utf8");

  // 8. Run batch screenshot runner in Playwright
  console.log(`\nRendering ${screenshotTasks.length} slide screenshots in batch...`);
  const batchCmd = `node scripts/lib/screenshot-batch.mjs "${tasksJsonPath}"`;
  execSync(batchCmd, { stdio: "inherit" });

  // 9. Concat all audio files losslessly (including generated pause silences)
  console.log("\nMerging all audio clips...");
  const audioConcatListPath = path.join(outputDir, "temp-audio-concat-list.txt");
  const audioConcatLines = [];
  for (const seg of segments) {
    if (seg.skipAudio || !seg.audioPath) {
      continue;
    }
    audioConcatLines.push(`file '${seg.audioPath}'`);

    if (seg.pauseDuration > 0) {
      const pausePath = path.join(outputDir, `temp-pause-${seg.segmentName}.wav`);
      generateSilentAudio(seg.pauseDuration, pausePath);
      tempWavFiles.push(pausePath);
      audioConcatLines.push(`file '${pausePath}'`);
    }
  }
  fs.writeFileSync(audioConcatListPath, audioConcatLines.join("\n"), "utf8");
  const finalAudioPath = path.join(outputDir, "temp-final-audio.wav");
  const audioMergeCmd = `ffmpeg -y -f concat -safe 0 -i "${audioConcatListPath}" -c copy "${finalAudioPath}"`;
  execSync(audioMergeCmd, { stdio: "ignore" });

  // 10. Concat all images with durations using FFmpeg concat demuxer
  console.log("\nPreparing image slideshow manifest...");
  const imageConcatListPath = path.join(outputDir, "temp-image-concat-list.txt");
  let imageConcatLines = "";
  for (const seg of segments) {
    imageConcatLines += `file '${seg.pngPath}'\nduration ${seg.duration.toFixed(3)}\n`;
  }
  // Add a tiny 1-frame dummy terminator of the last image to ensure FFmpeg honors the final segment duration without padding a massive freeze
  if (segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    imageConcatLines += `file '${lastSeg.pngPath}'\nduration 0.040\n`;
    imageConcatLines += `file '${lastSeg.pngPath}'\n`;
  }
  fs.writeFileSync(imageConcatListPath, imageConcatLines, "utf8");

  // 11. Run final single-pass muxing
  const finalVideoPath = path.join(outputDir, `lesson_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}.mp4`);
  console.log("\nGenerating final video in single-pass...");
  try {
    let encodeParams = "-c:v h264_qsv -preset fast -pix_fmt nv12";
    if (process.env.GITHUB_ACTIONS === "true") {
      encodeParams = "-c:v libx264 -preset superfast -pix_fmt yuv420p";
    }
    const muxCommand = `ffmpeg -y -f concat -safe 0 -i "${imageConcatListPath}" -i "${finalAudioPath}" ${encodeParams} -r 25 -vf scale=1920:1080 -c:a aac -ar 48000 -ac 2 -b:a 192k -shortest "${finalVideoPath}"`;
    console.log(`Running command: ${muxCommand}`);
    execSync(muxCommand, { stdio: "ignore" });
    console.log(`\n🎉 Success! Final video saved to:\n   ${finalVideoPath}`);
  } catch (err) {
    console.error(`Muxing failed: ${err.message}`);
  }

  // 12. Cleanup
  console.log("\nCleaning up temporary files...");
  // Delete the unified renderer HTML
  try {
    if (fs.existsSync(rendererPath)) fs.unlinkSync(rendererPath);
  } catch (e) {}

  for (const seg of segments) {
    try {
      if (!seg.isReusedPng && seg.pngPath && fs.existsSync(seg.pngPath)) fs.unlinkSync(seg.pngPath);
    } catch (e) {}
  }
  // Delete all temp WAV files
  for (const wavFile of tempWavFiles) {
    try {
      if (fs.existsSync(wavFile)) fs.unlinkSync(wavFile);
    } catch (e) {}
  }
  try {
    if (fs.existsSync(tasksJsonPath)) fs.unlinkSync(tasksJsonPath);
    if (fs.existsSync(audioConcatListPath)) fs.unlinkSync(audioConcatListPath);
    if (fs.existsSync(finalAudioPath)) fs.unlinkSync(finalAudioPath);
    if (fs.existsSync(imageConcatListPath)) fs.unlinkSync(imageConcatListPath);
    if (fs.existsSync(silent1sPath)) fs.unlinkSync(silent1sPath);
    if (fs.existsSync(silent2sPath)) fs.unlinkSync(silent2sPath);
    if (fs.existsSync(silent3sPath)) fs.unlinkSync(silent3sPath);
    if (fs.existsSync(silent004sPath)) fs.unlinkSync(silent004sPath);
  } catch (e) {}

  console.log("Cleanup done!");
}

main().catch((err) => {
  console.error("Fatal error during video compilation: ", err);
  process.exit(1);
});
