#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  assertCanonicalSupportCount,
  loadCanonicalSupportRouting,
  resolveCanonicalSupports,
} from "./youtube-support-routing.mjs";

const routing = loadCanonicalSupportRouting();
assert.equal(assertCanonicalSupportCount(routing).length, 51);
assert.equal(routing.projects.find((project) => project.key === "youtube-1").canonicalSupports.length, 12);

const all = resolveCanonicalSupports({ requested: "ALL", routing });
assert.equal(all.length, 51);
assert.ok(all.includes("EN"));
assert.ok(all.includes("ES-419"));
assert.ok(all.includes("PT-BR"));
assert.ok(!all.includes("EN-GB"));
assert.ok(!all.includes("ES"));
assert.ok(!all.includes("PT"));

const routeOne = resolveCanonicalSupports({ requested: "route:youtube-1", routing });
assert.equal(routeOne.length, 12);
assert.deepEqual(resolveCanonicalSupports({ requested: "EN-GB,ES,PT", routing }), ["EN", "ES-419", "PT-BR"]);
assert.deepEqual(resolveCanonicalSupports({ requested: "ALL", excludeSupports: ["ES"], routing }).includes("ES-419"), false);

console.log("youtube canonical support routing tests passed");
