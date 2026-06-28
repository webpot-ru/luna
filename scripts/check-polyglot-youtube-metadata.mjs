#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { isSpecificStudyCourseUrl } from "./lib/video-public-url.mjs";
import {
  buildPolyglotPlaylistAssignment,
  localizedLanguageList,
} from "./lib/polyglot-youtube-playlists.mjs";
import { normalizeLanguageCode } from "./lib/youtube-playlists.mjs";

const options = {
  inputs: [],
  output: "",
  strictWarnings: false,
  requireAiMetadata: false,
  expectedSupport: "",
  expectedBundle: "",
  expectedTargets: "",
};

for (let index = 0; index < process.argv.slice(2).length; index += 1) {
  const args = process.argv.slice(2);
  const arg = args[index];
  const readValue = () => {
    if (arg.includes("=")) return arg.split("=").slice(1).join("=");
    index += 1;
    return args[index];
  };
  if (arg === "--strict-warnings") options.strictWarnings = true;
  else if (arg === "--require-ai-metadata") options.requireAiMetadata = true;
  else if (arg === "--expected-support" || arg.startsWith("--expected-support=")) options.expectedSupport = readValue();
  else if (arg === "--expected-bundle" || arg.startsWith("--expected-bundle=")) options.expectedBundle = readValue();
  else if (arg === "--expected-targets" || arg.startsWith("--expected-targets=")) options.expectedTargets = readValue();
  else if (arg === "--metadata" || arg.startsWith("--metadata=")) options.inputs.push(readValue());
  else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
  else if (arg === "--help" || arg === "-h") options.help = true;
  else options.inputs.push(arg);
}

function usage() {
  return [
    "Usage:",
    "  node scripts/check-polyglot-youtube-metadata.mjs <metadata-file-or-dir> [...]",
    "",
    "Options:",
    "  --require-ai-metadata",
    "  --expected-support=RU",
    "  --expected-bundle=global_europe_core",
    "  --expected-targets=EN,ES,FR,DE",
  ].join("\n");
}

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectFiles([full]));
        else if (entry.isFile() && entry.name === "youtube_metadata.json") files.push(full);
      }
    } else if (path.basename(resolved) === "youtube_metadata.json") {
      files.push(resolved);
    } else {
      throw new Error(`Expected youtube_metadata.json or a directory: ${input}`);
    }
  }
  return [...new Set(files)].sort();
}

