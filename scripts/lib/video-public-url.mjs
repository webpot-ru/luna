import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const configPath = path.resolve("config/video-public-course-links.json");
const DEFAULT_SITE_BASE_URL = "https://flashcardsluna.com";
const DEFAULT_LANGUAGE = "en";
const DEFAULT_FALLBACK_COURSE_PATH = "courses";

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

const config = loadConfig();

function trimSlashes(value) {
  return String(value || "").trim().replace(/^\/+|\/+$/g, "");
}

function getBaseUrl() {
  return String(config.siteBaseUrl || DEFAULT_SITE_BASE_URL).replace(/\/+$/g, "");
}

export function getSiteLanguagePath(supportLang) {
  const lang = String(supportLang || "").toUpperCase();
  return (
    config.languagePathBySupportLanguage?.[lang] ||
    (lang ? lang.toLowerCase().split("-")[0] : "") ||
    config.defaultLanguage ||
    DEFAULT_LANGUAGE
  );
}

function getTargetStudyLanguageCode(targetLang) {
  return String(targetLang || "").trim().toLowerCase();
}

export function getPublicCourseUrl({ setId, supportLang, targetLang } = {}) {
  const baseUrl = getBaseUrl();
  const languagePath = trimSlashes(getSiteLanguagePath(supportLang));
  const coursePath = trimSlashes(config.fallbackCoursePath || DEFAULT_FALLBACK_COURSE_PATH);
  const courseSlug = trimSlashes(config.publishedCourseSlugBySetId?.[setId]);
  const pathParts = [languagePath, coursePath, courseSlug].filter(Boolean);
  const courseUrl = `${baseUrl}/${pathParts.join("/")}`;
  const targetStudyLang = getTargetStudyLanguageCode(targetLang);
  if (!courseSlug || !targetStudyLang) return courseUrl;
  return `${courseUrl}/study/standard?langs=${encodeURIComponent(targetStudyLang)}`;
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
