#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildPlaylistAssignment } from "./lib/youtube-playlists.mjs";
import { getPublicCourseUrl } from "./lib/video-public-url.mjs";

const options = {
  output: "",
  strictWarnings: false,
};
const inputs = [];

for (const arg of process.argv.slice(2)) {
  if (arg === "--strict-warnings") options.strictWarnings = true;
  else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
  else inputs.push(arg);
}

function usage() {
  return [
    "Usage: node scripts/check-youtube-seo-metadata.mjs <metadata-file-or-dir> [...] [--output=report.json] [--strict-warnings]",
    "",
    "Blocks structural publish risks. Emits warnings for SEO-quality gaps that need AI/native review.",
  ].join("\n");
}

function collectFiles(paths) {
  const files = [];
  for (const input of paths) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectFiles([full]));
        else if (entry.isFile() && entry.name.endsWith("youtube_metadata.json")) files.push(full);
      }
    } else {
      files.push(resolved);
    }
  }
  return files.sort();
}

function visibleLength(value) {
  return Array.from(String(value || "")).length;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function lower(value) {
  return String(value || "").toLocaleLowerCase();
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  const text = String(haystack || "");
  while ((index = text.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function containsAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const LEARNING_INTENT_PATTERNS = [
  /\blearn(?:ing)?\b/iu,
  /\bstudy(?:ing)?\b/iu,
  /\bpractice\b/iu,
  /\bbeginner/iu,
  /\ba1\b/iu,
  /уч(?:и|ить|им|итьcя|иться)/iu,
  /изуч/iu,
  /для начина/iu,
  /aprender/iu,
  /principiante/iu,
  /aprender/iu,
  /iniciante/iu,
  /o'?rgan/iu,
  /mashq/iu,
  /学/iu,
  /学习/iu,
  /學習/iu,
  /배우/iu,
  /เรียน/iu,
  /học/iu,
];

const VOCABULARY_PATTERNS = [
  /\bvocab(?:ulary)?\b/iu,
  /\bwords?\b/iu,
  /слов/iu,
  /словар/iu,
  /palabr/iu,
  /vocabulario/iu,
  /vocabul.rio/iu,
  /so'?z/iu,
  /単語/iu,
  /語彙/iu,
  /词|詞/iu,
  /단어|어휘/iu,
  /kata/iu,
  /từ vựng/iu,
];

const PRONUNCIATION_PATTERNS = [
  /pronunc/iu,
  /произнош/iu,
  /pronunciaci/iu,
  /pron.ncia/iu,
  /talaffuz/iu,
  /発音/iu,
  /发音|發音/iu,
  /발음/iu,
  /उच्चारण/iu,
  /উচ্চারণ/iu,
  /การออกเสียง/iu,
  /phát âm/iu,
  /uttale|uttal|udtale/iu,
  /uitspraak/iu,
  /izgovor/iu,
  /v.slov/iu,
  /wymow/iu,
  /h..ld/iu,
  /t.l.ff.z/iu,
];

const PRACTICE_PATTERNS = [
  /repeat/iu,
  /pause/iu,
  /mini[- ]?test/iu,
  /review/iu,
  /повтор/iu,
  /пауз/iu,
  /мини[- ]?тест/iu,
  /repite|repasar|prueba/iu,
  /repita|pausa|teste/iu,
  /takror|mashq|test/iu,
  /復習|練習/iu,
  /복습|연습/iu,
  /练习|練習/iu,
];

const CLICKBAIT_OR_UNSUPPORTED_PATTERNS = [
  /guaranteed/iu,
  /fluent in \d/iu,
  /native teacher/iu,
  /certificate/iu,
  /сертификат/iu,
  /гарант/iu,
  /носител[ья] языка/iu,
  /fluidez garant/iu,
  /profesor nativo/iu,
  /certificado/iu,
];

function getExpectedCourseUrl(metadata) {
  if (!metadata.setId || !metadata.supportLang || !metadata.targetLang) return "";
  return getPublicCourseUrl({
    setId: metadata.setId,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang,
  });
}

function hasSiblingThumbnail(file) {
  const dir = path.dirname(file);
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  return entries.some((name) => /(?:^|[-_])(thumbnail|cover|poster)(?:[-_.]|$).*\.(?:png|jpe?g|webp)$/iu.test(name));
}

function validate(metadata, file) {
  const blockers = [];
  const warnings = [];
  const title = cleanText(metadata.title);
  const description = String(metadata.description || "").trim();
  const titleLength = visibleLength(title);
  const descriptionLength = visibleLength(description);
  const tags = asArray(metadata.tags).map(cleanText).filter(Boolean);
  const hashtags = asArray(metadata.hashtags).map(cleanText).filter(Boolean);
  const tagsText = tags.join(" ");
  const searchText = `${title}\n${description}\n${tagsText}`;
  const searchTextLower = lower(searchText);
  const expectedCourseUrl = getExpectedCourseUrl(metadata);
  const courseUrl = String(metadata.courseUrl || "").trim();
  const courseUrlInDescriptionCount = countOccurrences(description, courseUrl || expectedCourseUrl);
  const playlistKey = metadata.playlist_key || metadata.playlistKey || metadata.playlist?.key || "";
  const computedPlaylistKey = metadata.setId && metadata.supportLang && metadata.targetLang
    ? buildPlaylistAssignment(metadata).key
    : "";

  if (!metadata.setId) blockers.push("missing setId");
  if (!metadata.supportLang) blockers.push("missing supportLang");
  if (!metadata.targetLang) blockers.push("missing targetLang");
  if (!title) blockers.push("missing title");
  if (!description) blockers.push("missing description");
  if (titleLength < 25) blockers.push(`title too short for search intent: ${titleLength}`);
  if (titleLength > 100) blockers.push(`title too long for YouTube upload: ${titleLength}`);
  if (descriptionLength < 250) blockers.push(`description too short for search/usefulness: ${descriptionLength}`);
  if (descriptionLength > 5000) blockers.push(`description too long for YouTube upload: ${descriptionLength}`);
  if (!courseUrl) blockers.push("missing courseUrl");
  if (courseUrl && expectedCourseUrl && courseUrl !== expectedCourseUrl) {
    blockers.push(`courseUrl mismatch: ${courseUrl} != ${expectedCourseUrl}`);
  }
  if ((courseUrl || expectedCourseUrl) && courseUrlInDescriptionCount === 0) {
    blockers.push("description missing exact courseUrl");
  }
  if (courseUrlInDescriptionCount > 1) warnings.push(`description contains courseUrl ${courseUrlInDescriptionCount} times; expected once`);
  if (playlistKey && computedPlaylistKey && playlistKey !== computedPlaylistKey) {
    blockers.push(`playlist_key mismatch: ${playlistKey} != ${computedPlaylistKey}`);
  }

  if (tags.length < 8) warnings.push(`few tags for query coverage: ${tags.length}`);
  if (tags.length > 20) blockers.push(`too many tags: ${tags.length}`);
  if (tags.some((tag) => tag.includes("#"))) blockers.push("tags must not contain hashtags");
  if (tags.join(",").length > 500) blockers.push(`YouTube tags total too long: ${tags.join(",").length}`);
  if (hashtags.length < 3) warnings.push(`few hashtags: ${hashtags.length}`);
  if (hashtags.length > 5) warnings.push(`many hashtags in metadata: ${hashtags.length}; uploader uses the first 3`);
  if (hashtags.some((tag) => !tag.startsWith("#"))) blockers.push("hashtags must start with #");
  if (hashtags.some((tag) => /\s/u.test(tag))) blockers.push("hashtags must not contain spaces");

  const targetName = cleanText(metadata.targetLanguageName);
  if (targetName && !lower(title).includes(lower(targetName))) {
    warnings.push(`title does not include targetLanguageName exactly: ${targetName}`);
  }
  const deckTitle = cleanText(metadata.deckTitle);
  if (deckTitle && !lower(`${title}\n${description}`).includes(lower(deckTitle))) {
    warnings.push(`title/description does not include deckTitle exactly: ${deckTitle}`);
  }
  if (!containsAny(searchTextLower, LEARNING_INTENT_PATTERNS)) warnings.push("metadata missing clear learn/practice/beginner intent");
  if (!containsAny(searchTextLower, VOCABULARY_PATTERNS)) warnings.push("metadata missing clear vocabulary/words intent");
  if (!containsAny(searchTextLower, PRONUNCIATION_PATTERNS)) warnings.push("metadata missing pronunciation intent");
  if (!containsAny(description, PRACTICE_PATTERNS)) warnings.push("description missing repeat/pause/review/mini-test learning flow");
  if (descriptionLength < 650) warnings.push(`description below SEO target 650 chars: ${descriptionLength}`);
  if (titleLength < 45) warnings.push(`title below preferred search title range 45-90 chars: ${titleLength}`);
  if (titleLength > 90) warnings.push(`title above preferred search title range 45-90 chars: ${titleLength}`);
  if (!hasSiblingThumbnail(file)) warnings.push("no sibling thumbnail/cover/poster file found; YouTube thumbnail SEO still needs visual QA");
  if (!playlistKey) warnings.push("missing playlist_key; publish planner can compute it, but fresh metadata should carry it");
  if (String(metadata.source || "").startsWith("template") && !["EN", "RU", "ES", "ES-419", "PT", "PT-BR"].includes(String(metadata.supportLang || "").toUpperCase())) {
    warnings.push("template metadata for this support language needs AI/native polish before public publish");
  }
  if (containsAny(searchTextLower, CLICKBAIT_OR_UNSUPPORTED_PATTERNS)) {
    blockers.push("metadata contains unsupported guarantee/certificate/native-teacher/clickbait claim");
  }

  const score = Math.max(0, 100 - blockers.length * 20 - warnings.length * 4);
  return {
    file,
    status: blockers.length ? "fail" : "pass",
    blockers,
    warnings,
    metrics: {
      score,
      titleLength,
      descriptionLength,
      tagCount: tags.length,
      hashtagCount: hashtags.length,
      courseUrl,
      expectedCourseUrl,
      courseUrlInDescriptionCount,
      playlistKey,
      computedPlaylistKey,
      siblingThumbnailPresent: hasSiblingThumbnail(file),
    },
  };
}

try {
  if (inputs.length === 0) {
    console.error(usage());
    process.exit(1);
  }
  const files = collectFiles(inputs);
  if (files.length === 0) throw new Error("No youtube_metadata.json files found.");
  const results = files.map((file) => validate(JSON.parse(fs.readFileSync(file, "utf8")), file));
  const blockerCount = results.reduce((sum, result) => sum + result.blockers.length, 0);
  const warningCount = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const report = {
    status: blockerCount || (options.strictWarnings && warningCount) ? "fail" : "pass",
    fileCount: files.length,
    summary: {
      blockerCount,
      warningCount,
      strictWarnings: options.strictWarnings,
      averageScore: Math.round(results.reduce((sum, result) => sum + result.metrics.score, 0) / results.length),
    },
    results,
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, json, "utf8");
  }
  console.log(json);
  if (report.status === "fail") process.exit(1);
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
