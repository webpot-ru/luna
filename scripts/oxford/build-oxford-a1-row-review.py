#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"


REVIEWS = {
    "a, an": ("indefinite article", "indefinite_article", "Indefinite article used before one singular count noun when the listener does not know which one.", "Essential A1 grammar word for naming one unspecified thing."),
    "about": ("preposition/adverb", "about_topic_or_approximate", "Used to show the topic of something or an approximate amount.", "Core A1 function word for topics and simple approximate information."),
    "above": ("preposition/adverb", "higher_position", "In or to a higher place than someone or something.", "Common A1 location word for simple position."),
    "across": ("preposition/adverb", "from_one_side_to_other", "From one side of a place or surface to the other side.", "Useful A1 movement and location word."),
    "action": ("noun", "thing_done", "Something that a person does.", "Core learner word for talking about doing things."),
    "activity": ("noun", "thing_people_do", "Something that people do, especially for interest or practice.", "Useful A1 word for classes, free time and routines."),
    "actor": ("noun", "male_or_any_performer", "A person who performs in a film, play or show.", "Common A1 people/entertainment word."),
    "actress": ("noun", "female_performer", "A female actor in a film, play or show.", "Common A1 people/entertainment word."),
    "add": ("verb", "put_with_or_calculate_more", "To put something with something else or calculate a total.", "Useful A1 action word for school, cooking and numbers."),
    "address": ("noun", "place_contact_details", "The details of where a person lives or where a place is.", "Choose the A1 noun sense; the verb sense is not used for this beginner row."),
    "adult": ("noun/adjective", "grown_person_or_grown", "A fully grown person, or fully grown.", "Useful A1 people/age word."),
    "advice": ("noun", "helpful_suggestion", "An idea or suggestion about what someone should do.", "Useful A1 communication word."),
    "afraid": ("adjective", "feeling_fear", "Feeling fear or worry.", "Core A1 feeling word."),
    "after": ("preposition/conjunction/adverb", "later_than", "Later than a time, event or person in order.", "Core A1 time/order word."),
    "afternoon": ("noun", "part_of_day_after_noon", "The part of the day after noon and before evening.", "Core A1 time word."),
    "again": ("adverb", "one_more_time", "One more time or as before.", "Core A1 frequency/repetition word."),
    "age": ("noun", "how_old", "How old a person or thing is.", "Choose the A1 noun sense; the verb sense is not used for this beginner row."),
    "ago": ("adverb", "before_now", "Used with a time expression to mean before now.", "Core A1 past-time word."),
    "agree": ("verb", "have_same_opinion_or_say_yes", "To have the same opinion or say yes to a plan.", "Useful A1 communication word."),
    "air": ("noun", "gas_around_us", "The gas around us that people breathe.", "Core A1 nature/everyday word."),
    "airport": ("noun", "place_for_planes", "A place where planes arrive and leave.", "Useful A1 travel word."),
    "all": ("determiner/pronoun", "whole_amount", "The whole number or amount of people or things.", "Core A1 quantity word; advanced adverb use is out of scope."),
    "also": ("adverb", "in_addition", "In addition; too.", "Core A1 linking word."),
    "always": ("adverb", "every_time", "Every time or at all times.", "Core A1 frequency word."),
    "amazing": ("adjective", "very_surprising_or_good", "Very surprising or very good.", "Useful A1 opinion word."),
    "and": ("conjunction", "joins_words_or_clauses", "Used to join words, phrases or clauses.", "Essential A1 linking word."),
    "angry": ("adjective", "feeling_mad", "Feeling strong displeasure.", "Core A1 feeling word."),
    "animal": ("noun", "living_creature", "A living creature that is not a plant.", "Core A1 nature word."),
    "another": ("determiner/pronoun", "one_more_or_different", "One more person or thing, or a different one.", "Core A1 quantity/reference word."),
    "answer": ("noun/verb", "reply_or_solution", "A reply to a question, or to give that reply.", "Useful A1 classroom and communication word."),
    "any": ("determiner/pronoun", "some_in_questions_or_negatives", "Used in questions and negatives to mean some or one.", "Core A1 determiner/pronoun use; advanced adverb use is out of scope."),
    "anyone": ("pronoun", "any_person", "Any person.", "Core A1 pronoun for people."),
    "anything": ("pronoun", "any_thing", "Any thing.", "Core A1 pronoun for things."),
    "apartment": ("noun", "place_to_live", "A set of rooms for living in, usually in one building.", "Common A1 home word."),
    "apple": ("noun", "fruit", "A round fruit with firm white flesh and red, green or yellow skin.", "Core A1 food word."),
    "April": ("noun", "month_april", "The fourth month of the year.", "Core A1 calendar word."),
    "area": ("noun", "part_of_place", "A part of a place, town, country or surface.", "Useful A1 place word."),
    "arm": ("noun", "body_part", "The body part from the shoulder to the hand.", "Core A1 body word."),
    "around": ("preposition/adverb", "surrounding_or_near", "In a circle, surrounding something, or in different places near something.", "Useful A1 place/movement word."),
    "arrive": ("verb", "reach_place", "To reach a place.", "Core A1 travel/action word."),
    "art": ("noun", "creative_work", "Pictures, objects, music or activities made by imagination and skill.", "Useful A1 school/culture word."),
    "article": ("noun", "piece_of_writing", "A piece of writing in a newspaper, magazine or website.", "Choose the beginner writing/media sense."),
    "artist": ("noun", "person_making_art", "A person who makes art, especially pictures or objects.", "Useful A1 people/culture word."),
    "as": ("conjunction/preposition", "role_or_comparison_function", "Used to show role, comparison or that things happen at the same time.", "Common A1 function word; exact learner use must be example-controlled."),
    "ask": ("verb", "request_answer_or_help", "To say or write something to get an answer, information or help.", "Core A1 communication word."),
    "at": ("preposition", "specific_place_or_time", "Used to show a specific place or time.", "Essential A1 place/time preposition."),
    "August": ("noun", "month_august", "The eighth month of the year.", "Core A1 calendar word."),
    "aunt": ("noun", "parent_sister_or_uncle_wife", "The sister of a parent, or the wife of an uncle.", "Core A1 family word."),
    "autumn": ("noun", "season_after_summer", "The season after summer and before winter.", "Core A1 season word."),
    "away": ("adverb", "not_here_or_to_other_place", "Not here, or to another place.", "Core A1 place/movement word."),
    "baby": ("noun", "very_young_child", "A very young child.", "Core A1 family/people word."),
    "back": ("noun/adverb", "rear_or_return", "The rear part of something, or to the place where someone was before.", "Choose beginner body/place return senses; advanced verb/adjective uses are out of scope."),
    "bad": ("adjective", "not_good", "Not good or unpleasant.", "Core A1 opinion/quality word."),
    "bag": ("noun", "container_to_carry_things", "A container used for carrying things.", "Core A1 everyday object word."),
    "ball": ("noun", "round_object_for_games", "A round object used in games and sports.", "Core A1 object/sport word."),
    "banana": ("noun", "fruit", "A long curved yellow fruit.", "Core A1 food word."),
    "band": ("noun", "music_group", "A group of people who play music together.", "Common A1 entertainment word."),
    "bank (money)": ("noun", "money_institution", "A place or business where people keep, pay or borrow money.", "Choose the money institution sense, not river edge."),
    "bath": ("noun", "washing_in_tub", "Washing the body in a tub of water, or the tub itself.", "Core A1 home/bathroom word."),
    "bathroom": ("noun", "room_for_washing_or_toilet", "A room with a bath, shower or toilet.", "Core A1 home word."),
    "be": ("verb/auxiliary verb", "exist_or_link_subject", "The basic verb used to say what someone or something is, where it is or how it is.", "Essential A1 verb."),
    "beach": ("noun", "sand_or_stones_by_water", "An area of sand or stones beside the sea or a lake.", "Common A1 travel/nature word."),
    "beautiful": ("adjective", "very_nice_to_see", "Very pleasing to see, hear or experience.", "Core A1 description word."),
    "because": ("conjunction", "gives_reason", "Used to give the reason for something.", "Essential A1 reason linker."),
    "become": ("verb", "start_to_be", "To start to be something.", "Common A1 change verb."),
    "bed": ("noun", "furniture_for_sleeping", "A piece of furniture used for sleeping.", "Core A1 home word."),
    "bedroom": ("noun", "room_for_sleeping", "A room for sleeping in.", "Core A1 home word."),
    "beer": ("noun", "alcoholic_drink", "An alcoholic drink made from grain.", "Common A1 food/drink word."),
    "before": ("preposition/conjunction/adverb", "earlier_than", "Earlier than a time, event or person in order.", "Core A1 time/order word."),
    "begin": ("verb", "start", "To start.", "Core A1 action/time verb."),
    "beginning": ("noun", "start_part", "The first part of something.", "Core A1 time/order word."),
    "behind": ("preposition/adverb", "at_the_back_of", "At or to the back of someone or something.", "Core A1 location word."),
    "believe": ("verb", "think_true", "To think that something is true.", "Useful A1 thinking/communication word."),
    "below": ("preposition/adverb", "lower_position", "In or to a lower place than something.", "Core A1 location word."),
    "best": ("adjective/adverb", "highest_quality", "Of the highest quality or most suitable.", "Choose the beginner superlative quality use; noun use is out of scope."),
    "better": ("adjective/adverb", "more_good", "More good than something else, or improved.", "Choose the beginner comparative quality use; noun use is out of scope."),
    "between": ("preposition/adverb", "in_middle_of_two", "In the middle of two people, places or things.", "Core A1 location/relationship word."),
    "bicycle": ("noun", "two_wheel_vehicle", "A vehicle with two wheels that a person moves by pedals.", "Core A1 transport word."),
    "big": ("adjective", "large_size", "Large in size or amount.", "Core A1 size word."),
    "bike": ("noun", "bicycle", "A bicycle.", "Core A1 transport word."),
    "bill": ("noun", "request_for_payment", "A paper or message that says how much money must be paid.", "Choose the A1 payment noun sense; verb sense is out of scope."),
    "bird": ("noun", "animal_with_wings", "An animal with wings and feathers.", "Core A1 animal word."),
    "birthday": ("noun", "day_of_birth_anniversary", "The day each year when someone celebrates being born.", "Core A1 date/family word."),
    "black": ("adjective/noun", "color_black", "The very dark color of coal or night.", "Core A1 color word."),
    "blog": ("noun", "online_writing_page", "A website or page with regular personal or topic-based posts.", "Useful A1 technology/media word."),
    "blonde": ("adjective", "light_yellow_hair", "Having light yellow hair.", "Common A1 appearance word."),
    "blue": ("adjective/noun", "color_blue", "The color of a clear sky.", "Core A1 color word."),
    "boat": ("noun", "small_water_vehicle", "A vehicle used for travelling on water.", "Core A1 transport word."),
    "body": ("noun", "whole_physical_person_or_animal", "The whole physical form of a person or animal.", "Core A1 body word."),
    "book": ("noun", "written_pages_to_read", "A set of printed or digital pages that people read.", "Choose the A1 noun sense; reservation verb is out of scope."),
    "boot": ("noun", "shoe_covering_ankle", "A strong shoe that covers the foot and part of the leg.", "Common A1 clothing word."),
    "bored": ("adjective", "feeling_not_interested", "Feeling tired or unhappy because something is not interesting.", "Core A1 feeling word."),
    "boring": ("adjective", "not_interesting", "Not interesting.", "Core A1 opinion word."),
    "born": ("verb/adjective", "came_into_life", "Used to say when or where someone came into life as a baby.", "Core A1 personal information word."),
    "both": ("determiner/pronoun", "two_together", "The two people or things together.", "Core A1 quantity word."),
    "bottle": ("noun", "container_for_liquid", "A container for liquid, usually with a narrow top.", "Core A1 everyday object word."),
    "box": ("noun", "container_with_sides", "A container with flat sides and a lid or opening.", "Core A1 object word."),
    "boy": ("noun", "male_child", "A male child or young person.", "Core A1 people word."),
    "boyfriend": ("noun", "male_romantic_partner", "A male romantic partner.", "Common A1 relationship word."),
    "bread": ("noun", "food_from_flour", "Food made from flour and baked.", "Core A1 food word."),
    "break": ("verb/noun", "damage_or_short_rest", "To damage something so it separates or stops working, or a short rest.", "Useful A1 action/routine word; example must control the sense."),
    "breakfast": ("noun", "morning_meal", "The first meal of the day.", "Core A1 food/routine word."),
    "bring": ("verb", "carry_to_place", "To carry or take someone or something to a place.", "Core A1 action word."),
    "brother": ("noun", "male_sibling", "A boy or man with the same parents as another person.", "Core A1 family word."),
    "brown": ("adjective/noun", "color_brown", "The color of wood or chocolate.", "Core A1 color word."),
    "build": ("verb", "make_structure", "To make something by putting parts together.", "Useful A1 action word."),
    "building": ("noun", "structure_with_walls_roof", "A structure with walls and a roof.", "Core A1 place word."),
    "bus": ("noun", "large_road_vehicle", "A large road vehicle that carries many passengers.", "Core A1 transport word."),
    "business": ("noun", "company_or_work_activity", "A company or the activity of buying and selling goods or services.", "Useful A1 work/money word."),
    "busy": ("adjective", "having_much_to_do", "Having a lot to do.", "Core A1 routine/status word."),
    "but": ("conjunction", "contrast_linker", "Used to join two ideas that contrast.", "Choose the A1 conjunction sense; preposition use is out of scope."),
    "butter": ("noun", "yellow_dairy_spread", "A soft yellow food made from cream.", "Core A1 food word."),
    "buy": ("verb", "get_by_paying", "To get something by paying money.", "Core A1 shopping verb."),
    "by": ("preposition/adverb", "near_or_method", "Used to show near position, method or transport in simple learner phrases.", "Common A1 function word; example must control the exact use."),
    "bye": ("exclamation", "goodbye", "Used when leaving or ending a conversation.", "Core A1 greeting word."),
    "cafe": ("noun", "small_place_for_drinks_food", "A small place where people buy drinks and simple food.", "Common A1 food/place word."),
    "cake": ("noun", "sweet_baked_food", "A sweet baked food often eaten for dessert or celebrations.", "Core A1 food word."),
    "call": ("verb/noun", "phone_or_name", "To phone someone or use a name for someone or something.", "Useful A1 communication word; example must control the sense."),
    "camera": ("noun", "device_for_photos", "A device for taking photos or videos.", "Core A1 technology/object word."),
    "can1 modal": ("modal verb", "ability_or_permission", "Used with another verb to show ability or permission.", "Essential A1 modal verb."),
    "cannot": ("modal verb", "negative_ability_or_permission", "The negative form of can.", "Essential A1 modal verb form."),
    "capital": ("noun", "main_city", "The main city of a country or region.", "Choose the A1 city noun sense; money/adjective senses are out of scope."),
    "car": ("noun", "road_vehicle", "A road vehicle with an engine for a small number of people.", "Core A1 transport word."),
    "card": ("noun", "small_flat_paper_or_plastic", "A small flat piece of paper or plastic used for messages, games or payment.", "Common A1 object word; example must control the sense."),
    "career": ("noun", "working_life", "The jobs or profession someone has during life.", "Useful A1 work/study word."),
    "carrot": ("noun", "orange_vegetable", "A long orange vegetable.", "Core A1 food word."),
    "carry": ("verb", "hold_and_move", "To hold something and take it from one place to another.", "Core A1 action word."),
    "cat": ("noun", "small_pet_animal", "A small animal often kept as a pet.", "Core A1 animal word."),
    "CD": ("noun", "disc_for_music_or_data", "A small disc used for music or data.", "Common A1 media/object word."),
    "cent": ("noun", "small_money_unit", "A small unit of money in many countries.", "Useful A1 money word."),
    "centre": ("noun", "middle_or_main_place", "The middle of a place or an important place for an activity.", "Choose the A1 noun sense; verb sense is out of scope."),
    "century": ("noun", "one_hundred_years", "A period of 100 years.", "Useful A1 time word."),
    "chair": ("noun", "seat_for_one_person", "A seat for one person, usually with a back.", "Choose the A1 furniture noun sense; verb sense is out of scope."),
    "change": ("verb/noun", "make_or_become_different", "To make or become different, or the difference that happens.", "Useful A1 action/state word."),
    "chart": ("noun", "visual_information_display", "A picture, table or diagram that shows information.", "Choose the A1 noun sense; verb sense is out of scope."),
    "cheap": ("adjective", "low_price", "Costing little money.", "Choose the A1 adjective sense; adverb use is out of scope."),
    "check": ("verb/noun", "look_to_make_sure", "To look at something to make sure it is correct or safe.", "Choose the beginner checking sense."),
    "cheese": ("noun", "dairy_food", "A food made from milk.", "Core A1 food word."),
    "chicken": ("noun", "bird_or_meat", "A common farm bird, or its meat as food.", "Core A1 animal/food word; example must control the sense."),
    "child": ("noun", "young_person", "A young person.", "Core A1 people/family word."),
    "chocolate": ("noun", "sweet_brown_food", "A sweet brown food made from cocoa.", "Core A1 food word."),
    "choose": ("verb", "decide_between_options", "To decide which person or thing you want from several options.", "Core A1 decision verb."),
    "cinema": ("noun", "place_to_watch_films", "A place where people watch films.", "Common A1 entertainment/place word."),
    "city": ("noun", "large_town", "A large town.", "Core A1 place word."),
    "class": ("noun", "lesson_or_group_of_students", "A lesson, or a group of students taught together.", "Core A1 school word."),
    "classroom": ("noun", "room_for_lessons", "A room where students have lessons.", "Core A1 school/place word."),
    "clean": ("adjective/verb", "not_dirty_or_make_not_dirty", "Not dirty, or to remove dirt.", "Core A1 home/action word; example must control the sense."),
    "climb": ("verb", "go_up_using_body", "To go up something using the feet and often the hands.", "Choose the A1 verb sense; noun sense is out of scope."),
    "clock": ("noun", "time_showing_object", "An object that shows the time.", "Core A1 time/object word."),
    "close1": ("verb", "shut", "To shut something such as a door, window or book.", "Choose the A1 verb sense; noun sense and adjective close are out of scope."),
}


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def safe_id(value):
    return re.sub(r"[^a-z0-9]+", "_", normalize_text(value).lower()).strip("_")


