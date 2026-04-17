/**
 * Phase 2 & 3: Calculation planner and executor.
 * Builds a plan of all calcs to run, then executes them.
 */

import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';
import { getSpeedScenarios, getOpponentSpeedScenarios } from './speedCalc.js';
import { SETDEX_CHAMPIONS } from './champions.js';

export const gen = Generations.get(9);
export const field = new Field({ gameType: 'Doubles' });

const MOVES_TO_SKIP = ['Protect', 'Wide Guard', 'Quick Guard', 'Parting Shot', 'Taunt', 'Encore', 'Tailwind'];

const OFFENSE_ARCHETYPES = [
  { label: 'Max SpAtk',   nature: 'Modest',  evs: { hp: 0, atk: 0,   def: 0, spa: 252, spd: 0, spe: 0 } },
  { label: 'Max Atk',     nature: 'Adamant', evs: { hp: 0, atk: 252, def: 0, spa: 0,   spd: 0, spe: 0 } },
  { label: 'Min Offense', nature: 'Serious', evs: { hp: 0, atk: 0,   def: 0, spa: 0,   spd: 0, spe: 0 } },
];

const DEFENSE_ARCHETYPES = [
  { label: 'Max SpDef',   nature: 'Calm',    evs: { hp: 252, atk: 0, def: 0,   spa: 0, spd: 252, spe: 0 } },
  { label: 'Max Def',     nature: 'Bold',    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0,   spe: 0 } },
  { label: 'Min Defense', nature: 'Serious', evs: { hp: 0,   atk: 0, def: 0,   spa: 0, spd: 0,   spe: 0 } },
];

// --- Name resolution ---

function toSpeciesId(name) {
  return name.toLowerCase().replace(/[-\s]/g, '');
}

function applyNameAliases(name) {
  const aliases = {
    'Tauros-P': 'Tauros-Paldea-Combat',
    'Tauros-B': 'Tauros-Paldea-Blaze',
    'Tauros-A': 'Tauros-Paldea-Aqua',
    'Aegislash': 'Aegislash-Both',
  };
  if (aliases[name]) return aliases[name];
  return name.replace(/-H$/, '-Hisui').replace(/-G$/, '-Galar');
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}

export function resolveSpeciesName(name) {
  const aliased = applyNameAliases(name);
  const exact = gen.species.get(toSpeciesId(aliased));
  if (exact) return exact.name;

  const lower = aliased.toLowerCase();
  let bestName = null;
  let bestDist = Infinity;
  for (const species of gen.species) {
    const dist = editDistance(lower, species.name.toLowerCase());
    if (dist < bestDist) { bestDist = dist; bestName = species.name; }
  }
  if (bestDist > 4) throw new Error(`"${name}" not found and no close match exists.`);
  return bestName;
}

export const allSpecies = [...gen.species].filter(s => !s.nfe).map(s => s.name).sort();

// --- Common moves lookup ---

function getCommonOffensiveMoves(speciesName) {
  const sets = SETDEX_CHAMPIONS[speciesName];
  if (!sets) return getFallbackMoves(speciesName);

  const moves = new Set();
  for (const set of Object.values(sets)) {
    for (const move of (set.moves ?? [])) {
      if (!move) continue;
      try {
        const m = new Move(gen, move);
        if (m.bp > 0) moves.add(move);
      } catch { /* skip */ }
      if (moves.size >= 4) break;
    }
    if (moves.size >= 4) break;
  }

  return moves.size > 0 ? [...moves] : getFallbackMoves(speciesName);
}

function getFallbackMoves(speciesName) {
  const species = gen.species.get(toSpeciesId(speciesName));
  const commonPhysical = [
    'Earthquake', 'Close Combat', 'Facade', 'Body Press',
    'Knock Off', 'Ice Punch', 'Thunder Punch', 'Fire Punch',
    'Iron Head', 'Stone Edge', 'Waterfall', 'Play Rough',
  ];
  const commonSpecial = [
    'Moonblast', 'Shadow Ball', 'Energy Ball', 'Ice Beam',
    'Thunderbolt', 'Flamethrower', 'Surf', 'Psychic',
    'Dark Pulse', 'Flash Cannon', 'Draco Meteor', 'Focus Blast',
  ];

  const pool = species && species.baseStats.atk >= species.baseStats.spa
    ? [...commonPhysical, ...commonSpecial]
    : [...commonSpecial, ...commonPhysical];

  const result = [];
  for (const moveName of pool) {
    if (result.length >= 4) break;
    try {
      const m = new Move(gen, moveName);
      if (m.bp > 0) result.push(moveName);
    } catch { /* skip */ }
  }
  return result;
}

