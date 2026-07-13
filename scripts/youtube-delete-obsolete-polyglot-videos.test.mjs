#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-obsolete-polyglot-delete-test-"));
const write = (name, value) => { const file = path.join(root, name); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); return file; };
const plan = write("plan.json", { schemaVersion: 1, mode: "read_only_replacement_plan", setId: "deck1", items: [{ route: "youtube-1", supportLang: "ES-419", bundleKey: "romance_core", contentScope: "full", occupiedVideoId: "4E3lliVWsbA", currentTargetLangs: ["ES", "FR", "IT", "PT"], replacementTargetLangs: ["EN", "FR", "IT", "PT"] }] });
const channels = write("channels.json", { channels: [{ key: "es", channelId: "channel-es", supportLangs: ["ES", "ES-419"] }] });
const routing = write("routing.json", { projects: [{ key: "youtube-1", supportChannelKeys: ["es"] }] });
const registry = write("registry.json", { publications: [{ setId: "deck1", supportLang: "ES-419", bundleKey: "romance_core", contentScope: "full", youtubeVideoId: "4E3lliVWsbA", targetLangs: ["ES", "FR", "IT", "PT"], publicationStatus: "live_youtube_upload_detected" }] });
const calendar = write("calendar.json", { reservations: [] });
const report = path.join(root, "report.json");
const run = spawnSync(process.execPath, ["scripts/youtube-delete-obsolete-polyglot-videos.mjs", `--target-file=${plan}`, "--route=youtube-1", `--channel-config=${channels}`, `--routing-config=${routing}`, `--polyglot-registry=${registry}`, `--publish-calendar=${calendar}`, `--report-file=${report}`], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(run.status, 0, run.stderr || run.stdout);
const result = JSON.parse(fs.readFileSync(report, "utf8"));
assert.equal(result.mode, "dry_run");
assert.equal(result.expectedDeleteCount, 1);
assert.equal(result.preflight[0].registryIdentity, "matched");
assert.equal(JSON.parse(fs.readFileSync(registry, "utf8")).publications[0].publicationStatus, "live_youtube_upload_detected");

console.log("youtube obsolete Polyglot deletion tests passed");
