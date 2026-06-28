import './siteHeader.js';
import { gen } from './calcEngine.js';
import { getChampionsSpeciesIds, getChampionsMoves, getAbilitiesBatch, getChampionsMegaForms } from './learnsets.js';

const NATURES = [
  'Adamant','Bashful','Bold','Brave','Calm','Careful','Docile',
  'Gentle','Hardy','Hasty','Impish','Jolly','Lax','Lonely','Mild',
  'Modest','Naive','Naughty','Quiet','Quirky','Rash','Relaxed',
  'Sassy','Serious','Timid',
];

const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

// ── Species list ──────────────────────────────────────────────────────────────

let allChampSpecies = null;

async function ensureSpeciesList() {
  if (allChampSpecies) return allChampSpecies;
  const ids = await getChampionsSpeciesIds();
  const megas = await getChampionsMegaForms(ids);
  allChampSpecies = [
    ...ids.map(id => ({ id, name: gen.species.get(id)?.name ?? id })),
    ...megas.map(m => ({ id: m.id, name: m.name })),
  ].sort((a, b) => a.name.localeCompare(b.name));
  return allChampSpecies;
}

// ── Slot state ────────────────────────────────────────────────────────────────

const slotState = Array.from({ length: 6 }, () => ({
  name: '', id: '', item: '', ability: '', nature: 'Hardy',
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: ['', '', '', ''],
  legalMoves: [],
}));

// ── Autocomplete helper ───────────────────────────────────────────────────────

function initAC({ input, dropdown, getNames, onPick, maxResults = 80, openOnFocus = true }) {
  let items = [], activeIdx = -1;

  function render(q) {
    const lower = q.toLowerCase();
    const hits = (getNames() ?? []).filter(n => n.toLowerCase().includes(lower)).slice(0, maxResults);
    dropdown.innerHTML = '';
    items = []; activeIdx = -1;
    if (!hits.length || !q) { dropdown.classList.remove('open'); return; }
    for (const name of hits) {
      const d = document.createElement('div');
      d.className = 'tb-dd-item';
      d.textContent = name;
      d.addEventListener('mousedown', e => { e.preventDefault(); pick(name); });
      dropdown.append(d);
      items.push(d);
    }
    dropdown.classList.add('open');
  }

  function setActive(idx) {
    items.forEach(i => i.classList.remove('tb-dd-active'));
    activeIdx = Math.max(0, Math.min(idx, items.length - 1));
    items[activeIdx]?.classList.add('tb-dd-active');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function pick(name) {
    input.value = '';
    dropdown.classList.remove('open');
    items = []; activeIdx = -1;
    onPick(name);
  }

  input.addEventListener('input', () => render(input.value));
  if (openOnFocus) input.addEventListener('focus', () => { if (input.value) render(input.value); });
  input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx < 0 ? 0 : activeIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) pick(items[activeIdx].textContent);
      else {
        const lower = input.value.toLowerCase();
        const hit = (getNames() ?? []).find(n => n.toLowerCase().includes(lower));
        if (hit) pick(hit);
      }
    }
    else if (e.key === 'Escape') dropdown.classList.remove('open');
  });
}

// ── DOM helper ────────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ── Slot card builder ─────────────────────────────────────────────────────────

