// Keep the existing attempt budget; rate limiting needs a cooldown, not a
// different voice or provider. Jitter avoids synchronized worker retries.
export function edgeTtsRetryDelay(errorText, attempt, baseMs, random = Math.random) {
  const limited = /HTTP status\s*=\s*429\b|Too Many Requests/i.test(errorText);
  const normal = baseMs * 2 ** (attempt - 1);
  if (!limited) return normal;
  return Math.max(normal, Math.min(120000, 30000 * 2 ** (attempt - 1)))
    + Math.floor(random() * 5000);
}
