// Module-level selection state persists across reactive re-renders
let selectedPlayer   = null;
let selectedOpponent = null;

export function renderMatchupLookup(analysisData, container, state) {
  if (!analysisData) {
    container.innerHTML = '';
    const ph = el('p', 'matchup-placeholder');
    ph.textContent = 'Run an analysis first.';
    container.appendChild(ph);
    return;
  }

  const playerNames   = analysisData.offenseExpanded.map(p => p.playerName);
  const opponentNames = analysisData.offenseExpanded[0]?.matchups.map(m => m.opponentName) ?? [];

  // Reset selection if it no longer exists in the data
  if (selectedPlayer   && !playerNames.includes(selectedPlayer))   selectedPlayer   = null;
  if (selectedOpponent && !opponentNames.includes(selectedOpponent)) selectedOpponent = null;

  container.innerHTML = '';

  // ---- Selector row ----
  const selectorRow = el('div', 'matchup-selector-row');

  const pSel = makeSelect('— My Pokémon —', playerNames, selectedPlayer);
  pSel.addEventListener('change', () => {
    selectedPlayer = pSel.value || null;
    renderMatchupLookup(analysisData, container, state);
  });

  const vsLabel = el('span', 'matchup-vs');
  vsLabel.textContent = 'vs.';

  const oSel = makeSelect('— Opponent —', opponentNames, selectedOpponent);
  oSel.addEventListener('change', () => {
    selectedOpponent = oSel.value || null;
    renderMatchupLookup(analysisData, container, state);
  });

  selectorRow.appendChild(pSel);
  selectorRow.appendChild(vsLabel);
  selectorRow.appendChild(oSel);
  container.appendChild(selectorRow);

  if (!selectedPlayer || !selectedOpponent) {
    const ph = el('p', 'matchup-placeholder');
    ph.textContent = 'Select a Pokémon from each side to see the matchup.';
    container.appendChild(ph);
    return;
  }

  const myStages  = state?.myStages?.[selectedPlayer]        ?? {};
  const oppStages = state?.opponentStages?.[selectedOpponent] ?? {};
  const hasHH     = state?.myHelpingHand?.[selectedPlayer]   ?? false;

  // Active stage badge
  const stageLine = buildStageBadge(myStages, oppStages, selectedPlayer, selectedOpponent);
  if (stageLine) container.appendChild(stageLine);

  // Offense card
  container.appendChild(buildMatchupCard(
    `${selectedPlayer} → ${selectedOpponent}`,
    hasHH,
    analysisData.offenseExpanded,
    'offense',
    selectedPlayer, selectedOpponent,
    myStages, oppStages,
  ));

  // Defense card
  container.appendChild(buildMatchupCard(
    `${selectedPlayer} defending vs ${selectedOpponent}`,
    false,
    analysisData.defenseExpanded,
    'defense',
    selectedPlayer, selectedOpponent,
    myStages, oppStages,
  ));

  // Live tracked moves card (if any)
  const trackedMoves = state?.opponentMoves?.[selectedOpponent] ?? [];
  if (trackedMoves.length > 0) {
    container.appendChild(buildLiveMovesCard(
      `Live — ${selectedOpponent}'s moves vs ${selectedPlayer}`,
      trackedMoves, selectedPlayer, oppStages, myStages,
    ));
  }
}

// ---- Build helpers ----

function buildStageBadge(myStages, oppStages, myName, oppName) {
  const myActive  = Object.entries(myStages).filter(([, v]) => v !== 0);
  const oppActive = Object.entries(oppStages).filter(([, v]) => v !== 0);
  if (myActive.length === 0 && oppActive.length === 0) return null;

  const wrap = el('div', 'matchup-stages');
  if (myActive.length > 0) {
    const span = el('span', 'matchup-stage-entry my-stage');
    span.textContent = myName + ': ' + myActive.map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
    wrap.appendChild(span);
  }
  if (oppActive.length > 0) {
    const span = el('span', 'matchup-stage-entry opp-stage');
    span.textContent = oppName + ': ' + oppActive.map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
    wrap.appendChild(span);
  }
  return wrap;
}

