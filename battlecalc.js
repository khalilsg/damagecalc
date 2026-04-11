import { parseSets } from './parser.js';
import { calcAttackerVsAll, pokemonFromSet, moveFromName, resolveSpeciesName } from './calcLib.js';

const colors = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  orange: '\x1b[38;5;208m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
};

const color = (text, ...styles) => styles.map(s => colors[s]).join('') + text + colors.reset;

function colorizeKochance(kochance) {
  if (!kochance || kochance === 'N/A') return kochance;

  if (kochance.includes('OHKO')) {
    if (kochance.includes('guaranteed')) return color(kochance, 'red');
    return color(kochance, 'orange');
  }

  if (kochance.includes('2HKO')) {
    const match = kochance.match(/([\d.]+)%/);
    if (kochance.includes('guaranteed') || (match && parseFloat(match[1]) > 50)) {
      return color(kochance, 'yellow');
    }
  }

  return kochance;
}

function needsHighlight(kochance) {
  if (!kochance || kochance === 'N/A') return false;
  if (kochance.includes('OHKO')) return true;
  if (kochance.includes('2HKO')) {
    if (kochance.includes('guaranteed')) return true;
    const match = kochance.match(/([\d.]+)%/);
    return match && parseFloat(match[1]) > 50;
  }
  return false;
}

function formatDesc(desc, defenderName, label) {
  let out = desc.replace(/^[\d+\s]*(Atk|SpA)\s+/, '');
  out = out.replace(new RegExp(`[\\d\\s/+A-Za-z]*(?:Def|SpD)\\s+${defenderName}`), `${defenderName} (${label})`);
  return out;
}

function printSummarySection(title, entries, textColor) {
  if (entries.length === 0) return;
  console.log(color(`\n========== ${title} ==========`, 'bold', textColor));
  let currentAttacker = null;
  entries.forEach(({ attacker, desc, kochance }) => {
    if (attacker !== currentAttacker) {
      if (currentAttacker !== null) console.log();
      currentAttacker = attacker;
    }
    const line = kochance ? `  ${desc} -- ${kochance}` : `  ${desc}`;
    console.log(color(line, textColor, 'bold'));
  });
}

const MOVES_TO_SKIP = ['Protect', 'Wide Guard', 'Quick Guard', 'Parting Shot', 'Taunt', 'Encore', 'Tailwind'];

const filePath = process.argv[2];
const defenderNames = process.argv.slice(3);

if (!filePath) {
  console.error('Usage: node battlecalc.js <path-to-sets.txt> <defender1> <defender2> ...');
  process.exit(1);
}

if (defenderNames.length === 0) {
  console.error('Please provide at least one defender name.');
  process.exit(1);
}

const sets = parseSets(filePath);
const guaranteedOHKOs = [];
const chanceOHKOs = [];
const chance2HKOs = [];

for (const set of sets) {
  const attacker = pokemonFromSet(set);
  const attackerName = resolveSpeciesName(set.name);
  const validMoves = [];

  for (const moveName of set.moves) {
    if (MOVES_TO_SKIP.includes(moveName)) continue;
    try {
      validMoves.push(moveFromName(moveName));
    } catch (e) {
      console.log(`\nSkipping unknown move: ${moveName}`);
    }
  }

  for (const defenderName of defenderNames) {
    const resolvedDefenderName = resolveSpeciesName(defenderName);
    console.log(color(`\n=== ${attackerName} vs. ${resolvedDefenderName} ===`, 'bold', 'cyan'));
    for (const move of validMoves) {
      const results = calcAttackerVsAll(attacker, move, [defenderName], set.attackerType);
      results.forEach(({ desc, kochance, label }) => {
        if (desc === 'No damage (immune or non-damaging move)') return;

        const parts = desc.split(' -- ');
        const formattedBase = formatDesc(parts[0], resolvedDefenderName, label);
        const coloredDesc = parts.length > 1
          ? `${formattedBase} -- ${colorizeKochance(parts[1])}`
          : formattedBase;

        const line = `  ${coloredDesc}`;
        console.log(needsHighlight(kochance) ? color(line, 'bold') : line);

        if (kochance === 'guaranteed OHKO') {
          guaranteedOHKOs.push({ attacker: attackerName, desc: formattedBase });
        } else if (kochance && kochance.includes('OHKO')) {
          chanceOHKOs.push({ attacker: attackerName, desc: formattedBase, kochance });
        } else if (kochance && kochance.includes('2HKO')) {
          const match = kochance.match(/([\d.]+)%/);
          if (kochance.includes('guaranteed') || (match && parseFloat(match[1]) > 25)) {
            chance2HKOs.push({ attacker: attackerName, desc: formattedBase, kochance });
          }
        }
      });
    }
  }
}

printSummarySection('>25% CHANCE TO 2HKO', chance2HKOs, 'yellow');
printSummarySection('NON-GUARANTEED OHKOs', chanceOHKOs, 'orange');
printSummarySection('GUARANTEED OHKOs', guaranteedOHKOs, 'red');

if (guaranteedOHKOs.length === 0 && chanceOHKOs.length === 0 && chance2HKOs.length === 0) {
  console.log(color('\nNo notable KOs found.', 'bold', 'yellow'));
}
