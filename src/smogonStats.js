import { Generations, Move } from '@smogon/calc';

const gen = Generations.get(9);

let cachedStats = null;
let fetchPromise = null;

function getPreviousMonthString() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function doFetch() {
  const month = getPreviousMonthString();
  // Dev mode uses the Vite proxy; production tries direct (may hit CORS).
  const urls = [
    `/smogon-stats/${month}/chaos/gen9championsvgc-0.json`,
    `https://www.smogon.com/stats/${month}/chaos/gen9championsvgc-0.json`,
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      cachedStats = data;
      return data;
    } catch {
      continue;
    }
  }
  console.warn('Smogon stats unavailable — falling back to bundled data.');
  return null;
}

export function preloadStats() {
  if (!fetchPromise) fetchPromise = doFetch();
  return fetchPromise;
}

export async function getTopMoves(speciesName, count = 3) {
  const stats = cachedStats ?? await preloadStats();
  if (!stats?.data) return null;

  const normalise = s => s.toLowerCase().replace(/[-\s]/g, '');
  const key = Object.keys(stats.data).find(k => normalise(k) === normalise(speciesName));
  if (!key) return null;

  const moveUsage = stats.data[key].Moves ?? {};
  const damaging = Object.entries(moveUsage)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .filter(name => {
      try { return new Move(gen, name).bp > 0; } catch { return false; }
    });

  return damaging.slice(0, count).length > 0 ? damaging.slice(0, count) : null;
}
