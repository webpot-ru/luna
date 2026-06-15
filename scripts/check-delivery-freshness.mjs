#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson } from "./lib/qa-utils.mjs";

const setIds = process.argv.slice(2);
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-delivery-freshness.mjs <set_id> [<set_id> ...]");
}
for (const setId of setIds) assertSafeSetId(setId);

const outputDir = path.resolve("outputs/google-sheets");

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function loadDeliveryManifest(setId) {
  const files = await readdir(outputDir);
  const manifests = [];
  for (const file of files.filter((name) => name.endsWith("_final_delivery.json"))) {
    const manifestPath = path.join(outputDir, file);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (manifest.set_id === setId) manifests.push({ manifestPath, manifest });
  }
  if (manifests.length !== 1) {
    throw new Error(`Expected exactly one final delivery manifest for ${setId}, got ${manifests.length}`);
  }
  return manifests[0];
}

const freshnessRows = await psqlJson(`
with requested(set_id) as (
  values ${setIds.map((setId) => `('${setId.replace(/'/g, "''")}')`).join(", ")}
),
scoped_reviews as (
  select
    r.set_id,
    max(qr.created_at) as latest_review_created_at,
    max(qr.reviewed_at) as latest_reviewed_at
  from requested r
  join qa_reviews qr
    on (
      qr.target_key = r.set_id
      or qr.target_key = r.set_id || '::course_metadata'
      or qr.target_key like r.set_id || '::%'
      or (
        qr.target_type = 'meaning_language_entry'
        and exists (
          select 1
          from meaning_set_memberships msm
          where msm.set_id = r.set_id
            and msm.meaning_id = qr.target_key
        )
      )
      or (
        qr.target_type = 'meaning_example'
        and exists (
          select 1
          from meaning_examples e
          where e.set_id = r.set_id
            and e.example_id::text = qr.target_key
        )
      )
    )
  group by r.set_id
),
row_updates as (
  select r.set_id, max(t.updated_at) as latest_updated_at
  from requested r
  join (
    select set_id, updated_at from content_sets
    union all
    select set_id, updated_at from content_set_localizations
    union all
    select set_id, updated_at from meaning_set_memberships
    union all
    select e.set_id, e.updated_at from meaning_examples e
    union all
    select msm.set_id, mu.updated_at
    from meaning_set_memberships msm
    join meaning_units mu on mu.meaning_id = msm.meaning_id
    union all
    select msm.set_id, le.updated_at
    from meaning_set_memberships msm
    join meaning_language_entries le on le.meaning_id = msm.meaning_id
    union all
    select e.set_id, et.updated_at
    from meaning_examples e
    join meaning_example_translations et on et.example_id = e.example_id
  ) t on t.set_id = r.set_id
  group by r.set_id
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    r.set_id,
    greatest(
      coalesce(ru.latest_updated_at, '-infinity'::timestamptz),
      coalesce(sr.latest_review_created_at, '-infinity'::timestamptz),
      coalesce(sr.latest_reviewed_at, '-infinity'::timestamptz)
    ) as latest_db_change_at
  from requested r
  left join row_updates ru on ru.set_id = r.set_id
  left join scoped_reviews sr on sr.set_id = r.set_id
  order by r.set_id
) rows;
`);
const latestDbChangeBySet = new Map(freshnessRows.map((row) => [row.set_id, row.latest_db_change_at]));

const blockers = [];
for (const setId of setIds) {
  const { manifestPath, manifest } = await loadDeliveryManifest(setId);
  const workbookPath = manifest.workbook_path ? path.resolve(manifest.workbook_path) : "";
  const currentWorkbookSha = workbookPath ? await sha256File(workbookPath) : "";
  const latestDbChangeAt = latestDbChangeBySet.get(setId);
  const exportedAt = Date.parse(manifest.exported_at ?? "");
  const uploadedAt = Date.parse(manifest.google_sheet_uploaded_at ?? "");
  const readbackAt = Date.parse(manifest.google_sheet_readback_verified_at ?? "");
  const latestDbAt = Date.parse(latestDbChangeAt ?? "");

  if (manifest.export_mode !== "final") blockers.push(`${setId}: manifest export_mode is not final (${manifest.export_mode})`);
  if (manifest.final_ready !== true) blockers.push(`${setId}: manifest final_ready is not true`);
  if (manifest.google_sheet_upload_status !== "uploaded") blockers.push(`${setId}: Google Sheet upload status is ${manifest.google_sheet_upload_status}`);
  if (manifest.google_sheet_verified_in_folder !== true) blockers.push(`${setId}: Google Sheet is not verified in folder`);
  if (manifest.google_sheet_matches_current_workbook !== true) blockers.push(`${setId}: Google Sheet is marked stale vs workbook`);
  if (manifest.google_sheet_readback_status !== "verified") {
    blockers.push(`${setId}: Google Sheet readback status is ${manifest.google_sheet_readback_status ?? "missing"}`);
  }
  if (!manifest.workbook_sha256) blockers.push(`${setId}: manifest missing workbook_sha256`);
  if (!manifest.google_sheet_uploaded_workbook_sha256) blockers.push(`${setId}: manifest missing google_sheet_uploaded_workbook_sha256`);
  if (!manifest.google_sheet_readback_workbook_sha256) blockers.push(`${setId}: manifest missing google_sheet_readback_workbook_sha256`);
  if (manifest.workbook_sha256 && manifest.workbook_sha256 !== currentWorkbookSha) {
    blockers.push(`${setId}: manifest workbook_sha256 does not match current workbook file`);
  }
  if (manifest.google_sheet_uploaded_workbook_sha256 && manifest.google_sheet_uploaded_workbook_sha256 !== currentWorkbookSha) {
    blockers.push(`${setId}: uploaded workbook hash does not match current workbook file`);
  }
  if (manifest.google_sheet_readback_workbook_sha256 && manifest.google_sheet_readback_workbook_sha256 !== currentWorkbookSha) {
    blockers.push(`${setId}: readback workbook hash does not match current workbook file`);
  }
  if (Number.isFinite(latestDbAt) && Number.isFinite(exportedAt) && latestDbAt > exportedAt) {
    blockers.push(`${setId}: DB/QA changed after final export (${latestDbChangeAt} > ${manifest.exported_at})`);
  }
  if (Number.isFinite(exportedAt) && Number.isFinite(uploadedAt) && exportedAt > uploadedAt) {
    blockers.push(`${setId}: final workbook was exported after Google Sheet upload`);
  }
  if (Number.isFinite(uploadedAt) && Number.isFinite(readbackAt) && uploadedAt > readbackAt) {
    blockers.push(`${setId}: Google Sheet upload is newer than readback verification`);
  }
  if (Number.isFinite(exportedAt) && Number.isFinite(readbackAt) && exportedAt > readbackAt) {
    blockers.push(`${setId}: final workbook was exported after Google Sheet readback`);
  }
  if (!Number.isFinite(readbackAt)) blockers.push(`${setId}: manifest missing google_sheet_readback_verified_at`);
  if (!workbookPath) blockers.push(`${setId}: manifest ${manifestPath} missing workbook_path`);
}

if (blockers.length > 0) {
  console.error(`Delivery freshness check failed: ${blockers.length} blocker(s).`);
  for (const blocker of blockers) console.error(blocker);
  process.exit(1);
}

console.log(`Delivery freshness OK for ${setIds.join(", ")}: final workbook hashes and Google Sheet upload manifests are current.`);
