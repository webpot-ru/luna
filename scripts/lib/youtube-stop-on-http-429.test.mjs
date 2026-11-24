import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

fs.mkdirSync("scratch", { recursive: true });
const moduleUrl = new URL("./youtube-stop-on-http-429.mjs", import.meta.url).href;
const program = `
  globalThis.fetch = async (url) => {
    console.log("sent", new URL(url).pathname);
    return new Response(null, { status: url.includes("limited") ? 429 : 200 });
  };
  const guard = await import(${JSON.stringify(moduleUrl)});
  await fetch("https://test.example/first");
  try { await fetch("https://test.example/limited?value=hidden"); }
  catch (error) { console.log("receipt handler", error.message); }
  try { await fetch("https://test.example/next"); }
  catch (error) { console.log("next request blocked"); }
`;
const run = (cwd, mode, script = program, stopOn403 = "") => spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
  cwd, env: { ...process.env, YOUTUBE_CAMPAIGN_HTTP429_MODE: mode, YOUTUBE_CAMPAIGN_STOP_ON_403: stopOn403 }, encoding: "utf8",
});
const evidenceFile = (cwd) => path.join(cwd, "outputs/youtube-campaign-http429-stop.json");
const dirs = ["stop", "preserve-receipt", ""].map((mode) => [mode, fs.mkdtempSync("scratch/http429-test-")]);
for (const [mode, cwd] of dirs) {
  const result = run(cwd, mode);
  assert.equal(result.status, mode === "stop" ? 75 : 0, result.stderr);
  assert.match(result.stdout, /sent \/first\nsent \/limited/u);
  if (!mode) {
    assert.match(result.stdout, /sent \/next/u);
    assert.ok(!fs.existsSync(evidenceFile(cwd)));
    continue;
  }
  assert.doesNotMatch(result.stdout, /sent \/next/u);
  if (mode === "preserve-receipt") assert.match(result.stdout, /receipt handler.*HTTP 429/u);
  const evidenceText = fs.readFileSync(evidenceFile(cwd), "utf8");
  assert.doesNotMatch(evidenceText, /hidden/u);
  assert.equal(JSON.parse(evidenceText).status, 429);
  assert.equal(JSON.parse(evidenceText).source, "test.example");
  assert.doesNotMatch(run(cwd, mode).stdout, /sent/u);
  assert.equal(fs.readFileSync(evidenceFile(cwd), "utf8"), evidenceText);
}
const forbidden = program.replace("429 : 200", "403 : 200");
for (const [mode, optIn, expectedExit] of [["stop", "1", 75], ["preserve-receipt", "1", 0], ["stop", "", 0]]) {
  const cwd = fs.mkdtempSync("scratch/http403-test-");
  const result = run(cwd, mode, forbidden, optIn);
  assert.equal(result.status, expectedExit, result.stderr);
  if (optIn) {
    assert.doesNotMatch(result.stdout, /sent \/next/u);
    assert.equal(JSON.parse(fs.readFileSync(evidenceFile(cwd), "utf8")).status, 403);
    if (mode === "preserve-receipt") assert.match(result.stdout, /receipt handler.*HTTP 403/u);
  } else {
    assert.match(result.stdout, /sent \/next/u);
    assert.ok(!fs.existsSync(evidenceFile(cwd)));
  }
}
const edgeDir = fs.mkdtempSync("scratch/http429-edge-test-");
const edge = run(edgeDir, "stop", `const guard = await import(${JSON.stringify(moduleUrl)}); guard.recordCampaignHttp429("edge-tts");`);
assert.equal(edge.status, 75, edge.stderr);
assert.equal(JSON.parse(fs.readFileSync(evidenceFile(edgeDir), "utf8")).source, "edge-tts");
const edgeForbiddenDir = fs.mkdtempSync("scratch/http403-edge-test-");
const edgeForbidden = run(edgeForbiddenDir, "stop", `const guard = await import(${JSON.stringify(moduleUrl)}); guard.recordCampaignHttp403("edge-tts");`, "1");
assert.equal(edgeForbidden.status, 75, edgeForbidden.stderr);
assert.deepEqual(
  Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(evidenceFile(edgeForbiddenDir), "utf8"))).filter(([key]) => key !== "observedAt")),
  { status: 403, source: "edge-tts" },
);
console.log("HTTP 403 and 429 guards stop provider calls and preserve upload receipts");
