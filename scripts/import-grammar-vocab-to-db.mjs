import fs from "node:fs";
import path from "node:path";
import { psqlExec, psqlJson, sqlString, sqlNullableString, sqlJson } from "./lib/qa-utils.mjs";

const mapping = [
  { eng: "Hello!", pos: "interjection", id: "de_noskov_1_hello", ipa: "[haˈloː]" },
  { eng: "Good day!", pos: "phrase", id: "de_noskov_1_good_day", ipa: "[ˈɡuːtn̩ ˈtaːk]" },
  { eng: "Good morning!", pos: "phrase", id: "de_noskov_1_good_morning", ipa: "[ˈɡuːtn̩ ˈmɔrɡn̩]" },
  { eng: "Good evening!", pos: "phrase", id: "de_noskov_1_good_evening", ipa: "[ˈɡuːtn̩ ˈaːbn̩t]" },
  { eng: "Goodbye!", pos: "phrase", id: "de_noskov_1_goodbye", ipa: "[aʊf ˈviːdɐˌzeːən]" },
  { eng: "Bye!", pos: "phrase", id: "de_noskov_1_bye", ipa: "[tʃʏs]" },
  { eng: "Who?", pos: "pronoun", id: "de_noskov_1_who", ipa: "[veːɐ̯]" },
  { eng: "How?", pos: "adverb", id: "de_noskov_1_how", ipa: "[viː]" },
  { eng: "What?", pos: "pronoun", id: "de_noskov_1_what", ipa: "[vas]" },
  { eng: "Yes", pos: "adverb", id: "de_noskov_1_yes", ipa: "[jaː]" },
  { eng: "No", pos: "adverb", id: "de_noskov_1_no", ipa: "[naɪn]" },
  { eng: "I live", pos: "phrase", id: "de_noskov_1_i_live", ipa: "[ɪç ˈvoːnə]" },
  { eng: "you live", pos: "phrase", id: "de_noskov_1_you_live", ipa: "[duː voːnst]" },
  { eng: "he lives", pos: "phrase", id: "de_noskov_1_he_lives", ipa: "[eːɐ̯ voːnt]" },
  { eng: "she lives", pos: "phrase", id: "de_noskov_1_she_lives", ipa: "[ziː voːnt]" },
  { eng: "we live", pos: "phrase", id: "de_noskov_1_we_live", ipa: "[viːɐ̯ ˈvoːnən]" },
  { eng: "you live (plural)", pos: "phrase", id: "de_noskov_1_you_plural_live", ipa: "[iːɐ̯ voːnt]" },
  { eng: "they live", pos: "phrase", id: "de_noskov_1_they_live", ipa: "[ziː ˈvoːnən]" },
  { eng: "You live (polite)", pos: "phrase", id: "de_noskov_1_you_polite_live", ipa: "[ziː ˈvoːnən]" },
  { eng: "I am", pos: "phrase", id: "de_noskov_1_i_am", ipa: "[ɪç bɪn]" },
  { eng: "you are", pos: "phrase", id: "de_noskov_1_you_are", ipa: "[duː bɪst]" },
  { eng: "he is", pos: "phrase", id: "de_noskov_1_he_is", ipa: "[eːɐ̯ ɪst]" },
  { eng: "we are", pos: "phrase", id: "de_noskov_1_we_are", ipa: "[viːɐ̯ zɪnt]" },
  { eng: "you are (plural)", pos: "phrase", id: "de_noskov_1_you_plural_are", ipa: "[iːɐ̯ zaɪt]" },
  { eng: "they are / You are", pos: "phrase", id: "de_noskov_1_they_you_polite_are", ipa: "[ziː zɪnt]" },
  { eng: "I live in Berlin.", pos: "phrase", id: "de_noskov_1_i_live_in_berlin", ipa: "[ɪç ˈvoːnə ɪn bɛrˈliːn]" },
  { eng: "In Berlin live I.", pos: "phrase", id: "de_noskov_1_in_berlin_live_i", ipa: "[ɪn bɛrˈliːn ˈvoːnə ɪç]" },
  { eng: "What is your name?", pos: "phrase", id: "de_noskov_1_what_is_your_name", ipa: "[viː haɪst duː]" },
  { eng: "My name is Max.", pos: "phrase", id: "de_noskov_1_my_name_is_max", ipa: "[ɪç ˈhaɪsə maks]" },
  { eng: "Who are you?", pos: "phrase", id: "de_noskov_1_who_are_you", ipa: "[veːɐ̯ bɪst duː]" },
  { eng: "I am Anna.", pos: "phrase", id: "de_noskov_1_i_am_anna", ipa: "[ɪç bɪn ˈana]" },
  { eng: "Where are you from?", pos: "phrase", id: "de_noskov_1_where_are_you_from", ipa: "[voˈheːɐ̯ kɔmst duː]" },
  { eng: "I am from Moscow.", pos: "phrase", id: "de_noskov_1_i_am_from_moscow", ipa: "[ɪç ˈkɔmə aʊs ˈmɔskaʊ]" }
];

