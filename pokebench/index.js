#!/usr/bin/env node
/**
 * pokebench/index.js
 * PokéBench CLI Optimizer — benchmark a Pokémon against Smogon metagame data.
 *
 * Usage:
 *   node pokebench/index.js --mon "Dragapult" --nature "Timid" \
 *     --evs "0/0/0/32/0/32" --month "2026-04" \
 *     --prefix "gen9championsvgc2026regmabo" --top 20
 */

import { Command } from 'commander';
import { fetchChaosData, parseOpponents, getSpecificOpponents, getMonEntry } from './chaos.js';
import { resolveSpecies, isMoveUsable } from './calc.js';
import { runOffensiveCheck, runDefensiveCheck, runSpeedAudit } from './simulate.js';
import { renderOffenseTable, renderDefenseTable, renderSpeedTable, renderHeader } from './render.js';

// ── CLI definition ────────────────────────────────────────────────────────────

const program = new Command();
program
  .name('pb-opt')
  .description('PokéBench CLI — benchmark a Pokémon against Smogon Champions metagame data')
  .requiredOption('--mon <name>',            'Pokémon to benchmark (e.g. "Dragapult")')
  .requiredOption('--month <YYYY-MM>',       'Smogon stats month (e.g. "2026-04")')
  .requiredOption('--prefix <prefix>',       'Format prefix (e.g. "gen9championsvgc2026regmabo")')
  .option('--nature <nature>',               'Nature of the Pokémon',                    'Bashful')
  .option('--evs <HP/Atk/Def/SpA/SpD/Spe>', 'EV spread, Champions format (max 32/stat)', '0/0/0/0/0/0')
  .option('--item <item>',                   'Held item')
  .option('--moves <m1,m2,...>',             'Comma-separated moves (defaults to meta top moves)')
  .option('--top <n>',                       'Number of meta opponents to test against',  '20')
  .option('--opponents <p1,p2,...>',         'Specific Pokémon to check against (overrides --top)')
  .option('--test-items <i1,i2,...>',        'Test multiple items; overrides --item')
  .option('--boosts <+1 SpA,-1 Spe,...>',   'Stat stage boosts (e.g. "+2 SpA")')
  .option('--optimize',                      'Run EV optimization mode')
  .parse(process.argv);

const opts = program.opts();

// ── Input parsing ─────────────────────────────────────────────────────────────

function parseEVs(str) {
  const parts = str.split('/').map(Number);
  if (parts.length !== 6 || parts.some(isNaN)) {
    die(`Invalid --evs "${str}". Expected format: HP/Atk/Def/SpA/SpD/Spe (e.g. 0/0/0/32/0/32)`);
  }
  const [hp, atk, def, spa, spd, spe] = parts;
  for (const [stat, val] of Object.entries({ hp, atk, def, spa, spd, spe })) {
    if (val > 32) die(`EV value ${val} for ${stat} exceeds Champions cap of 32.`);
  }
  return { hp, atk, def, spa, spd, spe };
}

function parseBoosts(str) {
  if (!str) return {};
  const statMap = { Atk: 'atk', Def: 'def', SpA: 'spa', Spa: 'spa', SpD: 'spd', Spd: 'spd', Spe: 'spe', HP: 'hp' };
  const boosts = {};
  for (const part of str.split(',')) {
    const m = part.trim().match(/^([+-]\d+)\s+(\w+)$/);
    if (m) {
      const key = statMap[m[2]] ?? m[2].toLowerCase();
      boosts[key] = parseInt(m[1]);
    }
  }
  return boosts;
}

