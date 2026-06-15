export const targetExampleNaturalnessRuleVersion =
  "language-specific-rules-v6-fixed-beverage-name-preservation";

const locativePredicatePattern =
  /^(in|on|under|above|over|below|beside|near|by|next to|inside|outside|behind|in front of)\b/i;
const russianLocatedVerbPattern = /(?<!\p{Letter})наход(?:ит|ят)ся(?!\p{Letter})/iu;
const koreanStandaloneTopicSubjectParticles = new Set(["은", "는", "이", "가"]);
const hindiDuplicateCopulaStatePattern = /(?:^|\s)(?:है|हैं)\s+साफ\s+(?:है|हैं)(?=\s|।|\.|$)/u;
const hindiCopulaBeforeLocationPattern =
  /(?:^|\s)(?:है|हैं)\s+[\p{Letter}\p{Mark}\s]+(?:में|पर|पास|नीचे|ऊपर|अंदर|बाहर|सामने|पीछे)(?:।|\.|$)/u;
const sinhalaCopulaBeforePredicatePattern = /\bතිබේ\s+.+(?:තුළ|මත|යට|අසල|ළඟ|ඉහළින්|පිරිසිදුයි)(?:\.|।|$)/u;
const armenianCopulaBeforePredicatePattern = /\sէ\s+.+(?:ում|տակ|վրա|կողքին|մոտ|վերևում|մաքուր\s+է)(?:։|\.|$)/u;
const azerbaijaniExistentialBeforeLocationPattern =
  /\bvar\s+.+(?:da|də|nda|ndə|ında|ində|altında|üstündə|yanında|içində|təmizdir)(?:\.|$)/iu;
const uzbekExistentialBeforeLocationPattern =
  /\bbor\s+.+(?:da|ida| ostida| ustida| yonida| ichida|toza)(?:\.|$)/iu;
const uzbekExistentialBeforeStatePattern = /\bbor\s+toza(?:\.|$)/iu;
const kazakhExistentialBeforeLocationPattern =
  /\bбар\s+.+(?:да|де|нда|нде|ында|інде|астында|үстінде|жанында|ішінде|таза)(?:\.|$)/iu;
const filipinoBareAyPattern = /^(?!Ang\b)[\p{Lu}\p{Lt}][^.!?]+?\s+ay\s+(?:nasa|malapit|katabi|malinis)\b/iu;
const khmerDetachedLocativeMarkerPattern = /\sនៅ\s/u;
const laoDetachedLocativeMarkerPattern = /\sຢູ່\s/u;
const czechBareLocativeCasePattern =
  /\bje\s+(?:u|pod|nad|vedle|v|na)\s+(?:umyvadlo|koupelnové zrcadlo|vana|sprcha|toaleta|háček|držák|koupelnová polička|kelímek|zubní kartáček|šampon|koupelnová skříňka)\b/iu;
const slovakBareLocativeCasePattern =
  /\bje\s+(?:pri|pod|nad|vedľa|v|na)\s+(?:umývadlo|kúpeľňové zrkadlo|vaňa|sprcha|toaleta|háčik|držiak|kúpeľňová polica|pohár|zubná kefka|šampón|kúpeľňová skrinka)\b/iu;
const hungarianLiteralLocativeOrderPattern =
  /\bvan\s+(?:közel|mellett|alatt|felett|benne|rajta)\s+a\s+/iu;
const romanianBareLocativeCasePattern =
  /\b(?:lângă|deasupra|pe|în)\s+(?:chiuveta|cada|dușul|toaleta|robinetul|șamponul)\b/iu;
const portugueseBadEstaoAccentPattern = /\best(?:a|á)o\b/iu;
const russianBeveragePouredIntoContainerPattern =
  /(?<!\p{Letter})налит(?:а|о)?\s+в\s+(?:чашку|кружку|стакан|чашу|бокал|термос)(?!\p{Letter})/iu;
const kazakhWeakTeaWithAdditivePattern =
  /(?:сүті|лимоны|балы)\s+бар\s+шай/iu;
