import './siteHeader.js';
/**
 * src/historyPage.js
 * Logic for history.html — match history viewer, pattern chart, export.
 */

import {
  loadHistory, deleteRecord,
  loadReasons, saveReasons, DEFAULT_REASONS,
  exportTSV,
} from './matchHistory.js';

// ── State ─────────────────────────────────────────────────────────────────────

let filter = 'all'; // 'all' | 'W' | 'L'

// ── Boot ──────────────────────────────────────────────────────────────────────

render();

document.getElementById('filter-all').addEventListener('click',  () => { filter = 'all'; render(); });
document.getElementById('filter-win').addEventListener('click',  () => { filter = 'W';   render(); });
document.getElementById('filter-loss').addEventListener('click', () => { filter = 'L';   render(); });

document.getElementById('export-btn').addEventListener('click', () => {
  const tsv  = exportTSV();
  const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `kcalc-match-history-${new Date().toISOString().slice(0,10)}.tsv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Manage reasons panel toggle
document.getElementById('manage-reasons-btn').addEventListener('click', () => {
  const panel = document.getElementById('reasons-panel');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  renderReasonsPanel();
});

// ── Main render ───────────────────────────────────────────────────────────────

function render() {
  const all      = loadHistory();
  const wins     = all.filter(r => r.outcome === 'W');
  const losses   = all.filter(r => r.outcome === 'L');
  const filtered = filter === 'W' ? wins : filter === 'L' ? losses : all;

  // Update filter button states
  document.getElementById('filter-all').classList.toggle('active',  filter === 'all');
  document.getElementById('filter-win').classList.toggle('active',  filter === 'W');
  document.getElementById('filter-loss').classList.toggle('active', filter === 'L');

  // Stats
  document.getElementById('stat-wins').textContent   = wins.length;
  document.getElementById('stat-losses').textContent  = losses.length;
  const total = wins.length + losses.length;
  document.getElementById('stat-winrate').textContent =
    total > 0 ? `${Math.round((wins.length / total) * 100)}%` : '—';

  // Pattern bars (always over all losses, not filtered)
  renderPatternBars(losses);

  // Match list
  renderMatchList(filtered);
}

// ── Pattern bars ──────────────────────────────────────────────────────────────

function renderPatternBars(losses) {
  const container = document.getElementById('pattern-bars');
  container.innerHTML = '';

  if (losses.length === 0) {
    container.innerHTML = '<div class="empty-note">No losses recorded yet.</div>';
    return;
  }

  // Count each reason across all losses
  const counts = new Map();
  for (const r of losses) {
    for (const reason of (r.reasons ?? [])) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    container.innerHTML = '<div class="empty-note">No loss reasons tagged yet.</div>';
    return;
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max    = sorted[0][1];

  for (const [reason, count] of sorted) {
    const row = document.createElement('div');
    row.className = 'pattern-row';

    const lbl = document.createElement('div');
    lbl.className = 'pattern-label';
    lbl.textContent = reason;

    const track = document.createElement('div');
    track.className = 'pattern-track';
    const fill = document.createElement('div');
    fill.className = 'pattern-fill';
    fill.style.width = `${(count / max) * 100}%`;
    track.appendChild(fill);

    const countEl = document.createElement('div');
    countEl.className = 'pattern-count';
    countEl.textContent = count;

    row.appendChild(lbl);
    row.appendChild(track);
    row.appendChild(countEl);
    container.appendChild(row);
  }
}

// ── Match list ────────────────────────────────────────────────────────────────

function renderMatchList(records) {
  const container = document.getElementById('match-list');
  container.innerHTML = '';

  if (records.length === 0) {
    container.innerHTML = '<div class="empty-note">No matches recorded yet. Hit "Save Match" in the Battle Tracker after a game.</div>';
    return;
  }

  for (const record of records) {
    container.appendChild(buildMatchCard(record));
  }
}

function buildMatchCard(record) {
  const card = document.createElement('div');
  card.className = 'match-card';

  // Outcome dot
  const dot = document.createElement('div');
  dot.className = `match-dot ${record.outcome === 'W' ? 'win' : 'loss'}`;
  dot.textContent = record.outcome === 'W' ? 'W' : 'L';
  card.appendChild(dot);

  // Info column
  const info = document.createElement('div');
  info.className = 'match-info';

  // Teams row
  const teamsRow = document.createElement('div');
  teamsRow.className = 'match-teams-row';

  const myChip = document.createElement('span');
  myChip.className = 'match-my-team';
  myChip.textContent = record.myTeam?.name || 'My Team';
  teamsRow.appendChild(myChip);

  const vs = document.createElement('span');
  vs.className = 'match-vs';
  vs.textContent = 'vs';
  teamsRow.appendChild(vs);

  const theirChip = document.createElement('span');
  theirChip.className = 'match-their-team';
  theirChip.textContent = record.theirTeam?.name || '—';
  teamsRow.appendChild(theirChip);

  info.appendChild(teamsRow);

  // Their Pokémon chips
  const theirPoke = record.theirTeam?.pokemon ?? [];
  if (theirPoke.length > 0) {
    const pokeRow = document.createElement('div');
    pokeRow.className = 'match-poke-row';
    for (const p of theirPoke) {
      const chip = document.createElement('span');
      chip.className = 'match-poke-chip';
      chip.textContent = p;
      pokeRow.appendChild(chip);
    }
    info.appendChild(pokeRow);
  }

  // Reason tags
  const reasons = record.reasons ?? [];
  if (reasons.length > 0) {
    const reasonRow = document.createElement('div');
    reasonRow.className = 'match-reason-row';
    for (const r of reasons) {
      const tag = document.createElement('span');
      tag.className = 'match-reason-tag';
      tag.textContent = r;
      reasonRow.appendChild(tag);
    }
    info.appendChild(reasonRow);
  }

  // Note
  if (record.note) {
    const note = document.createElement('div');
    note.className = 'match-note';
    note.textContent = `"${record.note}"`;
    info.appendChild(note);
  }

  card.appendChild(info);

  // Meta (date + delete)
  const meta = document.createElement('div');
  meta.className = 'match-meta';

  const dateEl = document.createElement('div');
  dateEl.className = 'match-date';
  dateEl.textContent = record.date ?? '';
  meta.appendChild(dateEl);

  const delBtn = document.createElement('button');
  delBtn.className = 'match-delete-btn';
  delBtn.textContent = '✕';
  delBtn.title = 'Delete this record';
  delBtn.addEventListener('click', () => {
    if (!window.confirm('Delete this match record?')) return;
    deleteRecord(record.id);
    render();
  });
  meta.appendChild(delBtn);

  card.appendChild(meta);
  return card;
}

// ── Reasons panel ─────────────────────────────────────────────────────────────

function renderReasonsPanel() {
  const list = document.getElementById('reasons-list');
  list.innerHTML = '';

  const reasons = loadReasons();
  for (const reason of reasons) {
    const row = document.createElement('div');
    row.className = 'reason-row';
    const name = document.createElement('span');
    name.textContent = reason;
    const del = document.createElement('button');
    del.className = 'reason-del-btn';
    del.textContent = 'Remove';
    del.addEventListener('click', () => {
      const updated = loadReasons().filter(r => r !== reason);
      saveReasons(updated);
      renderReasonsPanel();
    });
    row.appendChild(name);
    row.appendChild(del);
    list.appendChild(row);
  }

  // Add new reason
  const addRow = document.createElement('div');
  addRow.className = 'reason-add-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'reason-add-input';
  input.placeholder = 'New reason…';
  const addBtn = document.createElement('button');
  addBtn.className = 'reason-add-btn';
  addBtn.textContent = 'Add';
  const doAdd = () => {
    const val = input.value.trim();
    if (!val) return;
    const updated = [...loadReasons(), val];
    saveReasons(updated);
    input.value = '';
    renderReasonsPanel();
  };
  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

  const resetBtn = document.createElement('button');
  resetBtn.className = 'reason-reset-btn';
  resetBtn.textContent = 'Reset to defaults';
  resetBtn.addEventListener('click', () => {
    if (!window.confirm('Reset reasons to defaults?')) return;
    saveReasons([...DEFAULT_REASONS]);
    renderReasonsPanel();
  });

  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  list.appendChild(addRow);
  list.appendChild(resetBtn);
}
