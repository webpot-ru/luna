import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fetchDeckCards, fetchDeckMetadata } from "./video-generator.mjs";
import { getLanguageNameInLang } from "./card-slide-template.mjs";
import { getPublicCourseDisplayUrl, getPublicCourseUrl } from "./video-public-url.mjs";
import { callVectorEngineGeminiJson } from "./vectorengine-gemini.mjs";
import {
  callGeminiApiJsonWithKeys,
  getDirectGeminiApiKeys,
  isRecoverableGeminiProviderError,
  parseGeminiBackendChain,
  runGeminiBackendChain,
} from "./gemini-structured-json.mjs";
import { buildPlaylistAssignment } from "./youtube-playlists.mjs";
import { getDbLanguageCode, normalizeLanguageCode } from "./video-language-codes.mjs";
import { BRAND_HASHTAG, BRAND_NAME } from "./brand.mjs";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";
const defaultGeminiApiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const defaultGeminiCliModel = process.env.GEMINI_CLI_MODEL || "gemini-3.1-pro-preview";
const defaultVectorEngineGeminiModel = process.env.VECTORENGINE_GEMINI_MODEL || "gemini-3.5-flash";
const videoLocalizationPath = path.resolve("config/video-localization.json");
const videoLocalization = fs.existsSync(videoLocalizationPath)
  ? JSON.parse(fs.readFileSync(videoLocalizationPath, "utf8"))
  : {};

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

export const YOUTUBE_METADATA_BATCH_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          hashtags: { type: "array", items: { type: "string" } },
        },
        required: ["requestId", "title", "description", "tags", "hashtags"],
      },
    },
  },
  required: ["items"],
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

function isEnglishSupport(code) {
  return ["EN", "EN-GB"].includes(normalizeLanguageCode(code));
}

const ENGLISH_TEMPLATE_PATTERNS = [
  { id: "a1-vocabulary-title", pattern: /\b[A-Z][A-Za-z -]+ A1 (?:[A-Za-z -]+\s+)?Vocabulary\b/u },
  { id: "a1-flashcards-title", pattern: /\b[A-Z][A-Za-z -]+ A1 Flashcards\b/u },
  { id: "english-vocabulary-with-pronunciation", pattern: /\b[A-Z][A-Za-z -]+ (?:A1\s+)?[A-Za-z -]*Vocabulary\s+with\s+Pronunciation\b/u },
  { id: "generic-a1-vocabulary", pattern: /\bA1\s+[A-Za-z -]*Vocabulary\b/u },
  { id: "words-with-pronunciation", pattern: /\b\d{1,3}\s+(?:[A-Z][A-Za-z -]+\s+)?(?:Kitchenware\s+)?Words?\s+with\s+Pronunciation\b/iu },
  { id: "kitchen-words-title", pattern: /\bKitchen(?:ware)? Words?\s+with\s+Pronunciation\b/iu },
  { id: "learn-essential-words", pattern: /\bLearn\s+\d{1,3}\s+essential\s+[A-Z][A-Za-z -]+\s+vocabulary\s+words\b/iu },
  { id: "short-video-lesson", pattern: /\bThis\s+short\s+video\s+lesson\s+helps\s+you\b/iu },
  { id: "listen-repeat-test", pattern: /\bListen\s+to\s+each\s+[A-Z][A-Za-z -]+\s+word,\s+repeat\s+during\s+the\s+pauses\b/iu },
  { id: "test-memory-ending", pattern: /\btest\s+your\s+memory\s+with\s+a\s+quick\s+mini-test\b/iu },
  { id: "daily-practice", pattern: /\bFor\s+daily\s+practice,\s+you\s+can\s+review\s+these\s+words\b/iu },
  { id: "videos-for-native-speakers", pattern: /\bvideos\s+for\s+native\s+[A-Z0-9 -]+\s+speakers\s+learning\b/iu },
  { id: "flashcards-pronunciation-repeat-pauses", pattern: /\bflashcards,\s+pronunciation,\s+repeat\s+pauses\b/iu },
  { id: "playlist-key-marker", pattern: /\bPlaylist\s+key:/iu },
  { id: "subscribe-english-template", pattern: /\bSubscribe\s+to\s+FlashcardsLuna\s+for\s+more\s+short\s+vocabulary\s+lessons\b/iu },
  { id: "beginner-learn-english-template", pattern: /\b(?:learn|study|practice)\s+[A-Z][A-Za-z -]+\s+(?:for\s+beginners|vocabulary|pronunciation)\b/iu },
];

