#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  assertPublicationReadyForSupports,
  assertCanonicalSupportCount,
  loadCanonicalSupportRouting,
  resolveCanonicalSupports,
} from "./youtube-support-routing.mjs";

const routing = loadCanonicalSupportRouting();
assert.equal(assertCanonicalSupportCount(routing).length, 51);
assert.equal(routing.projects.length, 8);

const expectedRoutes = {
  "youtube-1": {
    environment: "youtube-api-branding",
    supports: ["EN", "ES-419", "HI", "ID", "PT-BR", "RU"],
    pairedRouteKey: "youtube-5",
  },
  "youtube-2": {
    environment: "youtube-api-youtube-2",
    supports: ["MS", "NL", "NO", "PL", "SV", "TH", "VI"],
    pairedRouteKey: "youtube-6",
  },
  "youtube-3": {
    environment: "youtube-api-youtube-3",
    supports: ["BG", "ET", "HR", "LT", "LV", "SL", "SR"],
    pairedRouteKey: "youtube-7",
  },
  "youtube-4": {
    environment: "youtube-api-youtube-4",
    supports: ["KN", "ML", "NE", "SI", "TA", "TE", "UZ"],
    pairedRouteKey: "youtube-8",
  },
  "youtube-5": {
    environment: "youtube-api-youtube-5",
    supports: ["DE", "FR", "JA", "KO", "TR", "ZH"],
    pairedRouteKey: "youtube-1",
  },
  "youtube-6": {
    environment: "youtube-api-youtube-6",
    supports: ["CS", "DA", "FI", "HU", "RO", "SK"],
    pairedRouteKey: "youtube-2",
  },
  "youtube-7": {
    environment: "youtube-api-youtube-7",
    supports: ["BN", "IS", "KM", "LO", "MY", "TL"],
    pairedRouteKey: "youtube-3",
  },
  "youtube-8": {
    environment: "youtube-api-youtube-8",
    supports: ["AZ", "HY", "IT", "KA", "KK", "SW"],
    pairedRouteKey: "youtube-4",
  },
};

for (const [routeKey, expected] of Object.entries(expectedRoutes)) {
  const project = routing.projects.find((row) => row.key === routeKey);
  assert(project, `missing ${routeKey}`);
  assert.equal(project.githubEnvironment, expected.environment);
  assert.equal(project.pairedRouteKey, expected.pairedRouteKey);
  assert.equal(project.publicationReady, Number(routeKey.slice(-1)) <= 4);
  assert.deepEqual([...project.canonicalSupports].sort(), expected.supports);

  const pair = routing.projects.find((row) => row.key === expected.pairedRouteKey);
  const expectedAuthorization = [...new Set([
    ...project.supportChannelKeys,
    ...pair.supportChannelKeys,
  ])].sort();
  assert.deepEqual(
    [...project.plannedAuthorizationChannelKeys].sort(),
    expectedAuthorization,
    `${routeKey} standby authorization must equal its complete pair`,
  );
}

const all = resolveCanonicalSupports({ requested: "ALL", routing });
assert.equal(all.length, 51);
assert.ok(all.includes("EN"));
assert.ok(all.includes("ES-419"));
assert.ok(all.includes("PT-BR"));
assert.ok(!all.includes("EN-GB"));
assert.ok(!all.includes("ES"));
assert.ok(!all.includes("PT"));

for (const [routeKey, expected] of Object.entries(expectedRoutes)) {
  assert.deepEqual(resolveCanonicalSupports({ requested: `route:${routeKey}`, routing }), expected.supports);
}
assert.deepEqual(resolveCanonicalSupports({ requested: "EN-GB,ES,PT", routing }), ["EN", "ES-419", "PT-BR"]);
assert.deepEqual(resolveCanonicalSupports({ requested: "ALL", excludeSupports: ["ES"], routing }).includes("ES-419"), false);
assert.doesNotThrow(() => assertPublicationReadyForSupports(routing, ["EN", "VI", "BG", "NE"]));
assert.throws(
  () => assertPublicationReadyForSupports(routing, ["FR"]),
  /youtube-5 is publication-blocked/,
);

console.log("youtube canonical support routing tests passed");