const kazakhPeppermintLiteralPattern = /бұрышты\s+жалбыз\s+шайы/iu;
const uzbekHibiscusMisspellingPattern = /\bgibriskus\b/iu;
const uzbekPeppermintCollapsedPattern = /^yalpiz\s+choyi\b/iu;
const fixedBeverageNameCalques = new Map([
  [
    "english breakfast tea",
    new Map([
      ["AZ", /İngilis\s+səhər\s+çayı/iu],
      ["BG", /английск[аият]+\s+закуск/iu],
      ["CS", /anglický\s+snídaňový\s+čaj/iu],
      ["HR", /engleski\s+doručak\s+čaj/iu],
      ["HU", /angol\s+reggeli\s+tea/iu],
      ["HY", /անգլիական\s+նախաճաշի\s+թեյ/iu],
      ["IS", /ensk(?:a|t)\s+morgunte/iu],
      ["KA", /ინგლისური\s+საუზმის\s+ჩაი/u],
      ["KK", /ағылшынша\s+таңғы\s+шай/iu],
      ["KM", /តែអង់គ្លេស/u],
      ["LO", /ຊາອັງກິດ/u],
      ["LT", /angliška\s+pusryčių\s+arbata/iu],
      ["LV", /angļu\s+brokastu\s+tēja/iu],
      ["MY", /အင်္ဂလိပ်နံနက်စာလက်ဖက်ရည်/u],
      ["RU", /английск(?:ий|ого)?\s+завтрак/iu],
      ["SK", /anglický\s+raňajkový\s+čaj/iu],
      ["SL", /angleški\s+zajtrkovalni\s+čaj/iu],
      ["UZ", /Ingliz\s+nonushta\s+choyi/iu],
    ]),
  ],
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ");
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

function hasDetachedKoreanTopicSubjectParticle(value) {
  const tokens = normalize(value)
    .split(/\s+/u)
    .filter(Boolean);

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    if (!koreanStandaloneTopicSubjectParticles.has(token)) continue;
    if (!/[\uAC00-\uD7AF]$/u.test(previous)) continue;
    if (/[은는이가]$/u.test(previous)) continue;
    return true;
  }

  return false;
}

function normalizedSceneValue(scene, key) {
  return normalize(scene?.[key]);
}

function rowCanonicalEnglish(row) {
  return normalize(row.canonical_english ?? row.canonicalEnglish).toLowerCase();
}

function rowDisplayWord(row) {
  return normalize(row.display_word ?? row.displayWord ?? row.target_display_word ?? row.targetDisplayWord);
}

function isLocativeScene(scene) {
  const actionOrState = normalizedSceneValue(scene, "action_or_state").toLowerCase();
  const stateOrLocation = normalizedSceneValue(scene, "state_or_location");
  return (
    actionOrState === "is located" ||
    actionOrState === "are located" ||
    locativePredicatePattern.test(stateOrLocation)
  );
}

function isBeverageScene(scene, row) {
  const topicContext = normalizedSceneValue(scene, "topic_context").toLowerCase();
  const sceneRole = normalizedSceneValue(scene, "scene_role").toLowerCase();
  const drinkCategory = normalizedSceneValue(scene, "drink_category").toLowerCase();
  const beverageItem = normalizedSceneValue(scene, "beverage_item");
  const canonicalEnglish = rowCanonicalEnglish(row);
  return (
    Boolean(beverageItem) ||
    topicContext.includes("drink") ||
    topicContext.includes("beverage") ||
    topicContext.includes("tea") ||
    sceneRole.includes("drink") ||
    sceneRole.includes("tea") ||
    drinkCategory.includes("drink") ||
    drinkCategory.includes("beverage") ||
    drinkCategory.includes("tea") ||
    /\b(?:tea|coffee|latte|milk|cider|drink|juice|smoothie)\b/u.test(canonicalEnglish)
  );
}

function validateFixedBeverageNamePreservation(row) {
  const issues = [];
  const canonicalEnglish = rowCanonicalEnglish(row);
  const languageCode = row.language_code ?? row.languageCode;
  const byLanguage = fixedBeverageNameCalques.get(canonicalEnglish);
  if (!byLanguage) return issues;

  const calquePattern = byLanguage.get(languageCode);
  if (!calquePattern) return issues;

  const displayWord = rowDisplayWord(row);
  const exampleText = normalize(row.example_text ?? row.target_example ?? row.targetExample);
  if (calquePattern.test(displayWord) || calquePattern.test(exampleText)) {
    issues.push(
      "Fixed beverage blend names such as English Breakfast must be preserved as a named tea blend, not translated as a literal semantic phrase like 'English breakfast'."
    );
  }

  return issues;
}

function validateRussianNaturalness(row) {
  const issues = [];
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  const exampleText = normalize(row.example_text ?? row.target_example ?? row.targetExample);

  if (!exampleText) return issues;

  if (russianLocatedVerbPattern.test(exampleText)) {
    const reason = isLocativeScene(scene)
      ? 'RU examples should avoid the repeated generic "находится/находятся" template when a concrete verb such as "лежит", "стоит" or "хранится" is more natural'
      : 'RU state/adjective examples must not use "находится/находятся" as a literal copy of "is located"';
    issues.push(reason);
  }

  if (isLocativeScene(scene) && isBeverageScene(scene, row) && russianBeveragePouredIntoContainerPattern.test(exampleText)) {
    issues.push(
      'RU beverage location examples should avoid the stiff "налит(а/о) в чашку/кружку" template for static scenes; use a simple locative surface such as "X в чашке" when the English scene is only "X is in the cup".'
    );
  }

  return issues;
}

function validateLanguageSpecificLocativeNaturalness(row) {
  const issues = [];
  const exampleText = normalize(row.example_text ?? row.target_example ?? row.targetExample);
  if (!exampleText) return issues;
  const languageCode = row.language_code ?? row.languageCode;
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  const locativeScene = isLocativeScene(scene);

  if (languageCode === "KO" && hasDetachedKoreanTopicSubjectParticle(exampleText)) {
    issues.push("KO examples must attach topic/subject particles directly to the preceding word and choose a natural particle form.");
  }
  if (languageCode === "HI") {
    if (hindiDuplicateCopulaStatePattern.test(exampleText)) {
      issues.push("HI state examples must not duplicate the copula, such as 'है साफ है'.");
    }
    if (locativeScene && hindiCopulaBeforeLocationPattern.test(exampleText)) {
      issues.push("HI locative examples should put the location/postposition phrase before the copula.");
    }
  }
  if (languageCode === "SI" && locativeScene && sinhalaCopulaBeforePredicatePattern.test(exampleText)) {
    issues.push("SI locative/state examples should put the location/state predicate before තිබේ rather than copying English word order.");
  }
  if (languageCode === "HY" && locativeScene && armenianCopulaBeforePredicatePattern.test(exampleText)) {
    issues.push("HY locative/state examples must not use a literal 'X է location/state է' word order.");
  }
  if (languageCode === "AZ" && locativeScene && azerbaijaniExistentialBeforeLocationPattern.test(exampleText)) {
    issues.push("AZ locative/state examples should put the location/state predicate before var/təmizdir in this controlled noun-location profile.");
  }
  if (
    languageCode === "UZ" &&
    locativeScene &&
    (uzbekExistentialBeforeLocationPattern.test(exampleText) || uzbekExistentialBeforeStatePattern.test(exampleText))
  ) {
    issues.push("UZ locative/state examples should put the location/state predicate before bor/toza in this controlled noun-location profile.");
  }
  if (languageCode === "KK" && locativeScene && kazakhExistentialBeforeLocationPattern.test(exampleText)) {
    issues.push("KK locative/state examples should put the location/state predicate before бар/таза in this controlled noun-location profile.");
  }
  if (languageCode === "TL" && filipinoBareAyPattern.test(exampleText)) {
    issues.push("TL examples using ay-predicate order should include the normal learner-facing Ang marker for these noun-location examples.");
  }
  if (languageCode === "KM" && khmerDetachedLocativeMarkerPattern.test(exampleText)) {
    issues.push("KM short locative examples must not isolate នៅ with machine-token spaces.");
  }
  if (languageCode === "LO" && laoDetachedLocativeMarkerPattern.test(exampleText)) {
    issues.push("LO short locative examples must not isolate ຢູ່ with machine-token spaces.");
  }
  if (languageCode === "CS" && czechBareLocativeCasePattern.test(exampleText)) {
    issues.push("CS locative examples must use the required case/prepositional form, not a bare nominative copy of the location noun.");
  }
  if (languageCode === "SK" && slovakBareLocativeCasePattern.test(exampleText)) {
    issues.push("SK locative examples must use the required case/prepositional form, not a bare nominative copy of the location noun.");
  }
  if (languageCode === "HU" && hungarianLiteralLocativeOrderPattern.test(exampleText)) {
    issues.push("HU locative examples must put the location phrase before van, not copy English 'is + preposition + noun' order.");
  }
  if (languageCode === "RO" && romanianBareLocativeCasePattern.test(exampleText)) {
    issues.push("RO locative examples must use the correct definite/case form after the preposition, not a bare dictionary form.");
  }
  if ((languageCode === "PT" || languageCode === "PT-BR") && portugueseBadEstaoAccentPattern.test(exampleText)) {
    issues.push("PT/PT-BR examples must use the valid forms está or estão; the hybrid spelling 'estáo/estao' is invalid.");
  }
  if (languageCode === "KK") {
    if (kazakhWeakTeaWithAdditivePattern.test(exampleText) || kazakhWeakTeaWithAdditivePattern.test(rowDisplayWord(row))) {
      issues.push("KK tea-with-additive examples should use the natural қосылған pattern, not a literal 'X бар шай' calque.");
    }
    if (kazakhPeppermintLiteralPattern.test(exampleText) || kazakhPeppermintLiteralPattern.test(rowDisplayWord(row))) {
      issues.push("KK peppermint tea should not use the literal 'бұрышты жалбыз шайы' surface; use a natural peppermint/mint-specifying form.");
    }
  }
  if (languageCode === "UZ") {
    if (uzbekHibiscusMisspellingPattern.test(exampleText) || uzbekHibiscusMisspellingPattern.test(rowDisplayWord(row))) {
      issues.push("UZ hibiscus tea examples must not use the misspelled/unnatural 'gibriskus' form.");
    }
    if (
      rowCanonicalEnglish(row) === "peppermint tea" &&
      (uzbekPeppermintCollapsedPattern.test(exampleText) || uzbekPeppermintCollapsedPattern.test(rowDisplayWord(row)))
    ) {
      issues.push("UZ peppermint tea should not collapse to the same learner-facing surface as generic mint tea.");
    }
  }
  issues.push(...validateFixedBeverageNamePreservation(row));

  return issues;
}

export function validateExampleNaturalness(row) {
  const languageCode = row.language_code ?? row.languageCode;
  const issues = [];
  if (languageCode === "RU") issues.push(...validateRussianNaturalness(row));
  issues.push(...validateLanguageSpecificLocativeNaturalness(row));
  return issues;
}

export function buildExampleNaturalnessBlockers(rows) {
  const blockers = [];
  for (const row of rows) {
    const issues = validateExampleNaturalness(row);
    for (const issue of issues) {
      blockers.push({
        set_id: row.set_id ?? row.setId,
        meaning_id: row.meaning_id ?? row.meaningId,
        example_id: row.example_id ?? row.exampleId,
        language_code: row.language_code ?? row.languageCode,
        issue,
        example_text: row.example_text ?? row.exampleText ?? row.target_example ?? row.targetExample ?? "",
      });
    }
  }
  return blockers;
}
