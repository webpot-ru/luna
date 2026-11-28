import fs from "node:fs";
import path from "node:path";

const DEFAULT_LOGO_PATH = "assets/youtube-channel-branding/en/flashcardsluna-site-avatar-512.png";
const COVER_TEMPLATES_PATH = "config/youtube-cover-templates.json";

let logoDataUriCache = null;
let coverTemplatesCache = null;
const deckArtCache = new Map();

function mimeTypeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function readDataUri(relativeOrAbsolutePath) {
  const fullPath = path.resolve(relativeOrAbsolutePath);
  if (!fs.existsSync(fullPath)) return "";
  const mime = mimeTypeForPath(fullPath);
  return `data:${mime};base64,${fs.readFileSync(fullPath).toString("base64")}`;
}

export function getBrandLogoDataUri() {
  if (logoDataUriCache !== null) return logoDataUriCache;
  logoDataUriCache = readDataUri(DEFAULT_LOGO_PATH);
  return logoDataUriCache;
}

function loadCoverTemplates() {
  if (coverTemplatesCache !== null) return coverTemplatesCache;
  const fullPath = path.resolve(COVER_TEMPLATES_PATH);
  if (!fs.existsSync(fullPath)) {
    coverTemplatesCache = {};
    return coverTemplatesCache;
  }
  try {
    coverTemplatesCache = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch {
    coverTemplatesCache = {};
  }
  return coverTemplatesCache;
}

export function getDeckArtDataUri(setId) {
  if (!setId) return "";
  if (deckArtCache.has(setId)) return deckArtCache.get(setId);
  const templates = loadCoverTemplates();
  const entry = templates?.sets?.[setId];
  const candidatePath = entry?.ordinaryBasePath || entry?.polyglotBasePath || "";
  const dataUri = candidatePath ? readDataUri(candidatePath) : "";
  deckArtCache.set(setId, dataUri);
  return dataUri;
}
