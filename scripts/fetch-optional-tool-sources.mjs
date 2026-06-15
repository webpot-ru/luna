#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const listOnly = args.includes("--list");
const sourceFilter = args.find((arg) => arg.startsWith("--source="))?.slice("--source=".length);
const adapterFilter = args.find((arg) => arg.startsWith("--adapter="))?.slice("--adapter=".length);
const groupFilter = args.find((arg) => arg.startsWith("--group="))?.slice("--group=".length);
const languageFilter = args
  .find((arg) => arg.startsWith("--languages="))
  ?.slice("--languages=".length)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const targetConfigPath =
  args.find((arg) => arg.startsWith("--targets="))?.slice("--targets=".length) ??
  "reference-sources/optional-tool-source-targets.json";
const reportPath =
  args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ??
  `outputs/source-preflight/optional_tool_sources_${new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z")}.json`;

function usage() {
  return [
    "Usage: node scripts/fetch-optional-tool-sources.mjs [--list] [--dry-run] [--adapter=unimorph|apertium|freedict|corpus|concept] [--group=<name>] [--source=<source_id>] [--languages=ES,FR] [--targets=path] [--out=path]",
    "Downloads optional source-candidate files into reference-sources/raw/. Tool/source output remains candidate evidence only.",
  ].join("\n");
}

function safeProjectPath(localPath) {
  const resolved = path.resolve(localPath);
  const root = path.resolve(".");
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside project: ${localPath}`);
  }
  if (!localPath.startsWith("reference-sources/raw/")) {
    throw new Error(`Optional source targets must write under reference-sources/raw/: ${localPath}`);
  }
  return resolved;
}

function fetchToFile(url, destination) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("http://") ? http : https;
    const request = client.get(url, { headers: { "User-Agent": "LunaCards-source-preflight" } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        fetchToFile(new URL(response.headers.location, url).toString(), destination).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        const error = new Error(`HTTP ${response.statusCode} for ${url}`);
        error.statusCode = response.statusCode;
        reject(error);
        return;
      }
      const stream = createWriteStream(destination);
      response.pipe(stream);
      stream.on("finish", () => {
        stream.close(resolve);
      });
      stream.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(120000, () => {
      request.destroy(new Error(`No data received for 120s while fetching ${url}`));
    });
  });
}

function probeUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("http://") ? http : https;
    const request = client.request(url, { method: "HEAD", headers: { "User-Agent": "LunaCards-source-preflight" } }, (response) => {
      response.resume();
      resolve({ ok: response.statusCode >= 200 && response.statusCode < 400, statusCode: response.statusCode });
    });
    request.on("error", (error) => resolve({ ok: false, error: error.message, code: error.code }));
    request.setTimeout(30000, () => {
      request.destroy();
      resolve({ ok: false, error: `HEAD timeout for ${url}`, code: "TIMEOUT" });
    });
    request.end();
  });
}

function deferredStatusForTarget(target, error, probe = null) {
  if (target.group === "opus" && error?.statusCode === 404) return "unavailable_pair";
  if ((target.group === "unimorph-bulk" || target.adapter === "unimorph") && error?.statusCode === 404) return "unavailable_source";
  const retryableCodes = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "TIMEOUT"]);
  if (target.group === "panlex" && (retryableCodes.has(error?.code) || retryableCodes.has(probe?.code))) return "deferred_retry";
  return "";
}

function configuredDeferredStatus(target) {
  const status = target.status ?? "";
  if (
    [
      "deferred_requires_key",
      "deferred_requires_runtime",
      "deferred_review",
      "deferred_retry",
    ].includes(status)
  ) {
    return status;
  }
  if (target.deferred === true) return "deferred_review";
  return "";
}

async function sha256File(localPath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(localPath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

const config = JSON.parse(await readFile(targetConfigPath, "utf8"));
const filters = {
  source_id: sourceFilter,
  adapter: adapterFilter,
  group: groupFilter,
  languages: languageFilter ? new Set(languageFilter) : null,
};
const targets = (config.targets ?? []).filter((target) => {
  if (filters.source_id && target.source_id !== filters.source_id && target.id !== filters.source_id) return false;
  if (filters.adapter && target.adapter !== filters.adapter) return false;
  if (filters.group && target.group !== filters.group) return false;
  if (filters.languages && !filters.languages.has(target.language_code)) return false;
  return true;
});

if (args.includes("--help")) {
  console.log(usage());
  process.exit(0);
}

if (targets.length === 0) throw new Error("No optional source targets matched the filters.");

const results = [];
for (const target of targets) {
  const resolvedPath = safeProjectPath(target.local_path);
  const row = {
    id: target.id,
    source_id: target.source_id,
    adapter: target.adapter,
    group: target.group ?? null,
    language_code: target.language_code,
    pair: target.pair ?? null,
    url: target.url,
    local_path: target.local_path,
  };
  if (listOnly || dryRun) {
    results.push({
      ...row,
      status: listOnly ? "listed" : "dry_run",
      configured_status: configuredDeferredStatus(target) || null,
      license_note: target.license_note ?? "",
    });
    continue;
  }
  const configuredStatus = configuredDeferredStatus(target);
  if (configuredStatus) {
    results.push({
      ...row,
      status: configuredStatus,
      reason: target.deferred_reason ?? target.license_note ?? "",
      license_note: target.license_note ?? "",
    });
    continue;
  }
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  const tempPath = `${resolvedPath}.tmp-${process.pid}`;
  try {
    let status = "downloaded";
    try {
      await stat(resolvedPath);
      status = "already_present";
    } catch {
      if (target.group === "panlex") {
        const probe = await probeUrl(target.url);
        if (!probe.ok && probe.statusCode !== 405 && probe.statusCode !== 403) {
          const deferredStatus = deferredStatusForTarget(target, { code: probe.code }, probe) || "deferred_retry";
          results.push({
            ...row,
            status: deferredStatus,
            error: probe.error ?? `HEAD HTTP ${probe.statusCode}`,
            license_note: target.license_note ?? "",
          });
          continue;
        }
      }
      await fetchToFile(target.url, tempPath);
      await rename(tempPath, resolvedPath);
    }
    const info = await stat(resolvedPath);
    results.push({
      ...row,
      status,
      bytes: info.size,
      sha256: await sha256File(resolvedPath),
      license_note: target.license_note ?? "",
    });
  } catch (error) {
    const deferredStatus = deferredStatusForTarget(target, error);
    results.push({
      ...row,
      status: deferredStatus || "failed",
      error: error.message,
      temp_path: path.relative(path.resolve("."), tempPath),
      license_note: target.license_note ?? "",
    });
  }
}

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      target_config_path: targetConfigPath,
      dry_run: dryRun,
      list_only: listOnly,
      filters: {
        source_id: filters.source_id ?? null,
        adapter: filters.adapter ?? null,
        group: filters.group ?? null,
        languages: filters.languages ? [...filters.languages].sort() : null,
      },
      target_count: targets.length,
      results,
    },
    null,
    2
  ) + "\n",
  "utf8"
);

const failed = results.filter((row) => row.status === "failed");
if (failed.length > 0) {
  console.error(`Optional source fetch failed: failed=${failed.length}/${results.length}, report=${reportPath}`);
  for (const row of failed) console.error(`${row.id}: ${row.error}`);
  process.exit(1);
}

console.log(
  `Optional source fetch ${listOnly ? "list" : dryRun ? "dry-run" : "OK"}: targets=${results.length}, report=${reportPath}`
);
