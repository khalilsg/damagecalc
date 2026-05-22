import {
  adjustMyStage, adjustOpponentStage,
  resetMyStages, resetOpponentStages,
  addOpponentMove, removeOpponentMove,
  setWeather, setMyScreen, setOpponentScreen,
} from '../battleTracker.js';
import { computeIncomingMove, computeDefenseExpGrid } from '../calcEngine.js';

const STATS = [
  { label: 'Atk', key: 'atk' },
  { label: 'SpA', key: 'spa' },
  { label: 'Def', key: 'def' },
  { label: 'SpD', key: 'spd' },
  { label: 'Spe', key: 'spe' },
];

const WEATHER_OPTIONS = [
  { label: 'Sun',  value: 'Sun'  },
  { label: 'Rain', value: 'Rain' },
  { label: 'Sand', value: 'Sand' },
  { label: 'Snow', value: 'Snow' },
];

export function renderSidebarTracker(container, state, playerSets) {
  container.innerHTML = '';

  const hasData = Object.keys(state.myStages).length > 0;

  // ---- Field conditions (always shown if tracker is initialized) ----
  if (hasData) {
    container.appendChild(makeFieldControls(state));
  }

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
    container.appendChild(makeOpponentCard(name, stages, state.opponentMoves[name] ?? [], playerSets, state));
  }
}

function makeFieldControls(state) {
  const wrap = el('div', 'field-controls');

  // Weather
  const wLabel = el('div', 'field-row-label');
  wLabel.textContent = 'Weather';
  wrap.appendChild(wLabel);

  const wBtns = el('div', 'field-btn-row');
  for (const { label, value } of WEATHER_OPTIONS) {
    const btn = el('button', `field-btn${state.weather === value ? ' active' : ''}`);
    btn.textContent = label;
    btn.addEventListener('click', () => setWeather(value));
    wBtns.appendChild(btn);
  }
  wrap.appendChild(wBtns);

  // My screens
  const myLabel = el('div', 'field-row-label');
  myLabel.textContent = 'My Screens';
  wrap.appendChild(myLabel);
  wrap.appendChild(makeScreenRow(state.myScreens, (type, val) => setMyScreen(type, val)));

  // Opponent screens
  const oppLabel = el('div', 'field-row-label');
  oppLabel.textContent = 'Opp Screens';
  wrap.appendChild(oppLabel);
  wrap.appendChild(makeScreenRow(state.opponentScreens, (type, val) => setOpponentScreen(type, val)));

  return wrap;
}

function makeScreenRow(screens, onChange) {
  const row = el('div', 'field-btn-row');
  for (const [type, label] of [['reflect', 'Reflect'], ['lightScreen', 'Light Screen']]) {
    const btn = el('button', `field-btn${screens[type] ? ' active' : ''}`);
    btn.textContent = label;
    btn.addEventListener('click', () => onChange(type, !screens[type]));
    row.appendChild(btn);
  }
  return row;
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

function makeOpponentCard(name, stages, trackedMoves, playerSets, state) {
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
      const fieldOptions = {
        weather:        state.weather,
        myScreens:      state.myScreens,
        opponentScreens: state.opponentScreens,
      };
      const calcs = await computeIncomingMove(moveName, name, playerSets, fieldOptions);
      const defGrids = (playerSets ?? []).flatMap(set => {
        const g = computeDefenseExpGrid(moveName, name, set, fieldOptions);
        return g ? [g] : [];
      });
      addOpponentMove(name, moveName, calcs, defGrids);
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
