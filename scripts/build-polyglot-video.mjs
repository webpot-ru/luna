#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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
  generateUnifiedPolyglotRendererHtml, 
  getFlagEmoji, 
  getLanguageNameInLang 
} from "./lib/polyglot-slide-template.mjs";
import { getDbLanguageCode, normalizeLanguageCode } from "./lib/video-language-codes.mjs";
import { getPublicCourseDisplayUrl, getPublicCourseUrl, getQrCodeImageUrl } from "./lib/video-public-url.mjs";
import { outroIconNames } from "./lib/video-outro-icons.mjs";
import { BRAND_NAME } from "./lib/brand.mjs";

const localizationPath = path.resolve("config/video-localization.json");
const localizationData = JSON.parse(fs.readFileSync(localizationPath, "utf8"));
const polyglotLocalizationPath = path.resolve("config/polyglot-video-localization.json");
const polyglotLocalizationData = JSON.parse(fs.readFileSync(polyglotLocalizationPath, "utf8"));

const requiredPolyglotLocalizationKeys = [
  "introTitle",
  "introDescription",
  "introSpeechTemplate",
  "outroTitle",
  "outroSubtitle",
  "outroSpeech",
  "languagesLabel",
  "modeLabel",
  "supportAnchorLabel",
  "headerSuffix"
];

const cleanStr = (s) => String(s || '').trim().toLowerCase().replace(/[\/\[\]()]/g, '');
const stripSentenceTerminator = (s) => String(s || '').trim().replace(/[.!?。！？։။။।]+$/u, '').trim();

