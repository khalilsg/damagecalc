export function renderDefense(defenseData, container, state) {
  container.innerHTML = '';
  for (const { playerName, matchups } of defenseData) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName} (incoming)`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, scenarios } of matchups) {
      if (scenarios.length === 0) continue;
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`${opponentName} attacking`));

      // Tracked (live) moves from sidebar — shown first, highlighted
      const trackedMoves = state?.opponentMoves?.[opponentName] ?? [];
      for (const { name: moveName, calcs } of trackedMoves) {
        const playerCalc = (calcs ?? []).find(c => c.playerName === playerName);
        if (!playerCalc || playerCalc.rows.length === 0) continue;
        const moveLabel = el('div', 'scenario-label in-battle-label');
        moveLabel.textContent = `★ ${moveName}`;
        card.appendChild(moveLabel);
        for (const { formattedDesc, classification } of playerCalc.rows) {
          const row = el('div', `calc-row ${koClass(classification)} in-battle-row`);
          const badge = el('span', 'in-battle-badge');
          badge.textContent = 'LIVE';
          row.appendChild(badge);
          row.appendChild(document.createTextNode(' ' + formattedDesc));
          card.appendChild(row);
        }
      }

      // Precomputed common-move scenarios
      for (const { label, rows } of scenarios) {
        if (label !== 'Base') card.appendChild(scenarioLabel(`My ${label}`));
        for (const { formattedDesc, classification } of rows) {
          const row = el('div', `calc-row ${koClass(classification)}`);
          row.textContent = formattedDesc;
          card.appendChild(row);
        }
      }

      cards.appendChild(card);
    }
    section.appendChild(cards);
    container.appendChild(section);
  }
}

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function sectionHeader(text) { const h = el('div', 'section-header'); h.textContent = text; return h; }
function cardHeader(text)    { const h = el('div', 'card-header');    h.textContent = text; return h; }
function scenarioLabel(text) { const h = el('div', 'scenario-label'); h.textContent = text; return h; }
function koClass(c) {
  if (c === 'guaranteed-ohko') return 'ko-guaranteed';
  if (c === 'chance-ohko')     return 'ko-chance';
  if (c === '2hko')            return 'ko-2hko';
  return '';
}
