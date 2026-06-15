#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
SENTENCE_END_RE = re.compile(r"[.!?]$")


EXAMPLES = {
    "a, an": "I have a pen.",
    "about": "We talk about food.",
    "above": "The clock is above the door.",
    "across": "The shop is across the street.",
    "action": "His action helps me.",
    "activity": "Swimming is a fun activity.",
    "actor": "The actor is in a film.",
    "actress": "The actress smiles at us.",
    "add": "Add your name here.",
    "address": "My address is on this card.",
    "adult": "An adult sits near the door.",
    "advice": "Her advice is simple.",
    "afraid": "The child is afraid.",
    "after": "I eat after class.",
    "afternoon": "I study in the afternoon.",
    "again": "Please say it again.",
    "age": "What is your age?",
    "ago": "I came here two days ago.",
    "agree": "I agree with you.",
    "air": "The air is cold.",
    "airport": "We are at the airport.",
    "all": "All students are here.",
    "also": "I also like tea.",
    "always": "She always drinks water.",
    "amazing": "The view is amazing.",
    "and": "Tom and Anna are friends.",
    "angry": "He is angry now.",
    "animal": "A dog is an animal.",
    "another": "I want another cup.",
    "answer": "Write the answer here.",
    "any": "Do you have any money?",
    "anyone": "Does anyone need help?",
    "anything": "I cannot see anything.",
    "apartment": "My apartment is small.",
    "apple": "This apple is red.",
    "April": "My birthday is in April.",
    "area": "This area is quiet.",
    "arm": "My arm hurts.",
    "around": "We walk around the park.",
    "arrive": "They arrive at six.",
    "art": "I like art.",
    "article": "I read an article online.",
    "artist": "The artist draws a face.",
    "as": "I work as a teacher.",
    "ask": "Ask the teacher now.",
    "at": "I am at home.",
    "August": "We travel in August.",
    "aunt": "My aunt lives here.",
    "autumn": "Leaves fall in autumn.",
    "away": "The bus goes away.",
    "baby": "The baby is sleeping.",
    "back": "My back hurts.",
    "bad": "This milk is bad.",
    "bag": "Your bag is on the chair.",
    "ball": "The ball is under the table.",
    "banana": "I eat a banana.",
    "band": "The band plays music.",
    "bank (money)": "The bank opens at nine.",
    "bath": "I take a bath at night.",
    "bathroom": "The bathroom is clean.",
    "be": "I am happy.",
    "beach": "We sit on the beach.",
    "beautiful": "The flower is beautiful.",
    "because": "I stay home because I am sick.",
    "become": "It can become cold.",
    "bed": "The bed is big.",
    "bedroom": "My bedroom is quiet.",
    "beer": "He drinks beer with dinner.",
    "before": "Wash your hands before lunch.",
    "begin": "Begin the test now.",
    "beginning": "The beginning is easy.",
    "behind": "The cat is behind the sofa.",
    "believe": "I believe you.",
    "below": "The name is below the picture.",
    "best": "She is my best friend.",
    "better": "I feel better today.",
    "between": "The cafe is between two shops.",
    "bicycle": "My bicycle is blue.",
    "big": "This box is big.",
    "bike": "I ride my bike.",
    "bill": "The bill is on the table.",
    "bird": "A bird is in the tree.",
    "birthday": "Today is my birthday.",
    "black": "My bag is black.",
    "blog": "She writes a blog.",
    "blonde": "He has blonde hair.",
    "blue": "The sky is blue.",
    "boat": "The boat is on the water.",
    "body": "My body is tired.",
    "book": "I read a book.",
    "boot": "One boot is under the bed.",
    "bored": "I am bored.",
    "boring": "This film is boring.",
    "born": "I was born in May.",
    "both": "Both girls are happy.",
    "bottle": "The bottle is full.",
    "box": "The box is open.",
    "boy": "The boy runs fast.",
    "boyfriend": "Her boyfriend is kind.",
    "bread": "I want bread.",
    "break": "Do not break the cup.",
    "breakfast": "Breakfast is ready.",
    "bring": "Bring your book.",
    "brother": "My brother is tall.",
    "brown": "The dog is brown.",
    "build": "They build a house.",
    "building": "This building is old.",
    "bus": "The bus is late.",
    "business": "My father has a business.",
    "busy": "I am busy today.",
    "but": "I like tea, but not coffee.",
    "butter": "Put butter on the bread.",
    "buy": "I buy milk.",
    "by": "Sit by the window.",
    "bye": "Bye, see you tomorrow.",
    "cafe": "We meet at the cafe.",
    "cake": "The cake is sweet.",
    "call": "Please call me.",
    "camera": "My camera is new.",
    "can1 modal": "I can swim.",
    "cannot": "I cannot come today.",
    "capital": "Paris is a capital city.",
    "car": "The car is red.",
    "card": "I have a birthday card.",
    "career": "I want a career in art.",
    "carrot": "The carrot is orange.",
    "carry": "I carry my bag.",
    "cat": "The cat sleeps.",
    "CD": "This CD has music.",
    "cent": "One cent is very small.",
    "centre": "The centre of town is busy.",
    "century": "A century is one hundred years.",
    "chair": "Sit on the chair.",
    "change": "I change my clothes.",
    "chart": "Look at the chart.",
    "cheap": "This shirt is cheap.",
    "check": "Check your answer.",
    "cheese": "I like cheese.",
    "chicken": "We eat chicken for dinner.",
    "child": "The child is happy.",
    "chocolate": "Chocolate is sweet.",
    "choose": "Choose one answer.",
    "cinema": "We go to the cinema.",
    "city": "The city is big.",
    "class": "Class starts at nine.",
    "classroom": "The classroom is quiet.",
    "clean": "The room is clean.",
    "climb": "They climb the hill.",
    "clock": "The clock is on the wall.",
    "close1": "Close the door, please.",
}


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


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


