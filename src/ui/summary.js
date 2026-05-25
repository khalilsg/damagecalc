export function renderSummary(analysisData, container) {
  container.innerHTML = '';
  const { offense, defense, speed } = analysisData;

  const guaranteedOHKOs = [], chanceOHKOs = [], notable2HKOs = [];
  const incomingOHKOs = [], incomingChance = [], incoming2HKO = [];

  for (const { playerName, matchups } of offense) {
    for (const { opponentName, scenarios } of matchups) {
      for (const { label, rows } of scenarios) {
        if (label !== 'Base') continue;
        for (const { formattedBase, kochanceText, classification } of rows) {
          const e = { playerName, opponentName, desc: formattedBase, kochance: kochanceText };
          if (classification === 'guaranteed-ohko') guaranteedOHKOs.push(e);
          else if (classification === 'chance-ohko') chanceOHKOs.push(e);
          else if (classification === '2hko') {
            const m = kochanceText?.match(/([\d.]+)%/);
            if (kochanceText?.includes('guaranteed') || (m && parseFloat(m[1]) > 25)) notable2HKOs.push(e);
          }
        }
      }
    }
  }

  for (const { playerName, matchups } of defense) {
    for (const { opponentName, scenarios } of matchups) {
      for (const { label, rows } of scenarios) {
        if (label !== 'Base') continue;
        for (const { formattedBase, kochanceText, classification, isInBattle } of rows) {
          if (isInBattle) continue;
          const e = { playerName, opponentName, desc: formattedBase, kochance: kochanceText };
          if (classification === 'guaranteed-ohko') incomingOHKOs.push(e);
          else if (classification === 'chance-ohko') incomingChance.push(e);
          else if (classification === '2hko') {
            const m = kochanceText?.match(/([\d.]+)%/);
            if (kochanceText?.includes('guaranteed') || (m && parseFloat(m[1]) > 25)) incoming2HKO.push(e);
          }
        }
      }
    }
  }

  const speedTies = [], criticals = [];
  const seenTies = new Set(), seenCrit = new Set();

  for (const { playerName, opponentName, basicComparisons } of speed) {
    for (const { playerLabel, playerSpeed, opponentLabel, tie } of basicComparisons) {
      if (tie) {
        const key = `${playerName}-${playerLabel}-${opponentName}-${opponentLabel}-${playerSpeed}`;
        if (!seenTies.has(key)) {
          seenTies.add(key);
          speedTies.push({ playerName, playerLabel, opponentName, opponentLabel, speed: playerSpeed });
        }
      }
    }
    const base   = basicComparisons.find(c => c.playerLabel === 'Base' && c.opponentLabel === '');
    const twComp = basicComparisons.find(c => c.playerLabel === 'Base' && c.opponentLabel === '+');
    if (base && twComp && !base.playerFaster && twComp.playerFaster) {
      const key = `${playerName}-${opponentName}`;
      if (!seenCrit.has(key)) {
        seenCrit.add(key);
        criticals.push({ playerName, opponentName, note: 'Outsped by opponent+ but faster than opponent' });
      }
    }
  }

  // Offense: pair key = myPokémon → opponent
  addGrouped(container, 'Guaranteed OHKOs I Can Deal', guaranteedOHKOs, 'summary-red',
    e => `${e.playerName} → ${e.opponentName}`,
    e => e.desc,
  );
  addGrouped(container, 'Chance OHKOs I Can Deal (>5%)', chanceOHKOs, 'summary-orange',
    e => `${e.playerName} → ${e.opponentName}`,
    e => `${e.desc} — ${e.kochance}`,
  );
  addGrouped(container, 'Notable 2HKOs I Can Deal (>25%)', notable2HKOs, 'summary-yellow',
    e => `${e.playerName} → ${e.opponentName}`,
    e => `${e.desc} — ${e.kochance}`,
  );

  // Defense: pair key = opponent → myPokémon
  addGrouped(container, 'Guaranteed OHKOs Against My Team', incomingOHKOs, 'summary-red',
    e => `${e.opponentName} → ${e.playerName}`,
    e => e.desc,
  );
  addGrouped(container, 'Chance OHKOs Against My Team', incomingChance, 'summary-orange',
    e => `${e.opponentName} → ${e.playerName}`,
    e => `${e.desc} — ${e.kochance}`,
  );
  addGrouped(container, 'Notable 2HKOs Against My Team (>25%)', incoming2HKO, 'summary-yellow',
    e => `${e.opponentName} → ${e.playerName}`,
    e => `${e.desc} — ${e.kochance}`,
  );

  // Speed (flat — already compact)
  addFlat(container, 'Speed Ties', speedTies.map(e =>
    `${e.playerName} (${e.playerLabel || 'Base'}) ties ${e.opponentName} (${e.opponentLabel || 'min'}) at ${e.speed}`
  ), 'summary-cyan');
  addFlat(container, 'Critical Speed Matchups', criticals.map(e =>
    `${e.playerName} vs ${e.opponentName}: ${e.note}`
  ), 'summary-cyan');
}

// ---- Grouped renderer: bold pair header, indented detail rows ----

function addGrouped(container, title, items, cssClass, pairFn, detailFn) {
  if (items.length === 0) return;

  // Preserve insertion order; deduplicate details within each pair
  const groups = new Map();
  for (const item of items) {
    const pair   = pairFn(item);
    const detail = detailFn(item);
    if (!groups.has(pair)) groups.set(pair, new Set());
    groups.get(pair).add(detail);
  }

  const block = el('div', 'summary-block');
  const header = el('div', `summary-block-header ${cssClass}`);
  header.textContent = title;
  block.appendChild(header);

  for (const [pair, details] of groups) {
    const ph = el('div', `summary-pair-header ${cssClass}`);
    ph.textContent = pair;
    block.appendChild(ph);

    for (const text of details) {
      const row = el('div', 'summary-detail-row');
      row.textContent = text;
      block.appendChild(row);
    }
  }

  container.appendChild(block);
}

// ---- Flat renderer (speed sections) ----

function addFlat(container, title, items, cssClass) {
  if (items.length === 0) return;
  const block = el('div', 'summary-block');
  const header = el('div', `summary-block-header ${cssClass}`);
  header.textContent = title;
  block.appendChild(header);
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    const row = el('div', `summary-row ${cssClass}`);
    row.textContent = item;
    block.appendChild(row);
  }
  container.appendChild(block);
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
