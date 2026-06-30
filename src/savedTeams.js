// Shared saved-team storage, used by both K Calc (main.js) and Team Builder.
// Teams persist in localStorage under a single key; because both pages are
// served from the same origin, they automatically share the same store.

const STORAGE_KEY = 'kcalc_teams';

/** @returns {{ name: string, text: string, savedAt: number }[]} */
export function getSavedTeams() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

export function setSavedTeams(teams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

/**
 * Insert or overwrite a saved team by name (most recent first).
 * @returns {string} the trimmed name the team was stored under
 */
export function saveTeam(name, text) {
  const trimmed = name.trim();
  const teams = getSavedTeams().filter(t => t.name !== trimmed);
  teams.unshift({ name: trimmed, text, savedAt: Date.now() });
  setSavedTeams(teams);
  return trimmed;
}

/** Remove a saved team by name. */
export function deleteTeam(name) {
  setSavedTeams(getSavedTeams().filter(t => t.name !== name));
}
