import { Generations, Pokemon, Move, Field, Side, calculate } from '@smogon/calc';
import { getPlayerSpeedScenarios, getOpponentSpeedScenarios } from './speedCalc.js';
import { SETDEX_CHAMPIONS } from './champions.js';
import { getTopMoves } from './smogonStats.js';

export const gen = Generations.get(9);

function buildField(weather, defenderOptions = {}, attackerOptions = {}, terrain = null) {
  return new Field({
    gameType: 'Doubles',
    ...(weather ? { weather } : {}),
    ...(terrain ? { terrain } : {}),
    attackerSide: new Side({
      isHelpingHand: attackerOptions.isHelpingHand ?? false,
    }),
    defenderSide: new Side({
      isReflect:     defenderOptions.reflect      ?? false,
      isLightScreen: defenderOptions.lightScreen  ?? false,
      isFriendGuard: defenderOptions.friendGuard  ?? false,
    }),
  });
}

const MOVES_TO_SKIP = new Set([
  'Protect', 'Wide Guard', 'Quick Guard', 'Parting Shot',
  'Taunt', 'Encore', 'Tailwind', 'After You', 'Follow Me', 'Helping Hand',
]);

// Champions format: EVs out of 32 (not 252).
const OFFENSE_ARCHETYPES = [
  { label: 'Max SpAtk',   nature: 'Modest',  evs: { hp: 0, atk: 0,  def: 0, spa: 32, spd: 0, spe: 0 } },
  { label: 'Max Atk',     nature: 'Adamant', evs: { hp: 0, atk: 32, def: 0, spa: 0,  spd: 0, spe: 0 } },
  { label: 'Min Offense', nature: 'Serious', evs: { hp: 0, atk: 0,  def: 0, spa: 0,  spd: 0, spe: 0 } },
];

const DEFENSE_ARCHETYPES = [
  { label: 'Max SpDef',   nature: 'Calm',    evs: { hp: 32, atk: 0, def: 0,  spa: 0, spd: 32, spe: 0 } },
  { label: 'Max Def',     nature: 'Bold',    evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0,  spe: 0 } },
  { label: 'Min Defense', nature: 'Serious', evs: { hp: 0,  atk: 0, def: 0,  spa: 0, spd: 0,  spe: 0 } },
];

const MIN_DEFENSE = DEFENSE_ARCHETYPES[2];
const MIN_OFFENSE = OFFENSE_ARCHETYPES[2];

const STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

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
  let bestName = null, bestDist = Infinity;
  for (const species of gen.species) {
    const dist = editDistance(lower, species.name.toLowerCase());
    if (dist < bestDist) { bestDist = dist; bestName = species.name; }
  }
  if (bestDist > 4) throw new Error(`"${name}" not found and no close match exists.`);
  return bestName;
}

export const allSpecies = [...gen.species].filter(s => !s.nfe).map(s => s.name).sort();

// --- Common moves lookup (live stats → bundled fallback) ---

async function getCommonOffensiveMoves(speciesName) {
  const live = await getTopMoves(speciesName, 3);
  if (live && live.length > 0) return live;
  return getBundledMoves(speciesName);
}

function getBundledMoves(speciesName) {
  const sets = SETDEX_CHAMPIONS[speciesName];
  if (sets) {
    const moves = new Set();
    for (const set of Object.values(sets)) {
      for (const move of (set.moves ?? [])) {
        if (!move) continue;
        try { if (new Move(gen, move).bp > 0) moves.add(move); } catch { /* skip */ }
        if (moves.size >= 3) break;
      }
      if (moves.size >= 3) break;
    }
    if (moves.size > 0) return [...moves];
  }
  return getFallbackMoves(speciesName);
}

