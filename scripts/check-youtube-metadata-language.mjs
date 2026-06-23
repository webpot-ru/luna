#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const options = {
  output: "",
  registry: "",
  failOnWarnings: false,
};
const inputs = [];

for (const arg of process.argv.slice(2)) {
  if (arg === "--fail-on-warnings") options.failOnWarnings = true;
  else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
  else if (arg.startsWith("--registry=")) options.registry = arg.slice("--registry=".length);
  else inputs.push(arg);
}

function usage() {
  return [
    "Usage:",
    "  node scripts/check-youtube-metadata-language.mjs <metadata-file-or-dir> [...] [--output=report.json]",
    "  node scripts/check-youtube-metadata-language.mjs --registry=config/youtube-published-videos.json [--output=report.json]",
    "",
    "Blocks obvious English-template metadata on non-English support-language channels.",
    "The registry mode is title-only triage because descriptions are not stored in the durable publish registry.",
  ].join("\n");
}

function collectMetadataFiles(paths) {
  const files = [];
  for (const input of paths) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectMetadataFiles([full]));
        else if (entry.isFile() && entry.name === "youtube_metadata.json") files.push(full);
      }
    } else if (stat.isFile()) {
      if (path.basename(resolved) !== "youtube_metadata.json") {
        throw new Error(`Expected youtube_metadata.json or a directory: ${input}`);
      }
      files.push(resolved);
    }
  }
  return files.sort();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/gu, "-").toUpperCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isEnglishSupport(code) {
  return ["EN", "EN-GB"].includes(normalizeCode(code));
}

const ENGLISH_TEMPLATE_PATTERNS = [
  { id: "a1-vocabulary-title", pattern: /\b[A-Z][A-Za-z -]+ A1 (?:[A-Za-z -]+\s+)?Vocabulary\b/u },
  { id: "english-vocabulary-with-pronunciation", pattern: /\b[A-Z][A-Za-z -]+ (?:A1\s+)?[A-Za-z -]*Vocabulary\s+with\s+Pronunciation\b/u },
  { id: "generic-a1-vocabulary", pattern: /\bA1\s+[A-Za-z -]*Vocabulary\b/u },
  { id: "words-with-pronunciation", pattern: /\b\d{1,3}\s+(?:[A-Z][A-Za-z -]+\s+)?(?:Kitchenware\s+)?Words?\s+with\s+Pronunciation\b/iu },
  { id: "kitchen-words-title", pattern: /\bKitchen(?:ware)? Words?\s+with\s+Pronunciation\b/iu },
  { id: "learn-essential-words", pattern: /\bLearn\s+\d{1,3}\s+essential\s+[A-Z][A-Za-z -]+\s+vocabulary\s+words\b/iu },
  { id: "short-video-lesson", pattern: /\bThis\s+short\s+video\s+lesson\s+helps\s+you\b/iu },
  { id: "listen-repeat-test", pattern: /\bListen\s+to\s+each\s+[A-Z][A-Za-z -]+\s+word,\s+repeat\s+during\s+the\s+pauses\b/iu },
  { id: "test-memory-ending", pattern: /\btest\s+your\s+memory\s+with\s+a\s+quick\s+mini-test\b/iu },
  { id: "daily-practice", pattern: /\bFor\s+daily\s+practice,\s+you\s+can\s+review\s+these\s+words\b/iu },
  { id: "subscribe-english-template", pattern: /\bSubscribe\s+to\s+FlashcardsLuna\s+for\s+more\s+short\s+vocabulary\s+lessons\b/iu },
  { id: "beginner-learn-english-template", pattern: /\b(?:learn|study|practice)\s+[A-Z][A-Za-z -]+\s+(?:for\s+beginners|vocabulary|pronunciation)\b/iu },
];

const ENGLISH_TAG_PATTERNS = [
  /\blearn\s+[a-z]/iu,
  /\b[a-z]+\s+vocabulary\b/iu,
  /\b[a-z]+\s+pronunciation\b/iu,
  /\b[a-z]+\s+for beginners\b/iu,
  /\bkitchen(?:ware)?\s+words\b/iu,
  /\bbasic\s+[a-z]+\s+words\b/iu,
  /\bword list\b/iu,
];

function findEnglishTemplateMatches(value) {
  const text = cleanText(value);
  const matches = [];
  for (const item of ENGLISH_TEMPLATE_PATTERNS) {
    if (item.pattern.test(text)) matches.push(item.id);
  }
  return matches;
}

