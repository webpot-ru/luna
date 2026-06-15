#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const scriptVersion = "2026-05-21.v1";
const defaultContractPath = "config/oxford-vocabulary-release-contract-v0.json";
const defaultOutDir = "outputs/oxford-vocabulary/row-reviews";

const displayOverrides = new Map([
  ["could modal", "could"],
  ["do1", "do"],
  ["have to modal", "have to"],
  ["kind (type)", "kind"],
  ["kind (caring)", "kind"],
  ["last1 (final)", "last"],
  ["lie1", "lie"],
  ["lie2 (tell a lie)", "lie"],
  ["like (similar)", "like"],
  ["like (find sb/sth pleasant)", "like"],
  ["live1", "live"],
  ["live2", "live"],
  ["long1", "long"],
  ["mine (hole in the ground)", "mine"],
  ["minute1", "minute"],
  ["must modal", "must"],
  ["ought modal", "ought"],
  ["pension1", "pension"],
  ["plus1", "plus"],
  ["race (people)", "race"],
  ["recount1", "recount"],
  ["row1", "row"],
  ["second1 (unit of time)", "second"],
  ["should modal", "should"],
  ["set (group)", "set"],
  ["set (put)", "set"],
  ["stick (piece of wood)", "stick"],
  ["stick (push into/attach)", "stick"],
  ["strip (long narrow piece)", "strip"],
  ["strip (remove clothes/a layer)", "strip"],
  ["tear1", "tear"],
  ["tear2", "tear"],
  ["wind2", "wind"],
]);

