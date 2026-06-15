#!/usr/bin/env node
import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  [
    "scripts/hsk/build-classic-hsk1-release.mjs",
    "--level=6",
    "--expected-rows=2500",
    "--release-id=hsk2_classic_level_6_2500_v1",
    "--source=outputs/hsk/source/hsk2_classic_level_6_2500_v1.source.json",
    "--overrides=config/hsk-classic-hsk6-card-overrides.json",
    "--examples=config/hsk-classic-hsk6-examples.json",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
