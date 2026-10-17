export function hasPolyglotPricingCopy(description) {
  return /free|paid|pricing|subscription|tariff|бесплат|платн|тариф|precio|gratis|pago/iu.test(String(description || ""));
}
