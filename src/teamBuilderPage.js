import './siteHeader.js';
import { gen, allItems, megaStoneFor } from './calcEngine.js';
import { getChampionsLegalItems } from './championsItems.js';
import { getChampionsSpeciesIds, getChampionsMoves, getAbilitiesBatch, getChampionsMegaForms } from './learnsets.js';
import { parseSets } from './parser.js';
import { TEAMS } from './teams.js';
import { getSavedTeams, saveTeam, deleteTeam, teamNameFromSpecies } from './savedTeams.js';

// [name, label] — sorted by boosted stat (Spe→Atk→SpA→Def→SpD), then by lowered stat same order
const NATURES = [
  ['Timid',   'Timid (+Spe, −Atk)'],
  ['Jolly',   'Jolly (+Spe, −SpA)'],
  ['Hasty',   'Hasty (+Spe, −Def)'],
  ['Naive',   'Naive (+Spe, −SpD)'],
  ['Brave',   'Brave (+Atk, −Spe)'],
  ['Adamant', 'Adamant (+Atk, −SpA)'],
  ['Lonely',  'Lonely (+Atk, −Def)'],
  ['Naughty', 'Naughty (+Atk, −SpD)'],
  ['Quiet',   'Quiet (+SpA, −Spe)'],
  ['Modest',  'Modest (+SpA, −Atk)'],
  ['Mild',    'Mild (+SpA, −Def)'],
  ['Rash',    'Rash (+SpA, −SpD)'],
  ['Relaxed', 'Relaxed (+Def, −Spe)'],
  ['Bold',    'Bold (+Def, −Atk)'],
  ['Impish',  'Impish (+Def, −SpA)'],
  ['Lax',     'Lax (+Def, −SpD)'],
  ['Sassy',   'Sassy (+SpD, −Spe)'],
  ['Calm',    'Calm (+SpD, −Atk)'],
  ['Careful', 'Careful (+SpD, −SpA)'],
  ['Gentle',  'Gentle (+SpD, −Def)'],
  ['Serious', 'Serious (neutral)'],
];

const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

// ── Species list ──────────────────────────────────────────────────────────────

let allChampSpecies = null;

// Champions-legal item names (async); `allowAllItems` bypasses the filter.
let champLegalItems = null;
let allowAllItems = false;
getChampionsLegalItems().then(list => { champLegalItems = list; });

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
  name: '', id: '', item: '', ability: '', nature: 'Serious',
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: ['', '', '', ''],
  legalMoves: [],
}));

const slotDomRefs = [];

// ── Autocomplete helper ───────────────────────────────────────────────────────

