import { gen } from './calcEngine.js';
import { getChampionsSpeciesIds, getChampionsMovesBatch } from './learnsets.js';

// ── Champions species list ────────────────────────────────────────────────────

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

// ── Ability names (from Champions species only) ───────────────────────────────

let champAbilityNames = null;

async function ensureAbilityNames() {
  if (champAbilityNames) return champAbilityNames;
  const species = await ensureChampionsSpecies();
  const set = new Set();
  for (const { species: s } of species) {
    for (const name of Object.values(s.abilities ?? {})) {
      if (name) set.add(name);
    }
  }
  champAbilityNames = [...set].sort();
  return champAbilityNames;
}

// ── Move names (for autocomplete hints) ──────────────────────────────────────

let champMoveNames = null;

function ensureMoveNames() {
  if (champMoveNames) return;
  champMoveNames = [];
  for (const m of gen.moves) {
    if (m.name && m.name !== '(No Move)') champMoveNames.push(m.name);
  }
  champMoveNames.sort();
}

function toMoveId(name) {
  return name.toLowerCase().replace(/[-\s']/g, '');
}

// ── Serebii URL ───────────────────────────────────────────────────────────────

function serebiiUrl(name) {
  // "Blastoise-Mega" → "blastoise", "Tapu Koko" → "tapukoko"
  return `https://www.serebii.net/pokedex-champions/${name.toLowerCase().split('-')[0].replace(/\s/g, '')}/`;
}

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMoves   = [];
let selectedAbility = null;
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

// ── Generic autocomplete ──────────────────────────────────────────────────────

function initAutocomplete({ inputId, dropdownId, getNames, onPick, maxResults = 50 }) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let items = [], activeIdx = -1;

  function matches(q) {
    const lower = q.toLowerCase();
    const names = getNames();
    return (names ?? []).filter(n => n.toLowerCase().includes(lower)).slice(0, maxResults);
  }

  function renderDropdown(q) {
    const hits = matches(q);
    dropdown.innerHTML = '';
    items = []; activeIdx = -1;
    if (!hits.length || !q) { dropdown.classList.remove('open'); return; }
    for (const name of hits) {
      const item = el('div', 'ml-dd-item', name);
      item.addEventListener('mousedown', e => { e.preventDefault(); pick(name); });
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

  function pick(name) {
    input.value = '';
    dropdown.classList.remove('open');
    items = []; activeIdx = -1;
    onPick(name);
  }

  input.addEventListener('input',  () => renderDropdown(input.value));
  input.addEventListener('focus',  () => { if (input.value) renderDropdown(input.value); });
  input.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx < 0 ? 0 : activeIdx + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) pick(items[activeIdx].textContent);
      else { const hits = matches(input.value); if (hits[0]) pick(hits[0]); }
    }
    else if (e.key === 'Escape') { dropdown.classList.remove('open'); }
  });
}

// ── Move chips ────────────────────────────────────────────────────────────────

function addMove(name) {
  if (selectedMoves.includes(name)) return;
  selectedMoves.push(name);
  renderMoveChips();
  updateBtn();
}

function removeMove(name) {
  selectedMoves = selectedMoves.filter(m => m !== name);
  renderMoveChips();
  updateBtn();
}

function renderMoveChips() {
  const area = document.getElementById('move-chips');
  area.innerHTML = '';
  for (const name of selectedMoves) {
    const chip = el('span', 'ml-chip');
    chip.append(document.createTextNode(name + ' '));
    const btn = el('button', 'ml-chip-remove');
    btn.textContent = '×';
    btn.title = 'Remove';
    btn.addEventListener('click', () => removeMove(name));
    chip.append(btn);
    area.append(chip);
  }
}

// ── Ability chip (single selection) ──────────────────────────────────────────

function setAbility(name) {
  selectedAbility = name;
  renderAbilityChip();
  updateBtn();
}

function clearAbility() {
  selectedAbility = null;
  renderAbilityChip();
  updateBtn();
}

function renderAbilityChip() {
  const area = document.getElementById('ability-chips');
  area.innerHTML = '';
  if (!selectedAbility) return;
  const chip = el('span', 'ml-chip ability-chip');
  chip.append(document.createTextNode(selectedAbility + ' '));
  const btn = el('button', 'ml-chip-remove');
  btn.textContent = '×';
  btn.title = 'Remove';
  btn.addEventListener('click', clearAbility);
  chip.append(btn);
  area.append(chip);
}

function updateBtn() {
  document.getElementById('find-btn').disabled =
    selectedMoves.length === 0 && !selectedAbility;
}

// ── Search ────────────────────────────────────────────────────────────────────

async function runSearch() {
  const btn     = document.getElementById('find-btn');
  const errorEl = document.getElementById('ml-error');
  errorEl.textContent = '';

  if (selectedMoves.length === 0 && !selectedAbility) return;

  btn.textContent = 'LOADING…';
  btn.disabled    = true;

  const moveIds = selectedMoves.map(toMoveId);

  let species, movesets;
  try {
    species = await ensureChampionsSpecies();
    if (selectedMoves.length > 0) {
      movesets = await getChampionsMovesBatch(species.map(s => s.name));
    }
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
    // Ability filter
    if (selectedAbility) {
      const abilities = Object.values(s.abilities ?? {}).filter(Boolean);
      if (!abilities.includes(selectedAbility)) continue;
    }

    // Move filter
    if (moveIds.length > 0) {
      const moveset = movesets?.get(name);
      if (!moveset || !moveIds.every(id => moveset.has(id))) continue;
    }

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
    const td = el('td', 'ml-empty', 'No Champions Pokémon match the selected filters.');
    td.colSpan = 9;
    tr.append(td);
    tbody.append(tr);
    return;
  }

  const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

  for (const row of results) {
    const tr = document.createElement('tr');
    tr.className = 'ml-row-clickable';
    tr.title     = `Open ${row.name} on Serebii`;
    tr.addEventListener('click', () => window.open(serebiiUrl(row.name), '_blank', 'noopener'));

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

ensureMoveNames();
ensureAbilityNames(); // pre-fetch so autocomplete is fast

initAutocomplete({
  inputId:    'move-input',
  dropdownId: 'move-dropdown',
  getNames:   () => champMoveNames,
  onPick:     addMove,
});

initAutocomplete({
  inputId:    'ability-input',
  dropdownId: 'ability-dropdown',
  getNames:   () => champAbilityNames,
  onPick:     setAbility,
  maxResults: 30,
});

updateBtn();

document.getElementById('find-btn').addEventListener('click', runSearch);
document.getElementById('move-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.querySelector('#move-dropdown .ml-dd-active')) {
    if (selectedMoves.length > 0 || selectedAbility) runSearch();
  }
});
document.getElementById('ability-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.querySelector('#ability-dropdown .ml-dd-active')) {
    if (selectedMoves.length > 0 || selectedAbility) runSearch();
  }
});

document.querySelectorAll('.ml-th-sortable').forEach(th => {
  th.addEventListener('click', () => { if (results.length > 0) applySort(th.dataset.sort); });
});
