import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function selectPolyglotAfterOrdinary({ route, ordinary, polyglot, jobs }) {
  assert.match(route, /^youtube-[1-4]$/);
  assert(ordinary.every(row => row.route_key === route));
  assert(polyglot.every(row => row.route_key === route));
  const completed = new Set();
  const ordinarySupports = new Set(ordinary.map(row => row.support));
  assert.equal(ordinarySupports.size, ordinary.length);
  for (const support of ordinarySupports) {
    const prefix = `routes (${route}) / ordinary (${support},`;
    const matches = jobs.filter(job => job.name.startsWith(prefix) && job.name.endsWith(" / youtube-video-publish"));
    assert.equal(matches.length, 1, `Expected exactly one ordinary worker for ${route}/${support}`);
    const [job] = matches;
    assert.equal(job.status, "completed", `Ordinary worker not terminal for ${route}/${support}`);
    if (job.conclusion === "success" && job.steps.some(step =>
      step.name === "Upload videos to YouTube" && step.conclusion === "success")) {
      completed.add(support);
    }
  }
  return polyglot.filter(row => !ordinarySupports.has(row.support) || completed.has(row.support));
}

function main() {
  const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt,
    GITHUB_OUTPUT: output, ROUTE_KEY: route, ORDINARY_MATRIX, POLYGLOT_MATRIX } = process.env;
  assert.match(repo || "", /^[\w.-]+\/[\w.-]+$/);
  assert.match(run || "", /^[1-9]\d*$/);
  assert.match(attempt || "", /^[1-9]\d*$/);
  const ordinary = JSON.parse(ORDINARY_MATRIX).include;
  const polyglot = JSON.parse(POLYGLOT_MATRIX).include;
  let jobs = [];
  if (ordinary.length) {
    const pages = JSON.parse(execFileSync("gh", ["api", "--paginate", "--slurp",
      `repos/${repo}/actions/runs/${run}/attempts/${attempt}/jobs?per_page=100`], {
      encoding: "utf8",
      maxBuffer: 24 * 1024 * 1024,
    }));
    jobs = pages.flatMap(page => page.jobs);
    assert.equal(jobs.length, pages[0].total_count, "Incomplete job inventory");
    assert.equal(new Set(jobs.map(job => job.id)).size, jobs.length, "Duplicate worker IDs");
  }
  const include = selectPolyglotAfterOrdinary({ route, ordinary, polyglot, jobs });
  appendFileSync(output, `count=${include.length}\nmatrix=${JSON.stringify({ include })}\n`);
  console.log(`Eligible Polyglot channels: ${include.length}/${polyglot.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
