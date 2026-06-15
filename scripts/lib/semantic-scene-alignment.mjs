const genericActionValues = new Set([
  "is",
  "are",
  "is shown",
  "are shown",
  "shown",
  "displayed",
  "is displayed",
  "are displayed",
  "present",
  "present location/state",
]);

const genericStatePatterns = [
  /\bobject scene\b/i,
  /^in an? [a-z /-]+ scene$/i,
  /^in an? [a-z /-]+ context$/i,
];

const locativePredicatePattern =
  /^(in|on|under|above|over|below|beside|near|by|next to|inside|outside|behind|in front of|against|along|around)\b/i;

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ");
}

function normalizeForCompare(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScene(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizedSceneValue(scene, key) {
  return normalize(scene?.[key]);
}

function isGenericAction(value) {
  return genericActionValues.has(normalize(value).toLowerCase());
}

function isGenericState(value) {
  const text = normalize(value);
  if (!text) return true;
  return genericStatePatterns.some((pattern) => pattern.test(text));
}

function extractCopularPredicate(example) {
  const text = normalize(example);
  const match = text.match(/\b(?:is|are)\s+(.+)$/i);
  return normalize(match?.[1] ?? "");
}

function isLikelyLocativePredicate(predicate) {
  return locativePredicatePattern.test(normalize(predicate));
}

function sceneContainsPredicate(sceneValue, predicate) {
  const scene = normalizeForCompare(sceneValue);
  const expected = normalizeForCompare(predicate);
  if (!scene || !expected) return false;
  return scene.includes(expected) || expected.includes(scene);
}

function tokensAppearInOrder(text, phrase) {
  const haystack = normalizeForCompare(text).split(/\s+/u).filter(Boolean);
  const needles = normalizeForCompare(phrase).split(/\s+/u).filter(Boolean);
  if (needles.length <= 1) return false;
  let cursor = 0;
  for (const token of haystack) {
    if (token === needles[cursor]) cursor += 1;
    if (cursor === needles.length) return true;
  }
  return false;
}

function targetAppearsInExample(row) {
  const example = normalizeForCompare(row.canonical_example_en ?? row.source_example_en ?? row.example_text);
  const canonical = normalizeForCompare(row.canonical_english);
  const sceneTargetDisplay = normalizeForCompare(normalizedSceneValue(parseScene(row.semantic_scene), "target_display"));
  const targetDisplay = normalizeForCompare(row.english_with_article ?? sceneTargetDisplay);
  return Boolean(
    example &&
      ((canonical && example.includes(canonical)) ||
        (canonical && tokensAppearInOrder(example, canonical)) ||
        (targetDisplay && example.includes(targetDisplay)) ||
        (targetDisplay && tokensAppearInOrder(example, targetDisplay)) ||
        (sceneTargetDisplay && example.includes(sceneTargetDisplay)) ||
        (sceneTargetDisplay && tokensAppearInOrder(example, sceneTargetDisplay)) ||
        (targetDisplay && example.includes(targetDisplay.replace(/^(the|a|an)\s+/, ""))))
  );
}

export function buildSemanticSceneAlignmentIssues(row) {
  const issues = [];
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  const example = normalize(row.canonical_example_en ?? row.source_example_en ?? row.example_text);
  const partOfSpeech = normalize(row.part_of_speech).toLowerCase();
  const actionOrState = normalizedSceneValue(scene, "action_or_state");
  const stateOrLocation = normalizedSceneValue(scene, "state_or_location");

  if (!example) {
    issues.push("missing English context example");
    return issues;
  }

  for (const requiredKey of [
    "target_object",
    "target_display",
    "subject_number",
    "action_or_state",
    "state_or_location",
    "tense_aspect",
    "topic_context",
  ]) {
    if (!normalizedSceneValue(scene, requiredKey)) {
      issues.push(`semantic_scene.${requiredKey} is missing`);
    }
  }

  if (!targetAppearsInExample({ ...row, semantic_scene: scene })) {
    issues.push("English example does not contain the target display/canonical word");
  }

  if (isGenericAction(actionOrState)) {
    issues.push(`semantic_scene.action_or_state is generic: "${actionOrState}"`);
  }

  if (isGenericState(stateOrLocation)) {
    issues.push(`semantic_scene.state_or_location is generic: "${stateOrLocation}"`);
  }

  const predicate = extractCopularPredicate(example);
  if (partOfSpeech !== "verb" && predicate) {
    if (!sceneContainsPredicate(stateOrLocation, predicate)) {
      issues.push(
        `semantic_scene.state_or_location does not match English predicate "${predicate}"`
      );
    }

    if (isLikelyLocativePredicate(predicate)) {
      if (!/^are located$|^is located$/i.test(actionOrState)) {
        issues.push(
          `semantic_scene.action_or_state should be "is located"/"are located" for locative predicate "${predicate}"`
        );
      }
    } else if (!sceneContainsPredicate(actionOrState, predicate)) {
      issues.push(`semantic_scene.action_or_state does not match English predicate "${predicate}"`);
    }
  }

  if (partOfSpeech === "verb") {
    const action = normalizeForCompare(actionOrState);
    const canonical = normalizeForCompare(row.canonical_english).replace(/^to\s+/, "");
    if (canonical && action && !action.includes(canonical) && !canonical.includes(action)) {
      issues.push(
        `semantic_scene.action_or_state does not match verb meaning "${row.canonical_english}"`
      );
    }
  }

  return issues;
}

export function buildSemanticSceneAlignmentBlockers(rows) {
  const blockers = [];
  for (const row of rows) {
    for (const issue of buildSemanticSceneAlignmentIssues(row)) {
      blockers.push({
        set_id: row.set_id ?? row.setId,
        display_order: row.display_order ?? row.displayOrder,
        meaning_id: row.meaning_id ?? row.meaningId,
        example_id: row.example_id ?? row.context_example_id ?? row.exampleId,
        canonical_english: row.canonical_english ?? row.canonicalEnglish,
        canonical_example_en: row.canonical_example_en ?? row.source_example_en ?? row.example_text ?? "",
        issue,
      });
    }
  }
  return blockers;
}

export function inferSemanticScenePatch(row) {
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  const example = normalize(row.canonical_example_en ?? row.source_example_en ?? row.example_text);
  const predicate = extractCopularPredicate(example);
  const subjectNumber = normalizedSceneValue(scene, "subject_number");
  const isPlural = subjectNumber === "plural" || /\bare\b/i.test(example);

  if (!predicate) return scene;

  return {
    ...scene,
    action_or_state: isLikelyLocativePredicate(predicate)
      ? isPlural
        ? "are located"
        : "is located"
      : `${isPlural ? "are" : "is"} ${predicate}`,
    state_or_location: predicate,
  };
}
