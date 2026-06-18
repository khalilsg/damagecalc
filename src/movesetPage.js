import { gen, allSpecies } from './calcEngine.js';
import { getGen9MovesBatch } from './learnsets.js';

// ── All Gen 9 move names for autocomplete ─────────────────────────────────────

const ALL_MOVE_NAMES = (() => {
  const names = [];
  for (const m of gen.moves) {
    if (m.name && m.name !== '(No Move)') names.push(m.name);
  }
  return names.sort();
})();

function toMoveId(name) {
  return name.toLowerCase().replace(/[-\s']/g, '');
}

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMoves = [];  // display names
let sortKey = 'bst';
let sortAsc  = false;
let results  = [];       // [{name, types, hp, atk, def, spa, spd, spe, bst}]

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

// ── Move autocomplete ─────────────────────────────────────────────────────────

function initMoveInput() {
  const input    = document.getElementById('move-input');
  const dropdown = document.getElementById('move-dropdown');
  let items = [], activeIdx = -1;

  function matches(q) {
    const lower = q.toLowerCase();
    return ALL_MOVE_NAMES.filter(n => n.toLowerCase().includes(lower)).slice(0, 50);
  }

  function renderDropdown(q) {
    const hits = matches(q);
    dropdown.innerHTML = '';
    items = []; activeIdx = -1;
    if (!hits.length || !q) { dropdown.classList.remove('open'); return; }
    for (const name of hits) {
      const item = el('div', 'ml-dd-item', name);
      item.addEventListener('mousedown', e => { e.preventDefault(); pickMove(name); });
      dropdown.append(item);
      items.push(item);
    }
    dropdown.classList.add('open');
  }

  function setActive(idx) {
    items.forEach(i => i.classList.remove('ml-dd-active'));
    activeIdx = Math.max(0, Math.min(idx, items.length - 1));
    items[activeIdx]?.classList.add('ml-dd-active');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function pickMove(name) {
    input.value = '';
    dropdown.classList.remove('open');
    items = []; activeIdx = -1;
    addMove(name);
  }

  input.addEventListener('input',  () => renderDropdown(input.value));
  input.addEventListener('focus',  () => { if (input.value) renderDropdown(input.value); });
  input.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx < 0 ? 0 : activeIdx + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) pickMove(items[activeIdx].textContent);
      else { const hits = matches(input.value); if (hits[0]) pickMove(hits[0]); }
    }
    else if (e.key === 'Escape') { dropdown.classList.remove('open'); }
  });
}

// ── Chips ─────────────────────────────────────────────────────────────────────

function addMove(name) {
  if (selectedMoves.includes(name)) return;
  selectedMoves.push(name);
  renderChips();
  updateBtn();
}

function removeMove(name) {
  selectedMoves = selectedMoves.filter(m => m !== name);
  renderChips();
  updateBtn();
}

function renderChips() {
  const area = document.getElementById('move-chips');
  area.innerHTML = '';
  for (const name of selectedMoves) {
    const chip = el('span', 'ml-chip');
    const label = document.createTextNode(name + ' ');
    const btn   = el('button', 'ml-chip-remove');
    btn.textContent = '×';
    btn.title = 'Remove';
    btn.addEventListener('click', () => removeMove(name));
    chip.append(label, btn);
    area.append(chip);
  }
}

function updateBtn() {
  document.getElementById('find-btn').disabled = selectedMoves.length === 0;
}

// ── Search ────────────────────────────────────────────────────────────────────

