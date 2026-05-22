import { parseSets } from './parser.js';
import { runAnalysis, resolveSpeciesName, allSpecies } from './calcEngine.js';
import { preloadStats } from './smogonStats.js';
import { TEAMS } from './teams.js';
import { renderOffense } from './ui/offense.js';
import { renderDefense } from './ui/defense.js';
import { renderOffenseExpanded } from './ui/offenseExpanded.js';
import { renderDefenseExpanded } from './ui/defenseExpanded.js';
import { renderSpeedLadder } from './ui/speedLadder.js';
import { renderSummary } from './ui/summary.js';

// Start fetching Smogon stats in the background immediately.
preloadStats();

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
  matches.forEach((name, i) => {
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

  const teamText     = document.getElementById('team-input').value.trim();
  const inBattleMove = document.getElementById('in-battle-move').value.trim();

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

  let analysisData;
  try {
    analysisData = await runAnalysis(playerSets, selectedDefenders, inBattleMove);
  } catch (e) {
    errorEl.textContent = `Calc error: ${e.message}`;
    btn.textContent = 'ANALYZE MATCHUP';
    btn.disabled = false;
    return;
  }

  btn.textContent = 'ANALYZE MATCHUP';
  btn.disabled = false;

  renderSummary(analysisData, document.getElementById('tab-summary'));
  renderOffense(analysisData.offense, document.getElementById('tab-offense'));
  renderOffenseExpanded(analysisData.offenseExpanded, document.getElementById('tab-offense-exp'));
  renderDefense(analysisData.defense, document.getElementById('tab-defense'));
  renderDefenseExpanded(analysisData.defenseExpanded, document.getElementById('tab-defense-exp'));
  renderSpeedLadder(analysisData.speed, document.getElementById('tab-speed'));

  switchTab('tab-summary');
});
