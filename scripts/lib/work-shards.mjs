export function normalizeShardOptions({ shardCount = 1, shardIndex = 0 } = {}) {
  const count = Number(shardCount);
  const index = Number(shardIndex);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error(`Invalid shardCount=${shardCount}; expected integer 1..20.`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new Error(`Invalid shardIndex=${shardIndex}; expected integer 0..${count - 1}.`);
  }
  return { shardCount: count, shardIndex: index };
}

export function uniqueSortedItems(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].sort();
}

export function shardItems(items, options = {}) {
  const { shardCount, shardIndex } = normalizeShardOptions(options);
  const sorted = uniqueSortedItems(items);
  if (shardCount === 1) {
    return {
      shardCount,
      shardIndex,
      allItems: sorted,
      selectedItems: sorted,
      skippedItems: [],
    };
  }
  const selectedItems = sorted.filter((_, index) => index % shardCount === shardIndex);
  return {
    shardCount,
    shardIndex,
    allItems: sorted,
    selectedItems,
    skippedItems: sorted.filter((item) => !selectedItems.includes(item)),
  };
}
