/**
 * pokebench/optimize.js
 * Optimization mode: iterate EV spreads and report meaningful thresholds.
 *
 * Offensive: All Atk/SpA values 0–32 × {Serious, Adamant/Modest}.
 *   Reports first spread that reaches each KO tier per (opponent, move).
 *
 * Defensive: HP 0–32 × Def/SpD multiples of 4 × {Serious, Bold/Calm}.
 *   Reports first spread that allows survival of each (opponent, move).
 */

import { makePokemon, runCalc, isMoveUsable, resolveSpecies, getSpeciesData } from './calc.js';
import { renderOptimizeSection } from './render.js';

const SKIP_MOVES = new Set([
  'Protect', 'Wide Guard', 'Quick Guard', 'Tailwind', 'After You',
  'Follow Me', 'Rage Powder', 'Helping Hand', 'Fake Out', 'Parting Shot',
  'Encore', 'Taunt', 'Thunder Wave', 'Will-O-Wisp', 'Toxic', 'Spore',
  'Sleep Powder', 'Swagger', 'Attract', 'Perish Song', 'Heal Pulse',
  'Light Screen', 'Reflect', 'Trick Room', 'Rain Dance', 'Sunny Day',
  'Sandstorm', 'Hail', 'Snowscape', 'Icy Wind', 'Electroweb',
  'Scary Face', 'Memento', 'Healing Wish',
]);

const KO_ORDER = ['none', '2hit-range', 'chance-2HKO', '2HKO', 'chance-OHKO', 'OHKO'];

function koStatus(r) {
  if (!r) return 'none';
  const t = r.kochanceText;
  if (t.includes('guaranteed OHKO')) return 'OHKO';
  if (t.includes('OHKO'))            return 'chance-OHKO';
  if (t.includes('guaranteed 2HKO') || (t.includes('2HKO') && r.maxPct >= 50)) return '2HKO';
  if (t.includes('2HKO'))            return 'chance-2HKO';
  if (r.maxPct >= 50)                return '2hit-range';
  return 'none';
}

function isBetterKO(prev, curr) {
  return KO_ORDER.indexOf(curr) > KO_ORDER.indexOf(prev);
}

function koLabel(status) {
  return { 'OHKO': 'Guaranteed OHKO', 'chance-OHKO': 'Chance OHKO', '2HKO': 'Guaranteed 2HKO', 'chance-2HKO': 'Chance 2HKO', '2hit-range': '2-hit range', none: '' }[status] ?? status;
}

