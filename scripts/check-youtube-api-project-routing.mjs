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
const expectedProjectCount = routing.projectLabels?.length;
const aggregateUploadLimit = routing.quotaPolicy?.aggregateVideoUploadCallLimitPerQuotaDay;

if (!Array.isArray(routing.projects) || !routing.projects.length) {
  fail('projects must be a non-empty array');
} else if (!Number.isInteger(expectedProjectCount) || routing.projects.length !== expectedProjectCount) {
  fail(`expected ${expectedProjectCount || 'a declared number of'} projects, found ${routing.projects.length}`);
}

const assignedChannels = routing.projects.flatMap((project) => project.supportChannelKeys || []);
const assignedVariants = routing.projects.flatMap((project) => project.supportVariants || []);
const projectKeys = routing.projects.map((project) => project.key);
const projectLabels = routing.projects.map((project) => project.label);
const githubEnvironments = routing.projects.map((project) => project.githubEnvironment);

for (const duplicate of duplicates(projectKeys)) fail(`duplicate project key: ${duplicate}`);
for (const duplicate of duplicates(projectLabels)) fail(`duplicate project label: ${duplicate}`);
for (const duplicate of duplicates(githubEnvironments)) fail(`duplicate GitHub environment: ${duplicate}`);
if (routing.projectLabels?.join('|') !== projectLabels.join('|')) {
  fail(`projectLabels do not match projects order: expected ${projectLabels.join(', ')}`);
}

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
  const plannedAuthorizationChannelKeys = project.plannedAuthorizationChannelKeys || [];
  const channelVariants = sortedUnique((project.supportChannelKeys || []).flatMap((key) => supportLangsByChannel.get(key) || []));
  const projectVariants = sortedUnique(project.supportVariants || []);
  const expectedDaily = variantCount * releasesPerVariant;
  totalReleases += project.plannedPublicReleasesPerDay || 0;

  if (!project.key || !project.label || !project.githubEnvironment) {
    fail(`${project.key || project.label || 'project'} is missing key, label or githubEnvironment`);
  }
  if (typeof project.publicationReady !== 'boolean') {
    fail(`${project.label} publicationReady must be boolean`);
  }
  if (project.publicationReady === false && !String(project.publicationBlockedReason || '').trim()) {
    fail(`${project.label} publicationBlockedReason is required while publicationReady=false`);
  }
  if (!channelCount) {
    fail(`${project.label} has no active support channels`);
  }
  if (project.plannedPublicReleasesPerDay > 100) {
    fail(`${project.label} has ${project.plannedPublicReleasesPerDay} planned releases; expected <= 100`);
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

  const invalidAuthorizationChannels = plannedAuthorizationChannelKeys
    .filter((key) => !channelKeys.has(key));
  const duplicateAuthorizationChannels = duplicates(plannedAuthorizationChannelKeys);
  const missingActiveAuthorization = (project.supportChannelKeys || [])
    .filter((key) => !plannedAuthorizationChannelKeys.includes(key));
  if (invalidAuthorizationChannels.length) {
    fail(`${project.label} has unknown plannedAuthorizationChannelKeys: ${invalidAuthorizationChannels.join(', ')}`);
  }
  if (duplicateAuthorizationChannels.length) {
    fail(`${project.label} has duplicate plannedAuthorizationChannelKeys: ${duplicateAuthorizationChannels.join(', ')}`);
  }
  if (missingActiveAuthorization.length) {
    fail(`${project.label} active channels missing from planned authorization: ${missingActiveAuthorization.join(', ')}`);
  }

  const pair = routing.projects.find((candidate) => candidate.key === project.pairedRouteKey);
  if (!pair) {
    fail(`${project.label} references missing pairedRouteKey=${project.pairedRouteKey || 'none'}`);
  } else {
    if (pair.pairedRouteKey !== project.key) {
      fail(`${project.label} / ${pair.label} pairing is not reciprocal`);
    }
    const expectedPairAuthorization = sortedUnique([
      ...(project.supportChannelKeys || []),
      ...(pair.supportChannelKeys || []),
    ]);
    if (sortedUnique(plannedAuthorizationChannelKeys).join('|') !== expectedPairAuthorization.join('|')) {
      fail(
        `${project.label} planned authorization must equal the active channel union of ${project.key}/${pair.key}: expected ${expectedPairAuthorization.join(', ')}`
      );
    }
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

if (!Number.isInteger(aggregateUploadLimit) || aggregateUploadLimit < 1) {
  fail('quotaPolicy.aggregateVideoUploadCallLimitPerQuotaDay must be a positive integer');
} else if (totalReleases > aggregateUploadLimit) {
  fail(`planned releases total ${totalReleases} exceeds aggregate upload limit ${aggregateUploadLimit}`);
}
if (routing.quotaPolicy?.allowAutomaticRouteFallback !== false) {
  fail('quotaPolicy.allowAutomaticRouteFallback must be false');
}
if (routing.quotaPolicy?.allowStandbyRouteQuotaUse !== false) {
  fail('quotaPolicy.allowStandbyRouteQuotaUse must be false');
}

if (!process.exitCode) {
  console.log(
    `YouTube API project routing OK: ${assignedChannels.length} channels, ${assignedVariants.length} variants, ${totalReleases}/${aggregateUploadLimit} planned daily releases across ${routing.projects.length} configured routes.`
  );
  for (const project of routing.projects) {
    console.log(
      `- ${project.label}: ${project.supportChannelKeys.length} channels, ${project.supportVariants.length} variants, ${project.plannedPublicReleasesPerDay}/day, publication=${project.publicationReady ? 'ready' : 'blocked'}`
    );
  }
}
