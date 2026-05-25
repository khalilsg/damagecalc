import { SKIP_MOVES } from '../leadSelector/score.js';

const EV_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

function formatEVs(evs) {
  if (!evs) return '';
  return Object.entries(evs)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${EV_LABELS[k] ?? k}`)
    .join(' / ');
}

function tmBarColor(pct) {
  if (pct >= 100) return '#2a7a2a';
  if (pct >= 50)  return '#b07000';
  return '#888';
}

function tmBarLight(pct) {
  if (pct >= 100) return 'rgba(42,122,42,0.28)';
  if (pct >= 50)  return 'rgba(176,112,0,0.28)';
  return 'rgba(136,136,136,0.28)';
}

/** Apply a two-segment gradient to a track element: solid fill to minPct, lighter fill to maxPct. */
function applyRangeBar(track, minPct, maxPct) {
  const min    = Math.min(100, minPct ?? 0);
  const max    = Math.min(100, maxPct);
  const solid  = tmBarColor(maxPct);
  const light  = tmBarLight(maxPct);
  if (max <= 0) return;
  track.style.backgroundImage = (min >= 1 && min < max - 0.5)
    ? `linear-gradient(to right, ${solid} ${min}%, ${light} ${min}%, ${light} ${max}%, transparent ${max}%)`
    : `linear-gradient(to right, ${solid} ${max}%, transparent ${max}%)`;
}

function pctRange(minPct, maxPct) {
  const lo = Math.round(minPct ?? maxPct);
  const hi = Math.round(maxPct);
  return lo === hi ? `${hi}%` : `${lo}–${hi}%`;
}

function buildThreatCard(entry) {
  const card = el('div', 'matchup-card');

  const hdr = el('div', 'card-header');
  hdr.textContent = entry.item ? `${entry.name} — ${entry.item}` : entry.name;
  card.appendChild(hdr);

  if (!entry.inChaos) {
    const noData = el('div', 'tm-no-data');
    noData.textContent = 'No chaos data — set unknown';
    card.appendChild(noData);
    return card;
  }

  // Nature + EVs
  const evStr  = formatEVs(entry.spread.evs);
  const setRow = el('div', 'tm-set-info');
  setRow.textContent = entry.spread.nature + (evStr ? ` · ${evStr}` : '');
  card.appendChild(setRow);

  // All moves (attacking in blue, support grayed)
  if (entry.moves.length > 0) {
    const row = el('div', 'tm-moves-row');
    for (const move of entry.moves) {
      const chip = el('span', 'tm-move-chip' + (SKIP_MOVES.has(move) ? ' tm-skip' : ''));
      chip.textContent = move;
      row.appendChild(chip);
    }
    card.appendChild(row);
  }

  // Their threats
  const threatHead = el('div', 'tm-section-head');
  threatHead.textContent = 'Their Threats';
  card.appendChild(threatHead);

  if (entry.threatsOut.length === 0) {
    const none = el('div', 'tm-no-threats');
    none.textContent = 'No significant threats to your team';
    card.appendChild(none);
  } else {
    const threats = el('div', 'tm-threats');
    for (const { move, targets } of entry.threatsOut) {
      const row      = el('div', 'tm-threat-row');
      const moveSpan = el('span', 'tm-threat-move');
      moveSpan.textContent = move;
      row.appendChild(moveSpan);
      const tSpan = el('span', 'tm-targets');
      for (const { mon, pct, minPct } of targets) {
        const cls = pct >= 100 ? 'tm-target tm-ohko' : pct >= 50 ? 'tm-target tm-warn' : 'tm-target tm-chip';
        const t   = el('span', cls);
        t.textContent = `${mon} ${pctRange(minPct, pct)}`;
        tSpan.appendChild(t);
      }
      row.appendChild(tSpan);
      threats.appendChild(row);
    }
    card.appendChild(threats);
  }

  // Your coverage
  const covHead = el('div', 'tm-section-head');
  covHead.textContent = 'Your Coverage';
  card.appendChild(covHead);

  const answers = el('div', 'tm-answers');
  for (const { mon, move, pct } of entry.answers) {
    const row = el('div', 'tm-answer-row');

    const monSpan = el('span', 'tm-answer-mon');
    monSpan.textContent = mon;
    row.appendChild(monSpan);

    if (!move) {
      const mSpan = el('span', 'tm-answer-move tm-no-move');
      mSpan.textContent = '—';
      row.appendChild(mSpan);
      row.appendChild(el('div', 'tm-answer-track'));
      const pSpan = el('span', 'tm-answer-pct');
      pSpan.textContent = '—';
      row.appendChild(pSpan);
    } else {
      const mSpan = el('span', 'tm-answer-move');
      mSpan.textContent = move;
      row.appendChild(mSpan);
      const track = el('div', 'tm-answer-track');
      applyRangeBar(track, minPct, pct);
      row.appendChild(track);
      const pSpan = el('span', 'tm-answer-pct');
      pSpan.textContent = pctRange(minPct, pct);
      row.appendChild(pSpan);
    }
    answers.appendChild(row);
  }
  card.appendChild(answers);

  return card;
}

export function renderSummary(analysisData, container, threatMatrix = null) {
  container.innerHTML = '';

  // ── Opponent threat analysis (from Lead Selector) ───────────────────────────
  if (threatMatrix && threatMatrix.length > 0) {
    const section = el('div', 'player-section');
    const hdr     = el('div', 'section-header');
    hdr.textContent = 'Opponent Sets & Threats';
    section.appendChild(hdr);
    const cards = el('div', 'matchup-cards');
    for (const entry of threatMatrix) cards.appendChild(buildThreatCard(entry));
    section.appendChild(cards);
    container.appendChild(section);
  }

  // ── Standard summary (requires analysis data) ───────────────────────────────
  if (!analysisData) return;

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