function initAC({ input, dropdown, getNames, onPick, maxResults = 80, openOnFocus = true, showOnEmpty = false }) {
  let items = [], activeIdx = -1;

  function render(q) {
    const lower = q.toLowerCase();
    const hits = (getNames() ?? []).filter(n => n.toLowerCase().includes(lower)).slice(0, maxResults);
    dropdown.innerHTML = '';
    items = []; activeIdx = -1;
    if (!hits.length || (!q && !showOnEmpty)) { dropdown.classList.remove('open'); return; }
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
  if (openOnFocus) input.addEventListener('focus', () => render(input.value));
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

  // ── Base stats display
  const statsRow = el('div', 'tb-base-stats');
  statsRow.hidden = true;
  const statsHeader = el('div', 'tb-stats-header');
  statsHeader.append(el('span', 'tb-label', 'BASE STATS'));
  const bstEl = el('span', 'tb-bst-total', '');
  statsHeader.append(bstEl);
  statsRow.append(statsHeader);
  const statGrid = el('div', 'tb-stat-grid');
  const statEls = {};
  for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    const cell = el('div', 'tb-stat-cell');
    cell.append(el('span', 'tb-stat-name', STAT_LABELS[stat]));
    const valEl = el('span', 'tb-stat-val', '');
    cell.append(valEl);
    statGrid.append(cell);
    statEls[stat] = valEl;
  }
  statsRow.append(statGrid);
  card.append(statsRow);

  // ── Item + Ability
  const row1 = el('div', 'tb-two-col');

  // Mega Stone we last auto-filled, so we can replace/clear it on a species
  // change without clobbering an item the user typed or picked themselves.
  let autoFilledItem = '';

  const itemField = el('div', 'tb-field');
  itemField.append(el('label', 'tb-label', 'Item'));
  const itemWrap = el('div', 'tb-input-wrap');
  const itemInput = el('input', 'tb-input');
  itemInput.placeholder = 'e.g. Leftovers';
  itemInput.autocomplete = 'off';
  itemInput.addEventListener('input', () => { s.item = itemInput.value.trim(); autoFilledItem = ''; });
  const itemDd = el('div', 'tb-dropdown');
  itemWrap.append(itemInput, itemDd);
  itemField.append(itemWrap);

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
  for (const [val, label] of NATURES) {
    const o = el('option', null, label);
    o.value = val;
    if (val === 'Serious') o.selected = true;
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
      showOnEmpty: true,
      onPick: name => {
        s.moves[m] = name;
        moveInputs[m].value = name;
      },
    });
    moveInputs[m].addEventListener('change', () => { s.moves[m] = moveInputs[m].value.trim(); });
  }

  // ── Species loader (used by autocomplete and paste import)
  async function applySpecies(name, overrides = {}) {
    const sp = (allChampSpecies ?? []).find(x => x.name === name);
    if (!sp) return;

    s.name = name;
    s.id   = sp.id;
    s.ability = '';
    s.legalMoves = [];
    s.moves = ['', '', '', ''];

    const baseStats = gen.species.get(sp.id)?.baseStats ?? {};
    const bst = Object.values(baseStats).reduce((sum, v) => sum + v, 0);
    bstEl.textContent = `BST ${bst}`;
    for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
      const v = baseStats[stat] ?? 0;
      statEls[stat].textContent = v;
      statEls[stat].dataset.tier = v < 60 ? 'low' : v < 80 ? 'mid' : v < 100 ? 'avg' : 'high';
    }
    statsRow.hidden = false;

    nameInput.value = name;
    for (const inp of moveInputs) { inp.value = ''; inp.disabled = true; }

    // Auto-fill the required Mega Stone for mega forms. Only replace the item
    // if it's empty or a stone we previously auto-filled — never a user's own.
    const megaStone = megaStoneFor[name] ?? '';
    if (megaStone) {
      s.item = megaStone; itemInput.value = megaStone; autoFilledItem = megaStone;
    } else if (itemInput.value === autoFilledItem) {
      s.item = ''; itemInput.value = ''; autoFilledItem = '';
    }

    abilitySelect.innerHTML = '';
    abilitySelect.append(el('option', null, 'Loading…'));
    abilitySelect.disabled = true;

    const [abilityMap, moveIds] = await Promise.all([
      getAbilitiesBatch([sp.id]),
      getChampionsMoves(name),
    ]);

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

    s.legalMoves = moveIds.map(id => gen.moves.get(id)?.name).filter(Boolean).sort();
    for (const inp of moveInputs) inp.disabled = false;

    // Apply overrides (from paste import)
    if (overrides.item) { s.item = overrides.item; itemInput.value = overrides.item; autoFilledItem = ''; }
    if (overrides.ability && abilities.includes(overrides.ability)) {
      s.ability = overrides.ability;
      abilitySelect.value = overrides.ability;
    }
    if (overrides.nature) { s.nature = overrides.nature; natureSelect.value = overrides.nature; }
    if (overrides.evs) {
      for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
        const v = overrides.evs[stat] ?? 0;
        s.evs[stat] = v;
        if (evInputs[stat]) evInputs[stat].value = v;
      }
    }
    if (overrides.moves) {
      for (let m = 0; m < 4; m++) {
        const mv = overrides.moves[m] ?? '';
        s.moves[m] = mv;
        if (moveInputs[m]) moveInputs[m].value = mv;
      }
    }
  }

  // ── Wire Pokémon autocomplete
  initAC({
    input: nameInput,
    dropdown: nameDd,
    getNames: () => (allChampSpecies ?? []).map(sp => sp.name),
    openOnFocus: false,
    onPick: name => applySpecies(name),
  });

  // ── Wire Item autocomplete
  initAC({
    input: itemInput,
    dropdown: itemDd,
    getNames: () => allowAllItems ? allItems : (champLegalItems ?? allItems),
    openOnFocus: false,
    onPick: name => { s.item = name; itemInput.value = name; autoFilledItem = ''; },
  });

  // ── Clear
  function clearSlot() {
    Object.assign(s, {
      name: '', id: '', item: '', ability: '', nature: 'Serious',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['', '', '', ''],
      legalMoves: [],
    });
    nameInput.value = '';
    itemInput.value = '';
    autoFilledItem = '';
    abilitySelect.innerHTML = '';
    const ph = el('option', null, '— pick a Pokémon —');
    ph.value = '';
    abilitySelect.append(ph);
    abilitySelect.disabled = true;
    natureSelect.value = 'Serious';
    for (const stat of ['hp','atk','def','spa','spd','spe']) evInputs[stat].value = 0;
    for (const inp of moveInputs) { inp.value = ''; inp.disabled = true; }
    statsRow.hidden = true;
  }
  clearBtn.addEventListener('click', clearSlot);

  slotDomRefs[i] = { applySpecies, clear: clearSlot };

  return card;
}

