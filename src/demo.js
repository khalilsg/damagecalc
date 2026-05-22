import { parseSets } from './parser.js';
import { runAnalysis } from './calcEngine.js';
import { preloadStats } from './smogonStats.js';
import { TEAMS } from './teams.js';
import { initTracker, subscribe, getState } from './battleTracker.js';
import { renderOffense } from './ui/offense.js';
import { renderDefense } from './ui/defense.js';
import { renderOffenseExpanded } from './ui/offenseExpanded.js';
import { renderDefenseExpanded } from './ui/defenseExpanded.js';
import { renderSpeedLadder } from './ui/speedLadder.js';
import { renderSummary } from './ui/summary.js';
import { renderSidebarTracker } from './ui/sidebarTracker.js';

preloadStats();

let analysisData      = null;
let currentPlayerSets = null;
let currentOpponents  = [];
let lastFieldKey      = '';
let reanalyzing       = false;

function fieldKey(state) {
  return `${state.weather}|${state.myScreens.reflect}|${state.myScreens.lightScreen}|${state.opponentScreens.reflect}|${state.opponentScreens.lightScreen}`;
}

async function renderReactive(state) {
  if (!analysisData) return;

  const key = fieldKey(state);
  if (key !== lastFieldKey && !reanalyzing) {
    lastFieldKey = key;
    reanalyzing  = true;
    try {
      analysisData = await runAnalysis(currentPlayerSets, currentOpponents, {
        weather:        state.weather,
        myScreens:      state.myScreens,
        opponentScreens: state.opponentScreens,
      });
      renderSummary(analysisData, document.getElementById('tab-summary'));
      renderOffense(analysisData.offense, document.getElementById('tab-offense'));
    } catch (e) {
      console.warn('Re-analysis failed:', e);
    } finally {
      reanalyzing = false;
    }
  }

  renderSidebarTracker(document.getElementById('battle-tracker'), state, currentPlayerSets);
  renderOffenseExpanded(analysisData.offenseExpanded, document.getElementById('tab-offense-exp'), state);
  renderDefenseExpanded(analysisData.defenseExpanded, document.getElementById('tab-defense-exp'), state);
  renderDefense(analysisData.defense, document.getElementById('tab-defense'), state);
  renderSpeedLadder(analysisData.speed, document.getElementById('tab-speed'), state);
}

// Tab switching
const tabs   = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// Auto-run on load
(async () => {
  const statusEl = document.getElementById('status');
  const errorEl  = document.getElementById('error');

  const blastzam3 = TEAMS.find(t => t.name === 'Blastzam3');
  const sunSand   = TEAMS.find(t => t.name === 'SunSand');

  if (!blastzam3 || !sunSand) {
    errorEl.textContent = 'Demo teams not found.';
    statusEl.textContent = '';
    return;
  }

  let playerSets, opponentNames;
  try {
    playerSets    = parseSets(blastzam3.text);
    opponentNames = parseSets(sunSand.text).map(s => s.name);
  } catch (e) {
    errorEl.textContent = `Parse error: ${e.message}`;
    statusEl.textContent = '';
    return;
  }

  try {
    analysisData = await runAnalysis(playerSets, opponentNames);
  } catch (e) {
    errorEl.textContent = `Calc error: ${e.message}`;
    statusEl.textContent = '';
    return;
  }

  statusEl.textContent = '';
  currentPlayerSets = playerSets;
  currentOpponents  = [...new Set(analysisData.offense.flatMap(o => o.matchups.map(m => m.opponentName)))];
  lastFieldKey      = '';

  subscribe(renderReactive);

  const playerNames = analysisData.offense.map(o => o.playerName);
  initTracker(playerNames, currentOpponents);  // triggers notify → renderReactive

  renderSummary(analysisData, document.getElementById('tab-summary'));
  renderOffense(analysisData.offense, document.getElementById('tab-offense'));
})();