// --- Pokemon constructors ---

function makeAttacker(set, resolvedName, boostOverrides = {}) {
  const pokemon = new Pokemon(gen, resolvedName, {
    level: set.level,
    evs: set.evs,
    ivs: set.ivs,
    nature: set.nature,
    ability: set.ability,
    item: set.item,
    ...(set.gender && { gender: set.gender }),
  });
  for (const [stat, stages] of Object.entries(boostOverrides)) {
    pokemon.boosts = { ...(pokemon.boosts ?? {}), [stat]: stages };
  }
  return pokemon;
}

function makeOpponent(resolvedName, archetype) {
  return new Pokemon(gen, resolvedName, {
    level: 50,
    evs: archetype.evs,
    nature: archetype.nature,
  });
}

// --- Damage calc helpers ---

function classifyKochance(kochance) {
  if (!kochance || kochance === 'N/A') return null;
  if (kochance === 'guaranteed OHKO') return 'guaranteed-ohko';
  if (kochance.includes('OHKO')) return 'chance-ohko';
  if (kochance.includes('2HKO')) {
    if (kochance.includes('guaranteed')) return '2hko';
    const match = kochance.match(/([\d.]+)%/);
    if (match && parseFloat(match[1]) > 50) return '2hko';
  }
  return null;
}

function formatDesc(desc, opponentName, archetypeLabel) {
  let out = desc.replace(/^[\d+\s]*(Atk|SpA)\s+/, '');
  const escapedName = opponentName.replace(/[-]/g, '\\-');
  out = out.replace(
    new RegExp(`[\\d\\s/+A-Za-z]*(?:Def|SpD)\\s+${escapedName}`),
    `${opponentName} (${archetypeLabel})`
  );
  return out;
}

function runDamageCalc(attacker, opponent, moveName, opponentName, archetypeLabel) {
  try {
    const move = new Move(gen, moveName);
    const result = calculate(gen, attacker, opponent, move, field);
    const desc = result.desc();
    const kochance = result.kochance().text ?? '';
    if (desc.includes('No damage')) return null;

    const parts = desc.split(' -- ');
    const formattedBase = formatDesc(parts[0], opponentName, archetypeLabel);
    const kochanceText = parts[1] ?? kochance;

    return {
      move: moveName,
      formattedDesc: kochanceText ? `${formattedBase} -- ${kochanceText}` : formattedBase,
      formattedBase,
      kochanceText,
      classification: classifyKochance(kochance),
      archetype: archetypeLabel,
    };
  } catch {
    return null;
  }
}

function getMoveCategory(moveName) {
  try {
    const move = new Move(gen, moveName);
    return move.category?.toLowerCase() ?? 'physical';
  } catch {
    return 'physical';
  }
}

// --- Main engine ---

