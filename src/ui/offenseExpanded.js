function clampStage(n) { return Math.max(-6, Math.min(6, n ?? 0)); }

export function renderOffenseExpanded(offenseExpandedData, container, state) {
  container.innerHTML = '';
  for (const { playerName, matchups } of offenseExpandedData) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName}`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, moveCalcs } of matchups) {
      if (moveCalcs.length === 0) continue;
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`vs. ${opponentName}`));
      let hasRows = false;
      for (const { moveName, category, grid } of moveCalcs) {
        const myStage = clampStage(category === 'special'
          ? state?.myStages?.[playerName]?.spa
          : state?.myStages?.[playerName]?.atk);
        const oppStage = clampStage(category === 'special'
          ? state?.opponentStages?.[opponentName]?.spd
          : state?.opponentStages?.[opponentName]?.def);
        const r = grid[`${myStage},${oppStage}`];
        if (!r) continue;
        hasRows = true;
        const moveLabel = el('div', 'scenario-label');
        moveLabel.textContent = moveName;
        card.appendChild(moveLabel);
        const row = el('div', `calc-row ${koClass(r.classification)}`);
        row.textContent = r.formattedDesc;
        card.appendChild(row);
      }
      if (hasRows) cards.appendChild(card);
    }
    section.appendChild(cards);
    container.appendChild(section);
  }
}

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function sectionHeader(text) { const h = el('div', 'section-header'); h.textContent = text; return h; }
function cardHeader(text)    { const h = el('div', 'card-header');    h.textContent = text; return h; }
function koClass(c) {
  if (c === 'guaranteed-ohko') return 'ko-guaranteed';
  if (c === 'chance-ohko')     return 'ko-chance';
  if (c === '2hko')            return 'ko-2hko';
  return '';
}
