#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const setId = process.argv[2] || "home_kitchen_cookware_pilot_01";
const result = spawnSync(
  process.execPath,
  ["scripts/export-and-upload-deck.mjs", setId, "--local-only"],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