async function main() {
  const lessonPath = path.resolve("lessons/german_noskov_lesson_1.json");
  const lessonData = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
  const { setId, title, subtitle, targetLang, supportLang, cards } = lessonData;

  console.log(`Seeding database for content set: ${setId}`);

  const activeLanguages = await psqlJson("select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (SELECT code FROM languages WHERE is_active = true) rows");
  const languageCodes = activeLanguages.map(l => l.code);

  const statements = ["begin;"];

  // 1. Insert content_sets
  statements.push(`
    INSERT INTO content_sets (
      set_id,
      content_type,
      set_name,
      slug,
      domain,
      area,
      category,
      situation,
      level_label,
      level_min,
      level_max,
      target_item_count_min,
      target_item_count_max,
      selection_status,
      quality_status,
      sheet_contract_version,
      roadmap_stage,
      learning_goal
    ) VALUES (
      ${sqlString(setId)},
      'vocabulary',
      ${sqlString(title)},
      'german-noskov-lesson-1',
      'Personal Life',
      'Personal Life',
      'Greetings',
      'Greetings',
      'Basic',
      'A1',
      'A1',
      30,
      35,
      'approved',
      'approved',
      'spreadsheet-contract-v1',
      'Basics',
      ${sqlString(subtitle)}
    )
    ON CONFLICT (set_id) DO UPDATE SET
      set_name = excluded.set_name,
      slug = excluded.slug,
      learning_goal = excluded.learning_goal,
      updated_at = now();
  `);

  // 2. Insert content_set_localizations
  for (const langCode of languageCodes) {
    let localizedTitle = `German Noskov L1.`;
    let localizedDesc = `German L1: Greetings, verbs, sein, word order. A1.`;
    let localizedModule = `German`;
    let localizedCategory = `Lesson 1`;
    let localizedLevelSignal = `A1`;

    if (langCode === "RU") {
      localizedTitle = `Немецкий Носков У1.`;
      localizedDesc = `Урок 1: приветствия, глаголы, sein, порядок слов. A1.`;
      localizedModule = `Немецкий язык`;
      localizedCategory = `Урок 1`;
      localizedLevelSignal = `A1`;
    }

    statements.push(`
      INSERT INTO content_set_localizations (
        set_id,
        language_code,
        title,
        description,
        module,
        category,
        level_signal,
        quality_status
      ) VALUES (
        ${sqlString(setId)},
        ${sqlString(langCode)},
        ${sqlString(localizedTitle)},
        ${sqlString(localizedDesc)},
        ${sqlString(localizedModule)},
        ${sqlString(localizedCategory)},
        ${sqlString(localizedLevelSignal)},
        'approved'
      )
      ON CONFLICT (set_id, language_code) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        module = excluded.module,
        category = excluded.category,
        level_signal = excluded.level_signal,
        quality_status = 'approved',
        updated_at = now();
    `);
  }

  // 3. Insert Cards & Translations
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const mapInfo = mapping[i];
    if (!mapInfo) continue;

    const meaningId = mapInfo.id;
    const displayOrder = i + 1;

    // A. Insert meaning_units
    statements.push(`
      INSERT INTO meaning_units (
        meaning_id,
        source_language_code,
        canonical_english,
        english_with_article,
        part_of_speech,
        meaning_note,
        default_domain,
        default_area,
        default_category,
        level,
        quality_status,
        base_example_en
      ) VALUES (
        ${sqlString(meaningId)},
        'EN',
        ${sqlString(mapInfo.eng)},
        ${sqlString(mapInfo.eng)},
        ${sqlString(mapInfo.pos)},
        'Sergei Noskov Textbook Lesson 1',
        'Personal Life',
        'Personal Life',
        'Greetings',
        'A1',
        'approved',
        ${sqlString(mapInfo.eng)}
      )
      ON CONFLICT (meaning_id) DO UPDATE SET
        canonical_english = excluded.canonical_english,
        english_with_article = excluded.english_with_article,
        part_of_speech = excluded.part_of_speech,
        base_example_en = excluded.base_example_en,
        updated_at = now();
    `);

    // B. Insert meaning_set_memberships
    statements.push(`
      INSERT INTO meaning_set_memberships (
        meaning_id,
        set_id,
        display_order,
        quality_status
      ) VALUES (
        ${sqlString(meaningId)},
        ${sqlString(setId)},
        ${displayOrder},
        'approved'
      )
      ON CONFLICT (meaning_id, set_id) DO UPDATE SET
        display_order = excluded.display_order,
        quality_status = 'approved',
        updated_at = now();
    `);

    // C. Insert target language entries (German DE)
    statements.push(`
      INSERT INTO meaning_language_entries (
        meaning_id,
        language_code,
        native_word,
        word_with_article_or_marker,
        transcription,
        quality_status,
        pronunciation_status
      ) VALUES (
        ${sqlString(meaningId)},
        'DE',
        ${sqlString(card.target_display)},
        ${sqlString(card.target_display)},
        ${sqlString(mapInfo.ipa)},
        'approved',
        'approved'
      )
      ON CONFLICT (meaning_id, language_code) DO UPDATE SET
        native_word = excluded.native_word,
        word_with_article_or_marker = excluded.word_with_article_or_marker,
        transcription = excluded.transcription,
        quality_status = 'approved',
        pronunciation_status = 'approved',
        updated_at = now();
    `);

    // D. Insert support language entries (Russian RU)
    statements.push(`
      INSERT INTO meaning_language_entries (
        meaning_id,
        language_code,
        native_word,
        word_with_article_or_marker,
        transcription,
        quality_status,
        pronunciation_status
      ) VALUES (
        ${sqlString(meaningId)},
        'RU',
        ${sqlString(card.support_display)},
        ${sqlString(card.support_display)},
        null,
        'approved',
        'not_applicable'
      )
      ON CONFLICT (meaning_id, language_code) DO UPDATE SET
        native_word = excluded.native_word,
        word_with_article_or_marker = excluded.word_with_article_or_marker,
        quality_status = 'approved',
        updated_at = now();
    `);

    // E. Insert English language entries (EN)
    statements.push(`
      INSERT INTO meaning_language_entries (
        meaning_id,
        language_code,
        native_word,
        word_with_article_or_marker,
        transcription,
        quality_status,
        pronunciation_status
      ) VALUES (
        ${sqlString(meaningId)},
        'EN',
        ${sqlString(mapInfo.eng)},
        ${sqlString(mapInfo.eng)},
        null,
        'approved',
        'not_applicable'
      )
      ON CONFLICT (meaning_id, language_code) DO UPDATE SET
        native_word = excluded.native_word,
        word_with_article_or_marker = excluded.word_with_article_or_marker,
        quality_status = 'approved',
        updated_at = now();
    `);

    // F. Insert meaning_examples & meaning_example_translations (for DE, RU, EN) using a CTE
    statements.push(`
      with upserted as (
        INSERT INTO meaning_examples (
          meaning_id,
          set_id,
          example_role,
          canonical_example_en,
          quality_status
        ) VALUES (
          ${sqlString(meaningId)},
          ${sqlString(setId)},
          'context',
          ${sqlString(mapInfo.eng)},
          'approved'
        )
        ON CONFLICT (meaning_id, set_id) WHERE example_role = 'context' DO UPDATE SET
          canonical_example_en = excluded.canonical_example_en,
          quality_status = 'approved',
          updated_at = now()
        returning example_id
      ),
      selected_example as (
        select example_id from upserted
        union all
        select example_id
        from meaning_examples
        where meaning_id = ${sqlString(meaningId)}
          and set_id = ${sqlString(setId)}
          and example_role = 'context'
        limit 1
      )
      INSERT INTO meaning_example_translations (
        example_id,
        language_code,
        example_text,
        quality_status
      )
      select example_id, 'DE', ${sqlString(card.target_display)}, 'approved' from selected_example
      union all
      select example_id, 'RU', ${sqlString(card.support_display)}, 'approved' from selected_example
      union all
      select example_id, 'EN', ${sqlString(mapInfo.eng)}, 'approved' from selected_example
      on conflict (example_id, language_code) do update set
        example_text = excluded.example_text,
        quality_status = 'approved',
        updated_at = now();
    `);
  }

  statements.push("commit;");

  try {
    await psqlExec(statements.join("\n"));
    console.log("SUCCESS: German Noskov Lesson 1 vocab successfully seeded in Postgres.");
  } catch (err) {
    console.error("ERROR running seeding statements:", err);
    process.exit(1);
  }
}

main();
