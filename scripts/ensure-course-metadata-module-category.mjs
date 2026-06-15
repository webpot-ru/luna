#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  assertSafeSetId,
  psqlExec,
  psqlJson,
  sqlLiteralList,
  sqlString,
} from "./lib/qa-utils.mjs";

const projectRoot = process.cwd();
const labelsPath = path.join(projectRoot, "config", "course-metadata-taxonomy-labels.json");
const maxLabelLength = 25;

function parseArgs(argv) {
  const setIds = [];
  let allGenerated = false;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--all-generated") allGenerated = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else setIds.push(arg);
  }

  if (!allGenerated && setIds.length === 0) {
    throw new Error(
      "Usage: node scripts/ensure-course-metadata-module-category.mjs <set_id...> [--dry-run] or --all-generated"
    );
  }
  if (allGenerated && setIds.length > 0) {
    throw new Error("Use either explicit set_id values or --all-generated, not both.");
  }

  for (const setId of setIds) assertSafeSetId(setId);
  return { allGenerated, dryRun, setIds };
}

async function readLabels() {
  const labels = JSON.parse(await readFile(labelsPath, "utf8"));
  if (!labels.version || !Array.isArray(labels.languages)) {
    throw new Error(`Invalid taxonomy label config: ${labelsPath}`);
  }
  return labels;
}

function missingLanguages(labelMap, activeLanguages) {
  return activeLanguages.filter((languageCode) => !labelMap?.[languageCode]?.trim());
}

function longLabels(labelMap, activeLanguages) {
  return activeLanguages
    .map((languageCode) => [languageCode, labelMap?.[languageCode] ?? ""])
    .filter(([, label]) => [...label].length > maxLabelLength);
}

function validateLabelMap(kind, key, labelMap, activeLanguages) {
  const missing = missingLanguages(labelMap, activeLanguages);
  if (missing.length) {
    throw new Error(`Missing ${kind} labels for ${key}: ${missing.join(", ")}`);
  }

  const tooLong = longLabels(labelMap, activeLanguages);
  if (tooLong.length) {
    throw new Error(
      `${kind} labels for ${key} exceed ${maxLabelLength} chars: ${tooLong
        .map(([languageCode, label]) => `${languageCode}=${JSON.stringify(label)}`)
        .join(", ")}`
    );
  }

  const commaLabels = activeLanguages
    .map((languageCode) => [languageCode, labelMap[languageCode]])
    .filter(([, label]) => label.includes(","));
  if (kind === "category" && commaLabels.length) {
    throw new Error(
      `Course Metadata category labels must be short mobile labels without comma-separated scopes: ${commaLabels
        .map(([languageCode, label]) => `${languageCode}=${JSON.stringify(label)}`)
        .join(", ")}`
    );
  }
}

function categoryLabelsForSet(labels, set) {
  const overrideLabels = labels.setCategoryOverrides?.[set.set_id];
  if (overrideLabels) {
    return {
      labels: overrideLabels,
      key: set.set_id,
      source: "setCategoryOverrides",
    };
  }
  return {
    labels: labels.categories?.[set.area],
    key: set.area,
    source: "categories",
  };
}

async function fetchActiveLanguages() {
  const rows = await psqlJson(`
    select coalesce(json_agg(json_build_object('code', code) order by code), '[]'::json)
    from languages
    where is_active
  `);
  if (rows.length !== 54) {
    throw new Error(`Expected 54 active language variants, got ${rows.length}`);
  }
  return rows.map((row) => row.code);
}