function createSlotEl(i) {
  const s = slotState[i];
  const card = el('div', 'tb-slot');

  // ── Slot header
  const header = el('div', 'tb-slot-header');
  header.append(el('span', 'tb-slot-num', `Slot ${i + 1}`));
  const clearBtn = el('button', 'tb-clear-btn', '✕ Clear');
  header.append(clearBtn);
  card.append(header);

  // ── Pokémon name autocomplete
  const nameField = el('div', 'tb-field');
  nameField.append(el('label', 'tb-label', 'Pokémon'));
  const nameWrap = el('div', 'tb-input-wrap');
  const nameInput = el('input', 'tb-input');
  nameInput.placeholder = 'Search Pokémon…';
  nameInput.autocomplete = 'off';
  const nameDd = el('div', 'tb-dropdown');
  nameWrap.append(nameInput, nameDd);
  nameField.append(nameWrap);
  card.append(nameField);

  // ── Item + Ability
  const row1 = el('div', 'tb-two-col');

  const itemField = el('div', 'tb-field');
  itemField.append(el('label', 'tb-label', 'Item'));
  const itemInput = el('input', 'tb-input');
  itemInput.placeholder = 'e.g. Leftovers';
  itemInput.addEventListener('input', () => { s.item = itemInput.value.trim(); });
  itemField.append(itemInput);

  const abilityField = el('div', 'tb-field');
  abilityField.append(el('label', 'tb-label', 'Ability'));
  const abilitySelect = el('select', 'tb-select');
  abilitySelect.disabled = true;
  const abilityPh = el('option', null, '— pick a Pokémon —');
  abilityPh.value = '';
  abilitySelect.append(abilityPh);
  abilitySelect.addEventListener('change', () => { s.ability = abilitySelect.value; });
  abilityField.append(abilitySelect);

  row1.append(itemField, abilityField);
  card.append(row1);

  // ── Nature
  const natureField = el('div', 'tb-field');
  natureField.append(el('label', 'tb-label', 'Nature'));
  const natureSelect = el('select', 'tb-select');
  for (const nat of NATURES) {
    const o = el('option', null, nat);
    o.value = nat;
    if (nat === 'Hardy') o.selected = true;
    natureSelect.append(o);
  }
  natureSelect.addEventListener('change', () => { s.nature = natureSelect.value; });
  natureField.append(natureSelect);
  card.append(natureField);

  // ── EVs
  card.append(el('div', 'tb-label', 'EVs (0–32)'));
  const evsGrid = el('div', 'tb-ev-grid');
  const evInputs = {};
  for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    const cell = el('div', 'tb-ev-cell');
    cell.append(el('label', 'tb-ev-label', STAT_LABELS[stat]));
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'tb-ev-input';
    inp.min = 0; inp.max = 32; inp.value = 0;
    inp.addEventListener('input', () => {
      s.evs[stat] = Math.max(0, Math.min(32, parseInt(inp.value) || 0));
      inp.value = s.evs[stat];
    });
    cell.append(inp);
    evsGrid.append(cell);
    evInputs[stat] = inp;
  }
  card.append(evsGrid);

  // ── Moves
  card.append(el('div', 'tb-label', 'Moves'));
  const movesWrap = el('div', 'tb-moves-wrap');
  const moveInputs = [], moveDds = [];
  for (let m = 0; m < 4; m++) {
    const row = el('div', 'tb-move-row');
    row.append(el('span', 'tb-move-num', `${m + 1}`));
    const wrap = el('div', 'tb-input-wrap');
    const inp = el('input', 'tb-input tb-move-input');
    inp.placeholder = `Move ${m + 1}`;
    inp.disabled = true;
    inp.autocomplete = 'off';
    const dd = el('div', 'tb-dropdown');
    wrap.append(inp, dd);
    row.append(wrap);
    movesWrap.append(row);
    moveInputs.push(inp);
    moveDds.push(dd);
  }
  card.append(movesWrap);

  // ── Wire move autocompletes
  for (let m = 0; m < 4; m++) {
    initAC({
      input: moveInputs[m],
      dropdown: moveDds[m],
      getNames: () => s.legalMoves,
      onPick: name => {
        s.moves[m] = name;
        moveInputs[m].value = name;
      },
    });
    moveInputs[m].addEventListener('change', () => { s.moves[m] = moveInputs[m].value.trim(); });
  }

  // ── Wire Pokémon autocomplete
  initAC({
    input: nameInput,
    dropdown: nameDd,
    getNames: () => (allChampSpecies ?? []).map(sp => sp.name),
    openOnFocus: false,
    onPick: async name => {
      const sp = (allChampSpecies ?? []).find(x => x.name === name);
      if (!sp) return;

      s.name = name;
      s.id   = sp.id;
      s.ability = '';
      s.legalMoves = [];
      s.moves = ['', '', '', ''];

      nameInput.value = name;
      for (const inp of moveInputs) { inp.value = ''; inp.disabled = true; }

      abilitySelect.innerHTML = '';
      const loading = el('option', null, 'Loading…');
      abilitySelect.append(loading);
      abilitySelect.disabled = true;

      const [abilityMap, moveIds] = await Promise.all([
        getAbilitiesBatch([sp.id]),
        getChampionsMoves(name),
      ]);

      // Populate abilities
      const abilities = abilityMap.get(sp.id) ?? [];
      abilitySelect.innerHTML = '';
      if (abilities.length === 0) {
        const ph = el('option', null, '— none —');
        ph.value = '';
        abilitySelect.append(ph);
      } else {
        for (const ab of abilities) {
          const o = el('option', null, ab);
          o.value = ab;
          abilitySelect.append(o);
        }
      }
      abilitySelect.disabled = false;
      s.ability = abilities[0] ?? '';

      // Populate legal moves
      s.legalMoves = moveIds
        .map(id => gen.moves.get(id)?.name)
        .filter(Boolean)
        .sort();
      for (const inp of moveInputs) inp.disabled = false;
    },
  });

  // ── Clear
  clearBtn.addEventListener('click', () => {
    Object.assign(s, {
      name: '', id: '', item: '', ability: '', nature: 'Hardy',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['', '', '', ''],
      legalMoves: [],
    });
    nameInput.value = '';
    itemInput.value = '';
    abilitySelect.innerHTML = '';
    const ph = el('option', null, '— pick a Pokémon —');
    ph.value = '';
    abilitySelect.append(ph);
    abilitySelect.disabled = true;
    natureSelect.value = 'Hardy';
    for (const stat of ['hp','atk','def','spa','spd','spe']) evInputs[stat].value = 0;
    for (const inp of moveInputs) { inp.value = ''; inp.disabled = true; }
  });

  return card;
}

