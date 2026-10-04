import assert from "node:assert/strict";
import { startResumableSession } from "./lib/youtube-resumable-init.mjs";

const request = { url: "https://example.invalid/videos", headers: {}, resource: { snippet: { title: "fixture" } } };
for (const status of [400, 408, 409, 425, 429, 500, 502, 503, 504]) {
  let calls = 0;
  await assert.rejects(startResumableSession({ ...request, fetchImpl: async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: "Requested entity already exists" } }), { status });
  } }), new RegExp(`failed \\(${status}\\).*no automatic creation retry`));
  assert.equal(calls, 1, `HTTP ${status} must not create another video record`);
}
let calls = 0;
await assert.rejects(startResumableSession({ ...request, fetchImpl: async () => { calls++; throw new Error("fetch failed"); } }), /outcome is unknown/);
assert.equal(calls, 1);
await assert.rejects(startResumableSession({ ...request, fetchImpl: async () => new Response(null, { status: 200 }) }), /no resumable URL/);
const uri = await startResumableSession({ ...request, fetchImpl: async (_url, options) => {
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), request.resource);
  return new Response(null, { status: 200, headers: { location: "https://example.invalid/session" } });
} });
assert.equal(uri, "https://example.invalid/session");
console.log("resumable init single-creation tests passed");
