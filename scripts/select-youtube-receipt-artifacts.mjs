import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function selectReceiptArtifacts(pages, report) {
  if (!Array.isArray(pages) || !pages.length) throw new Error("Artifact pages missing");
  const total = pages[0].total_count;
  const rows = pages.flatMap(page => {
    if (page.total_count !== total || !Array.isArray(page.artifacts)) throw new Error("Artifact pagination drift");
    return page.artifacts;
  });
  if (!Number.isSafeInteger(total) || rows.length !== total
    || new Set(rows.map(row => row.id)).size !== total
    || new Set(rows.map(row => row.name)).size !== total) throw new Error("Incomplete or duplicate artifact pagination");
  const selected = rows.filter(row => /^youtube-video-publish-apply-/.test(row.name)
    || /^youtube-polyglot-.*-apply$/.test(row.name));
  if (!Number.isSafeInteger(report.artifactCount) || !report.artifactCount
    || selected.length !== report.artifactCount) throw new Error("Source receipt artifact count mismatch");
  for (const row of selected) {
    if (!Number.isSafeInteger(row.id) || row.id <= 0 || row.expired !== false
      || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(row.name)) throw new Error("Unsafe or expired receipt artifact");
  }
  return selected.sort((a, b) => a.id - b.id);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [listing, sourceReport, output] = process.argv.slice(2);
  if (!listing || !sourceReport || !output) throw new Error("Usage: select-youtube-receipt-artifacts.mjs <all-pages.json> <source-final.json> <output.tsv>");
  const rows = selectReceiptArtifacts(JSON.parse(fs.readFileSync(listing, "utf8")), JSON.parse(fs.readFileSync(sourceReport, "utf8")));
  fs.writeFileSync(output, rows.map(row => `${row.id}\t${row.name}\n`).join(""));
  console.log(`Selected ${rows.length} exact receipt artifacts from complete pagination`);
}
