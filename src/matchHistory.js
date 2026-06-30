/**
 * src/matchHistory.js
 * Persistent match history and reasons stored in localStorage.
 */

import { teamNameFromSpecies } from './savedTeams.js';

const HISTORY_KEY = 'kcalc_match_history';
const REASONS_KEY = 'kcalc_reasons';

export const DEFAULT_REASONS = [
  'Lead choice',
  'Bad math',
  'Weather control',
  'Speed control',
  'Trick Room',
  'Terrain control',
  'Bad matchup',
  'Bad roll',
];

// ── Reasons ───────────────────────────────────────────────────────────────────

export function loadReasons() {
  try {
    const stored = JSON.parse(localStorage.getItem(REASONS_KEY));
    return Array.isArray(stored) && stored.length > 0 ? stored : [...DEFAULT_REASONS];
  } catch { return [...DEFAULT_REASONS]; }
}

export function saveReasons(reasons) {
  localStorage.setItem(REASONS_KEY, JSON.stringify(reasons));
}

// ── History CRUD ──────────────────────────────────────────────────────────────

export function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function persistHistory(records) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

/** Prepend a new record (newest first). */
export function addRecord(record) {
  const history = loadHistory();
  history.unshift(record);
  persistHistory(history);
}

export function deleteRecord(id) {
  persistHistory(loadHistory().filter(r => r.id !== id));
}

// ── Snapshot builder ──────────────────────────────────────────────────────────

/**
 * Build the pre-filled snapshot shown in the save modal.
 * myTeam.name  defaults to the team's Pokémon, alphabetical, joined by " / ".
 * Both teams use the full rosters from analysis, so Pokémon removed (KO'd)
 * from the battle tracker are still recorded in the saved match.
 */
export function buildSnapshot(trackerState, playerSets, opponentNames) {
  const myPokemon    = (playerSets ?? []).map(s => s.name).filter(Boolean);
  const theirPokemon = opponentNames?.length
    ? [...opponentNames]
    : Object.keys(trackerState?.opponentStages ?? {});
  const myTeamName   = myPokemon.length > 0
    ? teamNameFromSpecies(myPokemon)
    : 'My Team';
  return {
    myTeam:    { name: myTeamName, pokemon: myPokemon    },
    theirTeam: { name: '',         pokemon: theirPokemon },
  };
}

// ── TSV export ────────────────────────────────────────────────────────────────

export function exportTSV() {
  const records = loadHistory();
  const header  = [
    'Date', 'Outcome', 'My Team', 'My Pokémon',
    'Their Team', 'Their Pokémon', 'Reasons', 'Note',
  ];
  const rows = records.map(r => [
    r.date ?? '',
    r.outcome ?? '',
    r.myTeam?.name    ?? '',
    (r.myTeam?.pokemon    ?? []).join(', ') || '—',
    r.theirTeam?.name || '—',
    (r.theirTeam?.pokemon ?? []).join(', ') || '—',
    (r.reasons ?? []).join('; ') || '—',
    (r.note ?? '').replace(/[\t\n\r]/g, ' ') || '—',
  ]);
  return [header, ...rows].map(row => row.join('\t')).join('\n');
}
