function clampStage(n) { return Math.max(-6, Math.min(6, n ?? 0)); }

// ── Color helpers (damage bar) ────────────────────────────────────────────────

function barColor(pct) {
  if (pct >= 100) return '#2a7a2a';
  if (pct >= 50)  return '#b07000';
  return '#888';
}
function barLight(pct) {
  if (pct >= 100) return 'rgba(42,122,42,0.28)';
  if (pct >= 50)  return 'rgba(176,112,0,0.28)';
  return 'rgba(136,136,136,0.28)';
}

function applyBar(track, minPct, maxPct) {
  const min   = Math.min(100, minPct ?? 0);
  const max   = Math.min(100, maxPct ?? 0);
  const solid = barColor(maxPct);
  const light = barLight(maxPct);
  if (max <= 0) return;
  track.style.backgroundImage = (min >= 1 && min < max - 0.5)
    ? `linear-gradient(to right, ${solid} ${min}%, ${light} ${min}%, ${light} ${max}%, transparent ${max}%)`
    : `linear-gradient(to right, ${solid} ${max}%, transparent ${max}%)`;
}

function pctRange(minPct, maxPct) {
  const lo = Math.round(minPct ?? maxPct ?? 0);
  const hi = Math.round(maxPct ?? 0);
  return lo === hi ? `${hi}%` : `${lo}–${hi}%`;
}

// ── Classification merging ────────────────────────────────────────────────────

// Return the "stronger" (higher-priority) of two KO classifications.
// Used to pick the best achievable outcome across archetypes.
const CLS_ORDER = ['guaranteed-ohko', 'chance-ohko', '2hko', ''];
function mergeCls(a, b) {
  const ai = CLS_ORDER.indexOf(a ?? '');
  const bi = CLS_ORDER.indexOf(b ?? '');
  return ai <= bi ? (a ?? '') : (b ?? '');
}

// ── Group archetype rows by move name ─────────────────────────────────────────

function groupByMove(rows) {
  const moves = new Map();
  for (const r of rows) {
    const key = r.move;
    if (!moves.has(key)) {
      moves.set(key, {
        move:           key,
        minPct:         r.minPct ?? 0,
        maxPct:         r.maxPct ?? 0,
        classification: r.classification ?? '',
      });
    } else {
      const m = moves.get(key);
      m.minPct         = Math.min(m.minPct, r.minPct ?? 0);
      m.maxPct         = Math.max(m.maxPct, r.maxPct ?? 0);
      m.classification = mergeCls(m.classification, r.classification);
    }
  }
  return [...moves.values()];
}

// ── KO tag chip ───────────────────────────────────────────────────────────────

function buildKoTag(classification) {
  if (!classification) return null;
  const tag = el('span', 'mv-ko-tag');
  if (classification === 'guaranteed-ohko') {
    tag.className = 'mv-ko-tag mv-ko-ohko';
    tag.textContent = 'OHKO ✓';
  } else if (classification === 'chance-ohko') {
    tag.className = 'mv-ko-tag mv-ko-chance';
    tag.textContent = 'OHKO ~';
  } else if (classification === '2hko') {
    tag.className = 'mv-ko-tag mv-ko-2hko';
    tag.textContent = '2HKO';
  } else {
    return null;
  }
  return tag;
}

// ── Single move visual row ────────────────────────────────────────────────────

function buildMoveRow(moveName, classification, minPct, maxPct) {
  const row = el('div', 'mv-visual-row');

  // Top: name + KO tag
  const top = el('div', 'mv-visual-top');
  const nameSpan = el('span', 'mv-name');
  nameSpan.textContent = moveName;
  top.appendChild(nameSpan);
  const tag = buildKoTag(classification);
  if (tag) top.appendChild(tag);
  row.appendChild(top);

  // Bottom: bar + pct
  if ((maxPct ?? 0) > 0) {
    const bot = el('div', 'mv-visual-bot');
    const track = el('div', 'mv-track');
    applyBar(track, minPct, maxPct);
    bot.appendChild(track);
    const pctSpan = el('span', 'mv-pct');
    pctSpan.textContent = pctRange(minPct, maxPct);
    bot.appendChild(pctSpan);
    row.appendChild(bot);
  }

  return row;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderOffense(offenseData, offenseExpandedData, container, state) {
  container.innerHTML = '';
  for (const { playerName, matchups } of offenseData) {
    const myStages       = state?.myStages?.[playerName] ?? {};
    const expandedPlayer = offenseExpandedData?.find(p => p.playerName === playerName);

    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName}`));
    const cards = el('div', 'matchup-cards');

    for (const { opponentName, scenarios } of matchups) {
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`vs. ${opponentName}`));

      const oppStages    = state?.opponentStages?.[opponentName] ?? {};
      const hasLiveStages =
        Object.values(myStages).some(v => v !== 0) ||
        Object.values(oppStages).some(v => v !== 0);

      if (hasLiveStages && expandedPlayer) {
        // Live stages: use precomputed grid at current boost levels
        const expandedMatchup = expandedPlayer.matchups.find(m => m.opponentName === opponentName);
        if (expandedMatchup) {
          let hasRows = false;
          for (const { moveName, category, grid } of expandedMatchup.moveCalcs) {
            const atkStat  = category === 'special' ? 'spa' : 'atk';
            const defStat  = category === 'special' ? 'spd' : 'def';
            const myStage  = clampStage(myStages[atkStat]  ?? 0);
            const oppStage = clampStage(oppStages[defStat] ?? 0);
            const cell     = grid[`${myStage},${oppStage}`];
            if (!cell) continue;
            hasRows = true;
            card.appendChild(buildMoveRow(moveName, cell.classification, cell.minPct, cell.maxPct));
          }
          if (!hasRows) card.appendChild(emptyNote('No data at current stages.'));
        }
      } else {
        // Normal path: each scenario entry has all archetype rows for all moves
        for (const { label, rows } of scenarios) {
          if (label !== 'Base') card.appendChild(scenarioLabel(label));
          for (const { move, classification, minPct, maxPct } of groupByMove(rows)) {
            card.appendChild(buildMoveRow(move, classification, minPct, maxPct));
          }
        }
      }

      cards.appendChild(card);
    }

    section.appendChild(cards);
    container.appendChild(section);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function sectionHeader(text) { const h = el('div', 'section-header'); h.textContent = text; return h; }
function cardHeader(text)    { const h = el('div', 'card-header');    h.textContent = text; return h; }
function scenarioLabel(text) { const h = el('div', 'scenario-label'); h.textContent = text; return h; }
function emptyNote(text)     { const d = el('div', 'moves-empty');    d.textContent = text; return d; }
