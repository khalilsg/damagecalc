/**
 * tests/fixtures/pokefinderData.js
 *
 * Stand-in for the three remote data files the PokéFinder fetches at runtime:
 * the PS Pokédex, the PS learnsets, and the Champions mod's learnsets. The
 * fixture is small and hand-built so the e2e assertions can be exact — the real
 * files move every time Pokémon Showdown updates, which would turn any count or
 * name assertion into a maintenance chore.
 *
 * Each entry is here to exercise one behavior; see SPECIES below.
 */

// ── Species ───────────────────────────────────────────────────────────────────
// [id, name, num, types, stats(hp atk def spa spd spe), abilities, extra]
// `extra` carries the Pokédex fields the finder actually reads: forme,
// baseSpecies, evos.

const SPECIES = [
  // Champions-legal, with Megas (Megas are listed in the Pokédex, and inherit
  // their base species' Champions legality).
  ['venusaur', 'Venusaur', 3, ['Grass', 'Poison'], [80, 82, 83, 100, 100, 80], ['Overgrow', 'Chlorophyll'], {}],
  ['venusaurmega', 'Venusaur-Mega', 3, ['Grass', 'Poison'], [80, 100, 123, 122, 120, 80], ['Thick Fat'],
    { forme: 'Mega', baseSpecies: 'Venusaur' }],
  ['charizard', 'Charizard', 6, ['Fire', 'Flying'], [78, 84, 78, 109, 85, 100], ['Blaze', 'Solar Power'], {}],
  ['charizardmegax', 'Charizard-Mega-X', 6, ['Fire', 'Dragon'], [78, 130, 111, 130, 85, 100], ['Tough Claws'],
    { forme: 'Mega-X', baseSpecies: 'Charizard' }],
  ['blastoise', 'Blastoise', 9, ['Water'], [79, 83, 100, 85, 105, 78], ['Torrent', 'Rain Dish'], {}],
  ['hooh', 'Ho-Oh', 250, ['Fire', 'Flying'], [106, 130, 90, 110, 154, 90], ['Pressure', 'Regenerator'], {}],
  // Champions-legal but not fully evolved — the FE filter must leave Champions
  // mode alone.
  ['porygon2', 'Porygon2', 233, ['Normal'], [85, 80, 90, 105, 95, 60], ['Trace', 'Download', 'Analytic'],
    { evos: ['Porygon-Z'] }],
  // Legality is resolved through the forme, so both Aegislash formes count as
  // Champions-legal off the mod's single `aegislash` learnset.
  ['aegislash', 'Aegislash', 681, ['Steel', 'Ghost'], [60, 50, 140, 50, 140, 60], ['Stance Change'], {}],
  ['aegislashblade', 'Aegislash-Blade', 681, ['Steel', 'Ghost'], [60, 140, 50, 140, 50, 60], ['Stance Change'],
    { forme: 'Blade', baseSpecies: 'Aegislash' }],

  // Not in Champions, and cut from Gen 9 — no Gen 9 learnset at all, so only an
  // any-generation movepool lookup finds them.
  ['zeraora', 'Zeraora', 807, ['Electric'], [88, 112, 75, 102, 80, 143], ['Volt Absorb'], {}],
  ['xerneas', 'Xerneas', 716, ['Fairy'], [126, 131, 95, 131, 98, 99], ['Fairy Aura'], {}],
  // Not in Champions, but still in Gen 9.
  ['entei', 'Entei', 244, ['Fire'], [115, 115, 85, 90, 75, 100], ['Pressure', 'Inner Focus'], {}],
  // Primal counts as a Mega for the "hide mega evolutions" toggle.
  ['groudon', 'Groudon', 383, ['Ground'], [100, 150, 140, 100, 90, 90], ['Drought'], {}],
  ['groudonprimal', 'Groudon-Primal', 383, ['Ground', 'Fire'], [100, 180, 160, 150, 90, 90], ['Desolate Land'],
    { forme: 'Primal', baseSpecies: 'Groudon' }],
  // Unevolved, not in Champions — hidden by the FE filter.
  ['pikachu', 'Pikachu', 25, ['Electric'], [35, 55, 40, 50, 50, 90], ['Static', 'Lightning Rod'],
    { evos: ['Raichu'] }],

  // ── Formes that must be dropped ────────────────────────────────────────────
  // Cosmetic: same stats, types and abilities as its base species.
  ['vivillon', 'Vivillon', 666, ['Bug', 'Flying'], [80, 52, 50, 90, 50, 89],
    ['Shield Dust', 'Compound Eyes', 'Friend Guard'], {}],
  ['vivillonfancy', 'Vivillon-Fancy', 666, ['Bug', 'Flying'], [80, 52, 50, 90, 50, 89],
    ['Shield Dust', 'Compound Eyes', 'Friend Guard'], { forme: 'Fancy', baseSpecies: 'Vivillon' }],
  // Gmax and Totem survive the cosmetic check (their stats differ from the base
  // species') and have to be dropped by name.
  ['toxtricitylowkeygmax', 'Toxtricity-Low-Key-Gmax', 849, ['Electric', 'Poison'], [95, 98, 70, 114, 70, 75],
    ['Punk Rock', 'Minus', 'Technician'], { forme: 'Low-Key-Gmax', baseSpecies: 'Toxtricity' }],
  ['raticatealolatotem', 'Raticate-Alola-Totem', 20, ['Dark', 'Normal'], [95, 71, 70, 40, 80, 77],
    ['Gluttony', 'Hustle', 'Thick Fat'], { forme: 'Alola-Totem', baseSpecies: 'Raticate' }],
  ['pikachustarter', 'Pikachu-Starter', 25, ['Electric'], [45, 80, 50, 75, 60, 120], ['Static'],
    { forme: 'Starter', baseSpecies: 'Pikachu' }],
  ['ogerpon', 'Ogerpon', 1017, ['Grass'], [80, 120, 84, 60, 96, 110], ['Defiant'], {}],
  ['ogerpontealtera', 'Ogerpon-Teal-Tera', 1017, ['Grass'], [80, 120, 84, 60, 96, 110], ['Embody Aspect (Teal)'],
    { forme: 'Teal-Tera', baseSpecies: 'Ogerpon' }],
  // CAP and Missingno — num <= 0.
  ['syclant', 'Syclant', -2, ['Ice', 'Bug'], [70, 116, 70, 114, 64, 121], ['Compound Eyes', 'Mountaineer'], {}],
  ['missingno', 'Missingno.', 0, ['Bird', 'Normal'], [33, 136, 0, 6, 6, 29], [], {}],

  // ── Formes that must be kept ──────────────────────────────────────────────
  // Differs from its base species only in ability, so the cosmetic check must
  // not treat it as a duplicate.
  ['toxtricity', 'Toxtricity', 849, ['Electric', 'Poison'], [75, 98, 70, 114, 70, 75],
    ['Punk Rock', 'Plus', 'Technician'], {}],
  ['toxtricitylowkey', 'Toxtricity-Low-Key', 849, ['Electric', 'Poison'], [75, 98, 70, 114, 70, 75],
    ['Punk Rock', 'Minus', 'Technician'], { forme: 'Low-Key', baseSpecies: 'Toxtricity' }],
  // Regional forme — different types from its base species.
  ['raticate', 'Raticate', 20, ['Normal'], [55, 81, 60, 50, 70, 97], ['Run Away', 'Guts', 'Hustle'], {}],
  ['raticatealola', 'Raticate-Alola', 20, ['Dark', 'Normal'], [75, 71, 70, 40, 80, 77],
    ['Gluttony', 'Hustle', 'Thick Fat'], { forme: 'Alola', baseSpecies: 'Raticate' }],
];

