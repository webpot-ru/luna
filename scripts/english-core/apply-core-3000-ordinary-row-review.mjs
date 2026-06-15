#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(args.get("input") ?? `outputs/english-core-3000/row-reviews/${releaseId}_row_review_v0.jsonl`);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/row-reviews");

const resolvedRowBlockers = new Set([
  "part_of_speech_review_pending",
  "meaning_note_needs_exact_sense",
  "countability_article_review_pending",
  "semantic_scene_needs_review",
  "example_EN_missing",
]);

const decisions = [
  ["core3000_0014", "adverb", "negation", "not", "Adverb used to make a verb, adjective or statement negative.", "I am not tired.", "negative statement"],
  ["core3000_0030", "verb", "speak_words", "to say", "Verb used to speak words or express something in words.", "Please say your name.", "spoken words"],
  ["core3000_0031", "verb", "move_to_place", "to go", "Verb used to move or travel to another place.", "I go home after school.", "movement to place"],
  ["core3000_0034", "adverb", "in_that_place", "there", "Adverb used to mean in, at or to that place.", "Put the bag there.", "place reference"],
  ["core3000_0035", "verb", "have_information", "to know", "Verb used to have information or be familiar with something.", "I know the answer.", "knowing information"],
  ["core3000_0036", "verb", "receive_or_obtain", "to get", "Verb used to receive, obtain or become given something.", "I get a new book today.", "receiving something"],
  ["core3000_0037", "verb", "use_mind", "to think", "Verb used to use your mind or have an opinion.", "I think this is right.", "mental action"],
  ["core3000_0038", "verb", "create_or_produce", "to make", "Verb used to create, prepare or produce something.", "I make lunch at home.", "creating something"],
  ["core3000_0039", "noun", "time_general", "time", "Noun used for time as a general thing measured by clocks, days or years.", "Time is important.", "abstract time"],
  ["core3000_0040", "verb", "perceive_with_eyes", "to see", "Verb used to notice or look at something with your eyes.", "I see the house.", "visual perception"],
  ["core3000_0041", "adverb", "away_from_inside", "out", "Adverb used to mean away from inside a place or container.", "Please go out now.", "movement away from inside"],
  ["core3000_0042", "adjective", "positive_quality", "good", "Adjective used to say that something has positive quality.", "This is a good day.", "positive quality"],
  ["core3000_0043", "noun", "human_group_plural", "people", "Plural noun used for persons in general or a group of persons.", "Many people are here.", "human group"],
  ["core3000_0044", "noun", "calendar_year", "a year", "Countable noun used for a period of twelve months.", "A year has twelve months.", "calendar period"],
  ["core3000_0045", "verb", "pick_up_or_carry", "to take", "Verb used to pick up, carry or move something with you.", "Please take this bag.", "taking an object"],
  ["core3000_0046", "adverb", "in_a_good_way", "well", "Adverb used to mean in a good or satisfactory way.", "She reads well.", "good manner"],
  ["core3000_0047", "adverb", "high_degree", "very", "Adverb used before adjectives or adverbs to show a high degree.", "This room is very small.", "degree modifier"],
  ["core3000_0048", "adverb", "only_or_exactly", "just", "Adverb used to mean only, exactly or a short time ago.", "I just need water.", "limiting adverb"],
  ["core3000_0049", "verb", "move_toward_speaker", "to come", "Verb used to move toward the speaker or a place.", "Please come here.", "movement toward place"],
  ["core3000_0050", "verb", "do_a_job", "to work", "Verb used to do a job or task.", "I work in a school.", "working activity"],
  ["core3000_0051", "verb", "use_something", "to use", "Verb used to do something with a tool, object or method.", "I use this phone every day.", "using an object"],
  ["core3000_0052", "adverb", "next_in_time", "then", "Adverb used to mean after that or at that time.", "Eat breakfast, then go to school.", "sequence in time"],
  ["core3000_0053", "adverb", "in_addition", "also", "Adverb used to add another related fact or item.", "I also speak English.", "additional fact"],
  ["core3000_0054", "adverb", "nothing_more_than", "only", "Adverb used to mean no more than or no one except.", "I only have one pen.", "limiting adverb"],
  ["core3000_0055", "verb", "direct_eyes", "to look", "Verb used to turn your eyes toward something.", "Look at the board.", "visual attention"],
  ["core3000_0056", "verb", "desire", "to want", "Verb used to wish for something or wish to do something.", "I want a new book.", "desire"],
  ["core3000_0057", "verb", "hand_to_someone", "to give", "Verb used to hand or provide something to someone.", "Please give me the pen.", "giving object"],
  ["core3000_0058", "adjective", "before_all_others", "first", "Adjective used for the thing or person before all others in order.", "This is my first day.", "order position"],
  ["core3000_0059", "adjective", "recent_or_not_old", "new", "Adjective used for something recently made, bought or started.", "I have a new phone.", "recent object"],
  ["core3000_0060", "noun", "method_or_route", "a way", "Countable noun used for a method, manner or route.", "This is a good way to learn.", "method"],
  ["core3000_0061", "verb", "discover", "to find", "Verb used to discover or locate something.", "I find my keys on the table.", "finding object"],
  ["core3000_0062", "noun", "calendar_day", "a day", "Countable noun used for a period of twenty-four hours.", "A day can be very busy.", "calendar period"],
  ["core3000_0063", "noun", "object_or_matter", "a thing", "Countable noun used for an object, idea or matter when the exact name is not used.", "This thing is useful.", "general object"],
  ["core3000_0064", "adjective", "correct", "right", "Adjective used to mean correct or suitable.", "Your answer is right.", "correctness"],
  ["core3000_0065", "adverb", "in_what_way", "how", "Adverb used to ask or say the way something happens or is done.", "How do you spell your name?", "manner question"],
  ["core3000_0066", "adverb", "return_direction", "back", "Adverb used to mean returning to an earlier place or position.", "Please come back soon.", "return movement"],
  ["core3000_0067", "verb", "signify", "to mean", "Verb used to say what a word, sign or action expresses.", "What does this word mean?", "meaning of word"],
  ["core3000_0068", "adverb", "surprising_degree", "even", "Adverb used to add something surprising or stronger than expected.", "Even a child can do this.", "emphasis"],
  ["core3000_0069", "adverb", "in_this_place", "here", "Adverb used to mean in, at or to this place.", "Please sit here.", "place reference"],
  ["core3000_0070", "noun", "young_person", "a child", "Countable noun used for a young person.", "A child is playing outside.", "young person"],
  ["core3000_0071", "verb", "give_information", "to tell", "Verb used to give information to someone by speaking or writing.", "Please tell me your name.", "giving information"],
  ["core3000_0072", "adverb", "in_fact_or_very", "really", "Adverb used to mean truly, actually or very.", "I really like this book.", "emphasis"],
  ["core3000_0073", "verb", "phone_or_name", "to call", "Verb used to telephone someone or give someone a name.", "I call my mother every day.", "phone action"],
  ["core3000_0074", "noun", "business_organization", "a company", "Countable noun used for a business organization.", "A company sells these phones.", "business organization"],
  ["core3000_0075", "verb", "make_visible", "to show", "Verb used to let someone see or understand something.", "Please show me the map.", "showing object"],
  ["core3000_0076", "noun", "living_existence", "life", "Noun used for the state of being alive or the way someone lives.", "Life is different here.", "living condition"],
  ["core3000_0077", "noun", "adult_male_person", "a man", "Countable noun used for an adult male person.", "A man is waiting outside.", "adult male person"],
  ["core3000_0078", "verb", "become_different", "to change", "Verb used to become different or make something different.", "Plans change quickly.", "becoming different"],
  ["core3000_0079", "noun", "location", "a place", "Countable noun used for a location or area.", "This place is quiet.", "location"],
  ["core3000_0080", "adjective", "large_length_or_time", "long", "Adjective used for something with great length or duration.", "This is a long road.", "length"],
  ["core3000_0081", "verb", "experience_feeling", "to feel", "Verb used to experience an emotion or physical state.", "I feel happy today.", "emotion state"],
  ["core3000_0082", "adverb", "more_than_needed", "too", "Adverb used to mean more than is wanted, needed or suitable.", "This bag is too heavy.", "excess degree"],
  ["core3000_0083", "adverb", "continues_now", "still", "Adverb used to say that a situation continues now.", "I still live here.", "continuing situation"],
  ["core3000_0084", "noun", "difficulty", "a problem", "Countable noun used for a difficulty or something that needs a solution.", "This is a small problem.", "difficulty"],
  ["core3000_0085", "verb", "make_text", "to write", "Verb used to make letters, words or texts with a pen, keyboard or similar tool.", "Please write your name.", "writing text"],
  ["core3000_0086", "adjective", "very_good_or_large", "great", "Adjective used to mean very good or large in degree.", "This is a great idea.", "positive quality"],
  ["core3000_0087", "verb", "attempt", "to try", "Verb used to make an attempt to do something.", "I try to learn every day.", "attempt"],
  ["core3000_0088", "verb", "go_away", "to leave", "Verb used to go away from a place.", "We leave at eight.", "departure"],
  ["core3000_0089", "noun", "count_or_amount", "a number", "Countable noun used for a count, amount or written numeral.", "Write the number here.", "number item"],
  ["core3000_0090", "noun", "piece_of_whole", "a part", "Countable noun used for one piece or section of a whole.", "This part is important.", "part of whole"],
  ["core3000_0091", "noun", "idea_or_detail", "a point", "Countable noun used for an idea, detail or exact place in discussion.", "This point is clear.", "discussion detail"],
  ["core3000_0092", "verb", "assist", "to help", "Verb used to make it easier for someone to do something.", "I help my friend.", "assistance"],
  ["core3000_0093", "verb", "request_information", "to ask", "Verb used to request information, help or permission.", "Please ask a question.", "requesting information"],
  ["core3000_0094", "verb", "come_together", "to meet", "Verb used when people come together by chance or arrangement.", "We meet at school.", "meeting people"],
  ["core3000_0095", "verb", "begin", "to start", "Verb used to begin doing something or begin happening.", "Classes start at nine.", "beginning event"],
  ["core3000_0096", "verb", "speak_with_someone", "to talk", "Verb used to speak with someone.", "I talk with my teacher.", "conversation"],
  ["core3000_0097", "verb", "place_something", "to put", "Verb used to place something somewhere.", "Put the book on the table.", "placing object"],
  ["core3000_0098", "verb", "come_to_be", "to become", "Verb used to start to be something or change into something.", "I want to become a teacher.", "change of state"],
  ["core3000_0099", "noun", "curiosity_or_attention", "an interest", "Countable noun used for curiosity, attention or a wish to know more about a subject.", "She has an interest in music.", "curiosity"],
  ["core3000_0100", "noun", "nation", "a country", "Countable noun used for a nation or land with its own government.", "Canada is a large country.", "nation"],
  ["core3000_0101", "adjective", "not_young_or_new", "old", "Adjective used for someone or something that has existed for a long time.", "This is an old house.", "age"],
  ["core3000_0102", "noun", "education_place", "a school", "Countable noun used for a place where people learn.", "A school is near my house.", "education place"],
  ["core3000_0103", "adjective", "after_expected_time", "late", "Adjective used for something happening after the expected or usual time.", "I am late for class.", "time delay"],
  ["core3000_0104", "adjective", "large_vertical_size", "high", "Adjective used for something that is far above the ground or has a large level.", "The wall is high.", "height"],
  ["core3000_0105", "adjective", "not_the_same", "different", "Adjective used for things that are not the same.", "These two books are different.", "difference"],
  ["core3000_0106", "noun", "final_part", "the end", "Noun used for the final part of something.", "The end of the story is sad.", "final part"],
  ["core3000_0107", "verb", "reside", "to live", "Verb used to have your home in a place.", "I live in a small town.", "residence"],
  ["core3000_0108", "adverb", "for_what_reason", "why", "Adverb used to ask or explain the reason for something.", "Why are you here?", "reason question"],
  ["core3000_0109", "noun", "earth_or_people", "the world", "Noun used for the earth or all people and places on it.", "People live all over the world.", "earth"],
  ["core3000_0110", "noun", "seven_day_period", "a week", "Countable noun used for a period of seven days.", "A week has seven days.", "calendar period"],
  ["core3000_0111", "verb", "game_or_music", "to play", "Verb used to take part in a game, sport or music.", "Children play in the park.", "activity"],
  ["core3000_0112", "adverb", "to_or_at_home", "home", "Adverb used to mean to or at the place where someone lives.", "I go home after work.", "home direction"],
  ["core3000_0113", "adverb", "not_at_any_time", "never", "Adverb used to mean not at any time.", "I never eat meat.", "negative frequency"],
  ["core3000_0114", "verb", "have_as_part", "to include", "Verb used to have something as one part of a group or whole.", "This price can include breakfast.", "included part"],
  ["core3000_0115", "noun", "class_or_series", "a course", "Countable noun used for a series of lessons or a direction of study.", "This course starts today.", "class series"],
  ["core3000_0116", "noun", "building_home", "a house", "Countable noun used for a building where people live.", "A house is near the school.", "home building"],
  ["core3000_0117", "noun", "written_account", "a report", "Countable noun used for a written or spoken account of information.", "The report is short.", "written account"],
  ["core3000_0118", "noun", "set_of_people_or_things", "a group", "Countable noun used for several people or things together.", "A group of students is waiting.", "set of people"],
  ["core3000_0119", "noun", "situation_or_example", "a case", "Countable noun used for a situation, example or instance.", "This case is different.", "situation"],
  ["core3000_0120", "noun", "adult_female_person", "a woman", "Countable noun used for an adult female person.", "A woman is waiting outside.", "adult female person"],
  ["core3000_0121", "noun", "written_work", "a book", "Countable noun used for a written or printed work with pages.", "This book is new.", "written work"],
  ["core3000_0122", "noun", "related_people", "a family", "Countable noun used for a group of related people.", "My family is at home.", "related people"],
  ["core3000_0123", "verb", "appear_to_be", "to seem", "Verb used to give the impression of being something.", "You seem tired.", "appearance"],
  ["core3000_0124", "verb", "allow", "to let", "Verb used to allow someone to do something.", "Please let me help.", "permission"],
  ["core3000_0125", "adverb", "one_more_time", "again", "Adverb used to mean one more time.", "Please say it again.", "repetition"],
  ["core3000_0126", "noun", "type", "a kind", "Countable noun used for a type or sort of person or thing.", "This kind of tea is good.", "type"],
  ["core3000_0127", "verb", "continue_to_have", "to keep", "Verb used to continue to have, hold or do something.", "Keep your phone here.", "continuing possession"],
  ["core3000_0128", "verb", "perceive_sound", "to hear", "Verb used to notice sound with your ears.", "I hear music outside.", "hearing sound"],
  ["core3000_0129", "noun", "organized_set", "a system", "Countable noun used for an organized set of connected parts or rules.", "This system is simple.", "organized set"],
  ["core3000_0130", "noun", "request_for_answer", "a question", "Countable noun used for words that ask for information.", "Ask a question now.", "request for answer"],
  ["core3000_0131", "adverb", "every_time", "always", "Adverb used to mean every time or at all times.", "She always arrives early.", "frequency"],
  ["core3000_0132", "adjective", "large_size", "big", "Adjective used for something large in size or amount.", "This is a big room.", "large size"],
  ["core3000_0133", "noun", "group_or_collection", "a set", "Countable noun used for a group of things that belong together.", "This set has six cups.", "collection"],
  ["core3000_0134", "adjective", "little_size", "small", "Adjective used for something little in size or amount.", "This is a small room.", "little size"],
  ["core3000_0135", "verb", "learn_subject", "to study", "Verb used to learn about a subject, usually at school or alone.", "I study English every day.", "learning subject"],
  ["core3000_0136", "verb", "go_after_or_obey", "to follow", "Verb used to go after someone or something, or do what instructions say.", "Please follow the teacher.", "following person"],
  ["core3000_0137", "verb", "start_happening", "to begin", "Verb used to start happening or start doing something.", "The class can begin now.", "starting event"],
  ["core3000_0138", "adjective", "high_value", "important", "Adjective used for something that has great value or needs attention.", "This question is important.", "high value"],
  ["core3000_0139", "verb", "move_fast_on_feet", "to run", "Verb used to move quickly on foot.", "I run in the park.", "fast movement"],
  ["core3000_0140", "verb", "change_direction", "to turn", "Verb used to move or change direction around a point.", "Turn left at the door.", "direction change"],
  ["core3000_0141", "verb", "carry_to_place", "to bring", "Verb used to carry or take something to a person or place.", "Please bring your book.", "bringing object"],
  ["core3000_0142", "adjective", "near_beginning_time", "early", "Adjective used for something happening before the usual or expected time.", "We need an early start.", "early time"],
  ["core3000_0143", "noun", "body_part", "a hand", "Countable noun used for the body part at the end of the arm.", "Raise your hand.", "body part"],
  ["core3000_0144", "noun", "political_area", "a state", "Countable noun used for a political area within a country.", "California is a large state.", "political area"],
  ["core3000_0145", "verb", "change_position", "to move", "Verb used to change position or place.", "Please move the chair.", "position change"],
  ["core3000_0146", "noun", "currency", "money", "Uncountable noun used for coins, bills or digital value used to buy things.", "I need money for lunch.", "currency"],
  ["core3000_0147", "noun", "true_information", "a fact", "Countable noun used for true information.", "This fact is important.", "true information"],
  ["core3000_0148", "adverb", "contrast_transition", "however", "Adverb used to introduce a contrast with what was just said.", "It is late; however, we can wait.", "contrast transition"],
  ["core3000_0149", "noun", "place_or_subject_part", "an area", "Countable noun used for a part of a place, subject or activity.", "This area is quiet.", "place part"],
  ["core3000_0150", "verb", "supply_or_give", "to provide", "Verb used to give or supply something that is needed.", "The school can provide lunch.", "supplying something"]
];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function safeId(value) {
  return normalizeText(value)
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function isNoun(pos) {
  return /\bnoun\b/i.test(pos);
}

function isVerb(pos) {
  return /\bverb\b/i.test(pos) || /^(be|do|have)-verb$/i.test(pos);
}

function articleForDisplay(display, pos) {
  if (!isNoun(pos)) return "";
  const first = normalizeText(display).split(/\s+/u)[0]?.toLocaleLowerCase("en-US") ?? "";
  if (first === "a" || first === "an" || first === "the") return first;
  return "";
}

function nounNumber(display, pos) {
  if (!isNoun(pos)) return "not_applicable";
  const clean = normalizeText(display).toLocaleLowerCase("en-US");
  if (clean === "people") return "plural";
  if (clean === "time" || clean === "life" || clean === "interest" || clean === "money") return "uncountable_or_mass";
  return "singular";
}

function countability(display, pos) {
  if (!isNoun(pos)) return "not_applicable";
  const number = nounNumber(display, pos);
  if (number === "plural") return "plural_countable";
  if (number === "uncountable_or_mass") return "uncountable_or_mass_reviewed";
  return "countable_singular_reviewed";
}

function reviewedSemanticScene(row, decision) {
  const [, pos, senseSlug, display, , example, topicContext] = decision;
  return {
    rule_version: "english-core-row-review-v1",
    status: "reviewed",
    target_object: row.normalized_headword,
    target_display: display,
    subject_number: nounNumber(display, pos),
    action_or_state: isVerb(pos) ? senseSlug.replace(/_/gu, " ") : "uses target word in a basic statement",
    state_or_location: topicContext,
    tense_aspect: example.endsWith("?") ? "question" : "simple_present_or_basic_clause",
    topic_context: topicContext,
  };
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function applyDecision(row, decision) {
  const [coreItemId, pos, senseSlug, display, meaningNote, example] = decision;
  if (row.core_item_id !== coreItemId) throw new Error(`Decision/core_item_id mismatch for ${coreItemId}.`);
  const blockers = (Array.isArray(row.blockers) ? row.blockers : []).filter((blocker) => !resolvedRowBlockers.has(blocker));
  const meaningId = `english_core_${safeId(row.source_headword)}_${safeId(senseSlug)}_01`;
  return {
    ...row,
    part_of_speech: pos,
    sense_no: `01_${senseSlug}`,
    meaning_id: meaningId,
    source_status: "row_reviewed_needs_evidence",
    en_display: display,
    article_or_marker_EN: articleForDisplay(display, pos),
    proposed_article_or_marker_EN: "",
    article_policy_status: isNoun(pos) ? "reviewed" : "not_applicable",
    grammatical_number_EN: nounNumber(display, pos),
    countability_EN: countability(display, pos),
    meaning_note: meaningNote,
    semantic_scene: reviewedSemanticScene(row, decision),
    example_EN: example,
    example_status: "reviewed_us_english_example_needs_qa",
    row_review_status: "reviewed_needs_evidence",
    generation_ready: false,
    blockers,
    row_review: {
      status: "reviewed_needs_evidence",
      reviewed_fields: [
        "part_of_speech",
        "sense_no",
        "meaning_id",
        "meaning_note",
        "semantic_scene",
        "example_EN",
        "article_or_marker_EN",
        "countability_EN",
      ],
      review_source: "scripts/english-core/apply-core-3000-ordinary-row-review.mjs",
      review_method: "internal_curation_ai_assisted_original_content",
      still_required_before_generation: blockers,
    },
  };
}

async function main() {
  const rows = await readJsonl(inputPath);
  const decisionById = new Map(decisions.map((decision) => [decision[0], decision]));
  if (decisionById.size !== decisions.length) throw new Error("Duplicate ordinary row decision core_item_id.");

  const outputRows = rows.map((row) => {
    if (row.row_review_status === "reviewed_needs_evidence") return row;
    const decision = decisionById.get(row.core_item_id);
    if (!decision) return row;
    return applyDecision(row, decision);
  });

  const remaining = outputRows.filter((row) => row.row_review_status !== "reviewed_needs_evidence");
  if (remaining.length) {
    throw new Error(`Ordinary row review did not cover all rows: ${remaining.map((row) => row.core_item_id).join(", ")}`);
  }

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${releaseId}_row_review_v1.jsonl`);
  const summaryPath = path.join(outputDir, `${releaseId}_row_review_v1_summary.md`);
  await writeJsonl(outPath, outputRows);
  await fs.writeFile(
    summaryPath,
    [
      `# Row Review v1: ${releaseId}`,
      "",
      `- Rows: ${outputRows.length}`,
      `- Reviewed rows: ${outputRows.length}`,
      "- Unreviewed rows: 0",
      "- Generation ready: 0",
      "- Review scope: all selected rows; v0 function rows plus v1 ordinary rows",
      "",
      "Reviewed rows have LunaCards-owned POS/sense, meaning notes, semantic scenes and US English examples.",
      "They still require source-backed English word/example transcription, duplicate/reuse review, translation preflight and final QA before generation.",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `English Core 3000 ordinary row review written: ${path.relative(process.cwd(), outPath)} rows=${outputRows.length} reviewed=${outputRows.length} generation_ready=0`
  );
}

await main();
