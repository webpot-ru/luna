const blankishPattern = /^(|none|n\/a|na|null|todo|tbd|to be decided)$/iu;
const genericExamplePattern =
  /\b(i need to|we need to|i use|we use|this is|that is|there is|there are|word:|number:|nombre:|n[uú]mero:|число:)\b/iu;
const weakDecisionPattern = /^(selected|ok|good|useful|common|included)$/iu;

const ambiguityRules = [
  { pattern: /^file$/iu, required: /\b(physical|paper|digital|document|computer|folder|smoothing|tool)\b/iu },
  { pattern: /^folder$/iu, required: /\b(physical|paper|document|digital|computer)\b/iu },
  { pattern: /^clipboard$/iu, required: /\b(physical|board|clip|computer|digital)\b/iu },
  { pattern: /^mouse$/iu, required: /\b(computer|pointer|animal)\b/iu },
  { pattern: /^keyboard$/iu, required: /\b(computer|typing|musical|piano)\b/iu },
  { pattern: /^monitor$/iu, required: /\b(computer|screen|display|person)\b/iu },
  { pattern: /^speaker$/iu, required: /\b(audio|sound|device|person|speaks)\b/iu },
  { pattern: /^tablet$/iu, required: /\b(touchscreen|computer|medicine|pill)\b/iu },
  { pattern: /^tape$/iu, required: /\b(adhesive|audio|video|measuring)\b/iu },
  { pattern: /^binder$/iu, required: /\b(ring|paper|document|cover|material|person)\b/iu },
  { pattern: /^router$/iu, required: /\b(internet|network|device|route)\b/iu },
  { pattern: /^form$/iu, required: /\b(document|field|shape|grammar)\b/iu },
  { pattern: /^office$/iu, required: /\b(room|place|work|service|organization)\b/iu },
  { pattern: /^bank$/iu, required: /\b(money|river|financial|place)\b/iu },
  { pattern: /^card$/iu, required: /\b(payment|playing|id|flashcard|paper)\b/iu },
  { pattern: /^light$/iu, required: /\b(lamp|brightness|not heavy|traffic)\b/iu },
  { pattern: /^glass$/iu, required: /\b(drinking|material|window|cup)\b/iu },
  { pattern: /^plant$/iu, required: /\b(living|factory|machine|pot)\b/iu },
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ");
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function isBlankish(value) {
  return blankishPattern.test(normalizeText(value));
}

function wordCount(value) {
  const words = normalizeText(value).match(/[\p{Letter}\p{Number}]+/gu);
  return words?.length ?? 0;
}

function selectedRows(rows) {
  return rows.filter((row) => normalizeKey(row.decision) === "selected");
}

function isMultiword(row) {
  const canonical = normalizeText(row.canonical_english);
  return /\s|-|\/|&/u.test(canonical.replace(/^to\s+/iu, ""));
}

function rowLabel(index, row) {
  return `row ${index + 1} (${normalizeText(row.canonical_english) || "missing canonical_english"})`;
}

function rowTextBag(row) {
  return [
    row.canonical_english,
    row.meaning_note,
    row.translation_risk,
    row.translation_coverage_risk,
    row.compound_multiword_risk,
    row.scope_decision,
    row.duplicate_reuse_decision,
    row.decision_note,
    row.current_context_example_en,
  ].map(normalizeText).join(" ");
}

function isRiskBlankOrLow(value) {
  const normalized = normalizeKey(value);
  return !normalized || ["none", "na", "n a", "low"].includes(normalized);
}

function categoryForSelected(row) {
  const canonical = normalizeKey(row.canonical_english);
  const bag = normalizeKey(rowTextBag(row));
  if (
    row.part_of_speech === "number" ||
    /\b(cardinal|ordinal|counting|number|compound number|one hundred|one thousand)\b/u.test(bag)
  ) {
    return "number_quantity";
  }
  if (/\b(garden|yard|backyard|lawn|grass|flower bed|path|fence|gate)\b/u.test(canonical)) return "outdoor_area_or_boundary";
  if (/\b(flower|tree|bush|hedge|soil|mulch|plant|planter)\b/u.test(canonical)) return "plant_or_landscape";
  if (/\b(watering can|hose|sprinkler|tools|rake|shovel|wheelbarrow|mower)\b/u.test(canonical)) return "garden_tool_or_watering";
  if (/\b(shed|outdoor light|barbecue|grill|outdoor table|garden chair|umbrella|fire pit|bird feeder|compost)\b/u.test(canonical)) return "outdoor_home_item";
  if (/\b(computer|laptop|desktop|monitor|keyboard|mouse|printer|scanner|webcam|headphone|microphone|speaker|charger|cable|power|router|tablet|usb|drive)\b/u.test(canonical)) return "device_or_electronics";
  if (/\b(pen|pencil|marker|highlighter|ruler|scissors|tape|stapler|clip|eraser|sharpener|pin|tack)\b/u.test(canonical)) return "tool_or_supply";
  if (/\b(folder|binder|clipboard|document|paper|notebook|notepad|note|tray|envelope|file)\b/u.test(canonical)) return "paper_or_document";
  if (/\b(desk|chair|lamp|organizer|drawer|cabinet|bookcase|mat|stand|board|shelf|furniture)\b/u.test(canonical) || /\bfurniture\b/u.test(bag)) return "desk_or_furniture";
  if (/\b(pub|wine bar|cocktail bar|beer garden)\b/u.test(canonical) || /^bar$/u.test(canonical)) return "bar_place";
  if (/\b(bartender|happy hour|last call|on tap|by the glass|by the bottle|house wine)\b/u.test(canonical)) return "bar_service_label";
  if (/\b(bar menu|drink menu|cocktail menu|wine list|beer list)\b/u.test(canonical)) return "bar_menu_label";
  if (/\b(mocktail|non alcoholic beer|alcohol free wine|non alcoholic drink|draft beer|draught beer|shot)\b/u.test(canonical)) return "bar_drink_option";
  if (/\b(bar counter|bar stool|beer tap|cocktail shaker|ice bucket|wine glass|shot glass|beer glass|wine bottle|corkscrew|mixer|garnish)\b/u.test(canonical)) return "bar_object_or_component";
  if (/\b(meal|breakfast|lunch|dinner|supper|brunch|snack|dessert)\b/u.test(canonical)) return "meal_name";
  if (/\b(main course|side dish|appetizer|starter|portion|serving|course|dish)\b/u.test(canonical)) return "meal_course_or_portion";
  if (/\b(flavor|flavour|taste|sweet|salty|sour|bitter|spicy|mild|plain|bland|delicious|tasty)\b/u.test(canonical)) return "taste_word";
  if (/\b(hot|cold|warm|fresh|stale|raw|cooked|soft|hard|crunchy|crispy|creamy|juicy|dry|frozen|ripe)\b/u.test(canonical)) return "food_state_or_texture";
  return "other";
}

export function summarizeWordSelectionQuality(rows, spec) {
  const selected = selectedRows(rows);
  const categories = {};
  for (const row of selected) {
    const category = categoryForSelected(row);
    categories[category] = (categories[category] ?? 0) + 1;
  }
  return {
    set_id: spec?.setId ?? spec?.set_id ?? "",
    selected_count: selected.length,
    category_counts: categories,
  };
}

export function validateWordSelectionQualityRows(rows, spec) {
  const blockers = [];
  const warnings = [];
  const selected = selectedRows(rows);
  const selectedKeys = new Map();
  const targetMax = Number(String(spec?.targetRange ?? "").match(/\b\d+\s*-\s*(\d+)\b/)?.[1] ?? 0);

  for (const [index, row] of rows.entries()) {
    const label = rowLabel(index, row);
    const decision = normalizeKey(row.decision);
    const canonical = normalizeText(row.canonical_english);
    const canonicalKey = normalizeKey(canonical);
    const meaningNote = normalizeText(row.meaning_note);
    const example = normalizeText(row.current_context_example_en);
    const decisionNote = normalizeText(row.decision_note);
    const score = Number(row.score);

    if (decision !== "selected") continue;

    if (selectedKeys.has(canonicalKey)) {
      blockers.push(`${label}: duplicate selected canonical_english also appears on row ${selectedKeys.get(canonicalKey)}`);
    } else {
      selectedKeys.set(canonicalKey, index + 1);
    }

    if (!Number.isFinite(score) || score < 70) {
      blockers.push(`${label}: selected score must be >=70 for production word selection`);
    }
    if (score < 80) {
      warnings.push(`${label}: selected score ${score} is below 80; keep only if scope needs it`);
    }

    if (isBlankish(meaningNote) || wordCount(meaningNote) < 3) {
      blockers.push(`${label}: selected row needs a concrete meaning_note with at least 3 words`);
    }
    if (isBlankish(row.english_with_article)) {
      blockers.push(`${label}: selected row needs english_with_article for display/article QA`);
    }
    if (isBlankish(example)) {
      blockers.push(`${label}: selected row needs current_context_example_en`);
    } else {
      const words = wordCount(example);
      if (words < 4 || words > 14) {
        blockers.push(`${label}: current_context_example_en should be a short controlled scene of 4-14 words`);
      }
      if (genericExamplePattern.test(example)) {
        blockers.push(`${label}: current_context_example_en uses a generic/meta template instead of a controlled scene`);
      }
    }

    if (weakDecisionPattern.test(decisionNote)) {
      blockers.push(`${label}: decision_note is too generic for word-selection audit`);
    }

    if (!/^selected_in_scope\b/iu.test(normalizeText(row.scope_decision))) {
      blockers.push(`${label}: selected row scope_decision must start with selected_in_scope`);
    }
    if (/\b(out_of_scope|excluded|backup|move|later)\b/iu.test(row.scope_decision ?? "")) {
      blockers.push(`${label}: selected row scope_decision contains unresolved non-selected language`);
    }
    if (/\b(unresolved|possible_duplicate|backup|review_required)\b/iu.test(row.duplicate_reuse_decision ?? "")) {
      blockers.push(`${label}: selected row duplicate_reuse_decision is unresolved`);
    }

    if (isMultiword(row) && isRiskBlankOrLow(row.compound_multiword_risk)) {
      blockers.push(`${label}: multiword/compound selected row needs non-low compound_multiword_risk`);
    }

    const translationRisk = normalizeText(row.translation_risk ?? row.translation_coverage_risk);
    if (isBlankish(translationRisk)) {
      blockers.push(`${label}: selected row needs translation_risk / translation_coverage_risk`);
    }

    for (const rule of ambiguityRules) {
      if (rule.pattern.test(canonical)) {
        const bag = rowTextBag(row);
        if (!rule.required.test(bag)) {
          blockers.push(`${label}: ambiguous surface word needs meaning_note/risk/example disambiguation`);
        }
        if (!/\b(preserve|not|sense|meaning|physical|digital|computer|device|document|adhesive|audio|screen)\b/iu.test(bag)) {
          blockers.push(`${label}: ambiguous surface word needs explicit preserve/not sense language in risk notes`);
        }
      }
    }

    if (/\b(none|n\/a|na)\b/iu.test(row.source_support ?? "")) {
      blockers.push(`${label}: selected row needs real source_support notes, not none/n/a`);
    }
  }

  const categoryCounts = summarizeWordSelectionQuality(rows, spec).category_counts;
  const dominantCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const deckProfile = normalizeKey(spec?.deckProfile ?? spec?.deck_profile ?? "");
  const allowsDominantClosedSet = /\b(closed set|number quantity)\b/u.test(deckProfile);
  if (selected.length >= 20 && dominantCategory && dominantCategory[1] / selected.length > 0.7 && !allowsDominantClosedSet) {
    warnings.push(
      `selected set is dominated by ${dominantCategory[0]} (${dominantCategory[1]}/${selected.length}); confirm this is intentional`
    );
  }
  if (targetMax > 0 && rows.length < targetMax * 2) {
    warnings.push(`candidate pool is smaller than 2x target max; structural checker may allow only with exception`);
  }

  return { blockers, warnings, summary: summarizeWordSelectionQuality(rows, spec) };
}
