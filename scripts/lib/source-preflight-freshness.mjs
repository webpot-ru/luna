import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { languageBatchSourcePreflightRuleVersion } from "./language-batch-source-preflight.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractVersion = "source-preflight-freshness-v1";

const trackedInputs = {
  source_manifest: "reference-sources/sources.manifest.json",
  transcription_policy: "config/transcription-source-policy.json",
  translation_policy: "config/translation-source-policy.json",
};

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath) {
  if (!(await pathExists(filePath))) return null;
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function resolveProjectPath(filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

function relativePath(filePath) {
  if (!filePath) return null;
  return path.relative(projectRoot, resolveProjectPath(filePath));
}

export async function buildSourcePreflightFreshnessContract(options = {}) {
  const decisionsPath = options.decisionsPath ?? "reference-sources/manual-decisions/source-preflight-warning-decisions.jsonl";
  const resolvedDecisionsPath = resolveProjectPath(decisionsPath);
  const specPath = options.spec?.filePath ?? options.specPath ?? null;
  const resolvedSpecPath = resolveProjectPath(specPath);
  const contract = {
    contract_version: contractVersion,
    rule_version: options.ruleVersion ?? languageBatchSourcePreflightRuleVersion,
    set_id: options.setId ?? "",
    input_path: relativePath(options.inputPath),
    input_sha256: options.inputSha256 ?? (options.inputPath ? await sha256File(resolveProjectPath(options.inputPath)) : null),
    spec_path: relativePath(resolvedSpecPath),
    spec_sha256: resolvedSpecPath ? await sha256File(resolvedSpecPath) : null,
    warning_decisions_path: relativePath(decisionsPath),
    warning_decisions_present: await pathExists(resolvedDecisionsPath),
    warning_decisions_sha256: await sha256File(resolvedDecisionsPath),
  };

  for (const [key, relative] of Object.entries(trackedInputs)) {
    contract[`${key}_path`] = relative;
    contract[`${key}_sha256`] = await sha256File(path.join(projectRoot, relative));
  }

  return contract;
}

export function validateSourcePreflightFreshnessContract(report, currentContract, options = {}) {
  const issues = [];
  const reportContract = report?.freshness_contract;
  if (!reportContract || typeof reportContract !== "object") {
    return {
      ok: false,
      issues: ["missing_freshness_contract"],
    };
  }

  const fields = [
    "contract_version",
    "rule_version",
    "set_id",
    "input_sha256",
    "spec_path",
    "spec_sha256",
    "source_manifest_sha256",
    "transcription_policy_sha256",
    "translation_policy_sha256",
    "warning_decisions_path",
    "warning_decisions_present",
    "warning_decisions_sha256",
  ];

  for (const field of fields) {
    if (JSON.stringify(reportContract[field] ?? null) !== JSON.stringify(currentContract[field] ?? null)) {
      issues.push(`stale_${field}: report=${JSON.stringify(reportContract[field] ?? null)} current=${JSON.stringify(currentContract[field] ?? null)}`);
    }
  }

  if (options.inputPath && reportContract.input_path && reportContract.input_path !== relativePath(options.inputPath)) {
    issues.push(`stale_input_path: report=${reportContract.input_path} current=${relativePath(options.inputPath)}`);
  }

  if ((report.rule_version ?? reportContract.rule_version) !== currentContract.rule_version) {
    issues.push(`stale_report_rule_version: report=${report.rule_version ?? "missing"} current=${currentContract.rule_version}`);
  }

  return { ok: issues.length === 0, issues };
}

export { contractVersion as sourcePreflightFreshnessContractVersion };
