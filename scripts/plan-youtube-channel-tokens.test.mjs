#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const routing = JSON.parse(readFileSync(path.join(projectRoot, "config/youtube-api-project-routing.json"), "utf8"));

function runPlan(args) {
  return spawnSync(process.execPath, ["scripts/plan-youtube-channel-tokens.mjs", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

const defaultResult = runPlan(["--json"]);
assert.equal(defaultResult.status, 0, defaultResult.stderr);
const defaultPlan = JSON.parse(defaultResult.stdout);
assert.equal(defaultPlan.route, null);
assert.equal(defaultPlan.channels.length, 51);

for (const route of routing.projects.filter((project) => /^youtube-[5-8]$/u.test(project.key))) {
  const result = runPlan([`--route=${route.key}`, "--json"]);
  assert.equal(result.status, 0, `${route.key}: ${result.stderr}`);
  const plan = JSON.parse(result.stdout);
  const expectedKeys = [...route.plannedAuthorizationChannelKeys].sort();
  const actualKeys = plan.channels.map((channel) => channel.key).sort();
  const oauthRoot = `.local/youtube-oauth-routes/${route.key}/.local/youtube-oauth`;

  assert.equal(plan.route.key, route.key);
  assert.equal(plan.route.pairedRouteKey, route.pairedRouteKey);
  assert.equal(plan.route.githubEnvironment, route.githubEnvironment);
  assert.equal(plan.route.oauthClientFile, `${oauthRoot}/google-oauth-client.json`);
  assert.equal(plan.route.tokenDir, `${oauthRoot}/tokens`);
  assert.equal(plan.route.plannedAuthorizationChannelCount, expectedKeys.length);
  assert.equal(plan.route.activeChannelCount, route.supportChannelKeys.length);
  assert.deepEqual(actualKeys, expectedKeys);

  for (const channel of plan.channels) {
    const expectedActive = route.supportChannelKeys.includes(channel.key);
    assert.equal(channel.activeOnRoute, expectedActive, `${route.key}/${channel.key} active flag`);
    assert.equal(channel.standbyAuthorization, !expectedActive, `${route.key}/${channel.key} standby flag`);
    assert.equal(channel.oauthClientFile, `${oauthRoot}/google-oauth-client.json`);
    assert.equal(channel.tokenFile, `${oauthRoot}/tokens/${channel.key}.json`);
    assert.match(channel.suggestedAuthCommand, new RegExp(`--channel=${channel.key}(?:\\s|$)`));
    assert.ok(channel.suggestedAuthCommand.includes(`--oauth-client-file=${channel.oauthClientFile}`));
    assert.ok(channel.suggestedAuthCommand.includes(`--token-file=${channel.tokenFile}`));
    assert.ok(channel.suggestedReadbackCommand.includes(`--oauth-client-file=${channel.oauthClientFile}`));
    assert.ok(channel.suggestedReadbackCommand.includes(`--token-file=${channel.tokenFile}`));
    assert.ok(channel.channelId, `${route.key}/${channel.key} expected channelId`);
  }
}

const unknownRouteResult = runPlan(["--route=youtube-99", "--json"]);
assert.notEqual(unknownRouteResult.status, 0);
assert.match(unknownRouteResult.stderr, /Unknown YouTube API route: youtube-99/u);

console.log("youtube route token plan tests passed");
