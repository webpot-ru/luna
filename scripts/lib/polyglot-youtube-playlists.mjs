import fs from "node:fs";
import path from "node:path";

import {
  normalizeLanguageCode,
  normalizeSlugPart,
} from "./youtube-playlists.mjs";
import { BRAND_NAME } from "./brand.mjs";

export const DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH = "config/youtube-polyglot-playlists.json";

const SUPPORT_LOCALE_OVERRIDES = {
  EN: "en",
  "EN-GB": "en-GB",
  ES: "es",
  "ES-419": "es-419",
  PT: "pt",
  "PT-BR": "pt-BR",
  RU: "ru",
  ZH: "zh",
  JA: "ja",
  KO: "ko",
};

const LANGUAGE_CODE_OVERRIDES = {
  EN: "en",
  "EN-GB": "en-GB",
  ES: "es",
  "ES-419": "es-419",
  PT: "pt",
  "PT-BR": "pt-BR",
  ZH: "zh",
};

const FALLBACK_EN_NAMES = {
  EN: "English",
  "EN-GB": "British English",
  ES: "Spanish",
  "ES-419": "Latin American Spanish",
  FR: "French",
  DE: "German",
  IT: "Italian",
  PT: "Portuguese",
  "PT-BR": "Brazilian Portuguese",
  RU: "Russian",
  ZH: "Chinese",
  JA: "Japanese",
  KO: "Korean",
  VI: "Vietnamese",
  TH: "Thai",
  ID: "Indonesian",
  MS: "Malay",
};

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function localeForSupport(supportLang) {
  const support = normalizeLanguageCode(supportLang);
  return SUPPORT_LOCALE_OVERRIDES[support] || support.toLowerCase();
}

function bcpLanguageCode(code) {
  const lang = normalizeLanguageCode(code);
  return LANGUAGE_CODE_OVERRIDES[lang] || lang.toLowerCase();
}

export function localizedLanguageName(code, supportLang) {
  const lang = normalizeLanguageCode(code);
  try {
    const displayNames = new Intl.DisplayNames([localeForSupport(supportLang), "en"], { type: "language" });
    const name = displayNames.of(bcpLanguageCode(lang));
    if (name) return cleanText(name);
  } catch {
    // Fall back to the stable English map below.
  }
  return FALLBACK_EN_NAMES[lang] || lang;
}

export function localizedLanguageList(targetLangs, supportLang) {
  return (targetLangs || [])
    .map((code) => localizedLanguageName(code, supportLang))
    .filter(Boolean)
    .join(", ");
}

export function buildPolyglotPlaylistKey({ supportLang, bundleKey, targetLangsHash }) {
  const support = normalizeLanguageCode(supportLang);
  const bundle = normalizeSlugPart(bundleKey);
  const hash = normalizeSlugPart(targetLangsHash);
  return ["POLYGLOT", support, bundle, hash].filter(Boolean).join("__");
}

function normalizeContentScope(value) {
  const scope = String(value || "full").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return scope || "full";
}

export function buildScopedPolyglotPlaylistKey({ supportLang, bundleKey, targetLangsHash, contentScope }) {
  const key = buildPolyglotPlaylistKey({ supportLang, bundleKey, targetLangsHash });
  const scope = normalizeContentScope(contentScope);
  return scope === "full" ? key : `${key}__${normalizeSlugPart(scope)}`;
}

function titleForSupport({ supportLang, targetLangs, bundleLabel }) {
  const support = normalizeLanguageCode(supportLang);
  const languageList = localizedLanguageList(targetLangs, support);
  if (support === "RU") return `Полиглот: ${languageList}`;
  if (support === "ES" || support === "ES-419") return `Modo poliglota: ${languageList}`;
  if (support === "PT" || support === "PT-BR") return `Modo poliglota: ${languageList}`;
  if (support === "FR") return `Mode polyglotte : ${languageList}`;
  if (support === "DE") return `Polyglott-Modus: ${languageList}`;
  return `Polyglot: ${languageList || bundleLabel}`;
}

function descriptionForSupport({ supportLang, targetLangs, bundleLabel }) {
  const support = normalizeLanguageCode(supportLang);
  const languageList = localizedLanguageList(targetLangs, support);
  if (support === "RU") {
    return `${BRAND_NAME}: плейлист для режима Полиглот. Учите несколько языков одновременно: ${languageList}. Тематические колоды, карточки, произношение и повторение. Bundle: ${bundleLabel}.`;
  }
  if (support === "ES" || support === "ES-419") {
    return `${BRAND_NAME}: playlist para el modo poliglota. Aprende varios idiomas a la vez: ${languageList}. Mazos temáticos, tarjetas, pronunciación y repaso. Bundle: ${bundleLabel}.`;
  }
  if (support === "PT" || support === "PT-BR") {
    return `${BRAND_NAME}: playlist para o modo poliglota. Aprenda vários idiomas ao mesmo tempo: ${languageList}. Decks temáticos, flashcards, pronúncia e revisão. Bundle: ${bundleLabel}.`;
  }
  if (support === "FR") {
    return `${BRAND_NAME}: playlist pour le mode polyglotte. Apprenez plusieurs langues à la fois : ${languageList}. Jeux thématiques, cartes, prononciation et révision. Bundle : ${bundleLabel}.`;
  }
  if (support === "DE") {
    return `${BRAND_NAME}: Playlist für den Polyglott-Modus. Lerne mehrere Sprachen gleichzeitig: ${languageList}. Thematische Decks, Karten, Aussprache und Wiederholung. Bundle: ${bundleLabel}.`;
  }
  return `${BRAND_NAME} playlist for Polyglot mode. Learn several languages at once: ${languageList}. Themed decks, flashcards, pronunciation and review. Bundle: ${bundleLabel}.`;
}

