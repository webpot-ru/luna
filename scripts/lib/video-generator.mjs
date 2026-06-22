import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync, execFileSync } from "node:child_process";
import { psqlJson } from "./qa-utils.mjs";
import { generateSlideHtml, getFlagEmoji } from "./card-slide-template.mjs";
import { getDbLanguageCode, normalizeLanguageCode } from "./video-language-codes.mjs";
import { defaultVoiceMap, getVoiceForLanguage } from "./tts-voice-map.mjs";

export { defaultVoiceMap, getVoiceForLanguage };

// Load Environment Variables from local or webpot
function loadEnv() {
  const localEnv = path.resolve(".env.local");
  
  const parseEnvFile = (envPath) => {
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  };

  parseEnvFile(localEnv);

  // Auto-inject Windows winget FFmpeg path if needed
  if (process.platform === "win32") {
    const ffmpegWingetPath = "C:\\Users\\ramil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin";
    if (fs.existsSync(ffmpegWingetPath)) {
      if (!process.env.PATH.includes(ffmpegWingetPath)) {
        process.env.PATH = `${process.env.PATH};${ffmpegWingetPath}`;
      }
    }
  }
}

loadEnv();

const baseUrl = process.env.AI33_BASE_URL || "https://api.ai33.pro";
const apiKey = process.env.AI33_API_KEY;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, retries = 3, backoff = 2000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const isLastAttempt = attempt === retries - 1;
      console.warn(`Request failed (attempt ${attempt + 1}/${retries}): ${err.message}`);
      if (isLastAttempt) throw err;
      await delay(backoff * Math.pow(2, attempt));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Check status of an AI33 TTS task.
async function checkTaskStatus(taskId) {
  const data = await fetchWithRetry(new URL(`/v3/task/${taskId}`, baseUrl), {
    headers: { Authorization: apiKey }
  });
  if (!data.success) {
    throw new Error(`Check task success=false for ${taskId}: ${JSON.stringify(data)}`);
  }
  return data.data ?? {};
}

async function runTtsTask(text, voiceId, langCode) {
  const form = new FormData();
  form.append("text", text);
  form.append("voice_id", voiceId);
  form.append("language", String(langCode).split("-")[0].toLowerCase());
  form.append("speed", "1");
  form.append("similarity", "2");
  form.append("with_transcript", "false");

  const data = await fetchWithRetry(new URL("/v3/text-to-speech", baseUrl), {
    method: "POST",
    headers: { Authorization: apiKey },
    body: form
  });

  if (!data.success || !data.task_id) {
    throw new Error(`AI33 TTS returned success=false: ${JSON.stringify(data)}`);
  }

  return data.task_id;
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio from ${url}, status ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
}

