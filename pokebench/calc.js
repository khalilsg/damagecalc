/**
 * pokebench/calc.js
 * Damage calculation wrappers for Champions format.
 *
 * Champions format: EVs are capped at 32 per stat.
 * 32 Champions EVs = 252 standard EVs in terms of final stat contribution.
 * We scale before passing to @smogon/calc, which uses the standard formula floor(ev/4).
 */

import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';

export const gen = Generations.get(9);

// ── EV scaling ────────────────────────────────────────────────────────────────

const EV_SCALE = 252 / 32; // 7.875

/** Convert Champions EVs (0–32) to standard equivalents (0–252). */
export function scaleEVs(evs) {
  const out = {};
  for (const [k, v] of Object.entries(evs ?? {})) {
    out[k] = Math.min(252, Math.round((v ?? 0) * EV_SCALE));
  }
  return out;
}

// ── Name resolution ───────────────────────────────────────────────────────────

const ALIASES = {
  'Tauros-P': 'Tauros-Paldea-Combat',
  'Tauros-B': 'Tauros-Paldea-Blaze',
  'Tauros-A': 'Tauros-Paldea-Aqua',
  'Aegislash': 'Aegislash-Both',
};

export function resolveSpecies(name) {
  const aliased = ALIASES[name] ?? name.replace(/-H$/, '-Hisui').replace(/-G$/, '-Galar');
  const id = aliased.toLowerCase().replace(/[-\s]/g, '');
  return gen.species.get(id)?.name ?? null;
}

export function getSpeciesData(resolvedName) {
  return gen.species.get(resolvedName.toLowerCase().replace(/[-\s]/g, '')) ?? null;
}

export function resolveItem(name) {
  if (!name) return undefined;
  return gen.items.get(name.toLowerCase().replace(/[-\s]/g, ''))?.name ?? undefined;
}

// ── Move helpers ──────────────────────────────────────────────────────────────

export function isMoveUsable(name) {
  try { return (new Move(gen, name).bp ?? 0) > 0; } catch { return false; }
}

export function getMoveCategory(name) {
  try { return new Move(gen, name).category?.toLowerCase() ?? null; } catch { return null; }
}

// ── Pokemon construction ──────────────────────────────────────────────────────

/**
 * Build a Pokemon object from a Champions spread.
 * spread: { nature, evs: { hp, atk, def, spa, spd, spe } }  (Champions EVs)
 */
export function makePokemon(speciesName, spread, item, boosts = {}) {
  const p = new Pokemon(gen, speciesName, {
    level:  50,
    evs:    scaleEVs(spread?.evs ?? {}),
    nature: spread?.nature ?? 'Serious',
    item:   resolveItem(item),
  });
  if (Object.keys(boosts).length > 0) {
    p.boosts = { ...(p.boosts ?? {}), ...boosts };
  }
  return p;
}

// ── Calc ──────────────────────────────────────────────────────────────────────

const DOUBLES_FIELD = new Field({ gameType: 'Doubles' });

/**
 * Run a single damage calculation.
 * Returns { moveName, minPct, maxPct, kochanceText } or null.
 */
export function runCalc(attacker, defender, moveName) {
  try {
    const move = new Move(gen, moveName);
    if ((move.bp ?? 0) === 0) return null;
    const result = calculate(gen, attacker, defender, move, DOUBLES_FIELD);
    if (result.desc().includes('No damage')) return null;

    const dmg = result.damage;
    const hp  = defender.stats.hp;

    let minDmg, maxDmg;
    if (Array.isArray(dmg) && Array.isArray(dmg[0])) {
      // Multi-hit move (e.g. Dragon Darts, Population Bomb): dmg is number[][]
      minDmg = dmg.reduce((sum, hit) => sum + hit[0], 0);
      maxDmg = dmg.reduce((sum, hit) => sum + hit[hit.length - 1], 0);
    } else {
      const rolls = Array.isArray(dmg) ? dmg : [dmg];
      minDmg = rolls[0];
      maxDmg = rolls[rolls.length - 1];
    }

    const minPct = (minDmg / hp) * 100;
    const maxPct = (maxDmg / hp) * 100;
    const ko = result.kochance();

    return { moveName, minPct, maxPct, kochanceText: ko.text ?? '' };
  } catch { return null; }
}

// ── Speed calculation ─────────────────────────────────────────────────────────

const SPEED_MODS = {
  Timid: 1.1, Jolly: 1.1, Hasty: 1.1, Naive: 1.1,
  Brave: 0.9, Relaxed: 0.9, Quiet: 0.9, Sassy: 0.9,
};

/** Calculate speed stat given base speed and a Champions spread. */
export function calcSpeed(baseSpe, spread) {
  const scaledEV = Math.min(252, Math.round((spread?.evs?.spe ?? 0) * EV_SCALE));
  const mod      = SPEED_MODS[spread?.nature] ?? 1.0;
  return Math.floor(Math.floor((2 * baseSpe + 31 + Math.floor(scaledEV / 4)) * 50 / 100 + 5) * mod);
}
