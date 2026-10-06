import path from "node:path";

// Preserve the schema and all historical receipts; compact only the large ledger.
export function serializeYoutubeDurableJson(filePath, value, maxBytes = 95 * 1024 * 1024) {
  const compact = path.basename(filePath) === "youtube-publication-campaigns.json";
  const text = `${JSON.stringify(value, null, compact ? undefined : 2)}\n`;
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > maxBytes) {
    throw new Error(`Durable JSON exceeds safe GitHub blob budget: ${filePath} (${bytes} bytes > ${maxBytes}); preserve receipts and split storage before push`);
  }
  return text;
}
