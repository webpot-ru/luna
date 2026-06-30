#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { BRAND_NAME } from "./lib/brand.mjs";
import { callVectorEngineGeminiJson } from "./lib/vectorengine-gemini.mjs";
import {
  DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH,
  buildPolyglotPlaylistAssignment,
  localizedLanguageList,
} from "./lib/polyglot-youtube-playlists.mjs";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";

const DEFAULT_PUBLICATION_REGISTRY_PATH = "config/youtube-polyglot-published-videos.json";
const DEFAULT_PROGRESS_PATH = "config/youtube-polyglot-progress.json";
const DEFAULT_BUNDLES_PATH = "config/polyglot-video-bundles.json";
const DEFAULT_OUTPUT_ROOT = "outputs/video-generator";
const POLYGLOT_YOUTUBE_METADATA_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
    playlistTitle: { type: "string" },
    playlistDescription: { type: "string" },
  },
  required: ["title", "description", "tags", "hashtags", "playlistTitle", "playlistDescription"],
};

function parseArgs(argv) {
  const options = {
    setId: "",
    support: "",
    bundleKey: "",
    bundleConfig: DEFAULT_BUNDLES_PATH,
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    progressRegistry: DEFAULT_PROGRESS_PATH,
    playlistRegistry: DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    output: "",
    privacyStatus: "public",
    publishAt: "",
    contentScope: "full",
    wordLimit: 0,
    maxDurationSeconds: 0,
    withGemini: false,
    requireAi: false,
    model: process.env.VECTORENGINE_GEMINI_MODEL || "gemini-3.5-flash",
    allowRepublish: false,
    requireOfflineDeck: true,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--set" || arg.startsWith("--set=")) options.setId = readValue();
    else if (arg === "--support" || arg.startsWith("--support=")) options.support = readValue();
    else if (arg === "--bundle" || arg.startsWith("--bundle=")) options.bundleKey = readValue();
    else if (arg === "--bundle-config" || arg.startsWith("--bundle-config=")) options.bundleConfig = readValue();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = readValue();
    else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) options.publicationRegistry = readValue();
    else if (arg === "--progress-registry" || arg.startsWith("--progress-registry=")) options.progressRegistry = readValue();
    else if (arg === "--playlist-registry" || arg.startsWith("--playlist-registry=")) options.playlistRegistry = readValue();
    else if (arg === "--output-root" || arg.startsWith("--output-root=")) options.outputRoot = readValue();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--privacy" || arg.startsWith("--privacy=")) options.privacyStatus = readValue();
    else if (arg === "--publish-at" || arg.startsWith("--publish-at=")) options.publishAt = readValue();
    else if (arg === "--content-scope" || arg.startsWith("--content-scope=")) options.contentScope = readValue();
    else if (arg === "--word-limit" || arg.startsWith("--word-limit=")) options.wordLimit = Number(readValue());
    else if (arg === "--max-duration-seconds" || arg.startsWith("--max-duration-seconds=")) options.maxDurationSeconds = Number(readValue());
    else if (arg === "--model" || arg.startsWith("--model=")) options.model = readValue();
    else if (arg === "--with-gemini") options.withGemini = true;
    else if (arg === "--require-ai") options.requireAi = true;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--no-require-offline-deck") options.requireOfflineDeck = false;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/generate-polyglot-youtube-metadata.mjs --set <set_id> --support RU --bundle global_europe_core",
    "",
    "Generates Polyglot youtube_metadata.json without uploading or writing external services.",
    "Template metadata is plan-only. Live apply should use --with-gemini --require-ai.",
  ].join("\n");
}

function visibleLength(value) {
  return Array.from(String(value || "")).length;
}

function decodeEscapedWhitespace(value) {
  return String(value || "")
    .replace(/\\r\\n/gu, "\n")
    .replace(/\\n/gu, "\n")
    .replace(/\\t/gu, "\t");
}

function cleanText(value) {
  return decodeEscapedWhitespace(value).replace(/\s+/gu, " ").trim();
}

