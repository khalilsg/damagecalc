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
 *   node scripts/update-chaos.js --month 2026-04   # auto-discover all VGC formats
 *
 * With no --prefix, the script reads the Smogon monthly directory listing and
 * pulls every `gen9championsvgc*-0.json` format it finds (so new regulations are
 * picked up automatically), plus the static non-VGC prefixes below.
 *
 * Exit codes: 0 = at least one file written; 2 = month not published yet or no
 * VGC formats found (the scheduled task uses this to fire a failure notification).
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

// Non-VGC formats we always want. VGC formats are auto-discovered from the
// monthly directory listing so new regulations (regmb, regmc, …) are picked up.
const STATIC_PREFIXES = [
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

// ── Discover VGC formats from the monthly directory listing ───────────────────

async function discoverVgcPrefixes(month) {
  const dirUrl = `https://www.smogon.com/stats/${month}/chaos/`;
  const res = await fetch(dirUrl);
  if (!res.ok) throw new Error(`directory listing ${dirUrl} → HTTP ${res.status}`);
  const html = await res.text();
  const found = [...html.matchAll(/href="(gen9championsvgc[^"]*?)-0\.json"/g)]
    .map((m) => m[1]);
  return [...new Set(found)].sort();
}

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

let prefixes;
if (prefix) {
  prefixes = [prefix];
} else {
  let vgc;
  try {
    vgc = await discoverVgcPrefixes(month);
  } catch (e) {
    console.error(`FAILED to read Smogon stats for ${month}: ${e.message}`);
    console.error('Stats are likely not published yet — retry in a few days.');
    process.exit(2);
  }
  if (vgc.length === 0) {
    console.error(`No gen9championsvgc formats found for ${month} — stats not published yet.`);
    process.exit(2);
  }
  console.log(`Discovered VGC formats for ${month}: ${vgc.join(', ')}\n`);
  prefixes = [...new Set([...vgc, ...STATIC_PREFIXES])];
}

let written = 0;

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
  written++;

  const rawKB  = (rawSize  / 1024).toFixed(0);
  const trimKB = (trimSize / 1024).toFixed(0);
  const pct    = (100 - (trimSize / rawSize * 100)).toFixed(0);
  console.log(`OK  ${rawKB} KB → ${trimKB} KB (${pct}% smaller)`);
}

if (written === 0) {
  console.error(`\nFAILED: no files written for ${month}.`);
  process.exit(2);
}

console.log(`\nDone. Wrote ${written} file(s). Commit the updated files in public/data/chaos/.`);
