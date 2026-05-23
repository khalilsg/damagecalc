/**
 * tests/ev-scaling.test.js
 *
 * Verifies that Champions-format EVs (0–32 cap) are scaled correctly to their
 * standard-equivalent values before being passed to @smogon/calc.
 *
 * Core invariant: 32 Champions EVs must produce the same stat as 252 standard EVs.
 *
 * Run with:  node --test tests/ev-scaling.test.js
 * Run all:   node --test tests/*.test.js
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Pokemon } from '@smogon/calc';
import {
  scaleEVs, makePokemon, runCalc, calcSpeed,
  resolveSpecies, gen,
} from '../pokebench/calc.js';
import {
  getPlayerSpeedScenarios,
  getOpponentSpeedScenarios,
} from '../src/speedCalc.js';

// ── scaleEVs — unit tests ─────────────────────────────────────────────────────

describe('scaleEVs()', () => {
  test('0 Champions EVs → 0 standard EVs', () => {
    assert.equal(scaleEVs({ spa: 0 }).spa, 0);
  });

  test('32 Champions EVs → 252 standard EVs (exact maximum)', () => {
    assert.equal(scaleEVs({ spa: 32 }).spa, 252);
  });

  test('16 Champions EVs → 126 standard EVs (midpoint)', () => {
    assert.equal(scaleEVs({ spa: 16 }).spa, 126);
  });

  test('4 Champions EVs → 32 standard EVs', () => {
    assert.equal(scaleEVs({ spa: 4 }).spa, 32);
  });

  test('2 Champions EVs → 16 standard EVs', () => {
    assert.equal(scaleEVs({ spa: 2 }).spa, 16);
  });

  test('input above 32 still caps at 252', () => {
    assert.equal(scaleEVs({ spa: 64 }).spa, 252);
  });

  test('scales all six stats independently', () => {
    const result = scaleEVs({ hp: 32, atk: 32, def: 32, spa: 32, spd: 32, spe: 32 });
    for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
      assert.equal(result[stat], 252, `${stat} should be 252`);
    }
  });

  test('zero-EV object passes through unchanged', () => {
    assert.deepEqual(scaleEVs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }),
                               { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  });

  test('empty object returns empty object', () => {
    assert.deepEqual(scaleEVs({}), {});
  });

  test('null input returns empty object', () => {
    assert.deepEqual(scaleEVs(null), {});
  });
});

// ── Core invariant ────────────────────────────────────────────────────────────
// 32 Champions EVs must produce the identical stat as 252 standard EVs,
// verified by comparing against @smogon/calc's own Pokemon constructor directly.

describe('Core invariant: 32 Champions EVs = 252 standard EVs', () => {
  const cases = [
    { species: 'Dragapult',    stat: 'spa', nature: 'Modest' },
    { species: 'Dragapult',    stat: 'spe', nature: 'Timid'  },
    { species: 'Blastoise-Mega', stat: 'spa', nature: 'Modest' },
    { species: 'Garchomp',     stat: 'atk', nature: 'Adamant' },
    { species: 'Incineroar',   stat: 'atk', nature: 'Adamant' },
  ];

  for (const { species, stat, nature } of cases) {
    test(`${species} ${nature} 32 Champions ${stat.toUpperCase()} = 252 standard`, () => {
      const evs32    = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, [stat]: 32 };
      const evs252   = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, [stat]: 252 };

      const champions = makePokemon(species, { nature, evs: evs32 });
      const standard  = new Pokemon(gen, species, { level: 50, nature, evs: evs252 });

      assert.equal(
        champions.stats[stat],
        standard.stats[stat],
        `Expected ${champions.stats[stat]} === ${standard.stats[stat]}`
      );
    });
  }
});

// ── makePokemon stat values — hand-verified ───────────────────────────────────
// Formula: floor((floor((2*base + 31 + floor(scaledEV/4)) * 50/100) + 5) * natureMod)

describe('makePokemon() — stat values match hand-calculated results', () => {

  describe('Dragapult (base Spe 142, SpA 93)', () => {
    test('Timid 32 Spe → 213', () => {
      const p = makePokemon('Dragapult', { nature: 'Timid', evs: { spe: 32 } });
      assert.equal(p.stats.spe, 213);
    });

    test('Timid 0 Spe → 178', () => {
      const p = makePokemon('Dragapult', { nature: 'Timid', evs: { spe: 0 } });
      assert.equal(p.stats.spe, 178);
    });

    test('Timid 16 Spe → 195 (midpoint)', () => {
      const p = makePokemon('Dragapult', { nature: 'Timid', evs: { spe: 16 } });
      assert.equal(p.stats.spe, 195);
    });

    test('32 Spe adds 35 speed over 0 Spe (213 − 178)', () => {
      const full = makePokemon('Dragapult', { nature: 'Timid', evs: { spe: 32 } });
      const bare = makePokemon('Dragapult', { nature: 'Timid', evs: { spe:  0 } });
      assert.equal(full.stats.spe - bare.stats.spe, 35);
    });
  });

  describe('Blastoise-Mega (base SpA 135, SpD 115, Spe 78)', () => {
    test('Modest 32 SpA → 205', () => {
      const p = makePokemon('Blastoise-Mega', { nature: 'Modest', evs: { spa: 32 } });
      assert.equal(p.stats.spa, 205);
    });

    test('Modest 0 SpA → 170', () => {
      const p = makePokemon('Blastoise-Mega', { nature: 'Modest', evs: { spa: 0 } });
      assert.equal(p.stats.spa, 170);
    });

    test('Modest 2 SpD → 137', () => {
      const p = makePokemon('Blastoise-Mega', { nature: 'Modest', evs: { spd: 2 } });
      assert.equal(p.stats.spd, 137);
    });

    test('Modest 0 SpD → 135', () => {
      const p = makePokemon('Blastoise-Mega', { nature: 'Modest', evs: { spd: 0 } });
      assert.equal(p.stats.spd, 135);
    });

    test('Neutral 32 Spe → 130', () => {
      const p = makePokemon('Blastoise-Mega', { nature: 'Modest', evs: { spe: 32 } });
      assert.equal(p.stats.spe, 130);
    });
  });

  describe('Garchomp (base Atk 130, Spe 102)', () => {
    test('Adamant 32 Atk → 200', () => {
      const p = makePokemon('Garchomp', { nature: 'Adamant', evs: { atk: 32 } });
      assert.equal(p.stats.atk, 200);
    });

    test('Adamant 0 Atk → 165', () => {
      const p = makePokemon('Garchomp', { nature: 'Adamant', evs: { atk: 0 } });
      assert.equal(p.stats.atk, 165);
    });

    test('Jolly 32 Spe → 169', () => {
      const p = makePokemon('Garchomp', { nature: 'Jolly', evs: { spe: 32 } });
      assert.equal(p.stats.spe, 169);
    });

    test('Serious 0 Spe → 122', () => {
      const p = makePokemon('Garchomp', { nature: 'Serious', evs: { spe: 0 } });
      assert.equal(p.stats.spe, 122);
    });
  });

  describe('EVs increase stats monotonically', () => {
    test('higher Spe EVs always yield higher or equal speed', () => {
      const evValues = [0, 2, 4, 8, 16, 24, 32];
      const speeds = evValues.map(ev =>
        makePokemon('Dragapult', { nature: 'Timid', evs: { spe: ev } }).stats.spe
      );
      for (let i = 1; i < speeds.length; i++) {
        assert.ok(speeds[i] >= speeds[i - 1],
          `Speed at ${evValues[i]} EVs (${speeds[i]}) < speed at ${evValues[i-1]} EVs (${speeds[i-1]})`);
      }
    });

    test('higher SpA EVs always yield higher or equal SpA', () => {
      const evValues = [0, 2, 4, 8, 16, 24, 32];
      const spas = evValues.map(ev =>
        makePokemon('Blastoise-Mega', { nature: 'Modest', evs: { spa: ev } }).stats.spa
      );
      for (let i = 1; i < spas.length; i++) {
        assert.ok(spas[i] >= spas[i - 1],
          `SpA at ${evValues[i]} EVs (${spas[i]}) < SpA at ${evValues[i-1]} EVs (${spas[i-1]})`);
      }
    });
  });
});

// ── calcSpeed (pokebench/calc.js) ─────────────────────────────────────────────

describe('calcSpeed() in pokebench/calc.js', () => {
  test('Dragapult Timid 32 Spe → 213', () => {
    assert.equal(calcSpeed(142, { nature: 'Timid', evs: { spe: 32 } }), 213);
  });

  test('Dragapult Timid 0 Spe → 178', () => {
    assert.equal(calcSpeed(142, { nature: 'Timid', evs: { spe: 0 } }), 178);
  });

  test('Garchomp Jolly 32 Spe → 169', () => {
    assert.equal(calcSpeed(102, { nature: 'Jolly', evs: { spe: 32 } }), 169);
  });

  test('Garchomp Serious 0 Spe → 122', () => {
    assert.equal(calcSpeed(102, { nature: 'Serious', evs: { spe: 0 } }), 122);
  });

  test('matches makePokemon speed stat for same spread', () => {
    const spread = { nature: 'Timid', evs: { spe: 32 } };
    const fromCalcSpeed = calcSpeed(142, spread);
    const fromPokemon   = makePokemon('Dragapult', spread).stats.spe;
    assert.equal(fromCalcSpeed, fromPokemon);
  });
});

// ── src/speedCalc.js — Champions EV scaling ───────────────────────────────────

describe('src/speedCalc.js — getPlayerSpeedScenarios()', () => {
  const set = { nature: 'Timid', evs: { spe: 32 }, ivs: { spe: 31 }, level: 50, boosts: [] };

  test('Dragapult Timid 32 Spe base scenario → 213', () => {
    const { basic } = getPlayerSpeedScenarios(142, set);
    assert.equal(basic[0].speed, 213);
  });

  test('Dragapult Timid 0 Spe base scenario → 178', () => {
    const bareSet = { ...set, evs: { spe: 0 } };
    const { basic } = getPlayerSpeedScenarios(142, bareSet);
    assert.equal(basic[0].speed, 178);
  });

  test('Timid 32 Spe in getPlayerSpeedScenarios matches calcSpeed()', () => {
    const { basic } = getPlayerSpeedScenarios(142, set);
    assert.equal(basic[0].speed, calcSpeed(142, set));
  });
});

describe('src/speedCalc.js — getOpponentSpeedScenarios()', () => {
  test('Dragapult max speed (Jolly 32 Spe) → 213', () => {
    const { basic } = getOpponentSpeedScenarios(142);
    const maxJolly = basic.find(s => s.label === '++');
    assert.equal(maxJolly.speed, 213);
  });

  // Opponent min = Serious nature (no nature boost), 0 EVs — not Timid.
  // Dragapult Serious 0 Spe: floor(floor((284+31+0)*0.5 + 5) * 1.0) = floor(162.5) = 162.
  test('Dragapult min speed (Serious 0 Spe) → 162', () => {
    const { basic } = getOpponentSpeedScenarios(142);
    const minSpeed = basic.find(s => s.label === '');
    assert.equal(minSpeed.speed, 162);
  });

  test('max speed (32 Spe) > neutral max speed (32 Spe neutral) > min speed (0 Spe)', () => {
    const { basic } = getOpponentSpeedScenarios(102); // Garchomp
    const min    = basic.find(s => s.label === '').speed;
    const maxNeu = basic.find(s => s.label === '+').speed;
    const maxPos = basic.find(s => s.label === '++').speed;
    assert.ok(min <= maxNeu, `min (${min}) should be ≤ neutral max (${maxNeu})`);
    assert.ok(maxNeu < maxPos, `neutral max (${maxNeu}) should be < positive max (${maxPos})`);
  });
});

// ── runCalc — damage sanity checks ───────────────────────────────────────────

describe('runCalc() — more EVs means more damage', () => {
  test('Shadow Ball: 32 SpA deals more damage than 0 SpA', () => {
    const target  = makePokemon('Garchomp', { nature: 'Serious', evs: {} });
    const high    = makePokemon('Dragapult', { nature: 'Timid',   evs: { spa: 32 } });
    const low     = makePokemon('Dragapult', { nature: 'Timid',   evs: { spa:  0 } });
    const rHigh   = runCalc(high, target, 'Shadow Ball');
    const rLow    = runCalc(low,  target, 'Shadow Ball');
    assert.ok(rHigh !== null && rLow !== null, 'Both calcs should return results');
    assert.ok(rHigh.maxPct > rLow.maxPct,
      `32 SpA max dmg (${rHigh.maxPct.toFixed(1)}%) should exceed 0 SpA (${rLow.maxPct.toFixed(1)}%)`);
  });

  test('Earthquake: 32 Atk deals more damage than 0 Atk', () => {
    const target  = makePokemon('Incineroar', { nature: 'Serious', evs: {} });
    const high    = makePokemon('Garchomp', { nature: 'Adamant', evs: { atk: 32 } });
    const low     = makePokemon('Garchomp', { nature: 'Adamant', evs: { atk:  0 } });
    const rHigh   = runCalc(high, target, 'Earthquake');
    const rLow    = runCalc(low,  target, 'Earthquake');
    assert.ok(rHigh !== null && rLow !== null, 'Both calcs should return results');
    assert.ok(rHigh.maxPct > rLow.maxPct,
      `32 Atk max dmg (${rHigh.maxPct.toFixed(1)}%) should exceed 0 Atk (${rLow.maxPct.toFixed(1)}%)`);
  });

  test('Choice Specs raises damage vs no item', () => {
    const target   = makePokemon('Garchomp',   { nature: 'Serious', evs: {} });
    const specs    = makePokemon('Dragapult', { nature: 'Timid',   evs: { spa: 32 } }, 'Choice Specs');
    const noItem   = makePokemon('Dragapult', { nature: 'Timid',   evs: { spa: 32 } }, undefined);
    const rSpecs   = runCalc(specs,  target, 'Shadow Ball');
    const rNoItem  = runCalc(noItem, target, 'Shadow Ball');
    assert.ok(rSpecs !== null && rNoItem !== null);
    assert.ok(rSpecs.maxPct > rNoItem.maxPct,
      `Choice Specs (${rSpecs.maxPct.toFixed(1)}%) should deal more than no item (${rNoItem.maxPct.toFixed(1)}%)`);
  });

  test('multi-hit move (Dragon Darts) produces valid non-NaN result', () => {
    const atk = makePokemon('Dragapult', { nature: 'Timid', evs: { spa: 32 } }, 'Choice Specs');
    const def = makePokemon('Garchomp',  { nature: 'Serious', evs: {} });
    const r   = runCalc(atk, def, 'Dragon Darts');
    assert.ok(r !== null, 'Dragon Darts should return a result');
    assert.ok(!isNaN(r.minPct), `minPct should not be NaN, got ${r.minPct}`);
    assert.ok(!isNaN(r.maxPct), `maxPct should not be NaN, got ${r.maxPct}`);
    assert.ok(r.maxPct > r.minPct || r.maxPct === r.minPct,
      `maxPct (${r.maxPct}) should be >= minPct (${r.minPct})`);
  });

  test('immune type returns null (no damage)', () => {
    // Blastoise (Water) vs Water-type move — Water vs Water: not immune
    // Ghost vs Normal: immune
    const atk = makePokemon('Snorlax',   { nature: 'Adamant', evs: { atk: 32 } });
    const def = makePokemon('Dragapult', { nature: 'Timid',   evs: {} }); // Ghost type
    const r   = runCalc(atk, def, 'Body Slam'); // Normal move vs Ghost
    assert.equal(r, null, 'Normal move vs Ghost type should return null');
  });
});
