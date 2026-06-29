import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync, execFileSync } from "node:child_process";
import { psqlJson } from "./qa-utils.mjs";
import { getDbLanguageCode, normalizeLanguageCode } from "./video-language-codes.mjs";
import { defaultVoiceMap, getVoiceForLanguage } from "./tts-voice-map.mjs";

export { defaultVoiceMap, getVoiceForLanguage };

// Load Environment Variables from local or webpot
function loadEnv() {
  const localEnv = path.resolve(".env.local");
  const localAccessImportEnv = path.resolve(".local/access-imports/youtube2026new.env.local");
  
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
  parseEnvFile(localAccessImportEnv);

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
const ai33TtsModelId = process.env.AI33_TTS_MODEL_ID || "eleven_multilingual_v2";
const ai33TtsOutputFormat = process.env.AI33_TTS_OUTPUT_FORMAT || "mp3_44100_128";
let ai33TaskStatusEndpoint = "";
let ai33TaskStatusHeaders = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function positiveIntegerEnv(name, fallback) {
  const parsed = Number(process.env[name] || "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatExecError(error) {
  const parts = [error?.message || String(error)];
  const stdout = Buffer.isBuffer(error?.stdout) ? error.stdout.toString("utf8").trim() : "";
  const stderr = Buffer.isBuffer(error?.stderr) ? error.stderr.toString("utf8").trim() : "";
  if (stdout) parts.push(`stdout: ${stdout}`);
  if (stderr) parts.push(`stderr: ${stderr}`);
  return parts.join(" | ");
}

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

function ai33ApiKeyHeaders(extra = {}) {
  return {
    "xi-api-key": apiKey,
    ...extra,
  };
}

function ai33AuthorizationHeaders(extra = {}) {
  return {
    Authorization: apiKey,
    ...extra,
  };
}

function normalizeAi33VoiceId(value, { stripProviderPrefix = true } = {}) {
  let normalized = String(value || "").trim().replace(/^ai33_/, "");
  if (stripProviderPrefix) normalized = normalized.replace(/^elevenlabs_/, "");
  return normalized;
}

function normalizeAi33TaskResponse(data, taskId) {
  if (data?.status) return data;
  if (data?.data?.status) return data.data;
  if (data?.success === false) {
    throw new Error(`AI33 task success=false for ${taskId}: ${JSON.stringify(data)}`);
  }
  throw new Error(`AI33 task response has no status for ${taskId}: ${JSON.stringify(data)}`);
}

async function readAi33TaskStatusFrom(endpoint, taskId, headers) {
  const data = await fetchWithRetry(new URL(endpoint.replace("{taskId}", encodeURIComponent(taskId)), baseUrl), {
    headers,
  }, 1);
  return normalizeAi33TaskResponse(data, taskId);
}

async function fetchAi33SpeechResponse(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const bodyBuffer = Buffer.from(await response.arrayBuffer());

    if (!response.ok) {
      const errorText = contentType.includes("json") || contentType.includes("text")
        ? bodyBuffer.toString("utf8")
        : `${bodyBuffer.length} bytes`;
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const looksJson = contentType.includes("json") || bodyBuffer.toString("utf8", 0, 1) === "{";
    if (looksJson) {
      return { data: JSON.parse(bodyBuffer.toString("utf8")) };
    }

    if (bodyBuffer.length > 0) {
      return { audioBuffer: bodyBuffer, contentType };
    }

    throw new Error("AI33 TTS returned an empty response.");
  } finally {
    clearTimeout(timeoutId);
  }
}

// Check status of an AI33 TTS task.
async function checkTaskStatus(taskId) {
  if (ai33TaskStatusEndpoint) {
    return readAi33TaskStatusFrom(ai33TaskStatusEndpoint, taskId, ai33TaskStatusHeaders || ai33ApiKeyHeaders());
  }

  const candidates = [
    { endpoint: "/v1/task/{taskId}", headers: ai33ApiKeyHeaders() },
    { endpoint: "/v3/task/{taskId}", headers: ai33AuthorizationHeaders() },
  ];

  const errors = [];
  for (const candidate of candidates) {
    try {
      const taskInfo = await readAi33TaskStatusFrom(candidate.endpoint, taskId, candidate.headers);
      ai33TaskStatusEndpoint = candidate.endpoint;
      ai33TaskStatusHeaders = candidate.headers;
      return taskInfo;
    } catch (error) {
      errors.push(`${candidate.endpoint}: ${error.message}`);
    }
  }
  throw new Error(`AI33 task status failed for ${taskId}: ${errors.join(" | ")}`);
}

async function createAi33Speech(text, voiceId, langCode) {
  if (!apiKey) {
    throw new Error("Missing AI33_API_KEY for Armenian HY TTS fallback.");
  }

  const documentedVoiceId = normalizeAi33VoiceId(voiceId, { stripProviderPrefix: true });
  const legacyVoiceId = normalizeAi33VoiceId(voiceId, { stripProviderPrefix: false });
  const attempts = [
    {
      label: "v1 ElevenLabs-compatible direct/task TTS",
      taskEndpoint: "/v1/task/{taskId}",
      taskHeaders: ai33ApiKeyHeaders(),
      request: () => {
        const url = new URL(`/v1/text-to-speech/${encodeURIComponent(documentedVoiceId)}`, baseUrl);
        url.searchParams.set("output_format", ai33TtsOutputFormat);
        return {
          url,
          options: {
            method: "POST",
            headers: ai33ApiKeyHeaders({
              "Accept": "audio/mpeg, application/json",
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({
              text,
              model_id: ai33TtsModelId,
            }),
          },
        };
      },
    },
    {
      label: "v1 AI33 documented async TTS",
      taskEndpoint: "/v1/task/{taskId}",
      taskHeaders: ai33ApiKeyHeaders(),
      request: () => {
        const url = new URL(`/v1/text-to-speech/${encodeURIComponent(documentedVoiceId)}`, baseUrl);
        url.searchParams.set("output_format", ai33TtsOutputFormat);
        return {
          url,
          options: {
            method: "POST",
            headers: ai33ApiKeyHeaders({
              "Accept": "audio/mpeg, application/json",
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({
              text,
              model_id: ai33TtsModelId,
              with_transcript: false,
            }),
          },
        };
      },
    },
    {
      label: "v3 legacy form TTS",
      taskEndpoint: "/v3/task/{taskId}",
      taskHeaders: ai33AuthorizationHeaders(),
      request: () => {
        const form = new FormData();
        form.append("text", text);
        form.append("voice_id", legacyVoiceId);
        form.append("language", String(langCode).split("-")[0].toLowerCase());
        form.append("speed", "1");
        form.append("similarity", "2");
        form.append("with_transcript", "false");
        return {
          url: new URL("/v3/text-to-speech", baseUrl),
          options: {
            method: "POST",
            headers: ai33AuthorizationHeaders(),
            body: form,
          },
        };
      },
    },
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const { url, options } = attempt.request();
      const { data, audioBuffer } = await fetchAi33SpeechResponse(url, options);
      if (audioBuffer) {
        return { audioBuffer };
      }
      if (data.success && data.task_id) {
        ai33TaskStatusEndpoint = attempt.taskEndpoint;
        ai33TaskStatusHeaders = attempt.taskHeaders;
        return { taskId: data.task_id };
      }
      errors.push(`${attempt.label}: ${data.message || data.error || data.error_message || "success=false/no task_id"}`);
    } catch (error) {
      errors.push(`${attempt.label}: ${error.message}`);
    }
  }

  throw new Error(`AI33 TTS did not return a task_id. ${errors.join(" | ")}`);
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
      const speech = await createAi33Speech(cleanedText, activeVoiceId, langCode);

      if (speech.audioBuffer) {
        fs.writeFileSync(cachedPath, speech.audioBuffer);
        return cachedPath;
      }

      let audioUrl = null;
      for (let i = 0; i < 30; i++) {
        await delay(2000);
        const taskInfo = await checkTaskStatus(speech.taskId);
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
  
  const retryCount = positiveIntegerEnv("EDGE_TTS_RETRIES", 4);
  const retryBaseMs = positiveIntegerEnv("EDGE_TTS_RETRY_BASE_MS", 1500);
  let lastError = null;
  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      if (fs.existsSync(cachedPath)) fs.unlinkSync(cachedPath);
    } catch (e) {}
    try {
      execFileSync(venvPath, [
        "--voice", cleanVoiceId,
        "--text", cleanedText,
        "--write-media", cachedPath
      ], {
        stdio: "pipe",
        timeout: positiveIntegerEnv("EDGE_TTS_TIMEOUT_MS", 90000),
      });
      if (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 0) {
        return cachedPath;
      }
      throw new Error("edge-tts wrote an empty audio file.");
    } catch (err) {
      lastError = err;
      try {
        if (fs.existsSync(cachedPath)) fs.unlinkSync(cachedPath);
      } catch (e) {}
      if (attempt < retryCount) {
        const waitMs = retryBaseMs * Math.pow(2, attempt - 1);
        console.warn(`[Local TTS] edge-tts failed for "${cleanedText.slice(0, 40)}..." attempt ${attempt}/${retryCount}; retrying in ${waitMs}ms. ${formatExecError(err)}`);
        await delay(waitMs);
      }
    }
  }

  throw new Error(`Local edge-tts failed for text "${text}" after ${retryCount} attempts: ${formatExecError(lastError)}`);
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

function sqlLiteral(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

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

function pickLocalizedValue(values, keys) {
  for (const key of keys) {
    const value = values?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getOfflineCourseMetadata(offlineData, supportCode, supportDbLang) {
  if (!offlineData) return null;
  const keys = Array.from(new Set([supportCode, supportDbLang].filter(Boolean)));
  const courseMetadata = offlineData.courseMetadata || offlineData.course_metadata || null;

  if (courseMetadata) {
    const title = pickLocalizedValue(courseMetadata.title, keys);
    if (title) {
      return {
        title,
        description: pickLocalizedValue(courseMetadata.description, keys),
        levelSignal: pickLocalizedValue(courseMetadata.levelSignal || courseMetadata.level_signal, keys),
        module: pickLocalizedValue(courseMetadata.module, keys),
        category: pickLocalizedValue(courseMetadata.category, keys),
        metadataSource: "offline-course-metadata"
      };
    }
  }

  const title = pickLocalizedValue(offlineData.titles, keys);
  if (title) {
    return {
      title,
      description: pickLocalizedValue(offlineData.descriptions, keys),
      levelSignal: pickLocalizedValue(offlineData.levelSignals || offlineData.level_signals, keys),
      metadataSource: "offline-legacy-titles"
    };
  }

  return null;
}

async function fetchDbCourseMetadata(setId, supportDbLang) {
  const sql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select
        title,
        description,
        module,
        category,
        level_signal as "levelSignal"
      from content_set_localizations
      where set_id = ${sqlLiteral(setId)}
        and language_code = ${sqlLiteral(supportDbLang)}
      limit 1
    ) rows;
  `;
  const rows = await psqlJson(sql);
  if (rows?.[0]?.title) {
    return { ...rows[0], metadataSource: "db-content-set-localizations" };
  }
  return null;
}

async function fetchEnglishCourseMetadata(setId) {
  const sql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select
        title,
        description,
        module,
        category,
        level_signal as "levelSignal"
      from content_set_localizations
      where set_id = ${sqlLiteral(setId)}
        and language_code = 'EN'
      limit 1
    ) rows;
  `;
  const rows = await psqlJson(sql);
  if (rows?.[0]?.title) {
    return { ...rows[0], metadataSource: "db-content-set-localizations-en-fallback" };
  }
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

  try {
    const dbMetadata = await fetchDbCourseMetadata(setId, supportDbLang);
    if (dbMetadata) return dbMetadata;
  } catch (error) {
    console.warn(`[COURSE_METADATA_DB_FALLBACK] ${setId}/${supportDbLang}: ${error.message}`);
  }

  const offlineMetadata = getOfflineCourseMetadata(getOfflineDeckData(setId), supportCode, supportDbLang);
  if (offlineMetadata) return offlineMetadata;

  try {
    const englishMetadata = await fetchEnglishCourseMetadata(setId);
    if (englishMetadata) return englishMetadata;
  } catch (error) {
    console.warn(`[COURSE_METADATA_EN_FALLBACK] ${setId}: ${error.message}`);
  }

  // Last fallback: internal content set name, then slug.
  const fallbackSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select set_name, slug from content_sets where set_id = ${sqlLiteral(setId)} limit 1
    ) rows;
  `;
  try {
    const fallbackRes = await psqlJson(fallbackSql);
    if (fallbackRes && fallbackRes[0]) {
      if (fallbackRes[0].set_name) {
        return { title: fallbackRes[0].set_name, description: "", levelSignal: "", metadataSource: "db-content-set-name-fallback" };
      }
      if (fallbackRes[0].slug) {
        return {
          title: fallbackRes[0].slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: "",
          levelSignal: "",
          metadataSource: "db-content-set-slug-fallback"
        };
      }
    }
  } catch (error) {
    console.warn(`[COURSE_METADATA_INTERNAL_FALLBACK] ${setId}: ${error.message}`);
  }
  return { title: "Vocabulary Lesson", description: "", levelSignal: "", metadataSource: "hardcoded-fallback" };
}

export async function fetchDeckTitle(setId, supportLang) {
  const metadata = await fetchDeckMetadata(setId, supportLang);
  return metadata.title;
}
