// Two learnset sources:
//   1. Champions mod  — github.com/smogon/pokemon-showdown (master), open CORS
//      Authoritative list of what each Pokémon can legally use in the Champions format.
//   2. Base learnsets — play.pokemonshowdown.com/data/learnsets.js, open CORS
//      Every generation's learnsets; used as a fallback for non-Champions
//      Pokémon, either filtered to Gen 9 or as an any-generation union.

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

/**
 * Batch Champions legality check.
 *
 * A species counts as legal when the Champions mod has a learnset that applies
 * to it — the same resolution `getChampionsMovesBatch` uses, so a forme (Mega,
 * Blade, Therian…) inherits its base species' legality.
 *
 * @param {string[]} names  display names
 * @returns {Promise<Map<string, boolean>>}
 */
export async function getChampionsLegalityBatch(names) {
  const learnsets = await fetchChampionsLearnsets();
  const result = new Map();
  for (const name of names) result.set(name, resolveId(name, learnsets) !== null);
  return result;
}

// ── Champions item legality overrides ─────────────────────────────────────────
// The Champions mod's items.ts is a *diff* over base Gen 9, not a whitelist:
//   isNonstandard: "Past"  → banned in Champions
//   isNonstandard: null    → re-enabled (mostly Mega Stones, Past in base Gen 9)
// Anything not listed inherits base legality. Unlike learnsets.ts, this file
// contains TypeScript in method bodies (e.g. `as any`), so it can't be eval'd —
// we scan for the isNonstandard flag per top-level entry instead. Top-level
// entries are indented with a single tab; function-body lines use 2+ tabs.

let _champItems = null;
let _champItemsPromise = null;

const CHAMPIONS_ITEMS_URL =
  'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/items.ts';

/**
 * Champions item legality overrides.
 * @returns {Promise<{ banned: Set<string>, reenabled: Set<string> }>}  PS item IDs
 */
