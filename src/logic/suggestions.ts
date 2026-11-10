/** Address autocomplete for the active shift screen (SPEC §4.2). */

/** One row per distinct stored address, as aggregated by the database. */
export type AddressUsage = {
  address: string;
  count: number;
  lastUsedAt: number;
};

export type AddressSuggestion = {
  address: string;
  count: number;
};

export const MIN_QUERY_LENGTH = 2;
export const MAX_SUGGESTIONS = 3;

/** Case-, accent- and spacing-insensitive key: "  San  Martín 820" → "san martin 820". */
export function addressKey(address: string): string {
  return address
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Up to 3 previously used addresses (from any shift) containing what was typed,
 * from 2 characters on, ordered by how often they were used.
 * Spellings that only differ in case/accents/spaces count as the same address;
 * the most used spelling is shown.
 */
export function suggestAddresses(query: string, usage: readonly AddressUsage[]): AddressSuggestion[] {
  const q = addressKey(query);
  if (q.length < MIN_QUERY_LENGTH) return [];

  type Merged = { count: number; lastUsedAt: number; best: AddressUsage };
  const merged = new Map<string, Merged>();
  for (const row of usage) {
    const key = addressKey(row.address);
    if (!key.includes(q)) continue;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { count: row.count, lastUsedAt: row.lastUsedAt, best: row });
      continue;
    }
    current.count += row.count;
    current.lastUsedAt = Math.max(current.lastUsedAt, row.lastUsedAt);
    const better =
      row.count > current.best.count || (row.count === current.best.count && row.lastUsedAt > current.best.lastUsedAt);
    if (better) current.best = row;
  }

  return [...merged.values()]
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_SUGGESTIONS)
    .map((m) => ({ address: m.best.address, count: m.count }));
}

/** "3 veces" / "1 vez" */
export function timesUsedLabel(count: number): string {
  return count === 1 ? '1 vez' : `${count} veces`;
}