// ── Build grid ────────────────────────────────────────────────────────────────

const grid = document.getElementById('tb-grid');
for (let i = 0; i < 6; i++) grid.append(createSlotEl(i));

ensureSpeciesList(); // pre-fetch so autocomplete is instant

// ── Paste generation ──────────────────────────────────────────────────────────

function generatePaste(s) {
  if (!s.name) return '';
  const lines = [s.name + (s.item ? ` @ ${s.item}` : '')];
  if (s.ability)  lines.push(`Ability: ${s.ability}`);
  const evParts = Object.entries(s.evs)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${STAT_LABELS[k]}`);
  if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`);
  if (s.nature)   lines.push(`${s.nature} Nature`);
  for (const m of s.moves) if (m) lines.push(`- ${m}`);
  return lines.join('\n');
}

function buildFullPaste() {
  return slotState.map(generatePaste).filter(Boolean).join('\n\n');
}

// ── Action buttons ────────────────────────────────────────────────────────────

const copyBtn = document.getElementById('tb-copy-btn');
const loadBtn = document.getElementById('tb-load-btn');
const statusEl = document.getElementById('tb-status');

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#c0392b' : '#2e7d32';
  setTimeout(() => { statusEl.textContent = ''; }, 2500);
}

copyBtn.addEventListener('click', async () => {
  const paste = buildFullPaste();
  if (!paste) { showStatus('No Pokémon added yet.', true); return; }
  try {
    await navigator.clipboard.writeText(paste);
    const orig = copyBtn.textContent;
    copyBtn.textContent = 'COPIED!';
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
  } catch {
    showStatus('Could not copy — check browser permissions.', true);
  }
});

loadBtn.addEventListener('click', () => {
  const paste = buildFullPaste();
  if (!paste) { showStatus('No Pokémon added yet.', true); return; }
  localStorage.setItem('kcalc_builder_team', paste);
  window.location.href = '/damagecalc/';
});
