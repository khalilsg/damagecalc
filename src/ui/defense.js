export function renderDefense(defenseData, container) {
  container.innerHTML = '';
  for (const { playerName, matchups } of defenseData) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName} (incoming)`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, scenarios } of matchups) {
      if (scenarios.length === 0) continue;
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`${opponentName} attacking`));
      for (const { label, rows } of scenarios) {
        if (label !== 'Base') card.appendChild(scenarioLabel(`My ${label}`));
        for (const { formattedDesc, classification, isInBattle } of rows) {
          const row = el('div', `calc-row ${koClass(classification)}${isInBattle ? ' in-battle-row' : ''}`);
          if (isInBattle) {
            const badge = el('span', 'in-battle-badge');
            badge.textContent = 'IN BATTLE';
            row.appendChild(badge);
            row.appendChild(document.createTextNode(' ' + formattedDesc));
          } else {
            row.textContent = formattedDesc;
          }
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
