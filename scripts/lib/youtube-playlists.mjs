import fs from "node:fs";
import path from "node:path";
import { BRAND_NAME } from "./brand.mjs";

export const DEFAULT_PLAYLIST_REGISTRY_PATH = "config/youtube-playlists.json";
export const DEFAULT_CHANNEL_CONFIG_PATH = "config/youtube-channels.json";

const EN_LANGUAGE_NAMES = {
  EN: "English",
  "EN-GB": "British English",
  ES: "Spanish",
  "ES-419": "Latin American Spanish",
  RU: "Russian",
  DE: "German",
  FR: "French",
  IT: "Italian",
  PT: "Portuguese",
  "PT-BR": "Brazilian Portuguese",
  JA: "Japanese",
  KO: "Korean",
  ZH: "Chinese",
  VI: "Vietnamese",
  TH: "Thai",
  TR: "Turkish",
  ID: "Indonesian",
  MS: "Malay",
  PL: "Polish",
  NL: "Dutch",
  SV: "Swedish",
  NO: "Norwegian",
  DA: "Danish",
  FI: "Finnish",
  CS: "Czech",
  SK: "Slovak",
  HU: "Hungarian",
  RO: "Romanian",
  BG: "Bulgarian",
  HR: "Croatian",
  SR: "Serbian",
  SL: "Slovenian",
  LT: "Lithuanian",
  LV: "Latvian",
  ET: "Estonian",
  IS: "Icelandic",
  HI: "Hindi",
  BN: "Bengali",
  TL: "Filipino",
  MY: "Burmese",
  KM: "Khmer",
  LO: "Lao",
  NE: "Nepali",
  SI: "Sinhala",
  TA: "Tamil",
  TE: "Telugu",
  KN: "Kannada",
  ML: "Malayalam",
  UZ: "Uzbek",
  KK: "Kazakh",
  AZ: "Azerbaijani",
  KA: "Georgian",
  HY: "Armenian",
  SW: "Swahili",
};

const RU_LANGUAGE_NAMES = {
  EN: "Английский",
  "EN-GB": "Британский английский",
  ES: "Испанский",
  "ES-419": "Латиноамериканский испанский",
  RU: "Русский",
  DE: "Немецкий",
  FR: "Французский",
  IT: "Итальянский",
  PT: "Португальский",
  "PT-BR": "Бразильский португальский",
  JA: "Японский",
  KO: "Корейский",
  ZH: "Китайский",
  VI: "Вьетнамский",
  TH: "Тайский",
  TR: "Турецкий",
  ID: "Индонезийский",
  MS: "Малайский",
  PL: "Польский",
  NL: "Нидерландский",
  SV: "Шведский",
  NO: "Норвежский",
  DA: "Датский",
  FI: "Финский",
  CS: "Чешский",
  SK: "Словацкий",
  HU: "Венгерский",
  RO: "Румынский",
  BG: "Болгарский",
  HR: "Хорватский",
  SR: "Сербский",
  SL: "Словенский",
  LT: "Литовский",
  LV: "Латышский",
  ET: "Эстонский",
  IS: "Исландский",
  HI: "Хинди",
  BN: "Бенгальский",
  TL: "Филиппинский",
  MY: "Бирманский",
  KM: "Кхмерский",
  LO: "Лаосский",
  NE: "Непальский",
  SI: "Сингальский",
  TA: "Тамильский",
  TE: "Телугу",
  KN: "Каннада",
  ML: "Малаялам",
  UZ: "Узбекский",
  KK: "Казахский",
  AZ: "Азербайджанский",
  KA: "Грузинский",
  HY: "Армянский",
  SW: "Суахили",
};

function getPlaylistLanguageName(targetLang, supportLang) {
  const target = normalizeLanguageCode(targetLang);
  const support = normalizeLanguageCode(supportLang);
  if (support === "RU") return RU_LANGUAGE_NAMES[target] || EN_LANGUAGE_NAMES[target] || target;
  return EN_LANGUAGE_NAMES[target] || target;
}

export function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

