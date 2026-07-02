import { getOffensiveStat } from '../calcEngine.js';

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

// ── Archetype label shortening ────────────────────────────────────────────────

const ARCH_SHORT = {
  'Max SpAtk':   'Max SpA',
  'Max Atk':     'Max Atk',
  'Min Offense': 'Min Atk',
};

// ── Classification merging ────────────────────────────────────────────────────

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
    const m   = moves.get(r.move);
    const key = r.archetype ?? '';
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

// ── Defense outcome tag chip ──────────────────────────────────────────────────

function buildDefTag(classification, maxPct) {
  const tag = el('span', 'mv-ko-tag');
  if      (classification === 'guaranteed-ohko') { tag.className = 'mv-ko-tag mv-def-danger'; tag.textContent = 'OHKO ✗'; }
  else if (classification === 'chance-ohko')     { tag.className = 'mv-ko-tag mv-def-warn';   tag.textContent = 'OHKO ~'; }
  else if (classification === '2hko')            { tag.className = 'mv-ko-tag mv-def-2hko';   tag.textContent = '2HKO';   }
  else if (maxPct < 50)                          { tag.className = 'mv-ko-tag mv-def-ok';     tag.textContent = 'Survives'; }
  else return null;
  return tag;
}

// ── Move visual block: name header + one bar row per archetype ────────────────

function buildDefMoveBlock(moveName, archs, liveBadge = false) {
  const block = el('div', liveBadge ? 'mv-visual-row mv-live-row' : 'mv-visual-row');

  // Move name header (with optional LIVE badge)
  const nameRow = el('div', 'mv-name-row');
  if (liveBadge) {
    const badge = el('span', 'in-battle-badge');
    badge.textContent = 'LIVE';
    nameRow.appendChild(badge);
  }
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
    applyDefBar(track, minPct, maxPct);
    archRow.appendChild(track);

    const pctSpan = el('span', 'mv-pct');
    pctSpan.textContent = pctRange(minPct, maxPct);
    archRow.appendChild(pctSpan);

    const tag = buildDefTag(classification, maxPct);
    if (tag) archRow.appendChild(tag);

    block.appendChild(archRow);
  }

  return block;
}

// ── Live-stages single-archetype block (no label column) ─────────────────────

function buildLiveDefBlock(moveName, classification, minPct, maxPct) {
  const block = el('div', 'mv-visual-row');

  const top = el('div', 'mv-visual-top');
  const nameSpan = el('span', 'mv-name');
  nameSpan.textContent = moveName;
  top.appendChild(nameSpan);
  const tag = buildDefTag(classification, maxPct);
  if (tag) top.appendChild(tag);
  block.appendChild(top);

  if ((maxPct ?? 0) > 0) {
    const bot = el('div', 'mv-visual-bot');
    const track = el('div', 'mv-track');
    applyDefBar(track, minPct, maxPct);
    bot.appendChild(track);
    const pctSpan = el('span', 'mv-pct');
    pctSpan.textContent = pctRange(minPct, maxPct);
    bot.appendChild(pctSpan);
    block.appendChild(bot);
  }

  return block;
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
        for (const { move, archs } of groupByMoveWithArchetypes(playerCalc.rows)) {
          card.appendChild(buildDefMoveBlock(move ?? moveName, archs, true));
        }
      }

      if (hasLiveStages && expandedPlayer) {
        // Live stages: single cell per move from the expanded grid
        const expandedMatchup = expandedPlayer.matchups.find(m => m.opponentName === opponentName);
        if (expandedMatchup) {
          let hasRows = false;
          for (const { moveName, category, grid } of expandedMatchup.moveCalcs) {
            const atkStat  = getOffensiveStat(moveName, category);
            const defStat  = category === 'special' ? 'spd' : 'def';
            const oppStage = clampStage(oppStages[atkStat] ?? 0);
            const myStage  = clampStage(myStages[defStat]  ?? 0);
            const cell     = grid[`${oppStage},${myStage}`];
            if (!cell) continue;
            hasRows = true;
            card.appendChild(buildLiveDefBlock(moveName, cell.classification, cell.minPct, cell.maxPct));
          }
          if (!hasRows && trackedMoves.length === 0) {
            card.appendChild(emptyNote('No data at current stages.'));
          }
        }
      } else {
        // Normal path: scenarios have one row each (per archetype × move × boost).
        // Group by boost-label first, then by move name, keeping archetypes separate.
        const labelMap = new Map();
        for (const { label, rows } of scenarios) {
          if (!labelMap.has(label)) labelMap.set(label, []);
          labelMap.get(label).push(...rows);
        }
        for (const [label, allRows] of labelMap) {
          if (label !== 'Base') card.appendChild(scenarioLabel(`My ${label}`));
          for (const { move, archs } of groupByMoveWithArchetypes(allRows)) {
            card.appendChild(buildDefMoveBlock(move, archs));
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