export async function getChampionsItemOverrides() {
  if (_champItems) return _champItems;
  if (_champItemsPromise) return _champItemsPromise;

  _champItemsPromise = (async () => {
    const res = await fetch(CHAMPIONS_ITEMS_URL);
    if (!res.ok) throw new Error('Failed to fetch Champions items from GitHub');
    const text = await res.text();

    const banned = new Set();
    const reenabled = new Set();
    const re = /^\t(\w+):\s*\{/gm; // top-level entry starts only
    const marks = [];
    let m;
    while ((m = re.exec(text))) marks.push({ id: m[1], idx: m.index });
    for (let i = 0; i < marks.length; i++) {
      const slice = text.slice(marks[i].idx, marks[i + 1]?.idx ?? text.length);
      if (/isNonstandard:\s*null/.test(slice)) reenabled.add(marks[i].id);
      else if (/isNonstandard:\s*['"]Past['"]/.test(slice)) banned.add(marks[i].id);
    }
    _champItems = { banned, reenabled };
    return _champItems;
  })();

  return _champItemsPromise;
}

// ── PS Pokédex (ability data) ─────────────────────────────────────────────────
// gen.species.abilities from @smogon/calc is incomplete (many Pokémon only
// show slot-0). Use the PS Pokédex which has all three ability slots.

let _pokedex = null;
let _pokedexPromise = null;

async function fetchPSPokedex() {
  if (_pokedex) return _pokedex;
  if (_pokedexPromise) return _pokedexPromise;

  _pokedexPromise = (async () => {
    const res = await fetch('https://play.pokemonshowdown.com/data/pokedex.js');
    if (!res.ok) throw new Error('Failed to fetch PS Pokédex');
    const text = await res.text();
    const mod = {};
    // eslint-disable-next-line no-new-func
    new Function('exports', text)(mod);
    _pokedex = mod.BattlePokedex ?? {};
    return _pokedex;
  })();

  return _pokedexPromise;
}

/**
 * Returns all ability names (slots 0, 1, H) for an array of PS IDs.
 * @param {string[]} psIds
 * @returns {Promise<Map<string, string[]>>}
 */
export async function getAbilitiesBatch(psIds) {
  const dex = await fetchPSPokedex();
  const result = new Map();
  for (const id of psIds) {
    const entry = dex[id] ?? dex[resolveId(id, dex)] ?? null;
    result.set(id, Object.values(entry?.abilities ?? {}).filter(Boolean));
  }
  return result;
}

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

function isCosmeticForme(entry, base) {
  if (!base || base === entry) return false;
  return STAT_KEYS.every(k => entry.baseStats[k] === base.baseStats?.[k])
    && (entry.types ?? []).join() === (base.types ?? []).join()
    && Object.values(entry.abilities ?? {}).join() === Object.values(base.abilities ?? {}).join();
}

/**
 * Every real Pokémon in the Pokédex, with the data the PokéFinder tables need.
 *
 * The Pokédex is the freshest species list available — @smogon/calc's Gen 9
 * table is missing formes the Champions mod has added (the Mega-Z line, for
 * one). CAP Pokémon and Missingno have num <= 0 and are dropped.
 *
 * @returns {Promise<Array<{id, name, forme, baseStats, types, abilities, nfe}>>}
 */
export async function getAllSpeciesEntries() {
  const dex = await fetchPSPokedex();
  const result = [];
  for (const [id, entry] of Object.entries(dex)) {
    if ((entry.num ?? 0) <= 0 || !entry.baseStats) continue;
    // A forme with its base species' stats, types and abilities is a costume
    // (Pikachu's caps, Vivillon's wing patterns, Genesect's drives) and would
    // just repeat the same row.
    if (isCosmeticForme(entry, dex[toPsId(entry.baseSpecies ?? '')])) continue;
    result.push({
      id,
      name: entry.name,
      forme: entry.forme ?? '',
      baseStats: entry.baseStats,
      types: entry.types ?? [],
      abilities: Object.values(entry.abilities ?? {}).filter(Boolean),
      nfe: !!entry.evos?.length,
    });
  }
  return result;
}

/**
 * Returns Mega form data for every Champions-legal base species.
 * Mega forms inherit their learnset from the base species; stats, types,
 * and abilities come from the PS Pokédex (which has full Mega data).
 *
 * @param {string[]} champIds  PS IDs of the 237 Champions base species
 * @returns {Promise<Array<{id, name, baseStats, types, abilities}>>}
 */
export async function getChampionsMegaForms(champIds) {
  const dex = await fetchPSPokedex();
  const champSet = new Set(champIds);
  const result = [];
  for (const [psId, entry] of Object.entries(dex)) {
    if (!entry.forme?.startsWith('Mega')) continue;
    const baseId = toPsId(entry.baseSpecies ?? '');
    if (!champSet.has(baseId)) continue;
    result.push({
      id: psId,
      name: entry.name,
      baseStats: entry.baseStats,
      types: entry.types,
      abilities: Object.values(entry.abilities ?? {}).filter(Boolean),
    });
  }
  return result;
}

// ── Base learnsets (non-Champions fallback) ──────────────────────────────────
// One file from Pokémon Showdown carries every generation's learnset. Gen 9
// legality is the subset whose move codes start with "9"; the unfiltered union
// ("has ever learned it") is what the PokéFinder uses for Pokémon that aren't
// in Champions, since the mod re-enables plenty of past-generation content.

let _psLearnsets = null;
let _psLearnsetsPromise = null;

async function fetchPSLearnsets() {
  if (_psLearnsets) return _psLearnsets;
  if (_psLearnsetsPromise) return _psLearnsetsPromise;

  _psLearnsetsPromise = (async () => {
    const res = await fetch('https://play.pokemonshowdown.com/data/learnsets.js');
    if (!res.ok) throw new Error('Failed to fetch learnsets from Pokémon Showdown');
    const text = await res.text();
    const mod = {};
    // eslint-disable-next-line no-new-func
    new Function('exports', text)(mod);
    _psLearnsets = mod.BattleLearnsets ?? {};
    return _psLearnsets;
  })();

  return _psLearnsetsPromise;
}

/**
 * Full Gen 9 legal move IDs for a Pokémon.
 * Used as a fallback for Pokémon not in the Champions learnsets
 * (e.g. when using the Compare page to compare non-Champions Pokémon).
 */
export async function getGen9Moves(displayName) {
  const learnsets = await fetchPSLearnsets();
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
  const learnsets = await fetchPSLearnsets();
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

/**
 * Batch any-generation move lookup — every move the Pokémon has ever learned,
 * regardless of generation. Pokémon cut from Scarlet/Violet have no Gen 9
 * learnset at all, so a Gen 9 lookup would report them as learning nothing.
 *
 * @param {string[]} names  display names
 * @returns {Promise<Map<string, Set<string>>>}  name → Set of move IDs
 */
export async function getAnyGenMovesBatch(names) {
  const learnsets = await fetchPSLearnsets();
  const result = new Map();
  for (const name of names) {
    const id = resolveId(name, learnsets);
    result.set(name, id ? new Set(Object.keys(learnsets[id]?.learnset ?? {})) : new Set());
  }
  return result;
}
