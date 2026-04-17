export function renderSummary(analysisData, container) {
  container.innerHTML = '';

  const { offense, defense, speed } = analysisData;

  // --- Offense KOs ---
  const guaranteedOHKOs = [];
  const chanceOHKOs = [];
  const notable2HKOs = [];

  for (const { playerName, matchups } of offense) {
    for (const { opponentName, scenarios } of matchups) {
      for (const { rows } of scenarios) {
        for (const { formattedBase, kochanceText, classification } of rows) {
          const entry = { playerName, opponentName, desc: formattedBase, kochance: kochanceText };
          if (classification === 'guaranteed-ohko') guaranteedOHKOs.push(entry);
          else if (classification === 'chance-ohko') chanceOHKOs.push(entry);
          else if (classification === '2hko') {
            const match = kochanceText.match(/([\d.]+)%/);
            if (kochanceText.includes('guaranteed') || (match && parseFloat(match[1]) > 25)) {
              notable2HKOs.push(entry);
            }
          }
        }
      }
    }
  }

  // --- Defense KOs ---
  const incomingGuaranteedOHKOs = [];
  const incomingChanceOHKOs = [];
  const incoming2HKOs = [];

  for (const { playerName, matchups } of defense) {
    for (const { opponentName, scenarios } of matchups) {
      for (const { rows } of scenarios) {
        for (const { formattedBase, kochanceText, classification } of rows) {
          const entry = { playerName, opponentName, desc: formattedBase, kochance: kochanceText };
          if (classification === 'guaranteed-ohko') incomingGuaranteedOHKOs.push(entry);
          else if (classification === 'chance-ohko') incomingChanceOHKOs.push(entry);
          else if (classification === '2hko') {
            const match = kochanceText.match(/([\d.]+)%/);
            if (kochanceText.includes('guaranteed') || (match && parseFloat(match[1]) > 25)) {
              incoming2HKOs.push(entry);
            }
          }
        }
      }
    }
  }

  // --- Speed ties (deduplicated) ---
  const speedTiesSeen = new Set();
  const speedTies = [];
  const criticalMatchupsSeen = new Set();
  const criticalMatchups = [];

  for (const { playerName, opponentName, comparisons } of speed) {
    for (const { playerLabel, playerSpeed, opponentLabel, opponentSpeed, tie } of comparisons) {
      if (tie) {
        const key = `${playerName}-${playerLabel}-${opponentName}-${opponentLabel}-${playerSpeed}`;
        if (!speedTiesSeen.has(key)) {
          speedTiesSeen.add(key);
          speedTies.push({ playerName, playerLabel, opponentName, opponentLabel, speed: playerSpeed });
        }
      }
    }

    const baseComp = comparisons.find(c => c.playerLabel === 'Base' && c.opponentLabel === 'Min Speed');
    const twComp   = comparisons.find(c => c.playerLabel === 'Tailwind' && c.opponentLabel === 'Max Speed');
    if (baseComp && twComp && !baseComp.playerFaster && twComp.playerFaster) {
      const key = `${playerName}-${opponentName}`;
      if (!criticalMatchupsSeen.has(key)) {
        criticalMatchupsSeen.add(key);
        criticalMatchups.push({ playerName, opponentName, note: 'Tailwind flips speed advantage' });
      }
    }
  }

  // --- Render ---
  addSummaryBlock(container, '⚔ Guaranteed OHKOs I Can Deal', guaranteedOHKOs.map(e =>
    `${e.playerName} → ${e.opponentName}: ${e.desc}`
  ), 'summary-red');

  addSummaryBlock(container, '⚔ Chance OHKOs I Can Deal', chanceOHKOs.map(e =>
    `${e.playerName} → ${e.opponentName}: ${e.desc} -- ${e.kochance}`
  ), 'summary-orange');

  addSummaryBlock(container, '⚔ Notable 2HKOs I Can Deal (>25%)', notable2HKOs.map(e =>
    `${e.playerName} → ${e.opponentName}: ${e.desc} -- ${e.kochance}`
  ), 'summary-yellow');

  addSummaryBlock(container, '🛡 Guaranteed OHKOs Against My Team', incomingGuaranteedOHKOs.map(e =>
    `${e.opponentName} → ${e.playerName}: ${e.desc}`
  ), 'summary-red');

  addSummaryBlock(container, '🛡 Chance OHKOs Against My Team', incomingChanceOHKOs.map(e =>
    `${e.opponentName} → ${e.playerName}: ${e.desc} -- ${e.kochance}`
  ), 'summary-orange');

  addSummaryBlock(container, '🛡 Notable 2HKOs Against My Team (>25%)', incoming2HKOs.map(e =>
    `${e.opponentName} → ${e.playerName}: ${e.desc} -- ${e.kochance}`
  ), 'summary-yellow');

  addSummaryBlock(container, '⚡ Speed Ties', speedTies.map(e =>
    `${e.playerName} (${e.playerLabel}) ties ${e.opponentName} (${e.opponentLabel}) at ${e.speed}`
  ), 'summary-yellow');

  addSummaryBlock(container, '💨 Critical Speed Control Matchups', criticalMatchups.map(e =>
    `${e.playerName} vs ${e.opponentName}: ${e.note}`
  ), 'summary-cyan');
}

function addSummaryBlock(container, title, items, cssClass) {
  if (items.length === 0) return;

  const block = document.createElement('div');
  block.className = 'summary-block';

  const header = document.createElement('div');
  header.className = `summary-block-header ${cssClass}`;
  header.textContent = title;
  block.appendChild(header);

  // Deduplicate entries
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    const row = document.createElement('div');
    row.className = `summary-row ${cssClass}`;
    row.textContent = item;
    block.appendChild(row);
  }

  container.appendChild(block);
}
