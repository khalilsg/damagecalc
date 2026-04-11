import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';

export const gen = Generations.get(9);
export const field = new Field({ gameType: 'Doubles' });

export const DEFENDER_VARIANTS = [
  { evs: { hp: 252, def: 0,   spd: 252 }, nature: 'Calm',    label: 'Defensive SpD' },
  { evs: { hp: 252, def: 252, spd: 0   }, nature: 'Bold',    label: 'Defensive Def' },
  { evs: { hp: 0,   def: 0,   spd: 0   }, nature: 'Serious', label: 'Neutral' },
];

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

function applyNameAliases(name) {
  const nameAliases = {
    'Tauros-P': 'Tauros-Paldea-Combat',
    'Tauros-B': 'Tauros-Paldea-Blaze',
    'Tauros-A': 'Tauros-Paldea-Aqua',
    'Aegislash': 'Aegislash-Both',
  };
  if (nameAliases[name]) return nameAliases[name];
  return name
    .replace(/-H$/, '-Hisui')
    .replace(/-G$/, '-Galar');
}

export function resolveSpeciesName(name) {
  const aliased = applyNameAliases(name);

  const exact = gen.species.get(aliased);
  if (exact) return exact.name;

  const lower = aliased.toLowerCase();
  let bestName = null;
  let bestDist = Infinity;

  for (const species of gen.species) {
    const dist = editDistance(lower, species.name.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      bestName = species.name;
    }
  }

  if (bestDist === 0) return bestName;

  if (bestDist > 4) {
    console.error(`Error: "${name}" not found and no close match exists (closest was "${bestName}" with edit distance ${bestDist}). Please check the spelling.`);
    process.exit(1);
  }

  console.warn(`Warning: "${name}" not found, using closest match "${bestName}" (edit distance ${bestDist})`);
  return bestName;
}

export function buildDefenderVariants(defenderName, attackerType) {
  const resolvedName = resolveSpeciesName(defenderName);
  return DEFENDER_VARIANTS
    .filter(({ nature }) => {
      if (attackerType === 'physical') return nature !== 'Calm';
      if (attackerType === 'special')  return nature !== 'Bold';
      return true;
    })
    .map(({ evs, nature, label }) => ({
      pokemon: new Pokemon(gen, resolvedName, { level: 50, evs, nature }),
      evs,
      nature,
      label,
    }));
}

export function calcAttackerVsAll(attacker, move, defenderNames, attackerType) {
  return defenderNames.flatMap((defenderName) =>
    buildDefenderVariants(defenderName, attackerType).map(({ pokemon, evs, nature, label }) => {
      try {
        const result = calculate(gen, attacker, pokemon, move, field);
        return {
          defender: defenderName,
          nature,
          evs,
          label,
          desc: result.desc(),
          kochance: result.kochance().text,
        };
      } catch (e) {
        return {
          defender: defenderName,
          nature,
          evs,
          label,
          desc: 'No damage (immune or non-damaging move)',
          kochance: 'N/A',
        };
      }
    })
  );
}

export function pokemonFromSet(set) {
  const name = resolveSpeciesName(set.name);
  return new Pokemon(gen, name, {
    level: set.level,
    evs: set.evs,
    nature: set.nature,
    ability: set.ability,
    item: set.item,
    ...(set.gender && { gender: set.gender }),
  });
}

export function moveFromName(moveName) {
  return new Move(gen, moveName);
}