export function normalizeSlugPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripLevel(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function inferCourseFamily(metadata = {}) {
  const explicit = metadata.courseFamily || metadata.playlistCourseFamily;
  if (explicit) return normalizeSlugPart(explicit);

  const setId = String(metadata.setId || metadata.releaseId || "").toLowerCase();
  if (setId.includes("spanish_a1") || setId.includes("spanish-a1")) return "spanish-a1-core";
  if (setId.includes("oxford_3000") || setId.includes("oxford-3000")) return "oxford-3000-core";
  if (setId.includes("oxford_5000") || setId.includes("oxford-5000")) return "oxford-5000-advanced";
  if (setId.includes("hsk3") || setId.includes("hsk-3")) return "hsk3";
  if (setId.includes("hsk_classic") || setId.includes("hsk-classic")) return "hsk-classic";
  if (setId.includes("english_core_3000") || setId.includes("english-core-3000")) return "english-core-3000";
  return "ordinary-vocabulary";
}

export function inferLevelOrTrack(metadata = {}, courseFamily = inferCourseFamily(metadata)) {
  const explicit = metadata.levelOrTrack || metadata.playlistLevelOrTrack || metadata.playlistTrack;
  if (explicit) return normalizeSlugPart(explicit);

  const setId = String(metadata.setId || metadata.releaseId || "").toLowerCase();
  const level = stripLevel(metadata.level || "");

  if (courseFamily === "spanish-a1-core") return "a1";
  if (courseFamily === "oxford-3000-core") return level && level !== "a1" ? level : "a1-a2";
  if (courseFamily === "oxford-5000-advanced") return level || "b2-c1";
  if (courseFamily === "hsk3") {
    const match = setId.match(/level[-_]?(\d+)/);
    return match ? `level-${match[1]}` : "level-1";
  }
  if (courseFamily === "hsk-classic") {
    const match = setId.match(/hsk[-_]?(\d+)/);
    return match ? `hsk-${match[1]}` : "hsk";
  }
  if (courseFamily === "english-core-3000") return level || "core";
  return "a1-everyday";
}

export function buildPlaylistKey({ supportLang, targetLang, courseFamily, levelOrTrack, variantOrYear }) {
  const support = normalizeLanguageCode(supportLang);
  const target = normalizeLanguageCode(targetLang);
  const family = normalizeSlugPart(courseFamily);
  const track = normalizeSlugPart(levelOrTrack);
  const variant = normalizeSlugPart(variantOrYear);
  return [support, target, family, track, variant].filter(Boolean).join("__");
}

function buildTitle({ supportLang, targetLang, courseFamily, levelOrTrack }) {
  const support = normalizeLanguageCode(supportLang);
  const targetName = getPlaylistLanguageName(targetLang, support);
  const rawTrack = String(levelOrTrack || "");
  const level = rawTrack
    .replace(/^a1-/i, "A1: ")
    .replace(/^a2-/i, "A2: ")
    .replace(/^b1-/i, "B1: ")
    .replace(/^b2-/i, "B2: ")
    .replace(/^c1-/i, "C1: ")
    .replace(/^c2-/i, "C2: ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();

  if (support === "RU") {
    if (courseFamily === "ordinary-vocabulary") return `${targetName} A1: бытовой словарь`;
    if (courseFamily === "spanish-a1-core") return `${targetName} A1: базовый курс`;
    if (courseFamily === "hsk3") return `${targetName}: HSK 3.0`;
    if (courseFamily.startsWith("oxford")) return `${targetName}: Oxford vocabulary`;
    return `${targetName}: ${BRAND_NAME}`;
  }
  if (support === "ES" || support === "ES-419") {
    return `${targetName} ${level || "A1"}: tarjetas ${BRAND_NAME}`;
  }
  if (support === "PT" || support === "PT-BR") {
    return `${targetName} ${level || "A1"}: flashcards ${BRAND_NAME}`;
  }
  if (courseFamily === "ordinary-vocabulary") {
    return `${targetName} ${level || "A1"} Flashcards`;
  }
  return `${targetName} ${level || "A1"}: ${BRAND_NAME} flashcards`;
}

function buildDescription({ supportLang, targetLang, courseFamily, levelOrTrack }) {
  const support = normalizeLanguageCode(supportLang);
  const targetName = getPlaylistLanguageName(targetLang, support);
  if (support === "RU") {
    return `Видео ${BRAND_NAME} для русскоязычных, которые изучают ${targetName}: карточки, произношение, паузы для повторения и короткие мини-тесты. Playlist key: ${courseFamily}/${levelOrTrack}.`;
  }
  return `${BRAND_NAME} videos for native ${support} speakers learning ${targetName}: flashcards, pronunciation, repeat pauses and quick mini-tests. Playlist key: ${courseFamily}/${levelOrTrack}.`;
}

export function buildPlaylistAssignment(metadata = {}) {
  const supportLang = normalizeLanguageCode(metadata.supportLang);
  const targetLang = normalizeLanguageCode(metadata.targetLang);
  const courseFamily = inferCourseFamily(metadata);
  const levelOrTrack = inferLevelOrTrack(metadata, courseFamily);
  const variantOrYear = metadata.variantOrYear || metadata.playlistVariant || "";
  const key = buildPlaylistKey({ supportLang, targetLang, courseFamily, levelOrTrack, variantOrYear });
  const title = cleanText(metadata.playlistTitle || buildTitle({ supportLang, targetLang, courseFamily, levelOrTrack }));
  const description = cleanText(metadata.playlistDescription || buildDescription({ supportLang, targetLang, courseFamily, levelOrTrack }));
  const titleReviewStatus = ["EN", "RU", "ES", "ES-419", "PT", "PT-BR"].includes(supportLang)
    ? "template_reviewed_family"
    : "template_needs_native_review";

  return {
    key,
    supportLang,
    targetLang,
    courseFamily,
    levelOrTrack,
    variantOrYear: normalizeSlugPart(variantOrYear),
    title,
    description,
    titleReviewStatus,
  };
}

export function loadYoutubeChannels(filePath = DEFAULT_CHANNEL_CONFIG_PATH) {
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.channels)) throw new Error(`Invalid YouTube channel config: ${filePath}`);
  return registry;
}

