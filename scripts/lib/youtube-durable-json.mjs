import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LEDGER = "youtube-publication-campaigns.json";
const HISTORY = "youtube-publication-campaign-history";
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const rowHash = (row) => hash(JSON.stringify(row));

function campaignMap(rows, label) {
  const result = new Map();
  for (const row of rows) {
    if (!row?.campaignId || result.has(row.campaignId)) throw new Error(`${label}: missing or duplicate campaign ID`);
    result.set(row.campaignId, row);
  }
  return result;
}

function loadArchives(filePath, references = []) {
  if (!Array.isArray(references)) throw new Error("Invalid campaign archive references");
  const rows = [];
  const seenPaths = new Set();
  for (const ref of references) {
    if (!ref || !new RegExp(`^${HISTORY}/[a-f0-9]{64}\\.json$`).test(ref.path || "") || seenPaths.has(ref.path)) {
      throw new Error("Invalid or duplicate campaign archive path");
    }
    seenPaths.add(ref.path);
    const adjacent = path.resolve(path.dirname(filePath), ref.path);
    // Scratch previews use the canonical immutable history; downloaded state
    // artifacts carry their own adjacent config/history directory.
    const relativePreview = path.relative(path.resolve("scratch"), path.resolve(filePath));
    const isScratchPreview = relativePreview && !relativePreview.startsWith("..") && !path.isAbsolute(relativePreview);
    const source = fs.existsSync(adjacent) || !isScratchPreview ? adjacent : path.resolve("config", ref.path);
    const bytes = fs.readFileSync(source);
    if (hash(bytes) !== ref.sha256 || path.basename(ref.path, ".json") !== ref.sha256) {
      throw new Error(`Campaign archive checksum mismatch: ${ref.path}`);
    }
    const archive = JSON.parse(bytes);
    if (archive.schemaVersion !== 1 || !Array.isArray(archive.campaigns) || archive.campaigns.length !== ref.campaignCount) {
      throw new Error(`Invalid campaign archive shape: ${ref.path}`);
    }
    rows.push(...archive.campaigns);
  }
  return campaignMap(rows, "campaign archives");
}

export function readYoutubeDurableJson(filePath) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value.campaignArchives?.length) return value;
  const rows = loadArchives(filePath, value.campaignArchives);
  // An explicit inline row is a newer version, not an additional publication.
  for (const [id, row] of campaignMap(value.campaigns || [], "inline campaigns")) rows.set(id, row);
  const order = value.campaignOrder;
  if (!Array.isArray(order) || new Set(order).size !== order.length || order.length !== rows.size || order.some((id) => !rows.has(id))) {
    throw new Error("Campaign archive index/order mismatch");
  }
  return { ...value, campaigns: order.map((id) => rows.get(id)) };
}

function indexedRegistry(value, archived) {
  const current = campaignMap(value.campaigns || [], "hydrated campaigns");
  for (const id of archived.keys()) {
    if (!current.has(id)) throw new Error(`Campaign history missing before write: ${id}; hydrate the ledger first`);
  }
  return {
    ...value,
    campaigns: [...current.values()].filter((row) => !archived.has(row.campaignId) || rowHash(row) !== rowHash(archived.get(row.campaignId))),
    campaignOrder: [...current.keys()],
  };
}

export function planYoutubeCampaignHistoryArchive(filePath) {
  const registry = readYoutubeDurableJson(filePath);
  const archived = loadArchives(filePath, registry.campaignArchives || []);
  // Only complete campaigns move to history. Active/reconciliation claims stay
  // inline, and every reader still receives every campaign in original order.
  const candidates = registry.campaigns.filter((row) => row.status === "finalized" && !archived.has(row.campaignId));
  if (!candidates.length) throw new Error("No additional finalized campaigns to archive");
  const history = { schemaVersion: 1, campaigns: candidates };
  const historyText = `${JSON.stringify(history)}\n`;
  const sha256 = hash(historyText);
  const reference = { path: `${HISTORY}/${sha256}.json`, sha256, campaignCount: candidates.length };
  for (const row of candidates) archived.set(row.campaignId, row);
  const index = indexedRegistry({ ...registry, campaignArchives: [...(registry.campaignArchives || []), reference] }, archived);
  return { registry, index, historyText, reference, historyPath: path.join(path.dirname(filePath), reference.path) };
}

// History stays immutable and content-addressed. Changed historical campaigns
// become explicit inline overrides; old receipts remain in the history blob.
export function serializeYoutubeDurableJson(filePath, value, maxBytes = 95 * 1024 * 1024) {
  const isLedger = path.basename(filePath) === LEDGER;
  const compact = isLedger || path.basename(path.dirname(filePath)) === HISTORY;
  const stored = isLedger && value.campaignArchives?.length
    ? indexedRegistry(value, loadArchives(filePath, value.campaignArchives))
    : value;
  const text = `${JSON.stringify(stored, null, compact ? undefined : 2)}\n`;
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > maxBytes) {
    throw new Error(`Durable JSON exceeds safe GitHub blob budget: ${filePath} (${bytes} bytes > ${maxBytes}); preserve receipts and split storage before push`);
  }
  return text;
}
