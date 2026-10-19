// Explicit, immutable per-support counts. This never infers phone verification
// or changes channel capabilities; callers supply the owner-approved scope.
export function ordinaryCountOverrides(value, supports, maximum) {
  if (value === undefined || value === null || value === "") return {};
  const entries = typeof value === "string"
    ? value.split(",").map((entry) => {
      const match = /^([A-Z][A-Z0-9-]*):(\d+)$/u.exec(entry.trim());
      if (!match) throw new Error(`Invalid ordinary count override: ${entry}`);
      return [match[1], Number(match[2])];
    })
    : value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value)
      : null;
  if (!entries) throw new Error("ordinary count overrides must be a support:count list or object");
  const result = {};
  for (const [support, count] of entries) {
    if (!supports.includes(support)) throw new Error(`Unknown ordinary override support: ${support}`);
    if (Object.hasOwn(result, support)) throw new Error(`Duplicate ordinary override support: ${support}`);
    if (!Number.isInteger(count) || count < 1 || count > maximum) {
      throw new Error(`${support}: ordinary count override must be within 1..${maximum}`);
    }
    result[support] = count;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
