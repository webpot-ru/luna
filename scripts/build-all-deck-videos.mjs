#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDbLanguageCode, normalizeLanguageCode } from "./lib/video-language-codes.mjs";
import { BRAND_NAME } from "./lib/brand.mjs";
import { shardItems } from "./lib/work-shards.mjs";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Database configuration
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

async function psqlJson(sql) {
  const { stdout } = await execFileAsync("psql", [databaseUrl, "-tA", "-c", sql], { maxBuffer: 1024 * 1024 * 10 });
  return JSON.parse(stdout.trim() || "[]");
}

function getDeckName(setId) {
  // Simple mapping or capitalize words
  return setId
    .replace(/^(home|core|food|park)_/, "")
    .replace(/_a1_a2|_a1|_a2|_b1|_pilot_\d+$/, "")
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isRowInRegistry(setId, lang, supportLang) {
  try {
    const registryPath = path.resolve("docs/video-lessons-registry.md");
    if (!fs.existsSync(registryPath)) return false;
    const content = fs.readFileSync(registryPath, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/\|\s*\d+\s*\|\s*`([^`]+)`\s*\|[^|]*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
      if (match) {
        if (match[1].trim() === setId && match[2].trim() === lang && match[3].trim() === supportLang) {
          return true;
        }
      }
    }
  } catch (e) {
    console.error("Failed to check registry row:", e.message);
  }
  return false;
}

let registryPromise = Promise.resolve();

function appendToRegistry(setId, lang, supportLang, transition, quizLimit) {
  registryPromise = registryPromise.then(() => {
    try {
      if (isRowInRegistry(setId, lang, supportLang)) {
        return;
      }
      
      const registryPath = path.resolve("docs/video-lessons-registry.md");
      if (!fs.existsSync(registryPath)) return;
      
      const content = fs.readFileSync(registryPath, "utf8");
      const lines = content.split("\n");
      
      let maxNum = 0;
      for (const line of lines) {
        const match = line.match(/^\|\s*(\d+)\s*\|/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum + 1;
      const deckName = getDeckName(setId);
      const today = new Date().toISOString().split('T')[0];
      
      const newRow = `| ${nextNum} | \`${setId}\` | ${deckName} | ${lang} | ${supportLang} | ${today} | \`--transition ${transition} --quiz-limit ${quizLimit}\` | \`Pending\` | *Ожидает публикации* |`;
      
      let lastRegistryIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(setId)) {
          lastRegistryIndex = i;
        }
      }
      
      if (lastRegistryIndex !== -1) {
        lines.splice(lastRegistryIndex + 1, 0, newRow);
        fs.writeFileSync(registryPath, lines.join("\n"), "utf8");
        console.log(`[REGISTRY] Registered lesson ${nextNum} for ${lang}`);
      } else {
        // Find the end of the table
        let tableEndIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("|") && lines[i].includes("Pending")) {
            tableEndIndex = i;
          }
        }
        if (tableEndIndex !== -1) {
          lines.splice(tableEndIndex + 1, 0, newRow);
          fs.writeFileSync(registryPath, lines.join("\n"), "utf8");
          console.log(`[REGISTRY] Registered lesson ${nextNum} for ${lang}`);
        }
      }
    } catch (e) {
      console.error(`Failed to update registry for ${lang}:`, e.message);
    }
  });
  return registryPromise;
}

