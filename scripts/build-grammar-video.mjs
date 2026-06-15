#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { 
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

const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/[\/\[\]()]/g, '');

function getLanguageLabel(targetLang, supportLang) {
  let levelLabel = 'Уровень A1';
  if (supportLang === 'EN' || supportLang === 'EN-GB') {
    levelLabel = 'Level A1';
  } else if (supportLang === 'ES' || supportLang === 'ES-419') {
    levelLabel = 'Nivel A1';
  }
  const localizedLangName = getLanguageNameInLang(targetLang, supportLang);
  return supportLang === 'RU'
    ? `${localizedLangName} язык · ${levelLabel}`
    : `${localizedLangName} · ${levelLabel}`;
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
  const targetTranscription = card.target_transcription || '';
  const supportWord = card.support_display;
  const showTranscription = targetTranscription && cleanStr(targetWord) !== cleanStr(targetTranscription);
  const flag = getFlagEmoji(targetLang);
  const langLabel = getLanguageLabel(targetLang, supportLang);
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
let lessonPath = "";
let quizLimit = 5;
let noQuiz = false;
let transitionMode = "flip";

// Parse args
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--lesson" && args[i + 1]) {
    lessonPath = args[i + 1];
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

if (!lessonPath) {
  console.error("Usage: node scripts/build-grammar-video.mjs --lesson <path_to_json_file> [--quiz-limit <N>] [--no-quiz] [--transition <static|flip>]");
  process.exit(1);
}

if (transitionMode !== "static" && transitionMode !== "flip") {
  console.error("Error: --transition must be 'static' or 'flip'");
  process.exit(1);
}

async function main() {
  const lessonData = JSON.parse(fs.readFileSync(path.resolve(lessonPath), "utf8"));
  const { setId, title, subtitle, targetLang, supportLang, cards } = lessonData;

  const voiceTarget = getVoiceForLanguage(targetLang);
  const voiceSupport = getVoiceForLanguage(supportLang);

  console.log(`=== LunaCards Grammar Video Generator ===`);
  console.log(`Lesson ID: ${setId}`);
  console.log(`Title: ${title} (${subtitle || ''})`);
  console.log(`Target Language: ${targetLang} (Voice: ${voiceTarget})`);
  console.log(`Support Language: ${supportLang} (Voice: ${voiceSupport})`);
  console.log(`Quiz Limit: ${noQuiz ? 'Disabled' : quizLimit}`);
  console.log(`Transition Mode: ${transitionMode}`);
  console.log(`=========================================`);

  if (!cards || cards.length === 0) {
    console.error(`Error: No cards found in lesson file ${lessonPath}`);
    process.exit(1);
  }

  // Setup folders
  const outputDir = path.resolve(`outputs/lessons/${setId}`);
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

  // Generate silent audio helpers
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

  // Learning Phase: Loop over all cards
  console.log("\n--- Starting Learning Phase Video Compilation ---");
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const cardNum = index + 1;
    const cardIdStr = String(cardNum).padStart(2, "0");
    console.log(`[Card ${cardNum}/${cards.length}] Word: "${card.target_display}"`);

    // Generate/Get TTS Audios
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

    // Convert MP3 to WAV immediately for sample-accurate duration measurements
    const wavTargetWord = path.join(outputDir, `temp-audio-target-${cardIdStr}.wav`);
    const wavSupportWord = path.join(outputDir, `temp-audio-support-${cardIdStr}.wav`);
    mp3ToWav(audioTargetWord, wavTargetWord);
    mp3ToWav(audioSupportWord, wavSupportWord);
    tempWavFiles.push(wavTargetWord, wavSupportWord);

    if (transitionMode === "flip") {
      // 3D Flip Transition Mode
      const optionsFront = buildCardOptions({
        deckTitle: title,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'flip',
        rotateY: 0
      });
      const audioDur1 = getAudioDuration(wavTargetWord);
      const totalFrontVisualDur = Math.round((audioDur1 + 2.0) * 25) / 25;
      const pauseDur1 = (totalFrontVisualDur + 0.44) - audioDur1;
      queueSegment('card', optionsFront, wavTargetWord, totalFrontVisualDur, `card-${cardIdStr}-front`, pauseDur1);

      // Intermediate flip frames (11 frames total: 0 to 180 deg)
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
            deckTitle: title,
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
        deckTitle: title,
        currentIndex: cardNum,
        totalCards: cards.length,
        targetLang,
        supportLang,
        card,
        state: 'flip',
        rotateY: 180
      });
      const audioDur2 = getAudioDuration(wavSupportWord);
      const totalBackVisualDur = Math.round((audioDur2 + 2.5) * 25) / 25;
      const pauseDur2 = totalBackVisualDur - audioDur2;
      queueSegment('card', optionsBack, wavSupportWord, totalBackVisualDur, `card-${cardIdStr}-back`, pauseDur2);

    } else {
      // Original static mode logic
      const optionsWordOnly = buildCardOptions({
        deckTitle: title,
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

      const optionsWordTranslation = buildCardOptions({
        deckTitle: title,
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

  // Quiz Phase (Mini-Test)
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
      const optionsAns = buildCardOptions({
        deckTitle: '',
        currentIndex: quizNum,
        totalCards: quizCards.length,
        targetLang,
        supportLang,
        card,
        state: 'quiz-answer'
      });
      const audioDur = getAudioDuration(wavQuizTargetWord);
      const totalVisualDur = Math.round((audioDur + 2.5) * 25) / 25;
      const pauseDur = totalVisualDur - audioDur;
      queueSegment('card', optionsAns, wavQuizTargetWord, totalVisualDur, `quiz-${quizIdStr}-ans`, pauseDur);
    }
  }

  // Outro Phase (Ad)
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
  
  const lang = String(supportLang).toUpperCase();
  let outroTitle = "Выучи эти слова навсегда";
  let outroSubtitle = "Тренируй колоды бесплатно на сайте";
  let outroBadges = [
    { icon: "⚡️", text: "Свой темп" },
    { icon: "🎮", text: "Игра «Найди пару»" },
    { icon: "🧠", text: "Умный алгоритм" },
    { icon: "🖼️", text: "Картинки и звук" },
    { icon: "⏱️", text: "Таймер Помодоро" },
    { icon: "🎵", text: "Фоновая музыка" },
    { icon: "💬", text: "Чат и друзья" },
    { icon: "📝", text: "Свои заметки" }
  ];
  if (lang === 'EN' || lang === 'EN-GB') {
    outroTitle = "Learn these words forever";
    outroSubtitle = "Practice decks for free on our website";
    outroBadges = [
      { icon: "⚡️", text: "Custom Tempo" },
      { icon: "🎮", text: "Matching Game" },
      { icon: "🧠", text: "Smart Algorithm" },
      { icon: "🖼️", text: "Images & Audio" },
      { icon: "⏱️", text: "Pomodoro Timer" },
      { icon: "🎵", text: "Background Music" },
      { icon: "💬", text: "Study Chat" },
      { icon: "📝", text: "Personal Notes" }
    ];
  }

  const outroOptions = {
    title: outroTitle,
    subtitle: outroSubtitle,
    badges: outroBadges
  };

  const audioDurOutro = getAudioDuration(wavOutro);
  const totalVisualDurOutro = Math.round((audioDurOutro + 2.5) * 25) / 25;
  const pauseDurOutro = totalVisualDurOutro - audioDurOutro;
  queueSegment('outro', outroOptions, wavOutro, totalVisualDurOutro, `outro-ad`, pauseDurOutro);

  if (segments.length === 0) {
    console.error("Error: No segments queued. Aborting.");
    process.exit(1);
  }

  // Write the unified HTML renderer and prepare screenshot task list
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

  // Run batch screenshot runner in Playwright
  console.log(`\nRendering ${screenshotTasks.length} slide screenshots in batch...`);
  const batchCmd = `node scripts/lib/screenshot-batch.mjs "${tasksJsonPath}"`;
  execSync(batchCmd, { stdio: "inherit" });

  // Concat all audio files losslessly (including generated pause silences)
  console.log("\nMerging all audio clips...");
  const audioConcatListPath = path.join(outputDir, "temp-audio-concat-list.txt");
  const audioConcatLines = [];
  for (const seg of segments) {
    if (seg.skipAudio || !seg.audioPath) {
      continue;
    }
    audioConcatLines.push(`file '${String(seg.audioPath).replace(/\\/g, "/")}'`);

    if (seg.pauseDuration > 0) {
      const pausePath = path.join(outputDir, `temp-pause-${seg.segmentName}.wav`);
      generateSilentAudio(seg.pauseDuration, pausePath);
      tempWavFiles.push(pausePath);
      audioConcatLines.push(`file '${String(pausePath).replace(/\\/g, "/")}'`);
    }
  }
  fs.writeFileSync(audioConcatListPath, audioConcatLines.join("\n"), "utf8");
  const finalAudioPath = path.join(outputDir, "temp-final-audio.wav");
  const audioMergeCmd = `ffmpeg -y -f concat -safe 0 -i "${audioConcatListPath}" -c copy "${finalAudioPath}"`;
  execSync(audioMergeCmd, { stdio: "ignore" });

  // Concat all images with durations using FFmpeg concat demuxer
  console.log("\nPreparing image slideshow manifest...");
  const imageConcatListPath = path.join(outputDir, "temp-image-concat-list.txt");
  let imageConcatLines = "";
  for (const seg of segments) {
    imageConcatLines += `file '${String(seg.pngPath).replace(/\\/g, "/")}'\nduration ${seg.duration.toFixed(3)}\n`;
  }
  if (segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    imageConcatLines += `file '${String(lastSeg.pngPath).replace(/\\/g, "/")}'\nduration 0.040\n`;
    imageConcatLines += `file '${String(lastSeg.pngPath).replace(/\\/g, "/")}'\n`;
  }
  fs.writeFileSync(imageConcatListPath, imageConcatLines, "utf8");

  // Run final single-pass muxing
  const finalVideoPath = path.join(outputDir, `${setId}_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}.mp4`);
  console.log("\nGenerating final video in single-pass...");
  try {
    const muxCommand = `ffmpeg -y -f concat -safe 0 -i "${imageConcatListPath}" -i "${finalAudioPath}" -c:v h264_qsv -preset fast -r 25 -pix_fmt nv12 -vf scale=1920:1080 -c:a aac -ar 48000 -ac 2 -b:a 192k -shortest "${finalVideoPath}"`;
    console.log(`Running command: ${muxCommand}`);
    execSync(muxCommand, { stdio: "inherit" });
    console.log(`\n🎉 Success! Final video saved to:\n   ${finalVideoPath}`);
  } catch (err) {
    console.error(`Muxing failed: ${err.message}`);
  }

  // Cleanup
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
