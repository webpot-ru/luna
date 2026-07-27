#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import { resolveYouTubeApiEnvironment } from "./resolve-youtube-api-environment.mjs";

const routing = JSON.parse(fs.readFileSync("config/youtube-api-project-routing.json", "utf8"));
const blockedRouting = JSON.parse(JSON.stringify(routing));
const blockedRoute = blockedRouting.projects.find((route) => route.key === "youtube-5");
blockedRoute.publicationReady = false;
blockedRoute.publicationBlockedReason = "activation test fixture";

assert.doesNotThrow(() =>
  resolveYouTubeApiEnvironment({
    routing,
    supportCodes: ["EN"],
    requestedEnvironment: "youtube-api-branding",
  }),
);

assert.throws(
  () =>
    resolveYouTubeApiEnvironment({
      routing: blockedRouting,
      supportCodes: ["FR"],
      requestedEnvironment: "youtube-api-youtube-5",
    }),
  /youtube-5 is publication-blocked/,
);

assert.doesNotThrow(() =>
  resolveYouTubeApiEnvironment({
    routing: blockedRouting,
    supportCodes: ["FR", "DE", "JA", "KO", "TR", "ZH"],
    requestedEnvironment: "youtube-api-youtube-5",
    activationReadback: true,
  }),
);

assert.throws(
  () =>
    resolveYouTubeApiEnvironment({
      routing: blockedRouting,
      supportCodes: ["FR"],
      requestedEnvironment: "youtube-api-youtube-5",
      activationReadback: true,
    }),
  /must include every active support exactly once/,
);

assert.throws(
  () =>
    resolveYouTubeApiEnvironment({
      routing: blockedRouting,
      supportCodes: ["FR", "DE", "JA", "KO", "TR", "ZH", "ZH"],
      requestedEnvironment: "youtube-api-youtube-5",
      activationReadback: true,
    }),
  /must list each active support exactly once/,
);

assert.throws(
  () =>
    resolveYouTubeApiEnvironment({
      routing: blockedRouting,
      supportCodes: ["FR", "DE", "JA", "KO", "TR", "ZH"],
      requestedEnvironment: "auto",
      activationReadback: true,
    }),
  /requires an explicit matching --environment/,
);

const readyRouting = JSON.parse(JSON.stringify(blockedRouting));
readyRouting.projects.find((route) => route.key === "youtube-5").publicationReady = true;
assert.throws(
  () =>
    resolveYouTubeApiEnvironment({
      routing: readyRouting,
      supportCodes: ["FR", "DE", "JA", "KO", "TR", "ZH"],
      requestedEnvironment: "youtube-api-youtube-5",
      activationReadback: true,
    }),
  /only allowed while youtube-5 is publication-blocked/,
);

console.log("youtube API environment activation-readback tests passed");
