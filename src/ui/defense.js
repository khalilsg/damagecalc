function clampStage(n) { return Math.max(-6, Math.min(6, n ?? 0)); }

// ── Color helpers (incoming damage — danger palette) ──────────────────────────

function defBarColor(pct) {
  if (pct >= 100) return '#c00';
  if (pct >= 50)  return '#d6600a';
  return '#888';
}
function defBarLight(pct) {
  if (pct >= 100) return 'rgba(200,0,0,0.2)';
  if (pct >= 50)  return 'rgba(214,96,10,0.2)';
  return 'rgba(136,136,136,0.2)';
}

function applyDefBar(track, minPct, maxPct) {
  const min   = Math.min(100, minPct ?? 0);
  const max   = Math.min(100, maxPct ?? 0);
  const solid = defBarColor(maxPct);
  const light = defBarLight(maxPct);
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

// ── Defense KO tag chip ───────────────────────────────────────────────────────

function buildDefTag(classification, maxPct) {
  const tag = el('span', 'mv-ko-tag');
  if (classification === 'guaranteed-ohko') {
    tag.className = 'mv-ko-tag mv-def-danger';
    tag.textContent = 'OHKO ✗';
  } else if (classification === 'chance-ohko') {
    tag.className = 'mv-ko-tag mv-def-warn';
    tag.textContent = 'OHKO ~';
  } else if (classification === '2hko') {
    tag.className = 'mv-ko-tag mv-def-2hko';
    tag.textContent = '2HKO';
  } else if (maxPct < 50) {
    tag.className = 'mv-ko-tag mv-def-ok';
    tag.textContent = 'Survives';
  } else {
    return null;
  }
  return tag;
}

// ── Single move visual row ────────────────────────────────────────────────────

function buildDefMoveRow(moveName, classification, minPct, maxPct, liveBadge = false) {
  const row = el('div', liveBadge ? 'mv-visual-row mv-live-row' : 'mv-visual-row');

  // Top: [LIVE badge?] move name + outcome tag
  const top = el('div', 'mv-visual-top');

  if (liveBadge) {
    const badge = el('span', 'in-battle-badge');
    badge.textContent = 'LIVE';
    top.appendChild(badge);
  }

  const nameSpan = el('span', 'mv-name');
  nameSpan.textContent = moveName;
  top.appendChild(nameSpan);

  const tag = buildDefTag(classification, maxPct);
  if (tag) top.appendChild(tag);
  row.appendChild(top);

  // Bottom: bar + pct
  if ((maxPct ?? 0) > 0) {
    const bot = el('div', 'mv-visual-bot');
    const track = el('div', 'mv-track');
    applyDefBar(track, minPct, maxPct);
    bot.appendChild(track);
    const pctSpan = el('span', 'mv-pct');
    pctSpan.textContent = pctRange(minPct, maxPct);
    bot.appendChild(pctSpan);
    row.appendChild(bot);
  }

  return row;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

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

      const myStages   = state?.myStages?.[playerName]        ?? {};
      const oppStages  = state?.opponentStages?.[opponentName] ?? {};
      const hasLiveStages =
        Object.values(myStages).some(v => v !== 0) ||
        Object.values(oppStages).some(v => v !== 0);

      // ── LIVE tracked moves (always shown first) ──────────────────────────
      const trackedMoves = state?.opponentMoves?.[opponentName] ?? [];
      for (const { name: moveName, calcs } of trackedMoves) {
        const playerCalc = (calcs ?? []).find(c => c.playerName === playerName);
        if (!playerCalc || playerCalc.rows.length === 0) continue;
        // Group tracked rows by move (usually just one, but keep it consistent)
        for (const { move, classification, minPct, maxPct } of groupByMove(playerCalc.rows)) {
          card.appendChild(buildDefMoveRow(move ?? moveName, classification, minPct, maxPct, true));
        }
      }

      if (hasLiveStages && expandedPlayer) {
        // Live stages: precomputed grid
        const expandedMatchup = expandedPlayer.matchups.find(m => m.opponentName === opponentName);
        if (expandedMatchup) {
          let hasRows = false;
          for (const { moveName, category, grid } of expandedMatchup.moveCalcs) {
            const atkStat  = category === 'special' ? 'spa' : 'atk';
            const defStat  = category === 'special' ? 'spd' : 'def';
            const oppStage = clampStage(oppStages[atkStat] ?? 0);
            const myStage  = clampStage(myStages[defStat]  ?? 0);
            const cell     = grid[`${oppStage},${myStage}`];
            if (!cell) continue;
            hasRows = true;
            card.appendChild(buildDefMoveRow(moveName, cell.classification, cell.minPct, cell.maxPct));
          }
          if (!hasRows && trackedMoves.length === 0) {
            card.appendChild(emptyNote('No data at current stages.'));
          }
        }
      } else {
        // Normal path: defense scenarios have ONE row each (per archetype × move × boost).
        // Group by boost-label first, then by move name.
        const labelMap = new Map();
        for (const { label, rows } of scenarios) {
          if (!labelMap.has(label)) labelMap.set(label, []);
          labelMap.get(label).push(...rows);
        }
        for (const [label, allRows] of labelMap) {
          if (label !== 'Base') card.appendChild(scenarioLabel(`My ${label}`));
          for (const { move, classification, minPct, maxPct } of groupByMove(allRows)) {
            card.appendChild(buildDefMoveRow(move, classification, minPct, maxPct));
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
