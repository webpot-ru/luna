import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList, sqlString } from "./lib/qa-utils.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";

const [setIdArg, ...args] = process.argv.slice(2);
const setId = setIdArg ?? "home_kitchen_cookware_pilot_01";
const languageArg = args.find((arg) => arg.startsWith("--languages="))?.split("=")[1] ?? "all";

assertSafeSetId(setId);

const activeDbCodes = languageOrderRecords.map((record) => record.dbCode);
const languageCodes =
  languageArg === "all"
    ? activeDbCodes
    : languageArg
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean);

const invalidLanguageCodes = languageCodes.filter((code) => !activeDbCodes.includes(code));
if (invalidLanguageCodes.length > 0) {
  throw new Error(`Unknown active DB language code(s): ${invalidLanguageCodes.join(", ")}`);
}

const sql = `
with context_examples as (
  select
    msm.display_order,
    e.example_id,
    e.meaning_id,
    e.canonical_example_en,
    e.semantic_scene
  from meaning_examples e
  join meaning_set_memberships msm
    on msm.meaning_id = e.meaning_id
   and msm.set_id = e.set_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
    and msm.quality_status <> 'blocked'
)
select coalesce(json_agg(row_to_json(batch_rows)), '[]'::json)
from (
  select
    ${sqlString(setId)} as set_id,
    ce.meaning_id,
    ce.example_id,
    ${sqlString(setId)} || '::' || ce.meaning_id || '::' || ce.example_id::text as context_example_key,
    et.language_code,
    ce.canonical_example_en as source_example_en,
    et.example_text as target_example,
    ce.semantic_scene
  from context_examples ce
  join meaning_example_translations et on et.example_id = ce.example_id
  where et.language_code in (${sqlLiteralList(languageCodes)})
  order by ce.display_order, et.language_code
) batch_rows;
`;

const rows = await psqlJson(sql);
const outputDir = path.resolve("outputs/qa");
const languageLabel = languageArg === "all" ? "all" : languageCodes.join("-");
const outputPath = path.join(outputDir, `semantic_qa_${setId}_${languageLabel}.jsonl`);
const payload = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, payload, "utf8");

console.log(outputPath);
console.log(`Semantic QA batch rows: ${rows.length}`);
