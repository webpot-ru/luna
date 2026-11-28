import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  formatYouTubeTimestamp,
  buildVideoChaptersFromSegments,
  appendVideoChaptersIfPresent,
  YOUTUBE_CHAPTERS_FILENAME,
} from "./youtube-chapters.mjs";

test("formatYouTubeTimestamp formats mm:ss and h:mm:ss", () => {
  assert.equal(formatYouTubeTimestamp(0), "00:00");
  assert.equal(formatYouTubeTimestamp(65), "01:05");
  assert.equal(formatYouTubeTimestamp(3661), "1:01:01");
});

test("buildVideoChaptersFromSegments builds valid >=3 YouTube chapters with >=10s spacing", () => {
  const segments = [
    { taskType: "intro", segmentName: "intro-slide", duration: 5 },
    ...Array.from({ length: 12 }, (_, i) => ({
      taskType: "card",
      segmentName: `card-${String(i + 1).padStart(2, "0")}-1`,
      duration: 8,
    })),
    { taskType: "midroll", segmentName: "midroll-service", duration: 3.6 },
    { taskType: "card", segmentName: "quiz-01-q3", duration: 15 },
    { taskType: "outro", segmentName: "outro-ad", duration: 12 },
  ];

  const chapters = buildVideoChaptersFromSegments(segments, {
    deckTitle: "Кухонная посуда",
    wordsLabel: "Слова с произношением",
    quizLabel: "Мини-тест",
    outroLabel: "flashcardsluna.com",
  });

  assert.ok(chapters.length >= 3);
  assert.equal(chapters[0].timestamp, "00:00");
  for (let i = 1; i < chapters.length; i++) {
    assert.ok(chapters[i].seconds - chapters[i - 1].seconds >= 10);
  }
});

test("appendVideoChaptersIfPresent appends sibling chapters without duplicating existing 00:00", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "luna-chapters-"));
  const mp4 = path.join(dir, "lesson_en_ru.mp4");
  fs.writeFileSync(mp4, "");
  fs.writeFileSync(
    path.join(dir, YOUTUBE_CHAPTERS_FILENAME),
    JSON.stringify({
      chapters: [
        { seconds: 0, timestamp: "00:00", label: "Кухонная посуда" },
        { seconds: 45, timestamp: "00:45", label: "Слова (2/2)" },
        { seconds: 95, timestamp: "01:35", label: "Мини-тест" },
      ],
    }),
  );

  const out = appendVideoChaptersIfPresent("Учите слова на https://flashcardsluna.com", mp4);
  assert.ok(out.includes("00:00 Кухонная посуда"));
  assert.ok(out.includes("01:35 Мини-тест"));

  // Calling again must not duplicate chapters
  const out2 = appendVideoChaptersIfPresent(out, mp4);
  assert.equal(out2, out);
  fs.rmSync(dir, { recursive: true, force: true });
});
