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
import { renderMatchupLookup } from './ui/matchupLookup.js';

preloadStats();

let analysisData      = null;
let currentPlayerSets = null;
let currentOpponents  = [];  // resolved names
let unsubscribe       = null;
let lastFieldKey      = '';
let reanalyzing       = false;

function fieldKey(state) {
  const hhStr = Object.entries(state.myHelpingHand ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort()
    .join(',');
  return [
    state.weather,
    state.myScreens.reflect, state.myScreens.lightScreen,
    state.opponentScreens.reflect, state.opponentScreens.lightScreen,
    state.myFriendGuard, state.opponentFriendGuard,
    hhStr,
  ].join('|');
}

// Filter analysis data to only the Pokémon still active in the tracker (not KO'd).
function filterByActive(data, state) {
  if (!data) return data;
  const myActive  = new Set(Object.keys(state.myStages));
  const oppActive = new Set(Object.keys(state.opponentStages));
  const filterSections = arr => arr
    .filter(s => myActive.has(s.playerName))
    .map(s => ({ ...s, matchups: s.matchups.filter(m => oppActive.has(m.opponentName)) }));
  return {
    ...data,
    offense:         filterSections(data.offense),
    offenseExpanded: filterSections(data.offenseExpanded),
    defense:         filterSections(data.defense),
    defenseExpanded: filterSections(data.defenseExpanded),
    speed:           data.speed.filter(s =>
      myActive.has(s.playerName) && oppActive.has(s.opponentName)
    ),
  };
}

async function renderReactive(state) {
  if (!analysisData) return;

  // Re-run full analysis when weather, screens, Friend Guard, or HH changes
  const key = fieldKey(state);
  if (key !== lastFieldKey && !reanalyzing) {
    lastFieldKey = key;
    reanalyzing  = true;
    try {
      analysisData = await runAnalysis(currentPlayerSets, currentOpponents, {
        weather:             state.weather,
        myScreens:           state.myScreens,
        opponentScreens:     state.opponentScreens,
        myFriendGuard:       state.myFriendGuard,
        opponentFriendGuard: state.opponentFriendGuard,
        myHelpingHand:       state.myHelpingHand,
      });
    } catch (e) {
      console.warn('Re-analysis failed:', e);
    } finally {
      reanalyzing = false;
    }
  }

  // Filter to active (non-KO'd) Pokémon before rendering all tabs
  const filtered = filterByActive(analysisData, state);
  renderSummary(filtered, document.getElementById('tab-summary'));
  renderOffense(filtered.offense, filtered.offenseExpanded, document.getElementById('tab-offense'), state);
  renderSidebarTracker(document.getElementById('battle-tracker'), state, currentPlayerSets);
  renderMatchupLookup(filtered, document.getElementById('tab-matchup'), state);
  renderOffenseExpanded(filtered.offenseExpanded, document.getElementById('tab-offense-exp'), state);
  renderDefenseExpanded(filtered.defenseExpanded, document.getElementById('tab-defense-exp'), state);
  renderDefense(filtered.defense, filtered.defenseExpanded, document.getElementById('tab-defense'), state);
  renderSpeedLadder(filtered.speed, document.getElementById('tab-speed'), state);
}

// --- Teams dropdown + persistent slots ---

const teamSelect = document.getElementById('team-select');
const teamInput  = document.getElementById('team-input');
const saveBtn    = document.getElementById('team-save-btn');
const shareBtn   = document.getElementById('team-share-btn');
const deleteBtn  = document.getElementById('team-delete-btn');

const STORAGE_KEY = 'kcalc_teams';
let activeSlotName = null;  // name of the currently loaded saved slot (null = none)

function getSavedTeams() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function setSavedTeams(teams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function rebuildTeamDropdown() {
  teamSelect.innerHTML = '<option value="" disabled selected>Load a team…</option>';
  if (TEAMS.length > 0) {
    const g = document.createElement('optgroup');
    g.label = 'Presets';
    TEAMS.forEach(t => {
      const o = document.createElement('option');
      o.value = `preset:${t.name}`;
      o.textContent = t.name;
      g.appendChild(o);
    });
    teamSelect.appendChild(g);
  }
  const saved = getSavedTeams();
  if (saved.length > 0) {
    const g = document.createElement('optgroup');
    g.label = 'My Teams';
    saved.forEach(t => {
      const o = document.createElement('option');
      o.value = `saved:${t.name}`;
      o.textContent = t.name;
      g.appendChild(o);
    });
    teamSelect.appendChild(g);
  }
}

teamSelect.addEventListener('change', () => {
  const val = teamSelect.value;
  teamSelect.value = '';
  if (val.startsWith('preset:')) {
    const team = TEAMS.find(t => t.name === val.slice(7));
    if (team) teamInput.value = team.text;
    activeSlotName = null;
    deleteBtn.disabled = true;
  } else if (val.startsWith('saved:')) {
    const name = val.slice(6);
    const team = getSavedTeams().find(t => t.name === name);
    if (team) teamInput.value = team.text;
    activeSlotName = name;
    deleteBtn.disabled = false;
  }
});

// Save
saveBtn.addEventListener('click', () => {
  const text = teamInput.value.trim();
  if (!text) return;
  const name = window.prompt('Save team as:', activeSlotName ?? '');
  if (!name?.trim()) return;
  const trimmed = name.trim();
  const teams = getSavedTeams().filter(t => t.name !== trimmed);
  teams.unshift({ name: trimmed, text, savedAt: Date.now() });
  setSavedTeams(teams);
  activeSlotName = trimmed;
  deleteBtn.disabled = false;
  rebuildTeamDropdown();
});

// Share
shareBtn.addEventListener('click', () => {
  const text = teamInput.value.trim();
  if (!text) return;
  const encoded = btoa(unescape(encodeURIComponent(text)));
  const url = `${location.origin}${location.pathname}?team=${encoded}`;
  navigator.clipboard.writeText(url)
    .then(() => {
      shareBtn.textContent = 'Copied!';
      shareBtn.classList.add('success');
      setTimeout(() => { shareBtn.textContent = 'Share'; shareBtn.classList.remove('success'); }, 2000);
    })
    .catch(() => window.prompt('Copy this link:', url));
});

// Delete
deleteBtn.addEventListener('click', () => {
  if (!activeSlotName) return;
  if (!window.confirm(`Delete "${activeSlotName}"?`)) return;
  setSavedTeams(getSavedTeams().filter(t => t.name !== activeSlotName));
  activeSlotName = null;
  deleteBtn.disabled = true;
  rebuildTeamDropdown();
});

// On load: decode ?team= param if present
(function checkUrlTeam() {
  const param = new URLSearchParams(location.search).get('team');
  if (!param) return;
  try { teamInput.value = decodeURIComponent(escape(atob(param))); }
  catch { /* ignore malformed */ }
})();

rebuildTeamDropdown();

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
  initTracker(playerNames, currentOpponents);  // triggers notify → renderReactive (renders all tabs)

  switchTab('tab-summary');
});