function getTopItems(itemsList, n) {
  const items = itemsList.slice(0, n).map(i => i.name).filter(Boolean);
  return items.length ? items : [undefined];
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runOptimize(userSpec, opponents) {
  const userSpeciesData = getSpeciesData(userSpec.resolvedName);
  if (!userSpeciesData) { console.error(`Species not found: ${userSpec.resolvedName}`); return; }

  const hasAtk = (userSpec.evs.atk ?? 0) > 0;
  const isSpecial = (userSpec.evs.spa ?? 0) > 0 || userSpeciesData.baseStats.spa >= userSpeciesData.baseStats.atk;

  // ── Offensive optimization ──
  const offNatures = isSpecial ? ['Serious', 'Modest'] : ['Serious', 'Adamant'];
  const offStat    = isSpecial ? 'spa' : 'atk';

  console.log(`\n═══ OPTIMIZATION: OFFENSE (${offStat.toUpperCase()} 0–32) ═══\n`);
  const offThresholds = findOffensiveThresholds(userSpec, opponents, offStat, offNatures);
  if (offThresholds.length === 0) {
    console.log('  No new KO thresholds found across tested spreads.\n');
  } else {
    renderOptimizeSection(offThresholds, ['Investment', 'Opponent', 'Move', 'Damage', 'KO tier']);
  }

  // ── Defensive optimization ──
  console.log('\n═══ OPTIMIZATION: DEFENSE (HP 0–32, Def/SpD multiples of 4) ═══\n');
  const defThresholds = findDefensiveThresholds(userSpec, opponents);
  if (defThresholds.length === 0) {
    console.log('  No new survival thresholds found across tested spreads.\n');
  } else {
    renderOptimizeSection(defThresholds, ['Investment', 'Opponent', 'Their Move', 'Incoming', 'Survives']);
  }
}

// ── Offensive thresholds ──────────────────────────────────────────────────────

function findOffensiveThresholds(userSpec, opponents, offStat, natures) {
  const thresholds = [];

  for (const nature of natures) {
    // Per (opponent, move): track highest KO tier seen so far
    const bestSeen = new Map();

    for (let ev = 0; ev <= 32; ev++) {
      const spread = {
        nature,
        evs: { ...userSpec.evs, atk: offStat === 'atk' ? ev : 0, spa: offStat === 'spa' ? ev : 0 },
      };

      for (const opp of opponents) {
        const resolvedOpp = resolveSpecies(opp.name);
        if (!resolvedOpp) continue;

        const oppSpreads = opp.spreads.slice(0, 5);
        const oppItems   = getTopItems(opp.items, 3);
        const repSpread  = oppSpreads[0] ?? { nature: 'Serious', evs: {} };
        const repItem    = oppItems[0];

        for (const moveName of userSpec.moves) {
          if (SKIP_MOVES.has(moveName) || !isMoveUsable(moveName)) continue;

          const atk = makePokemon(userSpec.resolvedName, spread, userSpec.item);
          const def = makePokemon(resolvedOpp, repSpread, repItem);
          const r   = runCalc(atk, def, moveName);
          const tier = koStatus(r);

          const key  = `${nature}|${resolvedOpp}|${moveName}`;
          const prev = bestSeen.get(key) ?? 'none';

          if (isBetterKO(prev, tier)) {
            bestSeen.set(key, tier);
            thresholds.push({
              investment: `${nature} ${ev} ${offStat.toUpperCase()}`,
              opponent:   resolvedOpp,
              move:       moveName,
              damage:     r ? `${r.minPct.toFixed(1)}–${r.maxPct.toFixed(1)}%` : '—',
              koTier:     koLabel(tier),
            });
          } else {
            bestSeen.set(key, prev === 'none' ? tier : prev);
          }
        }
      }
    }
  }

  return thresholds;
}

// ── Defensive thresholds ──────────────────────────────────────────────────────

function findDefensiveThresholds(userSpec, opponents) {
  const thresholds = [];

  // Physical defense: Bold / Serious, iterate HP + Def
  // Special defense: Calm  / Serious, iterate HP + SpD
  const sides = [
    { label: 'Physical', natures: ['Serious', 'Bold'],   defStat: 'def',  atkStatCategory: 'physical' },
    { label: 'Special',  natures: ['Serious', 'Calm'],   defStat: 'spd',  atkStatCategory: 'special'  },
  ];

  process.stderr.write('Running defensive optimization (may take a moment)...\n');

  for (const { label, natures, defStat } of sides) {
    for (const nature of natures) {
      // Per (opponent, move): did we already survive this?
      const survived = new Set();

      for (let hp = 0; hp <= 32; hp++) {
        for (let defEV = 0; defEV <= 32; defEV += 4) {
          const spread = {
            nature,
            evs: { hp, atk: 0, def: defStat === 'def' ? defEV : 0, spa: 0, spd: defStat === 'spd' ? defEV : 0, spe: 0 },
          };

          for (const opp of opponents) {
            const resolvedOpp = resolveSpecies(opp.name);
            if (!resolvedOpp) continue;

            const oppMoves   = opp.moves.map(m => m.name).filter(m => !SKIP_MOVES.has(m) && isMoveUsable(m)).slice(0, 10);
            const oppSpreads = opp.spreads.slice(0, 5);
            const oppItems   = getTopItems(opp.items, 3);
            const repSpread  = oppSpreads[0] ?? { nature: 'Adamant', evs: {} };
            const repItem    = oppItems[0];

            for (const moveName of oppMoves) {
              const survKey = `${label}|${nature}|${resolvedOpp}|${moveName}`;
              if (survived.has(survKey)) continue; // Already found the threshold

              const atk = makePokemon(resolvedOpp, repSpread, repItem);
              const def = makePokemon(userSpec.resolvedName, spread, userSpec.item);
              const r   = runCalc(atk, def, moveName);
              if (!r) continue;

              if (r.maxPct < 100) {
                // First time surviving — record the threshold
                survived.add(survKey);
                thresholds.push({
                  investment: `${label} · ${nature} HP ${hp} / ${defStat.toUpperCase()} ${defEV}`,
                  opponent:   resolvedOpp,
                  move:       moveName,
                  incoming:   `${r.minPct.toFixed(1)}–${r.maxPct.toFixed(1)}%`,
                  survives:   '✓',
                });
              }
            }
          }
        }
      }
    }
  }

  return thresholds;
}
