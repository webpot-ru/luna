import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fetchDeckCards, fetchDeckMetadata } from "./video-generator.mjs";
import { getLanguageNameInLang } from "./card-slide-template.mjs";
import { getPublicCourseDisplayUrl, getPublicCourseUrl } from "./video-public-url.mjs";
import { callVectorEngineGeminiJson } from "./vectorengine-gemini.mjs";
import { buildPlaylistAssignment } from "./youtube-playlists.mjs";
import { getDbLanguageCode, normalizeLanguageCode } from "./video-language-codes.mjs";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";
const defaultGeminiApiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const defaultGeminiCliModel = process.env.GEMINI_CLI_MODEL || "gemini-3.1-pro-preview";
const defaultVectorEngineGeminiModel = process.env.VECTORENGINE_GEMINI_MODEL || "gemini-3.5-flash";

export const YOUTUBE_METADATA_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } }
  },
  required: ["title", "description", "tags", "hashtags"]
};

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

async function psqlJson(sql) {
  const { stdout } = await execFileAsync("psql", [databaseUrl, "-tA", "-c", sql], { maxBuffer: 1024 * 1024 * 10 });
  return JSON.parse(stdout.trim() || "[]");
}

function stripSentenceTerminator(value) {
  return String(value || "").trim().replace(/[.!?。！？։။။।]+$/u, "").trim();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = cleanText(value);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function truncateAtWord(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function boundedAiError(error) {
  return cleanText(error?.message || String(error || "unknown AI metadata error")).slice(0, 600);
}

function isStrictAiMetadataMode() {
  return /^(1|true|yes)$/iu.test(String(process.env.YOUTUBE_METADATA_AI_STRICT || ""));
}

function isRecoverableAiMetadataError(error) {
  const message = boundedAiError(error);
  return [
    /did not return JSON/iu,
    /returned empty text/iu,
    /Unexpected token/iu,
    /JSON.parse/iu,
    /timed out/iu,
    /fetch failed/iu,
    /ECONNRESET/iu,
    /HTTP 5\d\d/iu,
    /HTTP 429/iu
  ].some((pattern) => pattern.test(message));
}

function extractLevel(setId, metadata) {
  const signal = stripSentenceTerminator(metadata?.levelSignal);
  if (signal) return signal;
  const description = stripSentenceTerminator(metadata?.description);
  if (description) {
    const parts = description.split(/[.!?。！？։။။।]/u).map((part) => cleanText(part)).filter(Boolean);
    const last = parts.at(-1);
    if (last && last.length <= 80) return last;
  }
  const match = String(setId).match(/_(a[12]|b[12]|c[12])(?:_(a[12]|b[12]|c[12]))?$/iu);
  if (match) return match[0].slice(1).toUpperCase().replace("_", "-");
  return "A1";
}

function getSupportCopy(supportLang) {
  const code = String(supportLang).toUpperCase();
  if (code === "RU") {
    return {
      title: ({ targetLanguageName, deckTitle, wordCount }) =>
        `${targetLanguageName} A1: ${deckTitle} | ${wordCount} слов с произношением`,
      description: ({ targetLanguageName, deckTitle, wordCount, courseUrl }) =>
        `Выучите ${wordCount} слов по теме «${deckTitle}» для языка ${targetLanguageName}. Слушайте произношение, повторяйте слова в паузах и закрепите материал в коротком мини-тесте в конце видео.\n\nОткройте эту колоду и другие бесплатные упражнения LunaCards на сайте:\n${courseUrl}\n\nПодписывайтесь на канал, если хотите регулярно пополнять словарный запас короткими видеоуроками.`,
      tags: ({ targetLanguageName, deckTitle }) => [
        `${targetLanguageName} язык`,
        `${targetLanguageName} для начинающих`,
        `учить ${targetLanguageName}`,
        `${targetLanguageName} слова`,
        `${deckTitle} ${targetLanguageName}`,
        "слова с произношением",
        "карточки для слов",
        "изучение языков",
        "LunaCards"
      ],
      hashtags: ["#LunaCards", "#изучениеязыков", "#словарныйзапас"]
    };
  }
  if (code === "ES" || code === "ES-419") {
    return {
      title: ({ targetLanguageName, deckTitle, wordCount }) =>
        `${targetLanguageName} A1: ${deckTitle} | ${wordCount} palabras con pronunciación`,
      description: ({ targetLanguageName, deckTitle, wordCount, courseUrl }) =>
        `Aprende ${wordCount} palabras de ${targetLanguageName} sobre «${deckTitle}». Escucha la pronunciación, repite en las pausas y termina con una mini prueba rápida para repasar.\n\nPractica esta baraja y otros cursos gratuitos de LunaCards aquí:\n${courseUrl}\n\nSuscríbete para recibir nuevos videos cortos de vocabulario y práctica de idiomas.`,
      tags: ({ targetLanguageName, deckTitle }) => [
        `${targetLanguageName} para principiantes`,
        `aprender ${targetLanguageName}`,
        `vocabulario ${targetLanguageName}`,
        `${deckTitle} ${targetLanguageName}`,
        "palabras con pronunciación",
        "tarjetas de vocabulario",
        "aprender idiomas",
        "LunaCards"
      ],
      hashtags: ["#LunaCards", "#AprenderIdiomas", "#Vocabulario"]
    };
  }
  return {
    title: ({ targetLanguageName, deckTitle, wordCount }) =>
      `${targetLanguageName} A1: ${deckTitle} | ${wordCount} words with pronunciation`,
    description: ({ targetLanguageName, deckTitle, wordCount, courseUrl }) =>
      `Learn ${wordCount} ${targetLanguageName} words from the topic "${deckTitle}". Listen to the pronunciation, repeat during the pauses, and finish with a short mini-test to review the words.\n\nPractice this deck and other free LunaCards courses here:\n${courseUrl}\n\nSubscribe for more short vocabulary videos and language practice.`,
    tags: ({ targetLanguageName, deckTitle }) => [
      `${targetLanguageName} for beginners`,
      `learn ${targetLanguageName}`,
      `${targetLanguageName} vocabulary`,
      `${deckTitle} ${targetLanguageName}`,
      "words with pronunciation",
      "flashcards",
      "language learning",
      "LunaCards"
    ],
    hashtags: ["#LunaCards", "#LanguageLearning", "#Vocabulary"]
  };
}

export async function resolveTargetLanguages(setId, supportLang) {
  const supportCode = normalizeLanguageCode(supportLang);
  const supportDbLang = getDbLanguageCode(supportCode);
  const jsonPath = path.resolve(`data/decks/${setId}.json`);
  if (fs.existsSync(jsonPath)) {
    const deckData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const supportKey = deckData.cards?.[supportCode] ? supportCode : supportDbLang;
    const langs = Object.keys(deckData.cards?.[supportKey] || {});
    if (langs.length > 0) {
      return langs
        .map((lang) => normalizeLanguageCode(lang))
        .filter((lang) => getDbLanguageCode(lang) !== supportDbLang)
        .sort();
    }
  }

  const sql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select distinct language_code
      from meaning_language_entries
      where meaning_id in (
        select meaning_id from meaning_set_memberships
        where set_id = ${sqlString(setId)}
      )
      and language_code <> ${sqlString(supportDbLang)}
      order by language_code
    ) rows;
  `;
  const rows = await psqlJson(sql);
  return rows.map((row) => String(row.language_code).toUpperCase());
}

export function buildTemplateYouTubeMetadata(input) {
  const {
    setId,
    targetLang,
    supportLang,
    cards,
    deckMetadata,
    privacyStatus = "unlisted"
  } = input;
  const deckTitle = stripSentenceTerminator(deckMetadata?.title) || "Vocabulary Lesson";
  const level = extractLevel(setId, deckMetadata);
  const courseUrl = getPublicCourseUrl({ setId, supportLang, targetLang });
  const courseDisplayUrl = getPublicCourseDisplayUrl(courseUrl);
  const targetLanguageName = getLanguageNameInLang(targetLang, supportLang);
  const wordCount = cards.length;
  const supportCopy = getSupportCopy(supportLang);
  const firstWords = uniqueStrings(cards.map((card) => card.target_display || card.target_word)).slice(0, 8);

  const baseContext = {
    targetLanguageName,
    deckTitle,
    level,
    wordCount,
    courseUrl,
    courseDisplayUrl
  };

  const tags = uniqueStrings([
    ...supportCopy.tags(baseContext),
    ...firstWords,
    deckTitle,
    targetLanguageName
  ]).slice(0, 20);

  return normalizeYouTubeMetadata({
    source: "template",
    model: null,
    generatedAt: new Date().toISOString(),
    setId,
    targetLang,
    supportLang,
    targetLanguageName,
    deckTitle,
    level,
    wordCount,
    courseUrl,
    courseDisplayUrl,
    title: supportCopy.title(baseContext),
    description: supportCopy.description(baseContext),
    tags,
    hashtags: supportCopy.hashtags,
    categoryId: "27",
    privacyStatus
  });
}

export function buildGeminiPrompt(baseMetadata, cards) {
  const cardWords = uniqueStrings(cards.map((card) => card.target_display || card.target_word)).slice(0, 40);
  return [
    "Create YouTube metadata for a LunaCards vocabulary lesson.",
    "Return JSON only. Do not use Markdown. Do not add fields outside the schema.",
    "",
    "Audience and language rules:",
    `- Audience/support language code: ${baseMetadata.supportLang}`,
    `- Write title, description, tags and hashtags for native speakers of that support language.`,
    `- Target language: ${baseMetadata.targetLanguageName} (${baseMetadata.targetLang})`,
    `- Deck title: ${baseMetadata.deckTitle}`,
    `- Level: ${baseMetadata.level}`,
    `- Word count: ${baseMetadata.wordCount}`,
    `- Course URL: ${baseMetadata.courseUrl}`,
    "",
    "Content facts to preserve:",
    "- The video teaches vocabulary with pronunciation.",
    "- The learner repeats during pauses.",
    "- The end includes a short mini-test.",
    "- LunaCards provides practice decks on the website.",
    "- Do not invent paid features, certificates, native teacher claims, exact duration, or guarantees.",
    "- Keep it search-friendly but not clickbait.",
    "",
    "Output constraints:",
    "- title: <= 90 characters.",
    "- description: 700-1400 characters, include the exact course URL once.",
    "- tags: 12-20 short search phrases, no hashtags inside tags.",
    "- hashtags: 3-5 strings beginning with #.",
    "- Keep total tags length under 450 characters.",
    "",
    `Suggested base title: ${baseMetadata.title}`,
    `Suggested base description: ${baseMetadata.description}`,
    `Vocabulary sample: ${cardWords.join(", ")}`,
    "",
    'JSON schema: {"title":"string","description":"string","tags":["string"],"hashtags":["string"]}'
  ].join("\n");
}

function parseGeminiTextResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error(`Gemini returned no text: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return text;
}

async function callGeminiApi(prompt, { model = defaultGeminiApiModel, maxOutputTokens = 1600 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required for Gemini API metadata generation.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: YOUTUBE_METADATA_SCHEMA,
        temperature: 0.35,
        maxOutputTokens
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}: ${JSON.stringify(data).slice(0, 800)}`);
  }
  return JSON.parse(parseGeminiTextResponse(data));
}

async function callGeminiCli(prompt, { model = defaultGeminiCliModel } = {}) {
  const { stdout } = await execFileAsync("gemini", ["--skip-trust", "-m", model, "-p", prompt], {
    maxBuffer: 1024 * 1024 * 4,
    timeout: 120000
  });
  const raw = stdout.trim();
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Gemini CLI did not return JSON: ${raw.slice(0, 500)}`);
  }
  return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
}

