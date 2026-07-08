#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
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
    descriptions: {},
    levelSignals: {},
    courseMetadata: {
      title: {},
      description: {},
      module: {},
      category: {},
      levelSignal: {}
    },
    cards: {}
  };

  const metadataSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      select
        language_code,
        title,
        description,
        module,
        category,
        level_signal
      from content_set_localizations
      where set_id = '${setId.replace(/'/g, "''")}'
    ) rows;
  `;
  const metadataResult = await psqlJson(metadataSql);
  for (const row of metadataResult) {
    if (row.language_code) {
      const code = row.language_code.toUpperCase();
      deckData.titles[code] = row.title ?? "";
      deckData.descriptions[code] = row.description ?? "";
      deckData.levelSignals[code] = row.level_signal ?? "";
      deckData.courseMetadata.title[code] = row.title ?? "";
      deckData.courseMetadata.description[code] = row.description ?? "";
      deckData.courseMetadata.module[code] = row.module ?? "";
      deckData.courseMetadata.category[code] = row.category ?? "";
      deckData.courseMetadata.levelSignal[code] = row.level_signal ?? "";
    }
  }

  const cardsSql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      with deck_examples as (
        select distinct on (meaning_id)
          example_id,
          meaning_id
        from meaning_examples
        where set_id = '${setId.replace(/'/g, "''")}' or example_role = 'base'
        order by meaning_id, case when set_id = '${setId.replace(/'/g, "''")}' then 1 else 2 end
      )
      select
        msm.meaning_id,
        msm.display_order,
        mu.canonical_english,
        ex.example_id,
        (
          select json_object_agg(language_code, row_to_json(le))
          from (
            select language_code, native_word, word_with_article_or_marker, transcription
            from meaning_language_entries
            where meaning_id = msm.meaning_id
          ) le
        ) as word_entries,
        (
          select json_object_agg(language_code, example_text)
          from meaning_example_translations
          where example_id = ex.example_id
        ) as example_translations
      from meaning_set_memberships msm
      join meaning_units mu on mu.meaning_id = msm.meaning_id
      left join deck_examples ex on ex.meaning_id = msm.meaning_id
      where msm.set_id = '${setId.replace(/'/g, "''")}'
      order by msm.display_order, msm.meaning_id
    ) rows;
  `;
  const cardsResult = await psqlJson(cardsSql);

  for (const supportLang of allLangs) {
    deckData.cards[supportLang] = {};
    for (const targetLang of allLangs) {
      if (targetLang === supportLang) continue;

      const cardsList = [];
      for (const row of cardsResult) {
        const wordT = row.word_entries?.[targetLang];
        const wordS = row.word_entries?.[supportLang];
        if (!wordT?.native_word) continue;
        cardsList.push({
          meaning_id: row.meaning_id,
          display_order: row.display_order,
          canonical_english: row.canonical_english,
          target_word: wordT.native_word,
          target_display: wordT.word_with_article_or_marker || wordT.native_word,
          target_transcription: wordT.transcription || "",
          support_word: wordS?.native_word || "",
          support_display: wordS ? (wordS.word_with_article_or_marker || wordS.native_word || "") : "",
          example_id: row.example_id || null,
          target_example: row.example_translations?.[targetLang] || "",
          support_example: row.example_translations?.[supportLang] || ""
        });
      }

      if (cardsList.length > 0) {
        deckData.cards[supportLang][targetLang] = cardsList;
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
