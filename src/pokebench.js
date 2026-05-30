/**
 * src/pokebench.js
 * Browser entry point for the PokéBench UI.
 *
 * Wraps pokebench/simulate.js (browser-safe) with bundled chaos data
 * instead of live Smogon fetches (which are CORS-blocked).
 */

import { runOffensiveCheck, runDefensiveCheck, runSpeedAudit } from '../pokebench/simulate.js';
import { resolveSpecies, isMoveUsable } from '../pokebench/calc.js';
import { loadChaosData, KNOWN_FORMATS } from './leadSelector/chaos.js';
import { allSpecies } from './calcEngine.js';
import { parseSets } from './parser.js';

// ── Browser-safe chaos parsers (no process.stderr) ──────────────────────────

function parseSpread(str) {
  try {
    const colon = str.indexOf(':');
    if (colon === -1) return null;
    const nature = str.slice(0, colon).trim();
    const parts  = str.slice(colon + 1).split('/').map(Number);
    if (parts.length !== 6 || parts.some(isNaN)) return null;
    const [hp, atk, def, spa, spd, spe] = parts;
    return { nature, evs: { hp, atk, def, spa, spd, spe } };
  } catch { return null; }
}

function sortDesc(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function parseOpponents(chaosData, topN) {
  return Object.entries(chaosData.data)
    .map(([name, info]) => ({
      name,
      usagePct: info.usage ?? 0,
      moves:   sortDesc(info.Moves   ?? {}).map(([n, pct]) => ({ name: n, pct })),
      items:   sortDesc(info.Items   ?? {}).map(([n, pct]) => ({ name: n, pct })),
      spreads: sortDesc(info.Spreads ?? {})
                 .map(([key]) => { const s = parseSpread(key); return s ?? null; })
                 .filter(Boolean),
    }))
    .sort((a, b) => b.usagePct - a.usagePct)
    .slice(0, topN);
}

function getMonEntry(chaosData, resolvedName) {
  if (chaosData.data[resolvedName]) return chaosData.data[resolvedName];
  const lower = resolvedName.toLowerCase();
  for (const [key, val] of Object.entries(chaosData.data)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

// ── Rendering helpers ────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

function dmgClass(minPct, maxPct) {
  if (maxPct >= 100) return 'ko-guaranteed';
  if (minPct >= 100) return 'ko-guaranteed'; // shouldn't happen but safety
  // Check kochance string directly isn't available here — use heuristics
  if (maxPct >= 87.5) return 'ko-chance';   // ~one high roll from OHKO
  if (maxPct >= 50)   return 'dmg-warn';
  return 'dmg-low';
}

function koLabel(kochanceText, maxPct) {
  if (!kochanceText) return maxPct >= 100 ? 'OHKO' : '';
  if (kochanceText.includes('guaranteed OHKO')) return 'OHKO ✓';
  if (kochanceText.includes('OHKO'))            return 'OHKO ~';
  if (kochanceText.includes('guaranteed 2HKO')) return '2HKO ✓';
  if (kochanceText.includes('2HKO'))            return '2HKO ~';
  return '';
}

function koClass(kochanceText, maxPct) {
  if (!kochanceText && maxPct < 100) return '';
  if (kochanceText?.includes('guaranteed OHKO') || maxPct >= 100) return 'tag-ohko';
  if (kochanceText?.includes('OHKO'))            return 'tag-ohko-chance';
  if (kochanceText?.includes('guaranteed 2HKO')) return 'tag-2hko';
  if (kochanceText?.includes('2HKO'))            return 'tag-2hko-chance';
  return '';
}

function surviveClass(survives, maxPct) {
  if (!survives || maxPct >= 100) return 'tag-ohko';
  if (maxPct >= 50) return 'tag-2hko-chance';
  return 'tag-survive';
}

function surviveLabel(survives, maxPct) {
  if (maxPct >= 100) return 'OHKO';
  return survives ? '✓ Survives' : '✗ KO\'d';
}

function speedClass(result) {
  if (result === 'Faster') return 'tag-faster';
  if (result === 'Slower') return 'tag-slower';
  return 'tag-mixed';
}

function fmtRange(min, max) {
  return `${min.toFixed(1)}–${max.toFixed(1)}%`;
}

function barWidth(pct) {
  return `${Math.min(100, pct).toFixed(1)}%`;
}

// ── Result renderers ─────────────────────────────────────────────────────────

function renderOffense(results, container) {
  container.innerHTML = '';
  if (results.length === 0) {
    container.append(el('p', 'pb-empty', 'No offensive data. Check that your moves are valid attacking moves.'));
    return;
  }

  for (const { opponentName, usagePct, speedTag, moveRows } of results) {
    const section = el('div', 'pb-result-section');

    const hdr = el('div', 'pb-opp-header');
    const nameSpan = el('span', 'pb-opp-name', opponentName);
    const usageSpan = el('span', 'pb-usage', `${(usagePct * 100).toFixed(1)}% usage`);
    const spdSpan = el('span', `pb-speed-tag ${speedClass(speedTag)}`, speedTag);
    hdr.append(nameSpan, usageSpan, spdSpan);
    section.append(hdr);

    const rows = el('div', 'pb-move-rows');
    for (const { moveName, minPct, maxPct, kochanceText } of moveRows) {
      const row = el('div', 'pb-move-row');

      const mName = el('span', 'pb-move-name', moveName);
      const dmg   = el('span', `pb-dmg-range ${dmgClass(minPct, maxPct)}`, fmtRange(minPct, maxPct));

      const barWrap = el('div', 'pb-bar-wrap');
      const bar = el('div', 'pb-bar');
      // Two-segment: min fill solid, max fill light
      const solid = maxPct >= 100 ? '#c0392b' : maxPct >= 50 ? '#b07000' : '#555';
      const light = maxPct >= 100 ? 'rgba(192,57,43,0.30)' : maxPct >= 50 ? 'rgba(176,112,0,0.30)' : 'rgba(85,85,85,0.25)';
      const minW = Math.min(100, minPct).toFixed(1);
      const maxW = Math.min(100, maxPct).toFixed(1);
      bar.style.backgroundImage = (minPct >= 1 && minPct < maxPct - 0.5)
        ? `linear-gradient(to right, ${solid} ${minW}%, ${light} ${minW}%, ${light} ${maxW}%, transparent ${maxW}%)`
        : `linear-gradient(to right, ${solid} ${maxW}%, transparent ${maxW}%)`;
      barWrap.append(bar);

      row.append(mName, barWrap, dmg);

      const label = koLabel(kochanceText, maxPct);
      if (label) {
        const tag = el('span', `pb-ko-tag ${koClass(kochanceText, maxPct)}`, label);
        row.append(tag);
      }

      rows.append(row);
    }
    section.append(rows);
    container.append(section);
  }
}

function renderDefense(results, container) {
  container.innerHTML = '';
  if (results.length === 0) {
    container.append(el('p', 'pb-empty', 'No defensive data.'));
    return;
  }

  for (const { opponentName, usagePct, moveRows } of results) {
    const section = el('div', 'pb-result-section');

    const hdr = el('div', 'pb-opp-header');
    hdr.append(
      el('span', 'pb-opp-name', opponentName),
      el('span', 'pb-usage', `${(usagePct * 100).toFixed(1)}% usage`),
    );
    section.append(hdr);

    const rows = el('div', 'pb-move-rows');
    for (const { moveName, minPct, maxPct, survives } of moveRows) {
      const row = el('div', 'pb-move-row');

      const mName = el('span', 'pb-move-name', moveName);
      const dmg   = el('span', `pb-dmg-range ${dmgClass(minPct, maxPct)}`, fmtRange(minPct, maxPct));

      const barWrap = el('div', 'pb-bar-wrap');
      const bar = el('div', 'pb-bar');
      const solid = maxPct >= 100 ? '#c0392b' : maxPct >= 50 ? '#b07000' : '#555';
      const light = maxPct >= 100 ? 'rgba(192,57,43,0.30)' : maxPct >= 50 ? 'rgba(176,112,0,0.30)' : 'rgba(85,85,85,0.25)';
      const minW = Math.min(100, minPct).toFixed(1);
      const maxW = Math.min(100, maxPct).toFixed(1);
      bar.style.backgroundImage = (minPct >= 1 && minPct < maxPct - 0.5)
        ? `linear-gradient(to right, ${solid} ${minW}%, ${light} ${minW}%, ${light} ${maxW}%, transparent ${maxW}%)`
        : `linear-gradient(to right, ${solid} ${maxW}%, transparent ${maxW}%)`;
      barWrap.append(bar);

      const tag = el('span', `pb-ko-tag ${surviveClass(survives, maxPct)}`, surviveLabel(survives, maxPct));

      row.append(mName, barWrap, dmg, tag);
      rows.append(row);
    }
    section.append(rows);
    container.append(section);
  }
}

function renderSpeed(results, container) {
  container.innerHTML = '';
  if (results.length === 0) {
    container.append(el('p', 'pb-empty', 'No speed data.'));
    return;
  }

  const table = el('table', 'pb-speed-table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Opponent</th><th>Usage</th><th>Result</th><th>My Spe</th><th>Opp Spe Range</th></tr>';
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (const { opponentName, usagePct, userSpeed, minOppSpd, maxOppSpd, result } of results) {
    const tr = document.createElement('tr');
    const oppRange = minOppSpd === maxOppSpd ? String(minOppSpd) : `${minOppSpd}–${maxOppSpd}`;
    tr.innerHTML = `
      <td class="pb-opp-name">${opponentName}</td>
      <td class="pb-usage">${(usagePct * 100).toFixed(1)}%</td>
      <td><span class="pb-speed-tag ${speedClass(result)}">${result}</span></td>
      <td class="pb-speed-num">${userSpeed}</td>
      <td class="pb-speed-num">${oppRange}</td>
    `;
    tbody.append(tr);
  }
  table.append(tbody);
  container.append(table);
}

// ── Species autocomplete ─────────────────────────────────────────────────────

function initMonSearch() {
  const input    = document.getElementById('mon-search');
  const dropdown = document.getElementById('mon-dropdown');
  let items = [], activeIdx = -1;

  function getMatches(q) {
    return allSpecies.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  }

  function render(q) {
    const matches = getMatches(q);
    dropdown.innerHTML = '';
    items = [];
    activeIdx = -1;
    if (!matches.length) { dropdown.classList.remove('open'); return; }
    for (const name of matches) {
      const item = el('div', 'pb-dropdown-item', name);
      item.addEventListener('mousedown', e => { e.preventDefault(); pick(name); });
      dropdown.append(item);
      items.push(item);
    }
    dropdown.classList.add('open');
  }

  function pick(name) {
    input.value = name;
    dropdown.classList.remove('open');
    items = [];
    activeIdx = -1;
  }

  function setActive(idx) {
    items.forEach(i => i.classList.remove('pb-dropdown-active'));
    activeIdx = Math.max(0, Math.min(idx, items.length - 1));
    items[activeIdx]?.classList.add('pb-dropdown-active');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input',  () => render(input.value));
  input.addEventListener('focus',  () => { if (input.value) render(input.value); });
  input.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    if      (e.key === 'ArrowDown')  { e.preventDefault(); setActive(activeIdx < 0 ? 0 : activeIdx + 1); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter')      { e.preventDefault(); if (activeIdx >= 0) pick(items[activeIdx].textContent); else if (getMatches(input.value)[0]) pick(getMatches(input.value)[0]); }
    else if (e.key === 'Escape')     { dropdown.classList.remove('open'); }
  });
}

// ── Paste-import: fill form from a Showdown-format set ───────────────────────

function applyParsedSet(set) {
  if (set.name)   document.getElementById('mon-search').value    = set.name;
  if (set.nature) document.getElementById('nature-select').value = set.nature;
  document.getElementById('item-input').value = set.item ?? '';
  if (set.evs) {
    document.getElementById('ev-hp').value  = set.evs.hp  ?? 0;
    document.getElementById('ev-atk').value = set.evs.atk ?? 0;
    document.getElementById('ev-def').value = set.evs.def ?? 0;
    document.getElementById('ev-spa').value = set.evs.spa ?? 0;
    document.getElementById('ev-spd').value = set.evs.spd ?? 0;
    document.getElementById('ev-spe').value = set.evs.spe ?? 0;
  }
  document.querySelectorAll('.pb-move-input').forEach((inp, i) => {
    inp.value = set.moves?.[i] ?? '';
  });
  if (set.boosts?.length) {
    document.getElementById('boosts-input').value = set.boosts
      .map(b => `${b.modifier > 0 ? '+' : ''}${b.modifier} ${b.stat}`)
      .join(', ');
  }
}

function initPasteImport() {
  const ta = document.getElementById('paste-input');
  if (!ta) return;
  ta.addEventListener('input', () => {
    const text = ta.value.trim();
    if (!text.includes('\n')) return; // wait for at least 2 lines
    try {
      const sets = parseSets(text);
      if (sets.length > 0) applyParsedSet(sets[0]);
    } catch { /* ignore mid-paste parse errors */ }
  });
}

// ── Boosts parsing ───────────────────────────────────────────────────────────

function parseBoosts(str) {
  if (!str?.trim()) return {};
  const statMap = { Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe', HP: 'hp' };
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

// ── Tab switching ────────────────────────────────────────────────────────────

function initTabs() {
  const tabs   = document.querySelectorAll('.pb-tab-btn');
  const panels = document.querySelectorAll('.pb-tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// ── Format select ────────────────────────────────────────────────────────────

function initFormats() {
  const sel = document.getElementById('format-select');
  for (const { label, prefix } of KNOWN_FORMATS) {
    const o = document.createElement('option');
    o.value       = prefix;
    o.textContent = label;
    sel.append(o);
  }
}

// ── Main run ─────────────────────────────────────────────────────────────────

async function runBenchmark() {
  const errorEl = document.getElementById('error');
  const btn     = document.getElementById('bench-btn');
  errorEl.textContent = '';

  // Collect inputs
  const monRaw    = document.getElementById('mon-search').value.trim();
  const nature    = document.getElementById('nature-select').value;
  const item      = document.getElementById('item-input').value.trim() || undefined;
  const format    = document.getElementById('format-select').value;
  const topN      = Math.max(1, Math.min(50, parseInt(document.getElementById('top-n').value, 10) || 20));
  const boostsStr = document.getElementById('boosts-input').value.trim();

  const evs = {
    hp:  Math.min(32, parseInt(document.getElementById('ev-hp').value,  10) || 0),
    atk: Math.min(32, parseInt(document.getElementById('ev-atk').value, 10) || 0),
    def: Math.min(32, parseInt(document.getElementById('ev-def').value, 10) || 0),
    spa: Math.min(32, parseInt(document.getElementById('ev-spa').value, 10) || 0),
    spd: Math.min(32, parseInt(document.getElementById('ev-spd').value, 10) || 0),
    spe: Math.min(32, parseInt(document.getElementById('ev-spe').value, 10) || 0),
  };

  const moveInputs = [...document.querySelectorAll('.pb-move-input')]
    .map(i => i.value.trim()).filter(Boolean);

  if (!monRaw) { errorEl.textContent = 'Enter a Pokémon name.'; return; }

  const resolvedName = resolveSpecies(monRaw);
  if (!resolvedName) { errorEl.textContent = `"${monRaw}" not found. Check spelling.`; return; }

  btn.textContent = 'RUNNING…';
  btn.disabled    = true;

  try {
    const chaosData = await loadChaosData(format);
    const opponents = parseOpponents(chaosData, topN);

    // Resolve moves: explicit → chaos data for this mon → error
    let moves = moveInputs;
    if (moves.length === 0) {
      const entry = getMonEntry(chaosData, resolvedName);
      if (entry?.Moves) {
        moves = Object.entries(entry.Moves)
          .sort((a, b) => b[1] - a[1])
          .map(([m]) => m)
          .filter(m => isMoveUsable(m))
          .slice(0, 4);
      }
      if (moves.length === 0) {
        errorEl.textContent = `${resolvedName} has no usable moves in the chaos data. Enter moves manually.`;
        return;
      }
    }

    const boosts   = parseBoosts(boostsStr);
    const userSpec = { resolvedName, nature, evs, item, moves, boosts };

    // Show resolved info
    document.getElementById('resolved-info').textContent =
      `${resolvedName}  ·  ${nature}  ·  ${
        Object.entries(evs).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k.toUpperCase()}`).join(' / ') || 'No EVs'
      }  ·  Moves: ${moves.join(', ')}`;

    const offenseResults = runOffensiveCheck(userSpec, opponents);
    const defenseResults = runDefensiveCheck(userSpec, opponents);
    const speedResults   = runSpeedAudit(userSpec, opponents);

    renderOffense(offenseResults, document.getElementById('tab-offense'));
    renderDefense(defenseResults, document.getElementById('tab-defense'));
    renderSpeed(speedResults,     document.getElementById('tab-speed'));

    // Show results area
    document.getElementById('results-area').style.display = 'block';

    // Switch to first tab with data
    document.querySelector('.pb-tab-btn[data-tab="tab-offense"]').click();

  } catch (e) {
    errorEl.textContent = `Error: ${e.message}`;
  } finally {
    btn.textContent = 'BENCHMARK';
    btn.disabled    = false;
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

initFormats();
initMonSearch();
initPasteImport();
initTabs();

document.getElementById('bench-btn').addEventListener('click', runBenchmark);
document.getElementById('bench-form').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    runBenchmark();
  }
});

// ── Demo auto-run ─────────────────────────────────────────────────────────────

if (new URLSearchParams(location.search).has('demo')) {
  const DEMO = {
    mon:    'Floette-Mega',
    nature: 'Timid',
    evs:    { hp: 2, spa: 32, spe: 32 },
    moves:  ['Dazzling Gleam', 'Moonblast', 'Light of Ruin', 'Psychic'],
  };
  document.getElementById('mon-search').value     = DEMO.mon;
  document.getElementById('nature-select').value  = DEMO.nature;
  for (const [stat, val] of Object.entries(DEMO.evs)) {
    document.getElementById(`ev-${stat}`).value = val;
  }
  document.querySelectorAll('.pb-move-input').forEach((inp, i) => {
    inp.value = DEMO.moves[i] ?? '';
  });
  runBenchmark();
}
