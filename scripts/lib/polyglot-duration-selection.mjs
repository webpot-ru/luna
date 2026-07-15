function positiveNumber(value, label, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(`${label} must be ${allowZero ? "a non-negative" : "a positive"} number.`);
  }
  return number;
}

export function selectMaximumPolyglotCardPrefix({
  introDurationSeconds,
  outroDurationSeconds,
  cardDurationsSeconds,
  maxDurationSeconds,
}) {
  const intro = positiveNumber(introDurationSeconds, "introDurationSeconds", { allowZero: true });
  const outro = positiveNumber(outroDurationSeconds, "outroDurationSeconds", { allowZero: true });
  const maximum = positiveNumber(maxDurationSeconds, "maxDurationSeconds");
  if (!Array.isArray(cardDurationsSeconds)) throw new Error("cardDurationsSeconds must be an array.");

  const baseDurationSeconds = intro + outro;
  if (baseDurationSeconds > maximum) {
    throw new Error(`Intro and outro alone exceed the short-video limit: ${baseDurationSeconds.toFixed(3)}s > ${maximum.toFixed(3)}s.`);
  }

  let selectedCardCount = 0;
  let selectedCardDurationSeconds = 0;
  for (const duration of cardDurationsSeconds) {
    const cardDuration = positiveNumber(duration, "card duration");
    if (baseDurationSeconds + selectedCardDurationSeconds + cardDuration > maximum) break;
    selectedCardCount += 1;
    selectedCardDurationSeconds += cardDuration;
  }

  return {
    availableCardCount: cardDurationsSeconds.length,
    selectedCardCount,
    baseDurationSeconds: Number(baseDurationSeconds.toFixed(3)),
    selectedCardDurationSeconds: Number(selectedCardDurationSeconds.toFixed(3)),
    projectedDurationSeconds: Number((baseDurationSeconds + selectedCardDurationSeconds).toFixed(3)),
    maxDurationSeconds: Number(maximum.toFixed(3)),
    truncated: selectedCardCount < cardDurationsSeconds.length,
  };
}