// ── Build grid ────────────────────────────────────────────────────────────────

const grid = document.getElementById('tb-grid');
for (let i = 0; i < 6; i++) grid.append(createSlotEl(i));

ensureSpeciesList(); // pre-fetch so autocomplete is instant

document.getElementById('tb-allow-all-items')?.addEventListener('change', e => {
  allowAllItems = e.target.checked;
});

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

// ── Paste import ──────────────────────────────────────────────────────────────

async function importFromPaste(text) {
  await ensureSpeciesList();
  const sets = parseSets(text).slice(0, 6);
  if (sets.length === 0) throw new Error('No valid Pokémon found in paste');
  for (const ref of slotDomRefs) ref?.clear?.();
  await Promise.all(sets.map((set, i) =>
    slotDomRefs[i]?.applySpecies(set.name, {
      item:    set.item   ?? '',
      ability: set.ability,
      nature:  set.nature,
      evs:     set.evs,
      moves:   set.moves.slice(0, 4),
    })
  ));
  return sets.length;
}

// ── Action buttons ────────────────────────────────────────────────────────────

const copyBtn      = document.getElementById('tb-copy-btn');
const loadBtn      = document.getElementById('tb-load-btn');
const pokebenchBtn = document.getElementById('tb-pokebench-btn');
const shareBtn     = document.getElementById('tb-share-btn');
const statusEl     = document.getElementById('tb-status');

const codeInput        = document.getElementById('tb-code-input');
const codeDisplay      = document.getElementById('tb-code-display');
const codeDisplayValue = document.getElementById('tb-code-display-value');

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#c0392b' : '#2e7d32';
  setTimeout(() => { statusEl.textContent = ''; }, 2500);
}

// ── Team code (optional, in-game share code) ──────────────────────────────────

function setCode(code) {
  codeInput.value = code ?? '';
  updateCodeDisplay();
}

function updateCodeDisplay() {
  const code = codeInput.value.trim();
  codeDisplayValue.textContent = code;
  codeDisplay.hidden = !code;
}

codeInput.addEventListener('input', updateCodeDisplay);

// ── Share link (team paste + optional code encoded in the URL) ────────────────

shareBtn.addEventListener('click', async () => {
  const paste = buildFullPaste();
  if (!paste) { showStatus('No Pokémon added yet.', true); return; }
  const encoded = btoa(unescape(encodeURIComponent(paste)));
  let url = `${location.origin}${location.pathname}?team=${encoded}`;
  const code = codeInput.value.trim();
  if (code) url += `&code=${encodeURIComponent(code)}`;
  try {
    await navigator.clipboard.writeText(url);
    const orig = shareBtn.textContent;
    shareBtn.textContent = 'LINK COPIED!';
    setTimeout(() => { shareBtn.textContent = orig; }, 1500);
  } catch {
    window.prompt('Copy this share link:', url);
  }
});

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

pokebenchBtn.addEventListener('click', () => {
  const paste = buildFullPaste();
  if (!paste) { showStatus('No Pokémon added yet.', true); return; }
  const encoded = btoa(unescape(encodeURIComponent(paste)));
  window.open(`/damagecalc/pokebench/?team=${encoded}`, '_blank', 'noopener,noreferrer');
});

// ── Import from paste button ──────────────────────────────────────────────────

const importBtn    = document.getElementById('tb-import-btn');
const importInput  = document.getElementById('tb-import-textarea');
const importStatus = document.getElementById('tb-import-status');

