/**
 * src/leadSelector/chaos.js
 *
 * Load and parse bundled Smogon chaos data for the lead selector.
 *
 * Files live in public/data/chaos/ and are served from the same origin
 * (GitHub Pages), so no CORS issue. Update them monthly by running:
 *   npm run update-chaos -- --month YYYY-MM
 */

export const KNOWN_FORMATS = [
  { label: 'VGC 2026 Reg MA Bo3', prefix: 'gen9championsvgc2026regmabo3' },
  { label: 'VGC 2026 Reg MA',     prefix: 'gen9championsvgc2026regma'    },
  { label: 'BSS Reg MA',          prefix: 'gen9championsbssregma'        },
];

// In-memory cache so we only fetch each file once per session.
const _cache = new Map();

/**
 * Fetch and cache the trimmed chaos JSON for a format prefix.
 * @param {string} prefix  e.g. "gen9championsvgc2026regmabo3"
 * @returns {Promise<object>} chaos data with { info, data: { [species]: entry } }
 */
export async function loadChaosData(prefix) {
  if (_cache.has(prefix)) return _cache.get(prefix);
  const res = await fetch(`/data/chaos/${prefix}.json`);
  if (!res.ok) throw new Error(`Chaos data not found for prefix "${prefix}"`);
  const data = await res.json();
  _cache.set(prefix, data);
  return data;
}

/**
 * Get a representative set for a species from chaos data.
 *
 * @param {object} chaosData  Loaded chaos JSON
 * @param {string} speciesName  Resolved species name
 * @returns {{ name, spread, moves, item, usage } | null}
 *   spread = { nature: string, evs: { hp, atk, def, spa, spd, spe } }
 *   moves  = string[]  (top 8 by usage)
 *   item   = string | null  (most-used item)
 */
export function getOpponentRep(chaosData, speciesName) {
  // Try exact key first, then case-insensitive
  let entry = chaosData.data[speciesName];
  if (!entry) {
    const lower = speciesName.toLowerCase();
    for (const [k, v] of Object.entries(chaosData.data)) {
      if (k.toLowerCase() === lower) { entry = v; break; }
    }
  }
  if (!entry) return null;

  const topSpreadKey = Object.keys(entry.Spreads ?? {})[0];
  const spread = topSpreadKey ? parseSpread(topSpreadKey) : { nature: 'Serious', evs: {} };
  const moves  = Object.keys(entry.Moves ?? {}).slice(0, 8);
  const item   = Object.keys(entry.Items ?? {})[0] ?? null;

  return { name: speciesName, spread, moves, item, usage: entry.usage ?? 0 };
}

/**
 * Parse a chaos spread string into { nature, evs }.
 * Input format: "Timid:0/0/0/32/0/32"
 */
export function parseSpread(str) {
  try {
    const colon = str.indexOf(':');
    if (colon === -1) return { nature: 'Serious', evs: {} };
    const nature = str.slice(0, colon).trim();
    const parts  = str.slice(colon + 1).split('/').map(Number);
    if (parts.length !== 6 || parts.some(isNaN)) return { nature, evs: {} };
    const [hp, atk, def, spa, spd, spe] = parts;
    return { nature, evs: { hp, atk, def, spa, spd, spe } };
  } catch {
    return { nature: 'Serious', evs: {} };
  }
}