function countEnglishTags(tags) {
  return tags.filter((tag) => ENGLISH_TAG_PATTERNS.some((pattern) => pattern.test(cleanText(tag)))).length;
}

function validateRecord(record) {
  const supportLang = normalizeCode(record.supportLang);
  const targetLang = normalizeCode(record.targetLang);
  const title = cleanText(record.title);
  const description = cleanText(record.description);
  const tags = asArray(record.tags).map(cleanText).filter(Boolean);
  const hashtags = asArray(record.hashtags).map(cleanText).filter(Boolean);
  const blockers = [];
  const warnings = [];
  const evidence = {};

  if (!supportLang) blockers.push("missing supportLang");
  if (!targetLang) blockers.push("missing targetLang");
  if (!title) blockers.push("missing title");

  if (supportLang && !isEnglishSupport(supportLang)) {
    const titleMatches = findEnglishTemplateMatches(title);
    const descriptionMatches = findEnglishTemplateMatches(description);
    const englishTagCount = countEnglishTags(tags);
    const hashtagText = hashtags.join(" ");
    const hashtagMatches = findEnglishTemplateMatches(hashtagText);

    if (titleMatches.length) {
      blockers.push(`non-English support ${supportLang} has English-template title markers: ${titleMatches.join(",")}`);
      evidence.titleMatches = titleMatches;
    }
    if (descriptionMatches.length) {
      blockers.push(`non-English support ${supportLang} has English-template description markers: ${descriptionMatches.join(",")}`);
      evidence.descriptionMatches = descriptionMatches;
    }
    if (englishTagCount >= 4) {
      blockers.push(`non-English support ${supportLang} has ${englishTagCount} English-template tags`);
      evidence.englishTagCount = englishTagCount;
    } else if (englishTagCount > 0) {
      warnings.push(`non-English support ${supportLang} has ${englishTagCount} English-looking tags`);
      evidence.englishTagCount = englishTagCount;
    }
    if (hashtagMatches.length) {
      warnings.push(`non-English support ${supportLang} has English-looking hashtag text: ${hashtagMatches.join(",")}`);
      evidence.hashtagMatches = hashtagMatches;
    }
  }

  return {
    file: record.file,
    source: record.source,
    youtubeVideoId: record.youtubeVideoId,
    youtubeVideoUrl: record.youtubeVideoUrl,
    setId: record.setId,
    supportLang,
    targetLang,
    title,
    status: blockers.length ? "fail" : "pass",
    blockers,
    warnings,
    evidence,
  };
}

function loadRegistryRecords(registryPath) {
  const resolved = path.resolve(registryPath);
  if (!fs.existsSync(resolved)) throw new Error(`Registry not found: ${registryPath}`);
  const data = JSON.parse(fs.readFileSync(resolved, "utf8"));
  const rows = Array.isArray(data) ? data : (data.publications || data.videos || []);
  return rows
    .filter((row) => row && row.youtubeVideoId && !row.deletedAt && !row.supersededBy)
    .map((row) => ({
      source: "registry-title-only",
      youtubeVideoId: row.youtubeVideoId,
      youtubeVideoUrl: row.youtubeVideoUrl,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang,
      title: row.title,
      description: "",
      tags: [],
      hashtags: [],
    }));
}

function summarize(results) {
  const failed = results.filter((result) => result.blockers.length);
  const warned = results.filter((result) => result.warnings.length);
  const bySupport = {};
  for (const result of failed) {
    bySupport[result.supportLang] = (bySupport[result.supportLang] || 0) + 1;
  }
  return {
    checkedCount: results.length,
    failedCount: failed.length,
    warnedCount: warned.length,
    failedSupportCount: Object.keys(bySupport).length,
    failedBySupport: Object.fromEntries(Object.entries(bySupport).sort(([a], [b]) => a.localeCompare(b))),
  };
}

try {
  if (!inputs.length && !options.registry) {
    console.error(usage());
    process.exit(1);
  }

  const records = [];
  if (inputs.length) {
    for (const file of collectMetadataFiles(inputs)) {
      records.push({
        ...JSON.parse(fs.readFileSync(file, "utf8")),
        file,
        source: "metadata-file",
      });
    }
  }
  if (options.registry) {
    records.push(...loadRegistryRecords(options.registry));
  }

  const results = records.map(validateRecord);
  const warningCount = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const report = {
    status: results.some((result) => result.blockers.length) || (options.failOnWarnings && warningCount) ? "fail" : "pass",
    summary: summarize(results),
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