function visibleLength(value) {
  return Array.from(String(value || "")).length;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function normalizedList(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return values.map(normalizeLanguageCode).filter(Boolean);
}

function courseUrlTargets(url) {
  try {
    const parsed = new URL(String(url || ""));
    return normalizedList(parsed.searchParams.get("langs") || "");
  } catch {
    return [];
  }
}

function polishedMetadataIssue(metadata) {
  const source = String(metadata.source || "").trim();
  if (!source) return "metadata source missing; live publish requires AI-polished or human-curated metadata";
  if (source.toLowerCase().startsWith("template")) {
    return `metadata source ${source} is plan-only; live publish requires AI-polished or human-curated metadata`;
  }
  return "";
}

function validate(metadata, file) {
  const blockers = [];
  const warnings = [];
  const targetLangs = normalizedList(metadata.targetLangs || metadata.targetLangsCsv);
  const supportLang = normalizeLanguageCode(metadata.supportLang);
  const title = cleanText(metadata.title);
  const description = String(metadata.description || "").trim();
  const titleLength = visibleLength(title);
  const descriptionLength = visibleLength(description);
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map(cleanText).filter(Boolean) : [];
  const hashtags = Array.isArray(metadata.hashtags) ? metadata.hashtags.map(cleanText).filter(Boolean) : [];
  const courseUrl = String(metadata.courseUrl || metadata.studyUrl || "").trim();
  const urlTargets = courseUrlTargets(courseUrl);
  const expectedTargets = normalizedList(options.expectedTargets);
  const assignment = buildPolyglotPlaylistAssignment(metadata);
  const playlistKey = metadata.playlist_key || metadata.playlistKey || metadata.playlist?.key || "";

  if (metadata.videoType !== "polyglot") blockers.push("videoType must be polyglot");
  if (!metadata.polyglotKey || !String(metadata.polyglotKey).startsWith("polyglot:")) blockers.push("missing valid polyglotKey");
  if (!metadata.setId) blockers.push("missing setId");
  if (!supportLang) blockers.push("missing supportLang");
  if (!metadata.bundleKey) blockers.push("missing bundleKey");
  if (options.expectedSupport && supportLang !== normalizeLanguageCode(options.expectedSupport)) {
    blockers.push(`support mismatch: expected ${normalizeLanguageCode(options.expectedSupport)} got ${supportLang}`);
  }
  if (options.expectedBundle && metadata.bundleKey !== options.expectedBundle) {
    blockers.push(`bundle mismatch: expected ${options.expectedBundle} got ${metadata.bundleKey}`);
  }
  if (targetLangs.length < 3 || targetLangs.length > 4) blockers.push(`targetLangs count must be 3..4, got ${targetLangs.length}`);
  if (targetLangs.includes(supportLang)) blockers.push(`targetLangs must not include supportLang=${supportLang}`);
  if (expectedTargets.length && targetLangs.join(",") !== expectedTargets.join(",")) {
    blockers.push(`targetLangs mismatch: expected ${expectedTargets.join(",")} got ${targetLangs.join(",")}`);
  }
  if (!title) blockers.push("missing title");
  if (titleLength > 100) blockers.push(`title too long: ${titleLength}`);
  if (titleLength < 25) warnings.push(`title below preferred range: ${titleLength}`);
  if (!/polyglot|pol[ií]glot|полиглот|polyglott|polyglotte|poliglot/iu.test(title)) {
    warnings.push("title should visibly mark Polyglot mode");
  }
  if (!description) blockers.push("missing description");
  if (descriptionLength < 250) blockers.push(`description too short: ${descriptionLength}`);
  if (descriptionLength > 5000) blockers.push(`description too long: ${descriptionLength}`);
  if (!courseUrl) blockers.push("missing courseUrl/studyUrl");
  if (courseUrl && !isSpecificStudyCourseUrl(courseUrl)) blockers.push(`courseUrl is not a specific study URL: ${courseUrl}`);
  if (courseUrl && urlTargets.join(",") !== targetLangs.join(",")) {
    blockers.push(`courseUrl langs mismatch: expected ${targetLangs.join(",")} got ${urlTargets.join(",")}`);
  }
  if (courseUrl && !description.includes(courseUrl)) blockers.push("description missing exact courseUrl");
  if (/free|paid|pricing|subscription|tariff|бесплат|платн|тариф|precio|gratis|pago/iu.test(description)) {
    blockers.push("description contains pricing/free/paid wording");
  }
  if (!/180/u.test(description)) warnings.push("description should mention 180+ themed decks");
  const languageList = localizedLanguageList(targetLangs, supportLang);
  if (languageList && !description.toLocaleLowerCase().includes(languageList.split(",")[0].trim().toLocaleLowerCase())) {
    warnings.push("description may not clearly mention the target-language bundle");
  }
  if (tags.length < 8) warnings.push(`few tags: ${tags.length}`);
  if (tags.length > 20) blockers.push(`too many tags: ${tags.length}`);
  if (tags.some((tag) => tag.includes("#"))) blockers.push("tags must not contain hashtags");
  if (tags.join(",").length > 500) blockers.push(`tags total too long: ${tags.join(",").length}`);
  if (hashtags.length < 3) warnings.push(`few hashtags: ${hashtags.length}`);
  if (hashtags.length > 5) blockers.push(`too many hashtags: ${hashtags.length}`);
  if (hashtags.some((tag) => !tag.startsWith("#") || /\s/u.test(tag))) {
    blockers.push("hashtags must start with # and contain no spaces");
  }
  if (!playlistKey) blockers.push("missing playlist_key");
  else if (playlistKey !== assignment.key) blockers.push(`playlist_key mismatch: ${playlistKey} != ${assignment.key}`);
  if (!metadata.playlistTitle && !metadata.playlist?.title) warnings.push("missing Polyglot playlist title in metadata");
  if (!metadata.playlistDescription && !metadata.playlist?.description) warnings.push("missing Polyglot playlist description in metadata");
  const metadataIssue = polishedMetadataIssue(metadata);
  if (metadataIssue) {
    if (options.requireAiMetadata) blockers.push(metadataIssue);
    else warnings.push(`${metadataIssue}; allowed in plan only`);
  }

  return {
    file,
    status: blockers.length ? "fail" : "pass",
    blockers,
    warnings,
    metrics: {
      titleLength,
      descriptionLength,
      tagCount: tags.length,
      hashtagCount: hashtags.length,
      supportLang,
      targetLangs,
      urlTargets,
      courseUrl,
      playlistKey,
    },
  };
}

try {
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  const files = collectFiles(options.inputs);
  if (!files.length) throw new Error("No youtube_metadata.json files found.");
  const results = files.map((file) => validate(JSON.parse(fs.readFileSync(file, "utf8")), file));
  const blockerCount = results.reduce((sum, result) => sum + result.blockers.length, 0);
  const warningCount = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const report = {
    status: blockerCount || (options.strictWarnings && warningCount) ? "fail" : "pass",
    fileCount: files.length,
    summary: {
      blockerCount,
      warningCount,
      requireAiMetadata: options.requireAiMetadata,
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