async function runSearch() {
  const btn     = document.getElementById('find-btn');
  const errorEl = document.getElementById('ml-error');
  errorEl.textContent = '';

  if (selectedMoves.length === 0) return;

  btn.textContent = 'LOADING LEARNSETS…';
  btn.disabled    = true;

  const moveIds = selectedMoves.map(toMoveId);

  let movesets;
  try {
    movesets = await getGen9MovesBatch(allSpecies);
  } catch (e) {
    errorEl.textContent = `Failed to load learnset data: ${e.message}`;
    btn.textContent = 'FIND POKÉMON';
    btn.disabled    = false;
    return;
  }

  btn.textContent = 'FIND POKÉMON';
  btn.disabled    = false;

  results = [];
  for (const name of allSpecies) {
    const moveset = movesets.get(name);
    if (!moveset || !moveIds.every(id => moveset.has(id))) continue;

    const speciesId = name.toLowerCase().replace(/[-\s]/g, '');
    let species = gen.species.get(speciesId);
    if (!species) {
      for (const s of gen.species) { if (s.name === name) { species = s; break; } }
    }
    if (!species) continue;

    const bs  = species.baseStats;
    const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
    results.push({
      name,
      types: species.types ?? [],
      hp: bs.hp, atk: bs.atk, def: bs.def,
      spa: bs.spa, spd: bs.spd, spe: bs.spe,
      bst,
    });
  }

  sortResults();
  renderTable();

  const countEl  = document.getElementById('ml-count');
  const wrapEl   = document.getElementById('ml-results');
  countEl.textContent = `${results.length} Pokémon`;
  wrapEl.style.display = 'block';
  wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Sort ──────────────────────────────────────────────────────────────────────

function sortResults() {
  results.sort((a, b) => {
    const diff = sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

function applySort(key) {
  if (sortKey === key) { sortAsc = !sortAsc; }
  else { sortKey = key; sortAsc = false; }

  document.querySelectorAll('.ml-th-sortable').forEach(th => {
    const k     = th.dataset.sort;
    const arrow = th.querySelector('.ml-sort-arrow');
    th.classList.toggle('active', k === sortKey);
    if (arrow) arrow.textContent = k === sortKey ? (sortAsc ? '▲' : '▼') : '';
  });

  sortResults();
  renderTable();
}

// ── Type colours ──────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  Normal: '#9ea0a1', Fire: '#ff6c31', Water: '#4d90d5', Electric: '#f7d02c',
  Grass: '#63bb5b', Ice: '#74cec0', Fighting: '#ce4069', Poison: '#ab6ac8',
  Ground: '#d97845', Flying: '#8fa8dd', Psychic: '#f95587', Bug: '#92a212',
  Rock: '#c9b78a', Ghost: '#5269ac', Dragon: '#096dc4', Dark: '#5a5465',
  Steel: '#5a8ea2', Fairy: '#ec8fe6',
};

// ── Render table ──────────────────────────────────────────────────────────────

function renderTable() {
  const tbody = document.getElementById('ml-tbody');
  tbody.innerHTML = '';

  if (results.length === 0) {
    const tr = document.createElement('tr');
    const td = el('td', 'ml-empty', 'No Pokémon learn all selected moves in Gen 9.');
    td.colSpan = 9;
    tr.append(td);
    tbody.append(tr);
    return;
  }

  const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

  for (const row of results) {
    const tr = document.createElement('tr');

    const nameTd = el('td', 'ml-td ml-td-name', row.name);
    tr.append(nameTd);

    const typesTd = el('td', 'ml-td ml-td-types');
    for (const type of row.types) {
      const badge = el('span', 'ml-type-badge', type);
      badge.style.background = TYPE_COLORS[type] ?? '#888';
      typesTd.append(badge);
    }
    tr.append(typesTd);

    for (const key of STAT_KEYS) {
      const sorted = key === sortKey;
      const cls    = `ml-td ml-td-stat${key === 'bst' ? ' ml-td-bst' : ''}${sorted ? ' ml-td-sorted' : ''}`;
      tr.append(el('td', cls, String(row[key])));
    }

    tbody.append(tr);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

initMoveInput();
updateBtn();

document.getElementById('find-btn').addEventListener('click', runSearch);
document.getElementById('move-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('move-dropdown').querySelectorAll('.ml-dd-active').length === 0) {
    if (selectedMoves.length > 0) runSearch();
  }
});

document.querySelectorAll('.ml-th-sortable').forEach(th => {
  th.addEventListener('click', () => {
    if (results.length > 0) applySort(th.dataset.sort);
  });
});
