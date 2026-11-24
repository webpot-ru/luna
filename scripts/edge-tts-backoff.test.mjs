import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { edgeTtsRetryDelay, applyDeck12SrFullTtsBudget } from "./lib/edge-tts-backoff.mjs";
assert.equal(edgeTtsRetryDelay("HTTP status=429", 1, 1500, () => 0), 30000);
assert.equal(edgeTtsRetryDelay("HTTP status=429", 2, 1500, () => 0), 60000);
assert.equal(edgeTtsRetryDelay("HTTP status=429", 3, 1500, () => 0), 120000);
assert.equal(edgeTtsRetryDelay("Too Many Requests", 4, 1500, () => 0.5), 122500);
assert.equal(edgeTtsRetryDelay("HTTP status=403", 2, 1500), 3000);
assert.equal(edgeTtsRetryDelay("NoAudioReceived", 1, 1500), 1500);
const exact = {setId:"home_office_desk_a1_a2",supportLang:"SR",targetLangs:["RU","PL","CS","SK"]};
for(const input of [undefined,"4","3","2","invalid"]){const env={EDGE_TTS_RETRIES:input};assert.equal(applyDeck12SrFullTtsBudget(exact,env),true);assert.equal(env.EDGE_TTS_RETRIES,input==="2"?"2":"3");}
for(const changed of [{setId:"other"},{supportLang:"RU"},{targetLangs:["EN"]},{limit:5},{maxDurationSeconds:895}]){
  const env={EDGE_TTS_RETRIES:"4"};assert.equal(applyDeck12SrFullTtsBudget({...exact,...changed},env),false);assert.equal(env.EDGE_TTS_RETRIES,"4");
}
fs.mkdirSync("scratch", { recursive: true });
const generator = new URL("./lib/video-generator.mjs", import.meta.url).href;
for (const [optIn, responses, attempts, exit, pauses] of [
  ["1", "429,200", 2, 0, 1],
  ["", "429,200", 1, 75, 0],
  ["1", "429,429", 2, 75, 1],
  ["1", "403,200", 1, 75, 0],
]) {
  const folder = fs.mkdtempSync("scratch/edge-cooldown-test-");
  fs.mkdirSync(path.join(folder, "scripts"));
  fs.writeFileSync(path.join(folder, "scripts/edge-tts-compatible.py"), `
import os, sys
from pathlib import Path
counter = Path("calls")
attempt = int(counter.read_text()) if counter.exists() else 0
counter.write_text(str(attempt+1))
status = os.environ["TEST_EDGE_HTTP_STATUSES"].split(",")[attempt]
if status != "200":
    print("Edge TTS failed: WSServerHandshakeError; HTTP status="+status, file=sys.stderr)
    sys.exit(1)
Path(sys.argv[sys.argv.index("--write-media")+1]).write_bytes(b"ID3"+bytes(160))
`);
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `
    const setTimer = globalThis.setTimeout;
    globalThis.setTimeout = (callback, delay) => {
      console.log("Cooldown", delay);
      return setTimer(callback, 1);
    };
    const { getTtsAudio } = await import(${JSON.stringify(generator)});
    await getTtsAudio({ text: "fixture", voiceId: "edge_en-US-JennyNeural", langCode: "EN", cacheDir: "." });
  `], {cwd: folder, env: { ...process.env, EDGE_TTS_PYTHON: "python3", EDGE_TTS_RETRIES: "2",
    YOUTUBE_CAMPAIGN_HTTP429_MODE: "stop", YOUTUBE_CAMPAIGN_STOP_ON_403: "1",
    YOUTUBE_CAMPAIGN_EDGE_TTS_RETRY_429: optIn, TEST_EDGE_HTTP_STATUSES: responses }, encoding: "utf8"});
  assert.equal(result.status, exit, result.stderr);
  assert.equal(Number(fs.readFileSync(path.join(folder, "calls"), "utf8")), attempts);
  const delays = [...result.stdout.matchAll(/Cooldown (\d+)/gu)].map(match => Number(match[1]));
  assert.equal(delays.length, pauses);
  assert(delays.every(delay => delay >= 30000 && delay < 35000));
}
console.log("Edge TTS bounded backoff tests passed");
