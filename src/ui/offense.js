export function renderOffense(offenseData, container) {
  container.innerHTML = '';
  for (const { playerName, matchups } of offenseData) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName}`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, scenarios } of matchups) {
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`vs. ${opponentName}`));
      for (const { label, rows } of scenarios) {
        if (label !== 'Base') card.appendChild(scenarioLabel(label));
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
