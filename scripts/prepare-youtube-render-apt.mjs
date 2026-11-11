import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const suites = ["noble", "noble-updates", "noble-backports", "noble-security"];
const fallbackMirrors = [
  "https://mirrors.mit.edu/ubuntu/",
  "https://mirror.math.princeton.edu/pub/ubuntu/",
  "https://mirrors.kernel.org/ubuntu/",
];
const mirrorListPath = "/etc/apt/apt-mirrors.txt";
const archiveKeyring = "/usr/share/keyrings/ubuntu-archive-keyring.gpg";

export function mirrorCandidates(registryText = "") {
  const candidates = [];
  for (const line of registryText.split(/\r?\n/)) {
    try {
      const url = new URL(line.trim());
      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (url.username || url.password || url.search || url.hash || url.port) continue;
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) continue;
      if (/(?:^|\.)(?:localhost|local|internal|invalid)$/i.test(url.hostname)) continue;
      if (url.hostname === "azure.archive.ubuntu.com") continue;
      url.protocol = "https:";
      url.pathname = url.pathname.replace(/\/?$/, "/");
      candidates.push(url.href);
    } catch {
      // Mirror indexes can contain comments or blank lines.
    }
  }
  return [...new Set([...candidates.slice(0, 5), ...fallbackMirrors])];
}

export function rewriteUbuntuSources(source) {
  assert.match(source, /^Signed-By: \/usr\/share\/keyrings\/ubuntu-archive-keyring\.gpg\s*$/m,
    "Ubuntu archive signature keyring must remain configured");
  let replaced = 0;
  const result = source.replace(/^URIs:\s*(.+)$/gm, (_, urls) => {
    for (const url of urls.trim().split(/\s+/)) {
      assert.ok(url === "mirror+file:/etc/apt/apt-mirrors.txt"
        || /^https?:\/\/(?:[a-z0-9.-]*archive|security)\.ubuntu\.com\/ubuntu\/?$/i.test(url),
      "Refuse to rewrite an unexpected APT source");
    }
    replaced++;
    return `URIs: mirror+file:${mirrorListPath}`;
  });
  assert.ok(replaced > 0, "No Ubuntu source URIs found");
  return result;
}

export function selectSignedMirrors(candidates, inspectRelease) {
  const selected = [];
  const failures = [];
  for (const base of candidates) {
    try {
      for (const suite of suites) {
        const release = inspectRelease(base, suite);
        assert.equal(release.signatureValid, true, "Ubuntu archive signature failed");
        assert.equal(release.origin, "Ubuntu");
        assert.equal(release.suite, suite);
      }
      selected.push(base);
      if (selected.length === 2) break;
    } catch (error) {
      failures.push({ base, reason: error.message.slice(0, 180) });
    }
  }
  assert.ok(selected.length > 0, "No reachable, Ubuntu-signed mirror passed all four Noble suites");
  return { selected, failures };
}

function download(url, file) {
  execFileSync("curl", ["-4", "--fail", "--silent", "--show-error", "--location",
    "--proto", "=https", "--proto-redir", "=https", "--connect-timeout", "4",
    "--max-time", "8", "--max-filesize", "1048576", "--output", file, url],
  { timeout: 10_000, stdio: ["ignore", "pipe", "pipe"] });
}

function main() {
  assert.equal(process.platform, "linux", "Runner setup is restricted to GitHub-hosted Ubuntu 24.04");
  assert.equal(process.env.GITHUB_ACTIONS, "true", "Runner setup requires GitHub Actions");
  const os = fs.readFileSync("/etc/os-release", "utf8");
  assert.match(os, /^ID=ubuntu$/m);
  assert.match(os, /^VERSION_ID="24\.04"$/m);
  assert.equal(execFileSync("dpkg", ["--print-architecture"], { encoding: "utf8" }).trim(), "amd64");
  assert.ok(fs.existsSync(archiveKeyring));
  const root = path.resolve("outputs/youtube-render-runner-preflight");
  fs.mkdirSync(root, { recursive: true });
  const registryFile = path.join(root, "official-mirror-index.txt");
  let registryText = "";
  try {
    download("https://mirrors.ubuntu.com/mirrors.txt", registryFile);
    registryText = fs.readFileSync(registryFile, "utf8");
  } catch {
    console.log("Ubuntu mirror index is unreachable; probing documented MIT/Princeton/kernel.org mirrors");
  }
  const result = selectSignedMirrors(mirrorCandidates(registryText), (base, suite) => {
    const releaseFile = path.join(root, `${new URL(base).hostname}-${suite}-InRelease`);
    download(`${base}dists/${suite}/InRelease`, releaseFile);
    execFileSync("gpgv", ["--homedir", root, "--keyring", archiveKeyring, releaseFile],
      { timeout: 10_000, stdio: ["ignore", "pipe", "pipe"] });
    const release = fs.readFileSync(releaseFile, "utf8");
    return { signatureValid: true, origin: release.match(/^Origin: (.+)$/m)?.[1],
      suite: release.match(/^Suite: (.+)$/m)?.[1] };
  });
  const sourcesPath = "/etc/apt/sources.list.d/ubuntu.sources";
  const source = fs.readFileSync(sourcesPath, "utf8");
  fs.writeFileSync(path.join(root, "ubuntu.sources.original"), source);
  fs.writeFileSync(path.join(root, "ubuntu.sources"), rewriteUbuntuSources(source));
  fs.writeFileSync(path.join(root, "apt-mirrors.txt"), result.selected.join("\n") + "\n");
  fs.writeFileSync(path.join(root, "99-youtube-render-network"), [
    'Acquire::ForceIPv4 "true";',
    'Acquire::http::Timeout "15";',
    'Acquire::https::Timeout "15";',
    'Acquire::Retries "1";',
    'DPkg::Lock::Timeout "60";',
    "",
  ].join("\n"));
  for (const [file, destination] of [
    ["apt-mirrors.txt", mirrorListPath],
    ["ubuntu.sources", sourcesPath],
    ["99-youtube-render-network", "/etc/apt/apt.conf.d/99-youtube-render-network"],
  ]) {
    execFileSync("sudo", ["install", "-m", "644", path.join(root, file), destination], { stdio: "inherit" });
  }
  fs.writeFileSync(path.join(root, "selection.json"), JSON.stringify({
    checkedAt: new Date().toISOString(), ...result, suites, signatureKeyring: archiveKeyring,
  }, null, 2) + "\n");
  console.log(`Ubuntu-signed mirrors selected: ${result.selected.join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
