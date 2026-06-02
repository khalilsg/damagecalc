/**
 * pokebench/simulate.js
 * Core simulation modes: offensive check, defensive check, speed audit.
 */

import { makePokemon, runCalc, calcSpeed, isMoveUsable, resolveSpecies, getSpeciesData } from './calc.js';

// Moves that deal no damage — skip in offensive + defensive checks
const SKIP_MOVES = new Set([
  'Protect', 'Wide Guard', 'Quick Guard', 'Tailwind', 'After You',
  'Follow Me', 'Rage Powder', 'Helping Hand', 'Fake Out', 'Parting Shot',
  'Encore', 'Taunt', 'Thunder Wave', 'Will-O-Wisp', 'Toxic', 'Spore',
  'Sleep Powder', 'Swagger', 'Attract', 'Perish Song', 'Heal Pulse',
  'Light Screen', 'Reflect', 'Trick Room', 'Rain Dance', 'Sunny Day',
  'Sandstorm', 'Hail', 'Snowscape', 'Icy Wind', 'Electroweb',
  'Scary Face', 'Memento', 'Healing Wish', 'Super Fang', 'Night Shade',
  'Seismic Toss', 'Dragon Rage',
]);

function isSkipped(moveName) {
  return SKIP_MOVES.has(moveName) || !isMoveUsable(moveName);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run calc vs all (spread × item) combos; return min/max pct across the whole set. */
function calcRangeAcrossSpreads(atkName, atkSpread, atkItem, atkBoosts, defName, defSpreads, defItems, moveName, fieldOptions = {}) {
  const pcts = [];
  for (const spread of defSpreads) {
    for (const item of defItems) {
      const atk = makePokemon(atkName, atkSpread, atkItem, atkBoosts ?? {});
      const def = makePokemon(defName, spread, item);
      const r   = runCalc(atk, def, moveName, fieldOptions);
      if (r) { pcts.push(r.minPct, r.maxPct); }
    }
  }
  return pcts.length ? { minPct: Math.min(...pcts), maxPct: Math.max(...pcts) } : null;
}

/** KO text using the most common spread + item (representative label). */
function reprKoText(atkName, atkSpread, atkItem, atkBoosts, defName, defSpread, defItem, moveName, fieldOptions = {}) {
  const atk = makePokemon(atkName, atkSpread, atkItem, atkBoosts ?? {});
  const def = makePokemon(defName, defSpread, defItem);
  return runCalc(atk, def, moveName, fieldOptions)?.kochanceText ?? '';
}

function fmtPct(n) { return n.toFixed(1); }

// ── Offensive check ───────────────────────────────────────────────────────────

/**
 * For each opponent, for each of the user's moves, compute:
 *   - Damage range vs opponent's top 5 spreads × top 3 items
 *   - Speed comparison
 *
 * Returns [
 *   { opponentName, usagePct, userSpeed, minOppSpd, maxOppSpd, speedTag, moveRows }
 * ]
 * moveRows: [{ moveName, minPct, maxPct, kochanceText }]
 */
export function runOffensiveCheck(userSpec, opponents, fieldOptions = {}) {
  const userSpeciesData = getSpeciesData(userSpec.resolvedName);
  const userSpread = { nature: userSpec.nature, evs: userSpec.evs };
  const userSpeed  = calcSpeed(userSpeciesData?.baseStats?.spe ?? 0, userSpread);

  const results = [];
  for (const opp of opponents) {
    const resolvedOpp = resolveSpecies(opp.name);
    if (!resolvedOpp) continue;
    const oppData = getSpeciesData(resolvedOpp);
    if (!oppData) continue;

    const oppSpreads = opp.spreads.slice(0, 5);
    const oppItems   = getTopItems(opp.items, 3);

    // Speed
    const oppSpeeds  = oppSpreads.map(s => calcSpeed(oppData.baseStats.spe, s));
    const minOppSpd  = oppSpreads.length ? Math.min(...oppSpeeds) : calcSpeed(oppData.baseStats.spe, { nature: 'Serious', evs: { spe: 0 } });
    const maxOppSpd  = oppSpreads.length ? Math.max(...oppSpeeds) : calcSpeed(oppData.baseStats.spe, { nature: 'Jolly',   evs: { spe: 32 } });
    const speedTag   = userSpeed > maxOppSpd ? 'Faster' : userSpeed < minOppSpd ? 'Slower' : 'Mixed';

    const moveRows = [];
    for (const moveName of userSpec.moves) {
      if (isSkipped(moveName)) continue;

      const range = calcRangeAcrossSpreads(
        userSpec.resolvedName, userSpread, userSpec.item, userSpec.boosts,
        resolvedOpp, oppSpreads.length ? oppSpreads : [{ nature: 'Serious', evs: {} }], oppItems, moveName, fieldOptions
      );
      if (!range) continue;

      const koText = oppSpreads.length
        ? reprKoText(userSpec.resolvedName, userSpread, userSpec.item, userSpec.boosts, resolvedOpp, oppSpreads[0], oppItems[0], moveName, fieldOptions)
        : '';

      moveRows.push({ moveName, ...range, kochanceText: koText });
    }

    if (moveRows.length > 0) {
      results.push({ opponentName: resolvedOpp, usagePct: opp.usagePct, userSpeed, minOppSpd, maxOppSpd, speedTag, moveRows });
    }
  }
  return results;
}

// ── Defensive check ───────────────────────────────────────────────────────────

/**
 * For each opponent, for each of their top 10 damaging moves, compute:
 *   - Incoming damage range from opponent's top 5 spreads × top 3 items
 *
 * Returns [
 *   { opponentName, usagePct, moveRows }
 * ]
 * moveRows: [{ moveName, minPct, maxPct, kochanceText, survives }]
 */
export function runDefensiveCheck(userSpec, opponents, fieldOptions = {}) {
  const userSpread = { nature: userSpec.nature, evs: userSpec.evs };
  const results = [];

  for (const opp of opponents) {
    const resolvedOpp = resolveSpecies(opp.name);
    if (!resolvedOpp) continue;

    const oppMoves   = opp.moves.map(m => m.name).filter(m => !isSkipped(m)).slice(0, 10);
    if (oppMoves.length === 0) continue;
    const oppSpreads = opp.spreads.slice(0, 5);
    const oppItems   = getTopItems(opp.items, 3);

    const fallbackSpread = { nature: 'Adamant', evs: {} };
    const effectiveSpreads = oppSpreads.length ? oppSpreads : [fallbackSpread];

    const moveRows = [];
    for (const moveName of oppMoves) {
      // Full range across all opponent spreads × items
      const pcts = [];
      for (const spread of effectiveSpreads) {
        for (const item of oppItems) {
          const atk = makePokemon(resolvedOpp, spread, item);
          const def = makePokemon(userSpec.resolvedName, userSpread, userSpec.item);
          const r   = runCalc(atk, def, moveName, fieldOptions);
          if (r) { pcts.push(r.minPct, r.maxPct); }
        }
      }
      if (pcts.length === 0) continue;

      const minPct = Math.min(...pcts);
      const maxPct = Math.max(...pcts);
      const koText = reprKoText(resolvedOpp, effectiveSpreads[0], oppItems[0], {}, userSpec.resolvedName, userSpread, userSpec.item, moveName, fieldOptions);

      moveRows.push({ moveName, minPct, maxPct, kochanceText: koText, survives: maxPct < 100 });
    }

    if (moveRows.length > 0) {
      results.push({ opponentName: resolvedOpp, usagePct: opp.usagePct, moveRows });
    }
  }
  return results;
}

// ── Speed audit ───────────────────────────────────────────────────────────────

/**
 * Compare user's speed to each opponent's speed range.
 * Returns [{ opponentName, usagePct, userSpeed, minOppSpd, maxOppSpd, result }]
 */
export function runSpeedAudit(userSpec, opponents) {
  const userSpeciesData = getSpeciesData(userSpec.resolvedName);
  const userSpeed = calcSpeed(
    userSpeciesData?.baseStats?.spe ?? 0,
    { nature: userSpec.nature, evs: userSpec.evs }
  );

  return opponents.map(opp => {
    const resolvedOpp = resolveSpecies(opp.name);
    if (!resolvedOpp) return null;
    const oppData = getSpeciesData(resolvedOpp);
    if (!oppData) return null;

    const spreads   = opp.spreads.slice(0, 5);
    const oppSpeeds = spreads.map(s => calcSpeed(oppData.baseStats.spe, s));

    // Fallback if no spreads in chaos data
    const minOppSpd = spreads.length ? Math.min(...oppSpeeds) : calcSpeed(oppData.baseStats.spe, { nature: 'Serious', evs: { spe:  0 } });
    const maxOppSpd = spreads.length ? Math.max(...oppSpeeds) : calcSpeed(oppData.baseStats.spe, { nature: 'Jolly',   evs: { spe: 32 } });

    const result = userSpeed > maxOppSpd ? 'Faster' : userSpeed < minOppSpd ? 'Slower' : 'Mixed';
    return { opponentName: resolvedOpp, usagePct: opp.usagePct, userSpeed, minOppSpd, maxOppSpd, result };
  }).filter(Boolean);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Return top N item names, with undefined as the fallback if the list is empty. */
function getTopItems(itemsList, n) {
  const items = itemsList.slice(0, n).map(i => i.name).filter(Boolean);
  return items.length ? items : [undefined];
}
