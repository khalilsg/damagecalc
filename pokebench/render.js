/**
 * pokebench/render.js
 * Terminal output formatting — plain ASCII tables with ANSI color highlights.
 * No external dependencies required.
 */

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
};

function colorize(str, ...codes) { return codes.join('') + str + C.reset; }
function bold(s)   { return colorize(s, C.bold); }
function dim(s)    { return colorize(s, C.dim); }
function green(s)  { return colorize(s, C.green, C.bold); }
function red(s)    { return colorize(s, C.red, C.bold); }
function yellow(s) { return colorize(s, C.yellow); }
function cyan(s)   { return colorize(s, C.cyan); }
function gray(s)   { return colorize(s, C.gray); }

// ── Table primitives ──────────────────────────────────────────────────────────

/** Strip ANSI codes for width measurement. */
function strWidth(s) { return s.replace(/\x1b\[[0-9;]*m/g, '').length; }

function pad(str, width) {
  const w = strWidth(str);
  return str + ' '.repeat(Math.max(0, width - w));
}

function renderTable(rows, headers) {
  if (rows.length === 0) { console.log(dim('  (no data)')); return; }
  const cols = headers.length;
  const widths = headers.map((h, i) => {
    const maxData = Math.max(...rows.map(r => strWidth(String(r[i] ?? ''))));
    return Math.max(strWidth(h), maxData);
  });

  const sep = '─'.repeat(widths.reduce((a, w) => a + w + 3, 1));
  const row = (cells, filler = ' ') =>
    '│' + cells.map((c, i) => ` ${pad(String(c ?? ''), widths[i])} `).join('│') + '│';

  console.log('┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐');
  console.log(row(headers.map(bold)));
  console.log('├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤');
  rows.forEach(r => console.log(row(r)));
  console.log('└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘');
}

// ── KO / damage formatting ────────────────────────────────────────────────────

function fmtDamage(minPct, maxPct) {
  return `${minPct.toFixed(1)}–${maxPct.toFixed(1)}%`;
}

function fmtKO(kochanceText, maxPct) {
  if (!kochanceText) return gray('—');
  if (kochanceText.includes('guaranteed OHKO')) return green('OHKO ✓');
  if (kochanceText.includes('OHKO'))            return yellow(`OHKO ~`);
  if (kochanceText.includes('guaranteed 2HKO')) return cyan('2HKO ✓');
  if (kochanceText.includes('2HKO'))            return cyan('2HKO ~');
  if (maxPct >= 50)                              return dim('2-hit range');
  return gray('—');
}

function fmtSurvive(survives, maxPct) {
  if (maxPct >= 200) return red('OHKO ✗');
  if (!survives)     return red(`✗ (${maxPct.toFixed(0)}%)`);
  return green('✓');
}

function fmtSpeed(tag) {
  if (tag === 'Faster') return green('Faster');
  if (tag === 'Slower') return red('Slower');
  return yellow('Mixed');
}

function fmtUsage(pct) { return gray(`${(pct * 100).toFixed(1)}%`); }

// ── Public renderers ──────────────────────────────────────────────────────────

/**
 * Offensive check table.
 * offenseResults: [{ opponentName, usagePct, speedTag, moveRows: [{ moveName, minPct, maxPct, kochanceText }] }]
 */
export function renderOffenseTable(offenseResults) {
  if (offenseResults.length === 0) { console.log(dim('  No offensive data.\n')); return; }

  const rows = [];
  for (const { opponentName, usagePct, speedTag, moveRows } of offenseResults) {
    const isFirst = true;
    moveRows.forEach((mr, i) => {
      rows.push([
        i === 0 ? bold(opponentName) : '',
        i === 0 ? fmtUsage(usagePct) : '',
        i === 0 ? fmtSpeed(speedTag) : '',
        mr.moveName,
        fmtDamage(mr.minPct, mr.maxPct),
        fmtKO(mr.kochanceText, mr.maxPct),
      ]);
    });
    // Blank separator row between opponents
    if (offenseResults.indexOf({ opponentName }) < offenseResults.length - 1) {
      rows.push(['', '', '', '', '', '']);
    }
  }

  renderTable(rows, ['Opponent', 'Usage', 'Speed', 'Move', 'Damage Range', 'KO?']);
}

/**
 * Defensive check table.
 * defenseResults: [{ opponentName, usagePct, moveRows: [{ moveName, minPct, maxPct, survives }] }]
 */
export function renderDefenseTable(defenseResults) {
  if (defenseResults.length === 0) { console.log(dim('  No defensive data.\n')); return; }

  const rows = [];
  for (const { opponentName, usagePct, moveRows } of defenseResults) {
    moveRows.forEach((mr, i) => {
      rows.push([
        i === 0 ? bold(opponentName) : '',
        i === 0 ? fmtUsage(usagePct) : '',
        mr.moveName,
        fmtDamage(mr.minPct, mr.maxPct),
        fmtSurvive(mr.survives, mr.maxPct),
      ]);
    });
    rows.push(['', '', '', '', '']);
  }

  renderTable(rows, ['Attacker', 'Usage', 'Their Move', 'Incoming Damage', 'Survive?']);
}

/**
 * Speed audit table.
 * speedResults: [{ opponentName, usagePct, userSpeed, minOppSpd, maxOppSpd, result }]
 */
export function renderSpeedTable(speedResults) {
  if (speedResults.length === 0) { console.log(dim('  No speed data.\n')); return; }

  const rows = speedResults.map(({ opponentName, usagePct, userSpeed, minOppSpd, maxOppSpd, result }) => [
    bold(opponentName),
    fmtUsage(usagePct),
    fmtSpeed(result),
    String(userSpeed),
    minOppSpd === maxOppSpd ? String(minOppSpd) : `${minOppSpd}–${maxOppSpd}`,
  ]);

  renderTable(rows, ['Opponent', 'Usage', 'Result', 'Your Spe', 'Opp Spe Range']);
}

/**
 * Optimization section table (offense or defense thresholds).
 */
export function renderOptimizeSection(thresholds, headers) {
  if (thresholds.length === 0) { console.log(dim('  (no thresholds found)\n')); return; }
  const rows = thresholds.map(t => Object.values(t).map(v => String(v)));
  renderTable(rows, headers);
}

/**
 * Print a section divider.
 */
export function renderHeader(title) {
  const line = '═'.repeat(Math.min(60, title.length + 6));
  console.log(`\n${C.bold}${C.cyan}╔${line}╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  ${title.padEnd(line.length - 2)}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚${line}╝${C.reset}\n`);
}
