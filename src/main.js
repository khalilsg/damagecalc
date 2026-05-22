import { parseSets } from './parser.js';
import { runAnalysis, resolveSpeciesName, allSpecies } from './calcEngine.js';
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
let currentOpponents  = [];  // resolved names
let unsubscribe       = null;
let lastFieldKey      = '';
let reanalyzing       = false;

function fieldKey(state) {
  return `${state.weather}|${state.myScreens.reflect}|${state.myScreens.lightScreen}|${state.opponentScreens.reflect}|${state.opponentScreens.lightScreen}`;
}

async function renderReactive(state) {
  if (!analysisData) return;

  // Re-run full analysis when weather or screens change
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

// --- Teams dropdown ---
const teamSelect = document.getElementById('team-select');
TEAMS.forEach(t => {
  const opt = document.createElement('option');
  opt.value = t.name;
  opt.textContent = t.name;
  teamSelect.appendChild(opt);
});
teamSelect.addEventListener('change', () => {
  const team = TEAMS.find(t => t.name === teamSelect.value);
  if (team) document.getElementById('team-input').value = team.text;
  teamSelect.value = '';
});

// --- Tab switching ---
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

function switchTab(id) {
  tabs.forEach(t => t.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${id}"]`).classList.add('active');
  document.getElementById(id).classList.add('active');
}

// --- Defender dropdown with arrow-key navigation ---
const defenderSearch = document.getElementById('defender-search');
const dropdown       = document.getElementById('dropdown');
const selectedEl     = document.getElementById('selected-defenders');
let selectedDefenders = [];
let dropdownItems = [];
let activeIndex = -1;

function getMatches(query) {
  return allSpecies.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
}

function renderDropdown(query) {
  const matches = getMatches(query);
  dropdown.innerHTML = '';
  dropdownItems = [];
  activeIndex = -1;
  if (matches.length === 0) { dropdown.classList.remove('open'); return; }
  matches.forEach(name => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = name;
    item.addEventListener('mousedown', e => { e.preventDefault(); addDefender(name); });
    dropdown.appendChild(item);
    dropdownItems.push(item);
  });
  dropdown.classList.add('open');
}

function setActiveItem(index) {
  dropdownItems.forEach(i => i.classList.remove('dropdown-active'));
  activeIndex = Math.max(0, Math.min(index, dropdownItems.length - 1));
  dropdownItems[activeIndex]?.classList.add('dropdown-active');
  dropdownItems[activeIndex]?.scrollIntoView({ block: 'nearest' });
}

function addDefender(name) {
  if (!selectedDefenders.includes(name)) {
    selectedDefenders.push(name);
    renderTags();
  }
  defenderSearch.value = '';
  dropdown.classList.remove('open');
  dropdownItems = [];
  activeIndex = -1;
}

function renderTags() {
  selectedEl.innerHTML = '';
  if (selectedDefenders.length > 0) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => { selectedDefenders = []; renderTags(); });
    selectedEl.appendChild(clearBtn);
  }
  selectedDefenders.forEach(name => {
    const tag = document.createElement('div');
    tag.className = 'defender-tag';
    tag.innerHTML = `${name} <button title="Remove">×</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      selectedDefenders = selectedDefenders.filter(d => d !== name);
      renderTags();
    });
    selectedEl.appendChild(tag);
  });
}

defenderSearch.addEventListener('input',  () => renderDropdown(defenderSearch.value));
defenderSearch.addEventListener('focus',  () => { if (defenderSearch.value) renderDropdown(defenderSearch.value); });
defenderSearch.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
defenderSearch.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActiveItem(activeIndex < 0 ? 0 : activeIndex + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActiveItem(activeIndex - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0 && dropdownItems[activeIndex]) {
      addDefender(dropdownItems[activeIndex].textContent);
    } else {
      const matches = getMatches(defenderSearch.value);
      if (matches.length > 0) addDefender(matches[0]);
    }
  } else if (e.key === 'Escape') {
    dropdown.classList.remove('open');
  }
});

// --- Calculate ---
document.getElementById('calc-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  const teamText = document.getElementById('team-input').value.trim();
  if (!teamText) { errorEl.textContent = 'Please paste or select a team.'; return; }
  if (selectedDefenders.length === 0) { errorEl.textContent = 'Please add at least one opponent.'; return; }

  let playerSets;
  try {
    playerSets = parseSets(teamText);
  } catch (e) {
    errorEl.textContent = `Parse error: ${e.message}`;
    return;
  }

  const btn = document.getElementById('calc-btn');
  btn.textContent = 'ANALYZING…';
  btn.disabled = true;

  try {
    analysisData = await runAnalysis(playerSets, selectedDefenders);
  } catch (e) {
    errorEl.textContent = `Calc error: ${e.message}`;
    btn.textContent = 'ANALYZE MATCHUP';
    btn.disabled = false;
    return;
  }

  btn.textContent = 'ANALYZE MATCHUP';
  btn.disabled = false;

  currentPlayerSets = playerSets;
  currentOpponents  = [...new Set(analysisData.offense.flatMap(o => o.matchups.map(m => m.opponentName)))];
  lastFieldKey      = '';  // reset so field controls take effect on next change

  if (unsubscribe) unsubscribe();
  unsubscribe = subscribe(renderReactive);

  const playerNames = analysisData.offense.map(o => o.playerName);
  initTracker(playerNames, currentOpponents);  // triggers notify → renderReactive

  renderSummary(analysisData, document.getElementById('tab-summary'));
  renderOffense(analysisData.offense, document.getElementById('tab-offense'));

  switchTab('tab-summary');
});
