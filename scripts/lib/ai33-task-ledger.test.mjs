import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendAi33TaskLedger, ai33TaskLedgerPath, readAi33TaskForCache } from "./ai33-task-ledger.mjs";

const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai33-task-ledger-"));
appendAi33TaskLedger(cacheDir, { provider: "ai33", event: "created", taskId: "task-old", cacheFile: "a.mp3" });
appendAi33TaskLedger(cacheDir, { provider: "ai33", event: "downloaded", taskId: "task-new", cacheFile: "a.mp3" });
assert.equal(readAi33TaskForCache(cacheDir, "a.mp3")?.taskId, "task-new");
assert.equal(readAi33TaskForCache(cacheDir, "missing.mp3"), null);
assert.ok(fs.existsSync(ai33TaskLedgerPath(cacheDir)));
console.log("AI33 task ledger tests passed.");