async function fetchSets({ allGenerated, setIds }) {
  const whereClause = allGenerated
    ? `
      exists (
        select 1
        from meaning_set_memberships msm
        where msm.set_id = cs.set_id
          and msm.quality_status <> 'blocked'
      )
      and cs.quality_status in ('approved', 'generated_checked')
    `
    : `cs.set_id in (${sqlLiteralList(setIds)})`;

  const rows = await psqlJson(`
    select coalesce(json_agg(row_to_json(q) order by q.set_id), '[]'::json)
    from (
      select
        cs.set_id,
        cs.set_name,
        cs.domain,
        cs.area,
        cs.category,
        cs.quality_status,
        cs.selection_status
      from content_sets cs
      where ${whereClause}
      order by cs.set_id
    ) q
  `);

  if (!rows.length) {
    throw new Error(allGenerated ? "No generated/current content sets found." : "No matching content sets found.");
  }
  return rows;
}

async function fetchLocalizationCoverage(setIds) {
  const rows = await psqlJson(`
    select coalesce(json_agg(row_to_json(q) order by q.set_id, q.language_code), '[]'::json)
    from (
      select set_id, language_code
      from content_set_localizations
      where set_id in (${sqlLiteralList(setIds)})
      order by set_id, language_code
    ) q
  `);
  const present = new Set(rows.map((row) => `${row.set_id}::${row.language_code}`));
  return present;
}

function buildPlan({ sets, labels, activeLanguages, presentLocalizations }) {
  const rows = [];
  for (const set of sets) {
    const moduleLabels = labels.modules?.[set.domain];
    const categoryConfig = categoryLabelsForSet(labels, set);
    const categoryLabels = categoryConfig.labels;

    if (!moduleLabels) {
      throw new Error(`No Course Metadata module labels configured for content_sets.domain=${JSON.stringify(set.domain)} (${set.set_id})`);
    }
    if (!categoryLabels) {
      throw new Error(
        `No Course Metadata category labels configured for content_sets.area=${JSON.stringify(set.area)} (${set.set_id})`
      );
    }

    validateLabelMap("module", set.domain, moduleLabels, activeLanguages);
    validateLabelMap("category", categoryConfig.key, categoryLabels, activeLanguages);

    for (const languageCode of activeLanguages) {
      const localizationKey = `${set.set_id}::${languageCode}`;
      if (!presentLocalizations.has(localizationKey)) {
        throw new Error(`Missing content_set_localizations row for ${localizationKey}; title/description must exist before module/category can be enforced.`);
      }
      rows.push({
        set_id: set.set_id,
        language_code: languageCode,
        module: moduleLabels[languageCode],
        category: categoryLabels[languageCode],
        source_domain: set.domain,
        source_area: set.area,
        category_config_source: categoryConfig.source,
        category_config_key: categoryConfig.key,
      });
    }
  }
  return rows;
}

function valuesSql(rows) {
  return rows
    .map(
      (row) =>
        `(${sqlString(row.set_id)}, ${sqlString(row.language_code)}, ${sqlString(row.module)}, ${sqlString(row.category)}, ${sqlString(row.source_domain)}, ${sqlString(row.source_area)}, ${sqlString(row.category_config_source)}, ${sqlString(row.category_config_key)})`
    )
    .join(",\n");
}

