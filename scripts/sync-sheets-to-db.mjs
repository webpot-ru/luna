#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const tokenFile = path.resolve("c:/Users/ramil/Desktop/luna/.secrets/google-oauth-token.json");
const databaseUrl = "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";
const filesFile = path.resolve("c:/Users/ramil/Desktop/luna/outputs/drive_files_list.json");

const sets = [
  {set_id: 'home_bathroom_essentials_a1', name: 'Bathroom Essentials', slug: 'home-bathroom-essentials'},
  {set_id: 'home_furniture_basics_a1', name: 'Furniture Basics', slug: 'home-furniture-basics'},
  {set_id: 'home_kitchen_small_tools_supplies_a2', name: 'Kitchen Small Tools & Supplies', slug: 'home-kitchen-small-tools-supplies'},
  {set_id: 'home_living_room_basics_a1', name: 'Living Room Basics', slug: 'home-living-room-basics'},
  {set_id: 'home_kitchen_cooking_actions_a1_a2', name: 'Cooking Actions', slug: 'home-kitchen-cooking-actions'},
  {set_id: 'home_kitchen_storage_cleaning_a2', name: 'Kitchen Storage & Cleaning', slug: 'home-kitchen-storage-cleaning'},
  {set_id: 'home_kitchen_cookware_pilot_01', name: 'Kitchenware Basics', slug: 'home-kitchen-kitchenware-basics'},
  {set_id: 'home_entryway_outerwear_a1', name: 'Entryway & Outerwear', slug: 'home-entryway-outerwear'},
  {set_id: 'home_bedroom_basics_a1', name: 'Bedroom Basics', slug: 'home-bedroom-basics'},
  {set_id: 'home_office_desk_a1_a2', name: 'Home Office & Desk', slug: 'home-office-desk'},
  {set_id: 'core_numbers_counting_a1', name: 'Numbers & Counting', slug: 'numbers-counting'},
  {set_id: 'home_structure_exterior_a1_a2', name: 'Home Structure & Exterior', slug: 'home-structure-exterior'},
  {set_id: 'core_colors_shapes_a1', name: 'Colors & Shapes', slug: 'colors-shapes'},
  {set_id: 'home_dining_room_table_setup_a1_a2', name: 'Dining Room & Table Setup', slug: 'home-dining-room-table-setup'},
  {set_id: 'core_basic_verbs_a1_a2', name: 'Basic Verbs', slug: 'basic-verbs'},
  {set_id: 'home_apartment_common_areas_a2', name: 'Apartment Building & Common Areas', slug: 'home-apartment-common-areas'},
  {set_id: 'core_question_words_a1', name: 'Question Words', slug: 'question-words'},
  {set_id: 'home_outdoor_garden_a2', name: 'Outdoor Home & Garden', slug: 'outdoor-home-garden'},
  {set_id: 'home_laundry_cleaning_basics_a1_a2', name: 'Laundry & Cleaning Basics', slug: 'home-laundry-cleaning-basics'},
  {set_id: 'core_pronouns_people_basics_a1', name: 'Pronouns & People Basics', slug: 'pronouns-people-basics'},
  {set_id: 'food_meat_fish_dairy_a2', name: 'Meat, Fish & Dairy', slug: 'food-meat-fish-dairy'},
  {set_id: 'food_fruit_basics_a1', name: 'Fruit Basics', slug: 'food-fruit-basics'},
  {set_id: 'park_playground_a1_a2', name: 'Park & Playground', slug: 'park-playground'},
  {set_id: 'food_meals_taste_a1_a2', name: 'Meals & Taste', slug: 'food-meals-taste'},
  {set_id: 'core_learning_help_words_a1_a2', name: 'Learning Help Words', slug: 'learning-help-words'},
  {set_id: 'core_practical_action_verbs_a1_a2', name: 'Practical Action Verbs', slug: 'practical-action-verbs'},
  {set_id: 'food_basics_a1', name: 'Food Basics', slug: 'food-basics'},
  {set_id: 'core_time_days_a1_a2', name: 'Time & Days', slug: 'time-days'},
  {set_id: 'food_drink_basics_a1', name: 'Drink Basics', slug: 'food-drink-basics'},
  {set_id: 'food_coffee_espresso_drinks_a2', name: 'Coffee & Espresso Drinks', slug: 'coffee-espresso-drinks'},
  {set_id: 'food_tea_hot_drinks_a2', name: 'Tea & Hot Drinks', slug: 'tea-hot-drinks'},
  {set_id: 'food_cafe_drink_options_a2', name: 'Cafe Drink Options', slug: 'cafe-drink-options'},
  {set_id: 'food_juices_smoothies_cold_drinks_a2', name: 'Juices, Smoothies & Cold Drinks', slug: 'juices-smoothies-cold-drinks'},
  {set_id: 'food_fast_food_basics_a1_a2', name: 'Fast Food Basics', slug: 'fast-food-basics'},
  {set_id: 'food_sauces_extras_a2', name: 'Sauces & Extras', slug: 'sauces-extras'},
  {set_id: 'food_takeaway_dine_in_words_a2', name: 'Takeaway & Dine-In Words', slug: 'takeaway-dine-in-words'},
  {set_id: 'food_bar_alcohol_words_a2_b1', name: 'Bar & Alcohol Words', slug: 'bar-alcohol-words'},
  {set_id: 'food_alcoholic_drinks_basics_a2_b1', name: 'Alcoholic Drinks Basics', slug: 'alcoholic-drinks-basics'},
  {set_id: 'food_basic_ingredients_spices_a1_a2', name: 'Basic Ingredients & Spices', slug: 'basic-ingredients-spices'}
];

