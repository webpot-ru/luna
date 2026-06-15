#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId =
  args.get("release") ??
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/license");
const reviewId = "license_attribution_review_v1";
const jsonPath = path.join(outputDir, `${releaseId}_${reviewId}.json`);
const mdPath = path.join(outputDir, `${releaseId}_${reviewId}.md`);

const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
if (contract.course?.first_release_id !== releaseId) {
  throw new Error(`Contract release mismatch: ${contract.course?.first_release_id} !== ${releaseId}`);
}

const review = {
  release_id: releaseId,
  review_id: reviewId,
  generated_at: new Date().toISOString(),
  status: "accepted_with_attribution_and_sharealike_packaging",
  decision_scope: "English Core 3000 first release source-list and level/POS crosscheck packaging.",
  user_approval: {
    date: "2026-05-05",
    source: "chat",
    instruction: "делай",
    interpreted_as: "Approve closing the remaining license/share-alike and attribution packaging warning before final delivery build.",
  },
  legal_note: "Operational packaging decision, not legal advice. Keep source notices visible in final workbook metadata and release package.",
  sources: [
    {
      source_id: "ngsl_1_2",
      role: "primary source-list candidate",
      official_page: "https://www.newgeneralservicelist.com/new-general-service-list",
      official_terms_snapshot: [
        "NGSL page identifies NGSL 1.2 as a 2809-word list.",
        "NGSL page lists citation guidance for the New General Service List.",
        "NGSL page states New General Service List by Browne, Culligan and Phillips is licensed under CC BY-SA 4.0.",
      ],
      license: "CC-BY-SA-4.0",
      license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
      required_release_notice:
        "New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under CC BY-SA 4.0. Retrieved from https://www.newgeneralservicelist.com/new-general-service-list.",
      packaging_decision:
        "Include attribution, license URL, change notice and ShareAlike notice in _source_contract/_source_snapshot/_release_metadata. Do not imply NGSL endorsement.",
    },
    {
      source_id: "cefr_j_wordlist",
      role: "level and POS crosscheck",
      official_page: "https://www.cefr-j.org/download.html",
      official_terms_snapshot: [
        "CEFR-J download page lists CEFR-J Wordlist Version 1.6.",
        "CEFR-J page states the wordlist belongs to Tono Laboratory at TUFS and can be used for research and commercial purposes with proper acknowledgement.",
        "CEFR-J page provides the citation: The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies.",
      ],
      required_release_notice:
        "The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from https://www.cefr-j.org/download.html.",
      packaging_decision:
        "Include acknowledgement/citation in _source_contract/_source_snapshot/_release_metadata. Use as level/POS crosscheck, not as official CEFR-J endorsement.",
    },
    {
      source_id: "oxford_3000_5000",
      role: "benchmark only",
      official_page: "https://www.oxfordlearnersdictionaries.com/about/oxford3000",
      packaging_decision:
        "Do not use Oxford as source data. Do not copy definitions, examples, pronunciations, exact order, level labels or official/certified/endorsed claims.",
    },
  ],
  final_workbook_required_service_sheet_entries: [
    {
      sheet: "_source_contract",
      requirement: "Include source IDs, roles, URLs, license/terms notes, required notices and no-endorsement note.",
    },
    {
      sheet: "_source_snapshot",
      requirement: "Include snapshot hashes, retrieval dates and normalized source file metadata.",
    },
    {
      sheet: "_release_metadata",
      requirement: "Include CC-BY-SA 4.0 notice for NGSL, CEFR-J acknowledgement and change/original-content note.",
    },
  ],
  blocked_claims: ["Oxford", "official", "certified", "endorsed"],
  no_postgres_changes: true,
  google_sheet_created: false,
  delivery_approved: false,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(review, null, 2)}\n`);

await fs.writeFile(
  mdPath,
  [
    `# English Core 3000 License Attribution Review v1`,
    ``,
    `Release: \`${releaseId}\``,
    ``,
    `Status: \`${review.status}\``,
    ``,
    `This is an operational packaging decision, not legal advice. It closes the source attribution/share-alike readiness warning for the first release, while keeping final Google Sheet delivery separately approved.`,
    ``,
    `## Required Notices`,
    ``,
    `- NGSL: ${review.sources[0].required_release_notice}`,
    `- CEFR-J: ${review.sources[1].required_release_notice}`,
    ``,
    `## Packaging Rules`,
    ``,
    `- Include source IDs, URLs, license/terms notes, attribution notices, change/original-content note and no-endorsement note in final service sheets.`,
    `- Do not use Oxford as source data and do not make official/certified/endorsed claims.`,
    `- Keep NGSL CC BY-SA 4.0 ShareAlike notice visible in release metadata.`,
    ``,
    `## State`,
    ``,
    `- no_postgres_changes: \`${review.no_postgres_changes}\``,
    `- google_sheet_created: \`${review.google_sheet_created}\``,
    `- delivery_approved: \`${review.delivery_approved}\``,
    ``,
  ].join("\n")
);

console.log(
  `English Core 3000 license attribution review written: ${path.relative(process.cwd(), jsonPath)} status=${review.status}`
);
