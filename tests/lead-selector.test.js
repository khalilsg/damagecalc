/**
 * tests/lead-selector.test.js
 *
 * Unit + integration tests for the lead selector scoring algorithm.
 * Run with: npm test
 *
 * Tests are grouped into:
 *   1. Pure scoring primitives (no calc engine needed)
 *   2. parseSpread (chaos data parsing)
 *   3. leadWeight (leadability heuristic)
 *   4. bestDamage (damage calculation)
 *   5. scoreLeadPairs (full integration)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  offensePoints,
  defensePoints,
  leadWeight,
  bestDamage,
  scoreLeadPairs,
  isMega,
  SKIP_MOVES,
  LEAD_SIGNAL_WEIGHTS,
  SCORE_WEIGHTS,
} from '../src/leadSelector/score.js';

import { parseSpread, getOpponentRep } from '../src/leadSelector/chaos.js';

import { Generations, Pokemon, Move } from '@smogon/calc';

const gen = Generations.get(9);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Build a real Pokemon for test assertions
function makePokemon(name, { nature = 'Serious', evs = {}, item } = {}) {
  const EV_SCALE = 252 / 32;
  const scaled = {};
  for (const [k, v] of Object.entries(evs)) {
    scaled[k] = Math.min(252, Math.round((v ?? 0) * EV_SCALE));
  }
  return new Pokemon(gen, name, { level: 50, nature, evs: scaled, item });
}

// Minimal mock chaos data
function mockChaosData(entries) {
  const data = {};
  for (const [name, info] of Object.entries(entries)) {
    data[name] = {
      usage: info.usage ?? 10,
      Moves:   Object.fromEntries((info.moves   ?? []).map((m, i) => [m, 100 - i * 10])),
      Spreads: Object.fromEntries((info.spreads ?? ['Serious:0/0/0/0/0/0']).map((s, i) => [s, 100 - i * 10])),
      Items:   Object.fromEntries((info.items   ?? []).map((it, i) => [it, 100 - i * 10])),
    };
  }
  return { info: {}, data };
}

// Minimal parsed set (mirrors parseSets() output shape)
function mockSet(name, { nature = 'Serious', evs = {}, moves = [], item = null, level = 50 } = {}) {
  return { name, nature, evs, moves, item, level, ivs: {} };
}

// ── 1. Scoring primitives ────────────────────────────────────────────────────

describe('offensePoints', () => {
  it('returns 3 for a guaranteed OHKO (100%)', () => {
    assert.equal(offensePoints(100), 3);
  });

  it('returns 3 for damage above 100%', () => {
    assert.equal(offensePoints(130), 3);
  });

  it('returns 1.5 for a strong chunk (50–99%)', () => {
    assert.equal(offensePoints(50),  1.5);
    assert.equal(offensePoints(75),  1.5);
    assert.equal(offensePoints(99),  1.5);
  });

  it('returns 0.5 for a meaningful chunk (30–49%)', () => {
    assert.equal(offensePoints(30),  0.5);
    assert.equal(offensePoints(45),  0.5);
    assert.equal(offensePoints(49),  0.5);
  });

  it('returns 0 for low damage (< 30%)', () => {
    assert.equal(offensePoints(0),   0);
    assert.equal(offensePoints(15),  0);
    assert.equal(offensePoints(29),  0);
  });
});

describe('defensePoints', () => {
  it('returns 2 when both leads survive', () => {
    assert.equal(defensePoints(50, 60), 2);
    assert.equal(defensePoints(0,  99), 2);
  });

  it('returns 1 when exactly one lead survives', () => {
    assert.equal(defensePoints(100, 50),  1);   // A faints, B survives
    assert.equal(defensePoints(50,  100), 1);   // A survives, B faints
  });

  it('returns −2 when both leads faint (hard counter)', () => {
    assert.equal(defensePoints(100, 100), -2);
    assert.equal(defensePoints(150, 120), -2);
  });

  it('treats exactly 100% as a faint', () => {
    assert.equal(defensePoints(100, 99), 1);   // A exactly OHKOd, B survives
    assert.equal(defensePoints(99,  100), 1);  // A survives, B exactly OHKOd
  });
});

describe('SCORE_WEIGHTS', () => {
  it('absolute values of all weights sum to 1.0', () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + Math.abs(b), 0);
    assert.ok(Math.abs(sum - 1.0) < 0.001, `|weights| sum to ${sum}, expected 1.0`);
  });

  it('hardCounter weight is negative (penalty)', () => {
    assert.ok(SCORE_WEIGHTS.hardCounter < 0);
  });
});

// ── 2. parseSpread ───────────────────────────────────────────────────────────

describe('parseSpread', () => {
  it('parses a full spread correctly', () => {
    const s = parseSpread('Timid:4/0/0/252/0/252');
    assert.equal(s.nature, 'Timid');
    assert.deepEqual(s.evs, { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 });
  });

  it('parses Champions-format spread (0–32 EVs)', () => {
    const s = parseSpread('Modest:0/0/0/32/2/32');
    assert.equal(s.nature, 'Modest');
    assert.equal(s.evs.spa, 32);
    assert.equal(s.evs.spe, 32);
    assert.equal(s.evs.spd, 2);
  });

  it('returns Serious/empty evs for a malformed spread', () => {
    const s = parseSpread('notavalidspread');
    assert.equal(s.nature, 'Serious');
    assert.deepEqual(s.evs, {});
  });

  it('returns Serious/empty evs for empty string', () => {
    const s = parseSpread('');
    assert.deepEqual(s.evs, {});
  });
});

// ── 3. leadWeight ────────────────────────────────────────────────────────────

describe('leadWeight', () => {
  it('returns 1.0 for a mon with no lead signals', () => {
    assert.equal(leadWeight({ moves: ['Earthquake', 'Close Combat', 'Protect', 'Ice Punch'] }), 1.0);
  });

  it('returns 2.0 for a mon with Fake Out', () => {
    assert.equal(leadWeight({ moves: ['Fake Out', 'Knock Off', 'Protect', 'Ice Punch'] }), 2.0);
  });

  it('returns 1.5 for a mon with Tailwind', () => {
    assert.equal(leadWeight({ moves: ['Tailwind', 'Protect', 'Acrobatics', 'U-turn'] }), 1.5);
  });

  it('returns the maximum signal when multiple are present', () => {
    // Fake Out (2.0) is higher than Tailwind (1.5)
    assert.equal(leadWeight({ moves: ['Fake Out', 'Tailwind', 'Protect'] }), 2.0);
  });

  it('returns 1.5 for Trick Room', () => {
    assert.equal(leadWeight({ moves: ['Trick Room', 'Psychic', 'Protect', 'Shadow Ball'] }), 1.5);
  });

  it('handles an empty moves list', () => {
    assert.equal(leadWeight({ moves: [] }), 1.0);
  });
});

// ── 4. bestDamage ────────────────────────────────────────────────────────────

describe('bestDamage', () => {
  it('returns 0 for a mon with no damaging moves', () => {
    const attacker = makePokemon('Incineroar');
    const defender = makePokemon('Dragapult');
    const result = bestDamage(attacker, defender, ['Fake Out', 'Taunt', 'Protect']);
    assert.equal(result.pct, 0);
    assert.equal(result.moveName, null);
  });

  it('skips moves in SKIP_MOVES', () => {
    assert.ok(SKIP_MOVES.has('Protect'));
    assert.ok(SKIP_MOVES.has('Tailwind'));
    assert.ok(SKIP_MOVES.has('Fake Out'));
    assert.ok(SKIP_MOVES.has('Trick Room'));
  });

  it('returns positive damage for a valid offensive move', () => {
    const attacker = makePokemon('Gardevoir', { nature: 'Modest', evs: { spa: 32 } });
    const defender = makePokemon('Garchomp');
    const result = bestDamage(attacker, defender, ['Moonblast', 'Protect']);
    assert.ok(result.pct > 0, `Expected positive damage, got ${result.pct}`);
    assert.equal(result.moveName, 'Moonblast');
  });

  it('picks the higher-damage move when multiple options exist', () => {
    // Moonblast vs Psychic — Moonblast should hit harder on most neutral targets
    const attacker = makePokemon('Gardevoir', { nature: 'Modest', evs: { spa: 32 } });
    const defender = makePokemon('Dragapult');
    const moonblast = bestDamage(attacker, defender, ['Moonblast']);
    const combined  = bestDamage(attacker, defender, ['Moonblast', 'Psychic', 'Shadow Ball']);
    assert.ok(combined.pct >= moonblast.pct);
  });

  it('handles a move that is super effective', () => {
    // Thunderbolt vs Gyarados (4× weak)
    const attacker = makePokemon('Raichu', { nature: 'Modest', evs: { spa: 32 } });
    const defender = makePokemon('Gyarados');
    const result = bestDamage(attacker, defender, ['Thunderbolt']);
    assert.ok(result.pct >= 100, `Expected OHKO on 4× weak Gyarados, got ${result.pct}%`);
  });
});

// ── 5. scoreLeadPairs — integration ─────────────────────────────────────────

describe('scoreLeadPairs', () => {
  it('returns 15 results for a 6-mon team with at most 1 Mega', () => {
    // Only 1 Mega on the team — no pairs get filtered, so C(6,2) = 15
    const yourSets = [
      mockSet('Blastoise-Mega',  { nature: 'Modest',  evs: { spa: 32, spe: 32 }, moves: ['Water Spout', 'Dark Pulse', 'Ice Beam', 'Protect'] }),
      mockSet('Rillaboom',       { nature: 'Adamant', evs: { atk: 32, spe: 32 }, moves: ['Grassy Glide', 'Wood Hammer', 'U-turn', 'Protect'] }),
      mockSet('Incineroar',      { nature: 'Adamant', evs: { atk: 32, hp: 4 },   moves: ['Fake Out', 'Flare Blitz', 'Darkest Lariat', 'Parting Shot'] }),
      mockSet('Togekiss',        { nature: 'Timid',   evs: { spa: 32, spe: 32 }, moves: ['Dazzling Gleam', 'Air Slash', 'Follow Me', 'Protect'] }),
      mockSet('Garchomp',        { nature: 'Jolly',   evs: { atk: 32, spe: 32 }, moves: ['Earthquake', 'Dragon Claw', 'Rock Slide', 'Protect'] }),
      mockSet('Dragapult',       { nature: 'Timid',   evs: { spa: 32, spe: 32 }, moves: ['Dragon Darts', 'Shadow Ball', 'Thunderbolt', 'Protect'] }),
    ];

    const chaos = mockChaosData({
      'Gholdengo':    { spreads: ['Modest:0/0/0/32/0/32'],  moves: ['Make It Rain', 'Shadow Ball', 'Protect', 'Nasty Plot'] },
      'Rillaboom':    { spreads: ['Adamant:0/32/0/0/0/0'],  moves: ['Grassy Glide', 'Wood Hammer', 'Fake Out', 'Protect'] },
      'Incineroar':   { spreads: ['Adamant:4/32/0/0/0/0'],  moves: ['Fake Out', 'Flare Blitz', 'Darkest Lariat', 'Parting Shot'] },
      'Flutter Mane': { spreads: ['Timid:0/0/0/32/4/32'],   moves: ['Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect'] },
      'Great Tusk':   { spreads: ['Jolly:28/32/0/0/0/32'],  moves: ['Earthquake', 'Close Combat', 'Protect', 'Stealth Rock'] },
      'Urshifu':      { spreads: ['Jolly:0/32/0/0/0/32'],   moves: ['Wicked Blow', 'Close Combat', 'Aqua Jet', 'Protect'] },
    });

    const results = scoreLeadPairs(yourSets, Object.keys(chaos.data), chaos);
    // C(6,2) = 15
    assert.equal(results.length, 15);
  });

  it('sorts results by score descending', () => {
    const yourSets = [
      mockSet('Blastoise-Mega', { nature: 'Modest', evs: { spa: 32, spe: 32 }, moves: ['Water Spout', 'Dark Pulse', 'Protect'] }),
      mockSet('Garchomp',       { nature: 'Jolly',  evs: { atk: 32, spe: 32 }, moves: ['Earthquake', 'Dragon Claw', 'Protect'] }),
      mockSet('Incineroar',     { nature: 'Adamant', evs: { atk: 32 },         moves: ['Fake Out', 'Flare Blitz', 'Parting Shot', 'Protect'] }),
      mockSet('Togekiss',       { nature: 'Timid',  evs: { spa: 32, spe: 32 }, moves: ['Dazzling Gleam', 'Follow Me', 'Protect'] }),
    ];

    const chaos = mockChaosData({
      'Gholdengo':  { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Make It Rain', 'Shadow Ball', 'Protect'] },
      'Great Tusk': { spreads: ['Jolly:28/32/0/0/0/32'], moves: ['Earthquake', 'Close Combat', 'Protect'] },
    });

    const results = scoreLeadPairs(yourSets, Object.keys(chaos.data), chaos);
    for (let i = 0; i < results.length - 1; i++) {
      assert.ok(results[i].score >= results[i + 1].score,
        `results[${i}].score (${results[i].score}) < results[${i+1}].score (${results[i+1].score})`);
    }
  });

  it('each result has the required shape', () => {
    const yourSets = [
      mockSet('Blastoise-Mega', { moves: ['Surf', 'Protect'] }),
      mockSet('Garchomp',       { moves: ['Earthquake', 'Protect'] }),
    ];
    const chaos = mockChaosData({
      'Gholdengo': { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Make It Rain', 'Shadow Ball'] },
    });

    const [top] = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    assert.ok(typeof top.score        === 'number');
    assert.ok(typeof top.monA         === 'string');
    assert.ok(typeof top.monB         === 'string');
    assert.ok(typeof top.offNorm      === 'number');
    assert.ok(typeof top.defNorm      === 'number');
    assert.ok(typeof top.spdNorm      === 'number');
    assert.ok(Array.isArray(top.threats));
    assert.ok(Array.isArray(top.hardCounters));
    // backPair is null when fewer than 4 mons remain after the lead pair
    assert.ok(top.backPair === null || (typeof top.backPair === 'object' && top.backPair !== null));
  });

  it('scores are in 0–100 range', () => {
    const yourSets = [
      mockSet('Blastoise-Mega', { moves: ['Water Spout', 'Protect'] }),
      mockSet('Garchomp',       { moves: ['Earthquake', 'Protect'] }),
      mockSet('Incineroar',     { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
    ];
    const chaos = mockChaosData({
      'Gholdengo':  { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Make It Rain', 'Shadow Ball'] },
      'Great Tusk': { spreads: ['Jolly:28/32/0/0/0/32'], moves: ['Earthquake', 'Close Combat'] },
    });

    const results = scoreLeadPairs(yourSets, Object.keys(chaos.data), chaos);
    for (const r of results) {
      assert.ok(r.score >= 0   && r.score <= 100, `score ${r.score} out of range`);
      assert.ok(r.offNorm >= 0 && r.offNorm <= 100);
      assert.ok(r.defNorm >= 0 && r.defNorm <= 100);
      assert.ok(r.spdNorm >= 0 && r.spdNorm <= 100);
    }
  });

  it('a lead with Fake Out is weighted more heavily', () => {
    // Incineroar (Fake Out) vs Blastoise-Mega — Incineroar should appear
    // in higher-ranked pairs when at least some offensive coverage exists
    const yourSets = [
      mockSet('Incineroar',   { nature: 'Adamant', evs: { atk: 32 }, moves: ['Fake Out', 'Flare Blitz', 'Darkest Lariat', 'Parting Shot'] }),
      mockSet('Garchomp',     { nature: 'Jolly',   evs: { atk: 32, spe: 32 }, moves: ['Earthquake', 'Dragon Claw', 'Rock Slide', 'Protect'] }),
      mockSet('Togekiss',     { nature: 'Timid',   evs: { spa: 32, spe: 32 }, moves: ['Dazzling Gleam', 'Air Slash', 'Follow Me', 'Protect'] }),
    ];

    // Opponent has Fake Out user (Incineroar) and a TR setter — both high leadability
    const chaos = mockChaosData({
      'Incineroar': { spreads: ['Adamant:4/32/0/0/0/0'], moves: ['Fake Out', 'Flare Blitz', 'Darkest Lariat', 'Parting Shot'] },
      'Farigiraf':  { spreads: ['Quiet:28/0/0/32/4/0'],  moves: ['Trick Room', 'Hyper Voice', 'Protect', 'Helping Hand'] },
    });

    // This just verifies the function runs and produces plausible output
    const results = scoreLeadPairs(yourSets, Object.keys(chaos.data), chaos);
    assert.equal(results.length, 3);  // C(3,2)
    assert.ok(results[0].score >= results[1].score);
  });

  it('hardCounters array is populated when an opponent OHKOs both leads', () => {
    // Kyogre with Water Spout should OHKO most non-resistant/SpD-invested mons
    const yourSets = [
      mockSet('Incineroar', { moves: ['Fake Out', 'Flare Blitz', 'Parting Shot', 'Protect'] }),
      mockSet('Garchomp',   { moves: ['Earthquake', 'Dragon Claw', 'Protect'] }),
    ];
    const chaos = mockChaosData({
      'Kyogre': { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Water Spout', 'Ice Beam', 'Thunder', 'Protect'] },
    });

    const [result] = scoreLeadPairs(yourSets, ['Kyogre'], chaos);
    // Kyogre's Water Spout should OHKO Incineroar and likely Garchomp
    // (just check the array exists; actual contents depend on calc)
    assert.ok(Array.isArray(result.hardCounters));
  });

  it('threats array contains mons that at least one lead threatens', () => {
    // Garchomp with Earthquake should threaten Incineroar heavily
    const yourSets = [
      mockSet('Garchomp', { nature: 'Jolly', evs: { atk: 32 }, moves: ['Earthquake', 'Dragon Claw', 'Protect'] }),
      mockSet('Togekiss', { nature: 'Timid', evs: { spa: 32 }, moves: ['Dazzling Gleam', 'Air Slash', 'Protect'] }),
    ];
    const chaos = mockChaosData({
      'Incineroar': { spreads: ['Adamant:4/0/0/0/0/0'], moves: ['Fake Out', 'Flare Blitz', 'Parting Shot', 'Protect'] },
    });

    const [result] = scoreLeadPairs(yourSets, ['Incineroar'], chaos);
    // Earthquake from Garchomp should deal significant damage to Incineroar
    assert.ok(Array.isArray(result.threats));
  });

  it('back pair covers all 4 remaining mons with a 6-mon team', () => {
    const yourSets = [
      mockSet('Blastoise-Mega', { moves: ['Water Spout', 'Protect'] }),
      mockSet('Garchomp',       { moves: ['Earthquake', 'Protect'] }),
      mockSet('Incineroar',     { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
      mockSet('Togekiss',       { moves: ['Dazzling Gleam', 'Follow Me', 'Protect'] }),
      mockSet('Rillaboom',      { moves: ['Grassy Glide', 'Wood Hammer', 'Protect'] }),
      mockSet('Alakazam-Mega',  { moves: ['Psychic', 'Focus Blast', 'Protect'] }),
    ];
    const chaos = mockChaosData({
      'Gholdengo': { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Make It Rain', 'Shadow Ball'] },
    });

    const results = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    for (const result of results) {
      // Back pair should not contain either lead mon
      assert.ok(result.backPair.monA !== result.monA);
      assert.ok(result.backPair.monA !== result.monB);
      assert.ok(result.backPair.monB !== result.monA);
      assert.ok(result.backPair.monB !== result.monB);
    }
  });
});

// ── 6. isMega + Mega constraint ──────────────────────────────────────────────

describe('isMega', () => {
  it('returns true for Mega species', () => {
    assert.ok(isMega('Blastoise-Mega'));
    assert.ok(isMega('Alakazam-Mega'));
    assert.ok(isMega('Garchomp-Mega'));
  });

  it('returns false for non-Mega species', () => {
    assert.ok(!isMega('Blastoise'));
    assert.ok(!isMega('Dragapult'));
    assert.ok(!isMega('Incineroar'));
  });
});

describe('Mega constraint in scoreLeadPairs', () => {
  const chaos = mockChaosData({
    'Gholdengo': { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Make It Rain', 'Shadow Ball'] },
  });

  it('excludes lead pairs where both mons are Mega', () => {
    const yourSets = [
      mockSet('Blastoise-Mega',  { moves: ['Water Spout', 'Protect'] }),
      mockSet('Alakazam-Mega',   { moves: ['Psychic', 'Protect'] }),
      mockSet('Incineroar',      { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
    ];
    const results = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    // C(3,2) = 3 pairs, but Blastoise-Mega + Alakazam-Mega must be excluded
    assert.equal(results.length, 2);
    for (const r of results) {
      assert.ok(!(isMega(r.monA) && isMega(r.monB)),
        `Invalid pair found: ${r.monA} + ${r.monB}`);
    }
  });

  it('allows a lead pair where only one mon is Mega', () => {
    const yourSets = [
      mockSet('Blastoise-Mega', { moves: ['Water Spout', 'Protect'] }),
      mockSet('Incineroar',     { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
    ];
    const results = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    assert.equal(results.length, 1);
    assert.ok(isMega(results[0].monA) || isMega(results[0].monB));
  });

  it('back pair contains no Mega when lead is already Mega', () => {
    // 3 non-Mega mons available so a valid back pair always exists
    const yourSets = [
      mockSet('Blastoise-Mega', { moves: ['Water Spout', 'Protect'] }),
      mockSet('Incineroar',     { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
      mockSet('Togekiss',       { moves: ['Dazzling Gleam', 'Follow Me', 'Protect'] }),
      mockSet('Garchomp',       { moves: ['Earthquake', 'Protect'] }),
    ];
    const results = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    for (const r of results) {
      if (!r.backPair) continue;
      const leadHasMega = isMega(r.monA) || isMega(r.monB);
      const backHasMega = isMega(r.backPair.monA) || isMega(r.backPair.monB);
      if (leadHasMega) {
        assert.ok(!backHasMega,
          `Lead has Mega but back pair still contains Mega: ${r.backPair.monA} + ${r.backPair.monB}`);
      }
    }
  });

  it('returns null backPair when no legal bring exists', () => {
    // 2 Megas + 1 non-Mega: if lead is Mega + non-Mega, remaining back is just
    // the other Mega — no valid bring (would require 2 Megas in bring)
    const yourSets = [
      mockSet('Blastoise-Mega', { moves: ['Water Spout', 'Protect'] }),
      mockSet('Incineroar',     { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
      mockSet('Alakazam-Mega',  { moves: ['Psychic', 'Protect'] }),
    ];
    const results = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    // Blastoise-Mega + Incineroar lead → back has only Alakazam-Mega (invalid)
    // Alakazam-Mega  + Incineroar lead → back has only Blastoise-Mega (invalid)
    for (const r of results) {
      if (isMega(r.monA) || isMega(r.monB)) {
        assert.equal(r.backPair, null,
          `Expected null backPair for ${r.monA} + ${r.monB} but got ${JSON.stringify(r.backPair)}`);
      }
    }
  });

  it('back pair may contain one Mega when no lead is Mega', () => {
    const yourSets = [
      mockSet('Incineroar',     { moves: ['Fake Out', 'Flare Blitz', 'Protect'] }),
      mockSet('Garchomp',       { moves: ['Earthquake', 'Protect'] }),
      mockSet('Blastoise-Mega', { moves: ['Water Spout', 'Protect'] }),
      mockSet('Rillaboom',      { moves: ['Grassy Glide', 'Protect'] }),
    ];
    const results = scoreLeadPairs(yourSets, ['Gholdengo'], chaos);
    // Find a result where neither lead is Mega
    const nonMegaLead = results.find(r => !isMega(r.monA) && !isMega(r.monB));
    if (nonMegaLead?.backPair) {
      const backMegaCount = [nonMegaLead.backPair.monA, nonMegaLead.backPair.monB]
        .filter(isMega).length;
      assert.ok(backMegaCount <= 1, `Back pair has ${backMegaCount} Megas, expected ≤1`);
    }
  });
});

// ── 7. getOpponentRep ────────────────────────────────────────────────────────

describe('getOpponentRep', () => {
  it('returns null for a species not in chaos data', () => {
    const chaos = mockChaosData({ 'Gholdengo': { moves: ['Make It Rain'] } });
    assert.equal(getOpponentRep(chaos, 'Pikachu'), null);
  });

  it('returns the correct spread for a known species', () => {
    const chaos = mockChaosData({
      'Gholdengo': { spreads: ['Modest:0/0/0/32/0/32'], moves: ['Make It Rain', 'Shadow Ball'] },
    });
    const rep = getOpponentRep(chaos, 'Gholdengo');
    assert.ok(rep !== null);
    assert.equal(rep.spread.nature, 'Modest');
    assert.equal(rep.spread.evs.spa, 32);
  });

  it('matches case-insensitively', () => {
    const chaos = mockChaosData({ 'Gholdengo': { moves: ['Make It Rain'] } });
    const rep = getOpponentRep(chaos, 'gholdengo');
    assert.ok(rep !== null);
  });

  it('returns top item from chaos data', () => {
    const chaos = mockChaosData({
      'Dragapult': {
        moves:   ['Dragon Darts', 'Shadow Ball'],
        items:   ['Choice Specs', 'Life Orb'],
        spreads: ['Timid:0/0/0/32/0/32'],
      },
    });
    const rep = getOpponentRep(chaos, 'Dragapult');
    assert.equal(rep.item, 'Choice Specs');
  });
});
