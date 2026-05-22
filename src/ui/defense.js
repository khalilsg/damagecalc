function clampStage(n) { return Math.max(-6, Math.min(6, n ?? 0)); }

export function renderDefense(defenseData, defenseExpandedData, container, state) {
  container.innerHTML = '';
  for (const { playerName, matchups } of defenseData) {
    const expandedPlayer = defenseExpandedData?.find(p => p.playerName === playerName);

    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName} (incoming)`));
    const cards = el('div', 'matchup-cards');

    for (const { opponentName, scenarios } of matchups) {
      if (scenarios.length === 0) continue;
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`${opponentName} attacking`));

      const myStages  = state?.myStages?.[playerName]       ?? {};
      const oppStages = state?.opponentStages?.[opponentName] ?? {};
      const hasLiveStages =
        Object.values(myStages).some(v => v !== 0) ||
        Object.values(oppStages).some(v => v !== 0);

      // Tracked (live) moves from Battle Tracker — always shown first
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

      if (hasLiveStages && expandedPlayer) {
        // Use precomputed grid at current live stages
        const expandedMatchup = expandedPlayer.matchups.find(m => m.opponentName === opponentName);
        if (expandedMatchup) {
          let hasRows = false;
          for (const { moveName, category, grid } of expandedMatchup.moveCalcs) {
            const atkStat = category === 'special' ? 'spa' : 'atk';
            const defStat = category === 'special' ? 'spd' : 'def';
            const oppStage = clampStage(oppStages[atkStat] ?? 0);
            const myStage  = clampStage(myStages[defStat]  ?? 0);
            const cell = grid[`${oppStage},${myStage}`];
            if (!cell) continue;
            hasRows = true;
            const lbl = el('div', 'scenario-label');
            lbl.textContent = moveName;
            card.appendChild(lbl);
            const row = el('div', `calc-row ${koClass(cell.classification)}`);
            row.textContent = cell.formattedDesc ?? '';
            card.appendChild(row);
          }
          if (!hasRows && trackedMoves.length === 0) {
            card.appendChild(emptyNote('No data at current stages.'));
          }
        }
      } else {
        // No live stages: show precomputed archetype scenarios
        for (const { label, rows } of scenarios) {
          if (label !== 'Base') card.appendChild(scenarioLabel(`My ${label}`));
          for (const { formattedDesc, classification } of rows) {
            const row = el('div', `calc-row ${koClass(classification)}`);
            row.textContent = formattedDesc;
            card.appendChild(row);
          }
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
function emptyNote(text)     { const d = el('div', 'moves-empty');    d.textContent = text; return d; }
function koClass(c) {
  if (c === 'guaranteed-ohko') return 'ko-guaranteed';
  if (c === 'chance-ohko')     return 'ko-chance';
  if (c === '2hko')            return 'ko-2hko';
  return '';
}
