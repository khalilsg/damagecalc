/**
 * pokebench/chaos.js
 * Fetch and parse the Smogon chaos JSON for a given month + format prefix.
 * URL: https://www.smogon.com/stats/{month}/chaos/{prefix}-0.json
 */

export async function fetchChaosData(month, prefix) {
  const url = `https://www.smogon.com/stats/${month}/chaos/${prefix}-0.json`;
  process.stderr.write(`Fetching ${url} ...\n`);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      // Try to list available formats to help the user
      const suggestions = await getAvailablePrefixes(month).catch(() => []);
      const hint = suggestions.length > 0
        ? `\n\nAvailable Champions formats for ${month}:\n` +
          suggestions.map(s => `  --prefix "${s}"`).join('\n')
        : `\n\nCheck https://www.smogon.com/stats/${month}/chaos/ for valid prefixes.`;
      throw new Error(`Prefix "${prefix}" not found for ${month}.${hint}`);
    }
    throw new Error(`HTTP ${res.status} fetching chaos data: ${url}`);
  }
  return res.json();
}

/** Fetch the chaos directory listing and extract champion/vgc format prefixes. */
async function getAvailablePrefixes(month) {
  const dirUrl = `https://www.smogon.com/stats/${month}/chaos/`;
  const res = await fetch(dirUrl);
  if (!res.ok) return [];
  const html = await res.text();
  // Extract filenames ending in -0.json (base rating tier only)
  const matches = [...html.matchAll(/href="([^"]*-0\.json)"/g)].map(m => m[1]);
  return matches
    .map(f => f.replace(/-0\.json$/, ''))
    .filter(f => f.includes('champion') || f.includes('vgc'));
}

/**
 * Parse chaos JSON into a sorted opponent list (descending by usage).
 * Each entry:
 *   { name, usagePct, moves, spreads, items }
 *   moves/items: [{ name, pct }, ...]
 *   spreads:     [{ nature, evs, pct }, ...]
 *
 * @param {object}  chaosData  Raw JSON from Smogon
 * @param {number}  topN       How many top opponents to return
 * @returns {Array}
 */
export function parseOpponents(chaosData, topN) {
  return Object.entries(chaosData.data)
    .map(([name, info]) => ({
      name,
      usagePct: info.usage ?? 0,
      moves:   sortDesc(info.Moves   ?? {}).map(([n, pct]) => ({ name: n, pct })),
      items:   sortDesc(info.Items   ?? {}).map(([n, pct]) => ({ name: n, pct })),
      spreads: sortDesc(info.Spreads ?? {})
                 .map(([key, pct]) => { const s = parseSpread(key); return s ? { ...s, pct } : null; })
                 .filter(Boolean),
    }))
    .sort((a, b) => b.usagePct - a.usagePct)
    .slice(0, topN);
}

/**
 * Look up a specific Pokémon's chaos entry by resolved species name.
 * Returns null if not present in the data.
 */
export function getMonEntry(chaosData, resolvedName) {
  // Try exact key first, then case-insensitive fallback
  if (chaosData.data[resolvedName]) return chaosData.data[resolvedName];
  const lower = resolvedName.toLowerCase();
  for (const [key, val] of Object.entries(chaosData.data)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

/**
 * Parse "Timid:0/0/0/32/0/32" → { nature, evs: { hp, atk, def, spa, spd, spe } }
 * Returns null if malformed.
 */
export function parseSpread(str) {
  try {
    const colon = str.indexOf(':');
    if (colon === -1) return null;
    const nature = str.slice(0, colon).trim();
    const parts  = str.slice(colon + 1).split('/').map(Number);
    if (parts.length !== 6 || parts.some(isNaN)) return null;
    const [hp, atk, def, spa, spd, spe] = parts;
    return { nature, evs: { hp, atk, def, spa, spd, spe } };
  } catch {
    return null;
  }
}

function sortDesc(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}
