#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  fetchDeckCards,
  fetchDeckMetadata,
  getVoiceForLanguage,
  getTtsAudio,
  getAudioDuration,
  generateSilentAudio
} from "./lib/video-generator.mjs";
import {
  generateUnifiedRendererHtml
} from "./lib/shorts-slide-template.mjs";
import {
  flagMap,
  getLanguageNameInLang
} from "./lib/card-slide-template.mjs";
import { getShortsOutroTranslation } from "./lib/shorts-outro-translations.mjs";
import { SHORTS_FORMAT_IDS, getShortsFormatTranslation } from "./lib/shorts-format-translations.mjs";
import { getPublicCourseDisplayUrl, getPublicCourseUrl } from "./lib/video-public-url.mjs";
import { BRAND_NAME } from "./lib/brand.mjs";

const localizationPath = path.resolve("config/video-localization.json");
const localizationData = JSON.parse(fs.readFileSync(localizationPath, "utf8"));

const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/[\/\[\]()]/g, '');

function stripSentenceTerminator(value) {
  return String(value || "").trim().replace(/[.!?。！？։။။।]+$/u, "").trim();
}

function extractLevel(setId) {
  const match = String(setId).match(/_(a[12]|b[12]|c[12])(_(a[12]|b[12]|c[12]))?$/i);
  if (match) {
    return match[0].substring(1).toUpperCase().replace("_", "-");
  }
  return "A1";
}

function getLanguageLabel(targetLang, supportLang, levelCode) {
  const supportUpper = String(supportLang).toUpperCase();
  const langData = localizationData[supportUpper] || localizationData.EN;
  const levelLabel = `${langData.level_prefix || "Level"} ${levelCode}`;
  const localizedLangName = getLanguageNameInLang(targetLang, supportLang);
  const titleTemplate = langData.intro_title_template || "{target_lang}";
  const formattedTitle = titleTemplate.replace("{target_lang}", localizedLangName);
  return supportUpper === 'RU'
    ? `${localizedLangName} язык · ${levelLabel}`
    : `${formattedTitle} · ${levelLabel}`;
}

function getQuizTitle(supportLang) {
  const supportUpper = String(supportLang).toUpperCase();
  const langData = localizationData[supportUpper] || localizationData.EN;
  const title = String(langData.quiz_title || "Mini-Test").split("·")[0].trim();
  return title || "Mini-Test";
}

function getQuizQuestionLabel(supportLang, current, total) {
  const supportUpper = String(supportLang).toUpperCase();
  const langData = localizationData[supportUpper] || localizationData.EN;
  const template = langData.quiz_question_label_template || "Question {current} of {total}";
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
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
  rotateY = 0,
  levelCode = "A1",
  quizTotal = totalCards
}) {
  const targetWord = card.target_display;
  const targetTranscription = card.target_transcription;
  const supportWord = card.support_display;
  const showTranscription = targetTranscription && cleanStr(targetWord) !== cleanStr(targetTranscription);
  const flag = flagMap[String(targetLang).toUpperCase()] || "🌐";
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
    quizTitle: getQuizTitle(supportLang),
    quizQuestionLabel: getQuizQuestionLabel(supportLang, currentIndex, quizTotal),
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
let cardLimit = 5;
let quizLimit = 2;
let noQuiz = false;
let transitionMode = "flip";
let shortsFormat = "word_quiz_3_2_1";

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
  } else if (args[i] === "--card-limit" && args[i + 1]) {
    cardLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--quiz-limit" && args[i + 1]) {
    quizLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--no-quiz") {
    noQuiz = true;
  } else if (args[i] === "--transition" && args[i + 1]) {
    transitionMode = args[i + 1].toLowerCase();
    i++;
  } else if (args[i] === "--shorts-format" && args[i + 1]) {
    shortsFormat = args[i + 1].trim();
    i++;
  }
}

if (!setId || !targetLang) {
  console.error("Usage: node scripts/build-deck-shorts.mjs --set <set_id> --target <target_lang> [--support <support_lang>] [--voice-target <voice>] [--voice-support <voice>] [--card-limit <N>] [--quiz-limit <M>] [--no-quiz] [--transition <static|flip>] [--shorts-format <format_id>]");
  process.exit(1);
}

if (!/^[a-z0-9_]+$/i.test(setId)) {
  console.error("Error: --set must contain only letters, numbers and underscores");
  process.exit(1);
}

for (const [name, value] of [["--target", targetLang], ["--support", supportLang]]) {
  if (!/^[A-Z]{2,3}(?:-[A-Z0-9]{2,3})?$/.test(value)) {
    console.error(`Error: ${name} has an invalid language code: ${value}`);
    process.exit(1);
  }
}