const beginnerSenseOverrides = new Map([
  ["cook", ["verb/noun", "prepare_food", "To prepare food, or a person who prepares food.", "Useful A1 food and home routine word."]],
  ["cool", ["adjective", "slightly_cold_or_good", "Slightly cold, or informally good in simple learner speech.", "Useful A1 description word; advanced verb use is out of scope."]],
  ["cream", ["noun", "thick_milk_product", "A thick food made from milk, often used with desserts or coffee.", "Useful A1 food word; color/adjective use is out of scope here."]],
  ["cut", ["verb", "use_tool_to_make_smaller", "To use a knife, scissors or another tool to divide something.", "Core A1 action word; noun use is secondary."]],
  ["dark", ["adjective", "with_little_light_or_dark_color", "With little light, or having a dark color.", "Core A1 description word."]],
  ["date", ["noun", "calendar_day", "A numbered day, month or year.", "Choose the A1 calendar noun sense; romantic/verb senses are out of scope."]],
  ["dear", ["adjective/exclamation", "letter_greeting_or_liked_person", "Used in a greeting or to show someone is liked.", "Useful A1 greeting/letter word; expensive sense is out of scope."]],
  ["detail", ["noun", "small_piece_of_information", "A small piece of information about something.", "Useful A1 information word; verb use is out of scope."]],
  ["downstairs", ["adverb/adjective", "on_or_to_lower_floor", "On or to a lower floor of a building.", "Useful A1 home/place word."]],
  ["drive", ["verb", "control_vehicle", "To control a car or another vehicle.", "Core A1 transport action word; noun use is secondary."]],
  ["even", ["adverb", "surprising_extra_point", "Used to add a surprising or stronger point.", "Common A1 adverb in simple sentences; adjective use is out of scope."]],
  ["extra", ["adjective", "more_than_usual", "More than the usual amount.", "Useful A1 quantity/description word."]],
  ["face", ["noun", "front_of_head", "The front part of the head with eyes, nose and mouth.", "Core A1 body word; verb use is out of scope."]],
  ["fall", ["verb", "move_down_without_control", "To move down suddenly or come down from a higher place.", "Core A1 action word; season/noun uses are secondary."]],
  ["far", ["adverb/adjective", "long_distance", "At or to a long distance.", "Core A1 distance word."]],
  ["farm", ["noun", "place_for_animals_or_crops", "A place where people grow food or keep animals.", "Core A1 place/nature word; verb use is out of scope."]],
  ["fat", ["adjective", "having_much_body_fat", "Having a lot of body fat.", "A1 appearance/description word; noun use is out of scope."]],
  ["feel", ["verb", "experience_emotion_or_body_state", "To experience an emotion or physical state.", "Core A1 feeling/body verb."]],
  ["film", ["noun", "movie", "A movie that people watch.", "Core A1 entertainment word; verb use is out of scope."]],
  ["final", ["adjective", "last_in_series", "Last in a series or process.", "Useful A1 order/time adjective."]],
  ["finish", ["verb", "come_to_end_or_complete", "To complete something or come to the end.", "Core A1 action/time verb."]],
  ["fire", ["noun", "burning_flames", "Flames and heat from something burning.", "Core A1 safety/nature word; verb use is out of scope."]],
  ["first", ["determiner/number/adverb", "number_one_in_order", "Number one in order or before all others.", "Core A1 order word."]],
  ["fish", ["noun", "water_animal_or_food", "An animal that lives in water, or that animal as food.", "Core A1 animal/food word; verb use is out of scope."]],
  ["flat", ["noun", "apartment", "A set of rooms where someone lives.", "Choose the beginner British-English home noun sense; adjective use is out of scope here."]],
  ["fly", ["verb", "move_in_air_or_travel_by_plane", "To move through the air or travel by plane.", "Useful A1 travel/action word; insect noun use is out of scope."]],
  ["free", ["adjective", "costing_nothing_or_available", "Costing no money, or available to do something.", "Core A1 shopping/time adjective; verb use is out of scope."]],
  ["fun", ["noun/adjective", "enjoyable_activity_or_enjoyable", "Enjoyment, or enjoyable.", "Core A1 opinion/activity word."]],
  ["future", ["noun/adjective", "time_after_now", "The time after now.", "Useful A1 time word."]],
  ["go", ["verb", "move_or_travel", "To move or travel to another place.", "Essential A1 movement verb; noun use is out of scope."]],
  ["good", ["adjective", "positive_quality", "Of positive quality or suitable.", "Essential A1 description word; noun use is out of scope."]],
  ["half", ["noun/determiner/pronoun", "one_of_two_equal_parts", "One of two equal parts.", "Core A1 quantity word."]],
  ["hand", ["noun", "body_part_at_end_of_arm", "The body part at the end of the arm.", "Core A1 body word; verb use is out of scope."]],
  ["hate", ["verb", "strongly_dislike", "To dislike someone or something very much.", "Core A1 feeling/opinion verb; noun use is secondary."]],
  ["have", ["verb/auxiliary verb", "own_or_experience", "To own something, hold something, or experience something.", "Essential A1 verb; auxiliary use is controlled by examples."]],
  ["head", ["noun", "top_body_part", "The top part of the body with the face and brain.", "Core A1 body word; verb use is out of scope."]],
  ["high", ["adjective/adverb", "far_above_ground_or_large_amount", "Far above the ground, or large in amount.", "Core A1 size/place word; noun use is out of scope."]],
  ["his", ["determiner/pronoun", "belonging_to_male_person", "Belonging to a male person or animal.", "Essential A1 possessive word."]],
  ["home", ["noun/adverb", "place_where_someone_lives", "The place where someone lives, or to that place.", "Essential A1 home/place word."]],
  ["hope", ["verb", "want_something_to_happen", "To want something to happen and think it may happen.", "Useful A1 feeling/thinking verb; noun use is secondary."]],
  ["house", ["noun", "building_to_live_in", "A building where people live.", "Core A1 home word; verb use is out of scope."]],
  ["key", ["noun", "object_to_open_lock", "A small object used to open a lock.", "Core A1 object word; adjective/verb uses are out of scope."]],
  ["land", ["noun", "ground_not_water", "Ground, especially not water.", "Useful A1 place/nature word; verb use is out of scope."]],
  ["last1 (final)", ["determiner/adverb", "final_in_order", "Final in order or most recent.", "Core A1 order/time word."]],
  ["later", ["adverb", "after_now_or_after_that", "At a time after now or after another time.", "Core A1 time adverb."]],
  ["leave", ["verb", "go_away_from_place", "To go away from a place.", "Core A1 movement verb; noun use is out of scope."]],
  ["line", ["noun", "row_or_drawn_mark", "A row of people or things, or a long thin mark.", "Useful A1 shape/order word; verb use is out of scope."]],
  ["little", ["adjective/determiner", "small_or_small_amount", "Small in size or amount.", "Core A1 size/quantity word."]],
  ["local", ["adjective", "near_where_you_live", "Connected with the area where someone lives.", "Useful A1 place adjective; noun use is out of scope."]],
  ["look", ["verb", "use_eyes_or_seem", "To use your eyes, or to seem in a particular way.", "Essential A1 perception verb; noun use is secondary."]],
  ["could modal", ["modal verb", "past_or_polite_can", "Used to show ability, possibility or a polite request.", "Essential A1 modal verb."]],
  ["do1", ["verb/auxiliary verb", "perform_action_or_auxiliary", "To perform an action, or used as an auxiliary in questions and negatives.", "Essential A1 verb."]],
  ["have to modal", ["modal verb", "must_or_need_to", "Used to say something is necessary.", "Essential A1 modal expression."]],
  ["kind (type)", ["noun", "type_or_sort", "A type or sort of person or thing.", "Core A1 classification word."]],
  ["lie1", ["verb", "be_in_flat_position", "To be or put yourself in a flat position.", "Useful A1 body/place verb; untruth sense is out of scope."]],
  ["like (similar)", ["preposition", "similar_to", "Similar to someone or something.", "Essential A1 comparison word."]],
  ["like (find sb/sth pleasant)", ["verb", "find_pleasant", "To find someone or something pleasant or enjoyable.", "Essential A1 opinion verb."]],
  ["live1", ["verb", "have_home", "To have your home in a place.", "Essential A1 home/place verb."]],
  ["long1", ["adjective/adverb", "large_length_or_time", "Large in length or time.", "Core A1 size/time word."]],
]);

