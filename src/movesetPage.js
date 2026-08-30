import './siteHeader.js';
import { gen } from './calcEngine.js';
import {
  getChampionsSpeciesIds, getChampionsMovesBatch, getChampionsLegalityBatch,
  getAbilitiesBatch, getChampionsMegaForms, getAllSpeciesEntries, getAnyGenMovesBatch,
} from './learnsets.js';
import { MOVE_EQUIVALENCIES } from './moveEquivalencies.js';

// ── Equivalency lookup tables (built once at module load) ─────────────────────

// "Acid Armor / Iron Defense / Shelter" → ["acidarmor", "irondefense", "shelter"]
const EQUIV_LABEL_TO_IDS = new Map();
// Individual move names that belong to a group (excluded from flat autocomplete)
const EQUIV_MEMBER_NAMES = new Set();

for (const group of MOVE_EQUIVALENCIES) {
  const label = group.join(' / ');
  EQUIV_LABEL_TO_IDS.set(label, group.map(n => n.toLowerCase().replace(/[-\s']/g, '')));
  for (const name of group) EQUIV_MEMBER_NAMES.add(name);
}

// ── Champions species list ────────────────────────────────────────────────────

let champSpecies = null;

async function ensureChampionsSpecies() {
  if (champSpecies) return champSpecies;
  const ids = await getChampionsSpeciesIds();
  const [abilityMap, megaForms] = await Promise.all([
    getAbilitiesBatch(ids),
    getChampionsMegaForms(ids),
  ]);

  champSpecies = [];

  for (const id of ids) {
    const species = gen.species.get(id);
    if (!species) continue;
    champSpecies.push({
      id, name: species.name, species,
      abilities: abilityMap.get(id) ?? [],
      isMega: false, isChamp: true, nfe: !!species.nfe,
    });
  }

  // Mega forms inherit their learnset from the base species (handled by resolveId
  // in getChampionsMovesBatch); stats, types, and abilities come from PS Pokédex.
  for (const mega of megaForms) {
    champSpecies.push({
      id: mega.id,
      name: mega.name,
      species: { baseStats: mega.baseStats, types: mega.types },
      abilities: mega.abilities,
      isMega: true, isChamp: true, nfe: false,
    });
  }

  return champSpecies;
}

// ── Full species list (Champions + everything else) ───────────────────────────

// Formes that can't be built in Champions and that getAllSpeciesEntries' cosmetic
// check doesn't catch, because their stats differ from their base species':
// Gmax and Totem boosts, Terastallized Ogerpon, and the Let's Go starters.
const NOISE_FORME = /Gmax|Totem|Tera$|^Starter$/;
const MEGA_FORME  = /^(Mega|Primal)/;

let allSpecies = null;

async function ensureAllSpecies() {
  if (allSpecies) return allSpecies;

  const entries = (await getAllSpeciesEntries()).filter(e => !NOISE_FORME.test(e.forme));
  const legalMap = await getChampionsLegalityBatch(entries.map(e => e.name));

  allSpecies = entries.map(e => ({
    id: e.id,
    name: e.name,
    species: { baseStats: e.baseStats, types: e.types },
    abilities: e.abilities,
    isMega: MEGA_FORME.test(e.forme),
    isChamp: legalMap.get(e.name) ?? false,
    nfe: e.nfe,
  }));

  return allSpecies;
}

const ensureSpeciesList = () => (includeAll ? ensureAllSpecies() : ensureChampionsSpecies());

// ── Ability names (from whichever species list is in scope) ───────────────────

const abilityNames = { champions: null, all: null };

async function ensureAbilityNames() {
  const key = includeAll ? 'all' : 'champions';
  if (abilityNames[key]) return abilityNames[key];
  const species = await ensureSpeciesList();
  const set = new Set();
  for (const { abilities } of species) {
    for (const name of abilities) set.add(name);
  }
  abilityNames[key] = [...set].sort();
  return abilityNames[key];
}

// ── Move names (for autocomplete hints) ──────────────────────────────────────

let champMoveNames = null;

function ensureMoveNames() {
  if (champMoveNames) return;
  champMoveNames = [];
  for (const m of gen.moves) {
    if (m.name && m.name !== '(No Move)' && !EQUIV_MEMBER_NAMES.has(m.name)) {
      champMoveNames.push(m.name);
    }
  }
  // Add group labels in place of the individual members
  for (const label of EQUIV_LABEL_TO_IDS.keys()) champMoveNames.push(label);
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

// Serebii's Champions dex only covers Champions-legal Pokémon; everything else
// goes to the PS dex, which carries every species and forme.
function dexUrl({ name, isChamp }) {
  return isChamp
    ? serebiiUrl(name)
    : `https://dex.pokemonshowdown.com/pokemon/${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
}

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMoves   = [];
let selectedAbility = null;
let selectedTypes   = [];
let hideMegas   = false;
let includeAll  = false;  // search the full dex, not just Champions-legal Pokémon
let feOnly      = true;   // all-Pokémon mode only — the dex is half unevolved Pokémon
let lastListAll = false;
let sortKey = 'bst';
let sortAsc  = false;
let results  = [];
let showAllRows = false;

// Rendering every row of the full dex at once is the slow part of a search, and
// the interesting Pokémon are at the top of the sort anyway. The curated
// Champions list is small enough to always render whole.
const RENDER_CAP = 250;

// ── Saved toggles ─────────────────────────────────────────────────────────────

const PREFS_KEY = 'kcalc_finder_prefs';

function loadPrefs() {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {}; } catch { /* ignore */ }
  hideMegas  = !!prefs.hideMegas;
  includeAll = !!prefs.includeAll;
  feOnly     = prefs.feOnly ?? true;
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ hideMegas, includeAll, feOnly }));
  } catch { /* private mode — toggles just don't persist */ }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

// ── Generic autocomplete ──────────────────────────────────────────────────────

function initAutocomplete({ inputId, dropdownId, getNames, onPick, maxResults = 50, decorateItem }) {
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
      decorateItem?.(item, name);
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

// ── Type chips (up to 2) ─────────────────────────────────────────────────────

function addType(name) {
  if (selectedTypes.includes(name) || selectedTypes.length >= 2) return;
  selectedTypes.push(name);
  renderTypeChips();
  updateBtn();
}

function removeType(name) {
  selectedTypes = selectedTypes.filter(t => t !== name);
  renderTypeChips();
  updateBtn();
}

function renderTypeChips() {
  const area = document.getElementById('type-chips');
  area.innerHTML = '';
  for (const name of selectedTypes) {
    const chip = el('span', 'ml-chip type-chip');
    chip.style.background = TYPE_COLORS[name] ?? '#888';
    chip.append(document.createTextNode(name + ' '));
    const btn = el('button', 'ml-chip-remove');
    btn.textContent = '×';
    btn.title = 'Remove';
    btn.addEventListener('click', () => removeType(name));
    chip.append(btn);
    area.append(chip);
  }
}

function updateBtn() {
  document.getElementById('find-btn').disabled =
    selectedMoves.length === 0 && !selectedAbility && selectedTypes.length === 0;
}

// ── Search ────────────────────────────────────────────────────────────────────

async function runSearch({ listAll = false, scroll = true } = {}) {
  const btn     = document.getElementById('find-btn');
  const errorEl = document.getElementById('ml-error');
  errorEl.textContent = '';

  if (!listAll && selectedMoves.length === 0 && !selectedAbility && selectedTypes.length === 0) return;
  lastListAll = listAll;

  btn.textContent = 'LOADING…';
  btn.disabled    = true;

  // Each entry is an array of IDs; a Pokémon matches if it has ANY id in each group.
  const moveGroups = selectedMoves.map(label =>
    EQUIV_LABEL_TO_IDS.get(label) ?? [toMoveId(label)]
  );

  let species, champMovesets, otherMovesets;
  try {
    species = await ensureSpeciesList();
    if (selectedMoves.length > 0) {
      // Champions-legal Pokémon are matched against the Champions movepool;
      // everything else against every generation's learnset, since a Pokémon
      // cut from Gen 9 has no Gen 9 movepool to match at all.
      const champNames = [], otherNames = [];
      for (const entry of species) (entry.isChamp ? champNames : otherNames).push(entry.name);
      [champMovesets, otherMovesets] = await Promise.all([
        getChampionsMovesBatch(champNames),
        otherNames.length ? getAnyGenMovesBatch(otherNames) : new Map(),
      ]);
    }
  } catch (e) {
    errorEl.textContent = `Failed to load Pokémon data: ${e.message}`;
    btn.textContent = 'FIND POKÉMON';
    btn.disabled    = false;
    return;
  }

  btn.textContent = 'FIND POKÉMON';
  btn.disabled    = false;

  results = [];
  for (const { name, species: s, abilities, isMega, isChamp, nfe } of species) {
    // Mega filter
    if (hideMegas && isMega) continue;

    // Fully-evolved filter (all-Pokémon mode only — the Champions list is curated)
    if (includeAll && feOnly && nfe) continue;

    // Type filter — Pokémon must have every selected type
    if (selectedTypes.length > 0) {
      const types = s.types ?? [];
      if (!selectedTypes.every(t => types.includes(t))) continue;
    }

    // Ability filter (uses PS Pokédex data — includes all three ability slots)
    if (selectedAbility && !abilities.includes(selectedAbility)) continue;

    // Move filter — each group satisfied if Pokémon has ANY move in that group
    if (moveGroups.length > 0) {
      const moveset = (isChamp ? champMovesets : otherMovesets)?.get(name);
      if (!moveset || !moveGroups.every(ids => ids.some(id => moveset.has(id)))) continue;
    }

    const bs  = s.baseStats;
    const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
    const ebst    = bst - Math.min(bs.atk, bs.spa);
    const trspeed = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + (100 - bs.spe);
    const bulk    = 2 * bs.hp + bs.def + bs.spd;
    const lobulk  = bs.hp + Math.min(bs.def, bs.spd);
    results.push({
      name,
      isChamp,
      champ: isChamp ? 1 : 0,  // sortable form of the Champ column
      types: s.types ?? [],
      hp: bs.hp, atk: bs.atk, def: bs.def,
      spa: bs.spa, spd: bs.spd, spe: bs.spe,
      bst, ebst, trspeed, bulk, lobulk,
    });
  }

  showAllRows = false;
  sortResults();
  renderTable();
  renderCount();

  const wrapEl = document.getElementById('ml-results');
  wrapEl.style.display = 'block';
  if (scroll) wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const TYPE_NAMES = Object.keys(TYPE_COLORS).sort();

function typeBadge(type) {
  const badge = el('span', 'ml-type-badge', type);
  badge.style.background = TYPE_COLORS[type] ?? '#888';
  return badge;
}

// ── Render table ──────────────────────────────────────────────────────────────

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst', 'ebst', 'trspeed', 'bulk', 'lobulk'];

const COLUMN_COUNT = () => STAT_KEYS.length + (includeAll ? 3 : 2); // + name, type, champ

function renderCount() {
  const champCount = results.reduce((n, r) => n + r.champ, 0);
  document.getElementById('ml-count').textContent = includeAll
    ? `${results.length} Pokémon · ${champCount} in Champions`
    : `${results.length} Pokémon`;
}

function renderTable() {
  const tbody = document.getElementById('ml-tbody');
  tbody.innerHTML = '';

  // The Champ column only says something once non-Champions Pokémon are in scope.
  document.getElementById('ml-th-champ').style.display = includeAll ? '' : 'none';
  document.getElementById('ml-results').classList.toggle('ml-wide', includeAll);

  if (results.length === 0) {
    const tr = document.createElement('tr');
    const td = el('td', 'ml-empty', includeAll
      ? 'No Pokémon match the selected filters.'
      : 'No Champions Pokémon match the selected filters.');
    td.colSpan = COLUMN_COUNT();
    tr.append(td);
    tbody.append(tr);
    return;
  }

  const capped = includeAll && !showAllRows;
  const shown  = capped ? results.slice(0, RENDER_CAP) : results;

  for (const row of shown) {
    const tr = document.createElement('tr');
    tr.className = 'ml-row-clickable';
    tr.title     = row.isChamp ? `Open ${row.name} on Serebii` : `Open ${row.name} on the Showdown dex`;
    tr.addEventListener('click', () => window.open(dexUrl(row), '_blank', 'noopener'));

    if (includeAll) {
      const champTd = el('td', 'ml-td ml-td-champ');
      champTd.append(el('span', row.isChamp ? 'ml-champ-yes' : 'ml-champ-no', row.isChamp ? '✓' : '—'));
      champTd.title = row.isChamp ? 'Legal in Champions' : 'Not in Champions';
      tr.append(champTd);
    }

    tr.append(el('td', 'ml-td ml-td-name', row.name));

    const typesTd = el('td', 'ml-td ml-td-types');
    for (const type of row.types) {
      typesTd.append(typeBadge(type));
    }
    tr.append(typesTd);

    for (const key of STAT_KEYS) {
      const sorted = key === sortKey;
      const isBst = key === 'bst' || key === 'ebst' || key === 'trspeed' || key === 'bulk' || key === 'lobulk';
      const cls = `ml-td ml-td-stat${isBst ? ' ml-td-bst' : ''}${sorted ? ' ml-td-sorted' : ''}`;
      tr.append(el('td', cls, String(row[key])));
    }

    tbody.append(tr);
  }

  if (shown.length < results.length) {
    const tr = document.createElement('tr');
    const td = el('td', 'ml-more');
    td.colSpan = COLUMN_COUNT();
    const btn = el('button', 'ml-btn ml-btn-secondary', `Show all ${results.length}`);
    btn.addEventListener('click', () => { showAllRows = true; renderTable(); });
    td.append(btn);
    tr.append(td);
    tbody.append(tr);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

loadPrefs();
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
  getNames:   () => abilityNames[includeAll ? 'all' : 'champions'],
  onPick:     setAbility,
  maxResults: 30,
});

initAutocomplete({
  inputId:    'type-input',
  dropdownId: 'type-dropdown',
  getNames:   () => TYPE_NAMES,
  onPick:     addType,
  maxResults: 18,
  // Show the type as its colored badge, matching the results table. Badge text
  // is the type name, so item.textContent (used by keyboard Enter) is unchanged.
  decorateItem: (item, name) => { item.textContent = ''; item.append(typeBadge(name)); },
});

updateBtn();

document.getElementById('find-btn').addEventListener('click', () => runSearch());
document.getElementById('list-all-btn').addEventListener('click', () => runSearch({ listAll: true }));

// ── Scope toggles ─────────────────────────────────────────────────────────────

const hideMegasBox  = document.getElementById('hide-megas');
const includeAllBox = document.getElementById('include-all');
const feOnlyBox     = document.getElementById('fe-only');

function syncToggleUi() {
  hideMegasBox.checked  = hideMegas;
  includeAllBox.checked = includeAll;
  feOnlyBox.checked     = feOnly;
  // "Fully evolved only" has nothing to do in the curated Champions list.
  document.getElementById('fe-only-wrap').style.display = includeAll ? '' : 'none';
}

function onToggleChange() {
  savePrefs();
  syncToggleUi();
  // Re-run the last search in place (data is cached) if results are showing
  if (document.getElementById('ml-results').style.display === 'block') {
    runSearch({ listAll: lastListAll, scroll: false });
  }
}

hideMegasBox.addEventListener('change', e => { hideMegas = e.target.checked; onToggleChange(); });
feOnlyBox.addEventListener('change',    e => { feOnly    = e.target.checked; onToggleChange(); });
includeAllBox.addEventListener('change', e => {
  includeAll = e.target.checked;
  ensureAbilityNames(); // widen (or narrow) the ability autocomplete for the new scope
  onToggleChange();
});

syncToggleUi();

const hasFilters = () =>
  selectedMoves.length > 0 || selectedAbility || selectedTypes.length > 0;

document.getElementById('move-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.querySelector('#move-dropdown .ml-dd-active')) {
    if (hasFilters()) runSearch();
  }
});
document.getElementById('ability-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.querySelector('#ability-dropdown .ml-dd-active')) {
    if (hasFilters()) runSearch();
  }
});
document.getElementById('type-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.querySelector('#type-dropdown .ml-dd-active')) {
    if (hasFilters()) runSearch();
  }
});

document.querySelectorAll('.ml-th-sortable').forEach(th => {
  th.addEventListener('click', () => { if (results.length > 0) applySort(th.dataset.sort); });
});