function buildMatchupCard(title, hasHH, expandedData, type, playerName, opponentName, myStages, oppStages) {
  const card = el('div', 'matchup-card');

  const header = el('div', 'card-header');
  header.textContent = title;
  if (hasHH) {
    const badge = el('span', 'in-battle-badge');
    badge.textContent = 'HH';
    badge.title = 'Helping Hand active (+50%)';
    badge.style.marginLeft = '6px';
    header.appendChild(badge);
  }
  card.appendChild(header);

  const data = expandedData
    .find(p => p.playerName === playerName)
    ?.matchups.find(m => m.opponentName === opponentName);

  if (!data || data.moveCalcs.length === 0) {
    card.appendChild(emptyNote('No data.'));
    return card;
  }

  let hasRows = false;
  for (const { moveName, category, grid } of data.moveCalcs) {
    const atkStat = category === 'special' ? 'spa' : 'atk';
    const defStat = category === 'special' ? 'spd' : 'def';

    const cell = type === 'offense'
      ? grid[`${clampStage(myStages[atkStat]  ?? 0)},${clampStage(oppStages[defStat] ?? 0)}`]
      : grid[`${clampStage(oppStages[atkStat] ?? 0)},${clampStage(myStages[defStat]  ?? 0)}`];
    if (!cell) continue;
    hasRows = true;

    const lbl = el('div', 'scenario-label');
    lbl.textContent = moveName;
    card.appendChild(lbl);
    const row = el('div', `calc-row ${koClass(cell.classification)}`);
    row.textContent = cell.formattedDesc ?? '';
    card.appendChild(row);
  }

  if (!hasRows) card.appendChild(emptyNote('No data at current stages.'));
  return card;
}

function buildLiveMovesCard(title, trackedMoves, playerName, oppStages, myStages) {
  const card = el('div', 'matchup-card');
  const header = el('div', 'card-header');
  header.textContent = title;
  card.appendChild(header);

  let hasRows = false;
  for (const { name: moveName, defGrids } of trackedMoves) {
    const pg = (defGrids ?? []).find(g => g.playerName === playerName);
    if (!pg) continue;
    const { category, grid } = pg;
    const atkStat = category === 'special' ? 'spa' : 'atk';
    const defStat = category === 'special' ? 'spd' : 'def';
    const cell = grid[`${clampStage(oppStages[atkStat] ?? 0)},${clampStage(myStages[defStat] ?? 0)}`];
    if (!cell) continue;
    hasRows = true;

    const lbl = el('div', 'scenario-label in-battle-label');
    lbl.textContent = `★ ${moveName}`;
    card.appendChild(lbl);
    const row = el('div', `calc-row ${koClass(cell.classification)} in-battle-row`);
    const badge = el('span', 'in-battle-badge');
    badge.textContent = 'LIVE';
    row.appendChild(badge);
    row.appendChild(document.createTextNode(' ' + cell.formattedDesc));
    card.appendChild(row);
  }

  if (!hasRows) card.appendChild(emptyNote('No tracked move data for this matchup.'));
  return card;
}

// ---- Utilities ----

function makeSelect(placeholder, options, currentValue) {
  const sel = el('select', 'matchup-select');
  const ph  = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder;
  sel.appendChild(ph);
  for (const name of options) {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    if (name === currentValue) o.selected = true;
    sel.appendChild(o);
  }
  return sel;
}

function emptyNote(text) {
  const d = el('div', 'moves-empty');
  d.textContent = text;
  return d;
}

function clampStage(n) { return Math.max(-2, Math.min(2, n ?? 0)); }

function koClass(c) {
  if (c === 'guaranteed-ohko') return 'ko-guaranteed';
  if (c === 'chance-ohko')     return 'ko-chance';
  if (c === '2hko')            return 'ko-2hko';
  return '';
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
