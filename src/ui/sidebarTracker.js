import {
  adjustMyStage, adjustOpponentStage,
  resetMyStages, resetOpponentStages,
  addOpponentMove, removeOpponentMove,
} from '../battleTracker.js';
import { computeIncomingMove } from '../calcEngine.js';

const STATS = [
  { label: 'Atk', key: 'atk' },
  { label: 'SpA', key: 'spa' },
  { label: 'Def', key: 'def' },
  { label: 'SpD', key: 'spd' },
  { label: 'Spe', key: 'spe' },
];

export function renderSidebarTracker(container, state, playerSets) {
  container.innerHTML = '';

  const hasData = Object.keys(state.myStages).length > 0;
  if (!hasData) {
    const placeholder = el('p', 'tracker-placeholder');
    placeholder.textContent = 'Run an analysis to start tracking.';
    container.appendChild(placeholder);
    return;
  }

  appendSection(container, 'My Team');
  for (const [name, stages] of Object.entries(state.myStages)) {
    container.appendChild(makeMyCard(name, stages));
  }

  appendSection(container, 'Opponents');
  for (const [name, stages] of Object.entries(state.opponentStages)) {
    container.appendChild(makeOpponentCard(name, stages, state.opponentMoves[name] ?? [], playerSets));
  }
}

function appendSection(container, title) {
  const h = el('div', 'tracker-section-label');
  h.textContent = title;
  container.appendChild(h);
}

function makeMyCard(name, stages) {
  const card = el('div', 'tracker-card');
  card.appendChild(makeCardHeader(name, () => resetMyStages(name)));
  for (const { label, key } of STATS) {
    card.appendChild(makeStatRow(label, stages[key] ?? 0,
      () => adjustMyStage(name, key, -1),
      () => adjustMyStage(name, key, +1),
    ));
  }
  return card;
}

function makeOpponentCard(name, stages, trackedMoves, playerSets) {
  const card = el('div', 'tracker-card');
  card.appendChild(makeCardHeader(name, () => resetOpponentStages(name)));

  for (const { label, key } of STATS) {
    card.appendChild(makeStatRow(label, stages[key] ?? 0,
      () => adjustOpponentStage(name, key, -1),
      () => adjustOpponentStage(name, key, +1),
    ));
  }

  // Moves section
  const movesLabel = el('div', 'moves-section-label');
  movesLabel.textContent = 'Moves used:';
  card.appendChild(movesLabel);

  if (trackedMoves.length === 0) {
    const empty = el('div', 'moves-empty');
    empty.textContent = 'None logged';
    card.appendChild(empty);
  } else {
    for (const { name: moveName } of trackedMoves) {
      const tag = el('div', 'move-tag');
      const nameSpan = el('span');
      nameSpan.textContent = moveName;
      const rmBtn = el('button', 'move-remove-btn');
      rmBtn.textContent = '×';
      rmBtn.title = 'Remove';
      rmBtn.addEventListener('click', () => removeOpponentMove(name, moveName));
      tag.appendChild(nameSpan);
      tag.appendChild(rmBtn);
      card.appendChild(tag);
    }
  }

  // Move input row
  const inputRow = el('div', 'move-input-row');
  const input = el('input', 'move-input');
  input.type = 'text';
  input.placeholder = 'e.g. Shadow Ball';

  const logBtn = el('button', 'move-log-btn');
  logBtn.textContent = 'Log';

  const doLog = async () => {
    const moveName = input.value.trim();
    if (!moveName) return;
    logBtn.textContent = '…';
    logBtn.disabled = true;
    try {
      const calcs = await computeIncomingMove(moveName, name, playerSets);
      addOpponentMove(name, moveName, calcs);
      input.value = '';
    } catch (e) {
      console.warn('Could not log move:', e.message);
    } finally {
      logBtn.textContent = 'Log';
      logBtn.disabled = false;
    }
  };

  logBtn.addEventListener('click', doLog);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doLog(); });
  inputRow.appendChild(input);
  inputRow.appendChild(logBtn);
  card.appendChild(inputRow);

  return card;
}

function makeCardHeader(name, onReset) {
  const header = el('div', 'tracker-card-header');
  const nameEl = el('span', 'tracker-poke-name');
  nameEl.textContent = name;
  const resetBtn = el('button', 'tracker-reset-btn');
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', onReset);
  header.appendChild(nameEl);
  header.appendChild(resetBtn);
  return header;
}

function makeStatRow(label, value, onDec, onInc) {
  const row = el('div', 'stat-row');
  const lbl = el('span', 'stat-label');
  lbl.textContent = label;
  const dec = el('button', 'stage-sm-btn');
  dec.textContent = '−';
  dec.addEventListener('click', onDec);
  const valEl = el('span', value > 0 ? 'stage-val pos' : value < 0 ? 'stage-val neg' : 'stage-val');
  valEl.textContent = value > 0 ? `+${value}` : `${value}`;
  const inc = el('button', 'stage-sm-btn');
  inc.textContent = '+';
  inc.addEventListener('click', onInc);
  row.appendChild(lbl);
  row.appendChild(dec);
  row.appendChild(valEl);
  row.appendChild(inc);
  return row;
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