const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function psqlJson(sql) {
  const { stdout } = await execFileAsync("psql", [databaseUrl, "-tA", "-c", sql], { maxBuffer: 1024 * 1024 * 10 });
  return JSON.parse(stdout.trim() || "[]");
}

async function psqlExec(sql) {
  return execFileAsync("psql", [databaseUrl, "-c", sql]);
}

async function getSheetValues(accessToken, spreadsheetId, range) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Sheets fetch failed: ${response.status} - ${await response.text()}`);
  }
  const data = await response.json();
  return data.values ?? [];
}

async function getSpreadsheetMetadata(accessToken, spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Sheets meta failed: ${response.status} - ${await response.text()}`);
  }
  return response.json();
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const token = JSON.parse(await readFile(tokenFile, "utf8"));
  const accessToken = token.access_token;

  if (!fs.existsSync(filesFile)) {
    console.error(`Error: drive files list not found at ${filesFile}`);
    process.exit(1);
  }
  const files = JSON.parse(await readFile(filesFile, "utf8"));
  const mappings = [];

  files.forEach(f => {
    const m = f.name.match(/^FlashcardsLuna (\d{3}) of 180 - (.+)$/);
    if (m) {
      const num = parseInt(m[1]);
      const sheetName = m[2];
      let match = sets.find(s => clean(s.name) === clean(sheetName) || clean(s.slug) === clean(sheetName));
      if (!match) {
        match = sets.find(s => clean(s.slug).endsWith(clean(sheetName)));
      }
      if (match) {
        mappings.push({ num, sheetName, set_id: match.set_id, spreadsheetId: f.id });
      }
    }
  });

  mappings.sort((a, b) => a.num - b.num);
  
  const filterSetId = process.argv[2];
  const mappingsToProcess = filterSetId ? mappings.filter(m => m.set_id === filterSetId) : mappings;
  
  if (filterSetId && mappingsToProcess.length === 0) {
    console.warn(`No matching spreadsheet mapping found for set_id: ${filterSetId}`);
  }

  console.log(`Loaded ${mappingsToProcess.length} thematic decks. Starting database synchronization...`);

  let totalUpdatedEntries = 0;
  let totalUpdatedExamples = 0;

  for (const mapping of mappingsToProcess) {
    console.log(`\nProcessing Deck ${mapping.num} (${mapping.set_id})...`);
    try {
      // 1. Fetch spreadsheet metadata to get first sheet title
      const meta = await getSpreadsheetMetadata(accessToken, mapping.spreadsheetId);
      const mainSheetTitle = meta.sheets[0].properties.title;

      // 2. Fetch sheet values
      const mainValues = await getSheetValues(accessToken, mapping.spreadsheetId, mainSheetTitle);
      const metaValues = await getSheetValues(accessToken, mapping.spreadsheetId, "Card Metadata");

      if (mainValues.length === 0 || metaValues.length === 0) {
        console.warn(`Deck ${mapping.num} is empty. Skipping.`);
        continue;
      }

      const mainHeaders = mainValues[0];
      const thWordCol = mainHeaders.indexOf("TH");
      const thTransCol = mainHeaders.indexOf("TH transcription");
      const thExampleCol = mainHeaders.indexOf("TH example");
      
      const loWordCol = mainHeaders.indexOf("LO");
      const loTransCol = mainHeaders.indexOf("LO transcription");
      const loExampleCol = mainHeaders.indexOf("LO example");

      const myWordCol = mainHeaders.indexOf("MY");
      const myTransCol = mainHeaders.indexOf("MY transcription");
      const myExampleCol = mainHeaders.indexOf("MY example");

      const metaHeaders = metaValues[0];
      const cardKeyCol = metaHeaders.indexOf("card_key");

      if (cardKeyCol === -1) {
        console.warn(`Deck ${mapping.num} Card Metadata missing card_key. Skipping.`);
        continue;
      }

      // 3. Fetch existing DB entries for TH, LO, MY
      const dbRows = await psqlJson(`
        select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
          select
            msm.meaning_id,
            le_th.native_word as th_word, le_th.transcription as th_trans,
            le_lo.native_word as lo_word, le_lo.transcription as lo_trans,
            le_my.native_word as my_word, le_my.transcription as my_trans,
            et_th.example_id as th_ex_id, et_th.example_text as th_ex_text,
            et_lo.example_id as lo_ex_id, et_lo.example_text as lo_ex_text,
            et_my.example_id as my_ex_id, et_my.example_text as my_ex_text
          from meaning_set_memberships msm
          
          -- Word entries
          left join meaning_language_entries le_th on le_th.meaning_id = msm.meaning_id and le_th.language_code = 'TH'
          left join meaning_language_entries le_lo on le_lo.meaning_id = msm.meaning_id and le_lo.language_code = 'LO'
          left join meaning_language_entries le_my on le_my.meaning_id = msm.meaning_id and le_my.language_code = 'MY'
          
          -- Example translations
          left join meaning_examples me on me.meaning_id = msm.meaning_id
          left join meaning_example_translations et_th on et_th.example_id = me.example_id and et_th.language_code = 'TH'
          left join meaning_example_translations et_lo on et_lo.example_id = me.example_id and et_lo.language_code = 'LO'
          left join meaning_example_translations et_my on et_my.example_id = me.example_id and et_my.language_code = 'MY'
          
          where msm.set_id = '${mapping.set_id}'
        ) rows;
      `);

      let deckUpdatedEntries = 0;
      let deckUpdatedExamples = 0;

      for (let i = 1; i < mainValues.length; i++) {
        const cardKey = metaValues[i]?.[cardKeyCol];
        if (!cardKey) continue;
        const keyParts = cardKey.split("::");
        const meaningId = keyParts[1];
        if (!meaningId) continue;

        const dbRow = dbRows.find(r => r.meaning_id === meaningId);
        if (!dbRow) continue;

        const sheetRow = mainValues[i];
        const norm = s => String(s ?? "").normalize("NFC").trim();

        const languagesToCheck = [
          {
            code: "TH",
            word: norm(sheetRow[thWordCol]),
            trans: norm(sheetRow[thTransCol]),
            example: norm(sheetRow[thExampleCol]),
            dbWord: norm(dbRow.th_word),
            dbTrans: norm(dbRow.th_trans),
            dbExId: dbRow.th_ex_id,
            dbExText: norm(dbRow.th_ex_text)
          },
          {
            code: "LO",
            word: norm(sheetRow[loWordCol]),
            trans: norm(sheetRow[loTransCol]),
            example: norm(sheetRow[loExampleCol]),
            dbWord: norm(dbRow.lo_word),
            dbTrans: norm(dbRow.lo_trans),
            dbExId: dbRow.lo_ex_id,
            dbExText: norm(dbRow.lo_ex_text)
          },
          {
            code: "MY",
            word: norm(sheetRow[myWordCol]),
            trans: norm(sheetRow[myTransCol]),
            example: norm(sheetRow[myExampleCol]),
            dbWord: norm(dbRow.my_word),
            dbTrans: norm(dbRow.my_trans),
            dbExId: dbRow.my_ex_id,
            dbExText: norm(dbRow.my_ex_text)
          }
        ];

        for (const lang of languagesToCheck) {
          // A. Sync word and transcription
          if (lang.word && (lang.word !== lang.dbWord || lang.trans !== lang.dbTrans)) {
            const safeWord = lang.word.replace(/'/g, "''");
            const safeTrans = lang.trans.replace(/'/g, "''");
            
            await psqlExec(`
              update meaning_language_entries 
              set native_word = '${safeWord}', transcription = '${safeTrans}' 
              where meaning_id = '${meaningId}' and language_code = '${lang.code}'
            `);
            deckUpdatedEntries++;
            totalUpdatedEntries++;
          }

          // B. Sync example translation
          if (lang.example && lang.dbExId && lang.example !== lang.dbExText) {
            const safeExample = lang.example.replace(/'/g, "''");
            await psqlExec(`
              update meaning_example_translations 
              set example_text = '${safeExample}' 
              where example_id = ${lang.dbExId} and language_code = '${lang.code}'
            `);
            deckUpdatedExamples++;
            totalUpdatedExamples++;
          }
        }
      }

      console.log(` -> Synced: ${deckUpdatedEntries} words/transcriptions, ${deckUpdatedExamples} example translations.`);

      // 4. Rate-limiting delay to prevent API resource exhaustion (60 requests per minute limit)
      await sleep(1500);

    } catch (err) {
      console.error(`Error processing deck ${mapping.num}:`, err.message);
    }
  }

  console.log(`\n🎉 Synchronization complete!`);
  console.log(`Total words/transcriptions updated: ${totalUpdatedEntries}`);
  console.log(`Total example translations updated: ${totalUpdatedExamples}`);
}

main().catch(console.error);