function cleanMultilineText(value) {
  return decodeEscapedWhitespace(value)
    .replace(/\r\n?/gu, "\n")
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph
      .split("\n")
      .map((line) => line.replace(/[ \t]+/gu, " ").trim())
      .filter(Boolean)
      .join("\n"))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function boundedAiError(error) {
  return cleanText(error?.message || String(error || "unknown AI metadata error")).slice(0, 800);
}

function isRecoverableAiMetadataError(error) {
  return [
    /did not return JSON/iu,
    /returned empty text/iu,
    /Unexpected token/iu,
    /JSON\.parse/iu,
    /timed out/iu,
    /fetch failed/iu,
    /ECONNRESET/iu,
    /HTTP 5\d\d/iu,
    /HTTP 429/iu,
  ].some((pattern) => pattern.test(boundedAiError(error)));
}

function stripTerminator(value) {
  return cleanText(value).replace(/[.!?。！？։။။।]+$/u, "").trim();
}

function assertArgs(options) {
  if (!options.setId || !options.support || !options.bundleKey) {
    throw new Error("Expected --set, --support and --bundle.");
  }
  if (!["private", "unlisted", "public"].includes(options.privacyStatus)) {
    throw new Error(`Invalid --privacy=${options.privacyStatus}`);
  }
  if (!["full", "short_unverified"].includes(normalizeContentScope(options.contentScope))) {
    throw new Error(`Invalid --content-scope=${options.contentScope}`);
  }
}

function normalizeContentScope(value) {
  const scope = String(value || "full").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return scope || "full";
}

