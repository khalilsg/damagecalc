export function renderOffense(offenseData, container) {
  container.innerHTML = '';

  for (const { playerName, matchups } of offenseData) {
    const section = document.createElement('div');
    section.className = 'player-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = `▸ ${playerName}`;
    section.appendChild(header);

    const cards = document.createElement('div');
    cards.className = 'matchup-cards';

    for (const { opponentName, scenarios } of matchups) {
      const card = document.createElement('div');
      card.className = 'matchup-card';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'card-header';
      cardHeader.textContent = `vs. ${opponentName}`;
      card.appendChild(cardHeader);

      for (const { label, rows } of scenarios) {
        if (label !== 'Base') {
          const scenarioLabel = document.createElement('div');
          scenarioLabel.className = 'scenario-label';
          scenarioLabel.textContent = label;
          card.appendChild(scenarioLabel);
        }
        for (const { formattedDesc, classification } of rows) {
          const row = document.createElement('div');
          row.className = `calc-row ${getKoClass(classification)}`;
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

function getKoClass(classification) {
  if (classification === 'guaranteed-ohko') return 'ko-guaranteed';
  if (classification === 'chance-ohko') return 'ko-chance';
  if (classification === '2hko') return 'ko-2hko';
  return '';
}
