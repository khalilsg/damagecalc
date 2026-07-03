import './siteHeader.js';
import { gen, computeOhkoThresholds } from './calcEngine.js';
import { getChampionsSpeciesIds, getChampionsMoves, getChampionsMegaForms } from './learnsets.js';

const STAT_LABELS = { atk: 'Atk', spa: 'SpA', def: 'Def' };

// ── Species list (Champions incl. Megas — same pattern as Team Builder) ───────

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

// ── State ─────────────────────────────────────────────────────────────────────

let selectedMon = null;
let legalMoves  = [];
let opponents   = [];

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ── Autocomplete (same pattern as Team Builder) ───────────────────────────────

function initAC({ input, dropdown, getNames, onPick, maxResults = 80, showOnEmpty = false }) {
  let items = [], activeIdx = -1;

  function render(q) {
    const lower = q.toLowerCase();
    const hits = (getNames() ?? []).filter(n => n.toLowerCase().includes(lower)).slice(0, maxResults);
    dropdown.innerHTML = '';
    items = []; activeIdx = -1;
    if (!hits.length || (!q && !showOnEmpty)) { dropdown.classList.remove('open'); return; }
    for (const name of hits) {
      const d = el('div', 'ok-dd-item', name);
      d.addEventListener('mousedown', e => { e.preventDefault(); pick(name); });
      dropdown.append(d);
      items.push(d);
    }
    dropdown.classList.add('open');
  }

  function setActive(idx) {
    items.forEach(i => i.classList.remove('ok-dd-active'));
    activeIdx = Math.max(0, Math.min(idx, items.length - 1));
    items[activeIdx]?.classList.add('ok-dd-active');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function pick(name) {
    input.value = '';
    dropdown.classList.remove('open');
    items = []; activeIdx = -1;
    onPick(name);
  }

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('focus', () => render(input.value));
  input.addEventListener('blur',  () => setTimeout(() => dropdown.classList.remove('open'), 150));
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

// ── Elements ──────────────────────────────────────────────────────────────────

const monInput   = document.getElementById('ok-mon-input');
const monDd      = document.getElementById('ok-mon-dd');
const itemInput  = document.getElementById('ok-item-input');
const moveInput  = document.getElementById('ok-move-input');
const moveDd     = document.getElementById('ok-move-dd');
const oppInput   = document.getElementById('ok-opp-input');
const oppDd      = document.getElementById('ok-opp-dd');
const chipsEl    = document.getElementById('ok-opp-chips');
const calcBtn    = document.getElementById('ok-calc-btn');
const errorEl    = document.getElementById('ok-error');

function updateBtn() {
  calcBtn.disabled = !(selectedMon && moveInput.value.trim() && opponents.length > 0);
}

// ── My Pokémon ────────────────────────────────────────────────────────────────

initAC({
  input: monInput,
  dropdown: monDd,
  getNames: () => (allChampSpecies ?? []).map(sp => sp.name),
  onPick: async name => {
    selectedMon = name;
    monInput.value = name;
    moveInput.value = '';
    moveInput.disabled = true;
    moveInput.placeholder = 'Loading moves…';
    legalMoves = [];
    updateBtn();
    try {
      const moveIds = await getChampionsMoves(name);
      legalMoves = moveIds.map(id => gen.moves.get(id)?.name).filter(Boolean).sort();
      moveInput.disabled = false;
      moveInput.placeholder = 'Search move…';
    } catch {
      moveInput.placeholder = 'Failed to load moves';
    }
  },
});

// ── Move ──────────────────────────────────────────────────────────────────────

initAC({
  input: moveInput,
  dropdown: moveDd,
  getNames: () => legalMoves,
  showOnEmpty: true,
  onPick: name => {
    moveInput.value = name;
    updateBtn();
  },
});
moveInput.addEventListener('input', updateBtn);

// ── Opponents ─────────────────────────────────────────────────────────────────

function renderChips() {
  chipsEl.innerHTML = '';
  for (const name of opponents) {
    const chip = el('span', 'ok-chip');
    chip.append(document.createTextNode(name + ' '));
    const btn = el('button', 'ok-chip-remove', '×');
    btn.title = 'Remove';
    btn.addEventListener('click', () => {
      opponents = opponents.filter(o => o !== name);
      renderChips();
      updateBtn();
    });
    chip.append(btn);
    chipsEl.append(chip);
  }
}

initAC({
  input: oppInput,
  dropdown: oppDd,
  getNames: () => (allChampSpecies ?? []).map(sp => sp.name),
  onPick: name => {
    if (!opponents.includes(name)) opponents.push(name);
    renderChips();
    updateBtn();
  },
});

// ── Results rendering ─────────────────────────────────────────────────────────

const ARCH_DESC = {
  'Max SpDef':   'Calm · 32 HP / 32 SpD',
  'Max Def':     'Bold · 32 HP / 32 Def',
  'Min Defense': 'Serious · 0 EVs',
};

function archHeader(label) {
  return label === 'Min Defense' ? `Neutral (${ARCH_DESC[label]})` : `${label} (${ARCH_DESC[label]})`;
}

function buildCell(row, data) {
  const td = el('td');

  if (row.noDamage) {
    td.append(el('div', 'ok-needed ok-none', 'No damage'));
    td.append(el('div', 'ok-hint', 'Move deals no damage to this Pokémon'));
    return td;
  }

  if (row.needed === null) {
    td.append(el('div', 'ok-needed ok-no', 'Impossible'));
    td.append(el('div', 'ok-hint', `No OHKO even at ${999} ${STAT_LABELS[data.statKey]}`));
    return td;
  }

  const statLabel = STAT_LABELS[data.statKey];

  if (!row.possible) {
    td.append(el('div', 'ok-needed ok-no', `${row.needed} ${statLabel}`));
    td.append(el('div', 'ok-hint', `Impossible — ${data.playerName} maxes out at ${data.maxStat}`));
    return td;
  }

  td.append(el('div', 'ok-needed ok-yes', `${row.needed} ${statLabel}`));
  if (row.needed <= data.minStat) {
    td.append(el('div', 'ok-hint', 'Guaranteed with any spread'));
  } else if (row.investment) {
    td.append(el('div', 'ok-hint', `${row.investment.nature} · ${row.investment.evs} EV${row.investment.evs === 1 ? '' : 's'}`));
  }
  return td;
}

function renderResults(data) {
  const statLabel = STAT_LABELS[data.statKey];

  // Summary bar
  const summary = document.getElementById('ok-summary');
  summary.innerHTML = '';
  const catLabel = data.category === 'special' ? 'Special' : 'Physical';
  const moveBit = el('span');
  moveBit.append(el('b', null, data.move));
  moveBit.append(document.createTextNode(` — ${catLabel}, scales with ${statLabel}`));
  summary.append(moveBit);
  const rangeBit = el('span');
  rangeBit.append(el('b', null, data.playerName));
  rangeBit.append(document.createTextNode(` ${statLabel} range at Lv 50: ${data.minStat}–${data.maxStat}`));
  summary.append(rangeBit);
  summary.append(el('div', 'ok-note', 'Assumes default ability, level 50, full HP, no boosts, neutral field. EVs shown on the Champions 0–32 scale.'));

  // Table header
  const theadRow = document.getElementById('ok-thead-row');
  theadRow.innerHTML = '';
  theadRow.append(el('th', null, 'Opponent'));
  for (const row of data.results[0]?.rows ?? []) {
    theadRow.append(el('th', null, archHeader(row.archetype)));
  }

  // Rows
  const tbody = document.getElementById('ok-tbody');
  tbody.innerHTML = '';
  for (const { opponentName, rows } of data.results) {
    const tr = el('tr');
    tr.append(el('td', 'ok-td-name', opponentName));
    for (const row of rows) tr.append(buildCell(row, data));
    tbody.append(tr);
  }

  const wrap = document.getElementById('ok-results');
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Calculate ─────────────────────────────────────────────────────────────────

calcBtn.addEventListener('click', () => {
  errorEl.textContent = '';
  const move = moveInput.value.trim();
  if (!selectedMon || !move || opponents.length === 0) return;

  calcBtn.disabled = true;
  calcBtn.textContent = 'CALCULATING…';

  // Yield a frame so the button state paints before the synchronous calc burst.
  requestAnimationFrame(() => setTimeout(() => {
    try {
      const data = computeOhkoThresholds(
        { name: selectedMon, item: itemInput.value.trim(), move },
        opponents
      );
      renderResults(data);
    } catch (e) {
      errorEl.textContent = e.message;
      document.getElementById('ok-results').style.display = 'none';
    } finally {
      calcBtn.textContent = 'Calculate';
      updateBtn();
    }
  }, 0));
});

// ── Boot ──────────────────────────────────────────────────────────────────────

ensureSpeciesList(); // pre-fetch so autocomplete is instant
