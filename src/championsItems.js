// Champions-legal item list (A-lite).
//
// The Champions mod's items.ts only encodes legality *deltas* (bans + Mega
// re-enables), so it can't stand alone. We take the base universe from the
// bundled chaos usage stats (already local, already Champions-only, provably
// clean of banned items), then apply the mod's overrides on top:
//
//   legal = (chaos-used items ∪ re-enabled) − banned
//
// This misses legal-but-never-used items (e.g. Choice Specs); the "allow all
// items" toggle in the UI is the escape hatch for those rare cases.

import { gen, allItems } from './calcEngine.js';
import { getChampionsItemOverrides } from './learnsets.js';
import { loadChaosData, KNOWN_FORMATS } from './leadSelector/chaos.js';

let _cache = null;
let _promise = null;

async function chaosItemIds() {
  const ids = new Set();
  const datasets = await Promise.all(
    KNOWN_FORMATS.map(f => loadChaosData(f.prefix).catch(() => null))
  );
  for (const data of datasets) {
    if (!data?.data) continue;
    for (const entry of Object.values(data.data))
      for (const id of Object.keys(entry.Items ?? {})) ids.add(id);
  }
  return ids;
}

/**
 * Sorted display names of Champions-legal items.
 * Falls back to the full item list if the overrides or chaos data can't load
 * (better to over-offer than to show an empty dropdown).
 * @returns {Promise<string[]>}
 */
export async function getChampionsLegalItems() {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const [overrides, baseIds] = await Promise.all([
        getChampionsItemOverrides(),
        chaosItemIds(),
      ]);
      const ids = new Set(baseIds);
      for (const id of overrides.reenabled) ids.add(id);
      for (const id of overrides.banned) ids.delete(id);
      ids.delete('nothing');
      const names = [...ids]
        .map(id => gen.items.get(id)?.name)
        .filter(Boolean)
        .sort();
      // If chaos yielded nothing (e.g. all fetches failed), don't ship an
      // empty list — fall back to the full set.
      _cache = names.length ? names : allItems;
      return _cache;
    } catch {
      return allItems;
    }
  })();

  return _promise;
}
