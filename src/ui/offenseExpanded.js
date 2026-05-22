const STAGES = [-2, -1, 0, 1, 2];

export function renderOffenseExpanded(offenseExpandedData, container) {
  container.innerHTML = '';

  // Filter controls
  const controls = buildFilterControls('My offense stage:', 'Opp defense stage:', (myStage, oppStage) => {
    renderMatchups(offenseExpandedData, content, myStage, oppStage);
  });
  container.appendChild(controls.wrapper);

  const content = document.createElement('div');
  container.appendChild(content);

  renderMatchups(offenseExpandedData, content, 0, 0);
}

function renderMatchups(data, container, myStage, oppStage) {
  container.innerHTML = '';
  for (const { playerName, matchups } of data) {
    const section = el('div', 'player-section');
    section.appendChild(sectionHeader(`▸ ${playerName} (my stage: ${fmt(myStage)}, opp stage: ${fmt(oppStage)})`));
    const cards = el('div', 'matchup-cards');
    for (const { opponentName, moveCalcs } of matchups) {
      if (moveCalcs.length === 0) continue;
      const card = el('div', 'matchup-card');
      card.appendChild(cardHeader(`vs. ${opponentName}`));
      for (const { moveName, grid } of moveCalcs) {
        const key = `${myStage},${oppStage}`;
        const r = grid[key];
        if (!r) continue;
        const moveLabel = el('div', 'scenario-label');
        moveLabel.textContent = moveName;
        card.appendChild(moveLabel);
        const row = el('div', `calc-row ${koClass(r.classification)}`);
        row.textContent = r.formattedDesc;
        card.appendChild(row);
      }
      cards.appendChild(card);
    }
    section.appendChild(cards);
    container.appendChild(section);
  }
}

export function buildFilterControls(myLabel, oppLabel, onChange) {
  const wrapper = el('div', 'expanded-controls');

  let myStage = 0, oppStage = 0;

  const myGroup = buildStageSelector(myLabel, v => { myStage = v; onChange(myStage, oppStage); });
  const oppGroup = buildStageSelector(oppLabel, v => { oppStage = v; onChange(myStage, oppStage); });

  wrapper.appendChild(myGroup);
  wrapper.appendChild(oppGroup);
  return { wrapper };
}

function buildStageSelector(label, onSelect) {
  const group = el('div', 'stage-group');
  const lbl = el('span', 'stage-label');
  lbl.textContent = label;
  group.appendChild(lbl);

  STAGES.forEach(s => {
    const btn = el('button', `stage-btn${s === 0 ? ' active' : ''}`);
    btn.textContent = fmt(s);
    btn.dataset.stage = s;
    btn.addEventListener('click', () => {
      group.querySelectorAll('.stage-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(s);
    });
    group.appendChild(btn);
  });

  return group;
}

function fmt(n) { return n > 0 ? `+${n}` : `${n}`; }
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function sectionHeader(text) { const h = el('div', 'section-header'); h.textContent = text; return h; }
function cardHeader(text)    { const h = el('div', 'card-header');    h.textContent = text; return h; }
function koClass(c) {
  if (c === 'guaranteed-ohko') return 'ko-guaranteed';
  if (c === 'chance-ohko')     return 'ko-chance';
  if (c === '2hko')            return 'ko-2hko';
  return '';
}
