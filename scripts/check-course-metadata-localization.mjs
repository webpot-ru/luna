#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  buildCourseMetadataLocalizationFindings,
  formatCourseMetadataLocalizationFinding,
} from "./lib/course-metadata-localization.mjs";

const execFileAsync = promisify(execFile);
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";
const projectRoot = process.cwd();
const taxonomyLabelsPath = path.join(projectRoot, "config", "course-metadata-taxonomy-labels.json");

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  console.error("Usage: node scripts/check-course-metadata-localization.mjs <set_id> [<set_id> ...]");
  process.exit(1);
}

for (const setId of setIds) {
  if (!/^[a-z0-9_]+$/u.test(setId)) {
    throw new Error(`Unsafe set_id: ${setId}`);
  }
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const sql = `
select coalesce(jsonb_agg(set_payload order by set_id), '[]'::jsonb)
from (
  select
    cs.set_id,
    cs.domain,
    cs.area,
    jsonb_object_agg(
      l.spreadsheet_code,
      jsonb_build_object(
        'title', csl.title,
        'description', csl.description,
        'level_signal', csl.level_signal,
        'module', csl.module,
        'category', csl.category
      )
    ) as metadata
  from content_sets cs
  join content_set_localizations csl on csl.set_id = cs.set_id
  join languages l on l.code = csl.language_code and l.is_active
  where cs.set_id in (${setIds.map(sqlString).join(", ")})
  group by cs.set_id, cs.domain, cs.area
) set_payload;
`;

const taxonomyLabels = JSON.parse(await readFile(taxonomyLabelsPath, "utf8"));
const { stdout } = await execFileAsync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql], {
  maxBuffer: 1024 * 1024 * 16,
});

function categoryLabelsForDeck(deck) {
  const overrideLabels = taxonomyLabels.setCategoryOverrides?.[deck.set_id];
  if (overrideLabels) {
    return {
      labels: overrideLabels,
      key: deck.set_id,
      source: "setCategoryOverrides",
    };
  }
  return {
    labels: taxonomyLabels.categories?.[deck.area],
    key: deck.area,
    source: "categories",
  };
}

const payload = JSON.parse(stdout.trim() || "[]");
const findings = [];

for (const deck of payload) {
  const raw = deck.metadata ?? {};
  const courseMetadata = {
    title: Object.fromEntries(Object.entries(raw).map(([code, row]) => [code, row.title ?? ""])),
    description: Object.fromEntries(Object.entries(raw).map(([code, row]) => [code, row.description ?? ""])),
    levelSignal: Object.fromEntries(Object.entries(raw).map(([code, row]) => [code, row.level_signal ?? ""])),
    module: Object.fromEntries(Object.entries(raw).map(([code, row]) => [code, row.module ?? ""])),
    category: Object.fromEntries(Object.entries(raw).map(([code, row]) => [code, row.category ?? ""])),
  };
  findings.push(...buildCourseMetadataLocalizationFindings(courseMetadata, { setId: deck.set_id }));

  const expectedModules = taxonomyLabels.modules?.[deck.domain];
  const categoryConfig = categoryLabelsForDeck(deck);
  const expectedCategories = categoryConfig.labels;
  if (!expectedModules) {
    findings.push({
      issue_type: "course_metadata_missing_module_label_config",
      set_id: deck.set_id,
      language_code: "",
      field: "module",
      value: deck.domain,
      message: `No Course Metadata module labels configured for domain ${JSON.stringify(deck.domain)}.`,
    });
  }
  if (!expectedCategories) {
    findings.push({
      issue_type: "course_metadata_missing_category_label_config",
      set_id: deck.set_id,
      language_code: "",
      field: "category",
      value: categoryConfig.key,
      message: `No Course Metadata category labels configured for ${categoryConfig.source}:${JSON.stringify(categoryConfig.key)}.`,
    });
  }

  for (const [code, row] of Object.entries(raw)) {
    const expectedModule = expectedModules?.[code] ?? "";
    const expectedCategory = expectedCategories?.[code] ?? "";
    if (expectedModule && (row.module ?? "") !== expectedModule) {
      findings.push({
        issue_type: "course_metadata_module_label_mismatch",
        set_id: deck.set_id,
        language_code: code,
        field: "module",
        value: row.module ?? "",
        expected_value: expectedModule,
        message: `${code} Course Metadata module must match taxonomy label config for ${JSON.stringify(deck.domain)}.`,
      });
    }
    if (expectedCategory && (row.category ?? "") !== expectedCategory) {
      findings.push({
        issue_type: "course_metadata_category_label_mismatch",
        set_id: deck.set_id,
        language_code: code,
        field: "category",
        value: row.category ?? "",
        expected_value: expectedCategory,
        message: `${code} Course Metadata category must match taxonomy label config ${categoryConfig.source}:${JSON.stringify(categoryConfig.key)}.`,
      });
    }
  }
}

if (findings.length > 0) {
  console.error(`Course Metadata localization failed: ${findings.length} blocker(s)`);
  for (const finding of findings) {
    console.error(`- ${formatCourseMetadataLocalizationFinding(finding)}`);
  }
  process.exit(1);
}

console.log(`Course Metadata localization OK: ${setIds.join(", ")}`);