if (transitionMode !== "static" && transitionMode !== "flip") {
  console.error("Error: --transition must be 'static' or 'flip'");
  process.exit(1);
}

if (!SHORTS_FORMAT_IDS.includes(shortsFormat)) {
  console.error(`Error: --shorts-format must be one of: ${SHORTS_FORMAT_IDS.join(", ")}`);
  process.exit(1);
}

if (!Number.isFinite(cardLimit) || cardLimit <= 0) {
  console.error("Error: --card-limit must be a positive number");
  process.exit(1);
}

if (!Number.isFinite(quizLimit) || quizLimit < 0) {
  console.error("Error: --quiz-limit must be zero or a positive number");
  process.exit(1);
}

if (!voiceTarget) voiceTarget = getVoiceForLanguage(targetLang);
if (!voiceSupport) voiceSupport = getVoiceForLanguage(supportLang);

async function main() {
  const supportUpper = String(supportLang).toUpperCase();
  const levelCode = extractLevel(setId);
  const langData = localizationData[supportUpper] || localizationData.EN;

  console.log(`=== ${BRAND_NAME} Shorts Video Generator ===`);
  console.log(`Set ID: ${setId}`);
  console.log(`Target Language: ${targetLang} (Voice: ${voiceTarget})`);
  console.log(`Support Language: ${supportLang} (Voice: ${voiceSupport})`);
  console.log(`Card Limit: ${cardLimit}`);
  console.log(`Quiz Limit: ${noQuiz ? 'Disabled' : quizLimit}`);
  console.log(`Transition Mode: ${transitionMode}`);
  console.log(`Shorts Format: ${shortsFormat}`);
  console.log(`========================================`);

  // 1. Fetch cards data
  console.log("Connecting to Postgres and fetching cards...");
  let cards = await fetchDeckCards(setId, targetLang, supportLang);
  if (cards.length === 0) {
    console.error(`Error: No cards found for set_id=${setId} and target_lang=${targetLang}`);
    process.exit(1);
  }
  console.log(`Fetched ${cards.length} cards from database.`);

  // Limit card count for Shorts compliance
  if (cards.length > cardLimit) {
    console.log(`Slicing cards to meet the limit of ${cardLimit} (pacing for Shorts retention).`);
    cards = cards.slice(0, cardLimit);
  }

  // Fetch localized Course Metadata for topic copy.
  const deckMetadata = await fetchDeckMetadata(setId, supportLang);
  const deckTitle = deckMetadata.title || "Vocabulary Lesson";
  const cleanDeckTitle = stripSentenceTerminator(deckTitle);
  const targetName = getLanguageNameInLang(targetLang, supportLang);
  const courseUrl = getPublicCourseUrl({ setId, supportLang, targetLang });
  const courseDisplayUrl = getPublicCourseDisplayUrl(courseUrl);
  const shortsFormatCopy = getShortsFormatTranslation(supportLang, shortsFormat);
  console.log(`Deck Title: "${deckTitle}"`);
  console.log(`Course URL: ${courseUrl}`);
  console.log(`Format Hook: "${shortsFormatCopy.hook}"`);

  // 2. Setup folders
  const outputDir = path.resolve(`outputs/shorts-generator/${setId}_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}`);
  const cacheDir = path.resolve("outputs/video-generator/cache");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

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

  // 4. Learning Phase: Loop over selected cards
  console.log("\n--- Starting Learning Phase Video Compilation ---");
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const cardNum = index + 1;
    const cardIdStr = String(cardNum).padStart(2, "0");
    console.log(`[Card ${cardNum}/${cards.length}] Word: "${card.target_display}"`);

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

    const wavTargetWord = path.join(outputDir, `temp-audio-target-${cardIdStr}.wav`);
    const wavSupportWord = path.join(outputDir, `temp-audio-support-${cardIdStr}.wav`);
    mp3ToWav(audioTargetWord, wavTargetWord);
    mp3ToWav(audioSupportWord, wavSupportWord);
    tempWavFiles.push(wavTargetWord, wavSupportWord);

    if (transitionMode === "flip") {
      // 3D Flip Transition Mode
      const optionsFront = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'flip',
        rotateY: 0,
        levelCode
      });
      const audioDur1 = getAudioDuration(wavTargetWord);
      const totalFrontVisualDur = Math.round((audioDur1 + 1.5) * 25) / 25;
      const pauseDur1 = (totalFrontVisualDur + 0.44) - audioDur1;
      queueSegment('card', optionsFront, wavTargetWord, totalFrontVisualDur, `card-${cardIdStr}-front`, pauseDur1);

      // 11 flip frames
      const angles = [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180];
      for (let step = 0; step < angles.length; step++) {
        const angle = angles[step];
        const segName = `card-${cardIdStr}-tr-${step}`;

        if (angle === 0) {
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
            rotateY: angle,
            levelCode
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

      // Back face
      const optionsBack = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'flip',
        rotateY: 179.9,
        levelCode
      });
      const audioDur2 = getAudioDuration(wavSupportWord);
      const totalBackVisualDur = Math.round((audioDur2 + 2.0) * 25) / 25;
      const pauseDur2 = totalBackVisualDur - audioDur2;
      queueSegment('card', optionsBack, wavSupportWord, totalBackVisualDur, `card-${cardIdStr}-back`, pauseDur2);

    } else {
      // Static Mode
      const optionsWordOnly = buildCardOptions({
        deckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'word-only',
        levelCode
      });
      const audioDur1 = getAudioDuration(wavTargetWord);
      const totalVisualDur1 = Math.round((audioDur1 + 1.5) * 25) / 25;
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
        state: 'word-and-translation',
        levelCode
      });
      const audioDur2 = getAudioDuration(wavSupportWord);
      const totalVisualDur2 = Math.round((audioDur2 + 2.0) * 25) / 25;
      const pauseDur2 = totalVisualDur2 - audioDur2;
      queueSegment('card', optionsWordTranslation, wavSupportWord, totalVisualDur2, `card-${cardIdStr}-2`, pauseDur2);
    }
  }

  // 5. Quiz Phase (Mini-Test)
  if (!noQuiz && cards.length > 0) {
    console.log("\n--- Starting Quiz Phase Video Compilation ---");
    // Keep quiz selection deterministic so local and GitHub renders are reproducible.
    const quizCards = cards.slice(0, quizLimit);
    console.log(`Selected ${quizCards.length} cards for the interactive mini-test.`);

    for (let index = 0; index < quizCards.length; index++) {
      const card = quizCards[index];
      const quizNum = index + 1;
      const quizIdStr = String(quizNum).padStart(2, "0");
      console.log(`[Quiz ${quizNum}/${quizCards.length}] Word: "${card.support_display}"`);

      const audioQuizTargetWord = await getTtsAudio({
        text: card.target_display,
        voiceId: voiceTarget,
        langCode: targetLang,
        cacheDir: voiceTargetCache
      });

      const wavQuizTargetWord = path.join(outputDir, `temp-audio-quiz-${quizIdStr}.wav`);
      mp3ToWav(audioQuizTargetWord, wavQuizTargetWord);
      tempWavFiles.push(wavQuizTargetWord);

      // Quiz Timer 3-2-1
      const optionsQ3 = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-question',
        quizTimer: 3,
        levelCode,
        quizTotal: quizCards.length
      });
      queueSegment('card', optionsQ3, silent1sPath, 1.0, `quiz-${quizIdStr}-q3`, 0);

      const optionsQ2 = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-question',
        quizTimer: 2,
        levelCode,
        quizTotal: quizCards.length
      });
      queueSegment('card', optionsQ2, silent1sPath, 1.0, `quiz-${quizIdStr}-q2`, 0);

      const optionsQ1 = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-question',
        quizTimer: 1,
        levelCode,
        quizTotal: quizCards.length
      });
      queueSegment('card', optionsQ1, silent1sPath, 1.0, `quiz-${quizIdStr}-q1`, 0);

      // Quiz Answer Reveal
      const optionsAns = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-answer',
        levelCode,
        quizTotal: quizCards.length
      });
      const audioDur = getAudioDuration(wavQuizTargetWord);
      const totalVisualDur = Math.round((audioDur + 2.0) * 25) / 25;
      const pauseDur = totalVisualDur - audioDur;
      queueSegment('card', optionsAns, wavQuizTargetWord, totalVisualDur, `quiz-${quizIdStr}-ans`, pauseDur);
    }
  }

  // 6. Outro Phase (CTA - Retention-focused: 1.5 seconds)
  console.log("\n--- Starting Outro Phase Video Compilation ---");
  const translation = getShortsOutroTranslation(supportLang);
  const outroText = translation.audio;
  let wavOutro = path.join(outputDir, "temp-audio-outro.wav");
  try {
    const audioOutro = await getTtsAudio({
      text: outroText,
      voiceId: voiceSupport,
      langCode: supportLang,
      cacheDir: voiceSupportCache
    });
    mp3ToWav(audioOutro, wavOutro);
  } catch (err) {
    console.warn(`[WARNING] TTS generation failed or timed out for outro: ${err.message}`);
    console.warn(`[WARNING] Generating fallback silent audio for outro (5.0s).`);
    generateSilentAudio(5.0, wavOutro);
  }
  tempWavFiles.push(wavOutro);

  console.log(`  -> Queue Outro (1.5s visual duration)`);
  const outroOptions = {
    title: translation.title || langData.outro_title || "Learn these words forever",
    subtitle: translation.subtitle || langData.outro_subtitle || "Practice decks for free on our website",
    badges: translation.badges,
    notice: translation.notice,
    outroDisplayUrl: courseDisplayUrl,
    supportLang: supportLang
  };

  // 1.5 seconds outro duration to ensure viewers do not drop off
  queueSegment('outro', outroOptions, wavOutro, 1.5, `outro-ad`, 0);

  if (segments.length === 0) {
    console.error("Error: No segments queued. Aborting.");
    process.exit(1);
  }

  // 7. Write the unified HTML renderer and prepare screenshot tasks
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
    viewport: { width: 1080, height: 1920 }, // Vertical viewport!
    tasks: screenshotTasks
  };
  fs.writeFileSync(tasksJsonPath, JSON.stringify(tasksPayload, null, 2), "utf8");

  // 8. Run Playwright Batch Screenshot tool
  console.log(`\nRendering ${screenshotTasks.length} vertical slide screenshots in batch...`);
  const batchCmd = `node scripts/lib/screenshot-batch.mjs "${tasksJsonPath}"`;
  execSync(batchCmd, { stdio: "inherit" });

  // 9. Concat all audio files
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
  // Add a tiny 1-frame dummy terminator of the last image
  if (segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    imageConcatLines += `file '${lastSeg.pngPath}'\nduration 0.040\n`;
    imageConcatLines += `file '${lastSeg.pngPath}'\n`;
  }
  fs.writeFileSync(imageConcatListPath, imageConcatLines, "utf8");

  // 11. Run final vertical muxing
  const finalVideoPath = path.join(outputDir, `shorts_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}.mp4`);
  console.log("\nGenerating final vertical video...");
  try {
    const muxCommand = `ffmpeg -y -f concat -safe 0 -i "${imageConcatListPath}" -i "${finalAudioPath}" -c:v libx264 -preset ultrafast -tune stillimage -r 25 -vf scale=1080:1920:in_range=pc:out_range=tv,format=yuv420p -pix_fmt yuv420p -color_range tv -c:a aac -ar 48000 -ac 2 -b:a 192k -shortest "${finalVideoPath}"`;
    console.log(`Running command: ${muxCommand}`);
    execSync(muxCommand, { stdio: "ignore" });
    const cleanNotice = String(translation.notice || "Link in the channel profile!")
      .replace(/^👇\s*/u, "")
      .trim();
    const metadataPath = path.join(outputDir, "youtube_metadata.json");
    const metadata = {
      videoType: "shorts",
      generator: "scripts/build-deck-shorts.mjs",
      generatedAt: new Date().toISOString(),
      setId,
      targetLang,
      supportLang,
      targetLanguageName: targetName,
      levelCode,
      cardLimit,
      quizLimit: noQuiz ? 0 : quizLimit,
      transitionMode,
      shortsFormat,
      shortsFormatCopy,
      deckTitle: cleanDeckTitle,
      deckMetadataSource: deckMetadata.metadataSource || "unknown",
      courseUrl,
      courseDisplayUrl,
      outputVideo: finalVideoPath,
      title: `${cleanDeckTitle} · ${targetName} ${levelCode} #Shorts`,
      description: `${targetName} ${levelCode}: ${cleanDeckTitle}\n\n${cleanNotice}\n${courseDisplayUrl}\n\n#Shorts #FlashcardsLuna`,
      publishReady: false,
      publishIntegration: "local-render-only"
    };
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    console.log(`Metadata handoff saved to:\n   ${metadataPath}`);
    console.log(`\n🎉 Success! Final vertical video saved to:\n   ${finalVideoPath}`);
  } catch (err) {
    console.error(`Muxing failed: ${err.message}`);
  }

  // 12. Cleanup
  console.log("\nCleaning up temporary files...");
  try {
    if (fs.existsSync(rendererPath)) fs.unlinkSync(rendererPath);
  } catch (e) {}

  for (const seg of segments) {
    try {
      if (!seg.isReusedPng && seg.pngPath && fs.existsSync(seg.pngPath)) fs.unlinkSync(seg.pngPath);
    } catch (e) {}
  }
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