async function callGeminiVectorEngine(prompt, { model = defaultVectorEngineGeminiModel, maxOutputTokens = 1600 } = {}) {
  const request = {
    prompt,
    schema: YOUTUBE_METADATA_SCHEMA,
    model,
    maxOutputTokens,
    temperature: 0.35,
    systemInstruction: [
      "You create YouTube metadata for LunaCards vocabulary videos.",
      "Return strict JSON only and follow the provided schema.",
      "Do not include hidden reasoning, Markdown, comments or extra fields."
    ].join(" ")
  };
  try {
    return await callVectorEngineGeminiJson(request);
  } catch (error) {
    if (!/did not return JSON|returned empty text|Unexpected token|JSON\.parse/iu.test(boundedAiError(error))) {
      throw error;
    }
    return callVectorEngineGeminiJson({
      ...request,
      temperature: 0,
      systemInstruction: [
        "You are a strict JSON compiler.",
        "Return exactly one valid JSON object and nothing else.",
        "No Markdown, no explanation, no numbered lists, no comments."
      ].join(" "),
      prompt: [
        prompt,
        "",
        "CRITICAL FORMAT REQUIREMENT:",
        "Output exactly one JSON object with these keys only: title, description, tags, hashtags.",
        "Example shape:",
        '{"title":"...","description":"...","tags":["..."],"hashtags":["#..."]}'
      ].join("\n")
    });
  }
}

