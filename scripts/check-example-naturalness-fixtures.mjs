#!/usr/bin/env node
import { validateExampleNaturalness } from "./lib/example-naturalness.mjs";

function row(overrides) {
  return {
    set_id: "fixture_example_naturalness",
    meaning_id: overrides.meaning_id,
    canonical_english: overrides.canonical_english,
    language_code: overrides.language_code,
    display_word: overrides.display_word,
    example_text: overrides.example_text,
    semantic_scene: overrides.semantic_scene ?? {
      scene_role: "tea_hot_drink_noun",
      topic_context: "food/tea-hot-drinks",
      drink_category: "tea_hot_drink_noun",
      beverage_item: overrides.canonical_english,
      action_or_state: "is located",
      state_or_location: "in the cup",
      tense_aspect: "present simple state",
    },
  };
}

const badRows = [
  row({
    meaning_id: "ru_white_tea_stiff",
    canonical_english: "white tea",
    language_code: "RU",
    display_word: "белый чай",
    example_text: "Белый чай налит в чашку.",
  }),
  row({
    meaning_id: "kk_tea_with_honey_literal",
    canonical_english: "tea with honey",
    language_code: "KK",
    display_word: "балы бар шай",
    example_text: "Балы бар шай жылы.",
    semantic_scene: {
      scene_role: "tea_hot_drink_noun",
      topic_context: "food/tea-hot-drinks",
      beverage_item: "tea with honey",
      action_or_state: "is warm",
      state_or_location: "warm",
    },
  }),
  row({
    meaning_id: "kk_peppermint_literal",
    canonical_english: "peppermint tea",
    language_code: "KK",
    display_word: "бұрышты жалбыз шайы",
    example_text: "Бұрышты жалбыз шайы жылы.",
  }),
  row({
    meaning_id: "uz_hibiscus_misspelled",
    canonical_english: "hibiscus tea",
    language_code: "UZ",
    display_word: "gibriskus choyi",
    example_text: "Gibriskus choyi finjonda.",
  }),
  row({
    meaning_id: "uz_peppermint_collapsed",
    canonical_english: "peppermint tea",
    language_code: "UZ",
    display_word: "yalpiz choyi",
    example_text: "Yalpiz choyi iliq.",
  }),
  row({
    meaning_id: "ru_english_breakfast_literal",
    canonical_english: "English breakfast tea",
    language_code: "RU",
    display_word: "чай Английский завтрак",
    example_text: "Чай «Английский завтрак» в чашке.",
  }),
  row({
    meaning_id: "uz_english_breakfast_literal",
    canonical_english: "English breakfast tea",
    language_code: "UZ",
    display_word: "Ingliz nonushta choyi",
    example_text: "Ingliz nonushta choyi finjonda.",
  }),
  row({
    meaning_id: "hy_english_breakfast_literal",
    canonical_english: "English breakfast tea",
    language_code: "HY",
    display_word: "անգլիական նախաճաշի թեյը",
    example_text: "Անգլիական նախաճաշի թեյը գավաթի մեջ է։",
  }),
  row({
    meaning_id: "is_english_breakfast_literal",
    canonical_english: "English breakfast tea",
    language_code: "IS",
    display_word: "enska morgunteið",
    example_text: "Enska morgunteið er í bollanum.",
  }),
  row({
    meaning_id: "km_english_breakfast_shortened",
    canonical_english: "English breakfast tea",
    language_code: "KM",
    display_word: "តែអង់គ្លេស",
    example_text: "តែអង់គ្លេសស្ថិតនៅក្នុងពែង។",
  }),
  row({
    meaning_id: "lo_english_breakfast_shortened",
    canonical_english: "English breakfast tea",
    language_code: "LO",
    display_word: "ຊາອັງກິດ",
    example_text: "ຊາອັງກິດຢູ່ໃນຈອກ",
  }),
  row({
    meaning_id: "my_english_breakfast_literal",
    canonical_english: "English breakfast tea",
    language_code: "MY",
    display_word: "အင်္ဂလိပ်နံနက်စာလက်ဖက်ရည်",
    example_text: "အင်္ဂလိပ်နံနက်စာလက်ဖက်ရည်သည် ခွက်ထဲတွင်ရှိသည်။",
  }),
];

const goodRows = [
  row({
    meaning_id: "ru_white_tea_gold",
    canonical_english: "white tea",
    language_code: "RU",
    display_word: "белый чай",
    example_text: "Белый чай в чашке.",
  }),
  row({
    meaning_id: "kk_tea_with_honey_gold",
    canonical_english: "tea with honey",
    language_code: "KK",
    display_word: "бал қосылған шай",
    example_text: "Бал қосылған шай жылы.",
    semantic_scene: {
      scene_role: "tea_hot_drink_noun",
      topic_context: "food/tea-hot-drinks",
      beverage_item: "tea with honey",
      action_or_state: "is warm",
      state_or_location: "warm",
    },
  }),
  row({
    meaning_id: "uz_hibiscus_gold",
    canonical_english: "hibiscus tea",
    language_code: "UZ",
    display_word: "karkade choyi",
    example_text: "Karkade choyi finjonda.",
  }),
  row({
    meaning_id: "ru_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "RU",
    display_word: "чай Инглиш Брекфаст",
    example_text: "Чай Инглиш Брекфаст в чашке.",
  }),
  row({
    meaning_id: "uz_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "UZ",
    display_word: "English Breakfast choyi",
    example_text: "English Breakfast choyi finjonda.",
  }),
  row({
    meaning_id: "hy_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "HY",
    display_word: "Ինգլիշ Բրեքֆաստ թեյը",
    example_text: "Ինգլիշ Բրեքֆաստ թեյը գավաթի մեջ է։",
  }),
  row({
    meaning_id: "is_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "IS",
    display_word: "English Breakfast-teið",
    example_text: "English Breakfast-teið er í bollanum.",
  }),
  row({
    meaning_id: "km_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "KM",
    display_word: "តែអ៊ីងគ្លីសប្រេកហ្វាស្ត",
    example_text: "តែអ៊ីងគ្លីសប្រេកហ្វាស្តស្ថិតនៅក្នុងពែង។",
  }),
  row({
    meaning_id: "lo_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "LO",
    display_word: "ຊາອິງລິດເບຣກຟາສ",
    example_text: "ຊາອິງລິດເບຣກຟາສຢູ່ໃນຈອກ",
  }),
  row({
    meaning_id: "my_english_breakfast_gold",
    canonical_english: "English breakfast tea",
    language_code: "MY",
    display_word: "အင်္ဂလိပ်ဘရက်ဖတ်စ်လက်ဖက်ရည်",
    example_text: "အင်္ဂလိပ်ဘရက်ဖတ်စ်လက်ဖက်ရည်သည် ခွက်ထဲတွင်ရှိသည်။",
  }),
];

for (const fixture of badRows) {
  const issues = validateExampleNaturalness(fixture);
  if (issues.length === 0) {
    throw new Error(`Expected example-naturalness fixture blocker for ${fixture.language_code}/${fixture.meaning_id}`);
  }
}

for (const fixture of goodRows) {
  const issues = validateExampleNaturalness(fixture);
  if (issues.length > 0) {
    throw new Error(
      `Unexpected example-naturalness fixture blocker for ${fixture.language_code}/${fixture.meaning_id}: ${issues.join("; ")}`
    );
  }
}

console.log(`Example naturalness fixtures OK: bad=${badRows.length}, good=${goodRows.length}`);
