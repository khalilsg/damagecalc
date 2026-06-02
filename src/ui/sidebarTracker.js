import {
  adjustMyStage, adjustOpponentStage,
  resetMyStages, resetOpponentStages,
  addOpponentMove, removeOpponentMove,
  setWeather, setTerrain, setMyScreen, setOpponentScreen,
  setMyFriendGuard, setOpponentFriendGuard,
  toggleMyHelpingHand,
  removeMyPokemon, removeOpponentPokemon,
} from '../battleTracker.js';
import { computeIncomingMove, computeDefenseExpGrid } from '../calcEngine.js';
import { loadHistory } from '../matchHistory.js';

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

const TERRAIN_OPTIONS = [
  { label: 'Electric', value: 'Electric' },
  { label: 'Grassy',   value: 'Grassy'   },
  { label: 'Misty',    value: 'Misty'    },
  { label: 'Psychic',  value: 'Psychic'  },
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
    container.appendChild(makeMyCard(name, stages, state.myHelpingHand?.[name] ?? false));
  }

  appendSection(container, 'Opponents');
  for (const [name, stages] of Object.entries(state.opponentStages)) {
    container.appendChild(makeOpponentCard(name, stages, state.opponentMoves[name] ?? [], playerSets, state));
  }

  // ── Save Match zone ─────────────────────────────────────────────
  const saveZone = el('div', 'save-match-zone');
  const saveBtn  = el('button', 'save-match-btn');
  saveBtn.innerHTML = '💾 Save Match';
  saveBtn.addEventListener('click', () => {
    container.dispatchEvent(new CustomEvent('save-match-click', { bubbles: true }));
  });
  saveZone.appendChild(saveBtn);

  const count = loadHistory().length;
  if (count > 0) {
    const countEl = el('div', 'save-match-count');
    countEl.textContent = `${count} match${count === 1 ? '' : 'es'} saved`;
    saveZone.appendChild(countEl);
  }
  container.appendChild(saveZone);
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

  // Terrain
  const tLabel = el('div', 'field-row-label');
  tLabel.textContent = 'Terrain';
  wrap.appendChild(tLabel);

  const tBtns = el('div', 'field-btn-row');
  for (const { label, value } of TERRAIN_OPTIONS) {
    const btn = el('button', `field-btn terrain-btn terrain-${value.toLowerCase()}${state.terrain === value ? ' active' : ''}`);
    btn.textContent = label;
    btn.addEventListener('click', () => setTerrain(value));
    tBtns.appendChild(btn);
  }
  wrap.appendChild(tBtns);

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

  // My Friend Guard
  const myFgLabel = el('div', 'field-row-label');
  myFgLabel.textContent = 'My Side';
  wrap.appendChild(myFgLabel);
  const myFgRow = el('div', 'field-btn-row');
  const myFgBtn = el('button', `field-btn${state.myFriendGuard ? ' active' : ''}`);
  myFgBtn.textContent = 'Friend Guard';
  myFgBtn.title = 'Partner has Friend Guard — halves damage I take';
  myFgBtn.addEventListener('click', () => setMyFriendGuard(!state.myFriendGuard));
  myFgRow.appendChild(myFgBtn);
  wrap.appendChild(myFgRow);

  // Opponent Friend Guard
  const oppFgLabel = el('div', 'field-row-label');
  oppFgLabel.textContent = 'Opp Side';
  wrap.appendChild(oppFgLabel);
  const oppFgRow = el('div', 'field-btn-row');
  const oppFgBtn = el('button', `field-btn${state.opponentFriendGuard ? ' active' : ''}`);
  oppFgBtn.textContent = 'Friend Guard';
  oppFgBtn.title = 'Opponent partner has Friend Guard — halves damage they take';
  oppFgBtn.addEventListener('click', () => setOpponentFriendGuard(!state.opponentFriendGuard));
  oppFgRow.appendChild(oppFgBtn);
  wrap.appendChild(oppFgRow);

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

function makeMyCard(name, stages, hasHH) {
  const card = el('div', 'tracker-card');
  card.appendChild(makeCardHeader(name,
    () => resetMyStages(name),
    () => removeMyPokemon(name),
  ));
  for (const { label, key } of STATS) {
    card.appendChild(makeStatRow(label, stages[key] ?? 0,
      () => adjustMyStage(name, key, -1),
      () => adjustMyStage(name, key, +1),
    ));
  }

  // Helping Hand toggle
  const footer = el('div', 'card-footer-row');
  const hhBtn = el('button', `hh-btn${hasHH ? ' active' : ''}`);
  hhBtn.textContent = 'Helping Hand';
  hhBtn.title = hasHH ? 'Helping Hand active (+50% damage) — click to remove' : 'Toggle Helping Hand for this turn';
  hhBtn.addEventListener('click', () => toggleMyHelpingHand(name));
  footer.appendChild(hhBtn);
  card.appendChild(footer);

  return card;
}

function makeOpponentCard(name, stages, trackedMoves, playerSets, state) {
  const card = el('div', 'tracker-card');
  card.appendChild(makeCardHeader(name,
    () => resetOpponentStages(name),
    () => removeOpponentPokemon(name),
  ));

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
        weather:         state.weather,
        terrain:         state.terrain,
        myScreens:       state.myScreens,
        opponentScreens: state.opponentScreens,
        myFriendGuard:   state.myFriendGuard,
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

function makeCardHeader(name, onReset, onKO) {
  const header = el('div', 'tracker-card-header');
  const nameEl = el('span', 'tracker-poke-name');
  nameEl.textContent = name;
  const resetBtn = el('button', 'tracker-reset-btn');
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', onReset);
  const koBtn = el('button', 'ko-btn');
  koBtn.textContent = '✕';
  koBtn.title = 'KO — remove from tracker';
  koBtn.addEventListener('click', onKO);
  header.appendChild(nameEl);
  header.appendChild(resetBtn);
  header.appendChild(koBtn);
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
