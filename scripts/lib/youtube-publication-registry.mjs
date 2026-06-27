import fs from "node:fs";

export const DEFAULT_PUBLICATION_REGISTRY_PATH = "config/youtube-published-videos.json";

function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

export function loadPublicationRegistry(filePath = DEFAULT_PUBLICATION_REGISTRY_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      publications: [],
    };
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed.publications)) parsed.publications = [];
  return parsed;
}

export function savePublicationRegistry(registry, filePath = DEFAULT_PUBLICATION_REGISTRY_PATH) {
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function publicationMatches(row, { setId, supportLang, targetLang }) {
  return String(row?.setId || "") === String(setId || "")
    && normalizeLanguageCode(row?.supportLang) === normalizeLanguageCode(supportLang)
    && normalizeLanguageCode(row?.targetLang) === normalizeLanguageCode(targetLang);
}

export function isActivePublication(row) {
  if (!row?.youtubeVideoId) return false;
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  if (status.includes("failed")) return false;
  if (status.includes("deleted")) return false;
  if (status.includes("superseded")) return false;
  return true;
}

export function findActivePublication(registry, query) {
  return (registry.publications || [])
    .filter((row) => publicationMatches(row, query))
    .filter(isActivePublication)
    .sort((a, b) => String(b.lastReadbackAt || b.uploadedAt || "").localeCompare(String(a.lastReadbackAt || a.uploadedAt || "")))[0] || null;
}

export function activePublicationBlocker(row) {
  if (!row) return "";
  return [
    "already published in config/youtube-published-videos.json",
    `video=${row.youtubeVideoId}`,
    `status=${row.publicationStatus || row.privacyStatus || "unknown"}`,
    `run=${row.githubRunId || "unknown"}`,
    "use visibility workflow or pass --allow-republish for an intentional duplicate/reupload",
  ].join("; ");
}

export function upsertPublication(registry, publication) {
  registry.publications = registry.publications || [];
  const keyFor = (row) => [
    row.setId,
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
    row.youtubeVideoId,
  ].join("|");
  const key = keyFor(publication);
  const index = registry.publications.findIndex((row) => keyFor(row) === key);
  if (index >= 0) {
    registry.publications[index] = publication;
    return { updated: true, created: false };
  }
  registry.publications.push(publication);
  return { updated: false, created: true };
}