async function runBuild({ setId, targetLang, supportLang, transition, quizLimit }) {
  const cmd = `node scripts/build-deck-video.mjs --set ${setId} --target ${targetLang} --support ${supportLang} --quiz-limit ${quizLimit} --transition ${transition}`;
  console.log(`[START] Compiling video: ${targetLang} (support: ${supportLang})`);
  const start = Date.now();
  try {
    await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[SUCCESS] Compiled ${targetLang} in ${duration}s.`);
    await appendToRegistry(setId, targetLang, supportLang, transition, quizLimit);
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`[ERROR] Failed ${targetLang} after ${duration}s: ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let setId = "";
  let supportLang = "RU";
  let concurrencyLimit = 2;
  let quizLimit = 3;
  let transition = "flip";
  let selectedLangs = null;
  let shardCount = 1;
  let shardIndex = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--set" && args[i + 1]) {
      setId = args[i + 1];
      i++;
    } else if (args[i] === "--support" && args[i + 1]) {
      supportLang = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrencyLimit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--quiz-limit" && args[i + 1]) {
      quizLimit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--transition" && args[i + 1]) {
      transition = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === "--langs" && args[i + 1]) {
      selectedLangs = args[i + 1].toUpperCase().split(",");
      i++;
    } else if (args[i] === "--shard-count" && args[i + 1]) {
      shardCount = Number(args[i + 1]);
      i++;
    } else if (args[i] === "--shard-index" && args[i + 1]) {
      shardIndex = Number(args[i + 1]);
      i++;
    }
  }

  if (!setId) {
    console.error("Usage: node scripts/build-all-deck-videos.mjs --set <set_id> [--support <support_lang>] [--concurrency <N>] [--quiz-limit <N>] [--transition <static|flip>] [--langs <LANG1,LANG2,...>] [--shard-count <N> --shard-index <0-based>]");
    process.exit(1);
  }

  console.log(`=== ${BRAND_NAME} Bulk Video Generator ===`);
  console.log(`Set ID:        ${setId}`);
  console.log(`Support Lang:  ${supportLang}`);
  console.log(`Concurrency:   ${concurrencyLimit}`);
  console.log(`Shard:         ${shardIndex}/${shardCount}`);
  console.log(`Quiz Limit:    ${quizLimit}`);
  console.log(`Transition:    ${transition}`);
  console.log(`======================================`);

  const supportDbLang = getDbLanguageCode(supportLang);

  // Resolve target languages: read from offline JSON if available, otherwise query Postgres
  const jsonPath = path.resolve(`data/decks/${setId}.json`);
  let languages = [];

  if (fs.existsSync(jsonPath)) {
    console.log(`[OFFLINE] Reading target languages from offline JSON: ${jsonPath}`);
    try {
      const deckData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const supportKey = deckData.cards?.[supportLang] ? supportLang : supportDbLang;
      if (deckData.cards?.[supportKey]) {
        languages = Object.keys(deckData.cards[supportKey])
          .map(code => normalizeLanguageCode(code))
          .filter(code => getDbLanguageCode(code) !== supportDbLang);
      } else {
        console.warn(`Warning: support language "${supportLang}" has no target languages in offline JSON.`);
      }
    } catch (err) {
      console.error(`Failed to parse offline JSON data: ${err.message}`);
    }
  }

  if (languages.length === 0) {
    console.log("Fetching target languages from Postgres database...");
    const sql = `
      select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
        select distinct language_code 
        from meaning_language_entries
        where meaning_id in (
          select meaning_id from meaning_set_memberships 
          where set_id = '${setId}'
        )
        and language_code <> '${supportDbLang}'
        order by language_code
      ) rows;
    `;
    try {
      const rows = await psqlJson(sql);
      languages = rows.map(r => r.language_code);
    } catch (e) {
      console.error("Database query failed:", e.message);
      process.exit(1);
    }
  }

  if (languages.length === 0) {
    console.error(`Error: No translations found for set_id: ${setId}`);
    process.exit(1);
  }

  if (selectedLangs) {
    languages = languages.filter(l => selectedLangs.includes(l));
  }
  const shard = shardItems(languages, { shardCount, shardIndex });
  languages = shard.selectedItems;

  fs.mkdirSync(path.resolve("outputs/video-generator"), { recursive: true });
  const shardManifestPath = path.resolve(`outputs/video-generator/${setId}_${supportLang.toLowerCase()}_video_build_shard_${shardIndex}_of_${shardCount}.json`);
  fs.writeFileSync(shardManifestPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    phase: "video_build",
    setId,
    supportLang,
    shardCount,
    shardIndex,
    inputTargetCount: shard.allItems.length,
    selectedTargetCount: shard.selectedItems.length,
    skippedTargetCount: shard.skippedItems.length,
    selectedTargets: shard.selectedItems,
    skippedTargets: shard.skippedItems,
  }, null, 2)}\n`, "utf8");

  console.log(`Found ${shard.allItems.length} target languages before sharding: ${shard.allItems.join(", ")}`);
  console.log(`Shard selected ${languages.length} target languages to compile: ${languages.join(", ") || "(none)"}`);
  console.log(`Shard manifest: ${shardManifestPath}`);
  if (languages.length === 0) {
    console.log("No target languages assigned to this shard. Exiting successfully.");
    return;
  }
  
  const globalStart = Date.now();
  const queue = [...languages];
  const workers = [];

  async function worker() {
    while (queue.length > 0) {
      const targetLang = queue.shift();
      
      // Check if video already exists and is registered
      const videoPath = path.resolve(`outputs/video-generator/${setId}_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}/lesson_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}.mp4`);
      const fileExists = fs.existsSync(videoPath) && fs.statSync(videoPath).size > 1024 * 1024;
      const registered = isRowInRegistry(setId, targetLang, supportLang);
      
      if (fileExists && registered) {
        console.log(`[SKIP] Already compiled and registered: ${targetLang} (support: ${supportLang})`);
        continue;
      }
      
      if (fileExists && !registered) {
        console.log(`[SKIP] Already compiled, registering in registry: ${targetLang} (support: ${supportLang})`);
        await appendToRegistry(setId, targetLang, supportLang, transition, quizLimit);
        continue;
      }
      
      await runBuild({ setId, targetLang, supportLang, transition, quizLimit });
    }
  }

  for (let i = 0; i < concurrencyLimit; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  
  const totalDuration = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
  console.log(`\n🎉 Bulk generation complete! Total time: ${totalDuration} minutes.`);
}

main().catch(console.error);