def read_jsonl(path):
    rows = []
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def display_headword(source_headword):
    if source_headword == "bank (money)":
        return "bank"
    if source_headword == "can1 modal":
        return "can"
    if source_headword == "close1":
        return "close"
    return source_headword


def build_review_row(row, generated_at):
    source_headword = row["source_headword"]
    if source_headword not in REVIEWS:
        raise KeyError(f"Missing review for source_headword: {source_headword}")
    reviewed_pos, sense_slug, meaning_note, learner_value_note = REVIEWS[source_headword]
    display = display_headword(source_headword)
    level_span_decision = (
        "reviewed_beginner_safe_sense_selected"
        if row.get("level_min") != row.get("level_max")
        else "reviewed_no_issue"
    )
    semantic_scene = {
        "rule_version": "oxford-a1-row-review-v1",
        "status": "reviewed",
        "target_display": display,
        "learner_sense": meaning_note,
        "topic_context": "general_english_core_vocabulary",
        "learner_level": row.get("level_min"),
        "source_headword": source_headword,
        "reviewed_part_of_speech": reviewed_pos,
    }
    return {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_language": row["source_language"],
        "source_variant": row["source_variant"],
        "source_headword": source_headword,
        "reviewed_display_headword": display,
        "original_part_of_speech": row["part_of_speech"],
        "reviewed_part_of_speech": reviewed_pos,
        "sense_no": "01",
        "meaning_id": f"oxford3000_{safe_id(display)}_{safe_id(sense_slug)}_01",
        "meaning_note": meaning_note,
        "semantic_scene": semantic_scene,
        "core_band": row["core_band"],
        "level_min": row["level_min"],
        "level_max": row["level_max"],
        "level_span_decision": level_span_decision,
        "benchmark_membership": row["benchmark_membership"],
        "learner_value_status": "reviewed",
        "learner_value_note": learner_value_note,
        "review_status": "row_reviewed_for_english_learning",
        "reviewer": "codex_english_learning_row_review_v1",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": [
            "permission_evidence_or_project_evidence_decision",
            "allowed_fields_review",
            "english_pronunciation_source_check",
            "english_example_quality_check",
            "support_translation_meaning_check",
            "support_example_scene_check",
            "weak_language_targeted_review",
            "final_delivery_approval_check",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--candidate-pool",
        default="outputs/oxford-vocabulary/candidate-pools/oxford_3000_core_a1_part_001_150_v1_candidate_pool.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/row-reviews")
    parser.add_argument("--review-id", default="row_review_v1")
    args = parser.parse_args()

    candidate_path = Path(args.candidate_pool)
    rows = read_jsonl(candidate_path)
    if not rows:
        raise ValueError("Candidate pool is empty")
    release_id = rows[0]["release_id"]
    generated_at = datetime.now(timezone.utc).isoformat()
    missing = [row["source_headword"] for row in rows if row["source_headword"] not in REVIEWS]
    extra = sorted(set(REVIEWS) - {row["source_headword"] for row in rows})
    if missing:
        raise ValueError(f"Missing review rows: {missing}")
    if extra:
        raise ValueError(f"Review map has unused rows: {extra}")

    review_rows = [build_review_row(row, generated_at) for row in rows]
    out_dir = Path(args.out_dir)
    review_path = out_dir / f"{release_id}_{args.review_id}.jsonl"
    summary_path = out_dir / f"{release_id}_{args.review_id}_summary.md"
    write_jsonl(review_path, review_rows)

    level_span_rows = [row for row in review_rows if row["level_span_decision"] == "reviewed_beginner_safe_sense_selected"]
    summary = [
        f"# Oxford A1 Row Review: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Source candidate pool: `{candidate_path}`",
        f"- Review rows: {len(review_rows)}",
        f"- Level-span rows reviewed for beginner-safe sense: {len(level_span_rows)}",
        "- Review status: `row_reviewed_for_english_learning`",
        "- Generation ready: false",
        "- English examples: not filled in this artifact",
        "- EN pronunciation evidence: not filled in this artifact",
        "- Support-language translations: not filled in this artifact",
        "",
        "This artifact closes the row-level English learner sense/POS and learner-value review layer only. It does not approve final delivery.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford row review built: rows={len(review_rows)} review={review_path} summary={summary_path}")


if __name__ == "__main__":
    main()
