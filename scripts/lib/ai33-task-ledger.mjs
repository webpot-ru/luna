import fs from "node:fs";
import path from "node:path";

const LEDGER_FILE = "ai33-task-ledger.jsonl";

export function ai33TaskLedgerPath(cacheDir) {
  return path.join(cacheDir, LEDGER_FILE);
}

export function appendAi33TaskLedger(cacheDir, entry) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.appendFileSync(ai33TaskLedgerPath(cacheDir), `${JSON.stringify({
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    ...entry,
  })}\n`, "utf8");
}

// Returns the newest known task for this exact immutable audio-cache filename.
// Raw lesson text and short-lived download URLs are deliberately never recorded.
export function readAi33TaskForCache(cacheDir, cacheFile) {
  const ledgerPath = ai33TaskLedgerPath(cacheDir);
  if (!fs.existsSync(ledgerPath)) return null;
  let latest = null;
  for (const line of fs.readFileSync(ledgerPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry?.provider === "ai33" && entry.cacheFile === cacheFile && entry.taskId) latest = entry;
    } catch {
      // A partially written diagnostic line must never prevent cache recovery.
    }
  }
  return latest;
}
