// Fetches the Pokémon Showdown learnsets data (CORS: open) and extracts
// all Gen 9 legal moves for a given Pokémon display name.
//
// PS learnset codes starting with "9" indicate Gen 9 legality:
//   9L1 = level-up, 9M = TM/HM, 9T = tutor, 9E = egg move

let _learnsets = null;
let _fetchPromise = null;

async function fetchLearnsets() {
  if (_learnsets) return _learnsets;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    const res = await fetch('https://play.pokemonshowdown.com/data/learnsets.js');
    if (!res.ok) throw new Error('Failed to fetch learnsets from Pokémon Showdown');
    const text = await res.text();
    // File format: exports.BattleLearnsets = {...};
    // Evaluate in a controlled scope (trusted source with open CORS).
    const mod = {};
    // eslint-disable-next-line no-new-func
    new Function('exports', text)(mod);
    _learnsets = mod.BattleLearnsets ?? {};
    return _learnsets;
  })();

  return _fetchPromise;
}

// Convert a @smogon/calc display name (e.g. "Blastoise-Mega") to a PS learnset ID.
function toPsId(name) {
  return name.toLowerCase().replace(/[-\s]/g, '');
}

// Mega/primal/etc. forms don't have their own learnset entries; the base form
// holds all moves that can be learned. Strip these suffixes to find the base.
const STRIP_SUFFIXES = [
  'megax', 'megay', 'mega', 'gmax', 'primal',
  'both', 'blade', 'shield',
  'origin', 'altered', 'incarnate', 'therian',
  'sky', 'land', 'aria', 'pirouette',
  'core', 'resolute',
];

function resolveLearnsetId(displayName, learnsets) {
  const id = toPsId(displayName);
  if (learnsets[id]) return id;
  for (const suffix of STRIP_SUFFIXES) {
    if (id.endsWith(suffix)) {
      const base = id.slice(0, -suffix.length);
      if (learnsets[base]) return base;
    }
  }
  return null;
}

/**
 * Return all Gen 9 legal move IDs for a Pokémon given its display name.
 * Fetches PS learnsets on first call; subsequent calls use the in-memory cache.
 * @param {string} displayName  e.g. "Blastoise-Mega", "Urshifu-Rapid-Strike"
 * @returns {Promise<string[]>} lowercase move IDs, sorted alphabetically
 */
export async function getGen9Moves(displayName) {
  const learnsets = await fetchLearnsets();
  const id = resolveLearnsetId(displayName, learnsets);
  if (!id) return [];

  const learnset = learnsets[id]?.learnset ?? {};
  const result = [];
  for (const [moveId, codes] of Object.entries(learnset)) {
    if (codes.some(c => c.startsWith('9'))) {
      result.push(moveId);
    }
  }
  result.sort();
  return result;
}
