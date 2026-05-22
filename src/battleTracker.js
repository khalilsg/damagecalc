const ZERO = () => ({ atk: 0, spa: 0, def: 0, spd: 0, spe: 0 });

const state = {
  myStages:        {},  // { pokemonName: { atk, spa, def, spd, spe } }
  opponentStages:  {},  // { pokemonName: { atk, spa, def, spd, spe } }
  opponentMoves:   {},  // { pokemonName: [{ name, calcs, defGrids }] }
  weather:         null, // 'Sun' | 'Rain' | 'Sand' | 'Snow' | null
  myScreens:       { reflect: false, lightScreen: false },
  opponentScreens: { reflect: false, lightScreen: false },
};

const listeners = new Set();

export function subscribe(fn)   { listeners.add(fn); return () => listeners.delete(fn); }
export function getState()      { return state; }

function notify() { listeners.forEach(fn => fn(state)); }

export function initTracker(playerNames, opponentNames) {
  state.myStages       = Object.fromEntries(playerNames.map(n => [n, ZERO()]));
  state.opponentStages = Object.fromEntries(opponentNames.map(n => [n, ZERO()]));
  state.opponentMoves  = Object.fromEntries(opponentNames.map(n => [n, []]));
  state.weather        = null;
  state.myScreens      = { reflect: false, lightScreen: false };
  state.opponentScreens = { reflect: false, lightScreen: false };
  notify();
}

export function adjustMyStage(name, stat, delta) {
  if (!state.myStages[name]) return;
  state.myStages[name][stat] = clamp(state.myStages[name][stat] + delta);
  notify();
}

export function adjustOpponentStage(name, stat, delta) {
  if (!state.opponentStages[name]) return;
  state.opponentStages[name][stat] = clamp(state.opponentStages[name][stat] + delta);
  notify();
}

export function resetMyStages(name) {
  if (state.myStages[name]) { state.myStages[name] = ZERO(); notify(); }
}

export function resetOpponentStages(name) {
  if (state.opponentStages[name]) { state.opponentStages[name] = ZERO(); notify(); }
}

export function addOpponentMove(name, moveName, calcs, defGrids = []) {
  if (!state.opponentMoves[name]) return;
  if (!state.opponentMoves[name].find(m => m.name.toLowerCase() === moveName.toLowerCase())) {
    state.opponentMoves[name].push({ name: moveName, calcs, defGrids });
    notify();
  }
}

export function removeOpponentMove(name, moveName) {
  if (!state.opponentMoves[name]) return;
  state.opponentMoves[name] = state.opponentMoves[name].filter(m => m.name !== moveName);
  notify();
}

// Toggle weather (press same value to clear)
export function setWeather(w) {
  state.weather = state.weather === w ? null : w;
  notify();
}

export function setMyScreen(type, value) {
  state.myScreens[type] = value;
  notify();
}

export function setOpponentScreen(type, value) {
  state.opponentScreens[type] = value;
  notify();
}

function clamp(n) { return Math.max(-6, Math.min(6, n)); }