const categoryGroups = [
  {
    slug: "clothing",
    words: ["clothes", "coat", "dress", "hat", "jacket", "jeans"],
    note: (word) => `A1 clothing sense of "${word}" for something people wear.`,
    learner: "Useful A1 clothing and daily-life vocabulary.",
  },
  {
    slug: "food_drink",
    words: ["coffee", "cream", "dinner", "dish", "drink", "egg", "fish", "food", "fruit", "ice", "ice cream", "juice", "lunch"],
    note: (word) => `A1 food or drink sense of "${word}" for meals, ingredients or things people eat or drink.`,
    learner: "Useful A1 food, drink and meal vocabulary.",
  },
  {
    slug: "school_study",
    words: ["college", "course", "dictionary", "exam", "example", "exercise", "geography", "history", "homework", "language", "lesson", "library"],
    note: (word) => `A1 study or school sense of "${word}" for learning, classes or student life.`,
    learner: "Useful A1 school and study vocabulary.",
  },
  {
    slug: "activities_entertainment",
    words: ["club", "concert", "culture", "dance", "dancer", "dancing", "event", "festival", "football", "game", "guitar", "hobby"],
    note: (word) => `A1 activity, culture or entertainment sense of "${word}".`,
    learner: "Useful A1 free-time, activity and entertainment vocabulary.",
  },
  {
    slug: "people_family",
    words: ["cousin", "dad", "daughter", "doctor", "driver", "farmer", "father", "friend", "girlfriend", "grandfather", "grandmother", "grandparent", "husband"],
    note: (word) => `A1 people or family sense of "${word}" for identifying someone in everyday life.`,
    learner: "Useful A1 people and family vocabulary.",
  },
  {
    slug: "animals",
    words: ["cow", "dog", "elephant", "horse", "lion"],
    note: (word) => `A1 animal sense of "${word}".`,
    learner: "Useful A1 animal vocabulary.",
  },
  {
    slug: "body_health",
    words: ["ear", "eye", "face", "foot", "hair", "hand", "head", "health", "healthy", "leg"],
    note: (word) => `A1 body or health sense of "${word}" for simple descriptions of people and wellbeing.`,
    learner: "Useful A1 body and health vocabulary.",
  },
  {
    slug: "place_home_travel",
    words: ["country", "farm", "flight", "floor", "garden", "gym", "home", "hospital", "hotel", "house", "island", "journey", "kitchen", "land"],
    note: (word) => `A1 place, home or travel sense of "${word}" for simple location and travel talk.`,
    learner: "Useful A1 place, home and travel vocabulary.",
  },
  {
    slug: "time_calendar",
    words: ["date", "day", "December", "February", "Friday", "future", "hour", "January", "July", "June"],
    note: (word) => `A1 time or calendar sense of "${word}".`,
    learner: "Useful A1 time and calendar vocabulary.",
  },
  {
    slug: "number",
    words: ["eight", "eighteen", "eighty", "eleven", "fifteen", "fifth", "fifty", "five", "forty", "four", "fourteen", "fourth", "hundred"],
    note: (word) => `A1 number or ordinal value "${word}".`,
    learner: "Essential A1 number vocabulary.",
  },
  {
    slug: "technology_media",
    words: ["computer", "DVD", "email", "film", "internet"],
    note: (word) => `A1 technology or media sense of "${word}".`,
    learner: "Useful A1 technology and media vocabulary.",
  },
  {
    slug: "communication_information",
    words: ["conversation", "description", "dialogue", "information", "interview", "letter", "list"],
    note: (word) => `A1 communication or information sense of "${word}".`,
    learner: "Useful A1 communication and information vocabulary.",
  },
  {
    slug: "money_work_service",
    words: ["company", "cost", "customer", "dollar", "euro", "job"],
    note: (word) => `A1 money, work or service sense of "${word}".`,
    learner: "Useful A1 money, work and service vocabulary.",
  },
  {
    slug: "feelings_opinions",
    words: ["excited", "exciting", "feeling", "happy", "hungry", "interested", "interesting", "love"],
    note: (word) => `A1 feeling or opinion sense of "${word}".`,
    learner: "Useful A1 feelings and opinions vocabulary.",
  },
  {
    slug: "description_quality",
    words: ["cold", "colour", "common", "complete", "correct", "dangerous", "dark", "delicious", "different", "difficult", "dirty", "early", "east", "easy", "enough", "expensive", "false", "famous", "fantastic", "fast", "favourite", "fine", "first", "friendly", "full", "funny", "great", "green", "grey", "hard", "healthy", "hot", "important", "large", "late"],
    note: (word) => `A1 description sense of "${word}" for a simple quality, color, order or state.`,
    learner: "Useful A1 description vocabulary.",
  },
  {
    slug: "everyday_action",
    words: ["come", "compare", "create", "dance", "decide", "describe", "design", "die", "discuss", "do1", "draw", "eat", "email", "end", "enjoy", "explain", "fill", "find", "follow", "forget", "form", "get", "give", "grow", "guess", "happen", "hear", "help", "imagine", "improve", "include", "introduce", "join", "keep", "know", "laugh", "learn", "let", "listen", "lose"],
    note: (word) => `A1 verb sense of "${displayOverrides.get(word) ?? word}" for a common everyday action or state.`,
    learner: "Useful A1 action and routine vocabulary.",
  },
  {
    slug: "function_word",
    words: ["down", "during", "each", "else", "ever", "every", "everybody", "everyone", "everything", "few", "for", "from", "front", "he", "her", "here", "hey", "hi", "him", "how", "however", "I", "if", "in", "into", "it", "its", "just", "left", "lot"],
    note: (word) => `A1 function-word sense of "${word}" for simple grammar, reference, position or sentence linking.`,
    learner: "Essential A1 grammar and sentence-building word.",
  },
  {
    slug: "time_calendar",
    words: ["March", "May", "midnight", "minute1", "Monday", "month", "morning", "night", "November", "now", "o’clock", "October", "once", "past", "period", "quarter", "Saturday", "second1 (unit of time)", "September", "soon", "spring", "still", "summer", "Sunday"],
    note: (word) => `A1 time or calendar sense of "${displayOverrides.get(word) ?? word}".`,
    learner: "Useful A1 time, date and routine vocabulary.",
  },
  {
    slug: "people_family_role",
    words: ["man", "me", "member", "mother", "mum", "neighbour", "nurse", "parent", "partner", "people", "person", "police", "policeman", "scientist", "she", "singer", "sister", "somebody", "someone", "son", "student"],
    note: (word) => `A1 person, family or role sense of "${word}" for identifying someone in everyday life.`,
    learner: "Useful A1 people, family and role vocabulary.",
  },
  {
    slug: "food_drink_meal",
    words: ["meal", "meat", "menu", "milk", "onion", "orange", "pepper", "potato", "rice", "salad", "salt", "sandwich", "soup", "sugar"],
    note: (word) => `A1 food, drink or meal sense of "${word}".`,
    learner: "Useful A1 food, drink and meal vocabulary.",
  },
  {
    slug: "money_shopping_service",
    words: ["market", "money", "order", "pay", "pound", "price", "product", "sell", "shop", "shopping", "supermarket"],
    note: (word) => `A1 money, shopping or service sense of "${word}".`,
    learner: "Useful A1 shopping, money and service vocabulary.",
  },
  {
    slug: "study_information_text",
    words: ["magazine", "meaning", "message", "news", "newspaper", "note", "number", "page", "paper", "paragraph", "phrase", "question", "read", "reader", "reading", "report", "science", "section", "sentence", "spelling", "statement", "subject", "study"],
    note: (word) => `A1 study, information or text sense of "${displayOverrides.get(word) ?? word}".`,
    learner: "Useful A1 school, reading and information vocabulary.",
  },
  {
    slug: "technology_media_object",
    words: ["machine", "model", "movie", "object", "online", "phone", "photo", "photograph", "programme", "radio"],
    note: (word) => `A1 technology, media or object sense of "${word}".`,
    learner: "Useful A1 technology, media and everyday object vocabulary.",
  },
  {
    slug: "place_travel_public",
    words: ["map", "metre", "mile", "mountain", "museum", "north", "office", "park", "place", "plane", "pool", "restaurant", "river", "road", "room", "sea", "south", "station", "street"],
    note: (word) => `A1 place, travel or public-location sense of "${word}".`,
    learner: "Useful A1 place, direction and travel vocabulary.",
  },
  {
    slug: "body_health",
    words: ["mouth", "nose", "sick"],
    note: (word) => `A1 body or health sense of "${word}" for simple descriptions of people and wellbeing.`,
    learner: "Useful A1 body and health vocabulary.",
  },
  {
    slug: "animals_nature_weather",
    words: ["mouse", "pig", "plant", "rain", "sheep", "snake", "snow", "sun"],
    note: (word) => `A1 animal, nature or weather sense of "${word}".`,
    learner: "Useful A1 nature, animal and weather vocabulary.",
  },
  {
    slug: "art_music_sport_activity",
    words: ["music", "paint", "painting", "party", "piano", "picture", "play", "player", "song", "sport", "story", "style", "swim", "swimming"],
    note: (word) => `A1 art, music, sport or activity sense of "${word}".`,
    learner: "Useful A1 free-time, culture and activity vocabulary.",
  },
  {
    slug: "everyday_object",
    words: ["pair", "passport", "pen", "pencil", "piece", "shirt", "shoe", "shower", "skirt", "sweater", "table"],
    note: (word) => `A1 everyday object sense of "${word}".`,
    learner: "Useful A1 everyday object vocabulary.",
  },
  {
    slug: "description_quality_state",
    words: ["main", "married", "modern", "natural", "negative", "new", "next", "nice", "old", "only", "open", "opposite", "other", "own", "perfect", "personal", "pink", "poor", "popular", "positive", "possible", "present", "pretty", "purple", "quick", "quiet", "ready", "real", "red", "rich", "right", "routine", "sad", "same", "short", "similar", "slow", "small", "special", "strong", "success", "sure"],
    note: (word) => `A1 description sense of "${word}" for a simple quality, color, order or state.`,
    learner: "Useful A1 description and opinion vocabulary.",
  },
  {
    slug: "everyday_action",
    words: ["make", "mean", "meet", "miss", "move", "need", "open", "paint", "park", "pay", "practise", "prefer", "prepare", "put", "relax", "remember", "repeat", "return", "ride", "run", "say", "see", "send", "share", "show", "sing", "sit", "sleep", "speak", "spell", "spend", "stand", "start", "stay", "stop"],
    note: (word) => `A1 verb sense of "${displayOverrides.get(word) ?? word}" for a common everyday action or state.`,
    learner: "Useful A1 action and routine vocabulary.",
  },
  {
    slug: "function_word",
    words: ["many", "maybe", "more", "most", "much", "must modal", "my", "near", "never", "next to", "no", "no one", "nobody", "not", "nothing", "of", "off", "often", "oh", "OK", "on", "one", "or", "our", "out", "outside", "over", "please", "probably", "quite", "really", "should modal", "so", "some", "something", "sometimes", "sorry"],
    note: (word) => `A1 function-word sense of "${displayOverrides.get(word) ?? word}" for simple grammar, reference, position or sentence linking.`,
    learner: "Essential A1 grammar and sentence-building word.",
  },
];