def word_count(sentence):
    return len(re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?", sentence))


def build_example_row(row, generated_at):
    source_headword = row["source_headword"]
    example = EXAMPLES[source_headword]
    scene = dict(row["semantic_scene"])
    scene.update(
        {
            "example_rule_version": "oxford-a1-english-examples-v1",
            "example_EN": example,
            "example_status": "reviewed_lunacards_authored",
        }
    )
    return {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "meaning_id": row["meaning_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_headword": source_headword,
        "reviewed_display_headword": row["reviewed_display_headword"],
        "reviewed_part_of_speech": row["reviewed_part_of_speech"],
        "meaning_note": row["meaning_note"],
        "semantic_scene": scene,
        "example_EN": example,
        "example_word_count": word_count(example),
        "example_source": "lunacards_authored_not_oxford",
        "example_quality_status": "reviewed",
        "example_quality_note": "Short A1-friendly LunaCards-authored example aligned to the reviewed learner sense.",
        "review_status": "english_example_reviewed",
        "reviewer": "codex_oxford_a1_english_examples_v1",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": [
            "permission_evidence_or_project_evidence_decision",
            "allowed_fields_review",
            "english_pronunciation_source_check",
            "support_translation_meaning_check",
            "support_example_scene_check",
            "weak_language_targeted_review",
            "final_delivery_approval_check",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--row-review",
        default="outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a1_part_001_150_v1_row_review_v1.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/examples")
    parser.add_argument("--examples-id", default="english_examples_v1")
    args = parser.parse_args()

    row_review_path = Path(args.row_review)
    rows = read_jsonl(row_review_path)
    if not rows:
        raise ValueError("Row review is empty")
    release_id = rows[0]["release_id"]
    missing = [row["source_headword"] for row in rows if row["source_headword"] not in EXAMPLES]
    extra = sorted(set(EXAMPLES) - {row["source_headword"] for row in rows})
    if missing:
        raise ValueError(f"Missing examples for rows: {missing}")
    if extra:
        raise ValueError(f"Example map has unused rows: {extra}")

    problems = []
    for source_headword, example in EXAMPLES.items():
        if not SENTENCE_END_RE.search(example):
            problems.append(f"{source_headword}: missing final punctuation")
        if word_count(example) > 10:
            problems.append(f"{source_headword}: too long ({word_count(example)} words)")
        if re.search(r"\b(word|meaning)\s*:", example, re.I):
            problems.append(f"{source_headword}: template-like example")
    if problems:
        raise ValueError("Example quality problems:\n" + "\n".join(problems))

    generated_at = datetime.now(timezone.utc).isoformat()
    example_rows = [build_example_row(row, generated_at) for row in rows]
    out_dir = Path(args.out_dir)
    examples_path = out_dir / f"{release_id}_{args.examples_id}.jsonl"
    summary_path = out_dir / f"{release_id}_{args.examples_id}_summary.md"
    write_jsonl(examples_path, example_rows)

    counts = {}
    for row in example_rows:
        counts[row["example_word_count"]] = counts.get(row["example_word_count"], 0) + 1
    summary = [
        f"# Oxford A1 English Examples: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Row review source: `{row_review_path}`",
        f"- Example rows: {len(example_rows)}",
        "- Example source: `lunacards_authored_not_oxford`",
        "- Example quality status: `reviewed`",
        "- Generation ready: false",
        "- EN pronunciation evidence: not filled in this artifact",
        "- Support-language translations: not filled in this artifact",
        f"- Max word count: {max(counts)}",
        "",
        "This artifact closes the English example quality layer only. It does not approve final delivery.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford English examples built: rows={len(example_rows)} examples={examples_path} summary={summary_path}")


if __name__ == "__main__":
    main()