function die(msg) { console.error(`\nError: ${msg}\n`); process.exit(1); }

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const evs    = parseEVs(opts.evs);
  const boosts = parseBoosts(opts.boosts ?? '');
  const topN   = parseInt(opts.top, 10);

  // Resolve Pokémon name
  const resolvedName = resolveSpecies(opts.mon);
  if (!resolvedName) die(`Pokémon "${opts.mon}" not found. Check spelling.`);

  // Fetch chaos data
  let chaosData;
  try {
    chaosData = await fetchChaosData(opts.month, opts.prefix);
  } catch (e) {
    die(e.message);
  }

  let opponents;
  if (opts.opponents) {
    // Resolve each name; bail on any that @smogon/calc doesn't recognise
    const rawNames = opts.opponents.split(',').map(s => s.trim()).filter(Boolean);
    const resolvedOpponents = rawNames.map(n => {
      const r = resolveSpecies(n);
      if (!r) die(`Opponent "${n}" not found. Check spelling.`);
      return r;
    });
    opponents = getSpecificOpponents(chaosData, resolvedOpponents);
  } else {
    opponents = parseOpponents(chaosData, topN);
  }
  if (opponents.length === 0) die('No opponent data found in the chaos file. Check --prefix and --month.');

  // Resolve user moves: explicit flag → chaos data for this mon → error
  let moves;
  if (opts.moves) {
    moves = opts.moves.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    const monEntry = getMonEntry(chaosData, resolvedName);
    if (monEntry?.Moves) {
      moves = Object.entries(monEntry.Moves)
        .sort((a, b) => b[1] - a[1])
        .map(([m]) => m)
        .filter(m => isMoveUsable(m))
        .slice(0, 4);
    }
    if (!moves || moves.length === 0) {
      die(
        `${resolvedName} is not in the chaos data (or has no usable moves). ` +
        `Specify moves explicitly with --moves "Move1,Move2,Move3,Move4".`
      );
    }
  }

  // Items to test
  const testItems = opts.testItems
    ? opts.testItems.split(',').map(s => s.trim())
    : [opts.item ?? undefined];

  // Print banner
  const evsStr = Object.entries(evs).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k.toUpperCase()}`).join(' / ') || 'No EVs';
  const boostStr = Object.keys(boosts).length ? `\n  Boosts  : ${Object.entries(boosts).map(([k,v]) => `${v>0?'+':''}${v} ${k}`).join(', ')}` : '';
  const movesStr = moves.join(', ');
  const threatsStr = opts.opponents
    ? opponents.map(o => o.name).join(', ')
    : `Top ${topN}`;

  console.log(`
╔══════════════════════════════════════════════════════╗
║  PokéBench CLI Optimizer                             ║
╚══════════════════════════════════════════════════════╝
  Pokémon : ${resolvedName}
  Nature  : ${opts.nature}
  EVs     : ${evsStr}${boostStr}
  Moves   : ${movesStr}
  Format  : ${opts.prefix} (${opts.month})
  Threats : ${threatsStr}
`);

  // Build base user spec (item may be overridden in item loop below)
  const baseSpec = {
    resolvedName,
    nature: opts.nature,
    evs,
    boosts,
    moves,
  };

  // Optimization mode
  if (opts.optimize) {
    const { runOptimize } = await import('./optimize.js');
    await runOptimize({ ...baseSpec, item: opts.item }, opponents);
    return;
  }

  // Standard modes — loop over items
  for (const item of testItems) {
    const userSpec = { ...baseSpec, item };

    if (testItems.length > 1) {
      console.log(`\n${'─'.repeat(54)}`);
      console.log(`  Item: ${item ?? 'None'}`);
      console.log(`${'─'.repeat(54)}\n`);
    }

    renderHeader(`OFFENSIVE CHECK — ${resolvedName}${item ? ` @ ${item}` : ''}`);
    const offenseResults = runOffensiveCheck(userSpec, opponents);
    renderOffenseTable(offenseResults);

    renderHeader(`DEFENSIVE CHECK — ${resolvedName}${item ? ` @ ${item}` : ''}`);
    const defenseResults = runDefensiveCheck(userSpec, opponents);
    renderDefenseTable(defenseResults);

    renderHeader(`SPEED AUDIT — ${resolvedName}`);
    const speedResults = runSpeedAudit(userSpec, opponents);
    renderSpeedTable(speedResults);
  }

  console.log('');
})();
