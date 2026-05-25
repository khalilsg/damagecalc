#!/usr/bin/env node
/**
 * scripts/update-chaos.js
 *
 * Fetches Smogon chaos JSON for one or more format prefixes, trims each
 * species entry to only the fields needed by the lead selector, and writes
 * the results to public/data/chaos/ so Vite serves them as static assets.
 *
 * The browser fetches them from the same origin (GitHub Pages) at runtime —
 * no CORS issue, unlike fetching from Smogon directly.
 *
 * Usage:
 *   node scripts/update-chaos.js --month 2026-04 --prefix gen9championsvgc2026regmabo3
 *   node scripts/update-chaos.js --month 2026-04   # all known Champions prefixes
 *
 * Run locally once per month when new Smogon stats drop, then commit the
 * updated files in public/data/chaos/.
 *
 * What gets kept per species:
 *   usage     — float (% of teams)
 *   Moves     — top 8 by usage (for offensive checks + leadability signals)
 *   Spreads   — top 5 by usage (nature + EVs for defensive calcs)
 *   Items     — top 5 by usage (damage modifiers)
 *
 * Typical size reduction: ~85% (e.g. 4.5 MB → ~650 KB)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname }            from 'path';
import { fileURLToPath }            from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, '..', 'public', 'data', 'chaos');

const DEFAULT_PREFIXES = [
  'gen9championsvgc2026regmabo3',
  'gen9championsvgc2026regma',
  'gen9championsbssregma',
];

const TOP_MOVES   = 8;
const TOP_SPREADS = 5;
const TOP_ITEMS   = 5;

// ── CLI args ──────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const month  = getArg('--month');
const prefix = getArg('--prefix');

if (!month) {
  console.error('Usage: node scripts/update-chaos.js --month YYYY-MM [--prefix <prefix>]');
  process.exit(1);
}

const prefixes = prefix ? [prefix] : DEFAULT_PREFIXES;

// ── Trim one species entry ────────────────────────────────────────────────────

function topN(obj, n) {
  return Object.fromEntries(
    Object.entries(obj ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
  );
}

function trimEntry(info) {
  return {
    usage:   info.usage   ?? 0,
    Moves:   topN(info.Moves,   TOP_MOVES),
    Spreads: topN(info.Spreads, TOP_SPREADS),
    Items:   topN(info.Items,   TOP_ITEMS),
  };
}

// ── Fetch + trim + write ──────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

for (const p of prefixes) {
  const url = `https://www.smogon.com/stats/${month}/chaos/${p}-0.json`;
  process.stdout.write(`Fetching ${url} ... `);

  let raw;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        console.log(`SKIP (404 — not available for ${month})`);
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    raw = await res.json();
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    continue;
  }

  const rawSize = JSON.stringify(raw).length;

  // Trim each species
  const trimmed = { info: raw.info, data: {} };
  for (const [name, info] of Object.entries(raw.data ?? {})) {
    trimmed.data[name] = trimEntry(info);
  }

  const outJson  = JSON.stringify(trimmed);
  const trimSize = outJson.length;
  const outPath  = join(OUT_DIR, `${p}.json`);
  writeFileSync(outPath, outJson);

  const rawKB  = (rawSize  / 1024).toFixed(0);
  const trimKB = (trimSize / 1024).toFixed(0);
  const pct    = (100 - (trimSize / rawSize * 100)).toFixed(0);
  console.log(`OK  ${rawKB} KB → ${trimKB} KB (${pct}% smaller)`);
}

console.log('\nDone. Commit the updated files in public/data/chaos/.');
