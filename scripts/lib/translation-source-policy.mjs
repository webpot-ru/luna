import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { languageOrderRecords } from "./language-order.mjs";
import { loadReferenceSourcesManifest } from "./transcription-source-policy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policyPath = path.join(projectRoot, "config/translation-source-policy.json");

let policyCache;

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function loadTranslationSourcePolicy() {
  if (!policyCache) policyCache = await readJson(policyPath);
  return policyCache;
}

export async function validateTranslationSourcePolicyCompleteness() {
  const policy = await loadTranslationSourcePolicy();
  const activeCodes = languageOrderRecords.map((record) => record.dbCode);
  const languageSourceIds = policy.language_source_ids ?? {};
  const manifest = await loadReferenceSourcesManifest();
  const manifestIds = new Set((manifest.sources ?? []).map((source) => source.id));
  const manifestById = new Map((manifest.sources ?? []).map((source) => [source.id, source]));
  const blockers = [];

  for (const code of activeCodes) {
    const sourceIds = languageSourceIds[code];
    if (!Array.isArray(sourceIds)) blockers.push(`${code}: missing language_source_ids array`);
    else if (sourceIds.length === 0) blockers.push(`${code}: language_source_ids is empty`);
  }

  for (const code of Object.keys(languageSourceIds)) {
    if (!activeCodes.includes(code)) blockers.push(`${code}: source_ids configured for inactive/unknown language`);
  }

  const allSourceIds = [
    ...Object.values(languageSourceIds).flat(),
    ...(policy.global_supporting_source_ids ?? []),
    ...(policy.example_collocation_source_ids ?? []),
  ];
  for (const sourceId of [...new Set(allSourceIds)]) {
    if (!manifestIds.has(sourceId)) {
      blockers.push(`unknown source_id ${sourceId}`);
      continue;
    }
    const source = manifestById.get(sourceId);
    if (!source.license_note) blockers.push(`${sourceId}: missing license_note`);
    if (!Array.isArray(source.primary_lunacards_use) || source.primary_lunacards_use.length === 0) {
      blockers.push(`${sourceId}: missing primary_lunacards_use`);
    }
  }

  return {
    blockers,
    activeLanguageCount: activeCodes.length,
    configuredLanguageCount: Object.keys(languageSourceIds).length,
    manifestSourceCount: manifest.sources?.length ?? 0,
    policyVersion: policy.policy_version,
  };
}

export async function translationSourcePolicyForLanguage(languageCode) {
  const policy = await loadTranslationSourcePolicy();
  const languageRecord = languageOrderRecords.find((record) => record.dbCode === languageCode);
  if (!languageRecord) throw new Error(`No active language-order record for ${languageCode}`);
  return {
    policyVersion: policy.policy_version,
    languageCode,
    sourceIds: policy.language_source_ids?.[languageCode] ?? [],
    globalSupportingSourceIds: policy.global_supporting_source_ids ?? [],
    exampleCollocationSourceIds: policy.example_collocation_source_ids ?? [],
    statuses: policy.statuses ?? {},
    sourcePriority: policy.source_priority ?? [],
    v1Enforcement: policy.v1_enforcement ?? {},
    languageRecord,
  };
}