function getFallbackMoves(speciesName) {
  const species = gen.species.get(toSpeciesId(speciesName));
  const pool = species && species.baseStats.atk >= species.baseStats.spa
    ? ['Earthquake', 'Close Combat', 'Facade', 'Body Press', 'Knock Off', 'Ice Punch', 'Thunder Punch', 'Fire Punch', 'Iron Head', 'Stone Edge', 'Waterfall', 'Play Rough', 'Moonblast', 'Shadow Ball', 'Energy Ball', 'Ice Beam', 'Thunderbolt', 'Flamethrower', 'Surf', 'Psychic']
    : ['Moonblast', 'Shadow Ball', 'Energy Ball', 'Ice Beam', 'Thunderbolt', 'Flamethrower', 'Surf', 'Psychic', 'Dark Pulse', 'Flash Cannon', 'Draco Meteor', 'Focus Blast', 'Earthquake', 'Close Combat', 'Facade', 'Body Press'];

  const result = [];
  for (const name of pool) {
    if (result.length >= 3) break;
    try { if (new Move(gen, name).bp > 0) result.push(name); } catch { /* skip */ }
  }
  return result;
}

// --- Pokemon constructors ---

function resolveItem(name) {
  if (!name) return undefined;
  const id = name.toLowerCase().replace(/[-\s]/g, '');
  return gen.items.get(id)?.name ?? undefined;
}

// Champions format: 32 EVs produces the same stat as 252 standard EVs.
// Scale before passing to @smogon/calc, which uses the standard EV formula (floor(ev/4)).
function scaleEVs(evs) {
  const SCALE = 252 / 32; // 7.875
  const out = {};
  for (const [k, v] of Object.entries(evs ?? {})) {
    out[k] = Math.min(252, Math.round((v ?? 0) * SCALE));
  }
  return out;
}

function makeAttacker(set, resolvedName, boostOverrides = {}) {
  const p = new Pokemon(gen, resolvedName, {
    level:  set.level,
    evs:    scaleEVs(set.evs),
    ivs:    set.ivs,
    nature: set.nature,
    ability: set.ability,
    item:   resolveItem(set.item),
    ...(set.gender && { gender: set.gender }),
  });
  if (Object.keys(boostOverrides).length > 0) {
    p.boosts = { ...(p.boosts ?? {}), ...boostOverrides };
  }
  return p;
}

function makeArchetypeOpponent(resolvedName, archetype, boostOverrides = {}) {
  const p = new Pokemon(gen, resolvedName, {
    level:  50,
    evs:    scaleEVs(archetype.evs),
    nature: archetype.nature,
  });
  if (Object.keys(boostOverrides).length > 0) {
    p.boosts = { ...(p.boosts ?? {}), ...boostOverrides };
  }
  return p;
}

// --- Damage calc helpers ---

function getMoveCategory(moveName) {
  try { return new Move(gen, moveName).category?.toLowerCase() ?? 'physical'; } catch { return 'physical'; }
}

function classifyKO(kochance) {
  if (!kochance || kochance === 'N/A') return null;
  if (kochance === 'guaranteed OHKO') return 'guaranteed-ohko';
  if (kochance.includes('OHKO')) return 'chance-ohko';
  if (kochance.includes('2HKO')) {
    if (kochance.includes('guaranteed')) return '2hko';
    const m = kochance.match(/([\d.]+)%/);
    if (m && parseFloat(m[1]) > 50) return '2hko';
  }
  return null;
}

function calcResult(attacker, defender, moveName, field) {
  try {
    const move = new Move(gen, moveName);
    const result = calculate(gen, attacker, defender, move, field);
    const desc = result.desc();
    if (desc.includes('No damage')) return null;
    const kochance = result.kochance().text ?? '';
    const parts = desc.split(' -- ');
    const maxHp  = result.defender.maxHP();
    const rolls  = result.damage;
    const minDmg = Array.isArray(rolls) && rolls.length ? rolls[0]                : 0;
    const maxDmg = Array.isArray(rolls) && rolls.length ? rolls[rolls.length - 1] : 0;
    return {
      move: moveName,
      formattedDesc: parts[1] ? `${parts[0]} -- ${parts[1]}` : parts[0],
      formattedBase: parts[0],
      kochanceText: parts[1] ?? kochance,
      classification: classifyKO(kochance),
      minPct: maxHp > 0 ? (minDmg / maxHp) * 100 : 0,
      maxPct: maxHp > 0 ? (maxDmg / maxHp) * 100 : 0,
    };
  } catch {
    return null;
  }
}

