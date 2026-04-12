import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';

const gen = Generations.get(9);
const field = new Field({ gameType: 'Doubles' });

const MOVES_TO_SKIP = ['Protect', 'Wide Guard', 'Quick Guard', 'Parting Shot', 'Taunt', 'Encore', 'Tailwind'];

const DEFENDER_VARIANTS = [
  { evs: { hp: 252, def: 0,   spd: 252 }, nature: 'Calm',    label: 'Defensive SpD' },
  { evs: { hp: 252, def: 252, spd: 0   }, nature: 'Bold',    label: 'Defensive Def' },
  { evs: { hp: 0,   def: 0,   spd: 0   }, nature: 'Serious', label: 'Neutral' },
];

// --- Name resolution ---

function applyNameAliases(name) {
  const aliases = {
    'Tauros-P': 'Tauros-Paldea-Combat',
    'Tauros-B': 'Tauros-Paldea-Blaze',
    'Tauros-A': 'Tauros-Paldea-Aqua',
    'Aegislash': 'Aegislash-Both',
  };
  if (aliases[name]) return aliases[name];
  return name.replace(/-H$/, '-Hisui').replace(/-G$/, '-Galar');
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}

function resolveSpeciesName(name) {
  const aliased = applyNameAliases(name);
  const exact = gen.species.get(aliased);
  if (exact) return exact.name;

  const lower = aliased.toLowerCase();
  let bestName = null;
  let bestDist = Infinity;
  for (const species of gen.species) {
    const dist = editDistance(lower, species.name.toLowerCase());
    if (dist < bestDist) { bestDist = dist; bestName = species.name; }
  }
  if (bestDist > 4) throw new Error(`"${name}" not found and no close match exists.`);
  return bestName;
}

// --- Parser ---

function parseEvs(evString) {
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const part of evString.split('/')) {
    const [amount, stat] = part.trim().split(' ');
    const statMap = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
    if (statMap[stat]) evs[statMap[stat]] = parseInt(amount);
  }
  return evs;
}

function parseFirstLine(line) {
  const typeMatch = line.match(/\[(\w+)\]$/);
  const attackerType = typeMatch ? typeMatch[1].toLowerCase() : 'both';
  const lineWithoutTag = line.replace(/\s*\[\w+\]$/, '').trim();
  const [namepart, item] = lineWithoutTag.split('@').map(s => s.trim());
  const genderMatch = namepart.match(/\s*\(([MF])\)$/);
  const name = genderMatch ? namepart.replace(/\s*\([MF]\)$/, '').trim() : namepart;
  const gender = genderMatch ? genderMatch[1] : undefined;
  return { name, gender, item: item ?? undefined, attackerType };
}

function parseSets(text) {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks.map((block) => {
    const lines = block.trim().split('\n');
    const { name, gender, item, attackerType } = parseFirstLine(lines[0]);
    const set = { name, gender, item, attackerType, ability: undefined, level: 50, evs: {}, nature: 'Serious', moves: [] };
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Ability:'))        set.ability = trimmed.replace('Ability:', '').trim();
      else if (trimmed.startsWith('Level:'))     set.level = parseInt(trimmed.replace('Level:', '').trim());
      else if (trimmed.startsWith('EVs:'))       set.evs = parseEvs(trimmed.replace('EVs:', '').trim());
      else if (trimmed.startsWith('Tera Type:')) set.teraType = trimmed.replace('Tera Type:', '').trim();
      else if (trimmed.includes('Nature'))       set.nature = trimmed.replace('Nature', '').trim();
      else if (trimmed.startsWith('-'))          set.moves.push(trimmed.replace(/^-\s*/, '').trim());
    }
    return set;
  });
}

// --- Calc ---

function buildDefenderVariants(defenderName, attackerType) {
  const resolvedName = resolveSpeciesName(defenderName);
  return DEFENDER_VARIANTS
    .filter(({ nature }) => {
      if (attackerType === 'physical') return nature !== 'Calm';
      if (attackerType === 'special')  return nature !== 'Bold';
      return true;
    })
    .map(({ evs, nature, label }) => ({
      pokemon: new Pokemon(gen, resolvedName, { level: 50, evs, nature }),
      evs, nature, label,
    }));
}