function buildIntroMetadataSubtitle(metadata, cardsLength, wordsLabel, languagesLength, languagesLabel, fallbackLevelLabel) {
  const title = String(metadata?.title || '').trim();
  const description = String(metadata?.description || '').trim();
  let descriptionWithoutTitle = description;

  if (title && description.startsWith(title)) {
    descriptionWithoutTitle = description.slice(title.length).trim();
  }

  descriptionWithoutTitle = stripSentenceTerminator(descriptionWithoutTitle.replace(/^[.!?。！？։။။။]+/u, '').trim());
  const levelText = descriptionWithoutTitle || stripSentenceTerminator(metadata?.levelSignal) || fallbackLevelLabel;
  return `${levelText} · ${cardsLength} ${wordsLabel} · ${languagesLength} ${languagesLabel}`;
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

function getIntroLanguagesLabel(count, supportLang, polyglotLocalization) {
  const supportUpper = String(supportLang).toUpperCase();
  if (supportUpper === "RU") {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "язык";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "языка";
    return "языков";
  }
  return polyglotLocalization.languagesLabel;
}

function getRequiredPolyglotLocalization(supportLang) {
  const supportUpper = String(supportLang).toUpperCase();
  const values = polyglotLocalizationData[supportUpper];
  if (!values) {
    throw new Error(`Missing Polyglot video localization for support language ${supportUpper}`);
  }

  const missingKeys = requiredPolyglotLocalizationKeys.filter((key) => !String(values[key] || "").trim());
  if (missingKeys.length) {
    throw new Error(`Incomplete Polyglot video localization for ${supportUpper}: ${missingKeys.join(", ")}`);
  }

  if (!values.introSpeechTemplate.includes("{deck_title}")) {
    throw new Error(`Polyglot introSpeechTemplate for ${supportUpper} must include {deck_title}`);
  }

  return values;
}

function formatPolyglotTemplate(template, values) {
  return String(template).replace(/\{([^}]+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
  });
}

function getPolyglotIntroCopy(polyglotLocalization, deckTitle) {
  return {
    title: polyglotLocalization.introTitle,
    description: polyglotLocalization.introDescription,
    speech: formatPolyglotTemplate(polyglotLocalization.introSpeechTemplate, {
      deck_title: deckTitle
    })
  };
}

function getPolyglotOutroCopy(polyglotLocalization) {
  return {
    title: polyglotLocalization.outroTitle,
    subtitle: polyglotLocalization.outroSubtitle,
    speech: polyglotLocalization.outroSpeech
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBrandForTts(text) {
  return String(text || "").replace(new RegExp(`\\b${escapeRegExp(BRAND_NAME)}\\b`, "g"), "flash cards luna");
}

function getPolyglotModeLabel(polyglotLocalization) {
  return polyglotLocalization.modeLabel;
}

function getSupportAnchorLabel(polyglotLocalization) {
  return polyglotLocalization.supportAnchorLabel;
}

function lowerFirstLetter(text) {
  const value = String(text || "").trim();
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getCardLanguageLabel(targetLang, supportLang, { isSupport = false } = {}) {
  const label = getLanguageNameInLang(targetLang, supportLang);
  if (String(supportLang).toUpperCase() === "RU" && !isSupport) {
    return lowerFirstLetter(label);
  }
  return label;
}

function getPolyglotHeaderTitle(deckTitle, polyglotLocalization) {
  const suffix = polyglotLocalization.headerSuffix;
  const cleanTitle = stripSentenceTerminator(deckTitle);
  return cleanTitle.endsWith(`· ${suffix}`) ? cleanTitle : `${cleanTitle} · ${suffix}`;
}

// Parse Command Line Arguments
const args = process.argv.slice(2);
let setId = "";
let supportLang = "RU";
let targetsStr = "";
let voicesStr = "";
let transitionMode = "static";
let noAudio = false;
let limit = 0; // Production default is the full deck; use --limit for visual previews.
let contentScope = "full";

function normalizeContentScope(value) {
  const scope = String(value || "full").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return scope || "full";
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--set" && args[i + 1]) {
    setId = args[i + 1];
    i++;
  } else if (args[i] === "--support" && args[i + 1]) {
    supportLang = normalizeLanguageCode(args[i + 1]);
    i++;
  } else if (args[i] === "--targets" && args[i + 1]) {
    targetsStr = args[i + 1];
    i++;
  } else if (args[i] === "--voices" && args[i + 1]) {
    voicesStr = args[i + 1];
    i++;
  } else if (args[i] === "--no-audio") {
    noAudio = true;
  } else if (args[i] === "--limit" && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--content-scope" && args[i + 1]) {
    contentScope = normalizeContentScope(args[i + 1]);
    i++;
  }
}

if (!setId || !targetsStr) {
  console.error("Usage: node scripts/build-polyglot-video.mjs --set <set_id> --targets <comma_separated_target_langs> [--support <support_lang>] [--voices <comma_separated_voices>] [--no-audio] [--limit <number>] [--content-scope <full|short_unverified>]");
  process.exit(1);
}

const targetLangs = targetsStr.split(",").map(t => normalizeLanguageCode(t)).filter(Boolean);
const voices = voicesStr ? voicesStr.split(",").map(v => v.trim()) : [];

// Map target languages to voices
const voiceMap = {};
for (let i = 0; i < targetLangs.length; i++) {
  const lang = targetLangs[i];
  voiceMap[lang] = voices[i] || getVoiceForLanguage(lang);
}
const voiceSupport = getVoiceForLanguage(supportLang);

// Get offline cache or database helper
function getOfflineDeckData(setId) {
  const jsonPath = path.resolve(`data/decks/${setId}.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (e) {
      console.warn(`Failed to read offline data from ${jsonPath}:`, e.message);
    }
  }
  return null;
}

function getOfflineLanguageKeys(languageCode) {
  return [...new Set([
    normalizeLanguageCode(languageCode),
    normalizeLanguageCode(getDbLanguageCode(languageCode))
  ].filter(Boolean))];
}

function getOfflineValueByLanguage(container, languageCode) {
  for (const key of getOfflineLanguageKeys(languageCode)) {
    if (container?.[key]) return { key, value: container[key] };
  }
  return { key: "", value: null };
}

async function loadPolyglotCards() {
  const offlineData = getOfflineDeckData(setId);
  if (!offlineData) {
    console.log("No offline deck data found. Attempting to load from database...");
    // Database fallback logic
    const cardsByLang = {};
    for (const lang of [supportLang, ...targetLangs]) {
      cardsByLang[lang] = await fetchDeckCards(setId, lang, supportLang);
    }
    
    // Group by index (display_order)
    const baseCards = cardsByLang[targetLangs[0]] || [];
    const mergedCards = [];
    for (let i = 0; i < baseCards.length; i++) {
      const bCard = baseCards[i];
      const card = {
        meaning_id: bCard.meaning_id,
        display_order: bCard.display_order,
        translations: {}
      };
      
      // Add support
      const supportCard = (cardsByLang[supportLang] || []).find(c => c.meaning_id === bCard.meaning_id) || bCard;
      card.translations[supportLang] = {
        word: supportCard.support_display || supportCard.support_word,
        transcription: ""
      };
      
      // Add targets
      for (const lang of targetLangs) {
        const langCard = (cardsByLang[lang] || []).find(c => c.meaning_id === bCard.meaning_id) || bCard;
        card.translations[lang] = {
          word: langCard.target_display || langCard.target_word,
          transcription: langCard.target_transcription || ""
        };
      }
      mergedCards.push(card);
    }
    return mergedCards;
  }
  
  // Cache read logic
  console.log(`Loading polyglot card translations from offline cache for ${setId}...`);
  const supportCardsLookup = getOfflineValueByLanguage(offlineData.cards, supportLang);
  const supportCards = supportCardsLookup.value;
  if (!supportCards) {
    throw new Error(`Offline cache does not contain cards for support language ${supportLang}`);
  }
  const baseTargetLookup = getOfflineValueByLanguage(supportCards, targetLangs[0]);
  const baseTargetCards = baseTargetLookup.value;
  if (!baseTargetCards) {
    throw new Error(`Offline cache does not contain cards for ${supportLang} -> ${targetLangs[0]}`);
  }
  
  const mergedCards = [];
  for (let i = 0; i < baseTargetCards.length; i++) {
    const baseCard = baseTargetCards[i];
    const card = {
      meaning_id: baseCard.meaning_id,
      display_order: baseCard.display_order,
      translations: {}
    };
    
    // Support translation
    card.translations[supportLang] = {
      word: baseCard.support_display || baseCard.support_word,
      transcription: ""
    };
    
    // Target translations
    for (const lang of targetLangs) {
      const targetLookup = getOfflineValueByLanguage(supportCards, lang);
      const cardForLang = targetLookup.value?.[i];
      if (!cardForLang) {
        throw new Error(`Offline cache does not contain card ${i + 1} for ${supportLang} -> ${lang}`);
      }
      card.translations[lang] = {
        word: cardForLang.target_display || cardForLang.target_word,
        transcription: cardForLang.target_transcription || ""
      };
    }
    mergedCards.push(card);
  }
  return mergedCards;
}

async function main() {
  console.log(`=== ${BRAND_NAME} Polyglot Video Generator ===`);
  console.log(`Set ID: ${setId}`);
  console.log(`Support Language: ${supportLang} (Voice: ${voiceSupport})`);
  console.log(`Target Languages: ${targetLangs.join(", ")}`);
  console.log(`Content Scope: ${contentScope}`);
  for (const lang of targetLangs) {
    console.log(`  -> ${lang} voice: ${voiceMap[lang]}`);
  }
  console.log(`=============================================`);

  // 1. Fetch cards data
  let cards = await loadPolyglotCards();
  if (cards.length === 0) {
    console.error(`Error: No cards found for set_id=${setId}`);
    process.exit(1);
  }
  if (limit > 0) {
    console.log(`Limiting cards to ${limit} (original total: ${cards.length})`);
    cards = cards.slice(0, limit);
  } else {
    console.log(`Loaded ${cards.length} cards.`);
  }

  const deckMetadata = await fetchDeckMetadata(setId, supportLang);
  const deckTitle = deckMetadata.title || "Vocabulary Lesson";
  console.log(`Deck Title: "${deckTitle}"`);

  // 2. Setup folders
  const outputDir = path.resolve(`outputs/video-generator/${setId}_polyglot_${supportLang.toLowerCase()}`);
  const cacheDir = path.resolve("outputs/video-generator/cache");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  
  // Make voice cache subfolders
  const voiceSupportCache = path.join(cacheDir, voiceSupport);
  fs.mkdirSync(voiceSupportCache, { recursive: true });
  for (const lang of targetLangs) {
    fs.mkdirSync(path.join(cacheDir, voiceMap[lang]), { recursive: true });
  }

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
  generateSilentAudio(1.0, silent1sPath);
  generateSilentAudio(2.0, silent2sPath);
  generateSilentAudio(3.0, silent3sPath);

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

  const supportUpper = String(supportLang).toUpperCase();
  const langData = localizationData[supportUpper] || localizationData['EN'];
  const polyglotLocalization = getRequiredPolyglotLocalization(supportLang);
  const modeLabel = getPolyglotModeLabel(polyglotLocalization);
  const supportAnchorLabel = getSupportAnchorLabel(polyglotLocalization);
  const supportFlag = getFlagEmoji(supportLang);
  const supportLabel = getCardLanguageLabel(supportLang, supportLang, { isSupport: true });
  
  // Intro Speech Preparation
  const cleanDeckTitle = stripSentenceTerminator(deckTitle);
  const headerDeckTitle = getPolyglotHeaderTitle(cleanDeckTitle, polyglotLocalization);
  const polyglotIntroCopy = getPolyglotIntroCopy(polyglotLocalization, cleanDeckTitle);
  
  let wavIntro;
  let audioDurIntro;
  let totalVisualDurIntro;

  if (noAudio) {
    wavIntro = silent1sPath;
    audioDurIntro = 1.0;
    totalVisualDurIntro = 3.0;
  } else {
    console.log("\n--- Pre-fetching Intro and Outro Audio ---");
    const audioIntro = await getTtsAudio({
      text: normalizeBrandForTts(polyglotIntroCopy.speech),
      voiceId: voiceSupport,
      langCode: supportLang,
      cacheDir: voiceSupportCache
    });
    wavIntro = path.join(outputDir, "temp-audio-intro.wav");
    mp3ToWav(audioIntro, wavIntro);
    tempWavFiles.push(wavIntro);
    audioDurIntro = getAudioDuration(wavIntro);
    totalVisualDurIntro = Math.round((audioDurIntro + 2.5) * 25) / 25;
  }

  // Queue Intro Segment
  const introFlags = targetLangs.map(lang => getFlagEmoji(lang));
  const prefix = langData.level_prefix || 'Level';
  const wordsLabel = langData.words_label || "words";
  const introWordsLabel = getIntroWordsLabel(cards.length, supportLang, wordsLabel);
  const introLanguagesLabel = getIntroLanguagesLabel(targetLangs.length, supportLang, polyglotLocalization);
  const introSubtitleText = buildIntroMetadataSubtitle(
    deckMetadata,
    cards.length,
    introWordsLabel,
    targetLangs.length,
    introLanguagesLabel,
    prefix
  );
  const introOptions = {
    flags: introFlags,
    introTitle: polyglotIntroCopy.title,
    deckTitle: cleanDeckTitle,
    subtitle: introSubtitleText,
    description: polyglotIntroCopy.description
  };
  queueSegment('intro', introOptions, wavIntro, totalVisualDurIntro, `intro-slide`, totalVisualDurIntro - audioDurIntro);

  // 3. Loop over cards and generate translations & audio segments
  console.log("\n--- Processing Cards for Polyglot Lesson ---");
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const cardNum = index + 1;
    const cardIdStr = String(cardNum).padStart(2, "0");
    console.log(`[Card ${cardNum}/${cards.length}] Merging translations...`);

    // A. Support Word Slide (e.g. Russian 🇷🇺)
    const supportWordData = card.translations[supportLang];
    let wavSupport;
    let audioDurSupport;
    let visualDurSupport;

    if (noAudio) {
      wavSupport = silent1sPath;
      audioDurSupport = 1.0;
      visualDurSupport = 2.5;
    } else {
      const audioSupport = await getTtsAudio({
        text: supportWordData.word,
        voiceId: voiceSupport,
        langCode: supportLang,
        cacheDir: voiceSupportCache
      });
      wavSupport = path.join(outputDir, `temp-audio-support-${cardIdStr}.wav`);
      mp3ToWav(audioSupport, wavSupport);
      tempWavFiles.push(wavSupport);
      audioDurSupport = getAudioDuration(wavSupport);
      visualDurSupport = Math.round((audioDurSupport + 1.8) * 25) / 25;
    }

    const firstTargetLang = targetLangs[0];
    const firstTargetName = getCardLanguageLabel(firstTargetLang, supportLang);
    const firstTargetFlag = getFlagEmoji(firstTargetLang);
    const supportOptions = {
      deckName: headerDeckTitle,
      currentIndex: cardNum,
      totalCards: cards.length,
      activeWord: "",
      activeTranscription: "",
      activeLang: firstTargetLang,
      activeFlag: firstTargetFlag,
      langLabel: firstTargetName,
      supportWord: supportWordData.word,
      supportFlag,
      supportLabel,
      modeLabel,
      showTranscription: false,
      progressPercent: ((cardNum / cards.length) * 100).toFixed(1),
      bottomLabel: supportAnchorLabel,
      isQuestion: true
    };
    queueSegment('card', supportOptions, wavSupport, visualDurSupport, `card-${cardIdStr}-support`, visualDurSupport - audioDurSupport);

    // B. Target Languages Slides (Sequential: Question then Answer)
    for (let t = 0; t < targetLangs.length; t++) {
      const targetLang = targetLangs[t];
      const targetWordData = card.translations[targetLang];
      const langName = getCardLanguageLabel(targetLang, supportLang);
      const targetFlag = getFlagEmoji(targetLang);
      
      // 1. Prompt slide: show the target language and leave a recall pause.
      if (t > 0) {
        const targetQuestionOptions = {
          deckName: headerDeckTitle,
          currentIndex: cardNum,
          totalCards: cards.length,
          activeWord: "",
          activeTranscription: "",
          activeLang: targetLang,
          activeFlag: targetFlag,
          langLabel: langName,
          supportWord: supportWordData.word,
          supportFlag,
          supportLabel,
          modeLabel,
          showTranscription: false,
          progressPercent: ((cardNum / cards.length) * 100).toFixed(1),
          bottomLabel: "",
          isQuestion: true
        };
        
        // Prompt slide always has a 3-second silence to let the viewer recall the word.
        queueSegment('card', targetQuestionOptions, silent3sPath, 3.0, `card-${cardIdStr}-target-${targetLang.toLowerCase()}-question`, 0);
      }

      // 2. Answer Slide (Word is revealed + audio is played)
      let wavTarget;
      let audioDurTarget;
      let visualDurTarget;

      if (noAudio) {
        wavTarget = silent1sPath;
        audioDurTarget = 1.0;
        visualDurTarget = 2.5; // 2.5 seconds to read the revealed answer
      } else {
        const voiceTarget = voiceMap[targetLang];
        const voiceTargetCache = path.join(cacheDir, voiceTarget);
        const audioTarget = await getTtsAudio({
          text: targetWordData.word,
          voiceId: voiceTarget,
          langCode: targetLang,
          cacheDir: voiceTargetCache
        });
        wavTarget = path.join(outputDir, `temp-audio-target-${cardIdStr}-${targetLang.toLowerCase()}.wav`);
        mp3ToWav(audioTarget, wavTarget);
        tempWavFiles.push(wavTarget);
        audioDurTarget = getAudioDuration(wavTarget);
        visualDurTarget = Math.round((audioDurTarget + 2.0) * 25) / 25; // 2.0s pause after audio for repeating
      }

      const showTranscription = targetWordData.transcription && cleanStr(targetWordData.word) !== cleanStr(targetWordData.transcription);
      
      const targetAnswerOptions = {
        deckName: headerDeckTitle,
        currentIndex: cardNum,
        totalCards: cards.length,
        activeWord: targetWordData.word,
        activeTranscription: targetWordData.transcription,
        activeLang: targetLang,
        activeFlag: targetFlag,
        langLabel: langName,
        supportWord: supportWordData.word,
        supportFlag,
        supportLabel,
        modeLabel,
        showTranscription,
        progressPercent: ((cardNum / cards.length) * 100).toFixed(1),
        bottomLabel: "",
        isQuestion: false
      };
      
      queueSegment('card', targetAnswerOptions, wavTarget, visualDurTarget, `card-${cardIdStr}-target-${targetLang.toLowerCase()}-answer`, visualDurTarget - audioDurTarget);
    }
  }

  // 4. Outro Phase
  console.log("\n--- Processing Outro Slide ---");
  const polyglotOutroCopy = getPolyglotOutroCopy(polyglotLocalization);
  const outroText = polyglotOutroCopy.speech;
  let wavOutro;
  let audioDurOutro;
  let totalVisualDurOutro;

  if (noAudio) {
    wavOutro = silent2sPath;
    audioDurOutro = 2.0;
    totalVisualDurOutro = 5.0;
  } else {
    const audioOutro = await getTtsAudio({
      text: normalizeBrandForTts(outroText),
      voiceId: voiceSupport,
      langCode: supportLang,
      cacheDir: voiceSupportCache
    });
    wavOutro = path.join(outputDir, "temp-audio-outro.wav");
    mp3ToWav(audioOutro, wavOutro);
    tempWavFiles.push(wavOutro);
    audioDurOutro = getAudioDuration(wavOutro);
    totalVisualDurOutro = Math.round((audioDurOutro + 3.0) * 25) / 25;
  }

  const outroTitle = polyglotOutroCopy.title;
  const outroSubtitle = polyglotOutroCopy.subtitle;
  const qrScanLabel = langData.qr_scan_label || "Scan me";
  const outroUrl = getPublicCourseUrl({ setId, supportLang, targetLangs });
  const outroDisplayUrl = getPublicCourseDisplayUrl(outroUrl);
  const outroQrImageSrc = getQrCodeImageUrl(outroUrl);
  
  const cleanBadgeText = (val, defaultText) => {
    if (!val) return defaultText;
    const parts = val.trim().split(/\s+/);
    if (parts.length > 1) return parts.slice(1).join(' ');
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

  queueSegment('outro', outroOptions, wavOutro, totalVisualDurOutro, `outro-ad`, totalVisualDurOutro - audioDurOutro);

  // 5. Generate and screenshots batch
  console.log(`\nWriting HTML renderer and preparing task list...`);
  const rendererPath = path.join(outputDir, "temp-renderer.html");
  fs.writeFileSync(rendererPath, generateUnifiedPolyglotRendererHtml(), "utf8");

  const screenshotTasks = [];
  for (const seg of segments) {
    const pngPath = path.join(outputDir, `temp-${seg.segmentName}.png`);
    screenshotTasks.push({
      pngPath,
      type: seg.taskType,
      options: seg.taskOptions
    });
    seg.pngPath = pngPath;
  }

  const tasksJsonPath = path.join(outputDir, "screenshot-tasks.json");
  fs.writeFileSync(tasksJsonPath, JSON.stringify({ rendererPath, tasks: screenshotTasks }, null, 2), "utf8");

  console.log(`\nRendering ${screenshotTasks.length} slide screenshots in Playwright batch...`);
  const batchCmd = `node scripts/lib/screenshot-batch.mjs "${tasksJsonPath}"`;
  execSync(batchCmd, { stdio: "inherit" });

  // 6. Audio Concat
  console.log("\nMerging all audio clips...");
  const audioConcatListPath = path.join(outputDir, "temp-audio-concat-list.txt");
  const audioConcatLines = [];
  for (const seg of segments) {
    if (!seg.audioPath) continue;
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
  execSync(`ffmpeg -y -f concat -safe 0 -i "${audioConcatListPath}" -c copy "${finalAudioPath}"`, { stdio: "ignore" });

  // 7. Video Manifest
  console.log("\nPreparing image slideshow manifest...");
  const imageConcatListPath = path.join(outputDir, "temp-image-concat-list.txt");
  let imageConcatLines = "";
  for (const seg of segments) {
    imageConcatLines += `file '${seg.pngPath}'\nduration ${seg.duration.toFixed(3)}\n`;
  }
  if (segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    imageConcatLines += `file '${lastSeg.pngPath}'\nduration 0.040\n`;
    imageConcatLines += `file '${lastSeg.pngPath}'\n`;
  }
  fs.writeFileSync(imageConcatListPath, imageConcatLines, "utf8");

  // 8. FFMPEG Compile
  const scopeSuffix = contentScope === "full" ? "" : `_${contentScope}`;
  const finalVideoPath = path.join(outputDir, `polyglot_${targetsStr.toLowerCase().replace(/,/g, "_")}_${supportLang.toLowerCase()}${scopeSuffix}.mp4`);
  console.log("\nGenerating final Polyglot video in single-pass...");
  try {
    let encodeParams = "-c:v h264_qsv -preset fast -pix_fmt nv12";
    if (process.env.GITHUB_ACTIONS === "true" || process.platform === "darwin") {
      encodeParams = "-c:v libx264 -preset superfast -pix_fmt yuv420p";
    }
    const muxCommand = `ffmpeg -y -f concat -safe 0 -i "${imageConcatListPath}" -i "${finalAudioPath}" ${encodeParams} -r 25 -vf scale=1920:1080 -c:a aac -ar 48000 -ac 2 -b:a 192k -shortest "${finalVideoPath}"`;
    console.log(`Running command: ${muxCommand}`);
    execSync(muxCommand, { stdio: "ignore" });
    console.log(`\n🎉 Success! Final Polyglot video saved to:\n   ${finalVideoPath}`);
  } catch (err) {
    console.error(`Muxing failed: ${err.message}`);
  }

  // 9. Cleanup
  console.log("\nCleaning up temporary files...");
  try {
    if (fs.existsSync(rendererPath)) fs.unlinkSync(rendererPath);
    if (fs.existsSync(tasksJsonPath)) fs.unlinkSync(tasksJsonPath);
    if (fs.existsSync(audioConcatListPath)) fs.unlinkSync(audioConcatListPath);
    if (fs.existsSync(finalAudioPath)) fs.unlinkSync(finalAudioPath);
    if (fs.existsSync(imageConcatListPath)) fs.unlinkSync(imageConcatListPath);
    if (fs.existsSync(silent1sPath)) fs.unlinkSync(silent1sPath);
    if (fs.existsSync(silent2sPath)) fs.unlinkSync(silent2sPath);
    if (fs.existsSync(silent3sPath)) fs.unlinkSync(silent3sPath);
  } catch (e) {}
  for (const seg of segments) {
    try {
      if (seg.pngPath && fs.existsSync(seg.pngPath)) fs.unlinkSync(seg.pngPath);
    } catch (e) {}
  }
  for (const wavFile of tempWavFiles) {
    try {
      if (fs.existsSync(wavFile)) fs.unlinkSync(wavFile);
    } catch (e) {}
  }
  console.log("Cleanup done!");
}

main().catch((err) => {
  console.error("Fatal error during video compilation: ", err);
  process.exit(1);
});
