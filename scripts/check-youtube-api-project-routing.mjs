#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const routingPath = path.join(rootDir, 'config/youtube-api-project-routing.json');
const channelsPath = path.join(rootDir, 'config/youtube-channels.json');
const languageOrderPath = path.join(rootDir, 'config/language-order.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  console.error(`[youtube-api-project-routing] ${message}`);
  process.exitCode = 1;
}

function duplicates(items) {
  const seen = new Set();
  const dupes = new Set();
  for (const item of items) {
    if (seen.has(item)) dupes.add(item);
    seen.add(item);
  }
  return [...dupes].sort();
}

function sortedUnique(items) {
  return [...new Set(items)].sort();
}

const routing = readJson(routingPath);
const channelsConfig = readJson(channelsPath);
const languageOrder = readJson(languageOrderPath);

const channels = channelsConfig.channels || [];
const channelKeys = new Set(channels.map((channel) => channel.key));
const supportLangsByChannel = new Map(channels.map((channel) => [channel.key, channel.supportLangs || []]));
const expectedVariantList = Array.isArray(languageOrder)
  ? languageOrder.map((entry) => entry.spreadsheetCode || entry.code).filter(Boolean)
  : languageOrder.spreadsheetCodeOrder || languageOrder.languages?.map((entry) => entry.spreadsheetCode || entry.code).filter(Boolean) || [];
const expectedVariants = new Set(expectedVariantList);
const releasesPerVariant = routing.dailyCadence?.publicReleasesPerSupportVariantPerDay;

if (!Array.isArray(routing.projects) || routing.projects.length !== 4) {
  fail(`expected 4 projects, found ${routing.projects?.length ?? 'none'}`);
}

const assignedChannels = routing.projects.flatMap((project) => project.supportChannelKeys || []);
const assignedVariants = routing.projects.flatMap((project) => project.supportVariants || []);

for (const key of assignedChannels) {
  if (!channelKeys.has(key)) fail(`unknown supportChannelKey: ${key}`);
}

for (const variant of assignedVariants) {
  if (!expectedVariants.has(variant)) fail(`unknown support variant: ${variant}`);
}

const missingChannels = [...channelKeys].filter((key) => !assignedChannels.includes(key)).sort();
const extraChannels = assignedChannels.filter((key) => !channelKeys.has(key)).sort();
const duplicateChannels = duplicates(assignedChannels);
const missingVariants = [...expectedVariants].filter((variant) => !assignedVariants.includes(variant)).sort();
const duplicateVariants = duplicates(assignedVariants);

if (missingChannels.length) fail(`missing support channels: ${missingChannels.join(', ')}`);
if (extraChannels.length) fail(`extra support channels: ${extraChannels.join(', ')}`);
if (duplicateChannels.length) fail(`duplicate support channels: ${duplicateChannels.join(', ')}`);
if (missingVariants.length) fail(`missing support variants: ${missingVariants.join(', ')}`);
if (duplicateVariants.length) fail(`duplicate support variants: ${duplicateVariants.join(', ')}`);

let totalReleases = 0;
for (const project of routing.projects) {
  const channelCount = project.supportChannelKeys?.length || 0;
  const variantCount = project.supportVariants?.length || 0;
  const channelVariants = sortedUnique((project.supportChannelKeys || []).flatMap((key) => supportLangsByChannel.get(key) || []));
  const projectVariants = sortedUnique(project.supportVariants || []);
  const expectedDaily = variantCount * releasesPerVariant;
  totalReleases += project.plannedPublicReleasesPerDay || 0;

  if (channelCount > 13) {
    fail(`${project.label} has ${channelCount} public channels; expected <= 13`);
  }

  if (project.plannedPublicReleasesPerDay !== expectedDaily) {
    fail(
      `${project.label} plannedPublicReleasesPerDay=${project.plannedPublicReleasesPerDay}; expected ${expectedDaily}`
    );
  }

  if (channelVariants.join('|') !== projectVariants.join('|')) {
    fail(
      `${project.label} supportVariants do not match supportLangs from config/youtube-channels.json: expected ${channelVariants.join(', ')}, got ${projectVariants.join(', ')}`
    );
  }
}

if (assignedChannels.length !== routing.dailyCadence?.publicChannels) {
  fail(`assigned channel count ${assignedChannels.length} does not match dailyCadence.publicChannels`);
}

if (assignedVariants.length !== routing.dailyCadence?.supportLanguageVariants) {
  fail(`assigned variant count ${assignedVariants.length} does not match dailyCadence.supportLanguageVariants`);
}

if (totalReleases !== routing.dailyCadence?.plannedPublicReleasesPerDay) {
  fail(`planned releases total ${totalReleases} does not match dailyCadence.plannedPublicReleasesPerDay`);
}

if (!process.exitCode) {
  console.log(
    `YouTube API project routing OK: ${assignedChannels.length} channels, ${assignedVariants.length} variants, ${totalReleases} planned daily releases across ${routing.projects.length} projects.`
  );
  for (const project of routing.projects) {
    console.log(
      `- ${project.label}: ${project.supportChannelKeys.length} channels, ${project.supportVariants.length} variants, ${project.plannedPublicReleasesPerDay}/day`
    );
  }
}
