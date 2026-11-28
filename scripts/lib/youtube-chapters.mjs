import fs from "node:fs";
import path from "node:path";

export const YOUTUBE_CHAPTERS_FILENAME = "video_chapters.json";
const MAX_YOUTUBE_DESCRIPTION_LENGTH = 5000;
const MIN_YOUTUBE_CHAPTER_GAP_SECONDS = 10;
const MIN_YOUTUBE_CHAPTER_COUNT = 3;

export function formatYouTubeTimestamp(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function buildVideoChaptersFromSegments(segments, labels = {}) {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const deckLabel = String(labels.deckTitle || "Vocabulary").trim();
  const wordsLabel = String(labels.wordsLabel || deckLabel).trim();
  const quizLabel = String(labels.quizLabel || "Mini-Test").trim();
  const outroLabel = String(labels.outroLabel || "flashcardsluna.com").trim();

  let elapsed = 0;
  let firstCardStart = null;
  let midCardStart = null;
  let quizStart = null;
  let outroStart = null;

  const cardSegments = segments.filter((s) => s.taskType === "card" && !String(s.segmentName || "").startsWith("quiz-"));
  const midpointTargetName = cardSegments.length >= 6
    ? cardSegments[Math.floor(cardSegments.length / 2)]?.segmentName
    : null;

  for (const seg of segments) {
    const segName = String(seg.segmentName || "");
    if (firstCardStart === null && seg.taskType === "card" && !segName.startsWith("quiz-")) {
      firstCardStart = elapsed;
    }
    if (midCardStart === null && midpointTargetName && segName === midpointTargetName) {
      midCardStart = elapsed;
    }
    if (quizStart === null && seg.taskType === "card" && segName.startsWith("quiz-")) {
      quizStart = elapsed;
    }
    if (outroStart === null && seg.taskType === "outro") {
      outroStart = elapsed;
    }
    elapsed += Number(seg.duration) || 0;
  }

  const totalDuration = elapsed;
  const raw = [{ seconds: 0, label: deckLabel }];

  if (firstCardStart !== null && firstCardStart >= MIN_YOUTUBE_CHAPTER_GAP_SECONDS) {
    raw.push({ seconds: Math.floor(firstCardStart), label: wordsLabel });
  }
  if (midCardStart !== null && midCardStart >= MIN_YOUTUBE_CHAPTER_GAP_SECONDS) {
    raw.push({ seconds: Math.floor(midCardStart), label: `${wordsLabel} (2/2)` });
  }
  if (quizStart !== null && quizStart >= MIN_YOUTUBE_CHAPTER_GAP_SECONDS) {
    raw.push({ seconds: Math.floor(quizStart), label: quizLabel });
  }
  if (
    outroStart !== null &&
    outroStart >= MIN_YOUTUBE_CHAPTER_GAP_SECONDS &&
    totalDuration - outroStart >= MIN_YOUTUBE_CHAPTER_GAP_SECONDS
  ) {
    raw.push({ seconds: Math.floor(outroStart), label: outroLabel });
  }

  // Enforce strictly increasing timestamps with >= 10s between chapters
  const valid = [];
  for (const item of raw) {
    if (valid.length === 0) {
      valid.push({ seconds: 0, timestamp: "00:00", label: item.label });
      continue;
    }
    const prev = valid[valid.length - 1];
    if (item.seconds - prev.seconds >= MIN_YOUTUBE_CHAPTER_GAP_SECONDS) {
      valid.push({
        seconds: item.seconds,
        timestamp: formatYouTubeTimestamp(item.seconds),
        label: item.label,
      });
    }
  }

  if (valid.length < MIN_YOUTUBE_CHAPTER_COUNT) return [];
  return valid;
}

export function formatChaptersBlock(chapters) {
  if (!Array.isArray(chapters) || chapters.length < MIN_YOUTUBE_CHAPTER_COUNT) return "";
  return chapters
    .map((ch) => `${ch.timestamp || formatYouTubeTimestamp(ch.seconds)} ${String(ch.label || "").trim()}`)
    .filter((line) => line.length > 6)
    .join("\n");
}

export function appendVideoChaptersIfPresent(description, videoPath) {
  const base = String(description || "").trim();
  if (!videoPath || !base) return base;
  if (/(^|\n)0{1,2}:00\s+/u.test(base)) return base;

  const chaptersPath = path.join(path.dirname(path.resolve(videoPath)), YOUTUBE_CHAPTERS_FILENAME);
  if (!fs.existsSync(chaptersPath)) return base;

  try {
    const parsed = JSON.parse(fs.readFileSync(chaptersPath, "utf8"));
    const block = formatChaptersBlock(parsed?.chapters);
    if (!block) return base;
    const candidate = `${base}\n\n${block}`;
    if (candidate.length > MAX_YOUTUBE_DESCRIPTION_LENGTH) return base;
    return candidate;
  } catch {
    return base;
  }
}