export function runAnalysis(playerSets, opponentNames) {
  const offense = [];
  const defense = [];
  const speed = [];

  for (const set of playerSets) {
    const playerName = resolveSpeciesName(set.name);
    const playerSpecies = gen.species.get(toSpeciesId(playerName));

    if (!playerSpecies) {
      console.warn('Species not found, skipping:', playerName);
      continue;
    }

    const offenseMoves = set.moves.filter(m => !MOVES_TO_SKIP.includes(m));

    // Build all boost scenarios
    const boostScenarios = [{ label: 'Base', boosts: {}, isSpeBoost: false }];
    for (const boost of (set.boosts ?? [])) {
      const statKey = boost.stat.toLowerCase() === 'spatk' ? 'spa'
        : boost.stat.toLowerCase() === 'atk' ? 'atk'
        : boost.stat.toLowerCase() === 'def' ? 'def'
        : boost.stat.toLowerCase() === 'spdef' ? 'spd'
        : boost.stat.toLowerCase();
      boostScenarios.push({
        label: `${boost.modifier > 0 ? '+' : ''}${boost.modifier} ${boost.stat}`,
        boosts: { [statKey]: boost.modifier },
        isSpeBoost: statKey === 'spe',
      });
    }

    // Speed boosts only affect the speed ladder, not damage calcs
    const damageBoostScenarios = boostScenarios.filter(s => !s.isSpeBoost);

    const playerOffenseResults = [];
    const playerDefenseResults = [];

    for (const opponentName of opponentNames) {
      const resolvedOpponentName = resolveSpeciesName(opponentName);
      const opponentSpecies = gen.species.get(toSpeciesId(resolvedOpponentName));

      if (!opponentSpecies) {
        console.warn('Opponent species not found, skipping:', resolvedOpponentName);
        continue;
      }

      // --- OFFENSE ---
      const offenseMatchup = { opponentName: resolvedOpponentName, scenarios: [] };

      for (const boostScenario of damageBoostScenarios) {
        const attacker = makeAttacker(set, playerName, boostScenario.boosts);
        const scenarioRows = [];

        for (const moveName of offenseMoves) {
          const moveType = getMoveCategory(moveName);
          const archetypes = moveType === 'special'
            ? DEFENSE_ARCHETYPES.filter(a => a.label !== 'Max Def')
            : moveType === 'physical'
            ? DEFENSE_ARCHETYPES.filter(a => a.label !== 'Max SpDef')
            : DEFENSE_ARCHETYPES;

          for (const archetype of archetypes) {
            const opponent = makeOpponent(resolvedOpponentName, archetype);
            const result = runDamageCalc(attacker, opponent, moveName, resolvedOpponentName, archetype.label);
            if (result) scenarioRows.push(result);
          }
        }

        if (scenarioRows.length > 0) {
          offenseMatchup.scenarios.push({ label: boostScenario.label, rows: scenarioRows });
        }
      }

      playerOffenseResults.push(offenseMatchup);

      // --- DEFENSE ---
      const defenseMatchup = { opponentName: resolvedOpponentName, scenarios: [] };
      const commonMoves = getCommonOffensiveMoves(resolvedOpponentName);

      for (const moveName of commonMoves) {
        const moveType = getMoveCategory(moveName);
        const archetypes = moveType === 'special'
          ? OFFENSE_ARCHETYPES.filter(a => a.label !== 'Max Atk')
          : moveType === 'physical'
          ? OFFENSE_ARCHETYPES.filter(a => a.label !== 'Max SpAtk')
          : OFFENSE_ARCHETYPES;

        for (const archetype of archetypes) {
          const attacker = makeOpponent(resolvedOpponentName, archetype);

          for (const boostScenario of damageBoostScenarios) {
            const defender = makeAttacker(set, playerName, boostScenario.boosts);
            const result = runDamageCalc(attacker, defender, moveName, playerName, archetype.label);
            if (result) {
              defenseMatchup.scenarios.push({
                label: boostScenario.label,
                rows: [{ ...result, move: moveName }],
              });
            }
          }
        }
      }

      playerDefenseResults.push(defenseMatchup);

      // --- SPEED ---
      const playerSpeedScenarios = getSpeedScenarios(playerSpecies.baseStats.spe, set);
      const opponentSpeedScenarios = getOpponentSpeedScenarios(opponentSpecies.baseStats.spe);

      const speedComparisons = [];
      for (const ps of playerSpeedScenarios) {
        for (const os of opponentSpeedScenarios) {
          speedComparisons.push({
            playerLabel: ps.label,
            playerSpeed: ps.speed,
            opponentLabel: os.label,
            opponentSpeed: os.speed,
            playerFaster: ps.speed > os.speed,
            tie: ps.speed === os.speed,
          });
        }
      }

      speed.push({
        playerName,
        opponentName: resolvedOpponentName,
        comparisons: speedComparisons,
      });
    }

    offense.push({ playerName, matchups: playerOffenseResults });
    defense.push({ playerName, matchups: playerDefenseResults });
  }

  return { offense, defense, speed };
}
