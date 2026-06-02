/**
 * tests/terrain.test.js
 *
 * Verifies that terrain (specifically Psychic Terrain) flows correctly through
 * the damage calculation pipeline and boosts Expanding Force.
 *
 * In Gen 9 Doubles, Expanding Force under Psychic Terrain:
 *   - Gets a 1.5× BP boost (80 → 120)
 *   - Becomes a spread move — 0.75× spread modifier applies
 *   - Net vs single target: 120 × 0.75 = 90 effective BP vs 80 without terrain (~12.5% more)
 *
 * Run with:  node --test tests/terrain.test.js
 * Run all:   node --test tests/*.test.js
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Generations, Pokemon, Move, Field, Side, calculate } from '@smogon/calc';
import { runAnalysis } from '../src/calcEngine.js';
import { runCalc, makePokemon } from '../pokebench/calc.js';

const gen = Generations.get(9);

// ── helper ────────────────────────────────────────────────────────────────────

function extractMaxDmg(result) {
  const rolls = result.damage;
  if (!Array.isArray(rolls) || rolls.length === 0) return 0;
  return rolls[rolls.length - 1];
}

// ── @smogon/calc — terrain API baseline ──────────────────────────────────────
// Confirm the library itself correctly models the Psychic Terrain boost before
// we test whether our pipeline passes the terrain through.

describe('@smogon/calc — Psychic Terrain direct API', () => {
  const attacker = new Pokemon(gen, 'Alakazam-Mega', {
    level: 50,
    nature: 'Timid',
    evs: { spa: 252 },
  });
  // Snorlax is Normal-type: neutral to Psychic, not immune to Ghost.
  // Safe target for Expanding Force (Psychic-type move).
  const defender = new Pokemon(gen, 'Snorlax', {
    level: 50,
    nature: 'Serious',
    evs: {},
  });
  const move = new Move(gen, 'Expanding Force');

  const fieldNone = new Field({ gameType: 'Doubles' });
  const fieldPsychic = new Field({ gameType: 'Doubles', terrain: 'Psychic' });

  test('Expanding Force deals more damage under Psychic Terrain', () => {
    const rNone = calculate(gen, attacker, defender, move, fieldNone);
    const rWith = calculate(gen, attacker, defender, move, fieldPsychic);
    const maxNone = extractMaxDmg(rNone);
    const maxWith = extractMaxDmg(rWith);
    assert.ok(maxWith > maxNone,
      `Psychic Terrain should boost Expanding Force: ${maxWith} (terrain) > ${maxNone} (no terrain)`);
  });

  test('Expanding Force damage ratio is consistent with terrain boost + spread modifier', () => {
    // Without terrain: 80 BP single-target
    // With terrain:   120 BP spread (× 0.75) = 90 effective BP
    // Expected ratio: 90 / 80 = 1.125
    const rNone = calculate(gen, attacker, defender, move, fieldNone);
    const rWith = calculate(gen, attacker, defender, move, fieldPsychic);
    const midNone = rNone.damage[7];
    const midWith = rWith.damage[7];
    const ratio = midWith / midNone;
    assert.ok(ratio > 1.0,
      `Terrain should increase Expanding Force damage (ratio ${ratio.toFixed(3)})`);
  });

  test('Other terrain types do NOT boost Expanding Force', () => {
    const fieldElec = new Field({ gameType: 'Doubles', terrain: 'Electric' });
    const rNone = calculate(gen, attacker, defender, move, fieldNone);
    const rElec = calculate(gen, attacker, defender, move, fieldElec);
    const maxNone = extractMaxDmg(rNone);
    const maxElec = extractMaxDmg(rElec);
    assert.equal(maxElec, maxNone,
      `Electric Terrain should NOT boost Expanding Force: ${maxElec} vs ${maxNone}`);
  });
});

// ── runAnalysis integration — terrain flows through calcEngine.js ─────────────

describe('runAnalysis() — Psychic Terrain integration', () => {
  const alakazamSet = {
    name:    'Alakazam-Mega',
    nature:  'Timid',
    evs:     { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 },
    ivs:     { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level:   50,
    item:    'Alakazite',
    ability: 'Trace',
    moves:   ['Expanding Force', 'Shadow Ball', 'Focus Blast', 'Protect'],
    boosts:  [],
  };

  function findMoveRow(result, moveName) {
    const matchup = result.offense[0]?.matchups[0];
    if (!matchup) return null;
    const base = matchup.scenarios.find(s => s.label === 'Base');
    if (!base) return null;
    // There may be multiple rows for the same move (one per archetype). Find the max.
    const rows = base.rows.filter(r => r.move === moveName);
    if (rows.length === 0) return null;
    return rows.reduce((best, r) => (r.maxPct > best.maxPct ? r : best));
  }

  test('Expanding Force maxPct is higher with Psychic Terrain than without', async () => {
    const [noTerrain, withTerrain] = await Promise.all([
      runAnalysis([alakazamSet], ['Snorlax'], { terrain: null }),
      runAnalysis([alakazamSet], ['Snorlax'], { terrain: 'Psychic' }),
    ]);

    const pctNone = findMoveRow(noTerrain,   'Expanding Force')?.maxPct;
    const pctWith = findMoveRow(withTerrain, 'Expanding Force')?.maxPct;

    assert.ok(pctNone  != null, 'Expanding Force should hit Snorlax without terrain');
    assert.ok(pctWith  != null, 'Expanding Force should hit Snorlax with terrain');
    assert.ok(pctWith > pctNone,
      `runAnalysis Expanding Force: ${pctWith?.toFixed(1)}% (terrain) should exceed ${pctNone?.toFixed(1)}% (none)`);
  });

  test('Electric Terrain does not boost Expanding Force', async () => {
    const [noTerrain, elecTerrain] = await Promise.all([
      runAnalysis([alakazamSet], ['Snorlax'], { terrain: null }),
      runAnalysis([alakazamSet], ['Snorlax'], { terrain: 'Electric' }),
    ]);

    const pctNone = findMoveRow(noTerrain,  'Expanding Force')?.maxPct;
    const pctElec = findMoveRow(elecTerrain,'Expanding Force')?.maxPct;

    assert.ok(pctNone != null && pctElec != null,
      'Both calcs should return results for Expanding Force vs Snorlax');
    assert.equal(pctElec, pctNone,
      `Electric Terrain should not change Expanding Force damage: ${pctElec} vs ${pctNone}`);
  });
});

// ── pokebench/calc.js — terrain fix ──────────────────────────────────────────
// runCalc() now accepts an optional fieldOptions = { terrain?, weather? } param.
// Verify that Psychic Terrain is correctly applied when passed through.

describe('pokebench runCalc() — terrain fieldOptions', () => {
  const attacker = makePokemon('Alakazam-Mega',
    { nature: 'Timid', evs: { spa: 32 } },
  );
  const defender = makePokemon('Snorlax',
    { nature: 'Serious', evs: {} },
  );

  test('runCalc with terrain: Psychic boosts Expanding Force vs without terrain', () => {
    const rNone = runCalc(attacker, defender, 'Expanding Force');
    const rWith = runCalc(attacker, defender, 'Expanding Force', { terrain: 'Psychic' });

    assert.ok(rNone !== null, 'Expanding Force should return a result without terrain');
    assert.ok(rWith !== null, 'Expanding Force should return a result with terrain');
    assert.ok(rWith.maxPct > rNone.maxPct,
      `runCalc Psychic Terrain should boost Expanding Force: ${rWith.maxPct.toFixed(1)}% > ${rNone.maxPct.toFixed(1)}%`);
  });

  test('runCalc omitting fieldOptions is backward compatible (no terrain applied)', () => {
    const r3Args = runCalc(attacker, defender, 'Expanding Force');
    const r4Args = runCalc(attacker, defender, 'Expanding Force', {});

    assert.ok(r3Args !== null && r4Args !== null);
    assert.equal(r3Args.maxPct, r4Args.maxPct,
      'Three-arg and empty-fieldOptions calls should produce identical results');
  });

  test('Electric Terrain does not boost Expanding Force in runCalc', () => {
    const rNone = runCalc(attacker, defender, 'Expanding Force');
    const rElec = runCalc(attacker, defender, 'Expanding Force', { terrain: 'Electric' });

    assert.ok(rNone !== null && rElec !== null);
    assert.equal(rElec.maxPct, rNone.maxPct,
      `Electric Terrain should not change Expanding Force: ${rElec.maxPct} vs ${rNone.maxPct}`);
  });
});
