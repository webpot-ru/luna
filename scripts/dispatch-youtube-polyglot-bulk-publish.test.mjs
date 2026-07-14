#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-polyglot-dispatch-test-"));
const planner = path.join(root, "fake-planner.mjs");
fs.writeFileSync(planner, `
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const read = (name) => {
  const exact = args.indexOf(name);
  if (exact >= 0) return args[exact + 1] || "";
  return args.find((arg) => arg.startsWith(name + "="))?.slice(name.length + 1) || "";
};
const setId = read("--set");
const support = read("--support");
const bundle = read("--bundle");
const output = read("--output");
const report = {
  summary: { status: "ready" },
  blockers: [],
  warnings: [],
  candidate: {
    setId,
    supportLang: support,
    bundleKey: bundle,
    polyglotKey: ["polyglot", setId, support, bundle, "testhash"].join(":"),
    targetLangs: ["FR", "DE", "IT"],
    targetLangsCsv: "FR,DE,IT",
    studyUrl: "https://flashcardsluna.com/test",
    deck: { cardCount: 1 },
  },
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report));
`);

function run(extra, name) {
  const output = path.join(root, `${name}.json`);
  const result = spawnSync(process.execPath, [
    "scripts/dispatch-youtube-polyglot-bulk-publish.mjs",
    "--set=test-deck",
    "--supports=EN",
    "--bundle=romance_core",
    `--plan-script=${planner}`,
    `--plan-output-dir=${path.join(root, `${name}-plans`)}`,
    "--planner-timeout-ms=10000",
    "--dry-run",
    `--output=${output}`,
    ...extra,
  ], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(fs.readFileSync(output, "utf8"));
}

const defaultReport = run([], "default");
assert.equal(defaultReport.options.englishBundle, "same_as_bundle");
assert.equal(defaultReport.supports[0].bundle, "romance_core");

const explicitOverride = run(["--english-bundle=global_europe_core"], "override");
assert.equal(explicitOverride.supports[0].bundle, "global_europe_core");

const dispatcherSource = fs.readFileSync("scripts/dispatch-youtube-polyglot-bulk-publish.mjs", "utf8");
assert.match(dispatcherSource, /--confirm-openai-metadata=USE_OPENAI_METADATA/u);
assert.match(dispatcherSource, /--confirm-vectorengine-metadata=USE_VECTORENGINE_METADATA/u);
const workflowSource = fs.readFileSync(".github/workflows/youtube-polyglot-video-publish.yml", "utf8");
assert.match(workflowSource, /METADATA_CHAIN="openai,\$METADATA_CHAIN"/u);
assert.match(workflowSource, /METADATA_CHAIN="\$METADATA_CHAIN,vectorengine"/u);

console.log("youtube Polyglot bulk dispatcher tests passed");
