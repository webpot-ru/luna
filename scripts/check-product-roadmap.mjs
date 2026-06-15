import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const roadmapPath = path.join(projectRoot, "docs/product-content-roadmap.md");

const content = readFileSync(roadmapPath, "utf8");
const errors = [];

const forbiddenHeadings = [
  "## Execution order after Kitchenware Basics",
  "## Planned deck backlog",
];

for (const heading of forbiddenHeadings) {
  if (content.includes(heading)) {
    errors.push(`Content Roadmap must not contain operational heading: ${heading}`);
  }
}

const numberedRows = content
  .split(/\r?\n/)
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => line.startsWith("|"))
  .map(({ line, lineNumber }) => ({
    lineNumber,
    cells: line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  }))
  .filter(({ cells }) => cells.length > 0 && /^\d+$/.test(cells[0]));

if (numberedRows.length > 0) {
  errors.push(
    `Content Roadmap must not contain integer Sort/Step operational table rows: ${numberedRows
      .slice(0, 10)
      .map((row) => `line ${row.lineNumber}`)
      .join(", ")}${numberedRows.length > 10 ? `, ... +${numberedRows.length - 10} more` : ""}`
  );
}

if (errors.length > 0) {
  throw new Error(`Content roadmap check failed:\n${errors.join("\n")}`);
}

console.log("Content roadmap OK: no operational Sort/Step backlog.");
