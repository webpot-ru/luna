import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { languageOrderRecords } from "./language-order.mjs";

const policyPath = path.resolve("config/transcription-source-policy.json");
const manifestPath = path.resolve("reference-sources/sources.manifest.json");

let policyCache;
let manifestCache;
let manifestSha256Cache;

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function loadTranscriptionSourcePolicy() {
  if (!policyCache) policyCache = await readJson(policyPath);
  return policyCache;
}

export async function loadReferenceSourcesManifest() {
  if (!manifestCache) manifestCache = await readJson(manifestPath);
  return manifestCache;
}

export async function referenceSourcesManifestSha256() {
  if (!manifestSha256Cache) {
    const buffer = await readFile(manifestPath);
    manifestSha256Cache = createHash("sha256").update(buffer).digest("hex");
  }
  return manifestSha256Cache;
}

function buildMethodByLanguage(policy) {
  const methodByLanguage = new Map();
  for (const [method, codes] of Object.entries(policy.methods ?? {})) {
    for (const code of codes) methodByLanguage.set(code, method);
  }
  return methodByLanguage;
}

export async function transcriptionSourcePolicyForLanguage(languageCode) {
  const policy = await loadTranscriptionSourcePolicy();
  const methodByLanguage = buildMethodByLanguage(policy);
  const method = methodByLanguage.get(languageCode);
  const languageRecord = languageOrderRecords.find((record) => record.dbCode === languageCode);
  if (!languageRecord) throw new Error(`No active language-order record for ${languageCode}`);
  if (!method) throw new Error(`No transcription source method configured for ${languageCode}`);

  return {
    policyVersion: policy.policy_version,
    languageCode,
    method,
    sourceIds: policy.source_ids?.[languageCode] ?? [],
    manualReviewRequired: new Set(policy.manual_review_required ?? []).has(languageCode),
    finalReadyConfidences: new Set(policy.final_ready_confidences ?? []),
    blockingConfidences: new Set(policy.blocking_confidences ?? []),
    sourcePriority: policy.source_priority ?? [],
    languageRecord,
  };
}

export async function validateTranscriptionSourcePolicyCompleteness() {
  const policy = await loadTranscriptionSourcePolicy();
  const methodByLanguage = buildMethodByLanguage(policy);
  const activeCodes = languageOrderRecords.map((record) => record.dbCode);
  const sourceIdsByLanguage = policy.source_ids ?? {};
  const blockers = [];

  for (const code of activeCodes) {
    if (!methodByLanguage.has(code)) blockers.push(`${code}: missing method`);
    if (!Array.isArray(sourceIdsByLanguage[code]) || sourceIdsByLanguage[code].length === 0) {
      blockers.push(`${code}: missing source_ids`);
    }
  }

  for (const code of methodByLanguage.keys()) {
    if (!activeCodes.includes(code)) blockers.push(`${code}: method configured for inactive/unknown language`);
  }

  for (const code of Object.keys(sourceIdsByLanguage)) {
    if (!activeCodes.includes(code)) blockers.push(`${code}: source_ids configured for inactive/unknown language`);
  }

  const manifest = await loadReferenceSourcesManifest();
  const manifestIds = new Set((manifest.sources ?? []).map((source) => source.id));
  for (const [code, sourceIds] of Object.entries(sourceIdsByLanguage)) {
    for (const sourceId of sourceIds) {
      if (!manifestIds.has(sourceId)) blockers.push(`${code}: unknown source_id ${sourceId}`);
    }
  }

  return {
    blockers,
    activeLanguageCount: activeCodes.length,
    configuredLanguageCount: Object.keys(sourceIdsByLanguage).length,
    manifestSourceCount: manifest.sources?.length ?? 0,
  };
}