// Strip the EV/nature/item prefix before my Pokémon's name in the attacker position.
// Turns "32+ SpA Blastoise Surf vs. ..." into "Blastoise Surf vs. ..."
function stripAttackerName(r, playerName) {
  if (!r || !playerName) return r;
  const strip = s => {
    if (!s) return s;
    const vsIdx = s.indexOf(' vs. ');
    if (vsIdx === -1) return s;
    const attackerPart = s.slice(0, vsIdx);
    const nameIdx = attackerPart.indexOf(playerName);
    if (nameIdx === -1) return s;
    return s.slice(nameIdx);
  };
  return { ...r, formattedDesc: strip(r.formattedDesc), formattedBase: strip(r.formattedBase) };
}

// Strip the EV/nature/item prefix before my Pokémon's name in the defender position.
// Turns "... vs. 32+ SpD Blastoise: ..." into "... vs. Blastoise: ..."
function stripDefenderName(r, playerName) {
  if (!r || !playerName) return r;
  const vsStr = ' vs. ';
  const strip = s => {
    if (!s) return s;
    const vsIdx = s.indexOf(vsStr);
    if (vsIdx === -1) return s;
    const afterVs = s.slice(vsIdx + vsStr.length);
    const nameIdx = afterVs.indexOf(playerName);
    if (nameIdx === -1) return s;
    return s.slice(0, vsIdx + vsStr.length) + s.slice(vsIdx + vsStr.length + nameIdx);
  };
  return { ...r, formattedDesc: strip(r.formattedDesc), formattedBase: strip(r.formattedBase) };
}

// --- Main analysis engine ---