function runPlanner(options) {
  const output = path.join(
    "outputs",
    "polyglot-youtube-plan",
    `${options.setId}_${normalizeLanguageCode(options.support).toLowerCase()}_${options.bundleKey}.json`
  );
  const args = [
    "scripts/plan-polyglot-youtube-publish.mjs",
    "--set",
    options.setId,
    "--support",
    options.support,
    "--bundle",
    options.bundleKey,
    "--content-scope",
    normalizeContentScope(options.contentScope),
    "--bundle-config",
    options.bundleConfig,
    "--channel-config",
    options.channelConfig,
    "--publication-registry",
    options.publicationRegistry,
    "--progress-registry",
    options.progressRegistry,
    "--output",
    output,
  ];
  if (options.allowRepublish) args.push("--allow-republish");
  if (Number(options.maxDurationSeconds || 0) > 0) args.push("--max-duration-seconds", String(options.maxDurationSeconds));
  if (options.requireOfflineDeck) args.push("--require-offline-deck");
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Polyglot planner failed:\n${result.stdout}\n${result.stderr}`.trim());
  }
  return JSON.parse(fs.readFileSync(output, "utf8"));
}

function outputDirFor({ outputRoot, setId, supportLang }) {
  return path.resolve(outputRoot, `${setId}_polyglot_${supportLang.toLowerCase()}`);
}

function videoPathFor({ outputRoot, setId, supportLang, targetLangs, contentScope }) {
  const targetsStr = targetLangs.join("_").toLowerCase();
  const scope = normalizeContentScope(contentScope);
  const suffix = scope === "full" ? "" : `_${scope}`;
  return path.join(outputDirFor({ outputRoot, setId, supportLang }), `polyglot_${targetsStr}_${supportLang.toLowerCase()}${suffix}.mp4`);
}

function boundedTitle(value) {
  const text = cleanText(value);
  if (visibleLength(text) <= 100) return text;
  const chars = Array.from(text);
  return `${chars.slice(0, 96).join("").trim()}...`;
}

function templateTitle(candidate) {
  const support = normalizeLanguageCode(candidate.supportLang);
  const deckTitle = stripTerminator(candidate.deck?.title || candidate.setId);
  const languageList = localizedLanguageList(candidate.targetLangs, support);
  if (support === "RU") return boundedTitle(`Полиглот: ${deckTitle} | ${languageList}`);
  if (support === "ES" || support === "ES-419") return boundedTitle(`Modo poliglota: ${deckTitle} | ${languageList}`);
  if (support === "PT" || support === "PT-BR") return boundedTitle(`Modo poliglota: ${deckTitle} | ${languageList}`);
  if (support === "FR") return boundedTitle(`Mode polyglotte : ${deckTitle} | ${languageList}`);
  if (support === "DE") return boundedTitle(`Polyglott-Modus: ${deckTitle} | ${languageList}`);
  return boundedTitle(`Polyglot Vocabulary: ${deckTitle} | ${languageList}`);
}

function templateDescription(candidate) {
  const support = normalizeLanguageCode(candidate.supportLang);
  const deckTitle = stripTerminator(candidate.deck?.title || candidate.setId);
  const languageList = localizedLanguageList(candidate.targetLangs, support);
  const url = candidate.studyUrl;
  if (support === "RU") {
    return [
      `${BRAND_NAME} в режиме Полиглот: тема "${deckTitle}".`,
      `В одном видео вы повторяете опорные слова и проверяете себя сразу по нескольким языкам: ${languageList}.`,
      `Откройте эту колоду: ${url}`,
      `На ${BRAND_NAME} доступно более 180 тематических колод, и вы можете учить несколько языков одновременно в любой удобной комбинации.`,
      "Формат урока: опорное слово, пауза на вспоминание, карточки по каждому языку, произношение и повторение.",
    ].join("\n\n");
  }
  return [
    `${BRAND_NAME} Polyglot mode: "${deckTitle}".`,
    `Practise one support word and recall it across several languages in one lesson: ${languageList}.`,
    `Open this deck: ${url}`,
    `${BRAND_NAME} has more than 180 themed decks, and you can learn several languages at the same time in any combination you choose.`,
    "Lesson flow: support word, recall pause, one card per target language, pronunciation and review.",
  ].join("\n\n");
}

function templateTags(candidate) {
  const support = normalizeLanguageCode(candidate.supportLang);
  const deckTitle = stripTerminator(candidate.deck?.title || candidate.setId);
  const names = candidate.targetLangs.map((code) => localizedLanguageList([code], support)).filter(Boolean);
  return [
    "FlashcardsLuna",
    "polyglot",
    "polyglot mode",
    "language learning",
    "vocabulary",
    "flashcards",
    "learn languages",
    deckTitle,
    ...names,
  ]
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 18);
}

function templateHashtags(candidate) {
  const support = normalizeLanguageCode(candidate.supportLang);
  if (support === "RU") return ["#FlashcardsLuna", "#Полиглот", "#Языки"];
  return ["#FlashcardsLuna", "#Polyglot", "#LanguageLearning"];
}

function buildPrompt(candidate, playlistAssignment) {
  const support = normalizeLanguageCode(candidate.supportLang);
  const deckTitle = stripTerminator(candidate.deck?.title || candidate.setId);
  const languageList = localizedLanguageList(candidate.targetLangs, support);
  return [
    "Create YouTube SEO metadata for a FlashcardsLuna Polyglot vocabulary lesson.",
    "Return strict JSON only with keys: title, description, tags, hashtags, playlistTitle, playlistDescription.",
    `Support/viewer language: ${support}. Write title, description, playlistTitle and playlistDescription in this support language.`,
    `Deck title in support language: ${deckTitle}.`,
    `Target languages shown in one video: ${candidate.targetLangs.join(", ")} (${languageList}).`,
    `Study URL that must appear exactly once in the description: ${candidate.studyUrl}`,
    `Playlist key context: ${playlistAssignment.key}.`,
    "Hard constraints:",
    "- No free, paid, pricing, subscription, discount or tariff wording.",
    "- Do not claim native teachers, certificates, fluency guarantees, or official exams.",
    "- Title must be <= 100 characters and must clearly indicate Polyglot mode.",
    "- Description must be 450-1200 characters, useful for YouTube search, and include the exact study URL once.",
    "- Mention that FlashcardsLuna has more than 180 themed decks and that learners can learn several languages at the same time in any combination they choose.",
    "- Tags must be an array of 8-18 strings, no hashtags inside tags.",
    "- Hashtags must be an array of 3-5 strings, each starting with # and without spaces.",
    "- Playlist title and description must describe Polyglot mode and the target-language bundle.",
    "- Keep all JSON string values valid: no raw line breaks inside strings.",
    "",
    "Complete this exact JSON shape:",
    '{"title":"","description":"","tags":[],"hashtags":[],"playlistTitle":"","playlistDescription":""}',
  ].join("\n");
}

async function callPolyglotGeminiMetadata({ prompt, model }) {
  const request = {
    prompt,
    schema: POLYGLOT_YOUTUBE_METADATA_SCHEMA,
    model,
    maxOutputTokens: 4200,
    temperature: 0.25,
    systemInstruction: [
      `You create YouTube metadata for ${BRAND_NAME} Polyglot vocabulary videos.`,
      "Return exactly one valid JSON object and follow the provided schema.",
      "No Markdown, no hidden reasoning, no comments, no extra fields.",
    ].join(" "),
  };
  const attempts = [
    request,
    {
      ...request,
      temperature: 0,
      maxOutputTokens: 5200,
      systemInstruction: [
        "You are a strict JSON compiler.",
        "Return one complete valid JSON object and nothing else.",
        "No Markdown, no explanation, no raw line breaks inside strings.",
      ].join(" "),
      prompt: [
        "Return only valid JSON. Do not explain.",
        "",
        "METADATA_TASK:",
        prompt,
        "",
        "OUTPUT EXACTLY THIS OBJECT SHAPE WITH REAL VALUES:",
        '{"title":"...","description":"...","tags":["..."],"hashtags":["#..."],"playlistTitle":"...","playlistDescription":"..."}',
      ].join("\n"),
    },
    {
      ...request,
      temperature: 0,
      maxOutputTokens: 5200,
      systemInstruction: "Return strict JSON only. No Markdown. No extra text.",
    },
  ];
  let lastError;
  for (const attempt of attempts) {
    try {
      return await callVectorEngineGeminiJson(attempt);
    } catch (error) {
      lastError = error;
      if (!isRecoverableAiMetadataError(error)) throw error;
      console.warn(`Recoverable VectorEngine metadata error; retrying: ${boundedAiError(error)}`);
    }
  }
  throw lastError;
}

function normalizeAiMetadata(value, candidate, playlistAssignment) {
  const fallback = buildTemplateMetadata(candidate, playlistAssignment);
  const title = boundedTitle(value?.title || fallback.title);
  const description = cleanMultilineText(value?.description || fallback.description);
  const tags = Array.isArray(value?.tags) ? value.tags.map(cleanText).filter(Boolean) : fallback.tags;
  const hashtags = Array.isArray(value?.hashtags) ? value.hashtags.map(cleanText).filter(Boolean) : fallback.hashtags;
  const playlistTitle = boundedTitle(value?.playlistTitle || fallback.playlistTitle);
  const playlistDescription = cleanMultilineText(value?.playlistDescription || fallback.playlistDescription);
  return {
    ...fallback,
    title,
    description,
    tags: tags.slice(0, 20),
    hashtags: hashtags.slice(0, 5),
    playlistTitle,
    playlistDescription,
  };
}

function buildTemplateMetadata(candidate, playlistAssignment) {
  return {
    title: templateTitle(candidate),
    description: templateDescription(candidate),
    tags: templateTags(candidate),
    hashtags: templateHashtags(candidate),
    playlistTitle: playlistAssignment.title,
    playlistDescription: playlistAssignment.description,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  assertArgs(options);

  const plan = runPlanner(options);
  const candidate = plan.candidate;
  const supportLang = normalizeLanguageCode(candidate.supportLang);
  const contentScope = normalizeContentScope(candidate.contentScope || options.contentScope);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const channel = findChannelForSupport(channelRegistry.channels, supportLang);
  const initialPlaylist = buildPolyglotPlaylistAssignment(candidate);

  let copy = buildTemplateMetadata(candidate, initialPlaylist);
  let source = "template-polyglot";
  let model = "";
  let aiError = "";

  if (options.withGemini) {
    try {
      const result = await callPolyglotGeminiMetadata({
        prompt: buildPrompt(candidate, initialPlaylist),
        model: options.model,
      });
      copy = normalizeAiMetadata(result, candidate, initialPlaylist);
      source = "vectorengine-gemini-polyglot";
      model = options.model;
    } catch (error) {
      aiError = error.message;
      if (options.requireAi) throw error;
      source = "template-polyglot-ai-fallback";
    }
  } else if (options.requireAi) {
    throw new Error("Live Polyglot metadata requires --with-gemini --require-ai.");
  }

  const playlistAssignment = buildPolyglotPlaylistAssignment({
    ...candidate,
    playlistTitle: copy.playlistTitle,
    playlistDescription: copy.playlistDescription,
    playlistTitleSource: source,
  });
  const outputDir = outputDirFor({
    outputRoot: options.outputRoot,
    setId: candidate.setId,
    supportLang,
  });
  fs.mkdirSync(outputDir, { recursive: true });
  const metadataPath = path.resolve(options.output || path.join(outputDir, "youtube_metadata.json"));
  const videoPath = videoPathFor({
    outputRoot: options.outputRoot,
    setId: candidate.setId,
    supportLang,
    targetLangs: candidate.targetLangs,
    contentScope,
  });
  const metadata = {
    videoType: "polyglot",
    polyglotKey: candidate.polyglotKey,
    contentScope,
    wordLimit: Number(options.wordLimit || 0),
    maxDurationSeconds: Number(candidate.maxDurationSeconds || options.maxDurationSeconds || 0),
    setId: candidate.setId,
    supportLang,
    bundleKey: candidate.bundleKey,
    bundleLabel: candidate.bundleLabel,
    targetLangs: candidate.targetLangs,
    targetLangsCsv: candidate.targetLangsCsv,
    targetLangsHash: candidate.targetLangsHash,
    title: copy.title,
    description: copy.description,
    tags: copy.tags,
    hashtags: copy.hashtags,
    categoryId: "27",
    privacyStatus: options.privacyStatus,
    publishAt: options.publishAt || "",
    scheduledPublishAt: options.publishAt || "",
    source,
    model,
    aiError,
    generatedAt: new Date().toISOString(),
    deckTitle: candidate.deck?.title || "",
    deckDescription: candidate.deck?.description || "",
    deckMetadataSource: candidate.deck?.metadataSource || "",
    wordCount: Number(options.wordLimit || 0) > 0
      ? Math.min(Number(options.wordLimit), candidate.deck?.cardCount || Number(options.wordLimit))
      : candidate.deck?.cardCount || 0,
    fullDeckWordCount: candidate.deck?.cardCount || 0,
    courseUrl: candidate.studyUrl,
    studyUrl: candidate.studyUrl,
    courseDisplayUrl: candidate.studyUrl,
    videoPath,
    channelKey: candidate.channelKey || channel?.key || "",
    youtube_channel_id: candidate.youtubeChannelId || channel?.channelId || "",
    targetLanguageName: localizedLanguageList(candidate.targetLangs, supportLang),
    targetLanguagesDisplay: localizedLanguageList(candidate.targetLangs, supportLang),
    playlist_key: playlistAssignment.key,
    polyglotPlaylistKey: playlistAssignment.key,
    playlistTitle: playlistAssignment.title,
    playlistDescription: playlistAssignment.description,
    playlistTitleSource: source,
    playlist: {
      ...playlistAssignment,
      key: playlistAssignment.key,
    },
    playlistRegistry: options.playlistRegistry,
  };

  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  const report = {
    status: "ok",
    metadataPath,
    source,
    aiError,
    polyglotKey: candidate.polyglotKey,
    supportLang,
    targetLangs: candidate.targetLangs,
    courseUrl: candidate.studyUrl,
    playlist_key: playlistAssignment.key,
  };
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(`Wrote Polyglot YouTube metadata: ${metadataPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
