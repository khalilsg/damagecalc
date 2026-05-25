/**
 * src/leadSelector/score.js
 *
 * Lead pair scoring algorithm. See docs/lead-selector.md for full design.
 *
 * Public API:
 *   scoreLeadPairs(yourSets, opponentSpecies, chaosData) → LeadResult[]
 */

import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';
import { resolveSpeciesName } from '../calcEngine.js';
import { getOpponentRep } from './chaos.js';

const gen    = Generations.get(9);
const FIELD  = new Field({ gameType: 'Doubles' });
const EV_SCALE = 252 / 32;   // Champions format: 32 EVs = 252 standard EVs

// ── Constants ─────────────────────────────────────────────────────────────────

// Moves with no meaningful damage output — skip during offensive checks
export const SKIP_MOVES = new Set([
  'Protect', 'Wide Guard', 'Quick Guard', 'Detect', 'Kings Shield',
  'Tailwind', 'Trick Room', 'Helping Hand', 'Follow Me', 'Rage Powder',
  'Parting Shot', 'Taunt', 'Encore', 'After You', 'Fake Out',
  'Thunder Wave', 'Will-O-Wisp', 'Spore', 'Sleep Powder', 'Recover',
  'Roost', 'Heal Pulse', 'Instruct',
]);

// Moves that signal a Pokémon is commonly used as a lead
// Higher weight → more likely to appear turn 1
export const LEAD_SIGNAL_WEIGHTS = {
  'Fake Out':     2.0,
  'Tailwind':     1.5,
  'Trick Room':   1.5,
  'Follow Me':    1.3,
  'Rage Powder':  1.3,
  'Parting Shot': 1.3,
  'U-turn':       1.2,
  'Encore':       1.2,
};

// Scoring weights (must sum to 1.0, ignoring the penalty sign)
export const SCORE_WEIGHTS = {
  offense:      0.40,
  defense:      0.35,
  speed:        0.15,
  hardCounter: -0.10,  // penalty per hard-counter opponent (OHKOs both leads)
};

// ── EV / item helpers ─────────────────────────────────────────────────────────

function scaleEVs(evs) {
  const out = {};
  for (const [k, v] of Object.entries(evs ?? {})) {
    out[k] = Math.min(252, Math.round((v ?? 0) * EV_SCALE));
  }
  return out;
}

function resolveItem(name) {
  if (!name) return undefined;
  return gen.items.get(name.toLowerCase().replace(/[-\s]/g, ''))?.name ?? undefined;
}

// ── Pokemon builders ──────────────────────────────────────────────────────────

function buildYourPokemon(set, resolvedName) {
  return new Pokemon(gen, resolvedName, {
    level:   set.level ?? 50,
    evs:     scaleEVs(set.evs),
    ivs:     set.ivs,
    nature:  set.nature,
    ability: set.ability,
    item:    resolveItem(set.item),
  });
}

function buildOpponentPokemon(rep) {
  return new Pokemon(gen, rep.name, {
    level:  50,
    evs:    scaleEVs(rep.spread.evs),
    nature: rep.spread.nature,
    item:   resolveItem(rep.item),
  });
}

// ── Damage calculation ────────────────────────────────────────────────────────

/**
 * Find the move that deals the highest max damage from attacker → defender.
 * Returns { pct: number (max damage %), moveName: string | null }.
 */
export function bestDamage(attacker, defender, moves) {
  let best = { pct: 0, moveName: null };
  for (const moveName of moves) {
    if (SKIP_MOVES.has(moveName)) continue;
    try {
      const move = new Move(gen, moveName);
      if ((move.bp ?? 0) === 0) continue;
      const result = calculate(gen, attacker, defender, move, FIELD);
      if (result.desc().includes('No damage')) continue;

      const dmg = result.damage;
      const hp  = defender.stats.hp;
      let maxDmg;
      if (Array.isArray(dmg) && Array.isArray(dmg[0])) {
        // Multi-hit (e.g. Dragon Darts, Population Bomb): sum max across hits
        maxDmg = dmg.reduce((sum, hit) => sum + hit[hit.length - 1], 0);
      } else {
        const rolls = Array.isArray(dmg) ? dmg : [dmg];
        maxDmg = rolls[rolls.length - 1];
      }

      const pct = (maxDmg / hp) * 100;
      if (pct > best.pct) best = { pct, moveName };
    } catch { /* skip unrecognized moves */ }
  }
  return best;
}