export async function runAnalysis(playerSets, opponentNames, fieldOptions = {}) {
  const {
    weather = null,
    terrain = null,
    myScreens = {},
    opponentScreens = {},
    myFriendGuard = false,
    opponentFriendGuard = false,
    myHelpingHand = {},
  } = fieldOptions;

  // defenseField is shared (I'm always the defender here)
  const defenseField = buildField(
    weather,
    { ...myScreens, friendGuard: myFriendGuard },
    {},
    terrain
  );
  // offenseField is built per-player below (HH is per-Pokémon)

  const offense = [];
  const offenseExpanded = [];
  const defense = [];
  const defenseExpanded = [];
  const speed = [];

  for (const set of playerSets) {
    const playerName = resolveSpeciesName(set.name);
    const playerSpecies = gen.species.get(toSpeciesId(playerName));

    // Build offense field per-player to apply per-Pokémon Helping Hand
    const offenseField = buildField(
      weather,
      { ...opponentScreens, friendGuard: opponentFriendGuard },
      { isHelpingHand: myHelpingHand[playerName] ?? false },
      terrain
    );
    if (!playerSpecies) continue;

    const offenseMoves = set.moves.filter(m => !MOVES_TO_SKIP.has(m));
    const damageBoosts = (set.boosts ?? []).filter(b => {
      const s = b.stat.toLowerCase();
      return s !== 'spe' && s !== 'speed';
    });

    const playerOffense = [];
    const playerOffenseExp = [];
    const playerDefense = [];
    const playerDefenseExp = [];

    for (const opponentName of opponentNames) {
      const resolvedOpp = resolveSpeciesName(opponentName);
      const oppSpecies = gen.species.get(toSpeciesId(resolvedOpp));
      if (!oppSpecies) continue;

      // ===================== OFFENSE =====================
      const offMatchup = { opponentName: resolvedOpp, scenarios: [] };

      const boostScenarios = [{ label: 'Base', boosts: {} }];
      for (const b of damageBoosts) {
        const statKey = { spatk: 'spa', spattack: 'spa', atk: 'atk', attack: 'atk', def: 'def', defense: 'def', spdef: 'spd', spdefense: 'spd' }[b.stat.toLowerCase()] ?? b.stat.toLowerCase();
        boostScenarios.push({ label: `${b.modifier > 0 ? '+' : ''}${b.modifier} ${b.stat}`, boosts: { [statKey]: b.modifier } });
      }

      for (const boostSc of boostScenarios) {
        const attacker = makeAttacker(set, playerName, boostSc.boosts);
        const rows = [];
        for (const moveName of offenseMoves) {
          const cat = getMoveCategory(moveName);
          const archetypes = cat === 'special'
            ? DEFENSE_ARCHETYPES.filter(a => a.label !== 'Max Def')
            : cat === 'physical'
            ? DEFENSE_ARCHETYPES.filter(a => a.label !== 'Max SpDef')
            : DEFENSE_ARCHETYPES;
          for (const arch of archetypes) {
            const defender = makeArchetypeOpponent(resolvedOpp, arch);
            const r = stripAttackerName(calcResult(attacker, defender, moveName, offenseField), playerName);
            if (r) rows.push({ ...r, archetype: arch.label });
          }
        }
        if (rows.length > 0) offMatchup.scenarios.push({ label: boostSc.label, rows });
      }
      playerOffense.push(offMatchup);

      // ===================== OFFENSE EXPANDED =====================
      const offExpMatchup = { opponentName: resolvedOpp, moveCalcs: [] };
      for (const moveName of offenseMoves) {
        const cat = getMoveCategory(moveName);
        if (cat === 'status') continue;
        const atkStat = cat === 'special' ? 'spa' : 'atk';
        const defStat = cat === 'special' ? 'spd' : 'def';
        const grid = {};
        for (const myStage of STAGES) {
          for (const oppStage of STAGES) {
            const attacker = makeAttacker(set, playerName, { [atkStat]: myStage });
            const defender = makeArchetypeOpponent(resolvedOpp, MIN_DEFENSE, { [defStat]: oppStage });
            grid[`${myStage},${oppStage}`] = stripAttackerName(calcResult(attacker, defender, moveName, offenseField), playerName);
          }
        }
        offExpMatchup.moveCalcs.push({ moveName, category: cat, grid });
      }
      playerOffenseExp.push(offExpMatchup);

      // ===================== DEFENSE =====================
      const defMatchup = { opponentName: resolvedOpp, scenarios: [] };
      const commonMoves = await getCommonOffensiveMoves(resolvedOpp);

      for (const moveName of commonMoves) {
        const cat = getMoveCategory(moveName);
        const archetypes = cat === 'special'
          ? OFFENSE_ARCHETYPES.filter(a => a.label !== 'Max Atk')
          : cat === 'physical'
          ? OFFENSE_ARCHETYPES.filter(a => a.label !== 'Max SpAtk')
          : OFFENSE_ARCHETYPES;

        for (const arch of archetypes) {
          const attacker = makeArchetypeOpponent(resolvedOpp, arch);
          for (const boostSc of boostScenarios) {
            const defender = makeAttacker(set, playerName, boostSc.boosts);
            const r = stripDefenderName(calcResult(attacker, defender, moveName, defenseField), playerName);
            if (r) {
              defMatchup.scenarios.push({
                label: boostSc.label,
                rows: [{ ...r, archetype: arch.label }],
              });
            }
          }
        }
      }
      playerDefense.push(defMatchup);

      // ===================== DEFENSE EXPANDED =====================
      const defExpMatchup = { opponentName: resolvedOpp, moveCalcs: [] };

      for (const moveName of commonMoves) {
        const cat = getMoveCategory(moveName);
        if (cat === 'status') continue;
        const atkStat = cat === 'special' ? 'spa' : 'atk';
        const defStat = cat === 'special' ? 'spd' : 'def';
        const grid = {};
        for (const oppStage of STAGES) {
          for (const myStage of STAGES) {
            const attacker = makeArchetypeOpponent(resolvedOpp, MIN_OFFENSE, { [atkStat]: oppStage });
            const defender = makeAttacker(set, playerName, { [defStat]: myStage });
            grid[`${oppStage},${myStage}`] = stripDefenderName(calcResult(attacker, defender, moveName, defenseField), playerName);
          }
        }
        defExpMatchup.moveCalcs.push({ moveName, category: cat, grid });
      }
      playerDefenseExp.push(defExpMatchup);

      // ===================== SPEED =====================
      const { basic: pBasic, full: pFull } = getPlayerSpeedScenarios(playerSpecies.baseStats.spe, set);
      const { basic: oBasic, full: oFull } = getOpponentSpeedScenarios(oppSpecies.baseStats.spe);

      const makeComparisons = (ps, os) => {
        const out = [];
        for (const p of ps) for (const o of os) {
          out.push({ playerLabel: p.label, playerSpeed: p.speed, opponentLabel: o.label, opponentSpeed: o.speed, playerFaster: p.speed > o.speed, tie: p.speed === o.speed });
        }
        return out;
      };

      speed.push({
        playerName,
        opponentName: resolvedOpp,
        basicComparisons: makeComparisons(pBasic, oBasic),
        fullComparisons:  makeComparisons(pFull, oFull),
      });
    }

    offense.push({ playerName, matchups: playerOffense });
    offenseExpanded.push({ playerName, matchups: playerOffenseExp });
    defense.push({ playerName, matchups: playerDefense });
    defenseExpanded.push({ playerName, matchups: playerDefenseExp });
  }

  return { offense, offenseExpanded, defense, defenseExpanded, speed };
}

