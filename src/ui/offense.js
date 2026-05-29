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

// ── Archetype label shortening ────────────────────────────────────────────────

const ARCH_SHORT = {
  'Max SpDef':   'Max SpD',
  'Max Def':     'Max Def',
  'Min Defense': 'Min Def',
};

// ── Classification merging (highest priority wins) ────────────────────────────

const CLS_ORDER = ['guaranteed-ohko', 'chance-ohko', '2hko', ''];
function mergeCls(a, b) {
  const ai = CLS_ORDER.indexOf(a ?? '');
  const bi = CLS_ORDER.indexOf(b ?? '');
  return ai <= bi ? (a ?? '') : (b ?? '');
}

// ── Group rows by move; keep archetypes as separate entries ───────────────────

function groupByMoveWithArchetypes(rows) {
  const moves = new Map();
  for (const r of rows) {
    if (!moves.has(r.move)) moves.set(r.move, { move: r.move, archs: new Map() });
    const m    = moves.get(r.move);
    const key  = r.archetype ?? '';
    if (!m.archs.has(key)) {
      m.archs.set(key, {
        archetype:      key,
        minPct:         r.minPct ?? 0,
        maxPct:         r.maxPct ?? 0,
        classification: r.classification ?? '',
      });
    } else {
      const a = m.archs.get(key);
      a.minPct         = Math.min(a.minPct, r.minPct ?? 0);
      a.maxPct         = Math.max(a.maxPct, r.maxPct ?? 0);
      a.classification = mergeCls(a.classification, r.classification ?? '');
    }
  }
  return [...moves.values()].map(m => ({ move: m.move, archs: [...m.archs.values()] }));
}

// ── KO tag chip ───────────────────────────────────────────────────────────────

function buildKoTag(classification) {
  if (!classification) return null;
  const tag = el('span', 'mv-ko-tag');
  if      (classification === 'guaranteed-ohko') { tag.className = 'mv-ko-tag mv-ko-ohko';   tag.textContent = 'OHKO ✓'; }
  else if (classification === 'chance-ohko')     { tag.className = 'mv-ko-tag mv-ko-chance'; tag.textContent = 'OHKO ~'; }
  else if (classification === '2hko')            { tag.className = 'mv-ko-tag mv-ko-2hko';   tag.textContent = '2HKO';   }
  else return null;
  return tag;
}

// ── Move visual block: name header + one bar row per archetype ────────────────

function buildMoveBlock(moveName, archs) {
  const block = el('div', 'mv-visual-row');

  // Move name header
  const nameRow = el('div', 'mv-name-row');
  const nameSpan = el('span', 'mv-name');
  nameSpan.textContent = moveName;
  nameRow.appendChild(nameSpan);
  block.appendChild(nameRow);

  // One bar row per archetype
  for (const { archetype, classification, minPct, maxPct } of archs) {
    const archRow = el('div', 'mv-arch-row');

    const lbl = el('span', 'mv-arch-label');
    lbl.textContent = ARCH_SHORT[archetype] ?? archetype;
    archRow.appendChild(lbl);

    const track = el('div', 'mv-track');
    applyBar(track, minPct, maxPct);
    archRow.appendChild(track);

    const pctSpan = el('span', 'mv-pct');
    pctSpan.textContent = pctRange(minPct, maxPct);
    archRow.appendChild(pctSpan);

    const tag = buildKoTag(classification);
    if (tag) archRow.appendChild(tag);

    block.appendChild(archRow);
  }

  return block;
}

// ── Live-stages single-archetype block (no label column) ─────────────────────

function buildLiveMoveBlock(moveName, classification, minPct, maxPct) {
  const block = el('div', 'mv-visual-row');

  const top = el('div', 'mv-visual-top');
  const nameSpan = el('span', 'mv-name');
  nameSpan.textContent = moveName;
  top.appendChild(nameSpan);
  const tag = buildKoTag(classification);
  if (tag) top.appendChild(tag);
  block.appendChild(top);

  if ((maxPct ?? 0) > 0) {
    const bot = el('div', 'mv-visual-bot');
    const track = el('div', 'mv-track');
    applyBar(track, minPct, maxPct);
    bot.appendChild(track);
    const pctSpan = el('span', 'mv-pct');
    pctSpan.textContent = pctRange(minPct, maxPct);
    bot.appendChild(pctSpan);
    block.appendChild(bot);
  }

  return block;
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

      const oppStages     = state?.opponentStages?.[opponentName] ?? {};
      const hasLiveStages =
        Object.values(myStages).some(v => v !== 0) ||
        Object.values(oppStages).some(v => v !== 0);

      if (hasLiveStages && expandedPlayer) {
        // Live stages: one cell per move — single bar, no archetype label
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
            card.appendChild(buildLiveMoveBlock(moveName, cell.classification, cell.minPct, cell.maxPct));
          }
          if (!hasRows) card.appendChild(emptyNote('No data at current stages.'));
        }
      } else {
        // Normal path: one scenario entry per boost label, each has all archetype rows
        for (const { label, rows } of scenarios) {
          if (label !== 'Base') card.appendChild(scenarioLabel(label));
          for (const { move, archs } of groupByMoveWithArchetypes(rows)) {
            card.appendChild(buildMoveBlock(move, archs));
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