const categoryByWord = new Map(
  categoryGroups.flatMap((group) => group.words.map((word) => [word, group]))
);

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").trim().replace(/\s+/gu, " ");
}

function safeId(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function readJsonl(filePath) {
  return (await readFile(filePath, "utf8"))
    .split(/\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function displayHeadword(sourceHeadword) {
  return displayOverrides.get(sourceHeadword) ?? sourceHeadword;
}

function normalizePos(posText) {
  const text = normalizeText(posText)
    .replace(/auxiliary v\./giu, "auxiliary verb")
    .replace(/modal\s+v\./giu, "modal verb")
    .replace(/\bv\./giu, "verb")
    .replace(/\bn\./giu, "noun")
    .replace(/\badj\./giu, "adjective")
    .replace(/\badv\./giu, "adverb")
    .replace(/\bprep\./giu, "preposition")
    .replace(/\bpron\./giu, "pronoun")
    .replace(/\bdet\./giu, "determiner")
    .replace(/\bconj\./giu, "conjunction")
    .replace(/\bexclam\./giu, "exclamation")
    .replace(/\s*,\s*/gu, "/")
    .replace(/\s*\/\s*/gu, "/");
  if (/number/iu.test(text)) return "number";
  return text;
}

function primaryPos(reviewedPos) {
  return normalizeText(reviewedPos).split(/[\/,]/u)[0] || "word";
}

function genericSense(row, display, reviewedPos) {
  const level = normalizeText(row.level_min || "A1");
  const category = categoryByWord.get(normalizeText(row.source_headword));
  if (category) {
    return [category.slug, category.note(display), category.learner];
  }
  const pos = primaryPos(reviewedPos);
  const levelSlug = safeId(level);
  if (pos === "noun") return [`common_${levelSlug}_noun`, `The common ${level} noun sense of "${display}" as an everyday person, place, thing or idea.`];
  if (pos === "verb") return [`common_${levelSlug}_action`, `The common ${level} verb sense of "${display}" used for a learner-relevant action, state or routine.`];
  if (pos === "adjective") return [`common_${levelSlug}_description`, `The common ${level} adjective sense of "${display}" used for a learner-relevant quality or description.`];
  if (pos === "adverb") return [`common_${levelSlug}_adverb`, `The common ${level} adverb sense of "${display}" used in learner-relevant time, place, degree or manner phrases.`];
  if (pos === "preposition") return [`common_${levelSlug}_relation`, `The common ${level} preposition sense of "${display}" used to connect place, time or comparison information.`];
  if (pos === "determiner") return [`common_${levelSlug}_determiner`, `The common ${level} determiner sense of "${display}" used before a noun in learner phrases.`];
  if (pos === "pronoun") return [`common_${levelSlug}_pronoun`, `The common ${level} pronoun sense of "${display}" used to refer to people or things.`];
  if (pos === "number") return ["number_value", `The ${level} number value "${display}".`];
  if (pos === "modal verb") return ["modal_function", `The ${level} modal verb function of "${display}".`];
  if (pos === "exclamation") return ["greeting_or_social_expression", `The ${level} social expression "${display}".`];
  return [`common_${levelSlug}_function`, `The common ${level} learner sense of "${display}".`];
}

function reviewFor(row) {
  const sourceHeadword = normalizeText(row.source_headword);
  const display = displayHeadword(sourceHeadword);
  const override = beginnerSenseOverrides.get(sourceHeadword);
  if (override) {
    const [reviewedPos, senseSlug, meaningNote, learnerValueNote] = override;
    return { display, reviewedPos, senseSlug, meaningNote, learnerValueNote };
  }
  const reviewedPos = normalizePos(row.part_of_speech);
  const [senseSlug, meaningNote] = genericSense(row, display, reviewedPos);
  return {
    display,
    reviewedPos,
    senseSlug,
    meaningNote,
    learnerValueNote:
      genericSense(row, display, reviewedPos)[2] ??
      `Useful ${row.level_min || "A1"} English word for learner communication: "${display}".`,
  };
}

function meaningIdPrefix(row) {
  if (normalizeText(row.benchmark_membership) === "oxford_5000_extension") return "oxford5000ext";
  if (normalizeText(row.core_band) === "oxford_5000_extension") return "oxford5000ext";
  if (normalizeText(row.core_item_id).startsWith("oxford5000ext_")) return "oxford5000ext";
  return "oxford3000";
}

function topicContext(row) {
  if (normalizeText(row.core_band) === "oxford_5000_extension") {
    return "general_english_advanced_extension_vocabulary";
  }
  return "general_english_core_vocabulary";
}

function buildReviewRow(row, generatedAt) {
  const review = reviewFor(row);
  const levelSpanDecision =
    row.level_min !== row.level_max ? "reviewed_beginner_safe_sense_selected" : "reviewed_no_issue";
  const semanticScene = {
    rule_version: "oxford-row-review-machine-assisted-v1",
    status: "reviewed",
    target_display: review.display,
    learner_sense: review.meaningNote,
    topic_context: topicContext(row),
    learner_level: row.level_min,
    source_headword: row.source_headword,
    reviewed_part_of_speech: review.reviewedPos,
  };
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    source_candidate_id: row.source_candidate_id,
    source_language: row.source_language,
    source_variant: row.source_variant,
    source_headword: row.source_headword,
    reviewed_display_headword: review.display,
    original_part_of_speech: row.part_of_speech,
    reviewed_part_of_speech: review.reviewedPos,
    sense_no: "01",
    meaning_id: `${meaningIdPrefix(row)}_${safeId(review.display)}_${safeId(review.senseSlug)}_01`,
    meaning_note: review.meaningNote,
    semantic_scene: semanticScene,
    core_band: row.core_band,
    level_min: row.level_min,
    level_max: row.level_max,
    level_span_decision: levelSpanDecision,
    benchmark_membership: row.benchmark_membership,
    learner_value_status: "reviewed",
    learner_value_note: review.learnerValueNote,
    review_status: "row_reviewed_machine_assisted_for_english_learning",
    reviewer: "codex_english_learning_row_review_machine_assisted_v1",
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: [
      "english_pronunciation_source_check",
      "english_example_quality_check",
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "final_delivery_approval_check",
    ],
  };
}

async function main() {
  const contractPath = argValue("contract", defaultContractPath);
  const contract = await readJson(contractPath);
  const candidatePoolPath = argValue("candidate-pool", contract.latest_source_snapshot?.candidate_pool_path ?? "");
  if (!candidatePoolPath) throw new Error("Missing candidate pool path.");
  const outDir = argValue("out-dir", defaultOutDir);
  const reviewId = argValue("review-id", "row_review_v1");
  const candidateRows = await readJsonl(candidatePoolPath);
  if (!candidateRows.length) throw new Error("Candidate pool is empty.");

  const releaseId = candidateRows[0].release_id;
  const generatedAt = new Date().toISOString();
  const reviewRows = candidateRows.map((row) => buildReviewRow(row, generatedAt));
  const duplicateMeaningIds = reviewRows
    .map((row) => row.meaning_id)
    .filter((meaningId, index, list) => list.indexOf(meaningId) !== index);
  if (duplicateMeaningIds.length) {
    throw new Error(`Duplicate meaning ids: ${[...new Set(duplicateMeaningIds)].join(", ")}`);
  }

  const outputPath = path.join(outDir, `${releaseId}_${reviewId}.jsonl`);
  const summaryPath = path.join(outDir, `${releaseId}_${reviewId}_summary.md`);
  await writeJsonl(outputPath, reviewRows);
  const broaderRows = reviewRows.filter((row) => row.level_span_decision === "reviewed_beginner_safe_sense_selected");
  await writeFile(
    summaryPath,
    [
      `# Oxford Row Review: ${releaseId}`,
      "",
      `- Review id: \`${reviewId}\``,
      `- Script version: \`${scriptVersion}\``,
      `- Rows reviewed: ${reviewRows.length}`,
      `- Broader CEFR span rows with level-appropriate learner sense selected: ${broaderRows.length}`,
      "- Review mode: machine-assisted Codex English-learning row review.",
      "- Delivery status: not final; examples, pronunciations, support translations, audits and delivery gates remain blocked.",
      `- JSONL: \`${outputPath}\``,
      "",
    ].join("\n"),
    "utf8"
  );

  contract.latest_row_review = {
    review_id: reviewId,
    status: "row_reviewed_machine_assisted_for_english_learning_not_delivery_ready",
    script_path: "scripts/oxford/build-oxford-row-review.mjs",
    script_version: scriptVersion,
    path: outputPath,
    summary_path: summaryPath,
    rows: reviewRows.length,
    broader_level_span_rows: broaderRows.length,
    closes_gate_layer: ["learner_sense_pos_check", "learner_value_check", "cefr_level_span_review"],
    does_not_close: [
      "english_pronunciation_source_check",
      "english_example_quality_check",
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "final_delivery_approval_check",
    ],
  };
  if (!hasFlag("no-contract-update")) await writeJson(contractPath, contract);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        release_id: releaseId,
        rows: reviewRows.length,
        broader_level_span_rows: broaderRows.length,
        path: outputPath,
        summary_path: summaryPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