// Padding so the full-dex list crosses the finder's 250-row render cap. Low BST
// keeps them below every real Pokémon in the default sort.
const FILLER_COUNT = 300;

function fillerSpecies() {
  const out = [];
  for (let i = 1; i <= FILLER_COUNT; i++) {
    const n = String(i).padStart(3, '0');
    out.push([`fillermon${n}`, `Fillermon${n}`, 2000 + i, ['Normal'], [50, 50, 50, 50, 50, 50], ['Run Away'], {}]);
  }
  return out;
}

const ALL_SPECIES = [...SPECIES, ...fillerSpecies()];

function pokedexEntry([id, name, num, types, stats, abilities, extra]) {
  const [hp, atk, def, spa, spd, spe] = stats;
  const entry = {
    num, name, types,
    baseStats: { hp, atk, def, spa, spd, spe },
    // PS keys ability slots "0", "1", "H" — the last of several is the hidden one.
    abilities: Object.fromEntries(abilities.map((a, i) =>
      [i > 0 && i === abilities.length - 1 ? 'H' : String(i), a])),
  };
  if (extra.forme)       entry.forme       = extra.forme;
  if (extra.baseSpecies) entry.baseSpecies = extra.baseSpecies;
  if (extra.evos)        entry.evos        = extra.evos;
  return [id, entry];
}

/** `play.pokemonshowdown.com/data/pokedex.js` */
export const pokedexJs =
  'exports.BattlePokedex = ' + JSON.stringify(Object.fromEntries(ALL_SPECIES.map(pokedexEntry))) + ';';

// ── Learnsets ─────────────────────────────────────────────────────────────────