function normalizeHashtag(value) {
  const text = cleanText(value);
  if (!text) return "";
  return text.startsWith("#") ? text.replace(/\s+/gu, "") : `#${text.replace(/\s+/gu, "")}`;
}

function capTagBudget(tags, maxChars = 450) {
  const result = [];
  let total = 0;
  for (const tag of tags) {
    const clean = truncateAtWord(tag.replace(/^#/u, ""), 45);
    if (!clean) continue;
    const nextTotal = total + clean.length + (result.length ? 1 : 0);
    if (nextTotal > maxChars) continue;
    result.push(clean);
    total = nextTotal;
  }
  return result;
}

export function normalizeYouTubeMetadata(metadata) {
  const tags = capTagBudget(uniqueStrings(metadata.tags || []));
  const hashtags = uniqueStrings((metadata.hashtags || []).map(normalizeHashtag)).slice(0, 5);
  const courseUrl = metadata.courseUrl || getPublicCourseUrl({
    setId: metadata.setId,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang
  });
  let description = String(metadata.description || "").trim();
  if (courseUrl && !description.includes(courseUrl)) {
    description = `${description.trim()}\n\n${courseUrl}`.trim();
  }

  const normalized = {
    ...metadata,
    title: truncateAtWord(metadata.title || "LunaCards Vocabulary Lesson", 100),
    description: description.slice(0, 5000),
    tags,
    hashtags,
    categoryId: String(metadata.categoryId || "27"),
    privacyStatus: ["private", "unlisted", "public"].includes(metadata.privacyStatus)
      ? metadata.privacyStatus
      : "unlisted"
  };

  if (normalized.setId && normalized.supportLang && normalized.targetLang) {
    const assignment = buildPlaylistAssignment(normalized);
    normalized.playlist_key = normalized.playlist_key || normalized.playlistKey || assignment.key;
    normalized.playlistKey = normalized.playlistKey || normalized.playlist_key;
    normalized.playlist = {
      ...assignment,
      key: normalized.playlist_key,
      title: normalized.playlistTitle || assignment.title,
      description: normalized.playlistDescription || assignment.description
    };
  }

  return normalized;
}

export async function generateYouTubeMetadata(input) {
  const cards = input.cards || await fetchDeckCards(input.setId, input.targetLang, input.supportLang);
  const deckMetadata = input.deckMetadata || await fetchDeckMetadata(input.setId, input.supportLang);
  const template = buildTemplateYouTubeMetadata({ ...input, cards, deckMetadata });
  if (!input.withGemini) return template;

  const prompt = buildGeminiPrompt(template, cards);
  const backend = input.geminiBackend
    || process.env.GEMINI_BACKEND
    || (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "api" : "cli");
  const model = input.model || (
    backend === "api"
      ? defaultGeminiApiModel
      : (backend === "vectorengine" ? defaultVectorEngineGeminiModel : defaultGeminiCliModel)
  );
  let generated;
  try {
    generated = backend === "api"
      ? await callGeminiApi(prompt, { model })
      : (backend === "vectorengine"
        ? await callGeminiVectorEngine(prompt, { model })
        : await callGeminiCli(prompt, { model }));
  } catch (error) {
    if (isStrictAiMetadataMode() || !isRecoverableAiMetadataError(error)) {
      throw error;
    }
    const message = boundedAiError(error);
    console.warn(`[YOUTUBE_METADATA_AI_FALLBACK] ${backend}/${model}: ${message}`);
    return normalizeYouTubeMetadata({
      ...template,
      source: "template-ai-fallback",
      aiMetadata: {
        attempted: true,
        backend,
        model,
        status: "fallback",
        error: message
      },
      generatedAt: new Date().toISOString()
    });
  }

  return normalizeYouTubeMetadata({
    ...template,
    ...generated,
    source: `gemini-${backend}`,
    model,
    generatedAt: new Date().toISOString()
  });
}