// ── Scoring primitives ────────────────────────────────────────────────────────

/**
 * Points (0–3) for how threatening a lead pair is against one opponent.
 * Based on the best damage either lead can deal.
 */
export function offensePoints(maxDamageOutPct) {
  if (maxDamageOutPct >= 100) return 3;    // OHKO from at least one lead
  if (maxDamageOutPct >= 50)  return 1.5;  // strong chunk / likely 2HKO
  if (maxDamageOutPct >= 30)  return 0.5;  // meaningful damage
  return 0;
}

/**
 * Points (−2 to +2) for how well a lead pair survives one opponent's best move.
 * Hard counters (both faint) score heavily negative.
 */
export function defensePoints(damageInA, damageInB) {
  const aFaints = damageInA >= 100;
  const bFaints = damageInB >= 100;
  if (!aFaints && !bFaints) return  2;   // both survive
  if (!aFaints || !bFaints) return  1;   // one survives
  return -2;                             // hard counter — both faint
}

/**
 * Leadability weight for an opponent species.
 * Reads their top moves and returns the highest matching signal weight (min 1.0).
 */
export function leadWeight(rep) {
  let w = 1.0;
  for (const move of (rep.moves ?? [])) {
    const signal = LEAD_SIGNAL_WEIGHTS[move];
    if (signal && signal > w) w = signal;
  }
  return w;
}

// ── Combinatorics ─────────────────────────────────────────────────────────────

