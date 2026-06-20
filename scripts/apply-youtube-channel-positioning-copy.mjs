#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const POSITIONING_COPY_PATH = "config/youtube-channel-positioning-copy.json";
const ASSIGNMENT_REPORT_PATH = "outputs/youtube-channel-assets/youtube-channel-language-assignment-20260620.json";

function fail(message) {
  throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function renderDescription(copyConfig, code, siteCoursesUrl) {
  const key = normalizeKey(code);
  const item = copyConfig.copy?.[key];
  if (!item) fail(`Missing positioning copy for channel key: ${key}`);
  if (!item.shortDescription || !item.description) fail(`Incomplete positioning copy for channel key: ${key}`);

  const placeholder = copyConfig.descriptionSitePlaceholder || "{{siteCoursesUrl}}";
  const desiredDescription = item.description.replaceAll(placeholder, siteCoursesUrl).trim();
  if (desiredDescription.includes(placeholder)) fail(`Unreplaced site placeholder in ${key} description.`);
  if (!desiredDescription.includes(siteCoursesUrl)) fail(`Description for ${key} does not include site URL ${siteCoursesUrl}.`);
  if (/oauth|refresh_token|access_token|client_secret|\.local\/|\.secrets\//i.test(`${item.shortDescription} ${desiredDescription}`)) {
    fail(`Description copy for ${key} contains a secret-like string.`);
  }

  return {
    shortDescription: item.shortDescription.trim(),
    desiredDescription,
  };
}

function validateCopyCoverage(copyConfig, channels) {
  if (copyConfig.schemaVersion !== 1) fail("Unsupported positioning copy schemaVersion.");
  const channelKeys = channels.map((channel) => normalizeKey(channel.key));
  const uniqueChannelKeys = new Set(channelKeys);
  if (channelKeys.length !== uniqueChannelKeys.size) fail("Duplicate channel keys in youtube-channels.json.");
  if (channelKeys.length !== 51) fail(`Expected 51 public support channels, got ${channelKeys.length}.`);

  const missing = channelKeys.filter((key) => !copyConfig.copy?.[key]);
  if (missing.length) fail(`Missing positioning copy for: ${missing.join(", ")}`);
}

async function main() {
  const [channelConfig, copyConfig] = await Promise.all([
    readJson(CHANNEL_CONFIG_PATH),
    readJson(POSITIONING_COPY_PATH),
  ]);

  const channels = channelConfig.channels || [];
  validateCopyCoverage(copyConfig, channels);

  let updatedChannels = 0;
  for (const channel of channels) {
    const key = normalizeKey(channel.key);
    const siteCoursesUrl = channel.siteCoursesUrl || `https://flashcardsluna.com/${key}/courses`;
    const copy = renderDescription(copyConfig, key, siteCoursesUrl);
    channel.shortDescription = copy.shortDescription;
    channel.desiredDescription = copy.desiredDescription;
    updatedChannels += 1;
  }

  let updatedAssignments = 0;
  let assignmentReport = null;
  try {
    assignmentReport = await readJson(ASSIGNMENT_REPORT_PATH);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (assignmentReport?.assignment) {
    for (const item of assignmentReport.assignment) {
      const key = normalizeKey(item.code);
      const siteCoursesUrl = item.siteCoursesUrl || `https://flashcardsluna.com/${key}/courses`;
      const copy = renderDescription(copyConfig, key, siteCoursesUrl);
      item.shortDescription = copy.shortDescription;
      item.desiredDescription = copy.desiredDescription;
      updatedAssignments += 1;
    }
    assignmentReport.positioningCopySource = POSITIONING_COPY_PATH;
  }

  await writeJson(CHANNEL_CONFIG_PATH, channelConfig);
  if (assignmentReport) await writeJson(ASSIGNMENT_REPORT_PATH, assignmentReport);

  console.log(`updatedChannels=${updatedChannels}`);
  console.log(`updatedAssignmentRows=${updatedAssignments}`);
  console.log(`copySource=${POSITIONING_COPY_PATH}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