export function findChannelForSupport(channels, supportLang) {
  const code = normalizeLanguageCode(supportLang);
  return channels.find((channel) => (channel.supportLangs || []).map(normalizeLanguageCode).includes(code));
}

export function loadPlaylistRegistry(filePath = DEFAULT_PLAYLIST_REGISTRY_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      sourceOfTruth: "docs/video-lessons-strategy.md#13-playlist-architecture",
      defaults: {
        privacyStatusBeforeReview: "unlisted",
        ledgerPath: "outputs/youtube-publish-ledger.jsonl",
      },
      playlists: [],
    };
  }
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.playlists)) throw new Error(`Invalid YouTube playlist registry: ${filePath}`);
  return registry;
}

export function savePlaylistRegistry(registry, filePath = DEFAULT_PLAYLIST_REGISTRY_PATH) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function findPlaylistEntry(registry, key) {
  return registry.playlists.find((playlist) => playlist.playlist_key === key || playlist.key === key);
}

export function upsertPlannedPlaylist(registry, assignment, channel = {}) {
  const existing = findPlaylistEntry(registry, assignment.key);
  if (existing) return { entry: existing, created: false };

  const entry = {
    playlist_key: assignment.key,
    supportLang: assignment.supportLang,
    targetLang: assignment.targetLang,
    courseFamily: assignment.courseFamily,
    levelOrTrack: assignment.levelOrTrack,
    variantOrYear: assignment.variantOrYear,
    channelKey: channel.key || "",
    youtube_channel_id: channel.channelId || "",
    youtube_playlist_id: "",
    title: assignment.title,
    description: assignment.description,
    status: "planned",
    titleReviewStatus: assignment.titleReviewStatus,
    createdAt: new Date().toISOString(),
    lastReadbackAt: "",
  };
  registry.playlists.push(entry);
  registry.playlists.sort((a, b) => String(a.playlist_key).localeCompare(String(b.playlist_key)));
  return { entry, created: true };
}
