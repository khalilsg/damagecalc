import { buildFilterControls } from './offenseExpanded.js';

export function renderDefenseExpanded(defenseExpandedData, container) {
  container.innerHTML = '';

  const controls = buildFilterControls('Opp offense stage:', 'My defense stage:', (oppStage, myStage) => {
    renderMatchups(defenseExpandedData, content, oppStage, myStage);
  });
  container.appendChild(controls.wrapper);

  const content = document.createElement('div');
  container.appendChild(content);

  renderMatchups(defenseExpandedData, content, 0, 0);
}

function renderMatchups(data, container, oppStage, myStage) {
  container.innerHTML = '';
  for (const { playerName, matchups } of data) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName} (opp stage: ${fmt(oppStage)}, my stage: ${fmt(myStage)})`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, moveCalcs } of matchups) {
      if (moveCalcs.length === 0) continue;
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`${opponentName} attacking`));
      for (const { moveName, isInBattle, grid } of moveCalcs) {
        const key = `${oppStage},${myStage}`;
        const r = grid[key];
        if (!r) continue;
        const moveLabel = el('div', `scenario-label${isInBattle ? ' in-battle-label' : ''}`);
        moveLabel.textContent = isInBattle ? `★ ${moveName} (in battle)` : moveName;
        card.appendChild(moveLabel);
        const row = el('div', `calc-row ${koClass(r.classification)}${isInBattle ? ' in-battle-row' : ''}`);
        row.textContent = r.formattedDesc;
        card.appendChild(row);
      }
      cards.appendChild(card);
    }
    section.appendChild(cards);
    container.appendChild(section);
  }
}

function fmt(n) { return n > 0 ? `+${n}` : `${n}`; }
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function sectionHeader(text) { const h = el('div', 'section-header'); h.textContent = text; return h; }
function cardHeader(text)    { const h = el('div', 'card-header');    h.textContent = text; return h; }
function koClass(c) {
  if (c === 'guaranteed-ohko') return 'ko-guaranteed';
  if (c === 'chance-ohko')     return 'ko-chance';
  if (c === '2hko')            return 'ko-2hko';
  return '';
}