function formatDesc(desc, defenderName, label) {
  let out = desc.replace(/^[\d+\s]*(Atk|SpA)\s+/, '');
  out = out.replace(new RegExp(`[\\d\\s/+A-Za-z]*(?:Def|SpD)\\s+${defenderName}`), `${defenderName} (${label})`);
  return out;
}

function classifyKochance(kochance) {
  if (!kochance || kochance === 'N/A') return null;
  if (kochance === 'guaranteed OHKO') return 'guaranteed-ohko';
  if (kochance.includes('OHKO')) return 'chance-ohko';
  if (kochance.includes('2HKO')) {
    if (kochance.includes('guaranteed')) return '2hko';
    const match = kochance.match(/([\d.]+)%/);
    if (match && parseFloat(match[1]) > 50) return '2hko';
  }
  return null;
}

function runCalcs(teamText, defenderNames) {
  const sets = parseSets(teamText);
  const results = [];
  const summaries = { guaranteedOHKOs: [], chanceOHKOs: [], chance2HKOs: [] };

  for (const set of sets) {
    const attackerName = resolveSpeciesName(set.name);
    const attacker = new Pokemon(gen, attackerName, {
      level: set.level, evs: set.evs, nature: set.nature,
      ability: set.ability, item: set.item,
      ...(set.gender && { gender: set.gender }),
    });

    const attackerResult = { attackerName, matchups: [] };

    for (const defenderName of defenderNames) {
      const resolvedDefenderName = resolveSpeciesName(defenderName);
      const matchup = { defenderName: resolvedDefenderName, rows: [] };

      const validMoves = set.moves.filter(m => !MOVES_TO_SKIP.includes(m));

      for (const moveName of validMoves) {
        let move;
        try { move = new Move(gen, moveName); } catch { continue; }

        const effectiveAttackerType = moveName === 'Foul Play' ? 'physical' : set.attackerType;
        const variants = buildDefenderVariants(defenderName, effectiveAttackerType);

        for (const { pokemon, label } of variants) {
          let desc, kochance;
          try {
            const result = calculate(gen, attacker, pokemon, move, field);
            desc = result.desc();
            kochance = result.kochance().text;
          } catch {
            continue;
          }

          if (desc === 'No damage (immune or non-damaging move)') continue;

          const parts = desc.split(' -- ');
          const formattedBase = formatDesc(parts[0], resolvedDefenderName, label);
          const classification = classifyKochance(kochance);
          const kochanceText = parts[1] || '';

          matchup.rows.push({ formattedBase, kochanceText, classification });

          if (classification === 'guaranteed-ohko') {
            summaries.guaranteedOHKOs.push({ attacker: attackerName, desc: formattedBase });
          } else if (classification === 'chance-ohko') {
            summaries.chanceOHKOs.push({ attacker: attackerName, desc: formattedBase, kochance: kochanceText });
          } else if (classification === '2hko') {
            const match = kochanceText.match(/([\d.]+)%/);
            if (kochanceText.includes('guaranteed') || (match && parseFloat(match[1]) > 25)) {
              summaries.chance2HKOs.push({ attacker: attackerName, desc: formattedBase, kochance: kochanceText });
            }
          }
        }
      }

      if (matchup.rows.length > 0) attackerResult.matchups.push(matchup);
    }

    if (attackerResult.matchups.length > 0) results.push(attackerResult);
  }

  return { results, summaries };
}

// --- UI ---

// Populate species list for dropdown
const allSpecies = [...gen.species].map(s => s.name).sort();

const defenderSearch = document.getElementById('defender-search');
const dropdown = document.getElementById('dropdown');
const selectedDefendersEl = document.getElementById('selected-defenders');
const calcBtn = document.getElementById('calc-btn');
const teamInput = document.getElementById('team-input');
const outputEl = document.getElementById('output');
const errorEl = document.getElementById('error');

let selectedDefenders = [];

