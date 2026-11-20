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
const run = (cwd, mode, script = program) => spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
  cwd, env: { ...process.env, YOUTUBE_CAMPAIGN_HTTP429_MODE: mode }, encoding: "utf8",
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
const edgeDir = fs.mkdtempSync("scratch/http429-edge-test-");
const edge = run(edgeDir, "stop", `const guard = await import(${JSON.stringify(moduleUrl)}); guard.recordCampaignHttp429("edge-tts");`);
assert.equal(edge.status, 75, edge.stderr);
assert.equal(JSON.parse(fs.readFileSync(evidenceFile(edgeDir), "utf8")).source, "edge-tts");
console.log("HTTP 429 stops provider calls and preserves upload error handling");