importBtn.addEventListener('click', async () => {
  const text = importInput.value.trim();
  if (!text) {
    importStatus.textContent = 'Paste a team first.';
    importStatus.style.color = '#c0392b';
    return;
  }
  importBtn.disabled = true;
  importBtn.textContent = 'IMPORTING…';
  importStatus.textContent = '';
  try {
    const count = await importFromPaste(text);
    importStatus.textContent = `${count} Pokémon imported!`;
    importStatus.style.color = '#2e7d32';
    setTimeout(() => { importStatus.textContent = ''; }, 3000);
    document.getElementById('tb-import').removeAttribute('open');
  } catch (e) {
    importStatus.textContent = e.message;
    importStatus.style.color = '#c0392b';
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = 'IMPORT TEAM';
  }
});

// ── My Teams (shared localStorage store with K Calc) ──────────────────────────

const teamSelect    = document.getElementById('tb-team-select');
const saveTeamBtn   = document.getElementById('tb-save-btn');
const deleteTeamBtn = document.getElementById('tb-delete-btn');
let activeTeamName  = null;  // name of the currently loaded saved team (null = none)

function rebuildTeamDropdown() {
  teamSelect.innerHTML = '<option value="" disabled selected>Load a saved team…</option>';

  if (TEAMS.length > 0) {
    const g = el('optgroup');
    g.label = 'Presets';
    for (const t of TEAMS) {
      const o = el('option', null, t.name);
      o.value = `preset:${t.name}`;
      g.append(o);
    }
    teamSelect.append(g);
  }

  const saved = getSavedTeams();
  if (saved.length > 0) {
    const g = el('optgroup');
    g.label = 'My Teams';
    for (const t of saved) {
      const o = el('option', null, t.name);
      o.value = `saved:${t.name}`;
      g.append(o);
    }
    teamSelect.append(g);
  }
}

teamSelect.addEventListener('change', async () => {
  const val = teamSelect.value;
  teamSelect.value = '';

  let text = null, name = null, fromSaved = false, code = '';
  if (val.startsWith('preset:')) {
    text = TEAMS.find(t => t.name === val.slice(7))?.text ?? null;
  } else if (val.startsWith('saved:')) {
    name = val.slice(6);
    const saved = getSavedTeams().find(t => t.name === name);
    text = saved?.text ?? null;
    code = saved?.code ?? '';
    fromSaved = true;
  }
  if (!text) return;

  teamSelect.disabled = true;
  try {
    const count = await importFromPaste(text);
    setCode(code);   // loading a team replaces the code (presets have none)
    activeTeamName = fromSaved ? name : null;
    deleteTeamBtn.disabled = !activeTeamName;
    showStatus(`${count} Pokémon loaded.`);
  } catch (e) {
    showStatus(e.message, true);
  } finally {
    teamSelect.disabled = false;
  }
});

saveTeamBtn.addEventListener('click', () => {
  const paste = buildFullPaste();
  if (!paste) { showStatus('No Pokémon added yet.', true); return; }
  const defaultName = teamNameFromSpecies(slotState.map(s => s.name)) || activeTeamName || '';
  const name = window.prompt('Save team as:', defaultName);
  if (!name?.trim()) return;
  activeTeamName = saveTeam(name, paste, codeInput.value.trim());
  deleteTeamBtn.disabled = false;
  rebuildTeamDropdown();
  showStatus(`Saved "${activeTeamName}".`);
});

deleteTeamBtn.addEventListener('click', () => {
  if (!activeTeamName) return;
  if (!window.confirm(`Delete "${activeTeamName}"?`)) return;
  deleteTeam(activeTeamName);
  activeTeamName = null;
  deleteTeamBtn.disabled = true;
  rebuildTeamDropdown();
  showStatus('Team deleted.');
});

rebuildTeamDropdown();

// ── Load a shared team from the URL (?team=<base64>&code=<text>) ───────────────

(async function checkSharedLink() {
  const params    = new URLSearchParams(location.search);
  const teamParam = params.get('team');
  const codeParam = params.get('code');

  if (codeParam) setCode(codeParam);

  if (teamParam) {
    let paste;
    try { paste = decodeURIComponent(escape(atob(teamParam))); }
    catch { showStatus('Shared link is malformed.', true); return; }
    try {
      const count = await importFromPaste(paste);
      showStatus(`${count} Pokémon loaded from shared link.`);
    } catch (e) {
      showStatus(e.message, true);
    }
  }
})();
