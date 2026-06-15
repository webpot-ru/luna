#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const CONTRACT_PATH = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const reportStamp = args.get("date") ?? new Date().toISOString().slice(0, 10).replaceAll("-", "");
const BAD_TERMINAL_SEQUENCE_RE = /(?:[:：]\.|\.[:：]|։\.|\.։|:։|։:)$/u;
const HY_FULL_STOP = "։";

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${rel(filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function repairHyTerminal(value) {
  const text = String(value ?? "").normalize("NFC");
  return text.replace(BAD_TERMINAL_SEQUENCE_RE, HY_FULL_STOP);
}

const contract = await readJson(CONTRACT_PATH);
const releaseId = args.get("release") ?? contract.default_release?.release_id;
if (!releaseId) throw new Error("Missing release id in contract.");

const supportFile = path.join(
  ROOT,
  "outputs/spanish-a1-core/support-translations",
  `${releaseId}_support_translation_batch_${codeSlug("HY")}_v1.jsonl`
);
const rows = await readJsonl(supportFile);
const repairs = [];
const repairedRows = rows.map((row) => {
  const next = { ...row };
  for (const field of ["example", "example_translation"]) {
    const before = next[field];
    const after = repairHyTerminal(before);
    if (after !== before) {
      next[field] = after;
      repairs.push({
        row_id: row.row_id,
        field,
        before,
        after,
      });
    }
  }
  if (repairs.some((repair) => repair.row_id === row.row_id)) {
    next.qa_notes = [next.qa_notes, "HY terminal punctuation repaired to Armenian full stop."]
      .filter(Boolean)
      .join(" ");
  }
  return next;
});

await fs.writeFile(supportFile, `${repairedRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

const rowIds = new Set(repairs.map((repair) => repair.row_id));
const remainingBadRows = repairedRows.filter((row) =>
  BAD_TERMINAL_SEQUENCE_RE.test(String(row.example_translation ?? row.example ?? "").normalize("NFC").trim())
);
const reportJsonPath = path.join(
  ROOT,
  "outputs/spanish-a1-core/qa",
  `${releaseId}_hy_terminal_punctuation_repair_${reportStamp}.json`
);
const reportMdPath = reportJsonPath.replace(/\.json$/u, ".md");
const report = {
  release_id: releaseId,
  status: remainingBadRows.length ? "blocked" : "ok",
  language_code: "HY",
  support_file: rel(supportFile),
  rows_checked: rows.length,
  rows_updated: rowIds.size,
  fields_updated: repairs.length,
  remaining_bad_terminal_rows: remainingBadRows.length,
  checked_at: new Date().toISOString(),
  repairs,
};

await writeJson(reportJsonPath, report);
await fs.writeFile(
  reportMdPath,
  [
    `# Spanish A1 HY Terminal Punctuation Repair - ${releaseId}`,
    "",
    `- Status: ${report.status}`,
    `- Support file: ${report.support_file}`,
    `- Rows checked: ${report.rows_checked}`,
    `- Rows updated: ${report.rows_updated}`,
    `- Fields updated: ${report.fields_updated}`,
    `- Remaining bad terminal rows: ${report.remaining_bad_terminal_rows}`,
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      status: report.status,
      rows_updated: report.rows_updated,
      fields_updated: report.fields_updated,
      remaining_bad_terminal_rows: report.remaining_bad_terminal_rows,
      report_json: rel(reportJsonPath),
      report_md: rel(reportMdPath),
    },
    null,
    2
  )
);

if (remainingBadRows.length) process.exitCode = 1;
