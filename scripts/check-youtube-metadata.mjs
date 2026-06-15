#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const paths = process.argv.slice(2);

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Path not found: ${input}`);
    }
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
  return files;
}

function visibleLength(value) {
  return Array.from(String(value || "")).length;
}

function validate(metadata, file) {
  const blockers = [];
  const warnings = [];
  const titleLength = visibleLength(metadata.title);
  const descriptionLength = visibleLength(metadata.description);
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const hashtags = Array.isArray(metadata.hashtags) ? metadata.hashtags : [];
  const tagsTotal = tags.join(",").length;

  if (!metadata.setId) blockers.push("missing setId");
  if (!metadata.targetLang) blockers.push("missing targetLang");
  if (!metadata.supportLang) blockers.push("missing supportLang");
  if (titleLength < 8) blockers.push("title too short");
  if (titleLength > 100) blockers.push(`title too long: ${titleLength}`);
  if (descriptionLength < 180) blockers.push(`description too short: ${descriptionLength}`);
  if (descriptionLength > 5000) blockers.push(`description too long: ${descriptionLength}`);
  if (!String(metadata.description || "").includes("flashcardsluna.com")) blockers.push("description missing flashcardsluna.com link");
  if (tags.length < 5) blockers.push(`too few tags: ${tags.length}`);
  if (tags.length > 20) blockers.push(`too many tags: ${tags.length}`);
  if (tags.some((tag) => String(tag).includes("#"))) blockers.push("tags must not contain hashtags");
  if (tagsTotal > 500) blockers.push(`YouTube tags total too long: ${tagsTotal}`);
  if (hashtags.length > 5) blockers.push(`too many hashtags: ${hashtags.length}`);
  if (hashtags.some((tag) => !String(tag).startsWith("#"))) blockers.push("hashtags must start with #");
  if (String(metadata.categoryId) !== "27") warnings.push(`categoryId is ${metadata.categoryId}, expected 27 for Education`);
  if (!["private", "unlisted", "public"].includes(metadata.privacyStatus)) blockers.push(`invalid privacyStatus: ${metadata.privacyStatus}`);

  return {
    file,
    status: blockers.length ? "fail" : "pass",
    blockers,
    warnings,
    metrics: {
      titleLength,
      descriptionLength,
      tagCount: tags.length,
      tagsTotal,
      hashtagCount: hashtags.length
    }
  };
}

try {
  if (paths.length === 0) {
    console.error("Usage: node scripts/check-youtube-metadata.mjs <metadata-file-or-dir> [...]");
    process.exit(1);
  }
  const files = collectFiles(paths);
  if (files.length === 0) throw new Error("No youtube_metadata.json files found.");
  const results = files.map((file) => validate(JSON.parse(fs.readFileSync(file, "utf8")), file));
  const blockers = results.flatMap((result) => result.blockers.map((blocker) => `${result.file}: ${blocker}`));
  console.log(JSON.stringify({
    status: blockers.length ? "fail" : "pass",
    fileCount: files.length,
    results
  }, null, 2));
  if (blockers.length) process.exit(1);
} catch (err) {
  console.error(err.stack || err.message);
  process.exit(1);
}
