export function renderSpeedLadder(speedData, container) {
  container.innerHTML = '';

  const basicEntries = [], fullEntries = [];
  const basicSeen = new Set(), fullSeen = new Set();

  for (const { playerName, opponentName, basicComparisons, fullComparisons } of speedData) {
    // Basic column
    for (const c of basicComparisons) {
      const pk = `player-${playerName}-${c.playerLabel}-${c.playerSpeed}`;
      if (!basicSeen.has(pk)) {
        basicSeen.add(pk);
        basicEntries.push({ displayName: playerName, speed: c.playerSpeed, isPlayer: true });
      }
      const ok = `opp-${opponentName}-${c.opponentLabel}-${c.opponentSpeed}`;
      if (!basicSeen.has(ok)) {
        basicSeen.add(ok);
        const suffix = c.opponentLabel; // '', '+', '++'
        basicEntries.push({ displayName: `${opponentName}${suffix}`, speed: c.opponentSpeed, isPlayer: false });
      }
    }

    // Full column
    for (const c of fullComparisons) {
      const pk = `player-${playerName}-${c.playerLabel}-${c.playerSpeed}`;
      if (!fullSeen.has(pk)) {
        fullSeen.add(pk);
        const suffix = c.playerLabel === 'Base' ? '' : ` (${c.playerLabel})`;
        fullEntries.push({ displayName: `${playerName}${suffix}`, speed: c.playerSpeed, isPlayer: true });
      }
      const ok = `opp-${opponentName}-${c.opponentLabel}-${c.opponentSpeed}`;
      if (!fullSeen.has(ok)) {
        fullSeen.add(ok);
        const suffix = c.opponentLabel ? ` ${c.opponentLabel}` : '';
        fullEntries.push({ displayName: `${opponentName}${suffix}`, speed: c.opponentSpeed, isPlayer: false });
      }
    }
  }

  basicEntries.sort((a, b) => b.speed - a.speed);
  fullEntries.sort((a, b) => b.speed - a.speed);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start;';
  wrapper.appendChild(buildLadder('Basic', basicEntries));
  wrapper.appendChild(buildLadder('Full Scenarios', fullEntries));
  container.appendChild(wrapper);
}

function buildLadder(title, entries) {
  const section = document.createElement('div');
  section.style.cssText = 'flex: 1; min-width: 280px;';

  const header = document.createElement('div');
  header.className = 'ladder-header';
  header.textContent = title;
  section.appendChild(header);

  const ladder = document.createElement('div');
  ladder.className = 'speed-ladder';

  for (const { displayName, speed, isPlayer } of entries) {
    const entry = document.createElement('div');
    entry.className = `speed-entry ${isPlayer ? 'speed-player' : 'speed-opponent'}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'speed-name';
    nameEl.textContent = displayName;

    const speedEl = document.createElement('span');
    speedEl.className = 'speed-value';
    speedEl.textContent = speed;

    entry.appendChild(nameEl);
    entry.appendChild(speedEl);
    ladder.appendChild(entry);
  }

  section.appendChild(ladder);
  return section;
}
