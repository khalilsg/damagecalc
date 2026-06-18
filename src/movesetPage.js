import { gen } from './calcEngine.js';
import { getChampionsSpeciesIds, getChampionsMovesBatch } from './learnsets.js';

// ── Champions move names for autocomplete ─────────────────────────────────────
// Built lazily after the learnsets are loaded.

let champMoveNames = null; // sorted display names of all Champions-legal moves

async function ensureMoveNames() {
  if (champMoveNames) return;
  // getChampionsMovesBatch over all Champions species gives us every legal move.
  // We don't call it yet here — it runs on first search. For the autocomplete
  // we just use gen.moves (which has display names) filtered to recognisable moves.
  // The autocomplete is a hint; the search validates against Champions learnsets.
  champMoveNames = [];
  for (const m of gen.moves) {
    if (m.name && m.name !== '(No Move)') champMoveNames.push(m.name);
  }
  champMoveNames.sort();
}

function toMoveId(name) {
  return name.toLowerCase().replace(/[-\s']/g, '');
}

// ── Champions species list ────────────────────────────────────────────────────
// Built lazily: {id, name, species} for the 237 Champions-legal Pokémon.

let champSpecies = null;

async function ensureChampionsSpecies() {
  if (champSpecies) return champSpecies;
  const ids = await getChampionsSpeciesIds();
  champSpecies = [];
  for (const id of ids) {
    const species = gen.species.get(id);
    if (!species) continue;
    champSpecies.push({ id, name: species.name, species });
  }
  return champSpecies;
}

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMoves = [];
let sortKey = 'bst';
let sortAsc  = false;
let results  = [];

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
    return (champMoveNames ?? []).filter(n => n.toLowerCase().includes(lower)).slice(0, 50);
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
    const chip  = el('span', 'ml-chip');
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

  btn.textContent = 'LOADING…';
  btn.disabled    = true;

  const moveIds = selectedMoves.map(toMoveId);

  let species, movesets;
  try {
    species  = await ensureChampionsSpecies();
    movesets = await getChampionsMovesBatch(species.map(s => s.name));
  } catch (e) {
    errorEl.textContent = `Failed to load Champions data: ${e.message}`;
    btn.textContent = 'FIND POKÉMON';
    btn.disabled    = false;
    return;
  }

  btn.textContent = 'FIND POKÉMON';
  btn.disabled    = false;

  results = [];
  for (const { name, species: s } of species) {
    const moveset = movesets.get(name);
    if (!moveset || !moveIds.every(id => moveset.has(id))) continue;

    const bs  = s.baseStats;
    const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
    results.push({
      name,
      types: s.types ?? [],
      hp: bs.hp, atk: bs.atk, def: bs.def,
      spa: bs.spa, spd: bs.spd, spe: bs.spe,
      bst,
    });
  }

  sortResults();
  renderTable();

  document.getElementById('ml-count').textContent = `${results.length} Pokémon`;
  const wrapEl = document.getElementById('ml-results');
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
    const td = el('td', 'ml-empty', 'No Champions Pokémon learn all selected moves.');
    td.colSpan = 9;
    tr.append(td);
    tbody.append(tr);
    return;
  }

  const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

  for (const row of results) {
    const tr = document.createElement('tr');

    tr.append(el('td', 'ml-td ml-td-name', row.name));

    const typesTd = el('td', 'ml-td ml-td-types');
    for (const type of row.types) {
      const badge = el('span', 'ml-type-badge', type);
      badge.style.background = TYPE_COLORS[type] ?? '#888';
      typesTd.append(badge);
    }
    tr.append(typesTd);

    for (const key of STAT_KEYS) {
      const sorted = key === sortKey;
      const cls = `ml-td ml-td-stat${key === 'bst' ? ' ml-td-bst' : ''}${sorted ? ' ml-td-sorted' : ''}`;
      tr.append(el('td', cls, String(row[key])));
    }

    tbody.append(tr);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

ensureMoveNames();  // pre-populate autocomplete names
initMoveInput();
updateBtn();

document.getElementById('find-btn').addEventListener('click', runSearch);
document.getElementById('move-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.querySelector('.ml-dd-active')) {
    if (selectedMoves.length > 0) runSearch();
  }
});

document.querySelectorAll('.ml-th-sortable').forEach(th => {
  th.addEventListener('click', () => { if (results.length > 0) applySort(th.dataset.sort); });
});
