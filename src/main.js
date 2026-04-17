import { parseSets } from './parser.js';
import { runAnalysis, resolveSpeciesName, allSpecies } from './calcEngine.js';
import { renderOffense } from './ui/offense.js';
import { renderDefense } from './ui/defense.js';
import { renderSpeedLadder } from './ui/speedLadder.js';
import { renderSummary } from './ui/summary.js';

// --- Tab switching ---
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// --- Defender dropdown ---
const defenderSearch = document.getElementById('defender-search');
const dropdown = document.getElementById('dropdown');
const selectedDefendersEl = document.getElementById('selected-defenders');
let selectedDefenders = [];

const filteredSpecies = allSpecies;

function getFilteredOptions(query) {
  return filteredSpecies.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
}

function renderDropdown(query) {
  const filtered = getFilteredOptions(query);
  dropdown.innerHTML = '';
  if (filtered.length === 0) { dropdown.classList.remove('open'); return; }
  filtered.forEach((name, index) => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    if (index === 0) item.classList.add('dropdown-item-top');
    item.textContent = name;
    item.addEventListener('mousedown', e => { e.preventDefault(); addDefender(name); });
    dropdown.appendChild(item);
  });
  dropdown.classList.add('open');
}

function addDefender(name) {
  if (!selectedDefenders.includes(name)) {
    selectedDefenders.push(name);
    renderTags();
  }
  defenderSearch.value = '';
  dropdown.classList.remove('open');
}

function renderTags() {
  selectedDefendersEl.innerHTML = '';

  if (selectedDefenders.length > 0) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => {
      selectedDefenders = [];
      renderTags();
    });
    selectedDefendersEl.appendChild(clearBtn);
  }

  selectedDefenders.forEach(name => {
    const tag = document.createElement('div');
    tag.className = 'defender-tag';
    tag.innerHTML = `${name} <button title="Remove">×</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      selectedDefenders = selectedDefenders.filter(d => d !== name);
      renderTags();
    });
    selectedDefendersEl.appendChild(tag);
  });
}

defenderSearch.addEventListener('input', () => renderDropdown(defenderSearch.value));
defenderSearch.addEventListener('focus', () => { if (defenderSearch.value) renderDropdown(defenderSearch.value); });
defenderSearch.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 150));

defenderSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const filtered = getFilteredOptions(defenderSearch.value);
    if (filtered.length > 0) {
      addDefender(filtered[0]);
    }
  }
});

// --- Calculate ---
document.getElementById('calc-btn').addEventListener('click', () => {
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  const teamText = document.getElementById('team-input').value.trim();
  if (!teamText) { errorEl.textContent = 'Please paste a team.'; return; }
  if (selectedDefenders.length === 0) { errorEl.textContent = 'Please add at least one opponent.'; return; }

  let playerSets;
  try {
    playerSets = parseSets(teamText);
  } catch (e) {
    errorEl.textContent = `Parse error: ${e.message}`;
    return;
  }

  let analysisData;
  try {
    analysisData = runAnalysis(playerSets, selectedDefenders);
  } catch (e) {
    errorEl.textContent = `Calc error: ${e.message}`;
    return;
  }

  renderSummary(analysisData, document.getElementById('tab-summary'));
  renderOffense(analysisData.offense, document.getElementById('tab-offense'));
  renderDefense(analysisData.defense, document.getElementById('tab-defense'));
  renderSpeedLadder(analysisData.speed, document.getElementById('tab-speed'));

  // Switch to summary tab
  tabs.forEach(t => t.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="tab-summary"]').classList.add('active');
  document.getElementById('tab-summary').classList.add('active');
});
