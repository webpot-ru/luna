#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const SCRIPT_VERSION = "2026-06-06.v1";
const MANIFEST_PATH = "outputs/oxford-vocabulary/final-150/oxford_150_resplit_manifest_v1.json";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function tryReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function deliveryManifestPath(workbookPath) {
  return workbookPath.replace(/\.xlsx$/i, "_delivery.json");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout.trim()) process.stdout.write(`${result.stdout.trim()}\n`);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }
}

async function shouldSkipUpload(workbookPath, deliveryPath) {
  const manifest = await tryReadJson(deliveryPath);
  if (!manifest?.google_sheet_id || manifest.google_sheet_upload_status !== "uploaded") return false;
  const currentSha = sha256(await readFile(workbookPath));
  return manifest.google_sheet_uploaded_workbook_sha256 === currentSha;
}

async function shouldSkipReadback(workbookPath, deliveryPath) {
  const manifest = await tryReadJson(deliveryPath);
  if (!manifest?.google_sheet_id || manifest.google_sheet_readback_status !== "verified") return false;
  const currentSha = sha256(await readFile(workbookPath));
  return manifest.google_sheet_readback_workbook_sha256 === currentSha;
}

function flattenEditions(masterManifest) {
  const rows = [];
  for (const release of masterManifest.releases ?? []) {
    for (const edition of release.editions ?? []) {
      rows.push({
        release_id: release.release_id,
        title: `${release.title_base} - ${edition.edition}`,
        workbook_path: edition.workbook_path,
        delivery_manifest_path: deliveryManifestPath(edition.workbook_path),
      });
    }
  }
  return rows;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const uploadOnly = args.has("--upload-only");
  const readbackOnly = args.has("--readback-only");
  const masterManifest = await readJson(MANIFEST_PATH);
  const editions = flattenEditions(masterManifest);
  const summary = {
    script_path: "scripts/oxford/upload-and-readback-oxford-150-workbooks.mjs",
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
    manifest_path: MANIFEST_PATH,
    upload_skipped: 0,
    uploaded: 0,
    readback_skipped: 0,
    readback_verified: 0,
    failures: [],
  };

  if (!readbackOnly) {
    for (const edition of editions) {
      if (await shouldSkipUpload(edition.workbook_path, edition.delivery_manifest_path)) {
        summary.upload_skipped += 1;
        continue;
      }
      const existingDelivery = await tryReadJson(edition.delivery_manifest_path);
      const existingFileId = existingDelivery?.google_sheet_id || "";
      console.log(`Uploading ${edition.workbook_path}`);
      const uploadArgs = [
        "scripts/upload-spreadsheet-to-drive-folder.mjs",
        edition.workbook_path,
        `--title=${edition.title}`,
      ];
      if (existingFileId) uploadArgs.push(`--file-id=${existingFileId}`);
      run("node", uploadArgs);
      summary.uploaded += 1;
    }
  }

  if (!uploadOnly) {
    for (const edition of editions) {
      if (await shouldSkipReadback(edition.workbook_path, edition.delivery_manifest_path)) {
        summary.readback_skipped += 1;
        continue;
      }
      console.log(`Readback ${edition.delivery_manifest_path}`);
      run("node", [
        "scripts/oxford/check-oxford-edition-google-sheet-readback-openpyxl.mjs",
        edition.delivery_manifest_path,
      ]);
      summary.readback_verified += 1;
    }
  }

  const verifiedDeliveries = [];
  for (const edition of editions) {
    const delivery = await tryReadJson(edition.delivery_manifest_path);
    verifiedDeliveries.push({
      release_id: edition.release_id,
      workbook_path: edition.workbook_path,
      delivery_manifest_path: edition.delivery_manifest_path,
      google_sheet_id: delivery?.google_sheet_id ?? null,
      google_sheet_url: delivery?.google_sheet_url ?? null,
      google_sheet_title: delivery?.google_sheet_title ?? null,
      google_sheet_readback_status: delivery?.google_sheet_readback_status ?? null,
      google_sheet_readback_sample_count: delivery?.google_sheet_readback_sample_count ?? null,
    });
  }
  const allVerified = verifiedDeliveries.every((item) => item.google_sheet_readback_status === "verified");
  masterManifest.status = allVerified
    ? "final_150_google_sheets_uploaded_readback_verified"
    : "local_or_delivery_incomplete";
  masterManifest.latest_google_sheet_delivery = {
    script_path: "scripts/oxford/upload-and-readback-oxford-150-workbooks.mjs",
    script_version: SCRIPT_VERSION,
    updated_at: new Date().toISOString(),
    all_verified: allVerified,
    delivery_count: verifiedDeliveries.length,
    uploaded_this_run: summary.uploaded,
    upload_skipped_this_run: summary.upload_skipped,
    readback_verified_this_run: summary.readback_verified,
    readback_skipped_this_run: summary.readback_skipped,
    deliveries: verifiedDeliveries,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(masterManifest, null, 2)}\n`, "utf8");

  const summaryPath = path.join("outputs/oxford-vocabulary/final-150", "oxford_150_upload_readback_summary_v1.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: masterManifest.status,
        delivery_count: verifiedDeliveries.length,
        uploaded: summary.uploaded,
        upload_skipped: summary.upload_skipped,
        readback_verified: summary.readback_verified,
        readback_skipped: summary.readback_skipped,
        summary_path: summaryPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