// Compute how a single opponent move hits each player pokemon (for LIVE badge in defense tab).
// Returns [{ playerName, rows: [{ ...calcResult, archetype }] }]
export async function computeIncomingMove(moveName, opponentName, playerSets, fieldOptions = {}) {
  const resolvedOpp = resolveSpeciesName(opponentName);
  const cat = getMoveCategory(moveName);
  if (cat === 'status') return [];

  const field = buildField(
    fieldOptions.weather ?? null,
    { ...fieldOptions.myScreens ?? {}, friendGuard: fieldOptions.myFriendGuard ?? false },
    {},
    fieldOptions.terrain ?? null
  );

  const archetypes = cat === 'special'
    ? OFFENSE_ARCHETYPES.filter(a => a.label !== 'Max Atk')
    : cat === 'physical'
    ? OFFENSE_ARCHETYPES.filter(a => a.label !== 'Max SpAtk')
    : OFFENSE_ARCHETYPES;

  const results = [];
  for (const set of playerSets) {
    const playerName = resolveSpeciesName(set.name);
    const rows = [];
    for (const arch of archetypes) {
      const attacker = makeArchetypeOpponent(resolvedOpp, arch);
      const defender = makeAttacker(set, playerName);
      const r = stripDefenderName(calcResult(attacker, defender, moveName, field), playerName);
      if (r) rows.push({ ...r, archetype: arch.label });
    }
    if (rows.length > 0) results.push({ playerName, rows });
  }
  return results;
}

// Precompute the 25-cell defense-expanded grid for a tracked move (synchronous).
// Returns { playerName, moveName, category, grid } or null for status moves.
export function computeDefenseExpGrid(moveName, opponentName, playerSet, fieldOptions = {}) {
  const cat = getMoveCategory(moveName);
  if (cat === 'status') return null;

  const resolvedOpp = resolveSpeciesName(opponentName);
  const playerName  = resolveSpeciesName(playerSet.name);
  const atkStat = cat === 'special' ? 'spa' : 'atk';
  const defStat = cat === 'special' ? 'spd' : 'def';
  const field = buildField(
    fieldOptions.weather ?? null,
    { ...fieldOptions.myScreens ?? {}, friendGuard: fieldOptions.myFriendGuard ?? false },
    {},
    fieldOptions.terrain ?? null
  );

  const grid = {};
  for (const oppStage of STAGES) {
    for (const myStage of STAGES) {
      const attacker = makeArchetypeOpponent(resolvedOpp, MIN_OFFENSE, { [atkStat]: oppStage });
      const defender = makeAttacker(playerSet, playerName, { [defStat]: myStage });
      grid[`${oppStage},${myStage}`] = stripDefenderName(calcResult(attacker, defender, moveName, field), playerName);
    }
  }
  return { playerName, moveName, category: cat, grid };
}