// Generate TTS Audio (Local Free Edge-TTS version!)
export async function getTtsAudio({ text, voiceId, langCode, cacheDir }) {
  if (!text || !text.trim()) return null;
  
  // Clean text to avoid Edge-TTS NoAudioReceived errors and formatting issues
  const lang = String(langCode).toUpperCase().split("-")[0];
  let orWord = " или ";
  if (lang === "EN") orWord = " or ";
  if (lang === "ES") orWord = " o ";
  if (lang === "FR") orWord = " ou ";
  if (lang === "DE") orWord = " oder ";
  
  const cleanedText = text
    .replace(/\//g, orWord)
    .replace(/[\(\)]/g, " ")
    .replace(/\.\.+/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  const textHash = crypto.createHash("sha256").update(`${voiceId}_${cleanedText}`).digest("hex");
  const cachedPath = path.join(cacheDir, `${textHash}.mp3`);
  
  if (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 0) {
    return cachedPath;
  }
  
  // The free edge-tts backend does not currently expose Armenian hy-AM voices.
  // Keep HY on the explicit AI33 fallback until edge-tts live readback shows hy-AM support.
  if (String(langCode).toUpperCase() === "HY") {
    console.log(`[AI33 TTS] Generating Armenian audio for: "${cleanedText.slice(0, 40)}..."`);
    try {
      const mappedVoiceId = String(voiceId || "").replace(/^ai33_/, "");
      const activeVoiceId = process.env.AI33_VOICE_ID || mappedVoiceId || "elevenlabs_qJBO8ZmKp4te7NTtYgzz";
      const taskId = await runTtsTask(cleanedText, activeVoiceId, langCode);

      let audioUrl = null;
      for (let i = 0; i < 30; i++) {
        await delay(2000);
        const taskInfo = await checkTaskStatus(taskId);
        if (taskInfo.status === "done" && taskInfo.metadata?.audio_url) {
          audioUrl = taskInfo.metadata.audio_url;
          break;
        } else if (taskInfo.status === "failed") {
          throw new Error("AI33 task failed on server side.");
        }
      }

      if (!audioUrl) {
        throw new Error("AI33 task timed out.");
      }

      await downloadFile(audioUrl, cachedPath);
      return cachedPath;
    } catch (err) {
      try {
        if (fs.existsSync(cachedPath)) fs.unlinkSync(cachedPath);
      } catch (e) {}
      throw new Error(`AI33 TTS failed for Armenian text "${text}": ${err.message}`);
    }
  }

  const cleanVoiceId = String(voiceId).replace(/^edge_/, "");
  console.log(`[Local TTS] Generating: "${cleanedText.slice(0, 40)}..." using voice ${cleanVoiceId}`);
  
  let venvPath = "edge-tts";
  const localVenvPath = process.platform === "win32"
    ? path.resolve(".venv-source-tools/Scripts/edge-tts.exe")
    : path.resolve(".venv-source-tools/bin/edge-tts");
  if (fs.existsSync(localVenvPath)) {
    venvPath = localVenvPath;
  }
  
  try {
    execFileSync(venvPath, [
      "--voice", cleanVoiceId,
      "--text", cleanedText,
      "--write-media", cachedPath
    ]);
  } catch (err) {
    try {
      if (fs.existsSync(cachedPath)) fs.unlinkSync(cachedPath);
    } catch (e) {}
    throw new Error(`Local edge-tts failed for text "${text}": ${err.message}`);
  }
  
  return cachedPath;
}

// Get Audio Duration via ffprobe
export function getAudioDuration(audioPath) {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
  const output = execSync(command).toString().trim();
  const duration = parseFloat(output);
  if (isNaN(duration)) {
    throw new Error(`Failed to parse duration for ${audioPath}`);
  }
  return duration;
}

// Generate a silent audio file of a specific duration (supports MP3 and WAV)
export function generateSilentAudio(duration, outputPath) {
  let codecParam = "-c:a libmp3lame -b:a 192k";
  if (String(outputPath).toLowerCase().endsWith(".wav")) {
    codecParam = "-c:a pcm_s16le";
  }
  const command = `ffmpeg -y -f lavfi -i anullsrc=r=48000:cl=stereo -t ${duration} ${codecParam} "${outputPath}"`;
  execSync(command, { stdio: "ignore" });
  return outputPath;
}

const deckDataCache = {};

function getOfflineDeckData(setId) {
  if (deckDataCache[setId] !== undefined) {
    return deckDataCache[setId];
  }
  const jsonPath = path.resolve(`data/decks/${setId}.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      deckDataCache[setId] = data;
      return data;
    } catch (e) {
      console.warn(`Failed to read offline data from ${jsonPath}:`, e.message);
    }
  }
  deckDataCache[setId] = null;
  return null;
}

// Fetch cards data from Postgres
export async function fetchDeckCards(setId, targetLang, supportLang) {
  const targetCode = normalizeLanguageCode(targetLang);
  const supportCode = normalizeLanguageCode(supportLang);
  const targetDbLang = getDbLanguageCode(targetCode);
  const supportDbLang = getDbLanguageCode(supportCode);
  const offlineData = getOfflineDeckData(setId);
  if (offlineData) {
    const exactCards = offlineData.cards?.[supportCode]?.[targetCode];
    if (exactCards) return exactCards;

    const dbMappedCards = offlineData.cards?.[supportDbLang]?.[targetDbLang];
    if (dbMappedCards) return dbMappedCards;
  }

  const sql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      with deck_examples as (
        select distinct on (meaning_id)
          example_id,
          meaning_id,
          canonical_example_en,
          example_role
        from meaning_examples
        where set_id = '${setId.replace(/'/g, "''")}' or example_role = 'base'
        order by meaning_id, case when set_id = '${setId.replace(/'/g, "''")}' then 1 else 2 end
      )
      select
        msm.meaning_id,
        msm.display_order,
        mu.canonical_english,
        le_target.native_word as target_word,
        coalesce(le_target.word_with_article_or_marker, le_target.native_word) as target_display,
        le_target.transcription as target_transcription,
        le_support.native_word as support_word,
        coalesce(le_support.word_with_article_or_marker, le_support.native_word) as support_display,
        ex.example_id,
        ex_target.example_text as target_example,
        ex_support.example_text as support_example
      from meaning_set_memberships msm
      join meaning_units mu on mu.meaning_id = msm.meaning_id
      left join meaning_language_entries le_target 
        on le_target.meaning_id = msm.meaning_id 
        and le_target.language_code = '${targetDbLang.replace(/'/g, "''")}'
      left join meaning_language_entries le_support 
        on le_support.meaning_id = msm.meaning_id 
        and le_support.language_code = '${supportDbLang.replace(/'/g, "''")}'
      left join deck_examples ex on ex.meaning_id = msm.meaning_id
      left join meaning_example_translations ex_target 
        on ex_target.example_id = ex.example_id 
        and ex_target.language_code = '${targetDbLang.replace(/'/g, "''")}'
      left join meaning_example_translations ex_support 
        on ex_support.example_id = ex.example_id 
        and ex_support.language_code = '${supportDbLang.replace(/'/g, "''")}'
      where msm.set_id = '${setId.replace(/'/g, "''")}'
      order by msm.display_order, msm.meaning_id
    ) rows;
  `;
  return psqlJson(sql);
}

// Fetch localized deck title
export async function fetchDeckMetadata(setId, supportLang) {
  const supportCode = normalizeLanguageCode(supportLang);
  const supportDbLang = getDbLanguageCode(supportCode);
  const offlineData = getOfflineDeckData(setId);
  const offlineTitleKey = offlineData?.titles?.[supportCode] ? supportCode : supportDbLang;
  if (offlineData && offlineData.titles?.[offlineTitleKey]) {
    return {
      title: offlineData.titles[offlineTitleKey],
      description: offlineData.descriptions?.[offlineTitleKey] ?? "",
      levelSignal: offlineData.levelSignals?.[offlineTitleKey] ?? ""
    };
  }

  const sql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select
        title,
        description,
        level_signal as "levelSignal"
      from content_set_localizations 
      where set_id = '${setId.replace(/'/g, "''")}' 
        and language_code = '${supportDbLang.replace(/'/g, "''")}'
      limit 1
    ) rows;
  `;
  const res = await psqlJson(sql);
  if (res && res[0] && res[0].title) {
    return res[0];
  }

  // Fallback to English Course Metadata title before using the internal set name.
  const englishFallbackSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select
        title,
        description,
        level_signal as "levelSignal"
      from content_set_localizations
      where set_id = '${setId.replace(/'/g, "''")}'
        and language_code = 'EN'
      limit 1
    ) rows;
  `;
  const englishFallbackRes = await psqlJson(englishFallbackSql);
  if (englishFallbackRes && englishFallbackRes[0] && englishFallbackRes[0].title) {
    return englishFallbackRes[0];
  }

  // Last fallback: internal content set name, then slug.
  const fallbackSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select set_name, slug from content_sets where set_id = '${setId.replace(/'/g, "''")}' limit 1
    ) rows;
  `;
  const fallbackRes = await psqlJson(fallbackSql);
  if (fallbackRes && fallbackRes[0]) {
    if (fallbackRes[0].set_name) {
      return { title: fallbackRes[0].set_name, description: "", levelSignal: "" };
    }
    if (fallbackRes[0].slug) {
      return {
        title: fallbackRes[0].slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: "",
        levelSignal: ""
      };
    }
  }
  return { title: "Vocabulary Lesson", description: "", levelSignal: "" };
}

export async function fetchDeckTitle(setId, supportLang) {
  const metadata = await fetchDeckMetadata(setId, supportLang);
  return metadata.title;
}
