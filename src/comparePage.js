import { gen, resolveSpeciesName, allSpecies } from './calcEngine.js';
import { getGen9Moves } from './learnsets.js';

function moveDisplayName(id) {
  try { return gen.moves.get(id)?.name ?? id; }
  catch { return id; }
}

const STAT_LABELS = [
  { key: 'hp',  label: 'HP'  },
  { key: 'atk', label: 'Atk' },
  { key: 'def', label: 'Def' },
  { key: 'spa', label: 'SpA' },
  { key: 'spd', label: 'SpD' },
  { key: 'spe', label: 'Spe' },
];

const STAT_MAX = 255;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

// ── Autocomplete ──────────────────────────────────────────────────────────────

function initPicker(inputId, dropdownId) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let items = [], activeIdx = -1;

  function matches(q) {
    return allSpecies.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  }

  function renderDropdown(q) {
    const hits = matches(q);
    dropdown.innerHTML = '';
    items = [];
    activeIdx = -1;
    if (!hits.length) { dropdown.classList.remove('open'); return; }
    for (const name of hits) {
      const item = el('div', 'cmp-dd-item', name);
      item.addEventListener('mousedown', e => { e.preventDefault(); pick(name); });
      dropdown.append(item);
      items.push(item);
    }
    dropdown.classList.add('open');
  }

  function pick(name) {
    input.value = name;
    dropdown.classList.remove('open');
    items = []; activeIdx = -1;
  }

  function setActive(idx) {
    items.forEach(i => i.classList.remove('cmp-dd-active'));
    activeIdx = Math.max(0, Math.min(idx, items.length - 1));
    items[activeIdx]?.classList.add('cmp-dd-active');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input',  () => renderDropdown(input.value));
  input.addEventListener('focus',  () => { if (input.value) renderDropdown(input.value); });
  input.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx < 0 ? 0 : activeIdx + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter')     { e.preventDefault(); const m = matches(input.value); if (activeIdx >= 0) pick(items[activeIdx].textContent); else if (m[0]) pick(m[0]); }
    else if (e.key === 'Escape')    { dropdown.classList.remove('open'); }
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

function getSpecies(name) {
  // gen.species.get() requires an ID (lowercase, no hyphens); iterate to match by display name instead
  for (const s of gen.species) { if (s.name === name) return s; }
  return null;
}

function renderStats(nameA, nameB) {
  const speciesA = getSpecies(nameA);
  const speciesB = getSpecies(nameB);
  const container = document.getElementById('cmp-stats');
  container.innerHTML = '';

  if (!speciesA || !speciesB) {
    container.textContent = 'Could not load species data.';
    return;
  }

  const bsA = speciesA.baseStats;
  const bsB = speciesB.baseStats;

  // Names row
  const namesRow = el('div', 'cmp-stats-names');
  namesRow.innerHTML = `
    <div class="cmp-stats-name cmp-stats-name-a">${nameA}</div>
    <div></div>
    <div class="cmp-stats-name cmp-stats-name-b">${nameB}</div>
  `;
  container.append(namesRow);

  let totalA = 0, totalB = 0;

  for (const { key, label } of STAT_LABELS) {
    const vA = bsA[key] ?? 0;
    const vB = bsB[key] ?? 0;
    totalA += vA;
    totalB += vB;

    const higher = vA > vB ? 'a' : vB > vA ? 'b' : 'tied';
    const wA = ((vA / STAT_MAX) * 100).toFixed(1);
    const wB = ((vB / STAT_MAX) * 100).toFixed(1);

    const row = el('div', 'cmp-stat-row');
    row.innerHTML = `
      <div class="cmp-side-a">
        <span class="cmp-stat-val cmp-val-a ${higher === 'a' ? 'higher' : higher === 'tied' ? 'tied' : ''}">${vA}</span>
        <div class="cmp-bar-track">
          <div class="cmp-bar-fill ${higher === 'a' ? 'higher' : higher === 'tied' ? 'tied' : ''}" style="width:${wA}%"></div>
        </div>
      </div>
      <div class="cmp-stat-center-label">${label}</div>
      <div class="cmp-side-b">
        <div class="cmp-bar-track">
          <div class="cmp-bar-fill ${higher === 'b' ? 'higher' : higher === 'tied' ? 'tied' : ''}" style="width:${wB}%"></div>
        </div>
        <span class="cmp-stat-val cmp-val-b ${higher === 'b' ? 'higher' : higher === 'tied' ? 'tied' : ''}">${vB}</span>
      </div>
    `;
    container.append(row);
  }

  // BST row
  const higherBst = totalA > totalB ? 'a' : totalB > totalA ? 'b' : 'tied';
  const bstRow = el('div', 'cmp-stat-row cmp-bst-row');
  bstRow.innerHTML = `
    <div class="cmp-side-a" style="justify-content:flex-end">
      <span class="cmp-stat-val cmp-val-a cmp-bst-val ${higherBst === 'a' ? 'higher' : higherBst === 'tied' ? 'tied' : ''}">${totalA}</span>
    </div>
    <div class="cmp-bst-center-label">BST</div>
    <div class="cmp-side-b">
      <span class="cmp-stat-val cmp-val-b cmp-bst-val ${higherBst === 'b' ? 'higher' : higherBst === 'tied' ? 'tied' : ''}">${totalB}</span>
    </div>
  `;
  container.append(bstRow);
}

// ── Moves ────────────────────────────────────────────────────────────────────

async function renderMoves(nameA, nameB) {
  const headersEl = document.getElementById('cmp-move-headers');
  const gridEl    = document.getElementById('cmp-moves');
  headersEl.innerHTML = '<div class="cmp-loading" style="grid-column:1/-1">Loading full learnset data…</div>';
  gridEl.innerHTML = '';

  try {
    const [movesA, movesB] = await Promise.all([
      getGen9Moves(nameA),
      getGen9Moves(nameB),
    ]);

    const setA = new Set(movesA);
    const setB = new Set(movesB);

    const onlyA  = movesA.filter(m => !setB.has(m));
    const shared = movesA.filter(m =>  setB.has(m));
    const onlyB  = movesB.filter(m => !setA.has(m));

    // Column headers
    headersEl.innerHTML = '';
    for (const [cls, label, count] of [
      ['cmp-col-header cmp-col-header-a',      `Only ${nameA}`, onlyA.length ],
      ['cmp-col-header cmp-col-header-shared',  'Shared',        shared.length],
      ['cmp-col-header cmp-col-header-b',      `Only ${nameB}`, onlyB.length ],
    ]) {
      const h = el('div', cls);
      h.innerHTML = `<span>${label}</span><span class="cmp-col-count">${count}</span>`;
      headersEl.append(h);
    }

    // Move columns
    const colA      = el('div', 'cmp-moves-col cmp-col-a');
    const colShared = el('div', 'cmp-moves-col cmp-col-shared');
    const colB      = el('div', 'cmp-moves-col cmp-col-b');

    function fillCol(col, moves, chipCls) {
      if (moves.length === 0) {
        col.append(el('div', 'cmp-no-data', 'None'));
        return;
      }
      for (const move of moves) {
        col.append(el('span', `cmp-move-chip ${chipCls}`, moveDisplayName(move)));
      }
    }

    fillCol(colA,      onlyA,  'cmp-chip-a');
    fillCol(colShared, shared, 'cmp-chip-shared');
    fillCol(colB,      onlyB,  'cmp-chip-b');

    gridEl.append(colA, colShared, colB);

  } catch (e) {
    headersEl.innerHTML = `<div class="cmp-loading" style="grid-column:1/-1;color:#c00">Could not load move data: ${e.message}</div>`;
  }
}

// ── Compare ───────────────────────────────────────────────────────────────────

async function runCompare() {
  const rawA    = document.getElementById('cmp-input-a').value.trim();
  const rawB    = document.getElementById('cmp-input-b').value.trim();
  const errorEl = document.getElementById('cmp-error');
  const btn     = document.getElementById('cmp-btn');
  errorEl.textContent = '';

  const nameA = resolveSpeciesName(rawA);
  const nameB = resolveSpeciesName(rawB);

  if (!nameA) { errorEl.textContent = `"${rawA}" not found.`; return; }
  if (!nameB) { errorEl.textContent = `"${rawB}" not found.`; return; }
  if (nameA === nameB) { errorEl.textContent = 'Pick two different Pokémon.'; return; }

  btn.textContent = 'COMPARING…';
  btn.disabled    = true;

  document.getElementById('cmp-results').style.display = 'block';
  renderStats(nameA, nameB);
  await renderMoves(nameA, nameB);

  btn.textContent = 'COMPARE';
  btn.disabled    = false;

  document.getElementById('cmp-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

initPicker('cmp-input-a', 'cmp-dd-a');
initPicker('cmp-input-b', 'cmp-dd-b');

document.getElementById('cmp-btn').addEventListener('click', runCompare);
document.getElementById('cmp-input-a').addEventListener('keydown', e => { if (e.key === 'Enter') runCompare(); });
document.getElementById('cmp-input-b').addEventListener('keydown', e => { if (e.key === 'Enter') runCompare(); });

// Pre-fill from ?a= and ?b= URL params
const params = new URLSearchParams(location.search);
const paramA = params.get('a');
const paramB = params.get('b');
if (paramA) document.getElementById('cmp-input-a').value = paramA;
if (paramB) document.getElementById('cmp-input-b').value = paramB;
if (paramA && paramB) runCompare();
