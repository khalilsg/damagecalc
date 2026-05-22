function clampStage(n) { return Math.max(-6, Math.min(6, n ?? 0)); }

export function renderDefenseExpanded(defenseExpandedData, container, state) {
  container.innerHTML = '';
  for (const { playerName, matchups } of defenseExpandedData) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName} (incoming)`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, moveCalcs } of matchups) {
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`${opponentName} attacking`));
      let hasRows = false;

      // Tracked (live) moves from Battle Tracker — shown first
      const trackedMoves = state?.opponentMoves?.[opponentName] ?? [];
      for (const { name: moveName, defGrids } of trackedMoves) {
        const playerGrid = (defGrids ?? []).find(g => g.playerName === playerName);
        if (!playerGrid) continue;
        const { category, grid } = playerGrid;
        const oppStage = clampStage(category === 'special'
          ? state?.opponentStages?.[opponentName]?.spa
          : state?.opponentStages?.[opponentName]?.atk);
        const myStage = clampStage(category === 'special'
          ? state?.myStages?.[playerName]?.spd
          : state?.myStages?.[playerName]?.def);
        const r = grid[`${oppStage},${myStage}`];
        if (!r) continue;
        hasRows = true;
        const moveLabel = el('div', 'scenario-label in-battle-label');
        moveLabel.textContent = `★ ${moveName}`;
        card.appendChild(moveLabel);
        const row = el('div', `calc-row ${koClass(r.classification)} in-battle-row`);
        const badge = el('span', 'in-battle-badge');
        badge.textContent = 'LIVE';
        row.appendChild(badge);
        row.appendChild(document.createTextNode(' ' + r.formattedDesc));
        card.appendChild(row);
      }

      // Precomputed common moves
      for (const { moveName, category, grid } of moveCalcs) {
        const oppStage = clampStage(category === 'special'
          ? state?.opponentStages?.[opponentName]?.spa
          : state?.opponentStages?.[opponentName]?.atk);
        const myStage = clampStage(category === 'special'
          ? state?.myStages?.[playerName]?.spd
          : state?.myStages?.[playerName]?.def);
        const r = grid[`${oppStage},${myStage}`];
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
