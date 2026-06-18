// Two learnset sources:
//   1. Champions mod  — github.com/smogon/pokemon-showdown (master), open CORS
//      Authoritative list of what each Pokémon can legally use in the Champions format.
//   2. Base Gen 9     — play.pokemonshowdown.com/data/learnsets.js, open CORS
//      Full Gen 9 learnsets; used only as a fallback for non-Champions Pokémon.

// ── Shared helpers ────────────────────────────────────────────────────────────

function toPsId(name) {
  return name.toLowerCase().replace(/[-\s]/g, '');
}

// Forms that don't have their own learnset entry — fall back to base species.
const STRIP_SUFFIXES = [
  'megax', 'megay', 'mega', 'gmax', 'primal',
  'both', 'blade', 'shield',
  'origin', 'altered', 'incarnate', 'therian',
  'sky', 'land', 'aria', 'pirouette',
  'core', 'resolute',
];

function resolveId(displayName, learnsets) {
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

// ── Champions learnsets ───────────────────────────────────────────────────────

let _champ = null;
let _champPromise = null;

const CHAMPIONS_URL =
  'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/learnsets.ts';

async function fetchChampionsLearnsets() {
  if (_champ) return _champ;
  if (_champPromise) return _champPromise;

  _champPromise = (async () => {
    const res = await fetch(CHAMPIONS_URL);
    if (!res.ok) throw new Error('Failed to fetch Champions learnsets from GitHub');
    const text = await res.text();
    // File: export const Learnsets: SomeType = { species: { learnset: {...} }, ... };
    // Grab the object literal starting at the first { and ending at the last }.
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    // eslint-disable-next-line no-new-func
    _champ = new Function(`return ${text.slice(start, end + 1)}`)();
    return _champ;
  })();

  return _champPromise;
}

/**
 * All Champions-format species IDs (lowercase, no separators).
 * Resolves on first call; cached after that.
 */
export async function getChampionsSpeciesIds() {
  const learnsets = await fetchChampionsLearnsets();
  return Object.keys(learnsets);
}

/**
 * Champions-legal move IDs for a single Pokémon (by display name).
 * Returns an empty array if the Pokémon is not Champions-legal.
 */
export async function getChampionsMoves(displayName) {
  const learnsets = await fetchChampionsLearnsets();
  const id = resolveId(displayName, learnsets);
  if (!id) return [];
  return Object.keys(learnsets[id]?.learnset ?? {}).sort();
}

/**
 * Batch Champions move lookup.
 * @param {string[]} names  display names
 * @returns {Promise<Map<string, Set<string>>>}  name → Set of move IDs
 */
export async function getChampionsMovesBatch(names) {
  const learnsets = await fetchChampionsLearnsets();
  const result = new Map();
  for (const name of names) {
    const id = resolveId(name, learnsets);
    result.set(name, id ? new Set(Object.keys(learnsets[id]?.learnset ?? {})) : new Set());
  }
  return result;
}

// ── Base Gen 9 learnsets (fallback) ──────────────────────────────────────────

let _gen9 = null;
let _gen9Promise = null;

async function fetchGen9Learnsets() {
  if (_gen9) return _gen9;
  if (_gen9Promise) return _gen9Promise;

  _gen9Promise = (async () => {
    const res = await fetch('https://play.pokemonshowdown.com/data/learnsets.js');
    if (!res.ok) throw new Error('Failed to fetch Gen 9 learnsets from Pokémon Showdown');
    const text = await res.text();
    const mod = {};
    // eslint-disable-next-line no-new-func
    new Function('exports', text)(mod);
    _gen9 = mod.BattleLearnsets ?? {};
    return _gen9;
  })();

  return _gen9Promise;
}

/**
 * Full Gen 9 legal move IDs for a Pokémon.
 * Used as a fallback for Pokémon not in the Champions learnsets
 * (e.g. when using the Compare page to compare non-Champions Pokémon).
 */
export async function getGen9Moves(displayName) {
  const learnsets = await fetchGen9Learnsets();
  const id = resolveId(displayName, learnsets);
  if (!id) return [];
  const learnset = learnsets[id]?.learnset ?? {};
  const result = [];
  for (const [moveId, codes] of Object.entries(learnset)) {
    if (codes.some(c => c.startsWith('9'))) result.push(moveId);
  }
  result.sort();
  return result;
}

/**
 * Batch Gen 9 move lookup (for non-Champions contexts).
 */
export async function getGen9MovesBatch(names) {
  const learnsets = await fetchGen9Learnsets();
  const result = new Map();
  for (const name of names) {
    const id = resolveId(name, learnsets);
    if (!id) { result.set(name, new Set()); continue; }
    const learnset = learnsets[id]?.learnset ?? {};
    const moves = new Set();
    for (const [moveId, codes] of Object.entries(learnset)) {
      if (codes.some(c => c.startsWith('9'))) moves.add(moveId);
    }
    result.set(name, moves);
  }
  return result;
}
