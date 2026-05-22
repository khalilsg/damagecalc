const ZERO = () => ({ atk: 0, spa: 0, def: 0, spd: 0, spe: 0 });

const state = {
  myStages:       {},  // { pokemonName: { atk, spa, def, spd, spe } }
  opponentStages: {},  // { pokemonName: { atk, spa, def, spd, spe } }
  opponentMoves:  {},  // { pokemonName: [{ name, calcs }] }
};

const listeners = new Set();

export function subscribe(fn)   { listeners.add(fn); return () => listeners.delete(fn); }
export function getState()      { return state; }

function notify() { listeners.forEach(fn => fn(state)); }

export function initTracker(playerNames, opponentNames) {
  state.myStages       = Object.fromEntries(playerNames.map(n => [n, ZERO()]));
  state.opponentStages = Object.fromEntries(opponentNames.map(n => [n, ZERO()]));
  state.opponentMoves  = Object.fromEntries(opponentNames.map(n => [n, []]));
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

export function addOpponentMove(name, moveName, calcs) {
  if (!state.opponentMoves[name]) return;
  if (!state.opponentMoves[name].find(m => m.name.toLowerCase() === moveName.toLowerCase())) {
    state.opponentMoves[name].push({ name: moveName, calcs });
    notify();
  }
}

export function removeOpponentMove(name, moveName) {
  if (!state.opponentMoves[name]) return;
  state.opponentMoves[name] = state.opponentMoves[name].filter(m => m.name !== moveName);
  notify();
}

function clamp(n) { return Math.max(-6, Math.min(6, n)); }