export function buildPolyglotPlaylistAssignment(metadata = {}) {
  const supportLang = normalizeLanguageCode(metadata.supportLang);
  const targetLangs = (metadata.targetLangs || metadata.targetLanguages || String(metadata.targetLangsCsv || "").split(","))
    .map(normalizeLanguageCode)
    .filter(Boolean);
  const bundleKey = String(metadata.bundleKey || "").trim();
  const targetLangsHash = String(metadata.targetLangsHash || metadata.targetsHash || "").trim();
  const contentScope = normalizeContentScope(metadata.contentScope);
  const bundleLabel = cleanText(metadata.bundleLabel || bundleKey);
  const key = metadata.polyglotPlaylistKey
    || metadata.playlist_key
    || buildScopedPolyglotPlaylistKey({ supportLang, bundleKey, targetLangsHash, contentScope });
  const title = cleanText(metadata.playlistTitle || metadata.playlist?.title || titleForSupport({
    supportLang,
    targetLangs,
    bundleLabel,
  }));
  const description = cleanText(metadata.playlistDescription || metadata.playlist?.description || descriptionForSupport({
    supportLang,
    targetLangs,
    bundleLabel,
  }));

  return {
    key,
    playlist_key: key,
    videoType: "polyglot",
    contentScope,
    supportLang,
    bundleKey,
    bundleLabel,
    targetLangs,
    targetLangsCsv: targetLangs.join(","),
    targetLangsHash,
    title,
    description,
    titleReviewStatus: metadata.playlistTitleSource && !String(metadata.playlistTitleSource).startsWith("template")
      ? "ai_polished"
      : "template_needs_native_review",
  };
}

export function loadPolyglotPlaylistRegistry(filePath = DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      sourceOfTruth: "docs/video-lessons-strategy.md#polyglot-mode-multilingual-decks",
      purpose: "Separate machine-readable playlist registry for Polyglot YouTube videos only.",
      defaults: {
        defaultPlaylistPrivacyStatus: "public",
        ledgerPath: "outputs/youtube-polyglot-publish-ledger.jsonl",
      },
      playlists: [],
    };
  }
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.playlists)) throw new Error(`Invalid Polyglot playlist registry: ${filePath}`);
  return registry;
}

export function savePolyglotPlaylistRegistry(registry, filePath = DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function findPolyglotPlaylistEntry(registry, key) {
  return (registry.playlists || []).find((playlist) => playlist.playlist_key === key || playlist.key === key);
}

export function upsertPlannedPolyglotPlaylist(registry, assignment, channel = {}) {
  const existing = findPolyglotPlaylistEntry(registry, assignment.key);
  if (existing) {
    let updated = false;
    const incomingIsReviewed = assignment.titleReviewStatus === "ai_polished";
    const existingNeedsReview = String(existing.titleReviewStatus || "").includes("template")
      || String(existing.titleReviewStatus || "").includes("needs");
    if (!existing.youtube_playlist_id && incomingIsReviewed && existingNeedsReview) {
      existing.title = assignment.title;
      existing.description = assignment.description;
      existing.titleReviewStatus = assignment.titleReviewStatus;
      existing.updatedAt = new Date().toISOString();
      updated = true;
    }
    for (const [field, value] of Object.entries({
      channelKey: channel.key || "",
      youtube_channel_id: channel.channelId || "",
      contentScope: assignment.contentScope,
      targetLangsCsv: assignment.targetLangsCsv,
      targetLangsHash: assignment.targetLangsHash,
    })) {
      if (!existing[field] && value) {
        existing[field] = value;
        updated = true;
      }
    }
    return { entry: existing, created: false, updated };
  }

  const entry = {
    playlist_key: assignment.key,
    videoType: "polyglot",
    contentScope: assignment.contentScope,
    supportLang: assignment.supportLang,
    bundleKey: assignment.bundleKey,
    bundleLabel: assignment.bundleLabel,
    targetLangs: assignment.targetLangs,
    targetLangsCsv: assignment.targetLangsCsv,
    targetLangsHash: assignment.targetLangsHash,
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
