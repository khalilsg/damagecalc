export function renderSpeedLadder(speedData, container) {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start;';

  // --- Simple ladder: base player speed vs min/max opponent ---
  const simpleEntries = [];
  const simpleSeen = new Set();

  for (const { playerName, opponentName, comparisons } of speedData) {
    // Player base speed
    const baseComp = comparisons.find(c => c.playerLabel === 'Base');
    if (baseComp) {
      const key = `${playerName}-Base-${baseComp.playerSpeed}`;
      if (!simpleSeen.has(key)) {
        simpleSeen.add(key);
        simpleEntries.push({
          displayName: playerName,
          speed: baseComp.playerSpeed,
          isPlayer: true,
        });
      }
    }

    // Opponent min and max
    for (const comp of comparisons) {
      if (comp.playerLabel !== 'Base') continue;
      if (comp.opponentLabel !== 'Min Speed' && comp.opponentLabel !== 'Max Speed') continue;
      const suffix = comp.opponentLabel === 'Max Speed' ? '+' : '=';
      const key = `${opponentName}-${comp.opponentLabel}-${comp.opponentSpeed}`;
      if (!simpleSeen.has(key)) {
        simpleSeen.add(key);
        simpleEntries.push({
          displayName: `${opponentName}${suffix}`,
          speed: comp.opponentSpeed,
          isPlayer: false,
        });
      }
    }
  }

  simpleEntries.sort((a, b) => b.speed - a.speed);

  // --- Full ladder: all scenarios ---
  const fullEntries = [];
  const fullSeen = new Set();

  for (const { playerName, opponentName, comparisons } of speedData) {
    for (const { playerLabel, playerSpeed, opponentLabel, opponentSpeed } of comparisons) {
      const pk = `${playerName}-${playerLabel}-${playerSpeed}`;
      if (!fullSeen.has(pk)) {
        fullSeen.add(pk);
        const suffix = playerLabel === 'Base' ? '' : ` (${playerLabel})`;
        fullEntries.push({
          displayName: `${playerName}${suffix}`,
          speed: playerSpeed,
          isPlayer: true,
        });
      }

      const ok = `${opponentName}-${opponentLabel}-${opponentSpeed}`;
      if (!fullSeen.has(ok)) {
        fullSeen.add(ok);
        const suffix = opponentLabel === 'Max Speed' ? '+' : opponentLabel === 'Min Speed' ? '-' : ` (${opponentLabel})`;
        fullEntries.push({
          displayName: `${opponentName}${suffix}`,
          speed: opponentSpeed,
          isPlayer: false,
        });
      }
    }
  }

  fullEntries.sort((a, b) => b.speed - a.speed);

  wrapper.appendChild(buildLadder('Base Speeds', simpleEntries));
  wrapper.appendChild(buildLadder('All Scenarios', fullEntries));
  container.appendChild(wrapper);
}

function buildLadder(title, entries) {
  const section = document.createElement('div');
  section.style.cssText = 'flex: 1; min-width: 280px;';

  const header = document.createElement('div');
  header.style.cssText = 'color: #58a6ff; font-size: 0.85rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #30363d; padding-bottom: 6px;';
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