// Base (all-generation) learnsets. Move codes matter: an entry with no "9…"
// code is a Pokémon with no Gen 9 movepool.
const PS_LEARNSETS = {
  venusaur:   { leechseed: ['9M'], sludgebomb: ['9M'], synthesis: ['9M'] },
  charizard:  { roost: ['9M'], flamethrower: ['9M'], dragonclaw: ['9M'] },
  blastoise:  { surf: ['9M'], roost: ['8M'] },
  // Brave Bird is in Ho-Oh's base movepool but NOT in its Champions movepool:
  // a Champions-legal Pokémon must be matched against the Champions movepool.
  hooh:       { sacredfire: ['9L1'], roost: ['9M'], bravebird: ['9M'] },
  porygon2:   { recover: ['9M'] },
  aegislash:  { kingsshield: ['9L1'], shadowball: ['9M'] },
  entei:      { sacredfire: ['9L1'], flamethrower: ['9M'] },
  groudon:    { precipiceblades: ['9L1'] },
  pikachu:    { thunderbolt: ['9M'] },
  toxtricity: { overdrive: ['9L1'] },
  raticate:   { crunch: ['9M'] },
  vivillon:   { quiverdance: ['9L1'] },
  ogerpon:    { ivycudgel: ['9L1'] },
  // Cut from Gen 9 — past-generation codes only.
  zeraora:    { plasmafists: ['7L1'], closecombat: ['7L1'] },
  xerneas:    { geomancy: ['7L1'], moonblast: ['7L1'] },
};

/** `play.pokemonshowdown.com/data/learnsets.js` */
export const learnsetsJs =
  'exports.BattleLearnsets = ' +
  JSON.stringify(Object.fromEntries(Object.entries(PS_LEARNSETS).map(([id, ls]) => [id, { learnset: ls }]))) + ';';

// The Champions mod's learnsets — the roster of what's legal, and the movepool
// legal Pokémon are matched against. Note Ho-Oh has no Brave Bird here.
const CHAMPIONS_LEARNSETS = {
  venusaur:  { leechseed: ['9M'], sludgebomb: ['9M'], synthesis: ['9M'] },
  charizard: { roost: ['9M'], flamethrower: ['9M'], dragonclaw: ['9M'] },
  blastoise: { surf: ['9M'], roost: ['9M'] },
  hooh:      { sacredfire: ['9L1'], roost: ['9M'] },
  porygon2:  { recover: ['9M'] },
  aegislash: { kingsshield: ['9L1'], shadowball: ['9M'] },
};

/** `raw.githubusercontent.com/…/data/mods/champions/learnsets.ts` */
export const championsLearnsetsTs =
  "export const Learnsets: import('../../../sim/dex-species').ModdedLearnsetDataTable = " +
  JSON.stringify(Object.fromEntries(
    Object.entries(CHAMPIONS_LEARNSETS).map(([id, ls]) => [id, { learnset: ls }]))) + ';\n';

// ── What the fixture should produce ──────────────────────────────────────────

/**
 * Champions mode builds its species list from @smogon/calc rather than the
 * Pokédex, so it shows the mod's roster (minus Aegislash, whose calc entry is
 * under its forme IDs) plus any Mega whose base species is legal.
 */
export const CHAMPIONS_MODE_NAMES = [
  'Venusaur', 'Venusaur-Mega', 'Charizard', 'Charizard-Mega-X',
  'Blastoise', 'Ho-Oh', 'Porygon2',
];

/** Pokédex entries the full-dex list must drop. */
export const EXCLUDED_FROM_ALL = [
  'Syclant',                    // CAP (num < 0)
  'Missingno.',                 // num 0
  'Vivillon-Fancy',             // cosmetic forme
  'Toxtricity-Low-Key-Gmax',    // Gmax
  'Raticate-Alola-Totem',       // Totem
  'Pikachu-Starter',            // Let's Go starter
  'Ogerpon-Teal-Tera',          // Terastallized forme
];

/** Fully-evolved, non-filler Pokémon the full-dex list must include. */
export const INCLUDED_IN_ALL = [
  'Venusaur', 'Venusaur-Mega', 'Charizard', 'Charizard-Mega-X', 'Blastoise',
  'Ho-Oh', 'Aegislash', 'Aegislash-Blade', 'Zeraora', 'Xerneas', 'Entei',
  'Groudon', 'Groudon-Primal', 'Vivillon', 'Toxtricity', 'Toxtricity-Low-Key',
  'Raticate', 'Raticate-Alola', 'Ogerpon',
];

/**
 * Champions-legal Pokémon as the full-dex list sees them: the roster minus
 * unevolved Porygon2, plus the two Aegislash formes, whose legality is
 * inherited from the mod's `aegislash` learnset.
 */
export const CHAMPIONS_LEGAL_IN_ALL_MODE = [
  'Venusaur', 'Venusaur-Mega', 'Charizard', 'Charizard-Mega-X',
  'Blastoise', 'Ho-Oh', 'Aegislash', 'Aegislash-Blade',
];

/** Unevolved Pokémon — present only when "fully evolved only" is off. */
export const NFE_NAMES = ['Pikachu', 'Porygon2'];

export const MEGA_NAMES = ['Venusaur-Mega', 'Charizard-Mega-X', 'Groudon-Primal'];

export const FILLER_TOTAL = FILLER_COUNT;
