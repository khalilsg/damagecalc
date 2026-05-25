/**
 * src/ui/leadSelector.js
 *
 * Lead Selector tab — fully self-contained UI component.
 * Owns its own opponent search, format selector, and result rendering.
 *
 * Usage:
 *   initLeadSelectorTab(container, getYourSets)
 *
 *   getYourSets — zero-arg callback that returns the current parsed player sets
 *                 (or throws if the textarea is empty / invalid)
 */

import { allSpecies, resolveSpeciesName } from '../calcEngine.js';
import { loadChaosData, KNOWN_FORMATS }   from '../leadSelector/chaos.js';
import { scoreLeadPairs, buildThreatMatrix, SKIP_MOVES } from '../leadSelector/score.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

function barColor(score) {
  if (score >= 65) return '#2a7a2a';
  if (score >= 40) return '#b07000';
  return '#a02020';
}

function scoreBar(label, value) {
  const row   = el('div', 'ls-sub-row');
  const lbl   = el('span', 'ls-sub-label', label);
  const track = el('div', 'ls-bar-track');
  const fill  = el('div', 'ls-bar-fill');
  const num   = el('span', 'ls-sub-num', String(value));

  fill.style.width            = `${Math.min(100, value)}%`;
  fill.style.backgroundColor  = barColor(value);
  track.appendChild(fill);
  row.append(lbl, track, num);
  return row;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Initialize the Lead Selector tab.
 *
 * @param {HTMLElement} container   The #tab-lead panel element
 * @param {function}    getYourSets Returns parsed player sets on demand
 */
export function initLeadSelectorTab(container, getYourSets) {
  container.innerHTML = '';

  // ── Static structure ────────────────────────────────────────────────────────
  const wrap      = el('div', 'ls-wrap');
  const inputArea = el('div', 'ls-input-area');
  const resultsEl = el('div', 'ls-results');
  container.append(wrap);
  wrap.append(inputArea, resultsEl);

  // Format selector
  const fmtRow = el('div', 'ls-field');
  fmtRow.append(el('label', 'ls-label', 'Format'));
  const fmtSelect = el('select', 'ls-format-select');
  KNOWN_FORMATS.forEach(f => {
    const o = document.createElement('option');
    o.value       = f.prefix;
    o.textContent = f.label;
    fmtSelect.appendChild(o);
  });
  fmtRow.append(fmtSelect);

  // Opponent search
  const searchRow   = el('div', 'ls-field ls-search-field');
  const searchLabel = el('label', 'ls-label');
  const countSpan   = el('span', 'ls-count', '0 / 6');
  searchLabel.append(document.createTextNode('Opponent Team '), countSpan);
  const searchWrap  = el('div', 'ls-search-wrapper');
  const searchInput = el('input', 'ls-search');
  searchInput.type        = 'text';
  searchInput.placeholder = 'Search Pokémon…';
  searchInput.autocomplete = 'off';
  const dropdown    = el('div', 'ls-dropdown');
  searchWrap.append(searchInput, dropdown);
  const tagsEl      = el('div', 'ls-tags');
  searchRow.append(searchLabel, searchWrap, tagsEl);

  // Run button
  const runBtn  = el('button', 'ls-btn', 'FIND BEST LEADS');
  const errorEl = el('div', 'ls-error');

  inputArea.append(fmtRow, searchRow, runBtn, errorEl);

  // ── Opponent search state ───────────────────────────────────────────────────
  let opponents    = [];   // resolved names
  let dropItems    = [];
  let activeIdx    = -1;

  function updateCount() {
    countSpan.textContent = `${opponents.length} / 6`;
    countSpan.style.color = opponents.length === 6 ? '#2a7a2a' : '#666';
  }

  function renderTags() {
    tagsEl.innerHTML = '';
    if (opponents.length > 0) {
      const clr = el('button', 'clear-btn', 'Clear all');
      clr.addEventListener('click', () => { opponents = []; renderTags(); updateCount(); });
      tagsEl.append(clr);
    }
    opponents.forEach(name => {
      const tag = el('div', 'defender-tag');
      tag.innerHTML = `${name} <button title="Remove">×</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        opponents = opponents.filter(n => n !== name);
        renderTags();
        updateCount();
      });
      tagsEl.append(tag);
    });
  }

  function getMatches(query) {
    return allSpecies.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  }

  function renderDropdown(query) {
    dropdown.innerHTML = '';
    dropItems = [];
    activeIdx = -1;
    if (!query) { dropdown.classList.remove('open'); return; }
    const matches = getMatches(query);
    if (matches.length === 0) { dropdown.classList.remove('open'); return; }
    matches.forEach(name => {
      const item = el('div', 'dropdown-item', name);
      item.addEventListener('mousedown', e => { e.preventDefault(); addOpponent(name); });
      dropdown.appendChild(item);
      dropItems.push(item);
    });
    dropdown.classList.add('open');
  }

  function setActive(idx) {
    dropItems.forEach(i => i.classList.remove('dropdown-active'));
    activeIdx = Math.max(0, Math.min(idx, dropItems.length - 1));
    dropItems[activeIdx]?.classList.add('dropdown-active');
    dropItems[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function addOpponent(name) {
    if (opponents.length >= 6) return;
    let resolved;
    try { resolved = resolveSpeciesName(name); } catch { resolved = name; }
    if (!opponents.includes(resolved)) {
      opponents.push(resolved);
      renderTags();
      updateCount();
    }
    searchInput.value = '';
    dropdown.classList.remove('open');
    dropItems = [];
    activeIdx = -1;
  }

  searchInput.addEventListener('input',  () => renderDropdown(searchInput.value));
  searchInput.addEventListener('focus',  () => { if (searchInput.value) renderDropdown(searchInput.value); });
  searchInput.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(activeIdx < 0 ? 0 : activeIdx + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && dropItems[activeIdx]) addOpponent(dropItems[activeIdx].textContent);
      else { const m = getMatches(searchInput.value); if (m.length > 0) addOpponent(m[0]); }
    }
    else if (e.key === 'Escape') dropdown.classList.remove('open');
  });

  // ── Run button ──────────────────────────────────────────────────────────────
  runBtn.addEventListener('click', async () => {
    errorEl.textContent = '';

    // Validate inputs
    let yourSets;
    try {
      yourSets = getYourSets();
    } catch (e) {
      errorEl.textContent = `Team error: ${e.message}`;
      return;
    }
    if (!yourSets || yourSets.length < 2) {
      errorEl.textContent = 'Paste your team above and click ANALYZE MATCHUP first, or just paste the team — no analysis needed.';
      return;
    }
    if (opponents.length < 2) {
      errorEl.textContent = 'Add at least 2 opponent Pokémon.';
      return;
    }
    if (opponents.length > 6) {
      errorEl.textContent = 'Maximum 6 opponent Pokémon.';
      return;
    }

    runBtn.textContent = 'ANALYZING…';
    runBtn.disabled    = true;
    resultsEl.innerHTML = '';

    let chaosData;
    try {
      chaosData = await loadChaosData(fmtSelect.value);
    } catch (e) {
      errorEl.textContent = `Could not load format data: ${e.message}`;
      runBtn.textContent = 'FIND BEST LEADS';
      runBtn.disabled    = false;
      return;
    }

    let results, threatMatrix;
    try {
      results      = scoreLeadPairs(yourSets, opponents, chaosData);
      threatMatrix = buildThreatMatrix(yourSets, opponents, chaosData);
    } catch (e) {
      errorEl.textContent = `Scoring error: ${e.message}`;
      runBtn.textContent = 'FIND BEST LEADS';
      runBtn.disabled    = false;
      return;
    }

    runBtn.textContent = 'FIND BEST LEADS';
    runBtn.disabled    = false;

    renderResults(resultsEl, results.slice(0, 5), yourSets.length);
    renderThreatMatrix(resultsEl, threatMatrix);
  });
}

// ── Result rendering ──────────────────────────────────────────────────────────

function renderResults(container, results, teamSize) {
  container.innerHTML = '';

  if (results.length === 0) {
    container.append(el('p', 'ls-empty', 'No results.'));
    return;
  }

  const heading = el('div', 'ls-results-heading', `Top ${results.length} Lead Pairs`);
  container.append(heading);

  const grid = el('div', 'ls-cards-grid');
  container.append(grid);

  results.forEach((result, i) => {
    const card = buildCard(result, i + 1, teamSize);
    grid.append(card);
  });
}

// ── Threat matrix rendering ───────────────────────────────────────────────────

const EV_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

function formatEVs(evs) {
  if (!evs) return '';
  return Object.entries(evs)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${EV_LABELS[k] ?? k}`)
    .join(' / ');
}

function pctColor(pct) {
  if (pct >= 100) return '#2a7a2a';
  if (pct >= 50)  return '#b07000';
  return '#888';
}

function renderThreatMatrix(container, threatMatrix) {
  const wrap = el('div', 'tm-wrap');
  wrap.append(el('div', 'tm-heading', 'Opponent Sets & Threat Analysis'));

  const grid = el('div', 'tm-grid');
  for (const entry of threatMatrix) {
    grid.append(buildThreatCard(entry));
  }
  wrap.append(grid);
  container.append(wrap);
}

function buildThreatCard(entry) {
  const card = el('div', 'tm-card');

  // ── Header: species name + item ────────────────────────────────────────────
  const header = el('div', 'tm-card-header');
  header.append(el('span', 'tm-opp-name', entry.name));
  if (entry.item) header.append(el('span', 'tm-opp-item', entry.item));
  card.append(header);

  if (!entry.inChaos) {
    card.append(el('div', 'tm-no-data', 'No chaos data — set unknown'));
    return card;
  }

  // ── Set info: nature + EVs ─────────────────────────────────────────────────
  const evStr  = formatEVs(entry.spread.evs);
  const setStr = entry.spread.nature + (evStr ? ` · ${evStr}` : '');
  card.append(el('div', 'tm-set-info', setStr));

  // ── All moves (chip row) ───────────────────────────────────────────────────
  if (entry.moves.length > 0) {
    const movesRow = el('div', 'tm-moves-row');
    for (const move of entry.moves) {
      const cls = 'tm-move-chip' + (SKIP_MOVES.has(move) ? ' tm-skip' : '');
      movesRow.append(el('span', cls, move));
    }
    card.append(movesRow);
  }

  // ── Their threats ──────────────────────────────────────────────────────────
  card.append(el('div', 'tm-section-head', 'Their Threats'));

  if (entry.threatsOut.length === 0) {
    card.append(el('div', 'tm-no-threats', 'No significant threats to your team'));
  } else {
    const threatsDiv = el('div', 'tm-threats');
    for (const { move, targets } of entry.threatsOut) {
      const row = el('div', 'tm-threat-row');
      row.append(el('span', 'tm-threat-move', move));
      const targetsSpan = el('span', 'tm-targets');
      for (const { mon, pct } of targets) {
        const cls = pct >= 100 ? 'tm-target tm-ohko' : pct >= 50 ? 'tm-target tm-warn' : 'tm-target tm-chip';
        targetsSpan.append(el('span', cls, `${mon} ${Math.round(pct)}%`));
      }
      row.append(targetsSpan);
      threatsDiv.append(row);
    }
    card.append(threatsDiv);
  }

  // ── Your coverage ──────────────────────────────────────────────────────────
  card.append(el('div', 'tm-section-head', 'Your Coverage'));

  const answersDiv = el('div', 'tm-answers');
  for (const { mon, move, pct } of entry.answers) {
    const row = el('div', 'tm-answer-row');
    row.append(el('span', 'tm-answer-mon', mon));

    if (!move) {
      row.append(el('span', 'tm-answer-move tm-no-move', '—'));
      const track = el('div', 'tm-answer-track');
      track.append(el('div', 'tm-answer-fill'));
      row.append(track, el('span', 'tm-answer-pct', '—'));
    } else {
      row.append(el('span', 'tm-answer-move', move));
      const track = el('div', 'tm-answer-track');
      const fill  = el('div', 'tm-answer-fill');
      fill.style.width           = `${Math.min(100, pct)}%`;
      fill.style.backgroundColor = pctColor(pct);
      track.append(fill);
      row.append(track, el('span', 'tm-answer-pct', `${Math.round(pct)}%`));
    }
    answersDiv.append(row);
  }
  card.append(answersDiv);

  return card;
}

// ── Lead pair card rendering ──────────────────────────────────────────────────

function buildCard(result, rank, teamSize) {
  const card = el('div', 'ls-card');

  // ── Header row: rank badge + names + score chip ──────────────────────────
  const header = el('div', 'ls-card-header');
  const badge  = el('span', 'ls-rank', String(rank));
  const names  = el('span', 'ls-names', `${result.monA} + ${result.monB}`);
  const chip   = el('span', 'ls-score-chip', String(result.score));
  chip.style.backgroundColor = barColor(result.score);
  header.append(badge, names, chip);
  card.append(header);

  // ── Score bars ───────────────────────────────────────────────────────────
  const bars = el('div', 'ls-bars');
  bars.append(
    scoreBar('Offense', result.offNorm),
    scoreBar('Defense', result.defNorm),
    scoreBar('Speed',   result.spdNorm),
  );
  card.append(bars);

  // ── Threat / warning rows ────────────────────────────────────────────────
  const details = el('div', 'ls-details');

  if (result.threats.length > 0) {
    const row = el('div', 'ls-detail-row');
    row.innerHTML = `<span class="ls-detail-label">Threatens</span> ${result.threats.join(', ')}`;
    details.append(row);
  }

  if (result.hardCounters.length > 0) {
    const row = el('div', 'ls-detail-row ls-warning');
    row.innerHTML = `<span class="ls-detail-label">⚠ Hard counter</span> ${result.hardCounters.join(', ')}`;
    details.append(row);
  }

  // ── Back pair ────────────────────────────────────────────────────────────
  if (result.backPair && teamSize >= 4) {
    const row = el('div', 'ls-detail-row ls-back-row');
    const coversText = result.backPair.covers.length > 0
      ? ` <span class="ls-covers">(covers ${result.backPair.covers.join(', ')})</span>`
      : '';
    row.innerHTML = `<span class="ls-detail-label">Bring</span> ${result.backPair.monA} + ${result.backPair.monB}${coversText}`;
    details.append(row);
  }

  card.append(details);
  return card;
}
