#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fetchDeckCards, fetchDeckTitle } from "./lib/video-generator.mjs";
import { psqlJson } from "./lib/qa-utils.mjs";

async function main() {
  const setId = process.argv[2] || "home_kitchen_cookware_pilot_01";
  
  // Get all unique languages from the database
  const langsSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select distinct language_code 
      from meaning_language_entries 
      where language_code is not null and language_code <> ''
    ) rows;
  `;
  const langsResult = await psqlJson(langsSql);
  const allLangs = langsResult.map(r => r.language_code.toUpperCase());
  
  console.log(`Exporting deck data for ${setId}...`);
  
  const deckData = {
    setId,
    titles: {},
    cards: {} // keyed by supportLang -> targetLang
  };
  
  // 1. Export titles for all languages
  for (const lang of allLangs) {
    try {
      const title = await fetchDeckTitle(setId, lang);
      deckData.titles[lang] = title;
    } catch (e) {
      console.warn(`Failed to export title for ${lang}:`, e.message);
    }
  }
  
  // 2. Export cards for all combinations of support and target languages
  const supportLangs = ["RU", "EN", "ES", "ES-419", "TR", "KO", "JA", "PT", "PT-BR", "HI"];
  
  for (const supportLang of supportLangs) {
    deckData.cards[supportLang] = {};
    for (const targetLang of allLangs) {
      if (targetLang === supportLang) continue;
      try {
        const cards = await fetchDeckCards(setId, targetLang, supportLang);
        if (cards && cards.length > 0) {
          deckData.cards[supportLang][targetLang] = cards;
        }
      } catch (e) {
        console.error(`Failed to export cards for ${supportLang} -> ${targetLang}:`, e.message);
      }
    }
    console.log(`Finished exporting support lang: ${supportLang}`);
  }
  
  const outputDir = path.resolve("data/decks");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${setId}.json`),
    JSON.stringify(deckData, null, 2),
    "utf8"
  );
  console.log(`Exported successfully to data/decks/${setId}.json`);
}

main().catch(console.error);
