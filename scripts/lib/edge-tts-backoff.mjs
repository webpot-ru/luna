// Keep the existing attempt budget; rate limiting needs a cooldown, not a
// different voice or provider. Jitter avoids synchronized worker retries.
export function edgeTtsRetryDelay(errorText, attempt, baseMs, random = Math.random) {
  const limited = /HTTP status\s*=\s*429\b|Too Many Requests/i.test(errorText);
  const normal = baseMs * 2 ** (attempt - 1);
  if (!limited) return normal;
  return Math.max(normal, Math.min(120000, 30000 * 2 ** (attempt - 1)))
    + Math.floor(random() * 5000);
}

// Owner-approved exact final Deck12 recovery: never exceed three synthesis
// attempts per phrase; all other decks/supports/scopes keep their old budget.
export function applyDeck12SrFullTtsBudget({ setId, supportLang, targetLangs, limit = 0, maxDurationSeconds = 0 }, env = process.env) {
  if (setId !== "home_office_desk_a1_a2" || supportLang !== "SR" || limit !== 0 || maxDurationSeconds !== 0
    || targetLangs.join(",") !== "RU,PL,CS,SK") return false;
  const configured = Number(env.EDGE_TTS_RETRIES);
  env.EDGE_TTS_RETRIES = String(Number.isInteger(configured) && configured > 0 ? Math.min(3, configured) : 3);
  return true;
}
