import assert from "node:assert/strict";
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
console.log("Edge TTS bounded backoff tests passed");
