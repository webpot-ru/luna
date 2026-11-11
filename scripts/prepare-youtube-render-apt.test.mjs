import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mirrorCandidates, rewriteUbuntuSources, selectSignedMirrors } from "./prepare-youtube-render-apt.mjs";

const candidates = mirrorCandidates([
  "# registry comment", "http://mirror.example.org/ubuntu/", "https://mirror.example.org/ubuntu/",
  "http://azure.archive.ubuntu.com/ubuntu", "https://user:password@example.org/ubuntu/",
  "https://127.0.0.1/ubuntu/", "https://metadata.internal/ubuntu/", "file:///etc/passwd",
].join("\n"));
assert.equal(candidates[0], "https://mirror.example.org/ubuntu/");
assert.equal(candidates.filter(url => url.includes("mirror.example.org")).length, 1);
assert.ok(candidates.every(url => url.startsWith("https://")));
assert.ok(!candidates.some(url => /azure|password|127\.0\.0\.1|metadata\.internal/.test(url)));
assert.equal(mirrorCandidates().length, 3);

const source = [
  "Types: deb", "URIs: mirror+file:/etc/apt/apt-mirrors.txt", "Suites: noble noble-updates noble-backports",
  "Components: main restricted universe multiverse", "Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg", "",
  "Types: deb", "URIs: http://security.ubuntu.com/ubuntu/", "Suites: noble-security",
  "Components: main restricted universe multiverse", "Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg", "",
].join("\n");
const rewritten = rewriteUbuntuSources(source);
assert.equal((rewritten.match(/^Signed-By:/gm) || []).length, 2);
assert.match(rewritten, /Suites: noble-security/);
assert.match(rewritten, /Suites: noble noble-updates noble-backports/);
assert.equal((rewritten.match(/^URIs: mirror\+file:\/etc\/apt\/apt-mirrors.txt$/gm) || []).length, 2);
assert.equal(rewriteUbuntuSources(rewritten), rewritten);
assert.throws(() => rewriteUbuntuSources(source.replaceAll("Signed-By:", "Other-Key:")), /signature keyring/);
assert.throws(() => rewriteUbuntuSources(source.replace("http://security.ubuntu.com/ubuntu/", "https://unrelated.example.org/packages")), /unexpected APT source/);

const checks = [];
const inspect = (base, suite) => {
  checks.push({ base, suite });
  if (base === "bad") throw new Error("DNS failure");
  return { signatureValid: base !== "unsigned", origin: "Ubuntu", suite };
};
const result = selectSignedMirrors(["bad", "unsigned", "first", "second", "unused"], inspect);
assert.deepEqual(result.selected, ["first", "second"]);
assert.equal(result.failures.length, 2);
assert.ok(!checks.some(row => row.base === "unused"));
assert.equal(checks.filter(row => row.base === "first").length, 4);
assert.throws(() => selectSignedMirrors(["unsigned"], inspect), /No reachable, Ubuntu-signed/);
assert.throws(() => selectSignedMirrors(["wrong-suite"], () => ({ signatureValid: true, origin: "Ubuntu", suite: "jammy" })), /No reachable/);
if (process.platform !== "linux") {
  const cli = spawnSync(process.execPath, [path.resolve("scripts/prepare-youtube-render-apt.mjs")], { encoding: "utf8" });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /restricted to GitHub-hosted Ubuntu 24.04/);
}
console.log("Signed Ubuntu mirror selection tests passed");
