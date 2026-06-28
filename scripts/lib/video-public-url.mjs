import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const configPath = path.resolve("config/video-public-course-links.json");
const require = createRequire(import.meta.url);
const DEFAULT_SITE_BASE_URL = "https://flashcardsluna.com";
const DEFAULT_LANGUAGE = "en";
const DEFAULT_FALLBACK_COURSE_PATH = "courses";
const PUBLIC_SITE_LANGUAGE_PATH_OVERRIDES = {
  EN: "en",
  "EN-GB": "en",
  US: "en",
  UK: "en",
  GB: "en",
  ES: "es",
  "ES-419": "es",
  "ES-LATAM": "es",
  LATAM: "es",
  MX: "es",
  PT: "pt",
  "PT-BR": "pt",
  BR: "pt",
  BRAZILIAN: "pt",
  NO: "no",
  NB: "no"
};

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

const config = loadConfig();
let qrCodeModule;

function trimSlashes(value) {
  return String(value || "").trim().replace(/^\/+|\/+$/g, "");
}

function getBaseUrl() {
  return String(config.siteBaseUrl || DEFAULT_SITE_BASE_URL).replace(/\/+$/g, "");
}

function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

export function getPublicSiteLanguagePath(languageCode) {
  const lang = normalizeLanguageCode(languageCode);
  return (
    PUBLIC_SITE_LANGUAGE_PATH_OVERRIDES[lang] ||
    config.languagePathBySupportLanguage?.[lang] ||
    (lang ? lang.toLowerCase().split("-")[0] : "") ||
    config.defaultLanguage ||
    DEFAULT_LANGUAGE
  );
}

export function getSiteLanguagePath(supportLang) {
  return getPublicSiteLanguagePath(supportLang);
}

function getTargetStudyLanguageCode(targetLang) {
  return String(targetLang || "").trim().toLowerCase();
}

function getTargetStudyLanguageCodes({ targetLang, targetLangs } = {}) {
  const values = Array.isArray(targetLangs)
    ? targetLangs
    : String(targetLangs || "").split(",");
  const normalized = values
    .map(getTargetStudyLanguageCode)
    .filter(Boolean);
  if (normalized.length) return normalized;
  const single = getTargetStudyLanguageCode(targetLang);
  return single ? [single] : [];
}

function getQrCodeModule() {
  qrCodeModule ||= require("qrcode");
  return qrCodeModule.default || qrCodeModule;
}

export function getPublicCourseUrl({ setId, supportLang, targetLang, targetLangs } = {}) {
  const baseUrl = getBaseUrl();
  const languagePath = trimSlashes(getSiteLanguagePath(supportLang));
  const coursePath = trimSlashes(config.fallbackCoursePath || DEFAULT_FALLBACK_COURSE_PATH);
  const courseSlug = trimSlashes(config.publishedCourseSlugBySetId?.[setId]);
  const pathParts = [languagePath, coursePath, courseSlug].filter(Boolean);
  const courseUrl = `${baseUrl}/${pathParts.join("/")}`;
  const targetStudyLangs = getTargetStudyLanguageCodes({ targetLang, targetLangs });
  if (!courseSlug || !targetStudyLangs.length) return courseUrl;
  return `${courseUrl}/study/standard?langs=${encodeURIComponent(targetStudyLangs.join(","))}`;
}

export function isSpecificStudyCourseUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    const parts = parsed.pathname.split("/").filter(Boolean);
    const hasCoursePath = parts.length >= 5
      && parts[1] === trimSlashes(config.fallbackCoursePath || DEFAULT_FALLBACK_COURSE_PATH)
      && Boolean(parts[2])
      && parts[3] === "study"
      && parts[4] === "standard";
    return hasCoursePath && Boolean(parsed.searchParams.get("langs"));
  } catch {
    return false;
  }
}

export function getPublicCourseDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const languagePath = parts[0] || DEFAULT_LANGUAGE;
    const coursePath = parts[1] || DEFAULT_FALLBACK_COURSE_PATH;
    return `${parsed.hostname}/${languagePath}/${coursePath}`;
  } catch {
    return "flashcardsluna.com/courses";
  }
}

export function getQrCodeImageUrl(url, size = 350) {
  const QRCode = getQrCodeModule();
  const qr = QRCode.create(String(url || DEFAULT_SITE_BASE_URL), {
    errorCorrectionLevel: "M"
  });
  const moduleCount = qr.modules.size;
  const margin = 1;
  const viewBoxSize = moduleCount + margin * 2;
  const safeSize = Number.isFinite(Number(size)) ? Number(size) : 350;
  const pathParts = [];

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.modules.get(row, col)) {
        pathParts.push(`M${col + margin} ${row + margin}h1v1H${col + margin}z`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${viewBoxSize}v${viewBoxSize}H0z"/><path fill="#000" d="${pathParts.join("")}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