const ENGLISH_TAG_PATTERNS = [
  /\blearn\s+[a-z]/iu,
  /\b[a-z]+\s+vocabulary\b/iu,
  /\b[a-z]+\s+pronunciation\b/iu,
  /\b[a-z]+\s+for beginners\b/iu,
  /\bkitchen(?:ware)?\s+words\b/iu,
  /\bbasic\s+[a-z]+\s+words\b/iu,
  /\bword list\b/iu,
];

function findEnglishTemplateMatches(value) {
  const text = cleanText(value);
  const matches = [];
  for (const item of ENGLISH_TEMPLATE_PATTERNS) {
    if (item.pattern.test(text)) matches.push(item.id);
  }
  return matches;
}

function countEnglishTags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .filter((tag) => ENGLISH_TAG_PATTERNS.some((pattern) => pattern.test(cleanText(tag))))
    .length;
}

function validateAiMetadataLanguage(metadata) {
  const supportLang = normalizeLanguageCode(metadata.supportLang);
  if (!supportLang || isEnglishSupport(supportLang)) {
    return { status: "pass", blockers: [], warnings: [] };
  }

  const titleMatches = findEnglishTemplateMatches(metadata.title);
  const descriptionMatches = findEnglishTemplateMatches(metadata.description);
  const playlistTitleMatches = findEnglishTemplateMatches(metadata.playlistTitle || metadata.playlist?.title);
  const playlistDescriptionMatches = findEnglishTemplateMatches(metadata.playlistDescription || metadata.playlist?.description);
  const englishTagCount = countEnglishTags(metadata.tags);
  const blockers = [];
  const warnings = [];

  if (titleMatches.length) {
    blockers.push(`non-English support ${supportLang} has English-template title markers: ${titleMatches.join(",")}`);
  }
  if (descriptionMatches.length) {
    blockers.push(`non-English support ${supportLang} has English-template description markers: ${descriptionMatches.join(",")}`);
  }
  if (playlistTitleMatches.length) {
    blockers.push(`non-English support ${supportLang} has English-template playlist title markers: ${playlistTitleMatches.join(",")}`);
  }
  if (playlistDescriptionMatches.length) {
    blockers.push(`non-English support ${supportLang} has English-template playlist description markers: ${playlistDescriptionMatches.join(",")}`);
  }
  if (englishTagCount >= 4) {
    blockers.push(`non-English support ${supportLang} has ${englishTagCount} English-template tags`);
  } else if (englishTagCount > 0) {
    warnings.push(`non-English support ${supportLang} has ${englishTagCount} English-looking tags`);
  }

  return {
    status: blockers.length ? "fail" : "pass",
    blockers,
    warnings,
  };
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

function getVideoLocalization(supportLang) {
  const code = normalizeLanguageCode(supportLang);
  return videoLocalization[code] || videoLocalization[code.replace(/-/gu, "_")] || {};
}

function fillTemplate(template, values) {
  return String(template || "").replace(/\{([a-z_]+)\}/giu, (_, key) => values[key] ?? "");
}

function stripHtml(value) {
  return String(value || "").replace(/<br\s*\/?>/giu, "\n").replace(/<[^>]+>/gu, "");
}

function genericLocalizedSupportCopy(supportLang) {
  const loc = getVideoLocalization(supportLang);
  return {
    title: ({ targetLanguageName, deckTitle, wordCount }) => {
      const wordsLabel = cleanText(loc.words_label);
      return cleanText(`${targetLanguageName} A1: ${deckTitle} | ${wordCount}${wordsLabel ? ` ${wordsLabel}` : ""}`);
    },
    description: ({ targetLanguageName, deckTitle, courseUrl }) => {
      const speech = fillTemplate(loc.intro_speech_template, {
        target_lang: targetLanguageName,
        deck_title: deckTitle,
      });
      const parts = [
        speech,
        stripHtml(loc.intro_desc),
        loc.outro_speech,
        loc.outro_subtitle,
        courseUrl,
      ].map(cleanText).filter(Boolean);
      if (parts.length >= 3) return parts.join("\n\n");
      return `${BRAND_NAME}\n\n${targetLanguageName} A1: ${deckTitle}\n\n${courseUrl}`;
    },
    tags: ({ targetLanguageName, deckTitle }) => uniqueStrings([
      targetLanguageName,
      deckTitle,
      cleanText(loc.words_label),
      cleanText(loc.quiz_title),
      BRAND_NAME,
    ]),
    hashtags: [BRAND_HASHTAG]
  };
}

function getSupportCopy(supportLang) {
  const code = String(supportLang).toUpperCase();
  if (code === "EN" || code === "EN-GB") {
    return {
      title: ({ targetLanguageName, deckTitle, wordCount }) =>
        `${targetLanguageName} A1: ${deckTitle} | ${wordCount} words with pronunciation`,
      description: ({ targetLanguageName, deckTitle, wordCount, courseUrl }) =>
        `Learn ${wordCount} ${targetLanguageName} words from the topic "${deckTitle}" with a short ${BRAND_NAME} video lesson for beginners. Listen to each word, read the meaning, repeat during the pauses, and use the quick mini-test at the end to check what you remember.\n\nThis A1 vocabulary format is built for daily practice: watch the lesson once, then open the deck on the site and review the flashcards at your own pace. It helps connect spelling, pronunciation and meaning without a long grammar explanation.\n\nPractice this deck and other free ${BRAND_NAME} courses here:\n${courseUrl}\n\nSubscribe for more short vocabulary videos with pronunciation, flashcards, repeat pauses and simple review exercises for language learners.`,
      tags: ({ targetLanguageName, deckTitle }) => [
        `${targetLanguageName} for beginners`,
        `learn ${targetLanguageName}`,
        `${targetLanguageName} vocabulary`,
        `${deckTitle} ${targetLanguageName}`,
        "words with pronunciation",
        "flashcards",
        "language learning",
        BRAND_NAME
      ],
      hashtags: [BRAND_HASHTAG, "#LanguageLearning", "#Vocabulary"]
    };
  }
  if (code === "RU") {
    return {
      title: ({ targetLanguageName, deckTitle, wordCount }) =>
        `${targetLanguageName} A1: ${deckTitle} | ${wordCount} слов с произношением`,
      description: ({ targetLanguageName, deckTitle, wordCount, courseUrl }) =>
        `Выучите ${wordCount} слов по теме «${deckTitle}» для языка ${targetLanguageName}. Это короткий видеоурок ${BRAND_NAME} для начинающих: слушайте слово и перевод, повторяйте вслух во время пауз, обращайте внимание на произношение и закрепляйте лексику в мини-тесте в конце видео.\n\nТакой формат удобно использовать как быструю ежедневную тренировку словаря A1: сначала посмотрите урок полностью, затем откройте карточки на сайте и повторите слова в своем темпе. Колода помогает связать написание, звучание и значение без лишней теории.\n\nОткройте эту колоду и другие бесплатные упражнения ${BRAND_NAME} на сайте:\n${courseUrl}\n\nПодписывайтесь на канал, если хотите регулярно пополнять словарный запас короткими видеоуроками с произношением, паузами для повторения и понятной практикой.`,
      tags: ({ targetLanguageName, deckTitle }) => [
        `${targetLanguageName} язык`,
        `${targetLanguageName} для начинающих`,
        `учить ${targetLanguageName}`,
        `${targetLanguageName} слова`,
        `${deckTitle} ${targetLanguageName}`,
        "слова с произношением",
        "карточки для слов",
        "изучение языков",
        BRAND_NAME
      ],
      hashtags: [BRAND_HASHTAG, "#изучениеязыков", "#словарныйзапас"]
    };
  }
  if (code === "ES" || code === "ES-419") {
    return {
      title: ({ targetLanguageName, deckTitle, wordCount }) =>
        `${targetLanguageName} A1: ${deckTitle} | ${wordCount} palabras con pronunciación`,
      description: ({ targetLanguageName, deckTitle, wordCount, courseUrl }) =>
        `Aprende ${wordCount} palabras de ${targetLanguageName} sobre «${deckTitle}» con un video corto de ${BRAND_NAME} para principiantes. Escucha cada palabra, mira el significado, repite en las pausas y usa la mini prueba final para comprobar qué recuerdas.\n\nEste formato está pensado para practicar vocabulario A1 de forma rápida: primero mira el video completo, después abre la baraja en el sitio y repasa las tarjetas a tu propio ritmo. Así conectas escritura, pronunciación y significado sin una explicación larga.\n\nPractica esta baraja y otros cursos gratuitos de ${BRAND_NAME} aquí:\n${courseUrl}\n\nSuscríbete para recibir más videos cortos de vocabulario, pronunciación y práctica de idiomas con tarjetas claras y ejercicios rápidos.`,
      tags: ({ targetLanguageName, deckTitle }) => [
        `${targetLanguageName} para principiantes`,
        `aprender ${targetLanguageName}`,
        `vocabulario ${targetLanguageName}`,
        `${deckTitle} ${targetLanguageName}`,
        "palabras con pronunciación",
        "tarjetas de vocabulario",
        "aprender idiomas",
        BRAND_NAME
      ],
      hashtags: [BRAND_HASHTAG, "#AprenderIdiomas", "#Vocabulario"]
    };
  }
  return genericLocalizedSupportCopy(code);
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
    privacyStatus = "public"
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
    deckMetadataSource: deckMetadata?.metadataSource || "unknown",
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
    deckMetadataSource: deckMetadata?.metadataSource || "unknown",
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
    `Create YouTube metadata for a ${BRAND_NAME} vocabulary lesson.`,
    "Return JSON only. Do not use Markdown. Do not add fields outside the schema.",
    "",
    "Audience and language rules:",
    `- Audience/support language code: ${baseMetadata.supportLang}`,
    `- Write title, description, tags and hashtags for native speakers of that support language.`,
    `- Target language: ${baseMetadata.targetLanguageName} (${baseMetadata.targetLang})`,
    `- Deck title: ${baseMetadata.deckTitle}`,
    `- Deck metadata source: ${baseMetadata.deckMetadataSource || "unknown"}`,
    `- Level: ${baseMetadata.level}`,
    `- Word count: ${baseMetadata.wordCount}`,
    `- Course URL: ${baseMetadata.courseUrl}`,
    "",
    "Content facts to preserve:",
    "- The video teaches vocabulary with pronunciation.",
    "- The learner repeats during pauses.",
    "- The end includes a short mini-test.",
    `- ${BRAND_NAME} provides practice decks on the website.`,
    "- Preserve the exact deck title phrase when naming the topic. Do not replace it with a newly invented deck/category title.",
    "- For non-English support languages, do not use English template phrases like \"A1 Vocabulary\", \"Vocabulary with Pronunciation\", \"Words with Pronunciation\", \"Everyday Flashcards\", \"for beginners\", \"learn <language>\" or English-only tags.",
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

export function buildVectorEngineGeminiPrompt(baseMetadata, cards) {
  const cardWords = uniqueStrings(cards.map((card) => card.target_display || card.target_word)).slice(0, 24);
  const facts = {
    supportLang: baseMetadata.supportLang,
    targetLang: baseMetadata.targetLang,
    targetLanguageName: baseMetadata.targetLanguageName,
    deckTitle: baseMetadata.deckTitle,
    deckMetadataSource: baseMetadata.deckMetadataSource || "unknown",
    level: baseMetadata.level,
    wordCount: baseMetadata.wordCount,
    courseUrl: baseMetadata.courseUrl,
    baseTitle: baseMetadata.title,
    baseDescription: baseMetadata.description,
    sampleWords: cardWords
  };
  return [
    "You are a JSON API. Return only the completed JSON object that starts with { and ends with }.",
    "Do not write analysis, notes, length checks, character counts, Markdown or prose outside JSON.",
    `Task: improve YouTube metadata for a ${BRAND_NAME} vocabulary video while preserving the facts below.`,
    "",
    "FACTS_JSON:",
    JSON.stringify(facts),
    "",
    "Rules:",
    "- Write title, description, tags and hashtags in the same language as baseTitle/baseDescription.",
    "- If the support/base language is not English, do not use English template phrases like \"A1 Vocabulary\", \"Vocabulary with Pronunciation\", \"Words with Pronunciation\", \"Everyday Flashcards\", \"for beginners\", \"learn <language>\" or English-only tags.",
    "- Make the title a natural search title for beginner learners, not clickbait.",
    "- Preserve facts.deckTitle as the canonical topic/deck phrase; do not replace it with a new category title.",
    "- Make the description several useful short paragraphs and include courseUrl exactly once.",
    `- Mention vocabulary, pronunciation, repeat pauses, mini-test/review, and ${BRAND_NAME} flashcards.`,
    "- Include 3-5 concrete sampleWords in the description if they fit naturally; do not turn the description into a keyword list.",
    "- tags: 12-18 short search phrases, no # characters.",
    "- hashtags: exactly 3 strings, each begins with # and contains no spaces.",
    "- Do not invent paid features, certificates, native teachers, exact duration or guarantees.",
    "",
    "Complete this exact JSON shape:",
    '{"title":"","description":"","tags":[],"hashtags":[]}'
  ].join("\n");
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

function batchSchemaFor(itemCount) {
  return {
    ...YOUTUBE_METADATA_BATCH_SCHEMA,
    properties: {
      ...YOUTUBE_METADATA_BATCH_SCHEMA.properties,
      items: {
        ...YOUTUBE_METADATA_BATCH_SCHEMA.properties.items,
        minItems: itemCount,
        maxItems: itemCount,
      },
    },
  };
}

export function buildYouTubeMetadataBatchPrompt(preparedItems) {
  const tasks = preparedItems.map(({ requestId, template, cards }) => ({
    requestId,
    supportLang: template.supportLang,
    targetLang: template.targetLang,
    targetLanguageName: template.targetLanguageName,
    deckTitle: template.deckTitle,
    deckMetadataSource: template.deckMetadataSource || "unknown",
    level: template.level,
    wordCount: template.wordCount,
    courseUrl: template.courseUrl,
    baseTitle: template.title,
    baseDescription: template.description,
    sampleWords: uniqueStrings(cards.map((card) => card.target_display || card.target_word)).slice(0, 24),
  }));
  return [
    `Create YouTube metadata for ${tasks.length} independent ${BRAND_NAME} vocabulary videos in one response.`,
    "Return one items[] entry for every task, preserving each requestId exactly.",
    "Write each entry in the language of that task's baseTitle/baseDescription.",
    "Do not merge tasks or omit an item.",
    "",
    "Shared rules:",
    "- Make each title a natural search title for beginner learners, not clickbait.",
    "- Preserve deckTitle as the canonical topic phrase.",
    "- Make each description several useful short paragraphs and include its courseUrl exactly once.",
    `- Mention vocabulary, pronunciation, repeat pauses, mini-test/review, and ${BRAND_NAME} flashcards.`,
    "- Include 3-5 sampleWords naturally when they fit.",
    "- tags: 12-18 short search phrases without # characters.",
    "- hashtags: exactly 3 strings, each beginning with # and containing no spaces.",
    "- For non-English support languages, do not use English template phrases or English-only tags.",
    "- Do not invent paid features, certificates, native teachers, exact duration or guarantees.",
    "",
    "TASKS_JSON:",
    JSON.stringify(tasks),
    "",
    "Return exactly this shape:",
    '{"items":[{"requestId":"same-as-input","title":"","description":"","tags":[],"hashtags":[]}]}',
  ].join("\n");
}

function validateBatchPayload(value, preparedItems) {
  const items = Array.isArray(value?.items) ? value.items : [];
  const expectedIds = new Set(preparedItems.map((item) => item.requestId));
  const byId = new Map();
  const unexpected = [];
  const duplicates = [];
  for (const item of items) {
    const requestId = String(item?.requestId || "");
    if (!expectedIds.has(requestId)) {
      unexpected.push(requestId || "(missing)");
      continue;
    }
    if (byId.has(requestId)) {
      duplicates.push(requestId);
      continue;
    }
    byId.set(requestId, item);
  }
  const missing = [...expectedIds].filter((requestId) => !byId.has(requestId));
  if (items.length !== expectedIds.size || missing.length || unexpected.length || duplicates.length) {
    throw new Error([
      "Gemini metadata batch did not return the exact requestId set",
      `expected=${expectedIds.size}`,
      `received=${items.length}`,
      `missing=${missing.join(",") || "none"}`,
      `unexpected=${unexpected.join(",") || "none"}`,
      `duplicates=${duplicates.join(",") || "none"}`,
    ].join("; "));
  }
  return byId;
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
    title: truncateAtWord(metadata.title || `${BRAND_NAME} Vocabulary Lesson`, 100),
    description: description.slice(0, 5000),
    tags,
    hashtags,
    categoryId: String(metadata.categoryId || "27"),
    privacyStatus: ["private", "unlisted", "public"].includes(metadata.privacyStatus)
      ? metadata.privacyStatus
      : "public"
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

export async function generateYouTubeMetadataBatch(inputs, options = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) return [];
  const withGemini = inputs[0].withGemini === true;
  if (inputs.some((input) => (input.withGemini === true) !== withGemini)) {
    throw new Error("A metadata batch cannot mix Gemini and template-only inputs.");
  }

  const preparedItems = await Promise.all(inputs.map(async (input, index) => {
    const cards = input.cards || await fetchDeckCards(input.setId, input.targetLang, input.supportLang);
    const deckMetadata = input.deckMetadata || await fetchDeckMetadata(input.setId, input.supportLang);
    const template = buildTemplateYouTubeMetadata({ ...input, cards, deckMetadata });
    return {
      input,
      cards,
      template,
      requestId: `metadata-${index}-${normalizeLanguageCode(input.targetLang)}`,
    };
  }));
  if (!withGemini) return preparedItems.map((item) => item.template);

  const requestedBackend = options.geminiBackend
    || inputs[0].geminiBackend
    || process.env.GEMINI_BACKEND
    || (getDirectGeminiApiKeys().length ? "api" : "cli");
  if (inputs.some((input) => input.geminiBackend && input.geminiBackend !== inputs[0].geminiBackend)) {
    throw new Error("A metadata batch cannot mix Gemini backend chains.");
  }
  const backends = parseGeminiBackendChain(requestedBackend, {
    hasDirectApiKey: getDirectGeminiApiKeys().length > 0,
  });
  const explicitModel = options.model || inputs[0].model || "";
  const prompt = buildYouTubeMetadataBatchPrompt(preparedItems);
  const schema = batchSchemaFor(preparedItems.length);
  const maxOutputTokens = Math.min(16000, 1000 + preparedItems.length * 1400);
  const defaultProviders = {
    api: async () => callGeminiApiJsonWithKeys({
      prompt,
      schema,
      model: explicitModel || defaultGeminiApiModel,
      maxOutputTokens,
      temperature: 0.3,
      systemInstruction: `Return strict JSON for all ${preparedItems.length} ${BRAND_NAME} metadata tasks. No Markdown or omitted items.`,
    }),
    vectorengine: async () => ({
      value: await callVectorEngineGeminiJson({
        prompt,
        schema,
        model: explicitModel || defaultVectorEngineGeminiModel,
        maxOutputTokens,
        temperature: 0.3,
        systemInstruction: `Return strict JSON for all ${preparedItems.length} ${BRAND_NAME} metadata tasks. No Markdown or omitted items.`,
      }),
      model: explicitModel || defaultVectorEngineGeminiModel,
    }),
    cli: async () => ({
      value: await callGeminiCli(prompt, { model: explicitModel || defaultGeminiCliModel }),
      model: explicitModel || defaultGeminiCliModel,
    }),
  };
  const configuredProviders = options.providers || defaultProviders;
  const providers = Object.fromEntries(Object.entries(configuredProviders).map(([backend, provider]) => [
    backend,
    async () => {
      const raw = await provider();
      const value = raw?.value ?? raw;
      return {
        ...(raw?.value === undefined ? {} : raw),
        value: validateBatchPayload(value, preparedItems),
      };
    },
  ]));

  let chainResult;
  try {
    chainResult = await runGeminiBackendChain({ backends, providers });
  } catch (error) {
    if (isStrictAiMetadataMode() || !isRecoverableGeminiProviderError(error)) throw error;
    const message = boundedAiError(error);
    console.warn(`[YOUTUBE_METADATA_AI_FALLBACK] ${backends.join(",")}: ${message}`);
    return preparedItems.map(({ template }) => normalizeYouTubeMetadata({
      ...template,
      source: "template-ai-fallback",
      aiMetadata: {
        attempted: true,
        backendChain: backends,
        status: "fallback",
        error: message,
      },
      generatedAt: new Date().toISOString(),
    }));
  }

  const model = chainResult.model || explicitModel || (
    chainResult.backend === "api"
      ? defaultGeminiApiModel
      : (chainResult.backend === "vectorengine" ? defaultVectorEngineGeminiModel : defaultGeminiCliModel)
  );
  return preparedItems.map(({ requestId, template }) => {
    const generated = chainResult.value.get(requestId);
    const aiMetadata = normalizeYouTubeMetadata({
      ...template,
      ...generated,
      source: `gemini-${chainResult.backend}-batch`,
      model,
      aiMetadata: {
        attempted: true,
        backend: chainResult.backend,
        backendChain: backends,
        batchSize: preparedItems.length,
        directKeyName: chainResult.backend === "api" ? chainResult.keyName : undefined,
        status: "pass",
      },
      generatedAt: new Date().toISOString(),
    });
    const languageGate = validateAiMetadataLanguage(aiMetadata);
    if (languageGate.blockers.length) {
      if (isStrictAiMetadataMode()) {
        throw new Error(`AI YouTube metadata failed language gate: ${languageGate.blockers.join("; ")}`);
      }
      console.warn(`[YOUTUBE_METADATA_AI_LANGUAGE_FALLBACK] ${chainResult.backend}/${model}: ${languageGate.blockers.join("; ")}`);
      return normalizeYouTubeMetadata({
        ...template,
        source: `gemini-${chainResult.backend}-localized-fallback`,
        model,
        aiMetadata: {
          attempted: true,
          backend: chainResult.backend,
          backendChain: backends,
          batchSize: preparedItems.length,
          status: "fallback",
          reason: "ai_metadata_failed_language_gate",
          languageGate,
        },
        generatedAt: new Date().toISOString(),
      });
    }
    if (languageGate.warnings.length) {
      aiMetadata.aiMetadata = {
        ...(aiMetadata.aiMetadata || {}),
        status: "warning",
        languageGate,
      };
    }
    return aiMetadata;
  });
}

export async function generateYouTubeMetadata(input) {
  const [metadata] = await generateYouTubeMetadataBatch([input]);
  return metadata;
}
