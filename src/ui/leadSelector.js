/**
 * src/ui/leadSelector.js
 *
 * Lead Selector tab — displays lead pair recommendations computed by main.js.
 * Owns only the format dropdown and result rendering. Inputs and triggering
 * are handled by the top-level ANALYZE MATCHUP button in main.js.
 *
 * Usage:
 *   const leadSelector = initLeadSelectorTab(container);
 *   // later, after analysis:
 *   leadSelector.render(results, teamSize);
 *   leadSelector.showMessage('Some status text');
 */

import { KNOWN_FORMATS } from '../leadSelector/chaos.js';

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

  fill.style.width           = `${Math.min(100, value)}%`;
  fill.style.backgroundColor = barColor(value);
  track.appendChild(fill);
  row.append(lbl, track, num);
  return row;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Initialize the Lead Selector tab.
 * @param {HTMLElement} container  The #tab-lead panel element
 * @returns {{ getFormat, render, showMessage }}
 */
export function initLeadSelectorTab(container) {
  container.innerHTML = '';

  const wrap = el('div', 'ls-wrap');
  container.append(wrap);

  // ── Format selector ─────────────────────────────────────────────────────────
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
  wrap.append(fmtRow);

  // ── Status / placeholder ────────────────────────────────────────────────────
  const statusEl = el('div', 'ls-status', 'Run ANALYZE MATCHUP to generate lead recommendations.');
  wrap.append(statusEl);

  // ── Results area ────────────────────────────────────────────────────────────
  const resultsEl = el('div', 'ls-results');
  wrap.append(resultsEl);

  // ── Controller ──────────────────────────────────────────────────────────────
  return {
    /** Currently selected chaos format prefix. */
    getFormat() { return fmtSelect.value; },

    /** Render lead pair results into the tab. */
    render(results, teamSize) {
      statusEl.style.display = 'none';
      renderResults(resultsEl, results, teamSize);
    },

    /** Show a status / error message and clear results. */
    showMessage(msg) {
      statusEl.textContent   = msg;
      statusEl.style.display = '';
      resultsEl.innerHTML    = '';
    },
  };
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
    grid.append(buildCard(result, i + 1, teamSize));
  });
}

// ── Lead pair card ────────────────────────────────────────────────────────────

function buildCard(result, rank, teamSize) {
  const card = el('div', 'ls-card');

  // Header: rank badge + names + score chip
  const header = el('div', 'ls-card-header');
  const badge  = el('span', 'ls-rank', String(rank));
  const names  = el('span', 'ls-names', `${result.monA} + ${result.monB}`);
  const chip   = el('span', 'ls-score-chip', String(result.score));
  chip.style.backgroundColor = barColor(result.score);
  header.append(badge, names, chip);
  card.append(header);

  // Score bars
  const bars = el('div', 'ls-bars');
  bars.append(
    scoreBar('Offense', result.offNorm),
    scoreBar('Defense', result.defNorm),
    scoreBar('Speed',   result.spdNorm),
  );
  card.append(bars);

  // Details
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