function pairs(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      result.push([arr[i], arr[j]]);
  return result;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Score all possible lead pairs from your team against the opponent's 6 species.
 *
 * @param {object[]} yourSets        Parsed sets from parseSets()
 * @param {string[]} opponentSpecies 6 species names (already resolved)
 * @param {object}   chaosData       Trimmed chaos JSON from loadChaosData()
 *
 * @returns {LeadResult[]} All 15 lead pairs, sorted best-first.
 *
 * LeadResult shape:
 * {
 *   score:        number,   // 0–100 composite score
 *   monA:         string,   // resolved name of first lead
 *   monB:         string,   // resolved name of second lead
 *   offNorm:      number,   // offense component 0–100
 *   defNorm:      number,   // defense component 0–100
 *   spdNorm:      number,   // speed component 0–100
 *   threats:      string[], // opponent mons that at least one lead threatens (≥50% damage)
 *   hardCounters: string[], // opponent mons that OHKO both leads
 *   backPair:     { monA, monB, covers: string[] }
 * }
 */
export function scoreLeadPairs(yourSets, opponentSpecies, chaosData) {
  // ── Build your Pokémon ───────────────────────────────────────────────────────
  const yourMons = yourSets.map(set => {
    const resolvedName = resolveSpeciesName(set.name);
    const pokemon      = buildYourPokemon(set, resolvedName);
    const moves        = (set.moves ?? []).filter(m => m);
    return { set, resolvedName, pokemon, moves };
  });

  // ── Build opponent reps ──────────────────────────────────────────────────────
  const opponentReps = opponentSpecies.map(name => {
    const rep = getOpponentRep(chaosData, name) ?? {
      name, spread: { nature: 'Serious', evs: {} }, moves: [], item: null, usage: 0,
    };
    return { ...rep, pokemon: buildOpponentPokemon(rep) };
  });

  // Leadability weights, normalized to sum to 1
  const rawWeights  = opponentReps.map(leadWeight);
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
  const normWeights = rawWeights.map(w => w / totalWeight);

  // ── Build matchup matrix ─────────────────────────────────────────────────────
  // matchups[yourMonIdx][oppIdx] = { damageOut, damageIn, youOutspeed }
  const matchups = yourMons.map(({ pokemon, moves }) =>
    opponentReps.map(opp => ({
      damageOut:   bestDamage(pokemon, opp.pokemon, moves).pct,
      damageIn:    bestDamage(opp.pokemon, pokemon, opp.moves).pct,
      youOutspeed: pokemon.stats.spe > opp.pokemon.stats.spe,
    }))
  );

  // ── Score every lead pair ────────────────────────────────────────────────────
  const idxPairs = pairs(yourMons.map((_, i) => i));

  const results = idxPairs.map(([iA, iB]) => {
    let offRaw = 0, defRaw = 0, spdRaw = 0;
    const hardCounters = [];

    for (let o = 0; o < opponentReps.length; o++) {
      const w  = normWeights[o];
      const mA = matchups[iA][o];
      const mB = matchups[iB][o];

      offRaw += offensePoints(Math.max(mA.damageOut, mB.damageOut)) * w;
      defRaw += defensePoints(mA.damageIn, mB.damageIn) * w;
      if (mA.youOutspeed || mB.youOutspeed) spdRaw += w;
      if (mA.damageIn >= 100 && mB.damageIn >= 100) hardCounters.push(opponentReps[o].name);
    }

    // Normalize each component to 0–100
    const offNorm    = (offRaw / 3.0) * 100;            // max raw = 3.0 (all OHKOs)
    const defNorm    = ((defRaw + 2.0) / 4.0) * 100;    // raw range [−2, +2]
    const spdNorm    = spdRaw * 100;                     // raw range [0, 1]
    const hardPenalty = (hardCounters.length / opponentReps.length) * 100;

    const score = Math.max(0, Math.round(
      SCORE_WEIGHTS.offense     * offNorm +
      SCORE_WEIGHTS.defense     * defNorm +
      SCORE_WEIGHTS.speed       * spdNorm +
      SCORE_WEIGHTS.hardCounter * hardPenalty
    ));

    const threats = opponentReps
      .filter((_, o) => Math.max(matchups[iA][o].damageOut, matchups[iB][o].damageOut) >= 50)
      .map(r => r.name);

    return {
      score,
      monA: yourMons[iA].resolvedName,
      monB: yourMons[iB].resolvedName,
      offNorm:  Math.round(offNorm),
      defNorm:  Math.round(defNorm),
      spdNorm:  Math.round(spdNorm),
      threats,
      hardCounters,
      _idxA:    iA,
      _idxB:    iB,
    };
  });

  results.sort((a, b) => b.score - a.score);

  // ── Attach back pair recommendation to each result ───────────────────────────
  return results.map(result => ({
    ...result,
    backPair: recommendBackPair(result, yourMons, matchups, opponentReps),
  }));
}

// ── Back pair selection ───────────────────────────────────────────────────────

/**
 * From the 4 Pokémon not in the lead pair, find the pair that best covers
 * the opponents neither lead can threaten (< 50% damage).
 */
function recommendBackPair(leadResult, yourMons, matchups, opponentReps) {
  const { _idxA, _idxB } = leadResult;
  const backIdxs = yourMons.map((_, i) => i).filter(i => i !== _idxA && i !== _idxB);

  // Not enough back mons to form a pair
  if (backIdxs.length < 2) return null;

  // Identify uncovered threats: opponents where neither lead deals ≥50%
  const uncoveredIdxs = opponentReps
    .map((_, o) => o)
    .filter(o => Math.max(matchups[_idxA][o].damageOut, matchups[_idxB][o].damageOut) < 50);

  // Score back pairs by coverage of uncovered threats
  const backPairsIdxs = pairs(backIdxs);
  let bestPair  = backPairsIdxs[0];
  let bestScore = -Infinity;

  for (const [iA, iB] of backPairsIdxs) {
    let score = 0;
    for (const o of uncoveredIdxs) {
      // Reward threatening the uncovered mon
      score += offensePoints(Math.max(matchups[iA][o].damageOut, matchups[iB][o].damageOut));
      // Bonus: back mon survives the uncovered threat
      if (matchups[iA][o].damageIn < 100) score += 0.5;
      if (matchups[iB][o].damageIn < 100) score += 0.5;
    }
    if (score > bestScore) { bestScore = score; bestPair = [iA, iB]; }
  }

  return {
    monA:   yourMons[bestPair[0]].resolvedName,
    monB:   yourMons[bestPair[1]].resolvedName,
    covers: uncoveredIdxs.map(o => opponentReps[o].name),
  };
}