async function applyPlan(rows, { dryRun }) {
  if (dryRun) {
    return { updated: 0, evidence: 0 };
  }

  const passId = `course_metadata_module_category_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const batchId = `course_metadata_module_category_${Date.now()}`;

  const sql = `
    begin;

    create temporary table course_metadata_module_category_updates (
      set_id text not null,
      language_code text not null,
      module text not null,
      category text not null,
      source_domain text not null,
      source_area text not null,
      category_config_source text not null,
      category_config_key text not null
    ) on commit drop;

    insert into course_metadata_module_category_updates (
      set_id,
      language_code,
      module,
      category,
      source_domain,
      source_area,
      category_config_source,
      category_config_key
    )
    values
    ${valuesSql(rows)};

    create temporary table course_metadata_module_category_changed on commit drop as
    with updated as (
      update content_set_localizations csl
      set
        module = u.module,
        category = u.category,
        updated_at = now()
      from course_metadata_module_category_updates u
      where csl.set_id = u.set_id
        and csl.language_code = u.language_code
        and (
          csl.module is distinct from u.module
          or csl.category is distinct from u.category
        )
      returning csl.set_id, csl.language_code
    )
    select set_id, language_code
    from updated;

    select count(*) as updated_rows
    from course_metadata_module_category_changed;

    insert into qa_reviews (
      target_type,
      target_key,
      language_code,
      review_status,
      issue_type,
      notes,
      reviewer,
      reviewed_at,
      pass_id,
      batch_id,
      check_family,
      result_summary,
      source_note,
      evidence,
      checked_value_hash
    )
    select
      'content_set',
      u.set_id || '::course_metadata',
      u.language_code,
      csl.quality_status,
      'metadata_review',
      'Course Metadata Module and Category filled from deck taxonomy labels.',
      'codex-course-metadata-taxonomy-labels',
      now(),
      ${sqlString(passId)},
      ${sqlString(batchId)},
      'metadata_review',
      'Pass: Course Metadata module/category are localized short labels for content_sets.domain/area.',
      'Source: config/course-metadata-taxonomy-labels.json; labels are current-value hashed with Course Metadata.',
      jsonb_build_object(
        'set_id', u.set_id,
        'language_code', u.language_code,
        'module', u.module,
        'category', u.category,
        'source_domain', u.source_domain,
        'source_area', u.source_area,
        'category_config_source', u.category_config_source,
        'category_config_key', u.category_config_key,
        'label_config_version', ${sqlString("course-metadata-taxonomy-labels-v1")}
      ),
      qa_checked_value_hash('content_set', u.set_id || '::course_metadata', u.language_code, 'metadata_review')
    from course_metadata_module_category_updates u
    join content_set_localizations csl
      on csl.set_id = u.set_id
     and csl.language_code = u.language_code
    left join course_metadata_module_category_changed changed
      on changed.set_id = u.set_id
     and changed.language_code = u.language_code
    where csl.quality_status in ('approved', 'generated_checked')
      and (
        changed.set_id is not null
        or not exists (
          select 1
          from qa_reviews qr
          where qr.target_type = 'content_set'
            and qr.target_key = u.set_id || '::course_metadata'
            and qr.language_code = u.language_code
            and qr.check_family = 'metadata_review'
            and qr.review_status in ('approved', 'generated_checked')
            and qr.checked_value_hash = qa_checked_value_hash('content_set', u.set_id || '::course_metadata', u.language_code, 'metadata_review')
        )
      );

    commit;
  `;

  await psqlExec(sql);
  return { updated: rows.length, evidence: rows.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const labels = await readLabels();
  const activeDbLanguages = await fetchActiveLanguages();

  const activeDbLanguageSet = new Set(activeDbLanguages);
  const configLanguages = new Set(labels.languages);
  const missingInConfig = activeDbLanguages.filter((languageCode) => !configLanguages.has(languageCode));
  if (missingInConfig.length) {
    throw new Error(`Label config missing active languages: ${missingInConfig.join(", ")}`);
  }
  const inactiveInConfig = labels.languages.filter((languageCode) => !activeDbLanguageSet.has(languageCode));
  if (inactiveInConfig.length) {
    throw new Error(`Label config contains languages that are not active in DB: ${inactiveInConfig.join(", ")}`);
  }

  const activeLanguages = labels.languages;

  const sets = await fetchSets(args);
  const presentLocalizations = await fetchLocalizationCoverage(sets.map((set) => set.set_id));
  const plan = buildPlan({ sets, labels, activeLanguages, presentLocalizations });
  const result = await applyPlan(plan, args);

  console.log(
    JSON.stringify(
      {
        ok: true,
        dry_run: args.dryRun,
        set_count: sets.length,
        localization_rows: plan.length,
        evidence_rows: args.dryRun ? 0 : result.evidence,
        sets: sets.map((set) => ({
          set_id: set.set_id,
          domain: set.domain,
          area: set.area,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