function renderDropdown(query) {
  const filtered = allSpecies.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  dropdown.innerHTML = '';
  if (filtered.length === 0) { dropdown.classList.remove('open'); return; }
  filtered.forEach(name => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = name;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      addDefender(name);
    });
    dropdown.appendChild(item);
  });
  dropdown.classList.add('open');
}

function addDefender(name) {
  if (!selectedDefenders.includes(name)) {
    selectedDefenders.push(name);
    renderTags();
  }
  defenderSearch.value = '';
  dropdown.classList.remove('open');
}

function renderTags() {
  selectedDefendersEl.innerHTML = '';
  selectedDefenders.forEach(name => {
    const tag = document.createElement('div');
    tag.className = 'defender-tag';
    tag.innerHTML = `${name} <button title="Remove">×</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      selectedDefenders = selectedDefenders.filter(d => d !== name);
      renderTags();
    });
    selectedDefendersEl.appendChild(tag);
  });
}

defenderSearch.addEventListener('input', () => renderDropdown(defenderSearch.value));
defenderSearch.addEventListener('focus', () => { if (defenderSearch.value) renderDropdown(defenderSearch.value); });
defenderSearch.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 150));

function getKoClass(classification) {
  if (classification === 'guaranteed-ohko') return 'ko-guaranteed';
  if (classification === 'chance-ohko') return 'ko-chance';
  if (classification === '2hko') return 'ko-2hko';
  return '';
}

function renderSummarySection(container, title, entries, cssClass) {
  if (entries.length === 0) return;
  const section = document.createElement('div');
  section.className = 'summary-section';
  const header = document.createElement('div');
  header.className = `summary-header ${cssClass}`;
  header.textContent = `══ ${title} ══`;
  section.appendChild(header);

  let currentAttacker = null;
  let block = null;
  entries.forEach(({ attacker, desc, kochance }) => {
    if (attacker !== currentAttacker) {
      block = document.createElement('div');
      block.className = 'summary-attacker-block';
      section.appendChild(block);
      currentAttacker = attacker;
    }
    const row = document.createElement('div');
    row.className = `summary-row ${cssClass}`;
    row.textContent = kochance ? `${desc} -- ${kochance}` : desc;
    block.appendChild(row);
  });

  container.appendChild(section);
}

calcBtn.addEventListener('click', () => {
  errorEl.textContent = '';
  outputEl.innerHTML = '';

  const teamText = teamInput.value.trim();
  if (!teamText) { errorEl.textContent = 'Please paste a team.'; return; }
  if (selectedDefenders.length === 0) { errorEl.textContent = 'Please add at least one defender.'; return; }

  let data;
  try {
    data = runCalcs(teamText, selectedDefenders);
  } catch (e) {
    errorEl.textContent = `Error: ${e.message}`;
    return;
  }

  const { results, summaries } = data;

  for (const { attackerName, matchups } of results) {
    const section = document.createElement('div');
    section.className = 'attacker-section';

    const header = document.createElement('div');
    header.className = 'attacker-header';
    header.textContent = `▸ ${attackerName}`;
    section.appendChild(header);

    const cards = document.createElement('div');
    cards.className = 'matchup-cards';

    for (const { defenderName, rows } of matchups) {
      const card = document.createElement('div');
      card.className = 'matchup-card';

      const cardHeader = document.createElement('h3');
      cardHeader.textContent = `vs. ${defenderName}`;
      card.appendChild(cardHeader);

      for (const { formattedBase, kochanceText, classification } of rows) {
        const row = document.createElement('div');
        const koClass = getKoClass(classification);
        row.className = `calc-row ${koClass}`;
        row.textContent = kochanceText ? `${formattedBase} -- ${kochanceText}` : formattedBase;
        card.appendChild(row);
      }

      cards.appendChild(card);
    }

    section.appendChild(cards);
    outputEl.appendChild(section);
  }

  renderSummarySection(outputEl, '>25% CHANCE TO 2HKO', summaries.chance2HKOs, 'yellow');
  renderSummarySection(outputEl, 'NON-GUARANTEED OHKOs', summaries.chanceOHKOs, 'orange');
  renderSummarySection(outputEl, 'GUARANTEED OHKOs', summaries.guaranteedOHKOs, 'red');
});
